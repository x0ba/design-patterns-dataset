import type { CallMeta, Clip, SavedState } from '../types';

interface CompanyDef {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  /** Four calls, in order: Q4 2025, Q1 2026, Q2 2026, Q3 2026. [callDate, durationSec] */
  calls: [string, number][];
}

// Twelve case companies in the FIN 341 course library. Harrowgate Outdoor is the case company
// for the current assignment; the other eleven are catalog entries.
const COMPANIES: CompanyDef[] = [
  {
    id: 'hrgo', name: 'Harrowgate Outdoor', ticker: 'HRGO', sector: 'Specialty retail',
    calls: [['2026-02-24', 3900], ['2026-05-05', 3780], ['2026-08-27', 3520], ['2026-10-29', 3660]],
  },
  {
    id: 'pcgr', name: 'Pinecrest Grocers', ticker: 'PCGR', sector: 'Grocery retail',
    calls: [['2026-02-18', 3720], ['2026-05-06', 4260], ['2026-08-12', 3960], ['2026-11-04', 3540]],
  },
  {
    id: 'hlvi', name: 'Halvorsen Industrial Supply', ticker: 'HLVI', sector: 'Industrial distribution',
    calls: [['2026-02-11', 3360], ['2026-05-13', 2940], ['2026-08-05', 3240], ['2026-11-10', 3120]],
  },
  {
    id: 'blnx', name: 'Brightline Software', ticker: 'BLNX', sector: 'Enterprise software',
    calls: [['2026-02-10', 4680], ['2026-05-07', 4500], ['2026-08-06', 4140], ['2026-11-05', 3900]],
  },
  {
    id: 'crvn', name: 'Corvane Medical', ticker: 'CRVN', sector: 'Medical devices',
    calls: [['2026-02-17', 3300], ['2026-05-12', 3060], ['2026-08-11', 2700], ['2026-11-03', 3480]],
  },
  {
    id: 'ostr', name: 'Ostrander Freight Lines', ticker: 'OSTR', sector: 'Trucking',
    calls: [['2026-02-19', 3180], ['2026-05-14', 3420], ['2026-08-18', 3600], ['2026-10-27', 3240]],
  },
  {
    id: 'lmcr', name: 'Lumen Crest Hospitality', ticker: 'LMCR', sector: 'Lodging',
    calls: [['2026-02-26', 3840], ['2026-05-19', 3960], ['2026-08-20', 3300], ['2026-11-02', 2820]],
  },
  {
    id: 'tdwm', name: 'Tidewater Midstream Partners', ticker: 'TDWM', sector: 'Midstream energy',
    calls: [['2026-02-23', 4020], ['2026-05-08', 3600], ['2026-08-07', 3780], ['2026-11-06', 4140]],
  },
  {
    id: 'mrlw', name: 'Marlow Foods', ticker: 'MRLW', sector: 'Packaged food',
    calls: [['2026-02-12', 3600], ['2026-05-05', 3240], ['2026-08-04', 3060], ['2026-10-30', 3420]],
  },
  {
    id: 'kshm', name: 'Kessick Home Improvement', ticker: 'KSHM', sector: 'Home improvement retail',
    calls: [['2026-03-03', 4500], ['2026-05-27', 3720], ['2026-08-25', 3540], ['2026-11-12', 3840]],
  },
  {
    id: 'admx', name: 'Ardent Materials', ticker: 'ADMX', sector: 'Semiconductor materials',
    calls: [['2026-02-05', 3480], ['2026-05-04', 3180], ['2026-08-03', 4080], ['2026-11-02', 3720]],
  },
  {
    id: 'fxgn', name: 'Foxglen Insurance Group', ticker: 'FXGN', sector: 'Property & casualty insurance',
    calls: [['2026-02-25', 4440], ['2026-04-29', 3960], ['2026-07-30', 3300], ['2026-10-22', 3000]],
  },
];

const QUARTERS = ['Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026'];

/** Calls that have a synced transcript in this build. */
const TRANSCRIPT_CALLS = new Set(['hrgo-q2-2026', 'hrgo-q3-2026']);

export const CALLS: CallMeta[] = COMPANIES.flatMap((c) =>
  c.calls.map(([callDate, durationSec], i) => {
    const quarter = QUARTERS[i];
    return {
      id: `${c.ticker.toLowerCase()}-${quarter.replace(' ', '-').toLowerCase()}`,
      companyId: c.id,
      companyName: c.name,
      ticker: c.ticker,
      sector: c.sector,
      quarter,
      callDate,
      durationSec,
      hasTranscript: TRANSCRIPT_CALLS.has(`${c.ticker.toLowerCase()}-${quarter.replace(' ', '-').toLowerCase()}`),
    };
  }),
);

export const CASE_CALL_ID = 'hrgo-q3-2026';
export const HARROWGATE_Q2_ID = 'hrgo-q2-2026';

export const callById = (id: string): CallMeta | undefined => CALLS.find((c) => c.id === id);

/** Saved clips that were already in the library before this session. */
const SEED_CLIPS: Clip[] = [
  {
    id: 'seed-clip-pcgr-1',
    callId: 'pcgr-q1-2026',
    companyName: 'Pinecrest Grocers',
    ticker: 'PCGR',
    quarter: 'Q1 2026',
    callDate: '2026-05-06',
    t: 892,
    tEnd: 920,
    speakerName: 'Dana Whitfield',
    speakerTitle: 'Chief Executive Officer',
    quote:
      "We are not chasing volume at the expense of shrink. If a promotion doesn't pay back within four weeks, we pull it.",
    note: 'Shrink commentary. Compare with the Q2 call before the memo.',
    createdAt: '2026-11-03T16:12:00',
  },
  {
    id: 'seed-clip-hlvi-1',
    callId: 'hlvi-q2-2026',
    companyName: 'Halvorsen Industrial Supply',
    ticker: 'HLVI',
    quarter: 'Q2 2026',
    callDate: '2026-08-05',
    t: 1868,
    tEnd: 1895,
    speakerName: 'Greg Tanaka',
    speakerTitle: 'Chief Financial Officer',
    quote:
      'Our backlog conversion is slower than the bookings suggest, and I would rather you hear that from me than find it in the aging report.',
    note: 'Bookings vs. backlog. Possible working-capital point.',
    createdAt: '2026-11-09T10:40:00',
  },
];

/** The state Daniel left the library in: 22:04 into the Q3 call, Q1 finished, Q2 not started. */
export function initialState(): SavedState {
  return {
    version: 1,
    positions: { [CASE_CALL_ID]: 1324 },
    completed: ['hrgo-q1-2026', 'pcgr-q1-2026', 'hlvi-q2-2026'],
    clips: SEED_CLIPS,
    queue: [],
    rate: 1.5,
  };
}
