// Containment for third-party code. Setting up a repo runs its install and
// build scripts (and those of its dependencies); serving it runs its server.
// Neither should be able to touch anything but its own checkout.
//
// - Setup: the coding agent's Bash runs inside Claude Code's sandbox. Writes
//   are confined to the checkout (plus the session temp dir), network goes
//   only to package registries and GitHub (config/repos.yaml setup.network),
//   and credential dirs are unreadable. Package-manager caches are pointed into
//   the checkout so installs work without writing to ~.
// - Serving: .ui-capture/start.sh runs under macOS sandbox-exec, or on Linux
//   under bubblewrap, with the same file rules and no network except localhost.
//   Static builds need no process. bubblewrap gives the app its own network
//   namespace (loopback only); src/repos/netbridge.ts exposes its listening
//   ports on the host's loopback so the browser can reach them.
//
// Both were checked by hand on macOS: writes to ~ and reads of ~/.ssh fail
// with EPERM, unlisted hosts are refused, localhost serving works. The Linux
// runtime sandbox was checked the same way (writes outside the checkout fail
// with EROFS, ~/.ssh reads empty, DNS and outside hosts fail, serving works).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Credential and config dirs third-party code has no reason to read. */
export const DENY_READ = ['.ssh', '.aws', '.gnupg', '.config/gh', '.config/gcloud', '.azure', '.kube', '.docker', '.netrc', '.npmrc', '.pypirc', '.git-credentials', '.claude', 'Library/Keychains'];

/**
 * Absolute paths third-party code must not read: DENY_READ under `home`, plus
 * Claude Code's config dir if CLAUDE_CONFIG_DIR moves it out of ~/.claude (the
 * setup session is given that variable, and the login may live there).
 */
export function denyReadPaths(home = os.homedir(), env: NodeJS.ProcessEnv = process.env): string[] {
  const paths = DENY_READ.map((d) => path.join(home, d));
  if (env.CLAUDE_CONFIG_DIR) paths.push(path.resolve(home, env.CLAUDE_CONFIG_DIR.replace(/^~(?=$|\/)/, home)));
  const real = (p: string) => { try { return fs.realpathSync(p); } catch { return p; } };
  return [...new Set(paths.flatMap((p) => [p, real(p)]))];
}

/** An executable named `name` on PATH. */
function onPath(name: string): boolean {
  return (process.env.PATH ?? '').split(path.delimiter).some((d) => {
    try { fs.accessSync(path.join(d, name), fs.constants.X_OK); return true; } catch { return false; }
  });
}

/**
 * Why Claude Code's sandbox cannot run here, or undefined if it can. On Linux it
 * needs bubblewrap and socat, and without them the CLI only prints a warning and
 * runs every command unsandboxed, so setup must check before it starts a session.
 */
export function claudeSandboxProblem(): string | undefined {
  if (process.platform === 'darwin') return undefined;
  if (process.platform !== 'linux') return `Claude Code's sandbox does not support ${process.platform}`;
  const missing = ['bwrap', 'socat'].filter((n) => !onPath(n));
  return missing.length ? `Claude Code's sandbox needs ${missing.join(' and ')} on Linux (apt install bubblewrap socat); without them it runs commands unsandboxed` : undefined;
}

/** Claude Code `--settings` for a sandboxed setup session in `checkout`. */
export function claudeSandboxSettings(network: string[], home = os.homedir(), env: NodeJS.ProcessEnv = process.env): object {
  const paths = denyReadPaths(home, env);
  // Under home both syntaxes take `~/rel`; elsewhere the sandbox takes `/abs` and permission rules `//abs`.
  const rel = (p: string) => (p.startsWith(home + path.sep) ? `~/${path.relative(home, p)}` : undefined);
  const sandboxPath = (p: string) => rel(p) ?? p;
  const rulePath = (p: string) => rel(p) ?? `/${p}`;
  return {
    sandbox: {
      enabled: true,
      autoAllowBashIfSandboxed: true,
      allowUnsandboxedCommands: false,
      network: { allowedDomains: network, allowLocalBinding: true },
      filesystem: { denyRead: paths.map(sandboxPath) },
      // Allows com.apple.trustd.agent. Without it, mise (rustls with the macOS
      // platform verifier) fails every HTTPS request with "invalid peer
      // certificate: OSStatus -26276", and agents fall back to plain-HTTP
      // runtime downloads. Claude Code flags this as weaker isolation (trustd
      // as a low-bandwidth exfiltration path); the network allowlist still holds.
      enableWeakerNetworkIsolation: true,
    },
    // The file tools are not part of the Bash sandbox; keep them out of the same places.
    permissions: { deny: paths.map(rulePath).flatMap((d) => [`Read(${d}/**)`, `Read(${d})`]) },
  };
}

