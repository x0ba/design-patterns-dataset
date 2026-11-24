export type Lang = 'en' | 'es' | 'vi' | 'tl';
export type BuildingId = 'MB' | 'HVP' | 'WC' | 'OC' | 'GAR';
export type Pace = 'slow' | 'standard';

/** Vertical squeeze so the schematic map is closer to square (design coordinates in, map coordinates out). */
const YMAP: [number, number][] = [[0, 0], [30, 20], [170, 115], [200, 145], [400, 325], [470, 375], [580, 475], [620, 495]];
export function ty(y: number): number {
  for (let i = 0; i < YMAP.length - 1; i++) {
    const [a, A] = YMAP[i];
    const [b, B] = YMAP[i + 1];
    if (y <= b) return A + ((y - a) / (b - a)) * (B - A);
  }
  return y;
}
const R = (x: number, y: number, w: number, h: number) => ({ x, y: ty(y), w, h: ty(y + h) - ty(y) });
export const MAP_H = 495;

export interface Building {
  id: BuildingId;
  levels: number;
  rect: { x: number; y: number; w: number; h: number };
  name: Record<Lang, string>;
  short: Record<Lang, string>;
}

export const BUILDINGS: Record<BuildingId, Building> = {
  MB: {
    id: 'MB',
    levels: 4,
    rect: R(30, 200, 220, 200),
    name: {
      en: 'Main Building',
      es: 'Edificio Principal',
      vi: 'Tòa nhà chính',
      tl: 'Pangunahing Gusali',
    },
    short: { en: 'Main Building', es: 'Edificio Principal', vi: 'Tòa nhà chính', tl: 'Main Building' },
  },
  HVP: {
    id: 'HVP',
    levels: 4,
    rect: R(330, 200, 200, 200),
    name: {
      en: 'Heart & Vascular Pavilion',
      es: 'Pabellón del Corazón y Vascular',
      vi: 'Tòa nhà Tim mạch',
      tl: 'Heart & Vascular Pavilion',
    },
    short: { en: 'Pavilion', es: 'Pabellón', vi: 'Tòa Tim mạch', tl: 'Pavilion' },
  },
  WC: {
    id: 'WC',
    levels: 3,
    rect: R(30, 30, 220, 140),
    name: {
      en: 'Women’s & Children’s',
      es: 'Edificio de la Mujer y el Niño',
      vi: 'Tòa Phụ nữ & Trẻ em',
      tl: 'Gusali para sa Kababaihan at mga Bata',
    },
    short: { en: 'Women’s & Children’s', es: 'Mujer y Niño', vi: 'Phụ nữ & Trẻ em', tl: 'Women’s & Children’s' },
  },
  OC: {
    id: 'OC',
    levels: 3,
    rect: R(200, 470, 330, 110),
    name: {
      en: 'Outpatient Center',
      es: 'Centro de Consultas Externas',
      vi: 'Trung tâm Ngoại trú',
      tl: 'Outpatient Center',
    },
    short: { en: 'Outpatient Center', es: 'Consultas Externas', vi: 'Trung tâm Ngoại trú', tl: 'Outpatient Center' },
  },
  GAR: {
    id: 'GAR',
    levels: 5,
    rect: R(30, 450, 140, 130),
    name: {
      en: 'Parking Garage P1',
      es: 'Estacionamiento P1',
      vi: 'Bãi đỗ xe P1',
      tl: 'Parking Garage P1',
    },
    short: { en: 'Garage P1', es: 'Estacionamiento P1', vi: 'Bãi đỗ xe P1', tl: 'Garage P1' },
  },
};

export type NodeTag =
  | 'hub'
  | 'A'
  | 'B'
  | 'entrance'
  | 'east'
  | 'west'
  | 'north'
  | 'south'
  | 'northW'
  | 'northE'
  | 'skyE'
  | 'skyW'
  | 'skyN'
  | 'skyS'
  | 'exit'
  | 'sky'
  | 'eastDoor';

