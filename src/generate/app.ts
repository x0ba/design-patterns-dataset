// Generate one app from one brief.
//
// The coding agent works in an empty scratch dir outside the repo (so it cannot
// read the codebook or earlier generations) with a plain, user-style request.
// When it ends a turn, the harness serves ./out exactly as labeling will
// (http://<slug>.localhost:<port>/, a plain static server) and opens it in
// Chromium at 1440×900. A missing or broken build goes back to the same session
// as a follow-up, up to `repairRounds` times — as a user would report it.
//
// generated/<batch>/<slug>/
//   out/               the static build that gets captured and labeled
//   src/               the agent's project, without node_modules/build caches
//   preview.png        the first viewport as verified
//   transcript.jsonl   the coding session (messages, tool calls, results)
//   generation.json    brief, generator, prompt, verification, cost, stack

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Browser } from 'playwright';
import { openPage, VIEWPORT } from '../pipeline/capture.ts';
import type { LocalServer } from '../pipeline/serve.ts';
import { writeJson } from '../pipeline/sites.ts';
import type { Brief, GenerationConfig, GeneratorConfig } from './briefs.ts';
import { runCodingSession, withUsageRetry, type CodingSessionOutcome } from './claude.ts';
import { UsageLimitError } from '../pipeline/usage-limit.ts';

export function generationPrompt(b: Brief): string {
  return `I need the front end for ${b.product}. ${b.summary}

Who's using it: ${b.user}

What they're doing right now: ${b.moment}

What's in the system at this point: ${b.data}

Build it as a working web app, opened in the state that person would see at that moment. No backend: use realistic mock data (no lorem ipsum, no placeholder names), and make the interactive parts actually work client-side.

Use whatever framework and tooling you like. When you're done there must be a static production build in ./out with ./out/index.html as the entry point. It will be served from the root of a plain static file server (no rewrites, no server code) and viewed in a desktop browser at ${VIEWPORT.width}×${VIEWPORT.height}.`;
}

export interface Verification {
  ok: boolean;
  problems: string[];
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
  textChars: number;
  visibleElements: number;
  title: string;
}

const MIN_TEXT = 40;
const MIN_ELEMENTS = 12;

/** Load ./out the way capture will and decide whether it is a usable build. */
export async function verifyBuild(browser: Browser, server: LocalServer, slug: string, outDir: string, previewFile?: string): Promise<Verification> {
  const v: Verification = { ok: false, problems: [], pageErrors: [], consoleErrors: [], failedRequests: [], textChars: 0, visibleElements: 0, title: '' };
  if (!fs.existsSync(path.join(outDir, 'index.html'))) {
    v.problems.push('./out/index.html does not exist.');
    return v;
  }
  const url = server.mount(`verify-${slug}`, outDir);
  const page = await openPage(browser);
  try {
    const origin = new URL(url).origin;
    page.on('pageerror', (e) => v.pageErrors.push(e.message.split('\n')[0].slice(0, 300)));
    page.on('console', (m) => { if (m.type() === 'error') v.consoleErrors.push(m.text().slice(0, 300)); });
    page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) v.failedRequests.push(`${r.url().slice(origin.length)} (${r.failure()?.errorText ?? 'failed'})`); });
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().startsWith(origin) && !/\/favicon\.ico$/.test(r.url())) v.failedRequests.push(`${r.url().slice(origin.length)} (HTTP ${r.status()})`);
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const stats = await page.evaluate(() => {
      let n = 0;
      for (const el of document.body?.querySelectorAll('*') ?? []) {
        const r = el.getBoundingClientRect();
        if (r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < window.innerHeight * 3) n++;
      }
      return { text: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().length, elements: n };
    });
    v.textChars = stats.text;
    v.visibleElements = stats.elements;
    v.title = await page.title();
    if (previewFile) await page.screenshot({ path: previewFile });
  } catch (e) {
    v.problems.push(`The page did not load: ${(e as Error).message.split('\n')[0]}`);
  } finally {
    await page.context().close().catch(() => {});
    server.unmount(`verify-${slug}`);
  }
  if (v.failedRequests.length) v.problems.push(`These files failed to load:\n${[...new Set(v.failedRequests)].slice(0, 10).map((r) => `  - ${r}`).join('\n')}`);
  if (v.pageErrors.length) v.problems.push(`Uncaught errors in the page:\n${[...new Set(v.pageErrors)].slice(0, 8).map((r) => `  - ${r}`).join('\n')}`);
  if (!v.problems.length && v.textChars < MIN_TEXT && v.visibleElements < MIN_ELEMENTS) {
    v.problems.push(`The page renders blank (${v.textChars} characters of text, ${v.visibleElements} visible elements).${v.consoleErrors.length ? ` Console errors:\n${[...new Set(v.consoleErrors)].slice(0, 6).map((r) => `  - ${r}`).join('\n')}` : ''}`);
  }
  v.ok = v.problems.length === 0;
  return v;
}