// -------------------------------------------------------------------- env
//
// Third-party code (install scripts, start.sh, anything the setup agent runs)
// sees only these variables from the harness's environment: no tokens, API
// keys or cloud credentials the user happens to have exported.

const BASE_ENV = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TERM', 'TMPDIR', 'NVM_DIR', 'VOLTA_HOME', 'FNM_DIR', 'PNPM_HOME'];

/** The allowlisted part of the harness's environment, plus `extra` names. */
export function baseEnv(extra: string[] = []): Record<string, string> {
  const env: Record<string, string> = {};
  for (const k of [...BASE_ENV, ...extra]) if (process.env[k]) env[k] = process.env[k]!;
  return env;
}

/**
 * Environment for a setup session in `checkout`: the base env, what Claude Code
 * itself needs to find its login (the macOS keychain via HOME/USER, or
 * CLAUDE_CONFIG_DIR), and the checkout's caches. Its Bash tool inherits all of it.
 */
export function setupEnv(checkout: string): Record<string, string> {
  return { ...baseEnv(['CLAUDE_CONFIG_DIR', 'NODE_EXTRA_CA_CERTS']), ...checkoutEnv(checkout) };
}

// ------------------------------------------------------------------- mise
//
// Runtimes and tools (node, pnpm, python, ...) come from mise, pinned in the
// checkout's mise.toml, so a setup can be replayed with the same versions. Each
// checkout gets its own mise config, data, cache and state dirs (inside the
// sandbox-writable checkout), so neither your global mise config nor tools
// installed on this machine leak in. The checkout's shims go first on PATH, so
// `node` etc. resolve to the pinned versions in the agent's shell and in start.sh.

/** The mise executable (not a shim), or undefined if mise is not installed. */
export function findMise(): string | undefined {
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter((d) => d && !/[/\\]mise[/\\]shims$/.test(d));
  for (const d of [...dirs, path.join(os.homedir(), '.local', 'bin'), '/opt/homebrew/bin', '/usr/local/bin']) {
    const f = path.join(d, 'mise');
    try { fs.accessSync(f, fs.constants.X_OK); return fs.realpathSync(f); } catch { /* next */ }
  }
  return undefined;
}

export const miseDir = (checkout: string) => path.join(checkout, '.ui-capture', 'mise');

export function miseEnv(checkout: string, mise = findMise()): Record<string, string> {
  const m = miseDir(checkout);
  const inherited = (process.env.PATH ?? '').split(path.delimiter).filter((d) => d && !/[/\\]mise[/\\]shims$/.test(d));
  return {
    MISE_DATA_DIR: path.join(m, 'data'),
    MISE_CACHE_DIR: path.join(m, 'cache'),
    MISE_STATE_DIR: path.join(m, 'state'),
    MISE_CONFIG_DIR: path.join(m, 'config'),
    MISE_GLOBAL_CONFIG_FILE: path.join(m, 'config', 'config.toml'),
    MISE_TRUSTED_CONFIG_PATHS: checkout,
    MISE_YES: '1',
    MISE_HIDE_UPDATE_WARNING: '1',
    PATH: [path.join(m, 'data', 'shims'), ...(mise ? [path.dirname(mise)] : []), ...inherited].join(path.delimiter),
  };
}

