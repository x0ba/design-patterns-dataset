// Formatting helpers. Times are shown in the office's local clock, in the
// AP-style form the release team uses ("2:22 p.m.").

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtClock(ms: number): string {
  const d = new Date(ms);
  const h24 = d.getHours();
  const h = h24 % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${h24 >= 12 ? 'p.m.' : 'a.m.'}`;
}

export function fmtDayTime(ms: number): string {
  const d = new Date(ms);
  return `${DAYS[d.getDay()]} ${fmtClock(ms)}`;
}

export function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function fmtRelative(ms: number, now: number): string {
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 12 && new Date(ms).getDate() === new Date(now).getDate()) return `${hr} h ago`;
  return `${fmtDayTime(ms)}`;
}

/** Countdown text such as "1 d 18 h 8 m". Returns "now" once the target has passed. */
export function fmtCountdown(target: number, now: number): string {
  let diff = target - now;
  if (diff <= 0) return 'now';
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hrs = Math.floor(diff / 3600000);
  diff -= hrs * 3600000;
  const mins = Math.floor(diff / 60000);
  if (days > 0) return `${days} d ${hrs} h ${mins} m`;
  if (hrs > 0) return `${hrs} h ${mins} m`;
  return `${mins} m`;
}

export function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export function fmtSigned(n: number): string {
  const s = Math.abs(n).toLocaleString('en-US');
  if (n > 0) return `+${s}`;
  if (n < 0) return `−${s}`;
  return '0';
}

export function fmtPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtSignedPct(n: number): string {
  const s = Math.abs(n).toFixed(1);
  if (n > 0) return `+${s}%`;
  if (n < 0) return `−${s}%`;
  return '0.0%';
}

export function fmtPoints(n: number): string {
  const s = Math.abs(n).toFixed(1);
  if (n > 0) return `+${s} pts`;
  if (n < 0) return `−${s} pts`;
  return '0.0 pts';
}

export function fmtDollars(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

export function fmtValue(v: number, unit: 'jobs' | 'percent' | 'rate' | 'dollars' | 'points'): string {
  switch (unit) {
    case 'jobs':
      return fmtSigned(v);
    case 'percent':
      return fmtSignedPct(v);
    case 'rate':
      return fmtPercent(v);
    case 'dollars':
      return fmtDollars(v);
    case 'points':
      return fmtPoints(v);
  }
}

/** Plain level values (not signed) for line and table axes. */
export function fmtLevel(v: number, unit: 'jobs' | 'percent' | 'rate' | 'dollars' | 'points'): string {
  switch (unit) {
    case 'jobs':
      return fmtInt(v);
    case 'percent':
    case 'rate':
      return fmtPercent(v);
    case 'dollars':
      return fmtDollars(v);
    case 'points':
      return fmtPoints(v);
  }
}

export function fmtAxis(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${Math.round(v / 1000).toLocaleString('en-US')}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
