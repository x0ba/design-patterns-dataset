import { BOOK, CHAPTERS, notesChapterOf } from '../data/book.ts';
import type { Entry, EntryType, Loc } from '../data/types.ts';
import { CHAPTER_PHRASES } from '../data/words.ts';
import { allLocs, locCount, locKey } from './locators.ts';
import { findNameClusters, type NameCluster } from './names.ts';

export const LONG_THRESHOLD = 7;

export interface PageRef {
  id: number;
  sub: string | null;
}

export interface ChapterStat {
  num: number;
  title: string;
  start: number;
  end: number;
  pages: number;
  locs: number;
  perPage: number;
  entries: number;
  types: Record<EntryType, number>;
}

export interface Analysis {
  byId: Map<number, Entry>;
  byHeading: Map<string, Entry>;
  coverage: number[]; // references touching each page
  starts: number[]; // locators starting on each page
  pageRefs: PageRef[][];
  chapters: ChapterStat[];
  notes: { locs: number; perPage: number; cite: number };
  median: number;
  bookTypes: Record<EntryType, number>;
  entryChapters: Map<number, Map<number, number>>; // entry -> chapter -> locs
  long: Entry[];
  clusters: NameCluster[];
  xrefs: XRef[];
  totals: { main: number; subs: number; locs: number; xrefs: number };
}

export function chapterForLoc(l: Loc): number {
  if (l.p > BOOK.textEnd) return notesChapterOf(l.p);
  for (const c of CHAPTERS) if (l.p >= c.start && l.p <= c.end) return c.num;
  return 14;
}

export function analyse(entries: Entry[]): Analysis {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const byHeading = new Map(entries.map((e) => [e.heading, e]));
  const coverage = new Array(BOOK.totalPages + 1).fill(0);
  const starts = new Array(BOOK.totalPages + 1).fill(0);
  const pageRefs: PageRef[][] = Array.from({ length: BOOK.totalPages + 1 }, () => []);
  const entryChapters = new Map<number, Map<number, number>>();
  const zeroTypes = (): Record<EntryType, number> => ({ person: 0, place: 0, ship: 0, concept: 0 });
  const chTypes = CHAPTERS.map(() => zeroTypes());
  const chEntries = CHAPTERS.map(() => new Set<number>());
  const bookTypes = zeroTypes();
  let noteLocs = 0;
  let cite = 0;

  const touch = (e: Entry, l: Loc, sub: string | null) => {
    starts[l.p]++;
    const end = l.e ?? l.p;
    for (let p = l.p; p <= end; p++) {
      coverage[p]++;
      pageRefs[p].push({ id: e.id, sub });
    }
    if (l.p > BOOK.textEnd) {
      noteLocs++;
      if (l.cite) cite++;
      return;
    }
    const ch = chapterForLoc(l);
    chTypes[ch - 1][e.type]++;
    chEntries[ch - 1].add(e.id);
    bookTypes[e.type]++;
    let m = entryChapters.get(e.id);
    if (!m) entryChapters.set(e.id, (m = new Map()));
    m.set(ch, (m.get(ch) ?? 0) + 1);
  };
  for (const e of entries) {
    for (const l of e.direct) touch(e, l, null);
    for (const s of e.subs) for (const l of s.locs) touch(e, l, s.heading);
  }

  const chapters: ChapterStat[] = CHAPTERS.map((c, i) => {
    let locs = 0;
    for (let p = c.start; p <= c.end; p++) locs += starts[p];
    const pages = c.end - c.start + 1;
    return { num: c.num, title: c.title, start: c.start, end: c.end, pages, locs, perPage: locs / pages, entries: chEntries[i].size, types: chTypes[i] };
  });
  const sorted = chapters.map((c) => c.perPage).sort((a, b) => a - b);
  const median = (sorted[6] + sorted[7]) / 2;
  const notesPages = BOOK.notes.end - BOOK.notes.start + 1;

  const long = entries.filter((e) => e.direct.length > LONG_THRESHOLD).sort((a, b) => b.direct.length - a.direct.length);
  const clusters = findNameClusters(
    entries.filter((e) => e.see.length === 0 || e.direct.length > 0).map((e) => ({ id: e.id, heading: e.heading, type: e.type })),
  ).sort((a, b) => {
    const ca = Math.max(...a.members.map((m) => locCount(byId.get(m)!)));
    const cb = Math.max(...b.members.map((m) => locCount(byId.get(m)!)));
    return cb - ca;
  });
  const xrefs = checkXrefs(entries);

  return {
    byId, byHeading, coverage, starts, pageRefs, chapters,
    notes: { locs: noteLocs, perPage: noteLocs / notesPages, cite },
    median, bookTypes, entryChapters, long, clusters, xrefs,
    totals: {
      main: entries.length,
      subs: entries.reduce((a, e) => a + e.subs.length, 0),
      locs: entries.reduce((a, e) => a + locCount(e), 0),
      xrefs: xrefs.length,
    },
  };
}

