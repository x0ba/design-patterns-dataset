// Mock data for Countertime — state as of Monday 16 November 2026, 12:24.

export const CURRENCY = '€';
export const EXPEDITE_FEE = 60; // per application

export const TODAY_ISO = '2026-11-16';
/** Mock wall clock at page load (minutes after midnight + seconds). */
export const NOW_AT_LOAD = { h: 12, m: 24, s: 12 };
/** Tentative hold expires at 12:39:00 */
export const HOLD_EXPIRES = { h: 12, m: 39, s: 0 };

export const TRIP_ISO = '2027-02-14';
export const TRIP_LABEL = 'Family visit to relatives';
/** We aim for passports in hand one week before departure. */
export const BUFFER_DAYS = 7;

export const STANDARD_WEEKS: [number, number] = [6, 8];
export const EXPEDITED_WEEKS: [number, number] = [2, 3];
export const RETURN_POST_WORKING_DAYS = 5;
export const MAIL_IN_WORKING_DAYS = 3;

/** Registry offices closed; processing pauses. */
export const CLOSURE = { from: '2026-12-24', to: '2027-01-01' };
export const SCHOOL_HOLIDAYS = { from: '2026-12-21', to: '2027-01-04' };
export const SCHOOL_HOURS = { start: '08:30', end: '15:15' };
export const SCHOOL_NAME = 'Westbrook Primary';
/** Marisol's dispatch shift on school days (no bus runs in school holidays). */
export const MARISOL_WORK = { start: '06:30', end: '15:00' };

export type OfficeId = 'harbor' | 'northgate' | 'linden';
export interface Office {
  id: OfficeId;
  name: string;
  full: string;
  letter: string;
  km: number;
  driveMin: number;
  address: string;
  hours: string;
  note?: string;
}

export const OFFICES: Record<OfficeId, Office> = {
  harbor: {
    id: 'harbor',
    name: 'Harbor Street',
    full: 'Harbor Street Registry Office',
    letter: 'H',
    km: 12,
    driveMin: 20,
    address: '214 Harbor Street, ground floor',
    hours: 'Mon–Fri 8:00–16:30',
  },
  northgate: {
    id: 'northgate',
    name: 'Northgate Mall',
    full: 'Northgate Mall Registry Office',
    letter: 'N',
    km: 28,
    driveMin: 35,
    address: 'Northgate Mall, Level 1, next to the east car park entrance',
    hours: 'Mon–Fri 8:00–16:30 · Sat 9:00–13:00',
    note: 'Free mall parking for 3 hours',
  },
  linden: {
    id: 'linden',
    name: 'Linden Civic Center',
    full: 'Linden Civic Center Registry Office',
    letter: 'L',
    km: 39,
    driveMin: 45,
    address: '3 Market Square, Linden — counter hall B',
    hours: 'Mon–Fri 8:00–16:30 · Thu until 19:00',
  },
};

export type ShiftKind = 'early' | 'late';
export const SHIFTS: Record<ShiftKind, { label: string; start: string; end: string }> = {
  early: { label: 'Early', start: '06:00', end: '14:30' },
  late: { label: 'Late', start: '14:00', end: '22:30' },
};
/** Dele's rota, shared into the app on Sat 14 Nov. Week starts Monday; works Mon–Sat, Sundays off. */
export const DELE_ROTA: Record<string, ShiftKind> = {
  '2026-11-16': 'late',
  '2026-11-23': 'early',
  '2026-11-30': 'late',
  '2026-12-07': 'early',
  '2026-12-14': 'late',
};
export const DELE_ROTA_SHARED = 'Sat 14 Nov';
export const DELE_ROTA_LAST = '2026-12-20';
export const DELE_WORKPLACE = 'Riverside distribution warehouse';

export interface Person {
  id: string;
  name: string;
  age?: number;
  role: string;
}

export const CHILDREN = [
  { id: 'ayo', name: 'Ayo', fullName: 'Ayo Okafor', age: 11, kind: 'First passport', appRef: 'PA-26-118 40Q' },
  { id: 'temi', name: 'Temi', fullName: 'Temi Okafor', age: 7, kind: 'First passport', appRef: 'PA-26-118 41R' },
] as const;
export type ChildId = (typeof CHILDREN)[number]['id'];

