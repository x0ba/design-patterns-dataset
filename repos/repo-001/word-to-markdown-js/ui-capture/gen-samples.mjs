// Generates a realistic corpus of Word documents for word2md: the kind of
// files a regular user (here, a product/ops lead at a small civic-tech
// nonprofit) converts over a few months. Built with the repo's own
// scripts/lib/docx-from-spec.mjs (the `docx` library), then round-tripped
// through the real converter (build/main.js) so every file is known to convert.
//
// Run: node .ui-capture/gen-samples.mjs   (needs `npm run build:js` first)
// Output: .ui-capture/samples/*.docx (+ the .md each converts to, for reference)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { docxFromSpec } from '../scripts/lib/docx-from-spec.mjs';
import { DOCS } from './sample-docs.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'samples');
const { default: convert } = await import('../build/main.js');

// Inline markup → Run[]: **bold**, *italic*, ~~strike~~, `code`,
// [text](url), ^[footnote text], ^{sup}, _{sub}
const TOKEN =
  /\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`|\[(.+?)\]\((.+?)\)|\^\[(.+?)\]|\^\{(.+?)\}|_\{(.+?)\}/g;
function runs(s) {
  const out = [];
  let last = 0;
  for (const m of s.matchAll(TOKEN)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    if (m[1]) out.push({ text: m[1], bold: true });
    else if (m[2]) out.push({ text: m[2], italic: true });
    else if (m[3]) out.push({ text: m[3], strike: true });
    else if (m[4]) out.push({ text: m[4], code: true });
    else if (m[5]) out.push({ text: m[5], link: m[6] });
    else if (m[7]) out.push({ text: '', footnote: m[7] });
    else if (m[8]) out.push({ text: m[8], sup: true });
    else if (m[9]) out.push({ text: m[9], sub: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

// Compact block notation used in sample-docs.mjs:
//   '# Title' / '## Sub' … headings; '- item' / '  - nested' bullets;
//   '1. item' / '   1. nested' ordered; { table: [[...], ...] }; else paragraph.
function toBlocks(lines) {
  const blocks = [];
  let list = null;
  const flush = () => {
    if (list) blocks.push(list);
    list = null;
  };
  for (const line of lines) {
    if (typeof line === 'object') {
      flush();
      blocks.push({
        type: 'table',
        rows: line.table.map((r) => ({
          cells: r.map((c) => ({ runs: runs(String(c)) })),
        })),
      });
      continue;
    }
    const h = /^(#{1,6}) (.*)$/.exec(line);
    const b = /^( *)- (.*)$/.exec(line);
    const o = /^( *)\d+\. (.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ type: 'heading', level: h[1].length, runs: runs(h[2]) });
    } else if (b || o) {
      const m = b || o;
      const ordered = !!o;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { type: 'list', ordered, items: [] };
      }
      list.items.push({
        level: Math.floor(m[1].length / (ordered ? 3 : 2)),
        runs: runs(m[2]),
      });
    } else {
      flush();
      blocks.push({ type: 'paragraph', runs: runs(line) });
    }
  }
  flush();
  return blocks;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let ok = 0;
for (const doc of DOCS) {
  const file = path.join(OUT, doc.file);
  if (doc.raw) {
    // Not a .docx at all (e.g. a legacy .doc): real folders have these.
    fs.writeFileSync(file, doc.raw);
  } else {
    const buffer = await docxFromSpec({ name: doc.file, blocks: toBlocks(doc.body) });
    fs.writeFileSync(file, buffer);
    const md = await convert(file);
    if (!md.trim()) throw new Error(`${doc.file}: empty conversion`);
    fs.writeFileSync(file.replace(/\.docx$/, '.md'), md);
    ok++;
  }
  // Spread modification times over the months the files were worked on, so a
  // file picker sorted by date looks like a real Documents folder.
  const t = new Date(doc.date);
  fs.utimesSync(file, t, t);
}
console.log(`Wrote ${DOCS.length} files (${ok} .docx round-tripped) to ${OUT}`);
