#!/usr/bin/env node
// Set up and explore the repos in repos/<batch>.yaml, then write
// sites/<batch>.yaml so the views can be labeled like any other batch:
//
//   node scripts/prepare-repos.ts --batch repo-001 [--concurrency 2] [--only slug,slug]
//        [--stage setup|explore|all] [--redo-setup] [--redo-explore] [--rebuild] [--config config/repos.yaml]
//   node scripts/label.ts --batch repo-001 [--repos-config <same --config>]
//
// --rebuild: for server apps that set up and explored successfully but whose
// checkout is missing here (the batch moved machines), rebuild the checkout from
// the setup record instead of setting up from scratch (src/repos/rebuild.ts).
// The saved views are kept.
//
// Per repo: clone at the pinned commit and have a sandboxed coding agent get
// the app running (src/repos/setup.ts), then have a browser agent save its
// views (src/repos/explore.ts). Resumable: a repo with a successful
// setup.json / explore.json skips that stage unless --redo-*. Redoing setup
// re-clones and redoes exploration too. A Claude Code usage limit pauses the
// run until the reset.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { P } from '../src/paths.ts';
import { launchBrowser } from '../src/pipeline/capture.ts';
import { LOCAL_PORT, startLocalServer } from '../src/pipeline/serve.ts';
import { readJson } from '../src/pipeline/sites.ts';
import { usageGate } from '../src/pipeline/usage-limit.ts';
import { AppHost, readAppJson } from '../src/repos/apps.ts';
import { exploreRepo, type ExploreRecord } from '../src/repos/explore.ts';
import { checkoutDir, checkoutIn, frameFile, readFrame, readReposConfig, recordDir, type RepoEntry } from '../src/repos/frame.ts';
import { rebuildRepo } from '../src/repos/rebuild.ts';
import { claudeSandboxProblem, findMise, runtimeSandboxAvailable } from '../src/repos/sandbox.ts';
import { setupRepo, type SetupRecord } from '../src/repos/setup.ts';
import { repoSites } from '../src/repos/sites.ts';

const { values: args } = parseArgs({
  options: {
    batch: { type: 'string' },
    concurrency: { type: 'string', default: '2' },
    only: { type: 'string' },
    stage: { type: 'string', default: 'all' },
    'redo-setup': { type: 'boolean', default: false },
    'redo-explore': { type: 'boolean', default: false },
    rebuild: { type: 'boolean', default: false },
    config: { type: 'string', default: path.join(P.root, 'config', 'repos.yaml') },
    port: { type: 'string', default: String(LOCAL_PORT) },
  },
});
if (!args.batch || !['setup', 'explore', 'all'].includes(args.stage!)) {
  console.error('usage: node scripts/prepare-repos.ts --batch <name> [--concurrency N] [--only slugs] [--stage setup|explore|all] [--redo-setup] [--redo-explore]');
  process.exit(2);
}
const batch = args.batch;
const file = frameFile(batch);
if (!fs.existsSync(file)) {
  console.error(`${path.relative(P.root, file)} is missing. Run: node scripts/discover-repos.ts --batch ${batch}`);
  process.exit(1);
}
const frame = readFrame(file);
const cfg = readReposConfig(args.config);
if (cfg.setup.sandbox && !runtimeSandboxAvailable()) {
  console.error('Server-mode apps run under macOS sandbox-exec or Linux bubblewrap (/usr/bin/bwrap), neither of which is available here. Install bubblewrap, or set setup.sandbox: false in config/repos.yaml on a throwaway machine.');
  process.exit(1);
}
const unsafe = cfg.setup.sandbox && args.stage !== 'explore' ? claudeSandboxProblem() : undefined;
if (unsafe) {
  console.error(`${unsafe}. Setup sessions would run third-party code unsandboxed, so none will start.`);
  process.exit(1);
}
const mise = findMise();
if (!mise) {
  console.error('mise is not installed (setup pins every runtime with it). Install it: brew install mise, or https://mise.jdx.dev');
  process.exit(1);
}
const setupFile = (slug: string) => path.join(recordDir(batch, slug), 'setup.json');
const exploreFile = (slug: string) => path.join(recordDir(batch, slug), 'explore.json');

let todo = frame.repos;
if (args.only) todo = todo.filter((r) => args.only!.split(',').includes(r.slug));
const doSetup = args.stage !== 'explore';
const doExplore = args.stage !== 'setup';
console.log(`${batch}: ${frame.repos.length} repos, ${todo.length} selected · setup ${cfg.setup.model}${cfg.setup.sandbox ? ' (sandboxed)' : ' (UNSANDBOXED)'} · explorer ${cfg.explorer.model}`);
console.log(`Checkouts: ${path.dirname(checkoutDir(cfg, batch, 'x'))} · mise: ${mise}`);

const server = await startLocalServer(0); // setup verification and exploration; labeling serves on the fixed port
const apps = new AppHost({ staticServer: server, sandbox: cfg.setup.sandbox, startupSeconds: cfg.setup.startupSeconds, log: console.log });
let browser = await launchBrowser();
let relaunching: Promise<void> | null = null;
const getBrowser = async () => {
  if (!browser.isConnected()) {
    relaunching ??= (async () => { browser = await launchBrowser(); })().finally(() => { relaunching = null; });
    await relaunching;
  }
  return browser;
};

