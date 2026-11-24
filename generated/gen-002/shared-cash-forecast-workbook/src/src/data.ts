// Mock data for Cashweek — rolling 13-week cash forecast, FY2027 Q1, v12 draft.
// All amounts are in $ thousands. Receipts positive, disbursements negative.

export const NOW_START = new Date(2026, 10, 18, 13, 15, 0); // Wed Nov 18 2026, 1:15 pm
export const LOCK_AT = new Date(2026, 10, 18, 15, 0, 0);
export const FLOOR = 25000;
export const WATCH_BAND = 5000; // headroom under $5M is flagged as tight
export const NOTE_REQUIRED_OVER = 500; // edits ≥ $500K require a note

export const WEEKS = Array.from({ length: 13 }, (_, i) => new Date(2026, 10, 16 + i * 7));
export const PAYROLL_WEEKS = new Set([0, 2, 4, 6, 8, 10, 12]);
export const WEEK_TAGS: Record<number, string> = {
  1: 'T-giving',
  5: 'Xmas',
  6: 'New Yr',
};

export type EntityId = 'MRMC' | 'LCH' | 'PG' | 'SS';
export const ENTITIES: { id: EntityId; name: string; short: string }[] = [
  { id: 'MRMC', name: 'Mercy Ridge Medical Center', short: 'Mercy Ridge' },
  { id: 'LCH', name: 'Lakeshore Community Hospital', short: 'Lakeshore' },
  { id: 'PG', name: 'Physician Group', short: 'Physician Grp' },
  { id: 'SS', name: 'Shared Services', short: 'Shared Svcs' },
];
export const entityById = Object.fromEntries(ENTITIES.map((e) => [e.id, e])) as Record<EntityId, (typeof ENTITIES)[number]>;

export type Role = 'analyst' | 'liaison' | 'treasurer' | 'cfo';
export interface Person {
  id: string;
  name: string;
  first: string;
  initials: string;
  title: string;
  role: Role;
  color: string;
}

export const PEOPLE: Person[] = [
  { id: 'helen', name: 'Helen Szabo', first: 'Helen', initials: 'HS', title: 'Senior Treasury Analyst · Consolidation', role: 'analyst', color: '#0f766e' },
  { id: 'raj', name: 'Raj Venkataraman', first: 'Raj', initials: 'RV', title: 'Treasury Analyst · Payroll & benefits', role: 'analyst', color: '#7c3aed' },
  { id: 'tomas', name: 'Tomás Ibarra', first: 'Tomás', initials: 'TI', title: 'Treasury Analyst · Disbursements & capital', role: 'analyst', color: '#c2410c' },
  { id: 'denise', name: 'Denise Okafor', first: 'Denise', initials: 'DO', title: 'Treasury Analyst · Government receipts', role: 'analyst', color: '#0369a1' },
  { id: 'ben', name: 'Ben Whitlock', first: 'Ben', initials: 'BW', title: 'Treasury Analyst · Debt & insurance', role: 'analyst', color: '#4d7c0f' },
  { id: 'aisha', name: 'Aisha Grant', first: 'Aisha', initials: 'AG', title: 'Revenue Cycle Liaison · Mercy Ridge', role: 'liaison', color: '#be185d' },
  { id: 'marcus', name: 'Marcus Lindqvist', first: 'Marcus', initials: 'ML', title: 'Revenue Cycle Liaison · Lakeshore & PG', role: 'liaison', color: '#a16207' },
  { id: 'kathleen', name: 'Kathleen Moore', first: 'Kathleen', initials: 'KM', title: 'Assistant Treasurer · locks & publishes', role: 'treasurer', color: '#1e3a8a' },
  { id: 'gregory', name: 'Gregory Hale', first: 'Gregory', initials: 'GH', title: 'CFO office · read only', role: 'cfo', color: '#525252' },
  { id: 'nadia', name: 'Nadia Ferreira', first: 'Nadia', initials: 'NF', title: 'CFO office · read only', role: 'cfo', color: '#525252' },
];
export const person = Object.fromEntries(PEOPLE.map((p) => [p.id, p])) as Record<string, Person>;
export const ME = 'helen';

