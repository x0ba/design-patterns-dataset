// Scenario seed for the October 2026 jobs report. All names, figures and
// comments are mock data for the prototype. The app opens at the scenario's
// "now": Tuesday, November 17, 2026, 2:22 p.m. Ana last looked on Monday at 4:52 p.m.

import type { AppState, Chart, ChartSpec, Comment, FeedEvent, HistoryEntry, Person } from '../lib/types';

const at = (day: number, h: number, m: number) => new Date(2026, 10, day, h, m).getTime();

export const SCENARIO_NOW = at(17, 14, 22);
export const LAST_VISIT = at(16, 16, 52);
export const EMBARGO_LIFTS = at(19, 8, 30);
export const HANDOFF_DUE = at(18, 17, 0);

export const PEOPLE: Person[] = [
  { id: 'ana', name: 'Ana Delacroix', initials: 'AD', role: 'lead', title: 'Senior economist, release lead' },
  { id: 'marcus', name: 'Marcus Oyelaran', initials: 'MO', role: 'analyst', title: 'Analyst, CES payroll' },
  { id: 'hana', name: 'Hana Kobayashi', initials: 'HK', role: 'analyst', title: 'Analyst, LAUS unemployment' },
  { id: 'devon', name: 'Devon Whitfield', initials: 'DW', role: 'analyst', title: 'Analyst, QCEW wages and employment' },
  { id: 'renee', name: 'Renee Castellanos', initials: 'RC', role: 'editor', title: 'Editor' },
  { id: 'grace', name: 'Grace Lindqvist', initials: 'GL', role: 'disclosure', title: 'Disclosure reviewer' },
];

export const ME_ID = 'ana';

export function personById(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id);
}

export function personName(id: string): string {
  if (id === 'system') return 'Data intake';
  return personById(id)?.name ?? 'Unknown';
}

// ---------------------------------------------------------------------------
// County data (64 counties). Generated from a fixed seed so every render and
// every reload produce identical values. Titles that summarize the county data
// are computed from these values, so text and tiles cannot drift apart.

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNTY_NAMES = [
  'Adair', 'Ambrose', 'Ashby', 'Baxter', 'Bellamy', 'Brackett', 'Cairnes', 'Calloway', 'Corwin', 'Delmar',
  'Dorsey', 'Dunmore', 'Easton', 'Eldridge', 'Ellery', 'Fairholm', 'Fallon', 'Foxworth', 'Garrity', 'Gibbs',
  'Greaves', 'Halvorsen', 'Harlow', 'Hollins', 'Ingram', 'Inglis', 'Iverson', 'Jarrow', 'Jessup', 'Keeler',
  'Kellan', 'Kittredge', 'Lassiter', 'Lowry', 'Lydon', 'Marrow', 'Mattox', 'Merritt', 'Nolan', 'Norcross',
  'Northcutt', 'Orrin', 'Osgood', 'Overton', 'Pemberton', 'Prescott', 'Pruett', 'Quarry', 'Quinlan', 'Radcliffe',
  'Redfern', 'Rowe', 'Sayer', 'Stroud', 'Tallis', 'Thorne', 'Umber', 'Upton', 'Vance', 'Varley',
  'Westbrook', 'Whitmore', 'Yardley', 'Yarrow',
];

const rand = mulberry32(20261119);
const counties = COUNTY_NAMES.map((name) => ({
  name,
  rate: Math.round((2.9 + rand() * 4.5) * 10) / 10, // October 2026 unemployment rate, %
  yoy: Math.round((-1.2 + rand() * 1.8) * 10) / 10, // change in rate vs. October 2025, points
  jobs: Math.round(-650 + rand() * 1550), // October employment change, jobs
}));

const byRate = [...counties].sort((a, b) => a.rate - b.rate);
const minRate = byRate[0];
const maxRate = byRate[byRate.length - 1];
const yoyDown = counties.filter((c) => c.yoy < 0).length;
const jobsUp = counties.filter((c) => c.jobs > 0).length;
const jobsDown = counties.filter((c) => c.jobs < 0).length;
const byJobs = [...counties].sort((a, b) => b.jobs - a.jobs);
const top10 = byJobs.slice(0, 10);
const bottom10 = byJobs.slice(-10);

// ---------------------------------------------------------------------------
// Shared text and helpers

const SUPPRESSED = null;

function chartBase(partial: Partial<Chart> & Pick<Chart, 'id' | 'headline' | 'chart' | 'ownerId' | 'status'>): Chart {
  return {
    subtitle: '',
    note: '',
    caption: '',
    source: 'CES',
    geography: 'Statewide',
    geographyDetail: 'Statewide',
    version: 1,
    lastEditorId: partial.ownerId,
    lastEditAt: at(16, 9, 0),
    approvedAt: null,
    approvedBy: null,
    finalAt: null,
    hold: null,
    needsRecheck: false,
    history: [],
    active: [],
    ...partial,
  } as Chart;
}

const RECHECK_ENTRY = (summary: string): HistoryEntry => ({
  at: at(17, 8, 41),
  by: 'system',
  summary,
});

const SEPT_REVISED_NOTE = 'Revised September data loaded (rev. 2). Values refreshed. Approval predates the revision: re-check before final.';

// ---------------------------------------------------------------------------
// Charts (22)

const monthsSeries = (
  labels: string[],
  values: (number | null)[],
  revisedIdx?: number,
  unit: 'jobs' | 'percent' = 'jobs',
): ChartSpec => ({
  kind: 'line',
  unit,
  points: labels.map((label, i) => ({ label, value: values[i], revised: i === revisedIdx })),
});

