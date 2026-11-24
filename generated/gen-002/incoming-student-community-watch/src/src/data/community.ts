// Fixed scenario clock: Thursday, August 13, 2026, 12:14 — twelve days before move-in (Tue Aug 25).
export const SCENARIO_START = new Date(2026, 7, 13, 12, 14, 0).getTime();
export const MOVE_IN = new Date(2026, 7, 25, 8, 0, 0).getTime();
export const t = (h: number, m: number, dayOffset = 0) =>
  new Date(2026, 7, 13 + dayOffset, h, m, 0).getTime();

export const COMMUNITY = {
  name: 'Class of 2030',
  joined: 4212,
  confirmed: 5040,
  postsSince9: 468,
};

export const ME = {
  name: 'Renée Castellanos',
  initials: 'RC',
  title: 'Assistant Director, New Student Programs',
  phoneLast4: '4417',
};

export type LeaderStatus = 'shift' | 'session' | 'off';
export interface Leader {
  id: string;
  name: string;
  initials: string;
  detail: string; // year + major
  status: LeaderStatus;
  statusNote: string;
  lastAction: string;
  handled: number; // items resolved since 9:00
}

export const LEADERS: Leader[] = [
  { id: 'l1', name: 'Priya Raman', initials: 'PR', detail: '3rd year · Psychology', status: 'session', statusNote: 'Leading Session D, back 13:00', lastAction: '09:52', handled: 4 },
  { id: 'l2', name: 'Marcus Oyelaran', initials: 'MO', detail: '4th year · Economics', status: 'shift', statusNote: 'On shift until 15:00', lastAction: '12:09', handled: 11 },
  { id: 'l3', name: 'Sofia Delgado-Reyes', initials: 'SD', detail: '3rd year · Political Science', status: 'shift', statusNote: 'On shift until 16:00', lastAction: '12:11', handled: 9 },
  { id: 'l4', name: 'Kenji Watanabe', initials: 'KW', detail: '2nd year · Electrical Eng.', status: 'session', statusNote: 'Campus tour, back 13:00', lastAction: '10:03', handled: 3 },
  { id: 'l5', name: 'Aaliyah Brooks', initials: 'AB', detail: '4th year · Sociology', status: 'shift', statusNote: 'On shift until 14:00', lastAction: '12:12', handled: 14 },
  { id: 'l6', name: 'Tomás Echeverría', initials: 'TE', detail: '3rd year · Biology', status: 'off', statusNote: 'Off · next shift Fri 09:00', lastAction: 'Wed 18:40', handled: 0 },
  { id: 'l7', name: 'Hannah Lindqvist', initials: 'HL', detail: '2nd year · History', status: 'shift', statusNote: 'On shift until 17:00', lastAction: '12:02', handled: 6 },
  { id: 'l8', name: 'Darnell Price', initials: 'DP', detail: '4th year · Kinesiology', status: 'session', statusNote: 'Family panel, back 13:30', lastAction: '09:40', handled: 2 },
  { id: 'l9', name: 'Mei-Ling Chou', initials: 'MC', detail: '3rd year · Computer Science', status: 'shift', statusNote: 'On shift until 15:30', lastAction: '12:13', handled: 12 },
  { id: 'l10', name: 'Owen Gallagher', initials: 'OG', detail: '2nd year · Physics', status: 'off', statusNote: 'Off · next shift 17:00', lastAction: 'Wed 21:15', handled: 0 },
  { id: 'l11', name: 'Fatima Al-Sayed', initials: 'FA', detail: '3rd year · Public Health', status: 'session', statusNote: 'Leading Session D, back 13:00', lastAction: '09:58', handled: 3 },
  { id: 'l12', name: 'Jasmine Nguyen', initials: 'JN', detail: '4th year · Communication', status: 'shift', statusNote: 'On shift until 16:00', lastAction: '12:06', handled: 8 },
  { id: 'l13', name: 'Ravi Subramanian', initials: 'RS', detail: '3rd year · Mathematics', status: 'off', statusNote: 'Off · next shift 16:00', lastAction: 'Wed 22:47', handled: 0 },
  { id: 'l14', name: 'Lauren Whitaker', initials: 'LW', detail: '4th year · Nursing', status: 'session', statusNote: 'Accessibility session, back 14:00', lastAction: '10:15', handled: 2 },
  { id: 'l15', name: 'Isaiah Mensah', initials: 'IM', detail: '2nd year · Mechanical Eng.', status: 'off', statusNote: 'Off · next shift Fri 12:00', lastAction: 'Wed 16:20', handled: 0 },
  { id: 'l16', name: 'Camila Ortiz', initials: 'CO', detail: '3rd year · Cognitive Science', status: 'shift', statusNote: 'On shift until 18:00', lastAction: '12:14', handled: 15 },
  { id: 'l17', name: 'Ethan Park', initials: 'EP', detail: '2nd year · Civil Eng.', status: 'session', statusNote: 'Campus tour, back 13:00', lastAction: '09:47', handled: 1 },
  { id: 'l18', name: 'Noor Haddad', initials: 'NH', detail: '4th year · Visual Arts', status: 'off', statusNote: 'Off · next shift 18:00', lastAction: 'Wed 23:05', handled: 0 },
];

