// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type Role = 'cm' | 'gened' | 'lea' | 'psych' | 'slp' | 'ot' | 'parent' | 'interp'
export type PStatus =
  | 'confirmed'
  | 'pending'
  | 'unavailable'
  | 'requested'
  | 'excusal'
  | 'exception'
export type MType = 'annual' | 'initial' | 'reeval' | 'amendment'
export type SchoolId = 'WH' | 'CA' | 'HA' | 'MP' | 'EG' | 'LW' | 'BH' | 'PC' | 'DM' | 'CR' | 'AC'

export interface Participant {
  role: Role
  name: string
  status: PStatus
  note?: string
}

export interface Exceptions {
  /** SLP excused from the meeting (written parent consent + written input) */
  slp?: boolean
  /** OT excused from the meeting */
  ot?: boolean
  /** Dr. Ostrowski asked to work outside his Mon/Wed/Fri, four-school schedule */
  ostOffSchedule?: boolean
}

export interface Meeting {
  id: string
  student: string
  grade: string
  school: SchoolId
  sis: string
  type: MType
  /** compliance due date (ISO) or null when there is no statutory clock */
  due: string | null
  date: string
  start: number // minutes after midnight
  dur: number // minutes
  room: string
  participants: Participant[]
  parent: {
    name: string
    note: string
    after?: number
    before?: number
    noDays?: number[]
  }
  pwn: { status: 'sent' | 'draft' | 'reissue'; sentOn?: string }
  interp?: { language: string; status: 'confirmed' | 'request-needed' | 'requested' }
  /** on Dr. Lin's caseload for this window */
  coverage?: 'lin'
  origin?: { date: string; start: number }
  resolution?: { kind: 'swap' | 'moved' | 'exception'; text: string }
  exceptions?: Exceptions
  log: { at: string; text: string }[]
}

export interface School {
  id: SchoolId
  name: string
  short: string
  active: number
  lea: string
  slp: string
  psych: string
  rooms: string[]
}

export interface Staff {
  name: string
  title: string
  days?: number[]
  schools?: SchoolId[]
  leave?: { from: string; to: string }
  note?: string
}

// ---------------------------------------------------------------------------
// Calendar constants
// ---------------------------------------------------------------------------
export const TODAY = '2026-11-23'
export const NOW_LABEL = 'Monday, November 23, 2026'
export const WINDOW = { from: '2026-11-30', to: '2026-12-18' }
export const PWN_DAYS = 10
export const INTERP_LEAD_HOURS = 48
export const LEAVE = { from: '2026-11-20', to: '2026-12-12' }
export const CLOSURES: { from: string; to: string; label: string }[] = [
  { from: '2026-11-26', to: '2026-11-28', label: 'Thanksgiving closure' },
  { from: '2026-12-21', to: '2027-01-01', label: 'Winter closure' },
]

export const T = (h: number, m = 0) => h * 60 + m

