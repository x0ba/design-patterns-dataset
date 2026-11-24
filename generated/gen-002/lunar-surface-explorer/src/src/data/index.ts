import { CURATED, Feature } from './features';
import { APOLLO, ROBOTIC, ApolloSite, Robotic } from './missions';
import { destination, distanceKm, slug } from '../lib/geo';

export * from './features';
export * from './missions';

/* ───────── seeded RNG ───────── */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Lettered satellite craters (“Tycho A”, “Haworth B”…) follow the IAU naming convention. */
function buildSatellites(): Feature[] {
  const rnd = mulberry32(20261028);
  const sats: Feature[] = [];
  for (const p of CURATED) {
    if (p.kind !== 'crater' || p.diameter < 20) continue;
    const n = Math.min(14, Math.max(2, Math.floor(p.diameter / 9)));
    for (let i = 0; i < n; i++) {
      const letter = String.fromCharCode(65 + i);
      const d = p.diameter * (0.05 + rnd() * 0.13);
      let pos = { lat: p.lat, lon: p.lon };
      for (let attempt = 0; attempt < 14; attempt++) {
        const bearing = rnd() * 360;
        const dist = (p.diameter / 2) * (1.2 + rnd() * 1.6) + d / 2;
        pos = destination(p.lat, p.lon, bearing, dist);
        // keep satellites out of other named craters
        const clash = CURATED.some((o) => o !== p && o.kind === 'crater' && distanceKm(o.lat, o.lon, pos.lat, pos.lon) < (o.diameter / 2) * 1.25 + d / 2);
        if (!clash) break;
      }
      const name = `${p.name} ${letter}`;
      sats.push({
        id: slug(name), name, kind: 'crater', lat: pos.lat, lon: pos.lon,
        diameter: Math.round(d * 10) / 10, depth: Math.round(d * 0.2 * 10) / 10,
        ageMyr: p.ageMyr, namedAfter: `A satellite crater. It borrows the name of its neighbour ${p.name} and adds a letter.`,
        parent: p.id,
      });
    }
  }
  return sats;
}

export const FEATURES: Feature[] = [...CURATED, ...buildSatellites()];
export const FEATURE_BY_ID = new Map(FEATURES.map((f) => [f.id, f]));

/* ───────── unified place model ───────── */
export type PlaceType = 'feature' | 'apollo' | 'robotic';
export interface Place {
  key: string;
  type: PlaceType;
  name: string;
  lat: number;
  lon: number;
  /** Footprint radius in km used for click-picking & framing. */
  radiusKm: number;
  kindLabel: string;
  feature?: Feature;
  apollo?: ApolloSite;
  robotic?: Robotic;
}

const KIND_LABEL: Record<string, string> = { crater: 'Crater', mare: 'Sea (dark plain)', mountain: 'Mountains', rille: 'Valley / rille' };

export function regionLabel(lat: number, lon: number) {
  if (lat <= -80) return 'South polar region';
  if (lat >= 80) return 'North polar region';
  const ns = lat < 0 ? 'southern' : 'northern';
  const side = Math.abs(lon) <= 90 ? 'near side' : 'far side';
  return `${side}, ${Math.abs(lat) < 25 ? 'equatorial band' : ns + ' region'}`;
}

const places: Place[] = [];
for (const f of FEATURES) {
  places.push({
    key: `f:${f.id}`, type: 'feature', name: f.name, lat: f.lat, lon: f.lon,
    radiusKm: f.diameter / 2, kindLabel: f.parent ? 'Satellite crater' : KIND_LABEL[f.kind], feature: f,
  });
}
for (const a of APOLLO) {
  places.push({ key: `a:${a.id}`, type: 'apollo', name: `${a.mission} landing site`, lat: a.lat, lon: a.lon, radiusKm: 1.5, kindLabel: 'Crewed landing', apollo: a });
}
for (const r of ROBOTIC) {
  const lbl = r.kind === 'impactor' ? 'Probe impact site' : r.kind === 'rover' ? 'Robotic rover' : 'Robotic lander';
  places.push({ key: `r:${r.id}`, type: 'robotic', name: r.name, lat: r.lat, lon: r.lon, radiusKm: 1.5, kindLabel: lbl, robotic: r });
}
export const PLACES = places;
export const PLACE_BY_KEY = new Map(places.map((p) => [p.key, p]));
export function getPlace(key: string): Place | undefined {
  return PLACE_BY_KEY.get(key);
}

