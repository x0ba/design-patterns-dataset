import type { Person, SceneKind } from './types';

export const COMPANY = 'Lowtide Films';

export const PEOPLE: Record<string, Person> = {
  ines: { name: 'Inés Marlow', role: 'Director, Salt Road' },
  callum: { name: 'Callum Ridley', role: 'Producer · Director, Last Pilot' },
  noor: { name: 'Noor Haddad', role: 'Editor, Salt Road' },
  joaquin: { name: 'Joaquín Reyes', role: 'Archive producer · clearances' },
  ama: { name: 'Ama Boateng', role: 'Assistant editor' },
  priyanka: { name: 'Priyanka Deshmukh', role: 'Director, Night Ferry' },
  tobias: { name: 'Tobias Lindgren', role: 'Editor, Night Ferry' },
  fenella: { name: 'Fenella Okafor', role: 'Production manager' },
  marcus: { name: 'Marcus Bell', role: 'Sound editor' },
};

// scene tuple: [title, kind, interviewee key | undefined]
export type SceneSpec = [string, SceneKind, string?];
export interface ReelSpec { title: string; blurb: string; scenes: SceneSpec[] }

export interface ProjectSpec {
  id: string;
  title: string;
  format: string;
  stage: string;
  accent: string;
  tint: string;
  unit: 'Reel' | 'Episode';
  logline: string;
  director: string;
  commissioner?: string;
  team: string[];
  updated: string;
  seed: number;
  clipTotal: number;
  reels: ReelSpec[];
  editors: string[];
}