// ---------------------------------------------------------------------------
// Schools (11 elementary schools, 214 active IEPs)
// ---------------------------------------------------------------------------
export const SCHOOLS: School[] = [
  { id: 'WH', name: 'Whitfield ES', short: 'Whitfield', active: 24, lea: 'Denise Carter', slp: 'Marcus Delgado', psych: 'Dr. Mei Lin', rooms: ['Library Conference Rm', 'Counseling Office'] },
  { id: 'CA', name: 'Calloway ES', short: 'Calloway', active: 19, lea: 'Tyrone Bell', slp: 'Priya Venkataraman', psych: 'Dr. Anita Brooks', rooms: ['Conference Rm A', 'Media Center Annex'] },
  { id: 'HA', name: 'Hartwell ES', short: 'Hartwell', active: 22, lea: 'Luis Ortega', slp: 'Rhonda Kim', psych: 'Dr. Mei Lin', rooms: ['Main Office Conference Rm', 'Room 108'] },
  { id: 'MP', name: 'Marigold Park ES', short: 'Marigold Park', active: 17, lea: 'Helen Wu', slp: 'Marcus Delgado', psych: 'Dr. Mei Lin', rooms: ['Parent Resource Rm', 'Staff Workroom'] },
  { id: 'EG', name: 'Eastgate ES', short: 'Eastgate', active: 21, lea: 'Sandra Okafor', slp: 'Marcus Delgado', psych: 'Dr. Anita Brooks', rooms: ['Conference Rm', 'Counselor Office'] },
  { id: 'LW', name: 'Lindenwood ES', short: 'Lindenwood', active: 18, lea: 'Brandon Hale', slp: 'Rhonda Kim', psych: 'Dr. Mei Lin', rooms: ['Conference Rm B', 'Room 22'] },
  { id: 'BH', name: 'Brookhaven ES', short: 'Brookhaven', active: 20, lea: 'Monica Alvarado', slp: 'Priya Venkataraman', psych: 'Dr. Anita Brooks', rooms: ['Principal Conference Rm', 'Library Office'] },
  { id: 'PC', name: 'Pinecrest ES', short: 'Pinecrest', active: 16, lea: 'Greg Thornton', slp: 'Priya Venkataraman', psych: 'Dr. Rafael Moreno', rooms: ['Conference Rm', 'Room 3'] },
  { id: 'DM', name: 'Dunmore ES', short: 'Dunmore', active: 19, lea: 'Kelly Nguyen', slp: 'Marcus Delgado', psych: 'Dr. Mei Lin', rooms: ['Resource Rm 114', 'Main Office Conference Rm'] },
  { id: 'CR', name: 'Cedar Ridge ES', short: 'Cedar Ridge', active: 20, lea: 'Patrice Dumas', slp: 'Rhonda Kim', psych: 'Dr. Rafael Moreno', rooms: ['Conference Rm', 'Student Support Office'] },
  { id: 'AC', name: 'Alder Creek ES', short: 'Alder Creek', active: 18, lea: 'Joseph Whitaker', slp: 'Priya Venkataraman', psych: 'Dr. Rafael Moreno', rooms: ['Conference Rm', 'Room 12'] },
]
export const school = (id: SchoolId) => SCHOOLS.find((s) => s.id === id)!
export const TOTAL_ACTIVE = SCHOOLS.reduce((n, s) => n + s.active, 0)

// ---------------------------------------------------------------------------
// Named people with availability rules
// ---------------------------------------------------------------------------
export const LIN = 'Dr. Mei Lin'
export const OST = 'Dr. Paul Ostrowski'
export const KIM = 'Rhonda Kim'
export const OST_SCHOOLS: SchoolId[] = ['WH', 'HA', 'EG', 'PC']

export const STAFF: Record<string, Staff> = {
  [LIN]: { name: LIN, title: 'School psychologist', leave: LEAVE, schools: ['WH', 'HA', 'MP', 'LW', 'DM'], note: 'Back Mon Dec 14.' },
  [OST]: { name: OST, title: 'Substitute school psychologist', days: [1, 3, 5], schools: OST_SCHOOLS, note: 'Mon / Wed / Fri only.' },
  'Dr. Anita Brooks': { name: 'Dr. Anita Brooks', title: 'School psychologist', schools: ['CA', 'EG', 'BH'] },
  'Dr. Rafael Moreno': { name: 'Dr. Rafael Moreno', title: 'School psychologist', schools: ['PC', 'CR', 'AC'] },
  [KIM]: { name: KIM, title: 'Speech-language pathologist', days: [2, 4], schools: ['HA', 'LW', 'CR'], note: 'Tue / Thu only.' },
  'Marcus Delgado': { name: 'Marcus Delgado', title: 'Speech-language pathologist', schools: ['WH', 'MP', 'EG', 'DM'] },
  'Priya Venkataraman': { name: 'Priya Venkataraman', title: 'Speech-language pathologist', schools: ['CA', 'BH', 'PC', 'AC'] },
  'Grace Nakamura': { name: 'Grace Nakamura', title: 'Occupational therapist (region-wide)' },
  'Hodan Warsame': { name: 'Hodan Warsame', title: 'Somali interpreter', note: '48-hour lead time through District Language Services' },
  'Abdi Mohamud': { name: 'Abdi Mohamud', title: 'Somali interpreter', note: '48-hour lead time through District Language Services' },
  'Lucía Ferrer': { name: 'Lucía Ferrer', title: 'Spanish interpreter', note: 'District Language Services' },
}
export const SOMALI_POOL = ['Hodan Warsame', 'Abdi Mohamud']

