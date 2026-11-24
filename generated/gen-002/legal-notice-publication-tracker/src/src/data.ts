import type { AlertConfig, Meeting, Notice, NoticeType, PaperMessage, StaffId } from './types';

export const TYPE_LABEL: Record<NoticeType, string> = {
  public_hearing: 'Public hearing',
  ordinance_summary: 'Ordinance summary',
  bid_solicitation: 'Bid solicitation',
  budget_hearing: 'Budget hearing',
  election_notice: 'Election notice',
};

export const TYPE_ORDER: NoticeType[] = [
  'public_hearing',
  'ordinance_summary',
  'bid_solicitation',
  'budget_hearing',
  'election_notice',
];

export const STAFF: Record<StaffId, { name: string; first: string; initials: string; title: string; covers: string }> = {
  gloria: {
    name: 'Gloria Haddad',
    first: 'Gloria',
    initials: 'GH',
    title: 'Deputy City Clerk',
    covers: 'Public hearings',
  },
  raj: {
    name: 'Raj Mehta',
    first: 'Raj',
    initials: 'RM',
    title: 'Records & Bid Clerk',
    covers: 'Bid solicitations',
  },
  lena: {
    name: 'Lena Sorensen',
    first: 'Lena',
    initials: 'LS',
    title: 'Assistant City Clerk',
    covers: 'Ordinance summaries',
  },
  tim: {
    name: 'Tim Callahan',
    first: 'Tim',
    initials: 'TC',
    title: 'Elections & Records Coordinator',
    covers: 'Budget hearings, election notices',
  },
};

export const PAPER = {
  name: 'Bellmont Courier-Ledger',
  desk: 'Courier-Ledger Legal Desk',
  system: 'AdDesk',
  phone: '(555) 014-2260',
  account: 'Acct. 30-11872 · City of Bellmont',
};

export const MEETINGS: Meeting[] = [
  { id: 'cc-1118', body: 'City Council', short: 'Council', date: '2025-11-18', time: '7:00 PM', place: 'Council Chambers, City Hall', kind: 'meeting' },
  { id: 'bza-1119', body: 'Board of Zoning Appeals', short: 'BZA', date: '2025-11-19', time: '6:30 PM', place: 'Room 210, City Hall', kind: 'meeting' },
  { id: 'bid-1120', body: 'Bid opening — ITB 2026-027', short: 'Bid opening', date: '2025-11-20', time: '2:00 PM', place: 'Purchasing, Room 104', kind: 'bid_opening' },
  { id: 'pc-1125', body: 'Planning Commission', short: 'Planning', date: '2025-11-25', time: '6:30 PM', place: 'Council Chambers, City Hall', kind: 'meeting' },
  { id: 'bid-1125', body: 'Bid opening — ITB 2026-031', short: 'Bid opening', date: '2025-11-25', time: '2:00 PM', place: 'Purchasing, Room 104', kind: 'bid_opening' },
  { id: 'cc-1202', body: 'City Council', short: 'Council', date: '2025-12-02', time: '7:00 PM', place: 'Council Chambers, City Hall', kind: 'meeting' },
  { id: 'bid-1204a', body: 'Bid opening — ITB 2026-034', short: 'Bid opening', date: '2025-12-04', time: '2:00 PM', place: 'Purchasing, Room 104', kind: 'bid_opening' },
  { id: 'bid-1204b', body: 'Proposal deadline — RFP 2026-033', short: 'RFP due', date: '2025-12-04', time: '3:00 PM', place: 'Purchasing, Room 104', kind: 'bid_opening' },
  { id: 'pc-1209', body: 'Planning Commission', short: 'Planning', date: '2025-12-09', time: '6:30 PM', place: 'Council Chambers, City Hall', kind: 'meeting' },
  { id: 'bid-1211a', body: 'Bid opening — ITB 2026-029', short: 'Bid opening', date: '2025-12-11', time: '2:00 PM', place: 'Purchasing, Room 104', kind: 'bid_opening' },
  { id: 'bid-1211b', body: 'Proposal deadline — RFP 2026-035', short: 'RFP due', date: '2025-12-11', time: '3:00 PM', place: 'Purchasing, Room 104', kind: 'bid_opening' },
  { id: 'cc-1216', body: 'City Council', short: 'Council', date: '2025-12-16', time: '7:00 PM', place: 'Council Chambers, City Hall', kind: 'meeting' },
  { id: 'bza-1217', body: 'Board of Zoning Appeals', short: 'BZA', date: '2025-12-17', time: '6:30 PM', place: 'Room 210, City Hall', kind: 'meeting' },
  { id: 'cc-0106', body: 'City Council', short: 'Council', date: '2026-01-06', time: '7:00 PM', place: 'Council Chambers, City Hall', kind: 'meeting' },
  { id: 'bid-0108', body: 'Bid opening — ITB 2026-036', short: 'Bid opening', date: '2026-01-08', time: '2:00 PM', place: 'Purchasing, Room 104', kind: 'bid_opening' },
  { id: 'pc-0113', body: 'Planning Commission', short: 'Planning', date: '2026-01-13', time: '6:30 PM', place: 'Council Chambers, City Hall', kind: 'meeting' },
  { id: 'el-0113', body: 'Special Municipal Election — Ward 3', short: 'Election', date: '2026-01-13', time: 'Polls 7 AM–8 PM', place: 'Ward 3 polling places', kind: 'election' },
  { id: 'bza-0114', body: 'Board of Zoning Appeals', short: 'BZA', date: '2026-01-14', time: '6:30 PM', place: 'Room 210, City Hall', kind: 'meeting' },
];

