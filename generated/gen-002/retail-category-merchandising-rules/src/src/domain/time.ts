// Calendar helpers. Dates are ISO strings in store time (Eastern). All arithmetic is done in UTC
// so the viewer's browser time zone can never shift a merchandising date by a day.

/** "Today" for this workspace. Fixed so the demo always opens on the same working day. */
export const TODAY = '2026-11-16';
/** Store-local "now" used for schedule validation. */
export const NOW_DATETIME = '2026-11-16T14:41';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Nov 27" */
export function shortDate(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Nov 27, 2026" */
export function longDate(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Fri, Nov 27" */
export function weekdayDate(iso: string): string {
  const d = parseDate(iso);
  return `${WEEKDAYS[d.getUTCDay()]}, ${shortDate(iso)}`;
}

/** "Nov 27–Dec 18" */
export function dateRange(start: string, end: string): string {
  return `${shortDate(start)}–${shortDate(end)}`;
}

/** "Wed, Nov 25 · 6:00 AM ET" from YYYY-MM-DDTHH:mm */
export function formatDateTime(local: string): string {
  const [date, time] = local.split('T');
  const [hh, mm] = (time ?? '00:00').split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${weekdayDate(date)} · ${h12}:${String(mm).padStart(2, '0')} ${suffix} ET`;
}

export function dayDiff(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export function inclusiveDays(start: string, end: string): number {
  return dayDiff(start, end) + 1;
}

export function isValidDate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(parseDate(iso).getTime());
}
