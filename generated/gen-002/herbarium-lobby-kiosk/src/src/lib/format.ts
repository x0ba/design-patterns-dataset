import type { DateParts, Season } from '../types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "14 May 1938", "May 1938", or "1911" depending on what the label recorded. */
export function formatDate(d: DateParts): string {
  if (d.month === null) return String(d.year);
  const month = MONTHS[d.month - 1];
  if (d.day === null) return `${month} ${d.year}`;
  return `${d.day} ${month} ${d.year}`;
}

export function formatMonthYear(d: DateParts): string {
  return d.month === null ? String(d.year) : `${MONTHS[d.month - 1].slice(0, 3)} ${d.year}`;
}

export function formatCollectorNumber(n: string): string {
  return n === 's.n.' ? 's.n.' : n;
}

export function formatElevation(ft: number): string {
  return `${ft.toLocaleString('en-US')} ft`;
}

/** "Penstemon serrulatus" → "P. serrulatus" */
export function shortName(name: string): string {
  const parts = name.split(' ');
  if (parts.length < 2) return name;
  return `P. ${parts.slice(1).join(' ')}`;
}

/** Scientific name with the genus and epithet, e.g. "Penstemon cardwellii". */
export function latinParts(name: string): { genus: string; rest: string } {
  const [genus, ...rest] = name.split(' ');
  return { genus: genus ?? name, rest: rest.join(' ') };
}

export const SEASON_SHORT: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

export function formatMiles(mi: number): string {
  if (mi < 0.1) return '< 0.1 mi';
  return `${mi.toFixed(1)} mi`;
}

export function formatCoord(v: number, pos: string, neg: string): string {
  return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
}

export function pluralize(n: number, one: string, many: string): string {
  return n === 1 ? `${n} ${one}` : `${n.toLocaleString('en-US')} ${many}`;
}
