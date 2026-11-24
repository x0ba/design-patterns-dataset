// Property geometry for the Sørby cabin, Ten Mile Lake, Hackensack MN.
// Site coordinates: metres, x east, y north, origin at the lake-side lot corner.
// Floor-plan coordinates: metres inside the cabin footprint, origin at the SW corner, y north.

export const PROPERTY = {
  name: 'Sørby cabin',
  place: 'Ten Mile Lake, Hackensack MN',
  acres: 2.3,
};

// Main cabin footprint on the site (SW corner) — plans map as site = origin + plan.
export const CABIN_ORIGIN = { x: 38, y: 36 };
export const CABIN_SIZE = { w: 14, h: 9 };

// Site features. Shapes are in site metres.
export const BUILDINGS = [
  { id: 'cabin', name: 'Main cabin', sub: '2 floors + crawlspace', x: 38, y: 36, w: 14, h: 9, plan: true },
  { id: 'bunkhouse', name: 'Guest bunkhouse', sub: 'Site only', x: 58, y: 34, w: 7, h: 6 },
  { id: 'boathouse', name: 'Boathouse', sub: 'Site only', x: 70, y: 9, w: 8, h: 6 },
  { id: 'woodshed', name: 'Woodshed', sub: 'Site only', x: 30, y: 60, w: 6, h: 4 },
  { id: 'outhouse', name: 'Outhouse', sub: 'Site only', x: 70, y: 60, w: 2, h: 2 },
];

// Boathouse centre is the reference point people use for "where is it".
export const BOATHOUSE_REF = { id: 'ref-boathouse', name: 'Boathouse', x: 74, y: 12 };

export const SITE = {
  lot: { x: 0, y: 8, w: 104, h: 89 }, // about 9,300 m² (2.3 acres)
  lake: { y: -12, h: 20 },            // shoreline at y = 8
  road: { y: 97, h: 6 },
  driveway: [
    { x: 18, y: 97 },
    { x: 22, y: 80 },
    { x: 25, y: 62 },
    { x: 27, y: 46 },
    { x: 26, y: 26 },
    { x: 24, y: 18 },
  ],
  dock: { x: 73.8, y: -4, w: 2.4, h: 12 },
  birchClump: { x: 14, y: 52, r: 3.6 },
  trees: [
    { x: 4, y: 84, r: 3 },
    { x: 92, y: 80, r: 4 },
    { x: 96, y: 46, r: 3.4 },
    { x: 88, y: 26, r: 4.5 },
    { x: 100, y: 62, r: 3.2 },
    { x: 58, y: 70, r: 4.2 },
    { x: 10, y: 22, r: 3.8 },
  ],
  wellStake: { x: 9, y: 40 },
};

// Floors of the main cabin. Rooms are rectangles: x, y, w, h in plan metres.
export const FLOORS = {
  ground: {
    id: 'ground',
    label: 'Ground floor',
    w: 14,
    h: 9,
    rooms: [
      { id: 'mudroom', name: 'Mudroom', x: 0, y: 6, w: 3.5, h: 3, lx: 0.15, ly: 6.2 },
      { id: 'utility', name: 'Utility room', x: 3.5, y: 6, w: 2.5, h: 3, lx: 3.6, ly: 6.1 },
      { id: 'kitchen', name: 'Kitchen', x: 6, y: 6, w: 4, h: 3, lx: 6.15, ly: 8.72 },
      { id: 'bath1', name: 'Bath 1', x: 10, y: 6, w: 4, h: 3, lx: 10.15, ly: 6.1 },
      { id: 'living', name: 'Living room', x: 0, y: 0, w: 9, h: 6, lx: 0.15, ly: 0.25 },
      { id: 'bed1', name: 'Bedroom 1', x: 9, y: 0, w: 5, h: 6, lx: 9.15, ly: 0.25 },
    ],
  },
  upper: {
    id: 'upper',
    label: 'Upper floor',
    w: 14,
    h: 9,
    rooms: [
      { id: 'bed2', name: 'Bedroom 2', x: 0, y: 0, w: 6, h: 9, lx: 0.15, ly: 0.25 },
      { id: 'bath2', name: 'Bath 2', x: 6, y: 4, w: 3, h: 5, lx: 6.15, ly: 4.2 },
      { id: 'bed3', name: 'Bedroom 3', x: 9, y: 0, w: 5, h: 9, lx: 9.15, ly: 0.25 },
    ],
    // The stair void between Bedroom 2 and Bedroom 3 is not a room, so it is drawn unlabelled.
    stair: { x: 6, y: 0, w: 3, h: 4 },
  },
  crawl: {
    id: 'crawl',
    label: 'Crawlspace',
    w: 14,
    h: 9,
    rooms: [{ id: 'crawl', name: 'Crawlspace', x: 0, y: 0, w: 14, h: 9, lx: 0.15, ly: 0.3 }],
    // The north hatch is an exterior access door in the north foundation wall.
    hatch: { x: 6, y: 9, w: 1.5 },
  },
};

export const ROOM_BY_ID = Object.fromEntries(
  Object.values(FLOORS).flatMap((f) => f.rooms.map((r) => [r.id, { ...r, floor: f.id }])),
);

export const ROOM_LABEL = Object.fromEntries(
  Object.values(FLOORS).flatMap((f) => f.rooms.map((r) => [r.id, r.name])),
);
