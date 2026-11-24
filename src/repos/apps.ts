// Running a set-up repo app so a browser can reach it: during setup
// verification, exploration, and labeling.
//
// The setup agent leaves a contract in the checkout (.ui-capture/):
//   app.json   { mode: "static" | "server", entry: "/path", login, stubs, notes }
//   mise.toml  (repo root) every runtime/tool pinned to an exact version
//   out/       static mode: the production build, served by src/pipeline/serve.ts
//              at http://<slug>.localhost:<port>/ like generated apps
//   start.sh   server mode: starts the app in the foreground on $PORT; run here
//              under sandbox-exec or bubblewrap (src/repos/sandbox.ts) with a minimal env,
//              in its own process group so stopping it stops its children
//
// AppHost reference-counts apps, so the views of one repo share one server and
// it stops when the last of them is done.

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { LocalServer } from '../pipeline/serve.ts';
import { isAppPath } from '../pipeline/steps.ts';
import { INNER_SCRIPT, PortBridge } from './netbridge.ts';
import { BWRAP, baseEnv, bwrapArgs, findMise, miseEnv, runtimeEnv, runtimeProfile, runtimeSandboxKind } from './sandbox.ts';

export interface AppJson {
  mode: 'static' | 'server';
  entry: string;
  login?: { username?: string; email?: string; password?: string; note?: string } | null;
  /** Secrets, API keys and external services the setup faked, and how. */
  stubs: { service: string; how: string }[];
  notes: string;
}

export interface AppSpec {
  slug: string;
  mode: 'static' | 'server';
  checkout: string;
  /** server mode */
  port: number;
}

export const CONTRACT_DIR = '.ui-capture';

/**
 * The static build to serve, .ui-capture/out, as a real path. Throws if it
 * resolves outside the checkout (the dir, or .ui-capture, made a symlink to
 * somewhere on the host): serving it would publish host files to the app.
 */
export function staticDir(checkout: string): string {
  const root = fs.realpathSync(checkout);
  const out = fs.realpathSync(path.join(checkout, CONTRACT_DIR, 'out'));
  if (!out.startsWith(root + path.sep)) throw new Error(`./${CONTRACT_DIR}/out resolves outside the checkout (${out}); it must be a real directory in it, not a symlink.`);
  return out;
}

/** Read and check .ui-capture/app.json and the files its mode needs. */
export function readAppJson(checkout: string): { app?: AppJson; problems: string[] } {
  const dir = path.join(checkout, CONTRACT_DIR);
  let app: AppJson;
  try {
    app = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
  } catch (e) {
    return { problems: [`./${CONTRACT_DIR}/app.json is missing or not valid JSON (${(e as Error).message.split('\n')[0]}).`] };
  }
  const problems: string[] = [];
  if (app.mode !== 'static' && app.mode !== 'server') problems.push(`app.json "mode" must be "static" or "server" (got ${JSON.stringify(app.mode)}).`);
  if (!isAppPath(app.entry)) problems.push('app.json "entry" must be a path on the app starting with a single "/" (not "//host/...").');
  if (typeof app.notes !== 'string') problems.push('app.json "notes" must be a string.');
  if (!Array.isArray(app.stubs) || app.stubs.some((x) => typeof x?.service !== 'string' || typeof x?.how !== 'string')) {
    problems.push('app.json "stubs" must be a list of {"service": "...", "how": "..."} for every secret, API key or external service you faked ([] if none).');
  }
  if (app.mode === 'static') {
    if (!fs.existsSync(path.join(dir, 'out', 'index.html'))) problems.push(`Static mode, but ./${CONTRACT_DIR}/out/index.html does not exist.`);
    else try { staticDir(checkout); } catch (e) { problems.push((e as Error).message); }
  }
  if (app.mode === 'server' && !fs.existsSync(path.join(dir, 'start.sh'))) problems.push(`Server mode, but ./${CONTRACT_DIR}/start.sh does not exist.`);
  return { app, problems };
}

