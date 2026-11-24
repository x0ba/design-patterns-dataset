// Synthetic but internally-consistent weather "world" used by every stubbed service.
// Scenario: a late-season Pacific storm comes ashore over Southern California today/tomorrow,
// then tracks across the Four Corners, High Plains, Midwest and Great Lakes over the week.
// Everything is computed from (lat, lon, time) so DWML forecasts, METARs, radar frames,
// regional maps and the worded zone forecast all agree with each other.
'use strict';

const HOUR = 3600e3, DAY = 24 * HOUR;

// ---- deterministic noise ---------------------------------------------------
function hash(a, b, c) {
  let h = 2166136261 ^ Math.round(a * 1000);
  h = Math.imul(h ^ Math.round(b * 1000), 16777619);
  h = Math.imul(h ^ Math.round((c || 0) * 1000), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000; // 0..1
}
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return (a + (b - a) * s(xf)) + ((c + (d - c) * s(xf)) - (a + (b - a) * s(xf))) * s(yf);
}
function fbm(x, y, seed) {
  return 0.5 * vnoise(x, y, seed) + 0.3 * vnoise(x * 2.1, y * 2.1, seed + 7) + 0.2 * vnoise(x * 4.3, y * 4.3, seed + 13);
}

// ---- time zones --------------------------------------------------------------
function zoneFor(lat, lon) {
  if (lon < -140) return lat > 50 ? 'America/Anchorage' : 'Pacific/Honolulu';
  if (lon < -114.6 && !(lat < 37 && lon > -114.8)) return 'America/Los_Angeles';
  if (lon < -109 && lat < 37.1 && lat > 31) return 'America/Phoenix';
  if (lon < -101.5) return 'America/Denver';
  if (lon < -86.8) return 'America/Chicago';
  return 'America/New_York';
}
const ABBR = {
  'America/Los_Angeles': ['PST', 'PDT'], 'America/Phoenix': ['MST', 'MST'], 'America/Denver': ['MST', 'MDT'],
  'America/Chicago': ['CST', 'CDT'], 'America/New_York': ['EST', 'EDT'], 'America/Anchorage': ['AKST', 'AKDT'],
  'Pacific/Honolulu': ['HST', 'HST'],
};
function tzOffsetMin(zone, date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date);
  const g = (t) => +parts.find((p) => p.type === t).value;
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return Math.round((asUtc - date.getTime()) / 60000);
}
function tzAbbr(zone, date) {
  const jan = tzOffsetMin(zone, new Date(Date.UTC(date.getUTCFullYear(), 0, 1)));
  const a = ABBR[zone] || ['UTC', 'UTC'];
  return tzOffsetMin(zone, date) !== jan ? a[1] : a[0];
}
// local wall-clock parts for a zone
function local(zone, date) {
  const off = tzOffsetMin(zone, date);
  const d = new Date(date.getTime() + off * 60000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), dow: d.getUTCDay(), off };
}
// UTC instant for a local wall-clock time in zone
function fromLocal(zone, y, m, d, h, mi) {
  let t = Date.UTC(y, m - 1, d, h || 0, mi || 0);
  const off = tzOffsetMin(zone, new Date(t));
  return new Date(t - off * 60000);
}
const pad = (n, w = 2) => String(n).padStart(w, '0');
function isoLocal(zone, date) {
  const l = local(zone, date);
  const o = l.off, sign = o < 0 ? '-' : '+', ao = Math.abs(o);
  return `${l.y}-${pad(l.m)}-${pad(l.d)}T${pad(l.h)}:${pad(l.mi)}:${pad(l.s)}${sign}${pad(Math.floor(ao / 60))}:${pad(ao % 60)}`;
}

// ---- scenario anchor -------------------------------------------------------------
// Day 0 = today's date in San Diego. All storm timing is relative to local midnight there.
function anchor(now) {
  const l = local('America/Los_Angeles', now);
  return fromLocal('America/Los_Angeles', l.y, l.m, l.d, 0, 0).getTime();
}
function tDays(date, now) { return (date.getTime() - anchor(now || new Date())) / DAY; }

