import { Doc, RepairLog, TYPE_LABEL, TYPE_ORDER, DocType, Scan } from '../data/types';
import { DOCS } from '../data/docs';
import { TRANSCRIBED, pageText } from '../data/manual';

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------
const ITEM_STOP = new Set(['or', 'and', 'the', 'a', 'an', 'model', 'models', 'no', 'nr', 'number', 'type', 'for', 'of', 'maybe', 'either', 'old']);

export interface ItemQuery {
  text: string[];
  models: string[];
  raw: string;
}

export const normModel = (s: string) => s.toLowerCase().replace(/[\s\-./]/g, '');

const isModelToken = (t: string) => /\d/.test(t) || /\?/.test(t);

export function parseItemQuery(raw: string): ItemQuery {
  const tokens = raw
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[\s,;/|+]+/)
    .map((t) => t.replace(/^[^\w?*]+|[^\w?*]+$/g, ''))
    .filter((t) => t && !ITEM_STOP.has(t));
  const text: string[] = [];
  const models: string[] = [];
  for (const t of tokens) (isModelToken(t) ? models : text).push(t);
  return { text, models, raw };
}

export const isEmptyQuery = (q: ItemQuery) => q.text.length === 0 && q.models.length === 0;

type ModelHit = 'exact' | 'wild' | 'partial' | null;