const CHARTS: Chart[] = [
  // ----- CES payroll (Marcus Oyelaran) -----
  chartBase({
    id: 'OCT-01',
    headline: 'Statewide payrolls rise for third straight month',
    subtitle: 'Total nonfarm payroll change, month over month, May to October 2026 (seasonally adjusted, jobs)',
    note: 'October’s gain is measured against revised September. September was revised from a gain of 1,200 jobs to a loss of 400 jobs, so October’s change is now +6,300 jobs rather than the preliminary +4,700.',
    caption: 'Source: Current Employment Statistics (CES) payroll survey, revised September and preliminary October 2026.',
    source: 'CES',
    ownerId: 'marcus',
    status: 'in review',
    version: 7,
    lastEditorId: 'marcus',
    lastEditAt: at(17, 9, 31),
    chart: {
      kind: 'column',
      unit: 'jobs',
      points: [
        { label: 'May', value: 2600 },
        { label: 'Jun', value: 1100 },
        { label: 'Jul', value: 3800 },
        { label: 'Aug', value: 1900 },
        { label: 'Sep', value: -400, revised: true },
        { label: 'Oct', value: 6300 },
      ],
    },
    history: [
      { at: at(16, 15, 58), by: 'marcus', version: 5, summary: 'Built from preliminary October CES file. Headline set to “third straight month.”' },
      { at: at(16, 16, 31), by: 'ana', summary: 'Approved for final sign-off.' },
      { at: at(17, 8, 41), by: 'system', summary: 'Revised September CES file loaded (rev. 2): September change +1,200 → −400 jobs.' },
      { at: at(17, 8, 58), by: 'marcus', version: 6, summary: 'Chart values refreshed to revised September base.' },
      { at: at(17, 9, 31), by: 'marcus', version: 7, summary: 'October change recalculated: +4,700 → +6,300. Status reset from approved to in review because the data changed.' },
    ],
  }),

  chartBase({
    id: 'OCT-02',
    headline: 'Nonfarm employment reaches a 12-month high of 3.49 million',
    subtitle: 'Total nonfarm employment, seasonally adjusted, November 2025 to October 2026 (jobs)',
    note: 'Employment rose in five of the last six months. The September level was revised down 1,600 jobs; October is 6,300 jobs above it.',
    caption: 'Source: CES payroll survey. Seasonally adjusted. September revised; October preliminary.',
    source: 'CES',
    ownerId: 'marcus',
    status: 'approved',
    version: 5,
    lastEditorId: 'system',
    lastEditAt: at(17, 8, 41),
    approvedAt: at(16, 16, 12),
    approvedBy: 'ana',
    needsRecheck: true,
    chart: monthsSeries(
      ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      [3452100, 3455800, 3449300, 3457900, 3463200, 3470900, 3473500, 3474600, 3478400, 3480300, 3479900, 3486200],
      10,
    ),
    history: [
      { at: at(16, 11, 20), by: 'marcus', version: 4, summary: 'Series extended through preliminary October.' },
      { at: at(16, 14, 5), by: 'marcus', version: 5, summary: 'Subtitle updated to name the 12-month high.' },
      { at: at(16, 16, 12), by: 'ana', summary: 'Approved for final sign-off.' },
      RECHECK_ENTRY(SEPT_REVISED_NOTE),
    ],
  }),

  chartBase({
    id: 'OCT-03',
    headline: 'Health care leads October private-sector gains of 6,000 jobs',
    subtitle: 'Change in private employment by supersector, October 2026 vs. revised September (jobs)',
    note: 'Private payrolls rose 6,000 jobs and government added 300. Health care and social assistance accounted for just over half of the private gain.',
    caption: 'Source: CES payroll survey, preliminary October 2026 vs. revised September 2026. Seasonally adjusted.',
    source: 'CES',
    ownerId: 'marcus',
    status: 'approved',
    version: 4,
    lastEditorId: 'system',
    lastEditAt: at(17, 8, 41),
    approvedAt: at(16, 16, 20),
    approvedBy: 'ana',
    needsRecheck: true,
    chart: {
      kind: 'hbar',
      unit: 'jobs',
      rows: [
        { label: 'Health care and social assistance', value: 3100 },
        { label: 'Leisure and hospitality', value: 1400 },
        { label: 'Professional and business services', value: 900 },
        { label: 'Construction', value: 600 },
        { label: 'Transportation and warehousing', value: 350 },
        { label: 'Retail trade', value: 250 },
        { label: 'Other services', value: 120 },
        { label: 'Utilities', value: 10 },
        { label: 'Wholesale trade', value: -80 },
        { label: 'Financial activities', value: -150 },
        { label: 'Manufacturing', value: -200 },
        { label: 'Information', value: -300 },
      ],
    },
    history: [
      { at: at(16, 10, 40), by: 'marcus', version: 3, summary: 'Supersector table built from preliminary October.' },
      { at: at(16, 14, 58), by: 'marcus', version: 4, summary: 'Information label aligned to the style sheet.' },
      { at: at(16, 16, 20), by: 'ana', summary: 'Approved for final sign-off.' },
      RECHECK_ENTRY(SEPT_REVISED_NOTE),
    ],
  }),

  chartBase({
    id: 'OCT-04',
    headline: 'Government employment adds 300 jobs in October',
    subtitle: 'Government employment, seasonally adjusted, November 2025 to October 2026 (jobs)',
    note: 'Government payrolls rose by 300 in October and are 2,300 above their level a year ago.',
    caption: 'Source: CES payroll survey. Government includes federal, state and local. Seasonally adjusted.',
    source: 'CES',
    ownerId: 'marcus',
    status: 'approved',
    version: 3,
    lastEditorId: 'system',
    lastEditAt: at(17, 8, 41),
    approvedAt: at(16, 16, 24),
    approvedBy: 'ana',
    needsRecheck: true,
    chart: monthsSeries(
      ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      [408300, 408700, 408200, 408900, 409400, 409800, 410000, 409600, 410100, 410400, 410300, 410600],
      10,
    ),
    history: [
      { at: at(16, 15, 40), by: 'marcus', version: 3, summary: 'Government series built from preliminary October.' },
      { at: at(16, 16, 24), by: 'ana', summary: 'Approved for final sign-off.' },
      RECHECK_ENTRY(SEPT_REVISED_NOTE),
    ],
  }),

  chartBase({
    id: 'OCT-05',
    headline: 'Average hourly earnings rise 0.3% in October',
    subtitle: 'Average hourly earnings and weekly hours, all employees, revised September and preliminary October 2026',
    note: 'Average hourly earnings rose $0.11 to $34.23. The unrounded change is 0.32%.',
    caption: 'Source: CES payroll survey. Seasonally adjusted, all employees.',
    source: 'CES',
    ownerId: 'marcus',
    status: 'approved',
    version: 4,
    lastEditorId: 'marcus',
    lastEditAt: at(16, 13, 12),
    approvedAt: at(16, 16, 38),
    approvedBy: 'ana',
    chart: {
      kind: 'table',
      columns: ['Measure', 'Sep 2026 (rev.)', 'Oct 2026 (prelim.)', 'Change'],
      rows: [
        { label: 'Average hourly earnings ($)', cells: ['34.12', '34.23', '+0.11 (+0.3%)'] },
        { label: 'Average weekly hours', cells: ['33.6', '33.7', '+0.1'] },
        { label: 'Average weekly earnings ($)', cells: ['1,146.43', '1,153.55', '+7.12 (+0.6%)'] },
      ],
    },
    history: [
      { at: at(16, 13, 12), by: 'marcus', version: 4, summary: 'Table values updated to preliminary October.' },
      { at: at(16, 16, 38), by: 'ana', summary: 'Approved for final sign-off.' },
    ],
  }),

  chartBase({
    id: 'OCT-06',
    headline: 'Port Alder and Harrowgate lead October metro payroll gains',
    subtitle: 'Change in nonfarm payroll jobs by metro area, October 2026 vs. revised September (seasonally adjusted, jobs)',
    note: 'Cedar Bend lost 640 jobs, the largest metro decline. Lakeshore Valley also declined. Changes use revised September metro levels.',
    caption: 'Source: CES payroll survey, metro areas. Preliminary October 2026; revised September 2026.',
    source: 'CES',
    geography: 'Metro (7)',
    geographyDetail: 'Seven metro areas',
    ownerId: 'marcus',
    status: 'in review',
    version: 4,
    lastEditorId: 'marcus',
    lastEditAt: at(17, 13, 48),
    chart: {
      kind: 'hbar',
      unit: 'jobs',
      rows: [
        { label: 'Port Alder', value: 2100 },
        { label: 'Harrowgate', value: 1300 },
        { label: 'Millbrook Falls', value: 410 },
        { label: 'Brightwater', value: 270 },
        { label: 'Northfield', value: 220 },
        { label: 'Lakeshore Valley', value: -180 },
        { label: 'Cedar Bend', value: -640 },
      ],
    },
    active: [
      { personId: 'marcus', since: at(17, 13, 48), activity: 'Reloading Port Alder and Harrowgate on the revised September base' },
    ],
    history: [
      { at: at(16, 15, 2), by: 'marcus', version: 3, summary: 'Metro payroll chart built from preliminary October.' },
      { at: at(16, 15, 30), by: 'marcus', summary: 'Submitted for review.' },
      { at: at(17, 8, 41), by: 'system', summary: 'Revised September metro levels loaded (7 metros).' },
      { at: at(17, 13, 48), by: 'marcus', version: 4, summary: 'Port Alder and Harrowgate moved to revised base. Cedar Bend still on preliminary base.' },
    ],
  }),

  // ----- LAUS unemployment (Hana Kobayashi) -----
  chartBase({
    id: 'OCT-07',
    headline: 'Statewide unemployment rate rises to 4.3% in October',
    subtitle: 'Statewide unemployment rate, seasonally adjusted, November 2025 to October 2026 (percent)',
    note: 'The unemployment rate rose to 4.3% in October from 4.2% in September. September was revised up from 4.1%. The rate is 0.2 points below November 2025.',
    caption: 'Source: Local Area Unemployment Statistics (LAUS). Seasonally adjusted. September revised; October preliminary.',
    source: 'LAUS',
    ownerId: 'hana',
    status: 'in review',
    version: 6,
    lastEditorId: 'hana',
    lastEditAt: at(17, 14, 3),
    chart: monthsSeries(
      ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      [4.5, 4.4, 4.4, 4.3, 4.3, 4.2, 4.2, 4.1, 4.1, 4.0, 4.2, 4.3],
      10,
      'percent',
    ),
    active: [
      { personId: 'hana', since: at(17, 14, 3), activity: 'Rewriting the release note for the revised September rate' },
    ],
    history: [
      { at: at(16, 15, 20), by: 'hana', version: 4, summary: 'Built from preliminary LAUS October.' },
      { at: at(16, 15, 48), by: 'hana', summary: 'Submitted for review.' },
      { at: at(17, 8, 41), by: 'system', summary: 'Revised September LAUS file loaded (rev. 2): statewide rate 4.1% → 4.2%.' },
      { at: at(17, 8, 52), by: 'hana', version: 5, summary: 'Statewide series updated for the revised September rate.' },
      { at: at(17, 14, 3), by: 'hana', version: 6, summary: 'Subtitle and release note rewritten for the revised rate. Series re-checked.' },
    ],
    needsRecheck: false,
  }),

  chartBase({
    id: 'OCT-08',
    headline: 'Labor force reaches a 12-month high of 2.07 million',
    subtitle: 'Civilian labor force, seasonally adjusted, November 2025 to October 2026 (persons)',
    note: 'The labor force rose to 2,071,400 in October. The September level was revised to 2,070,600.',
    caption: 'Source: LAUS. Seasonally adjusted. Civilian noninstitutional population, 16 and older.',
    source: 'LAUS',
    ownerId: 'hana',
    status: 'approved',
    version: 5,
    lastEditorId: 'system',
    lastEditAt: at(17, 8, 41),
    approvedAt: at(16, 16, 2),
    approvedBy: 'ana',
    needsRecheck: true,
    chart: monthsSeries(
      ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      [2058200, 2060400, 2057900, 2062100, 2064800, 2066700, 2068300, 2069900, 2069100, 2069500, 2070600, 2071400],
      10,
    ),
    history: [
      { at: at(16, 13, 40), by: 'hana', version: 4, summary: 'Labor force series extended through preliminary October.' },
      { at: at(16, 14, 50), by: 'hana', version: 5, summary: 'Subtitle and axis labels finalized.' },
      { at: at(16, 16, 2), by: 'ana', summary: 'Approved for final sign-off.' },
      RECHECK_ENTRY(SEPT_REVISED_NOTE),
    ],
  }),

  chartBase({
    id: 'OCT-09',
    headline: 'Cedar Bend remains the highest-unemployment metro at 5.6%',
    subtitle: 'Unemployment rate by metro area, October 2026, seasonally adjusted (percent)',
    note: 'Every metro area’s rate is below its October 2025 level. Northfield has the lowest rate, at 3.7%.',
    caption: 'Source: LAUS, metro areas. October 2026 preliminary.',
    source: 'LAUS',
    geography: 'Metro (7)',
    geographyDetail: 'Seven metro areas',
    ownerId: 'hana',
    status: 'approved',
    version: 6,
    lastEditorId: 'system',
    lastEditAt: at(17, 8, 41),
    approvedAt: at(16, 16, 6),
    approvedBy: 'ana',
    needsRecheck: true,
    chart: {
      kind: 'hbar',
      unit: 'rate',
      rows: [
        { label: 'Cedar Bend', value: 5.6 },
        { label: 'Harrowgate', value: 4.8 },
        { label: 'Brightwater', value: 4.6 },
        { label: 'Millbrook Falls', value: 4.4 },
        { label: 'Lakeshore Valley', value: 4.1 },
        { label: 'Port Alder', value: 3.9 },
        { label: 'Northfield', value: 3.7 },
      ],
    },
    history: [
      { at: at(16, 12, 15), by: 'hana', version: 5, summary: 'Metro rates loaded from preliminary October.' },
      { at: at(16, 16, 6), by: 'ana', summary: 'Approved for final sign-off.' },
      RECHECK_ENTRY(SEPT_REVISED_NOTE),
    ],
  }),

  chartBase({
    id: 'OCT-10',
    headline: 'Every metro area’s unemployment rate is lower than a year ago',
    subtitle: 'Unemployment rate by metro area: October 2025, revised September 2026, and October 2026 (percent, seasonally adjusted)',
    note: 'All seven metro areas recorded lower unemployment rates than in October 2025. Declines ranged from 0.3 to 0.5 points.',
    caption: 'Source: LAUS, metro areas. October 2026 preliminary; September 2026 revised.',
    source: 'LAUS',
    geography: 'Metro (7)',
    geographyDetail: 'Seven metro areas',
    ownerId: 'hana',
    status: 'approved',
    version: 4,
    lastEditorId: 'system',
    lastEditAt: at(17, 8, 41),
    approvedAt: at(16, 16, 10),
    approvedBy: 'ana',
    needsRecheck: true,
    chart: {
      kind: 'table',
      columns: ['Metro area', 'Oct 2025', 'Sep 2026 (rev.)', 'Oct 2026', 'Change from Oct 2025'],
      rows: [
        { label: 'Brightwater', cells: ['5.0', '4.5', '4.6', '−0.4'] },
        { label: 'Cedar Bend', cells: ['6.0', '5.5', '5.6', '−0.4'] },
        { label: 'Harrowgate', cells: ['5.1', '4.7', '4.8', '−0.3'] },
        { label: 'Lakeshore Valley', cells: ['4.6', '4.0', '4.1', '−0.5'] },
        { label: 'Millbrook Falls', cells: ['4.9', '4.3', '4.4', '−0.5'] },
        { label: 'Northfield', cells: ['4.0', '3.6', '3.7', '−0.3'] },
        { label: 'Port Alder', cells: ['4.3', '3.8', '3.9', '−0.4'] },
      ],
    },
    history: [
      { at: at(16, 12, 40), by: 'hana', version: 3, summary: 'Year-over-year table built.' },
      { at: at(16, 16, 10), by: 'ana', summary: 'Approved for final sign-off.' },
      RECHECK_ENTRY(SEPT_REVISED_NOTE),
    ],
  }),

  chartBase({
    id: 'OCT-11',
    headline: 'Participation rate edges down to 62.0% in October',
    subtitle: 'Labor force participation rate, statewide, seasonally adjusted, November 2025 to October 2026 (percent)',
    note: 'Participation fell 0.1 point to 62.0% in October. The September rate was revised to 62.1%.',
    caption: 'Source: LAUS, statewide. Seasonally adjusted. September revised; October preliminary.',
    source: 'LAUS',
    ownerId: 'hana',
    status: 'approved',
    version: 3,
    lastEditorId: 'system',
    lastEditAt: at(17, 8, 41),
    approvedAt: at(16, 16, 14),
    approvedBy: 'ana',
    needsRecheck: true,
    chart: monthsSeries(
      ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
      [62.4, 62.3, 62.2, 62.2, 62.3, 62.1, 62.0, 62.1, 62.2, 62.2, 62.1, 62.0],
      10,
      'percent',
    ),
    history: [
      { at: at(16, 12, 5), by: 'hana', version: 2, summary: 'Participation series built.' },
      { at: at(16, 16, 14), by: 'ana', summary: 'Approved for final sign-off.' },
      RECHECK_ENTRY(SEPT_REVISED_NOTE),
    ],
  }),

  chartBase({
    id: 'OCT-12',
    headline: `County unemployment rates range from ${minRate.rate.toFixed(1)}% in ${minRate.name} to ${maxRate.rate.toFixed(1)}% in ${maxRate.name}`,
    subtitle: 'Unemployment rate by county, October 2026 (percent). One tile per county, arranged alphabetically.',
    note: 'Rates are preliminary. Tiles are ordered alphabetically, not by geographic position.',
    caption: 'Source: LAUS, county estimates. October 2026 preliminary.',
    source: 'LAUS',
    geography: 'County (64)',
    geographyDetail: 'All 64 counties',
    ownerId: 'hana',
    status: 'approved',
    version: 5,
    lastEditorId: 'hana',
    lastEditAt: at(16, 15, 50),
    approvedAt: at(16, 16, 18),
    approvedBy: 'ana',
    chart: {
      kind: 'tiles',
      unit: 'rate',
      diverging: false,
      cells: counties.map((c) => ({ label: c.name, value: c.rate })),
    },
    history: [
      { at: at(16, 11, 30), by: 'hana', version: 4, summary: 'County tiles built from preliminary LAUS.' },
      { at: at(16, 15, 50), by: 'hana', version: 5, summary: 'Caption and note aligned to the county file.' },
      { at: at(16, 16, 18), by: 'ana', summary: 'Approved for final sign-off.' },
    ],
  }),

  chartBase({
    id: 'OCT-13',
    headline: `Employment rose in ${jobsUp} counties and fell in ${jobsDown} in October`,
    subtitle: 'Largest employment changes by county, October 2026 vs. revised September: ten gains and ten losses (jobs)',
    note: 'The ten counties with the largest gains are shown first, followed by the ten largest losses.',
    caption: 'Source: LAUS, county estimates, seasonally adjusted. Full county list in appendix.',
    source: 'LAUS',
    geography: 'County (64)',
    geographyDetail: 'Top and bottom ten counties',
    ownerId: 'hana',
    status: 'approved',
    version: 3,
    lastEditorId: 'system',
    lastEditAt: at(17, 8, 41),
    approvedAt: at(16, 16, 26),
    approvedBy: 'ana',
    needsRecheck: true,
    chart: {
      kind: 'hbar',
      unit: 'jobs',
      rows: [...top10, ...bottom10].map((c) => ({ label: c.name, value: c.jobs })),
    },
    history: [
      { at: at(16, 12, 55), by: 'hana', version: 2, summary: 'Ranking built from preliminary county file.' },
      { at: at(16, 16, 26), by: 'ana', summary: 'Approved for final sign-off.' },
      RECHECK_ENTRY('Revised September county base loaded. Ranking values refreshed. Re-check before final.'),
    ],
  }),

  chartBase({
    id: 'OCT-14',
    headline: `Unemployment is lower than a year ago in ${yoyDown} of 64 counties`,
    subtitle: 'Change in unemployment rate by county, October 2025 to October 2026 (percentage points). One tile per county, alphabetical.',
    note: 'Negative values mean the rate fell over the year.',
    caption: 'Source: LAUS county estimates. October 2026 preliminary.',
    source: 'LAUS',
    geography: 'County (64)',
    geographyDetail: 'All 64 counties',
    ownerId: 'hana',
    status: 'approved',
    version: 2,
    lastEditorId: 'hana',
    lastEditAt: at(16, 15, 40),
    approvedAt: at(16, 16, 30),
    approvedBy: 'ana',
    chart: {
      kind: 'tiles',
      unit: 'points',
      diverging: true,
      cells: counties.map((c) => ({ label: c.name, value: c.yoy })),
    },
    history: [
      { at: at(16, 15, 40), by: 'hana', version: 2, summary: 'County year-over-year tiles built.' },
      { at: at(16, 16, 30), by: 'ana', summary: 'Approved for final sign-off.' },
    ],
  }),

  // ----- QCEW wages and employment (Devon Whitfield) -----
  chartBase({
    id: 'OCT-15',
    headline: 'Utilities and financial activities post the highest average weekly wages',
    subtitle: 'Average weekly wage by major industry, statewide, Q2 2026 (dollars)',
    note: 'Q2 is the most recent quarter in the QCEW program. Figures are not seasonally adjusted.',
    caption: 'Source: Quarterly Census of Employment and Wages (QCEW), statewide, Q2 2026.',
    source: 'QCEW',
    ownerId: 'devon',
    status: 'approved',
    version: 4,
    lastEditorId: 'devon',
    lastEditAt: at(16, 14, 40),
    approvedAt: at(16, 16, 34),
    approvedBy: 'ana',
    chart: {
      kind: 'hbar',
      unit: 'dollars',
      rows: [
        { label: 'Utilities', value: 2184 },
        { label: 'Financial activities', value: 2097 },
        { label: 'Information', value: 1998 },
        { label: 'Professional and business services', value: 1612 },
        { label: 'Manufacturing', value: 1487 },
        { label: 'Construction', value: 1365 },
        { label: 'Wholesale trade', value: 1312 },
        { label: 'Health care and social assistance', value: 1294 },
        { label: 'Transportation and warehousing', value: 1231 },
        { label: 'Government', value: 1147 },
        { label: 'Retail trade', value: 782 },
        { label: 'Other services', value: 712 },
        { label: 'Leisure and hospitality', value: 506 },
      ],
    },
    history: [
      { at: at(16, 14, 40), by: 'devon', version: 4, summary: 'Industry order and labels checked against the QCEW file.' },
      { at: at(16, 16, 34), by: 'ana', summary: 'Approved for final sign-off.' },
    ],
  }),

  chartBase({
    id: 'OCT-16',
    headline: 'Health care remains the largest industry by employment, at 402,300 jobs',
    subtitle: 'Employment by industry, statewide, Q2 2026 (jobs)',
    note: 'Government is shown with the industry list, consistent with the release standard.',
    caption: 'Source: QCEW, statewide, Q2 2026. Not seasonally adjusted.',
    source: 'QCEW',
    ownerId: 'devon',
    status: 'approved',
    version: 3,
    lastEditorId: 'devon',
    lastEditAt: at(16, 15, 20),
    approvedAt: at(16, 16, 36),
    approvedBy: 'ana',
    chart: {
      kind: 'hbar',
      unit: 'jobs',
      rows: [
        { label: 'Health care and social assistance', value: 402300 },
        { label: 'Government', value: 395800 },
        { label: 'Professional and business services', value: 298500 },
        { label: 'Retail trade', value: 281700 },
        { label: 'Leisure and hospitality', value: 233000 },
        { label: 'Manufacturing', value: 226100 },
        { label: 'Construction', value: 181400 },
        { label: 'Financial activities', value: 165900 },
        { label: 'Transportation and warehousing', value: 148700 },
        { label: 'Wholesale trade', value: 105800 },
        { label: 'Other services', value: 102400 },
        { label: 'Information', value: 61200 },
        { label: 'Utilities', value: 18600 },
      ],
    },
    history: [
      { at: at(16, 13, 10), by: 'devon', version: 2, summary: 'Industry totals loaded from Q2 QCEW.' },
      { at: at(16, 15, 20), by: 'devon', version: 3, summary: 'Government row added to match release standard.' },
      { at: at(16, 16, 36), by: 'ana', summary: 'Approved for final sign-off.' },
    ],
  }),

  chartBase({
    id: 'OCT-17',
    headline: 'More than three in four establishments have fewer than 20 workers',
    subtitle: 'Share of establishments by employment size class, Q2 2026 (percent of establishments)',
    note: 'Size classes follow the QCEW standard. The six shares sum to 100.0.',
    caption: 'Source: QCEW, Q2 2026. Shares may not sum to 100.0 because of rounding.',
    source: 'QCEW',
    ownerId: 'devon',
    status: 'approved',
    version: 2,
    lastEditorId: 'devon',
    lastEditAt: at(16, 12, 30),
    approvedAt: at(16, 16, 40),
    approvedBy: 'ana',
    chart: {
      kind: 'column',
      unit: 'rate',
      points: [
        { label: '1–9', value: 61.2 },
        { label: '10–19', value: 17.3 },
        { label: '20–49', value: 12.4 },
        { label: '50–99', value: 5.0 },
        { label: '100–249', value: 2.6 },
        { label: '250+', value: 1.5 },
      ],
    },
    history: [
      { at: at(16, 12, 30), by: 'devon', version: 2, summary: 'Size-class shares recomputed from the Q2 file.' },
      { at: at(16, 16, 40), by: 'ana', summary: 'Approved for final sign-off.' },
    ],
  }),

  chartBase({
    id: 'OCT-18',
    headline: 'Industry employment in nine small counties, Q2 2026',
    subtitle: 'Employment by selected industry in small counties, Q2 2026 (jobs). (s) = suppressed.',
    note: 'Cells marked (s) are suppressed under the agency’s disclosure rules. Do not release values for these cells.',
    caption: 'Source: QCEW, county level, Q2 2026. (s) Suppressed: fewer than 3 establishments or a disclosure risk in the cell.',
    source: 'QCEW',
    geography: 'County (64)',
    geographyDetail: 'Nine small counties',
    ownerId: 'devon',
    status: 'disclosure hold',
    version: 3,
    lastEditorId: 'devon',
    lastEditAt: at(17, 10, 20),
    hold: {
      by: 'grace',
      at: at(17, 11, 2),
      reason: '11 cells across 8 counties fall below the confidentiality threshold (fewer than 3 establishments).',
      prevStatus: 'in review',
    },
    chart: {
      kind: 'table',
      columns: ['County', 'Manufacturing', 'Construction', 'Retail trade', 'Health care'],
      rows: [
        { label: 'Ashby', cells: ['412', SUPPRESSED, '186', '230'] },
        { label: 'Brackett', cells: [SUPPRESSED, '96', '141', SUPPRESSED] },
        { label: 'Corwin', cells: ['184', '77', SUPPRESSED, '158'] },
        { label: 'Delmar', cells: ['230', SUPPRESSED, '112', '96'] },
        { label: 'Easton', cells: ['61', '54', SUPPRESSED, '88'] },
        { label: 'Fallon', cells: [SUPPRESSED, '102', '205', '147'] },
        { label: 'Gibbs', cells: ['129', SUPPRESSED, '88', SUPPRESSED] },
        { label: 'Harlow', cells: ['74', '61', '59', '103'] },
        { label: 'Ingram', cells: [SUPPRESSED, SUPPRESSED, '95', '110'] },
      ],
    },
    history: [
      { at: at(16, 14, 30), by: 'devon', version: 2, summary: 'County industry table built from the Q2 county file.' },
      { at: at(16, 15, 10), by: 'devon', summary: 'Submitted for review.' },
      { at: at(17, 10, 20), by: 'devon', version: 3, summary: 'Industry cells updated for the Q2 file.' },
      { at: at(17, 11, 2), by: 'grace', summary: 'Disclosure hold placed: 11 suppressed cells across 8 counties.' },
    ],
    active: [
      { personId: 'grace', since: at(17, 11, 2), activity: 'Checking the suppression pattern against the threshold' },
    ],
  }),

  chartBase({
    id: 'OCT-19',
    headline: 'Average weekly wages in nine small counties, Q2 2026',
    subtitle: 'Average weekly wage by selected industry and county, Q2 2026 (dollars). (s) = suppressed.',
    note: 'Three cells are suppressed. The hold lifts only after the county list and the suppression pattern are confirmed.',
    caption: 'Source: QCEW, county level, Q2 2026. (s) Suppressed under disclosure rules.',
    source: 'QCEW',
    geography: 'County (64)',
    geographyDetail: 'Nine small counties',
    ownerId: 'devon',
    status: 'disclosure hold',
    version: 2,
    lastEditorId: 'devon',
    lastEditAt: at(17, 10, 45),
    hold: {
      by: 'grace',
      at: at(17, 11, 26),
      reason: '3 cells across 3 counties fall below the confidentiality threshold. County table cannot release as drafted.',
      prevStatus: 'in review',
    },
    chart: {
      kind: 'table',
      columns: ['County', 'Manufacturing', 'Health care', 'Retail trade'],
      rows: [
        { label: 'Ashby', cells: ['1,284', '1,012', '644'] },
        { label: 'Brackett', cells: [SUPPRESSED, '958', '611'] },
        { label: 'Corwin', cells: ['1,140', '977', SUPPRESSED] },
        { label: 'Delmar', cells: ['1,226', '1,034', '628'] },
        { label: 'Easton', cells: ['1,071', '926', '590'] },
        { label: 'Fallon', cells: ['1,312', '1,088', '671'] },
        { label: 'Gibbs', cells: ['1,105', SUPPRESSED, '602'] },
        { label: 'Harlow', cells: ['1,058', '961', '584'] },
        { label: 'Ingram', cells: ['1,190', '1,005', '617'] },
      ],
    },
    history: [
      { at: at(16, 17, 10), by: 'devon', version: 1, summary: 'County wage table built from the Q2 county file.' },
      { at: at(16, 17, 12), by: 'devon', summary: 'Submitted for review.' },
      { at: at(17, 10, 45), by: 'devon', version: 2, summary: 'Wage cells refreshed.' },
      { at: at(17, 11, 26), by: 'grace', summary: 'Disclosure hold placed: 3 suppressed cells across 3 counties.' },
    ],
    active: [
      { personId: 'grace', since: at(17, 11, 26), activity: 'Reviewing the wage cells against the threshold' },
    ],
  }),

  chartBase({
    id: 'OCT-20',
    headline: 'Wage growth tops 3% in four of seven metro areas',
    subtitle: 'Average weekly wage growth by metro area, Q2 2026 vs. Q2 2025 (percent change)',
    note: 'Growth is the year-over-year change in average weekly wage. Lakeshore Valley had the smallest gain, at 1.1%.',
    caption: 'Source: QCEW, metro areas, Q2 2026 vs. Q2 2025.',
    source: 'QCEW',
    geography: 'Metro (7)',
    geographyDetail: 'Seven metro areas',
    ownerId: 'devon',
    status: 'in review',
    version: 3,
    lastEditorId: 'devon',
    lastEditAt: at(17, 12, 10),
    chart: {
      kind: 'hbar',
      unit: 'percent',
      rows: [
        { label: 'Port Alder', value: 4.1 },
        { label: 'Harrowgate', value: 3.6 },
        { label: 'Millbrook Falls', value: 3.4 },
        { label: 'Brightwater', value: 3.3 },
        { label: 'Northfield', value: 2.7 },
        { label: 'Cedar Bend', value: 2.2 },
        { label: 'Lakeshore Valley', value: 1.1 },
      ],
    },
    active: [
      { personId: 'devon', since: at(17, 12, 10), activity: 'Re-running Q2 wage growth on the revised base' },
    ],
    history: [
      { at: at(16, 15, 45), by: 'devon', version: 2, summary: 'Metro wage growth chart built on Q2 QCEW.' },
      { at: at(16, 15, 50), by: 'devon', summary: 'Submitted for review.' },
      { at: at(17, 12, 10), by: 'devon', version: 3, summary: 'Q2 base updated. Port Alder value rechecked.' },
    ],
  }),

  // ----- Drafts (Ana Delacroix) -----
  chartBase({
    id: 'OCT-21',
    headline: 'Three-month average payroll gain climbs to 2,600 jobs in October',
    subtitle: 'Three-month average change in total nonfarm payrolls, seasonally adjusted, July to October 2026 (jobs)',
    note: 'The three-month average smooths month-to-month swings. September’s revised loss is included.',
    caption: 'Source: CES payroll survey. Three-month averages computed from monthly changes.',
    source: 'CES',
    ownerId: 'ana',
    status: 'drafting',
    version: 2,
    lastEditorId: 'ana',
    lastEditAt: at(17, 13, 30),
    chart: {
      kind: 'column',
      unit: 'jobs',
      points: [
        { label: 'Jul', value: 2500 },
        { label: 'Aug', value: 2267 },
        { label: 'Sep', value: 1767 },
        { label: 'Oct', value: 2600 },
      ],
    },
    history: [
      { at: at(16, 16, 40), by: 'ana', version: 1, summary: 'Draft built from preliminary CES.' },
      { at: at(17, 13, 30), by: 'ana', version: 2, summary: 'Three-month averages recomputed after the September revision.' },
    ],
  }),

  chartBase({
    id: 'OCT-22',
    headline: 'Health care employment is 14% above its pre-pandemic level',
    subtitle: 'Employment change by industry, October 2026 vs. February 2020, seasonally adjusted (percent)',
    note: 'Health care is the only major industry more than 10% above February 2020. Information remains furthest below its pre-pandemic level.',
    caption: 'Source: CES payroll survey. February 2020 is the pre-pandemic benchmark.',
    source: 'CES',
    ownerId: 'ana',
    status: 'drafting',
    version: 1,
    lastEditorId: 'ana',
    lastEditAt: at(16, 16, 5),
    chart: {
      kind: 'hbar',
      unit: 'percent',
      rows: [
        { label: 'Health care and social assistance', value: 14.2 },
        { label: 'Construction', value: 5.3 },
        { label: 'Transportation and warehousing', value: 4.7 },
        { label: 'Leisure and hospitality', value: 1.8 },
        { label: 'Financial activities', value: 0.9 },
        { label: 'Government', value: -1.6 },
        { label: 'Professional and business services', value: -2.1 },
        { label: 'Manufacturing', value: -6.9 },
        { label: 'Retail trade', value: -8.4 },
        { label: 'Information', value: -11.2 },
      ],
    },
    history: [{ at: at(16, 16, 5), by: 'ana', version: 1, summary: 'Drafted from the February 2020 benchmark.' }],
  }),
];

