// Proofloop mock data. Everything here is fictional.
// The app opens on Monday 16 Nov 2026 at 8:34 AM, Ines Varga's first look at the day.

export const TODAY = new Date(2026, 10, 16, 8, 34);

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PEOPLE = {
  ines: { name: 'Ines Varga', initials: 'IV', side: 'studio', role: 'Creative lead, Fieldnote Studio' },
  dara: { name: 'Dara Lin', initials: 'DL', side: 'studio', role: 'Project manager, Fieldnote Studio' },
  kofi: { name: 'Kofi Mensah', initials: 'KM', side: 'studio', role: 'Designer, Fieldnote Studio' },
  renee: { name: 'Renée Almeida', initials: 'RA', side: 'client', role: 'Communications, Tri-County Transit Authority' },
  sam: { name: 'Sam Pruitt', initials: 'SP', side: 'client', role: 'Data analyst, Tri-County Transit Authority' },
  marisol: { name: 'Marisol Okafor', initials: 'MO', side: 'client', role: 'Harlow County Emergency Management' },
  tomas: { name: 'Tomas Reyes', initials: 'TR', side: 'client', role: 'GIS lead, Harlow County' },
  pat: { name: 'Pat Lindqvist', initials: 'PL', side: 'client', role: 'Midlands Grain Cooperative' },
  dwayne: { name: 'Dwayne Ostrowski', initials: 'DO', side: 'client', role: 'Operations, Midlands Grain Cooperative' },
  priya: { name: 'Priya Natarajan', initials: 'PN', side: 'client', role: 'Westbrook Unified School District' },
  hannah: { name: 'Hannah Brandt', initials: 'HB', side: 'client', role: 'Northgate Community Health' },
};

export const THREADS = {
  client: {
    id: 'client',
    label: 'Client review',
    audience: 'Renée Almeida, Sam Pruitt, Dara Lin',
    visibleTo: 'Renée Almeida, Sam Pruitt, Dara Lin and you',
    external: true,
  },
  data: {
    id: 'data',
    label: 'Data & methodology',
    audience: 'Sam Pruitt, Dara Lin',
    visibleTo: 'Sam Pruitt, Dara Lin and you. Clients can see this thread.',
    external: true,
  },
  studio: {
    id: 'studio',
    label: 'Studio only',
    audience: 'Dara Lin, Kofi Mensah',
    visibleTo: 'Dara Lin, Kofi Mensah and you. Clients can’t see this thread.',
    external: false,
  },
};

// Ridership index: % of the calendar-2019 weekday-adjusted average, monthly, Jan 2019 to Oct 2026.
const BY_YEAR = {
  2019: [99.1, 97.8, 100.6, 101.9, 102.7, 103.4, 102.0, 101.3, 99.5, 98.9, 97.2, 95.6],
  2020: [96.4, 93.1, 68.9, 24.6, 31.2, 36.8, 42.5, 46.9, 49.7, 51.3, 50.4, 46.8],
  2021: [44.1, 46.0, 50.7, 53.2, 55.9, 58.4, 57.1, 56.3, 58.8, 61.5, 60.2, 57.7],
  2022: [58.9, 61.4, 66.2, 69.0, 71.6, 72.3, 70.8, 71.9, 73.5, 74.1, 72.6, 70.2],
  2023: [71.4, 73.2, 76.9, 78.3, 79.6, 80.5, 79.2, 78.6, 80.1, 81.0, 80.4, 78.8],
  2024: [79.7, 82.0, 84.6, 85.9, 86.7, 86.1, 84.9, 85.4, 86.9, 87.6, 86.2, 84.0],
  2025: [84.8, 86.3, 88.9, 89.4, 90.2, 89.1, 87.6, 86.9, 87.5, 88.1, 87.0, 85.2],
  2026: [84.3, 86.1, 88.4, 88.0, 87.2, 85.6, 84.0, 83.1, 82.4, 81.4],
};

export const SERIES = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].flatMap((y) => BY_YEAR[y]);

