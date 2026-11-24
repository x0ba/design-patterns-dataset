#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const rawArgs = process.argv.slice(2);
let source = 'codex';
const payloadArgs = [];
for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--source') {
    source = rawArgs[i + 1] || source;
    i += 1;
    continue;
  }
  if (arg.startsWith('--source=')) {
    source = arg.slice('--source='.length) || source;
    continue;
  }
  payloadArgs.push(arg);
}

const trackerDir = "/Users/bryanmin/.cache/design-patterns-dataset/repos/repo-001/tokentracker/.ui-capture/home/.tokentracker/tracker";
const signalPath = "/Users/bryanmin/.cache/design-patterns-dataset/repos/repo-001/tokentracker/.ui-capture/home/.tokentracker/tracker/notify.signal";
const codexOriginalPath = "/Users/bryanmin/.cache/design-patterns-dataset/repos/repo-001/tokentracker/.ui-capture/home/.tokentracker/tracker/codex_notify_original.json";
const acodeOriginalPath = "/Users/bryanmin/.cache/design-patterns-dataset/repos/repo-001/tokentracker/.ui-capture/home/.tokentracker/tracker/acode_notify_original.json";
const codeOriginalPath = "/Users/bryanmin/.cache/design-patterns-dataset/repos/repo-001/tokentracker/.ui-capture/home/.tokentracker/tracker/code_notify_original.json";
const trackerBinPath = "/Users/bryanmin/.cache/design-patterns-dataset/repos/repo-001/tokentracker/.ui-capture/home/.tokentracker/tracker/app/bin/tracker.js";
  const depsMarkerPath = path.join(trackerDir, 'app', 'bin', 'tracker.js');
const fallbackPkg = "tokentracker-cli";
const selfPath = path.resolve(__filename);
const home = os.homedir();
const debugLogPath = path.join(trackerDir, 'notify.debug.jsonl');
const debugEnabled = ['1', 'true'].includes((process.env.TOKENTRACKER_NOTIFY_DEBUG || '').toLowerCase());
const debugMaxBytesRaw = Number.parseInt(process.env.TOKENTRACKER_NOTIFY_DEBUG_MAX_BYTES || '', 10);
const debugMaxBytes = Number.isFinite(debugMaxBytesRaw) && debugMaxBytesRaw > 0
  ? debugMaxBytesRaw
  : 1_000_000;

try {
  fs.mkdirSync(trackerDir, { recursive: true });
  fs.writeFileSync(signalPath, new Date().toISOString(), { encoding: 'utf8' });
} catch (_) {}

if (debugEnabled) {
  try {
    let size = 0;
    try {
      size = fs.statSync(debugLogPath).size;
    } catch (err) {
      if (err && err.code !== 'ENOENT') throw err;
    }
    if (size < debugMaxBytes) {
      const entry = {
        ts: new Date().toISOString(),
        source,
        cwd: process.cwd()
      };
      fs.appendFileSync(debugLogPath, JSON.stringify(entry) + os.EOL, 'utf8');
    }
  } catch (_) {}
}