export interface Opening {
  id: string;
  office: OfficeId;
  date: string; // ISO
  start: string; // HH:MM, first of two back-to-back 20-min slots
}

/** Family-capable openings (2 back-to-back 20-min slots), next 10 weeks. */
export const OPENINGS: Opening[] = [
  // Harbor Street — 3 before Christmas
  { id: 'h1', office: 'harbor', date: '2026-11-30', start: '13:40' },
  { id: 'h2', office: 'harbor', date: '2026-12-09', start: '10:20' },
  { id: 'h3', office: 'harbor', date: '2026-12-22', start: '09:00' },
  { id: 'h4', office: 'harbor', date: '2027-01-05', start: '14:00' },
  { id: 'h5', office: 'harbor', date: '2027-01-12', start: '09:20' },
  { id: 'h6', office: 'harbor', date: '2027-01-19', start: '10:40' },

  // Northgate Mall — 11 before Christmas (plus Marisol's hold)
  { id: 'n1', office: 'northgate', date: '2026-11-23', start: '08:20' },
  { id: 'n2', office: 'northgate', date: '2026-11-25', start: '09:00' },
  { id: 'n3', office: 'northgate', date: '2026-11-28', start: '10:00' },
  { id: 'n4', office: 'northgate', date: '2026-12-01', start: '13:00' },
  { id: 'n5', office: 'northgate', date: '2026-12-04', start: '10:20' },
  { id: 'hold', office: 'northgate', date: '2026-12-05', start: '09:20' },
  { id: 'n6', office: 'northgate', date: '2026-12-05', start: '11:00' },
  { id: 'n7', office: 'northgate', date: '2026-12-09', start: '15:20' },
  { id: 'n8', office: 'northgate', date: '2026-12-12', start: '11:20' },
  { id: 'n9', office: 'northgate', date: '2026-12-17', start: '09:40' },
  { id: 'n10', office: 'northgate', date: '2026-12-19', start: '09:00' },
  { id: 'n11', office: 'northgate', date: '2026-12-19', start: '12:00' },
  { id: 'n12', office: 'northgate', date: '2027-01-04', start: '11:00' },
  { id: 'n13', office: 'northgate', date: '2027-01-09', start: '09:40' },
  { id: 'n14', office: 'northgate', date: '2027-01-16', start: '10:20' },
  { id: 'n15', office: 'northgate', date: '2027-01-23', start: '09:00' },

  // Linden Civic Center — 7 before Christmas
  { id: 'l1', office: 'linden', date: '2026-11-19', start: '10:00' },
  { id: 'l2', office: 'linden', date: '2026-11-20', start: '13:20' },
  { id: 'l3', office: 'linden', date: '2026-11-24', start: '09:40' },
  { id: 'l4', office: 'linden', date: '2026-12-03', start: '18:00' },
  { id: 'l5', office: 'linden', date: '2026-12-10', start: '17:20' },
  { id: 'l6', office: 'linden', date: '2026-12-14', start: '11:00' },
  { id: 'l7', office: 'linden', date: '2026-12-22', start: '14:20' },
  { id: 'l8', office: 'linden', date: '2027-01-07', start: '17:40' },
  { id: 'l9', office: 'linden', date: '2027-01-14', start: '18:00' },
];

/** Days where only single (non-adjacent) slots remain — shown so the gap isn't a mystery. */
export const SINGLE_ONLY: { office: OfficeId; date: string; note: string }[] = [
  { office: 'linden', date: '2026-11-26', note: 'Late Thursday: only single 20-min slots left (17:00, 18:20)' },
  { office: 'northgate', date: '2026-11-21', note: 'Saturday: only single 20-min slots left (9:00, 12:20)' },
];

export const HOLD_ID = 'hold';
/** The option Marisol had open before her lunch-break check-in. */
export const INITIAL_COMPARE_ID = 'l1';
