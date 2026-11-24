import { Hours, NOW, addDays, hm, iso } from './util';

export type UtilityKind = 'electric' | 'gas' | 'water' | 'trash' | 'internet' | 'propane';

export const KIND_LABEL: Record<UtilityKind, string> = {
  electric: 'Electric',
  gas: 'Natural gas',
  water: 'Water & sewer',
  trash: 'Trash & recycling',
  internet: 'Internet',
  propane: 'Propane',
};

export interface Person {
  name: string;
  role: string;
  phone?: string;
  note?: string;
}

export interface Property {
  id: string;
  name: string;
  short: string;
  street: string;
  cityLine: string;
  color: string;
  tint: string;
  glyph: 'home' | 'sale' | 'cabin';
  status: string;
  facts: { label: string; value: string }[];
  access?: string[];
  people: Person[];
}

export interface Contact {
  id: string;
  label: string;
  phone?: string;
  web?: string;
  address?: string;
  hours: Hours;
  note?: string;
  source?: string;
}

export type BillStatus = 'paid' | 'autopaid' | 'due' | 'scheduled';

export interface Bill {
  id: string;
  label: string;
  issued: string;
  due: string;
  amount: number;
  status: BillStatus;
  paidOn?: string;
  usage?: string;
  estimated?: boolean;
  memo?: string;
}

export type ReadingType = 'actual' | 'estimated' | 'customer';

export interface Reading {
  date: string;
  value: number;
  usage: number;
  type: ReadingType;
  note?: string;
}

export interface Meter {
  number: string;
  location: string;
  unit: string;
  readingLabel: string;
  usageLabel: string;
  kind: string;
}

export interface Notice {
  id: string;
  accountId: string;
  title: string;
  from: string;
  fromAddress: string;
  channel: string;
  received: string;
  receivedTime: string;
  dueBy?: string;
  needsAction: boolean;
  summary: string;
  body: string[];
  footer?: string[];
}

export interface Account {
  id: string;
  propertyId: string;
  kind: UtilityKind;
  provider: string;
  accountNumber: string;
  holder: string;
  authorized: string[];
  serviceAddress: string;
  autopay: { on: boolean; detail: string };
  paperless: string;
  since: string;
  plan: string;
  flags: string[];
  meter?: Meter;
  contacts: Contact[];
  bills: Bill[];
  readings: Reading[];
  billingCycle: string;
}

export type ItemStatus = 'action' | 'waiting' | 'todo' | 'done';

export interface LogEntry {
  date: string;
  text: string;
  by: string;
}

export interface OpenItem {
  id: string;
  propertyId: string;
  accountId: string;
  title: string;
  ref?: string;
  kind: 'Notice' | 'Service request' | 'To-do' | 'Enrollment';
  opened: string;
  due?: string;
  dueLabel?: string;
  status: ItemStatus;
  providerStatus?: string;
  completed?: string;
  summary: string;
  steps?: { label: string; date?: string; done: boolean }[];
  noticeId?: string;
  log: LogEntry[];
}

export interface Note {
  id: string;
  accountId?: string;
  propertyId: string;
  date: string;
  text: string;
}

// ------------------------------------------------------------------
// Properties
// ------------------------------------------------------------------
export const PROPERTIES: Property[] = [
  {
    id: 'home',
    name: 'My house',
    short: 'Whitlow Ave',
    street: '4418 Whitlow Ave',
    cityLine: 'Columbus, OH 43214',
    color: '#2f5f9e',
    tint: '#e9f0fa',
    glyph: 'home',
    status: 'Where I live',
    facts: [
      { label: 'Owner', value: 'Danielle Okafor' },
      { label: 'Bills paid from', value: 'Chase checking ••7731' },
    ],
    people: [],
  },
  {
    id: 'dad',
    name: "Dad's house",
    short: 'Linden St',
    street: '112 Linden St',
    cityLine: 'Zanesville, OH 43701',
    color: '#b5532a',
    tint: '#fbeee6',
    glyph: 'sale',
    status: 'Listed for sale · vacant',
    facts: [
      { label: 'Owner', value: 'Raymond Okafor (Dad)' },
      { label: 'Dad moved', value: 'Brookside Senior Living, Mar 14' },
      { label: 'Listed for sale', value: 'Sep 22 with Whitcomb Realty' },
      { label: 'Bills paid from', value: "Dad's Huntington checking ••4410" },
    ],
    access: [
      'Realtor lockbox on front door — code 2291 (call Pam first)',
      'Glenn Pruitt next door (114 Linden) has a spare key',
    ],
    people: [
      { name: 'Pam Whitcomb', role: 'Listing agent, Whitcomb Realty', phone: '740-252-8817', note: 'Holds lockbox code 2291' },
      { name: 'Glenn Pruitt', role: 'Neighbor, 114 Linden St', phone: '740-297-4415', note: 'Spare key; checks the porch' },
      { name: 'Raymond Okafor', role: 'Dad · Brookside Senior Living', phone: '740-454-6120', note: 'Room 214' },
    ],
  },
  {
    id: 'cottage',
    name: 'Lake cottage',
    short: 'Buckeye Lake',
    street: '9 Harbor Point Ln',
    cityLine: 'Buckeye Lake, OH 43008',
    color: '#2e7458',
    tint: '#e7f3ed',
    glyph: 'cabin',
    status: 'Co-owned with Marcus · closing for winter',
    facts: [
      { label: 'Owners', value: 'Danielle & Marcus Okafor, 50/50' },
      { label: 'Season', value: 'Closed for winter after Oct 11' },
      { label: 'Costs split', value: 'Marcus reimburses half monthly' },
    ],
    people: [
      { name: 'Marcus Okafor', role: 'Brother · co-owner', phone: '614-883-2054', note: 'Drains the lines once water is off' },
    ],
  },
];

