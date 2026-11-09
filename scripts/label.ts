#!/usr/bin/env node
// Run a labeling batch: capture each site once, have every rater code it
// independently, then score agreement.
//
//   node scripts/label.ts --batch batch-001 [--sites sites/batch-001.yaml]
//        [--raters config/raters.yaml] [--concurrency 2] [--only slug,slug]
//        [--capture-only] [--recapture] [--relabel] [--rater rater-2]
//
// Rule 5 (codebook frozen per batch): the batch records the version and hash of
// dist/codebook.json when it starts, and refuses to continue if either changes.
// Resumable: finished captures and labels are skipped unless --recapture/--relabel.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { P } from '../src/paths.ts';
import { captureSite, launchBrowser } from '../src/pipeline/capture.ts';
import { loadBundle } from '../src/pipeline/label.ts';
import { runRater } from '../src/pipeline/rater.ts';
import type { RaterConfig } from '../src/pipeline/provider.ts';
import { batchDir, captureDir, labelsDir, readJson, readSiteList, siteDir, writeJson, type SiteSpec, type SiteStatus } from '../src/pipeline/sites.ts';
import { scoreSite } from '../src/irr/site.ts';

const { values: args } = parseArgs({
  options: {
    batch: { type: 'string' },
    sites: { type: 'string' },
    raters: { type: 'string', default: path.join(P.root, 'config', 'raters.yaml') },
    concurrency: { type: 'string', default: '2' },
    only: { type: 'string' },
    rater: { type: 'string' },
    'capture-only': { type: 'boolean', default: false },
    recapture: { type: 'boolean', default: false },
    relabel: { type: 'boolean', default: false },
  },
});
if (!args.batch) {
  console.error('usage: node scripts/label.ts --batch <name> [--sites sites/<name>.yaml] [--concurrency N] [--only slugs] [--capture-only]');
  process.exit(2);
}
const batch = args.batch;
const sitesFile = args.sites ?? path.join(P.sites, `${batch}.yaml`);
const raterCfg = YAML.parse(fs.readFileSync(args.raters!, 'utf8')) as { raters: RaterConfig[]; flagBelowAgreement?: number };
let raters = raterCfg.raters;
if (args.rater) raters = raters.filter((r) => args.rater!.split(',').includes(r.id));
if (new Set(raterCfg.raters.map((r) => r.id)).size !== raterCfg.raters.length) throw new Error('rater ids must be unique');

// ------------------------------------------------------- codebook freeze
if (!fs.existsSync(P.distCodebook)) {
  console.error('dist/codebook.json is missing. Run: node scripts/build-codebook.ts');
  process.exit(1);
}
const codebook = loadBundle();
const codebookSha = crypto.createHash('sha256').update(JSON.stringify(codebook.entries)).digest('hex');
const batchFile = path.join(batchDir(batch), 'batch.json');
const list = readSiteList(sitesFile);
interface BatchInfo { batch: string; createdAt: string; codebookVersion: string; codebookSha256: string; sitesFile: string; raters: RaterConfig[] }
let info = readJson<BatchInfo>(batchFile);
if (!info) {
  info = { batch, createdAt: new Date().toISOString(), codebookVersion: codebook.version, codebookSha256: codebookSha, sitesFile: path.relative(P.root, sitesFile), raters: raterCfg.raters };
  writeJson(batchFile, info);
  console.log(`New batch ${batch}: codebook ${codebook.version}, ${list.sites.length} sites, raters ${raterCfg.raters.map((r) => r.id).join(', ')}`);
} else if (info.codebookVersion !== codebook.version || info.codebookSha256 !== codebookSha) {
  console.error(`Codebook changed since batch ${batch} started (batch: ${info.codebookVersion}, now: ${codebook.version}${info.codebookVersion === codebook.version ? ', same version but different content' : ''}).
The codebook is frozen per batch (README Rules §5). Either rebuild dist/ from the codebook version the batch used, or start a new batch.`);
  process.exit(1);
} else {
  const known = new Set(info.raters.map((r) => r.id));
  const unknown = raters.filter((r) => !known.has(r.id));
  if (unknown.length) {
    console.error(`Raters ${unknown.map((r) => r.id).join(', ')} are not part of batch ${batch} (${[...known].join(', ')}). Start a new batch to change raters.`);
    process.exit(1);
  }
}

// ----------------------------------------------------------------- run
let sites = list.sites as (SiteSpec & { slug: string })[];
if (args.only) sites = sites.filter((s) => args.only!.split(',').includes(s.slug));
for (const s of list.sites) initStatus(s as SiteSpec & { slug: string });

