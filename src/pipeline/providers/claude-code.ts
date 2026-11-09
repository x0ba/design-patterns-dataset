// Claude rater driven by the local Claude Code CLI (`claude -p`), using
// whatever account that CLI is logged in to. No SDK and no API key needed.
//
// - The rater tools are served to the CLI by a throwaway MCP server (streamable
//   HTTP, JSON responses only) on 127.0.0.1, guarded by a random bearer token.
//   The model sees them as mcp__rater__<name>.
// - Built-in tools are disabled (--tools ""), other MCP servers are ignored
//   (--strict-mcp-config), and the system prompt replaces Claude Code's own, so
//   the rater sees only the codebook prompt and the rater tools.
// - The CLI runs in an empty temp dir with session persistence off. Its own
//   agent loop handles thinking, caching and retries; this file only feeds user
//   messages (first message, nudges) over stream-json and watches the output.
// - Tool calls are executed one at a time (the screenshot viewer is a single
//   page). submit_label success ends the session: the CLI is stopped as soon
//   as the result has been sent.
// - ANTHROPIC_API_KEY is removed from the CLI's environment so it uses its own
//   login rather than silently billing an API key exported for other tools.
// - A usage limit ("You've hit your 5-hour limit · resets …") stops every
//   claude process in this run. The batch waits for that reset and then retries
//   the interrupted rater; it does not start labeling another site first.

import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import type { AgentOutcome, AgentRun, ImagePart, Provider, RaterConfig, ToolResult } from '../provider.ts';
import { usageGate, usageLimitFromText, UsageLimitError } from '../usage-limit.ts';

const SERVER = 'rater';
const MAX_NUDGES = 2;
const active = new Set<ChildProcess>();

function stopChild(child: ChildProcess): void {
  try { child.stdin?.end(); } catch { /* already closed */ }
  try { child.kill('SIGTERM'); } catch { /* already exited */ }
}

/** Pause the batch on a usage-limit notice and stop every other claude still labeling. */
function stopForUsageLimit(texts: unknown[], run: AgentRun, turn: number, child: ChildProcess | undefined): void {
  let err: UsageLimitError | undefined;
  for (const t of texts) {
    const text = typeof t === 'string' ? t : t && typeof t === 'object' ? JSON.stringify(t) : '';
    if (!text) continue;
    err = usageLimitFromText(text);
    if (err) break;
  }
  if (!err) return;
  run.log({ type: 'error', turn, data: { usageLimit: true, resetsAt: err.resetsAt?.toISOString() ?? null, result: err.message } });
  usageGate.hold(err);
  for (const other of active) if (other !== child) stopChild(other);
  throw err;
}