// ------------------------------------------------------------------
// Bill / reading generator
// ------------------------------------------------------------------
const MF = (o: number, c: number) => ({ 1: [o, c], 2: [o, c], 3: [o, c], 4: [o, c], 5: [o, c] }) as Record<1 | 2 | 3 | 4 | 5, [number, number]>;

interface SeriesOpts {
  id: string;
  start: [number, number]; // year, monthIndex of first reading/bill
  days: number[] | number; // reading (or bill) day of month
  issueLag: number;
  dueLag: number;
  amounts: number[];
  autopay: boolean;
  usage?: number[];
  startIndex?: number;
  unitLabel?: string;
  estimated?: number[];
}

function series(o: SeriesOpts): { bills: Bill[]; readings: Reading[] } {
  const bills: Bill[] = [];
  const readings: Reading[] = [];
  let idx = o.startIndex ?? 0;
  o.amounts.forEach((amount, i) => {
    const day = Array.isArray(o.days) ? o.days[i] : o.days;
    const readDate = new Date(o.start[0], o.start[1] + i, day);
    const issued = addDays(readDate, o.issueLag);
    const due = addDays(issued, o.dueLag);
    const past = due.getTime() < NOW.getTime();
    const status: BillStatus = past ? (o.autopay ? 'autopaid' : 'paid') : o.autopay ? 'scheduled' : 'due';
    const est = o.estimated?.includes(i) ?? false;
    if (o.usage) {
      idx += o.usage[i];
      readings.push({ date: iso(readDate), value: idx, usage: o.usage[i], type: est ? 'estimated' : 'actual' });
    }
    bills.push({
      id: `${o.id}-b${i}`,
      label: issued.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      issued: iso(issued),
      due: iso(due),
      amount,
      status,
      paidOn: past ? iso(o.autopay ? due : addDays(due, -4)) : undefined,
      usage: o.usage ? `${o.usage[i].toLocaleString()} ${o.unitLabel}` : undefined,
      estimated: est,
    });
  });
  return { bills: bills.reverse(), readings: readings.reverse() };
}

// ---------- Shared provider contacts ----------
const columbiaService: Contact = {
  id: 'cg-service',
  label: 'Customer service',
  phone: '1-800-344-4077',
  hours: { ...MF(hm(7), hm(19)) },
  web: 'columbiagasohio.com',
};
const columbiaEmergency: Contact = {
  id: 'cg-emergency',
  label: 'Gas leak / emergency',
  phone: '1-800-282-0151',
  hours: '24/7',
  note: 'Smell gas? Leave the house first, then call.',
};
const aepService: Contact = {
  id: 'aep-service',
  label: 'Customer service',
  phone: '1-800-672-2231',
  hours: { ...MF(hm(7), hm(19)) },
  web: 'aepohio.com',
};
const aepOutage: Contact = {
  id: 'aep-outage',
  label: 'Report an outage',
  phone: '1-800-277-2177',
  hours: '24/7',
};

// ------------------------------------------------------------------
// Accounts
// ------------------------------------------------------------------
const homeElectric = series({
  id: 'home-electric', start: [2025, 11], days: 4, issueLag: 2, dueLag: 18, autopay: true,
  amounts: [148.22, 171.05, 158.33, 126.9, 98.14, 104.6, 121.67, 176.48, 212.3, 198.75, 141.2, 104.88],
  usage: [1012, 1188, 1094, 862, 655, 701, 822, 1216, 1478, 1371, 958, 702], startIndex: 48210, unitLabel: 'kWh',
});
const homeGas = series({
  id: 'home-gas', start: [2025, 10], days: [17, 16, 16, 17, 17, 16, 15, 16, 17, 17, 16, 15], issueLag: 3, dueLag: 21, autopay: true,
  amounts: [88.14, 151.62, 189.4, 172.08, 121.35, 78.9, 52.16, 41.07, 39.22, 40.15, 44.3, 69.48],
  usage: [58, 124, 161, 143, 96, 52, 24, 11, 8, 9, 13, 39], startIndex: 9214, unitLabel: 'CCF',
  estimated: [3],
});
const homeWater = series({
  id: 'home-water', start: [2025, 11], days: 3, issueLag: 4, dueLag: 20, autopay: false,
  amounts: [61.2, 59.84, 58.91, 60.33, 62.1, 66.47, 74.9, 83.62, 81.05, 70.18, 64.4, 62.75],
  usage: [4.1, 3.9, 3.8, 4.0, 4.2, 4.6, 5.4, 6.3, 6.1, 5.0, 4.4, 4.3], startIndex: 812.6, unitLabel: 'kgal',
});
const homeTrash = series({
  id: 'home-trash', start: [2025, 11], days: 1, issueLag: 0, dueLag: 25, autopay: true,
  amounts: [32.75, 32.75, 32.75, 32.75, 32.75, 32.75, 32.75, 34.1, 34.1, 34.1, 34.1, 34.1],
});
const homeInternet = series({
  id: 'home-internet', start: [2025, 11], days: 8, issueLag: 0, dueLag: 15, autopay: true,
  amounts: [74.99, 74.99, 74.99, 74.99, 79.99, 79.99, 79.99, 79.99, 79.99, 79.99, 79.99, 79.99],
});

