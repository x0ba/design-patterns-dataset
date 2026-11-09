#!/usr/bin/env node
// codebook/ -> dist/codebook.json + dist/atlas.html + dist/previews/
//
//   node scripts/build-codebook.ts [--generated-at <iso>]
//
// Refuses to build an invalid codebook.

import fs from 'node:fs';
import path from 'node:path';
import { P } from '../src/paths.ts';
import { buildAtlasDoc } from '../src/codebook/convert.ts';
import { loadCodebook } from '../src/codebook/io.ts';
import { validateCodebook } from '../src/codebook/validate.ts';
import { renderAtlas } from '../src/codebook/render-atlas.ts';
import { buildBundle } from '../src/codebook/bundle.ts';

const gi = process.argv.indexOf('--generated-at');
const generatedAt = gi > 0 ? process.argv[gi + 1] : new Date().toISOString();

const problems = validateCodebook();
if (problems.length) {
  for (const p of problems) console.error(`${p.file}: ${p.message}`);
  console.error(`\nNot building: ${problems.length} validation problem(s). Run scripts/validate-codebook.ts.`);
  process.exit(1);
}

const cb = loadCodebook();
fs.mkdirSync(P.dist, { recursive: true });

// previews (copied so dist/ is self-contained and paths in codebook.json resolve)
fs.rmSync(P.distPreviews, { recursive: true, force: true });
fs.mkdirSync(P.distPreviews, { recursive: true });
const previews = new Map<string, string>();
for (const e of cb.entries) {
  for (const [i, pv] of e.previews.entries()) {
    const svg = fs.readFileSync(path.join(P.previews, pv.file), 'utf8').trim();
    fs.writeFileSync(path.join(P.distPreviews, pv.file), svg + '\n');
    if (i === 0) previews.set(e.id, svg);
  }
}

const bundle = buildBundle(cb, generatedAt);
fs.writeFileSync(P.distCodebook, JSON.stringify(bundle, null, 1) + '\n');

const doc = buildAtlasDoc(cb, generatedAt);
fs.writeFileSync(P.distAtlas, renderAtlas({ doc, previews, siteDir: P.site }));

console.log(`codebook ${cb.version}: ${bundle.entries.length} entries -> dist/codebook.json, dist/atlas.html, dist/previews/ (${previews.size} previews)`);
