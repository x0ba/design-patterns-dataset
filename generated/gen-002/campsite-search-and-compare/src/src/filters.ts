import type { Campground, Operator, Site } from './data';

export interface Filters {
  flush: boolean;
  showers: boolean;
  water: boolean;
  shade: boolean;
  bikes: boolean;
  quietGen: boolean;
  maxPrice: number;
  maxDrive: number;
  operators: Operator[];
  minRating: number;
  playground: boolean;
  store: boolean;
  tentSites: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  flush: true,
  showers: true,
  water: true,
  shade: true,
  bikes: true,
  quietGen: true,
  maxPrice: 95,
  maxDrive: 180,
  operators: [],
  minRating: 0,
  playground: false,
  store: false,
  tentSites: true,
};

export const CLEARED_FILTERS: Filters = {
  ...DEFAULT_FILTERS,
  flush: false,
  showers: false,
  water: false,
  shade: false,
  bikes: false,
  quietGen: false,
  tentSites: false,
};

export function matches(c: Campground, f: Filters) {
  if (f.flush && !c.amenities.flushToilets) return false;
  if (f.showers && !c.amenities.showers) return false;
  if (f.water && !c.amenities.lakeAccess) return false;
  if (f.shade && c.shadePct < 50) return false;
  if (f.bikes && !c.bikeNote) return false;
  if (f.quietGen && c.generator.policy === 'allowed') return false;
  if (c.priceMin > f.maxPrice) return false;
  if (c.driveMin > f.maxDrive) return false;
  if (f.operators.length && !f.operators.includes(c.operator)) return false;
  if (c.rating < f.minRating) return false;
  if (f.playground && !c.amenities.playground) return false;
  if (f.store && !c.amenities.campStore) return false;
  if (f.tentSites && !c.siteTypes.some((t) => t === 'Tent' || t === 'Walk-in')) return false;
  return true;
}

export interface Party {
  adults: number;
  kids: number;
  tents: number;
  vehicles: number;
}
export const DEFAULT_PARTY: Party = { adults: 2, kids: 2, tents: 1, vehicles: 1 };

export type Fit = { ok: boolean; reason?: string; caution?: string };
export function siteFit(s: Site, p: Party): Fit {
  const people = p.adults + p.kids;
  if (s.type === 'Group') return { ok: false, reason: 'Group site, priced for 25+' };
  if (s.maxPeople < people) return { ok: false, reason: `Max ${s.maxPeople} people` };
  if (s.maxVehicles < p.vehicles) return { ok: false, reason: `Max ${s.maxVehicles} vehicle${s.maxVehicles > 1 ? 's' : ''}` };
  if (p.tents > 0 && !s.tentPad) return { ok: false, reason: 'No flat spot for a tent' };
  if (s.type === 'Walk-in') return { ok: true, caution: `Carry gear ${s.carryM ?? 60} m from the lot` };
  return { ok: true };
}

export function activeMustHaveCount(f: Filters) {
  return [f.flush, f.showers, f.water, f.shade, f.bikes, f.quietGen].filter(Boolean).length;
}
