// Claude Code CLI sessions for generation (as opposed to rating; see
// src/pipeline/providers/claude-code.ts).
//
// - claudeJson: one-shot structured output (`--json-schema`), no tools. Used by
//   the brief writer.
// - runCodingSession: a normal Claude Code coding session in a scratch dir,
//   with its default system prompt and built-in file/shell tools — the way a
//   person gets a UI out of a coding agent. User and plugin settings, MCP
//   servers, skills and slash commands are all off, so every generator is
//   vanilla Claude Code regardless of who runs the batch. After each agent
//   turn the caller may send a follow-up (used for build repairs).
//
// Both remove ANTHROPIC_API_KEY so the CLI uses its own login, and both
// translate a usage-limit notice into a pause of the whole run (usageGate),
// as the raters do.

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { usageGate, usageLimitFromText, UsageLimitError } from '../pipeline/usage-limit.ts';

export interface ModelChoice { model: string; effort?: string; command?: string }

const VANILLA = ['--setting-sources', 'project,local', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence'];

function cliEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  return env;
}

/** Pause the run if any of `texts` is a Claude Code usage-limit notice. */
function checkUsageLimit(texts: unknown[]): void {
  for (const t of texts) {
    const text = typeof t === 'string' ? t : t && typeof t === 'object' ? JSON.stringify(t) : '';
    const err = text ? usageLimitFromText(text) : undefined;
    if (err) {
      usageGate.hold(err);
      throw err;
    }
  }
}

/** Run `fn` until it succeeds, waiting out usage-limit pauses in between. */
export async function withUsageRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (;;) {
    await usageGate.wait();
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof UsageLimitError)) throw e;
    }
  }
}

// ------------------------------------------------------------- one-shot JSON