export type Section = 'receipts' | 'disbursements' | 'financing';
export const SECTIONS: { id: Section; label: string }[] = [
  { id: 'receipts', label: 'Operating receipts' },
  { id: 'disbursements', label: 'Operating disbursements' },
  { id: 'financing', label: 'Debt, capital & liquidity' },
];

export interface Line {
  id: string;
  name: string;
  entity: EntityId;
  section: Section;
  owner: string;
  backup?: string;
  group?: 'payroll';
  detail?: string;
}

export const LINES: Line[] = [
  { id: 'R1', name: 'Patient collections', detail: 'Commercial & self-pay', entity: 'MRMC', section: 'receipts', owner: 'aisha' },
  { id: 'R2', name: 'Patient collections', detail: 'Commercial & self-pay', entity: 'LCH', section: 'receipts', owner: 'marcus' },
  { id: 'R3', name: 'Patient collections — pro fees', detail: 'Professional fees, all payers', entity: 'PG', section: 'receipts', owner: 'marcus' },
  { id: 'R4', name: 'Medicare remittances', entity: 'MRMC', section: 'receipts', owner: 'denise' },
  { id: 'R5', name: 'Medicare remittances', entity: 'LCH', section: 'receipts', owner: 'denise' },
  { id: 'R6', name: 'Medicaid incl. supplemental', detail: 'Medicaid FFS, MCO and supplemental (DSH, UPL)', entity: 'MRMC', section: 'receipts', owner: 'denise' },
  { id: 'R7', name: 'Other receipts (340B, grants)', detail: '340B contract pharmacy, grants, retail pharmacy', entity: 'SS', section: 'receipts', owner: 'denise' },
  { id: 'D1', name: 'Payroll — net pay', entity: 'MRMC', section: 'disbursements', owner: 'raj', backup: 'ben', group: 'payroll' },
  { id: 'D2', name: 'Payroll — net pay', entity: 'LCH', section: 'disbursements', owner: 'raj', backup: 'ben', group: 'payroll' },
  { id: 'D3', name: 'Payroll — net pay', entity: 'PG', section: 'disbursements', owner: 'raj', backup: 'ben', group: 'payroll' },
  { id: 'D4', name: 'Payroll taxes & benefits', entity: 'SS', section: 'disbursements', owner: 'raj', backup: 'ben', group: 'payroll' },
  { id: 'D5', name: 'AP — medical supplies', entity: 'MRMC', section: 'disbursements', owner: 'tomas', backup: 'helen' },
  { id: 'D6', name: 'AP — pharmaceuticals', entity: 'SS', section: 'disbursements', owner: 'tomas', backup: 'helen' },
  { id: 'D7', name: 'AP — purchased services', detail: 'Incl. agency staffing', entity: 'LCH', section: 'disbursements', owner: 'tomas', backup: 'helen' },
  { id: 'D8', name: 'Physician Group opex', detail: 'Physician Group operating disbursements', entity: 'PG', section: 'disbursements', owner: 'tomas', backup: 'helen' },
  { id: 'D9', name: 'Insurance & malpractice', entity: 'SS', section: 'disbursements', owner: 'ben' },
  { id: 'D10', name: 'Rent & leases', entity: 'SS', section: 'disbursements', owner: 'ben' },
  { id: 'F1', name: 'Debt service — 2019A bonds', detail: 'Series 2019A revenue bonds: P&I and sinking fund', entity: 'SS', section: 'financing', owner: 'ben' },
  { id: 'F2', name: 'Capex — medical equipment', entity: 'MRMC', section: 'financing', owner: 'tomas' },
  { id: 'F3', name: 'Capex — facilities', detail: 'Lakeshore patient tower construction draws', entity: 'LCH', section: 'financing', owner: 'ben' },
  { id: 'F4', name: 'Intercompany sweeps — inv. pool', detail: 'Sweeps between the operating account and the investment pool. Positive = draw into operating', entity: 'SS', section: 'financing', owner: 'helen' },
  { id: 'F5', name: 'Interest income', entity: 'SS', section: 'financing', owner: 'ben' },
];
export const lineById = Object.fromEntries(LINES.map((l) => [l.id, l])) as Record<string, Line>;