export const DEFAULT_PLACE = 'f:haworth';

/* ───────── search ───────── */
const ALIASES: Record<string, string[]> = {
  'a:apollo-11': ['tranquility base', 'first moon landing', 'armstrong', 'aldrin', 'collins', 'eagle', 'sea of tranquility'],
  'a:apollo-12': ['conrad', 'bean', 'ocean of storms'],
  'a:apollo-14': ['shepard', 'mitchell', 'golf'],
  'a:apollo-15': ['scott', 'irwin', 'rover', 'hadley'],
  'a:apollo-16': ['young', 'duke', 'descartes'],
  'a:apollo-17': ['cernan', 'schmitt', 'last humans', 'taurus littrow'],
  'r:polar-scout': ['water ice', 'ice', 'newest', 'latest', 'haworth lander', 'south pole lander'],
  'f:shackleton': ['south pole', 'pole'],
  'f:haworth': ['water ice', 'ice', 'polar scout'],
  'f:cabeus': ['lcross', 'water plume'],
  'f:peary': ['north pole'],
};

export function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface SearchEntry { place: Place; name: string; aliases: string[]; boost: number }
const SEARCH: SearchEntry[] = places.map((p) => {
  const aliases = [...(ALIASES[p.key] ?? [])];
  if (p.feature?.english) aliases.push(p.feature.english);
  if (p.apollo) aliases.push(p.apollo.mission, p.apollo.siteName, p.apollo.region);
  let boost = 0;
  if (p.type !== 'feature') boost = 14;
  else if (p.feature!.parent) boost = -12;
  else boost = Math.min(10, Math.log10(p.feature!.diameter + 1) * 4);
  return { place: p, name: normalize(p.name), aliases: aliases.map(normalize), boost };
});

export function searchPlaces(query: string, limit = 8): Place[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { s: number; p: Place }[] = [];
  for (const e of SEARCH) {
    let s = 0;
    if (e.name === q) s = 100;
    else if (e.name.startsWith(q)) s = 80;
    else if (e.name.split(' ').some((w) => w.startsWith(q))) s = 62;
    else if (e.name.includes(q)) s = 44;
    for (const a of e.aliases) {
      if (a === q) s = Math.max(s, 70);
      else if (a.startsWith(q)) s = Math.max(s, 58);
      else if (a.includes(q)) s = Math.max(s, 38);
    }
    // multi-word queries: every token must appear
    if (!s) {
      const toks = q.split(' ');
      if (toks.length > 1 && toks.every((t) => e.name.includes(t) || e.aliases.some((a) => a.includes(t)))) s = 50;
    }
    if (s) scored.push({ s: s + e.boost, p: e.place });
  }
  scored.sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name));
  return scored.slice(0, limit).map((x) => x.p);
}

export const SUGGESTED_KEYS = ['r:polar-scout', 'a:apollo-11', 'f:shackleton', 'f:tycho'];

/* ───────── saved places seed (the reader’s two) ───────── */
export interface SavedPlace { key: string; note: string; savedAt: string }
export const SEED_SAVED: SavedPlace[] = [
  { key: 'f:tycho', note: 'Look for the bright streaks around Full Moon', savedAt: '2026-09-14' },
  { key: 'a:apollo-17', note: '', savedAt: '2026-10-02' },
];

/** The name used in the UI for a place that has a Haworth-style “crater + lander” story. */
export const FEATURE_BY_SLUG = FEATURE_BY_ID;