// ---------------- cross-references ----------------

export type XStatus = 'ok' | 'missing' | 'loop';
export interface XRef {
  id: string;
  from: number;
  kind: 'see' | 'seeAlso';
  target: string;
  status: XStatus;
  detail?: string;
}

function targetExists(target: string, byHeading: Map<string, Entry>): boolean {
  const [h, sub] = target.split(': ');
  const e = byHeading.get(h);
  if (!e) return false;
  if (sub) return e.subs.some((s) => s.heading === sub);
  return true;
}

export function checkXrefs(entries: Entry[]): XRef[] {
  const byHeading = new Map(entries.map((e) => [e.heading, e]));
  const out: XRef[] = [];
  for (const e of entries) {
    for (const t of e.see) {
      let status: XStatus = targetExists(t, byHeading) ? 'ok' : 'missing';
      let detail: string | undefined;
      if (status === 'ok') {
        // follow See chain
        const chain = [e.heading];
        let cur = byHeading.get(t.split(': ')[0]);
        while (cur && cur.see.length === 1 && !chain.includes(cur.heading)) {
          chain.push(cur.heading);
          cur = byHeading.get(cur.see[0].split(': ')[0]);
        }
        if (cur && chain.includes(cur.heading)) {
          status = 'loop';
          detail = [...chain, cur.heading].join(' → ');
        }
      }
      out.push({ id: `${e.id}|see|${t}`, from: e.id, kind: 'see', target: t, status, detail });
    }
    for (const t of e.seeAlso) {
      out.push({ id: `${e.id}|seeAlso|${t}`, from: e.id, kind: 'seeAlso', target: t, status: targetExists(t, byHeading) ? 'ok' : 'missing' });
    }
  }
  return out;
}

const STOP = new Set(['the', 'of', 'and', 'in', 'a', 'as', 'to', 'for', 'on', 'at']);
function tokens(s: string): string[] {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => t.replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1'));
}