// deterministic jitter so the numbers don't look synthetic
function jitter(seed: string, w: number, amp: number) {
  let h = 2166136261;
  const s = seed + ':' + w;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 10000) / 10000; // 0..1
  return Math.round(((r * 2 - 1) * amp) / 10) * 10;
}
const holiday = (w: number) => (w === 1 ? 0.9 : w === 5 ? 0.9 : w === 6 ? 0.97 : 1);

function v11Value(id: string, w: number): number {
  const pay = PAYROLL_WEEKS.has(w);
  switch (id) {
    case 'R1': return Math.round((16500 * holiday(w) + jitter(id, w, 420)) / 10) * 10;
    case 'R2': return Math.round((5300 * holiday(w) + jitter(id, w, 180)) / 10) * 10;
    case 'R3': return Math.round((3250 * holiday(w) + jitter(id, w, 120)) / 10) * 10;
    case 'R4': return 7240 + jitter(id, w, 160);
    case 'R5': return 2610 + jitter(id, w, 90);
    case 'R6': return (w === 5 ? 4800 : 0) + 3420 + jitter(id, w, 140);
    case 'R7': return 1080 + jitter(id, w, 120);
    case 'D1': return pay ? -18400 + jitter(id, w, 90) : 0;
    case 'D2': return pay ? -7620 + jitter(id, w, 50) : 0;
    case 'D3': return pay ? -5210 + jitter(id, w, 40) : 0;
    case 'D4': return pay ? -6880 + jitter(id, w, 60) : -1790 + jitter(id, w, 80);
    case 'D5': return -5600 + jitter(id, w, 260);
    case 'D6': return -4310 + jitter(id, w, 210);
    case 'D7': return -3900 + jitter(id, w, 170);
    case 'D8': return -1400 + jitter(id, w, 70);
    case 'D9': return w === 2 ? -2650 : w === 7 ? -1180 : -140 + jitter(id, w, 20);
    case 'D10': return w === 2 || w === 7 || w === 11 ? -1650 : -110 + jitter(id, w, 10);
    case 'F1': return w === 2 || w === 7 || w === 11 ? -1100 : w === 4 ? -7850 : 0;
    case 'F2': return (w === 4 ? -3100 : 0) - 590 + jitter(id, w, 140);
    case 'F3': return w === 3 ? -2200 : w === 7 ? -2200 : w === 11 ? -2400 : -250 + jitter(id, w, 40);
    case 'F4': return w === 8 ? -2000 : 0;
    case 'F5': return w === 0 ? 420 : w === 4 ? 410 : w === 8 ? 430 : w === 12 ? 415 : 0;
  }
  return 0;
}

export type Grid = Record<string, number[]>;

// v11 (published Wed Nov 11) — week 13 (Feb 8) didn't exist in v11, it was added at roll-forward.
export const V11: Record<string, (number | null)[]> = Object.fromEntries(
  LINES.map((l) => [l.id, WEEKS.map((_, w) => (w === 12 ? null : v11Value(l.id, w)))]),
);
const ROLL_FORWARD: Grid = Object.fromEntries(LINES.map((l) => [l.id, WEEKS.map((_, w) => v11Value(l.id, w))]));

export interface Edit {
  id: string;
  lineId: string;
  week: number;
  old: number;
  new: number;
  by: string;
  at: Date;
  note?: string;
  noteBy?: string;
  noteAt?: Date;
  live?: boolean;
}

const d = (day: number, h: number, m: number) => new Date(2026, 10, day, h, m);

