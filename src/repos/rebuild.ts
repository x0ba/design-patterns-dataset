// Rebuild a repo app from its setup record on a machine that does not have
// the checkout (the batch moved machines, or the checkout was deleted).
//
// setup.json/setup.patch/ui-capture/ hold everything the setup agent wrote:
// its changes to the repo (incl. mise.toml) and its contract (app.json,
// start.sh, seed and stub scripts). What they lack is everything installed,
// built or seeded. So: clone at the pinned commit, apply the patch, restore
// .ui-capture/, and give a sandboxed coding session (same model, sandbox and
// verification as setup) the job of reinstalling, rebuilding and reseeding,
// with the earlier session's shell commands as a guide. The views saved by
// exploration are kept and checked to still load; app.json must not change.
//
// repos/<batch>/<slug>/
//   rebuild.json              outcome: session, verification, view checks, app.json drift
//   rebuild.transcript.jsonl  the coding session
//   rebuild.patch             changes beyond setup.patch (if any)
// setup.json, explore.json and the views are left as they were.

import fs from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';
import { inspectUrl, type Verification } from '../generate/app.ts';
import { runCodingSession, withUsageRetry, type CodingSessionOutcome } from '../generate/claude.ts';
import { VIEWPORT } from '../pipeline/capture.ts';
import type { LocalServer } from '../pipeline/serve.ts';
import { readJson, writeJson } from '../pipeline/sites.ts';
import { appUrl } from '../pipeline/steps.ts';
import { UsageLimitError } from '../pipeline/usage-limit.ts';
import { CONTRACT_DIR, startServer, stopStrays, type AppJson } from './apps.ts';
import type { ExploreRecord } from './explore.ts';
import { checkoutIn, recordDir, type ReposConfig, type RepoEntry } from './frame.ts';
import { claudeSandboxProblem, claudeSandboxSettings, setupEnv } from './sandbox.ts';
import { clone, git, repairMessage, verifySetup, type SetupRecord } from './setup.ts';

export interface RebuildRecord {
  batch: string;
  slug: string;
  ok: boolean;
  error?: string;
  host: { platform: string; arch: string };
  model: { model: string; effort?: string };
  sandbox: boolean;
  startedAt: string;
  finishedAt: string;
  verification?: Verification;
  /** Saved views (explore.json) that no longer load: slug and first problem. */
  brokenViews?: { view: string; problem: string }[];
  /** app.json differs from the one in the setup record. */
  appChanged?: boolean;
  repairs: number;
  session?: CodingSessionOutcome;
  patchBytes?: number;
}

/** The earlier setup session's shell commands, oldest first, trimmed to fit a prompt. */
export function setupCommands(transcript: string, maxChars = 20_000): string[] {
  const cmds: string[] = [];
  if (!fs.existsSync(transcript)) return cmds;
  for (const line of fs.readFileSync(transcript, 'utf8').split('\n')) {
    let e: any;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.type === 'tool_use' && e.name === 'Bash' && typeof e.input?.command === 'string') {
      const c = e.input.command.trim();
      cmds.push(c.length > 400 ? `${c.slice(0, 400)} …` : c);
    }
  }
  let total = 0;
  const kept: string[] = [];
  for (const c of cmds.reverse()) { // later commands are closer to the working state
    if ((total += c.length + 1) > maxChars) break;
    kept.unshift(c);
  }
  return kept;
}