export interface GNode {
  id: string;
  b: BuildingId;
  level: number;
  tag: NodeTag;
  x: number;
  y: number;
}

export type EdgeKind = 'walk' | 'elevator' | 'stairs' | 'sky';
export type Via = 'corridor' | 'link' | 'plaza' | 'connector' | 'steps' | 'sky';

export interface Edge {
  id: string;
  a: string;
  b: string;
  m: number;
  kind: EdgeKind;
  via: Via;
  stepFree: boolean;
  bank?: string; // e.g. 'HVP-B'
  closure?: string;
  levels?: number; // floors travelled (elevator / stairs)
}

export interface Closure {
  id: string;
  kind: 'elevator' | 'skybridge' | 'doors';
  b: BuildingId;
  level?: number;
  from: string; // ISO date
  to: string;
  // marker position on the map for this level
  at: { x: number; y: number };
  levelsShown: number[];
}

export const CLOSURES: Closure[] = [
  { id: 'hvp-bank-b', kind: 'elevator', b: 'HVP', from: '2026-11-14', to: '2026-11-20', at: { x: 500, y: ty(270) }, levelsShown: [1, 2, 3, 4] },
  { id: 'sky-main-pavilion', kind: 'skybridge', b: 'MB', level: 2, from: '2026-11-02', to: '2026-12-03', at: { x: 290, y: ty(235) }, levelsShown: [2] },
  { id: 'oc-east-doors', kind: 'doors', b: 'OC', level: 1, from: '2026-11-09', to: '2026-11-24', at: { x: 530, y: ty(525) }, levelsShown: [1] },
];

/* ---------- graph construction ---------- */

export const NODES = new Map<string, GNode>();
export const EDGES: Edge[] = [];
export const ADJ = new Map<string, Edge[]>();

const nid = (b: BuildingId, l: number, tag: string) => `${b}-${l}-${tag}`;

function node(b: BuildingId, level: number, tag: NodeTag, x: number, y: number) {
  const id = nid(b, level, tag);
  NODES.set(id, { id, b, level, tag, x, y: ty(y) });
  return id;
}

let eseq = 0;
function edge(a: string, b: string, m: number, o: Partial<Edge> = {}) {
  const e: Edge = { id: `e${++eseq}`, a, b, m, kind: 'walk', via: 'corridor', stepFree: true, ...o };
  EDGES.push(e);
  return e;
}

function lobbies(b: BuildingId, levels: number, hub: [number, number], A: [number, number], B: [number, number] | null, dA: number, dB: number) {
  for (let l = 1; l <= levels; l++) {
    node(b, l, 'hub', ...hub);
    node(b, l, 'A', ...A);
    edge(nid(b, l, 'hub'), nid(b, l, 'A'), dA);
    if (B) {
      node(b, l, 'B', ...B);
      edge(nid(b, l, 'hub'), nid(b, l, 'B'), dB);
    }
  }
  // elevator banks: ride between any two levels
  const banks = B ? ['A', 'B'] : ['A'];
  for (const k of banks) {
    for (let l1 = 1; l1 <= levels; l1++)
      for (let l2 = l1 + 1; l2 <= levels; l2++) {
        const bank = `${b}-${k}`;
        edge(nid(b, l1, k), nid(b, l2, k), 8 * (l2 - l1), {
          kind: 'elevator',
          bank,
          levels: l2 - l1,
          closure: bank === 'HVP-B' ? 'hvp-bank-b' : undefined,
        });
      }
  }
  // stairs beside the hub (not step-free)
  for (let l = 1; l < levels; l++)
    edge(nid(b, l, 'hub'), nid(b, l + 1, 'hub'), 14, { kind: 'stairs', via: 'steps', stepFree: false, levels: 1 });
}

