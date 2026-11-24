// Set up one repo: clone it at the pinned commit, then have a sandboxed Claude
// Code session get its UI running, the way a person would ask a coding agent
// to "get this running so I can look at it".
//
// The prompt asks for three things beyond "make it run": tools installed with
// mise and pinned to exact versions in mise.toml (reproducible); secrets, API
// keys and external services faked with local stubs that return realistic
// responses (listed in app.json "stubs"); and data seeded like an established
// user's, through the app's own paths.
//
// The session's Bash runs in Claude Code's sandbox (src/repos/sandbox.ts):
// writes only inside the checkout, network only to package registries, mise's
// sources and GitHub, credential dirs unreadable, and an allowlisted
// environment (no exported tokens or keys). The session loads no
// settings files from the checkout. When the agent stops, the harness checks
// the contract it left in .ui-capture/ (src/repos/apps.ts): serves the static
// build or starts start.sh itself (sandboxed, no network), and opens the entry
// page at 1440×900. A missing or broken result goes back to the same session,
// up to `repairRounds` times.
//
// repos/<batch>/<slug>/
//   setup.json              repo + commit, mode, entry, login, stubs, tool versions, verification, cost, change stats
//   setup.transcript.jsonl  the coding session
//   setup.patch             the agent's changes to the repo's files, incl. mise.toml (if under 5 MB)
//   ui-capture/             the agent's .ui-capture/ files: app.json, start.sh, seed and stub scripts
//   mise.toml               copy of the pinned tool versions
//   preview.png             the entry page as verified
// The checkout itself stays under setup.checkoutRoot (not versioned).

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Browser } from 'playwright';
import { inspectUrl, type Verification } from '../generate/app.ts';
import { runCodingSession, withUsageRetry, type CodingSessionOutcome } from '../generate/claude.ts';
import { VIEWPORT } from '../pipeline/capture.ts';
import type { LocalServer } from '../pipeline/serve.ts';
import { appUrl } from '../pipeline/steps.ts';
import { writeJson } from '../pipeline/sites.ts';
import { UsageLimitError } from '../pipeline/usage-limit.ts';
import { checkMise, CONTRACT_DIR, readAppJson, startServer, staticDir, stopStrays, type AppJson } from './apps.ts';
import { checkoutDir, recordDir, type ReposConfig, type RepoEntry } from './frame.ts';
import { claudeSandboxProblem, claudeSandboxSettings, setupEnv } from './sandbox.ts';

const run = promisify(execFile);
const MAX_PATCH = 5 * 1024 * 1024;

export interface SetupRecord {
  batch: string;
  slug: string;
  ok: boolean;
  error?: string;
  repo: { name: string; url: string; commit: string; branch: string; license: string };
  domain: string;
  port: number;
  /** setup.checkoutRoot the checkout was made under (as configured, ~ unexpanded), so labeling finds it whatever config it runs with. */
  checkoutRoot: string;
  mode?: AppJson['mode'];
  entry?: string;
  app?: AppJson;
  /** Tool versions from the checkout's mise.toml, as installed. */
  tools?: Record<string, string>;
  prompt: string;
  model: { model: string; effort?: string };
  sandbox: boolean;
  startedAt: string;
  finishedAt: string;
  verification?: Verification;
  repairs: number;
  session?: CodingSessionOutcome;
  changes?: { files: number; insertions: number; deletions: number; patch?: string; patchBytes: number };
}