type Seed = [lineId: string, week: number, delta: number, by: string, at: Date, note?: string];
const EDIT_SEEDS: Seed[] = [
  // Thu Nov 12
  ['R4', 1, -350, 'denise', d(12, 9, 14), 'Thanksgiving week — MAC remittance shifts from Thu 11/26 to Mon 11/30'],
  ['R4', 2, 350, 'denise', d(12, 9, 14), 'Shifted from wk 2 (Thanksgiving)'],
  ['F1', 2, -30, 'ben', d(12, 10, 2), 'Sinking fund deposit per trustee schedule'],
  ['D5', 1, 420, 'tomas', d(12, 14, 40), 'No Thursday check run Thanksgiving week'],
  ['D5', 2, -420, 'tomas', d(12, 14, 41), 'Catch-up AP run Tue 12/1'],
  ['D9', 2, -160, 'ben', d(12, 16, 5), 'Malpractice renewal — final premium invoice from the captive'],
  // Fri Nov 13
  ['R2', 3, -550, 'marcus', d(13, 8, 51), 'Lockbox migration to new bank Dec 7–8 — about 2 days of float'],
  ['R2', 4, 550, 'marcus', d(13, 8, 52), 'Float from lockbox migration catches up'],
  ['R6', 7, 6800, 'denise', d(13, 11, 30), 'State confirmed Q2 supplemental (UPL) release — wire expected 1/7'],
  ['F4', 8, -1000, 'helen', d(13, 15, 10), 'Sweep supplemental excess to investment pool'],
  // Mon Nov 16
  ['D4', 0, 120, 'raj', d(16, 9, 40), 'Actual employer tax calc for 11/20 payroll'],
  ['D1', 0, 138, 'raj', d(16, 9, 41), 'Payroll register final — 11/20 cycle'],
  ['R7', 1, 240, 'denise', d(16, 10, 15), '340B contract pharmacy receipts — November true-up'],
  ['R6', 2, 260, 'denise', d(16, 13, 20), 'Medicaid MCO retro rate adjustment'],
  ['R3', 2, 180, 'marcus', d(16, 11, 48), 'Year-end visit volume (deductibles met)'],
  ['R3', 3, 120, 'marcus', d(16, 11, 48), 'Year-end visit volume (deductibles met)'],
  ['D7', 3, -480, 'tomas', d(16, 14, 30), 'ICU travel-nurse agency invoices (October)'],
  ['D7', 4, -360, 'tomas', d(16, 14, 31), 'ICU travel-nurse agency invoices (November)'],
  ['D8', 2, -90, 'tomas', d(16, 15, 5), 'Locum tenens invoices — hospitalist coverage'],
  ['R1', 2, -1200, 'aisha', d(16, 16, 52)],
  ['R1', 3, -1500, 'aisha', d(16, 16, 52)],
  ['R1', 4, -1500, 'aisha', d(16, 16, 52)],
  // Tue Nov 17
  ['F5', 4, 45, 'ben', d(17, 10, 12), 'Updated yield on liquidity fund (4.31%)'],
  ['R5', 5, -300, 'denise', d(17, 11, 5), 'Christmas week — MAC cycle shifts'],
  ['R5', 6, 300, 'denise', d(17, 11, 5), 'Shifted from wk 6 (Christmas)'],
  ['D6', 1, 320, 'tomas', d(17, 13, 40), 'Wholesaler credit memo applied to wk 2 run'],
  ['R2', 9, 210, 'marcus', d(17, 15, 15), 'Collection agency recovery — Lakeshore bad-debt placement'],
  ['D10', 7, -70, 'ben', d(17, 16, 44), 'Lakeshore MOB lease escalator eff. 1/1'],
  ['F3', 7, 400, 'ben', d(17, 16, 50), 'Construction draw #14 reduced — GC pay app received'],
  // Wed Nov 18
  ['R4', 5, -410, 'denise', d(18, 9, 5), 'Christmas week MAC cycle (Fri 12/25)'],
  ['R4', 6, 410, 'denise', d(18, 9, 5), 'Shifted from wk 6 (Christmas)'],
  ['D5', 6, -380, 'tomas', d(18, 10, 20), 'GPO rebate netting removed from the Dec 31 run'],
  ['D1', 6, -1560, 'raj', d(18, 12, 41), 'RN contract retro (eff. 7/1) — Mercy Ridge share, paid 12/31'],
  ['D4', 6, -120, 'raj', d(18, 12, 58), 'Employer FICA on retro — Mercy Ridge'],
  ['D6', 4, -220, 'tomas', d(18, 13, 6), 'Specialty pharmacy (oncology infusion) volume'],
  ['D7', 5, 260, 'tomas', d(18, 13, 11), 'Agency invoices moved to January per AP'],
  ['D1', 8, -40, 'raj', d(18, 13, 12), 'Retro on shift differentials — Mercy Ridge'],
];

