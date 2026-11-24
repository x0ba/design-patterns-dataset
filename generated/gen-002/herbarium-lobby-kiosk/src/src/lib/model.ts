import { PRESERVE, RAW_SPECIMENS } from '../data/collection';
import type { Filters, PhenoChoice, Phenology, RawSpecimen, Season, SortKey, Specimen } from '../types';

/** Great-circle distance in statute miles. */
export function milesBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function seasonOf(month: number | null): Season | null {
  if (month === null) return null;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

/** Phenology choice → the recorded values it matches. */
const PHENO_MATCH: Record<PhenoChoice, Phenology[]> = {
  flowering: ['flowering', 'flowering and fruiting'],
  fruiting: ['fruiting', 'flowering and fruiting'],
  vegetative: ['vegetative'],
  'not recorded': ['not recorded'],
};

function enrich(raw: RawSpecimen): Specimen {
  const epithet = raw.currentName.split(' ')[1] ?? raw.currentName;
  const names = raw.determinations.map((d) => d.name.toLowerCase());
  const d = raw.date;
  return {
    ...raw,
    epithet,
    dateKey: d.year * 10000 + (d.month ?? 0) * 100 + (d.day ?? 0),
    season: seasonOf(d.month),
    distanceMi: milesBetween(PRESERVE.lat, PRESERVE.lon, raw.latitude, raw.longitude),
    haystackAll: [
      raw.catalogNumber,
      ...names,
      raw.collector,
      raw.collectorNumber,
      raw.locality,
      raw.habitat,
      raw.county,
      String(d.year),
    ]
      .join(' | ')
      .toLowerCase(),
    haystackCurrent: [
      raw.catalogNumber,
      raw.currentName,
      raw.collector,
      raw.collectorNumber,
      raw.locality,
      raw.habitat,
      raw.county,
      String(d.year),
    ]
      .join(' | ')
      .toLowerCase(),
  };
}

export const SPECIMENS: Specimen[] = RAW_SPECIMENS.map(enrich);
export const SPECIMEN_BY_ID = new Map(SPECIMENS.map((s) => [s.catalogNumber, s] as const));

export const DATA_YEAR_MIN = Math.min(...SPECIMENS.map((s) => s.date.year));
export const DATA_YEAR_MAX = Math.max(...SPECIMENS.map((s) => s.date.year));

/** Species epithets present in the data, most-collected first. */
export const SPECIES_EPITHETS: string[] = (() => {
  const counts = new Map<string, number>();
  for (const s of SPECIMENS) counts.set(s.epithet, (counts.get(s.epithet) ?? 0) + 1);
  return [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b));
})();

export const COUNTIES: string[] = [...new Set(SPECIMENS.map((s) => s.county))].sort((a, b) => {
  if (a === 'Lane') return -1;
  if (b === 'Lane') return 1;
  return a.localeCompare(b);
});

export const DEFAULT_FILTERS: Filters = {
  text: '',
  species: [],
  counties: [],
  yearFrom: DATA_YEAR_MIN,
  yearTo: DATA_YEAR_MAX,
  seasons: [],
  radiusMi: null,
  phenology: [],
  imagedOnly: false,
  earlierNames: true,
};

export function isDefaultFilters(f: Filters): boolean {
  return (
    f.text.trim() === '' &&
    f.species.length === 0 &&
    f.counties.length === 0 &&
    f.yearFrom === DATA_YEAR_MIN &&
    f.yearTo === DATA_YEAR_MAX &&
    f.seasons.length === 0 &&
    f.radiusMi === null &&
    f.phenology.length === 0 &&
    !f.imagedOnly &&
    f.earlierNames === true
  );
}

/** Which facets a sheet matches, ignoring one facet (used for live counts). */
type Facet = 'text' | 'species' | 'counties' | 'years' | 'seasons' | 'radius' | 'phenology' | 'imaged';

function matchesSpecies(s: Specimen, epithets: string[], earlier: boolean): boolean {
  if (epithets.length === 0) return true;
  return epithets.some((ep) => {
    if (s.epithet === ep) return true;
    return earlier && s.determinations.some((d) => d.name.toLowerCase() === `penstemon ${ep}`);
  });
}

