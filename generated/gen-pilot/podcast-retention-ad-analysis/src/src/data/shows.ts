export type Format = 'Narrative' | 'Interview' | 'Daily news';
export type Platform = 'Apple' | 'Spotify' | 'Network app' | 'Other';

export const FORMATS: Format[] = ['Narrative', 'Interview', 'Daily news'];
export const PLATFORMS: Platform[] = ['Apple', 'Spotify', 'Network app', 'Other'];

export interface ShowDef {
  id: string;
  name: string;
  format: Format;
  blurb: string;
  color: string;
  /** Mean and spread of episode length in minutes. */
  lengthMean: number;
  lengthSd: number;
  lengthMin: number;
  /** Completion rate before the change, for an average-length episode (fraction). */
  completion: number;
  /** True post-change shift in completion for narrative shows (fraction). Zero elsewhere. */
  effect: number;
  /** Share of listeners lost at the mid-roll minute, before the change. */
  cliff: number;
  /** Mid-roll minute before the change (null = no mid-roll). */
  midroll: number | null;
  /** Mid-roll minute after the change (null = unchanged). */
  midrollAfter: number | null;
  downloads: number;
  downloadsSd: number;
  startRate: number;
  /** Platform mix: Apple, Spotify, Network app, Other. */
  mix: [number, number, number, number];
  /** Narrative: [before, after] episode counts. Others: [total, total] used as a total. */
  episodes: [number, number];
  /** Narrative: [adjectives-ish, nouns-ish] title pools. Others: single pool. */
  titles: string[][];
  /** Share of listeners who leave in the first minute. */
  earlyDrop: number;
}