/** Env for setup and serving: mise, package-manager caches and tool downloads inside the checkout. */
export function checkoutEnv(checkout: string): Record<string, string> {
  const c = path.join(checkout, '.ui-capture', 'cache');
  return {
    ...miseEnv(checkout),
    npm_config_cache: path.join(c, 'npm'),
    npm_config_store_dir: path.join(c, 'pnpm-store'),
    npm_config_update_notifier: 'false',
    YARN_CACHE_FOLDER: path.join(c, 'yarn'),
    YARN_GLOBAL_FOLDER: path.join(c, 'yarn-global'),
    COREPACK_HOME: path.join(c, 'corepack'),
    BUN_INSTALL_CACHE_DIR: path.join(c, 'bun'),
    DENO_DIR: path.join(c, 'deno'),
    PIP_CACHE_DIR: path.join(c, 'pip'),
    XDG_CACHE_HOME: path.join(c, 'xdg'),
    XDG_DATA_HOME: path.join(c, 'xdg-data'),
    PUPPETEER_SKIP_DOWNLOAD: '1',
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
    CYPRESS_INSTALL_BINARY: '0',
    NEXT_TELEMETRY_DISABLED: '1',
    NUXT_TELEMETRY_DISABLED: '1',
    ASTRO_TELEMETRY_DISABLED: '1',
    DO_NOT_TRACK: '1',
    CI: '1',
  };
}

/** Extra env for a served app: its own temp dir, since the runtime sandbox allows no other. */
export function runtimeEnv(checkout: string): Record<string, string> {
  const tmp = path.join(checkout, '.ui-capture', 'tmp');
  fs.mkdirSync(tmp, { recursive: true });
  // MISE_OFFLINE: everything was installed during setup, and serving has no network.
  return { ...checkoutEnv(checkout), MISE_OFFLINE: '1', TMPDIR: tmp, TMP: tmp, TEMP: tmp };
}

const sbString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** sandbox-exec profile: write only `writable` dirs, no reads of credential dirs, network to localhost only. */
export function runtimeProfile(writable: string[], home = os.homedir()): string {
  const real = (p: string) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  const dirs = [...new Set(writable.flatMap((d) => [path.resolve(d), real(d)]))];
  const deny = [...new Set(denyReadPaths(real(home)).map(real))];
  return `(version 1)
(allow default)
(deny file-write*)
(allow file-write*
${dirs.map((d) => `  (subpath ${sbString(d)})`).join('\n')}
  (literal "/dev/null") (literal "/dev/zero") (literal "/dev/dtracehelper")
  (regex #"^/dev/tty") (regex #"^/dev/fd/"))
(deny file-read*
${deny.map((d) => `  (subpath ${sbString(d)})`).join('\n')})
(deny network-outbound)
(allow network-outbound (remote ip "localhost:*") (remote unix-socket))
`;
}

export const BWRAP = '/usr/bin/bwrap';

/**
 * bubblewrap arguments (before the command) for the Linux runtime sandbox: the
 * host's files read-only, `writable` dirs and `bridgeDir` read-write, a fresh
 * /tmp, credential dirs hidden, and its own network, pid and ipc namespaces.
 */
export function bwrapArgs(writable: string[], bridgeDir: string, home = os.homedir()): string[] {
  const real = (p: string) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  const args = ['--ro-bind', '/', '/', '--dev', '/dev', '--proc', '/proc', '--tmpfs', '/tmp'];
  for (const d of new Set([...writable.map(real), real(bridgeDir)])) args.push('--bind', d, d);
  for (const d of new Set(denyReadPaths(real(home)).map(real))) {
    let st: fs.Stats;
    try { st = fs.statSync(d); } catch { continue; }
    if (st.isDirectory()) args.push('--tmpfs', d);
    else args.push('--ro-bind', '/dev/null', d);
  }
  args.push('--unshare-net', '--unshare-pid', '--unshare-ipc', '--unshare-uts', '--die-with-parent');
  return args;
}

/** Which runtime sandbox serves server-mode apps here, if any. */
export function runtimeSandboxKind(): 'sandbox-exec' | 'bwrap' | undefined {
  if (process.platform === 'darwin' && fs.existsSync('/usr/bin/sandbox-exec')) return 'sandbox-exec';
  if (process.platform === 'linux' && fs.existsSync(BWRAP)) return 'bwrap';
  return undefined;
}

export const runtimeSandboxAvailable = () => runtimeSandboxKind() !== undefined;
