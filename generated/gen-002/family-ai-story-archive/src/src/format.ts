import type { Kid, Story } from './types';

// The prototype's "today": Monday, November 16, 2026.
export const TODAY = new Date(2026, 10, 16, 21, 40);

export function parse(iso: string): Date {
  const [d, t] = iso.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, mi] = (t || '00:00').split(':').map(Number);
  return new Date(y, m - 1, day, h, mi);
}
export const fmtDate = (iso: string) =>
  parse(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const fmtDay = (iso: string) =>
  parse(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
export const fmtTime = (iso: string) =>
  parse(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
export const fmtMonthLong = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
export const fmtShortDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
export const money = (n: number) => `$${n.toFixed(2)}`;
export const forLabel = (k: Kid) => (k === 'pia' ? 'Pia' : k === 'leo' ? 'Leo' : 'Pia & Leo');
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
export const monthKey = (s: Story) => s.createdAt.slice(0, 7);
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}
