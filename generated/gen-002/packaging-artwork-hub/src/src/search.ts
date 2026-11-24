import {
  BRANDS, ALL_ENTRIES, DIELINES, DIELINE_USAGE, REG_BLOCKS, ASSETS, GUIDES, LANGS, REGION_SHORT, artworkOf, pathOf, Status, COUNTRY,
} from './data';
import { fold } from './util';

export type ResultType = 'file' | 'entry' | 'product' | 'dieline' | 'regulatory' | 'asset' | 'guide';
export interface Result {
  type: ResultType; title: string; sub: string; route: string; status?: Status | 'current' | 'withdrawn' | 'new'; mono?: boolean;
  words: string[]; titleWords: string[]; weight: number; superseded?: boolean;
}

const words = (s: string) => fold(s).split(/[^a-z0-9%×]+/).filter(Boolean);

const INDEX: Result[] = [];
function add(r: Omit<Result, 'words' | 'titleWords'>, extra: string) {
  const all = `${r.title} ${r.sub} ${extra}`;
  INDEX.push({ ...r, words: [...new Set([...words(all), fold(r.title)])], titleWords: words(r.title) });
}

BRANDS.forEach((b) => {
  add({ type: 'product', title: b.name, sub: `Brand · ${b.category} · ${b.lines.length} product lines`, route: pathOf.brand(b), weight: 6 }, `${b.code} brand`);
  b.lines.forEach((l) => {
    add({ type: 'product', title: `${b.name} ${l.name}`, sub: `Product line · ${l.formats.length} pack formats`, route: pathOf.line(l), weight: 5 }, `${b.code} ${l.code} line`);
    l.formats.forEach((f) => {
      add({ type: 'product', title: `${b.name} ${l.name} · ${f.name}`, sub: `Pack format · ${f.kind} · ${f.markets.length} markets`, route: pathOf.format(f), weight: 4 }, `${b.code} ${l.code} ${f.code} ${f.kind}`);
      f.archived.forEach((a) =>
        add({ type: 'file', title: a.file, sub: `Archived · ${b.name} ${l.name} ${f.name} · ${a.label}`, route: pathOf.format(f) + '?focus=archive', status: 'archived', mono: true, weight: 2 }, `${b.code} ${l.code} ${a.covered.join(' ')} central europe ce`),
      );
    });
  });
});

ALL_ENTRIES.forEach((m) => {
  const art = artworkOf(m);
  const region = `${m.country.region} ${REGION_SHORT[m.country.region]}`;
  add(
    { type: 'entry', title: `${m.country.name} — ${m.brand.name} ${m.line.name} ${m.format.name}`, sub: `Market entry · ${m.country.region}${art.marketIds.length > 1 ? ' · shared ' + art.label : ''}`, route: pathOf.entry(m), weight: 5 },
    `${m.sku} ${m.country.code} ${region} ${m.country.langs.map((l) => LANGS[l]).join(' ')} ${m.brand.code} ${m.line.code} ${m.format.code} ${m.erp} ${art.ean}`,
  );
});
// artwork files: one result per version, routed through the first market that uses the artwork
BRANDS.forEach((b) =>
  b.lines.forEach((l) =>
    l.formats.forEach((f) =>
      Object.values(f.artworks).forEach((a) => {
        const m = f.markets.find((x) => x.id === a.marketIds[0])!;
        const names = a.marketIds.map((x) => COUNTRY[x].name).join(' & ');
        const region = `${m.country.region} ${REGION_SHORT[m.country.region]}`;
        a.versions.forEach((v) =>
          add(
            { type: 'file', title: v.file, sub: `${names} · ${b.name} ${l.name} ${f.name} · v${v.n}`, route: pathOf.version(m, v.n), status: v.status, mono: true, weight: v.status === 'approved' ? 4 : v.status === 'in_review' ? 3.5 : 1, superseded: v.status === 'superseded' },
            `${b.name} ${l.name} ${f.name} ${region} ${a.marketIds.join(' ')} ${v.summary}`,
          ),
        );
      }),
    ),
  ),
);
Object.values(DIELINES).forEach((d) => {
  const used = DIELINE_USAGE[d.id] || [];
  add({ type: 'dieline', title: d.id, sub: `${d.title} · rev ${d.rev} · used by ${used.length} market entr${used.length === 1 ? 'y' : 'ies'}`, route: `/dielines/${d.id}`, mono: true, weight: 2.6 + Math.min(used.length, 6) * 0.1 }, `${d.code} dieline ${d.shape} ${used.map((m) => `${m.brand.name} ${m.line.name}`).slice(0, 8).join(' ')}`);
});
Object.values(REG_BLOCKS).forEach((r) => {
  add({ type: 'regulatory', title: `${r.id}`, sub: `${LANGS[r.lang]} text · ${r.country.name} · ${r.brand.name} ${r.line.name} · rev ${r.rev}`, route: `/reg/${r.country.id}/${r.id}`, mono: true, weight: 3, status: r.status }, `${r.brand.name} ${r.line.name} ${LANGS[r.lang]} ingredients ingredient panel nutrition regulatory text ${r.country.name} ${r.text?.denomination || ''}`);
});
ASSETS.forEach((a) => add({ type: 'asset', title: a.name, sub: `Shared asset · ${a.kind === 'logos' ? 'Logo' : a.kind === 'legal' ? 'Legal mark' : 'Recycling icon'} · ${a.variant}`, route: `/assets/${a.kind}/${a.id}`, weight: 2.5, status: a.status }, a.usage));
GUIDES.forEach((g) => add({ type: 'guide', title: g.title, sub: `Team guideline · ${g.summary}`, route: `/guide/${g.id}`, weight: 3 }, 'guideline help'));

export function search(q: string, limit = 400): Result[] {
  const toks = words(q);
  if (!toks.length) return [];
  const out: { r: Result; s: number }[] = [];
  for (const r of INDEX) {
    let s = r.weight * 3;
    let ok = true;
    for (const t of toks) {
      let hit = false;
      for (const w of r.words) {
        if (w.startsWith(t)) { hit = true; break; }
      }
      if (!hit) { ok = false; break; }
      if (r.titleWords.some((w) => w.startsWith(t))) s += 2;
      if (r.titleWords.includes(t)) s += 1;
    }
    if (ok) out.push({ r, s });
  }
  out.sort((a, b) => b.s - a.s);
  return out.slice(0, limit).map((x) => x.r);
}
export const TYPE_LABEL: Record<ResultType, string> = {
  file: 'Artwork files', entry: 'Market entries', product: 'Brands & products', dieline: 'Dielines', regulatory: 'Regulatory text', asset: 'Shared assets', guide: 'Guidelines',
};
