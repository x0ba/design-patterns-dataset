import { charFull } from './data';
import { forLabel } from './format';
import type { Story } from './types';

// Words a half-asleep parent might use for the same thing.
const SYN: string[][] = [
  ['scared', 'afraid', 'frightened', 'fear', 'fearful', 'nervous', 'worried', 'spooky'],
  ['dark', 'darkness', 'night-light'],
  ['thunder', 'thunderstorm', 'storm', 'lightning'],
  ['dragon', 'dragons'],
  ['lighthouse', 'lighthouses'],
  ['dog', 'pup', 'puppy'],
  ['robot', 'robots'],
];
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'with', 'who', 'was', 'were', 'in', 'on', 'for', 'one', 'that', 'it', 'is', 'to', 'at', 'about', 'story', 'stories', 'where', 'had', 'has', 'his', 'her', 'their', 'but', 'by']);

export interface ParsedQuery { groups: string[][]; raw: string[] }

export function parseQuery(q: string): ParsedQuery {
  const words = q.toLowerCase().replace(/[“”"',.;:!?()]/g, ' ').split(/\s+/).filter(Boolean).filter((w) => !STOP.has(w));
  const groups = words.map((w) => {
    const g = SYN.find((grp) => grp.some((s) => s === w || (w.length > 3 && s.startsWith(w))));
    return g ? Array.from(new Set([w, ...g])) : [w];
  });
  return { groups, raw: words };
}

const cache = new Map<string, { title: string; prompt: string; meta: string }>();
function fields(s: Story) {
  const key = s.id + '|' + s.title;
  let f = cache.get(key);
  if (!f) {
    f = {
      title: s.title.toLowerCase(),
      prompt: s.prompt.toLowerCase(),
      meta: [...s.characters.map(charFull), ...s.settings, forLabel(s.for), s.by, 'made by ' + s.by].join(' ').toLowerCase(),
    };
    cache.set(key, f);
  }
  return f;
}
const hit = (text: string, term: string) => {
  const i = text.indexOf(term);
  if (i < 0) return false;
  // match at a word start so "art" doesn't match "party"
  return i === 0 || /[^a-z0-9]/.test(text[i - 1]) || text.indexOf(' ' + term) >= 0;
};

/** Returns a relevance score, or 0 when any term is missing. */
export function score(s: Story, pq: ParsedQuery): number {
  if (!pq.groups.length) return 1;
  const f = fields(s);
  let total = 0;
  for (const g of pq.groups) {
    let best = 0;
    for (const t of g) {
      let sc = 0;
      if (hit(f.title, t)) sc = Math.max(sc, 3);
      if (hit(f.prompt, t)) sc = Math.max(sc, 3);
      if (hit(f.meta, t)) sc = Math.max(sc, 2);
      // exact (non-synonym) matches count more
      if (sc && t === g[0]) sc += 0.5;
      best = Math.max(best, sc);
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

export function highlightTerms(pq: ParsedQuery): string[] {
  return Array.from(new Set(pq.groups.flat())).sort((a, b) => b.length - a.length);
}

export function splitHighlight(text: string, terms: string[]): { t: string; hit: boolean }[] {
  if (!terms.length) return [{ t: text, hit: false }];
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![A-Za-z0-9])(${esc.join('|')})[a-z]*`, 'gi');
  const out: { t: string; hit: boolean }[] = [];
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), hit: false });
    out.push({ t: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), hit: false });
  return out;
}
