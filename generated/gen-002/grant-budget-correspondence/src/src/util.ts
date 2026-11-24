import { NOW } from './data';

export function parse(s: string): Date {
  const [d, t = '00:00'] = s.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = t.split(':').map(Number);
  return new Date(y, m - 1, day, h, min);
}

export function toStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const loadedAt = Date.now();
/** The app's clock: Monday Nov 16, 2026, 9:38 AM, advancing in real time from page load. */
export function nowStr(): string {
  const base = parse(NOW);
  return toStr(new Date(base.getTime() + (Date.now() - loadedAt)));
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function time(s: string): string {
  const d = parse(s);
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function shortDate(s: string): string {
  const d = parse(s);
  if (sameDay(d, parse(NOW))) return time(s);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

export function dayDate(s: string): string {
  const d = parse(s);
  return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
}

export function longDate(s: string): string {
  const d = parse(s);
  const today = sameDay(d, parse(NOW));
  return `${today ? 'Today' : dayDate(s)} · ${time(s)}`;
}

export function monthDay(s: string): string {
  const d = parse(s);
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

export function money(n: number, cents = false): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
}

export function businessDaysAfter(from: string, to: string): number {
  const a = parse(from);
  const b = parse(to);
  let n = 0;
  const d = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
  while (d <= b) {
    const w = d.getDay();
    if (w !== 0 && w !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

export function kb(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)} MB` : `${n} KB`;
}

export function initials(name: string): string {
  const parts = name.replace('Dr. ', '').split(' ');
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
