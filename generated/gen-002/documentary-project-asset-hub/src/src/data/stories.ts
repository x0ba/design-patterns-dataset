// [year, title, rolls, reels it could appear in]
export type Story = [number, string, number, number[]];
export interface SourceSpec {
  key: string;
  name: string;
  prefix: string;
  medium: 'film' | 'photo' | 'video' | 'mixed';
  kind: string;
  contact: string;
  email: string;
  terms: string;
  turnaround: string;
  idStyle: 'year' | 'plain4' | 'plain3' | 'plain5' | 'fc';
  weights: [number, number, number, number]; // cleared-all, festival-only, pending, denied
  fee: [number, number] | null;
  stories: Story[];
}

export const SALT_ROAD_SOURCES: SourceSpec[] = [
  {
    key: 'hnl', name: 'Hartwell Newsfilm Library', prefix: 'HNL', medium: 'film',
    kind: 'Regional newsfilm, 1958–1991',
    contact: 'Marit Sondergaard, Licensing Desk', email: 'licensing@hartwellnewsfilm.example',
    terms: 'Per-item licences in two tiers: festival-only (non-broadcast, 3 years) and all-media. Voice-over and music on the optical track are cleared separately when the original broadcaster holds them.',
    turnaround: '15 business days', idStyle: 'year', weights: [0.46, 0.22, 0.25, 0.07], fee: [420, 1600],
    stories: [
      [1962, 'Salt freight depot opens at Port Halloran', 3, [2]],
      [1964, 'Ketterick works: brine pans in summer', 2, [1]],
      [1966, 'Halloran Fish & Salt Fair parade', 3, [2, 5]],
      [1968, 'Salt train derailment at Marrow Cut', 2, [2]],
      [1969, 'Crane 7 commissioned on the Halloran wharf', 3, [3, 2]],
      [1971, 'Dock safety hearing at the harbour board', 2, [3, 4]],
      [1972, 'Winter gale damages Pier 2', 3, [3, 5]],
      [1973, 'Wharf overtime dispute: first walkout', 4, [3]],
      [1974, 'Wharf strike: pickets at Gate 4, night', 3, [3]],
      [1974, 'Strike kitchen opens at the Local 418 hall', 3, [4]],
      [1974, 'Strike fund collection outside Halloran Market', 2, [4, 3]],
      [1974, 'Police and pickets, second night', 3, [3, 4]],
      [1974, 'Mediation talks at the Customs House', 3, [4]],
      [1974, 'Strikers vote to return', 3, [4]],
      [1975, 'Wharf reopens on half shifts', 2, [4]],
      [1977, 'Jubilee street party on Dock Street', 2, [4, 5]],
      [1979, 'Container terminal proposed for Pier 4', 3, [4]],
      [1981, 'First container ship at Pier 4', 3, [4]],
      [1983, 'Ketterick works: Christmas shutdown', 2, [5]],
      [1985, 'Halloran flood barrier tested', 3, [5]],
      [1987, 'Last salt train leaves Ketterick', 3, [5]],
      [1989, 'Storm surge at Marrow Bay', 4, [5]],
    ],
  },
  {
    key: 'cchs', name: 'Calder County Historical Society', prefix: 'CCHS', medium: 'photo',
    kind: 'Photographs, maps and amateur film, 1921–1979',
    contact: 'Birgit Lindqvist, Collections Manager', email: 'collections@caldercountyhistory.example',
    terms: 'Reproduction permitted for documentary use under a one-page permission letter; credit line required.',
    turnaround: '10 business days', idStyle: 'plain4', weights: [0.74, 0.14, 0.10, 0.02], fee: [60, 240],
    stories: [
      [1921, 'Brine pans at Ketterick, glass-plate survey', 3, [1, 6]],
      [1926, 'Surveyors mapping the Salt Road route', 4, [6, 7]],
      [1931, 'Horse-drawn salt wagons on Route 9', 3, [2, 7]],
      [1938, 'Ketterick works staff portrait', 2, [1, 6]],
      [1947, 'Calder County fair, salt-pan exhibit', 3, [2]],
      [1951, 'First motor freight convoy on Route 9', 4, [2]],
      [1955, 'Dock Street shopfronts', 3, [2, 3]],
      [1958, 'Halloran wharf from the Customs House roof', 3, [3, 2]],
      [1961, 'Rail spur washout at Marrow Cut', 4, [2]],
      [1966, 'Dockworkers’ picnic, Eastgate Park', 3, [3]],
      [1972, 'Plat maps from the county map room', 3, [6, 1]],
      [1979, 'Weighing house interior', 3, [3, 5]],
    ],
  },
  {
    key: 'mpb', name: 'Meridian Public Broadcasting Archive', prefix: 'MPB', medium: 'video',
    kind: 'Regional television, 1986–2008',
    contact: 'Ruth Adeyemi-Clark, Archive Sales', email: 'archive@meridianpb.example',
    terms: 'Clips licensed per second of use; festival and all-media tiers. Music beds excluded unless listed.',
    turnaround: '12 business days', idStyle: 'year', weights: [0.44, 0.30, 0.22, 0.04], fee: [300, 1200],
    stories: [
      [1986, '“Halloran Tonight”: wharf modernisation report', 3, [4]],
      [1988, 'Harbour board chair interviewed on the container plan', 2, [4]],
      [1990, 'Flooding on Dock Street', 4, [5]],
      [1991, 'Flood recovery appeal telethon', 2, [5]],
      [1993, 'Closing day at the salt works', 4, [5]],
      [1994, '“Where Do the Wharfmen Go?” excerpt', 3, [5]],
      [1996, 'Last shift at the Halloran wharf', 3, [5, 4]],
      [1998, 'Halloran Sunday market revival', 3, [5, 6]],
      [2001, 'Rewilding the estuary: first survey', 3, [6]],
      [2003, 'Pier 2 reopens for small craft', 3, [6]],
      [2006, 'Brine-tasting trail opens on the flats', 2, [6]],
      [2008, 'Salt Road heritage trail launch', 2, [6]],
    ],
  },
  {
    key: 'l418', name: 'Dockworkers’ Local 418 Collection', prefix: 'L418', medium: 'mixed',
    kind: 'Union photographs, minutes and flyers, 1952–1996',
    contact: 'Hattie Osei, Local president', email: 'office@local418.example',
    terms: 'Released to the production by letter from the Local’s executive; credit “Courtesy of Dockworkers’ Local 418”.',
    turnaround: 'Next executive meeting', idStyle: 'plain3', weights: [0.80, 0.10, 0.05, 0.05], fee: null,
    stories: [
      [1952, 'Local 418 charter meeting', 2, [3]],
      [1958, 'Union hall interior and hiring board', 3, [3, 4]],
      [1962, 'Dock safety banner parade', 3, [3]],
      [1969, 'Crane 7 crew portrait', 2, [3]],
      [1973, 'Overtime vote, meeting minutes', 3, [3]],
      [1974, 'Picket roster sheets', 3, [3, 4]],
      [1974, 'Strike kitchen volunteers', 3, [4]],
      [1974, 'Strike fund ledger pages', 3, [3, 4]],
      [1975, 'Return-to-work meeting', 2, [4]],
      [1981, 'Pension dispute leaflet', 2, [4]],
      [1996, 'Final Local 418 wharf meeting', 3, [5]],
    ],
  },
  {
    key: 'nmpb', name: 'National Maritime Photo Bureau', prefix: 'NMPB', medium: 'photo',
    kind: 'Press and agency photographs, 1948–2004',
    contact: 'Sam Whitlock, Picture Desk', email: 'pictures@nmpb.example',
    terms: 'Editorial documentary licence per image; festival and all-media tiers; credit line required.',
    turnaround: '8 business days', idStyle: 'plain5', weights: [0.56, 0.24, 0.16, 0.04], fee: [90, 380],
    stories: [
      [1948, 'Port Halloran harbour, aerial view', 2, [2]],
      [1957, 'Salt freighter Ketterick Maid berthing', 2, [2]],
      [1963, 'Wharf crane lifts a salt hopper', 2, [2, 3]],
      [1967, 'Docker with a tally board', 2, [3]],
      [1970, 'Night loading under floodlights', 2, [3]],
      [1974, 'Picketers at Gate 4, press photograph', 2, [3]],
      [1974, 'Mounted police line outside the wharf', 2, [3, 4]],
      [1980, 'Container crane delivered to Pier 4', 2, [4]],
      [1984, 'The wharf from the harbour mouth, haze', 2, [4]],
      [1990, 'Storm surge over Pier 2', 2, [5]],
      [1995, 'Empty berths', 2, [5]],
      [2004, 'Crane 7 against the evening sky', 2, [6]],
    ],
  },
  {
    key: 'erl', name: 'Estuary Regional Library Film Collection', prefix: 'ERL', medium: 'film',
    kind: 'Local and amateur film, 1934–1968',
    contact: 'Colm Fitzgerald, Film Librarian', email: 'film@estuarylibrary.example',
    terms: 'Public-domain and deposited local films; scan fee only; credit line required.',
    turnaround: '5 business days', idStyle: 'fc', weights: [0.90, 0.05, 0.05, 0], fee: [40, 120],
    stories: [
      [1934, '“Salt of the Estuary”: promotional film', 4, [1, 2]],
      [1949, 'Town council newsreel: the new harbour wall', 3, [2]],
      [1956, 'School film: a day on the wharf', 3, [2, 3]],
      [1962, 'Salt Road centenary pageant', 3, [2]],
      [1968, 'Amateur film: Dock Street at Christmas', 3, [2, 5]],
    ],
  },
  {
    key: 'pfc', name: 'Pike Family Collection', prefix: 'PFC', medium: 'film',
    kind: 'Private 8mm film and prints, 1962–1974',
    contact: 'Leonard Pike', email: 'via production',
    terms: 'Private collection; signed release held by the production.',
    turnaround: 'Same week', idStyle: 'plain3', weights: [0.8, 0.0, 0.2, 0], fee: null,
    stories: [
      [1962, 'Leonard Pike’s first week on the wharf, family 8mm', 3, [2]],
      [1969, 'Pike family on the quay, a Sunday', 3, [2, 3]],
      [1974, 'The Pike kitchen the week of the strike', 4, [3, 4]],
    ],
  },
];

