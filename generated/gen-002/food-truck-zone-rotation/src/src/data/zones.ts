export type Tier = 'A' | 'B' | 'C';
export type ZoneKind = 'lunch' | 'breakfast' | 'riverside' | 'weekend' | 'nightlife';

export interface Zone {
  id: string;
  name: string;
  location: string;
  district: string;
  capacity: number;
  tier: Tier;
  kind: ZoneKind;
  /** Operating days of week, 0 = Sunday */
  days: number[];
  hours: { dows: number[]; start: string; end: string }[];
  hoursLabel: string;
  note?: string;
}

export const ZONES: Zone[] = [
  {
    id: 'civic',
    name: 'Civic Plaza',
    location: 'City Hall east steps, 3rd & Alder',
    district: 'Downtown',
    capacity: 2,
    tier: 'A',
    kind: 'lunch',
    days: [1, 2, 3, 4, 5],
    hours: [{ dows: [1, 2, 3, 4, 5], start: '10:30', end: '15:00' }],
    hoursLabel: 'Mon–Fri 10:30–15:00',
    note: 'High-traffic. Fairness rule: max 2 Civic Plaza slots per truck per month.',
  },
  {
    id: 'courthouse',
    name: 'Courthouse',
    location: 'Fifth St between Main & Pine',
    district: 'Downtown',
    capacity: 3,
    tier: 'A',
    kind: 'lunch',
    days: [1, 2, 3, 4, 5, 6],
    hours: [
      { dows: [1, 2, 3, 4, 5], start: '10:30', end: '14:30' },
      { dows: [6], start: '10:00', end: '14:00' },
    ],
    hoursLabel: 'Mon–Fri 10:30–14:30 · Sat 10:00–14:00',
  },
  {
    id: 'medical',
    name: 'Medical District',
    location: 'Holloway Ave at St. Brigid’s',
    district: 'Midtown',
    capacity: 2,
    tier: 'A',
    kind: 'lunch',
    days: [1, 2, 3, 4, 5],
    hours: [{ dows: [1, 2, 3, 4, 5], start: '10:30', end: '15:00' }],
    hoursLabel: 'Mon–Fri 10:30–15:00',
  },
  {
    id: 'university',
    name: 'University Ave',
    location: 'University Ave & College St',
    district: 'University',
    capacity: 3,
    tier: 'B',
    kind: 'lunch',
    days: [1, 2, 3, 4, 5],
    hours: [{ dows: [1, 2, 3, 4, 5], start: '10:30', end: '15:00' }],
    hoursLabel: 'Mon–Fri 10:30–15:00',
    note: 'Campus finals end Dec 18; expect lighter foot traffic after.',
  },
  {
    id: 'innovation',
    name: 'Innovation District',
    location: 'Kessler Way loading court',
    district: 'Eastside',
    capacity: 2,
    tier: 'B',
    kind: 'lunch',
    days: [2, 3, 4],
    hours: [{ dows: [2, 3, 4], start: '11:00', end: '14:00' }],
    hoursLabel: 'Tue–Thu 11:00–14:00',
  },
  {
    id: 'library',
    name: 'Library Commons',
    location: 'Central Library north lawn',
    district: 'Downtown',
    capacity: 1,
    tier: 'C',
    kind: 'lunch',
    days: [1, 3, 5],
    hours: [{ dows: [1, 3, 5], start: '10:30', end: '14:00' }],
    hoursLabel: 'Mon, Wed, Fri 10:30–14:00',
  },
  {
    id: 'westside',
    name: 'Westside Transit Ctr',
    location: 'Bay 4, Westside Transit Center',
    district: 'Westside',
    capacity: 1,
    tier: 'C',
    kind: 'breakfast',
    days: [1, 2, 3, 4, 5],
    hours: [{ dows: [1, 2, 3, 4, 5], start: '06:30', end: '10:30' }],
    hoursLabel: 'Mon–Fri 06:30–10:30',
  },
  {
    id: 'fairgrounds',
    name: 'Fairgrounds Lot',
    location: 'County Fairgrounds, Gate C lot',
    district: 'Southside',
    capacity: 1,
    tier: 'C',
    kind: 'lunch',
    days: [4, 5, 6],
    hours: [{ dows: [4, 5, 6], start: '11:00', end: '15:00' }],
    hoursLabel: 'Thu–Sat 11:00–15:00',
  },
  {
    id: 'riverside-n',
    name: 'Riverside North',
    location: 'River Walk at Mill St bridge',
    district: 'Riverfront',
    capacity: 3,
    tier: 'B',
    kind: 'riverside',
    days: [0, 1, 4, 5, 6],
    hours: [{ dows: [0, 1, 4, 5, 6], start: '11:00', end: '19:00' }],
    hoursLabel: 'Thu–Mon 11:00–19:00',
  },
  {
    id: 'riverside-s',
    name: 'Riverside South',
    location: 'River Walk at Founders Park',
    district: 'Riverfront',
    capacity: 2,
    tier: 'B',
    kind: 'riverside',
    days: [0, 1, 5, 6],
    hours: [{ dows: [0, 1, 5, 6], start: '11:00', end: '19:00' }],
    hoursLabel: 'Fri–Mon 11:00–19:00',
  },
  {
    id: 'harbor',
    name: 'Harbor Walk',
    location: 'Pier 2 promenade',
    district: 'Waterfront',
    capacity: 2,
    tier: 'B',
    kind: 'weekend',
    days: [0, 6],
    hours: [{ dows: [0, 6], start: '10:00', end: '16:00' }],
    hoursLabel: 'Sat–Sun 10:00–16:00',
  },
  {
    id: 'eastgate',
    name: 'Eastgate Park',
    location: 'Eastgate Park playground lot',
    district: 'Eastside',
    capacity: 2,
    tier: 'C',
    kind: 'weekend',
    days: [0, 6],
    hours: [{ dows: [0, 6], start: '10:00', end: '15:00' }],
    hoursLabel: 'Sat–Sun 10:00–15:00',
  },
  {
    id: 'old-market',
    name: 'Old Market Square',
    location: 'Market St & 2nd, south curb',
    district: 'Old Town',
    capacity: 3,
    tier: 'A',
    kind: 'nightlife',
    days: [5, 6],
    hours: [{ dows: [5, 6], start: '17:00', end: '22:00' }],
    hoursLabel: 'Fri–Sat 17:00–22:00',
  },
  {
    id: 'depot',
    name: 'Depot Street',
    location: 'Depot St at the rail yard lofts',
    district: 'Old Town',
    capacity: 2,
    tier: 'B',
    kind: 'nightlife',
    days: [5, 6],
    hours: [{ dows: [5, 6], start: '17:00', end: '22:00' }],
    hoursLabel: 'Fri–Sat 17:00–22:00',
  },
];