export function setupPrompt(r: RepoEntry, cfg: ReposConfig): string {
  const sandbox = cfg.setup.sandbox
    ? `\n# Environment\nThis shell is sandboxed: you can write only inside this directory (package-manager caches already point into ./${CONTRACT_DIR}/cache), and the network reaches only package registries, mise's download sources and GitHub (${cfg.setup.network.join(', ')}). Docker isn't available. A process you start in the background can't be seen or stopped from a later command, so test servers on another port than ${r.port} (e.g. ${r.port + 1000}) or in the foreground under \`timeout\`; anything still listening on ${r.port} is stopped before I check.\n`
    : '';
  return `This is a checkout of ${r.repo} (${r.url}) at commit ${r.commit.slice(0, 12)}.${r.description ? ` ${r.description}` : ''}

I want to see its user interface in a desktop browser, in the state a real, established user would see it. Please get the app running locally with its main interface working and realistic data in it.

# Running it
- Follow the repo's own setup docs and tooling. Take the simplest route that shows the real app: a static production build if the front end works without a backend, otherwise the app's own server (production or dev mode).
- If it needs a database or other services, run them locally with an embedded or file-based option (SQLite, in-memory, JSON files, an embedded Postgres such as PGlite) or the app's demo/mock mode.
- Don't redesign or restyle anything. Change only what's needed to build and run it.

# Tools: use mise
Install every runtime and tool you need (node, the package manager, python, bun, ...) with mise, pinned to exact versions in a mise.toml at the repo root, so the setup can be reproduced. Match what the repo asks for (engines, .nvmrc, .tool-versions, packageManager). mise is already configured for this directory: \`mise install\` installs into ./${CONTRACT_DIR}/mise, and its shims come first on PATH, so \`node\`, \`pnpm\` and the rest resolve to the pinned versions. Don't use other copies of these tools or download runtimes by hand.

# Secrets, API keys and external services: fake them
The app must not depend on anything outside this machine, and when it runs it has no network except localhost. Wherever it expects secrets, environment variables, API keys or third-party services (hosted auth or OAuth, payment providers, email, LLM or other AI APIs, maps, storage buckets, analytics, hosted databases):
- Give the required variables placeholder values so the app starts.
- Where it actually calls the service, make the call succeed locally with realistic responses: use the app's own mock, test or offline mode if it has one; otherwise point the client at a small local stub server that start.sh also starts, or swap in a stub at the integration boundary (the API client or service module). Keep stubs out of UI code. Responses should look like what the real service returns for a real user, e.g. an AI reply that actually answers, a payment history with real-looking amounts.
- Calls the browser makes directly to outside services count too; point them at the local stub.
- For sign-in through an outside provider, create a local account or use the app's dev sign-in so you can get past it.
List every stub in app.json.

# Data: like real use
Seed it the way an established user's data would look after months of actual use: specific, plausible names and content for this kind of app; dates spread over time; a realistic mix of states (done, in progress, overdue, archived, ...); realistic volume (dozens to hundreds of records where the app revolves around records); short and long text; some messiness real data has. Start from the app's own demo or seed data if it has realistic data, and extend it if it's thin. Load data through the app's own paths (its API, import, seed scripts, or its database schema), never by hardcoding it into UI code. If the app needs an account, create one and attach the data to it. No lorem ipsum or "Test 1".
${sandbox}
# When you're done, leave this in ./${CONTRACT_DIR}/
- app.json: {"mode": "static" or "server", "entry": "/path where the main UI opens", "login": null or {"username": "...", "email": "...", "password": "..."}, "stubs": [{"service": "what was faked", "how": "how"}], "notes": "how you set it up, what data is loaded, and the main areas of the app"}
- static mode: the production build in ./${CONTRACT_DIR}/out, with index.html as its entry. It will be served from the root of a plain static file server; unknown paths fall back to index.html.
- server mode: ./${CONTRACT_DIR}/start.sh, which starts everything the app needs (stubs included) in the foreground and serves the UI at http://localhost:${r.port}/ (it gets PORT=${r.port}). It runs with the same PATH and restrictions as your shell, plus no network at all except localhost, so everything must already be installed, built and seeded (or seeded by start.sh itself).
- Put any scripts you write for seeding or stubbing in ./${CONTRACT_DIR}/ too; they're kept with the setup record.

# Order of work
You have ${cfg.setup.timeoutMinutes} minutes in total, and anything unfinished when time runs out is lost. So work in this order:
1. Get the app building and running with its stubs, and write the contract above (app.json plus out/ or start.sh), even if it has only a little data so far.
2. Then build out the data, re-running your seed and checking the app still loads after each substantial step, so that a working state with the data loaded so far is always in place.
Write large data sets with a short generator script rather than as one long literal file.

I'll open it at ${VIEWPORT.width}×${VIEWPORT.height}.`;
}

export function repairMessage(v: Verification, mode: string | undefined): string {
  const how = mode === 'server' ? `I ran ./${CONTRACT_DIR}/start.sh and opened the entry page` : mode === 'static' ? `I served ./${CONTRACT_DIR}/out from a plain static file server and opened the entry page` : 'I checked what you left';
  return `${how} in Chrome at ${VIEWPORT.width}×${VIEWPORT.height}, and it isn't working:\n\n${v.problems.join('\n\n')}\n\nPlease fix it.`;
}

const failed = (problems: string[]): Verification => ({ ok: false, problems, pageErrors: [], consoleErrors: [], failedRequests: [], textChars: 0, visibleElements: 0, title: '' });

