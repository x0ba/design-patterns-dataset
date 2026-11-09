#!/usr/bin/env node
// One-time migration: codebook.html (the original Pattern Atlas) -> codebook/.
//
//   node scripts/extract-atlas.ts [path/to/atlas.html] [--force]
//
// Writes one YAML per entry, one SVG per preview, the atlas-wide data, and the
// page template (CSS, scripts, prose panels). Then reloads what it wrote and
// checks that it rebuilds the original embedded atlas JSON exactly.

import fs from 'node:fs';
import path from 'node:path';
import { P } from '../src/paths.ts';
import { atlasDocToMeta, atlasToPattern, buildAtlasDoc, firstDiff } from '../src/codebook/convert.ts';
import { loadCodebook, PATTERN_HEADER, writeAtlasMeta, writeYaml } from '../src/codebook/io.ts';
import { innerRangeOf } from '../src/codebook/html.ts';
import { slotMarker, type Slot } from '../src/codebook/render-atlas.ts';
import type { AtlasDoc } from '../src/codebook/types.ts';

const args = process.argv.slice(2);
const force = args.includes('--force');
const src = args.find((a) => !a.startsWith('--')) ?? P.originalAtlas;
const VERSION = '1.0.0';

if (fs.existsSync(P.patterns) && fs.readdirSync(P.patterns).length && !force) {
  console.error(`codebook/patterns/ is not empty. This is a one-time migration; pass --force to overwrite.`);
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const doc = readAtlasJson(html);
console.log(`Read ${doc.entries.length} entries from ${path.relative(P.root, src)}`);

// ------------------------------------------------------------- previews
const previews = extractPreviews(html);
fs.rmSync(P.previews, { recursive: true, force: true });
fs.mkdirSync(P.previews, { recursive: true });
for (const [id, svg] of previews) fs.writeFileSync(path.join(P.previews, `${id}.svg`), svg + '\n');
console.log(`Wrote ${previews.size} previews to codebook/previews/`);

// -------------------------------------------------------------- entries
fs.rmSync(P.patterns, { recursive: true, force: true });
fs.mkdirSync(P.patterns, { recursive: true });
for (const e of doc.entries) {
  const p = atlasToPattern(e, VERSION);
  if (!previews.has(e.id)) p.previews = [];
  writeYaml(path.join(P.patterns, `${e.id}.yaml`), p, PATTERN_HEADER(e.id));
}
console.log(`Wrote ${doc.entries.length} entries to codebook/patterns/`);

// ---------------------------------------------------- atlas-wide data
writeAtlasMeta(atlasDocToMeta(doc));
fs.writeFileSync(P.version, VERSION + '\n');
if (!fs.existsSync(P.changelog)) {
  fs.writeFileSync(P.changelog, `# Codebook changelog

Versioning: minor bump for new entries or new dimension values, major bump for
renames or removals (which must use \`deprecated: true\` + \`replacedBy\`).

## ${VERSION} — ${new Date().toISOString().slice(0, 10)}

- Initial import of ${doc.entries.length} entries from the original Pattern Atlas (\`codebook.html\`, generated ${doc.generatedAt}).
`);
}

// ------------------------------------------------------------ template
writeTemplate(html);
console.log('Wrote page template to codebook/site/');

// ----------------------------------------------------------- self-check
const rebuilt = buildAtlasDoc(loadCodebook(), doc.generatedAt);
const diff = firstDiff(rebuilt, doc);
if (diff) {
  console.error(`Round-trip FAILED: rebuilt atlas JSON differs from the original at ${diff}`);
  process.exit(1);
}
console.log('Round-trip OK: codebook/ rebuilds the original atlas JSON exactly.');

// ======================================================================

function readAtlasJson(h: string): AtlasDoc {
  const m = /<script type="application\/json" id="atlas-json"[^>]*>([\s\S]*?)<\/script>/.exec(h);
  if (!m) throw new Error('atlas-json script not found');
  return JSON.parse(m[1]);
}

/** id -> standalone SVG (the card plate; it is identical to the detail plate). */
function extractPreviews(h: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /<svg data-marble-id="svg-(card|det)-([a-z0-9-]+)"([\s\S]*?<\/svg>)/g;
  const det = new Map<string, string>();
  for (let m = re.exec(h); m; m = re.exec(h)) {
    const svg = '<svg' + m[3];
    (m[1] === 'card' ? out : det).set(m[2], svg);
  }
  for (const [id, svg] of det) {
    if (out.get(id) !== svg) console.warn(`warn: card and detail previews differ for ${id}; keeping the card one`);
  }
  return out;
}

function writeTemplate(h: string): void {
  fs.mkdirSync(P.site, { recursive: true });
  // Ordered by position, replaced back-to-front so earlier offsets stay valid.
  const regions: { slot: Slot; range: [number, number]; file?: string }[] = [
    { slot: 'css', range: innerRangeOf(h, 'data-marble-id="css"'), file: 'atlas.css' },
    { slot: 'atlas-json', range: innerRangeOf(h, 'id="atlas-json"') },
    { slot: 'affordances-js', range: innerRangeOf(h, 'data-marble-id="affordances-js"'), file: 'affordances.js' },
    { slot: 'app-js', range: innerRangeOf(h, 'data-marble-id="app-js"'), file: 'app.js' },
    { slot: 'matrix', range: innerRangeOf(h, 'id="matrix-host"') },
    { slot: 'map', range: innerRangeOf(h, 'id="map-host"') },
    { slot: 'overview', range: innerRangeOf(h, 'id="overview-root"') },
    { slot: 'families', range: innerRangeOf(h, 'data-marble-id="fam-grid"') },
    { slot: 'crosswalk', range: innerRangeOf(h, 'data-marble-id="xwalk-body"') },
  ];
  regions.sort((a, b) => b.range[0] - a.range[0]);
  let shell = h;
  for (const r of regions) {
    const [a, b] = r.range;
    if (r.file) fs.writeFileSync(path.join(P.site, r.file), h.slice(a, b));
    shell = shell.slice(0, a) + slotMarker(r.slot) + shell.slice(b);
  }
  fs.writeFileSync(path.join(P.site, 'shell.html'), shell);
}