function modelRegex(token: string): RegExp | null {
  // ? = any one character; trailing x or * after digits = anything
  const t = normModel(token);
  if (!/[?*]/.test(t) && !/\dx+$/.test(t)) return null;
  const pattern = t
    .replace(/(\d)x+$/, '$1*')
    .split('')
    .map((c) => (c === '?' ? '.' : c === '*' ? '.*' : c.replace(/[.*+^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp('^' + pattern + '$');
}

export function matchModel(token: string, model: string): ModelHit {
  const m = normModel(model);
  const t = normModel(token);
  const rx = modelRegex(token);
  if (rx) return rx.test(m) ? 'wild' : null;
  if (m === t) return 'exact';
  if (t.length >= 3 && m.includes(t)) return 'partial';
  return null;
}

const stemVariants = (t: string) => {
  const v = [t];
  if (t.length > 4 && t.endsWith('es')) v.push(t.slice(0, -2));
  if (t.length > 3 && t.endsWith('s')) v.push(t.slice(0, -1));
  return v;
};

const textHas = (hay: string, token: string) => stemVariants(token).some((v) => hay.includes(v));

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
const PAGE_TEXT: Record<string, string> = {};
for (const [id, pages] of Object.entries(TRANSCRIBED)) PAGE_TEXT[id] = pages.map(pageText).join(' ').toLowerCase();

const DOC_HAY = new Map<string, string>(
  DOCS.map((d) => [
    d.id,
    [d.title, d.brand, d.family ?? '', d.product, d.category, d.models.join(' '), TYPE_LABEL[d.type], d.language, d.contributor]
      .join(' ')
      .toLowerCase(),
  ]),
);

export interface DocHit {
  doc: Doc;
  score: number;
  matchedModels: string[]; // the doc's own model strings that matched
  insideOnly: string[]; // text tokens found only inside transcribed pages
}

export function searchDocs(q: ItemQuery): DocHit[] {
  const out: DocHit[] = [];
  for (const doc of DOCS) {
    let score = 0;
    const matchedModels: string[] = [];
    const insideOnly: string[] = [];
    if (q.models.length) {
      let best = 0;
      for (const tok of q.models)
        for (const m of doc.models) {
          const hit = matchModel(tok, m);
          if (hit) {
            if (!matchedModels.includes(m)) matchedModels.push(m);
            best = Math.max(best, hit === 'exact' ? 100 : hit === 'wild' ? 80 : 40);
          }
        }
      if (!best) continue;
      score += best + Math.min(matchedModels.length, 2) * 5;
    }
    let ok = true;
    for (const tok of q.text) {
      if (textHas(DOC_HAY.get(doc.id)!, tok)) score += 10;
      else if (PAGE_TEXT[doc.id] && textHas(PAGE_TEXT[doc.id], tok)) {
        score += 4;
        insideOnly.push(tok);
      } else {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    out.push({ doc, score, matchedModels, insideOnly });
  }
  return out;
}

const SCAN_RANK: Record<Scan, number> = { good: 0, faded: 1, partial: 2 };

export function sortHits(hits: DocHit[], sort: SortKey): DocHit[] {
  const arr = hits.slice();
  if (sort === 'added') arr.sort((a, b) => b.doc.added.localeCompare(a.doc.added) || a.doc.title.localeCompare(b.doc.title));
  else if (sort === 'year') arr.sort((a, b) => b.doc.yearFrom - a.doc.yearFrom || a.doc.title.localeCompare(b.doc.title));
  else
    arr.sort(
      (a, b) =>
        b.score - a.score ||
        TYPE_ORDER.indexOf(a.doc.type) - TYPE_ORDER.indexOf(b.doc.type) ||
        SCAN_RANK[a.doc.scan] - SCAN_RANK[b.doc.scan] ||
        b.doc.added.localeCompare(a.doc.added),
    );
  return arr;
}

export type SortKey = 'best' | 'added' | 'year';

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------
export interface Filters {
  type: DocType[];
  category: string[];
  brand: string[];
  scan: Scan[];
  language: string[];
  decade: number[];
}

export const EMPTY_FILTERS: Filters = { type: [], category: [], brand: [], scan: [], language: [], decade: [] };

export type FacetKey = keyof Filters;

const facetValues = (d: Doc, key: FacetKey): (string | number)[] => {
  switch (key) {
    case 'type':
      return [d.type];
    case 'category':
      return [d.category];
    case 'brand':
      return [d.brand];
    case 'scan':
      return [d.scan];
    case 'language':
      return [d.language];
    case 'decade': {
      const out: number[] = [];
      for (let y = Math.floor(d.yearFrom / 10) * 10; y <= d.yearTo; y += 10) out.push(y);
      return out;
    }
  }
};

function passes(d: Doc, f: Filters, except?: FacetKey): boolean {
  for (const key of Object.keys(f) as FacetKey[]) {
    if (key === except) continue;
    const sel = f[key] as (string | number)[];
    if (!sel.length) continue;
    const vals = facetValues(d, key);
    if (!vals.some((v) => sel.includes(v))) return false;
  }
  return true;
}

export function applyFilters(hits: DocHit[], f: Filters): DocHit[] {
  return hits.filter((h) => passes(h.doc, f));
}

export function facetCounts(hits: DocHit[], f: Filters, key: FacetKey): Map<string | number, number> {
  const m = new Map<string | number, number>();
  for (const h of hits) {
    if (!passes(h.doc, f, key)) continue;
    for (const v of facetValues(h.doc, key)) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

export const activeFilterCount = (f: Filters) => Object.values(f).reduce((s, v) => s + v.length, 0);

// ---------------------------------------------------------------------------
// Near-miss model numbers (for hard-to-read labels)
// ---------------------------------------------------------------------------
const ALL_MODELS = (() => {
  const m = new Map<string, { label: string; brands: Set<string>; count: number }>();
  for (const d of DOCS)
    for (const mod of d.models) {
      const k = normModel(mod);
      const e = m.get(k) ?? { label: mod, brands: new Set<string>(), count: 0 };
      e.brands.add(d.brand);
      e.count++;
      m.set(k, e);
    }
  return m;
})();

export interface NearMiss {
  model: string;
  count: number;
  brand: string;
}

export function nearMisses(q: ItemQuery, hits: DocHit[]): NearMiss[] {
  const brandsInPlay = new Set(hits.filter((h) => h.matchedModels.length).map((h) => h.doc.brand));
  const typed = new Set(q.models.map(normModel));
  const out: NearMiss[] = [];
  for (const tok of q.models) {
    const t = normModel(tok);
    if (/[?*]/.test(t) || t.length < 3) continue;
    for (const [k, e] of ALL_MODELS) {
      if (k.length !== t.length || typed.has(k)) continue;
      let diff = 0;
      for (let i = 0; i < k.length && diff < 2; i++) if (k[i] !== t[i]) diff++;
      if (diff !== 1) continue;
      const brand = [...e.brands].find((b) => brandsInPlay.size === 0 || brandsInPlay.has(b));
      if (!brand) continue;
      if (!out.some((o) => normModel(o.model) === k)) out.push({ model: e.label, count: e.count, brand });
    }
  }
  return out.sort((a, b) => a.model.localeCompare(b.model)).slice(0, 5);
}

// ---------------------------------------------------------------------------
// Fault matching (repair logs + inside transcribed pages)
// ---------------------------------------------------------------------------
const CONCEPTS: Record<string, string[]> = {
  hum: ['hum', 'hums', 'humming', 'hummed', 'buzz', 'buzzes', 'buzzing', 'drone', 'droning'],
  turn: ['spin', 'spins', 'spinning', 'turn', 'turns', 'turning', 'rotate', 'rotates', 'rotating', 'start', 'starts', 'move', 'moves', 'moving', 'stall', 'stalls', 'stalled', 'run', 'runs', 'running', 'go', 'goes', 'stuck', 'seized', 'jammed'],
  power: ['poweron', 'dead', 'power', 'nothing', 'lifeless'],
  smell: ['smell', 'smells', 'smelled', 'smelt', 'burning', 'burnt', 'burn', 'smoke', 'smoking', 'hot', 'warm'],
  noise: ['noise', 'noisy', 'rattle', 'rattles', 'rattling', 'grinding', 'grind', 'squeal', 'squeals', 'squeaks', 'loud', 'clunk'],
  spark: ['spark', 'sparks', 'sparking', 'arcing'],
  heat: ['heat', 'heats', 'heating', 'cold'],
  leak: ['leak', 'leaks', 'leaking', 'drip', 'drips', 'dripping'],
  slow: ['slow', 'slowly', 'sluggish', 'weak'],
  speed: ['speed', 'speeds', 'setting', 'settings', 'dial'],
  cut: ['intermittent', 'intermittently', 'cuts', 'flickers', 'flicker', 'sometimes'],
};
const WORD_TO_CONCEPT = new Map<string, string>();
for (const [c, words] of Object.entries(CONCEPTS)) for (const w of words) WORD_TO_CONCEPT.set(w, c);

const FAULT_STOP = new Set(
  'but and or the a an it its it is will when at all any on of to with just does doesnt dont wont cant isnt not no then now that this when only after my she he they her his their was were has have had very really keeps keep still also bit there here works work'.split(
    ' ',
  ),
);

function faultWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\b(turns?|switch(?:es|ed)?|switch|power(?:s|ed)?)\s+on\b/g, ' poweron ')
    .replace(/\bturn(?:s|ed)?\s+off\b/g, ' poweroff ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export interface FaultQuery {
  concepts: string[]; // concept ids or "=word" literals
  raw: string;
}

export function parseFault(raw: string): FaultQuery {
  const concepts: string[] = [];
  for (const w of faultWords(raw)) {
    if (FAULT_STOP.has(w)) continue;
    const c = WORD_TO_CONCEPT.get(w) ?? (w.length > 2 ? '=' + w : null);
    if (c && !concepts.includes(c)) concepts.push(c);
  }
  return { concepts, raw };
}

function conceptsIn(text: string): Set<string> {
  const s = new Set<string>();
  for (const w of faultWords(text)) {
    const c = WORD_TO_CONCEPT.get(w);
    if (c) s.add(c);
    s.add('=' + w);
  }
  return s;
}

function literalHit(set: Set<string>, lit: string): boolean {
  if (set.has(lit)) return true;
  const stem = lit.slice(1, Math.max(5, lit.length - 2));
  for (const x of set) if (x.startsWith('=') && x.slice(1).startsWith(stem)) return true;
  return false;
}

export function faultScore(fq: FaultQuery, text: string): number {
  if (!fq.concepts.length) return 0;
  const set = conceptsIn(text);
  let hit = 0;
  for (const c of fq.concepts) if (c.startsWith('=') ? literalHit(set, c) : set.has(c)) hit++;
  return hit / fq.concepts.length;
}

/** Pages inside a transcribed document that talk about the fault. */
export function pagesMentioning(docId: string, fq: FaultQuery): number[] {
  const pages = TRANSCRIBED[docId];
  if (!pages || !fq.concepts.length) return [];
  return pages.filter((p) => faultScore(fq, pageText(p)) === 1).map((p) => p.n);
}

// ---------------------------------------------------------------------------
// Repair logs
// ---------------------------------------------------------------------------
const logHay = (l: RepairLog) => [l.item, l.brand, l.family ?? '', l.product, l.category].join(' ').toLowerCase();

export function logMatchesItem(l: RepairLog, q: ItemQuery, brandFilter: string[]): boolean {
  if (isEmptyQuery(q)) return brandFilter.length > 0 && brandFilter.includes(l.brand);
  if (q.models.length && !(l.model && q.models.some((t) => matchModel(t, l.model!)))) return false;
  const hay = logHay(l);
  return q.text.every((t) => textHas(hay, t));
}

export interface LogGroups {
  sameBoth: RepairLog[];
  sameItem: RepairLog[];
  sameFault: RepairLog[];
}

export function groupLogs(logs: RepairLog[], q: ItemQuery, fq: FaultQuery, brandFilter: string[]): LogGroups {
  const g: LogGroups = { sameBoth: [], sameItem: [], sameFault: [] };
  const hasFault = fq.concepts.length > 0;
  for (const l of logs) {
    const item = logMatchesItem(l, q, brandFilter);
    const fs = hasFault ? faultScore(fq, l.fault + ' ' + l.notes) : 0;
    const faultInFaultField = hasFault ? faultScore(fq, l.fault) : 0;
    const same = hasFault && (faultInFaultField === 1 || fs === 1);
    if (item && same) g.sameBoth.push(l);
    else if (item) g.sameItem.push(l);
    else if (same && faultInFaultField === 1) g.sameFault.push(l);
  }
  const rank: Record<string, number> = { fixed: 0, partly: 1, not: 2 };
  g.sameBoth.sort((a, b) => rank[a.outcome] - rank[b.outcome] || b.date.localeCompare(a.date));
  return g;
}

/** Logs that concern the given document's models. */
export function logsForDoc(logs: RepairLog[], doc: Doc): RepairLog[] {
  const ms = doc.models.map(normModel);
  return logs.filter((l) => l.brand === doc.brand && l.model && ms.includes(normModel(l.model)));
}
