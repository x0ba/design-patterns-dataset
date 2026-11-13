#!/usr/bin/env node
// Write the brief frame for a generated batch: briefs/<batch>.yaml.
//
//   node scripts/briefs.ts --batch gen-001 [--n 48] [--seed 1]
//        [--domains a,b] [--archetypes a,b] [--config config/generators.yaml] [--plan-only]
//
// --plan-only prints the domain × function × generator cells without calling a model.
// Review the file (especially `echo`) before running scripts/generate.ts.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { P } from '../src/paths.ts';
import { loadBundle } from '../src/pipeline/label.ts';
import { frameArchetypes, frameDomains, planCells, readGenerationConfig, writeBriefFile, writeBriefs } from '../src/generate/briefs.ts';
import { diversity } from '../src/variety.ts';

const { values: args } = parseArgs({
  options: {
    batch: { type: 'string' },
    n: { type: 'string', default: '48' },
    seed: { type: 'string' },
    domains: { type: 'string' },
    archetypes: { type: 'string' },
    config: { type: 'string', default: path.join(P.root, 'config', 'generators.yaml') },
    'plan-only': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
});
if (!args.batch) {
  console.error('usage: node scripts/briefs.ts --batch <name> [--n 48] [--seed N] [--domains a,b] [--archetypes a,b] [--plan-only]');
  process.exit(2);
}
const file = path.join(P.briefs, `${args.batch}.yaml`);
if (fs.existsSync(file) && !args.force && !args['plan-only']) {
  console.error(`${path.relative(P.root, file)} exists. Edit it, or pass --force to rewrite it.`);
  process.exit(1);
}

const codebook = loadBundle();
const cfg = readGenerationConfig(args.config!);
const allDomains = frameDomains();
const allArchetypes = frameArchetypes(codebook).map((e) => e.id);
const pick = (given: string | undefined, all: string[], what: string) => {
  if (!given) return all;
  const xs = given.split(',').map((s) => s.trim());
  const bad = xs.filter((x) => !all.includes(x));
  if (bad.length) { console.error(`unknown ${what}: ${bad.join(', ')} (have: ${all.join(', ')})`); process.exit(2); }
  return xs;
};
const domains = pick(args.domains, allDomains, 'domains');
const archetypes = pick(args.archetypes, allArchetypes, 'archetypes');
const seed = args.seed ? Number(args.seed) : Math.floor(Math.random() * 2 ** 31);
const n = Number(args.n);
const cells = planCells(n, domains, archetypes, cfg.generators.map((g) => g.id), seed);

const summary = (key: 'domain' | 'archetype' | 'generator', k: number) => {
  const d = diversity(cells.map((c) => c[key]), k);
  return `${key}s ${d.categories}/${k} · evenness ${d.evenness.toFixed(2)}`;
};
console.log(`${n} cells (seed ${seed}): ${summary('domain', domains.length)} · ${summary('archetype', archetypes.length)} · ${summary('generator', cfg.generators.length)}`);
if (n > lcm(domains.length, archetypes.length)) console.log(`  note: n > ${lcm(domains.length, archetypes.length)} repeats some domain × function pairs`);
if (args['plan-only']) {
  for (const [i, c] of cells.entries()) console.log(`${String(i).padStart(3)}  ${c.domain.padEnd(20)} ${c.archetype.padEnd(20)} ${c.generator}`);
  process.exit(0);
}

const briefs = await writeBriefs(cells, codebook, cfg.briefWriter, { log: console.log });
fs.mkdirSync(P.briefs, { recursive: true });
writeBriefFile(file, {
  batch: args.batch, createdAt: new Date().toISOString(), codebookVersion: codebook.version, seed,
  writer: cfg.briefWriter, briefs,
});
const echoed = briefs.filter((b) => b.echo?.length);
console.log(`\nWrote ${path.relative(P.root, file)}: ${briefs.length} briefs.`);
if (echoed.length) {
  console.log(`${echoed.length} brief(s) mention codebook pattern names; check whether each describes the data or leaks the UI:`);
  for (const b of echoed) console.log(`  ${b.slug}: ${b.echo!.join(', ')}`);
}
console.log(`Next: review the briefs, then node scripts/generate.ts --batch ${args.batch}`);

function lcm(a: number, b: number): number {
  const g = (x: number, y: number): number => (y ? g(y, x % y) : x);
  return (a * b) / g(a, b);
}