const dadElectric = series({
  id: 'dad-electric', start: [2025, 11], days: 5, issueLag: 2, dueLag: 18, autopay: true,
  amounts: [142.3, 151.9, 139.4, 96.2, 52.1, 47.8, 61.3, 66.9, 58.2, 44.7, 41.3, 45.12],
  usage: [968, 1041, 947, 640, 318, 286, 382, 421, 360, 262, 238, 266], startIndex: 77105, unitLabel: 'kWh',
});
const dadGas = series({
  id: 'dad-gas', start: [2025, 10], days: [12, 11, 13, 11, 13, 13, 12, 11, 14, 13, 14, 13], issueLag: 3, dueLag: 21, autopay: true,
  amounts: [96.4, 128.15, 141.22, 133.8, 102.67, 67.35, 45.9, 39.12, 38.04, 38.4, 41.18, 58.27],
  usage: [62, 98, 112, 104, 72, 38, 17, 8, 6, 6, 8, 21], startIndex: 17462, unitLabel: 'CCF',
  estimated: [9, 10, 11],
});
const dadWater = series({
  id: 'dad-water', start: [2025, 11], days: 2, issueLag: 3, dueLag: 19, autopay: false,
  amounts: [71.2, 69.85, 70.4, 66.1, 52.4, 48.9, 48.9, 49.35, 48.9, 48.9, 48.9, 52.4],
  usage: [3.2, 3.1, 3.1, 2.8, 0.9, 0.2, 0.2, 0.3, 0.2, 0.2, 0.2, 0.6], startIndex: 1290.4, unitLabel: 'kgal',
});
const dadInternet = series({
  id: 'dad-internet', start: [2025, 11], days: 11, issueLag: 0, dueLag: 14, autopay: true,
  amounts: Array(12).fill(64.99),
});

const cottageElectric = series({
  id: 'cottage-electric', start: [2025, 11], days: 1, issueLag: 3, dueLag: 20, autopay: true,
  amounts: [61.5, 66.0, 58.7, 44.1, 52.8, 89.6, 131.4, 142.9, 97.3, 63.0, 39.8, 41.65],
  usage: [402, 437, 381, 268, 330, 611, 932, 1018, 664, 404, 214, 228], startIndex: 30551, unitLabel: 'kWh',
});
const cottageWater = series({
  id: 'cottage-water', start: [2025, 11], days: 2, issueLag: 4, dueLag: 21, autopay: false,
  amounts: [38.5, 38.5, 38.5, 38.5, 42.7, 60.55, 88.9, 104.65, 100.45, 66.85, 53.2, 46.06],
  usage: [0, 0, 0, 0, 400, 2100, 4800, 6300, 5900, 2700, 1400, 720], startIndex: 482100, unitLabel: 'gal',
});

// Propane: deliveries, not monthly bills
const propaneBills: Bill[] = [
  { id: 'pr-8', label: 'Delivery — 150 gal @ $2.35', issued: '2026-10-21', due: '2026-11-20', amount: 352.5, status: 'paid', paidOn: '2026-10-30', usage: '150 gal' },
  { id: 'pr-7', label: 'Delivery — 90 gal @ $2.44', issued: '2026-09-08', due: '2026-10-08', amount: 219.6, status: 'paid', paidOn: '2026-09-15', usage: '90 gal' },
  { id: 'pr-6', label: 'Annual tank lease (250 gal)', issued: '2026-06-01', due: '2026-07-01', amount: 89.0, status: 'paid', paidOn: '2026-06-12' },
  { id: 'pr-5', label: 'Delivery — 60 gal @ $2.65', issued: '2026-04-09', due: '2026-05-09', amount: 159.0, status: 'paid', paidOn: '2026-04-20', usage: '60 gal' },
  { id: 'pr-4', label: 'Delivery — 140 gal @ $2.42', issued: '2026-02-17', due: '2026-03-19', amount: 338.8, status: 'paid', paidOn: '2026-02-26', usage: '140 gal' },
  { id: 'pr-3', label: 'Delivery — 165 gal @ $2.37', issued: '2026-01-06', due: '2026-02-05', amount: 391.05, status: 'paid', paidOn: '2026-01-14', usage: '165 gal' },
  { id: 'pr-2', label: 'Delivery — 180 gal @ $2.29', issued: '2025-11-19', due: '2025-12-19', amount: 412.2, status: 'paid', paidOn: '2025-12-01', usage: '180 gal' },
  { id: 'pr-1', label: 'Annual safety check — leak test', issued: '2025-10-28', due: '2025-11-27', amount: 65.0, status: 'paid', paidOn: '2025-11-05' },
];
const propaneReadings: Reading[] = [
  { date: '2026-11-08', value: 71, usage: 4, type: 'customer', note: 'Marcus checked the gauge' },
  { date: '2026-10-21', value: 75, usage: 0, type: 'actual', note: 'Driver reading after fill' },
  { date: '2026-10-21', value: 15, usage: 21, type: 'actual', note: 'Driver reading before fill' },
  { date: '2026-09-08', value: 36, usage: 0, type: 'actual', note: 'After fill' },
  { date: '2026-04-09', value: 70, usage: 0, type: 'actual', note: 'After fill' },
  { date: '2026-02-17', value: 72, usage: 0, type: 'actual', note: 'After fill' },
];

