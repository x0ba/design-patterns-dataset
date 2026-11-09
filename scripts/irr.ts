#!/usr/bin/env node
// Inter-rater reliability for a batch (README "IRR" table).
//
//   node scripts/irr.ts --batch batch-001 [--min-units 5]
//
// Writes dataset/<batch>/irr.json and refreshes every site's agreement.json and
// consensus.json. Pattern status and confidence are pooled over (site, pattern)
// units, where the patterns of a site are the union of what any rater listed and
// an unlisted pattern counts as "absent" for a rater who submitted a label.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { batchDir, readJson, writeJson } from '../src/pipeline/sites.ts';
import { FIELDS } from '../src/irr/fields.ts';
import { krippendorffAlpha, type Value } from '../src/irr/krippendorff.ts';
import { loadSiteLabels, scoreSite } from '../src/irr/site.ts';

const { values: args } = parseArgs({ options: { batch: { type: 'string' }, 'min-units': { type: 'string', default: '5' } } });
if (!args.batch) { console.error('usage: node scripts/irr.ts --batch <name>'); process.exit(2); }
const batch = args.batch;
const info = readJson<{ raters: { id: string; model: string }[]; codebookVersion: string }>(path.join(batchDir(batch), 'batch.json'));
if (!info) { console.error(`no batch ${batch}`); process.exit(1); }
const raterIds = info.raters.map((r) => r.id);
const sitesRoot = path.join(batchDir(batch), 'sites');
const slugs = fs.existsSync(sitesRoot) ? fs.readdirSync(sitesRoot).filter((s) => fs.statSync(path.join(sitesRoot, s)).isDirectory()) : [];

const pooled = new Map<string, Value[][]>(FIELDS.map((f) => [f.key, []]));
const perPattern = new Map<string, Value[][]>();
let sitesUsed = 0;
for (const slug of slugs) {
  const labels = loadSiteLabels(batch, slug, raterIds);
  scoreSite(batch, slug, raterIds);
  if (labels.filter(Boolean).length < 2) continue;
  sitesUsed++;
  for (const f of FIELDS) {
    for (const [unit, vals] of f.units(labels)) {
      pooled.get(f.key)!.push(vals);
      if (f.key === 'pattern.status') {
        if (!perPattern.has(unit)) perPattern.set(unit, []);
        perPattern.get(unit)!.push(vals);
      }
    }
  }
}

const fields = FIELDS.map((f) => ({
  field: f.key, label: f.label, location: f.location, metric: f.metric,
  ...krippendorffAlpha(pooled.get(f.key)!, f.metric, f.order),
}));
const minUnits = Number(args['min-units']);
const patterns = [...perPattern.entries()]
  .map(([id, units]) => ({ id, ...krippendorffAlpha(units, 'nominal') }))
  .filter((p) => p.units >= minUnits)
  .sort((a, b) => (a.alpha ?? 2) - (b.alpha ?? 2));

const report = { batch, codebookVersion: info.codebookVersion, raters: raterIds, sites: slugs.length, sitesWithTwoPlusLabels: sitesUsed, fields, patternStatusByPattern: patterns, computedAt: new Date().toISOString() };
writeJson(path.join(batchDir(batch), 'irr.json'), report);

const fmt = (x: number | null) => (x === null ? '  n/a' : x.toFixed(3).padStart(6));
console.log(`IRR — ${batch} · codebook ${info.codebookVersion} · ${sitesUsed}/${slugs.length} sites with ≥2 labels · raters ${raterIds.join(', ')}\n`);
console.log('Field                     Metric     alpha   agree   units');
for (const f of fields) {
  console.log(`${f.label.padEnd(25)} ${f.metric.padEnd(9)} ${fmt(f.alpha)}  ${f.metric === 'interval' ? '     —' : fmt(f.pairwiseAgreement)}  ${String(f.units).padStart(5)}${f.note ? `  (${f.note})` : ''}`);
}
if (patterns.length) {
  console.log(`\nLeast reliable pattern statuses (≥${minUnits} units):`);
  for (const p of patterns.slice(0, 10)) console.log(`  ${p.id.padEnd(28)} α ${fmt(p.alpha)}  agree ${fmt(p.pairwiseAgreement)}  units ${p.units}`);
}
console.log(`\n-> dataset/${batch}/irr.json`);