// Versions of the ridership graphic. `lastIndex` is the last month plotted in that version.
export const VERSIONS = {
  v1: {
    id: 'v1',
    sent: 'Oct 14',
    axisMax: 120,
    lastIndex: 91,
    through: 'Aug 2026',
    summary: 'First pass. Axis 0–120.',
    image: { name: 'ridership_recovery_v1.svg', size: '212 KB' },
    data: { name: 'ridership_recovery_v1_data.csv', size: '7 KB' },
  },
  v2: {
    id: 'v2',
    sent: 'Oct 29',
    axisMax: 110,
    lastIndex: 92,
    through: 'Sep 2026',
    summary: 'Adds 2020–21 service band. Axis top 110.',
    image: { name: 'ridership_recovery_v2.svg', size: '219 KB' },
    data: { name: 'ridership_recovery_v2_data.csv', size: '7 KB' },
  },
  v3: {
    id: 'v3',
    sent: 'Nov 12',
    axisMax: 110,
    lastIndex: 93,
    through: 'Oct 2026, prelim',
    summary: 'Adds 2020 callout and weekday note.',
    image: { name: 'ridership_recovery_v3.svg', size: '226 KB' },
    data: { name: 'ridership_recovery_v3_data.csv', size: '8 KB' },
    current: true,
  },
};

const msg = (id, thread, when, from, version, text, extra = {}) => ({ id, thread, at: when, from, version, text, ...extra });
const at = (monthIndex, day, hour, minute) => new Date(2026, monthIndex, day, hour, minute);
const OCT = 9;
const NOV = 10;