// Capture before the throttle and before spawning sync. Never persist stdin.
if (source === 'claude') {
  try { captureClaudeBackend(trackerDir, JSON.parse(fs.readFileSync(0, 'utf8'))); } catch (_) {}
}
function backendFromUrl(value) {
  try {
    if (typeof value !== "string" || !value.trim()) return { backend: "unknown" };
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return { backend: "unknown" };
    const backend_origin = url.origin;
    return { backend: backend_origin === "https://api.anthropic.com" ? "anthropic" : "custom", backend_origin };
  } catch { return { backend: "unknown" }; }
}
function hashClaudeRange(filePath, start, end) {
  const fs = require("node:fs");
  const hash = require("node:crypto").createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(64 * 1024);
    for (let offset = start; offset < end;) {
      const read = fs.readSync(fd, buffer, 0, Math.min(buffer.length, end - offset), offset);
      if (!read) return null;
      hash.update(buffer.subarray(0, read));
      offset += read;
    }
    return hash.digest("hex");
  } finally { fs.closeSync(fd); }
}
function captureClaudeBackend(trackerDir, payload, env = process.env) {
  const fs = require("node:fs");
  const path = require("node:path");
  const crypto = require("node:crypto");
  const event = payload?.hook_event_name;
  if (!["SessionStart", "Stop", "SessionEnd"].includes(event)) return;
  if (typeof payload.transcript_path !== "string" || typeof payload.session_id !== "string" || !payload.session_id) return;
  const identity = backendFromUrl(env.ANTHROPIC_BASE_URL);
  const dir = path.join(trackerDir, "claude-backends");
  const file = crypto.createHash("sha256").update(path.resolve(payload.transcript_path)).digest("hex");
  const session = crypto.createHash("sha256").update(String(payload.session_id)).digest("hex");
  let stat;
  try { stat = fs.statSync(payload.transcript_path); } catch {
    if (event !== "SessionStart") return;
  }
  const observation = { event, session, inode: stat?.ino || 0, offset: stat?.size || 0, ...identity };
  const anchorPath = path.join(dir, file + ".current.json");
  let previous;
  try { previous = JSON.parse(fs.readFileSync(anchorPath, "utf8")); } catch { /* first observation */ }
  if (event === "Stop" && previous?.session === session && previous.event !== "SessionEnd"
      && previous.backend_origin && previous.backend_origin === identity.backend_origin
      && previous.offset < observation.offset) {
    observation.range_hash = hashClaudeRange(payload.transcript_path, previous.offset, observation.offset);
  }
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.appendFileSync(path.join(dir, file + ".jsonl"), JSON.stringify(observation) + "\n", { mode: 0o600 });
  fs.writeFileSync(anchorPath, JSON.stringify(observation), { mode: 0o600 });
  fs.writeFileSync(path.join(trackerDir, "claude-backend-current.json"), JSON.stringify(identity), { mode: 0o600 });
}

// Throttle spawn: at most once per 20 seconds.
try {
    const throttlePath = path.join(trackerDir, 'sync.throttle');
    const now = Date.now();
    let last = 0;
    try { last = Number(fs.readFileSync(throttlePath, 'utf8')) || 0; } catch (_) {}
    if (now - last > 20_000) {
    try { fs.writeFileSync(throttlePath, String(now), 'utf8'); } catch (_) {}
    const hasLocalRuntime = fs.existsSync(trackerBinPath);
    const hasLocalDeps = fs.existsSync(depsMarkerPath);
    const syncArgs = ['sync', '--auto', '--from-notify', '--source', source];
    if (hasLocalRuntime && hasLocalDeps) {
      spawnDetached([process.execPath, trackerBinPath, ...syncArgs]);
    } else {
      spawnDetached(['npx', '--yes', fallbackPkg, ...syncArgs]);
    }
  }
} catch (_) {}

// Chain the existing Codex, AStudio, or Every Code notify hook.
try {
  const originalPath =
    source === 'every-code'
      ? codeOriginalPath
      : source === 'acode'
        ? acodeOriginalPath
        : source === 'claude' || source === 'opencode' || source === 'gemini' || source === 'codebuddy' || source === 'workbuddy' || source === 'workbuddy-ai'
          ? null
          : codexOriginalPath;
  if (originalPath) {
    const original = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
    const cmd = Array.isArray(original?.notify) ? original.notify : null;
    if (cmd && cmd.length > 0 && !isSelfNotify(cmd) && shouldChainNotify(cmd)) {
      const args = cmd.slice(1);
      if (payloadArgs.length > 0 && !containsSequence(args, payloadArgs)) {
        args.push(...payloadArgs);
      }
      spawnDetached([cmd[0], ...args]);
    }
  }
} catch (_) {}

process.exit(0);

function spawnDetached(argv) {
  try {
    const child = cp.spawn(argv[0], argv.slice(1), {
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
      env: process.env
    });
    child.unref();
  } catch (_) {}
}

function resolveMaybeHome(p, baseDir = null) {
  if (typeof p !== 'string') return null;
  if (p.startsWith('~/')) return path.join(home, p.slice(2));
  if (p.startsWith('~\\')) return path.join(home, p.slice(2));
  if (path.isAbsolute(p)) return p;
  return path.resolve(baseDir || process.cwd(), p);
}

