import { CHAPTERS, NOTES_BLOCKS } from './book.ts';
import type { Entry, EntryType, IndexData, Loc } from './types.ts';
import {
  BROKEN_SEE_ALSO, CHAPTER_PHRASES, CONCEPTS, FIRST_F, FIRST_M, MAJOR_PORTS, NOTABLE_PEOPLE, PLACES, RIGS, SEE_ENTRIES,
  SHIP_ADJ, SHIP_NOUN, SHIP_SINGLE, STREETS, STREET_PORTS, SUB_CONCEPT, SUB_PERSON, SUB_PERSON_F, SUB_PLACE, SUB_SHIP, SURNAMES,
} from './words.ts';
import { findNameClusters } from '../lib/names.ts';
import { cmp, formatRange, headingSortKey, locCount, sortLocs, sortSubs, subSortKey } from '../lib/locators.ts';

export const TARGETS = { main: 3840, subs: 9215, locs: 21470, xrefs: 412, long: 96 };

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Proto {
  heading: string;
  type: EntryType;
  focus: number[];
  gen: boolean;
  see?: string[];
}

// Relative indexing weight by chapter (index 1..14) and type. Chapter 9 is thin.
const CH_JITTER = [0, 1.0, 1.04, 0.97, 1.06, 1.12, 1.0, 1.08, 1.03, 1, 0.96, 1.02, 0.93, 1.0, 0.94];
const KEEP9: Record<EntryType, number> = { person: 0.47, place: 0.72, ship: 0.64, concept: 0.85 };
const TYPE_PREF: Record<EntryType, number[]> = {
  person: [0, 1.05, 1.2, 1.15, 1.0, 1.0, 1.05, 1.1, 0.9, 1, 1.1, 1.0, 1.3, 1.0, 1.0],
  place: [0, 1.1, 1.0, 1.0, 0.9, 0.95, 0.8, 0.95, 1.2, 1, 1.2, 1.15, 1.2, 1.05, 1.05],
  ship: [0, 0.3, 0.8, 0.8, 0.9, 1.1, 1.1, 0.9, 1.2, 1, 1.0, 1.4, 1.1, 1.5, 0.9],
  concept: [0, 1.05, 1.0, 1.1, 1.0, 0.9, 1.0, 0.95, 1.0, 1, 1.0, 1.05, 1.4, 1.05, 1.05],
};

const CH_YEARS: [number, number][] = [
  [0, 0], [1650, 1718], [1712, 1774], [1740, 1790], [1775, 1814], [1815, 1849], [1820, 1858], [1820, 1868],
  [1820, 1858], [1830, 1868], [1820, 1858], [1848, 1879], [1859, 1870], [1861, 1871], [1880, 1924],
];

