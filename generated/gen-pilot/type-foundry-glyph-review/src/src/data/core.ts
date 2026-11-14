// Core reference data for the Calloway family workspace.
// "Now" is Thursday 13 November, 09:14 Lisbon time.

export type StyleId = 'light' | 'regular' | 'semibold' | 'bold' | 'italic' | 'bold-italic';
export type Script = 'latin' | 'greek';
export type PersonId = 'ines' | 'tomas' | 'eleni' | 'jonas' | 'marieke';
export type GlyphStatus = 'approved' | 'review' | 'draft';

export interface StyleDef {
  id: StyleId;
  name: string;
  short: string;
  weight: number;
  italic: boolean;
  fileKey: string; // e.g. 400-normal
}

export const STYLES: StyleDef[] = [
  { id: 'light', name: 'Light', short: 'Lt', weight: 300, italic: false, fileKey: '300-normal' },
  { id: 'regular', name: 'Regular', short: 'Rg', weight: 400, italic: false, fileKey: '400-normal' },
  { id: 'semibold', name: 'Semibold', short: 'Sb', weight: 600, italic: false, fileKey: '600-normal' },
  { id: 'bold', name: 'Bold', short: 'Bd', weight: 700, italic: false, fileKey: '700-normal' },
  { id: 'italic', name: 'Italic', short: 'It', weight: 400, italic: true, fileKey: '400-italic' },
  { id: 'bold-italic', name: 'Bold Italic', short: 'BdIt', weight: 700, italic: true, fileKey: '700-italic' },
];

export const styleById = (id: StyleId) => STYLES.find((s) => s.id === id)!;

export interface Person {
  id: PersonId;
  name: string;
  first: string;
  initials: string;
  role: string;
  org: string;
  city: string;
  tz: string;
  tzOffsetFromLisbon: number; // hours
  color: string;
}

export const PEOPLE: Record<PersonId, Person> = {
  ines: {
    id: 'ines', name: 'Ines Varga', first: 'Ines', initials: 'IV', role: 'Owner · lead type designer',
    org: 'Serifhouse', city: 'Lisbon', tz: 'WET', tzOffsetFromLisbon: 0, color: '#6b4f8a',
  },
  tomas: {
    id: 'tomas', name: 'Tomás Reis', first: 'Tomás', initials: 'TR', role: 'Co-founder · type designer',
    org: 'Serifhouse', city: 'Lisbon', tz: 'WET', tzOffsetFromLisbon: 0, color: '#7a5c2e',
  },
  eleni: {
    id: 'eleni', name: 'Eleni Markou', first: 'Eleni', initials: 'EM', role: 'Contractor · Greek',
    org: 'Independent', city: 'Athens', tz: 'EET', tzOffsetFromLisbon: 2, color: '#2f5d8a',
  },
  jonas: {
    id: 'jonas', name: 'Jonas Brandt', first: 'Jonas', initials: 'JB', role: 'Contractor · spacing & kerning',
    org: 'Independent', city: 'Hamburg', tz: 'CET', tzOffsetFromLisbon: 1, color: '#3d7a4f',
  },
  marieke: {
    id: 'marieke', name: 'Marieke de Wit', first: 'Marieke', initials: 'MW', role: 'Client · art director',
    org: 'De Getijde', city: 'Amsterdam', tz: 'CET', tzOffsetFromLisbon: 1, color: '#9a3f3a',
  },
};

// Time model: minutes since Mon 10 Nov 00:00 Lisbon. Keeps date math trivial and calendar-agnostic.
const DAY = 24 * 60;
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const t = (day: 'Fri7' | 'Sat8' | 'Sun9' | 'Mon' | 'Tue' | 'Wed' | 'Thu', hh: number, mm: number) => {
  const map = { Fri7: -3, Sat8: -2, Sun9: -1, Mon: 0, Tue: 1, Wed: 2, Thu: 3 } as const;
  return map[day] * DAY + hh * 60 + mm;
};
export const NOW = t('Thu', 9, 14);
export const LAST_REVIEW = t('Tue', 16, 40);
export const DEADLINE_LABEL = '22 November';
export const DAYS_LEFT = 9;
export const CLIENT = 'De Getijde';

const DATE_LABELS: Record<number, string> = {
  [-3]: 'Fri 7 Nov', [-2]: 'Sat 8 Nov', [-1]: 'Sun 9 Nov', 0: 'Mon 10 Nov', 1: 'Tue 11 Nov', 2: 'Wed 12 Nov', 3: 'Thu 13 Nov',
};

const pad = (n: number) => String(n).padStart(2, '0');
export const clock = (m: number) => `${pad(Math.floor((((m % DAY) + DAY) % DAY) / 60))}:${pad(((m % 60) + 60) % 60)}`;
export const dayIndex = (m: number) => Math.floor(m / DAY);
export const dateLabel = (m: number) => DATE_LABELS[dayIndex(m)] ?? '';
export const fullStamp = (m: number) => `${dateLabel(m)}, ${clock(m)}`;

export function rel(m: number, now = NOW): string {
  const d = now - m;
  if (d < 2) return 'just now';
  if (d < 60) return `${d} min ago`;
  if (d < 60 * 20) return `${Math.round(d / 60)} h ago`;
  const days = dayIndex(now) - dayIndex(m);
  if (days === 1) return `yesterday ${clock(m)}`;
  if (days <= 6) return `${days} days ago`;
  return dateLabel(m);
}

export const shortStamp = (m: number, now = NOW) => {
  const days = dayIndex(now) - dayIndex(m);
  if (days === 0) return `today ${clock(m)}`;
  if (days === 1) return `yesterday ${clock(m)}`;
  return `${dateLabel(m).slice(0, 3)} ${clock(m)}`;
};