// ---------------------------------------------------------------------------
// Comments. 17 open threads (5 addressed to Ana) and 2 resolved threads.

let commentSeq = 0;
const comment = (
  chartId: string,
  authorId: string,
  when: number,
  text: string,
  to: string[],
  opts: { replies?: { authorId: string; at: number; text: string }[]; resolved?: boolean; resolvedBy?: string; resolvedAt?: number } = {},
): Comment => {
  commentSeq += 1;
  return {
    id: `cm-${commentSeq}`,
    chartId,
    authorId,
    at: when,
    text,
    to,
    replies: (opts.replies ?? []).map((r, i) => ({ id: `cm-${commentSeq}-r${i + 1}`, ...r })),
    resolved: opts.resolved ?? false,
    resolvedBy: opts.resolvedBy ?? null,
    resolvedAt: opts.resolvedAt ?? null,
  };
};

const COMMENTS: Comment[] = [
  comment('OCT-01', 'renee', at(17, 11, 40),
    'Ana, the headline says “third straight month.” With September revised to a 400-job loss, August to October is not a run of gains. Suggested headline: “Statewide payrolls rebound by 6,300 jobs in October after a September dip.” The release note needs the same change. Your call on the wording.',
    ['ana'],
    { replies: [{ authorId: 'marcus', at: at(17, 11, 52), text: 'Checked the revised CES file: Aug +1,900, Sep −400, Oct +6,300. Your suggested framing is accurate. I will update the chart’s data label once you pick the headline.' }] },
  ),
  comment('OCT-06', 'ana', at(16, 16, 40),
    'Marcus, Cedar Bend had the largest September revision of the seven metros. Is it on the revised base yet?',
    ['marcus'],
  ),
  comment('OCT-07', 'renee', at(17, 9, 5),
    'The release note still gives September as 4.1%. The revised figure is 4.2%. Ana, should the note lead with October’s 4.3% and then mention the revision, or the other way round?',
    ['ana'],
  ),
  comment('OCT-07', 'hana', at(17, 9, 20),
    'Updating the note today. I will say the rate was “revised up to 4.2%” so the change is explicit.',
    ['renee'],
  ),
  comment('OCT-05', 'renee', at(17, 10, 2),
    'Ana, the headline says hourly earnings rose 0.3%, but the release note says 0.4%. The unrounded change is 0.32%, so 0.3% is right. Please confirm the note wording before I edit it.',
    ['ana'],
  ),
  comment('OCT-12', 'grace', at(17, 12, 40),
    'Ana, the county tiles are alphabetical rather than geographic. The note says so, which is fine, but please confirm the county names against the official list before you mark this final.',
    ['ana'],
  ),
  comment('OCT-13', 'renee', at(17, 10, 30),
    'Subtitle says “by jobs,” but the axis is change in jobs. Please reword it to “Change in jobs” to match the caption.',
    ['hana'],
  ),
  comment('OCT-18', 'grace', at(17, 11, 2),
    'Hold placed. Eleven cells across eight counties are below the threshold of three establishments. Please propose a fix: combine NAICS groups or drop cells. I need a revised table before I can lift the hold.',
    ['devon'],
  ),
  comment('OCT-18', 'devon', at(17, 11, 40),
    'Proposing to combine the Retail and Construction cells for Gibbs and Ingram. Revised table by 3 p.m.',
    ['grace'],
  ),
  comment('OCT-19', 'grace', at(17, 11, 26),
    'Hold placed: three cells across three counties fall below the threshold. Ana, you can keep the county table with suppressed cells or move to regional totals. Either way the hold lifts only after the revised table. Your call.',
    ['ana'],
  ),
  comment('OCT-20', 'devon', at(17, 12, 30),
    'Q2 wage growth is rounded to one decimal in the table, and the chart labels use the same rounding. Let me know if the style guide wants two decimals for metro growth.',
    ['renee'],
  ),
  comment('OCT-03', 'marcus', at(16, 17, 40),
    'Supersector label: the style sheet says “Information,” the source file says “Info.” I have used “Information.” Tell me if you want otherwise.',
    ['renee'],
  ),
  comment('OCT-08', 'ana', at(16, 16, 25),
    'Please put the revised September level in the subtitle, not only in the note. Readers skim subtitles.',
    ['hana'],
  ),
  comment('OCT-14', 'renee', at(16, 18, 14),
    'Legend on the diverging tiles should read “percentage points,” not “%.”',
    ['hana'],
  ),
  comment('OCT-04', 'marcus', at(16, 17, 22),
    'Headline says “adds 300 jobs” but the note says “government payrolls rose by 300.” Keep one wording across the release?',
    ['renee'],
  ),
  comment('OCT-17', 'devon', at(16, 21, 14),
    'Size-class shares sum to 100.0, but the 250+ row is 1.5. Want a footnote on rounding?',
    ['renee'],
  ),
  comment('OCT-09', 'renee', at(17, 12, 5),
    'Harrowgate is 4.8% here. The metro table in the release draft shows 4.9%. Please reconcile before Wednesday’s handoff.',
    ['hana'],
  ),
  // Resolved threads (not counted as open)
  comment('OCT-02', 'renee', at(16, 13, 10),
    'Axis label should read “jobs,” not “thousands.”',
    ['marcus'],
    { resolved: true, resolvedBy: 'marcus', resolvedAt: at(16, 14, 2), replies: [{ authorId: 'marcus', at: at(16, 14, 2), text: 'Done.' }] },
  ),
  comment('OCT-16', 'devon', at(16, 15, 20),
    'Government row stays in the list. The release standard includes it.',
    ['renee'],
    { resolved: true, resolvedBy: 'devon', resolvedAt: at(16, 15, 30) },
  ),
];

