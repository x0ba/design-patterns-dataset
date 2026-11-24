// Dates are handled as ISO calendar strings ("2026-04-02") so no timezone shifts
// can move a date. The app runs on a fixed clock so the scenario is reproducible.

export const NOW_ISO = '2026-11-19';
export const NOW_MINUTES = 19 * 60 + 40; // 7:40 PM on NOW_ISO

export interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

export function parseIso(iso: string): Ymd {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function toIso({ y, m, d }: Ymd): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function isIso(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const { y, m, d } = parseIso(s);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Accepts MM/DD/YYYY (what Darnell types) or YYYY-MM-DD (what the date input gives). */
export function parseUserDate(input: string): string | null {
  const trimmed = input.trim();
  if (isIso(trimmed)) return trimmed;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (us) {
    const iso = toIso({ y: Number(us[3]), m: Number(us[1]), d: Number(us[2]) });
    return isIso(iso) ? iso : null;
  }
  return null;
}

export function addDays(iso: string, n: number): string {
  const { y, m, d } = parseIso(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toIso({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
}

export function addMonths(iso: string, n: number): string {
  const { y, m, d } = parseIso(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return toIso({ y: ny, m: nm, d: Math.min(d, lastDay) });
}

export function addYears(iso: string, n: number): string {
  return addMonths(iso, n * 12);
}

/** Age in whole years on a given date. */
export function ageOn(dobIso: string, onIso: string): number {
  const dob = parseIso(dobIso);
  const on = parseIso(onIso);
  let age = on.y - dob.y;
  if (on.m < dob.m || (on.m === dob.m && on.d < dob.d)) age -= 1;
  return age;
}

/** Last calendar day of a YYYY-MM month string. */
export function monthEndIso(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(last).padStart(2, '0')}`;
}

export function usDate(iso: string): string {
  const { y, m, d } = parseIso(iso);
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
}

export function usMonthYear(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${String(m).padStart(2, '0')}/${y}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekday(iso: string): string {
  const { y, m, d } = parseIso(iso);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function longDate(iso: string): string {
  const { y, m, d } = parseIso(iso);
  return `${weekday(iso)}, ${MONTHS[m - 1]} ${d}, ${y}`;
}

export function shortDate(iso: string): string {
  const { y, m, d } = parseIso(iso);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function daysBetween(fromIso: string, toIsoStr: string): number {
  const a = parseIso(fromIso);
  const b = parseIso(toIsoStr);
  return Math.round(
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000,
  );
}

export function timeLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`;
}