function matchesText(s: Specimen, text: string, earlier: boolean): boolean {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = earlier ? s.haystackAll : s.haystackCurrent;
  return tokens.every((t) => hay.includes(t));
}

function matchesFacet(s: Specimen, f: Filters, skip?: Facet): boolean {
  if (skip !== 'text' && !matchesText(s, f.text, f.earlierNames)) return false;
  if (skip !== 'species' && !matchesSpecies(s, f.species, f.earlierNames)) return false;
  if (skip !== 'counties' && f.counties.length > 0 && !f.counties.includes(s.county)) return false;
  if (skip !== 'years' && (s.date.year < f.yearFrom || s.date.year > f.yearTo)) return false;
  if (skip !== 'seasons' && f.seasons.length > 0) {
    if (s.season === null || !f.seasons.includes(s.season)) return false;
  }
  if (skip !== 'radius' && f.radiusMi !== null && s.distanceMi > f.radiusMi) return false;
  if (skip !== 'phenology' && f.phenology.length > 0) {
    const ok = f.phenology.some((c) => PHENO_MATCH[c].includes(s.phenology));
    if (!ok) return false;
  }
  if (skip !== 'imaged' && f.imagedOnly && !s.imaged) return false;
  return true;
}

export function applyFilters(all: Specimen[], f: Filters): Specimen[] {
  return all.filter((s) => matchesFacet(s, f));
}

/** Count of sheets matching all facets except the given one, for live labels. */
export function countWithout(all: Specimen[], f: Filters, skip: Facet): number {
  let n = 0;
  for (const s of all) if (matchesFacet(s, f, skip)) n++;
  return n;
}

export function speciesCounts(all: Specimen[], f: Filters): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ep of SPECIES_EPITHETS) counts.set(ep, 0);
  for (const s of all) {
    if (!matchesFacet(s, f, 'species')) continue;
    for (const ep of SPECIES_EPITHETS) {
      if (matchesSpecies(s, [ep], f.earlierNames)) counts.set(ep, (counts.get(ep) ?? 0) + 1);
    }
  }
  return counts;
}

export function countyCounts(all: Specimen[], f: Filters): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of all) {
    if (!matchesFacet(s, f, 'counties')) continue;
    counts.set(s.county, (counts.get(s.county) ?? 0) + 1);
  }
  return counts;
}

export function sortSpecimens(list: Specimen[], sort: SortKey): Specimen[] {
  const copy = [...list];
  switch (sort) {
    case 'date-asc':
      return copy.sort((a, b) => a.dateKey - b.dateKey || a.catalogNumber.localeCompare(b.catalogNumber));
    case 'date-desc':
      return copy.sort((a, b) => b.dateKey - a.dateKey || a.catalogNumber.localeCompare(b.catalogNumber));
    case 'distance':
      return copy.sort((a, b) => a.distanceMi - b.distanceMi || a.catalogNumber.localeCompare(b.catalogNumber));
    case 'catalog':
      return copy.sort((a, b) => a.catalogNumber.localeCompare(b.catalogNumber));
  }
}

/** Earliest and latest dated sheets in a list (null if fewer than two). */
export function earliestAndLatest(list: Specimen[]): [Specimen, Specimen] | null {
  if (list.length < 2) return null;
  let first = list[0];
  let last = list[0];
  for (const s of list) {
    if (s.dateKey < first.dateKey) first = s;
    if (s.dateKey > last.dateKey) last = s;
  }
  if (first.catalogNumber === last.catalogNumber) return null;
  return [first, last];
}

/** Sheets that match everything except that they have no month, so the season filter cannot place them. */
export function undatedMonthCount(all: Specimen[], f: Filters): number {
  if (f.seasons.length === 0) return 0;
  let n = 0;
  for (const s of all) {
    if (s.season === null && matchesFacet(s, f, 'seasons')) n++;
  }
  return n;
}

export function namesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function everHadName(s: Specimen, name: string): boolean {
  return s.determinations.some((d) => namesEqual(d.name, name));
}
