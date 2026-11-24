import { destination } from '../lib/geo';

export interface ApolloSite {
  id: string;
  mission: string;
  siteName: string;
  region: string;
  date: string; // ISO
  lat: number;
  lon: number;
  commander: string;
  crew: { name: string; role: string }[];
  surfaceTime: string;
  samplesKg: number;
  leftBehind: string[];
  summary: string;
}

export const APOLLO: ApolloSite[] = [
  {
    id: 'apollo-11', mission: 'Apollo 11', siteName: 'Tranquility Base', region: 'Sea of Tranquility (Mare Tranquillitatis)',
    date: '1969-07-20', lat: 0.674, lon: 23.473, commander: 'Neil Armstrong',
    crew: [
      { name: 'Neil Armstrong', role: 'Commander · walked on the Moon' },
      { name: 'Buzz Aldrin', role: 'Lunar module pilot · walked on the Moon' },
      { name: 'Michael Collins', role: 'Command module pilot · stayed in orbit' },
    ],
    surfaceTime: '21 h 36 min', samplesKg: 21.5,
    leftBehind: [
      'The lander’s lower half, which served as the launch pad',
      'A plaque: “We came in peace for all mankind”',
      'A U.S. flag (probably bleached white by sunlight by now)',
      'A mirror array for bouncing lasers from Earth, still in use',
      'A seismometer and many small mementos',
    ],
    summary: 'The first time people set foot on another world.',
  },
  {
    id: 'apollo-12', mission: 'Apollo 12', siteName: 'Ocean of Storms', region: 'Ocean of Storms (Oceanus Procellarum)',
    date: '1969-11-19', lat: -3.013, lon: -23.422, commander: 'Pete Conrad',
    crew: [
      { name: 'Pete Conrad', role: 'Commander · walked on the Moon' },
      { name: 'Alan Bean', role: 'Lunar module pilot · walked on the Moon' },
      { name: 'Richard Gordon', role: 'Command module pilot · stayed in orbit' },
    ],
    surfaceTime: '31 h 31 min', samplesKg: 34.3,
    leftBehind: ['A nuclear-powered science station (ALSEP)', 'The lander’s lower half'],
    summary: 'A pinpoint landing about 180 m from Surveyor 3. The crew brought back pieces of the old probe.',
  },
  {
    id: 'apollo-14', mission: 'Apollo 14', siteName: 'Fra Mauro', region: 'Fra Mauro highlands',
    date: '1971-02-05', lat: -3.645, lon: -17.471, commander: 'Alan Shepard',
    crew: [
      { name: 'Alan Shepard', role: 'Commander · walked on the Moon' },
      { name: 'Edgar Mitchell', role: 'Lunar module pilot · walked on the Moon' },
      { name: 'Stuart Roosa', role: 'Command module pilot · stayed in orbit' },
    ],
    surfaceTime: '33 h 31 min', samplesKg: 42.3,
    leftBehind: ['Two golf balls hit by Shepard', 'A science station (ALSEP)', 'An improvised “javelin”'],
    summary: 'Flew after Apollo 13’s aborted mission and went to the same highlands. Shepard famously hit golf balls there.',
  },
  {
    id: 'apollo-15', mission: 'Apollo 15', siteName: 'Hadley–Apennine', region: 'Foot of the Apennine Mountains',
    date: '1971-07-30', lat: 26.132, lon: 3.633, commander: 'David Scott',
    crew: [
      { name: 'David Scott', role: 'Commander · walked on the Moon' },
      { name: 'James Irwin', role: 'Lunar module pilot · walked on the Moon' },
      { name: 'Alfred Worden', role: 'Command module pilot · stayed in orbit' },
    ],
    surfaceTime: '66 h 55 min', samplesKg: 77.3,
    leftBehind: ['The first Moon rover', 'A small “Fallen Astronaut” statue and plaque', 'A science station (ALSEP)'],
    summary: 'The first mission with a rover. Scott dropped a hammer and a feather together to show they fall at the same speed.',
  },
  {
    id: 'apollo-16', mission: 'Apollo 16', siteName: 'Descartes Highlands', region: 'Descartes Highlands',
    date: '1972-04-21', lat: -8.973, lon: 15.5, commander: 'John Young',
    crew: [
      { name: 'John Young', role: 'Commander · walked on the Moon' },
      { name: 'Charles Duke', role: 'Lunar module pilot · walked on the Moon' },
      { name: 'Ken Mattingly', role: 'Command module pilot · stayed in orbit' },
    ],
    surfaceTime: '71 h 2 min', samplesKg: 95.7,
    leftBehind: ['A rover', 'A photo of Charles Duke’s family', 'A science station (ALSEP)'],
    summary: 'The only Apollo landing in the Moon’s rugged highlands.',
  },
  {
    id: 'apollo-17', mission: 'Apollo 17', siteName: 'Taurus–Littrow', region: 'Taurus–Littrow valley',
    date: '1972-12-11', lat: 20.191, lon: 30.772, commander: 'Eugene Cernan',
    crew: [
      { name: 'Eugene Cernan', role: 'Commander · walked on the Moon' },
      { name: 'Harrison Schmitt', role: 'Lunar module pilot · geologist · walked on the Moon' },
      { name: 'Ronald Evans', role: 'Command module pilot · stayed in orbit' },
    ],
    surfaceTime: '75 h 0 min', samplesKg: 110.5,
    leftBehind: ['A rover', 'A plaque marking the last human exploration of the Moon', 'A science station (ALSEP)'],
    summary: 'The last time anyone walked on the Moon. Schmitt was the only professional geologist to go.',
  },
];

