import type { AppState, Bunk, Cabin, Person, Role, Lodging, Booking, Waiver } from '../types';
import { COURSE, START_MINUTE } from '../config';

export const CABINS: Cabin[] = [
  {
    id: 'HEL',
    name: 'Heliconia',
    designation: 'women',
    bathroom: 'Shared bath · 2 showers · 2 toilets',
    restrictions: [],
  },
  {
    id: 'CEI',
    name: 'Ceiba',
    designation: 'men',
    bathroom: 'Shared bath · 2 showers · 2 toilets',
    restrictions: [],
  },
  {
    id: 'MAN',
    name: 'Manglar',
    designation: 'mixed',
    bathroom: 'Shared bath · 2 showers',
    restrictions: [
      {
        from: '2026-11-25',
        to: '2026-11-27',
        label: 'Restricted – permit housing',
        detail: 'Reserved for MINAE permit inspectors. Any course stay that covers these nights cannot use this cabin.',
      },
    ],
  },
  {
    id: 'TUC',
    name: 'Tucán',
    designation: 'mixed',
    bathroom: 'Shared bath · 2 showers',
    restrictions: [],
  },
  {
    id: 'GAR',
    name: 'Garza',
    designation: 'mixed',
    bathroom: 'Shared bath · 2 showers',
    restrictions: [],
  },
  {
    id: 'RES',
    name: 'Researcher House',
    designation: 'mixed',
    bathroom: 'Ensuite bath in each room',
    restrictions: [],
  },
];

/** cabin id, sleeps count, bunk numbers held for BIO 377 */
const BUNK_PLAN: [string, number, number[]][] = [
  ['HEL', 10, [1, 2, 3, 4, 5]],
  ['CEI', 12, [1, 2, 3, 4, 5]],
  ['MAN', 8, [1, 2]],
  ['TUC', 10, [1, 2, 3, 4, 5]],
  ['GAR', 10, [3, 4, 5, 6, 7]],
  ['RES', 8, [2, 3]],
];

export function buildBunks(): Bunk[] {
  const bunks: Bunk[] = [];
  for (const [cabinId, count, held] of BUNK_PLAN) {
    for (let n = 1; n <= count; n++) {
      bunks.push({ id: `${cabinId}-${n}`, cabinId, number: n, held: held.includes(n) });
    }
  }
  return bunks;
}

const course = (
  id: string,
  name: string,
  role: Role,
  lodging: Lodging,
  booking: Booking,
  waiver: Waiver,
  bunkId: string,
  trip: 1 | 2 | null,
  diet: string | null = null,
): Person => ({
  id,
  name,
  role,
  lodging,
  isResident: false,
  booking,
  waiver,
  diet,
  bunkId,
  trip,
  from: COURSE.from,
  to: COURSE.to,
});

const resident = (id: string, name: string, role: Role, lodging: Lodging, bunkId: string, from: string, to: string): Person => ({
  id,
  name,
  role,
  lodging,
  isResident: true,
  booking: 'confirmed',
  waiver: 'complete',
  diet: null,
  bunkId,
  trip: null,
  from,
  to,
});

export const SEED_PEOPLE: Person[] = [
  resident('res-pazos', 'Dr. Ana Pazos', 'Resident researcher', 'women', 'RES-1', '2026-10-27', '2026-12-07'),
  resident('res-arce', 'Diego Arce', 'Graduate researcher', 'men', 'GAR-1', '2026-11-01', '2026-12-07'),
  resident('res-rojas', 'Valentina Rojas', 'Graduate researcher', 'women', 'GAR-2', '2026-11-01', '2026-12-07'),

  course('brandt', 'Dr. Helen Brandt', 'Instructor', 'women', 'confirmed', 'complete', 'RES-2', 1),
  course('ortiz', 'Dr. Julián Ortiz-Cruz', 'Instructor', 'men', 'confirmed', 'complete', 'RES-3', 1),

  course('lindqvist', 'Maren Lindqvist', 'Student', 'women', 'confirmed', 'complete', 'HEL-1', 1),
  course('ravindran', 'Priya Ravindran', 'Student', 'women', 'confirmed', 'incomplete', 'HEL-2', 2),
  course('soto', 'Gabriela Soto', 'Student', 'women', 'confirmed', 'complete', 'HEL-3', 1, 'Celiac (gluten-free)'),
  course('whitcombe', 'Tessa Whitcombe', 'Student', 'women', 'tentative', 'complete', 'HEL-4', null),

  course('brackett', 'Owen Brackett', 'Student', 'men', 'confirmed', 'complete', 'CEI-1', 1),
  course('reilly', 'Jonah Reilly', 'Student', 'men', 'confirmed', 'incomplete', 'CEI-2', 2),
  course('mizrahi', 'Ethan Mizrahi', 'Student', 'men', 'confirmed', 'complete', 'CEI-3', 1),
  course('halvorsen', 'Kenji Halvorsen', 'Student', 'men', 'tentative', 'complete', 'CEI-4', null),
  course('pruitt', 'Dylan Pruitt', 'Student', 'men', 'confirmed', 'incomplete', 'CEI-5', 2),

  course('adeyemi', 'Sam Adeyemi', 'Student', 'men', 'confirmed', 'complete', 'MAN-1', 1),
  course('kovac', 'Nadia Kovač', 'Student', 'women', 'tentative', 'complete', 'MAN-2', null),

  course('hoffmann', 'Lena Hoffmann', 'Student', 'women', 'confirmed', 'complete', 'TUC-1', 1),
  course('quintero', 'Mateo Quintero', 'Student', 'men', 'confirmed', 'complete', 'TUC-2', 1),
  course('dargan', 'Chloe Dargan', 'Student', 'women', 'confirmed', 'complete', 'TUC-3', 1),
  course('castaneda', 'Ruben Castañeda', 'Student', 'men', 'tentative', 'complete', 'TUC-4', null),

  course('shaw', 'Imani Shaw', 'Student', 'women', 'confirmed', 'complete', 'GAR-3', 1),
  course('feldstein', 'Noah Feldstein', 'Student', 'men', 'confirmed', 'complete', 'GAR-4', 1),
  course('lindgren', 'Hannah Lindgren', 'Student', 'women', 'confirmed', 'complete', 'GAR-5', 1),
  course('mwangi', 'Caleb Mwangi', 'Student', 'men', 'confirmed', 'incomplete', 'GAR-6', 2),
  course('osei', 'Riley Osei', 'Student', 'women', 'confirmed', 'complete', 'GAR-7', 1),
];

export function initialState(): AppState {
  return {
    clock: START_MINUTE,
    people: SEED_PEOPLE.map((p) => ({ ...p })),
    bunks: buildBunks(),
    kitchen: { B: 27, L: 27, D: 27 },
    lunchPackedForBoat: false,
    manifestSentKey: null,
    log: [
      { id: 1, time: 'Mon 16 Nov 15:20', text: 'BIO 377 block hold created: 24 bunks, Wed 18 Nov to Wed 2 Dec. Instructor of record: Dr. Helen Brandt.' },
      { id: 2, time: 'Mon 16 Nov 16:02', text: 'Kitchen notified: 27 covers per meal for Wed 18 Nov (the full block hold, including unnamed and tentative bunks).' },
      { id: 3, time: 'Tue 17 Nov 08:30', text: 'Waiver reminder sent to 4 BIO 377 students whose waivers are incomplete.' },
    ],
    nextLogId: 4,
  };
}
