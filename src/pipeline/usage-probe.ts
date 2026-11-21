// Reads the account's current utilization when a usage cap is set and no session
// has reported it recently (e.g. right after a run starts, or after a pause).
// Every `claude -p` stream reports it in a `rate_limit_event`, so the probe is
// the smallest possible session: Haiku, no tools, no settings, hooks or MCP.
//
// Imported for its side effect by the modules that run claude sessions, which
// registers it with the shared usage gate.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { observeStreamEvent, usageGate } from './usage-limit.ts';

const PROBE_MODEL = process.env.USAGE_PROBE_MODEL || 'claude-haiku-5-5';

export async function probeUsage(command = 'claude'): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-probe-'));
  try {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const proc = spawn(command, [
      '-p', '--output-format', 'stream-json', '--verbose',
      '--model', PROBE_MODEL, '--tools', '',
      '--setting-sources', '', '--strict-mcp-config', '--disable-slash-commands', '--no-session-persistence',
    ], { cwd: dir, env, stdio: ['pipe', 'pipe', 'ignore'] });
    const timer = setTimeout(() => proc.kill('SIGTERM'), 2 * 60_000);
    proc.stdin.end('Reply with the single word: ok');
    let seen = false;
    for await (const line of readline.createInterface({ input: proc.stdout })) {
      let ev: any;
      try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === 'rate_limit_event') seen = true;
      observeStreamEvent(ev);
    }
    clearTimeout(timer);
    if (!seen) throw new Error('the CLI reported no rate_limit_event');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

usageGate.setProbe(() => probeUsage());