export const ACCOUNTS: Account[] = [
  // ---------------- My house ----------------
  {
    id: 'home-electric', propertyId: 'home', kind: 'electric', provider: 'AEP Ohio',
    accountNumber: '110 482 337 04', holder: 'Danielle Okafor', authorized: [],
    serviceAddress: '4418 Whitlow Ave, Columbus, OH 43214',
    autopay: { on: true, detail: 'Chase checking ••7731, on the due date' },
    paperless: 'Bills emailed to Danielle', since: 'Jun 2014', plan: 'Residential service · budget billing pending',
    flags: ['Budget billing pending'], billingCycle: 'Monthly, read around the 4th',
    meter: { number: 'AEP 6620195', location: 'Outside, east wall by the AC unit', unit: 'kWh', readingLabel: 'kWh', usageLabel: 'kWh used', kind: 'Smart meter (reads remotely)' },
    contacts: [aepService, { id: 'aep-budget', label: 'Budget billing questions', phone: '1-800-672-2231', hours: { ...MF(hm(7), hm(19)) }, note: 'Say “budget billing” at the prompt.' }, aepOutage],
    ...homeElectric,
  },
  {
    id: 'home-gas', propertyId: 'home', kind: 'gas', provider: 'Columbia Gas of Ohio',
    accountNumber: '18 0277 4410 8812', holder: 'Danielle Okafor', authorized: [],
    serviceAddress: '4418 Whitlow Ave, Columbus, OH 43214',
    autopay: { on: true, detail: 'Chase checking ••7731, on the due date' },
    paperless: 'Bills emailed to Danielle', since: 'Jun 2014', plan: 'Residential · Standard Choice Offer',
    flags: [], billingCycle: 'Monthly, read mid-month',
    meter: { number: 'CG 0447120', location: 'Outside, north side by the driveway', unit: 'CCF', readingLabel: 'CCF', usageLabel: 'CCF used', kind: 'Dial meter (read by a meter reader)' },
    contacts: [columbiaService, columbiaEmergency],
    ...homeGas,
  },
  {
    id: 'home-water', propertyId: 'home', kind: 'water', provider: 'City of Columbus — Public Utilities',
    accountNumber: '3021-55870-002', holder: 'Danielle Okafor', authorized: [],
    serviceAddress: '4418 Whitlow Ave, Columbus, OH 43214',
    autopay: { on: false, detail: 'Paid online each month' },
    paperless: 'Bills emailed to Danielle', since: 'Jun 2014', plan: 'Water, sewer & stormwater',
    flags: [], billingCycle: 'Monthly, read around the 3rd',
    meter: { number: 'COL 88-31742', location: 'Basement, front wall (remote reader outside)', unit: 'kgal', readingLabel: 'thousand gal', usageLabel: 'thousand gal used', kind: 'Radio-read meter' },
    contacts: [
      { id: 'cbus-billing', label: 'Utility billing', phone: '614-645-8276', hours: { ...MF(hm(7, 30), hm(17)) }, web: 'columbus.gov/utilities' },
      { id: 'cbus-emergency', label: 'Water main break / no water', phone: '614-645-7788', hours: '24/7' },
    ],
    ...homeWater,
  },
  {
    id: 'home-trash', propertyId: 'home', kind: 'trash', provider: 'Rumpke Waste & Recycling',
    accountNumber: 'RW-0917-44263', holder: 'Danielle Okafor', authorized: [],
    serviceAddress: '4418 Whitlow Ave, Columbus, OH 43214',
    autopay: { on: true, detail: 'Visa ••2208, on the 1st' },
    paperless: 'Bills emailed to Danielle', since: 'Mar 2019', plan: 'Weekly trash (Tue) + biweekly recycling',
    flags: [], billingCycle: 'Monthly, flat rate',
    contacts: [{ id: 'rumpke', label: 'Customer service', phone: '1-800-828-8171', hours: { ...MF(hm(7), hm(17)) }, web: 'rumpke.com' }],
    ...homeTrash,
  },
  {
    id: 'home-internet', propertyId: 'home', kind: 'internet', provider: 'WOW! Internet',
    accountNumber: '8150 2244 0718 336', holder: 'Danielle Okafor', authorized: [],
    serviceAddress: '4418 Whitlow Ave, Columbus, OH 43214',
    autopay: { on: true, detail: 'Visa ••2208, on the 8th' },
    paperless: 'Bills emailed to Danielle', since: 'Aug 2021', plan: 'Internet 500 (promo price ended Apr 2026)',
    flags: [], billingCycle: 'Monthly, flat rate',
    contacts: [{ id: 'wow', label: 'Support & billing', phone: '1-866-496-9669', hours: '24/7', web: 'wowway.com' }],
    ...homeInternet,
  },

  // ---------------- Dad's house ----------------
  {
    id: 'dad-electric', propertyId: 'dad', kind: 'electric', provider: 'AEP Ohio',
    accountNumber: '110 917 662 49', holder: 'Raymond Okafor', authorized: ['Danielle Okafor'],
    serviceAddress: '112 Linden St, Zanesville, OH 43701',
    autopay: { on: true, detail: "Dad's Huntington checking ••4410" },
    paperless: 'Bills emailed to Danielle (authorized contact)', since: 'Apr 1987', plan: 'Residential service',
    flags: ['Keep on until closing'], billingCycle: 'Monthly, read around the 5th',
    meter: { number: 'AEP 3318402', location: 'Outside, side of the garage', unit: 'kWh', readingLabel: 'kWh', usageLabel: 'kWh used', kind: 'Smart meter (reads remotely)' },
    contacts: [aepService, aepOutage],
    ...dadElectric,
  },
  {
    id: 'dad-gas', propertyId: 'dad', kind: 'gas', provider: 'Columbia Gas of Ohio',
    accountNumber: '18 0619 2245 0317', holder: 'Raymond Okafor', authorized: ['Danielle Okafor'],
    serviceAddress: '112 Linden St, Zanesville, OH 43701',
    autopay: { on: true, detail: "Dad's Huntington checking ••4410, on the due date" },
    paperless: 'Bills & notices emailed to Danielle (authorized contact)', since: 'Apr 1987', plan: 'Residential · Standard Choice Offer',
    flags: ['Keep on until closing'], billingCycle: 'Monthly, read mid-month',
    meter: { number: 'CG 0191887', location: 'Inside — basement, left of the furnace', unit: 'CCF', readingLabel: 'CCF', usageLabel: 'CCF used', kind: 'Inside dial meter (needs someone to let the reader in)' },
    contacts: [
      {
        id: 'cg-meter', label: 'Meter access & appointments', phone: '1-877-520-0345',
        hours: { ...MF(hm(7), hm(18)), 6: [hm(8), hm(12)] },
        note: 'Ask for an inside-meter appointment. 4-hour windows, Mon–Sat. Have the account number ready.',
        source: 'From the Nov 12 letter',
      },
      columbiaService,
      columbiaEmergency,
    ],
    ...dadGas,
  },
  {
    id: 'dad-water', propertyId: 'dad', kind: 'water', provider: 'City of Zanesville — Water & Sewer',
    accountNumber: '07-1124-0112', holder: 'Raymond Okafor', authorized: ['Danielle Okafor'],
    serviceAddress: '112 Linden St, Zanesville, OH 43701',
    autopay: { on: false, detail: 'Danielle pays online from Dad’s checking' },
    paperless: 'Paper bill mailed to 112 Linden St; copy forwarded by USPS to Danielle', since: 'Apr 1987', plan: 'Residential water & sewer',
    flags: ['Request final reading before closing'], billingCycle: 'Monthly, read around the 2nd',
    meter: { number: 'ZAN 40271', location: 'Curb box, front yard', unit: 'kgal', readingLabel: 'thousand gal', usageLabel: 'thousand gal used', kind: 'Curb meter (read by city crew)' },
    contacts: [
      { id: 'zan-office', label: 'Water office (billing)', phone: '740-455-0641', hours: { ...MF(hm(8), hm(16, 30)) }, address: '401 Market St, Zanesville' },
      { id: 'zan-after', label: 'After-hours water emergency', phone: '740-455-0638', hours: '24/7' },
    ],
    ...dadWater,
  },
  {
    id: 'dad-internet', propertyId: 'dad', kind: 'internet', provider: 'Spectrum',
    accountNumber: '8352 1100 4471 9026', holder: 'Raymond Okafor', authorized: ['Danielle Okafor'],
    serviceAddress: '112 Linden St, Zanesville, OH 43701',
    autopay: { on: true, detail: "Dad's Visa ••6631" },
    paperless: 'Bills emailed to Danielle', since: 'Feb 2016', plan: 'Internet Premier (keeps the thermostat & camera online)',
    flags: ['Cancel at closing'], billingCycle: 'Monthly, flat rate',
    contacts: [
      { id: 'spectrum', label: 'Customer service', phone: '1-833-267-6094', hours: '24/7', web: 'spectrum.net' },
      { id: 'spectrum-store', label: 'Spectrum store (equipment returns)', address: '3575 Maple Ave, Zanesville', hours: { 1: [hm(10), hm(20)], 2: [hm(10), hm(20)], 3: [hm(10), hm(20)], 4: [hm(10), hm(20)], 5: [hm(10), hm(20)], 6: [hm(10), hm(20)], 0: [hm(12), hm(17)] } },
    ],
    ...dadInternet,
  },

  // ---------------- Lake cottage ----------------
  {
    id: 'cottage-electric', propertyId: 'cottage', kind: 'electric', provider: 'The Energy Cooperative',
    accountNumber: '4471-0093-18', holder: 'Danielle Okafor', authorized: ['Marcus Okafor'],
    serviceAddress: '9 Harbor Point Ln, Buckeye Lake, OH 43008',
    autopay: { on: true, detail: 'Chase checking ••7731 (Marcus reimburses half)' },
    paperless: 'Bills emailed to Danielle and Marcus', since: 'May 2020', plan: 'Seasonal residential',
    flags: [], billingCycle: 'Monthly, read on the 1st',
    meter: { number: 'TEC 551-0870', location: 'Pole by the driveway', unit: 'kWh', readingLabel: 'kWh', usageLabel: 'kWh used', kind: 'Smart meter (reads remotely)' },
    contacts: [
      { id: 'tec', label: 'Member services', phone: '1-800-255-6815', hours: { ...MF(hm(7, 30), hm(16, 30)) }, web: 'theenergycoop.com' },
      { id: 'tec-out', label: 'Report an outage', phone: '1-888-535-5732', hours: '24/7' },
    ],
    ...cottageElectric,
  },
  {
    id: 'cottage-water', propertyId: 'cottage', kind: 'water', provider: 'Village of Buckeye Lake — Water',
    accountNumber: 'BL-2207-09', holder: 'Danielle Okafor', authorized: ['Marcus Okafor'],
    serviceAddress: '9 Harbor Point Ln, Buckeye Lake, OH 43008',
    autopay: { on: false, detail: 'Paid by check (village has no autopay)' },
    paperless: 'Paper bill mailed to Danielle', since: 'May 2020', plan: 'Seasonal water & sewer · base charge applies year-round',
    flags: ['Winter shutoff requested'], billingCycle: 'Monthly, read around the 2nd',
    meter: { number: 'BL 7012', location: 'Curb stop at the road, by the mailbox', unit: 'gal', readingLabel: 'gal', usageLabel: 'gal used', kind: 'Curb meter (read by village crew)' },
    contacts: [
      { id: 'bl-office', label: 'Village utility office', phone: '740-929-1914', hours: { ...MF(hm(8), hm(16)) }, note: 'Ask for Terri in utility billing — she took the Oct 6 request.', address: '5192 Walnut Rd SE, Buckeye Lake' },
      { id: 'bl-works', label: 'Public works (after hours)', phone: '740-928-0233', hours: '24/7', note: 'Leaks and breaks only.' },
    ],
    ...cottageWater,
  },
  {
    id: 'cottage-propane', propertyId: 'cottage', kind: 'propane', provider: 'Hartley Fuel',
    accountNumber: 'HF-30558', holder: 'Marcus Okafor', authorized: ['Danielle Okafor'],
    serviceAddress: '9 Harbor Point Ln, Buckeye Lake, OH 43008',
    autopay: { on: false, detail: 'Will-call delivery · paid by card when delivered' },
    paperless: 'Delivery tickets emailed to Marcus and Danielle', since: 'Oct 2020', plan: 'Will-call (no automatic refills) · leased 250-gal tank',
    flags: [], billingCycle: 'Billed per delivery',
    meter: { number: 'Tank #HF-1184', location: 'Behind the shed', unit: '%', readingLabel: 'tank gauge %', usageLabel: '', kind: 'Tank gauge (no meter)' },
    contacts: [
      { id: 'hartley', label: 'Order a delivery', phone: '740-928-3310', hours: { ...MF(hm(8), hm(17)), 6: [hm(8), hm(12)] } },
      { id: 'hartley-after', label: 'No heat / leak (after hours)', phone: '740-928-3311', hours: '24/7' },
    ],
    bills: propaneBills,
    readings: propaneReadings,
  },
];

