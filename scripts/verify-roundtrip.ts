#!/usr/bin/env node
// README "Rules" §1: building from codebook/ must reproduce the original atlas.
//
//   node scripts/verify-roundtrip.ts [original.html] [rebuilt.html] [--verbose]
//
// Compares, original vs rebuilt:
//   1. the embedded atlas JSON (every entry, dimension, variation; generatedAt ignored)
//   2. every entry <article> (normalized markup), which covers names, definitions,
//      dimensions, sub-dimensions, variations, counts, relations and previews
//   3. every inline SVG preview, byte for byte
//   4. every other data-driven region (lanes, matrix, map, families, crosswalk)
//   5. the static template (everything else) — byte-identical by construction
//
// Normalization only removes what is not content: insignificant whitespace,
// live-editing alternates (<marble-alt>, resolved to the active one) and the
// configurator's current picks (data-pick / aria-pressed), which are UI state.

import fs from 'node:fs';
import { P } from '../src/paths.ts';
import { firstDiff } from '../src/codebook/convert.ts';
import { innerOf, normalizeMarkup, resolveMarbleAlts } from '../src/codebook/html.ts';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const verbose = process.argv.includes('--verbose');
const origPath = args[0] ?? P.originalAtlas;
const newPath = args[1] ?? P.distAtlas;
const orig = fs.readFileSync(origPath, 'utf8');
const rebuilt = fs.readFileSync(newPath, 'utf8');

let failures = 0;
const fail = (what: string, detail: string) => { failures++; console.error(`✗ ${what}\n    ${detail}`); };
const ok = (what: string) => console.log(`✓ ${what}`);

// 1. JSON ------------------------------------------------------------------
const json = (h: string) => {
  const d = JSON.parse(/<script type="application\/json" id="atlas-json"[^>]*>([\s\S]*?)<\/script>/.exec(h)![1]);
  delete d.generatedAt;
  return d;
};
const ja = json(orig), jb = json(rebuilt);
const jd = firstDiff(jb, ja);
if (jd) fail('atlas JSON', jd); else ok(`atlas JSON identical (${ja.entries.length} entries, ${ja.stats.dims} dimensions, ${ja.stats.subs} sub-dimensions, ${ja.stats.vars} variations)`);

// 2. articles --------------------------------------------------------------
const stripUiState = (s: string) => s
  .replace(/\sdata-pick="[^"]*"/g, '')
  .replace(/\saria-pressed="[^"]*"/g, '')
  .replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>'); // compared separately below
const articles = (h: string) => {
  const map = new Map<string, string>();
  const re = /<article class="entry"[^>]*data-id="([^"]+)"[\s\S]*?<\/article>/g;
  for (let m = re.exec(h); m; m = re.exec(h)) map.set(m[1], normalizeMarkup(stripUiState(resolveMarbleAlts(m[0]))));
  return map;
};
const aa = articles(orig), ab = articles(rebuilt);
let artFail = 0;
for (const [id, a] of aa) {
  const b = ab.get(id);
  if (b === undefined) { artFail++; fail(`article ${id}`, 'missing from rebuilt atlas'); continue; }
  if (a !== b) { artFail++; fail(`article ${id}`, describe(a, b)); }
}
for (const id of ab.keys()) if (!aa.has(id)) { artFail++; fail(`article ${id}`, 'not in original'); }
if (!artFail) ok(`${aa.size} entry articles identical (order: ${[...aa.keys()].join(',') === [...ab.keys()].join(',') ? 'same' : 'DIFFERENT'})`);
if ([...aa.keys()].join(',') !== [...ab.keys()].join(',')) fail('article order', 'entries appear in a different order');

// 3. previews --------------------------------------------------------------
const svgs = (h: string) => {
  const map = new Map<string, string>();
  const re = /<svg data-marble-id="(svg-[a-z]+-[a-z0-9-]+)"[\s\S]*?<\/svg>/g;
  for (let m = re.exec(h); m; m = re.exec(h)) map.set(m[1], m[0]);
  return map;
};
const sa = svgs(orig), sb = svgs(rebuilt);
let svgFail = 0;
for (const [k, v] of sa) if (sb.get(k) !== v) { svgFail++; fail(`preview ${k}`, sb.has(k) ? 'markup differs' : 'missing'); }
if (sa.size !== sb.size) { svgFail++; fail('previews', `count ${sa.size} -> ${sb.size}`); }
if (!svgFail) ok(`${sa.size} inline SVG previews byte-identical`);

// 4. other data regions ----------------------------------------------------
const regions: [string, string][] = [
  ['lane headers', 'id="overview-root"'],
  ['family matrix', 'id="matrix-host"'],
  ['map dots', 'id="map-host"'],
  ['family cards', 'data-marble-id="fam-grid"'],
  ['crosswalk rows', 'data-marble-id="xwalk-body"'],
];
for (const [name, needle] of regions) {
  let a = innerOf(orig, needle), b = innerOf(rebuilt, needle);
  if (name === 'lane headers') {
    const strip = (s: string) => s.replace(/<article class="entry"[\s\S]*?<\/article>/g, '');
    a = strip(a); b = strip(b);
  }
  a = normalizeMarkup(a); b = normalizeMarkup(b);
  if (a === b) ok(`${name} identical`); else fail(name, describe(a, b));
}

// 5. static template -------------------------------------------------------
const skeleton = (h: string) => {
  let s = h.replace(/<script type="application\/json" id="atlas-json"[^>]*>[\s\S]*?<\/script>/, '');
  for (const [, needle] of regions) {
    const at = s.indexOf(needle);
    const inner = innerOf(s, needle);
    const start = s.indexOf(inner, at);
    s = s.slice(0, start) + s.slice(start + inner.length);
  }
  return s;
};
if (skeleton(orig) === skeleton(rebuilt)) ok('static template (CSS, scripts, notes/method/grammar/findings panels, chrome) byte-identical');
else fail('static template', describe(skeleton(orig), skeleton(rebuilt)));

console.log(failures ? `\nRound-trip FAILED (${failures} difference(s)).` : '\nRound-trip OK.');
process.exit(failures ? 1 : 0);

function describe(a: string, b: string): string {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  const ctx = verbose ? 400 : 160;
  return `first difference at char ${i}:\n      original: …${a.slice(Math.max(0, i - 60), i + ctx)}…\n      rebuilt:  …${b.slice(Math.max(0, i - 60), i + ctx)}…`;
}
