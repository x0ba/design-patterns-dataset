// Stylised map of the Eastbank neighbourhoods (not to scale).
export const VIEW = { w: 800, h: 500 }

export const VSTREETS = [
  { key: 'W', name: 'Water St', x: 135 },
  { key: 'M', name: 'Mill St', x: 235 },
  { key: 'L', name: 'Linden Ave', x: 335 },
  { key: 'A', name: 'Alder St', x: 435 },
  { key: 'S', name: 'Sycamore Ave', x: 535 },
  { key: 'R', name: 'Ridge Rd', x: 635 },
]
export const HSTREETS = [
  { n: 8, y: 60 },
  { n: 10, y: 140 },
  { n: 12, y: 220 },
  { n: 14, y: 300 },
  { n: 16, y: 380 },
  { n: 18, y: 460 },
]
const VX = Object.fromEntries(VSTREETS.map((s) => [s.key, s]))
const HY = Object.fromEntries(HSTREETS.map((s) => [s.n, s.y]))
const ordinal = (n) => `${n}th St`

// sensor on a north-south street, in the block that starts at cross street `n`
const v = (key, n, side, frac = 0.5) => ({
  x: VX[key].x + side * 13,
  y: HY[n] + frac * 80,
  block: `${n}00 block of ${VX[key].name}`,
})
// sensor on an east-west street, in the block starting at vertical street index `i` (1 = Water..Mill)
const h = (n, i, side, frac = 0.5) => ({
  x: VSTREETS[i - 1].x + frac * 100,
  y: HY[n] + side * 13,
  block: `${i}00 block of ${ordinal(n)}`,
})

// [key, neighbourhood, position]
const RAW = [
  // Linden (school area first)
  ['L-s1', 'Linden', v('L', 12, -1, 0.55), 17],
  ['L-s2', 'Linden', h(14, 3, 1, 0.25), 16],
  ['L-s3', 'Linden', h(12, 3, -1, 0.6), 18],
  ['L-s4', 'Linden', v('A', 12, -1, 0.5), 19],
  ['L-s5', 'Linden', v('L', 14, -1, 0.2), 20],
  ['L6', 'Linden', v('M', 12, 1, 0.4)],
  ['L7', 'Linden', h(10, 2, 1, 0.5)],
  ['L8', 'Linden', v('L', 10, -1, 0.5)],
  ['L9', 'Linden', v('M', 14, 1, 0.5)],
  ['L10', 'Linden', v('M', 10, -1, 0.5)],
  ['L11', 'Linden', h(14, 2, -1, 0.5)],
  ['L12', 'Linden', h(10, 3, -1, 0.3)],
  // Foundry Row
  ['F1', 'Foundry Row', h(8, 2, 1, 0.5)],
  ['F2', 'Foundry Row', h(8, 3, -1, 0.35)],
  ['F3', 'Foundry Row', v('A', 8, -1, 0.5)],
  ['F4', 'Foundry Row', v('M', 8, 1, 0.6)],
  ['F5', 'Foundry Row', v('L', 8, 1, 0.5)],
  // Millrace
  ['M1', 'Millrace', v('W', 10, 1, 0.5)],
  ['M2', 'Millrace', v('W', 12, -1, 0.3)],
  ['M3', 'Millrace', h(12, 1, 1, 0.5)],
  ['M4', 'Millrace', v('W', 8, 1, 0.5)],
  ['M5', 'Millrace', h(10, 1, -1, 0.5)],
  ['M6', 'Millrace', v('W', 14, 1, 0.4)],
  ['M7', 'Millrace', h(14, 1, 1, 0.6)],
  ['M8', 'Millrace', v('M', 12, -1, 0.8)],
  // Alder Terrace
  ['A1', 'Alder Terrace', v('A', 12, 1, 0.75)],
  ['A2', 'Alder Terrace', v('A', 10, 1, 0.5)],
  ['A3', 'Alder Terrace', h(12, 4, -1, 0.5)],
  ['A4', 'Alder Terrace', h(14, 4, 1, 0.4)],
  ['A5', 'Alder Terrace', v('S', 12, -1, 0.3)],
  ['A6', 'Alder Terrace', v('S', 10, -1, 0.5)],
  ['A7', 'Alder Terrace', v('A', 14, 1, 0.6)],
  ['A8', 'Alder Terrace', h(16, 4, -1, 0.5)],
  // Sycamore Hill
  ['S1', 'Sycamore Hill', v('S', 8, 1, 0.5)],
  ['S2', 'Sycamore Hill', v('S', 12, 1, 0.5)],
  ['S3', 'Sycamore Hill', v('R', 10, -1, 0.5)],
  ['S4', 'Sycamore Hill', v('R', 14, -1, 0.5)],
  ['S5', 'Sycamore Hill', h(12, 5, 1, 0.5)],
  ['S6', 'Sycamore Hill', v('R', 16, -1, 0.5)],
  // Cooper's Ferry
  ['C1', "Cooper's Ferry", v('W', 16, 1, 0.5)],
  ['C2', "Cooper's Ferry", h(16, 1, 1, 0.5)],
  ['C3', "Cooper's Ferry", h(16, 2, -1, 0.5)],
  ['C4', "Cooper's Ferry", v('L', 16, 1, 0.5)],
  ['C5', "Cooper's Ferry", h(18, 2, -1, 0.5)],
  ['C6', "Cooper's Ferry", h(18, 3, 1, 0.5)],
  ['C7', "Cooper's Ferry", v('M', 16, 1, 0.5)],
]

