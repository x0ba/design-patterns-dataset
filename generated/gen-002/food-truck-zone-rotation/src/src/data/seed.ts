// Deterministic generator for the proposed December draft (v3, last saved Fri Nov 13).
// The draft was built before the weekend's availability forms and the Fifth St notice,
// so it contains exactly the conflicts Marisol would find on Monday morning.

import { DAYS, dow, holidayFor } from './calendar';
import { ZONES, Zone } from './zones';
import { TRUCKS, Truck } from './trucks';

export interface Assignment {
  id: string;
  truckId: string;
  zoneId: string;
  day: number;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function operates(zone: Zone, day: number): boolean {
  const h = holidayFor(day);
  if (h?.kind === 'closed') return false;
  return zone.days.includes(dow(day));
}

/** How many trucks the draft placed in each zone-day. */
function draftFill(zone: Zone, day: number): number {
  if (!operates(zone, day)) return 0;
  const d = dow(day);
  const empties: Record<string, number[]> = {
    library: [23],
    westside: [28],
    fairgrounds: [26],
    eastgate: [27],
  };
  if (empties[zone.id]?.includes(day)) return 0;
  // Christmas week and New Year's Eve run lighter.
  const light = day === 24 || day === 26 || day === 27 || day === 31;
  if (light && ['civic', 'medical', 'harbor', 'riverside-n', 'riverside-s'].includes(zone.id)) return 1;
  if (light && zone.id === 'old-market') return 2;
  switch (zone.id) {
    case 'civic':
      return 2;
    case 'courthouse':
      if (day >= 8 && day <= 12) return [2, 3, 3, 2, 3][day - 8];
      if (d === 6) return 1;
      return d === 1 || d === 5 ? 1 : 2;
    case 'medical':
      return d >= 2 && d <= 4 ? 2 : 1;
    case 'university':
      return day <= 18 && d >= 2 && d <= 4 ? 2 : 1;
    case 'riverside-n':
      if (day === 13 || day === 14) return 3;
      return d === 0 || d === 5 || d === 6 ? 2 : 1;
    case 'riverside-s':
      if (day === 13 || day === 14) return 2;
      return d === 0 || d === 6 ? 2 : 1;
    case 'harbor':
      return d === 6 ? 2 : 1;
    case 'old-market':
      return d === 6 ? 3 : 2;
    case 'depot':
      return d === 6 ? 2 : 1;
    default:
      return 1;
  }
}

// Hand-placed slots that matter to the story.
const PINS: [truckId: string, zoneId: string, day: number][] = [
  // Bao Down — form Saturday: not operating in December
  ['bao-down', 'university', 2],
  ['bao-down', 'medical', 9],
  ['bao-down', 'fairgrounds', 17],
  ['bao-down', 'riverside-s', 21],
  // Arepa Express — now Dec 1–18 only
  ['arepa-express', 'civic', 3],
  ['arepa-express', 'university', 11],
  ['arepa-express', 'harbor', 19],
  ['arepa-express', 'medical', 29],
  // Jollof Junction — now weekdays only
  ['jollof-junction', 'eastgate', 5],
  ['jollof-junction', 'innovation', 9],
  ['jollof-junction', 'medical', 15],
  ['jollof-junction', 'library', 18],
  // Seoul Sister — permit lapses Dec 4, no renewal
  ['seoul-sister', 'courthouse', 2],
  ['seoul-sister', 'university', 7],
  ['seoul-sister', 'innovation', 15],
  ['seoul-sister', 'civic', 23],
  // Kebab Korner — permit lapses Dec 15, renewal pending
  ['kebab-korner', 'civic', 4],
  ['kebab-korner', 'riverside-n', 10],
  ['kebab-korner', 'old-market', 18],
  ['kebab-korner', 'university', 30],
  // Fire & Fennel — three Civic Plaza slots (fairness rule breach)
  ['fire-fennel', 'civic', 3],
  ['fire-fennel', 'civic', 10],
  ['fire-fennel', 'civic', 22],
  ['fire-fennel', 'depot', 4],
  // Swap request 1
  ['tacos-guero', 'old-market', 19],
  ['birria-boss', 'depot', 19],
  // Swap request 2
  ['lumpia-lane', 'courthouse', 12],
  ['masala-wheels', 'harbor', 12],
  // Mac Attack on attendance warning, placed in a tier A zone
  ['mac-attack', 'medical', 8],
];

const PINNED_ONLY = new Set(['bao-down', 'arepa-express', 'jollof-junction', 'seoul-sister', 'kebab-korner', 'fire-fennel']);

const BREAKFAST = new Set(['coffee-caboose', 'frank-bean', 'pan-de-oro', 'waffle-wagon']);

function draftTarget(t: Truck): number {
  if (t.availability.status === 'not_operating') return 0;
  return t.guarantee;
}

export function generateDraft(): Assignment[] {
  const rand = mulberry32(20261201);
  const out: Assignment[] = [];
  let n = 1;
  const add = (truckId: string, zoneId: string, day: number) => {
    out.push({ id: `a${String(n++).padStart(3, '0')}`, truckId, zoneId, day });
  };

  const count: Record<string, number> = {};
  const civic: Record<string, number> = {};
  const zoneUse: Record<string, number> = {};
  const byDay: Record<number, Set<string>> = {};
  const lastDay: Record<string, number> = {};
  DAYS.forEach((d) => (byDay[d] = new Set()));
  const filled: Record<string, number> = {};

  const record = (truckId: string, zoneId: string, day: number) => {
    add(truckId, zoneId, day);
    count[truckId] = (count[truckId] ?? 0) + 1;
    if (zoneId === 'civic') civic[truckId] = (civic[truckId] ?? 0) + 1;
    zoneUse[truckId + zoneId] = (zoneUse[truckId + zoneId] ?? 0) + 1;
    byDay[day].add(truckId);
    lastDay[truckId] = Math.max(lastDay[truckId] ?? 0, day);
    filled[zoneId + ':' + day] = (filled[zoneId + ':' + day] ?? 0) + 1;
  };

  for (const [t, z, d] of PINS) record(t, z, d);

  const pool = TRUCKS.filter((t) => !PINNED_ONLY.has(t.id) && draftTarget(t) > 0);
  const jitter: Record<string, number> = Object.fromEntries(pool.map((t) => [t.id, rand()]));

  for (const day of DAYS) {
    // Tier A zones get first pick each day so they draw from the full pool.
    const zones = [...ZONES].sort((a, b) => a.tier.localeCompare(b.tier));
    for (const zone of zones) {
      const want = draftFill(zone, day);
      while ((filled[zone.id + ':' + day] ?? 0) < want) {
        let best: Truck | null = null;
        let bestScore = Infinity;
        for (const t of pool) {
          if (byDay[day].has(t.id)) continue;
          if (t.availability.unavailable.includes(day)) continue;
          if (t.permitLastDay && day > t.permitLastDay) continue;
          if (zone.id === 'civic' && (civic[t.id] ?? 0) >= 2) continue;
          if ((zoneUse[t.id + zone.id] ?? 0) >= 2) continue;
          const ratio = (count[t.id] ?? 0) / draftTarget(t);
          let score = ratio * 10;
          const gap = day - (lastDay[t.id] ?? -10);
          if (gap < 3) score += (3 - gap) * 1.2;
          if (zone.kind === 'breakfast') score += BREAKFAST.has(t.id) ? -6 : 3;
          else if (BREAKFAST.has(t.id) && zone.kind === 'nightlife') score += 4;
          score += (zoneUse[t.id + zone.id] ?? 0) * 2;
          score += jitter[t.id] * 1.5 + rand() * 0.8;
          if (score < bestScore) {
            bestScore = score;
            best = t;
          }
        }
        if (!best) break;
        record(best.id, zone.id, day);
      }
    }
  }

  return out.sort((a, b) => a.day - b.day || a.zoneId.localeCompare(b.zoneId));
}

export const INITIAL_ASSIGNMENTS: Assignment[] = generateDraft();
