export type Route = 'north' | 'creek';
export type Status = 'active' | 'vacant' | 'seasonal';

export interface Connection {
  meter: string;
  member: string;
  route: Route;
  line: number; // line number on the volunteer's paper sheet
  status: Status;
  prev: number; // reading at Oct 15, gallons
  avg: number; // 12-month average, gallons per month
  replacedOn?: string; // meter replaced during this cycle
  knownIssue?: { date: string; text: string; short: string };
}

export interface Resolution {
  type: 'kept' | 'corrected' | 'replaced';
  note: string;
  from?: number; // previously entered reading (for corrections)
  on: string;
}

export interface Entry {
  reading: number | null;
  oldFinal: number | null; // old meter's last reading before a swap
  swapped: boolean; // meter was swapped/rolled over (when not already known)
  confirmedKey: string | null; // "reading|oldFinal" that Gordon has reviewed and kept
  resolution: Resolution | null;
}

export const ASSOCIATION = 'Larkspur Flat Mutual Water Association';
export const CYCLE = { label: 'October 15 – November 15, 2026', short: 'Oct 15 – Nov 15, 2026', start: 'Oct 15', end: 'Nov 15' };
export const BILLS_DUE = { label: 'Friday, November 20', short: 'Nov 20', daysLeft: 4 };
export const TODAY = 'Nov 16';

export const RATES = { baseCents: 3800, includedGal: 3000, perThousandCents: 410 };

export const ROUTES: Record<Route, { name: string; short: string; reader: string; readOn: string }> = {
  north: { name: 'North Ridge', short: 'NR', reader: 'Sue Marsh', readOn: 'Sat, Nov 14' },
  creek: { name: 'Creek Road', short: 'CR', reader: 'Ben Cho', readOn: 'Sun, Nov 15' },
};

type Row = [meter: string, member: string, status: Status, prev: number, avg: number];

const north: Row[] = [
  ['WM-0201', 'Abernathy, Tom & Carol', 'active', 212480, 5300],
  ['WM-0202', 'Brandt, Elaine', 'active', 98150, 3200],
  ['WM-0203', 'Castellanos, Rafael', 'active', 301940, 7400],
  ['WM-0204', 'Dunmore, Walter', 'active', 154020, 4600],
  ['WM-0205', 'Eriksen, Linnea', 'active', 67830, 2800],
  ['WM-0206', 'Fairbanks, Joel', 'vacant', 45210, 2400],
  ['WM-0207', 'Gutierrez, Marisol', 'active', 187360, 6800],
  ['WM-0208', 'Hartwell, Dennis', 'active', 129700, 4100],
  ['WM-0209', 'Kessler, Ruth', 'active', 91860, 5400],
  ['WM-0210', 'Lindqvist, Bo', 'active', 233570, 8200],
  ['WM-0211', 'Mbeki, Thandiwe', 'active', 76440, 3900],
  ['WM-0212', 'Tillman, Gerald', 'active', 142900, 6100],
  ['WM-0213', 'Nakamura, Hiroshi & Joy', 'active', 118230, 4800],
  ['WM-0214', "O'Rourke, Pat", 'active', 55600, 2400],
  ['WM-0215', 'Pruitt, Gordon & Marlene', 'active', 261140, 4500],
  ['WM-0216', 'Quintero, Beatriz', 'active', 83970, 3500],
  ['WM-0217', 'Rasmussen, Hal', 'active', 174300, 5900],
  ['WM-0218', 'Sandoval, Inez', 'active', 109520, 4300],
  ['WM-0219', 'Whitcomb, Dale (cabin)', 'seasonal', 38640, 1900],
  ['WM-0220', 'Yamamoto, Keiko', 'active', 196850, 6200],
  ['WM-0221', 'Zielinski, Frank', 'active', 72380, 2900],
  ['WM-0222', 'Ahlgren, Peter', 'active', 148910, 5000],
  ['WM-0223', 'Bellamy, Cassandra', 'active', 220450, 7100],
  ['WM-0224', 'Ostrander, Wendell', 'active', 163780, 5100],
  ['WM-0225', 'Pelletier, Marc', 'active', 91050, 3700],
  ['WM-0226', 'Rowe, Annette', 'active', 135260, 4400],
  ['WM-0227', 'Sutter, Calvin', 'active', 58920, 2600],
  ['WM-0228', 'Tran, Minh & Lan', 'active', 244030, 9100],
  ['WM-0229', 'Underhill, Josephine', 'active', 106770, 3800],
  ['WM-0230', 'Vasquez, Armando', 'active', 138200, 5600],
  ['WM-0231', 'Wexler, Dolores', 'active', 87640, 3300],
];