export const SALT_ROAD: ProjectSpec = {
  id: 'salt-road',
  title: 'Salt Road',
  format: 'Feature documentary',
  stage: 'Fine cut',
  accent: '#1f5a73',
  tint: '#e3eef2',
  unit: 'Reel',
  logline: 'How a freight road built to carry salt made a port town, and what remained when the wharf and the works shut.',
  director: 'Inés Marlow',
  team: ['ines', 'noor', 'joaquin', 'ama', 'marcus', 'callum'],
  updated: '2026-11-16',
  seed: 71,
  clipTotal: 1900,
  editors: ['Noor Haddad', 'Noor Haddad', 'Noor Haddad', 'Ama Boateng'],
  reels: [
    { title: 'Ketterick Flats', blurb: 'The salt works today, and the question of why anyone built a road here.', scenes: [
      ['Title over the salt pans at dawn', 'title'],
      ['The flats from the air', 'verite'],
      ['Marguerite Abboud: what salt smells like', 'interview', 'abboud'],
      ['Brine channels, a working day', 'verite'],
      ['The works whistle, 6:40 a.m.', 'verite'],
      ['Calder County map room', 'archival'],
      ['Why the road was built', 'archival'],
      ['Hattie Osei at the union hall', 'interview', 'osei'],
      ['First look at Port Halloran', 'verite'],
    ] },
    { title: 'The Road', blurb: 'Route 9 and the trade it carried, from the 1950s freight years.', scenes: [
      ['Route 9 from the cab of a salt truck', 'verite'],
      ['Leonard Pike: first day on the wharf', 'interview', 'pike'],
      ['Salt freight, 1950s', 'archival'],
      ['Rosalind Teague: growing up on Dock Street', 'interview', 'teague'],
      ['Ledger pages', 'montage'],
      ['The weighing house', 'verite'],
      ['Dr. Wen Zhao: how the road made the port', 'interview', 'zhao'],
      ['The rail spur and the washout of ’61', 'archival'],
      ['Tomás Herrera climbs Crane 7', 'verite'],
      ['The wharf at night, present day', 'montage'],
      ['The road runs out at the water', 'verite'],
    ] },
    { title: 'The Wharf', blurb: 'Working the Halloran wharf, and the spring 1974 picket at Gate 4.', scenes: [
      ['Gate 4, a Monday morning', 'verite'],
      ['The picket line, 1974', 'archival'],
      ['Leonard Pike: what the cameras missed', 'interview', 'pike'],
      ['Union hall, Local 418', 'archival'],
      ['Tallying sacks', 'montage'],
      ['Rosalind Teague: the strike ledger', 'interview', 'teague'],
      ['The night shift whistle', 'verite'],
      ['Salt on the tongue', 'montage'],
      ['The harbour board vote', 'archival'],
      ['Dr. Wen Zhao: the board’s arithmetic', 'interview', 'zhao'],
      ['Pike returns to the wharf', 'verite'],
      ['Crane 7, dawn', 'verite'],
      ['Letters from the strike fund', 'archival'],
      ['The weighing house, empty', 'verite'],
      ['End of shift, 1974', 'archival'],
      ['The gate closes', 'verite'],
    ] },
    { title: 'Lockout', blurb: 'Autumn 1974 to the containers: the long argument over what the wharf was for.', scenes: [
      ['The morning after', 'archival'],
      ['Lockout notice, November 1974', 'archival'],
      ['Hattie Osei: the strike fund', 'interview', 'osei'],
      ['Strike kitchen', 'archival'],
      ['Walter Duffield: shooting the picket for Hartwell', 'interview', 'duffield'],
      ['Camera log', 'montage'],
      ['Marguerite Abboud leaves the works', 'interview', 'abboud'],
      ['The Halloran Courier front pages', 'archival'],
      ['Anneliese Rook: covering the strike', 'interview', 'rook'],
      ['The replacement-crew bus', 'archival'],
      ['Mediation at the Customs House', 'archival'],
      ['Desmond Okonkwo: the board’s side', 'interview', 'okonkwo'],
      ['The settlement vote', 'archival'],
      ['The wharf shrinks', 'archival'],
      ['Tomás Herrera on the first container crane', 'interview', 'herrera'],
      ['Cranes', 'montage'],
      ['Reel 4 button: the empty berth', 'verite'],
    ] },
    { title: 'What the Water Took', blurb: 'Floods, the works closing, and the town that stayed.', scenes: [
      ['Storm surge', 'archival'],
      ['Birgit Lindqvist: the flood records', 'interview', 'lindqvist'],
      ['The flooded weighing house', 'archival'],
      ['Closing day at the works', 'archival'],
      ['Marguerite Abboud: the last evaporation season', 'interview', 'abboud'],
      ['Empty pans', 'verite'],
      ['The town after the works', 'montage'],
      ['Sunday market, Halloran', 'verite'],
      ['Leonard Pike: after the wharf', 'interview', 'pike'],
      ['Pike’s workshop', 'verite'],
      ['Hattie Osei: Local 418 today', 'interview', 'osei'],
      ['Church hall, the memorial plaque', 'verite'],
      ['Rosalind Teague reads the last entry', 'interview', 'teague'],
      ['Cranes at dusk', 'montage'],
      ['Seabirds on Pier 2', 'verite'],
      ['Reel 5 button: the tide table', 'verite'],
    ] },
    { title: 'Salt Again', blurb: 'What the flats and the wharf are becoming.', scenes: [
      ['New tenants on the wharf', 'verite'],
      ['Dr. Priya Nambiar: the estuary comes back', 'interview', 'nambiar'],
      ['Salt marsh at low tide', 'verite'],
      ['A brewery on brine from the flats', 'verite'],
      ['Tomás Herrera: the last crane shift', 'interview', 'herrera'],
      ['Driving the road, west to east', 'verite'],
      ['Pike at the gate', 'verite'],
      ['Children on the sea wall', 'verite'],
      ['Salt on the windscreen', 'verite'],
      ['Faces', 'montage'],
      ['Return to the flats at dusk', 'verite'],
      ['End credits', 'title'],
      ['Dedication', 'title'],
      ['Closing music cue', 'montage'],
      ['After the credits: the road', 'verite'],
    ] },
  ],
};

