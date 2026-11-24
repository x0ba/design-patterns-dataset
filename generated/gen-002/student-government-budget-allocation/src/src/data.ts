export type Cat = 'travel' | 'event' | 'equipment' | 'food'
export type Status = 'approved' | 'denied' | 'tabled'

export interface Line {
  id: string
  cat: Cat
  label: string
  requested: number
  approved: number
  amendment?: boolean
  needBy?: string
}

export interface Req {
  id: string
  club: string
  kind: string
  president: string
  status: Status
  requested: number
  approved: number
  lines: Line[]
  vote: [number, number, number]
  amendmentVote?: [number, number, number]
  notes: string
  extraFlags: string[]
  offCampus: boolean
  firstSpend: string
  firstSpendFor: string
  committedAt?: string
  committedAmount?: number
}

export interface AdvisorComment {
  id: string
  reqId: string
  author: string
  date: string
  text: string
}

export interface AuditSeed {
  at: string
  who: string
  text: string
  tone?: 'warn'
}

// ---- Constants -------------------------------------------------------------
export const POOL = 186500
export const TODAY = '2026-11-17'
export const VOTED_ON = '2026-11-12'
export const SPEND_OPENS = '2026-12-01'
export const JAN_MEETING = '2027-01-14'
export const APPEAL_DAYS = 10
export const FOOD_CAP = 0.25
export const COMMITTEE_SIZE = 7
export const ESPORTS_ID = 'esports-club'
export const ROBOTICS_ID = 'robotics-club'
export const AMENDMENT_LINE_ID = 'robotics-club-dayton'

export const CAT_LABEL: Record<Cat, string> = {
  travel: 'Travel',
  event: 'Event',
  equipment: 'Equipment',
  food: 'Food',
}

// ---- Helpers ---------------------------------------------------------------
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const round10 = (n: number) => Math.round(n / 10) * 10

function split(total: number, w: number[]): number[] {
  const out = w.map((x) => round10((total * x) / 100))
  const diff = total - out.reduce((a, b) => a + b, 0)
  const big = out.indexOf(Math.max(...out))
  out[big] += diff
  return out
}

const CATS: Cat[] = ['travel', 'event', 'equipment', 'food']

function buildLines(id: string, requested: number, approved: number, weights: number[]): Line[] {
  const req = split(requested, weights)
  const ratio = approved / requested
  const apr = req.map((r) => Math.min(r, round10(r * ratio)))
  const diff = approved - apr.reduce((a, b) => a + b, 0)
  // put the rounding remainder on the largest line that can absorb it
  const order = apr.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) {
    if (apr[i] + diff <= req[i] && apr[i] + diff >= 0) {
      apr[i] += diff
      break
    }
  }
  return CATS.map((cat, i) => ({
    id: `${id}-${cat}`,
    cat,
    label: CAT_LABEL[cat],
    requested: req[i],
    approved: apr[i],
  })).filter((l) => l.requested > 0)
}

const FIRST = ['Jan 20', 'Jan 27', 'Feb 3', 'Feb 10', 'Feb 17', 'Feb 24', 'Mar 3', 'Mar 10', 'Jan 22', 'Feb 5']
const FIRST_ISO = [
  '2027-01-20',
  '2027-01-27',
  '2027-02-03',
  '2027-02-10',
  '2027-02-17',
  '2027-02-24',
  '2027-03-03',
  '2027-03-10',
  '2027-01-22',
  '2027-02-05',
]
void FIRST

const FIRST_FOR: Record<Cat, string> = {
  travel: 'Registration and transport deposits',
  event: 'Venue and vendor deposits',
  equipment: 'Equipment order',
  food: 'Catering deposit',
}