const PACIFIC = new Set('Hawaii|Honolulu|Honolulu, Oahu|Lahaina|Lahaina, Maui|Oahu|Maui|Kauai|Hilo|Kealakekua Bay|Tahiti|Papeete|Marquesas Islands|Nuku Hiva|Society Islands|Tonga|Fiji|Samoa|Guam|Pohnpei|Kosrae|Bonin Islands|Japan|Hakodate|Galápagos Islands|Charles Island|Albemarle Island|Paita|Tumbes|Callao|Lima|Valparaíso|Talcahuano|Talcahuana|Coquimbo|Juan Fernández Islands|Mocha Island|Chiloé|Bay of Islands|Kororareka|Russell (N.Z.)|Auckland|Hobart|Sydney|Norfolk Island|New Zealand|Chatham Islands|Mazatlán|Magdalena Bay|San Diego|Monterey|Baja California|Mexico|Peru|Chile|Ecuador|Japan Ground|Offshore Ground|On-Shore Ground|Line, the'.split('|'));
const ARCTIC = new Set('Sea of Okhotsk|Kamchatka|Petropavlovsk|Bering Strait|Point Barrow|Herschel Island|Plover Bay|Alaska|Sitka|Unalaska|Kodiak Island|Kodiak Ground|San Francisco|Davis Strait|Greenland|Cumberland Sound|Hudson Bay'.split('|'));
const ATLANTIC = new Set('Azores|Fayal (Azores)|Faial|Pico|Flores|São Miguel|Terceira|Horta|Cape Verde Islands|Brava|Fogo|São Nicolau|Santo Antão|Madeira|Canary Islands|St. Helena|Ascension Island|Tristan da Cunha|Falkland Islands|Bermuda|Barbados|Dominica|Bahamas|Brazil Banks|Rio de Janeiro|Santa Catarina|Pernambuco|Montevideo|Buenos Aires|Patagonia|Cape Horn|Strait of Magellan|Delagoa Bay|Walvis Bay|Mozambique Channel|Zanzibar|Seychelles|Mauritius|Madagascar|Kerguelen Islands|Crozet Islands|Heard Island'.split('|'));
const EUROPE = new Set('London|Liverpool|Hull|Whitby|Dundee|Peterhead|Aberdeen|Le Havre|Dunkirk|Bordeaux|Amsterdam|Bremen|Hamburg|Lisbon|Milford Haven|Halifax|Newfoundland|Labrador'.split('|'));
const LONGISLAND = new Set('Sag Harbor|Sag Harbor, N.Y.|Cold Spring Harbor|Southampton|East Hampton|Greenport|Montauk|Shinnecock Bay|Long Island|Montauk Point|Shelter Island|Orient Point|Gardiners Island|New London|Stonington|Mystic|Groton|Norwich|New Haven|Bridgeport|Fishers Island|Watch Hill|Hudson|Poughkeepsie'.split('|'));
const NANTUCKET = new Set('Nantucket|Siasconset|Madaket|Brant Point|Nantucket Bar|Straight Wharf|Old North Wharf|Commercial Wharf|Steamboat Wharf|Muskeget|Tuckernuck|Great Point|Sankaty Head|Edgartown|Vineyard Haven|Tisbury|Chilmark|Aquinnah|Martha\'s Vineyard|Gay Head Light'.split('|'));

function placeFocus(name: string, rnd: () => number): number[] {
  if (PACIFIC.has(name)) return [8, rnd() < 0.5 ? 11 : 7];
  if (ARCTIC.has(name)) return [11, 13];
  if (ATLANTIC.has(name)) return [7, rnd() < 0.5 ? 8 : 10];
  if (EUROPE.has(name)) return [3, 4];
  if (LONGISLAND.has(name)) return [10, 1];
  if (NANTUCKET.has(name)) return [2, rnd() < 0.5 ? 9 : 4];
  return [5, rnd() < 0.5 ? 6 : 10];
}

