import rawSpecimens from './specimens.json';
import type { RawSpecimen } from '../types';

/** All sheets shipped with the kiosk (Penstemon only, mock data). */
export const RAW_SPECIMENS = rawSpecimens as RawSpecimen[];

/** Figure shown on the welcome screen. The digitized set itself is larger than the mock data. */
export const DIGITIZED_TOTAL = 41860;

export const PRESERVE = {
  name: 'Coyote Hollow County Preserve',
  lat: 44.0213,
  lon: -123.0446,
} as const;

export const COUNTY_FOCUS = 'Lane';

export const RADIUS_CHOICES: { label: string; miles: number | null }[] = [
  { label: 'Any distance', miles: null },
  { label: 'Within 1 mi', miles: 1 },
  { label: 'Within 5 mi', miles: 5 },
  { label: 'Within 10 mi', miles: 10 },
  { label: 'Within 25 mi', miles: 25 },
];

export const SEASON_LABELS: Record<'spring' | 'summer' | 'fall' | 'winter', string> = {
  spring: 'Spring (Mar–May)',
  summer: 'Summer (Jun–Aug)',
  fall: 'Fall (Sep–Nov)',
  winter: 'Winter (Dec–Feb)',
};

/** Colour per species so map dots and sheet cards can be told apart at a glance. */
export const SPECIES_COLOR: Record<string, string> = {
  cardwellii: '#b5446e',
  serrulatus: '#c8553d',
  rattanii: '#7b4fa0',
  procerus: '#d98e2b',
  richardsonii: '#4f7cc0',
  deustus: '#a33b3b',
  davidsonii: '#2f8c80',
  confertus: '#d9b02f',
  wilcoxii: '#2a5fa8',
  laetus: '#d25f9a',
  digitalis: '#7a5a3a',
  nemorosus: '#5b9a3c',
  ovatus: '#4a48c4',
  fruticosus: '#e7839f',
};

export const FEATURED_EXHIBIT = {
  title: 'Pressed in Place: 125 Years of Oregon Collectors',
  month: 'November 2026',
  intro:
    'Every sheet in this collection was pressed, dried, labeled and filed by someone who walked out to find it. The earliest Lane County Penstemon in the collection was gathered in 1898. The most recent spring sheet near Coyote Hollow was gathered on Spencer Butte in April 2019, about two miles away.',
  body: [
    'A specimen is more than a picture of a plant. The label records where and when it grew, who gathered it, and the name the collector gave it. Later botanists often revise that name, and the determination history on each sheet keeps every revision visible.',
    'Sheets can outlive the people who collected them. A catalog number lets you find a sheet again decades later, and a georeference lets you compare the place it came from with the land as it is today.',
    'Use the search to follow a single species through time, or compare two sheets side by side to see how a plant was recorded in different decades.',
  ],
};