function isSelfNotify(cmd) {
  for (const part of cmd) {
    if (typeof part !== 'string') continue;
    if (!part.includes('notify.cjs')) continue;
    const resolved = resolveMaybeHome(part);
    if (resolved && isSelfNotifyPath(resolved)) return true;
    try {
      const nested = JSON.parse(part);
      if (Array.isArray(nested) && isSelfNotify(nested)) return true;
    } catch (_) {}
  }
  return false;
}

function isSelfNotifyPath(resolved) {
  if (resolved === selfPath) return true;
  // selfPath is realpath-resolved by Node; stored paths may reach the same
  // file through a symlink (e.g. a symlinked home directory).
  try {
    if (fs.realpathSync(resolved) === selfPath) return true;
  } catch (_) {}
  // Any notify.cjs under a .tokentracker dir is ours (matches the repair-time
  // isTokenTrackerNotify heuristic), even if that copy no longer exists.
  return resolved.replace(/\\/g, '/').includes('/.tokentracker/');
}

function shouldChainNotify(cmd) {
  if (!Array.isArray(cmd) || cmd.length === 0) return false;
  if (!isRunnableCommand(cmd[0])) return false;
  return hasRunnableInterpreterTarget(cmd);
}

function isRunnableCommand(command, baseDir = null) {
  if (typeof command !== 'string' || command.length === 0) return false;
  const explicitPath = isExplicitPath(command);
  if (!explicitPath) return true;
  const resolved = resolveMaybeHome(command, baseDir);
  if (!resolved) return false;
  try {
    fs.accessSync(resolved, fs.constants.X_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function hasRunnableInterpreterTarget(cmd) {
  const normalized = normalizeInterpreterCommand(cmd);
  const interpreterCmd = normalized?.cmd;
  if (!interpreterCmd || interpreterCmd.length === 0) return false;
  const targetIndex = findInterpreterTargetIndex(interpreterCmd);
  if (targetIndex == null) {
    const command = interpreterCmd[0];
    if (!isExplicitPath(command)) return true;
    return isRunnableCommand(command, normalized.cwd);
  }
  if (targetIndex === -2) return true;
  if (targetIndex === -1) return false;
  const target = interpreterCmd[targetIndex];
  if (!isExplicitPath(target)) return false;
  const targetCwd = isBunCommand(interpreterCmd[0])
    ? findBunScriptCwd(interpreterCmd, 1, normalized.cwd)
    : normalized.cwd;
  return isReadablePath(target, targetCwd);
}

function normalizeInterpreterCommand(cmd) {
  if (!isEnvCommand(cmd[0])) return { cmd, cwd: null };
  return extractEnvCommand(cmd);
}

function findInterpreterTargetIndex(cmd) {
  const command = cmd[0];
  if (isNodeCommand(command)) {
    return findNodeLikeScriptIndex(cmd, 1);
  }
  if (isBunCommand(command)) {
    return findBunScriptIndex(cmd, 1);
  }
  if (isDenoCommand(command)) {
    return findDenoScriptIndex(cmd, 1);
  }
  return null;
}

function isEnvCommand(command) {
  const base = commandBase(command);
  return base === 'env';
}

function extractEnvCommand(cmd) {
  return normalizeEnvArgs(cmd.slice(1));
}

function normalizeEnvArgs(args, cwd = null) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== 'string' || arg.length === 0) return null;
    if (arg === '-' || arg === '--ignore-environment' || isEnvValuelessShortOption(arg)) continue;
    if (arg === '--') return normalizeEnvCommandOperands(args.slice(i + 1), cwd);
    if (arg === '-S' || arg === '--split-string') {
      const split = splitEnvString(args[i + 1]);
      if (!split) return null;
      return normalizeEnvArgs(split.concat(args.slice(i + 2)), cwd);
    }
    if (arg.startsWith('--split-string=')) {
      const split = splitEnvString(arg.slice('--split-string='.length));
      if (!split) return null;
      return normalizeEnvArgs(split.concat(args.slice(i + 1)), cwd);
    }
    if (arg === '-u' || arg === '--unset') {
      i += 1;
      continue;
    }
    if (arg.startsWith('--unset=')) continue;
    if (arg === '-C' || arg === '--chdir') {
      const next = args[i + 1];
      if (typeof next !== 'string' || next.length === 0) return null;
      cwd = resolveMaybeHome(next, cwd);
      i += 1;
      continue;
    }
    if (arg.startsWith('--chdir=')) {
      const dir = arg.slice('--chdir='.length);
      if (dir.length === 0) return null;
      cwd = resolveMaybeHome(dir, cwd);
      continue;
    }
    if (isEnvValueOption(arg)) {
      i += 1;
      continue;
    }
    if (isEnvInlineValueOption(arg)) continue;
    if (arg.startsWith('-')) return null;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(arg)) continue;
    return { cmd: args.slice(i), cwd };
  }
  return null;
}

