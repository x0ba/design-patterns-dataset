export type DeterminationKind = 'original' | 'determination' | 'annotation';

export interface Determination {
  name: string; // e.g. "Penstemon serrulatus"
  year: number;
  by: string;
  kind: DeterminationKind;
}

export type Phenology = 'flowering' | 'fruiting' | 'flowering and fruiting' | 'vegetative' | 'not recorded';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

/** Choices offered in the phenology filter. "flowering" also matches sheets noted as flowering and fruiting. */
export type PhenoChoice = 'flowering' | 'fruiting' | 'vegetative' | 'not recorded';

export interface DateParts {
  year: number;
  month: number | null; // 1-12, null when the label gives only a year
  day: number | null;
}

/** A sheet as stored in src/data/specimens.json. */
export interface RawSpecimen {
  catalogNumber: string;
  currentName: string;
  determinations: Determination[]; // oldest first; last one is the current name
  collector: string;
  collectorNumber: string;
  date: DateParts;
  locality: string;
  county: string;
  latitude: number;
  longitude: number;
  uncertaintyM: number;
  elevationFt: number;
  habitat: string;
  phenology: Phenology;
  condition: string;
  imaged: boolean;
  loanNote: string | null;
}

/** A sheet with values derived once at load time. */
export interface Specimen extends RawSpecimen {
  epithet: string; // "serrulatus"
  dateKey: number; // yyyymmdd-style sort key, unknown parts count as 0
  season: Season | null;
  distanceMi: number;
  /** Lowercased text searched when "earlier names" is on. */
  haystackAll: string;
  /** Lowercased text searched when "earlier names" is off. */
  haystackCurrent: string;
}

export type SortKey = 'date-asc' | 'date-desc' | 'distance' | 'catalog';

export interface Filters {
  text: string;
  species: string[]; // epithets, e.g. ["rattanii"]
  counties: string[];
  yearFrom: number;
  yearTo: number;
  seasons: Season[];
  radiusMi: number | null; // null = any distance
  phenology: PhenoChoice[];
  imagedOnly: boolean;
  earlierNames: boolean; // include superseded determinations in name matching
}
