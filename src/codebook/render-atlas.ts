// Renders dist/atlas.html from the codebook.
//
// The page is the original Pattern Atlas: its CSS, scripts and hand-written prose
// panels live verbatim in codebook/site/ (extracted once from codebook.html), and
// every region that is fully determined by codebook data is rendered here:
//
//   #overview-root  lanes + one <article class="entry"> per pattern (incl. detail)
//   #matrix-host    family matrix (patterns only)
//   #map-host       potential/gap scatter dots
//   .fam-grid       the twelve family cards
//   #xwalk-body     crosswalk rows
//   #atlas-json     the embedded atlas JSON the page's scripts read
//
// Markup mirrors the original generator so the original app.js keeps working.

import fs from 'node:fs';
import path from 'node:path';
import type { AtlasDoc, AtlasEntry, AtlasSub } from './types.ts';

export const SLOTS = ['css', 'atlas-json', 'affordances-js', 'app-js', 'matrix', 'map', 'overview', 'families', 'crosswalk'] as const;
export type Slot = (typeof SLOTS)[number];
export const slotMarker = (s: Slot) => `<!--atlas:slot:${s}-->`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s: string) => esc(s).replace(/"/g, '&quot;');
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const LEVEL_GLYPH_CLASS: Record<string, string> = { archetype: 'a', pattern: 'p', component: 'c' };
// Card glyphs differ from levels.yaml glyphs (component uses the small square on cards).
const ENTRY_GLYPH: Record<string, string> = { archetype: '◆', pattern: '●', component: '▪' };

export interface RenderInput {
  doc: AtlasDoc;
  /** id -> inline SVG markup for the entry's primary preview (no marble id). */
  previews: Map<string, string>;
  siteDir: string;
}

export function renderAtlas({ doc, previews, siteDir }: RenderInput): string {
  const read = (f: string) => fs.readFileSync(path.join(siteDir, f), 'utf8');
  const slots: Record<Slot, string> = {
    css: read('atlas.css'),
    'atlas-json': jsonForScript(doc),
    'affordances-js': read('affordances.js'),
    'app-js': read('app.js'),
    matrix: renderMatrix(doc),
    map: renderMap(doc),
    overview: renderOverview(doc, previews),
    families: renderFamilies(doc),
    crosswalk: renderCrosswalk(doc),
  };
  let html = read('shell.html');
  for (const s of SLOTS) {
    const marker = slotMarker(s);
    if (!html.includes(marker)) throw new Error(`shell.html is missing ${marker}`);
    html = html.replace(marker, () => slots[s]);
  }
  return html;
}

/** JSON safe to embed in <script type="application/json">. */
export function jsonForScript(doc: unknown): string {
  return JSON.stringify(doc).replace(/</g, '\\u003c');
}

/** Attach the per-placement marble id the original gives each inline SVG. */
export function placeSvg(svg: string, marbleId: string): string {
  return svg.replace(/^<svg\b/, `<svg data-marble-id="${marbleId}"`);
}

// ------------------------------------------------------------------- matrix

function renderMatrix(doc: AtlasDoc): string {
  const fams = doc.families;
  const head = fams.map((f) => `<th data-marble-id="matrix-hf-${f.id}" title="${attr(f.name)}">${esc(f.name.slice(0, 3))}</th>`).join('');
  const rows = doc.entries.filter((e) => e.level === 'pattern').map((e) => {
    const cells = fams.map((f) =>
      `<td class="${e.metrics.families.includes(f.id) ? 'on' : 'off'}" data-marble-id="mxc-${e.id}-${f.id}" data-family="${f.id}"></td>`).join('');
    return `<tr data-marble-id="mx-${e.id}" data-id="${e.id}"><th class="row" data-marble-id="mxn-${e.id}"><button type="button" data-marble-id="mxb-${e.id}" data-focus-id="${e.id}">${esc(e.name)}</button></th>${cells}</tr>`;
  }).join('');
  return `<table class="matrix" data-marble-id="matrix-table"><thead data-marble-id="matrix-head"><tr data-marble-id="matrix-hr"><th class="row" data-marble-id="matrix-h0">Pattern</th>${head}</tr></thead><tbody data-marble-id="matrix-body">${rows}</tbody></table>`;
}

// ---------------------------------------------------------------------- map

function renderMap(doc: AtlasDoc): string {
  return doc.entries.map((e) =>
    `<button type="button" class="map-dot ${e.level}" data-marble-id="md-${e.id}" data-id="${e.id}" data-focus-id="${e.id}" data-potential="${e.scores.potential}" data-ubiquity="${e.scores.ubiquity}" data-spec="${e.scores.spec}" data-wild="${e.wild.score}" data-gap="${e.metrics.malleabilityGap}" data-size="${round(e.metrics.log10Config, 4)}" data-tip="${attr(e.name)}" aria-label="${attr(e.name)}"></button>`,
  ).join('\n');
}

// ----------------------------------------------------------------- families

function renderFamilies(doc: AtlasDoc): string {
  return doc.families.map((f, i) => `<article class="fam" data-marble-id="fam-${f.id}" data-family="${f.id}">
  <div class="fam-idx" data-marble-id="fami-${f.id}">${String(i + 1).padStart(2, '0')}</div>
  <h3 data-marble-id="fn-${f.id}" data-marble-editable>${esc(f.name)}</h3>
  <p class="def" data-marble-id="fd-${f.id}" data-marble-editable>${esc(f.def)}</p>
  <p class="fam-q" data-marble-id="fq-${f.id}">${esc(f.q)}</p>
  <p class="fam-meta" data-marble-id="fm-${f.id}">${doc.stats.byFamily[f.id] ?? 0} entries · ${esc(f.origin)}</p>
</article>`).join('\n');
}

// ---------------------------------------------------------------- crosswalk

function renderCrosswalk(doc: AtlasDoc): string {
  return doc.crosswalk.rows.map((r, i) => `<tr data-marble-id="xw-${i}">
  <td data-marble-id="xw-l-${i}">${esc(r.lib)}</td><td data-marble-id="xw-e-${i}">${esc(r.entry)}</td><td data-marble-id="xw-mtd-${i}"><button type="button" class="maps-to" data-marble-id="xw-m-${i}" data-focus-id="${attr(r.mapsTo)}" data-marble-instruction="Open ${attr(r.mapsTo)} in the atlas.">${esc(r.mapsTo)}</button></td><td data-marble-id="xw-a-${i}">${esc(r.as)}</td><td data-marble-id="xw-w-${i}">${esc(r.where ?? '')}</td>
</tr>`).join('\n');
}

// ----------------------------------------------------------------- overview

function renderOverview(doc: AtlasDoc, previews: Map<string, string>): string {
  const glyphs = Object.fromEntries(doc.levels.map((l) => [l.id, l.glyph]));
  return doc.archetypes.map((a) => {
    const lane = doc.entries.filter((e) => e.archetype === a.id);
    const nPat = lane.filter((e) => e.level === 'pattern').length;
    const nComp = lane.filter((e) => e.level === 'component').length;
    return `<section class="lane" data-marble-id="lane-${a.id}" data-archetype="${a.id}">
  <header class="lane-head" data-marble-id="lh-${a.id}">
    <span class="glyph arch" data-marble-id="lgly-${a.id}" aria-hidden="true">${glyphs.archetype ?? '◆'}</span>
    <div data-marble-id="linfo-${a.id}">
      <h2 data-marble-id="ln-${a.id}" data-marble-editable>${esc(a.name)}</h2>
      <p class="lane-def" data-marble-id="ld-${a.id}">${esc(a.def)}</p>
    </div>
    <span class="lane-count" data-marble-id="lc-${a.id}">${nPat} patterns · ${nComp} components</span>
  </header>
  <div class="lane-grid" data-marble-id="lg-${a.id}">${lane.map((e) => renderEntry(e, doc, glyphs, previews.get(e.id) ?? '')).join('')}</div></section>`;
  }).join('');
}

function renderEntry(e: AtlasEntry, doc: AtlasDoc, glyphs: Record<string, string>, svg: string): string {
  const m = e.metrics;
  const id = e.id;
  const famNames = doc.families.map((f) => f.name);
  const ticks = doc.families.map((f, i) =>
    `<i class="tick ${m.families.includes(f.id) ? 'on' : ''}" data-marble-id="tick-${id}-${i}" data-tip="${attr(f.name)}"></i>`).join('');
  const size = m.log10Config.toFixed(2);
  return `<article class="entry" data-marble-id="e-${id}" data-id="${id}" data-level="${e.level}" data-archetype="${e.archetype}" data-evidence="${attr(e.evidence)}" data-wild="${e.wild.score}" data-potential="${e.scores.potential}" data-spec="${e.scores.spec}" data-ubiquity="${e.scores.ubiquity}" data-gap="${m.malleabilityGap}" data-data="${attr(e.data)}" data-families="${m.families.join(',')}" data-profile="${m.familyProfile}" data-vars="${m.varCount}" data-size="${size}" data-cfg="${m.configSpace}" data-log10="${size}" data-marble-selectable tabindex="0" role="button" aria-label="Open ${attr(e.name)}" aria-expanded="false">
  <div class="entry-top" data-marble-id="et-${id}"><span class="glyph ${LEVEL_GLYPH_CLASS[e.level]}" data-marble-id="eg-${id}" aria-hidden="true">${ENTRY_GLYPH[e.level] ?? glyphs[e.level] ?? ''}</span><span class="badge ${attr(e.evidence)}" data-marble-id="eb-${id}">${esc(e.evidence)}</span></div>
  <div class="card-plate" data-marble-id="cpl-${id}">${svg ? placeSvg(svg, `svg-card-${id}`) : ''}</div>
  <h3 data-marble-id="en-${id}" data-marble-editable>${esc(e.name)}</h3>
  <p class="def" data-marble-id="ed-${id}" data-marble-editable>${esc(e.def)}</p>
  <div class="profile" data-marble-id="ep-${id}" data-tip="${attr(famNames.join(' · '))}">${ticks}</div>
  <div class="meta" data-marble-id="em-${id}"><span data-marble-id="emd-${id}">${m.dimCount} dims</span><span data-marble-id="emv-${id}">${m.varCount} vars</span><span data-marble-id="emg-${id}">gap ${m.malleabilityGap}</span></div>
  <div class="entry-detail" data-marble-id="det-${id}" role="dialog" aria-label="${attr(e.name)} design space">
    <div class="det-bar" data-marble-id="detbar-${id}">
      <span class="det-bar-label" data-marble-id="detbl-${id}">${e.level} · ${e.archetype}</span>
      <button type="button" class="btn-close-detail" data-marble-id="close-${id}" data-marble-instruction="Close this design space." aria-label="Close">Close</button>
    </div>
    <header class="det-head" data-marble-id="deth-${id}">
      <div class="det-plate" data-marble-id="detp-${id}">${svg ? placeSvg(svg, `svg-det-${id}`) : ''}</div>
      <div data-marble-id="dett-${id}">
        <h2 data-marble-id="detn-${id}" data-marble-editable>${esc(e.name)}</h2>
        <p class="lead" data-marble-id="detd-${id}" data-marble-editable>${esc(e.def)}</p>
      </div>
    </header>
    ${renderAnatomy(e)}
    ${renderSpace(e)}
    <section class="blk configure" data-marble-id="cfg-${id}"><h4 data-marble-id="cfgh-${id}">Configure</h4><div class="row-actions" data-marble-id="cfga-${id}"><button type="button" class="btn-random" data-marble-id="rand-${id}" data-marble-instruction="Pick a random point in this design space.">Randomize</button><button type="button" class="btn-copy" data-marble-id="copy-${id}" data-marble-instruction="Copy the live instance spec.">Copy JSON</button></div><pre class="spec-box" data-marble-id="spec-${id}"></pre></section>
    ${renderWild(e)}
    ${renderTechniques(e)}
    ${renderProtocol(e)}
    ${renderRelations(e)}
    ${renderList(e, 'usage', 'Usage', 'u', e.usage)}
    ${renderList(e, 'qs', 'Questions', 'q', e.questions)}
  </div>
</article>`;
}

function renderAnatomy(e: AtlasEntry): string {
  const id = e.id;
  const items = e.components.map(([n, r], i) =>
    `<li data-marble-id="comp-${id}-${i}"><strong data-marble-id="compn-${id}-${i}">${esc(n)}</strong> — ${esc(r)}</li>`).join('');
  return `<section class="blk" data-marble-id="anat-${id}"><h4 data-marble-id="anath-${id}">Anatomy</h4><ul data-marble-id="anatul-${id}">${items}</ul></section>`;
}

function renderSpace(e: AtlasEntry): string {
  const id = e.id;
  const dims = e.dims.map((d, di) => {
    const subs = d.subs.map((s, si) => renderSub(e, s, di, si)).join('');
    return `<section class="dim" data-marble-id="dim-${id}-${di}" data-family="${d.family}"><h4 data-marble-id="dimh-${id}-${di}">${esc(d.name)} <span class="famtag" data-marble-id="dimf-${id}-${di}">${esc(d.family)}</span></h4><p class="dq" data-marble-id="dimq-${id}-${di}">${esc(d.q)}</p>${subs}</section>`;
  }).join('');
  return `<section class="blk" data-marble-id="ds-${id}"><h4 data-marble-id="dsh-${id}">Design space</h4><div class="space" data-marble-id="space-${id}">${dims}</div></section>`;
}

function renderSub(e: AtlasEntry, s: AtlasSub, di: number, si: number): string {
  const id = e.id;
  const k = `${id}-${di}-${si}`;
  const coding = e.coding;
  const dist: Record<string, number> | undefined = coding?.distribution?.[s.key];
  const pick = s.vars[0]?.[0] ?? '';
  const vars = s.vars.map((v, vi) => {
    const count = coding && dist
      ? `<small class="n" data-marble-id="varn-${k}-${vi}" title="${dist[v[0]] ?? 0} of ${coding.instances} coded instances">${dist[v[0]] ?? 0}</small>`
      : '';
    return `<button type="button" class="var" data-marble-id="var-${k}-${vi}" data-name="${attr(v[0])}" aria-pressed="${vi === 0}" title="${attr(v[2])}">${esc(v[0])}${count}</button>`;
  }).join('');
  return `<div class="sub" data-marble-id="sub-${k}" data-key="${attr(s.key)}" data-sel="${s.sel}" data-pick="${attr(pick)}"><div class="subh" data-marble-id="subh-${k}"><span class="key" data-marble-id="subk-${k}">${esc(s.key)}</span> ${esc(s.name)} <em data-marble-id="subs-${k}">${s.sel}</em></div><div class="vars" data-marble-id="vars-${k}">${vars}</div></div>`;
}

function renderWild(e: AtlasEntry): string {
  const id = e.id;
  const items = e.wild.examples.map(([n, note], i) =>
    `<li data-marble-id="wx-${id}-${i}"><strong data-marble-id="wxn-${id}-${i}">${esc(n)}</strong> — ${esc(note)}</li>`).join('');
  return `<section class="blk" data-marble-id="wild-${id}"><h4 data-marble-id="wildh-${id}">In the wild</h4><p data-marble-editable data-marble-id="wildn-${id}">${esc(e.wild.note)}</p><ul data-marble-id="wildul-${id}">${items}</ul></section>`;
}

function renderTechniques(e: AtlasEntry): string {
  const id = e.id;
  const items = e.techniques.map((t, i) =>
    `<li data-marble-id="t-${id}-${i}"><strong data-marble-id="tn-${id}-${i}">${esc(t.name)}</strong>${t.ai ? ' · AI' : ''} (${esc(t.dim)}) — ${esc(t.how)}</li>`).join('');
  return `<section class="blk" data-marble-id="tech-${id}"><h4 data-marble-id="techh-${id}">Techniques · signature ${esc(e.signature)}</h4><ul data-marble-id="techul-${id}">${items}</ul></section>`;
}

function renderProtocol(e: AtlasEntry): string {
  const id = e.id;
  const c = e.coding;
  let coded = '';
  if (c) {
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const adopted = c.proposals?.adopted?.length ?? 0;
    const raised = c.proposals?.raised ?? 0;
    coded = `<p data-marble-id="protoc-${id}"><b>Coded.</b> ${c.instances} instances, ${c.raters.length} raters (${c.raters.join(', ')}), ${c.rounds} rounds. κ ${c.kappaFirstPass.toFixed(2)} first pass → ${c.kappaFinal.toFixed(2)} final; all three agree on ${pct(c.agreementFirstPass)} → ${pct(c.agreementFinal)} of cells. ${adopted} variation${adopted === 1 ? '' : 's'} adopted of ${raised} proposed; ${plural(c.unresolved.length, 'unresolved cell')}; ${plural(c.unobserved.length, 'unobserved variation')}.</p>`;
    const flagged = Object.entries(c.perSub ?? {}).filter(([, v]: [string, any]) => v?.flag === 'unreliable').map(([k]) => k);
    if (flagged.length) coded += `<p class="muted" data-marble-id="protof-${id}"><b>Unreliable sub-dimensions.</b> ${esc(flagged.join(', '))}</p>`;
  }
  return `<section class="blk" data-marble-id="proto-${id}"><h4 data-marble-id="protoh-${id}">Protocol</h4><p data-marble-id="protos-${id}"><b>Sample.</b> ${esc(e.sample)}</p><p data-marble-id="protou-${id}"><b>Unit.</b> ${esc(e.unit)}</p>${coded}</section>`;
}

function renderRelations(e: AtlasEntry): string {
  const id = e.id;
  const chips = (['uses', 'specializes', 'neighbors'] as const).flatMap((kind) =>
    e.relations[kind].map((r, i) =>
      `<button type="button" class="chip rel" data-marble-id="relb-${id}-${kind}-${i}" data-focus-id="${attr(r)}" data-marble-instruction="Open related pattern ${attr(r)}.">${kind}: ${esc(r)}</button>`)).join('');
  return `<section class="blk" data-marble-id="rel-${id}"><h4 data-marble-id="relh-${id}">Relations</h4><div class="chip-row" data-marble-id="relrow-${id}">${chips}</div></section>`;
}

function renderList(e: AtlasEntry, key: string, title: string, item: string, list: string[]): string {
  const id = e.id;
  const items = list.map((x, i) => `<li data-marble-id="${item}-${id}-${i}" data-marble-editable>${esc(x)}</li>`).join('');
  return `<section class="blk" data-marble-id="${key}-${id}"><h4 data-marble-id="${key}h-${id}">${title}</h4><ul data-marble-id="${key}ul-${id}">${items}</ul></section>`;
}

function round(x: number, d: number): string {
  return String(Number(x.toFixed(d)));
}