function normalizeEnvCommandOperands(args, cwd) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== 'string' || arg.length === 0) return null;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(arg)) continue;
    if (arg.startsWith('-')) return null;
    return { cmd: args.slice(i), cwd };
  }
  return null;
}

function isEnvValuelessShortOption(arg) {
  return /^-[0iv]+$/.test(arg);
}

function isEnvValueOption(arg) {
  return arg === '-P' || arg === '--path';
}

function isEnvInlineValueOption(arg) {
  return (
    arg.startsWith('--path=')
  );
}

function splitEnvString(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const parts = [];
  let current = '';
  let quote = null;
  let escaped = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current.length > 0) {
        parts.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (escaped || quote) return null;
  if (current.length > 0) parts.push(current);
  return parts.length > 0 ? parts : null;
}

function isNodeCommand(command) {
  const base = commandBase(command);
  return base === 'node';
}

function isBunCommand(command) {
  const base = commandBase(command);
  return base === 'bun';
}

function isDenoCommand(command) {
  const base = commandBase(command);
  return base === 'deno';
}

function commandBase(command) {
  if (typeof command !== 'string' || command.length === 0) return '';
  const posixBase = path.basename(command);
  const winBase = path.win32.basename(command);
  const base = winBase.length < posixBase.length ? winBase : posixBase;
  return base.replace(/\.exe$/i, '').toLowerCase();
}

function findNodeLikeScriptIndex(cmd, startIndex) {
  for (let i = startIndex; i < cmd.length; i++) {
    const arg = cmd[i];
    if (typeof arg !== 'string' || arg.length === 0) return -1;
    if (arg === '-e' || arg === '--eval' || arg === '-p' || arg === '--print') return -2;
    if (arg.startsWith('--eval=') || arg.startsWith('--print=')) return -2;
    if (isNodeLikeOptionWithValue(arg)) {
      i += 1;
      continue;
    }
    if (hasInlineNodeLikeOptionValue(arg)) continue;
    if (isNodeLikeValuelessOption(arg)) continue;
    if (arg.startsWith('-')) return -1;
    return i;
  }
  return -1;
}

function findBunScriptIndex(cmd, startIndex) {
  for (let i = startIndex; i < cmd.length; i++) {
    const arg = cmd[i];
    if (typeof arg !== 'string' || arg.length === 0) return -1;
    if (arg === '-e' || arg === '--eval' || arg === '-p' || arg === '--print') return -2;
    if (arg.startsWith('--eval=') || arg.startsWith('--print=')) return -2;
    if (isBunOptionWithValue(arg)) {
      i += 1;
      continue;
    }
    if (hasInlineBunOptionValue(arg)) continue;
    if (isBunValuelessOption(arg)) continue;
    if (arg === 'run') {
      return findScriptAfterSubcommand(cmd, i + 1, 'bun');
    }
    if (arg.startsWith('-')) return -1;
    return i;
  }
  return -1;
}

function findBunScriptCwd(cmd, startIndex, baseDir = null) {
  let cwd = baseDir;
  for (let i = startIndex; i < cmd.length; i++) {
    const arg = cmd[i];
    if (typeof arg !== 'string' || arg.length === 0) return cwd;
    if (arg === '--cwd') {
      const next = cmd[i + 1];
      if (typeof next !== 'string' || next.length === 0) return cwd;
      cwd = resolveMaybeHome(next, cwd);
      i += 1;
      continue;
    }
    if (arg.startsWith('--cwd=')) {
      const next = arg.slice('--cwd='.length);
      if (next.length === 0) return cwd;
      cwd = resolveMaybeHome(next, cwd);
      continue;
    }
    if (arg === '-e' || arg === '--eval' || arg === '-p' || arg === '--print') return cwd;
    if (arg.startsWith('--eval=') || arg.startsWith('--print=')) return cwd;
    if (isBunOptionWithValue(arg)) {
      i += 1;
      continue;
    }
    if (hasInlineBunOptionValue(arg)) continue;
    if (isBunValuelessOption(arg)) continue;
    if (arg === 'run') return findBunScriptCwd(cmd, i + 1, cwd);
    return cwd;
  }
  return cwd;
}