export const SHOWS: ShowDef[] = [
  // ---- Narrative (ad slot moved on 4 Aug 2026) ----
  {
    id: 'the-salt-road',
    name: 'The Salt Road',
    format: 'Narrative',
    blurb: 'Serial history of a nineteenth-century coastal trade route, told in chapters.',
    color: '#0f766e',
    lengthMean: 48, lengthSd: 3, lengthMin: 40,
    completion: 0.62, effect: -0.09, cliff: 0.10,
    midroll: 18, midrollAfter: 25,
    downloads: 180000, downloadsSd: 0.22, startRate: 0.86,
    mix: [0.46, 0.28, 0.16, 0.10],
    episodes: [40, 10],
    titles: [
      ['The Brine', 'Tallow', 'Winter', "The Gull's", 'Low Tide', 'Iron', 'The Night', 'Second'],
      ['Ledger', 'Crossing', 'Manifest', 'Customs House', 'Bell Buoy', 'Quarantine', 'Tally', 'Reckoning'],
    ],
    earlyDrop: 0.05,
  },
  {
    id: 'hollow-verdict',
    name: 'Hollow Verdict',
    format: 'Narrative',
    blurb: 'True-crime narrative built from court transcripts, one case per season.',
    color: '#7c3aed',
    lengthMean: 55, lengthSd: 4, lengthMin: 45,
    completion: 0.58, effect: 0.0, cliff: 0.10,
    midroll: 18, midrollAfter: 25,
    downloads: 150000, downloadsSd: 0.22, startRate: 0.86,
    mix: [0.40, 0.36, 0.14, 0.10],
    episodes: [38, 10],
    titles: [
      ['Exhibit', 'Docket', 'Witness', 'Recess', 'Testimony', 'Cold', 'Appeal', 'Jury'],
      ['Room B', 'No. 14', 'Day Nine', 'in Absentia', 'Cold File', 'Second Count', 'Bench Notes', 'Redacted'],
    ],
    earlyDrop: 0.05,
  },
  {
    id: 'lantern-street',
    name: 'Lantern Street',
    format: 'Narrative',
    blurb: 'Fiction serial set on one rowhouse block through a long winter.',
    color: '#b45309',
    lengthMean: 42, lengthSd: 3, lengthMin: 36,
    completion: 0.66, effect: -0.02, cliff: 0.10,
    midroll: 18, midrollAfter: 25,
    downloads: 120000, downloadsSd: 0.22, startRate: 0.87,
    mix: [0.48, 0.24, 0.18, 0.10],
    episodes: [36, 10],
    titles: [
      ['Number', 'Back', 'Kettle', 'Ash', 'Laundry', 'Coal', 'Milk', 'Stair'],
      ['Nineteen', 'Yard', 'Winter', 'Lamp', 'Door', 'Shutter', 'Cellar', 'Hour'],
    ],
    earlyDrop: 0.05,
  },
  {
    id: 'cold-harbor',
    name: 'Cold Harbor',
    format: 'Narrative',
    blurb: 'Thriller serial following a salvage crew after a harbour fire.',
    color: '#1d4ed8',
    lengthMean: 68, lengthSd: 6, lengthMin: 58,
    completion: 0.49, effect: -0.085, cliff: 0.10,
    midroll: 18, midrollAfter: 25,
    downloads: 110000, downloadsSd: 0.22, startRate: 0.85,
    mix: [0.34, 0.42, 0.14, 0.10],
    episodes: [34, 9],
    titles: [
      ['Fire', 'Salvage', 'Tide', 'Wreck', 'Keel', "Diver's", 'Night', 'Boom'],
      ['Watch', 'Line', 'Hull', 'Lamp', 'Descent', 'Ledger', 'Pump', 'Wake'],
    ],
    earlyDrop: 0.05,
  },
  {
    id: 'second-shift',
    name: 'Second Shift',
    format: 'Narrative',
    blurb: 'Workplace drama set in a night-shift emergency dispatch centre.',
    color: '#be185d',
    lengthMean: 44, lengthSd: 3, lengthMin: 38,
    completion: 0.63, effect: -0.04, cliff: 0.10,
    midroll: 18, midrollAfter: 25,
    downloads: 95000, downloadsSd: 0.22, startRate: 0.86,
    mix: [0.44, 0.30, 0.16, 0.10],
    episodes: [36, 10],
    titles: [
      ['Dispatch', 'Night', 'Radio', 'Overtime', 'Break', 'Coffee', 'Fourth', 'Callback'],
      ['Desk', 'Log', 'Ring', 'Hold', 'Room', 'Call', 'Board', 'Rotation'],
    ],
    earlyDrop: 0.05,
  },
  {
    id: 'the-quiet-gauge',
    name: 'The Quiet Gauge',
    format: 'Narrative',
    blurb: 'Investigative fiction about a water-utility engineer who finds a pattern.',
    color: '#4d7c0f',
    lengthMean: 52, lengthSd: 4, lengthMin: 44,
    completion: 0.55, effect: 0.01, cliff: 0.10,
    midroll: 18, midrollAfter: 25,
    downloads: 80000, downloadsSd: 0.22, startRate: 0.85,
    mix: [0.50, 0.26, 0.14, 0.10],
    episodes: [28, 9],
    titles: [
      ['Pressure', 'Valve', 'Reservoir', 'Meter', 'Silt', 'Station', 'Basin', 'Sounding'],
      ['Drift', 'Reading', 'Ledger', 'Shift', 'Failure', 'Pattern', 'Gallery', 'Hour'],
    ],
    earlyDrop: 0.05,
  },

  // ---- Interview (no ad change) ----
  {
    id: 'long-table',
    name: 'Long Table',
    format: 'Interview',
    blurb: 'Roundtable conversations with founders and operators.',
    color: '#475569',
    lengthMean: 64, lengthSd: 6, lengthMin: 50,
    completion: 0.52, effect: 0, cliff: 0.08,
    midroll: 30, midrollAfter: null,
    downloads: 22000, downloadsSd: 0.25, startRate: 0.80,
    mix: [0.52, 0.22, 0.14, 0.12],
    episodes: [74, 74],
    titles: [[
      'On building slowly', 'The cost of a second draft', 'Why we stopped hiring interns',
      'Running a county office on a shoestring', 'Selling the family business',
      'Hiring for the second job', 'What the surveys missed', 'Kiln work and patience',
    ]],
    earlyDrop: 0.04,
  },
  {
    id: 'common-ground',
    name: 'Common Ground',
    format: 'Interview',
    blurb: 'Two guests, opposite views, one hour.',
    color: '#0e7490',
    lengthMean: 50, lengthSd: 4, lengthMin: 42,
    completion: 0.61, effect: 0, cliff: 0.08,
    midroll: 26, midrollAfter: null,
    downloads: 18000, downloadsSd: 0.25, startRate: 0.80,
    mix: [0.50, 0.24, 0.14, 0.12],
    episodes: [70, 70],
    titles: [[
      'Should transit be free', 'Remote work and the commute', 'Zoning for small towns',
      'Is the four-day week working', 'Public libraries in a budget crunch',
      'Rent control, two ways', 'Who should fund the river cleanup', 'School start times',
    ]],
    earlyDrop: 0.04,
  },
  {
    id: 'the-unhurried-hour',
    name: 'The Unhurried Hour',
    format: 'Interview',
    blurb: 'Long-form interviews with artists and scientists, no time limit.',
    color: '#a16207',
    lengthMean: 80, lengthSd: 7, lengthMin: 66,
    completion: 0.44, effect: 0, cliff: 0.08,
    midroll: 36, midrollAfter: null,
    downloads: 9000, downloadsSd: 0.25, startRate: 0.80,
    mix: [0.56, 0.18, 0.14, 0.12],
    episodes: [68, 68],
    titles: [[
      'The science of cold water', 'Painting the same field for twenty years', 'Glaciers and the long view',
      'Learning to listen to lab data', 'A violin maker on wood and time',
      'Field notes from a seabird colony', 'Working without a deadline', 'Translating a novel nobody asked for',
    ]],
    earlyDrop: 0.04,
  },
  {
    id: 'earnest-questions',
    name: 'Earnest Questions',
    format: 'Interview',
    blurb: 'Short interviews with local government staff about how things work.',
    color: '#9f1239',
    lengthMean: 38, lengthSd: 3, lengthMin: 30,
    completion: 0.70, effect: 0, cliff: 0.08,
    midroll: 20, midrollAfter: null,
    downloads: 6000, downloadsSd: 0.25, startRate: 0.80,
    mix: [0.45, 0.20, 0.20, 0.15],
    episodes: [73, 73],
    titles: [[
      'How a permit gets approved', 'Inside the parks budget', 'Running an election office',
      'What a building inspector sees', 'Snow plans and who makes them', 'The 311 queue, explained',
      'Records requests from the inside', 'Keeping bridges open',
    ]],
    earlyDrop: 0.04,
  },
  {
    id: 'open-chair',
    name: 'Open Chair',
    format: 'Interview',
    blurb: 'Interviews with first-time authors and small-press editors.',
    color: '#78716c',
    lengthMean: 56, lengthSd: 5, lengthMin: 46,
    completion: 0.57, effect: 0, cliff: 0.08,
    midroll: 28, midrollAfter: null,
    downloads: 4200, downloadsSd: 0.25, startRate: 0.80,
    mix: [0.48, 0.26, 0.16, 0.10],
    episodes: [63, 63],
    titles: [[
      'The first manuscript, revisited', 'Editing a debut in eleven weeks', 'Why small presses take risks',
      'Rejection letters, a case study', 'Writing a memoir about a town',
      'Poetry chapbooks that sell out', 'The agent who said yes', 'A translator on silence',
    ]],
    earlyDrop: 0.04,
  },

  // ---- Daily news (no mid-roll; pre-roll sponsor only) ----
  {
    id: 'morning-ledger',
    name: 'Morning Ledger',
    format: 'Daily news',
    blurb: 'Ten-minute briefing on business and markets.',
    color: '#334155',
    lengthMean: 14, lengthSd: 1.5, lengthMin: 12,
    completion: 0.83, effect: 0, cliff: 0,
    midroll: null, midrollAfter: null,
    downloads: 320000, downloadsSd: 0.12, startRate: 0.92,
    mix: [0.30, 0.22, 0.28, 0.20],
    episodes: [200, 200],
    titles: [[
      'Transit fare review', 'Harbour dredging contract', 'Rate outlook shifts', 'Council budget vote',
      'Tech layoffs tally', 'Grain prices ease', 'Hospital wait-time report', 'Housing permit numbers',
      'Port strike talks', 'Retail sales slump',
    ]],
    earlyDrop: 0.02,
  },
  {
    id: 'city-desk-daily',
    name: 'City Desk Daily',
    format: 'Daily news',
    blurb: 'Local news roundup for the metro area.',
    color: '#0369a1',
    lengthMean: 19, lengthSd: 2, lengthMin: 14,
    completion: 0.80, effect: 0, cliff: 0,
    midroll: null, midrollAfter: null,
    downloads: 240000, downloadsSd: 0.12, startRate: 0.90,
    mix: [0.42, 0.20, 0.26, 0.12],
    episodes: [190, 190],
    titles: [[
      'Water main repairs on Fifth', 'School board votes on bus routes', 'Heat advisory this week',
      'Ferry schedule changes', 'Library hours extended', 'Sewer rate hearing set',
      'New bike lane opens', 'Court date moved for landlord case',
    ]],
    earlyDrop: 0.02,
  },
  {
    id: 'midday-wire',
    name: 'Midday Wire',
    format: 'Daily news',
    blurb: 'Afternoon news summary in under fifteen minutes.',
    color: '#15803d',
    lengthMean: 11, lengthSd: 1.2, lengthMin: 9,
    completion: 0.88, effect: 0, cliff: 0,
    midroll: null, midrollAfter: null,
    downloads: 90000, downloadsSd: 0.12, startRate: 0.92,
    mix: [0.38, 0.24, 0.24, 0.14],
    episodes: [178, 178],
    titles: [[
      'Three things before lunch', 'Storm damage counts climb', 'Mayor answers on budget',
      'Airline strike ends', 'Pharmacy chain closes stores', 'Jobless claims dip',
      'Wildfire smoke moves east', 'Chess champion weighs in',
    ]],
    earlyDrop: 0.02,
  },
];

export const SHOW_BY_ID: Record<string, ShowDef> = Object.fromEntries(SHOWS.map((s) => [s.id, s]));