/** Interpreter commitments outside the 27 IEP meetings (from Language Services' calendar) */
export const INTERP_EXTERNAL: { who: string; date: string; start: number; end: number; what: string }[] = [
  { who: 'Hodan Warsame', date: '2026-12-14', start: T(15, 30), end: T(17, 30), what: 'District Welcome Center intake' },
  { who: 'Hodan Warsame', date: '2026-12-16', start: T(16, 0), end: T(17, 30), what: 'Brookhaven ES family conferences' },
  { who: 'Abdi Mohamud', date: '2026-12-16', start: T(16, 0), end: T(18, 0), what: 'Pinecrest ES parent night' },
  { who: 'Hodan Warsame', date: '2026-12-18', start: T(16, 0), end: T(18, 0), what: 'Calloway ES family conference' },
]

export const ROLE_LABEL: Record<Role, string> = {
  cm: 'Case manager',
  gened: 'Gen-ed teacher',
  lea: 'LEA representative',
  psych: 'School psychologist',
  slp: 'Speech-language pathologist',
  ot: 'Occupational therapist',
  parent: 'Parent / guardian',
  interp: 'Interpreter',
}
export const ROLE_SHORT: Record<Role, string> = {
  cm: 'Case mgr',
  gened: 'Gen-ed',
  lea: 'LEA',
  psych: 'Psych',
  slp: 'SLP',
  ot: 'OT',
  parent: 'Parent',
  interp: 'Interp.',
}
export const TYPE_LABEL: Record<MType, string> = {
  annual: 'Annual review',
  initial: 'Initial eligibility',
  reeval: 'Reevaluation',
  amendment: 'Amendment',
}
export const TYPE_SHORT: Record<MType, string> = {
  annual: 'Annual',
  initial: 'Initial',
  reeval: 'Reeval',
  amendment: 'Amend.',
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------
const P = (role: Role, name: string, status: Participant['status'] = 'confirmed', note?: string): Participant => ({ role, name, status, note })
const LINP = (): Participant => P('psych', LIN, 'unavailable', 'On medical leave')

let n = 4200
const mk = (m: Omit<Meeting, 'id' | 'log'> & { log?: Meeting['log'] }): Meeting => ({
  id: `IEP-${++n}`,
  log: m.log ?? [{ at: '2026-11-10', text: 'Meeting scheduled' }],
  ...m,
})

export const INITIAL_MEETINGS: Meeting[] = [
  // ------------------------------------------------------------------ Dr. Lin's six
  mk({
    student: 'Owen B.', grade: '5', school: 'WH', sis: '4482017', type: 'amendment', due: null,
    date: '2026-11-30', start: T(8, 30), dur: 30, room: 'Counseling Office', coverage: 'lin',
    participants: [P('cm', 'Samir Haddad'), P('gened', 'Tessa Wright'), P('lea', 'Denise Carter'), LINP(), P('parent', 'Ms. Brandt')],
    parent: { name: 'Ms. Brandt', note: 'Any weekday morning. Prefers email.' },
    pwn: { status: 'sent', sentOn: '2026-11-13' },
  }),
  mk({
    student: 'Nia T.', grade: '1', school: 'HA', sis: '4519330', type: 'initial', due: '2026-12-10',
    date: '2026-12-01', start: T(13, 0), dur: 90, room: 'Main Office Conference Rm', coverage: 'lin',
    participants: [P('cm', 'Priyanka Shah'), P('gened', 'Carla Mendes'), P('lea', 'Luis Ortega'), LINP(), P('slp', KIM), P('parent', 'Ms. Trevino')],
    parent: { name: 'Ms. Trevino', note: 'Works mornings. Free any day after 12:30 p.m. Prefers text.', after: T(12, 30) },
    pwn: { status: 'sent', sentOn: '2026-11-12' },
    log: [{ at: '2026-10-19', text: 'Consent to evaluate signed — 60-day clock started' }, { at: '2026-11-10', text: 'Meeting scheduled' }],
  }),
  mk({
    student: 'Amir H.', grade: '3', school: 'WH', sis: '4401276', type: 'annual', due: '2026-12-04',
    date: '2026-12-02', start: T(9, 30), dur: 60, room: 'Library Conference Rm', coverage: 'lin',
    participants: [P('cm', 'Alicia Rowe'), P('gened', 'Daniel Pruitt'), P('lea', 'Denise Carter'), LINP(), P('slp', 'Marcus Delgado'), P('parent', 'Mr. Hamdan')],
    parent: { name: 'Mr. Hamdan', note: 'Flexible. Prefers email; reads on his phone.' },
    pwn: { status: 'sent', sentOn: '2026-11-13' },
  }),
  mk({
    student: 'Yusuf F.', grade: '4', school: 'MP', sis: '4437781', type: 'reeval', due: '2026-12-18',
    date: '2026-12-03', start: T(16, 30), dur: 60, room: 'Parent Resource Rm', coverage: 'lin',
    participants: [P('cm', 'Kwame Boateng'), P('gened', 'Janelle Price'), P('lea', 'Helen Wu'), LINP(), P('parent', 'Ms. Farah'), P('interp', 'Hodan Warsame', 'confirmed', 'Somali')],
    parent: { name: 'Ms. Farah', note: 'After 4:15 p.m. only, prefers phone. Somali interpreter needed.', after: T(16, 15) },
    pwn: { status: 'sent', sentOn: '2026-11-12' },
    interp: { language: 'Somali', status: 'confirmed' },
    log: [{ at: '2026-11-04', text: 'Meeting scheduled; Somali interpreter booked (H. Warsame)' }],
  }),
  mk({
    student: 'Daniela C.', grade: '2', school: 'DM', sis: '4560912', type: 'annual', due: '2026-12-23',
    date: '2026-12-07', start: T(16, 0), dur: 60, room: 'Resource Rm 114', coverage: 'lin',
    participants: [P('cm', 'Hannah Brightman'), P('gened', 'Yolanda Pierce'), P('lea', 'Kelly Nguyen'), LINP(), P('slp', 'Marcus Delgado'), P('parent', 'Mr. Castillo')],
    parent: { name: 'Mr. Castillo', note: 'After 4:00 p.m. only (works days). Call or text.', after: T(16, 0) },
    pwn: { status: 'sent', sentOn: '2026-11-16' },
  }),
  mk({
    student: 'Imani R.', grade: '5', school: 'LW', sis: '4395504', type: 'annual', due: '2026-12-15',
    date: '2026-12-08', start: T(10, 0), dur: 60, room: 'Conference Rm B', coverage: 'lin',
    participants: [P('cm', 'Olivia Sandoval'), P('gened', 'Victor Lang'), P('lea', 'Brandon Hale'), LINP(), P('slp', KIM), P('ot', 'Grace Nakamura'), P('parent', 'Ms. Rollins')],
    parent: { name: 'Ms. Rollins', note: 'Prefers mornings but can do any time. Email is fine.' },
    pwn: { status: 'sent', sentOn: '2026-11-16' },
  }),

  // ------------------------------------------------------------------ Week of Nov 30
  mk({
    student: 'Sofia M.', grade: '2', school: 'EG', sis: '4588120', type: 'annual', due: '2026-12-03',
    date: '2026-11-30', start: T(10, 0), dur: 60, room: 'Conference Rm',
    participants: [P('cm', 'Beth Kowalski'), P('gened', 'Nate Ellison'), P('lea', 'Sandra Okafor'), P('psych', 'Dr. Anita Brooks'), P('slp', 'Marcus Delgado'), P('parent', 'Ms. Medina'), P('interp', 'Lucía Ferrer', 'confirmed', 'Spanish')],
    parent: { name: 'Ms. Medina', note: 'Prefers Spanish; interpreter booked. Mornings.' },
    pwn: { status: 'sent', sentOn: '2026-11-12' },
    interp: { language: 'Spanish', status: 'confirmed' },
  }),
  mk({
    student: 'Elijah N.', grade: 'K', school: 'BH', sis: '4601457', type: 'initial', due: '2026-12-08',
    date: '2026-11-30', start: T(13, 30), dur: 90, room: 'Principal Conference Rm',
    participants: [P('cm', 'Dana Whitmore'), P('gened', 'Rosa Delacroix'), P('lea', 'Monica Alvarado'), P('psych', 'Dr. Anita Brooks'), P('slp', 'Priya Venkataraman'), P('parent', 'Mr. Nwosu')],
    parent: { name: 'Mr. Nwosu', note: 'Afternoons after 12:30 work best.', after: T(12, 30) },
    pwn: { status: 'sent', sentOn: '2026-11-13' },
  }),
  mk({
    student: 'Marcus P.', grade: '4', school: 'CA', sis: '4472298', type: 'reeval', due: '2026-12-11',
    date: '2026-12-01', start: T(9, 0), dur: 60, room: 'Conference Rm A',
    participants: [P('cm', 'Tamika Reed'), P('gened', 'Owen Fitzgerald', 'pending'), P('lea', 'Tyrone Bell'), P('psych', 'Dr. Anita Brooks'), P('slp', 'Priya Venkataraman'), P('parent', 'Mr. Prescott', 'pending')],
    parent: { name: 'Mr. Prescott', note: 'Flexible. Email only.' },
    pwn: { status: 'draft' },
    log: [{ at: '2026-11-18', text: 'Meeting scheduled — notice still in draft' }],
  }),
  mk({
    student: 'Harper L.', grade: '4', school: 'PC', sis: '4493365', type: 'annual', due: '2026-12-07',
    date: '2026-12-01', start: T(10, 30), dur: 60, room: 'Conference Rm',
    participants: [P('cm', 'Jill Santangelo'), P('gened', 'Carmen Ruiz'), P('lea', 'Greg Thornton'), P('psych', 'Dr. Rafael Moreno'), P('slp', 'Priya Venkataraman'), P('ot', 'Grace Nakamura'), P('parent', 'Ms. Lindqvist')],
    parent: { name: 'Ms. Lindqvist', note: 'Mornings preferred.' },
    pwn: { status: 'sent', sentOn: '2026-11-14' },
  }),
  mk({
    student: 'Tobias K.', grade: '3', school: 'AC', sis: '4510839', type: 'amendment', due: null,
    date: '2026-12-01', start: T(14, 0), dur: 30, room: 'Room 12',
    participants: [P('cm', 'Leona Pearce'), P('gened', 'Marcia Tobin'), P('lea', 'Joseph Whitaker'), P('slp', 'Priya Venkataraman'), P('parent', 'Ms. Kim-Dawson')],
    parent: { name: 'Ms. Kim-Dawson', note: 'Any time after 1:00 p.m.' },
    pwn: { status: 'sent', sentOn: '2026-11-16' },
  }),
  mk({
    student: 'Brielle S.', grade: '5', school: 'CA', sis: '4425609', type: 'annual', due: '2026-12-15',
    date: '2026-12-02', start: T(13, 0), dur: 60, room: 'Conference Rm A',
    participants: [P('cm', 'Tamika Reed'), P('gened', 'Wanda Okoye'), P('lea', 'Tyrone Bell'), P('psych', 'Dr. Anita Brooks'), P('slp', 'Priya Venkataraman'), P('parent', 'Ms. Sutherland', 'pending')],
    parent: { name: 'Ms. Sutherland', note: 'Prefers calls. No answer to email since Nov 9.' },
    pwn: { status: 'sent', sentOn: '2026-11-17' },
  }),
  mk({
    student: 'Rashad T.', grade: '1', school: 'EG', sis: '4619044', type: 'amendment', due: null,
    date: '2026-12-02', start: T(14, 30), dur: 30, room: 'Counselor Office',
    participants: [P('cm', 'Beth Kowalski'), P('gened', 'Lydia Ahn'), P('lea', 'Sandra Okafor'), P('slp', 'Marcus Delgado'), P('parent', 'Mr. Tillman')],
    parent: { name: 'Mr. Tillman', note: 'Afternoons.' },
    pwn: { status: 'sent', sentOn: '2026-11-16' },
  }),
  mk({
    student: 'Ayesha K.', grade: '5', school: 'CR', sis: '4430078', type: 'annual', due: '2026-12-09',
    date: '2026-12-03', start: T(9, 0), dur: 60, room: 'Conference Rm',
    participants: [P('cm', 'Rebecca Stone'), P('gened', 'Alan Greer'), P('lea', 'Patrice Dumas'), P('psych', 'Dr. Rafael Moreno'), P('slp', KIM), P('parent', 'Ms. Khalil', 'pending')],
    parent: { name: 'Ms. Khalil', note: 'Mornings. Prefers phone.' },
    pwn: { status: 'draft' },
    log: [{ at: '2026-11-17', text: 'Meeting scheduled — notice still in draft' }],
  }),
  mk({
    student: 'Lucas V.', grade: '1', school: 'PC', sis: '4627713', type: 'initial', due: '2026-12-11',
    date: '2026-12-03', start: T(13, 0), dur: 90, room: 'Conference Rm',
    participants: [P('cm', 'Jill Santangelo'), P('gened', 'Terri Banks'), P('lea', 'Greg Thornton'), P('psych', 'Dr. Rafael Moreno'), P('slp', 'Priya Venkataraman'), P('parent', 'Ms. Vasquez', 'pending')],
    parent: { name: 'Ms. Vasquez', note: 'After 12:00 p.m. Text preferred.' },
    pwn: { status: 'draft' },
    log: [{ at: '2026-11-17', text: 'Meeting scheduled — notice still in draft' }],
  }),
  mk({
    student: 'Zoe H.', grade: '3', school: 'BH', sis: '4455820', type: 'annual', due: '2026-12-04',
    date: '2026-12-04', start: T(9, 0), dur: 60, room: 'Principal Conference Rm',
    participants: [P('cm', 'Dana Whitmore'), P('gened', 'Priscilla Amos'), P('lea', 'Monica Alvarado'), P('psych', 'Dr. Anita Brooks'), P('slp', 'Priya Venkataraman'), P('parent', 'Mr. Hirsch')],
    parent: { name: 'Mr. Hirsch', note: 'Mornings preferred.' },
    pwn: { status: 'draft' },
    log: [{ at: '2026-11-18', text: 'Meeting scheduled — notice still in draft' }],
  }),
  mk({
    student: 'Carlos D.', grade: '3', school: 'MP', sis: '4468231', type: 'amendment', due: null,
    date: '2026-12-04', start: T(10, 30), dur: 30, room: 'Staff Workroom',
    participants: [P('cm', 'Kwame Boateng'), P('gened', 'Ellen Marsh'), P('lea', 'Helen Wu'), P('slp', 'Marcus Delgado'), P('parent', 'Mr. Delgado-Ruiz')],
    parent: { name: 'Mr. Delgado-Ruiz', note: 'Mornings, before 11:00.' },
    pwn: { status: 'sent', sentOn: '2026-11-17' },
  }),
  mk({
    student: 'Mina J.', grade: '1', school: 'AC', sis: '4640195', type: 'annual', due: '2026-12-11',
    date: '2026-12-04', start: T(14, 0), dur: 60, room: 'Conference Rm',
    participants: [P('cm', 'Leona Pearce'), P('gened', 'Hector Salinas'), P('lea', 'Joseph Whitaker'), P('psych', 'Dr. Rafael Moreno'), P('slp', 'Priya Venkataraman'), P('parent', 'Ms. Jeong')],
    parent: { name: 'Ms. Jeong', note: 'After 1:30 p.m.' },
    pwn: { status: 'sent', sentOn: '2026-11-19' },
  }),

  // ------------------------------------------------------------------ Week of Dec 7
  mk({
    student: 'Gabriel S.', grade: '2', school: 'HA', sis: '4577463', type: 'amendment', due: null,
    date: '2026-12-07', start: T(9, 30), dur: 30, room: 'Room 108',
    participants: [P('cm', 'Priyanka Shah'), P('gened', 'Ian Reddick'), P('lea', 'Luis Ortega'), P('ot', 'Grace Nakamura'), P('parent', 'Ms. Salcedo')],
    parent: { name: 'Ms. Salcedo', note: 'Mornings.' },
    pwn: { status: 'sent', sentOn: '2026-11-20' },
  }),
  mk({
    student: 'Layla A.', grade: '1', school: 'CA', sis: '4651206', type: 'initial', due: '2026-12-18',
    date: '2026-12-08', start: T(9, 0), dur: 90, room: 'Conference Rm A',
    participants: [P('cm', 'Tamika Reed'), P('gened', 'Wanda Okoye'), P('lea', 'Tyrone Bell'), P('psych', 'Dr. Anita Brooks'), P('slp', 'Priya Venkataraman'), P('parent', 'Ms. Aziz', 'pending')],
    parent: { name: 'Ms. Aziz', note: 'Mornings. Email.' },
    pwn: { status: 'sent', sentOn: '2026-11-20' },
  }),
  mk({
    student: 'Jonah E.', grade: '5', school: 'PC', sis: '4412987', type: 'reeval', due: '2026-12-16',
    date: '2026-12-09', start: T(10, 0), dur: 60, room: 'Conference Rm',
    participants: [P('cm', 'Jill Santangelo'), P('gened', 'Carmen Ruiz'), P('lea', 'Greg Thornton'), P('psych', 'Dr. Rafael Moreno'), P('parent', 'Mr. Eisen', 'pending')],
    parent: { name: 'Mr. Eisen', note: 'Mornings. Email.' },
    pwn: { status: 'sent', sentOn: '2026-11-20' },
  }),
  mk({
    student: 'Isaiah G.', grade: '4', school: 'LW', sis: '4449918', type: 'amendment', due: null,
    date: '2026-12-10', start: T(9, 0), dur: 30, room: 'Room 22',
    participants: [P('cm', 'Olivia Sandoval'), P('gened', 'Ruth Calder'), P('lea', 'Brandon Hale'), P('slp', KIM), P('parent', 'Ms. Greene')],
    parent: { name: 'Ms. Greene', note: 'Any time.' },
    pwn: { status: 'sent', sentOn: '2026-11-21' },
  }),
  mk({
    student: 'Emma Q.', grade: '3', school: 'EG', sis: '4466402', type: 'annual', due: '2026-12-17',
    date: '2026-12-10', start: T(13, 30), dur: 60, room: 'Conference Rm',
    participants: [P('cm', 'Beth Kowalski'), P('gened', 'Nate Ellison'), P('lea', 'Sandra Okafor'), P('psych', 'Dr. Anita Brooks'), P('slp', 'Marcus Delgado'), P('parent', 'Ms. Quigley', 'pending')],
    parent: { name: 'Ms. Quigley', note: 'After 1:00 p.m.' },
    pwn: { status: 'sent', sentOn: '2026-11-21' },
  }),
  mk({
    student: 'Wyatt R.', grade: '2', school: 'DM', sis: '4598872', type: 'amendment', due: null,
    date: '2026-12-11', start: T(9, 0), dur: 30, room: 'Main Office Conference Rm',
    participants: [P('cm', 'Hannah Brightman'), P('gened', 'Yolanda Pierce'), P('lea', 'Kelly Nguyen'), P('slp', 'Marcus Delgado'), P('parent', 'Ms. Rhodes', 'pending')],
    parent: { name: 'Ms. Rhodes', note: 'Mornings.' },
    pwn: { status: 'sent', sentOn: '2026-11-22' },
  }),

  // ------------------------------------------------------------------ Week of Dec 14 (Dr. Lin back)
  mk({
    student: 'Theo B.', grade: '4', school: 'MP', sis: '4421350', type: 'annual', due: '2026-12-22',
    date: '2026-12-15', start: T(9, 0), dur: 60, room: 'Parent Resource Rm',
    participants: [P('cm', 'Kwame Boateng'), P('gened', 'Janelle Price', 'pending'), P('lea', 'Helen Wu'), P('psych', LIN, 'pending'), P('slp', 'Marcus Delgado', 'pending'), P('parent', 'Ms. Barlow', 'pending')],
    parent: { name: 'Ms. Barlow', note: 'Mornings. Phone.' },
    pwn: { status: 'draft' },
    log: [{ at: '2026-11-19', text: 'Meeting scheduled — notice goes out Dec 5' }],
  }),
  mk({
    student: 'Hanad Y.', grade: '2', school: 'CR', sis: '4659033', type: 'reeval', due: '2026-12-18',
    date: '2026-12-15', start: T(16, 30), dur: 60, room: 'Student Support Office',
    participants: [P('cm', 'Rebecca Stone'), P('gened', 'Alan Greer'), P('lea', 'Patrice Dumas'), P('psych', 'Dr. Rafael Moreno'), P('parent', 'Ms. Abdullahi', 'pending'), P('interp', 'Abdi Mohamud', 'confirmed', 'Somali')],
    parent: { name: 'Ms. Abdullahi', note: 'Prefers late afternoon. Somali interpreter booked.' },
    pwn: { status: 'draft' },
    interp: { language: 'Somali', status: 'confirmed' },
    log: [{ at: '2026-11-19', text: 'Meeting scheduled; Somali interpreter booked (A. Mohamud)' }],
  }),
  mk({
    student: 'Kiara M.', grade: '2', school: 'HA', sis: '4608811', type: 'annual', due: '2026-12-18',
    date: '2026-12-17', start: T(9, 0), dur: 60, room: 'Main Office Conference Rm',
    participants: [P('cm', 'Priyanka Shah'), P('gened', 'Carla Mendes', 'pending'), P('lea', 'Luis Ortega'), P('psych', LIN, 'pending'), P('slp', KIM, 'pending'), P('parent', 'Mr. Mallory', 'pending')],
    parent: { name: 'Mr. Mallory', note: 'Mornings. Email.' },
    pwn: { status: 'draft' },
    log: [{ at: '2026-11-19', text: 'Meeting scheduled — notice goes out Dec 7' }],
  }),
]

export const LIN_IDS = INITIAL_MEETINGS.filter((m) => m.coverage === 'lin').map((m) => m.id)