function findDenoScriptIndex(cmd, startIndex) {
  for (let i = startIndex; i < cmd.length; i++) {
    const arg = cmd[i];
    if (typeof arg !== 'string' || arg.length === 0) return -1;
    if (arg === 'eval') return -2;
    if (arg === 'run' || arg === 'test' || arg === 'bench' || arg === 'check') {
      return findScriptAfterSubcommand(cmd, i + 1, 'deno');
    }
    if (isDenoOptionWithValue(arg)) {
      i += 1;
      continue;
    }
    if (hasInlineDenoOptionValue(arg)) continue;
    if (isDenoValuelessOption(arg)) continue;
    if (arg.startsWith('-')) return -1;
    return i;
  }
  return -1;
}

function findScriptAfterSubcommand(cmd, startIndex, runtime) {
  for (let i = startIndex; i < cmd.length; i++) {
    const arg = cmd[i];
    if (typeof arg !== 'string' || arg.length === 0) return -1;
    if (runtime === 'bun' && isBunOptionWithValue(arg)) {
      i += 1;
      continue;
    }
    if (runtime === 'deno' && isDenoOptionWithValue(arg)) {
      i += 1;
      continue;
    }
    if (runtime === 'bun' && hasInlineBunOptionValue(arg)) continue;
    if (runtime === 'deno' && hasInlineDenoOptionValue(arg)) continue;
    if (runtime === 'bun' && isBunValuelessOption(arg)) continue;
    if (runtime === 'deno' && isDenoValuelessOption(arg)) continue;
    if (arg.startsWith('-')) return -1;
    return i;
  }
  return -1;
}

function isNodeLikeOptionWithValue(arg) {
  return (
    arg === '-C' ||
    arg === '-r' ||
    arg === '--conditions' ||
    arg === '--debug-port' ||
    arg === '--disable-warning' ||
    arg === '--env-file' ||
    arg === '--env-file-if-exists' ||
    arg === '--experimental-config-file' ||
    arg === '--experimental-loader' ||
    arg === '--import' ||
    arg === '--inspect-publish-uid' ||
    arg === '--loader' ||
    arg === '--localstorage-file' ||
    arg === '--require'
  );
}

function hasInlineNodeLikeOptionValue(arg) {
  return (
    arg.startsWith('--conditions=') ||
    arg.startsWith('--debug-port=') ||
    arg.startsWith('--disable-warning=') ||
    arg.startsWith('--env-file=') ||
    arg.startsWith('--env-file-if-exists=') ||
    arg.startsWith('--experimental-config-file=') ||
    arg.startsWith('--experimental-loader=') ||
    arg.startsWith('--import=') ||
    arg.startsWith('--inspect-publish-uid=') ||
    arg.startsWith('--loader=') ||
    arg.startsWith('--localstorage-file=') ||
    arg.startsWith('--require=')
  );
}

function isNodeLikeValuelessOption(arg) {
  return (
    arg === '-' ||
    arg === '-c' ||
    arg === '--' ||
    arg === '--check' ||
    arg === '--cpu-prof' ||
    arg === '--enable-source-maps' ||
    arg === '--expose-gc' ||
    arg === '--inspect' ||
    arg === '--inspect-brk' ||
    arg === '--inspect-wait' ||
    arg === '--no-deprecation' ||
    arg === '--no-warnings' ||
    arg === '--preserve-symlinks' ||
    arg === '--preserve-symlinks-main' ||
    arg === '--throw-deprecation' ||
    arg === '--trace-deprecation' ||
    arg === '--trace-warnings'
  );
}