// 34 messages on G3 across three conversations.
export const MESSAGES = [
  // ---- Client review (15) ----
  msg('c01', 'client', at(OCT, 14, 9, 0), 'dara', 'v1',
    'Kicking off the ridership graphic. v1 goes out today on the weekday-adjusted index, through August 2026. v2 follows once you’ve checked the 2019 baseline.'),
  msg('c02', 'client', at(OCT, 14, 15, 5), 'renee', 'v1',
    'Got it. Please keep the 2019 average visible as the 100% reference line.'),
  msg('c03', 'client', at(OCT, 15, 9, 30), 'renee', 'v1',
    'Confirmed with our board liaison. The reference they want is calendar 2019. Keep the source line on every version.'),
  msg('c04', 'client', at(OCT, 15, 11, 10), 'ines', 'v1',
    'Done. The reference line is labelled “100% = 2019 average”, and the source line stays on every version.'),
  msg('c05', 'client', at(OCT, 29, 9, 40), 'ines', 'v2',
    'v2 is up. Data runs through September, the 2020–21 service-reduction band is added, and the axis top is tightened to 110%.'),
  msg('c06', 'client', at(OCT, 29, 14, 18), 'renee', 'v2',
    'Better. Is the axis-top change intentional? v1 went to 120.'),
  msg('c07', 'client', at(OCT, 29, 14, 50), 'ines', 'v2',
    'Intentional. It keeps the 2019 reference line closer to the top. Happy to revert if it reads oddly.'),
  msg('c08', 'client', at(OCT, 30, 10, 12), 'renee', 'v2',
    'Keep it. Sam, can you check the Q2 2025 figure against the state dashboard?'),
  msg('c09', 'client', at(NOV, 2, 11, 30), 'sam', 'v2',
    'Checked. Q2 2025 matches the state dashboard within 0.2 points.'),
  msg('c10', 'client', at(NOV, 12, 11, 5), 'ines', 'v3',
    'v3 is up. October is preliminary feed data, the 2020 callout is in, and the axis label reads “Ridership, % of 2019 average”. The data file is in the version panel.',
    { files: [] }),
  msg('c11', 'client', at(NOV, 13, 9, 12), 'renee', 'v3',
    'The callout on this low is louder than the dip deserves. The board already knows about 2020. Can we de-emphasize it?',
    { pin: { key: 'pin1', label: 'Apr 2020 low', index: 15 } }),
  msg('c12', 'client', at(NOV, 13, 9, 20), 'sam', 'v3',
    'Please add “weekday-adjusted” to the axis label. The series isn’t raw boardings, and the board glossary will say so.',
    { pin: { key: 'pin2', label: 'Y-axis label' } }),
  msg('c13', 'client', at(NOV, 13, 10, 2), 'ines', 'v3',
    'Thanks, both. Taking the axis-label change now. On the 2020 callout, let’s talk about what de-emphasize should look like on v4.'),
  msg('c14', 'client', at(NOV, 14, 16, 15), 'dara', 'v3',
    'Renée, Sam: the board packet closes Tue Nov 24, so the graphic needs to be locked before then.'),
  msg('c15', 'client', at(NOV, 16, 6, 12), 'renee', 'v3',
    'Ines, replying to v3 directly. Two requests. First, de-emphasize the pandemic dip so the recovery reads as the headline. Second, start the y-axis at 40%. The 0% floor makes the recovery look flatter than it is. Can you send v4 this week?',
    { unread: true }),

  // ---- Data & methodology (8) ----
  msg('d01', 'data', at(OCT, 14, 16, 10), 'sam', 'v1',
    'Quick check on the baseline. We’re using the calendar-2019 average, weekday-adjusted, not the fiscal-year average. Can you confirm?'),
  msg('d02', 'data', at(OCT, 14, 16, 25), 'dara', 'v1',
    'Calendar 2019 is what the board liaison asked for. Ines, can you confirm on your side?'),
  msg('d03', 'data', at(OCT, 14, 16, 52), 'ines', 'v1',
    'Confirmed: calendar 2019, weekday-adjusted.'),
  msg('d04', 'data', at(OCT, 27, 13, 44), 'sam', 'v2',
    'Monthly export for 2019 to 2026 is attached, with the method note in the appendix. The pre-2020 baseline is calendar 2019, as agreed.',
    { files: [{ name: 'monthly_weekday_index_2019_2026.csv', size: '6 KB', kind: 'series', last: 92, oct: 'prelim' }] }),
  msg('d05', 'data', at(OCT, 27, 14, 30), 'ines', 'v2',
    'Thanks, Sam. Dara will file the method note with the board appendix.'),
  msg('d06', 'data', at(NOV, 12, 11, 20), 'ines', 'v3',
    'The v3 data file uses the preliminary October feed. Please flag anything that looks off before the board packet is assembled.'),
  msg('d07', 'data', at(NOV, 15, 16, 40), 'sam', 'v3',
    'Correction for October 2026. Our reconciled APC figure came in Friday. October moves from 81.4% to 79.8% of the 2019 average on v3. The revised series is attached. Nothing else in the series changes. Sorry for the late catch.',
    {
      unread: true,
      files: [{ name: 'ridership_recovery_oct2026_revised.csv', size: '6 KB', kind: 'series', last: 93, oct: 'corrected' }],
    }),
  msg('d08', 'data', at(NOV, 16, 7, 31), 'dara', 'v3',
    'Thanks, Sam. Ines will carry the corrected October figure into v4 and the appendix table.',
    { unread: true }),

  // ---- Studio only (11) ----
  msg('s01', 'studio', at(OCT, 14, 11, 30), 'kofi', 'v1',
    'v1 exported with a 0–120 axis. Should the 2019 average be a dashed reference line?'),
  msg('s02', 'studio', at(OCT, 14, 11, 41), 'ines', 'v1',
    'Yes, dashed. Keep 0–120 for v1 and we’ll see what Renée says.'),
  msg('s03', 'studio', at(OCT, 29, 10, 5), 'kofi', 'v2',
    'Tightened the axis top to 110 for v2. 2026 values top out near 88, so there’s room above 2019 for the callout.'),
  msg('s04', 'studio', at(OCT, 29, 10, 20), 'ines', 'v2',
    'Fine. Keep the reasoning short if Renée asks.'),
  msg('s05', 'studio', at(NOV, 12, 17, 50), 'kofi', 'v3',
    'v3 exported. October is preliminary and flagged in the data file.'),
  msg('s06', 'studio', at(NOV, 12, 17, 58), 'dara', 'v3',
    'Noted. Sam says reconciliation is due this week.'),
  msg('s07', 'studio', at(NOV, 16, 7, 41), 'dara', 'v3',
    'Renée replied on v3 overnight. Two asks: de-emphasize the 2020 dip, and start the y-axis at 40%. Full text is in Client review. Ines, can you take this one?',
    { unread: true }),
  msg('s08', 'studio', at(NOV, 16, 7, 58), 'kofi', 'v3',
    'Before I touch v4: is truncating the axis acceptable here? It’s a line chart, so a non-zero baseline isn’t dishonest by itself. But at a 40% floor the April 2020 low (24.6%) falls off the chart. I can lighten the 2020 segment and add a direct label instead.',
    { unread: true }),
  msg('s09', 'studio', at(NOV, 16, 8, 3), 'kofi', 'v3',
    'Also, the v3 data file still says 81.4 for October. Do we have a corrected series yet?',
    { unread: true }),
  msg('s10', 'studio', at(NOV, 16, 8, 10), 'dara', 'v3',
    'The board packet closes Tue Nov 24. Client sign-off has to land by Mon Nov 23 to be safe.',
    { unread: true }),
  msg('s11', 'studio', at(NOV, 16, 8, 20), 'kofi', 'v3',
    'If we get a position today, v4 can reach Renée by Wednesday. Tuesday is tight with the relabel and the 2020 styling.',
    { unread: true }),
];