export type MissionStatus = 'active' | 'ended' | 'crashed';
export interface Robotic {
  id: string;
  name: string;
  kind: 'lander' | 'impactor' | 'rover';
  operator: string;
  date: string;
  lat: number;
  lon: number;
  status: MissionStatus;
  summary: string;
  featureNear?: string;
}

/* Polar Scout lands 2.8 km outside Haworth's rim (Haworth: 51 km wide, centre 87.5° S 5.0° W). */
export const POLAR_SCOUT_GAP_KM = 2.8;
export const HAWORTH_CENTER = { lat: -87.5, lon: -5.0, diameter: 51 };
export const POLAR_SCOUT_BEARING = 38; // degrees; north = away from the pole
const psPos = destination(HAWORTH_CENTER.lat, HAWORTH_CENTER.lon, POLAR_SCOUT_BEARING, HAWORTH_CENTER.diameter / 2 + POLAR_SCOUT_GAP_KM);

export const ROBOTIC: Robotic[] = [
  { id: 'luna-2', name: 'Luna 2', kind: 'impactor', operator: 'Soviet Union', date: '1959-09-13', lat: 29.1, lon: 0.0, status: 'crashed',
    summary: 'The first human-made object to reach the Moon. It hit the surface on purpose.' },
  { id: 'ranger-7', name: 'Ranger 7', kind: 'impactor', operator: 'United States', date: '1964-07-31', lat: -10.63, lon: -20.68, status: 'crashed',
    summary: 'Sent back 4,316 close-up photos in its final minutes before a planned crash.' },
  { id: 'luna-9', name: 'Luna 9', kind: 'lander', operator: 'Soviet Union', date: '1966-02-03', lat: 7.08, lon: -64.37, status: 'ended',
    summary: 'First spacecraft to make a soft landing on the Moon and send back pictures from the surface.' },
  { id: 'surveyor-1', name: 'Surveyor 1', kind: 'lander', operator: 'United States', date: '1966-06-02', lat: -2.45, lon: -43.22, status: 'ended',
    summary: 'America’s first soft landing, scouting the surface ahead of Apollo.' },
  { id: 'surveyor-3', name: 'Surveyor 3', kind: 'lander', operator: 'United States', date: '1967-04-20', lat: -2.99, lon: -23.34, status: 'ended',
    summary: 'Visited by Apollo 12 astronauts, who brought parts of it home.' },
  { id: 'surveyor-7', name: 'Surveyor 7', kind: 'lander', operator: 'United States', date: '1968-01-10', lat: -40.98, lon: -11.47, status: 'ended',
    summary: 'The only Surveyor to land in the highlands, just north of Tycho crater.' },
  { id: 'luna-16', name: 'Luna 16', kind: 'lander', operator: 'Soviet Union', date: '1970-09-20', lat: -0.68, lon: 56.3, status: 'ended',
    summary: 'The first robot to bring Moon samples back to Earth, about 100 grams.' },
  { id: 'lunokhod-1', name: 'Lunokhod 1', kind: 'rover', operator: 'Soviet Union', date: '1970-11-17', lat: 38.24, lon: -35.0, status: 'ended',
    summary: 'The first remote-controlled robot rover on another world. It drove about 10 km.' },
  { id: 'lunokhod-2', name: 'Lunokhod 2', kind: 'rover', operator: 'Soviet Union', date: '1973-01-15', lat: 25.85, lon: 30.45, status: 'ended',
    summary: 'Drove about 39 km across the Moon in four months, a distance record that stood for decades.' },
  { id: 'luna-24', name: 'Luna 24', kind: 'lander', operator: 'Soviet Union', date: '1976-08-18', lat: 12.75, lon: 62.2, status: 'ended',
    summary: 'Drilled about 2 m into the ground and returned a core sample. The last Moon landing for 37 years.' },
  { id: 'lcross', name: 'LCROSS', kind: 'impactor', operator: 'United States', date: '2009-10-09', lat: -84.675, lon: -48.72, status: 'crashed',
    summary: 'Struck Cabeus crater on purpose; the plume of debris contained water.', featureNear: 'cabeus' },
  { id: 'change-3', name: 'Chang’e 3', kind: 'lander', operator: 'China', date: '2013-12-14', lat: 44.12, lon: -19.51, status: 'ended',
    summary: 'Landed in the Bay of Rainbows and released the Yutu rover.' },
  { id: 'change-4', name: 'Chang’e 4', kind: 'lander', operator: 'China', date: '2019-01-03', lat: -45.46, lon: 177.59, status: 'active',
    summary: 'The first landing on the far side of the Moon, inside Von Kármán crater.' },
  { id: 'beresheet', name: 'Beresheet', kind: 'lander', operator: 'Israel', date: '2019-04-11', lat: 32.6, lon: 19.35, status: 'crashed',
    summary: 'A privately built lander that crashed during its final descent.' },
  { id: 'chandrayaan-2-vikram', name: 'Chandrayaan-2 Vikram', kind: 'lander', operator: 'India', date: '2019-09-06', lat: -70.88, lon: 22.78, status: 'crashed',
    summary: 'Lost contact during descent toward the south polar highlands.' },
  { id: 'change-5', name: 'Chang’e 5', kind: 'lander', operator: 'China', date: '2020-12-01', lat: 43.06, lon: -51.92, status: 'ended',
    summary: 'Returned about 1.7 kg of the youngest lunar rock sampled so far.' },
  { id: 'hakuto-r-m1', name: 'Hakuto-R Mission 1', kind: 'lander', operator: 'Japan', date: '2023-04-25', lat: 47.5, lon: 44.1, status: 'crashed',
    summary: 'A commercial lander that hit the surface too fast after misjudging its altitude.' },
  { id: 'luna-25', name: 'Luna 25', kind: 'lander', operator: 'Russia', date: '2023-08-19', lat: -57.865, lon: 61.36, status: 'crashed',
    summary: 'Russia’s first Moon mission in 47 years ended in a crash during a descent maneuver.' },
  { id: 'chandrayaan-3', name: 'Chandrayaan-3', kind: 'lander', operator: 'India', date: '2023-08-23', lat: -69.373, lon: 32.319, status: 'ended',
    summary: 'India’s first successful landing, and the first close to the south pole.' },
  { id: 'slim', name: 'SLIM', kind: 'lander', operator: 'Japan', date: '2024-01-19', lat: -13.3, lon: 25.25, status: 'ended',
    summary: 'The “Moon Sniper” touched down within about 55 m of its target, then settled on its nose.' },
  { id: 'odysseus', name: 'Odysseus (IM-1)', kind: 'lander', operator: 'United States', date: '2024-02-22', lat: -80.13, lon: 1.44, status: 'ended',
    summary: 'The first U.S. landing since Apollo and the closest to the south pole at the time. It tipped on its side.' },
  { id: 'change-6', name: 'Chang’e 6', kind: 'lander', operator: 'China', date: '2024-06-01', lat: -41.64, lon: -153.99, status: 'ended',
    summary: 'First samples ever brought back from the Moon’s far side.' },
  { id: 'blue-ghost-1', name: 'Blue Ghost Mission 1', kind: 'lander', operator: 'United States', date: '2025-03-02', lat: 18.6, lon: 61.8, status: 'ended',
    summary: 'A commercial lander that operated through a full lunar daytime in Mare Crisium.' },
  { id: 'polar-scout', name: 'Polar Scout', kind: 'lander', operator: 'United States', date: '2026-10-28', lat: psPos.lat, lon: psPos.lon, status: 'active',
    summary: 'Landed 2.8 km from the rim of Haworth crater and reports water ice at an estimated 3–5% by weight in the lunar soil.',
    featureNear: 'haworth' },
];

export const POLAR_SCOUT = ROBOTIC.find((r) => r.id === 'polar-scout')!;
export const ICE_PERCENT = { low: 3, high: 5 };
