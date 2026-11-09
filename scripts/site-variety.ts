#!/usr/bin/env node
// Variety report for a site list and, when labeled, for the labeled dataset.
//
//   node scripts/site-variety.ts sites/batch-001.yaml [--batch batch-001] [--json]

import path from 'node:path';
import { parseArgs } from 'node:util';
import { labelSchema, loadBundle } from '../src/pipeline/label.ts';
import { readJson, readSiteList, siteDir } from '../src/pipeline/sites.ts';
import { diversity, patternSetVariety } from '../src/variety.ts';

const { values: args, positionals } = parseArgs({ allowPositionals: true, options: { batch: { type: 'string' }, json: { type: 'boolean', default: false } } });
const file = positionals[0];
if (!file) { console.error('usage: node scripts/site-variety.ts sites/<batch>.yaml [--batch <name>]'); process.exit(2); }
const list = readSiteList(file);
const domains: string[] = labelSchema().$defs.domain.enum;

const frame = diversity(list.sites.map((s) => s.domain ?? 'unspecified'), domains.length);
const unsampled = domains.filter((d) => !(d in frame.counts) && d !== 'other');
const hosts = new Map<string, number>();
for (const s of list.sites) { const h = new URL(s.url).hostname.replace(/^www\./, ''); hosts.set(h, (hosts.get(h) ?? 0) + 1); }

const report: Record<string, unknown> = {
  sitesFile: file,
  frame: { ...frame, domainsInSchema: domains.length, unsampledDomains: unsampled, repeatedHosts: [...hosts].filter(([, n]) => n > 1).map(([h, n]) => ({ host: h, sites: n })) },
};

if (args.batch) {
  const codebook = loadBundle();
  const sets = new Map<string, Set<string>>();
  const aest: Record<string, string[]> = {};
  const labeledDomains: string[] = [];
  for (const s of list.sites) {
    const c = readJson<any>(path.join(siteDir(args.batch, s.slug!), 'consensus.json'));
    if (!c) continue;
    sets.set(s.slug!, new Set(c.patterns.filter((p: any) => p.status === 'present').map((p: any) => p.id)));
    for (const [k, v] of Object.entries<any>(c.aesthetics)) if (v.value) (aest[k] ??= []).push(v.value);
    if (c.domain?.value) labeledDomains.push(c.domain.value);
  }
  report.dataset = {
    batch: args.batch,
    labeledDomains: diversity(labeledDomains, domains.length),
    patterns: patternSetVariety(sets, codebook.entries.filter((e) => !e.deprecated).length),
    aesthetics: Object.fromEntries(Object.entries(aest).map(([k, v]) => [k, diversity(v)])),
  };
}

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const f = report.frame as any;
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  console.log(`Sampling frame: ${file} — ${f.n} sites`);
  console.log(`  domains sampled ${f.categories}/${f.domainsInSchema} · evenness ${f.evenness.toFixed(2)} · effective domains ${f.effectiveCategories.toFixed(1)} · Gini–Simpson ${f.giniSimpson.toFixed(2)}`);
  console.log(`  by domain: ${Object.entries(f.counts).map(([d, n]) => `${d} ${n}`).join(', ')}`);
  if (f.unsampledDomains.length) console.log(`  not sampled: ${f.unsampledDomains.join(', ')}`);
  if (f.repeatedHosts.length) console.log(`  repeated hosts: ${f.repeatedHosts.map((h: any) => `${h.host}×${h.sites}`).join(', ')}`);
  const d = report.dataset as any;
  if (d) {
    console.log(`\nLabeled dataset (${d.batch}, consensus): ${d.patterns.sites} sites`);
    console.log(`  codebook coverage ${pct(d.patterns.codebookCoverage)} (${d.patterns.patternsObserved} patterns present somewhere)`);
    if (d.patterns.meanPairwiseJaccardDistance !== null) console.log(`  mean pairwise Jaccard distance of pattern sets ${d.patterns.meanPairwiseJaccardDistance.toFixed(2)}`);
    if (d.patterns.nearDuplicatePairs.length) console.log(`  near-duplicate sites: ${d.patterns.nearDuplicatePairs.map((p: any) => `${p[0]}~${p[1]} (${p[2]})`).join(', ')}`);
    for (const [k, v] of Object.entries<any>(d.aesthetics)) console.log(`  ${k.padEnd(20)} evenness ${v.evenness.toFixed(2)}  ${Object.entries(v.counts).map(([x, n]) => `${x} ${n}`).join(', ')}`);
  }
}