export function rebuildPrompt(r: RepoEntry, setup: SetupRecord, cfg: ReposConfig, commands: string[]): string {
  const app = setup.app!;
  return `This is a checkout of ${r.repo} (${r.url}) at commit ${r.commit.slice(0, 12)}. A coding agent already got its UI running on another machine (macOS), with realistic seeded data, and I want the same app running here (Linux, ${process.arch}).

What's restored: the agent's changes to the repo's files (including mise.toml) are applied, and its ./${CONTRACT_DIR}/ files are back: app.json, start.sh, and its seed and stub scripts. What's missing: everything it installed, built, downloaded or seeded. No runtimes, no dependencies, no build output, no databases or data files that were generated rather than written as files.

Please reinstall, rebuild and reseed so that ./${CONTRACT_DIR}/start.sh serves the same app with the same kind of data at http://localhost:${r.port}/ (entry ${app.entry}${app.login ? `, login ${JSON.stringify(app.login)}` : ''}).
- Keep app.json as it is, and keep the stubs, the seed data and the login the same. Change files only where this machine needs it (platform-specific binaries, paths, macOS-only commands).
- Install runtimes and tools with mise from the existing mise.toml (\`mise install\` installs into ./${CONTRACT_DIR}/mise; its shims come first on PATH). Don't use other copies or download runtimes by hand.
- start.sh runs with the same PATH and restrictions as your shell, plus no network at all except localhost, so everything must be installed, built and seeded before it runs (or seeded by start.sh itself).

app.json notes from the earlier setup: ${app.notes}

The earlier session ran these shell commands, in order (exploration and failed attempts included; long ones cut). Use them as a guide to what the setup needed, not as a script:
\`\`\`
${commands.join('\n')}
\`\`\`
${cfg.setup.sandbox ? `
# Environment
This shell is sandboxed: you can write only inside this directory (package-manager caches already point into ./${CONTRACT_DIR}/cache), and the network reaches only package registries, mise's download sources and GitHub (${cfg.setup.network.join(', ')}). Docker isn't available. A process you start in the background can't be seen or stopped from a later command, so test servers on another port than ${r.port} (e.g. ${r.port + 1000}) or in the foreground under \`timeout\`; anything still listening on ${r.port} is stopped before I check.
` : ''}
You have ${cfg.setup.timeoutMinutes} minutes in total. I'll open it at ${VIEWPORT.width}×${VIEWPORT.height}.`;
}

export interface RebuildJob {
  batch: string;
  repo: RepoEntry;
  cfg: ReposConfig;
  browser: () => Promise<Browser>;
  server: LocalServer;
  log?: (s: string) => void;
}

export function rebuildRepo(job: RebuildJob): Promise<RebuildRecord> {
  return withUsageRetry(() => rebuildOnce(job));
}

/** Copy a record's ui-capture/ back into the checkout, regular files only. */
function restoreContract(from: string, to: string): void {
  fs.cpSync(from, to, {
    recursive: true,
    filter: (f) => { const st = fs.lstatSync(f); return st.isDirectory() || st.isFile(); },
  });
}

