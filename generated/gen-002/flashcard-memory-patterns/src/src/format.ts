const MINUS = '−';

export function pct(n: number | null): string {
  return n === null ? '–' : `${Math.round(n)}%`;
}

export function signedPts(n: number | null): string {
  if (n === null) return '–';
  const r = Math.round(n);
  if (r === 0) return '0 pts';
  return `${r > 0 ? '+' : MINUS}${Math.abs(r)} pts`;
}

export function pointsWord(n: number): string {
  const r = Math.round(Math.abs(n));
  return `${r} ${r === 1 ? 'point' : 'points'}`;
}

export function secs(n: number | null): string {
  return n === null ? '–' : `${n.toFixed(1)}s`;
}

export function count(n: number): string {
  return n.toLocaleString('en-US');
}