/** Check the contract and load the entry page the way exploration and labeling will. */
export async function verifySetup(r: RepoEntry, checkout: string, cfg: ReposConfig, browser: Browser, server: LocalServer, previewFile?: string): Promise<{ v: Verification; app?: AppJson; tools?: Record<string, string> }> {
  const { app, problems } = readAppJson(checkout);
  const mise = await checkMise(checkout);
  problems.push(...mise.problems);
  const tools = mise.tools;
  if (!app || problems.length) return { v: failed(problems), app, tools };
  if (app.mode === 'static') {
    const base = server.mount(`verify-${r.slug}`, staticDir(checkout));
    try {
      return { v: await inspectUrl(browser, appUrl(base, app.entry), previewFile), app, tools };
    } finally {
      server.unmount(`verify-${r.slug}`);
    }
  }
  // The agent cannot stop servers it backgrounded (see stopStrays); clear the app's port for it.
  await stopStrays(checkout, r.port).catch(() => []);
  let s;
  try {
    s = await startServer({ slug: r.slug, mode: 'server', checkout, port: r.port }, { sandbox: cfg.setup.sandbox, startupSeconds: cfg.setup.startupSeconds });
  } catch (e) {
    return { v: failed([(e as Error).message]), app, tools };
  }
  try {
    return { v: await inspectUrl(browser, appUrl(s.url, app.entry), previewFile), app, tools };
  } finally {
    await s.stop();
  }
}

export interface SetupJob {
  batch: string;
  repo: RepoEntry;
  cfg: ReposConfig;
  browser: () => Promise<Browser>;
  server: LocalServer;
  log?: (s: string) => void;
}

export function setupRepo(job: SetupJob): Promise<SetupRecord> {
  return withUsageRetry(() => setupOnce(job));
}

export async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await run('git', args, { cwd, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  return stdout;
}

export async function clone(r: RepoEntry, dir: string): Promise<void> {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  await git(path.dirname(dir), 'clone', '--quiet', '--filter=blob:none', '--no-checkout', `${r.url}.git`, dir);
  await git(dir, 'checkout', '--quiet', '--detach', r.commit);
  // Keep the harness's files and installs out of the recorded diff.
  fs.appendFileSync(path.join(dir, '.git', 'info', 'exclude'), `\n${CONTRACT_DIR}/\nnode_modules/\n`);
  fs.mkdirSync(path.join(dir, CONTRACT_DIR, 'cache'), { recursive: true });
}

/** Not archived from .ui-capture/: builds, caches, installs, logs. */
const CONTRACT_SKIP = new Set(['out', 'cache', 'mise', 'tmp', 'node_modules', 'server.log']);
const MAX_ARCHIVED_FILE = 1024 * 1024;

/**
 * Keep the agent's own files from .ui-capture/ (app.json, start.sh, seed and
 * stub scripts) with the record, as ui-capture/, plus the root mise.toml. The
 * contract dir is excluded from setup.patch, so without this a replay would
 * lose the seeding and stubbing.
 */
export function archiveContract(checkout: string, out: string): void {
  const src = path.join(checkout, CONTRACT_DIR);
  const dst = path.join(out, 'ui-capture');
  fs.rmSync(dst, { recursive: true, force: true });
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, {
      recursive: true,
      filter: (f) => {
        if (f === src) return true;
        const st = fs.lstatSync(f);
        if (st.isSymbolicLink()) return false;
        if (st.isDirectory()) return !(path.dirname(f) === src && CONTRACT_SKIP.has(path.basename(f))) && path.basename(f) !== 'node_modules';
        return !(path.dirname(f) === src && CONTRACT_SKIP.has(path.basename(f))) && st.size <= MAX_ARCHIVED_FILE;
      },
    });
  }
  for (const f of ['mise.toml', '.mise.toml', 'mise.lock']) {
    // Regular files only: a symlink could point at a host file outside the checkout.
    const st = fs.lstatSync(path.join(checkout, f), { throwIfNoEntry: false });
    if (st?.isFile() && st.size <= MAX_ARCHIVED_FILE) fs.copyFileSync(path.join(checkout, f), path.join(out, f));
  }
}

async function recordChanges(checkout: string, out: string): Promise<SetupRecord['changes']> {
  await git(checkout, 'add', '--all', '--intent-to-add');
  const stat = await git(checkout, 'diff', '--shortstat', 'HEAD');
  const num = (re: RegExp) => Number(re.exec(stat)?.[1] ?? 0);
  const patch = await git(checkout, 'diff', '--binary', 'HEAD');
  const changes = { files: num(/(\d+) files? changed/), insertions: num(/(\d+) insertions?/), deletions: num(/(\d+) deletions?/), patchBytes: Buffer.byteLength(patch) };
  if (!patch) return changes;
  if (changes.patchBytes > MAX_PATCH) return changes;
  fs.writeFileSync(path.join(out, 'setup.patch'), patch);
  return { ...changes, patch: 'setup.patch' };
}

