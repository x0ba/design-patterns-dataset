import { BUILDINGS } from '../data/campus';
import { DESTINATIONS, type Cat, type Destination } from '../data/destinations';

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

interface Indexed {
  d: Destination;
  name: string;
  aliases: string[];
  extra: string;
}

const INDEX: Indexed[] = DESTINATIONS.map((d) => ({
  d,
  name: norm(d.name),
  aliases: d.aliases.map(norm),
  extra: norm(`${BUILDINGS[d.b].name.en} level ${d.level} ${d.rooms}`),
}));

function wordStarts(hay: string, tok: string) {
  return hay.startsWith(tok) || hay.includes(' ' + tok);
}

export interface Hit {
  d: Destination;
  alias?: string; // alias that matched, when the name itself did not
  score: number;
}

export function searchDestinations(query: string, cat: Cat | 'all'): Hit[] {
  const q = norm(query);
  const pool = INDEX.filter((x) => cat === 'all' || x.d.cat === cat);
  if (!q) {
    return pool
      .map((x) => ({ d: x.d, score: 0 }))
      .sort((a, b) => a.d.name.localeCompare(b.d.name));
  }
  const toks = q.split(' ');
  const hits: Hit[] = [];
  for (const x of pool) {
    let total = 0;
    let aliasUsed: string | undefined;
    let ok = true;
    for (const t of toks) {
      let best = 0;
      if (wordStarts(x.name, t)) best = x.name.startsWith(t) ? 100 : 80;
      else if (x.name.includes(t)) best = 50;
      if (best < 80) {
        for (const a of x.aliases) {
          const s = wordStarts(a, t) ? (a.startsWith(t) ? 90 : 70) : a.includes(t) ? 40 : 0;
          if (s > best) {
            best = s;
            aliasUsed = a;
          }
        }
      }
      if (best === 0 && x.extra.includes(t)) best = 15;
      if (best === 0) {
        ok = false;
        break;
      }
      total += best;
    }
    if (!ok) continue;
    // whole-phrase alias match beats everything
    if (x.aliases.includes(q)) total += 200;
    if (x.name === q) total += 300;
    const aliasText = aliasUsed && !toks.every((t) => wordStarts(x.name, t) || x.name.includes(t)) ? x.d.aliases[x.aliases.indexOf(aliasUsed)] : undefined;
    hits.push({ d: x.d, alias: aliasText, score: total });
  }
  return hits.sort((a, b) => b.score - a.score || a.d.name.localeCompare(b.d.name));
}
