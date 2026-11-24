// Renders the synthetic weather model into the exact wire formats of the services ws4kp calls.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('./model');
const { pad } = M;

const ROOT = path.resolve(__dirname, '..', '..');

// ---- station catalog (the app's own Scripts/stations.js) -------------------------
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'Scripts/stations.js'), 'utf8') + ';this._StationInfo=_StationInfo;', ctx);
const STATIONS = Object.values(ctx._StationInfo)
  .map((s) => ({ id: s.StationId, city: String(s.City), state: s.State, lat: +s.Latitude, lon: +s.Longitude }))
  .filter((s) => /^[KP][A-Z0-9]{3}$/.test(s.id) && isFinite(s.lat) && isFinite(s.lon));

function dist(a1, o1, a2, o2) {
  const R = 3959, r = Math.PI / 180;
  const dA = (a2 - a1) * r, dO = (o2 - o1) * r;
  const x = Math.sin(dA / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function stationFor(place, lat, lon) { return STATIONS.find((s) => s.id === place.station) || nearestStation(lat, lon); }
function nearestStation(lat, lon) {
  let best = null, bd = 1e9;
  for (const s of STATIONS) { const d = dist(lat, lon, s.lat, s.lon); if (d < bd) { bd = d; best = s; } }
  return best;
}

// A handful of well-known places get their real NWS identifiers; anywhere else gets
// plausible derived ones.
const KNOWN = [
  { lat: 32.7157, lon: -117.1611, city: 'San Diego', state: 'CA', zip: '92101', zone: 'CAZ043', radar: 'NKX', wfo: 'SGX', station: 'KSAN', county: 'San Diego County Coastal Areas', iata: 'SAN', airport: 'San Diego International Airport', marine: 'PZZ750', elev: 43 },
  { lat: 34.0522, lon: -118.2437, city: 'Los Angeles', state: 'CA', zip: '90012', zone: 'CAZ041', radar: 'VTX', wfo: 'LOX', station: 'KCQT', iata: 'LAX', airport: 'Los Angeles International Airport', marine: 'PZZ655', elev: 293 },
  { lat: 40.7142, lon: -74.0059, city: 'New York', state: 'NY', zip: '10007', zone: 'NYZ072', radar: 'OKX', wfo: 'OKX', station: 'KNYC', iata: 'JFK', airport: 'John F. Kennedy International Airport', marine: 'ANZ338', elev: 33 },
  { lat: 41.8781, lon: -87.6298, city: 'Chicago', state: 'IL', zip: '60602', zone: 'ILZ014', radar: 'LOT', wfo: 'LOT', station: 'KMDW', iata: 'ORD', airport: "Chicago O'Hare International Airport", marine: 'LMZ741', elev: 594 },
  { lat: 39.7392, lon: -104.9903, city: 'Denver', state: 'CO', zip: '80202', zone: 'COZ039', radar: 'FTG', wfo: 'BOU', station: 'KDEN', iata: 'DEN', airport: 'Denver International Airport', elev: 5280 },
  { lat: 47.6062, lon: -122.3321, city: 'Seattle', state: 'WA', zip: '98104', zone: 'WAZ558', radar: 'ATX', wfo: 'SEW', station: 'KBFI', iata: 'SEA', airport: 'Seattle-Tacoma International Airport', marine: 'PZZ135', elev: 177 },
];
const STATE_WFO = { CA: 'SGX', NY: 'OKX', IL: 'LOT', CO: 'BOU', WA: 'SEW', TX: 'FWD', FL: 'MFL', AZ: 'PSR', NV: 'VEF', OR: 'PQR', GA: 'FFC', MA: 'BOX', PA: 'PHI', OH: 'CLE', MI: 'DTX', MN: 'MPX', MO: 'LSX', NC: 'RAH', TN: 'OHX', UT: 'SLC', NM: 'ABQ', LA: 'LIX' };
function placeFor(lat, lon) {
  for (const k of KNOWN) if (dist(lat, lon, k.lat, k.lon) < 15) return k;
  const st = nearestStation(lat, lon);
  const n = Math.floor(M.hash(lat, lon, 1) * 80) + 10;
  const wfo = STATE_WFO[st.state] || 'XXX';
  return {
    lat, lon, city: st.city.split('/')[0], state: st.state, zip: null, zone: `${st.state}Z0${pad(n)}`, radar: wfo, wfo,
    station: st.id, iata: st.id.substr(1), airport: `${st.city.split('/')[0]} Airport`, elev: 400 + Math.floor(M.hash(lon, lat, 2) * 900),
  };
}

// ---- forecast periods / wording -------------------------------------------------------
const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ptype(temp) { return temp <= 33 ? 'snow' : temp <= 37 ? 'mix' : 'rain'; }
function shortFcst(pop, cloud, kind, isDay, convective, windy) {
  const P = { rain: convective ? 'Showers' : 'Rain', snow: convective ? 'Snow Showers' : 'Snow', mix: 'Rain and Snow' }[kind];
  if (pop >= 80) return kind === 'rain' && convective ? 'Showers And Thunderstorms' : P;
  if (pop >= 60) return `${P} Likely`;
  if (pop >= 30) return `Chance ${P}`;
  if (pop >= 20) return `Slight Chance ${P}`;
  let s;
  if (cloud < 0.15) s = isDay ? 'Sunny' : 'Clear';
  else if (cloud < 0.35) s = isDay ? 'Mostly Sunny' : 'Mostly Clear';
  else if (cloud < 0.6) s = isDay ? 'Partly Sunny' : 'Partly Cloudy';
  else if (cloud < 0.85) s = 'Mostly Cloudy';
  else s = 'Cloudy';
  if (windy && pop < 20) s = isDay ? (cloud < 0.35 ? 'Sunny and Breezy' : 'Breezy') : s;
  return s;
}
function iconFor(pop, cloud, kind, isDay, convective) {
  const n = isDay ? '' : 'n';
  const popS = pop >= 20 ? String(Math.round(pop / 10) * 10) : '';
  if (pop >= 30) {
    if (kind === 'snow') return `${n}sn${popS}.png`;
    if (kind === 'mix') return `${n}ra_sn${popS}.png`;
    if (convective && pop >= 80) return `${n}tsra${popS}.png`.replace('tsra', 'shra');
    return `${n}${convective ? 'shra' : 'ra'}${popS}.png`;
  }
  if (pop >= 20) return isDay ? `hi_shwrs${popS}.png` : `hi_nshwrs${popS}.png`;
  if (cloud < 0.15) return `${n}skc.png`;
  if (cloud < 0.35) return `${n}few.png`;
  if (cloud < 0.6) return `${n}sct.png`;
  if (cloud < 0.85) return `${n}bkn.png`;
  return `${n}ovc.png`;
}
function cardinal(deg) { return ['North', 'North', 'Northeast', 'East', 'East', 'East', 'Southeast', 'South', 'South', 'South', 'Southwest', 'West', 'West', 'West', 'Northwest', 'North'][Math.floor(((deg + 11.25) % 360) / 22.5)]; }
function cardinalShort(deg) { return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.floor(((deg + 11.25) % 360) / 22.5)]; }

function tempPhrase(v, word) {
  const r = v % 10, d = v - r;
  if (r <= 3) return `${word} in the lower ${d}s`;
  if (r <= 6) return `${word} in the mid ${d}s`;
  return `${word} in the upper ${d}s`;
}
function pctWord(p) { return p >= 80 ? '80 percent' : `${p} percent`; }

// Build the period list (NWS 12-hour periods starting with the current one)
function periods(place, now) {
  const zone = M.zoneFor(place.lat, place.lon);
  const l = M.local(zone, now);
  const out = [];
  let start, isDay, dIndex = Math.round((M.fromLocal(zone, l.y, l.m, l.d, 0, 0).getTime() - M.anchor(now)) / M.DAY);
  // first period (NWS 12h periods: 6am-6pm day, 6pm-6am night)
  const today6 = M.fromLocal(zone, l.y, l.m, l.d, 6, 0);
  let firstName;
  if (l.h < 6) { start = new Date(today6.getTime() - 12 * M.HOUR); isDay = false; dIndex -= 1; firstName = "Overnight"; }
  else if (l.h < 18) { start = today6; isDay = true; firstName = l.h >= 12 ? "This Afternoon" : "Today"; }
  else { start = new Date(today6.getTime() + 12 * M.HOUR); isDay = false; firstName = "Tonight"; }
  for (let i = 0; i < 14; i++) {
    const dl = M.local(zone, new Date(start.getTime() + 1 * M.HOUR));
    const dow = DAYNAMES[dl.dow];
    let name;
    if (i === 0) name = firstName;
    else if (i === 1 && firstName === "Overnight") name = "Today";
    else if ((i === 1 && isDay === false) || (i === 2 && firstName === "Overnight")) name = "Tonight";
    else name = isDay ? dow : dow + " Night";
    const t0 = M.tDays(new Date(start.getTime() + (i === 0 ? Math.max(0, now - start) : 0)), now);
    const t1 = M.tDays(new Date(start.getTime() + 12 * M.HOUR), now);
    const p = M.maxPrecip(place.lat, place.lon, Math.min(t0, t1 - 0.05), t1);
    let pop = p < 0.12 ? 0 : Math.min(100, Math.round((p * 105) / 10) * 10);
    if (pop > 0 && pop < 20) pop = p > 0.15 ? 20 : 0;
    const temps = M.dayTemps(place.lat, place.lon, dIndex, now);
    const T = isDay ? temps.hi : temps.lo;
    const cloud = M.cloudAt(place.lat, place.lon, (t0 + t1) / 2);
    const w = M.windAt(place.lat, place.lon, (t0 + t1) / 2);
    const kind = ptype(isDay ? temps.hi - 4 : T + 2);
    const convective = pop < 80 || M.stormAt((t0 + t1) / 2).lon > place.lon + 1.5;
    out.push({ name, start, isDay, dIndex, temp: T, pop, cloud, wind: w, kind, convective,
      short: shortFcst(pop, cloud, kind, isDay, convective, w.spd >= 20), icon: iconFor(pop, cloud, kind, isDay, convective), qpf: p });
    start = new Date(start.getTime() + 12 * M.HOUR);
    if (!isDay) dIndex += 1;
    isDay = !isDay;
  }
  return out;
}

function worded(p) {
  const s = [];
  const spd = p.wind.spd;
  let lead = p.short.replace('Chance', 'A chance of').replace('Slight A chance of', 'A slight chance of').replace(' Likely', ' likely');
  if (/^(Rain|Snow|Showers)/.test(p.short) && p.pop >= 80) lead = p.short;
  lead = lead.charAt(0) + lead.slice(1).toLowerCase();
  if (p.pop >= 20 && p.pop < 80 && !/likely/.test(lead) && p.cloud > 0.5) s.push(`${lead}. Mostly cloudy`);
  else s.push(lead);
  s[0] += `, with a ${p.isDay ? 'high' : 'low'} near ${p.temp}.`;
  const dir = cardinal(p.wind.dir);
  if (spd < 5) s.push(p.isDay ? 'Light and variable wind.' : 'Calm wind.');
  else if (spd < 10) s.push(`${dir} wind around ${spd} mph.`);
  else {
    let w = `${dir} wind ${spd - 4} to ${spd + 1} mph`;
    if (spd >= 15) w += `, with gusts as high as ${Math.round(spd * 1.7 / 5) * 5} mph`;
    s.push(w + '.');
  }
  if (p.pop >= 20) {
    s.push(`Chance of precipitation is ${p.pop}%.`);
    if (p.pop >= 60) {
      const q = p.qpf;
      if (p.kind === 'snow') s.push(q > 0.8 ? 'New snow accumulation of 3 to 5 inches possible.' : 'New snow accumulation of around an inch possible.');
      else s.push(q > 0.9 ? 'New precipitation amounts between a half and three quarters of an inch possible.' : q > 0.6 ? 'New precipitation amounts between a quarter and half of an inch possible.' : 'New precipitation amounts of less than a tenth of an inch possible.');
    }
  }
  return s.join(' ');
}

// ---- current conditions -----------------------------------------------------------------
function obsAt(lat, lon, date, now, stationId) {
  const t = M.tDays(date, now);
  const T = M.tempAt(lat, lon, date, now) + (M.hash(lat, lon, Math.floor(t * 24)) - 0.5) * 1.2;
  const p = M.precip(lat, lon, t);
  const cloud = M.cloudAt(lat, lon, t);
  const w = M.windAt(lat, lon, t);
  const rh = Math.min(100, 45 + 50 * Math.min(1, p * 1.4) + cloud * 12 + (lon < -117 ? 12 : 0) - (lon > -115 && lon < -104 ? 22 : 0));
  // dewpoint from RH (Magnus)
  const Tc = (T - 32) * 5 / 9;
  const g = Math.log(rh / 100) + 17.62 * Tc / (243.12 + Tc);
  const Td = Math.min(Tc, 243.12 * g / (17.62 - g));
  const kind = ptype(T);
  let wx = '', vis = 10, summary;
  if (p > 0.18) {
    const code = { rain: p > 0.55 && M.stormAt(t).lon > lon ? 'SHRA' : 'RA', snow: 'SN', mix: 'RASN' }[kind];
    wx = (p > 0.85 ? '+' : p < 0.4 ? '-' : '') + code;
    vis = p > 0.85 ? 2 : p > 0.55 ? 5 : 8;
    if (p > 0.55 && Tc - Td < 2) wx += ' BR';
    const nm = { RA: 'Rain', SHRA: 'Rain Showers', SN: 'Snow', RASN: 'Rain and Snow' }[code];
    summary = (p > 0.85 ? 'Heavy ' : p < 0.4 ? 'Light ' : '') + nm;
    if (wx.includes('BR')) summary += ' and Fog/Mist';
  } else if (Tc - Td < 1.2 && cloud > 0.5) { wx = 'BR'; vis = 4; summary = 'Fog/Mist'; }
  const layers = [];
  const cov = cloud < 0.1 ? null : cloud < 0.3 ? 'FEW' : cloud < 0.55 ? 'SCT' : cloud < 0.85 ? 'BKN' : 'OVC';
  const baseFt = Math.round((p > 0.4 ? 1800 : 4500 + M.hash(lat, lon, 5) * 15000) / 100) * 100;
  if (cov) {
    if (cloud > 0.45) layers.push(['FEW', Math.max(800, baseFt - 1500)]);
    layers.push([cov, baseFt]);
    if (cloud > 0.7) layers.push(['OVC', baseFt + 4000 + Math.round(M.hash(lon, lat, 6) * 40) * 100]);
  }
  if (!summary) summary = !cov ? 'Fair' : { FEW: 'A Few Clouds', SCT: 'Partly Cloudy', BKN: 'Mostly Cloudy', OVC: 'Overcast' }[cov];
  // pressure: lower near the storm
  const c = M.stormAt(t);
  const dd = Math.hypot(lat - c.lat, (lon - c.lon) * Math.cos(lat * Math.PI / 180));
  const slp = 1020 - 16 * c.s * Math.exp(-(dd * dd) / (2 * 5 * 5)) + (M.hash(lat, lon, 4) - 0.5) * 2;
  const altim = slp * 0.02953;
  const gust = w.spd >= 14 ? Math.round(w.spd * 1.55) : 0;
  return { id: stationId, T, Tc, Td, rh, wx, vis, layers, slp, altim, w, gust, summary, cloud, p };
}

function metarRaw(o, date) {
  const kt = (mph) => Math.round(mph * 0.868976);
  const d = new Date(date);
  let s = `${o.id} ${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z `;
  const k = kt(o.w.spd);
  s += k < 3 ? '00000KT ' : `${pad(o.w.dir, 3)}${pad(k)}${o.gust ? 'G' + pad(kt(o.gust)) : ''}KT `;
  s += `${o.vis}SM `;
  if (o.wx) s += o.wx + ' ';
  s += o.layers.length ? o.layers.map((l) => `${l[0]}${pad(Math.round(l[1] / 100), 3)}`).join(' ') + ' ' : 'CLR ';
  const tc = (v) => (v < 0 ? 'M' : '') + pad(Math.abs(Math.round(v)));
  s += `${tc(o.Tc)}/${tc(o.Td)} A${Math.round(o.altim * 100)} RMK AO2 SLP${pad(Math.round(o.slp * 10) % 1000, 3)}`;
  const t10 = (v) => (v < 0 ? '1' : '0') + pad(Math.abs(Math.round(v * 10)), 3);
  s += ` T${t10(o.Tc)}${t10(o.Td)}`;
  return s;
}

function metarXmlEntry(st, o, date) {
  const kt = (mph) => Math.round(mph * 0.868976);
  const iso = new Date(date).toISOString().replace('.000', '');
  const fc = o.vis < 3 || (o.layers.find((l) => (l[0] === 'BKN' || l[0] === 'OVC') && l[1] < 1000)) ? 'IFR'
    : o.vis <= 5 || (o.layers.find((l) => (l[0] === 'BKN' || l[0] === 'OVC') && l[1] <= 3000)) ? 'MVFR' : 'VFR';
  return `  <METAR>
    <raw_text>${metarRaw(o, date)}</raw_text>
    <station_id>${st.id}</station_id>
    <observation_time>${iso}</observation_time>
    <latitude>${st.lat.toFixed(3)}</latitude>
    <longitude>${st.lon.toFixed(3)}</longitude>
    <temp_c>${o.Tc.toFixed(1)}</temp_c>
    <dewpoint_c>${o.Td.toFixed(1)}</dewpoint_c>
    <wind_dir_degrees>${kt(o.w.spd) < 3 ? 0 : o.w.dir}</wind_dir_degrees>
    <wind_speed_kt>${kt(o.w.spd) < 3 ? 0 : kt(o.w.spd)}</wind_speed_kt>
${o.gust ? `    <wind_gust_kt>${kt(o.gust)}</wind_gust_kt>\n` : ''}    <visibility_statute_mi>${o.vis}${o.vis === 10 ? '+' : ''}</visibility_statute_mi>
    <altim_in_hg>${o.altim.toFixed(2)}</altim_in_hg>
    <sea_level_pressure_mb>${o.slp.toFixed(1)}</sea_level_pressure_mb>
    <quality_control_flags>
      <auto_station>TRUE</auto_station>
    </quality_control_flags>
${o.wx ? `    <wx_string>${o.wx}</wx_string>\n` : ''}${o.layers.length ? o.layers.map((l) => `    <sky_condition sky_cover="${l[0]}" cloud_base_ft_agl="${l[1]}" />`).join('\n') : '    <sky_condition sky_cover="CLR" />'}
    <flight_category>${fc}</flight_category>
    <metar_type>METAR</metar_type>
    <elevation_m>${Math.round(M.hash(st.lat, st.lon, 7) * 300)}</elevation_m>
  </METAR>`;
}

function metarResponse(q, now) {
  let list = [];
  if (q.ids) {
    const ids = q.ids.toUpperCase().split(/[,\s]+/);
    list = STATIONS.filter((s) => ids.includes(s.id));
  } else if (q.bbox) {
    const [a0, o0, a1, o1] = q.bbox.split(',').map(Number);
    list = STATIONS.filter((s) => s.lat >= a0 && s.lat <= a1 && s.lon >= o0 && s.lon <= o1 && s.id[0] === 'K');
    list = list.slice(0, 400);
  }
  const hours = Math.min(3, parseFloat(q.hours || '1'));
  const out = [];
  for (const st of list) {
    // routine obs at :51/:53/:56 past the hour, newest first
    const minute = 51 + Math.floor(M.hash(st.lat, st.lon, 8) * 6);
    const last = new Date(now); last.setUTCMinutes(minute, 0, 0);
    if (last > now) last.setUTCHours(last.getUTCHours() - 1);
    for (let h = 0; h < hours; h++) {
      const t = new Date(last.getTime() - h * M.HOUR);
      out.push(metarXmlEntry(st, obsAt(st.lat, st.lon, t, now, st.id), t));
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<response xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.3" xsi:noNamespaceSchemaLocation="https://aviationweather.gov/data/schema/metar1_3.xsd">
  <request_index>${Math.floor(now / 1000) % 100000000}</request_index>
  <data_source name="metars" />
  <request type="retrieve" />
  <errors />
  <warnings />
  <time_taken_ms>${7 + list.length % 20}</time_taken_ms>
  <data num_results="${out.length}">
${out.join('\n')}
  </data>
</response>`;
}

// ---- DWML (forecast.weather.gov MapClick.php?FcstType=dwml) -----------------------------
function dwml(lat, lon, now) {
  const place = placeFor(lat, lon);
  const zone = M.zoneFor(lat, lon);
  const P = periods({ lat, lon }, now);
  const st = stationFor(place, lat, lon);
  const iso = (d) => M.isoLocal(zone, d);
  const dayP = P.map((p, i) => [p, i]).filter(([p]) => p.isDay);
  const nightP = P.map((p, i) => [p, i]).filter(([p]) => !p.isDay);
  const n = P.length;
  const key12 = `k-p12h-n${n}-1`, keyMax = `k-p24h-n${dayP.length}-1`, keyMin = `k-p24h-n${nightP.length}-2`;
  const obsTime = new Date(now); obsTime.setUTCMinutes(51 + Math.floor(M.hash(st.lat, st.lon, 8) * 6), 0, 0);
  if (obsTime > now) obsTime.setUTCHours(obsTime.getUTCHours() - 1);
  const o = obsAt(st.lat, st.lon, obsTime, now, st.id);
  const kt = (mph) => Math.round(mph * 0.868976);
  const nowIcon = iconFor(o.p > 0.18 ? 80 : 0, o.cloud, ptype(o.T), M.local(zone, now).h >= 6 && M.local(zone, now).h < 18, o.wx.includes('SH'));
  const cityLabel = `${place.city}, ${place.state}`;
  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<dwml version="1.0" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="https://graphical.weather.gov/xml/DWMLgen/schema/DWML.xsd">
  <head>
    <product concise-name="dwmlByDay" operational-mode="developmental" srsName="WGS 1984">
      <creation-date refresh-frequency="PT1H">${iso(now)}</creation-date>
      <category>current observations and forecast</category>
    </product>
    <source>
      <production-center>${place.wfo === 'SGX' ? 'San Diego, CA' : cityLabel}</production-center>
      <credit>https://www.weather.gov/${place.wfo.toLowerCase()}</credit>
      <more-information>https://www.nws.noaa.gov/forecasts/xml/</more-information>
    </source>
  </head>
  <data type="forecast">
    <location>
      <location-key>point1</location-key>
      <description>${cityLabel}</description>
      <point latitude="${(+lat).toFixed(2)}" longitude="${(+lon).toFixed(2)}"/>
      <city state="${place.state}">${place.city}</city>
      <height datum="mean sea level">${place.elev}</height>
    </location>
    <moreWeatherInformation applicable-location="point1">https://forecast.weather.gov/MapClick.php?lat=${(+lat).toFixed(2)}&amp;lon=${(+lon).toFixed(2)}</moreWeatherInformation>
    <time-layout time-coordinate="local" summarization="12hourly">
      <layout-key>${key12}</layout-key>
${P.map((p) => `      <start-valid-time period-name="${p.name}">${iso(p.start)}</start-valid-time>`).join('\n')}
    </time-layout>
    <time-layout time-coordinate="local" summarization="12hourly">
      <layout-key>${keyMax}</layout-key>
${dayP.map(([p]) => `      <start-valid-time period-name="${p.name}">${iso(p.start)}</start-valid-time>`).join('\n')}
    </time-layout>
    <time-layout time-coordinate="local" summarization="12hourly">
      <layout-key>${keyMin}</layout-key>
${nightP.map(([p]) => `      <start-valid-time period-name="${p.name}">${iso(p.start)}</start-valid-time>`).join('\n')}
    </time-layout>
    <parameters applicable-location="point1">
      <temperature type="maximum" units="Fahrenheit" time-layout="${keyMax}">
        <name>Daily Maximum Temperature</name>
${dayP.map(([p]) => `        <value>${p.temp}</value>`).join('\n')}
      </temperature>
      <temperature type="minimum" units="Fahrenheit" time-layout="${keyMin}">
        <name>Daily Minimum Temperature</name>
${nightP.map(([p]) => `        <value>${p.temp}</value>`).join('\n')}
      </temperature>
      <probability-of-precipitation type="12 hour" units="percent" time-layout="${key12}">
        <name>12 Hourly Probability of Precipitation</name>
${P.map((p) => p.pop ? `        <value>${p.pop}</value>` : '        <value xsi:nil="true"/>').join('\n')}
      </probability-of-precipitation>
      <weather time-layout="${key12}">
        <name>Weather Type, Coverage, Intensity</name>
${P.map((p) => `        <weather-conditions weather-summary="${p.short}"/>`).join('\n')}
      </weather>
      <conditions-icon type="forecast-NWS" time-layout="${key12}">
        <name>Conditions Icons</name>
${P.map((p) => `        <icon-link>https://forecast.weather.gov/newimages/medium/${p.icon}</icon-link>`).join('\n')}
      </conditions-icon>
      <wordedForecast time-layout="${key12}" dataSource="${place.wfo.toLowerCase()}Netcdf" wordGenerator="markMitchell">
        <name>Text Forecast</name>
${P.map((p) => `        <text>${worded(p)}</text>`).join('\n')}
      </wordedForecast>
    </parameters>
  </data>
  <data type="current observations">
    <location>
      <location-key>point1</location-key>
      <point latitude="${st.lat.toFixed(2)}" longitude="${st.lon.toFixed(2)}"/>
      <area-description>${st.city.split('/')[0]}, ${st.state}</area-description>
      <height datum="mean sea level" height-units="feet">${place.elev}</height>
    </location>
    <moreWeatherInformation applicable-location="point1">https://www.weather.gov/data/obhistory/${st.id}.html</moreWeatherInformation>
    <time-layout time-coordinate="local">
      <layout-key>k-p1h-n1-1</layout-key>
      <start-valid-time period-name="current">${iso(obsTime)}</start-valid-time>
    </time-layout>
    <parameters applicable-location="point1">
      <temperature type="apparent" units="Fahrenheit" time-layout="k-p1h-n1-1">
        <value>${Math.round(o.T)}</value>
      </temperature>
      <temperature type="dew point" units="Fahrenheit" time-layout="k-p1h-n1-1">
        <value>${Math.round(o.Td * 9 / 5 + 32)}</value>
      </temperature>
      <humidity type="relative" time-layout="k-p1h-n1-1">
        <value>${Math.round(o.rh)}</value>
      </humidity>
      <weather time-layout="k-p1h-n1-1">
        <name>Weather Type, Coverage, Intensity</name>
        <weather-conditions weather-summary=" ${o.summary}"/>
        <weather-conditions>
          <value>
            <visibility units="statute miles">${o.vis.toFixed(2)}</visibility>
          </value>
        </weather-conditions>
      </weather>
      <conditions-icon type="forecast-NWS" time-layout="k-p1h-n1-1">
        <name>Conditions Icon</name>
        <icon-link>https://forecast.weather.gov/newimages/medium/${nowIcon}</icon-link>
      </conditions-icon>
      <direction type="wind" units="degrees true" time-layout="k-p1h-n1-1">
        <value>${o.w.dir}</value>
      </direction>
      <wind-speed type="gust" units="knots" time-layout="k-p1h-n1-1">
        <value>${o.gust ? kt(o.gust) : 'NA'}</value>
      </wind-speed>
      <wind-speed type="sustained" units="knots" time-layout="k-p1h-n1-1">
        <value>${kt(o.w.spd)}</value>
      </wind-speed>
      <pressure type="barometer" units="inches of mercury" time-layout="k-p1h-n1-1">
        <value>${o.altim.toFixed(2)}</value>
      </pressure>
    </parameters>
  </data>
</dwml>
`;
}

// ---- MapClick.php HTML (the bits ws4kp scrapes) ---------------------------------------
function mapClickHtml(lat, lon, now) {
  const place = placeFor(lat, lon);
  const st = stationFor(place, lat, lon);
  const zone = M.zoneFor(lat, lon);
  const P = periods({ lat, lon }, now);
  const abbr = M.tzAbbr(zone, now);
  const l0 = M.local(zone, P[0].start), lN = M.local(zone, new Date(P[P.length - 1].start.getTime() + 12 * M.HOUR));
  const mon = (m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  const hr = (h) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
  return `<!DOCTYPE html>
<html class="no-js">
<head>
<title>National Weather Service</title>
<script type="text/javascript">var mapConfig = {zoom:10,center:{lat:${lat},lon:${lon}},layers:{radar:{a:"${place.radar.toLowerCase()}"}}};</script>
</head>
<body>
<div id="current-conditions" class="panel panel-default">
  <div class="panel-heading">
    <div>
      <b>Current conditions at</b>
      <h2 class="panel-title">${st.city.split('/')[0]} (${st.id})</h2>
      <span class="smallTxt"><b>Lat:&nbsp;</b>${st.lat.toFixed(5)}&deg;N<b>Lon:&nbsp;</b>${Math.abs(st.lon).toFixed(5)}&deg;W<b>Elev:&nbsp;</b>${place.elev}ft.</span>
    </div>
  </div>
</div>
<div id="detailed-forecast">
  <a href="MapClick.php?zoneid=${place.zone}">Zone Area Forecast for ${place.county || place.city}</a>
</div>
<div id="about_forecast">
<div class="fullRow">
<div class="left">Point Forecast:</div>
<div class="right">${place.city} ${place.state}<br>&nbsp;${(+lat).toFixed(2)}&deg;N ${Math.abs(lon).toFixed(2)}&deg;W (Elev. ${place.elev} ft)</div>
</div>
<div class="fullRow">
<div class="left"><a target="_blank" href="//www.weather.gov/glossary/index.php?word=Last+update">Last Update</a>: </div>
<div class="right">${M.local(zone, now).h % 12 || 12}:${pad(M.local(zone, now).mi)} ${M.local(zone, now).h < 12 ? 'am' : 'pm'} ${abbr} ${mon(M.local(zone, now).m)} ${M.local(zone, now).d}, ${M.local(zone, now).y}</div>
</div>
<div class="fullRow">
<div class="left"><a target="_blank" href="//www.weather.gov/glossary/index.php?word=forecast+valid+for">Forecast Valid</a>: </div>
<div class="right">${hr(l0.h)} ${abbr} ${mon(l0.m)} ${l0.d}, ${l0.y}-${hr(lN.h)} ${abbr} ${mon(lN.m)} ${lN.d}, ${lN.y}</div>
</div>
</div>
</body>
</html>`;
}

module.exports = { STATIONS, nearestStation, placeFor, periods, worded, obsAt, metarResponse, dwml, mapClickHtml, dist, cardinal, cardinalShort, KNOWN, ptype };