// storm track: [dayOffset, lat, lon, strength]
const TRACK = [
  [-2, 30.5, -135.0, 0.8], [-1, 31.6, -129.5, 0.9], [0, 32.6, -124.6, 1.0], [0.5, 33.0, -122.0, 1.05],
  [1, 33.9, -117.6, 1.0], [1.5, 35.4, -114.0, 0.95], [2, 37.0, -110.6, 0.9], [3, 39.4, -103.8, 0.95],
  [4, 42.0, -96.0, 1.0], [5, 44.6, -87.5, 0.95], [6, 46.5, -78.5, 0.85], [7, 47.5, -70.0, 0.7], [9, 48, -60, 0.5],
];
function stormAt(t) {
  if (t <= TRACK[0][0]) return { lat: TRACK[0][1], lon: TRACK[0][2], s: TRACK[0][3] };
  for (let i = 0; i < TRACK.length - 1; i++) {
    const a = TRACK[i], b = TRACK[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const f = (t - a[0]) / (b[0] - a[0]);
      return { lat: a[1] + (b[1] - a[1]) * f, lon: a[2] + (b[2] - a[2]) * f, s: a[3] + (b[3] - a[3]) * f };
    }
  }
  const z = TRACK[TRACK.length - 1];
  return { lat: z[1], lon: z[2], s: z[3] };
}
// secondary features: [lat, lon, sigmaLat, sigmaLon, peak, tStart, tEnd]
const FEATURES = [
  [43.2, -77.5, 1.3, 2.4, 0.55, -2, 1.2],   // lake-effect / upslope showers, Great Lakes & upstate NY
  [26.4, -80.4, 1.6, 1.4, 0.32, -2, 9],     // Florida east-coast showers
  [47.6, -122.6, 2.2, 2.2, 0.65, 1.6, 5.5],  // onshore flow showers, Pacific Northwest
  [30.2, -94.8, 2.0, 3.0, 0.55, 2.8, 4.4],  // Gulf moisture ahead of the system
  [41.5, -72.5, 1.8, 3.0, 0.35, 5.4, 6.8],  // Northeast rain with the front late week
];

// precipitation intensity 0..~1.2 at (lat, lon, t)
function precip(lat, lon, t) {
  const c = stormAt(t);
  // comma-shaped shield: core around/just ahead of the low plus a trailing cold-front band to the south
  const dx = (lon - (c.lon + 0.7)) * Math.cos(lat * Math.PI / 180), dy = lat - c.lat;
  let v = c.s * Math.exp(-(dx * dx) / (2 * 2.0 * 2.0) - (dy * dy) / (2 * 2.6 * 2.6));
  // frontal tail running SSW from the low
  const fy = c.lat - lat; // degrees south of the low
  if (fy > 0) {
    const fx = (lon - (c.lon + 2.4 - fy * 0.45)) * Math.cos(lat * Math.PI / 180);
    v = Math.max(v, 0.75 * c.s * Math.exp(-(fx * fx) / (2 * 0.8 * 0.8)) * Math.exp(-(fy * fy) / (2 * 6 * 6)));
  }
  // dry slot / clearing far behind the low
  for (const f of FEATURES) {
    if (t < f[5] || t > f[6]) continue;
    const ramp = Math.min(1, (t - f[5]) / 0.4, (f[6] - t) / 0.4);
    const a = (lat - f[0]) / f[2], b = (lon - f[1]) / f[3];
    v = Math.max(v, f[4] * ramp * Math.exp(-(a * a + b * b) / 2));
  }
  // orographic enhancement in the coastal mountains of SoCal and the Sierra / Rockies
  v *= 1 + 0.2 * Math.exp(-((lon + 116.6) ** 2) / 0.3 - ((lat - 33.4) ** 2) / 1.2);
  return v;
}

// climatology for mid/late autumn
function climo(lat, lon, doy) {
  let hi = 84 - 1.9 * (lat - 25);
  if (lon < -114) hi += 0.45 * (lat - 25);                       // maritime west coast
  if (lon > -115 && lon < -104 && lat < 37.5) hi += 8;           // desert southwest
  if (lon > -112 && lon < -104 && lat > 37.5) hi -= 4;           // high terrain
  if (lon > -84 && lat < 31) hi += 2;                             // florida peninsula
  // seasonal drift (cooling ~0.25F/day in November)
  hi -= (doy - 321) * 0.25;
  let spread = 17;
  if (lon < -117.5 && lat < 38) spread = 11;                      // coastal california
  else if (lon < -121) spread = 10;                               // pacific nw
  else if (lon > -115 && lon < -104) spread = 26;                 // dry interior
  else if (lon > -83 && lat < 30) spread = 13;
  return { hi, lo: hi - spread };
}
function doyOf(date) { return Math.floor((date - Date.UTC(date.getUTCFullYear(), 0, 0)) / DAY); }

function tempAnom(lat, lon, t) {
  const c = stormAt(t);
  const dx = (lon - c.lon) * Math.cos(lat * Math.PI / 180), dy = lat - c.lat;
  const d2 = dx * dx + dy * dy;
  let a = -7 * Math.exp(-d2 / (2 * 4.5 * 4.5));                   // cool under the storm
  if (dx < -2) a -= 5 * Math.exp(-((dx + 6) * (dx + 6)) / 30) * Math.exp(-dy * dy / 60); // cold air behind it
  if (dx > 3) a += 6 * Math.exp(-((dx - 7) * (dx - 7)) / 40) * Math.exp(-(dy + 3) * (dy + 3) / 60); // warm sector
  return a + (hash(lat, lon, 3) - 0.5) * 4;
}