type Seed = Omit<Notice, 'activity'> & { activity?: Notice['activity'] };

const seeds: Seed[] = [
  // ---------------- At risk ----------------
  {
    id: 'n-z1414', adNo: 'CL-L48233', type: 'public_hearing',
    title: 'Rezoning Case Z-2026-14, 900 block Orchard Rd',
    summary: 'Rezone 2.8 acres from R-1 Single-Family to R-3 Multi-Family; applicant Orchard Commons LLC. Mailed notice to 64 property owners within 300 ft went out Nov 10.',
    meetingId: 'pc-1209', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-14T16:10', cost: 217.3, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-27', state: 'edition_cancelled', note: 'Requested Tue Nov 18; AdDesk rolled it to Thu Nov 27 after the revised cutoff. Nov 27 edition later cancelled.' }],
    activity: [{ at: '2025-11-14T16:10', who: 'gloria', text: 'Submitted to AdDesk, requested Tue Nov 18 edition.' }],
  },
  {
    id: 'n-bud2', adNo: 'CL-L48190', type: 'budget_hearing',
    title: 'FY2026 Budget Amendment No. 2 — Public Hearing',
    summary: 'Amends the FY2026 General Fund by $1.42M for public safety overtime and the Orchard Rd drainage project. Two insertions required, both at least 10 days before the hearing.',
    meetingId: 'cc-1202', statutoryDays: 10, requiredRuns: 2,
    submitted: '2025-11-07T10:45', cost: 321.2, owner: 'tim', tearSheet: true, affidavit: 'not_due',
    insertions: [
      { date: '2025-11-12', state: 'published' },
      { date: '2025-11-22', state: 'unconfirmed', note: 'Sat legal page at capacity — AdDesk says "placed if space allows".' },
    ],
    pendingReason: 'Sat Nov 22 legal page at capacity; placement not guaranteed.',
    activity: [{ at: '2025-11-07T10:45', who: 'tim', text: 'Submitted both insertions (Wed Nov 12, Sat Nov 22).' }],
  },
  // ---------------- Missed ----------------
  {
    id: 'n-sw2', adNo: 'CL-L48207', type: 'bid_solicitation',
    title: 'Sidewalk Repair Program, Phase 2 (ITB 2026-031)',
    summary: 'Invitation to bid: removal and replacement of approx. 14,200 sq ft of sidewalk in Wards 2 and 4. Engineer’s estimate $386,000. Three plan holders registered.',
    meetingId: 'bid-1125', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-13T14:30', cost: 153.3, owner: 'raj', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-15', state: 'not_published', note: 'Held by AdDesk — received Thu 2:30 PM, after revised cutoff (Thu 12:00 PM).' }],
    activity: [{ at: '2025-11-13T14:30', who: 'raj', text: 'Submitted to AdDesk for Sat Nov 15 edition.' }],
  },
  // ---------------- Scheduled, no confirmation ----------------
  {
    id: 'n-o41', adNo: 'CL-L48228', type: 'ordinance_summary',
    title: 'Ordinance 2025-41 — Short-Term Rental Licensing',
    summary: 'Summary of ordinance establishing annual licensing, occupancy limits and a 24-hour local contact requirement for short-term rentals. Adoption at second reading.',
    meetingId: 'cc-1216', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-14T10:20', cost: 195.5, owner: 'lena', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-26', state: 'unconfirmed', note: 'Holiday edition legal page layout pending.' }],
    pendingReason: 'Wed Nov 26 holiday edition layout not final.',
  },
  {
    id: 'n-fuel', adNo: 'CL-L48215', type: 'bid_solicitation',
    title: 'Fleet Fuel Supply Contract, 2026–2028 (ITB 2026-034)',
    summary: 'Invitation to bid for unleaded and diesel fuel delivered to the Public Works yard and two fire stations, three-year term.',
    meetingId: 'bid-1204a', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-13T09:05', cost: 161.1, owner: 'raj', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-19', state: 'unconfirmed', note: 'Re-flowed proof under new layout awaiting city approval.' }],
    pendingReason: 'Revised proof awaiting city approval (cutoff Mon 12:00 PM for Wed Nov 19).',
  },
  {
    id: 'n-bza088', adNo: 'CL-L48172', type: 'public_hearing',
    title: 'Variance Request BZA-25-088, 1412 Kessler St (rear setback)',
    summary: 'Request to reduce the rear yard setback from 25 ft to 14 ft for a garage addition.',
    meetingId: 'bza-1217', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-06T13:40', cost: 147.8, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-29', state: 'unconfirmed', note: 'No placement response since submission.' }],
    pendingReason: 'No response from AdDesk since Nov 6 submission.',
  },
  {
    id: 'n-el3', adNo: 'CL-L48166', type: 'election_notice',
    title: 'Notice of Special Municipal Election — Ward 3 Council Seat',
    summary: 'Notice of the Jan 13, 2026 special election to fill the unexpired Ward 3 term; lists polling places and hours. Two insertions required.',
    meetingId: 'el-0113', statutoryDays: 30, requiredRuns: 2,
    submitted: '2025-11-05T15:15', cost: 353.7, owner: 'tim', tearSheet: false, affidavit: 'not_due',
    insertions: [
      { date: '2025-12-03', state: 'unconfirmed' },
      { date: '2025-12-10', state: 'unconfirmed' },
    ],
    pendingReason: 'Polling-place table awaiting paper’s layout check.',
  },
  // ---------------- Run, awaiting affidavit ----------------
  {
    id: 'n-fees', adNo: 'CL-L48011', type: 'public_hearing',
    title: 'Annual Fee Schedule Update — Public Hearing',
    summary: 'Hearing on the 2026 master fee schedule, including building permit, right-of-way and facility rental fees.',
    meetingId: 'cc-1118', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-10-22T11:00', cost: 224.1, owner: 'gloria', tearSheet: true, affidavit: 'awaiting', affidavitRequested: '2025-11-10',
    insertions: [{ date: '2025-10-29', state: 'published' }],
  },
  {
    id: 'n-o38', adNo: 'CL-L48034', type: 'ordinance_summary',
    title: 'Ordinance 2025-38 — Residential Parking Permit District, Ward 1',
    summary: 'Summary of ordinance creating permit-only parking on 11 blocks near Bellmont Community College.',
    meetingId: 'cc-1118', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-10-27T09:30', cost: 174.1, owner: 'lena', tearSheet: true, affidavit: 'awaiting',
    insertions: [{ date: '2025-11-01', state: 'published' }],
  },
  {
    id: 'n-cu19', adNo: 'CL-L48052', type: 'public_hearing',
    title: 'Conditional Use Permit CU-25-019, 2205 Halsey Blvd (child care center)',
    summary: 'Conditional use for a 96-child day care center in the C-2 district.',
    meetingId: 'bza-1119', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-10-29T14:20', cost: 156.4, owner: 'gloria', tearSheet: true, affidavit: 'awaiting',
    insertions: [{ date: '2025-11-04', state: 'published' }],
  },
  {
    id: 'n-wm', adNo: 'CL-L48058', type: 'bid_solicitation',
    title: 'Water Main Replacement, Linden Ave (ITB 2026-029)',
    summary: 'Replace 2,350 LF of 6-inch cast iron main with 8-inch ductile iron, Linden Ave from 3rd St to Fairview Rd.',
    meetingId: 'bid-1211a', statutoryDays: 10, requiredRuns: 2,
    submitted: '2025-10-31T10:10', cost: 304.7, owner: 'raj', tearSheet: true, affidavit: 'awaiting',
    insertions: [
      { date: '2025-11-06', state: 'published' },
      { date: '2025-11-13', state: 'published' },
    ],
  },
  {
    id: 'n-o39', adNo: 'CL-L48077', type: 'ordinance_summary',
    title: 'Ordinance 2025-39 — Amending Chapter 9.12, Noise Control',
    summary: 'Summary of amendments to construction noise hours and the amplified sound permit.',
    meetingId: 'cc-1202', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-03T16:00', cost: 188.8, owner: 'lena', tearSheet: false, affidavit: 'awaiting',
    insertions: [{ date: '2025-11-08', state: 'published' }],
  },
  {
    id: 'n-pud3', adNo: 'CL-L48049', type: 'public_hearing',
    title: 'Planned Unit Development PUD-25-03, Riverside Commons Phase II',
    summary: 'Preliminary PUD plan for 142 townhomes and 18,000 sq ft of commercial space on 21 acres east of River Rd.',
    meetingId: 'pc-1125', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-10-30T08:50', cost: 241.2, owner: 'gloria', tearSheet: false, affidavit: 'awaiting',
    insertions: [{ date: '2025-11-05', state: 'published' }],
  },
  {
    id: 'n-o40', adNo: 'CL-L48098', type: 'ordinance_summary',
    title: 'Ordinance 2025-40 — Stormwater Utility Rate Adjustment',
    summary: 'Summary of ordinance raising the stormwater ERU rate from $6.10 to $6.85 per month effective Mar 1, 2026.',
    meetingId: 'cc-1202', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-07T13:25', cost: 180.6, owner: 'lena', tearSheet: true, affidavit: 'awaiting',
    insertions: [{ date: '2025-11-12', state: 'published' }],
  },
  // ---------------- On track ----------------
  {
    id: 'n-cpa2', adNo: 'CL-L47942', type: 'public_hearing',
    title: 'Comprehensive Plan Amendment CPA-25-02, East Corridor Land Use Map',
    summary: 'Amends the future land use map for 310 acres along the Route 9 east corridor.',
    meetingId: 'pc-1209', statutoryDays: 30, requiredRuns: 1,
    submitted: '2025-10-15T10:00', cost: 256.5, owner: 'gloria', tearSheet: true, affidavit: 'received', affidavitReceived: '2025-11-03',
    insertions: [{ date: '2025-10-22', state: 'published' }],
  },
  {
    id: 'n-ax1', adNo: 'CL-L47990', type: 'public_hearing',
    title: 'Annexation Petition AX-25-01, 46 acres north of Route 9',
    summary: 'Voluntary annexation petition from Hollis Farm Partners; includes proposed initial zoning of A-1.',
    meetingId: 'cc-1216', statutoryDays: 30, requiredRuns: 2,
    submitted: '2025-10-24T09:15', cost: 375.9, owner: 'gloria', tearSheet: true, affidavit: 'received', affidavitReceived: '2025-11-14',
    insertions: [
      { date: '2025-11-01', state: 'published' },
      { date: '2025-11-08', state: 'published' },
    ],
  },
  {
    id: 'n-o37', adNo: 'CL-L47958', type: 'ordinance_summary',
    title: 'Ordinance 2025-37 — Sign Code Amendments (temporary signs)',
    summary: 'Summary of content-neutral standards for temporary signs in residential districts.',
    meetingId: 'cc-1118', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-10-20T11:30', cost: 169.8, owner: 'lena', tearSheet: true, affidavit: 'received', affidavitReceived: '2025-11-06',
    insertions: [{ date: '2025-10-25', state: 'published' }],
  },
  {
    id: 'n-snow', adNo: 'CL-L47973', type: 'bid_solicitation',
    title: 'Snow & Ice Removal Services, Municipal Lots (ITB 2026-027)',
    summary: 'Seasonal plowing and de-icing for 14 municipal parking lots, Dec 1 – Mar 31.',
    meetingId: 'bid-1120', statutoryDays: 10, requiredRuns: 2,
    submitted: '2025-10-23T15:40', cost: 271.7, owner: 'raj', tearSheet: true, affidavit: 'received', affidavitReceived: '2025-11-13',
    insertions: [
      { date: '2025-10-30', state: 'published' },
      { date: '2025-11-06', state: 'published' },
    ],
  },
  {
    id: 'n-bud26', adNo: 'CL-L48061', type: 'budget_hearing',
    title: 'Proposed 2026 Operating Budget & Tax Levy — Public Hearing',
    summary: 'Hearing on the proposed $118.6M 2026 operating budget and a property tax levy of 7.42 mills.',
    meetingId: 'cc-1202', statutoryDays: 10, requiredRuns: 2,
    submitted: '2025-10-31T14:00', cost: 388.1, owner: 'tim', tearSheet: true, affidavit: 'not_due',
    insertions: [
      { date: '2025-11-08', state: 'published' },
      { date: '2025-11-20', state: 'confirmed' },
    ],
  },
  {
    id: 'n-alley', adNo: 'CL-L48110', type: 'public_hearing',
    title: 'Vacation of Alley Right-of-Way, Block 14, Original Town',
    summary: 'Vacate the 16-ft alley between 4th and 5th Streets north of Main St; utility easement retained.',
    meetingId: 'cc-1216', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-10T10:30', cost: 144.4, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-25', state: 'confirmed' }],
  },
  {
    id: 'n-z1412', adNo: 'CL-L48102', type: 'public_hearing',
    title: 'Rezoning Case Z-2026-12, 3100 Sandhill Pkwy',
    summary: 'Rezone 6.1 acres from I-1 Light Industrial to C-3 General Commercial.',
    meetingId: 'pc-1209', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-10T09:20', cost: 206.1, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-19', state: 'confirmed' }],
  },
  {
    id: 'n-z1415', adNo: 'CL-L48141', type: 'public_hearing',
    title: 'Rezoning Case Z-2026-15, 47 Mercer Ave',
    summary: 'Rezone a 0.4-acre lot from R-2 Two-Family to NC Neighborhood Commercial.',
    meetingId: 'pc-0113', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-12T11:10', cost: 200.1, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-12-13', state: 'confirmed' }],
  },
  {
    id: 'n-pp7', adNo: 'CL-L48105', type: 'public_hearing',
    title: 'Preliminary Plat PP-25-07, Wren Hollow Subdivision',
    summary: '38 single-family lots on 15.2 acres, south side of Wren Hollow Rd.',
    meetingId: 'pc-1209', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-10T14:05', cost: 221.3, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-20', state: 'confirmed' }],
  },
  {
    id: 'n-o42', adNo: 'CL-L48125', type: 'ordinance_summary',
    title: 'Ordinance 2025-42 — Sidewalk Café Permits',
    summary: 'Summary of ordinance allowing year-round sidewalk cafés downtown with a 5-ft clear path.',
    meetingId: 'cc-1216', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-11T10:00', cost: 157.4, owner: 'lena', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-29', state: 'confirmed' }],
  },
  {
    id: 'n-o43', adNo: 'CL-L48147', type: 'ordinance_summary',
    title: 'Ordinance 2025-43 — Adopting the 2024 International Fire Code',
    summary: 'Summary of ordinance adopting the 2024 IFC with local amendments to Sections 503 and 903.',
    meetingId: 'cc-0106', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-12T15:30', cost: 150.4, owner: 'lena', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-12-10', state: 'confirmed' }],
  },
  {
    id: 'n-o44', adNo: 'CL-L48150', type: 'ordinance_summary',
    title: 'Ordinance 2025-44 — Utility Billing Late Fee Revisions',
    summary: 'Summary of ordinance replacing the 10% late penalty with a flat $8 fee and adding a hardship waiver.',
    meetingId: 'cc-0106', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-12T15:45', cost: 145.4, owner: 'lena', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-12-17', state: 'confirmed' }],
  },
  {
    id: 'n-hvac', adNo: 'CL-L48138', type: 'bid_solicitation',
    title: 'Library HVAC Replacement (ITB 2026-036)',
    summary: 'Replace two rooftop units and controls at the Main Library; mandatory pre-bid walkthrough Dec 16.',
    meetingId: 'bid-0108', statutoryDays: 10, requiredRuns: 2,
    submitted: '2025-11-12T09:40', cost: 290.4, owner: 'raj', tearSheet: false, affidavit: 'not_due',
    insertions: [
      { date: '2025-12-06', state: 'confirmed' },
      { date: '2025-12-13', state: 'confirmed' },
    ],
  },
  {
    id: 'n-pdup', adNo: 'CL-L48119', type: 'bid_solicitation',
    title: 'Police Department Vehicle Upfitting (RFP 2026-035)',
    summary: 'Request for proposals to upfit 9 patrol vehicles with lighting, partitions and consoles.',
    meetingId: 'bid-1211b', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-11T13:15', cost: 165.1, owner: 'raj', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-20', state: 'confirmed' }],
  },
  {
    id: 'n-jan', adNo: 'CL-L48094', type: 'bid_solicitation',
    title: 'Janitorial Services, City Hall Annex (RFP 2026-033)',
    summary: 'Request for proposals for nightly janitorial services at the City Hall Annex, two-year term.',
    meetingId: 'bid-1204b', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-11-07T11:50', cost: 149.1, owner: 'raj', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-18', state: 'confirmed' }],
  },
  {
    id: 'n-vreg', adNo: 'CL-L48152', type: 'election_notice',
    title: 'Notice of Voter Registration Deadline — Ward 3 Special Election',
    summary: 'Registration for the Jan 13 special election closes Dec 15 at 5:00 PM.',
    meetingId: 'el-0113', statutoryDays: 30, requiredRuns: 1,
    submitted: '2025-11-12T16:20', cost: 140.8, owner: 'tim', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-12-06', state: 'confirmed' }],
  },
  {
    id: 'n-cip', adNo: 'CL-L48113', type: 'budget_hearing',
    title: 'Capital Improvement Plan 2026–2030 — Public Hearing',
    summary: 'Hearing on the five-year CIP totaling $74.3M, including the Linden Ave water main and Fire Station 3.',
    meetingId: 'cc-1216', statutoryDays: 10, requiredRuns: 2,
    submitted: '2025-11-10T15:00', cost: 334.5, owner: 'tim', tearSheet: false, affidavit: 'not_due',
    insertions: [
      { date: '2025-11-22', state: 'confirmed' },
      { date: '2025-12-03', state: 'confirmed' },
    ],
  },
  {
    id: 'n-hist', adNo: 'CL-L48087', type: 'public_hearing',
    title: 'Historic District Designation — Elm Park Neighborhood',
    summary: 'Local historic district designation for 212 properties bounded by Elm, Fairview, 9th and 14th Streets.',
    meetingId: 'cc-0106', statutoryDays: 30, requiredRuns: 1,
    submitted: '2025-11-06T10:25', cost: 269.8, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-19', state: 'confirmed' }],
  },
  {
    id: 'n-bza091', adNo: 'CL-L48116', type: 'public_hearing',
    title: 'Variance Request BZA-25-091, 618 Prospect Ave (fence height)',
    summary: 'Request to allow a 6-ft privacy fence in the front yard along a secondary frontage.',
    meetingId: 'bza-1217', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-10T16:35', cost: 136.4, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-25', state: 'confirmed' }],
  },
  {
    id: 'n-bza094', adNo: 'CL-L48144', type: 'public_hearing',
    title: 'Special Exception BZA-25-094, 1500 Dunmore Rd (accessory dwelling)',
    summary: 'Special exception for a detached 720 sq ft accessory dwelling unit.',
    meetingId: 'bza-0114', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-12T13:50', cost: 142.2, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-12-20', state: 'confirmed' }],
  },
  {
    id: 'n-ta6', adNo: 'CL-L48145', type: 'public_hearing',
    title: 'Text Amendment TA-25-06, Accessory Dwelling Unit Standards',
    summary: 'Amends Zoning Code §17.40 to permit ADUs by right in R-1 and R-2 districts.',
    meetingId: 'pc-0113', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-12T14:00', cost: 190.2, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-12-10', state: 'confirmed' }],
  },
  {
    id: 'n-cdbg', adNo: 'CL-L48121', type: 'public_hearing',
    title: 'CDBG 2026 Annual Action Plan — Public Hearing',
    summary: 'Hearing on the proposed use of $612,400 in Community Development Block Grant funds; 30-day comment period opens Nov 22.',
    meetingId: 'cc-1216', statutoryDays: 15, requiredRuns: 1,
    submitted: '2025-11-11T09:10', cost: 211.7, owner: 'gloria', tearSheet: false, affidavit: 'not_due',
    insertions: [{ date: '2025-11-22', state: 'confirmed' }],
  },
  {
    id: 'n-o36', adNo: 'CL-L47921', type: 'ordinance_summary',
    title: 'Ordinance 2025-36 — Tree Preservation Amendments',
    summary: 'Summary of amendments requiring replacement plantings for removal of trees over 12 inches DBH.',
    meetingId: 'cc-1118', statutoryDays: 10, requiredRuns: 1,
    submitted: '2025-10-13T10:40', cost: 172.6, owner: 'lena', tearSheet: true, affidavit: 'received', affidavitReceived: '2025-10-30',
    insertions: [{ date: '2025-10-18', state: 'published' }],
  },
  {
    id: 'n-cand', adNo: 'CL-L48040', type: 'election_notice',
    title: 'Notice of Candidate Filing Period — Ward 3 Special Election',
    summary: 'Nominating petitions accepted Nov 10 – Dec 1 at the City Clerk’s office.',
    meetingId: 'el-0113', statutoryDays: 30, requiredRuns: 1,
    submitted: '2025-10-29T09:00', cost: 161.5, owner: 'tim', tearSheet: true, affidavit: 'received', affidavitReceived: '2025-11-15',
    insertions: [{ date: '2025-11-08', state: 'published' }],
  },
];