// Main Building
lobbies('MB', 4, [140, 310], [75, 280], [205, 280], 40, 40);
node('MB', 1, 'entrance', 140, 400);
node('MB', 1, 'east', 250, 310);
node('MB', 1, 'north', 140, 200);
node('MB', 1, 'south', 230, 400);
node('MB', 2, 'skyE', 250, 235);
node('MB', 2, 'skyN', 140, 200);
edge('MB-1-entrance', 'MB-1-hub', 45);
edge('MB-1-hub', 'MB-1-east', 75);
edge('MB-1-hub', 'MB-1-north', 100);
edge('MB-1-hub', 'MB-1-south', 90);
edge('MB-2-hub', 'MB-2-skyE', 80);
edge('MB-2-hub', 'MB-2-skyN', 75);

// Heart & Vascular Pavilion
lobbies('HVP', 4, [430, 300], [360, 270], [500, 270], 40, 35);
node('HVP', 1, 'west', 330, 310);
node('HVP', 1, 'entrance', 460, 200);
node('HVP', 1, 'south', 430, 400);
node('HVP', 2, 'skyW', 330, 235);
edge('HVP-1-west', 'HVP-1-A', 25);
edge('HVP-1-west', 'HVP-1-hub', 45);
edge('HVP-1-entrance', 'HVP-1-hub', 70);
edge('HVP-1-hub', 'HVP-1-south', 100);
edge('HVP-2-skyW', 'HVP-2-A', 20);

// Women's & Children's
lobbies('WC', 3, [140, 125], [75, 110], [205, 110], 40, 40);
node('WC', 1, 'entrance', 140, 30);
node('WC', 1, 'south', 140, 170);
node('WC', 2, 'skyS', 140, 170);
edge('WC-1-entrance', 'WC-1-hub', 40);
edge('WC-1-hub', 'WC-1-south', 60);
edge('WC-2-hub', 'WC-2-skyS', 60);

// Outpatient Center
lobbies('OC', 3, [365, 525], [280, 500], [450, 500], 45, 45);
node('OC', 1, 'entrance', 365, 580);
node('OC', 1, 'eastDoor', 530, 525);
node('OC', 1, 'northW', 230, 470);
node('OC', 1, 'northE', 430, 470);
node('OC', 2, 'skyW', 200, 525);
edge('OC-1-entrance', 'OC-1-hub', 50);
edge('OC-1-eastDoor', 'OC-1-hub', 85, { closure: 'oc-east-doors' });
edge('OC-1-hub', 'OC-1-northW', 80);
edge('OC-1-hub', 'OC-1-northE', 70);
edge('OC-2-hub', 'OC-2-skyW', 85);

// Parking Garage P1
for (let l = 1; l <= 5; l++) {
  node('GAR', l, 'hub', 125, 515);
  node('GAR', l, 'A', 125, 485);
  edge(nid('GAR', l, 'hub'), nid('GAR', l, 'A'), 25);
}
for (let l1 = 1; l1 <= 5; l1++)
  for (let l2 = l1 + 1; l2 <= 5; l2++)
    edge(nid('GAR', l1, 'A'), nid('GAR', l2, 'A'), 8 * (l2 - l1), { kind: 'elevator', bank: 'GAR-A', levels: l2 - l1 });
for (let l = 1; l < 5; l++)
  edge(nid('GAR', l, 'hub'), nid('GAR', l + 1, 'hub'), 14, { kind: 'stairs', via: 'steps', stepFree: false, levels: 1 });
node('GAR', 1, 'exit', 125, 450);
node('GAR', 2, 'sky', 170, 525);
edge('GAR-1-exit', 'GAR-1-hub', 40);
edge('GAR-2-hub', 'GAR-2-sky', 45);