function isBunOptionWithValue(arg) {
  return (
    arg === '-c' ||
    arg === '-d' ||
    arg === '-F' ||
    arg === '-l' ||
    arg === '-r' ||
    arg === '--config' ||
    arg === '--conditions' ||
    arg === '--console-depth' ||
    arg === '--cpu-prof-dir' ||
    arg === '--cpu-prof-interval' ||
    arg === '--cpu-prof-name' ||
    arg === '--cwd' ||
    arg === '--define' ||
    arg === '--dns-result-order' ||
    arg === '--drop' ||
    arg === '--elide-lines' ||
    arg === '--env-file' ||
    arg === '--extension-order' ||
    arg === '--feature' ||
    arg === '--fetch-preconnect' ||
    arg === '--filter' ||
    arg === '--import' ||
    arg === '--inspect' ||
    arg === '--inspect-brk' ||
    arg === '--inspect-wait' ||
    arg === '--install' ||
    arg === '--jsx-factory' ||
    arg === '--jsx-fragment' ||
    arg === '--jsx-import-source' ||
    arg === '--jsx-runtime' ||
    arg === '--loader' ||
    arg === '--main-fields' ||
    arg === '--max-http-header-size' ||
    arg === '--port' ||
    arg === '--preload' ||
    arg === '--require' ||
    arg === '--shell' ||
    arg === '--title' ||
    arg === '--tsconfig-override' ||
    arg === '--unhandled-rejections' ||
    arg === '--user-agent'
  );
}

function hasInlineBunOptionValue(arg) {
  return (
    arg.startsWith('--config=') ||
    arg.startsWith('--conditions=') ||
    arg.startsWith('--console-depth=') ||
    arg.startsWith('--cpu-prof-dir=') ||
    arg.startsWith('--cpu-prof-interval=') ||
    arg.startsWith('--cpu-prof-name=') ||
    arg.startsWith('--cwd=') ||
    arg.startsWith('--define=') ||
    arg.startsWith('--dns-result-order=') ||
    arg.startsWith('--drop=') ||
    arg.startsWith('--elide-lines=') ||
    arg.startsWith('--env-file=') ||
    arg.startsWith('--extension-order=') ||
    arg.startsWith('--feature=') ||
    arg.startsWith('--fetch-preconnect=') ||
    arg.startsWith('--filter=') ||
    arg.startsWith('--import=') ||
    arg.startsWith('--inspect=') ||
    arg.startsWith('--inspect-brk=') ||
    arg.startsWith('--inspect-wait=') ||
    arg.startsWith('--install=') ||
    arg.startsWith('--jsx-factory=') ||
    arg.startsWith('--jsx-fragment=') ||
    arg.startsWith('--jsx-import-source=') ||
    arg.startsWith('--jsx-runtime=') ||
    arg.startsWith('--loader=') ||
    arg.startsWith('--main-fields=') ||
    arg.startsWith('--max-http-header-size=') ||
    arg.startsWith('--port=') ||
    arg.startsWith('--preload=') ||
    arg.startsWith('--require=') ||
    arg.startsWith('--shell=') ||
    arg.startsWith('--title=') ||
    arg.startsWith('--tsconfig-override=') ||
    arg.startsWith('--unhandled-rejections=') ||
    arg.startsWith('--user-agent=')
  );
}

function isBunValuelessOption(arg) {
  return (
    arg === '-b' ||
    arg === '-i' ||
    arg === '--bun' ||
    arg === '--cpu-prof' ||
    arg === '--cpu-prof-md' ||
    arg === '--expose-gc' ||
    arg === '--heap-prof' ||
    arg === '--heap-prof-md' ||
    arg === '--hot' ||
    arg === '--if-present' ||
    arg === '--ignore-dce-annotations' ||
    arg === '--jsx-side-effects' ||
    arg === '--no-addons' ||
    arg === '--no-clear-screen' ||
    arg === '--no-deprecation' ||
    arg === '--no-env-file' ||
    arg === '--no-exit-on-error' ||
    arg === '--no-install' ||
    arg === '--no-macros' ||
    arg === '--parallel' ||
    arg === '--prefer-latest' ||
    arg === '--prefer-offline' ||
    arg === '--preserve-symlinks' ||
    arg === '--preserve-symlinks-main' ||
    arg === '--redis-preconnect' ||
    arg === '--sequential' ||
    arg === '--silent' ||
    arg === '--smol' ||
    arg === '--sql-preconnect' ||
    arg === '--throw-deprecation' ||
    arg === '--use-bundled-ca' ||
    arg === '--use-openssl-ca' ||
    arg === '--use-system-ca' ||
    arg === '--watch' ||
    arg === '--workspaces' ||
    arg === '--zero-fill-buffers'
  );
}