export const claudeCodeProvider: Provider = {
  async run(cfg: RaterConfig, run: AgentRun): Promise<AgentOutcome> {
    const paused = usageGate.pending();
    if (paused) throw paused;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `rater-${cfg.id}-`));
    let turn = 0;
    let finished = false;
    let stopProcess = () => {};
    const mcp = await startMcpServer(run, () => turn, () => { finished = true; stopProcess(); });

    let child: ChildProcess | undefined;
    try {
      const stillPaused = usageGate.pending();
      if (stillPaused) throw stillPaused;
      const systemFile = path.join(dir, 'system.md');
      fs.writeFileSync(systemFile, run.system);
      const args = [
        '-p',
        '--input-format', 'stream-json',
        '--output-format', 'stream-json',
        '--verbose',
        '--include-partial-messages',
        '--model', cfg.model,
        ...(cfg.effort ? ['--effort', cfg.effort] : []),
        '--system-prompt-file', systemFile,
        '--tools', '',
        '--strict-mcp-config',
        '--mcp-config', JSON.stringify({ mcpServers: { [SERVER]: { type: 'http', url: mcp.url, headers: { Authorization: `Bearer ${mcp.token}` } } } }),
        '--allowedTools', `mcp__${SERVER}`,
        '--permission-mode', 'dontAsk',
        '--no-session-persistence',
        '--disable-slash-commands',
      ];
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        MCP_TOOL_TIMEOUT: String(5 * 60_000),
        MAX_MCP_OUTPUT_TOKENS: '100000',
        ENABLE_TOOL_SEARCH: 'false', // load the rater tools up front, never behind a search
      };
      delete env.ANTHROPIC_API_KEY;
      const proc = spawn(cfg.command ?? 'claude', args, { cwd: dir, env, stdio: ['pipe', 'pipe', 'pipe'] });
      child = proc;
      active.add(proc);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr = (stderr + d).slice(-8000); });
      const exited = new Promise<number | null>((resolve, reject) => {
        proc.on('error', reject);
        proc.on('exit', (code) => resolve(code));
      });
      void exited.catch(() => {}); // a usage-limit throw abandons this promise; don't surface an unhandled rejection
      stopProcess = () => stopChild(proc);

      const send = (content: unknown) => proc.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content }, parent_tool_use_id: null, session_id: '' }) + '\n');
      send([...(run.first.images ?? []).map(imageBlock), { type: 'text', text: run.first.text }]);

      const usageById = new Map<string, Record<string, unknown>>();
      const servedBy = new Set<string>();
      let nudges = 0;
      let currentId = '';
      let reason: AgentOutcome['reason'] | undefined;

      const outcome = (r: AgentOutcome['reason']): AgentOutcome => {
        const usage: Record<string, number> = {};
        for (const u of usageById.values()) for (const [k, v] of Object.entries(u)) if (typeof v === 'number') usage[k] = (usage[k] ?? 0) + v;
        return { finished, reason: finished ? 'stopped' : r, turns: turn, servedBy: [...servedBy], usage };
      };

      try {
        for await (const line of readline.createInterface({ input: proc.stdout })) {
          if (finished || reason) break;
          let ev: any;
          try { ev = JSON.parse(line); } catch { continue; }

          if (ev.type === 'system' && ev.subtype === 'init') {
            const s = (ev.mcp_servers ?? []).find((m: any) => m.name === SERVER);
            if (s?.status !== 'connected') throw new Error(`claude CLI could not connect to the rater MCP server (status: ${s?.status ?? 'missing'})`);
          } else if (ev.type === 'stream_event' && ev.parent_tool_use_id == null) {
            // Exact per-request usage and stop reason (assistant events carry partial counts).
            const e = ev.event;
            if (e.type === 'message_start') {
              if (turn >= run.maxTurns) { reason = 'max_turns'; break; }
              turn++;
              currentId = e.message.id;
              run.log({ type: 'request', turn });
              usageById.set(currentId, { ...e.message.usage });
              if (e.message.model) servedBy.add(e.message.model);
            } else if (e.type === 'message_delta') {
              if (e.usage) Object.assign(usageById.get(currentId) ?? {}, e.usage);
              if (e.delta?.stop_reason === 'refusal') reason = 'refusal';
            }
          } else if (ev.type === 'assistant' && ev.parent_tool_use_id == null) {
            const m = ev.message;
            const blocks = (m.content ?? []).map((b: any) => b.type);
            const text = (m.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
            run.log({ type: 'response', turn, data: { model: m.model, blocks, text: text.slice(0, 2000) } });
            // The limit notice is a local synthetic turn, not a model reply. Stop before nudging.
            if (m.model === '<synthetic>') stopForUsageLimit([text], run, turn, child);
          } else if (ev.type === 'result') {
            if (ev.stop_reason === 'refusal') { reason = 'refusal'; break; }
            const resultText = typeof ev.result === 'string' ? ev.result : '';
            const failed = ev.subtype !== 'success' || ev.is_error;
            // A successful result is the model's own closing text. Only a short notice is the CLI.
            if (failed || (resultText.trim().length > 0 && resultText.trim().length <= 500)) {
              stopForUsageLimit([resultText, ...(Array.isArray(ev.errors) ? ev.errors : [])], run, turn, child);
            }
            if (failed) {
              run.log({ type: 'error', turn, data: { subtype: ev.subtype, errors: ev.errors, result: ev.result } });
              if (ev.subtype === 'error_max_turns') { reason = 'max_turns'; break; }
              throw new Error(`claude CLI ended with ${ev.subtype}: ${JSON.stringify(ev.errors ?? ev.result ?? '').slice(0, 500)}`);
            }
            // The model ended its turn without submitting.
            if (nudges++ >= MAX_NUDGES) { reason = 'gave_up'; break; }
            run.log({ type: 'nudge', turn });
            send(run.nudge);
          }
        }
      } catch (e) {
        // Stopping a sibling closes its stdout. That can surface as a stream error
        // rather than a clean exit; it is the same pause, not a failed label.
        if (e instanceof UsageLimitError) throw e;
        const blocked = usageGate.pending();
        if (blocked) throw blocked;
        throw e;
      }

      stopProcess();
      let code: number | null;
      try {
        code = await exited;
      } catch (e) {
        const blocked = usageGate.pending();
        if (blocked) throw blocked;
        throw e;
      }
      if (!finished && !reason) {
        stopForUsageLimit([stderr], run, turn, child);
        // A sibling rater already hit the limit and stopped this process.
        const blocked = usageGate.pending();
        if (blocked) throw blocked;
        throw new Error(`claude CLI exited (code ${code}) before the rater finished.\n${stderr.trim()}`);
      }
      return outcome(reason ?? 'stopped');
    } finally {
      if (child) active.delete(child);
      stopProcess();
      await mcp.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
};