// daily hi/lo for the local calendar day dIndex (0 = today)
function dayTemps(lat, lon, dIndex, now) {
  const base = new Date(anchor(now) + dIndex * DAY);
  const c = climo(lat, lon, doyOf(base));
  const aDay = tempAnom(lat, lon, dIndex + 0.6), aNight = tempAnom(lat, lon, dIndex + 1.2);
  const pDay = maxPrecip(lat, lon, dIndex + 0.3, dIndex + 0.8), pNight = maxPrecip(lat, lon, dIndex + 0.8, dIndex + 1.3);
  const hi = Math.round(c.hi + aDay - 4 * Math.min(1, pDay) + (hash(lat, lon, dIndex) - 0.5) * 3);
  let lo = Math.round(c.lo + aNight + 4 * Math.min(1, pNight) * 0.6 + (hash(lon, lat, dIndex) - 0.5) * 3);
  if (lo > hi - 4) lo = hi - 4;
  return { hi, lo };
}
function maxPrecip(lat, lon, t0, t1) {
  let m = 0;
  for (let t = t0; t <= t1 + 1e-9; t += (t1 - t0) / 6) m = Math.max(m, precip(lat, lon, t));
  return m;
}
function cloudAt(lat, lon, t) {
  const p = precip(lat, lon, t);
  const c = stormAt(t);
  const dx = (lon - c.lon), dy = lat - c.lat;
  let cl = 0.12 + 1.5 * p + 0.45 * Math.exp(-(dx * dx + dy * dy) / (2 * 6 * 6)) + (fbm(lat / 3, lon / 3, Math.floor(t * 2)) - 0.5) * 0.35;
  if (lon < -117 && lat < 35 && lat > 32 && t > 3) cl += 0.1; // coastal low clouds return late week
  return Math.max(0, Math.min(1, cl));
}

// temperature at an instant (diurnal curve between lows ~6:30am and highs ~2:30pm local)
function tempAt(lat, lon, date, now) {
  const zone = zoneFor(lat, lon);
  const l = local(zone, date);
  const today0 = fromLocal(zone, l.y, l.m, l.d, 0, 0);
  const dIndex = Math.round((today0.getTime() - anchor(now)) / DAY);
  const h = l.h + l.mi / 60;
  const T = dayTemps(lat, lon, dIndex, now), Tprev = dayTemps(lat, lon, dIndex - 1, now);
  let v;
  if (h < 6.5) v = Tprev.lo + (T.lo - Tprev.lo) * 0 + (Tprev.hi - Tprev.lo) * 0.25 * (1 - h / 6.5) + (T.lo - Tprev.lo) * (h / 6.5) * 0 ;
  if (h < 6.5) v = T.lo + (Tprev.hi - T.lo) * 0.28 * (1 - h / 6.5);
  else if (h < 14.5) v = T.lo + (T.hi - T.lo) * Math.sin(((h - 6.5) / 8) * Math.PI / 2);
  else { const Tn = dayTemps(lat, lon, dIndex + 1, now); v = T.hi - (T.hi - Tn.lo) * 0.72 * ((h - 14.5) / 9.5); }
  return v;
}

// wind (mph) and direction (deg true, from) — circulation around the low
function windAt(lat, lon, t) {
  const c = stormAt(t);
  const dx = (lon - c.lon) * Math.cos(lat * Math.PI / 180), dy = lat - c.lat;
  const r = Math.sqrt(dx * dx + dy * dy) + 0.01;
  // counter-clockwise flow + 25deg inflow; wind blows TOWARD (u,v)
  let u = -dy / r, v = dx / r;
  const ang = 25 * Math.PI / 180; const u2 = u * Math.cos(ang) - v * Math.sin(ang), v2 = u * Math.sin(ang) + v * Math.cos(ang);
  const spd = 5 + 14 * c.s * (r / 3.5) * Math.exp(1 - r / 3.5) * Math.min(1, r / 1.2);
  let dir = (Math.atan2(-u2, -v2) * 180 / Math.PI + 360) % 360; // from-direction
  const n = (hash(lat, lon, Math.floor(t * 8)) - 0.5);
  dir = (dir + n * 30 + 360) % 360;
  return { dir: Math.round(dir / 10) * 10 || 360, spd: Math.max(0, Math.round(spd * (0.75 + 0.5 * hash(lon, lat, 9)) + n * 4)) };
}

module.exports = { HOUR, DAY, hash, fbm, vnoise, zoneFor, tzOffsetMin, tzAbbr, local, fromLocal, isoLocal, pad, anchor, tDays, stormAt, precip, maxPrecip, cloudAt, dayTemps, tempAt, windAt, climo };