export const INITIAL_NOTICES: Notice[] = seeds.map((s) => ({ ...s, activity: s.activity ?? [{ at: s.submitted, who: s.owner, text: 'Submitted to AdDesk.' }] }));

// ---------------------------------------------------------------------------
// Paper messages since Friday (AdDesk automated feed)
// ---------------------------------------------------------------------------

const byId = (id: string) => INITIAL_NOTICES.find((n) => n.id === id)!;
const short = (id: string) => byId(id).title.split(' — ')[0].split(',')[0];

function stamp(day: number, h: number, m: number) {
  return `2025-11-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const raw: Omit<PaperMessage, 'id'>[] = [];
const push = (m: Omit<PaperMessage, 'id'>) => raw.push(m);

// --- The six that actually threaten a hearing date -------------------------
push({
  at: stamp(14, 8, 30), category: 'Deadline policy', signal: 'policy',
  subject: 'Revised legal advertising deadlines — effective with the Sat Nov 15 edition',
  body: 'Following consolidation of the Courier-Ledger legal desk, the deadline for legal and public notices is now 12:00 PM two business days before publication (previously 5:00 PM one business day before). Ads received after the deadline roll to the next available legal slot.',
  analysis: 'Changes the latest submission time for every open notice. Proofrun has recalculated cutoffs for all 38 notices.',
});
push({
  at: stamp(14, 9, 15), category: 'Ad held', signal: 'not_run', noticeId: 'n-sw2',
  subject: 'Held: CL-L48207 will not publish Sat Nov 15 — received after deadline',
  body: 'CL-L48207 (ITB 2026-031 Sidewalk Repair) was received Thu Nov 13, 2:30 PM, after the revised deadline for the Sat Nov 15 edition (Thu Nov 13, 12:00 PM). The ad is on hold. Select a new publication date in AdDesk.',
  analysis: 'Sat Nov 15 was the last day to publish for a Tue Nov 25 bid opening (10-day rule). No remaining edition can satisfy the rule — the bid opening must move.',
});
push({
  at: stamp(14, 13, 30), category: 'Holiday schedule', signal: 'policy',
  subject: 'Thanksgiving week: no print edition Thursday, Nov 27',
  body: 'The Courier-Ledger will not publish a print edition on Thursday, Nov 27. Wednesday, Nov 26 will carry the legal notices page. The legal desk is closed Nov 27–28. Advertisers with ads booked for Nov 27 will be contacted to select a new date.',
  analysis: 'Any notice booked for Nov 27 has no edition. One of your notices (Z-2026-14) is affected.',
});
push({
  at: stamp(14, 15, 30), category: 'Placement pending', signal: 'pending_near_deadline', noticeId: 'n-bud2',
  subject: 'Placement pending: Sat Nov 22 legal page at capacity (CL-L48190, insertion 2 of 2)',
  body: 'The Saturday, Nov 22 legal notices page is at capacity. CL-L48190 insertion 2 of 2 will be placed if space allows; otherwise it moves to the next available edition.',
  analysis: 'Nov 22 is the last legal day for the Dec 2 budget amendment hearing (10 days, 2 insertions). The next edition after it is Tue Nov 25 — too late.',
});
push({
  at: stamp(14, 16, 12), category: 'Schedule change', signal: 'past_deadline', noticeId: 'n-z1414',
  subject: 'Rescheduled: CL-L48233 moved to Thu Nov 27 (received after deadline)',
  body: 'CL-L48233 requested the Tue Nov 18 edition and was received Fri Nov 14, 4:10 PM, after that edition’s deadline (Fri Nov 14, 12:00 PM). AdDesk has moved it to the next available legal slot on your account: Thu Nov 27.',
  analysis: 'Nov 27 is 3 days after Mon Nov 24, the last legal run date for the Dec 9 Planning Commission hearing (15-day rule).',
});
push({
  at: stamp(15, 6, 2), category: 'Edition cancelled', signal: 'not_run', noticeId: 'n-z1414',
  subject: 'Edition calendar update: Thu Nov 27 cancelled — CL-L48233 placement unassigned',
  body: 'The Thu Nov 27 edition has been removed from the publication calendar. The following ad has no placement: CL-L48233. Please select a new date.',
  analysis: 'Z-2026-14 currently has no publication date. To hold the Dec 9 hearing it must run in Wed Nov 19, Thu Nov 20 or Sat Nov 22.',
});

// --- Routine traffic --------------------------------------------------------
const dayNames: Record<number, string> = { 14: 'Fri', 15: 'Sat', 16: 'Sun', 17: 'Mon' };

// Account / system
push({ at: stamp(14, 6, 0), category: 'Account', subject: 'AdDesk 4 migration complete — Courier-Ledger legal accounts', body: 'Your City of Bellmont account (30-11872) has been migrated to AdDesk 4. Open bookings have been carried over and will be re-validated against the revised deadline schedule.' });
push({ at: stamp(14, 15, 0), category: 'Account', subject: '2026 legal notice rate card published', body: 'The 2026 legal rate is $0.94 per agate line (was $0.91). Rates apply to insertions on or after Jan 1, 2026.' });
push({ at: stamp(15, 5, 0), category: 'Statement', subject: 'Weekly statement — account 30-11872', body: 'Statement for Nov 8–14: 7 insertions, $1,482.70. Balance due $1,482.70, net 30.' });
push({ at: stamp(15, 20, 0), category: 'Account', subject: 'Scheduled maintenance Sun Nov 16, 1:00–3:00 AM', body: 'AdDesk will be unavailable during scheduled maintenance.' });
push({ at: stamp(16, 3, 5), category: 'Account', subject: 'Maintenance complete', body: 'AdDesk is available. No action needed.' });
for (const day of [14, 15, 16, 17]) {
  push({ at: stamp(day, 6, 5), category: 'Daily report', subject: `Daily placement report — ${dayNames[day]} Nov ${day}`, body: 'Summary of open legal ads on account 30-11872 with booking status and next run date.' });
}

// Re-validation sweep after migration: one message per open confirmed booking
const revalidate: [string, number][] = [];
for (const n of INITIAL_NOTICES) {
  n.insertions.forEach((ins, i) => {
    if (ins.state === 'confirmed') revalidate.push([n.id, i]);
  });
}
revalidate.forEach(([id, i], k) => {
  const n = byId(id);
  const ins = n.insertions[i];
  const of = n.requiredRuns === 2 ? ` (insertion ${i + 1} of 2)` : '';
  push({
    at: stamp(14, 9, 40 + Math.floor(k / 2)), category: 'Booking re-validated', noticeId: id,
    subject: `Booking re-validated: ${n.adNo}${of} — ${ins.date.slice(5).replace('-', '/')} — no change`,
    body: `${n.adNo} (${short(id)}) was re-checked against the revised deadline schedule. Placement unchanged.`,
  });
});

for (const id of ['n-fuel', 'n-bza088', 'n-el3']) {
  const n = byId(id);
  n.insertions.forEach((ins, i) => {
    const of = n.requiredRuns === 2 ? ` (insertion ${i + 1} of 2)` : '';
    push({
      at: stamp(14, 9, 52), category: 'Booking re-validated', noticeId: id,
      subject: `Booking re-validated: ${n.adNo}${of} — ${ins.date.slice(5).replace('-', '/')} — awaiting placement`,
      body: `${n.adNo} (${short(id)}) was re-checked against the revised deadline schedule. Placement not yet confirmed.`,
    });
  });
}

// Statewide public notice website postings (mirrors print runs)
for (const id of ['n-wm', 'n-o40', 'n-bud2']) {
  push({ at: stamp(14, 7, 45), category: 'Web posting', noticeId: id, subject: `Posted to statewide public notice website: ${byId(id).adNo}`, body: 'Notice mirrored to the statewide public notice website as required for print legal notices.' });
}

// Run reminders: every morning, for confirmed/unconfirmed insertions in the next 1–7 days
const upcoming: { id: string; i: number; date: string }[] = [];
for (const n of INITIAL_NOTICES) {
  n.insertions.forEach((ins, i) => {
    if (ins.state === 'confirmed' || ins.state === 'unconfirmed') upcoming.push({ id: n.id, i, date: ins.date });
  });
}
for (const day of [14, 15, 16, 17]) {
  const from = `2025-11-${day + 1}`;
  const to = `2025-11-${day + 7}`;
  upcoming
    .filter((u) => u.date >= from && u.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((u, k) => {
      const n = byId(u.id);
      push({
        at: stamp(day, 6, 15 + k), category: 'Run reminder', noticeId: u.id,
        subject: `Run reminder: ${n.adNo} scheduled ${u.date.slice(5).replace('-', '/')}`,
        body: `${n.adNo} (${short(u.id)}) is scheduled to run ${u.date}. No action needed.`,
      });
    });
}

// Publications, tear sheets, invoices, payments
push({ at: stamp(14, 7, 30), category: 'Publication verified', noticeId: 'n-wm', subject: 'Published: CL-L48058 (insertion 2 of 2) — Thu Nov 13', body: 'Verified in the Thu Nov 13 print and e-edition, page B6.' });
for (const [id, day, h] of [['n-wm', 14, 11], ['n-o40', 14, 11], ['n-bud2', 15, 9]] as const) {
  push({ at: stamp(day, h, 20), category: 'Tear sheet', noticeId: id, subject: `Tear sheet mailed: ${byId(id).adNo}`, body: 'Tear sheet mailed to City Clerk, 400 Main St. PDF tear sheet attached in AdDesk.' });
}
for (const id of ['n-wm', 'n-o40', 'n-bud2']) {
  push({ at: stamp(14, 12, 5), category: 'Invoice', noticeId: id, subject: `Invoice issued: ${byId(id).adNo}`, body: 'Invoice posted to account 30-11872, net 30.' });
}
for (const id of ['n-o39', 'n-pud3']) {
  push({ at: stamp(17, 7, 0), category: 'Payment', noticeId: id, subject: `Payment posted: ${byId(id).adNo}`, body: 'ACH payment from City of Bellmont applied.' });
}

// Affidavits
push({ at: stamp(14, 11, 0), category: 'Affidavit', noticeId: 'n-ax1', subject: 'Affidavit of publication issued: CL-L47990', body: 'Notarized affidavit (2 insertions) available as PDF; original mailed to City Clerk.' });
push({ at: stamp(15, 10, 30), category: 'Affidavit', noticeId: 'n-cand', subject: 'Affidavit of publication issued: CL-L48040', body: 'Notarized affidavit available as PDF; original mailed to City Clerk.' });
for (const id of ['n-fees', 'n-o38', 'n-cu19', 'n-wm', 'n-o39', 'n-pud3', 'n-o40']) {
  push({ at: stamp(15, 6, 30), category: 'Affidavit', noticeId: id, subject: `Affidavit in notary queue: ${byId(id).adNo}`, body: 'Affidavit is in the notary queue. Estimated issue Nov 20–24 (legal desk consolidation backlog).' });
}

// Lifecycle: Ordinance 2025-41
push({ at: stamp(14, 10, 21), category: 'Ad received', noticeId: 'n-o41', subject: 'Ad received: CL-L48228', body: 'Requested edition: Wed Nov 26.' });
push({ at: stamp(14, 11, 5), category: 'Proof', noticeId: 'n-o41', subject: 'Proof ready: CL-L48228', body: 'Proof ready for review in AdDesk. 118 agate lines.' });
push({ at: stamp(14, 13, 12), category: 'Proof', noticeId: 'n-o41', subject: 'Proof approved by City of Bellmont: CL-L48228', body: 'Approved by L. Sorensen.' });
push({ at: stamp(14, 13, 14), category: 'Placement pending', noticeId: 'n-o41', subject: 'Awaiting placement: CL-L48228 — Wed Nov 26 holiday layout', body: 'Holiday edition layout will be finalized Fri Nov 21. Placement confirmation to follow.', analysis: 'Last legal run date is Sat Dec 6 — 10 days of slack. Not a threat.' });

// Lifecycle: Z-2026-14
push({ at: stamp(14, 16, 11), category: 'Ad received', noticeId: 'n-z1414', subject: 'Ad received: CL-L48233', body: 'Requested edition: Tue Nov 18.' });
push({ at: stamp(14, 16, 40), category: 'Proof', noticeId: 'n-z1414', subject: 'Proof ready: CL-L48233', body: 'Proof ready for review in AdDesk. 142 agate lines including map caption.' });
push({ at: stamp(14, 16, 52), category: 'Proof', noticeId: 'n-z1414', subject: 'Proof approved by City of Bellmont: CL-L48233', body: 'Approved by G. Haddad.' });

// Lifecycle: Fleet fuel proof approval loop
push({ at: stamp(14, 14, 20), category: 'Proof', signal: 'proof_pending', noticeId: 'n-fuel', subject: 'Revised proof ready: CL-L48215 (new legal page layout)', body: 'Your ad was re-flowed to the new 6-column legal page. Approve by the edition deadline to keep the Wed Nov 19 date.', analysis: 'If not approved by Mon 12:00 PM it rolls to Thu Nov 20; last legal run date is Mon Nov 24, so the bid opening is not threatened.' });
for (const [day, h] of [[15, 9], [16, 9], [17, 6]] as const) {
  push({ at: stamp(day, h, 0), category: 'Proof', signal: 'proof_pending', noticeId: 'n-fuel', subject: 'Reminder: proof awaiting approval — CL-L48215', body: 'Approve the proof in AdDesk to confirm placement.', analysis: 'Repeat reminder. Rolls to a later edition at worst; still inside the legal window.' });
}

// Lifecycle: Budget amendment insertion 2
push({ at: stamp(14, 10, 5), category: 'Ad received', noticeId: 'n-bud2', subject: 'Insertion 2 of 2 queued: CL-L48190 — Sat Nov 22', body: 'Second insertion queued for Sat Nov 22 under the revised deadline (Thu Nov 20, 12:00 PM).' });
push({ at: stamp(14, 10, 40), category: 'Proof', noticeId: 'n-bud2', subject: 'Proof unchanged: CL-L48190 insertion 2', body: 'Insertion 2 uses the approved proof from insertion 1.' });

// Held-ad repeats for the sidewalk ITB
for (const day of [15, 16]) {
  push({ at: stamp(day, 9, 0), category: 'Ad held', noticeId: 'n-sw2', subject: 'Reminder: CL-L48207 on hold — select a new date', body: 'This ad remains on hold.', analysis: 'Repeat of Friday’s hold notice. Proofrun alerts once per problem, not per reminder.' });
}

raw.sort((a, b) => a.at.localeCompare(b.at));
export const MESSAGES: PaperMessage[] = raw.map((m, i) => ({ ...m, id: `m${String(i + 1).padStart(3, '0')}` }));

export const DEFAULT_ALERTS: AlertConfig = {
  mode: 'all',
  signals: { policy: true, not_run: true, past_deadline: true, pending_near_deadline: true, proof_pending: false },
  slackDays: 1,
  copyGloria: true,
  routing: {
    gloria: { types: ['public_hearing'], channel: 'email_sms' },
    raj: { types: ['bid_solicitation'], channel: 'email' },
    lena: { types: ['ordinance_summary'], channel: 'email' },
    tim: { types: ['budget_hearing', 'election_notice'], channel: 'email' },
  },
};
