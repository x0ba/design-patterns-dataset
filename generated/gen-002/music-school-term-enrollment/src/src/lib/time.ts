export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

/**
 * The front desk clock. The demo is opened at the moment in the call:
 * Monday Nov 16, 2026, 2:38 PM, the last day of early enrollment.
 * It then ticks forward from there in real time.
 */
const DEMO_START_MS = new Date(2026, 10, 16, 14, 38, 0).getTime();
const PAGE_LOADED_MS = Date.now();
export function nowMs(): number {
  return DEMO_START_MS + (Date.now() - PAGE_LOADED_MS);
}

/** Early-enrollment rate ends Nov 16 at 11:59 pm. */
export const EARLY_DEADLINE_MS = new Date(2026, 10, 16, 23, 59, 0).getTime();

export const TERM = {
  name: 'Winter 2027',
  startMs: new Date(2027, 0, 11).getTime(),
  endMs: new Date(2027, 2, 20, 23, 59, 0).getTime(),
  weeks: 10,
  rangeLabel: 'Jan 11 – Mar 20',
};

/** Installment due dates for a 3-installment plan. */
export const INSTALLMENT_DATES_MS = [
  new Date(2026, 10, 16).getTime(),
  new Date(2026, 11, 15).getTime(),
  new Date(2027, 0, 15).getTime(),
];

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function fmtDateTime(ms: number): string {
  return `${fmtDate(ms)} · ${fmtTime(ms)}`;
}

/** "9h 20m", "45m", or "6d 23h" for longer windows. Null once the deadline has passed. */
export function fmtCountdown(ms: number, deadlineMs: number): string | null {
  const left = deadlineMs - ms;
  if (left <= 0) return null;
  const totalMin = Math.floor(left / (60 * 1000));
  const days = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const m = totalMin % 60;
  if (days > 0) return `${days}d ${h}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