const creek: Row[] = [
  ['WM-0232', 'Ingram, Colleen', 'active', 204780, 6000],
  ['WM-0233', 'Halvorsen, Nils & Britt', 'active', 143870, 4300],
  ['WM-0234', 'Jankowski, Stan', 'active', 119040, 4000],
  ['WM-0235', 'Kowalczyk, Irene', 'active', 71260, 2700],
  ['WM-0236', 'Lund, Everett', 'active', 252300, 8500],
  ['WM-0237', 'Morrow, Daphne', 'active', 99480, 3600],
  ['WM-0238', 'Nguyen, Thanh', 'active', 176510, 5800],
  ['WM-0239', 'Okafor, Chidi & Ada', 'active', 138090, 5200],
  ['WM-0240', 'Prescott, Lyle', 'vacant', 61730, 1800],
  ['WM-0241', 'Quinlan, Moira', 'active', 90360, 3100],
  ['WM-0242', 'Ramirez, Esteban', 'active', 211970, 7300],
  ['WM-0243', 'Sorensen, Kirsten', 'active', 84820, 3400],
  ['WM-0244', 'Thibault, Marcel', 'active', 157430, 5500],
  ['WM-0245', 'Ulrich, Greta', 'active', 66900, 2500],
  ['WM-0246', 'Voss, Leonard', 'active', 193280, 6400],
  ['WM-0247', 'Weatherby, Ona', 'active', 122610, 4700],
  ['WM-0248', 'Delgado, Ramón & Sofía', 'active', 228340, 6600],
  ['WM-0249', 'Eastman, Clyde', 'vacant', 104150, 2200],
  ['WM-0250', 'Fenn, Marguerite (cabin)', 'seasonal', 27380, 1500],
  ['WM-0251', 'Galloway, Tessa', 'active', 168720, 5700],
  ['WM-0252', 'Hoang, Vinh', 'active', 79590, 3000],
  ['WM-0253', 'Iverson, Maud', 'active', 133860, 4200],
  ['WM-0254', 'Jessup, Clarence', 'active', 245010, 8800],
  ['WM-0255', 'Kimura, Aiko', 'active', 95470, 3700],
  ['WM-0256', 'Lockhart, Rudy', 'active', 151300, 5100],
  ['WM-0257', 'Mercado, Lucía', 'active', 116940, 4500],
  ['WM-0258', 'Nolan, Frances', 'active', 58160, 2300],
];

const build = (rows: Row[], route: Route): Connection[] =>
  rows.map(([meter, member, status, prev, avg], i) => {
    const c: Connection = { meter, member, route, line: i + 1, status, prev, avg };
    if (meter === 'WM-0233') c.replacedOn = 'Oct 28';
    if (meter === 'WM-0248') c.knownIssue = { date: 'Nov 3', text: 'Member reported a burst pipe on Nov 3', short: 'Burst pipe reported Nov 3' };
    return c;
  });

export const CONNECTIONS: Connection[] = [...build(north, 'north'), ...build(creek, 'creek')];
export const BY_METER: Record<string, Connection> = Object.fromEntries(CONNECTIONS.map((c) => [c.meter, c]));

// ---- What Gordon has already typed in from the paper sheets (Monday morning) ----
const seedReadings: Record<string, number> = {
  // North Ridge — Sue Marsh's sheet, all 31 entered
  'WM-0201': 217610, 'WM-0202': 101060, 'WM-0203': 309730, 'WM-0204': 158310, 'WM-0205': 70540,
  'WM-0206': 45210, 'WM-0207': 194020, 'WM-0208': 133940,
  'WM-0209': 9709, // dropped a digit — should be flagged
  'WM-0210': 242300, 'WM-0211': 80060,
  'WM-0212': 155800, // big jump, already reviewed
  'WM-0213': 123020, 'WM-0214': 57930, 'WM-0215': 265420, 'WM-0216': 87410, 'WM-0217': 180150,
  'WM-0218': 113980, 'WM-0219': 38690, 'WM-0220': 202730, 'WM-0221': 75510, 'WM-0222': 154020,
  'WM-0223': 227320,
  'WM-0224': 178380, // big jump, still needs review
  'WM-0225': 94610, 'WM-0226': 139540, 'WM-0227': 61380, 'WM-0228': 253410, 'WM-0229': 110320,
  'WM-0230': 143670, // corrected earlier
  'WM-0231': 90490,
  // Creek Road — Ben Cho's sheet, first 12 lines entered
  'WM-0232': 210610,
  'WM-0233': 2310, // new meter, counts from 0 after Oct 28
  'WM-0234': 122880, 'WM-0235': 73810, 'WM-0236': 260690, 'WM-0237': 102880, 'WM-0238': 182060,
  'WM-0239': 143420, 'WM-0240': 61730, 'WM-0241': 93240, 'WM-0242': 219150, 'WM-0243': 88070,
};

export const emptyEntry = (): Entry => ({ reading: null, oldFinal: null, swapped: false, confirmedKey: null, resolution: null });

export function seedEntries(): Record<string, Entry> {
  const out: Record<string, Entry> = {};
  for (const c of CONNECTIONS) {
    const e = emptyEntry();
    if (seedReadings[c.meter] != null) e.reading = seedReadings[c.meter];
    out[c.meter] = e;
  }
  out['WM-0212'].confirmedKey = '155800|null';
  out['WM-0212'].resolution = {
    type: 'kept',
    note: 'Phoned Gerald Nov 16. He refilled his stock pond after the dam repair, so the jump is expected.',
    on: 'Nov 16',
  };
  out['WM-0230'].resolution = {
    type: 'corrected',
    from: 138670,
    note: 'Typed 138,670; Sue’s sheet reads 143,670.',
    on: 'Nov 16',
  };
  return out;
}
