import type { Entry, Loc } from '../data/types.ts';

/** Chicago Manual of Style abbreviation of inclusive numbers (CMOS 9.61). */
export function formatRange(a: number, b: number): string {
  if (a < 100 || a % 100 === 0) return `${a}–${b}`;
  const as = String(a);
  const bs = String(b);
  if (as.length !== bs.length) return `${a}–${b}`;
  const r = a % 100;
  if (r >= 1 && r <= 9) {
    // changed part only
    let i = 0;
    while (i < as.length && as[i] === bs[i]) i++;
    return `${a}–${bs.slice(i) || bs.slice(-1)}`;
  }
  // two digits or more, as needed
  let i = 0;
  while (i < as.length - 2 && as[i] === bs[i]) i++;
  return `${a}–${bs.slice(i)}`;
}

export function formatLoc(l: Loc): string {
  if (l.n != null) return `${l.p}n${l.n}`;
  if (l.e != null && l.e > l.p) return formatRange(l.p, l.e);
  return String(l.p);
}

export function sortLocs(locs: Loc[]): Loc[] {
  return [...locs].sort((x, y) => x.p - y.p || (x.n ?? 0) - (y.n ?? 0));
}

export function formatLocs(locs: Loc[]): string {
  return sortLocs(locs).map(formatLoc).join(', ');
}

export function locKey(l: Loc): string {
  return l.n != null ? `${l.p}n${l.n}` : `${l.p}-${l.e ?? l.p}`;
}

export function dedupeLocs(locs: Loc[]): Loc[] {
  const seen = new Set<string>();
  const out: Loc[] = [];
  for (const l of sortLocs(locs)) {
    const k = locKey(l);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return out;
}

export function allLocs(e: Entry): Loc[] {
  const out = [...e.direct];
  for (const s of e.subs) out.push(...s.locs);
  return out;
}

export function locCount(e: Entry): number {
  let n = e.direct.length;
  for (const s of e.subs) n += s.locs.length;
  return n;
}

const LEADING = /^(a|an|the|and|as|at|by|for|from|in|of|on|to|with|during|among|under)\s+/i;

export function subSortKey(h: string): string {
  return h.replace(LEADING, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N} ]/gu, '').toLowerCase();
}

export function headingSortKey(h: string): string {
  const s = h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cut = s.search(/[,(:]/);
  const head = (cut >= 0 ? s.slice(0, cut) : s).replace(/[^a-z0-9]/g, '');
  const rest = cut >= 0 ? s.slice(cut).replace(/[^a-z0-9 ]/g, '') : '';
  return head + '\u0001' + rest;
}

export const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function sortSubs<T extends { heading: string }>(subs: T[]): T[] {
  return [...subs].sort((a, b) => cmp(subSortKey(a.heading), subSortKey(b.heading)));
}