function isDenoOptionWithValue(arg) {
  return (
    arg === '-c' ||
    arg === '--cert' ||
    arg === '--conditions' ||
    arg === '--config' ||
    arg === '--cpu-prof-dir' ||
    arg === '--cpu-prof-interval' ||
    arg === '--cpu-prof-name' ||
    arg === '--ext' ||
    arg === '--import-map' ||
    arg === '--location' ||
    arg === '--lock' ||
    arg === '--minimum-dependency-age' ||
    arg === '--preload' ||
    arg === '--require' ||
    arg === '--seed'
  );
}

function hasInlineDenoOptionValue(arg) {
  return (
    arg.startsWith('--cert=') ||
    arg.startsWith('--conditions=') ||
    arg.startsWith('--config=') ||
    arg.startsWith('--coverage=') ||
    arg.startsWith('--cpu-prof-dir=') ||
    arg.startsWith('--cpu-prof-interval=') ||
    arg.startsWith('--cpu-prof-name=') ||
    arg.startsWith('--env-file=') ||
    arg.startsWith('--ext=') ||
    arg.startsWith('--import-map=') ||
    arg.startsWith('--location=') ||
    arg.startsWith('--lock=') ||
    arg.startsWith('--minimum-dependency-age=') ||
    arg.startsWith('--node-modules-dir=') ||
    arg.startsWith('--preload=') ||
    arg.startsWith('--require=') ||
    arg.startsWith('--seed=') ||
    arg.startsWith('--vendor=') ||
    arg.startsWith('--v8-flags=') ||
    /^--(allow|deny|ignore)-[A-Za-z-]+=/.test(arg) ||
    arg.startsWith('--permission-set=') ||
    arg.startsWith('--reload=') ||
    arg.startsWith('--tunnel=') ||
    arg.startsWith('--watch=') ||
    arg.startsWith('--watch-exclude=') ||
    arg.startsWith('--watch-hmr=')
  );
}

function isDenoValuelessOption(arg) {
  return (
    arg === '-A' ||
    arg === '-P' ||
    arg === '-q' ||
    arg === '-r' ||
    arg === '-t' ||
    arg === '--allow-all' ||
    arg === '--cached-only' ||
    arg === '--coverage' ||
    arg === '--cpu-prof' ||
    arg === '--cpu-prof-flamegraph' ||
    arg === '--cpu-prof-md' ||
    arg === '--env-file' ||
    arg === '--frozen' ||
    arg === '--no-check' ||
    arg === '--no-clear-screen' ||
    arg === '--no-code-cache' ||
    arg === '--no-config' ||
    arg === '--no-lock' ||
    arg === '--no-npm' ||
    arg === '--no-prompt' ||
    arg === '--no-remote' ||
    arg === '--node-modules-dir' ||
    arg === '--quiet' ||
    arg === '--reload' ||
    arg === '--tunnel' ||
    arg === '--unstable' ||
    arg === '--v8-flags' ||
    arg === '--vendor' ||
    arg === '--watch' ||
    arg === '--watch-exclude' ||
    arg === '--watch-hmr' ||
    /^-[RWINESA]$/.test(arg) ||
    /^--(allow|deny|ignore)-[A-Za-z-]+$/.test(arg) ||
    arg === '--permission-set'
  );
}

function isReadablePath(target, baseDir = null) {
  const resolved = resolveMaybeHome(target, baseDir);
  if (!resolved) return false;
  try {
    fs.accessSync(resolved, fs.constants.R_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function isExplicitPath(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  return value.startsWith('~/') || value.startsWith('~\\') || value.includes('/') || value.includes('\\') || /^[A-Za-z]:/.test(value);
}

function containsSequence(haystack, needle) {
  if (!Array.isArray(haystack) || !Array.isArray(needle) || needle.length === 0) return false;
  if (needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let matched = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}
