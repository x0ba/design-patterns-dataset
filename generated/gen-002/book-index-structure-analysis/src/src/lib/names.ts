import type { EntryType } from '../data/types.ts';

export interface NameItem {
  id: number;
  heading: string;
  type: EntryType;
}

export interface NameLink {
  a: number;
  b: number;
  reason: string;
}

export interface NameCluster {
  id: string;
  members: number[];
  links: NameLink[];
}

const RIGS = /^(ship|bark|brig|schooner|whaleship|steamer|steam whaler)$/i;
const PLACE_SUFFIX = /,\s*(mass|n\.\s?y|conn|r\.\s?i|me|n\.\s?j|oahu|maui|hawaii|azores)\.?$/i;
const HONORIFIC = /\b(capt|captain|rev|dr|mrs|mr|hon)\.?\s+/gi;
const HONORIFIC_T = /\b(capt|captain|rev|dr|mrs|mr|hon)\.?\s+/i;
const GEN_SUFFIX = /\s(sr|jr|2d|3d)$/;

function splitQual(h: string): { base: string; qual: string | null } {
  const m = h.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { base: m[1], qual: m[2] } : { base: h, qual: null };
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function nameKey(h: string): string {
  const { base } = splitQual(h);
  let s = fold(base).replace(PLACE_SUFFIX, '');
  s = s.replace(HONORIFIC, '');
  s = s.replace(/[.,'’&-]/g, ' ').replace(/\band\b/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

function punctKey(h: string) {
  return fold(h).replace(/[^a-z0-9]/g, '');
}

function lev1(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1);
  if (la > lb) return a.slice(i + 1) === b.slice(i);
  return a.slice(i) === b.slice(i + 1);
}

function initialMatch(a: string, b: string): boolean {
  const ta = a.split(' ');
  const tb = b.split(' ');
  if (ta.length !== tb.length || ta.length < 2) return false;
  let diffs = 0;
  for (let i = 0; i < ta.length; i++) {
    if (ta[i] === tb[i]) continue;
    const [s, l] = ta[i].length <= tb[i].length ? [ta[i], tb[i]] : [tb[i], ta[i]];
    if (s.length === 1 && l.length > 1 && l[0] === s) diffs++;
    else return false;
  }
  return diffs === 1;
}

function classify(a: string, b: string, type: EntryType): string | null {
  const qa = splitQual(a);
  const qb = splitQual(b);
  if (qa.qual && qb.qual && qa.qual !== qb.qual) {
    if (type === 'ship' && RIGS.test(qa.qual) && RIGS.test(qb.qual)) return 'Vessel descriptor differs';
    return null; // deliberately disambiguated
  }
  if (punctKey(a) === punctKey(b)) return 'Punctuation differs';
  if (!!qa.qual !== !!qb.qual) return 'Qualifier on one form only';
  if (PLACE_SUFFIX.test(a) !== PLACE_SUFFIX.test(b)) return 'Place qualifier on one form only';
  if (HONORIFIC_T.test(a) || HONORIFIC_T.test(b)) return 'Title or rank in heading';
  return 'Punctuation differs';
}

export function findNameClusters(items: NameItem[]): NameCluster[] {
  const links: NameLink[] = [];
  const byType = new Map<EntryType, NameItem[]>();
  for (const it of items) {
    if (!byType.has(it.type)) byType.set(it.type, []);
    byType.get(it.type)!.push(it);
  }
  for (const [type, list] of byType) {
    const keyed = list.map((it) => ({ it, key: nameKey(it.heading) }));
    // 1. identical normalised keys
    const byKey = new Map<string, typeof keyed>();
    for (const k of keyed) {
      if (!byKey.has(k.key)) byKey.set(k.key, []);
      byKey.get(k.key)!.push(k);
    }
    for (const group of byKey.values()) {
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++) {
          const r = classify(group[i].it.heading, group[j].it.heading, type);
          if (r) links.push({ a: group[i].it.id, b: group[j].it.id, reason: r });
        }
    }
    // 2. generational suffix on one form only
    const bySuffixless = new Map<string, typeof keyed>();
    for (const k of keyed) {
      const s = k.key.replace(GEN_SUFFIX, '');
      if (!bySuffixless.has(s)) bySuffixless.set(s, []);
      bySuffixless.get(s)!.push(k);
    }
    for (const group of bySuffixless.values()) {
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++) {
          const sa = GEN_SUFFIX.test(group[i].key);
          const sb = GEN_SUFFIX.test(group[j].key);
          if (sa !== sb) links.push({ a: group[i].it.id, b: group[j].it.id, reason: 'Generational suffix on one form only' });
        }
    }
    // 3. near spellings and initials, bucketed by first two letters
    const buckets = new Map<string, typeof keyed>();
    for (const k of keyed) {
      const b = k.key.slice(0, 2);
      if (!buckets.has(b)) buckets.set(b, []);
      buckets.get(b)!.push(k);
    }
    for (const group of buckets.values()) {
      for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++) {
          const x = group[i];
          const y = group[j];
          if (x.key === y.key) continue;
          const qx = splitQual(x.it.heading).qual;
          const qy = splitQual(y.it.heading).qual;
          if (qx && qy && qx !== qy) continue;
          const digitsDiffer = x.key.replace(/\D/g, '') !== y.key.replace(/\D/g, '');
          const bothSuffixed = GEN_SUFFIX.test(x.key) && GEN_SUFFIX.test(y.key);
          if (!digitsDiffer && !bothSuffixed && Math.min(x.key.length, y.key.length) >= 5 && lev1(x.key, y.key)) {
            links.push({ a: x.it.id, b: y.it.id, reason: 'Spelling differs by one letter' });
          } else if (type === 'person' && initialMatch(x.key, y.key)) {
            links.push({ a: x.it.id, b: y.it.id, reason: 'Initial vs. full name' });
          }
        }
    }
  }
  // union-find into clusters
  const parent = new Map<number, number>();
  const find = (x: number): number => {
    while (parent.get(x) !== x) {
      const p = parent.get(x)!;
      parent.set(x, parent.get(p)!);
      x = p;
    }
    return x;
  };
  for (const l of links) {
    if (!parent.has(l.a)) parent.set(l.a, l.a);
    if (!parent.has(l.b)) parent.set(l.b, l.b);
    const ra = find(l.a);
    const rb = find(l.b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const clusters = new Map<number, NameCluster>();
  for (const l of links) {
    const r = find(l.a);
    if (!clusters.has(r)) clusters.set(r, { id: '', members: [], links: [] });
    const c = clusters.get(r)!;
    c.links.push(l);
    if (!c.members.includes(l.a)) c.members.push(l.a);
    if (!c.members.includes(l.b)) c.members.push(l.b);
  }
  return [...clusters.values()].map((c) => ({ ...c, id: 'n' + Math.min(...c.members) }));
}