export type GroupKind = 'Residence hall' | 'Community' | 'International' | 'Practical' | 'Major';
export interface Group {
  id: string;
  name: string;
  kind: GroupKind;
  members: number;
  posts24h: number;
  leaders: string[];
}

const g = (id: string, name: string, kind: GroupKind, members: number, posts24h: number, leaders: string[]): Group => ({ id, name, kind, members, posts24h, leaders });

export const GROUPS: Group[] = [
  g('hartwell', 'Hartwell Hall 2030', 'Residence hall', 486, 74, ['l1']),
  g('ostrander', 'Ostrander Hall 2030', 'Residence hall', 512, 81, ['l2']),
  g('pemberton', 'Pemberton Hall 2030', 'Residence hall', 344, 38, ['l6']),
  g('delacroix', 'Delacroix Hall 2030', 'Residence hall', 398, 52, ['l17']),
  g('linden', 'Linden Court 2030', 'Residence hall', 276, 29, ['l7']),
  g('marisol', 'Marisol Towers 2030', 'Residence hall', 521, 88, ['l9']),
  g('sycamore', 'Sycamore Hall 2030', 'Residence hall', 307, 33, ['l12']),
  g('kessler', 'Kessler Hall 2030', 'Residence hall', 289, 31, ['l10']),
  g('bayview', 'Bayview Hall 2030', 'Residence hall', 362, 44, ['l14']),
  g('alder', 'Alder Commons 2030', 'Residence hall', 254, 27, ['l17']),
  g('juniper', 'Juniper Hall 2030', 'Residence hall', 318, 36, ['l18']),

  g('commuters', 'Commuters 2030', 'Community', 541, 47, ['l2']),
  g('transfer', 'Transfer-adjacent', 'Community', 233, 18, ['l12']),
  g('firstgen', 'First-Gen 2030', 'Community', 1104, 63, ['l1']),
  g('outofstate', 'Out-of-State 2030', 'Community', 872, 41, ['l16']),
  g('lgbtq', 'LGBTQ+ Arrivals', 'Community', 418, 22, ['l18']),
  g('access', 'Disability & Access 2030', 'Community', 196, 11, ['l14']),
  g('faith', 'Faith & Spirituality Connect', 'Community', 241, 9, ['l11']),
  g('athletes', 'Student-Athletes 2030', 'Community', 162, 14, ['l8']),
  g('rotc', 'ROTC & Military-connected', 'Community', 88, 4, ['l10']),
  g('honors', 'Honors College 2030', 'Community', 403, 26, ['l18']),

  g('intl-eastasia', 'International · East Asia', 'International', 389, 34, ['l4']),
  g('intl-southasia', 'International · South Asia', 'International', 276, 23, ['l13']),
  g('intl-seasia', 'International · Southeast Asia', 'International', 142, 12, ['l4']),
  g('intl-mena', 'International · Middle East & N. Africa', 'International', 97, 8, ['l11']),
  g('intl-ssa', 'International · Sub-Saharan Africa', 'International', 71, 6, ['l15']),
  g('intl-latam', 'International · Latin America & Caribbean', 'International', 164, 15, ['l3']),
  g('intl-europe', 'International · Europe', 'International', 118, 9, ['l3']),
  g('intl-canoce', 'International · Canada & Oceania', 'International', 64, 5, ['l15']),

  g('general', 'Class of 2030 General', 'Practical', 4168, 168, ['l16']),
  g('orientation', 'Orientation Q&A', 'Practical', 3027, 146, ['l16']),
  g('roommates', 'Roommate Search 2030', 'Practical', 2641, 143, ['l5']),
  g('offcampus', 'Off-campus Housing', 'Practical', 612, 58, ['l5']),
  g('buysell', 'Buy/Sell & Textbooks', 'Practical', 1893, 97, ['l5']),
  g('rides', 'Rides & Carpools', 'Practical', 724, 39, ['l8']),
  g('dining', 'Dining & Meal Plans', 'Practical', 1312, 49, ['l12']),
  g('parking', 'Parking & Transportation', 'Practical', 958, 42, ['l8']),

  g('m-bio', 'Biology majors', 'Major', 468, 21, ['l6']),
  g('m-chem', 'Chemistry majors', 'Major', 152, 6, ['l6']),
  g('m-cs', 'Computer Science majors', 'Major', 487, 33, ['l9']),
  g('m-ds', 'Data Science majors', 'Major', 211, 10, ['l9']),
  g('m-mech', 'Mechanical Engineering majors', 'Major', 236, 12, ['l15']),
  g('m-ee', 'Electrical Engineering majors', 'Major', 174, 8, ['l4']),
  g('m-bioe', 'Bioengineering majors', 'Major', 189, 9, ['l13']),
  g('m-civil', 'Civil & Environmental Eng. majors', 'Major', 121, 5, ['l17']),
  g('m-math', 'Mathematics majors', 'Major', 133, 6, ['l13']),
  g('m-phys', 'Physics majors', 'Major', 96, 4, ['l10']),
  g('m-econ', 'Economics majors', 'Major', 298, 14, ['l2']),
  g('m-bus', 'Business majors', 'Major', 342, 19, ['l2']),
  g('m-psych', 'Psychology majors', 'Major', 377, 17, ['l1']),
  g('m-polisci', 'Political Science majors', 'Major', 204, 9, ['l3']),
  g('m-comm', 'Communication majors', 'Major', 167, 7, ['l3']),
  g('m-nursing', 'Nursing majors', 'Major', 143, 11, ['l14']),
  g('m-premed', 'Pre-med Track', 'Major', 612, 28, ['l11']),
  g('m-ph', 'Public Health majors', 'Major', 188, 8, ['l1']),
  g('m-cogsci', 'Cognitive Science majors', 'Major', 226, 10, ['l9']),
  g('m-undeclared', 'Undeclared / Exploring', 'Major', 534, 24, ['l7']),
  g('m-art', 'Visual Arts majors', 'Major', 102, 5, ['l18']),
  g('m-music', 'Music majors', 'Major', 64, 3, ['l18']),
  g('m-english', 'English & Literature majors', 'Major', 118, 5, ['l7']),
  g('m-history', 'History majors', 'Major', 79, 3, ['l7']),
];