function buildInitial() {
  const values: Grid = Object.fromEntries(LINES.map((l) => [l.id, [...ROLL_FORWARD[l.id]]]));
  const seeds = [...EDIT_SEEDS].sort((a, b) => a[4].getTime() - b[4].getTime());
  const edits: Edit[] = seeds.map(([lineId, week, delta, by, at, note], i) => {
    const old = values[lineId][week];
    const nv = old + delta;
    values[lineId][week] = nv;
    return { id: 'e' + (i + 1), lineId, week, old, new: nv, by, at, note };
  });
  return { values, edits };
}
const initial = buildInitial();
export const INITIAL_VALUES = initial.values;
export const INITIAL_EDITS = initial.edits;

// Opening balance = bank actual, Fri Nov 13 close. Calibrated so the draft shows wk 5 at $22.7M.
const flowsThrough = (g: Grid, w: number) =>
  LINES.reduce((s, l) => s + g[l.id].slice(0, w + 1).reduce((a, b) => a + b, 0), 0);
export const OPENING = 22700 - flowsThrough(INITIAL_VALUES, 4);
export const V11_OPENING = OPENING + 310; // v11 had forecast $310K more cash at Nov 16 than the bank actually showed

export interface Message {
  id: string;
  by: string;
  at: Date;
  text: string;
}
export interface Thread {
  id: string;
  anchor: { kind: 'cell'; lineId: string; week: number } | { kind: 'balance'; week: number };
  title: string;
  blocking?: boolean;
  status: 'open' | 'resolved';
  messages: Message[];
  quickReplies?: { label: string; action: string }[];
}

export const INITIAL_THREADS: Thread[] = [
  {
    id: 't-mri',
    anchor: { kind: 'cell', lineId: 'F2', week: 4 },
    title: 'Siemens MRI final milestone — wk 5 or wk 7?',
    blocking: true,
    status: 'open',
    messages: [
      {
        id: 'm1', by: 'tomas', at: d(18, 11, 52),
        text: 'Helen — timing question on the Siemens MAGNETOM 3T at Mercy Ridge. Final 40% milestone is $3.1M; acceptance testing was signed off Nov 13. Original PO terms are net 30, which puts it on the Dec 17 ACH run (wk 5). Supply chain says the October amendment moved the final milestone to net 45 (Dec 31 run, wk 7), but I can\'t find a countersigned copy in the contract system. Keep it in wk 5 or move it to wk 7? I won\'t touch it until you decide.',
      },
      {
        id: 'm2', by: 'ben', at: d(18, 12, 20),
        text: 'FWIW — Legal has the amendment in DocuSign. As of Monday it was still waiting on the Siemens signature.',
      },
    ],
    quickReplies: [
      { label: 'Keep in wk 5 until the amendment is countersigned', action: 'mri-keep' },
      { label: 'Move to wk 7 (net 45)', action: 'mri-move' },
    ],
  },
  {
    id: 't-kathleen',
    anchor: { kind: 'balance', week: 4 },
    title: 'Wk 5 under the floor',
    status: 'open',
    messages: [
      {
        id: 'm3', by: 'kathleen', at: d(18, 8, 47),
        text: 'Helen, the draft has wk 5 under the $25M floor. If it\'s still under at lock I need the cause and the mitigation in the cover memo. I\'m not publishing a breach to the CFO office without one.',
      },
    ],
  },
  {
    id: 't-retro',
    anchor: { kind: 'cell', lineId: 'D1', week: 6 },
    title: 'RN contract retro — loading now',
    status: 'open',
    messages: [
      {
        id: 'm4', by: 'raj', at: d(18, 12, 44),
        text: 'Loading the RN contract retro (eff. 7/1) into the Dec 31 cycle. Mercy Ridge is in, Lakeshore next, then employer taxes. HR\'s final file is $2.33M. Please nobody touch the payroll lines until I release them. I\'m reconciling to the register line by line.',
      },
    ],
  },
  {
    id: 't-upl',
    anchor: { kind: 'cell', lineId: 'R6', week: 7 },
    title: 'UPL supplemental — firm or probable?',
    status: 'open',
    messages: [
      {
        id: 'm5', by: 'denise', at: d(13, 11, 34),
        text: 'UPL supplemental of $6.8M confirmed by the state Medicaid office letter dated 11/12. The wire usually lands 3–5 business days after the 1/5 release date, so I put it in wk 8. Kathleen, OK to treat it as firm rather than probable?',
      },
    ],
  },
  {
    id: 't-lockbox',
    anchor: { kind: 'cell', lineId: 'R2', week: 3 },
    title: 'Lakeshore lockbox migration float',
    status: 'open',
    messages: [
      {
        id: 'm6', by: 'marcus', at: d(13, 8, 55),
        text: 'Lakeshore lockbox moves to the new bank Dec 7–8. Expect about 2 days of float, so I shifted $550K from wk 4 to wk 5. FYI in case wk 4 Lakeshore looks light.',
      },
    ],
  },
  {
    id: 't-trustee',
    anchor: { kind: 'cell', lineId: 'F1', week: 4 },
    title: 'Pre-fund the trustee for Dec 15 interest?',
    status: 'open',
    messages: [
      {
        id: 'm7', by: 'ben', at: d(17, 10, 30),
        text: 'Trustee confirmed Dec 15 debt service on the 2019A bonds: $7.85M ($3.0M principal + $4.85M interest). Do we pre-fund the trustee on Dec 11 (wk 4) like last year, or pay on the 15th? Either way it goes out before the wk 5 close.',
      },
    ],
  },
];

