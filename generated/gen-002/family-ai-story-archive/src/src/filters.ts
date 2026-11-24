import { parseQuery, score } from './search';
import { monthKey } from './format';
import type { Kid, Maker, Story } from './types';

export interface Filters {
  q: string;
  kids: Kid[];
  makers: Maker[];
  chars: string[];
  settings: string[];
  from: string; // YYYY-MM or ''
  to: string;
  minIllus: number; // 0 = any
  lengths: ('short' | 'medium' | 'long')[];
  ages: number[];
  heartOnly: boolean;
  versionsOnly: boolean;
}
export const EMPTY: Filters = { q: '', kids: [], makers: [], chars: [], settings: [], from: '', to: '', minIllus: 0, lengths: [], ages: [], heartOnly: false, versionsOnly: false };
export type FacetKey = keyof Filters;

export const lengthOf = (s: Story): 'short' | 'medium' | 'long' => (s.wordCount < 550 ? 'short' : s.wordCount <= 900 ? 'medium' : 'long');

export function matches(s: Story, f: Filters, skip?: FacetKey, pqIn?: ReturnType<typeof parseQuery>): boolean {
  if (skip !== 'q' && f.q) { if (!score(s, pqIn ?? parseQuery(f.q))) return false; }
  if (skip !== 'kids' && f.kids.length && !f.kids.includes(s.for)) return false;
  if (skip !== 'makers' && f.makers.length && !f.makers.includes(s.by)) return false;
  if (skip !== 'chars' && f.chars.length && !f.chars.every((c) => s.characters.includes(c))) return false;
  if (skip !== 'settings' && f.settings.length && !f.settings.every((c) => s.settings.includes(c))) return false;
  if (skip !== 'from' && f.from && monthKey(s) < f.from) return false;
  if (skip !== 'to' && f.to && monthKey(s) > f.to) return false;
  if (skip !== 'minIllus' && f.minIllus && s.illustrations < f.minIllus) return false;
  if (skip !== 'lengths' && f.lengths.length && !f.lengths.includes(lengthOf(s))) return false;
  if (skip !== 'ages' && f.ages.length && !f.ages.includes(s.readingAge)) return false;
  if (skip !== 'heartOnly' && f.heartOnly && !s.favoriteBy) return false;
  if (skip !== 'versionsOnly' && f.versionsOnly && s.versions.length < 2) return false;
  return true;
}

export function filterStories(stories: Story[], f: Filters): Story[] {
  const pq = parseQuery(f.q);
  return stories.filter((s) => matches(s, f, undefined, pq));
}

export type Sort = 'newest' | 'oldest' | 'match' | 'read' | 'long' | 'art';
export const SORTS: { id: Sort; label: string }[] = [
  { id: 'match', label: 'Best match' },
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'read', label: 'Most read aloud' },
  { id: 'art', label: 'Most illustrated' },
  { id: 'long', label: 'Longest' },
];

export function sortStories(list: Story[], sort: Sort, q: string): Story[] {
  const pq = parseQuery(q);
  const byNew = (a: Story, b: Story) => (a.createdAt < b.createdAt ? 1 : -1);
  const arr = list.slice();
  switch (sort) {
    case 'oldest': return arr.sort((a, b) => -byNew(a, b));
    case 'read': return arr.sort((a, b) => b.readAloud - a.readAloud || byNew(a, b));
    case 'art': return arr.sort((a, b) => b.illustrations - a.illustrations || byNew(a, b));
    case 'long': return arr.sort((a, b) => b.wordCount - a.wordCount || byNew(a, b));
    case 'match': {
      const sc = new Map(arr.map((s) => [s.id, score(s, pq)]));
      return arr.sort((a, b) => sc.get(b.id)! - sc.get(a.id)! || byNew(a, b));
    }
    default: return arr.sort(byNew);
  }
}

export const activeCount = (f: Filters) =>
  (f.q ? 1 : 0) + f.kids.length + f.makers.length + f.chars.length + f.settings.length + (f.from ? 1 : 0) + (f.to ? 1 : 0) +
  (f.minIllus ? 1 : 0) + f.lengths.length + f.ages.length + (f.heartOnly ? 1 : 0) + (f.versionsOnly ? 1 : 0);
