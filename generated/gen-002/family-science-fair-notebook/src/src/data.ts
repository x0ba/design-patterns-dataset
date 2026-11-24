// Mock data for the Oyelaran family notebook. Everything is client-side.

export type PersonId = 'temi' | 'marcus' | 'funmi' | 'albrecht';

export interface Person {
  id: PersonId;
  name: string;
  short: string;
  initials: string;
  role: string;
  where: string;
  color: string;
  tint: string;
  can: { ownSections: boolean; addData: boolean; comment: boolean };
}

export const ME: PersonId = 'marcus';

export const PEOPLE: Record<PersonId, Person> = {
  temi: {
    id: 'temi',
    name: 'Temi Oyelaran',
    short: 'Temi',
    initials: 'TO',
    role: 'Student scientist',
    where: 'Home',
    color: '#2c64a8',
    tint: '#e4edf8',
    can: { ownSections: true, addData: true, comment: true },
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus Oyelaran',
    short: 'Marcus',
    initials: 'MO',
    role: 'Parent helper',
    where: 'Home',
    color: '#a8641c',
    tint: '#f7ecdc',
    can: { ownSections: false, addData: true, comment: true },
  },
  funmi: {
    id: 'funmi',
    name: 'Grandma Funmi',
    short: 'Grandma Funmi',
    initials: 'GF',
    role: 'Grandparent helper',
    where: "Grandma's house · 2 hrs away",
    color: '#86397a',
    tint: '#f4e5f0',
    can: { ownSections: false, addData: true, comment: true },
  },
  albrecht: {
    id: 'albrecht',
    name: 'Ms. Albrecht',
    short: 'Ms. Albrecht',
    initials: 'MA',
    role: '7th-grade science teacher',
    where: 'Westbrook Middle School',
    color: '#56656e',
    tint: '#e8ecee',
    can: { ownSections: false, addData: false, comment: false },
  },
};

export const displayName = (id: PersonId) => (id === ME ? 'You' : PEOPLE[id].short);

// ---------- Time ----------
// "Now" is Tuesday evening, Nov 17 2026, when Marcus checks in after work.
export const NOW = new Date(2026, 10, 17, 18, 12);
export const SUNDAY = new Date(2026, 10, 15, 0, 0);
export const LAST_WEEK = new Date(2026, 10, 10, 18, 12);
export const FAIR_DATE = new Date(2026, 11, 5);
export const START_DAY = new Date(2026, 9, 27); // Day 0 = Tue Oct 27
export const PLANNED_DAYS = 28;
export const TODAY_DAY = 21;

export const dayDate = (day: number) =>
  new Date(START_DAY.getFullYear(), START_DAY.getMonth(), START_DAY.getDate() + day);

const at = (day: number, h: number, m: number) => {
  const d = dayDate(day);
  d.setHours(h, m, 0, 0);
  return d;
};

// ---------- Containers ----------
export type ContainerId = 'H-F' | 'H-O' | 'H-FO' | 'H-C' | 'G-F' | 'G-FO';

export interface Container {
  id: ContainerId;
  label: string;
  site: 'home' | 'grandma';
  hasFoam: boolean;
  hasOats: boolean;
  keeper: PersonId;
  color: string;
}

export const CONTAINERS: Container[] = [
  { id: 'H-F', label: 'Foam only', site: 'home', hasFoam: true, hasOats: false, keeper: 'temi', color: '#2c64a8' },
  { id: 'H-O', label: 'Oats only', site: 'home', hasFoam: false, hasOats: true, keeper: 'temi', color: '#7a8b3a' },
  { id: 'H-FO', label: 'Foam + oats', site: 'home', hasFoam: true, hasOats: true, keeper: 'temi', color: '#1f7a6d' },
  { id: 'H-C', label: 'No food (control)', site: 'home', hasFoam: false, hasOats: false, keeper: 'temi', color: '#8a8378' },
  { id: 'G-F', label: 'Foam only', site: 'grandma', hasFoam: true, hasOats: false, keeper: 'funmi', color: '#86397a' },
  { id: 'G-FO', label: 'Foam + oats', site: 'grandma', hasFoam: true, hasOats: true, keeper: 'funmi', color: '#c0532f' },
];

export const container = (id: ContainerId) => CONTAINERS.find((c) => c.id === id)!;
export const siteLabel = (c: Container) => (c.site === 'home' ? 'Home' : "Grandma's");
export const containerName = (id: ContainerId) => {
  const c = container(id);
  return `${siteLabel(c)} · ${c.label}`;
};