const FIRST_NAMES = [
  'Amara', 'Luis', 'Nadia', 'Kenji', 'Ife', 'Marcus', 'Soraya', 'Tomás', 'Hye-jin', 'Callum',
  'Rania', 'Mateo', 'Anika', 'Jabari', 'Linh', 'Elena', 'Dmitri', 'Keisha', 'Rafael', 'Noor',
  'Wen', 'Imani', 'Gabriel', 'Saanvi', 'Owen', 'Yara', 'Felix', 'Mina', 'Andre', 'Zainab',
  'Theo', 'Leilani',
]
const LAST_NAMES = [
  'Okafor', 'Delgado', 'Haddad', 'Nakamura', 'Whitfield', 'Banerjee', 'Kowalczyk', 'Mensah', 'Reyes-Ortiz', 'Lindqvist',
  'Abdi', 'Castellanos', 'Tran', 'Bergström', 'Adeyemi', 'Park', 'Moreau', 'Sandoval', 'Chaudhry', 'Fitzgerald',
  'Okonkwo', 'Salazar', 'Hoang', 'Petrov', 'Ibrahim', 'Brennan', 'Yamamoto', 'Quispe', 'Ndlovu', 'Varga',
  'Achterberg', 'Villanueva',
]

interface Row {
  name: string
  kind: string
  req: number
  appr: number
  w: [number, number, number, number]
  vote: [number, number, number]
  off?: boolean
  note: string
  first?: string
  extra?: string[]
  status?: Status
}

const R = (
  name: string,
  kind: string,
  req: number,
  appr: number,
  w: [number, number, number, number],
  vote: [number, number, number],
  note: string,
  o: { off?: boolean; first?: string; extra?: string[]; status?: Status } = {},
): Row => ({ name, kind, req, appr, w, vote, note, ...o })

