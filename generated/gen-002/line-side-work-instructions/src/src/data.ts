import type { Category, Comment, Doc, LibraryEntry, Person } from './types'

export const ROSTER: Person[] = [
  { id: 'p1', name: 'Dariusz Pell', role: 'Maintenance lead' },
  { id: 'p2', name: 'M. Duarte', role: 'Operator' },
  { id: 'p3', name: 'S. Brandt', role: 'Operator' },
  { id: 'p4', name: 'J. Okonkwo', role: 'Operator' },
  { id: 'p5', name: 'L. Haddad', role: 'Operator' },
  { id: 'p6', name: 'P. Wenzel', role: 'Operator' },
  { id: 'p7', name: 'T. Varga', role: 'Technician' },
  { id: 'p8', name: 'K. Lindqvist', role: 'Technician' },
]

export const INITIAL_DOC: Doc = {
  id: 'OPL-L3-0418',
  title: 'Capper chuck height – 330 ml changeover',
  line: 'Line 3',
  machine: 'Krones-style 18-head capper',
  category: 'Problem Case',
  author: 'Dariusz Pell',
  date: '2026-11-16',
  loto:
    'Isolate the capper at the main switch, close the compressed-air valve and fit your own lock and tag. Press Start to prove it will not run.',
  steps: [
    { id: 's1', text: 'Clear all bottles from the infeed and turret.' },
    { id: 's2', text: 'Lower the chuck carrier to the 330 ml mark on the height scale.' },
    { id: 's3', text: 'Stand height gauge HG-02 on the bottle plate under chuck 1.' },
    { id: 's4', text: 'Turn the height handwheel until the gauge reads 142.5 mm.' },
    { id: 's5', text: 'Tighten the lock nut to 4.5 N·m with the 13 mm spanner.' },
    { id: 's6', text: 'Re-read the gauge at chucks 9 and 18. All must read 142.5 mm.' },
  ],
  note: { text: 'Do not use 500 ml setting of 156 mm', stepId: null },
  photos: [
    { id: 'p1', file: 'IMG_0412', caption: 'Chuck assembly with gauge in place', takenAt: '06:48', kind: 'chuck' },
    { id: 'p2', file: 'IMG_0415', caption: 'Gauge reading at chuck 1: 142.5 mm', takenAt: '06:51', kind: 'gauge' },
  ],
  callouts: [
    { id: 'k1', photoId: 'p1', x: 42, y: 21, label: 'Lock nut (13 mm)', stepId: 's4' },
    { id: 'k2', photoId: 'p1', x: 61, y: 78, label: 'Height gauge HG-02', stepId: 's3' },
    { id: 'k3', photoId: 'p2', x: 71, y: 31, label: 'Reads 142.5 mm', stepId: 's4', side: 't' },
  ],
  tools: ['13 mm spanner', 'Height gauge HG-02'],
  torque: 4.5,
  reviewer: { name: 'R. Osei', role: 'Quality lead' },
  related: ['OPL-L3-0377'],
}

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'cm1',
    author: 'T. Varga',
    time: '07:18',
    text: 'step 4 should say lock nut first',
    target: { kind: 'step', id: 's4' },
    resolved: false,
  },
]

export const TOOL_SUGGESTIONS = [
  'Torque wrench, 1–6 N·m',
  'Personal lock and tag',
  'Lint-free cloth',
  'Gauge calibration block',
]

/* ------------------------------------------------------------------ */
/* Plant library: OPL-L3-0377 plus 214 other approved sheets, Lines 1–5 */
/* ------------------------------------------------------------------ */

export const RELATED_0377: LibraryEntry = {
  id: 'OPL-L3-0377',
  title: 'Capper chuck height – 500 ml changeover',
  line: 3,
  machine: 'Capper',
  category: 'Basic Knowledge',
  approved: '2026-03-12',
  author: 'Dariusz Pell',
  rev: 2,
  steps: [
    'Clear all bottles from the infeed and turret.',
    'Lower the chuck carrier to the 500 ml mark on the height scale.',
    'Stand height gauge HG-02 on the bottle plate under chuck 1.',
    'Loosen the lock nut, then turn the height handwheel until the gauge reads 156 mm.',
    'Tighten the lock nut to 4.5 N·m with the 13 mm spanner.',
    'Re-read the gauge at chucks 9 and 18.',
  ],
}

const FORMAT_BY_LINE: Record<number, string> = {
  1: '1.5 L',
  2: '500 ml',
  3: '500 ml',
  4: '250 ml',
  5: '1 L',
}