// ---------- Readings ----------
export interface Reading {
  id: string;
  container: ContainerId;
  day: number;
  mass: number | null; // foam mass in g, null when no foam in container
  live: number;
  dead: number; // dead worms found & removed at this reading
  by: PersonId;
  at: Date; // when it was entered
  note?: string;
  photoId?: string;
  measuredNote?: string;
  second?: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

const homeDeaths: Record<string, Record<number, number>> = {
  'H-F': { 6: 1, 13: 1, 18: 1 },
  'H-O': { 10: 1 },
  'H-FO': { 15: 1 },
  'H-C': { 8: 1, 11: 1, 14: 1, 16: 1, 19: 1, 20: 1 },
};

const noiseF = [0, 1, 0, -1, 0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 0, 0, 1];
const noiseFO = [0, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 0];

const homeNotes: Record<string, string> = {
  'H-F-d2': 'Tiny bite marks on one corner of the foam.',
  'H-FO-d4': 'All the worms are hiding under the foam block.',
  'H-O-d11': 'Lots of molted skins in this one.',
  'H-C-d16': 'Another dead one. Control worms look smaller than the others.',
  'H-F-d19': 'Tunnels going in from two sides now.',
  'H-FO-d21': 'Foam has a hole almost all the way through.',
};

const homePhoto: Record<string, string> = {
  'H-FO-d19': 'p14',
};

function homeEntryTime(day: number, by: PersonId): Date {
  const dow = dayDate(day).getDay();
  const weekend = dow === 0 || dow === 6;
  if (day === 0) return at(0, 19, 5);
  if (by === 'marcus') return at(day, weekend ? 10 : 6, weekend ? 22 : 48);
  return weekend ? at(day, 9, 40 + (day % 3) * 4) : at(day, 7, 10 + (day % 4) * 3);
}

function buildHome(): Reading[] {
  const out: Reading[] = [];
  const specs: { id: ContainerId; start?: number; rate?: number; noise?: number[] }[] = [
    { id: 'H-F', start: 4.18, rate: 0.016, noise: noiseF },
    { id: 'H-O' },
    { id: 'H-FO', start: 4.06, rate: 0.021, noise: noiseFO },
    { id: 'H-C' },
  ];
  for (const s of specs) {
    let live = 50;
    for (let d = 0; d <= TODAY_DAY; d++) {
      const dead = homeDeaths[s.id][d] ?? 0;
      live -= dead;
      const by: PersonId = d === 5 || d === 6 || d === 12 ? 'marcus' : 'temi';
      const id = `${s.id}-d${d}`;
      let entry = homeEntryTime(d, by);
      if (d === 19) entry = at(19, 9, 48);
      if (d === 20) entry = at(20, 7, 12);
      if (d === 21) entry = at(21, 7, 20);
      out.push({
        id,
        container: s.id,
        day: d,
        mass: s.start != null ? r2(s.start - s.rate! * d + s.noise![d] * 0.01) : null,
        live,
        dead,
        by,
        at: entry,
        note: homeNotes[id],
        photoId: homePhoto[id],
      });
    }
  }
  return out;
}

function buildGrandma(): Reading[] {
  const days = [0, 3, 7, 10, 14, 17, 21];
  const entry: Record<number, Date> = {
    0: at(0, 18, 50),
    3: at(3, 8, 15),
    7: at(7, 7, 40),
    10: at(10, 8, 5),
    14: at(14, 7, 30),
    17: at(21, 7, 2),
    21: at(21, 7, 2),
  };
  const masses: Record<string, number[]> = {
    'G-F': [3.52, 3.47, 3.42, 3.37, 3.31, 3.27, 3.21],
    'G-FO': [3.38, 3.33, 3.25, 3.19, 3.12, 3.06, 3.41],
  };
  const deaths: Record<string, Record<number, number>> = {
    'G-F': { 10: 1, 14: 1, 17: 1, 21: 1 },
    'G-FO': { 7: 1, 17: 1 },
  };
  const notes: Record<string, string> = {
    'G-F-d0': 'Both tubs on the dresser in the back bedroom.',
    'G-FO-d10': 'The oats are almost gone. Added 2 g more like Temi said.',
    'G-F-d17': 'Weighed Friday morning, typing it in today.',
    'G-FO-d17': 'Weighed Friday morning, typing it in today.',
    'G-FO-d21': 'Took a picture of the scale this time.',
  };
  const out: Reading[] = [];
  for (const cid of ['G-F', 'G-FO'] as ContainerId[]) {
    let live = 50;
    days.forEach((d, i) => {
      const dead = deaths[cid][d] ?? 0;
      live -= dead;
      const id = `${cid}-d${d}`;
      out.push({
        id,
        container: cid,
        day: d,
        mass: masses[cid][i],
        live,
        dead,
        by: 'funmi',
        at: entry[d],
        note: notes[id],
        photoId: id === 'G-FO-d21' ? 'p18' : id === 'G-FO-d14' ? 'p17' : undefined,
        measuredNote: d === 17 ? 'Weighed Fri, Nov 13 · entered Tue, Nov 17' : undefined,
      });
    });
  }
  return out;
}

export const INITIAL_READINGS: Reading[] = [...buildHome(), ...buildGrandma()];

export interface EnvNote {
  id: string;
  by: PersonId;
  at: Date;
  site: 'home' | 'grandma';
  afterDay: number;
  text: string;
}

export const ENV_NOTES: EnvNote[] = [
  {
    id: 'n1',
    by: 'marcus',
    at: at(19, 14, 30),
    site: 'home',
    afterDay: 19,
    text: 'Moved all 4 tubs off the kitchen windowsill to the pantry shelf. The windowsill got down to 58°F overnight; the pantry stays around 68°F.',
  },
];

// ---------- Sections Temi owns ----------
export const HYPOTHESIS_V1 =
  'I think mealworms can eat polystyrene foam, so the foam will get lighter over time. I think the worms with oats will eat less foam because they will eat the oats instead.';

export const HYPOTHESIS_V2 =
  'If mealworms are fed only polystyrene foam, then the foam will lose mass over 28 days, because bacteria in their gut can break polystyrene down. I predict the worms fed foam and oats will eat more foam than the worms fed only foam, because the oats give them energy to keep eating.';

export const HYPOTHESIS_VERSIONS = [
  { v: 2, at: at(20, 21, 14), text: HYPOTHESIS_V2 },
  { v: 1, at: new Date(2026, 9, 24, 16, 2), text: HYPOTHESIS_V1 },
];

export const QUESTION =
  'Can mealworms eat polystyrene foam, and do they eat more of it when they also have oats?';

export const STEP4_OLD =
  'Weigh each foam block on the digital scale (reads to 0.01 g) using the small plastic weigh boat.';
export const STEP4_NEW =
  'Weigh each foam block on the digital scale (reads to 0.01 g). Put the empty weigh boat on first and press TARE so it reads 0.00 g, then add the foam.';

export const PROCEDURE: { n: number; text: string; editedAt?: Date }[] = [
  { n: 1, text: 'Buy 300 mealworms from one tub at the pet store so every group comes from the same batch.' },
  { n: 2, text: 'Label 6 clear plastic tubs: 4 at home (foam only, oats only, foam + oats, no food) and 2 at Grandma’s (foam only, foam + oats). Poke 10 air holes in each lid.' },
  { n: 3, text: 'Cut foam blocks from the same piece of white packing foam, about 4 cm × 4 cm × 2 cm each.' },
  { n: 4, text: STEP4_NEW, editedAt: at(20, 21, 31) },
  { n: 5, text: 'Count 50 mealworms into each tub.' },
  { n: 6, text: 'Add 5 g of rolled oats to the oats-only and foam + oats tubs. Add nothing to the control tub.' },
  { n: 7, text: 'Keep the tubs somewhere dark at room temperature (65–75°F).' },
  { n: 8, text: 'Every morning, take out the foam, brush off worms and frass, weigh it, and put it back. Count live worms and take out any dead ones.' },
  { n: 9, text: 'Take photos at least once a week.' },
  { n: 10, text: 'Run the experiment for 28 days (Day 0 was Tue, Oct 27, last day is Tue, Nov 24).' },
];

// ---------- Photos ----------
export type PhotoArtKind = 'tub' | 'scale' | 'closeup' | 'setup';
export interface Photo {
  id: string;
  day: number;
  site: 'home' | 'grandma';
  container?: ContainerId;
  by: PersonId;
  at: Date;
  caption: string;
  art: { kind: PhotoArtKind; foam?: boolean; oats?: boolean; worms?: number; wear?: number; reading?: string; boat?: boolean; seed: number; tubs?: number };
  src?: string; // uploaded photos
}

export const INITIAL_PHOTOS: Photo[] = [
  { id: 'p1', day: 0, site: 'home', by: 'temi', at: at(0, 19, 20), caption: 'Setup night: 4 tubs labeled, 50 worms in each', art: { kind: 'setup', seed: 1, tubs: 4 } },
  { id: 'p2', day: 0, site: 'home', container: 'H-F', by: 'temi', at: at(0, 19, 24), caption: 'Foam-only block before: 4.18 g', art: { kind: 'scale', reading: '4.18', foam: true, wear: 0, seed: 2 } },
  { id: 'p3', day: 2, site: 'home', container: 'H-F', by: 'temi', at: at(2, 7, 25), caption: 'First bite marks on the foam-only block', art: { kind: 'closeup', wear: 0.12, seed: 3 } },
  { id: 'p4', day: 4, site: 'home', container: 'H-FO', by: 'temi', at: at(4, 9, 52), caption: 'Worms all clustered under the foam in foam + oats', art: { kind: 'tub', foam: true, oats: true, worms: 22, wear: 0.15, seed: 4 } },
  { id: 'p5', day: 7, site: 'home', container: 'H-F', by: 'temi', at: at(7, 7, 30), caption: 'Week 1, foam only: small tunnels along one edge', art: { kind: 'closeup', wear: 0.3, seed: 5 } },
  { id: 'p6', day: 7, site: 'home', container: 'H-FO', by: 'temi', at: at(7, 7, 32), caption: 'Week 1, foam + oats: frass building up on the bottom', art: { kind: 'tub', foam: true, oats: true, worms: 20, wear: 0.3, seed: 6 } },
  { id: 'p7', day: 9, site: 'home', container: 'H-C', by: 'temi', at: at(9, 7, 22), caption: 'Control tub. Worms look a little smaller?', art: { kind: 'tub', worms: 18, seed: 7 } },
  { id: 'p8', day: 11, site: 'home', container: 'H-O', by: 'temi', at: at(11, 7, 18), caption: 'Oats only: lots of molted skins', art: { kind: 'tub', oats: true, worms: 20, seed: 8 } },
  { id: 'p9', day: 14, site: 'home', container: 'H-F', by: 'temi', at: at(14, 7, 31), caption: 'Week 2, foam only close-up', art: { kind: 'closeup', wear: 0.5, seed: 9 } },
  { id: 'p10', day: 14, site: 'home', by: 'marcus', at: at(14, 18, 40), caption: 'Scale check with a nickel (should be 5.00 g). It reads 5.00.', art: { kind: 'scale', reading: '5.00', seed: 10 } },
  { id: 'p11', day: 16, site: 'home', container: 'H-C', by: 'temi', at: at(16, 7, 26), caption: 'Took out another dead worm from the control', art: { kind: 'tub', worms: 16, seed: 11 } },
  { id: 'p12', day: 19, site: 'home', container: 'H-FO', by: 'temi', at: at(19, 9, 55), caption: 'Day 19, foam + oats from the top', art: { kind: 'tub', foam: true, oats: true, worms: 21, wear: 0.7, seed: 12 } },
  { id: 'p13', day: 19, site: 'home', container: 'H-F', by: 'temi', at: at(19, 9, 55), caption: 'Day 19, foam only: tunnels from two sides', art: { kind: 'closeup', wear: 0.65, seed: 13 } },
  { id: 'p14', day: 19, site: 'home', container: 'H-FO', by: 'temi', at: at(19, 9, 56), caption: 'Weighing the foam + oats block: 3.66 g', art: { kind: 'scale', reading: '3.66', foam: true, wear: 0.7, seed: 14 } },
  { id: 'p15', day: 0, site: 'grandma', by: 'funmi', at: at(0, 18, 55), caption: 'My two tubs on the dresser in the back bedroom', art: { kind: 'setup', seed: 15, tubs: 2 } },
  { id: 'p16', day: 7, site: 'grandma', container: 'G-F', by: 'funmi', at: at(7, 7, 45), caption: 'Foam only after one week', art: { kind: 'tub', foam: true, worms: 19, wear: 0.25, seed: 16 } },
  { id: 'p17', day: 14, site: 'grandma', container: 'G-FO', by: 'funmi', at: at(14, 7, 33), caption: 'Foam + oats, day 14 weigh-in', art: { kind: 'scale', reading: '3.12', foam: true, wear: 0.5, seed: 17 } },
  { id: 'p18', day: 21, site: 'grandma', container: 'G-FO', by: 'funmi', at: at(21, 7, 6), caption: 'Foam + oats, day 21. Took a picture of the scale this time.', art: { kind: 'scale', reading: '3.41', foam: true, wear: 0.62, boat: true, seed: 18 } },
];

// ---------- Change history ----------
export type Change =
  | { id: string; at: Date; by: PersonId; kind: 'readings'; readingIds: string[]; summary: string }
  | { id: string; at: Date; by: PersonId; kind: 'hypothesis'; from: string; to: string }
  | { id: string; at: Date; by: PersonId; kind: 'procedure'; step: number; from: string; to: string }
  | { id: string; at: Date; by: PersonId; kind: 'photos'; photoIds: string[] }
  | { id: string; at: Date; by: PersonId; kind: 'note'; noteId: string };

const homeIds = (d: number) => ['H-F', 'H-O', 'H-FO', 'H-C'].map((c) => `${c}-d${d}`);

export const INITIAL_HISTORY: Change[] = [
  // Older (shown with "Last 7 days")
  { id: 'o1', at: at(15, 7, 19), by: 'temi', kind: 'readings', readingIds: homeIds(15), summary: 'Day 15 weigh-ins' },
  { id: 'o2', at: at(16, 7, 22), by: 'temi', kind: 'readings', readingIds: homeIds(16), summary: 'Day 16 weigh-ins' },
  { id: 'o3', at: at(16, 7, 26), by: 'temi', kind: 'photos', photoIds: ['p11'] },
  { id: 'o4', at: at(17, 7, 25), by: 'temi', kind: 'readings', readingIds: homeIds(17), summary: 'Day 17 weigh-ins' },
  { id: 'o5', at: at(18, 9, 40), by: 'temi', kind: 'readings', readingIds: homeIds(18), summary: 'Day 18 weigh-ins' },
  // Since Sunday — 9 edits
  { id: 'c1', at: at(19, 9, 48), by: 'temi', kind: 'readings', readingIds: homeIds(19), summary: 'Day 19 weigh-ins' },
  { id: 'c2', at: at(19, 9, 55), by: 'temi', kind: 'photos', photoIds: ['p12', 'p13', 'p14'] },
  { id: 'c3', at: at(19, 14, 30), by: 'marcus', kind: 'note', noteId: 'n1' },
  { id: 'c4', at: at(20, 7, 12), by: 'temi', kind: 'readings', readingIds: homeIds(20), summary: 'Day 20 weigh-ins' },
  { id: 'c5', at: at(20, 21, 14), by: 'temi', kind: 'hypothesis', from: HYPOTHESIS_V1, to: HYPOTHESIS_V2 },
  { id: 'c6', at: at(20, 21, 31), by: 'temi', kind: 'procedure', step: 4, from: STEP4_OLD, to: STEP4_NEW },
  { id: 'c7', at: at(21, 7, 2), by: 'funmi', kind: 'readings', readingIds: ['G-F-d17', 'G-FO-d17', 'G-F-d21', 'G-FO-d21'], summary: 'Week 3 weigh-ins (days 17 and 21)' },
  { id: 'c8', at: at(21, 7, 6), by: 'funmi', kind: 'photos', photoIds: ['p18'] },
  { id: 'c9', at: at(21, 7, 20), by: 'temi', kind: 'readings', readingIds: homeIds(21), summary: 'Day 21 weigh-ins' },
];

// ---------- Comments ----------
export interface Comment {
  id: string;
  target: string; // e.g. "section:hypothesis", "reading:G-FO-d21", "photo:p10", "step:4"
  by: PersonId;
  at: Date;
  text: string;
  to: PersonId[];
  kind: 'comment' | 'question';
  quote?: string;
  answered?: boolean;
  replies: { id: string; by: PersonId; at: Date; text: string }[];
}

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'k1',
    target: 'section:procedure',
    by: 'funmi',
    at: at(7, 19, 10),
    text: 'My tubs are on the dresser in the back bedroom with the curtains closed. It stays about 70°F in there.',
    to: ['temi'],
    kind: 'comment',
    replies: [{ id: 'k1r', by: 'temi', at: at(7, 20, 2), text: 'Perfect, thank you Grandma! That matches step 7.' }],
  },
  {
    id: 'k2',
    target: 'reading:H-C-d16',
    by: 'marcus',
    at: at(16, 18, 30),
    text: 'Is the control supposed to lose this many? Just checking it isn’t too cold by the window.',
    to: ['temi'],
    kind: 'question',
    answered: true,
    replies: [
      { id: 'k2r', by: 'temi', at: at(16, 19, 45), text: 'Ms. Albrecht said the no-food worms dying more is expected, that’s why it’s the control. But maybe check the window too.' },
    ],
  },
  {
    id: 'k3',
    target: 'photo:p10',
    by: 'funmi',
    at: at(14, 20, 15),
    text: 'Clever to check the scale with a nickel! I will do the same with mine.',
    to: ['marcus', 'temi'],
    kind: 'comment',
    replies: [],
  },
];

export const LAST_VISIT = at(19, 14, 34);
