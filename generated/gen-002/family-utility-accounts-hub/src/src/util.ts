// The moment Danielle opens the app: Sunday evening, Nov 15, 2026.
export const NOW = new Date(2026, 10, 15, 19, 42);

const DAY = 86400000;

export function d(iso: string): Date {
  const [y, m, dd] = iso.split('-').map(Number);
  return new Date(y, m - 1, dd);
}

export function iso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function addDays(date: Date, n: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from NOW to the date (positive = future). */
export function daysFromNow(isoDate: string): number {
  return Math.round((startOfDay(d(isoDate)).getTime() - startOfDay(NOW).getTime()) / DAY);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((d(b).getTime() - d(a).getTime()) / DAY);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Nov 12" or "Nov 12, 2025" when not the current year */
export function fmtDate(isoDate: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const dt = d(isoDate);
  const showYear = opts.year ?? dt.getFullYear() !== NOW.getFullYear();
  const base = `${MONTHS[dt.getMonth()]} ${dt.getDate()}${showYear ? `, ${dt.getFullYear()}` : ''}`;
  return opts.weekday ? `${WEEKDAYS[dt.getDay()]}, ${base}` : base;
}

export function fmtLongDate(isoDate: string): string {
  const dt = d(isoDate);
  return `${WEEKDAYS_LONG[dt.getDay()]}, ${MONTHS_LONG[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

export function fmtMonth(isoDate: string, short = true): string {
  const dt = d(isoDate);
  return short ? `${MONTHS[dt.getMonth()]} ’${String(dt.getFullYear()).slice(2)}` : `${MONTHS_LONG[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function fmtNow(): string {
  const h = NOW.getHours();
  const m = String(NOW.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS_LONG[NOW.getDay()]}, ${MONTHS_LONG[NOW.getMonth()]} ${NOW.getDate()} · ${((h + 11) % 12) + 1}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function relDays(isoDate: string): string {
  const n = daysFromNow(isoDate);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 0) return `in ${n} days`;
  return `${-n} days ago`;
}

// ---------- Business hours ----------
export type WeekHours = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, [number, number]>>;
export type Hours = WeekHours | '24/7';

export const hm = (h: number, m = 0) => h * 60 + m;

export function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function hoursSummary(hours: Hours): string {
  if (hours === '24/7') return 'Open 24 hours, every day';
  const order = [1, 2, 3, 4, 5, 6, 0] as const;
  const parts: string[] = [];
  let i = 0;
  while (i < order.length) {
    const day = order[i];
    const r = hours[day];
    if (!r) { i++; continue; }
    let j = i;
    while (j + 1 < order.length) {
      const nx = hours[order[j + 1]];
      if (nx && nx[0] === r[0] && nx[1] === r[1]) j++;
      else break;
    }
    const label = i === j ? WEEKDAYS[day] : `${WEEKDAYS[day]}–${WEEKDAYS[order[j]]}`;
    parts.push(`${label} ${fmtTime(r[0])}–${fmtTime(r[1])}`);
    i = j + 1;
  }
  return parts.join(' · ');
}

export interface OpenState {
  open: boolean;
  label: string;
}

export function hoursStatus(hours: Hours, now: Date = NOW): OpenState {
  if (hours === '24/7') return { open: true, label: 'Open now · 24/7' };
  const day = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const mins = now.getHours() * 60 + now.getMinutes();
  const today = hours[day];
  if (today && mins >= today[0] && mins < today[1]) {
    return { open: true, label: `Open now · until ${fmtTime(today[1])}` };
  }
  for (let k = 0; k <= 7; k++) {
    const dd = ((day + k) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const r = hours[dd];
    if (!r) continue;
    if (k === 0 && mins >= r[0]) continue;
    const when = k === 0 ? 'today' : k === 1 ? `tomorrow (${WEEKDAYS[dd]})` : WEEKDAYS[dd];
    return { open: false, label: `Closed now · opens ${when} ${fmtTime(r[0])}` };
  }
  return { open: false, label: 'Closed' };
}

export function last4(acct: string): string {
  const digits = acct.replace(/\D/g, '');
  return digits.slice(-4);
}

export function plural(n: number, word: string, pl?: string) {
  return `${n} ${n === 1 ? word : pl ?? word + 's'}`;
}
