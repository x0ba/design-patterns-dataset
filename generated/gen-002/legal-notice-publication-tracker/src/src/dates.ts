// Date helpers. All dates are local-time. Date-only values are 'YYYY-MM-DD' strings.

export const DAY = 86_400_000;

/** The moment Gloria opens the app: Monday, Nov 17 2025, 8:14 AM. */
export const SCENARIO_NOW = new Date(2025, 10, 17, 8, 14, 0);

/** Start of the "since Friday" window. */
export const SINCE_FRIDAY = new Date(2025, 10, 14, 0, 0, 0);

export function d(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function iso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function addDays(isoDate: string, n: number): string {
  const x = d(isoDate);
  x.setDate(x.getDate() + n);
  return iso(x);
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((d(b).getTime() - d(a).getTime()) / DAY);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', opts);
    fmtCache.set(key, f);
  }
  return f;
}

/** "Mon Nov 24" */
export function fDay(isoDate: string): string {
  return fmt({ weekday: 'short', month: 'short', day: 'numeric' }).format(d(isoDate)).replace(',', '');
}
/** "Nov 24" */
export function fShort(isoDate: string): string {
  return fmt({ month: 'short', day: 'numeric' }).format(d(isoDate));
}
/** "Monday, November 24, 2025" */
export function fLong(isoDate: string): string {
  return fmt({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d(isoDate));
}
/** "8:14 AM" */
export function fTime(date: Date): string {
  return fmt({ hour: 'numeric', minute: '2-digit' }).format(date);
}
/** "Fri 4:11 PM" */
export function fDayTime(date: Date): string {
  return `${fmt({ weekday: 'short' }).format(date)} ${fTime(date)}`;
}
/** "Fri Nov 14, 4:11 PM" */
export function fStamp(date: Date): string {
  return `${fDay(iso(date))}, ${fTime(date)}`;
}

export function fDuration(ms: number): string {
  if (ms <= 0) return 'passed';
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ---------------------------------------------------------------------------
// Bellmont Courier-Ledger print & legal-desk calendar (post-merger)
// ---------------------------------------------------------------------------

/** Print editions: Tue, Wed, Thu, Sat. */
export const PRINT_WEEKDAYS = [2, 3, 4, 6];

export const CANCELLED_EDITIONS: Record<string, string> = {
  '2025-11-27': 'No print edition — Thanksgiving. Legals carried in Wed Nov 26.',
  '2025-12-25': 'No print edition — Christmas Day.',
  '2026-01-01': "No print edition — New Year's Day.",
};

/** Days the legal desk is closed (weekends are closed too). */
export const LEGAL_DESK_CLOSED = new Set(['2025-11-27', '2025-11-28', '2025-12-25', '2026-01-01']);

export function isPrintDay(isoDate: string): boolean {
  return PRINT_WEEKDAYS.includes(d(isoDate).getDay());
}

export function editionExists(isoDate: string): boolean {
  return isPrintDay(isoDate) && !CANCELLED_EDITIONS[isoDate];
}

export function isBusinessDay(isoDate: string): boolean {
  const wd = d(isoDate).getDay();
  return wd !== 0 && wd !== 6 && !LEGAL_DESK_CLOSED.has(isoDate);
}

/** Revised rule (effective Nov 14): 12:00 PM, two business days before the edition. */
export function cutoffFor(editionIso: string): Date {
  let cur = editionIso;
  let count = 0;
  while (count < 2) {
    cur = addDays(cur, -1);
    if (isBusinessDay(cur)) count++;
  }
  const c = d(cur);
  c.setHours(12, 0, 0, 0);
  return c;
}

export interface Edition {
  date: string;
  exists: boolean;
  cancelledReason?: string;
  cutoff: Date;
}

/** All print-day editions (including cancelled ones) in [fromIso, toIso]. */
export function editionsBetween(fromIso: string, toIso: string): Edition[] {
  const out: Edition[] = [];
  for (let cur = fromIso; cur <= toIso; cur = addDays(cur, 1)) {
    if (!isPrintDay(cur)) continue;
    out.push({
      date: cur,
      exists: editionExists(cur),
      cancelledReason: CANCELLED_EDITIONS[cur],
      cutoff: cutoffFor(cur),
    });
  }
  return out;
}

/** First edition whose cutoff hasn't passed. */
export function nextBookableEdition(now: Date): Edition {
  let cur = iso(now);
  for (let i = 0; i < 60; i++) {
    if (editionExists(cur) && cutoffFor(cur) > now) {
      return { date: cur, exists: true, cutoff: cutoffFor(cur) };
    }
    cur = addDays(cur, 1);
  }
  throw new Error('no edition');
}

export function weekdayShort(isoDate: string) {
  return fmt({ weekday: 'short' }).format(d(isoDate));
}