export function generateIndex(seed = 1871): IndexData {
  const rnd = mulberry32(seed);
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const wpick = (weights: number[]): number => {
    let t = 0;
    for (const w of weights) t += w;
    let r = rnd() * t;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };

  // ---------- page weights ----------
  const pageW: number[] = new Array(613).fill(0);
  for (const c of CHAPTERS) {
    for (let p = c.start; p <= c.end; p++) pageW[p] = 0.45 + rnd() * 1.1;
    pageW[c.start] = 0.25; // chapter opening page
    // two illustration or map pages per chapter
    pageW[ri(c.start + 3, c.end - 2)] = 0.05;
    pageW[ri(c.start + 3, c.end - 2)] = 0.08;
  }
  for (let p = 318; p <= 323; p++) pageW[p] = 0.07; // long thin run in ch. 9
  pageW[331] = 0.1;
  const chPages = (ch: number) => {
    const c = CHAPTERS[ch - 1];
    const ps: number[] = [];
    const ws: number[] = [];
    for (let p = c.start; p <= c.end; p++) {
      ps.push(p);
      ws.push(pageW[p]);
    }
    return { ps, ws };
  };
  const CH_PAGES = [null, ...CHAPTERS.map((c) => chPages(c.num))] as { ps: number[]; ws: number[] }[];
  const chWeights = (type: EntryType, exclude9 = false) =>
    CHAPTERS.map((c) => {
      if (exclude9 && c.num === 9) return 0;
      return (c.end - c.start + 1) * CH_JITTER[c.num] * TYPE_PREF[type][c.num];
    });

  // ---------- headings ----------
  const protos: Proto[] = [];
  const used = new Set<string>();
  const add = (p: Proto) => {
    if (used.has(p.heading)) return false;
    used.add(p.heading);
    protos.push(p);
    return true;
  };
  const seeTargetsType = (t: string): EntryType => {
    const h = t.split(':')[0];
    if (PLACES.includes(h)) return 'place';
    return 'concept';
  };
  for (const [h, f] of CONCEPTS) add({ heading: h, type: 'concept', focus: f, gen: false });
  for (const [h, t] of SEE_ENTRIES) if (!used.has(h)) add({ heading: h, type: seeTargetsType(t[0]), focus: [], gen: false, see: t });
  for (const h of PLACES) add({ heading: h, type: 'place', focus: placeFocus(h, rnd), gen: false });
  for (const [h, f] of NOTABLE_PEOPLE) add({ heading: h, type: 'person', focus: f, gen: false });
  add({ heading: 'Charles W. Morgan (whaleship)', type: 'ship', focus: [5, 6, 14], gen: false });
  add({ heading: 'Charles W. Morgan (ship)', type: 'ship', focus: [14], gen: false });
  add({ heading: 'Essex (ship)', type: 'ship', focus: [8, 2], gen: false });
  add({ heading: 'Globe (ship)', type: 'ship', focus: [8, 7], gen: false });

  const genFocus = (type: EntryType) => {
    const n = rnd() < 0.5 ? 1 : rnd() < 0.7 ? 2 : 3;
    const f: number[] = [];
    const w = chWeights(type);
    while (f.length < n) {
      const c = wpick(w) + 1;
      if (!f.includes(c)) f.push(c);
    }
    return f;
  };

  // generated places: wharves and streets
  const wharfNames = [...SURNAMES];
  for (let i = wharfNames.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [wharfNames[i], wharfNames[j]] = [wharfNames[j], wharfNames[i]];
  }
  let placeCount = protos.filter((p) => p.type === 'place').length;
  const PLACE_TARGET = 640;
  for (const s of wharfNames) {
    if (placeCount >= PLACE_TARGET - 90) break;
    const port = pick(STREET_PORTS);
    if (add({ heading: `${s}'s Wharf (${port})`, type: 'place', focus: placeFocus(port, rnd), gen: true })) placeCount++;
  }
  for (const st of STREETS) {
    for (const port of STREET_PORTS.slice(0, 2)) {
      if (placeCount >= PLACE_TARGET) break;
      if (add({ heading: `${st} Street (${port})`, type: 'place', focus: placeFocus(port, rnd), gen: true })) placeCount++;
    }
  }

  // ships
  const SHIP_TARGET = 815;
  const shipNames = new Set<string>(['Charles W. Morgan', 'Essex', 'Globe']);
  const genShip = (): string => {
    for (;;) {
      const r = rnd();
      let name: string;
      if (r < 0.35) name = pick(SHIP_SINGLE);
      else if (r < 0.55) name = `${pick(SHIP_ADJ)} ${pick(SHIP_NOUN)}`;
      else name = `${pick(rnd() < 0.5 ? FIRST_M : FIRST_F)} ${pick(SURNAMES)}`;
      if (shipNames.has(name)) continue;
      shipNames.add(name);
      return `${name} (${pick(RIGS)})`;
    }
  };
  let shipCount = protos.filter((p) => p.type === 'ship').length;
  while (shipCount < SHIP_TARGET) {
    if (add({ heading: genShip(), type: 'ship', focus: genFocus('ship'), gen: true })) shipCount++;
  }

  // people fill the remainder
  const genPerson = () => `${pick(SURNAMES)}, ${rnd() < 0.72 ? pick(FIRST_M) : pick(FIRST_F)}`;
  while (protos.length < TARGETS.main) add({ heading: genPerson(), type: 'person', focus: genFocus('person'), gen: true });

  // re-roll generated headings that look like variants of one another
  for (let pass = 0; pass < 12; pass++) {
    const clusters = findNameClusters(protos.filter((p) => !p.see).map((p, i) => ({ id: i, heading: p.heading, type: p.type })));
    const nonSee = protos.filter((p) => !p.see);
    const bad = new Set<Proto>();
    for (const c of clusters) for (const m of c.members) if (nonSee[m].gen) bad.add(nonSee[m]);
    if (bad.size === 0) break;
    for (const b of bad) {
      used.delete(b.heading);
      for (;;) {
        const h = b.type === 'person' ? genPerson() : b.type === 'ship' ? genShip() : `${pick(SURNAMES)}'s Wharf (${pick(STREET_PORTS)})`;
        if (used.has(h)) continue;
        used.add(h);
        b.heading = h;
        break;
      }
    }
  }

  protos.sort((a, b) => cmp(headingSortKey(a.heading), headingSortKey(b.heading)));

  // ---------- locators ----------
  const notePage = (ch: number): Loc => {
    const b = NOTES_BLOCKS[ch - 1];
    const p = ri(b.start, b.end);
    // ~14 notes per page; numbering restarts each chapter
    const n = (p - b.start) * 14 + ri(1, 14);
    return { p, n, cite: rnd() < 0.34 };
  };
  const pageIn = (ch: number) => {
    const { ps, ws } = CH_PAGES[ch];
    return ps[wpick(ws)];
  };
  const drawLocs = (count: number, focus: number[], type: EntryType, notesRate = 0.07): Loc[] => {
    const out: Loc[] = [];
    const covered = new Set<number>();
    const noteKeys = new Set<string>();
    let guard = 0;
    while (out.length < count && guard++ < 400) {
      const r = rnd();
      let ch: number;
      if (focus.length && r < 0.8) ch = pick(focus);
      else ch = wpick(chWeights(type)) + 1;
      if (ch === 9 && rnd() > KEEP9[type]) ch = wpick(chWeights(type, true)) + 1;
      if (rnd() < notesRate) {
        const l = notePage(ch);
        const k = `${l.p}n${l.n}`;
        if (noteKeys.has(k)) continue;
        noteKeys.add(k);
        out.push(l);
        continue;
      }
      const p = pageIn(ch);
      if (covered.has(p)) continue;
      const c = CHAPTERS[ch - 1];
      if (rnd() < 0.13) {
        let e = Math.min(c.end, p + ri(1, 7));
        for (let q = p + 1; q <= e; q++) if (covered.has(q)) { e = q - 1; break; }
        for (let q = p; q <= e; q++) covered.add(q);
        out.push(e > p ? { p, e } : { p });
      } else {
        covered.add(p);
        out.push({ p });
      }
    }
    return sortLocs(out);
  };

  // ---------- specials ----------
  const LONG: Record<string, number> = {
    'whale oil': 38, spermaceti: 24, 'whaling, sperm': 23, 'Rotch, William, Sr.': 19, 'Society of Friends': 17,
    'lay (share system)': 16, Nantucket: 15, 'New Bedford': 14, outfitters: 13, desertion: 12, 'insurance, marine': 11,
  };
  const SUBS: Record<string, number> = {
    'New Bedford': 48, Nantucket: 34, 'Sag Harbor': 18, Honolulu: 14, Lahaina: 9, 'Melville, Herman': 12,
    'Howland, Isaac, Jr.': 8, 'Cuffe, Paul': 9, 'Starbuck, Obed': 5, 'Lawrence, Mary Chipman': 6, 'Society of Friends': 6,
    'lay (share system)': 4, outfitters: 3, desertion: 5, 'insurance, marine': 2, 'Fayal (Azores)': 6, Talcahuano: 4,
    'Charles W. Morgan (whaleship)': 7, 'whale oil': 0, spermaceti: 0, 'whaling, sperm': 0, 'Rotch, William, Sr.': 0,
    'Essex (ship)': 5, 'Globe (ship)': 4, 'wives, of captains': 7, 'Rotch, William, Jr.': 6,
  };
  const MINOR: Record<string, number> = {
    'New Bedford, Mass.': 6, 'Sag Harbor, N.Y.': 4, 'Rotch, William': 6, 'Howland, Isaac Jr.': 3, Faial: 5, Talcahuana: 2,
    'Cuffee, Paul': 3, 'Charles W. Morgan (ship)': 4, 'Lahaina, Maui': 3, 'Starbuck, Capt. Obed': 2, 'Honolulu, Oahu': 4,
    'Lawrence, Mary C.': 3,
  };

  const entries: Entry[] = protos.map((p, i) => ({
    id: i + 1, heading: p.heading, type: p.type, direct: [], subs: [], see: p.see ? [...p.see] : [], seeAlso: [],
  }));
  const proto = (e: Entry) => protos[e.id - 1];
  const byHeading = new Map(entries.map((e) => [e.heading, e]));
  const fixed = new Set<Entry>(); // excluded from random adjustment

  // pick sub hosts and sub counts
  const hostWeight = new Map<Entry, number>();
  for (const e of entries) {
    const p = proto(e);
    if (p.see || MINOR[e.heading] != null) continue;
    if (SUBS[e.heading] != null) continue;
    if (LONG[e.heading] != null) continue;
    const prob = e.type === 'concept' ? 0.78 : e.type === 'place' ? (p.gen ? 0.12 : 0.5) : e.type === 'person' ? (p.gen ? 0.4 : 0.9) : 0.22;
    if (rnd() < prob) {
      const base = e.type === 'concept' ? 7 : e.type === 'place' ? (p.gen ? 2.5 : 6) : e.type === 'person' ? (p.gen ? 3.2 : 6) : 3;
      hostWeight.set(e, base * (0.35 + rnd() * rnd() * 3.2));
    }
  }
  const fixedSubs = Object.entries(SUBS).reduce((a, [, n]) => a + n, 0);
  const remainingSubs = TARGETS.subs - fixedSubs;
  const wsum = [...hostWeight.values()].reduce((a, b) => a + b, 0);
  const subCount = new Map<Entry, number>();
  let assigned = 0;
  const fracs: [Entry, number][] = [];
  for (const [e, w] of hostWeight) {
    const exact = (w / wsum) * remainingSubs;
    const n = Math.max(1, Math.floor(exact));
    subCount.set(e, n);
    assigned += n;
    fracs.push([e, exact - Math.floor(exact)]);
  }
  fracs.sort((a, b) => b[1] - a[1]);
  let k = 0;
  while (assigned < remainingSubs) {
    const e = fracs[k++ % fracs.length][0];
    subCount.set(e, subCount.get(e)! + 1);
    assigned++;
  }
  while (assigned > remainingSubs) {
    const e = fracs[k++ % fracs.length][0];
    if (subCount.get(e)! > 2) {
      subCount.set(e, subCount.get(e)! - 1);
      assigned--;
    }
  }
  for (const [h, n] of Object.entries(SUBS)) if (n > 0 && byHeading.has(h)) subCount.set(byHeading.get(h)!, n);

  // sub headings
  const notable = NOTABLE_PEOPLE.map(([h]) => h);
  const personFL = (h: string) => {
    const [last, first] = h.split(', ');
    return first ? `${first.replace(/, (Sr\.|Jr\.)$/, '')} ${last}` : h;
  };
  const conceptNames = CONCEPTS.map(([h]) => h).filter((h) => !h.includes('(') && !h.includes(','));
  const shipList = entries.filter((e) => e.type === 'ship').map((e) => e.heading.replace(/\s*\(.*\)$/, ''));
  const yearFor = (ch: number) => ri(CH_YEARS[ch][0], CH_YEARS[ch][1]);
  const fill = (tpl: string, ch: number, self: string) => {
    const y = yearFor(ch || 5);
    return tpl
      .replace('{ship}', pick(shipList))
      .replace('{place}', pick(MAJOR_PORTS.filter((p) => p !== self)))
      .replace('{person}', personFL(pick(notable.filter((p) => p !== self))))
      .replace('{concept}', pick(conceptNames.filter((c) => c !== self)))
      .replace('{street}', `${pick(STREETS)} Street`)
      .replace('{y2}', '§')
      .replace('{y}', String(y))
      .replace('§', formatRange(y, y + ri(1, 4)).split('–')[1]);
  };
  const femaleFirst = new Set(FIRST_F);
  const isFemale = (h: string) => femaleFirst.has((h.split(', ')[1] ?? '').split(' ')[0]) || /Lawrence, Mary|Brewster, Mary|Williams, Eliza|Brown, Martha|Jernegan, Helen|Mott, Lucretia|Mitchell, Maria|Green, Hetty/.test(h);
  const templatesFor = (e: Entry) =>
    e.type === 'person' ? (isFemale(e.heading) ? SUB_PERSON_F : SUB_PERSON) : e.type === 'place' ? SUB_PLACE : e.type === 'ship' ? SUB_SHIP : SUB_CONCEPT;

  const unitFocus = new Map<object, number[]>();

  for (const e of entries) {
    const p = proto(e);
    if (p.see) continue;
    const focus = p.focus.length ? p.focus : genFocus(e.type);
    const nSubs = subCount.get(e) ?? 0;
    const seen = new Set<string>();
    for (let s = 0; s < nSubs; s++) {
      const ch = rnd() < 0.75 ? pick(focus) : wpick(chWeights(e.type)) + 1;
      let h = '';
      for (let t = 0; t < 60; t++) {
        const usePhrase = (e.type === 'concept' || e.type === 'place') && rnd() < 0.25;
        h = usePhrase ? pick(CHAPTER_PHRASES[ch]) : fill(pick(templatesFor(e)), ch, e.heading);
        if (h.includes(e.heading)) continue;
        const key = subSortKey(h);
        if (!seen.has(key)) {
          seen.add(key);
          break;
        }
        h = '';
      }
      if (!h) {
        h = `${pick(CHAPTER_PHRASES[ch])}, ${yearFor(ch)}`;
        seen.add(subSortKey(h));
      }
      const r = rnd();
      const n = r < 0.64 ? 1 : r < 0.87 ? 2 : r < 0.96 ? 3 : r < 0.99 ? 4 : 5;
      const sub = { heading: h, locs: drawLocs(n, [ch], e.type) };
      unitFocus.set(sub, [ch]);
      e.subs.push(sub);
    }
    e.subs = sortSubs(e.subs);

    let nd: number;
    if (LONG[e.heading] != null) nd = LONG[e.heading];
    else if (MINOR[e.heading] != null) nd = MINOR[e.heading];
    else if (nSubs > 0) {
      const r = rnd();
      nd = r < 0.45 ? 0 : r < 0.7 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 3 : 4;
    } else {
      const r = rnd();
      nd = r < 0.42 ? 1 : r < 0.64 ? 2 : r < 0.77 ? 3 : r < 0.86 ? 4 : r < 0.92 ? 5 : r < 0.97 ? 6 : 7;
    }
    e.direct = drawLocs(nd, focus, e.type, LONG[e.heading] != null ? 0.03 : 0.07);
    // guarantee counts for hand-placed entries
    let guard = 0;
    while ((LONG[e.heading] != null || MINOR[e.heading] != null) && e.direct.length < nd && guard++ < 50) {
      e.direct = sortLocs([...e.direct, ...drawLocs(1, focus, e.type, 0).filter((l) => !e.direct.some((d) => d.p <= l.p && (d.e ?? d.p) >= l.p))]);
    }
    if (LONG[e.heading] != null || MINOR[e.heading] != null) {
      e.direct = e.direct.slice(0, nd);
      fixed.add(e);
    }
    unitFocus.set(e, focus);
  }

  // subentries that 'see' references point at
  const ensureSub = (h: string, sub: string, ch: number) => {
    const e = byHeading.get(h)!;
    if (!e.subs.some((s) => s.heading === sub)) {
      const victim = e.subs.findIndex((s) => !s.heading.startsWith('voyage'));
      const item = { heading: sub, locs: drawLocs(2, [ch], 'ship') };
      if (victim >= 0) e.subs[victim] = item;
      else e.subs.push(item);
      e.subs = sortSubs(e.subs);
    }
  };
  ensureSub('Essex (ship)', 'sinking of', 8);
  ensureSub('Globe (ship)', 'mutiny on', 8);

  // ---------- 85 more long undifferentiated strings ----------
  const longPool = entries.filter((e) => {
    const p = proto(e);
    return !p.see && !fixed.has(e) && e.subs.length <= 4 && (e.type !== 'ship' || rnd() < 0.3) && (!p.gen || rnd() < 0.08);
  });
  const extraLong = TARGETS.long - Object.keys(LONG).length;
  const longLens = [8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 12, 12, 13, 14, 15, 16];
  for (let i = 0; i < extraLong; i++) {
    const idx = Math.floor(rnd() * longPool.length);
    const e = longPool.splice(idx, 1)[0];
    const n = pick(longLens);
    const focus = unitFocus.get(e)!;
    let tries = 0;
    while (e.direct.length < n && tries++ < 40) {
      const more = drawLocs(n - e.direct.length, focus, e.type, 0.05).filter(
        (l) => !e.direct.some((d) => (l.n != null ? d.p === l.p && d.n === l.n : d.n == null && d.p <= (l.e ?? l.p) && (d.e ?? d.p) >= l.p)),
      );
      e.direct = sortLocs([...e.direct, ...more]);
    }
    e.direct = e.direct.slice(0, n);
    fixed.add(e);
  }

  // ---------- crew-list names ----------
  const CREW_PAGES = [244, 245, 246, 252, 253, 281, 282];
  const crewPool = entries.filter((e) => proto(e).gen && e.type === 'person' && e.subs.length === 0 && !fixed.has(e));
  for (let i = 0; i < 212; i++) {
    const e = crewPool.splice(Math.floor(rnd() * crewPool.length), 1)[0];
    e.direct = [{ p: pick(CREW_PAGES) }];
    e.crew = true;
    fixed.add(e);
  }

  // ---------- cross-references ----------
  byHeading.get('whaling, sperm')!.see = ['sperm whaling'];
  for (const [src, tgt] of BROKEN_SEE_ALSO) byHeading.get(src)!.seeAlso.push(tgt);
  const countRefs = () => entries.reduce((a, e) => a + e.see.length + e.seeAlso.length, 0);
  const conceptTargets = entries.filter((e) => e.type === 'concept' && !proto(e).see && locCount(e) > 0).map((e) => e.heading);
  const personTargets = entries.filter((e) => e.type === 'person' && !proto(e).gen).map((e) => e.heading);
  const srcPool = entries.filter((e) => !proto(e).see && !e.crew && locCount(e) > 0 && !MINOR[e.heading]);
  while (countRefs() < TARGETS.xrefs) {
    const r = rnd();
    const type: EntryType = r < 0.6 ? 'concept' : r < 0.85 ? 'place' : r < 0.95 ? 'person' : 'ship';
    const cands = srcPool.filter((e) => e.type === type);
    const src = pick(cands);
    const tgt = type === 'person' && rnd() < 0.5 ? pick(personTargets) : pick(conceptTargets);
    if (tgt === src.heading || src.seeAlso.includes(tgt) || src.seeAlso.length >= 3) continue;
    if (tgt === 'sperm whaling' || tgt === 'whaling, sperm') continue;
    src.seeAlso.push(tgt);
  }
  for (const e of entries) e.seeAlso.sort((a, b) => cmp(headingSortKey(a), headingSortKey(b)));

  // ---------- exact locator total ----------
  const units: { owner: Entry; list: Loc[]; focus: number[]; isSub: boolean }[] = [];
  for (const e of entries) {
    if (fixed.has(e) || proto(e).see) continue;
    units.push({ owner: e, list: e.direct, focus: unitFocus.get(e) ?? [5], isSub: false });
    for (const s of e.subs) units.push({ owner: e, list: s.locs, focus: unitFocus.get(s) ?? [5], isSub: true });
  }
  let total = entries.reduce((a, e) => a + locCount(e), 0);
  let guard = 0;
  while (total !== TARGETS.locs && guard++ < 200000) {
    const u = pick(units);
    if (total > TARGETS.locs) {
      const min = u.isSub ? 1 : u.owner.subs.length ? 0 : 1;
      if (u.list.length > min) {
        u.list.splice(Math.floor(rnd() * u.list.length), 1);
        total--;
      }
    } else {
      const max = u.isSub ? 5 : 7;
      if (u.list.length < max) {
        const l = drawLocs(1, u.focus, u.owner.type)[0];
        if (l && !u.list.some((d) => d.p === l.p && d.n === l.n) && !u.list.some((d) => d.n == null && l.n == null && d.p <= (l.e ?? l.p) && (d.e ?? d.p) >= l.p)) {
          u.list.push(l);
          u.list.sort((a, b) => a.p - b.p || (a.n ?? 0) - (b.n ?? 0));
          total++;
        }
      }
    }
  }

  return { entries };
}
