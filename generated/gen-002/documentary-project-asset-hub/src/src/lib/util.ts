export const NOW = '2026-11-16';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = () => number;
export const pick = <T,>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)];
export const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
export function tc(sec: number, withHours = true) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return withHours ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h * 60 + m)}:${pad(s)}`;
}
export function parseTc(s: string) {
  const p = s.split(':').map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return Number(s) || 0;
}
export function dur(sec: number) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${pad(m)}m`;
  if (m) return s ? `${m}m ${pad(s)}s` : `${m}m`;
  return `${s}s`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso: string, withYear = false) {
  const [y, m, d] = iso.split('-').map(Number);
  const cur = Number(NOW.slice(0, 4));
  return `${MONTHS[m - 1]} ${d}${withYear || y !== cur ? `, ${y}` : ''}`;
}
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
export function ago(iso: string) {
  const d = daysBetween(iso, NOW);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 60) return `${d} days ago`;
  return `${Math.round(d / 30)} months ago`;
}
export function addDays(iso: string, n: number) {
  const d = new Date(Date.parse(iso) + n * 86400000);
  return d.toISOString().slice(0, 10);
}
export const plural = (n: number, w: string, pl?: string) => `${n} ${n === 1 ? w : pl || w + 's'}`;

export function shuffle<T>(r: Rng, a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
