import { toVec, V3 } from './geo';

/**
 * Simplified solar geometry for the Moon (client-side, no ephemeris).
 * - Sub-solar longitude follows the mean synodic month, anchored to a known new Moon.
 * - Sub-solar latitude swings ±1.54° with the 346.6-day eclipse year, crossing zero in eclipse season.
 */
const DAY = 86400000;
const SYNODIC = 29.530588853;
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);
const ECLIPSE_YEAR = 346.62;
const NODE_EPOCH = Date.UTC(2026, 2, 3, 11, 33);
export const LUNAR_TILT = 1.54;

export function moonAge(t: number) {
  const d = (t - NEW_MOON_EPOCH) / DAY;
  return ((d % SYNODIC) + SYNODIC) % SYNODIC;
}
export function subSolar(t: number) {
  const age = moonAge(t);
  let lon = 180 - (360 * age) / SYNODIC;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  const lat = LUNAR_TILT * Math.sin((2 * Math.PI * (t - NODE_EPOCH)) / DAY / ECLIPSE_YEAR);
  return { lat, lon };
}
export function sunVector(t: number): V3 {
  const s = subSolar(t);
  return toVec(s.lat, s.lon);
}
/** Sun height above the local horizon, degrees (negative = below horizon). */
export function sunElevation(lat: number, lon: number, t: number) {
  const s = subSolar(t);
  const r = Math.PI / 180;
  const se =
    Math.sin(lat * r) * Math.sin(s.lat * r) +
    Math.cos(lat * r) * Math.cos(s.lat * r) * Math.cos((lon - s.lon) * r);
  return Math.asin(Math.max(-1, Math.min(1, se))) / r;
}
/** Highest the Sun gets at this latitude over the given span. */
export function maxElevation(lat: number, lon: number, t0: number, days: number) {
  let best = -90;
  const step = 3 / 24;
  for (let d = 0; d <= days; d += step) best = Math.max(best, sunElevation(lat, lon, t0 + d * DAY));
  return best;
}
export function elevationSeries(lat: number, lon: number, t0: number, days: number, n: number) {
  const out: { t: number; el: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (i / n) * days * DAY;
    out.push({ t, el: sunElevation(lat, lon, t) });
  }
  return out;
}
/** Next time the Sun crosses the horizon (up = rise, down = set). */
export function nextHorizonCrossing(lat: number, lon: number, t: number) {
  const step = DAY / 24;
  let prev = sunElevation(lat, lon, t);
  for (let i = 1; i < 24 * 40; i++) {
    const tt = t + i * step;
    const el = sunElevation(lat, lon, tt);
    if ((prev < 0) !== (el < 0)) {
      return { t: tt, kind: el >= 0 ? ('sunrise' as const) : ('sunset' as const) };
    }
    prev = el;
  }
  return null;
}
export function phaseName(t: number) {
  const a = moonAge(t) / SYNODIC;
  const names = [
    'New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
    'Full Moon', 'Waning gibbous', 'Last quarter', 'Waning crescent',
  ];
  return names[Math.floor(((a * 8 + 0.5) % 8))];
}
/** Fraction of the Earth-facing disc that is lit (0–1). */
export function illumination(t: number) {
  const a = (2 * Math.PI * moonAge(t)) / SYNODIC;
  return (1 - Math.cos(a)) / 2;
}
export const DAY_MS = DAY;