// Remaining ids (1-46 minus the school cluster) in the order sensors joined the network.
const FIXED = new Set(RAW.filter((r) => r[3]).map((r) => r[3]))
const pool = []
for (let i = 1; i <= 46; i++) if (!FIXED.has(i)) pool.push(i)
// deterministic shuffle so ids don't line up with neighbourhoods
let seed = 7
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1))
  ;[pool[i], pool[j]] = [pool[j], pool[i]]
}
let pi = 0
export const SENSORS = RAW.map(([key, hood, p, fixedId]) => {
  const num = fixedId ?? pool[pi++]
  return {
    key,
    num,
    id: `EB-${String(num).padStart(3, '0')}`,
    hood,
    block: p.block,
    x: Math.round(p.x),
    y: Math.round(p.y),
    school: key.startsWith('L-s'),
  }
}).sort((a, b) => a.num - b.num)

export const SENSOR_BY_KEY = Object.fromEntries(SENSORS.map((s) => [s.key, s]))

export const REGIONAL = {
  id: 'REG-1',
  name: 'Regional monitor',
  place: 'Delmar Rd station · 3.4 km southeast',
}

export const SCHOOL = { x: 352, y: 232, w: 58, h: 58, label: 'Linden Elementary' }
export const HOTSPOT = { x: 345, y: 278 }

export const HOODS = [
  { lines: ['FOUNDRY ROW'], x: 485, y: 26 },
  { lines: ['MILLRACE'], x: 186, y: 362 },
  { lines: ['LINDEN'], x: 271, y: 213 },
  { lines: ['ALDER', 'TERRACE'], x: 498, y: 280 },
  { lines: ['SYCAMORE', 'HILL'], x: 655, y: 86 },
  { lines: ["COOPER'S FERRY"], x: 160, y: 484 },
]

export const LANDMARKS = [
  { kind: 'park', x: 350, y: 148, w: 72, h: 64, label: 'Linden Park', lx: 386, ly: 182 },
  { kind: 'park', x: 442, y: 388, w: 86, h: 66, label: 'Alder Commons', lx: 485, ly: 423 },
  { kind: 'library', x: 680, y: 206, w: 22, h: 18, label: 'Eastbank Library', lx: 691, ly: 238 },
  { kind: 'rec', x: 544, y: 300, w: 26, h: 18, label: 'Sycamore Rec Center', lx: 557, ly: 345 },
]