function repairMessage(v: Verification): string {
  return `I served ./out from the root of a plain static file server and opened it in Chrome at ${VIEWPORT.width}×${VIEWPORT.height}, and it isn't working:\n\n${v.problems.join('\n\n')}\n\nPlease fix it and rebuild into ./out.`;
}

export interface GenerationRecord {
  batch: string;
  slug: string;
  ok: boolean;
  error?: string;
  brief: Brief;
  generator: GeneratorConfig;
  prompt: string;
  startedAt: string;
  finishedAt: string;
  verification?: Verification;
  repairs: number;
  session?: CodingSessionOutcome;
  stack: { packageJson: boolean; dependencies: string[]; devDependencies: string[]; outFiles: number; outBytes: number };
}

export interface GenerateJob {
  batch: string;
  brief: Brief;
  generator: GeneratorConfig;
  config: GenerationConfig;
  outDir: string; // generated/<batch>/<slug>
  browser: () => Promise<Browser>;
  server: LocalServer;
  log?: (s: string) => void;
}

const SKIP_COPY = new Set(['node_modules', 'out', '.git', '.next', '.svelte-kit', '.nuxt', '.turbo', '.cache', '.parcel-cache', '.vite', '.angular', 'bower_components', '.pnpm-store', '.npm']);

export async function generateApp(job: GenerateJob): Promise<GenerationRecord> {
  return withUsageRetry(() => generateOnce(job));
}

async function generateOnce(job: GenerateJob): Promise<GenerationRecord> {
  const { brief, generator, config } = job;
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `gen-${brief.slug}-`));
  fs.rmSync(job.outDir, { recursive: true, force: true });
  fs.mkdirSync(job.outDir, { recursive: true });
  const transcript = path.join(job.outDir, 'transcript.jsonl');
  const log = (e: object) => fs.appendFileSync(transcript, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
  const prompt = generationPrompt(brief);
  const startedAt = new Date().toISOString();
  const previewFile = path.join(job.outDir, 'preview.png');
  let verification: Verification | undefined;
  let repairs = 0;
  let session: CodingSessionOutcome | undefined;
  let error: string | undefined;
  try {
    session = await runCodingSession({
      model: generator.model, effort: generator.effort, command: generator.command,
      cwd: work, prompt, tools: config.tools, timeoutMs: config.timeoutMinutes * 60_000, log,
      onTurnEnd: async ({ round }) => {
        verification = await verifyBuild(await job.browser(), job.server, brief.slug, path.join(work, 'out'), previewFile);
        log({ type: 'verification', round, ...verification });
        if (verification.ok || repairs >= config.repairRounds) return undefined;
        repairs++;
        job.log?.(`  ${brief.slug}: build not usable, repair ${repairs}/${config.repairRounds}: ${verification.problems[0].split('\n')[0]}`);
        return repairMessage(verification);
      },
    });
    if (session.timedOut) {
      // Keep a working build the agent left behind; session.timedOut records the cutoff.
      verification = await verifyBuild(await job.browser(), job.server, brief.slug, path.join(work, 'out'), previewFile);
      log({ type: 'verification', round: 'timeout', ...verification });
      if (!verification.ok) error = `timed out after ${config.timeoutMinutes} min without a working build: ${verification.problems.join(' | ')}`;
    }
    if (!verification?.ok && !error) error = verification?.problems.join(' | ') ?? 'no verification';
    if (fs.existsSync(path.join(work, 'out'))) fs.cpSync(path.join(work, 'out'), path.join(job.outDir, 'out'), { recursive: true, dereference: true });
    fs.cpSync(work, path.join(job.outDir, 'src'), { recursive: true, filter: (src) => !SKIP_COPY.has(path.basename(src)) || src === work });
  } catch (e) {
    if (e instanceof UsageLimitError) throw e;
    error = (e as Error).message;
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
  const record: GenerationRecord = {
    batch: job.batch, slug: brief.slug, ok: !error && !!verification?.ok, ...(error ? { error } : {}),
    brief, generator, prompt, startedAt, finishedAt: new Date().toISOString(),
    verification, repairs, session, stack: describeStack(job.outDir),
  };
  writeJson(path.join(job.outDir, 'generation.json'), record);
  return record;
}

function describeStack(dir: string): GenerationRecord['stack'] {
  let pkg: any;
  try { pkg = JSON.parse(fs.readFileSync(path.join(dir, 'src', 'package.json'), 'utf8')); } catch { /* none */ }
  let outFiles = 0, outBytes = 0;
  const walk = (d: string) => {
    for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { outFiles++; outBytes += fs.statSync(p).size; }
    }
  };
  walk(path.join(dir, 'out'));
  return {
    packageJson: !!pkg,
    dependencies: Object.keys(pkg?.dependencies ?? {}).sort(),
    devDependencies: Object.keys(pkg?.devDependencies ?? {}).sort(),
    outFiles, outBytes,
  };
}
