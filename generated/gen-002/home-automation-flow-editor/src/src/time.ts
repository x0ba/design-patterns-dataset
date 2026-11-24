export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number];

export function weekdayOf(iso: string): number {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function fmtDate(iso: string, opts: { weekday?: boolean; year?: boolean } = { weekday: true }): string {
  const [y, m, d] = parts(iso);
  const wd = opts.weekday === false ? '' : `${DAY_SHORT[weekdayOf(iso)]}, `;
  return `${wd}${MONTHS[m - 1]} ${d}${opts.year ? `, ${y}` : ''}`;
}

export function fmtTime(min: number, compact = false): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ap = h < 12 ? 'AM' : 'PM';
  if (compact && mm === 0) return `${h12} ${ap}`;
  return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
}

export function fmtDur(min: number): string {
  const neg = min < 0;
  let m = Math.abs(min);
  const d = Math.floor(m / 1440);
  m -= d * 1440;
  const h = Math.floor(m / 60);
  m -= h * 60;
  const s = `${d ? `${d}d` : ''}${h ? `${h}h` : ''}${m || (!d && !h) ? `${m}m` : ''}`;
  return neg ? `-${s}` : s;
}

export function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function fromHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Describe a set of weekdays compactly, e.g. "Sun–Thu", "Mon, Wed" */
export function describeDays(days: number[]): string {
  const set = [...new Set(days)].sort((a, b) => a - b);
  if (set.length === 7) return 'Every day';
  if (set.length === 0) return 'No days';
  if (set.join() === '1,2,3,4,5') return 'Mon–Fri';
  if (set.join() === '0,6') return 'Sat & Sun';
  // find a contiguous run (allowing wrap)
  for (let start = 0; start < 7; start++) {
    if (!set.includes(start) || set.includes((start + 6) % 7)) continue;
    let len = 0;
    while (set.includes((start + len) % 7) && len < 7) len++;
    if (len === set.length && len >= 3) return `${DAY_SHORT[start]}–${DAY_SHORT[(start + len - 1) % 7]}`;
  }
  return set.map((d) => DAY_SHORT[d]).join(', ');
}