// -------------------------------------------------------------------- mise

export interface MiseCheck { tools: Record<string, string>; problems: string[] }

const EXACT = /^\d+(\.\d+){2,}([-+.][0-9A-Za-z.-]+)?$/;

/** Every tool the checkout's mise config asks for is pinned to an exact version and installed. */
export async function checkMise(checkout: string): Promise<MiseCheck> {
  const mise = findMise();
  if (!mise) return { tools: {}, problems: ['mise is not installed on the harness machine.'] };
  if (!['mise.toml', '.mise.toml'].some((f) => fs.existsSync(path.join(checkout, f)))) {
    return { tools: {}, problems: ['There is no mise.toml at the repo root. Pin every runtime and tool you used (node, the package manager, python, ...) there with exact versions and install them with mise.'] };
  }
  const out = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const p = spawn(mise, ['ls', '--current', '--json'], { cwd: checkout, env: { ...baseEnv(), ...miseEnv(checkout, mise), MISE_OFFLINE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', (e) => resolve({ code: 1, stdout, stderr: e.message }));
    p.on('exit', (code) => resolve({ code, stdout, stderr }));
  });
  let parsed: Record<string, { version: string; requested_version?: string; installed?: boolean; source?: { path?: string } }[]>;
  try { parsed = JSON.parse(out.stdout); } catch { return { tools: {}, problems: [`\`mise ls --current\` failed: ${out.stderr.trim().slice(0, 400)}`] }; }
  const tools: Record<string, string> = {};
  const problems: string[] = [];
  const real = (p: string) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  const root = real(checkout);
  for (const [name, entries] of Object.entries(parsed)) {
    for (const t of entries) {
      const from = t.source?.path ? real(t.source.path) : undefined;
      if (from && !(from === root || from.startsWith(root + path.sep))) continue; // not from this checkout's config
      const requested = t.requested_version ?? t.version;
      if (!EXACT.test(requested)) problems.push(`mise.toml pins ${name} = "${requested}"; use an exact version (e.g. "${t.version}").`);
      if (!t.installed) problems.push(`${name}@${t.version} is in mise.toml but not installed; run \`mise install\`.`);
      tools[name] = t.version;
    }
  }
  if (!Object.keys(tools).length && !problems.length) problems.push('mise.toml pins no tools. Pin the runtime and package manager you used.');
  return { tools, problems };
}

// ------------------------------------------------------------------ server

export interface RunningServer {
  url: string;
  /** Outside the checkout; removed by stop(). */
  logFile: string;
  stop(): Promise<void>;
}

/** start.sh process groups not yet stopped, whether or not start.sh itself is still running. */
const running = new Set<ChildProcess>();
process.once('exit', () => { for (const p of running) killGroup(p, 'SIGKILL'); });

function killGroup(p: ChildProcess, sig: NodeJS.Signals): void {
  try { if (p.pid) process.kill(-p.pid, sig); } catch { try { p.kill(sig); } catch { /* gone */ } }
}

/** Any process left in the group: start.sh, or children it backgrounded and outlived. */
function groupAlive(p: ChildProcess): boolean {
  try { if (p.pid) { process.kill(-p.pid, 0); return true; } } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; }
  return false;
}

export async function portInUse(port: number): Promise<boolean> {
  const tryHost = (host: string) => new Promise<boolean>((resolve) => {
    const s = net.connect({ host, port });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
    s.setTimeout(1000, () => { s.destroy(); resolve(false); });
  });
  return (await tryHost('127.0.0.1')) || (await tryHost('::1'));
}