// ------------------------------------------------------------------
// Notices (saved letters & emails)
// ------------------------------------------------------------------
export const NOTICES: Notice[] = [
  {
    id: 'n-dad-meter',
    accountId: 'dad-gas',
    title: 'Meter access required',
    from: 'Columbia Gas of Ohio',
    fromAddress: 'myaccount@columbiagasohio.com',
    channel: 'Email (also mailed to 112 Linden St)',
    received: '2026-11-12',
    receivedTime: '3:08 PM',
    dueBy: '2026-11-21',
    needsAction: true,
    summary: 'No actual reading since Jul 14. Schedule an inside-meter appointment by Nov 21 or service may be interrupted.',
    body: [
      'Dear Raymond Okafor,',
      'We have been unable to read the natural gas meter at 112 LINDEN ST, ZANESVILLE OH 43701 since July 14, 2026. Your bills for August, September and October were based on estimated readings.',
      'Your meter is located inside the building. Ohio rules require us to obtain an actual meter reading at least once every 12 months and to periodically inspect meters located indoors for safety.',
      'Please call 1-877-520-0345 by Saturday, November 21, 2026 to schedule an appointment. Appointments are available Monday through Saturday in 4-hour windows. An adult (18 or older) must be present to let our technician reach the meter. The visit usually takes less than 15 minutes.',
      'If we are unable to access the meter, your gas service may be interrupted. If service is interrupted, a reconnection charge may apply and an adult will need to be present to restore service.',
      'Once we obtain an actual reading, your next bill may include an adjustment for any difference between the estimated and actual usage.',
    ],
    footer: ['Account number: 18 0619 2245 0317', 'Service address: 112 Linden St, Zanesville OH 43701', 'Letter reference: MA-1112-0317'],
  },
  {
    id: 'n-dad-gas-price',
    accountId: 'dad-gas',
    title: 'Your gas supply price for November',
    from: 'Columbia Gas of Ohio',
    fromAddress: 'myaccount@columbiagasohio.com',
    channel: 'Email',
    received: '2026-10-29',
    receivedTime: '9:14 AM',
    needsAction: false,
    summary: 'Standard Choice Offer rate for November billing cycles: $0.548 per CCF.',
    body: [
      'Dear Raymond Okafor,',
      'The Standard Choice Offer rate for bills issued in November 2026 is $0.548 per CCF, up from $0.512 in October.',
      'No action is needed. You can compare supplier offers at energychoice.ohio.gov.',
    ],
  },
  {
    id: 'n-home-gas-price',
    accountId: 'home-gas',
    title: 'Your gas supply price for November',
    from: 'Columbia Gas of Ohio',
    fromAddress: 'myaccount@columbiagasohio.com',
    channel: 'Email',
    received: '2026-10-29',
    receivedTime: '9:11 AM',
    needsAction: false,
    summary: 'Standard Choice Offer rate for November billing cycles: $0.548 per CCF.',
    body: [
      'Dear Danielle Okafor,',
      'The Standard Choice Offer rate for bills issued in November 2026 is $0.548 per CCF, up from $0.512 in October.',
      'No action is needed. You can compare supplier offers at energychoice.ohio.gov.',
    ],
  },
  {
    id: 'n-home-budget',
    accountId: 'home-electric',
    title: 'We received your budget billing request',
    from: 'AEP Ohio',
    fromAddress: 'noreply@aepohio.com',
    channel: 'Email',
    received: '2026-10-28',
    receivedTime: '8:52 PM',
    needsAction: false,
    summary: 'Confirmation BB-7716204. Your budget amount will appear on a statement within 1–2 billing cycles.',
    body: [
      'Hi Danielle,',
      'Thanks for enrolling in Budget Billing. Your confirmation number is BB-7716204.',
      'We’ll calculate your monthly budget amount from the last 12 months of usage at 4418 Whitlow Ave. It will appear on a statement within the next 1–2 billing cycles. Until then, keep paying your regular bill.',
    ],
  },
  {
    id: 'n-cottage-sr',
    accountId: 'cottage-water',
    title: 'Service request received — #W-30871',
    from: 'Village of Buckeye Lake',
    fromAddress: 'utilities@buckeyelakevillage.org',
    channel: 'Email (online request form)',
    received: '2026-10-06',
    receivedTime: '7:31 PM',
    needsAction: false,
    summary: 'Seasonal shutoff request received. “A member of our public works staff will contact you to schedule.”',
    body: [
      'Thank you for contacting the Village of Buckeye Lake Utility Department.',
      'Request #: W-30871\nType: Seasonal shutoff (turn off at curb stop)\nService address: 9 HARBOR POINT LN\nRequested by: Danielle Okafor\nPreferred date: Before Oct 20',
      'Your request has been received. A member of our public works staff will contact you to schedule. Seasonal shutoffs are typically completed within 10 business days. The monthly base charge continues to apply while service is off.',
    ],
  },
  {
    id: 'n-cottage-sr-2025',
    accountId: 'cottage-water',
    title: 'Service request completed — #W-28114',
    from: 'Village of Buckeye Lake',
    fromAddress: 'utilities@buckeyelakevillage.org',
    channel: 'Email',
    received: '2025-10-15',
    receivedTime: '2:40 PM',
    needsAction: false,
    summary: 'Last year’s seasonal shutoff was completed Oct 15, 2025 (meter read 482,100 gal).',
    body: [
      'Request #: W-28114\nType: Seasonal shutoff\nService address: 9 HARBOR POINT LN',
      'Status: Completed 10/15/2025. Water was turned off at the curb stop. Final reading 482,100 gal.',
      'To restore service in the spring, submit a turn-on request at least 5 business days ahead.',
    ],
  },
  {
    id: 'n-dad-spectrum',
    accountId: 'dad-internet',
    title: 'Equipment return instructions',
    from: 'Spectrum',
    fromAddress: 'no-reply@spectrum.net',
    channel: 'Email (saved from chat with support)',
    received: '2026-09-24',
    receivedTime: '12:06 PM',
    needsAction: false,
    summary: 'Return the modem and Wi-Fi router within 14 days after service is cancelled to avoid non-return fees.',
    body: [
      'Hi Raymond,',
      'As discussed, when you cancel service at 112 Linden St, please return the following equipment within 14 days to avoid non-return fees:',
      '• Modem — SAX2V1S (serial ending 7Q41)\n• Wi-Fi router — RAC2V1K (serial ending 0K88)',
      'You can drop them off at any Spectrum store or request a prepaid UPS return box.',
    ],
  },
  {
    id: 'n-dad-water-report',
    accountId: 'dad-water',
    title: '2025 water quality report',
    from: 'City of Zanesville',
    fromAddress: 'Paper notice (forwarded mail)',
    channel: 'Mail',
    received: '2026-06-19',
    receivedTime: '—',
    needsAction: false,
    summary: 'Annual consumer confidence report. No violations. Informational only.',
    body: ['The City of Zanesville met all state and federal drinking water standards in 2025. Informational only — no action needed.'],
  },
];