export function suggestTargets(target: string, entries: Entry[], n = 4): { entry: Entry; score: number }[] {
  const tt = tokens(target);
  const scored: { entry: Entry; score: number }[] = [];
  for (const e of entries) {
    if (e.see.length && !e.direct.length) continue;
    const et = tokens(e.heading);
    if (!et.length) continue;
    let hit = 0;
    for (const t of tt) if (et.some((x) => x === t || (t.length > 4 && x.length > 4 && (x.startsWith(t.slice(0, 5)) || t.startsWith(x.slice(0, 5)))))) hit++;
    if (!hit) continue;
    const score = hit / Math.max(tt.length, et.length) + Math.min(locCount(e), 40) / 400;
    scored.push({ entry: e, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, n);
}

// ---------------- splitting ----------------

export interface SplitGroup {
  key: string;
  heading: string;
  locs: string[]; // locKeys
}
export interface SplitPlan {
  groups: SplitGroup[];
  general: string[];
}

const CUSTOM: Record<string, Record<number, string>> = {
  'whale oil': {
    1: 'colonial trade in', 2: 'colonial trade in', 3: 'refining and adulteration of', 4: 'wartime shortages of',
    5: 'prices of, 1815–58', 6: 'prices of, 1815–58', 7: 'shipboard processing of', 8: 'shipboard processing of',
    9: 'household use of', 10: 'lighthouse contracts for', 11: 'and baleen, relative value of', 12: 'and petroleum competition',
    13: 'and petroleum competition', 14: 'in museums and memory',
  },
  spermaceti: { 2: 'early trade in', 3: 'candle manufacture from', 4: 'export of, to Britain', 5: 'refining of', 12: 'displaced by paraffin' },
  'Society of Friends': { 1: 'on Long Island', 2: 'on Nantucket', 3: 'and candle trade', 4: 'pacifism of, in Revolution', 5: 'in New Bedford', 9: 'women ministers of' },
  'Rotch, William, Sr.': { 2: 'Nantucket trade of', 3: 'London ventures of', 4: 'and Revolution', 5: 'removal to New Bedford', 9: 'household of' },
  'whaling, sperm': { 2: 'Nantucket origins of', 3: 'and candle market', 5: 'New Bedford fleet in', 8: 'Pacific grounds of', 11: 'decline of, after 1850' },
  'lay (share system)': { 6: 'calculation of', 7: 'for foreign crews', 9: 'and family debts' },
  outfitters: { 5: 'in New Bedford', 6: 'credit terms of', 7: 'and crew advances' },
  desertion: { 7: 'and recruitment', 8: 'at Pacific ports', 11: 'in Arctic' },
};

function phraseFor(e: Entry, ch: number): string {
  const opts = CHAPTER_PHRASES[ch] ?? ['general'];
  for (const o of opts) if (!o.toLowerCase().includes(e.heading.split(/[ ,(]/)[0].toLowerCase())) return o;
  return opts[0];
}

export function suggestSplit(e: Entry): SplitPlan {
  const custom = CUSTOM[e.heading];
  const byPhrase = new Map<string, string[]>();
  const order: string[] = [];
  for (const l of e.direct) {
    const ch = chapterForLoc(l);
    const h = custom ? custom[ch] : phraseFor(e, ch);
    const key = h ?? '__general';
    if (!byPhrase.has(key)) {
      byPhrase.set(key, []);
      order.push(key);
    }
    byPhrase.get(key)!.push(locKey(l));
  }
  const groups: SplitGroup[] = [];
  const general: string[] = [];
  for (const k of order) {
    const ls = byPhrase.get(k)!;
    if (k === '__general' || ls.length < 2) general.push(...ls);
    else if (!custom && ls.length > 6) {
      // one chapter dominates: break it by page sequence using the chapter's other topics
      const ch = chapterForLoc(e.direct.find((l) => locKey(l) === ls[0])!);
      const opts = (CHAPTER_PHRASES[ch] ?? [k]).filter((o) => !o.toLowerCase().includes(e.heading.split(/[ ,(]/)[0].toLowerCase()));
      const parts = Math.min(opts.length, Math.ceil(ls.length / 4));
      const size = Math.ceil(ls.length / parts);
      for (let i = 0; i < parts; i++) {
        const chunk = ls.slice(i * size, (i + 1) * size);
        if (chunk.length < 2) general.push(...chunk);
        else groups.push({ key: 'g' + groups.length, heading: opts[i], locs: chunk });
      }
    } else groups.push({ key: 'g' + groups.length, heading: k, locs: ls });
  }
  return { groups, general };
}

export function locMap(e: Entry): Map<string, Loc> {
  return new Map(e.direct.map((l) => [locKey(l), l]));
}

export function spreadByChapter(e: Entry, locs?: Loc[]): number[] {
  const out = new Array(15).fill(0);
  for (const l of locs ?? allLocs(e)) out[chapterForLoc(l)]++;
  return out;
}