// The corrected October series, as attached to Sam's Nov 15 message.
export const REVISED_FILE = MESSAGES.find((m) => m.id === 'd07').files[0];

// The two decisions Ines has to make before replying to the client.
export const AXIS_OPTIONS = [
  {
    id: 'hold',
    title: 'Keep the 0% baseline, mute 2020',
    floor: 0,
    tag: 'Recommended',
    summary: 'Every month stays on the chart. The 2020 span moves to a lighter line, and the April low gets one direct label.',
    tradeoff: 'The recovery reads a little flatter than Renée asked for.',
    opening:
      'We can’t start the y-axis at 40%. The April 2020 low is 24.6% of the 2019 average, so it would fall off the chart and the graphic would stop showing the lowest month in the series. v4 keeps the 0% baseline so every month stays visible.',
  },
  {
    id: 'floor20',
    title: 'Start the axis at 20%',
    floor: 20,
    tag: null,
    summary: 'The April 2020 low still fits. v4 carries a visible break note on the axis.',
    tradeoff: 'Closer to the request. The recovery reads larger, so the break note has to be clear.',
    opening:
      'We can start the y-axis at 20% instead of 40%. At 40% the April 2020 low (24.6%) would fall off the chart. At 20% it stays visible, and v4 will show a break note on the axis so the higher starting point is clear.',
  },
  {
    id: 'floor40',
    title: 'Start the axis at 40%, as requested',
    floor: 40,
    tag: 'Not recommended',
    summary: 'The April 2020 low (24.6%) falls below the floor and has to be clipped.',
    tradeoff: 'The lowest month disappears from the chart, so the full series is no longer shown.',
    opening:
      'We can start the y-axis at 40%, but the April 2020 low (24.6%) would fall below the floor and have to be clipped. We don’t recommend it, because the lowest month would disappear from the chart. If you still want 40%, we would label the clipped point, which puts the dip back in the middle of the graphic.',
  },
];

export const V4_DATES = [
  { id: 'tue', label: 'Tue Nov 17', sentence: 'Tuesday, Nov 17, at 5 pm', note: 'Tight with the relabel and the 2020 styling' },
  { id: 'wed', label: 'Wed Nov 18', sentence: 'Wednesday, Nov 18, at 5 pm', note: 'Kofi’s estimate', suggested: true },
  { id: 'thu', label: 'Thu Nov 19', sentence: 'Thursday, Nov 19, at 5 pm', note: 'Leaves a two-day sign-off window' },
];

export const V4_CHECKS = [
  { id: 'oct', text: 'October 2026 set to 79.8%', source: 'Sam · Data & methodology · Sun 4:40 PM' },
  { id: 'label', text: 'Axis label adds “weekday-adjusted”', source: 'Sam · pinned on v3 · Thu 9:20 AM' },
  { id: 'dip', text: 'April 2020 low treated per the axis decision', source: 'Renée · pinned on v3 · Thu 9:12 AM, and Mon 6:12 AM' },
  { id: 'appendix', text: 'Appendix table matches the corrected series', source: 'Dara · Data & methodology · Mon 7:31 AM' },
];

export const PROJECT = {
  id: 'riding-back',
  title: 'Riding Back: 2019–2026 Ridership Report',
  client: 'Tri-County Transit Authority',
  dueLabel: 'Sat Dec 5',
  daysLeft: 19,
  graphicCount: 6,
};