async function setupOnce(job: SetupJob): Promise<SetupRecord> {
  const { repo: r, cfg } = job;
  const checkout = checkoutDir(cfg, job.batch, r.slug);
  const out = recordDir(job.batch, r.slug);
  // Checked before the earlier record is removed: an unsandboxed session must never start.
  const unsafe = cfg.setup.sandbox ? claudeSandboxProblem() : undefined;
  if (unsafe) throw new Error(unsafe);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const transcript = path.join(out, 'setup.transcript.jsonl');
  const log = (e: object) => fs.appendFileSync(transcript, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
  const prompt = setupPrompt(r, cfg);
  const startedAt = new Date().toISOString();
  const previewFile = path.join(out, 'preview.png');
  let verification: Verification | undefined;
  let app: AppJson | undefined;
  let tools: Record<string, string> | undefined;
  let session: CodingSessionOutcome | undefined;
  let changes: SetupRecord['changes'];
  let repairs = 0;
  let error: string | undefined;
  const verify = async (round: number | string) => {
    ({ v: verification, app, tools } = await verifySetup(r, checkout, cfg, await job.browser(), job.server, previewFile));
    log({ type: 'verification', round, mode: app?.mode, tools, ...verification });
  };
  try {
    await clone(r, checkout);
    session = await runCodingSession({
      model: cfg.setup.model, effort: cfg.setup.effort, command: cfg.setup.command,
      cwd: checkout, prompt, tools: cfg.setup.tools, timeoutMs: cfg.setup.timeoutMinutes * 60_000, log,
      // The checkout is third-party code: its own .claude/settings.json must not load (hooks run unsandboxed).
      untrustedCwd: true,
      extraArgs: cfg.setup.sandbox ? ['--settings', JSON.stringify(claudeSandboxSettings(cfg.setup.network))] : [],
      // Nothing from our environment beyond an allowlist: install scripts must not see exported tokens or keys.
      env: setupEnv(checkout), inheritEnv: false,
      onTurnEnd: async ({ round }) => {
        await verify(round);
        if (verification!.ok || repairs >= cfg.setup.repairRounds) return undefined;
        repairs++;
        job.log?.(`  ${r.slug}: not working yet, repair ${repairs}/${cfg.setup.repairRounds}: ${verification!.problems[0].split('\n')[0]}`);
        return repairMessage(verification!, app?.mode);
      },
    });
    // Dev servers the agent backgrounded would hold ports during exploration and labeling.
    const strays = await stopStrays(checkout).catch(() => []);
    if (strays.length) log({ type: 'harness', text: `stopped ${strays.length} leftover server process(es): ${strays.join(', ')}` });
    if (session.timedOut) {
      await verify('timeout');
      if (!verification!.ok) error = `timed out after ${cfg.setup.timeoutMinutes} min without a working app: ${verification!.problems.join(' | ')}`;
    }
    if (!verification?.ok && !error) error = verification?.problems.join(' | ') ?? 'no verification';
    archiveContract(checkout, out);
    changes = await recordChanges(checkout, out).catch(() => undefined);
  } catch (e) {
    if (e instanceof UsageLimitError) throw e;
    error = (e as Error).message;
  }
  const record: SetupRecord = {
    batch: job.batch, slug: r.slug, ok: !error && !!verification?.ok, ...(error ? { error } : {}),
    repo: { name: r.repo, url: r.url, commit: r.commit, branch: r.branch, license: r.license },
    domain: r.domain, port: r.port, checkoutRoot: cfg.setup.checkoutRoot,
    ...(app?.mode ? { mode: app.mode } : {}), ...(app?.entry ? { entry: app.entry } : {}), ...(app ? { app } : {}), ...(tools ? { tools } : {}),
    prompt, model: { model: cfg.setup.model, ...(cfg.setup.effort ? { effort: cfg.setup.effort } : {}) }, sandbox: cfg.setup.sandbox,
    startedAt, finishedAt: new Date().toISOString(), verification, repairs, session, ...(changes ? { changes } : {}),
  };
  writeJson(path.join(out, 'setup.json'), record);
  return record;
}