export const groupById = (id: string) => GROUPS.find((x) => x.id === id)!;
export const leaderById = (id: string) => LEADERS.find((x) => x.id === id)!;

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  hours: string;
  use: string;
}

export const CONTACTS: Contact[] = [
  { id: 'counseling', name: 'Counseling Center on-call', role: 'Licensed clinician, 24/7 consultation line', phone: '(555) 014-2277', hours: '24/7', use: 'Student distress, self-harm language, crisis consultation' },
  { id: 'dos', name: 'Dean of Students office', role: 'Student Care & Case Management', phone: '(555) 014-1830', hours: 'Mon–Fri 8:00–17:00 · after hours via UPD', use: 'Case management, welfare follow-up, conduct' },
  { id: 'upd', name: 'University Police (non-emergency)', role: 'Dispatch', phone: '(555) 014-4357', hours: '24/7 · emergencies call 911', use: 'Threats, imminent risk, welfare checks off-platform' },
  { id: 'mbeki', name: 'D. Mbeki', role: 'Housing Fraud Liaison, Residential Life', phone: '(555) 014-6612', hours: 'Mon–Fri 8:30–17:00', use: 'Fake sublets, deposit scams, impersonation of housing staff' },
];

export const CALENDAR = [
  { time: '08:30–11:45', title: 'Orientation Session C · welcome + advising blocks', state: 'done' },
  { time: '13:30–15:00', title: 'Orientation Session D · family welcome, Main Ballroom', state: 'next' },
  { time: '15:30–16:00', title: 'OL check-in (all leaders)', state: 'later' },
];
export const NEXT_SESSION_AT = t(13, 30);
