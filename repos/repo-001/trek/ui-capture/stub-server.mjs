// Local stand-in for Open-Meteo (forecast + archive). Produces deterministic, plausible
// weather for any lat/lng/date: temperatures follow latitude and season, with a
// pseudo-random but stable mix of sun, cloud and rain per place and day.
import http from 'node:http';
const PORT = Number(process.env.STUB_PORT || 5453);

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
const iso = (d) => d.toISOString().slice(0, 10);
function climate(lat, lng, date) {
  const doy = (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5;
  const season = Math.cos(((doy - 205) / 365) * 2 * Math.PI) * (lat >= 0 ? 1 : -1); // +1 = midsummer
  const absLat = Math.abs(lat);
  const mean = 31 - absLat * 0.4 + season * Math.min(9, absLat * 0.15);
  const r = hash(`${lat.toFixed(1)},${lng.toFixed(1)},${iso(date)}`);
  const amp = 4 + absLat * 0.06 + r * 2;
  const wetness = absLat > 55 ? 0.55 : absLat < 25 ? 0.3 : 0.38;
  const code = r < wetness * 0.45 ? (mean < 1 ? 71 : 61) : r < wetness * 0.75 ? 80 : r < wetness ? 3 : r < 0.75 ? 2 : r < 0.88 ? 1 : 0;
  const precip = code >= 61 ? +(1 + r * 9).toFixed(1) : code === 80 ? +(0.3 + r * 3).toFixed(1) : 0;
  return { max: +(mean + amp / 2).toFixed(1), min: +(mean - amp / 2).toFixed(1), code, precip, wind: +(8 + r * 22).toFixed(1), r };
}
function value(name, c, hour) {
  const t = hour == null ? null : c.min + (c.max - c.min) * Math.max(0, Math.sin(((hour - 6) / 24) * 2 * Math.PI) * 0.5 + 0.5 * (hour > 9 && hour < 18 ? 1 : 0.3));
  switch (name) {
    case 'temperature_2m_max': return c.max;
    case 'temperature_2m_min': return c.min;
    case 'temperature_2m': return +(t ?? (c.max + c.min) / 2).toFixed(1);
    case 'weathercode': case 'weather_code': return c.code;
    case 'precipitation_sum': return c.precip;
    case 'precipitation': return hour != null && c.precip && hour % 5 === 2 ? +(c.precip / 4).toFixed(1) : 0;
    case 'precipitation_probability': case 'precipitation_probability_max': return c.precip ? Math.round(50 + c.r * 40) : Math.round(c.r * 20);
    case 'windspeed_10m': case 'wind_speed_10m': case 'windspeed_10m_max': case 'wind_speed_10m_max': return +(c.wind * (hour == null ? 1.3 : 0.7 + (hour % 7) / 10)).toFixed(1);
    case 'wind_gusts_10m': case 'wind_gusts_10m_max': return +(c.wind * 1.8).toFixed(1);
    case 'wind_direction_10m': case 'wind_direction_10m_dominant': return Math.round(c.r * 360);
    case 'relativehumidity_2m': case 'relative_humidity_2m': return Math.round(55 + c.r * 35);
    default: return 0;
  }
}
function build(q) {
  const lat = Number(q.get('latitude')), lng = Number(q.get('longitude'));
  const today = new Date(iso(new Date()) + 'T00:00:00Z');
  let start, end;
  if (q.get('start_date')) { start = new Date(q.get('start_date') + 'T00:00:00Z'); end = new Date((q.get('end_date') || q.get('start_date')) + 'T00:00:00Z'); }
  else { start = new Date(today - Number(q.get('past_days') || 0) * 864e5); end = new Date(+today + (Number(q.get('forecast_days') || 7) - 1) * 864e5); }
  const days = []; for (let d = new Date(start); d <= end; d = new Date(+d + 864e5)) days.push(d);
  const tz = 'GMT';
  const out = { latitude: lat, longitude: lng, generationtime_ms: 0.4, utc_offset_seconds: 0, timezone: tz, timezone_abbreviation: tz, elevation: 120 };
  const dailyVars = (q.get('daily') || '').split(',').filter(Boolean);
  if (dailyVars.length) {
    out.daily = { time: days.map(iso) };
    for (const v of dailyVars) {
      if (v === 'sunrise' || v === 'sunset') { out.daily[v] = days.map((d) => `${iso(d)}T${v === 'sunrise' ? '06:52' : '18:41'}`); continue; }
      out.daily[v] = days.map((d) => value(v, climate(lat, lng, d)));
    }
  }
  const hourlyVars = (q.get('hourly') || '').split(',').filter(Boolean);
  if (hourlyVars.length) {
    out.hourly = { time: days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${iso(d)}T${String(h).padStart(2, '0')}:00`)) };
    for (const v of hourlyVars) out.hourly[v] = days.flatMap((d) => { const c = climate(lat, lng, d); return Array.from({ length: 24 }, (_, h) => value(v, c, h)); });
  }
  const currentVars = (q.get('current') || '').split(',').filter(Boolean);
  if (currentVars.length) {
    const now = new Date(); const c = climate(lat, lng, today);
    out.current = { time: now.toISOString().slice(0, 13) + ':00', interval: 900 };
    for (const v of currentVars) out.current[v] = value(v, c, now.getUTCHours());
  }
  return out;
}
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/open-meteo/')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(build(u.searchParams)));
  }
  res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":true,"reason":"not stubbed"}');
}).listen(PORT, '127.0.0.1', () => console.log(`[stub] Open-Meteo stand-in on 127.0.0.1:${PORT}`));
