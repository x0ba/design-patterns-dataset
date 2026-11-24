import type { MapId } from './types';

export const GW = 46;
export const GH = 32;

type Rect = [number, number, number, number]; // x0,y0,x1,y1 inclusive tiles

export type AreaKey =
  | 'aLink' | 'defSpawn' | 'backB' | 'doorA' | 'doorMid' | 'doorB' | 'aSite' | 'bSite' | 'mid'
  | 'gantry' | 'catwalk' | 'aMain' | 'bLane' | 'midDoor' | 'slag' | 'slagDoor' | 'lower' | 'attSpawn';

// Base layout, shared geometry. Saltworks is the mirrored variant; Canopy re-uses the bones with
// different cover. Coordinates are tiles; y grows toward the attacker spawn.
const CARVE: [AreaKey, Rect][] = [
  ['doorA', [8, 4, 10, 4]],
  ['doorMid', [22, 4, 25, 4]],
  ['doorB', [35, 4, 37, 4]],
  ['midDoor', [22, 21, 25, 21]],
  ['slagDoor', [22, 25, 25, 26]],
  ['aLink', [5, 1, 16, 3]],
  ['defSpawn', [17, 1, 30, 3]],
  ['backB', [31, 1, 44, 3]],
  ['aSite', [3, 5, 15, 13]],
  ['bSite', [31, 5, 44, 13]],
  ['mid', [20, 5, 27, 20]],
  ['gantry', [16, 11, 19, 12]],
  ['catwalk', [28, 9, 30, 10]],
  ['aMain', [4, 14, 7, 26]],
  ['bLane', [39, 14, 42, 26]],
  ['slag', [17, 22, 30, 24]],
  ['lower', [31, 23, 38, 23]],
  ['attSpawn', [4, 27, 42, 30]],
];

const BLOCKS_COMMON: [number, number][] = [
  [37, 8], [38, 8], [37, 9], [38, 9], // B default box
  [8, 8], [9, 8], [8, 9], [9, 9], // A default box
];
const BLOCKS_FOUNDRY: [number, number][] = [
  [12, 11], [5, 6], [33, 11], [34, 11], [42, 6], [23, 10], [24, 10], [21, 16], [26, 16], [20, 23], [27, 23], [15, 28], [30, 28],
];
const BLOCKS_CANOPY: [number, number][] = [
  [13, 7], [13, 8], [5, 11], [34, 6], [41, 11], [42, 11], [22, 9], [25, 14], [22, 18], [19, 23], [28, 24], [12, 28], [34, 28],
];

export interface MapDef {
  id: MapId;
  name: string;
  mirror: boolean;
  grid: Uint8Array; // 0 floor, 1 wall, 2 cover/crate
  names: Record<AreaKey, string>;
  siteName: { A: string; B: string };
  palette: {
    wall: [number, number, number];
    wall2: [number, number, number];
    crate: [number, number, number];
    floor: [number, number, number];
    sky: [number, number, number];
    skyTop: [number, number, number];
    fog: [number, number, number];
    fogDist: number;
    topFloor: string;
    topWall: string;
  };
}

const NAMES: Record<MapId, Record<AreaKey, string>> = {
  foundry: {
    aLink: 'A Link', defSpawn: 'Defender Spawn', backB: 'Back Kiln', doorA: 'A Door', doorMid: 'Mid Door',
    doorB: 'Kiln Door', aSite: 'A Site (Crucible)', bSite: 'B Site (Kiln)', mid: 'Conveyor', gantry: 'Gantry',
    catwalk: 'Catwalk', aMain: 'A Main', bLane: 'B Lane', midDoor: 'Conveyor Mouth', slag: 'Slag Pit',
    slagDoor: 'Pit Ramp', lower: 'Lower Flue', attSpawn: 'Attacker Spawn',
  },
  saltworks: {
    aLink: 'Harbor Link', defSpawn: 'Defender Spawn', backB: 'Back Evap', doorA: 'Pier Gate', doorMid: 'Brine Gate',
    doorB: 'Evap Door', aSite: 'A Site (Pier)', bSite: 'B Site (Evaporator)', mid: 'Brine', gantry: 'Boardwalk',
    catwalk: 'Pipes', aMain: 'Pier Road', bLane: 'Docks', midDoor: 'Brine Mouth', slag: 'Salt Flats',
    slagDoor: 'Flats Ramp', lower: 'Sluice', attSpawn: 'Attacker Spawn',
  },
  canopy: {
    aLink: 'Upper Walk', defSpawn: 'Defender Spawn', backB: 'Back House', doorA: 'Atrium Arch', doorMid: 'Tree Gate',
    doorB: 'House Door', aSite: 'A Site (Atrium)', bSite: 'B Site (Greenhouse)', mid: 'Treeline', gantry: 'Bridge',
    catwalk: 'Vines', aMain: 'A Long', bLane: 'Nursery', midDoor: 'Root Gap', slag: 'Hollow',
    slagDoor: 'Hollow Steps', lower: 'Drainage', attSpawn: 'Attacker Spawn',
  },
};

