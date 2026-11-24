export const R_KM = 1737.4;
export const KM_PER_MI = 1.609344;
const D2R = Math.PI / 180;

export type V3 = [number, number, number];

/** Moon-fixed frame: +y north pole, +z toward lon 0 (Earth-facing), +x toward lon +90 E. */
export function toVec(lat: number, lon: number): V3 {
  const la = lat * D2R;
  const lo = lon * D2R;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
}
export function fromVec(v: V3): { lat: number; lon: number } {
  const l = Math.hypot(...v) || 1;
  return { lat: Math.asin(Math.max(-1, Math.min(1, v[1] / l))) / D2R, lon: Math.atan2(v[0], v[2]) / D2R };
}
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Angle between two surface points, radians. */
export function angleBetween(a: V3, b: V3) {
  const c = cross(a, b);
  return Math.atan2(len(c), dot(a, b));
}
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  return angleBetween(toVec(lat1, lon1), toVec(lat2, lon2)) * R_KM;
}
export function slerp(a: V3, b: V3, t: number): V3 {
  const th = angleBetween(a, b);
  if (th < 1e-9) return a;
  const s = Math.sin(th);
  return add(scale(a, Math.sin((1 - t) * th) / s), scale(b, Math.sin(t * th) / s));
}
/** Point reached from (lat,lon) travelling `km` along compass `bearingDeg`. */
export function destination(lat: number, lon: number, bearingDeg: number, km: number) {
  const d = km / R_KM;
  const br = bearingDeg * D2R;
  const la1 = lat * D2R;
  const lo1 = lon * D2R;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return { lat: la2 / D2R, lon: ((((lo2 / D2R + 180) % 360) + 360) % 360) - 180 };
}
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number) {
  const a = lat1 * D2R, b = lat2 * D2R, dl = (lon2 - lon1) * D2R;
  const y = Math.sin(dl) * Math.cos(b);
  const x = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(dl);
  return ((Math.atan2(y, x) / D2R) + 360) % 360;
}

export const kmToMi = (km: number) => km / KM_PER_MI;

export function fmtNum(n: number, digits = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
/** "51 km (32 mi)" */
export function fmtDist(km: number, opts: { digits?: number } = {}) {
  const d = opts.digits ?? (km < 10 ? 1 : 0);
  const mi = kmToMi(km);
  const dm = mi < 10 ? 1 : 0;
  return `${fmtNum(km, d)} km (${fmtNum(mi, dm)} mi)`;
}
export function fmtLat(lat: number, digits = 1) {
  return `${fmtNum(Math.abs(lat), digits)}° ${lat < 0 ? 'S' : 'N'}`;
}
export function fmtLon(lon: number, digits = 1) {
  return `${fmtNum(Math.abs(lon), digits)}° ${lon < 0 ? 'W' : 'E'}`;
}
export function fmtLatLon(lat: number, lon: number, digits = 1) {
  return `${fmtLat(lat, digits)}, ${fmtLon(lon, digits)}`;
}
export const kToC = (k: number) => k - 273.15;
export const cToF = (c: number) => (c * 9) / 5 + 32;
export function fmtTemp(k: number) {
  const c = kToC(k);
  return `${fmtNum(c)} °C (${fmtNum(cToF(c))} °F)`.replace(/-/g, '−');
}
export function fmtAge(myr: number) {
  if (myr >= 1000) {
    const g = myr / 1000;
    return `about ${fmtNum(g, 1)} billion years`;
  }
  return `about ${fmtNum(myr)} million years`;
}
export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