export const GRAPHICS = [
  { id: 'g1', n: 1, title: 'Fare revenue vs. ridership, 2019–2026', status: 'Approved', tone: 'ok',
    detail: 'Approved by Renée Almeida on Fri Nov 6. Final files delivered.' },
  { id: 'g2', n: 2, title: 'Service hours by corridor', status: 'Awaiting client approval', tone: 'wait',
    detail: 'Sent to Renée Almeida for approval. No changes requested yet.', requested: 'Tue Nov 10', waitingDays: 6 },
  { id: 'g3', n: 3, title: 'Ridership recovery, system-wide', status: 'Changes requested', tone: 'alert',
    detail: 'v3 is under review. The client asked for a different axis floor and a softer 2020 dip.' },
  { id: 'g4', n: 4, title: 'Route-level recovery, small multiples', status: 'In production', tone: 'neutral',
    detail: 'v2 in progress with Kofi Mensah. Due to the client Fri Nov 20.' },
  { id: 'g5', n: 5, title: 'Weekday boarding heatmap, 2019–2026', status: 'Awaiting client approval', tone: 'wait',
    detail: 'Sent to Renée Almeida for approval.', requested: 'Fri Nov 13', waitingDays: 3 },
  { id: 'g6', n: 6, title: 'Methodology appendix tables', status: 'Not started', tone: 'muted',
    detail: 'Waiting on the final series. Dara Lin owns the appendix.' },
];

// Other studio projects in flight. Their unread client messages are listed here.
export const OTHER_PROJECTS = [
  {
    id: 'flood',
    title: 'Flood Exposure Atlas 2026',
    client: 'Harlow County Emergency Management',
    due: 'Fri Nov 20',
    stage: 'Parcel-level map, zone review',
    unread: [
      { id: 'f1', from: 'marisol', at: new Date(2026, NOV, 12, 16, 2), text: 'Can the parcel-level map go to the county commission before the 20th? They want a preview, not the final.' },
      { id: 'f2', from: 'marisol', at: new Date(2026, NOV, 13, 9, 15), text: 'Sending the revised parcel count from the assessor’s office. Zone C drops by 212 parcels.' },
      { id: 'f3', from: 'tomas', at: new Date(2026, NOV, 13, 15, 40), text: 'Please use the assessor’s parcel IDs in the layer names, not our internal codes.' },
      { id: 'f4', from: 'marisol', at: new Date(2026, NOV, 14, 11, 2), text: 'Did the revised file reach you? I can’t see it on our side of the share.' },
    ],
  },
  {
    id: 'grain',
    title: 'Grain Throughput, Q3 Review',
    client: 'Midlands Grain Cooperative',
    due: 'Fri Nov 27',
    stage: 'Station-level throughput charts',
    unread: [
      { id: 'g-1', from: 'pat', at: new Date(2026, NOV, 12, 8, 47), text: 'Q3 throughput from the elevator meters is in the shared folder. Two sites were offline for part of August.' },
      { id: 'g-2', from: 'pat', at: new Date(2026, NOV, 14, 18, 30), text: 'Are the station labels final? The board wants the Eastside numbers at the top.' },
      { id: 'g-3', from: 'dwayne', at: new Date(2026, NOV, 15, 19, 12), text: 'Please hold the August annotation until we confirm the outage dates with operations.' },
    ],
  },
  {
    id: 'enroll',
    title: 'Enrollment Atlas, Grades K–8',
    client: 'Westbrook Unified School District',
    due: 'Fri Dec 11',
    stage: 'Tract-level choropleth',
    unread: [
      { id: 'e-1', from: 'priya', at: new Date(2026, NOV, 13, 14, 20), text: 'Tract boundaries are updated for the 2027 redistricting. Can you re-run the map on the new file?' },
      { id: 'e-2', from: 'priya', at: new Date(2026, NOV, 15, 10, 5), text: 'The parent newsletter needs the legend in Spanish by Wednesday, if that’s possible.' },
    ],
  },
  {
    id: 'clinic',
    title: 'Wait-Time Dashboard Export',
    client: 'Northgate Community Health',
    due: 'Mon Nov 30',
    stage: 'Four clinic panels',
    unread: [
      { id: 'w-1', from: 'hannah', at: new Date(2026, NOV, 13, 12, 15), text: 'October clinic-level wait times are in. Can you update the four panels?' },
      { id: 'w-2', from: 'hannah', at: new Date(2026, NOV, 15, 17, 30), text: 'Did you get my note about the Northgate West closure on Nov 30? We need it annotated.' },
    ],
  },
];
