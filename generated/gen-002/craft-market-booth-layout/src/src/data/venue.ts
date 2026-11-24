import type { ExitDef, FixedItem, Outlet, Rect } from '../lib/types';

// All distances are metres. Origin is the gym's north-west corner (top-left on
// the plan); x grows east, y grows south.

export const GYM = { w: 30, h: 18 };
export const HALL = { w: 22, h: 3.5, boothDepth: 2 };

export const STAGE: Rect = { x: 27, y: 4, w: 3, h: 8 };

/** The 1.8 m clear corridor from the north exit into the gym (fire marshal). */
export const CORRIDOR: Rect = { x: 21.3, y: 0, w: 1.8, h: 4.5 };

export const EXITS: ExitDef[] = [
  {
    id: 'N',
    label: 'North exit',
    door: { x: 21.0, y: 0, w: 2.4, h: 0.25 },
    clear: CORRIDOR,
  },
  {
    id: 'W',
    label: 'West exit',
    door: { x: 0, y: 7.8, w: 0.25, h: 1.8 },
    clear: { x: 0, y: 7.8, w: 1.5, h: 1.8 },
  },
  {
    id: 'S',
    label: 'South doors (entry)',
    door: { x: 12.6, y: 17.75, w: 2.4, h: 0.25 },
    clear: { x: 12.6, y: 15.35, w: 2.4, h: 2.65 },
  },
  {
    id: 'E',
    label: 'East exit',
    door: { x: 29.75, y: 12.6, w: 0.25, h: 1.8 },
    clear: { x: 28.5, y: 12.6, w: 1.5, h: 1.8 },
  },
];

export const FIXED: FixedItem[] = [
  { id: 'entry', label: 'Entry & cashbox', rect: { x: 12.0, y: 14.6, w: 3.0, h: 0.75 } },
  { id: 'bake', label: 'PTA bake sale', rect: { x: 27.6, y: 15.0, w: 1.8, h: 0.75 } },
  { id: 'raffle', label: 'Raffle', rect: { x: 27.6, y: 16.6, w: 1.8, h: 0.75 } },
];

/** Six wall outlets. Outlets 5 and 6 share one 15 A circuit. */
export const OUTLETS: Outlet[] = [
  { id: 'O1', n: 1, x: 7.5, y: 0, wall: 'N', circuit: 'C1' },
  { id: 'O2', n: 2, x: 13.5, y: 0, wall: 'N', circuit: 'C2' },
  { id: 'O3', n: 3, x: 0, y: 3.9, wall: 'W', circuit: 'C3' },
  { id: 'O4', n: 4, x: 0, y: 14.0, wall: 'W', circuit: 'C4' },
  { id: 'O5', n: 5, x: 20, y: 18, wall: 'S', circuit: 'C5' },
  { id: 'O6', n: 6, x: 28, y: 18, wall: 'S', circuit: 'C5' },
];

/** A booth must stay at least this far (edge to edge) from a keep-away vendor. */
export const KEEP_AWAY_M = 2.0;
/** A powered booth must be within this distance (a 2 m cord) of its outlet. */
export const OUTLET_REACH_M = 2.0;
/** Folding tables available for the whole market. */
export const TABLES_TOTAL = 44;
/** Tables used by fixed items (bake sale, raffle, entry). */
export const TABLES_FIXED = 3;

export const FEE = { full: 35, hallway: 20 };

export const MARKET = {
  title: "Elm Street PTA Winter Makers' Market",
  dateLabel: 'Saturday, December 5, 2026',
  shortDate: 'Sat 5 Dec 2026',
  dateISO: '2026-12-05T00:00:00',
  venueLabel: 'Gym and front hallway',
  feesCollected: 1480,
};
