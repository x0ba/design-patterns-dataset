// Mock data for Kerfline — state as of Monday 16 November 2026, 10:40.

export const MOCK_NOW = new Date(2026, 10, 16, 10, 40, 0);
export const CUTOFF = new Date(2026, 10, 19, 12, 0, 0); // Thu 19 Nov 12:00
export const DELIVERY = new Date(2026, 10, 30, 9, 0, 0); // Mon 30 Nov
export const INSTALL = new Date(2026, 11, 12, 9, 0, 0); // Sat 12 Dec
export const CONFIRM_HOURS = 48;

export const APPROVAL_THRESHOLD = 2500;
export const RETURN_LOSS = 0.3;

export const user = {
  name: 'Tomasz Wiśniewski',
  initials: 'TW',
  role: 'PhD candidate, year 3',
  group: 'Computational Timber Lab',
  cert: 'Router L2',
};

export const grant = {
  title: 'Adaptive Timber Shells',
  code: 'ATS-24-0317',
  pi: 'Prof. Ana Ribeiro',
  piEmail: 'a.ribeiro@arch.halden.ac',
  materialsRemaining: 6840,
  fabricationRemaining: 3100,
};

export const machine = {
  name: 'Big Kerf',
  model: '5-axis CNC router',
  bed: '3.0 × 1.5 m',
  bedMm: [3000, 1500] as const,
  rate: 38,
  supervisionRate: 25,
  location: 'Hall B, bay 2',
};

export const material = {
  name: 'Baltic birch plywood',
  spec: '18 mm · B/BB · 2500 × 1250 mm',
  sheetMm: [2500, 1250] as const,
  price: 68,
  supplier: 'Nordholz Panels',
  shipping: 140,
  nesting: 19.4,
  defaultQty: 22,
};

export const project = {
  title: 'Timber shell prototype, full scale',
  draftId: 'KF-D-0412',
  file: 'shell_v14_final.3dm',
  parts: 412,
  camHours: '12 h 50 min cutting + ~1 h setup',
  exhibition: 'Formed Ground: Timber Futures, Atrium Gallery',
};

export type Segment = { date: Date; dayLabel: string; start: number; end: number };
export type BlockOption = {
  id: string;
  title: string;
  short: string;
  segments: Segment[];
  pros: string[];
  cons: string[];
};

const d = (day: number) => new Date(2026, 11, day);

export const blockOptions: BlockOption[] = [
  {
    id: 'dec2',
    title: 'Wed 2 Dec · 08:00–22:00',
    short: 'Wed 2 Dec, 08:00–22:00',
    segments: [{ date: d(2), dayLabel: 'Wed 2 Dec', start: 8, end: 22 }],
    pros: ['One continuous run with one setup', 'This is the cutting date the plywood order is planned around', '10 days of buffer before install'],
    cons: ['A 14-hour day at the machine'],
  },
  {
    id: 'dec34',
    title: 'Thu 3 Dec 14:00–20:00 + Fri 4 Dec 08:00–16:00',
    short: 'Thu 3 Dec 14:00–20:00, Fri 4 Dec 08:00–16:00',
    segments: [
      { date: d(3), dayLabel: 'Thu 3 Dec', start: 14, end: 20 },
      { date: d(4), dayLabel: 'Fri 4 Dec', start: 8, end: 16 },
    ],
    pros: ['Shorter days', 'Overnight break to check the first parts'],
    cons: ['A second setup takes about 1 h of the 14 h', '8 days of buffer before install', 'Partial sheets left clamped overnight'],
  },
];

export type Booking = { day: number; start: number; end: number; label: string; kind: 'booking' | 'maintenance' | 'class' };

// Week of 30 Nov – 4 Dec on Big Kerf. Lab hours 08:00–22:00.
export const weekDays = [
  { day: 30, label: 'Mon', date: '30 Nov' },
  { day: 1, label: 'Tue', date: '1 Dec' },
  { day: 2, label: 'Wed', date: '2 Dec' },
  { day: 3, label: 'Thu', date: '3 Dec' },
  { day: 4, label: 'Fri', date: '4 Dec' },
];

export const existingBookings: Booking[] = [
  { day: 30, start: 8, end: 16, label: 'Spindle service', kind: 'maintenance' },
  { day: 30, start: 16, end: 22, label: 'L. Brandt · façade panels', kind: 'booking' },
  { day: 1, start: 8, end: 13, label: 'MArch Unit 4 · studio models', kind: 'class' },
  { day: 1, start: 13, end: 22, label: 'J. Okafor · concrete formwork', kind: 'booking' },
  { day: 3, start: 8, end: 14, label: 'R. Haddad · CLT joints', kind: 'booking' },
  { day: 3, start: 20, end: 22, label: 'Bed resurfacing', kind: 'maintenance' },
  { day: 4, start: 16, end: 22, label: 'MArch Unit 2 · pavilion', kind: 'class' },
];

export type PastCommitment = {
  id: string;
  date: string;
  by: string;
  what: string;
  amount: number;
  status: 'completed' | 'cancelled' | 'partial' | 'scheduled';
  note?: string;
};

export const pastCommitments: PastCommitment[] = [
  { id: 'KF-2026-0143', date: '9 Feb', by: 'T. Wiśniewski', what: 'Big Kerf 6 h + 8 × birch 12 mm', amount: 724, status: 'completed' },
  { id: 'KF-2026-0291', date: '17 Mar', by: 'M. Sørensen', what: 'Robot cell 10 h, glulam offcuts', amount: 610, status: 'completed' },
  { id: 'KF-2026-0388', date: '28 Apr', by: 'T. Wiśniewski', what: 'Laser 4 h + 30 × MDF 3 mm', amount: 362, status: 'completed' },
  { id: 'KF-2026-0602', date: '8 Jul', by: 'T. Wiśniewski', what: 'Big Kerf 10 h + 12 × birch 18 mm', amount: 1336, status: 'cancelled', note: 'Cancelled after 31 h, before supplier confirmation. Nothing charged.' },
  { id: 'KF-2026-0655', date: '27 Jul', by: 'M. Sørensen', what: 'Spruce glulam blanks × 6', amount: 498, status: 'completed' },
  { id: 'KF-2026-0790', date: '14 Sep', by: 'T. Wiśniewski', what: 'Big Kerf 8 h + 16 × birch 15 mm', amount: 1388, status: 'partial', note: '5 unused sheets went to shared stock. Lost 30% of €310 = €93.' },
  { id: 'KF-2026-0941', date: '22 Oct', by: 'M. Sørensen', what: 'Big Kerf 5 h, test panels', amount: 190, status: 'completed' },
];