export const ZONE_BY_ID: Record<string, Zone> = Object.fromEntries(ZONES.map((z) => [z.id, z]));

export const TIER_VALUE: Record<Tier, number> = { A: 3, B: 2, C: 1 };

export interface Closure {
  id: string;
  kind: 'closure' | 'event';
  title: string;
  short: string;
  zoneIds: string[];
  days: number[];
  source: string;
  announced: string;
  detail: string;
}

export const CLOSURES: Closure[] = [
  {
    id: 'fifth-st',
    kind: 'closure',
    title: 'Fifth Street water main replacement',
    short: 'Fifth St closure',
    zoneIds: ['courthouse'],
    days: [8, 9, 10, 11, 12],
    source: 'Public Works notice PW-26-1147',
    announced: 'Fri, Nov 13 · 4:52 PM',
    detail: 'Full closure of Fifth St between Main and Pine, Dec 8–12. No curb access for the Courthouse zone.',
  },
  {
    id: 'winter-lights',
    kind: 'event',
    title: 'Winter Lights Market',
    short: 'Winter Lights',
    zoneIds: ['riverside-n', 'riverside-s'],
    days: [13, 14],
    source: 'Special Events permit SE-26-088',
    announced: 'Oct 29',
    detail: 'Market footprint covers the River Walk from Mill St to Founders Park. Curbside vending suspended; market vendors are separately permitted.',
  },
];

export function closureFor(zoneId: string, day: number): Closure | undefined {
  return CLOSURES.find((c) => c.zoneIds.includes(zoneId) && c.days.includes(day));
}