export const NIGHT_FERRY: ProjectSpec = {
  id: 'night-ferry',
  title: 'Night Ferry',
  format: '6-part series',
  stage: 'Assembly',
  accent: '#4d3f8c',
  tint: '#ebe8f5',
  unit: 'Episode',
  logline: 'Six overnight crossings aboard the last passenger ferry between Karrow Island and the mainland.',
  director: 'Priyanka Deshmukh',
  team: ['priyanka', 'tobias', 'fenella', 'joaquin', 'ama', 'marcus'],
  updated: '2026-11-13',
  seed: 133,
  clipTotal: 1180,
  editors: ['Tobias Lindgren', 'Tobias Lindgren', 'Ama Boateng'],
  reels: [
    { title: 'Boarding', blurb: 'Who gets on at 21:40, and why they choose the slow way across.', scenes: [
      ['Last light at the Karrow terminal', 'verite'], ['Vehicle deck loading', 'verite'], ['Captain Imre Szabo: the 9:40 crossing', 'interview', 'szabo'], ['Ticket office, 1986', 'archival'], ['Cast off', 'montage'] ] },
    { title: 'The Galley', blurb: 'Feeding two hundred people between midnight and the first light.', scenes: [
      ['Galley prep', 'verite'], ['Odette Fairweather: thirty winters of soup', 'interview', 'fairweather'], ['Menu cards through the decades', 'archival'], ['Night bar', 'verite'], ['Cutlery and swell', 'montage'] ] },
    { title: 'The Bridge', blurb: 'Radar, rota and a chart table older than the crew.', scenes: [
      ['Watch handover, 00:00', 'verite'], ['First Officer Dalia Rahimi on fog', 'interview', 'rahimi'], ['Coastguard fog log, 1991', 'archival'], ['Radar sweep', 'montage'], ['The bridge at 3 a.m.', 'verite'] ] },
    { title: 'Freight Deck', blurb: 'What the island sends over in the dark.', scenes: [
      ['Fish crates and flower boxes', 'verite'], ['Dermot Calloway, haulier', 'interview', 'calloway'], ['Strait Lines freight reel', 'archival'], ['Pallet lashing', 'montage'], ['Chains', 'verite'] ] },
    { title: 'Cabin 214', blurb: 'One passenger, one berth, the same crossing every Thursday.', scenes: [
      ['Cabin 214, as she keeps it', 'verite'], ['Ingrid Moberg: why Thursday', 'interview', 'moberg'], ['Passenger postcards', 'archival'], ['Condensation on the porthole', 'montage'], ['Thursday, 02:10', 'verite'] ] },
    { title: 'Landfall', blurb: 'Dawn at Karrow, and the question of the ferry’s future.', scenes: [
      ['Lights of the island', 'verite'], ['Council chair Bram Oyelaran on the subsidy', 'interview', 'oyelaran'], ['Karrow Island Museum: the first ferry', 'archival'], ['Landing', 'montage'], ['Empty deck, morning', 'verite'] ] },
  ],
};

export const LAST_PILOT: ProjectSpec = {
  id: 'last-pilot',
  title: 'Last Pilot',
  format: 'Short · commissioned by Westmark Broadcasting',
  stage: 'Rough cut',
  accent: '#6a6a1e',
  tint: '#eeeed9',
  unit: 'Reel',
  logline: 'Harbour pilot Gwen Aldous guides her last ship through the Marrow Bay channel after 34 years.',
  director: 'Callum Ridley',
  commissioner: 'Westmark Broadcasting',
  team: ['callum', 'ama', 'marcus', 'joaquin'],
  updated: '2026-11-11',
  seed: 207,
  clipTotal: 164,
  editors: ['Ama Boateng'],
  reels: [
    { title: 'Reel 1', blurb: 'Final pilotage, start to finish (11 minutes).', scenes: [
      ['Pilot cutter at first light', 'verite'], ['Gwen Aldous: thirty-four years of channel', 'interview', 'aldous'], ['Westmark pilot station, 1992', 'archival'], ['Boarding the bulk carrier', 'verite'], ['The channel buoys', 'montage'], ['Harbour master Tarek Naidoo', 'interview', 'naidoo'], ['Handing over the helm', 'verite'], ['Back down the ladder', 'verite'] ] },
  ],
};
