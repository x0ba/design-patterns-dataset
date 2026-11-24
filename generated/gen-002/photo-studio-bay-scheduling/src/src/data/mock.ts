import type { Bay, Booking, KitUnit } from '../types';

// Mock data for Northlight Studios, Mon 16 Nov 2026, as it stands at 1:10 PM.
// 11 bookings across Bays 1–3 and 9 kit reservations.

export const BAYS: Bay[] = [
  { id: 'bay1', name: 'Bay 1', surface: 'Black wall', sqm: 40, cyc: false },
  { id: 'bay2', name: 'Bay 2', surface: 'White cyc', sqm: 65, cyc: true },
  { id: 'bay3', name: 'Bay 3', surface: 'White cyc', sqm: 50, cyc: true },
];

// Kit inventory: 2 large softbox kits, 3 strobe kits, backdrop paper in 4 colours.
// `homeBay` is where a softbox kit is stored between sessions; strobes and paper are portable.
export const UNITS: KitUnit[] = [
  { id: 'sb1', label: 'SB-1', name: 'Large softbox kit A', kind: 'softbox', homeBay: 'bay3' },
  { id: 'sb2', label: 'SB-2', name: 'Large softbox kit B', kind: 'softbox', homeBay: 'bay2' },
  { id: 'st1', label: 'ST-1', name: 'Strobe kit 1', kind: 'strobe' },
  { id: 'st2', label: 'ST-2', name: 'Strobe kit 2', kind: 'strobe' },
  { id: 'st3', label: 'ST-3', name: 'Strobe kit 3', kind: 'strobe' },
  { id: 'pap-white', label: 'Arctic White', name: 'Backdrop paper, Arctic White', kind: 'paper' },
  { id: 'pap-grey', label: 'Stone Grey', name: 'Backdrop paper, Stone Grey', kind: 'paper' },
  { id: 'pap-black', label: 'Midnight Black', name: 'Backdrop paper, Midnight Black', kind: 'paper' },
  { id: 'pap-sage', label: 'Sage Green', name: 'Backdrop paper, Sage Green', kind: 'paper' },
];

const H = (h: number, m = 0) => h * 60 + m;

export const BOOKINGS: Booking[] = [
  {
    id: 'b01', client: 'Marisol Vega', contact: 'Marisol Vega', project: 'Headshot series',
    bayId: 'bay1', start: H(8), end: H(10), crew: 2, deposit: 'Paid', needsCyc: false,
    kit: ['st1'], addons: ['Strobe kit ×1'],
  },
  {
    id: 'b02', client: 'Tessa Lindgren', contact: 'Tessa Lindgren', project: 'Ceramics e-commerce',
    bayId: 'bay2', start: H(8), end: H(9, 30), crew: 1, deposit: 'Paid', needsCyc: true,
    kit: ['st2'], addons: ['Strobe kit ×1'],
  },
  {
    id: 'b03', client: 'Ruth Adeyemi', contact: 'Ruth Adeyemi', project: 'Family portraits',
    bayId: 'bay1', start: H(10, 30), end: H(12), crew: 3, deposit: 'Paid', needsCyc: false,
    kit: [], addons: [],
  },
  {
    id: 'b04', client: 'Lena Strauss', contact: 'Lena Strauss', project: 'Velvet Static press photos',
    bayId: 'bay2', start: H(10), end: H(14), crew: 5, deposit: 'Paid', needsCyc: false,
    kit: ['st3', 'pap-black'], addons: ['Strobe kit ×1', 'Midnight Black paper'],
  },
  {
    id: 'b05', client: 'Samuel Oyelaran', contact: 'Samuel Oyelaran', project: 'Agency headshots',
    bayId: 'bay3', start: H(11), end: H(14), crew: 2, deposit: 'Pending', needsCyc: false,
    kit: ['pap-grey'], addons: ['Stone Grey paper'],
  },
  {
    id: 'b06', client: 'Priya Raman', contact: 'Priya Raman', project: 'Jewellery lookbook',
    bayId: 'bay1', start: H(12, 30), end: H(16), crew: 3, deposit: 'Paid', needsCyc: false,
    kit: ['sb1'], addons: ['Large softbox ×1'],
  },
  {
    id: 'b07', client: 'Arlo Goods', contact: 'Dylan Marsh', project: 'Spring product catalogue',
    bayId: 'bay2', start: H(15), end: H(18), crew: 4, deposit: 'Paid', needsCyc: true,
    kit: ['sb2'], addons: ['Large softbox ×1'],
  },
  {
    id: 'b08', client: 'Tomasz Kowalczyk', contact: 'Tomasz Kowalczyk', project: 'Portfolio refresh',
    bayId: 'bay1', start: H(16, 30), end: H(18), crew: 1, deposit: 'Paid', needsCyc: false,
    kit: ['st1'], addons: ['Strobe kit ×1'],
  },
  {
    id: 'b09', client: 'Ines Carvalho', contact: 'Ines Carvalho', project: 'Maternity sessions',
    bayId: 'bay3', start: H(8), end: H(10, 30), crew: 2, deposit: 'Paid', needsCyc: false,
    kit: ['pap-sage'], addons: ['Sage Green paper'],
  },
  {
    id: 'b10', client: 'Nadia Brooks', contact: 'Nadia Brooks', project: 'Fashion lookbook',
    bayId: 'bay2', start: H(19), end: H(21, 30), crew: 6, deposit: 'Paid', needsCyc: true,
    kit: [], addons: [],
  },
  {
    id: 'b11', client: 'Hollow Pine Interiors', contact: 'Ayo Bankole', project: 'Interior stills',
    bayId: 'bay3', start: H(19), end: H(21), crew: 2, deposit: 'Paid', needsCyc: true,
    kit: [], addons: [],
  },
];

export const LENA_ID = 'b04';
export const ARLO_ID = 'b07';
export const SAMUEL_ID = 'b05';
