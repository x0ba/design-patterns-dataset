export const nf = new Intl.NumberFormat('en-US');

export function pct(v: number, digits = 0) {
  return (v * 100).toFixed(digits) + '%';
}

export function fmtDelta(d: number, digits = 0) {
  const v = d * 100;
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return '±0 pts';
  return (v > 0 ? '+' : '−') + s + ' pts';
}

export function compact(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}

export function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}

export function mmss(t: number) {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
}