export const NIGHT_FERRY_SOURCES: SourceSpec[] = [
  { key: 'slc', name: 'Strait Lines Company Archive', prefix: 'SLC', medium: 'mixed', kind: 'Company photographs and film, 1979–2002',
    contact: 'Anselm Wray, Company Historian', email: 'history@straitlines.example', terms: 'Licensed by the company for documentary use; credit required.', turnaround: '7 business days',
    idStyle: 'plain4', weights: [0.72, 0.15, 0.11, 0.02], fee: [80, 300],
    stories: [
      [1979, 'Karrow ferry terminal under construction', 4, [1]],
      [1983, 'MV Karrow Maid launch', 4, [1, 6]],
      [1986, 'Ticket office interior', 4, [1]],
      [1991, 'Freight deck loading', 4, [4]],
      [1995, 'Galley staff at work', 4, [2]],
      [2002, 'Crossing timetable photographs', 4, [1, 6]],
    ] },
  { key: 'kim', name: 'Karrow Island Museum', prefix: 'KIM', medium: 'photo', kind: 'Island photographs and ephemera, 1928–1972',
    contact: 'Edda Sorensen, Curator', email: 'curator@karrowmuseum.example', terms: 'Reproduction free with credit; high-resolution scans at cost.', turnaround: '10 business days',
    idStyle: 'plain3', weights: [0.8, 0.1, 0.1, 0], fee: [20, 60],
    stories: [
      [1928, 'First paddle ferry on Karrow Sound', 3, [6]],
      [1937, 'Mail boat crew', 3, [6]],
      [1946, 'Wartime evacuation crossings', 3, [6]],
      [1958, 'Island regatta', 3, [1]],
      [1966, 'Menu cards and passenger lists', 3, [2]],
      [1972, 'Cabin interior photographs', 3, [5]],
    ] },
  { key: 'nnt', name: 'Northern Newsreel Trust', prefix: 'NNT', medium: 'film', kind: 'Regional newsfilm, 1976–1994',
    contact: 'Philippa Ng, Licensing', email: 'licensing@northernnewsreel.example', terms: 'Per-item licence, festival and all-media tiers.', turnaround: '15 business days',
    idStyle: 'year', weights: [0.45, 0.25, 0.27, 0.03], fee: [380, 1400],
    stories: [
      [1976, 'Fog delays the Karrow ferry', 4, [3]],
      [1984, 'Ferry strike averted', 4, [1]],
      [1989, 'Council debate on the ferry subsidy', 4, [6]],
      [1994, 'Karrow Maid tenth anniversary', 4, [1, 2]],
    ] },
  { key: 'cgr', name: 'Coastguard Public Records', prefix: 'CGR', medium: 'mixed', kind: 'Logs, radar plots and survey film, 1991–1998',
    contact: 'Records Office', email: 'records@coastguard.example', terms: 'Public record; no fee.', turnaround: '20 business days',
    idStyle: 'plain4', weights: [0.9, 0.0, 0.1, 0], fee: null,
    stories: [
      [1991, 'Fog log and radar plots', 5, [3]],
      [1998, 'Karrow Sound survey', 5, [3]],
    ] },
  { key: 'fpa', name: 'Ferry Passengers’ Association Collection', prefix: 'FPA', medium: 'photo', kind: 'Member photographs and papers, 1982–2009',
    contact: 'Dolores Ndiaye, Secretary', email: 'secretary@ferrypassengers.example', terms: 'Released by the committee.', turnaround: 'Next committee meeting',
    idStyle: 'plain3', weights: [0.75, 0.0, 0.25, 0], fee: null,
    stories: [
      [1982, 'Passengers’ association outing', 4, [5]],
      [2009, 'Petition to save the night crossing', 4, [6]],
    ] },
];