// ------------------------------------------------------------------
// Open items (service requests, to-dos, enrollments)
// ------------------------------------------------------------------
export const OPEN_ITEMS: OpenItem[] = [
  {
    id: 'oi-meter',
    propertyId: 'dad',
    accountId: 'dad-gas',
    title: 'Give Columbia Gas access to the meter',
    ref: 'Letter MA-1112-0317',
    kind: 'Notice',
    opened: '2026-11-12',
    due: '2026-11-21',
    status: 'action',
    providerStatus: 'Appointment not scheduled',
    summary: 'Inside meter in the basement. Someone 18+ has to let them in, or gas service may be interrupted.',
    noticeId: 'n-dad-meter',
    log: [{ date: '2026-11-12', text: 'Columbia Gas emailed the “Meter access required” letter (also mailed to the house).', by: 'Saved from email' }],
  },
  {
    id: 'oi-shutoff',
    propertyId: 'cottage',
    accountId: 'cottage-water',
    title: 'Seasonal water shutoff',
    ref: '#W-30871',
    kind: 'Service request',
    opened: '2026-10-06',
    status: 'waiting',
    providerStatus: 'Received',
    summary: 'Turn water off at the curb stop for winter. Marcus drains the lines once the village confirms.',
    steps: [
      { label: 'Submitted', date: '2026-10-06', done: true },
      { label: 'Received', date: '2026-10-06', done: true },
      { label: 'Scheduled', done: false },
      { label: 'Completed', done: false },
    ],
    noticeId: 'n-cottage-sr',
    log: [
      { date: '2026-10-06', text: 'Submitted online. Asked for it to be done before Oct 20.', by: 'Danielle' },
      { date: '2026-10-06', text: 'Village emailed: request received, staff will contact to schedule.', by: 'Saved from email' },
    ],
  },
  {
    id: 'oi-spectrum',
    propertyId: 'dad',
    accountId: 'dad-internet',
    title: 'Return Spectrum modem & router',
    ref: 'Modem SAX2V1S · Router RAC2V1K',
    kind: 'To-do',
    opened: '2026-09-24',
    dueLabel: 'Within 14 days after cancelling (at closing)',
    status: 'todo',
    summary: 'Both are in the original box in the front hall closet. Drop at the Maple Ave store after service is cancelled.',
    noticeId: 'n-dad-spectrum',
    log: [{ date: '2026-09-24', text: 'Chatted with Spectrum: cancel at closing, then return equipment within 14 days.', by: 'Danielle' }],
  },
  {
    id: 'oi-budget',
    propertyId: 'home',
    accountId: 'home-electric',
    title: 'Budget billing enrollment',
    ref: 'Confirmation BB-7716204',
    kind: 'Enrollment',
    opened: '2026-10-28',
    dueLabel: 'First budget amount expected on the Dec bill',
    status: 'waiting',
    providerStatus: 'Pending',
    summary: 'Enrolled online. Keep paying the regular bill until the budget amount shows up.',
    noticeId: 'n-home-budget',
    log: [{ date: '2026-10-28', text: 'Enrolled online; AEP emailed confirmation BB-7716204.', by: 'Danielle' }],
  },
  {
    id: 'oi-shutoff-2025',
    propertyId: 'cottage',
    accountId: 'cottage-water',
    title: 'Seasonal water shutoff (last year)',
    ref: '#W-28114',
    kind: 'Service request',
    opened: '2025-10-03',
    completed: '2025-10-15',
    status: 'done',
    providerStatus: 'Completed',
    summary: 'Turned off at the curb stop Oct 15, 2025 — 12 days after the request.',
    steps: [
      { label: 'Submitted', date: '2025-10-03', done: true },
      { label: 'Received', date: '2025-10-03', done: true },
      { label: 'Scheduled', date: '2025-10-09', done: true },
      { label: 'Completed', date: '2025-10-15', done: true },
    ],
    noticeId: 'n-cottage-sr-2025',
    log: [{ date: '2025-10-15', text: 'Village emailed: completed, final reading 482,100 gal.', by: 'Saved from email' }],
  },
];

