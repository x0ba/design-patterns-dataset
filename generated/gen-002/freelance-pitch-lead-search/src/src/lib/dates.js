// All date logic runs against a fixed "today" so the mock state is stable.
export const TODAY = '2026-11-17'; // Tuesday
export const FRIDAY = '2026-11-20'; // Priya's pitch-by day
export const LAST_CHECK = '2026-11-14'; // when saved searches were last reviewed

const DAY_MS = 86400000;

export function dayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function daysBetween(fromIso, toIso) {
  return dayNum(toIso) - dayNum(fromIso);
}

export function addDays(iso, n) {
  return new Date((dayNum(iso) + n) * DAY_MS).toISOString().slice(0, 10);
}

const fmtFull = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const fmtShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

const asDate = (iso) => new Date(dayNum(iso) * DAY_MS);

export const fmtDate = (iso) => fmtFull.format(asDate(iso));
export const fmtShortDate = (iso) => fmtShort.format(asDate(iso));
export const fmtWeekdayDate = (iso) => fmtWeekday.format(asDate(iso));

// "3 days ago", "today", "in 4 days" relative to TODAY.
export function relativeToToday(iso) {
  const n = daysBetween(TODAY, iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 0) return `in ${n} days`;
  return `${-n} days ago`;
}

export function daysSince(iso) {
  return daysBetween(iso, TODAY);
}

export const WINDOWS = [
  { key: 'all', label: 'All time', start: null },
  { key: '12m', label: 'Last 12 months', start: '2025-11-17' },
  { key: '6m', label: 'Last 6 months', start: '2026-05-17' },
  { key: '3m', label: 'Last 3 months', start: '2026-08-17' },
];

export const SIX_MONTHS_START = '2026-05-17';