export interface Version {
  v: number;
  published: Date;
  by: string;
  low: number;
  lowWeek: Date;
  edits: number;
  note: string;
}
const vd = (m: number, day: number, h: number, min: number) => new Date(2026, m, day, h, min);
export const VERSIONS: Version[] = [
  { v: 11, published: vd(10, 11, 15, 14), by: 'kathleen', low: 27127, lowWeek: new Date(2026, 11, 14), edits: 41, note: 'Medicaid supplemental timing pending' },
  { v: 10, published: vd(10, 4, 15, 22), by: 'kathleen', low: 28410, lowWeek: new Date(2026, 11, 14), edits: 33, note: '' },
  { v: 9, published: vd(9, 28, 15, 9), by: 'kathleen', low: 29050, lowWeek: new Date(2026, 11, 14), edits: 29, note: 'Siemens MRI added to wk of Dec 14' },
  { v: 8, published: vd(9, 21, 15, 31), by: 'kathleen', low: 31880, lowWeek: new Date(2026, 9, 30), edits: 36, note: '' },
  { v: 7, published: vd(9, 14, 15, 12), by: 'kathleen', low: 31240, lowWeek: new Date(2026, 9, 30), edits: 27, note: '' },
  { v: 6, published: vd(9, 7, 15, 40), by: 'kathleen', low: 30690, lowWeek: new Date(2026, 9, 2), edits: 44, note: 'Q1 close true-up' },
  { v: 5, published: vd(8, 30, 15, 17), by: 'kathleen', low: 30120, lowWeek: new Date(2026, 9, 2), edits: 31, note: '' },
  { v: 4, published: vd(8, 23, 15, 8), by: 'kathleen', low: 29870, lowWeek: new Date(2026, 9, 2), edits: 25, note: '' },
  { v: 3, published: vd(8, 16, 15, 26), by: 'kathleen', low: 31460, lowWeek: new Date(2026, 8, 18), edits: 38, note: '' },
  { v: 2, published: vd(8, 9, 15, 11), by: 'kathleen', low: 32010, lowWeek: new Date(2026, 8, 18), edits: 30, note: '' },
  { v: 1, published: vd(8, 2, 15, 35), by: 'kathleen', low: 33540, lowWeek: new Date(2026, 8, 18), edits: 52, note: 'FY2027 Q1 opening forecast' },
];

export const BLOCKED_ATTEMPT = {
  by: 'ben',
  lineId: 'D4',
  week: 6,
  at: d(18, 13, 9),
};
