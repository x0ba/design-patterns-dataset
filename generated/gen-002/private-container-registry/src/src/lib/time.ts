/** The moment the console is "opened": Monday 16 Nov 2026, 09:12 Pacific. */
export const NOW_ISO = '2026-11-16T09:12:00-08:00';
export const NOW_MS = Date.parse(NOW_ISO);

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function fmtDate(iso: string): string {
  return DATE.format(new Date(iso));
}

const SHORT_DATE_TIME = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Table-friendly stamp: "Nov 11, 4:40 PM" in the current year, otherwise the full date. */
export function fmtShort(iso: string): string {
  const d = new Date(iso);
  return d.getFullYear() === new Date(NOW_MS).getFullYear() ? SHORT_DATE_TIME.format(d) : fmtDateTime(iso);
}

export function fmtDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** Milliseconds between the mock "now" and an ISO timestamp. */
export function ageMs(iso: string): number {
  return NOW_MS - Date.parse(iso);
}

export function relTime(iso: string | null): string {
  if (!iso) return 'never';
  const d = ageMs(iso);
  if (d < HOUR) return `${Math.max(1, Math.round(d / MIN))} min ago`;
  if (d < DAY) {
    const h = Math.floor(d / HOUR);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(d / DAY);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return fmtDate(iso);
}