async function rebuildOnce(job: RebuildJob): Promise<RebuildRecord> {
  const { repo: r, cfg } = job;
  const out = recordDir(job.batch, r.slug);
  const setup = readJson<SetupRecord>(path.join(out, 'setup.json'));
  if (!setup?.ok || !setup.app) throw new Error(`${r.slug}: no successful setup record to rebuild from`);
  const unsafe = cfg.setup.sandbox ? claudeSandboxProblem() : undefined;
  if (unsafe) throw new Error(unsafe);
  const checkout = checkoutIn(setup.checkoutRoot ?? cfg.setup.checkoutRoot, job.batch, r.slug);
  const transcript = path.join(out, 'rebuild.transcript.jsonl');
  fs.rmSync(transcript, { force: true });
  const log = (e: object) => fs.appendFileSync(transcript, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
  const startedAt = new Date().toISOString();
  let verification: Verification | undefined;
  let app: AppJson | undefined;
  let session: CodingSessionOutcome | undefined;
  let repairs = 0;
  let error: string | undefined;
  let brokenViews: RebuildRecord['brokenViews'];
  let patchBytes: number | undefined;
  const verify = async (round: number | string) => {
    ({ v: verification, app } = await verifySetup(r, checkout, cfg, await job.browser(), job.server));
    log({ type: 'verification', round, mode: app?.mode, ...verification });
  };
  try {
    await clone(r, checkout);
    const patch = path.join(out, 'setup.patch');
    if (fs.existsSync(patch)) await git(checkout, 'apply', '--binary', '--whitespace=nowarn', patch);
    else if (setup.changes?.files) throw new Error(`setup changed ${setup.changes.files} files but setup.patch was not kept (over 5 MB); rebuild needs a full setup`);
    restoreContract(path.join(out, 'ui-capture'), path.join(checkout, CONTRACT_DIR));
    // Commit the applied patch so rebuild.patch holds only what the rebuild changes.
    await git(checkout, 'add', '--all');
    await git(checkout, '-c', 'user.name=harness', '-c', 'user.email=harness@localhost', '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '--allow-empty', '--no-verify', '-m', 'setup.patch');
    const prompt = rebuildPrompt(r, setup, cfg, setupCommands(path.join(out, 'setup.transcript.jsonl')));
    log({ type: 'harness', text: 'rebuild prompt', prompt });
    session = await runCodingSession({
      model: cfg.setup.model, effort: cfg.setup.effort, command: cfg.setup.command,
      cwd: checkout, prompt, tools: cfg.setup.tools, timeoutMs: cfg.setup.timeoutMinutes * 60_000, log,
      untrustedCwd: true,
      extraArgs: cfg.setup.sandbox ? ['--settings', JSON.stringify(claudeSandboxSettings(cfg.setup.network))] : [],
      env: setupEnv(checkout), inheritEnv: false,
      onTurnEnd: async ({ round }) => {
        await verify(round);
        if (verification!.ok || repairs >= cfg.setup.repairRounds) return undefined;
        repairs++;
        job.log?.(`  ${r.slug}: not working yet, repair ${repairs}/${cfg.setup.repairRounds}: ${verification!.problems[0].split('\n')[0]}`);
        return repairMessage(verification!, app?.mode);
      },
    });
    const strays = await stopStrays(checkout).catch(() => []);
    if (strays.length) log({ type: 'harness', text: `stopped ${strays.length} leftover server process(es): ${strays.join(', ')}` });
    if (session.timedOut) await verify('timeout');
    if (!verification?.ok) error = verification?.problems.join(' | ') ?? 'no verification';
    else brokenViews = await checkViews(job, setup, checkout);
    await git(checkout, 'add', '--all', '--intent-to-add').catch(() => '');
    const diff = await git(checkout, 'diff', '--binary', 'HEAD').catch(() => '');
    patchBytes = Buffer.byteLength(diff);
    if (diff && patchBytes <= 5 * 1024 * 1024) fs.writeFileSync(path.join(out, 'rebuild.patch'), diff);
  } catch (e) {
    if (e instanceof UsageLimitError) throw e;
    error = (e as Error).message;
  }
  const appChanged = !!app && JSON.stringify(app) !== JSON.stringify(setup.app);
  const record: RebuildRecord = {
    batch: job.batch, slug: r.slug, ok: !error && !!verification?.ok, ...(error ? { error } : {}),
    host: { platform: process.platform, arch: process.arch },
    model: { model: cfg.setup.model, ...(cfg.setup.effort ? { effort: cfg.setup.effort } : {}) }, sandbox: cfg.setup.sandbox,
    startedAt, finishedAt: new Date().toISOString(), verification,
    ...(brokenViews ? { brokenViews } : {}), ...(app ? { appChanged } : {}), repairs, session, ...(patchBytes !== undefined ? { patchBytes } : {}),
  };
  writeJson(path.join(out, 'rebuild.json'), record);
  return record;
}

/** Load each saved view's path once; steps are not replayed (labeling does that). */
async function checkViews(job: RebuildJob, setup: SetupRecord, checkout: string): Promise<{ view: string; problem: string }[]> {
  const ex = readJson<ExploreRecord>(path.join(recordDir(job.batch, setup.slug), 'explore.json'));
  if (!ex?.views.length) return [];
  const broken: { view: string; problem: string }[] = [];
  const s = await startServer({ slug: setup.slug, mode: 'server', checkout, port: setup.port }, { sandbox: job.cfg.setup.sandbox, startupSeconds: job.cfg.setup.startupSeconds });
  try {
    const browser = await job.browser();
    for (const v of ex.views) {
      const res = await inspectUrl(browser, appUrl(s.url, v.path)).catch((e) => ({ ok: false, problems: [(e as Error).message] }));
      if (!res.ok) broken.push({ view: v.slug, problem: res.problems[0]?.split('\n')[0] ?? 'did not load' });
    }
  } finally {
    await s.stop();
  }
  return broken;
}