export const LAST_PILOT_SOURCES: SourceSpec[] = [
  { key: 'wpa', name: 'Westmark Port Authority Film Unit', prefix: 'WPA', medium: 'film', kind: 'Port authority film, 1988–1997',
    contact: 'Neil Achterberg, Port Archive', email: 'archive@westmarkport.example', terms: 'Commissioner affiliate; cleared for broadcast use under the Westmark commission.', turnaround: '5 business days',
    idStyle: 'plain3', weights: [0.7, 0.1, 0.2, 0], fee: null,
    stories: [
      [1992, 'Pilot station interior', 3, [1]],
      [1988, 'Channel dredging at Marrow Bay', 3, [1]],
      [1997, 'Pilot cutter launch', 3, [1]],
    ] },
  { key: 'afc', name: 'Aldous Family Collection', prefix: 'AFC', medium: 'photo', kind: 'Private photographs, 1990–2001',
    contact: 'Gwen Aldous', email: 'via production', terms: 'Private collection; signed release on file.', turnaround: 'Same week',
    idStyle: 'plain3', weights: [1, 0, 0, 0], fee: null,
    stories: [
      [1990, 'First pilot exam', 2, [1]],
      [2001, 'On the cutter with her father', 3, [1]],
    ] },
];

export const SOURCE_COUNTS: Record<string, number[]> = {
  'salt-road': [61, 38, 34, 29, 24, 16, 10],
  'night-ferry': [24, 18, 16, 10, 8],
  'last-pilot': [9, 5],
};
