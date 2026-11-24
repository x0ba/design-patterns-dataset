import type { Place } from '../data';
import { fmtLat, fmtNum, fmtTemp } from './geo';
import { sunElevation } from './sun';

export function sunWords(el: number) {
  if (el < -0.5) return 'Night: the Sun is below the horizon';
  if (el < 0.5) return 'Sunrise or sunset: the Sun is right on the horizon';
  if (el < 6) return 'The Sun is skimming the horizon';
  if (el < 20) return 'The Sun is low in the sky';
  if (el < 55) return 'The Sun is partway up the sky';
  return 'The Sun is high overhead';
}
export function elLabel(el: number) {
  const a = Math.abs(el);
  const d = a < 10 ? fmtNum(a, 1) : fmtNum(a);
  return el < 0 ? `${d}° below the horizon` : `${d}° above the horizon`;
}

export function dayNightPattern(p: Place) {
  const f = p.feature;
  if (f?.psr && f.psr.share > 0.5) return 'Floor: never lit. The rim sees only a grazing Sun.';
  if (Math.abs(p.lat) > 80) return 'The Sun circles just above the horizon; shadows are long.';
  return 'About 15 Earth days of daylight, then 15 of night.';
}

/** Rough surface temperature range in kelvin: [coldest, warmest]. */
export function tempRange(p: Place): [number, number] {
  const f = p.feature;
  if (f?.psr && f.psr.share > 0.5) return [f.psr.minTempK, 200];
  const c = Math.max(0, Math.cos((p.lat * Math.PI) / 180));
  return [Math.abs(p.lat) > 80 ? 70 : 95, 390 * Math.pow(c, 0.25)];
}
export function tempText(p: Place) {
  const [lo, hi] = tempRange(p);
  const f = p.feature;
  if (f?.psr && f.psr.share > 0.5) return `As low as ${fmtTemp(lo)} on the floor`;
  return `${fmtTemp(lo)} to ${fmtTemp(hi)}`;
}

export function sunNow(p: Place, t: number) {
  const el = sunElevation(p.lat, p.lon, t);
  return { el, text: elLabel(el), words: sunWords(el) };
}

export function latText(p: Place) {
  return fmtLat(p.lat);
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}
export function yearsBetween(a: string, b: string) {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.abs(db - da) / (365.25 * 86400000);
}
export function fmtUtc(t: number) {
  const d = new Date(t);
  const date = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const hh = String(d.getUTCHours()).padStart(2, '0');
  return `${date} · ${hh}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}