// [machine, title (with {fmt} for format changeovers)]
const TOPICS: [string, string][] = [
  ['Filler', 'Filling valve seal change'],
  ['Filler', 'Fill level check against sight gauge'],
  ['Filler', 'Centring tulip inspection'],
  ['Filler', 'Snift valve cleaning'],
  ['Filler', 'CIP cup fit check before cleaning'],
  ['Filler', 'Filling valve lubrication points'],
  ['Filler', 'Star wheel height – {fmt} changeover'],
  ['Filler', 'Product temperature check at filler inlet'],
  ['Capper', 'Cap chute jam clearing'],
  ['Capper', 'Capping torque check with torque tester'],
  ['Capper', 'Cap sorter bowl cleaning'],
  ['Capper', 'Chuck magnetic clutch check'],
  ['Capper', 'Cap sterilising spray nozzle check'],
  ['Capper', 'Capper chuck height – {fmt} changeover'],
  ['Labeller', 'Glue roller scraper setting'],
  ['Labeller', 'Label reel splice'],
  ['Labeller', 'Vacuum drum cleaning'],
  ['Labeller', 'Label height setting – {fmt} changeover'],
  ['Labeller', 'Label gripper cylinder check'],
  ['Rinser', 'Rinser gripper inspection'],
  ['Rinser', 'Rinse water pressure check'],
  ['Rinser', 'Rinser gripper height – {fmt} changeover'],
  ['Blow moulder', 'Preform oven lamp check'],
  ['Blow moulder', 'Mould cooling water flow check'],
  ['Blow moulder', 'Stretch rod change'],
  ['Blow moulder', 'Preform feed chute clearing'],
  ['Palletiser', 'Layer pad magazine reload'],
  ['Palletiser', 'Pallet magazine jam clearing'],
  ['Palletiser', 'Stretch wrapper film change'],
  ['Palletiser', 'Layer gripper vacuum check'],
  ['Conveyor', 'Chain lubrication points'],
  ['Conveyor', 'Guide rail width – {fmt} changeover'],
  ['Conveyor', 'Accumulation table jam clearing'],
  ['Conveyor', 'Air conveyor blower filter cleaning'],
  ['Packer', 'Shrink tunnel temperature check'],
  ['Packer', 'Shrink film splice'],
  ['Packer', 'Case packer glue gun nozzle cleaning'],
  ['Packer', 'Carton magazine reload'],
  ['Inspection', 'Empty bottle inspector reject test'],
  ['Inspection', 'Fill level inspector verification'],
  ['Inspection', 'Date coder ink refill'],
  ['Inspection', 'Checkweigher zero check'],
  ['Inspection', 'Date code legibility check'],
  ['Utilities', 'Compressed air filter drain check'],
  ['Utilities', 'CO₂ supply bottle changeover'],
  ['Utilities', 'CIP cycle start check'],
  ['Utilities', 'Caustic strength titration'],
]

const AUTHORS = [
  'Dariusz Pell', 'A. Novak', 'R. Osei', 'H. Moreau', 'C. Baptiste', 'I. Salazar',
  'F. Eriksen', 'N. Adeyemi', 'B. Kowalski', 'G. Marchetti', 'T. Varga', 'E. Lindgren',
]

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function approvedFor(n: number): string {
  // numbering is chronological: 0377 was approved on 2026-03-12
  const day0 = Date.UTC(2023, 0, 9)
  const d = new Date(day0 + Math.round(n * 3.07) * 86400000)
  return d.toISOString().slice(0, 10)
}

function buildLibrary(): LibraryEntry[] {
  const rnd = mulberry32(418)
  const pairs: [number, number][] = []
  for (let line = 1; line <= 5; line++) for (let t = 0; t < TOPICS.length; t++) pairs.push([line, t])
  // shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }
  const picked = pairs
    .filter(([line, t]) => !(line === 3 && TOPICS[t][1].startsWith('Capper chuck height')))
    .slice(0, 214)

  // 214 distinct sheet numbers between 1 and 417, never 377
  const nums = new Set<number>()
  while (nums.size < 214) {
    const n = 1 + Math.floor(rnd() * 417)
    if (n !== 377) nums.add(n)
  }
  const sorted = [...nums].sort((a, b) => a - b)

  return picked.map(([line, t], i) => {
    const [machine, raw] = TOPICS[t]
    const n = sorted[i]
    const r = rnd()
    const category: Category = r < 0.45 ? 'Basic Knowledge' : r < 0.72 ? 'Improvement' : 'Problem Case'
    return {
      id: `OPL-L${line}-${String(n).padStart(4, '0')}`,
      title: raw.replace('{fmt}', FORMAT_BY_LINE[line]),
      line,
      machine,
      category,
      approved: approvedFor(n),
      author: AUTHORS[Math.floor(rnd() * AUTHORS.length)],
      rev: 1 + Math.floor(rnd() * 3),
    }
  })
}

export const LIBRARY: LibraryEntry[] = buildLibrary().sort((a, b) => b.approved.localeCompare(a.approved))

export const findLibrary = (id: string): LibraryEntry | undefined =>
  id === RELATED_0377.id ? RELATED_0377 : LIBRARY.find((e) => e.id === id)
