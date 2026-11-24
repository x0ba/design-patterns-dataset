const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_MS = 24 * 60 * 60 * 1000;

export function clock(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export function monthDay(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayDiff(a: number, b: number): number {
  return Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS);
}

export function relTime(ts: number, now: number): string {
  const diff = now - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)} min ago`;
  const days = dayDiff(now, ts);
  if (days === 0) return `Today, ${clock(ts)}`;
  if (days === 1) return `Yesterday, ${clock(ts)}`;
  return `${monthDay(ts)}, ${clock(ts)}`;
}

export function dayGroup(ts: number, now: number): string {
  const days = dayDiff(now, ts);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return monthDay(ts);
}

export function parseISODate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function fmtDue(iso: string): string {
  return monthDay(parseISODate(iso));
}

export function daysUntil(iso: string, now: number): number {
  return dayDiff(parseISODate(iso), now);
}

export function dueHint(iso: string, now: number): { text: string; tone: 'late' | 'soon' | 'calm' } {
  const days = daysUntil(iso, now);
  if (days < 0) return { text: 'Overdue', tone: 'late' };
  if (days === 0) return { text: 'Due today', tone: 'soon' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'soon' };
  if (days <= 3) return { text: `Due in ${days} days`, tone: 'soon' };
  return { text: fmtDue(iso), tone: 'calm' };
}