export async function claudeJson<T>(m: ModelChoice, opts: { system?: string; prompt: string; schema: object; timeoutMs?: number }): Promise<T> {
  return withUsageRetry(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-json-'));
    try {
      const args = [
        '-p', '--output-format', 'json',
        '--model', m.model, ...(m.effort ? ['--effort', m.effort] : []),
        '--json-schema', JSON.stringify(opts.schema),
        '--tools', '',
        ...(opts.system ? ['--system-prompt', opts.system] : []),
        ...VANILLA,
      ];
      const proc = spawn(m.command ?? 'claude', args, { cwd: dir, env: cliEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      proc.stdout.on('data', (d) => { out += d; });
      proc.stderr.on('data', (d) => { err = (err + d).slice(-8000); });
      proc.stdin.end(opts.prompt);
      const timer = setTimeout(() => proc.kill('SIGTERM'), opts.timeoutMs ?? 20 * 60_000);
      const code = await new Promise<number | null>((resolve, reject) => { proc.on('error', reject); proc.on('exit', resolve); }).finally(() => clearTimeout(timer));
      let res: any;
      try { res = JSON.parse(out); } catch {
        checkUsageLimit([out, err]);
        throw new Error(`claude exited ${code} without JSON output: ${(err || out).trim().slice(0, 800)}`);
      }
      if (res.is_error || res.subtype !== 'success' || res.structured_output === undefined) {
        checkUsageLimit([res.result, ...(Array.isArray(res.errors) ? res.errors : []), err]);
        throw new Error(`claude ${res.subtype ?? 'failed'}: ${JSON.stringify(res.errors ?? res.result ?? '').slice(0, 800)}`);
      }
      return res.structured_output as T;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

// ---------------------------------------------------------- coding session

export interface CodingSessionOpts extends ModelChoice {
  cwd: string;
  prompt: string;
  tools: string[];
  timeoutMs: number;
  /** One JSONL event per call (transcript). */
  log: (e: object) => void;
  /** After each agent turn: return a follow-up message to continue, or undefined to end. */
  onTurnEnd: (turn: { round: number; text: string }) => Promise<string | undefined>;
}

export interface CodingSessionOutcome {
  rounds: number;
  /** Model requests made, summed over rounds. */
  numTurns: number;
  costUsd: number;
  durationMs: number;
  models: string[];
  usage: Record<string, number>;
  timedOut: boolean;
}

const sessions = new Set<ChildProcess>();

/** Stop every coding session (used when one hits the account usage limit). */
export function stopAllSessions(): void {
  for (const p of sessions) { try { p.stdin?.end(); p.kill('SIGTERM'); } catch { /* gone */ } }
}

export async function runCodingSession(o: CodingSessionOpts): Promise<CodingSessionOutcome> {
  const paused = usageGate.pending();
  if (paused) throw paused;
  const args = [
    '-p',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', o.model, ...(o.effort ? ['--effort', o.effort] : []),
    '--tools', o.tools.join(','),
    '--allowedTools', o.tools.join(','),
    '--permission-mode', 'dontAsk',
    ...VANILLA,
  ];
  const t0 = Date.now();
  const proc = spawn(o.command ?? 'claude', args, { cwd: o.cwd, env: cliEnv(), stdio: ['pipe', 'pipe', 'pipe'] });
  sessions.add(proc);
  let stderr = '';
  proc.stderr.on('data', (d) => { stderr = (stderr + d).slice(-8000); });
  const exited = new Promise<number | null>((resolve, reject) => { proc.on('error', reject); proc.on('exit', resolve); });
  void exited.catch(() => {});
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; proc.kill('SIGTERM'); }, o.timeoutMs);

  const send = (text: string) => {
    o.log({ type: 'user', text });
    proc.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] }, parent_tool_use_id: null, session_id: '' }) + '\n');
  };

  const outcome: CodingSessionOutcome = { rounds: 0, numTurns: 0, costUsd: 0, durationMs: 0, models: [], usage: {}, timedOut: false };
  const models = new Set<string>();
  let done = false;
  try {
    send(o.prompt);
    for await (const line of readline.createInterface({ input: proc.stdout })) {
      let ev: any;
      try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === 'assistant' && ev.parent_tool_use_id == null) {
        const m = ev.message;
        if (m.model && m.model !== '<synthetic>') models.add(m.model);
        const text = (m.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
        if (m.model === '<synthetic>') checkUsageLimit([text]);
        for (const b of m.content ?? []) {
          if (b.type === 'text' && b.text.trim()) o.log({ type: 'assistant', text: b.text.slice(0, 4000) });
          if (b.type === 'tool_use') o.log({ type: 'tool_use', name: b.name, input: truncateDeep(b.input, 1500) });
        }
      } else if (ev.type === 'user' && ev.parent_tool_use_id == null) {
        for (const b of ev.message?.content ?? []) {
          if (b.type !== 'tool_result') continue;
          const text = typeof b.content === 'string' ? b.content : (b.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
          o.log({ type: 'tool_result', isError: !!b.is_error, text: text.slice(0, 1500) });
        }
      } else if (ev.type === 'result') {
        outcome.rounds++;
        // Each result reports the round just finished.
        outcome.numTurns += ev.num_turns ?? 0;
        outcome.costUsd += ev.total_cost_usd ?? 0;
        for (const [k, v] of Object.entries(ev.usage ?? {})) if (typeof v === 'number') outcome.usage[k] = (outcome.usage[k] ?? 0) + v;
        for (const k of Object.keys(ev.modelUsage ?? {})) models.add(k);
        const resultText = typeof ev.result === 'string' ? ev.result : '';
        o.log({ type: 'result', subtype: ev.subtype, isError: !!ev.is_error, numTurns: ev.num_turns, costUsd: ev.total_cost_usd, text: resultText.slice(0, 2000) });
        const failed = ev.subtype !== 'success' || ev.is_error;
        if (failed || resultText.trim().length <= 500) checkUsageLimit([resultText, ...(Array.isArray(ev.errors) ? ev.errors : [])]);
        if (failed) throw new Error(`claude ended with ${ev.subtype}: ${JSON.stringify(ev.errors ?? ev.result ?? '').slice(0, 500)}`);
        const next = await o.onTurnEnd({ round: outcome.rounds, text: resultText });
        if (next === undefined) { done = true; break; }
        send(next);
      }
    }
  } catch (e) {
    if (e instanceof UsageLimitError) stopAllSessions();
    throw e;
  } finally {
    clearTimeout(timer);
    sessions.delete(proc);
    try { proc.stdin.end(); proc.kill('SIGTERM'); } catch { /* gone */ }
  }
  const code = await exited.catch(() => null);
  if (!done) {
    if (timedOut) {
      outcome.timedOut = true;
    } else {
      checkUsageLimit([stderr]);
      const blocked = usageGate.pending();
      if (blocked) throw blocked;
      throw new Error(`claude exited (code ${code}) mid-session.\n${stderr.trim().slice(-1500)}`);
    }
  }
  outcome.durationMs = Date.now() - t0;
  outcome.models = [...models];
  return outcome;
}

function truncateDeep(x: unknown, n: number): unknown {
  if (typeof x === 'string') return x.length > n ? x.slice(0, n) + `… [${x.length - n} more chars]` : x;
  if (Array.isArray(x)) return x.map((v) => truncateDeep(v, n));
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, truncateDeep(v, n)]));
  return x;
}