// ---------------------------------------------------------------------------
// Change feed (newest first in the UI; stored oldest first here)

let feedSeq = 0;
const ev = (when: number, actorId: string, chartId: string | null, kind: FeedEvent['kind'], text: string): FeedEvent => {
  feedSeq += 1;
  return { id: `ev-${feedSeq}`, at: when, actorId, chartId, kind, text };
};

const FEED: FeedEvent[] = [
  ev(at(16, 17, 5), 'marcus', 'OCT-04', 'comment', 'Commented on OCT-04 headline wording for Renee.'),
  ev(at(16, 18, 14), 'renee', 'OCT-14', 'comment', 'Commented on OCT-14 legend units for Hana.'),
  ev(at(16, 21, 14), 'devon', 'OCT-17', 'comment', 'Commented on OCT-17 rounding for Renee.'),
  ev(at(17, 8, 41), 'system', null, 'system', 'Revised September CES and LAUS files loaded (rev. 2). Eight approved charts use September and are flagged for re-check.'),
  ev(at(17, 8, 41), 'marcus', 'OCT-01', 'data', 'Revised September payroll change loaded: −400 jobs (was +1,200).'),
  ev(at(17, 8, 52), 'hana', 'OCT-07', 'edit', 'Statewide unemployment rate: September revised 4.1% → 4.2% in the series (v5).'),
  ev(at(17, 9, 5), 'renee', 'OCT-07', 'comment', 'Asked which figure leads the release note (to Ana).'),
  ev(at(17, 9, 31), 'marcus', 'OCT-01', 'status', 'October change recalculated +4,700 → +6,300. Status reset from approved to in review (v7).'),
  ev(at(17, 10, 2), 'renee', 'OCT-05', 'comment', 'Asked Ana to confirm 0.3% vs. 0.4% in the hourly earnings note.'),
  ev(at(17, 10, 20), 'devon', 'OCT-18', 'edit', 'County industry table updated for the Q2 file (v3).'),
  ev(at(17, 10, 30), 'renee', 'OCT-13', 'comment', 'Asked Hana to reword the subtitle axis label.'),
  ev(at(17, 11, 2), 'grace', 'OCT-18', 'hold', 'Disclosure hold placed: 11 cells across 8 counties below threshold.'),
  ev(at(17, 11, 26), 'grace', 'OCT-19', 'hold', 'Disclosure hold placed: 3 cells across 3 counties below threshold.'),
  ev(at(17, 11, 40), 'renee', 'OCT-01', 'comment', 'Flagged the “third straight month” headline to Ana.'),
  ev(at(17, 12, 10), 'devon', 'OCT-20', 'edit', 'Q2 wage growth updated to the revised base (v3).'),
  ev(at(17, 12, 40), 'grace', 'OCT-12', 'comment', 'Asked Ana to confirm county names before final.'),
  ev(at(17, 13, 48), 'marcus', 'OCT-06', 'edit', 'Port Alder and Harrowgate moved to the revised base (v4). Cedar Bend pending.'),
  ev(at(17, 14, 3), 'hana', 'OCT-07', 'edit', 'Subtitle and release note rewritten for the revised rate (v6).'),
];

// ---------------------------------------------------------------------------

export function buildInitialState(): AppState {
  return {
    charts: CHARTS,
    comments: COMMENTS,
    feed: FEED,
    lastSeenAt: LAST_VISIT,
    selectedId: 'OCT-01',
    filters: { query: '', status: 'all', ownerId: 'all', geography: 'all', source: 'all' },
    tab: 'comments',
    feedShowAll: false,
    handedOffAt: null,
    seq: 1000,
  };
}

