import type { Doc, El, Finishes, Version } from './types';

const base = {
  kind: 'text' as const,
  arc: 0,
  wd: 1,
  tracking: 0,
  leading: 1.8,
  visible: true,
  locked: false,
};

export const finishes: Finishes = {
  leafKarat: '23k',
  side: 'surface',
  center: 'matte',
  bookPrice: 92,
  wastePct: 8,
  enamel: 'black',
};

export const workingElements: El[] = [
  {
    ...base,
    id: 'script',
    name: 'Main script',
    lines: ['Hollis & Daughter'],
    font: 'yellowtail',
    cap: 9,
    arc: 14,
    wd: 0.7,
    x: 36,
    y: 62.5,
    fill: 'gold',
    outline: { on: true, w: 0.2 },
    shade: { on: true, dist: 0.45, angle: 315 },
  },
  {
    ...base,
    id: 'bakery',
    name: 'Secondary line',
    lines: ['BAKERY · EST. 2026'],
    font: 'barlow',
    cap: 3,
    tracking: 0.12,
    x: 36,
    y: 52.25,
    fill: 'gold',
    outline: { on: true, w: 0.06 },
    shade: { on: false, dist: 0.2, angle: 315 },
  },
  {
    ...base,
    id: 'sheaf',
    name: 'Wheat-sheaf ornament',
    kind: 'ornament',
    lines: [],
    font: 'barlow',
    cap: 15,
    x: 17,
    y: 27,
    fill: 'gold',
    outline: { on: true, w: 0.05 },
    shade: { on: false, dist: 0.25, angle: 315 },
  },
  {
    ...base,
    id: 'hours',
    name: 'Hours block',
    lines: ['TUE–SUN  7AM–3PM', 'CLOSED MON'],
    font: 'oswald',
    cap: 1.75,
    tracking: 0.06,
    leading: 1.85,
    x: 54,
    y: 44.75,
    fill: 'enamel',
    outline: { on: false, w: 0.05 },
    shade: { on: false, dist: 0.1, angle: 315 },
  },
  {
    ...base,
    id: 'phone',
    name: 'Phone line',
    lines: ['(619) 555-0142'],
    font: 'barlow',
    cap: 1.5,
    tracking: 0.08,
    x: 54,
    y: 39.9,
    fill: 'enamel',
    outline: { on: false, w: 0.04 },
    shade: { on: false, dist: 0.08, angle: 315 },
  },
];

export const workingDoc: Doc = { elements: workingElements, finishes };

/** The Nov 12 proposal, kept for comparison. */
const nov12Elements: El[] = [
  {
    ...workingElements[0],
    lines: ['Hollis & Daughters'],
    cap: 7.5,
    arc: 10,
    y: 64,
    outline: { on: true, w: 0.16 },
    shade: { on: true, dist: 0.35, angle: 315 },
  },
  { ...workingElements[1], y: 54 },
  { ...workingElements[2], cap: 13, x: 54, y: 26 },
  {
    ...workingElements[3],
    cap: 2,
    x: 17,
    y: 32,
    lines: ['TUE–SUN  7AM–3PM', 'CLOSED MONDAYS'],
  },
];

export const nov12: Version = {
  id: 'nov12',
  label: 'Proposal v1',
  date: 'Nov 12',
  note: 'First presentation to Margaret Hollis',
  doc: { elements: nov12Elements, finishes: { ...finishes } },
};