const imageBlock = (img: ImagePart) => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } });

// ------------------------------------------------------------- MCP server

async function startMcpServer(run: AgentRun, turn: () => number, onStop: () => void) {
  const token = crypto.randomBytes(24).toString('hex');
  const tools = run.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema }));
  let queue: Promise<unknown> = Promise.resolve();
  const exec = (name: string, input: unknown) => {
    const p = queue.then(async (): Promise<ToolResult> => {
      run.log({ type: 'tool_call', turn: turn(), data: { name, input } });
      let r: ToolResult;
      try { r = await run.execute(name, input); } catch (e) { r = { text: `Tool error: ${(e as Error).message}`, isError: true }; }
      run.log({ type: 'tool_result', turn: turn(), data: { name, isError: !!r.isError, text: r.text.slice(0, 4000), images: r.images?.length ?? 0 } });
      return r;
    });
    queue = p.catch(() => {});
    return p;
  };

  const handle = async (msg: any): Promise<object | undefined> => {
    if (msg.id === undefined) return undefined; // notification
    const ok = (result: object) => ({ jsonrpc: '2.0', id: msg.id, result });
    switch (msg.method) {
      case 'initialize':
        return ok({ protocolVersion: msg.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: SERVER, version: '1.0.0' } });
      case 'ping': return ok({});
      case 'tools/list': return ok({ tools });
      case 'tools/call': {
        const r = await exec(msg.params?.name, msg.params?.arguments ?? {});
        return {
          ...ok({
            content: [{ type: 'text', text: r.text }, ...(r.images ?? []).map((i) => ({ type: 'image', data: i.data, mimeType: i.mediaType }))],
            ...(r.isError ? { isError: true } : {}),
          }),
          stop: !!r.stop,
        };
      }
      default: return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } };
    }
  };

  const server = http.createServer(async (req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401).end(); return; }
    if (req.method !== 'POST') { res.writeHead(req.method === 'DELETE' ? 200 : 405).end(); return; }
    let body = '';
    for await (const chunk of req) body += chunk;
    let parsed: any;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
    const replies = (await Promise.all((Array.isArray(parsed) ? parsed : [parsed]).map(handle))).filter(Boolean) as any[];
    if (!replies.length) { res.writeHead(202).end(); return; }
    const stop = replies.some((r) => r.stop);
    for (const r of replies) delete r.stop;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(Array.isArray(parsed) ? replies : replies[0]), () => { if (stop) onStop(); });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    token,
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
}