const ROWS: Row[] = [
  R('Black Student Union', 'Cultural & identity', 9090, 6950, [8, 60, 5, 27], [6, 1, 0], 'Kept the Black History Month dinner series intact. Cut the speaker honorarium and printed programs.'),
  R('Latinx Student Union', 'Cultural & identity', 8390, 6400, [10, 58, 12, 20], [7, 0, 0], 'Heritage month programming is co-sponsored with the Multicultural Center. Headliner fee cut.'),
  R('Asian Pacific Islander Student Alliance', 'Cultural & identity', 7240, 5500, [8, 60, 12, 20], [6, 1, 0], 'Lunar New Year gala funded below request. Asked for a ticket-revenue plan before the event.'),
  R('South Asian Students Association', 'Cultural & identity', 6700, 5000, [0, 65, 13, 22], [5, 2, 0], 'Holi festival and spring showcase funded. Venue line cut after the quote came in under budget.'),
  R('Filipino Student Association', 'Cultural & identity', 5540, 4350, [5, 60, 8, 27], [6, 0, 1], 'Cultural night funded. Food share is high because of the kamayan dinner; committee accepted it.'),
  R('Muslim Students Association', 'Faith & spirituality', 4700, 3800, [8, 54, 10, 28], [7, 0, 0], 'Weekly iftars during Ramadan are the core program. Committee approved food above the guideline on purpose.', { first: '2027-01-11' }),
  R('Jewish Student Union', 'Faith & spirituality', 4470, 3550, [4, 52, 8, 36], [6, 0, 1], 'Friday Shabbat dinners are the main program. Committee noted food exceeds the guideline and approved it anyway.'),
  R('Korean Students Association', 'Cultural & identity', 4850, 3700, [4, 55, 12, 29], [5, 1, 1], 'Funded for the Lunar New Year night and spring mixer. Food was trimmed once during deliberation.'),
  R('Vietnamese Student Association', 'Cultural & identity', 4310, 3350, [5, 62, 13, 20], [7, 0, 0], 'Culture Night is the club’s one major event. Dance prop purchases cut.'),
  R('Middle Eastern & North African Students', 'Cultural & identity', 3230, 2450, [0, 70, 10, 20], [6, 1, 0], 'Second year as a registered club. Funded at the continuing-club level.'),
  R('Indigenous Students Alliance', 'Cultural & identity', 3930, 3250, [14, 58, 10, 18], [7, 0, 0], 'Spring powwow supported. Committee encouraged a joint application with Native American Studies next year.'),
  R('Queer & Trans Student Alliance', 'Cultural & identity', 4160, 3350, [6, 62, 17, 15], [6, 1, 0], 'Lavender graduation reception and speaker series funded.'),
  R('First-Generation Scholars Union', 'Cultural & identity', 3540, 3050, [0, 64, 14, 22], [7, 0, 0], 'Peer-mentoring dinners funded close to request.'),
  R('Society of Women Engineers', 'Pre-professional', 5240, 4000, [45, 25, 15, 15], [6, 0, 1], 'Funded for 6 members at the national conference. Airfare partly cut; registration and lodging kept.', { off: true, first: '2026-12-12' }),
  R('National Society of Black Engineers', 'Pre-professional', 5700, 4500, [48, 22, 15, 15], [7, 0, 0], 'Convention travel approved, plus the regional conference.', { off: true, first: '2026-12-09' }),
  R('Society of Hispanic Professional Engineers', 'Pre-professional', 4540, 3500, [46, 24, 15, 15], [6, 1, 0], 'Regional conference funded. Convention trip not funded this round.', { off: true }),
  R('Pre-Law Society', 'Pre-professional', 2770, 2250, [14, 45, 12, 29], [5, 2, 0], 'LSAT workshop and alumni mixer funded. Food above the guideline was flagged but not cut.'),
  R('Pre-Med Association', 'Pre-professional', 3160, 2550, [10, 60, 12, 18], [6, 1, 0], 'MCAT prep sessions and the shadowing panel funded.'),
  R('Undergraduate Economics Society', 'Academic', 2230, 1800, [0, 70, 10, 20], [7, 0, 0], 'Speaker series funded. No concerns raised.'),
  R('Model United Nations', 'Academic', 6310, 4650, [62, 18, 10, 10], [5, 2, 0], 'Funded for two conferences, not three. Delegate fees prioritized over hotel nights.', { off: true, first: '2026-12-18' }),
  R('Mock Trial Team', 'Academic', 3700, 2900, [55, 15, 18, 12], [6, 1, 0], 'Regional tournament funded. Travel party cut from 10 to 8.', { off: true }),
  R('Debate Society', 'Academic', 4080, 3200, [58, 17, 15, 10], [5, 1, 1], 'Two tournaments funded; the third goes on club dues.', { off: true }),
  R('Data Science Club', 'Academic', 2620, 2200, [0, 45, 40, 15], [7, 0, 0], 'Cloud credits and workshop supplies funded.'),
  R('Women in Computing', 'Academic', 3540, 3000, [10, 55, 15, 20], [7, 0, 0], 'Mentorship series funded. Swag trimmed.'),
  R('Hackathon Club', 'Academic', 7010, 5250, [10, 32, 28, 30], [4, 2, 1], 'Long debate on food: 36 hours of meals for about 150 participants. No sponsor match documented. Approved narrowly.', { first: '2027-02-12', extra: ['no sponsor match documented'] }),
  R('Physics & Quantum Society', 'Academic', 1770, 1450, [8, 40, 40, 12], [7, 0, 0], 'Lab tour and outreach demo kit funded.'),
  R('Chemistry Club', 'Academic', 2390, 1950, [5, 40, 45, 10], [7, 0, 0], 'Safety equipment and outreach demo supplies funded.'),
  R('Biomedical Engineering Society', 'Academic', 2850, 2300, [15, 45, 25, 15], [6, 1, 0], 'Design competition entry fees funded. Travel limited to the regional meet.'),
  R('Math Club', 'Academic', 1390, 1150, [0, 55, 25, 20], [7, 0, 0], 'Putnam prep sessions funded.'),
  R('Astronomy Club', 'Special interest', 2000, 1600, [5, 15, 70, 10], [6, 0, 1], 'Tracking mount funded. Second telescope request cut.'),
  R('Entrepreneurship Society', 'Pre-professional', 3850, 3050, [10, 60, 12, 18], [5, 2, 0], 'Pitch competition prize pool cut. Venue and judges funded.'),
  R('Finance & Investment Club', 'Pre-professional', 2930, 2400, [10, 60, 15, 15], [6, 1, 0], 'Workshop funded. Data subscription cut.'),
  R('Accounting Society', 'Pre-professional', 1850, 1500, [5, 65, 12, 18], [7, 0, 0], 'Firm-night panels funded.'),
  R('Environmental Action Coalition', 'Service', 3390, 2750, [10, 50, 25, 15], [6, 0, 1], 'Campus cleanup supplies and Earth Week funded.'),
  R('Habitat for Humanity Chapter', 'Service', 5160, 3900, [34, 22, 22, 22], [5, 2, 0], 'Spring build trip funded. Lodging cut after the club found a church host.', { off: true }),
  R('Alternative Breaks', 'Service', 6470, 4950, [60, 10, 10, 20], [5, 2, 0], 'Two trip sites funded, the third not. Site deposits come due in December.', { off: true, first: '2026-12-04' }),
  R('Campus Garden Collective', 'Service', 1690, 1450, [0, 20, 65, 15], [7, 0, 0], 'Seeds, soil, and tool storage funded.'),
  R('Circle K International', 'Service', 2540, 2100, [8, 45, 15, 32], [5, 1, 1], 'Service-day lunches are above the guideline. Committee asked the club to seek donated food first.'),
  R('Food Recovery Network', 'Service', 2160, 1800, [10, 20, 55, 15], [7, 0, 0], 'Cooler bags and a scale funded.'),
  R('Student Wind Ensemble', 'Performing arts', 4000, 3200, [5, 45, 45, 5], [6, 1, 0], 'Spring concert funded. Instrument repair funded, new purchases not.'),
  R('Bhangra Dance Team', 'Performing arts', 4930, 3700, [55, 15, 20, 10], [4, 3, 0], 'Competition travel funded narrowly. Three members questioned the cost per dancer.', { off: true, first: '2026-12-15' }),
  R('Rhythm Collective Hip-Hop Crew', 'Performing arts', 3700, 2900, [10, 60, 20, 10], [6, 1, 0], 'Showcase funded. Costumes cut.'),
  R('Ballroom Dance Club', 'Performing arts', 2310, 1900, [20, 50, 20, 10], [7, 0, 0], 'Instructor fees funded.'),
  R('Improv Troupe', 'Performing arts', 2770, 2300, [5, 70, 15, 10], [6, 0, 1], 'Two shows and one workshop funded.'),
  R('Student Theatre Company', 'Performing arts', 7160, 5350, [2, 55, 35, 8], [5, 1, 1], 'Spring production funded. Rights and licensing deposit is due in early January.', { first: '2027-01-06' }),
  R('Treble Makers A Cappella', 'Performing arts', 3230, 2550, [50, 20, 10, 20], [6, 1, 0], 'Competition entry and travel funded. Recording session cut.', { off: true, first: '2027-01-08' }),
  R('Film Society', 'Media', 2930, 2400, [5, 50, 35, 10], [7, 0, 0], 'Screening rights and festival entry funded.'),
  R('Campus Radio', 'Media', 2310, 2050, [0, 10, 80, 10], [7, 0, 0], 'Microphones and mixer funded close to request.'),
  R('The Student Review', 'Media', 2460, 2100, [0, 15, 75, 10], [6, 1, 0], 'Print run funded. Launch party trimmed.'),
  R('Photography Club', 'Media', 1460, 1250, [10, 20, 60, 10], [7, 0, 0], 'Darkroom supplies funded.'),
  R('Club Soccer', 'Club sports', 6780, 5100, [66, 5, 24, 5], [4, 2, 1], 'League travel funded. Committee noted a prior-year unspent balance of $1,150.', { off: true, first: '2027-01-27', extra: ['prior-year unspent balance: $1,150'] }),
  R('Women’s Club Volleyball', 'Club sports', 5080, 4000, [64, 5, 26, 5], [6, 1, 0], 'Tournament travel funded. Uniforms go on club dues.', { off: true }),
  R('Ultimate Frisbee', 'Club sports', 4000, 3100, [60, 10, 25, 5], [4, 3, 0], 'Divided vote: two tournaments requested, one funded.', { off: true, first: '2027-02-03' }),
  R('Climbing Club', 'Club sports', 3080, 2550, [20, 10, 60, 10], [6, 1, 0], 'Gym wall access and gear rental funded.'),
  R('Cycling Club', 'Club sports', 2700, 2200, [45, 15, 30, 10], [4, 2, 1], 'Race entries funded. Bike repair stand deferred.', { off: true, first: '2027-02-17' }),
  R('Chess Club', 'Special interest', 1620, 1400, [50, 25, 15, 10], [7, 0, 0], 'Collegiate open entries and boards funded.', { off: true }),
  // Denied
  R('Ski & Snowboard Club', 'Club sports', 8400, 0, [78, 0, 17, 5], [1, 5, 1], 'Denied. Most of the request is lift tickets and rentals for individual members; the activity fee can’t fund personal benefit.', { off: true, status: 'denied' }),
  R('Poker & Casino Night Society', 'Special interest', 4200, 0, [0, 70, 10, 20], [0, 6, 1], 'Denied. Request includes cash prizes and buy-ins. Gambling payouts are ineligible.', { status: 'denied' }),
  R('Campus Merch Collective', 'Special interest', 3150, 0, [0, 10, 80, 10], [2, 4, 1], 'Denied. Funds would buy inventory for resale. Revenue-generating activity is ineligible.', { status: 'denied' }),
  R('Anime & Manga Society', 'Special interest', 3070, 0, [0, 60, 20, 20], [2, 5, 0], 'Denied. Submitted after the Oct 30 deadline and no officer completed the funding workshop. Welcome to reapply in January.', { status: 'denied' }),
  // Tabled
  R('Women’s Rugby Club', 'Club sports', 8100, 0, [62, 10, 24, 4], [5, 1, 1], 'Tabled until January. Insurance certificate and coach background checks are not on file.', { off: true, status: 'tabled' }),
  R('Undergraduate Research Journal', 'Academic', 5000, 0, [0, 30, 60, 10], [5, 0, 2], 'Tabled until January. Faculty advisor signature is missing from the submission.', { status: 'tabled' }),
]