// Connections between buildings
edge('MB-1-east', 'HVP-1-west', 70, { via: 'link' });
edge('MB-2-skyE', 'HVP-2-skyW', 55, { kind: 'sky', via: 'sky', closure: 'sky-main-pavilion' });
edge('MB-2-skyN', 'WC-2-skyS', 40, { kind: 'sky', via: 'sky' });
edge('MB-1-north', 'WC-1-south', 45, { via: 'steps', stepFree: false }); // older north connector: 4 steps
edge('MB-1-south', 'OC-1-northW', 60, { via: 'connector' });
edge('HVP-1-south', 'OC-1-northE', 55, { via: 'connector' });
edge('OC-2-skyW', 'GAR-2-sky', 35, { kind: 'sky', via: 'sky' });
edge('GAR-1-exit', 'MB-1-entrance', 80, { via: 'plaza' });

for (const e of EDGES) {
  for (const [from] of [[e.a], [e.b]]) if (!ADJ.has(from)) ADJ.set(from, []);
  ADJ.get(e.a)!.push(e);
  ADJ.get(e.b)!.push(e);
}

export interface Kiosk {
  id: string;
  node: string;
  closedBy?: string;
  name: Record<Lang, string>;
}

export const KIOSKS: Kiosk[] = [
  {
    id: 'main',
    node: 'MB-1-entrance',
    name: { en: 'Main Entrance', es: 'Entrada Principal', vi: 'Cổng chính', tl: 'Pangunahing Pasukan' },
  },
  {
    id: 'pavilion',
    node: 'HVP-1-entrance',
    name: { en: 'Pavilion Entrance', es: 'Entrada del Pabellón', vi: 'Cổng Tòa Tim mạch', tl: 'Pasukan ng Pavilion' },
  },
  {
    id: 'wc',
    node: 'WC-1-entrance',
    name: { en: 'Women’s & Children’s Entrance', es: 'Entrada de Mujer y Niño', vi: 'Cổng Tòa Phụ nữ & Trẻ em', tl: 'Pasukan ng Women’s & Children’s' },
  },
  {
    id: 'oc-south',
    node: 'OC-1-entrance',
    name: { en: 'Outpatient Center South Entrance', es: 'Entrada Sur de Consultas Externas', vi: 'Cổng Nam Trung tâm Ngoại trú', tl: 'South Entrance ng Outpatient Center' },
  },
  {
    id: 'oc-east',
    node: 'OC-1-eastDoor',
    closedBy: 'oc-east-doors',
    name: { en: 'Outpatient Center East Doors', es: 'Puertas Este de Consultas Externas', vi: 'Cửa Đông Trung tâm Ngoại trú', tl: 'East Doors ng Outpatient Center' },
  },
  {
    id: 'garage',
    node: 'GAR-1-exit',
    name: { en: 'Parking Garage P1, Level 1 Walkway', es: 'Estacionamiento P1, Pasarela del Nivel 1', vi: 'Bãi đỗ xe P1, lối đi Tầng 1', tl: 'Parking Garage P1, Walkway sa Level 1' },
  },
];

export const SPEED: Record<Pace, number> = { slow: 0.7, standard: 1.3 }; // metres / second
const ELEV: Record<Pace, { wait: number; perLevel: number }> = {
  slow: { wait: 80, perLevel: 12 },
  standard: { wait: 45, perLevel: 10 },
};
const STAIR: Record<Pace, number> = { slow: 75, standard: 30 };

export function edgeSeconds(e: Edge, pace: Pace): number {
  if (e.kind === 'elevator') return ELEV[pace].wait + ELEV[pace].perLevel * (e.levels ?? 1);
  if (e.kind === 'stairs') return STAIR[pace];
  return e.m / SPEED[pace];
}

/* ---------- dates / closures ---------- */

// The kiosk opens on a Monday morning in the closure window.
export const SIM_START = new Date(2026, 10, 16, 10, 12, 0);

export function closureActive(c: Closure, now: Date): boolean {
  const from = new Date(c.from + 'T00:00:00');
  const to = new Date(c.to + 'T23:59:59');
  return now >= from && now <= to;
}

export function activeClosureIds(now: Date): Set<string> {
  return new Set(CLOSURES.filter((c) => closureActive(c, now)).map((c) => c.id));
}