function buildGrid(mirror: boolean, blocks: [number, number][]) {
  const g = new Uint8Array(GW * GH).fill(1);
  const set = (x: number, y: number, v: number) => {
    const xx = mirror ? GW - 1 - x : x;
    if (xx >= 0 && xx < GW && y >= 0 && y < GH) g[y * GW + xx] = v;
  };
  for (const [, [x0, y0, x1, y1]] of CARVE) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, 0);
  for (const [x, y] of [...BLOCKS_COMMON, ...blocks]) set(x, y, 2);
  return g;
}

export const MAPS: Record<MapId, MapDef> = {
  foundry: {
    id: 'foundry', name: 'Foundry', mirror: false,
    grid: buildGrid(false, BLOCKS_FOUNDRY), names: NAMES.foundry,
    siteName: { A: 'A (Crucible)', B: 'B (Kiln)' },
    palette: {
      wall: [112, 92, 78], wall2: [86, 74, 68], crate: [128, 104, 58], floor: [58, 55, 54],
      sky: [64, 52, 50], skyTop: [24, 22, 26], fog: [46, 40, 40], fogDist: 22,
      topFloor: '#2b2a2c', topWall: '#141417',
    },
  },
  saltworks: {
    id: 'saltworks', name: 'Saltworks', mirror: true,
    grid: buildGrid(true, BLOCKS_FOUNDRY), names: NAMES.saltworks,
    siteName: { A: 'A (Pier)', B: 'B (Evaporator)' },
    palette: {
      wall: [168, 176, 182], wall2: [130, 142, 150], crate: [92, 120, 132], floor: [96, 102, 106],
      sky: [150, 172, 186], skyTop: [74, 98, 120], fog: [128, 146, 158], fogDist: 26,
      topFloor: '#2a3034', topWall: '#13171a',
    },
  },
  canopy: {
    id: 'canopy', name: 'Canopy', mirror: false,
    grid: buildGrid(false, BLOCKS_CANOPY), names: NAMES.canopy,
    siteName: { A: 'A (Atrium)', B: 'B (Greenhouse)' },
    palette: {
      wall: [86, 110, 78], wall2: [70, 88, 70], crate: [112, 92, 64], floor: [62, 70, 56],
      sky: [120, 146, 116], skyTop: [44, 66, 52], fog: [78, 96, 80], fogDist: 20,
      topFloor: '#272d27', topWall: '#121512',
    },
  },
};

export function tileAt(m: MapDef, x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= GW || iy >= GH) return 1;
  return m.grid[iy * GW + ix];
}

/** Coordinates in mock data are authored in base layout; mirror for Saltworks. */
export function mx(m: MapDef, x: number) {
  return m.mirror ? GW - x : x;
}
export function mAngle(m: MapDef, a: number) {
  return m.mirror ? 180 - a : a;
}

export function areaKeyAt(m: MapDef, x: number, y: number): AreaKey {
  const bx = m.mirror ? GW - x : x;
  for (const [k, [x0, y0, x1, y1]] of CARVE) {
    if (bx >= x0 && bx < x1 + 1 && y >= y0 && y < y1 + 1) return k;
  }
  // fall back to nearest rect center
  let best: AreaKey = 'mid', bd = Infinity;
  for (const [k, [x0, y0, x1, y1]] of CARVE) {
    const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2;
    const d = (cx - bx) ** 2 + (cy - y) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

export function areaAt(m: MapDef, x: number, y: number) {
  return m.names[areaKeyAt(m, x, y)].replace(/ \(.*\)/, '');
}

export const LABEL_AREAS: AreaKey[] = ['mid', 'aMain', 'bLane', 'backB', 'aLink', 'defSpawn', 'catwalk', 'gantry', 'slag', 'attSpawn'];

export function areaCenter(m: MapDef, k: AreaKey): [number, number] {
  const r = CARVE.find((c) => c[0] === k)![1];
  const cx = (r[0] + r[2] + 1) / 2;
  return [m.mirror ? GW - cx : cx, (r[1] + r[3] + 1) / 2];
}