const browser = await launchBrowser();
let done = 0;
try {
  await pool(sites, Number(args.concurrency), async (site) => {
    try {
      await runSite(site);
    } catch (e) {
      console.error(`✗ ${site.slug}: ${(e as Error).message}`);
    }
    console.log(`[${++done}/${sites.length}] ${site.slug} -> ${readStatus(site.slug)?.state}`);
  });
} finally {
  await browser.close();
}
console.log(`\nDone. Next: node scripts/irr.ts --batch ${batch}   ·   console: node console/server.ts`);

// ======================================================================

async function runSite(site: SiteSpec & { slug: string }): Promise<void> {
  const cdir = captureDir(batch, site.slug);
  const metaFile = path.join(cdir, 'meta.json');
  if (args.recapture || !fs.existsSync(metaFile)) {
    setStatus(site, { state: 'capturing' });
    try {
      await captureSite(browser, site.url, cdir);
    } catch (e) {
      setStatus(site, { state: 'failed', error: `capture: ${(e as Error).message.split('\n')[0]}` });
      throw e;
    }
  }
  const meta = readJson<{ status: number | null }>(metaFile)!;
  if (meta.status && meta.status >= 400) {
    setStatus(site, { state: 'failed', error: `HTTP ${meta.status}` });
    return;
  }
  if (args['capture-only']) {
    setStatus(site, { state: 'queued' });
    return;
  }

  setStatus(site, { state: 'labeling' });
  const ldir = labelsDir(batch, site.slug);
  await Promise.all(raters.map(async (rater) => {
    const out = path.join(ldir, `${rater.id}.json`);
    if (!args.relabel && fs.existsSync(out)) return setRater(site, rater.id, 'done');
    setRater(site, rater.id, 'running');
    try {
      await runRater({ batch, site, captureDir: cdir, labelsDir: ldir, rater, codebook, browser });
      setRater(site, rater.id, 'done');
    } catch (e) {
      setRater(site, rater.id, 'failed', (e as Error).message);
    }
  }));

  const st = readStatus(site.slug)!;
  const failed = Object.entries(st.raters).filter(([, r]) => r.state === 'failed').map(([id]) => id);
  const agreement = scoreSite(batch, site.slug, info!.raters.map((r) => r.id));
  const flags: string[] = [];
  if (failed.length) flags.push(`rater(s) failed: ${failed.join(', ')}`);
  if (agreement && agreement.score < (raterCfg.flagBelowAgreement ?? 0.67)) flags.push(`low agreement ${agreement.score.toFixed(2)}`);
  if (agreement?.servedByMismatch.length) flags.push(`fallback model served: ${agreement.servedByMismatch.join(', ')}`);
  const allDone = info!.raters.every((r) => st.raters[r.id]?.state === 'done');
  setStatus(site, { state: !allDone && !failed.length ? 'labeling' : flags.length ? 'flagged' : 'labeled', flags });
}

function statusFile(slug: string) { return path.join(siteDir(batch, slug), 'status.json'); }
function readStatus(slug: string) { return readJson<SiteStatus>(statusFile(slug)); }

function initStatus(site: SiteSpec & { slug: string }) {
  if (readStatus(site.slug)) return;
  writeJson(statusFile(site.slug), {
    slug: site.slug, url: site.url, ...(site.domain ? { domain: site.domain } : {}), state: 'queued',
    raters: Object.fromEntries(info!.raters.map((r) => [r.id, { state: 'pending', updatedAt: new Date().toISOString() }])), flags: [], updatedAt: new Date().toISOString(),
  } satisfies SiteStatus);
}

// Status writes are serialized per process (raters of one site run concurrently).
function setStatus(site: SiteSpec & { slug: string }, patch: Partial<SiteStatus>) {
  const cur = readStatus(site.slug)!;
  const next: SiteStatus = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  if (patch.state && patch.state !== 'failed') delete next.error;
  writeJson(statusFile(site.slug), next);
}
function setRater(site: SiteSpec & { slug: string }, id: string, state: SiteStatus['raters'][string]['state'], error?: string) {
  const cur = readStatus(site.slug)!;
  cur.raters[id] = { state, ...(error ? { error } : {}), updatedAt: new Date().toISOString() };
  cur.updatedAt = new Date().toISOString();
  writeJson(statusFile(site.slug), cur);
  if (error) console.error(`  ${site.slug} · ${id}: ${error}`);
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.max(1, n) }, async () => {
    for (let t = queue.shift(); t !== undefined; t = queue.shift()) await fn(t);
  }));
}