let done = 0;
try {
  const queue = [...todo];
  await Promise.all(Array.from({ length: Math.max(1, Number(args.concurrency)) }, async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      await usageGate.wait();
      const t0 = Date.now();
      let line = '';
      try {
        line = await prepare(r);
      } catch (e) {
        line = `✗ ${(e as Error).message.split('\n')[0]}`;
      }
      console.log(`[${++done}/${todo.length}] ${r.slug} ${line} · ${Math.round((Date.now() - t0) / 60_000)}m`);
    }
  }));
} finally {
  await apps.closeAll();
  await browser.close().catch(() => {});
  await server.close();
}

async function prepare(r: RepoEntry): Promise<string> {
  const parts: string[] = [];
  let setup = readJson<SetupRecord>(setupFile(r.slug));
  if (args.rebuild && setup?.ok && setup.mode === 'server' && !args['redo-setup']) {
    const co = setup.checkoutRoot ? checkoutIn(setup.checkoutRoot, batch, r.slug) : checkoutDir(cfg, batch, r.slug);
    const prev = readJson<{ ok: boolean }>(path.join(recordDir(batch, r.slug), 'rebuild.json'));
    const present = fs.existsSync(path.join(co, '.ui-capture', 'start.sh')) && fs.existsSync(path.join(co, '.git'));
    if (!present || (prev && !prev.ok)) {
      console.log(`→ rebuild ${r.slug} (${r.repo} @ ${r.commit.slice(0, 8)} · ${r.domain})`);
      const rb = await rebuildRepo({ batch, repo: r, cfg, browser: getBrowser, server, log: console.log });
      const broken = rb.brokenViews?.length ? ` · ${rb.brokenViews.length} view(s) no longer load: ${rb.brokenViews.map((v) => v.view).join(', ')}` : '';
      return `rebuild ${rb.ok ? '✓' : '✗'}${rb.session ? ` $${rb.session.costUsd.toFixed(2)}` : ''}${rb.appChanged ? ' · app.json changed' : ''}${broken}${rb.error ? ` · ${rb.error.slice(0, 200)}` : ''}`;
    }
  }
  if (doSetup && (args['redo-setup'] || !setup?.ok)) {
    console.log(`→ setup ${r.slug} (${r.repo} @ ${r.commit.slice(0, 8)} · ${r.domain})`);
    setup = await setupRepo({ batch, repo: r, cfg, browser: getBrowser, server, log: console.log });
    parts.push(`setup ${setup.ok ? '✓' : '✗'} ${setup.mode ?? ''}${setup.session ? ` $${setup.session.costUsd.toFixed(2)}` : ''}${setup.error ? ` · ${setup.error.slice(0, 200)}` : ''}`);
    fs.rmSync(exploreFile(r.slug), { force: true }); // a new setup invalidates earlier views
  }
  if (!doExplore) return parts.join(' · ') || 'setup already done';
  if (!setup?.ok) return [...parts, 'not set up; skipping explore'].join(' · ');
  const prev = readJson<ExploreRecord>(exploreFile(r.slug));
  if (prev?.ok && !args['redo-explore']) return [...parts, `explore already done (${prev.views.length} views)`].join(' · ');

  const checkout = setup.checkoutRoot ? checkoutIn(setup.checkoutRoot, batch, r.slug) : checkoutDir(cfg, batch, r.slug);
  const { app, problems } = readAppJson(checkout);
  if (!app || problems.length) return [...parts, `checkout is missing or changed (${problems[0] ?? 'no app.json'}); rerun with --redo-setup`].join(' · ');
  const spec = { slug: r.slug, mode: app.mode, port: r.port, checkout };
  console.log(`→ explore ${r.slug} (${app.mode})`);
  const base = await apps.acquire(spec);
  try {
    const ex = await exploreRepo({ batch, repo: r, app, base, outDir: recordDir(batch, r.slug), explorer: cfg.explorer, browser: await getBrowser() });
    parts.push(`explore ${ex.ok ? '✓' : '✗'} ${ex.views.map((v) => v.slug).join(', ')}${ex.error ? ` · ${ex.error.slice(0, 200)}` : ''}`);
  } finally {
    await apps.release(spec);
  }
  return parts.join(' · ');
}

// ------------------------------------------------- site list for labeling
const { sites, missing } = repoSites(frame, Number(args.port));
const sitesFile = path.join(P.sites, `${batch}.yaml`);
fs.writeFileSync(sitesFile, `# Generated by scripts/prepare-repos.ts from repos/${batch}.yaml — do not edit; rerun prepare.
# One site per explored view. scripts/label.ts serves static apps and starts server apps
# from their checkouts (config/repos.yaml setup.checkoutRoot) while labeling.
` + YAML.stringify({ batch, description: `Open-source app views (${sites.length} views from ${frame.repos.length - missing.length} of ${frame.repos.length} repos)`, sites }, { lineWidth: 0 }));
console.log(`\nWrote ${path.relative(P.root, sitesFile)}: ${sites.length} views${missing.length ? `; not ready: ${missing.join(', ')}` : ''}.`);
const defaultConfig = path.join(P.root, 'config', 'repos.yaml');
const configArg = path.resolve(args.config!) === defaultConfig ? '' : ` --repos-config ${path.relative(process.cwd(), path.resolve(args.config!)) || args.config}`;
console.log(`Next: node scripts/label.ts --batch ${batch}${configArg}`);