export const NOTES: Note[] = [
  { id: 'note-1', propertyId: 'dad', accountId: 'dad-gas', date: '2026-10-03', text: 'Realtor has lockbox code 2291 — Pam Whitcomb, 740-252-8817. Text Pam before anyone goes in.' },
  { id: 'note-2', propertyId: 'dad', accountId: 'dad-gas', date: '2026-09-22', text: 'Keep gas ON until closing — thermostat at 55° for showings and so the pipes don’t freeze.' },
  { id: 'note-3', propertyId: 'dad', accountId: 'dad-gas', date: '2026-03-22', text: 'Meter is in the basement, left of the furnace. Basement door sticks — lift the handle and push.' },
  { id: 'note-4', propertyId: 'dad', accountId: 'dad-electric', date: '2026-09-22', text: 'Transfer to buyer at closing, don’t cancel. Smart thermostat and the porch camera need power.' },
  { id: 'note-5', propertyId: 'dad', accountId: 'dad-water', date: '2026-09-22', text: 'City needs 5 business days’ notice to do a final reading before closing.' },
  { id: 'note-6', propertyId: 'dad', accountId: 'dad-internet', date: '2026-09-24', text: 'Cancel at closing. Spectrum needs Dad on the phone OR the authorization letter (scanned Mar 30, in Dad folder).' },
  { id: 'note-7', propertyId: 'cottage', accountId: 'cottage-water', date: '2026-10-06', text: 'Asked for shutoff at the curb stop before first freeze. Marcus drains lines + antifreeze in the traps once the village confirms it’s off.' },
  { id: 'note-8', propertyId: 'cottage', accountId: 'cottage-water', date: '2026-10-06', text: 'Called the village office too — Terri said usually 1–2 weeks.' },
  { id: 'note-9', propertyId: 'cottage', accountId: 'cottage-propane', date: '2026-10-21', text: 'Will-call, not auto-delivery. Marcus orders; we split 50/50. Keep tank above 30% over winter (heat set to 45°).' },
  { id: 'note-10', propertyId: 'home', accountId: 'home-electric', date: '2026-10-28', text: 'Enrolled in budget billing — first budget amount should show on the December bill.' },
  { id: 'note-11', propertyId: 'home', accountId: 'home-internet', date: '2026-04-09', text: 'Promo ended in April (+$5). Call in Feb to ask about retention offer.' },
  { id: 'note-12', propertyId: 'home', accountId: 'home-gas', date: '2026-10-14', text: 'Furnace serviced Oct 14 by Buckeye Heating & Air ($139).' },
];

export const propertyById = (id: string) => PROPERTIES.find((p) => p.id === id)!;
export const accountById = (id: string) => ACCOUNTS.find((a) => a.id === id);
export const accountsFor = (propertyId: string) => ACCOUNTS.filter((a) => a.propertyId === propertyId);