function buildRow(r: Row, i: number): Req {
  const id = slug(r.name)
  const status: Status = r.status ?? 'approved'
  const lines = buildLines(id, r.req, r.appr, r.w)
  const dom = [...lines].sort((a, b) => b.requested - a.requested)[0]?.cat ?? 'event'
  return {
    id,
    club: r.name,
    kind: r.kind,
    president: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7 + 3) % LAST_NAMES.length]}`,
    status,
    requested: r.req,
    approved: r.appr,
    lines,
    vote: r.vote,
    notes: r.note,
    extraFlags: r.extra ?? [],
    offCampus: !!r.off,
    firstSpend: r.first ?? FIRST_ISO[(i * 3 + 1) % FIRST_ISO.length],
    firstSpendFor: FIRST_FOR[dom],
  }
}

const robotics: Req = {
  id: ROBOTICS_ID,
  club: 'Robotics Club',
  kind: 'Academic',
  president: 'Anika Sandoval',
  status: 'approved',
  requested: 15600,
  approved: 14000,
  lines: [
    { id: 'robotics-club-parts', cat: 'equipment', label: 'Parts & materials', requested: 5200, approved: 4300, needBy: '2026-12-11' },
    { id: 'robotics-club-season', cat: 'travel', label: 'Season travel (scrimmages)', requested: 3000, approved: 2600, needBy: '2027-02-12' },
    { id: AMENDMENT_LINE_ID, cat: 'travel', label: 'Dayton regional competition', requested: 6200, approved: 6200, amendment: true, needBy: '2027-02-02' },
    { id: 'robotics-club-outreach', cat: 'event', label: 'Outreach demo days', requested: 400, approved: 300 },
    { id: 'robotics-club-food', cat: 'food', label: 'Team meals', requested: 800, approved: 600 },
  ],
  vote: [7, 0, 0],
  amendmentVote: [4, 2, 1],
  notes:
    'Base request approved 7–0–0 on Thursday. The late amendment for the Dayton regional (14 students, 3 nights) passed 4–2–1 after debate over cost per student.',
  extraFlags: [],
  offCampus: true,
  firstSpend: '2026-12-11',
  firstSpendFor: 'Parts order',
}

const esports: Req = {
  id: ESPORTS_ID,
  club: 'Esports Club',
  kind: 'Special interest',
  president: 'Ezra Whitfield',
  status: 'approved',
  requested: 2400,
  approved: 1400,
  lines: [
    { id: 'esports-club-travel', cat: 'travel', label: 'Collegiate regional tournament', requested: 600, approved: 0 },
    { id: 'esports-club-event', cat: 'event', label: 'Campus LAN night', requested: 900, approved: 600 },
    { id: 'esports-club-equipment', cat: 'equipment', label: 'Headsets & capture cards', requested: 900, approved: 800 },
  ],
  vote: [5, 1, 1],
  notes:
    'Cut tournament travel because no risk form was on file, and trimmed equipment to headsets and capture cards. Approved at $1,400.',
  extraFlags: [],
  offCampus: false,
  firstSpend: '2026-12-14',
  firstSpendFor: 'Tournament entry',
  committedAt: '2026-11-09',
  committedAmount: 2400,
}

const built = ROWS.map(buildRow)
const approvedOthers = built.filter((r) => r.status === 'approved')
const rest = built.filter((r) => r.status !== 'approved')

export const REQUESTS: Req[] = [
  ...approvedOthers.slice(0, 22),
  robotics,
  ...approvedOthers.slice(22),
  esports,
  ...rest,
]

export const COMMENTS: AdvisorComment[] = [
  {
    id: 'c1',
    reqId: ROBOTICS_ID,
    author: 'Carla Ruiz',
    date: '2026-11-16',
    text: 'Dayton trip: 14 students, 3 nights, and there is no risk-management form on file yet. The lodging quote also assumes four to a room, which our travel policy doesn’t allow. Please confirm both before the club books anything.',
  },
  {
    id: 'c2',
    reqId: 'hackathon-club',
    author: 'Carla Ruiz',
    date: '2026-11-16',
    text: 'Food is 30% of this award. The guideline allows an exception with a documented sponsor match, and I can’t find one in the submission. Worth asking the club before funds release.',
  },
]

export const AUDIT_SEED: AuditSeed[] = [
  { at: '2026-11-16T16:42', who: 'Carla Ruiz', text: 'Marked the allocation packet “Reviewed” with 2 comments (Robotics Club, Hackathon Club).' },
  { at: '2026-11-12T22:10', who: 'Finance Committee', text: 'Approved a late amendment for Robotics Club: +$6,200 for the Dayton regional competition (4–2–1).' },
  { at: '2026-11-12T21:55', who: 'Finance Committee', text: 'Voted on spring requests: 58 approved ($190,300), 4 denied, 2 tabled until January.' },
  { at: '2026-11-09T10:18', who: 'Jordan Mbeki', text: 'Committed Esports Club award at $2,400. Committee-approved amount is $1,400. Club notified.', tone: 'warn' },
  { at: '2026-11-05T21:30', who: 'Finance Committee', text: 'Approved Esports Club request at $1,400 (5–1–1).' },
  { at: '2026-10-30T23:59', who: 'System', text: 'Spring request deadline closed with 64 submissions totaling $271,930.' },
  { at: '2026-10-02T14:05', who: 'Senate', text: 'Spring 2027 pool set at $186,500 from the student activity fee.' },
]