/** Any HTTP response from localhost:port (IPv4 or IPv6). */
function answers(port: number): Promise<boolean> {
  const tryHost = (host: string) => new Promise<boolean>((resolve) => {
    const req = http.get({ host, port, path: '/', timeout: 4000 }, (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
  return tryHost('127.0.0.1').then((ok) => ok || tryHost('::1'));
}

/**
 * Stop processes left listening on `port` (any port if omitted) whose working
 * directory is inside `checkout`: dev servers the setup agent backgrounded.
 * Inside Claude Code's sandbox a later command cannot see or stop a process an
 * earlier command started, so the agent cannot clean these up itself.
 * Processes elsewhere are left alone. Returns the pids signalled.
 */
export async function stopStrays(checkout: string, port?: number): Promise<number[]> {
  const run = (args: string[]) => new Promise<string>((resolve) => {
    const p = spawn('lsof', args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('error', () => resolve(''));
    p.on('exit', () => resolve(out));
  });
  const root = fs.realpathSync(checkout);
  const pids = [...new Set((await run(['-nP', '-t', port ? `-iTCP:${port}` : '-iTCP', '-sTCP:LISTEN'])).split('\n').map(Number).filter((n) => n > 0 && n !== process.pid))];
  const stopped: number[] = [];
  for (const pid of pids) {
    const cwd = /^n(.*)$/m.exec(await run(['-a', '-p', String(pid), '-d', 'cwd', '-Fn']))?.[1];
    if (!cwd || !(cwd === root || cwd.startsWith(root + path.sep))) continue;
    try { process.kill(pid, 'SIGTERM'); stopped.push(pid); } catch { /* gone */ }
  }
  if (stopped.length) await new Promise((r) => setTimeout(r, 2000));
  return stopped;
}

export function logTail(file: string, lines = 40): string {
  try { return fs.readFileSync(file, 'utf8').split('\n').slice(-lines).join('\n').trim(); } catch { return ''; }
}

/** Environment for start.sh: no inherited secrets, caches and temp inside the checkout. */
function serverEnv(checkout: string, port: number): NodeJS.ProcessEnv {
  return { ...baseEnv(), ...runtimeEnv(checkout), PORT: String(port), HOST: 'localhost', BROWSER: 'none' };
}

export async function startServer(spec: AppSpec, opts: { sandbox: boolean; startupSeconds: number }): Promise<RunningServer> {
  const script = path.join(spec.checkout, CONTRACT_DIR, 'start.sh');
  if (!fs.existsSync(script)) throw new Error(`${spec.slug}: ${CONTRACT_DIR}/start.sh is missing`);
  if (await portInUse(spec.port)) throw new Error(`${spec.slug}: port ${spec.port} is already in use (another run, or a server left over from setup)`);
  const kind = opts.sandbox ? runtimeSandboxKind() : undefined;
  if (opts.sandbox && !kind) throw new Error('server-mode apps run under macOS sandbox-exec or Linux bubblewrap (/usr/bin/bwrap), neither of which is available here (set setup.sandbox: false in config/repos.yaml only on a throwaway machine)');
  // The log and sandbox profile live in a fresh dir of the harness's own, never in
  // the checkout: third-party code could have made a path there a symlink to a
  // host file, which opening it for writing (unsandboxed, here) would truncate.
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-capture-run-'));
  const logFile = path.join(runDir, 'server.log');
  const log = fs.openSync(logFile, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  let cmd = '/bin/bash';
  let args = [script];
  let bridge: PortBridge | undefined;
  if (kind === 'sandbox-exec') {
    const profileFile = path.join(runDir, 'profile.sb');
    fs.writeFileSync(profileFile, runtimeProfile([spec.checkout]));
    cmd = '/usr/bin/sandbox-exec';
    args = ['-f', profileFile, '/bin/bash', script];
  } else if (kind === 'bwrap') {
    // The bridge dir holds the inner script and the per-port sockets; the app can see it, never the log.
    const bridgeDir = path.join(runDir, 'bridge');
    fs.mkdirSync(bridgeDir, { mode: 0o700 });
    const inner = path.join(bridgeDir, 'bridge.mjs');
    fs.writeFileSync(inner, INNER_SCRIPT);
    cmd = BWRAP;
    args = [...bwrapArgs([spec.checkout], bridgeDir), '--chdir', spec.checkout, '--',
      '/bin/bash', '-c', '"$0" "$1" "$2" & exec /bin/bash "$3"', process.execPath, inner, bridgeDir, script];
    bridge = new PortBridge(bridgeDir);
  }
  const env = serverEnv(spec.checkout, spec.port);
  let proc: ChildProcess;
  try {
    proc = spawn(cmd, args, { cwd: spec.checkout, env, detached: true, stdio: ['ignore', log, log] });
  } finally {
    fs.closeSync(log);
  }
  running.add(proc);
  let exited: number | null | undefined;
  proc.once('exit', (code) => { exited = code; });
  // Stop the whole group even once start.sh has exited: servers it backgrounded
  // stay in its group (detached: true made it the leader) and would keep their ports.
  const stop = async () => {
    killGroup(proc, 'SIGTERM');
    for (const until = Date.now() + 8000; groupAlive(proc) && Date.now() < until;) await new Promise((r) => setTimeout(r, 100));
    if (groupAlive(proc)) killGroup(proc, 'SIGKILL');
    await bridge?.close();
    running.delete(proc);
    fs.rmSync(runDir, { recursive: true, force: true });
  };
  const fail = async (why: string) => {
    const tail = logTail(logFile);
    await stop();
    return new Error(`${why}\n${tail}`);
  };
  const deadline = Date.now() + opts.startupSeconds * 1000;
  while (Date.now() < deadline) {
    if (exited !== undefined) throw await fail(`start.sh exited (code ${exited}) before serving on port ${spec.port}.`);
    if (await answers(spec.port)) return { url: `http://localhost:${spec.port}/`, logFile, stop };
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw await fail(`start.sh did not answer on port ${spec.port} within ${opts.startupSeconds}s.`);
}

// ------------------------------------------------------------------- host

export class AppHost {
  private servers = new Map<string, { refs: number; ready: Promise<RunningServer> }>();
  /** Apps whose last view was released and whose server is still shutting down. */
  private stopping = new Map<string, Promise<void>>();
  private opts: { staticServer?: LocalServer; sandbox: boolean; startupSeconds: number; log?: (s: string) => void };

  constructor(opts: AppHost['opts']) {
    this.opts = opts;
  }

  /** Make the app reachable and return its base URL. Pair every acquire with a release. */
  async acquire(spec: AppSpec): Promise<string> {
    if (spec.mode === 'static') {
      if (!this.opts.staticServer) throw new Error(`${spec.slug}: static app but no static server`);
      return this.opts.staticServer.mount(spec.slug, staticDir(spec.checkout));
    }
    // A view queued behind the app's last one must not start a second server
    // while the first still holds the port.
    for (let st; (st = this.stopping.get(spec.slug));) await st;
    let s = this.servers.get(spec.slug);
    if (!s) {
      this.opts.log?.(`  starting ${spec.slug} on port ${spec.port}`);
      s = { refs: 0, ready: startServer(spec, this.opts) };
      this.servers.set(spec.slug, s);
      s.ready.catch(() => { if (this.servers.get(spec.slug) === s) this.servers.delete(spec.slug); });
    }
    s.refs++;
    try {
      return (await s.ready).url;
    } catch (e) {
      s.refs--;
      throw e;
    }
  }

  async release(spec: AppSpec): Promise<void> {
    if (spec.mode === 'static') return;
    const s = this.servers.get(spec.slug);
    if (!s || --s.refs > 0) return;
    this.servers.delete(spec.slug);
    this.opts.log?.(`  stopping ${spec.slug}`);
    const stopped: Promise<void> = (async () => { await (await s.ready.catch(() => undefined))?.stop(); })()
      .finally(() => { if (this.stopping.get(spec.slug) === stopped) this.stopping.delete(spec.slug); });
    this.stopping.set(spec.slug, stopped);
    await stopped;
  }

  async closeAll(): Promise<void> {
    const all = [...this.servers.values()];
    this.servers.clear();
    await Promise.all([...all.map(async (s) => (await s.ready.catch(() => undefined))?.stop()), ...this.stopping.values()]);
  }
}
