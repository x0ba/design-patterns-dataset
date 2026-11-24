// More service renderers: zone text forecast, alerts, climate report, astronomy, tides,
// air quality, marine, radar (directory listing + PNG frames), CPC outlook maps, geocoding.
'use strict';
const zlib = require('zlib');
const M = require('./model');
const P = require('./products');
const { pad } = M;

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function nwsStamp(zone, d) {
  const l = M.local(zone, d);
  return `${l.h % 12 || 12}${pad(l.mi)} ${l.h < 12 ? 'AM' : 'PM'} ${M.tzAbbr(zone, d)} ${DOW[l.dow].charAt(0) + DOW[l.dow].slice(1).toLowerCase()} ${MON[l.m - 1].charAt(0) + MON[l.m - 1].slice(1).toLowerCase()} ${l.d} ${l.y}`;
}
function wrap(text, width = 66) {
  const out = []; let line = '';
  for (const w of text.split(' ')) {
    if ((line + ' ' + w).trim().length > width) { out.push(line.trim()); line = w; } else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out.join('\n');
}

// Issuance time of the "current" product: forecasts are issued around 2:30 and 1:30 local
function issued(zone, now, hourA = 2, hourB = 14, min = 32) {
  const l = M.local(zone, now);
  let d = M.fromLocal(zone, l.y, l.m, l.d, l.h >= hourB ? hourB : hourA, min);
  if (d > now) d = new Date(d.getTime() - 12 * M.HOUR);
  return d;
}

// ---- alerts (api.weather.gov/alerts/active?zone=) -------------------------------------
function alertsFor(zoneId, now) {
  const place = P.KNOWN.find((k) => k.zone === zoneId);
  const feats = [];
  if (place && place.zone === 'CAZ043') {
    const tz = 'America/Los_Angeles';
    const a0 = M.anchor(now);
    const sent = issued(tz, now, 3, 13, 47);
    const mk = (id, event, sev, onsetH, endH, headline, desc, instr, extra = {}) => {
      const onset = new Date(a0 + onsetH * M.HOUR), ends = new Date(a0 + endH * M.HOUR);
      feats.push({
        id: `https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.${id}`,
        type: 'Feature', geometry: null,
        properties: {
          '@id': `https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.${id}`, '@type': 'wx:Alert',
          id: `urn:oid:2.49.0.1.840.0.${id}`,
          areaDesc: 'San Diego County Coastal Areas',
          geocode: { SAME: ['006073'], UGC: ['CAZ043'] },
          affectedZones: ['https://api.weather.gov/zones/forecast/CAZ043'], references: [],
          sent: M.isoLocal(tz, sent), effective: M.isoLocal(tz, sent), onset: M.isoLocal(tz, onset),
          expires: M.isoLocal(tz, new Date(Math.min(ends.getTime(), sent.getTime() + 18 * M.HOUR))), ends: M.isoLocal(tz, ends),
          status: 'Actual', messageType: 'Alert', category: 'Met', severity: sev, certainty: 'Likely', urgency: 'Expected',
          event, sender: 'w-nws.webmaster@noaa.gov', senderName: 'NWS San Diego CA',
          headline: `${event} issued ${nwsStamp(tz, sent).replace(/^(\d+)(\d\d) /, '$1:$2 ')} by NWS San Diego CA`,
          description: desc, instruction: instr, response: 'Execute',
          parameters: { AWIPSidentifier: [extra.awips || 'NPWSGX'], WMOidentifier: [`WWUS76 KSGX ${pad(M.local(tz, sent).d)}${pad(sent.getUTCHours())}${pad(sent.getUTCMinutes())}`], NWSheadline: [headline], BLOCKCHANNEL: ['EAS', 'NWEM', 'CMAS'], VTEC: [extra.vtec || ''], eventEndingTime: [M.isoLocal(tz, ends)] },
        },
      });
    };
    const day1 = DOW[new Date(a0 + 36 * M.HOUR).getUTCDay()];
    const dayName = (h) => ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][M.local(tz, new Date(a0 + h * M.HOUR)).dow];
    mk('8f2c41e7b9d0a3c5e61f27d8a4b09c3e5f718263.001.1', 'Wind Advisory', 'Moderate', 12, 34,
      `WIND ADVISORY IN EFFECT FROM NOON TODAY TO 10 AM PST ${dayName(34)}`,
      `* WHAT...South winds 20 to 30 mph with gusts up to 50 mph expected, strongest along the coastal slopes and in exposed areas near the coast as the storm moves onshore.\n\n* WHERE...San Diego County Coastal Areas, including the cities of San Diego, Chula Vista, Oceanside, Carlsbad, Escondido and Poway.\n\n* WHEN...From noon today to 10 AM PST ${dayName(34).charAt(0) + dayName(34).slice(1).toLowerCase()}.\n\n* IMPACTS...Gusty winds will blow around unsecured objects. Tree limbs could be blown down and a few power outages may result.`,
      'Use extra caution when driving, especially if operating a high profile vehicle. Secure outdoor objects.',
      { awips: 'NPWSGX', vtec: `/O.NEW.KSGX.WI.Y.0019.000000T0000Z-000000T0000Z/` });
    mk('3d71a0b5c2e94f86a1027bd3e5c48f9a6b0d2e17.002.1', 'Flood Watch', 'Severe', 15, 42,
      `FLOOD WATCH IN EFFECT FROM 3 PM PST THIS AFTERNOON THROUGH ${dayName(42)} MORNING`,
      `* WHAT...Flooding caused by excessive rainfall is possible.\n\n* WHERE...Portions of southwest California, including the following areas, San Diego County Coastal Areas, San Diego County Valleys and San Diego County Mountains.\n\n* WHEN...From 3 PM PST this afternoon through ${dayName(42).charAt(0) + dayName(42).slice(1).toLowerCase()} morning.\n\n* IMPACTS...Excessive runoff may result in flooding of rivers, creeks, streams, and other low-lying and flood-prone locations. Area creeks and streams including the San Diego River at Fashion Valley and Mission Valley may rise out of their banks. Rocks and debris may fall onto canyon roads.\n\n* ADDITIONAL DETAILS...\n- Rainfall totals of 1 to 2 inches are expected across the coast and valleys, with 2 to 4 inches on south facing mountain slopes. Peak rainfall rates of 0.50 to 0.75 inches per hour are possible with the cold front tonight and early ${dayName(24).charAt(0) + dayName(24).slice(1).toLowerCase()}.\n- http://www.weather.gov/safety/flood`,
      'You should monitor later forecasts and be alert for possible Flood Warnings. Those living in areas prone to flooding should be prepared to take action should flooding develop.',
      { awips: 'FFASGX', vtec: '/O.NEW.KSGX.FA.A.0007.000000T0000Z-000000T0000Z/' });
    mk('a4e09b7c1d3f52e8b6c0a97d2e4f1b38c5d6e709.003.1', 'High Surf Advisory', 'Minor', 24, 60,
      `HIGH SURF ADVISORY IN EFFECT FROM MIDNIGHT TONIGHT TO NOON PST ${dayName(60)}`,
      `* WHAT...Surf of 5 to 8 feet with local sets to 10 feet on west facing beaches.\n\n* WHERE...San Diego County Coastal Areas.\n\n* WHEN...From midnight tonight to noon PST ${dayName(60).charAt(0) + dayName(60).slice(1).toLowerCase()}.\n\n* IMPACTS...Dangerous swimming and surfing conditions and localized beach erosion. Strong rip currents can pull even the strongest swimmers away from shore.`,
      'Inexperienced swimmers should remain out of the water due to dangerous surf conditions. Stay off rock jetties.',
      { awips: 'CFWSGX', vtec: '/O.NEW.KSGX.SU.Y.0011.000000T0000Z-000000T0000Z/' });
  }
  return {
    '@context': ['https://geojson.org/geojson-ld/geojson-context.jsonld', { '@version': '1.1', wx: 'https://api.weather.gov/ontology#', '@vocab': 'https://api.weather.gov/ontology#' }],
    type: 'FeatureCollection', features: feats,
    title: `Current watches, warnings, and advisories for ${zoneId}`, updated: new Date(now).toISOString().replace('.000Z', '+00:00'),
  };
}

// ---- zone forecast product (tgftp ... /zone/ca/caz043.txt) ----------------------------------
function zoneText(zoneId, now) {
  const k = P.KNOWN.find((x) => x.zone.toLowerCase() === zoneId.toLowerCase()) || P.KNOWN[0];
  const tz = M.zoneFor(k.lat, k.lon);
  const iss = issued(tz, now);
  const ps = P.periods(k, iss < now ? now : iss).slice(0, 13);
  const lines = [];
  const l = M.local(tz, iss);
  const exp = new Date(iss.getTime() + 12 * M.HOUR + 58 * 60000);
  lines.push(`Expires:${exp.getUTCFullYear()}${pad(exp.getUTCMonth() + 1)}${pad(exp.getUTCDate())}${pad(exp.getUTCHours())}${pad(exp.getUTCMinutes())};;${String(400000 + Math.floor(M.hash(l.d, l.h, 1) * 99999))}`);
  lines.push(`FPUS56 K${k.wfo} ${pad(iss.getUTCDate())}${pad(iss.getUTCHours())}${pad(iss.getUTCMinutes())}`);
  lines.push(`ZFP${k.wfo}`, '', 'Zone Forecast Product for Southwest California', `National Weather Service ${k.wfo === 'SGX' ? 'San Diego CA' : k.city + ' ' + k.state}`, nwsStamp(tz, iss), '');
  lines.push(`${k.zone}-${pad(exp.getUTCDate())}${pad(exp.getUTCHours())}${pad(exp.getUTCMinutes())}-`);
  lines.push(`${k.county || k.city}-`);
  if (k.zone === 'CAZ043') lines.push('Including the cities of San Diego, Chula Vista, Oceanside,', 'Carlsbad, Escondido, El Cajon, Vista, San Marcos, Encinitas,', 'and National City');
  lines.push(nwsStamp(tz, iss), '');
  if (k.zone === 'CAZ043') {
    lines.push('...WIND ADVISORY IN EFFECT FROM NOON TODAY TO 10 AM PST', `${['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][M.local(tz, new Date(M.anchor(now) + 34 * M.HOUR)).dow]}...`, '');
    lines.push('...FLOOD WATCH IN EFFECT FROM 3 PM PST THIS AFTERNOON THROUGH', `${['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][M.local(tz, new Date(M.anchor(now) + 42 * M.HOUR)).dow]} MORNING...`, '');
  }
  for (const p of ps) {
    const nm = p.name.toUpperCase().replace('THIS AFTERNOON', 'THIS AFTERNOON');
    lines.push(wrap(`.${nm}...${zoneWords(p)}`));
  }
  lines.push('', '$$', '');
  return lines.join('\n');
}
function zoneWords(p) {
  const parts = [];
  const sh = p.short;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (p.pop >= 80) parts.push(cap(sh.toLowerCase()) + (p.qpf > 0.9 ? ', heavy at times' : '') + '.');
  else if (p.pop >= 20) parts.push(`${p.cloud > 0.6 ? 'Mostly cloudy' : 'Partly cloudy'}. ${cap(sh.toLowerCase().replace('chance', 'a chance of').replace('slight a chance of', 'a slight chance of'))}.`);
  else parts.push(cap(sh.toLowerCase()) + '.');
  parts.push(p.isDay ? tempWord(p.temp, 'Highs') : tempWord(p.temp, 'Lows') + '.');
  if (p.isDay) parts[parts.length - 1] += '.';
  const spd = p.wind.spd, dir = P.cardinal(p.wind.dir);
  if (spd >= 15) parts.push(`${dir} winds ${Math.round((spd - 5) / 5) * 5} to ${Math.round((spd + 5) / 5) * 5} mph with gusts to ${Math.round(spd * 1.7 / 5) * 5} mph.`);
  else if (spd >= 8) parts.push(`${dir} winds ${Math.max(5, Math.round((spd - 4) / 5) * 5)} to ${Math.round((spd + 4) / 5) * 5} mph.`);
  else parts.push(`${dir === 'North' || dir === 'South' ? dir : dir} winds up to 10 mph.`);
  if (p.pop >= 20) parts.push(`Chance of ${p.kind === 'snow' ? 'snow' : 'rain'} ${p.pop >= 80 ? 'near 100' : p.pop} percent.`);
  return parts.join(' ').toUpperCase() === parts.join(' ') ? parts.join(' ') : parts.join(' ');
}
function tempWord(v, w) {
  const r = ((v % 10) + 10) % 10, d = v - r;
  if (r <= 3) return `${w} in the lower ${d}s`;
  if (r <= 6) return `${w} in the mid ${d}s`;
  return `${w} in the upper ${d}s`;
}

// ---- climate report (forecast.weather.gov/product.php?...product=CLI) ------------------------
function cliText(code, now) {
  const k = P.KNOWN.find((x) => x.iata === code) || P.KNOWN[0];
  const tz = M.zoneFor(k.lat, k.lon);
  const y = new Date(M.anchor(now) - 12 * M.HOUR);
  const l = M.local(tz, y);
  const n = M.local(tz, now);
  const dom = n.d;
  // Month-to-date rainfall: a couple of early-month showers plus yesterday's lead-in drizzle
  const mtd = (0.18 + 0.07 * Math.min(dom, 20) / 20 + (dom > 9 ? 0.21 : 0)).toFixed(2);
  const norm = (0.023 * dom).toFixed(2);
  const dep = (mtd - norm).toFixed(2);
  const T = P.obsAt(k.lat, k.lon, now, now, k.station);
  const hi = Math.round(M.dayTemps(k.lat, k.lon, -1, now).hi), lo = Math.round(M.dayTemps(k.lat, k.lon, -1, now).lo);
  return `
000
CDUS46 K${k.wfo} ${pad(now.getUTCDate())}0848
CLI${k.iata}

CLIMATE REPORT
NATIONAL WEATHER SERVICE ${k.wfo === 'SGX' ? 'SAN DIEGO CA' : k.city.toUpperCase() + ' ' + k.state}
1248 AM ${M.tzAbbr(tz, now)} ${DOW[n.dow]} ${MON[n.m - 1]} ${pad(n.d)} ${n.y}

...................................

...THE ${k.city.toUpperCase()} CLIMATE SUMMARY FOR ${MON[l.m - 1].replace(/^(.)(.*)$/, (a, b, c) => a)} ${l.d} ${l.y}...

CLIMATE NORMAL PERIOD: 1991 TO 2020
CLIMATE RECORD PERIOD: 1939 TO ${l.y}


WEATHER ITEM   OBSERVED TIME   RECORD YEAR NORMAL DEPARTURE LAST
                VALUE   (LST)  VALUE       VALUE  FROM      YEAR
                                                  NORMAL
...................................................................
TEMPERATURE (F)
 YESTERDAY
  MAXIMUM         ${pad(hi, 3).replace(/^0/, ' ')}    204 PM  88    1976  69     ${hi - 69 >= 0 ? ' ' : ''}${hi - 69}       71
  MINIMUM         ${pad(lo, 3).replace(/^0/, ' ')}    611 AM  42    1955  55     ${lo - 55 >= 0 ? ' ' : ''}${lo - 55}       58
  AVERAGE         ${Math.round((hi + lo) / 2)}                        62     ${Math.round((hi + lo) / 2) - 62}       65

PRECIPITATION (IN)
  YESTERDAY        0.02          1.31 1982   0.04  -0.02     0.00
  MONTH TO DATE    ${mtd}                      ${norm}   ${dep}     0.37
  SINCE OCT 1      0.71                      1.21  -0.50     0.93
  SINCE JAN 1      7.84                      9.25  -1.41     8.12

DEGREE DAYS
 HEATING
  YESTERDAY        3                         3       0        0
  MONTH TO DATE   38                        45      -7       21
 COOLING
  YESTERDAY        0                         0       0        2
  MONTH TO DATE   14                         9       5       27
...................................................................


WIND (MPH)
  HIGHEST WIND SPEED    14   HIGHEST WIND DIRECTION    SW (230)
  HIGHEST GUST SPEED    21   HIGHEST GUST DIRECTION    SW (220)
  AVERAGE WIND SPEED     6.8


SKY COVER
  AVERAGE SKY COVER 0.7


WEATHER CONDITIONS
THE FOLLOWING WEATHER WAS RECORDED YESTERDAY.
  DRIZZLE
  MIST


RELATIVE HUMIDITY (PERCENT)
 HIGHEST    93           500 AM
 LOWEST     58           200 PM
 AVERAGE    76

..........................................................

THE ${k.city.toUpperCase()} CLIMATE NORMALS FOR TODAY
                         NORMAL    RECORD    YEAR
 MAXIMUM TEMPERATURE (F)   69        90      1976
 MINIMUM TEMPERATURE (F)   54        41      1955


-  INDICATES NEGATIVE NUMBERS.
R  INDICATES RECORD WAS SET OR TIED.
MM INDICATES DATA IS MISSING.
T  INDICATES TRACE AMOUNT.

&&

$$
`;
}

// ---- api.weather.com: location/near + v2/astro ------------------------------------------------
function locationNear(lat, lon) {
  const k = P.placeFor(lat, lon);
  if (k.iata === 'SAN') {
    return { location: {
      airportName: ['San Diego International Airport', 'Montgomery-Gibbs Executive Airport', 'North Island Naval Air Station', 'Brown Field Municipal Airport', 'Gillespie Field', 'Mc Clellan-Palomar Airport', 'Tijuana International Airport', 'Ramona Airport', 'Oceanside Municipal Airport', 'Imperial County Airport'],
      iataCode: ['SAN', 'MYF', 'NZY', 'SDM', 'SEE', 'CLD', 'TIJ', 'RNM', 'OCN', 'IPL'],
      icaoCode: ['KSAN', 'KMYF', 'KNZY', 'KSDM', 'KSEE', 'KCRQ', 'MMTJ', 'KRNM', 'KOKB', 'KIPL'],
      latitude: [32.73, 32.82, 32.7, 32.57, 32.83, 33.13, 32.54, 33.04, 33.22, 32.83],
      longitude: [-117.19, -117.14, -117.2, -116.98, -116.97, -117.28, -116.97, -116.92, -117.35, -115.58],
      distanceKm: [3.29, 12.21, 5.41, 21.13, 19.58, 46.38, 23.11, 44.03, 58.27, 147.9],
      distanceMi: [2.04, 7.59, 3.36, 13.13, 12.17, 28.82, 14.36, 27.36, 36.21, 91.9],
    } };
  }
  return { location: { airportName: [k.airport], iataCode: [k.iata], icaoCode: [k.station], latitude: [k.lat], longitude: [k.lon], distanceKm: [8.2], distanceMi: [5.1] } };
}

function sunTimes(lat, lon, dateUTC0) {
  // NOAA solar calculator (sunrise/sunset), returns UTC Dates
  const rad = Math.PI / 180;
  const jd = dateUTC0 / 86400000 + 2440587.5 + 0.5;
  const n = Math.ceil(jd - 2451545.0 + 0.0008);
  const Js = n - lon / 360;
  const Mm = (357.5291 + 0.98560028 * Js) % 360;
  const C = 1.9148 * Math.sin(Mm * rad) + 0.02 * Math.sin(2 * Mm * rad) + 0.0003 * Math.sin(3 * Mm * rad);
  const lam = (Mm + C + 180 + 102.9372) % 360;
  const Jt = 2451545.0 + Js + 0.0053 * Math.sin(Mm * rad) - 0.0069 * Math.sin(2 * lam * rad);
  const dec = Math.asin(Math.sin(lam * rad) * Math.sin(23.44 * rad));
  const cosw = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  const w = Math.acos(Math.max(-1, Math.min(1, cosw))) / rad;
  const toDate = (j) => new Date((j - 2440587.5) * 86400000);
  return { rise: toDate(Jt - w / 360), set: toDate(Jt + w / 360) };
}
const SYN = 29.530588853, NEW0 = Date.UTC(2000, 0, 6, 18, 14);
function moonPhases(from, count) {
  const out = [];
  let k = Math.floor((from - NEW0) / (SYN * M.DAY)) - 1;
  const names = ['NEW_MOON', 'WAXING_HALF_FIRST_QTR', 'FULL_MOON', 'WANING_HALF_LAST_QTR'];
  while (out.length < count) {
    for (let q = 0; q < 4; q++) {
      const t = NEW0 + (k + q / 4) * SYN * M.DAY;
      if (t >= from - M.DAY && out.length < count) out.push({ t: new Date(t), phase: names[q] });
    }
    k++;
  }
  return out;
}
function astro(lat, lon, dateStr, now) {
  const tz = M.zoneFor(lat, lon);
  const y = +dateStr.substr(0, 4), m = +dateStr.substr(4, 2), d = +dateStr.substr(6, 2);
  const noonLocal = M.fromLocal(tz, y, m, d, 12, 0);
  const s = sunTimes(lat, lon, Date.UTC(y, m - 1, d));
  const isoZ = (dt) => dt.toISOString();
  const isoL = (dt) => M.isoLocal(tz, dt).replace(/(\d\d:\d\d:\d\d)/, '$1.000');
  const ph = moonPhases(noonLocal.getTime(), 8);
  return {
    metadata: { language: 'en-US', transactionId: `${Date.now()}:${Math.floor(M.hash(lat, lon, 1) * 1e9)}`, version: '1', latitude: +lat, longitude: +lon, units: 'e', status_code: 200 },
    astroData: [{
      dateLocal: `${y}-${pad(m)}-${pad(d)}`,
      sun: {
        riseSet: { rise: isoZ(s.rise), set: isoZ(s.set), riseLocal: isoL(s.rise), setLocal: isoL(s.set) },
        twilight: {},
        zenith: { local: isoL(new Date((s.rise.getTime() + s.set.getTime()) / 2)) },
        dayLength: Math.round((s.set - s.rise) / 60000),
      },
      moon: { riseSet: {}, phase: {} },
      visibleLight: null, tide: null,
    }],
    astroPhases: ph.map((p) => ({ date: M.isoLocal(tz, p.t).replace(/T.*$/, 'T00:00:00' + M.isoLocal(tz, p.t).slice(19)), dateLocal: M.isoLocal(tz, p.t).substr(0, 10), moonPhase: p.phase })),
  };
}

// ---- tides (tidesandcurrents.noaa.gov) -----------------------------------------------------
const TIDE_STATIONS = [
  { id: '9410170', name: 'San Diego, San Diego Bay', lat: 32.7142, lon: -117.1736, ph: 0, amp: 1 },
  { id: '9410230', name: 'La Jolla (Scripps Institution Wharf)', lat: 32.8669, lon: -117.2571, ph: -0.18, amp: 0.95 },
  { id: '9410166', name: 'Quarantine Station, San Diego Bay', lat: 32.7033, lon: -117.235, ph: -0.05, amp: 0.98 },
  { id: '9410120', name: 'Imperial Beach', lat: 32.5783, lon: -117.135, ph: -0.12, amp: 0.96 },
];
function tideStations(lat, lon, radius) {
  const list = TIDE_STATIONS.filter((s) => P.dist(lat, lon, s.lat, s.lon) <= (radius || 50) * 1.15);
  return { count: list.length, units: null, stationList: list.map((s) => ({ state: 'CA', tidepredoffsets: { self: '' }, type: 'R', timemeridian: -120, reference_id: s.id, timezonecorr: -8, id: s.id, name: s.name, lat: s.lat, lng: s.lon, affiliations: '', portscode: '', products: null, disclaimers: null, notices: null, self: null, expand: null, tideType: 'Mixed', stationId: s.id, distance: +P.dist(lat, lon, s.lat, s.lon).toFixed(2) })) };
}
function tidePredictions(stationId, begin, end) {
  const s = TIDE_STATIONS.find((x) => x.id === stationId) || TIDE_STATIONS[0];
  const tz = 'America/Los_Angeles';
  const t0 = M.fromLocal(tz, +begin.substr(0, 4), +begin.substr(4, 2), +begin.substr(6, 2), 0, 0).getTime();
  const t1 = M.fromLocal(tz, +end.substr(0, 4), +end.substr(4, 2), +end.substr(6, 2), 23, 59).getTime();
  const h = (t) => {
    const hr = t / M.HOUR + s.ph;
    return 2.9 + s.amp * (1.75 * Math.cos(2 * Math.PI * hr / 12.4206 - 1.1) + 0.42 * Math.cos(2 * Math.PI * hr / 12.0) + 1.08 * Math.cos(2 * Math.PI * hr / 23.9345 + 0.6) + 0.72 * Math.cos(2 * Math.PI * hr / 25.8193 - 0.4));
  };
  const preds = [];
  const step = 6 * 60000;
  for (let t = t0; t <= t1; t += step) {
    const a = h(t - step), b = h(t), c = h(t + step);
    if (b > a && b >= c) preds.push({ t, v: b, type: 'H' });
    else if (b < a && b <= c) preds.push({ t, v: b, type: 'L' });
  }
  return { predictions: preds.map((p) => { const l = M.local(tz, new Date(p.t)); return { t: `${l.y}-${pad(l.m)}-${pad(l.d)} ${pad(l.h)}:${pad(l.mi)}`, v: p.v.toFixed(3), type: p.type }; }) };
}

// ---- air quality ---------------------------------------------------------------------------------
function aqiCat(a) { return a <= 50 ? ['Good', 1] : a <= 100 ? ['Moderate', 2] : a <= 150 ? ['Unhealthy for Sensitive Groups', 3] : ['Unhealthy', 4]; }
function airnow(lat, lon, now) {
  const k = P.placeFor(lat, lon);
  const tz = M.zoneFor(lat, lon);
  const area = k.city === 'San Diego' ? 'San Diego County Region' : `${k.city} Region`;
  const out = [];
  const issue = M.local(tz, now);
  const fmt = (l) => `${pad(l.m)}/${pad(l.d)}/${pad(l.y % 100)}`;
  for (let d = -1; d <= 3; d++) {
    const l = M.local(tz, new Date(now.getTime() + d * M.DAY));
    // storm scrubs the air: moderate before it, very clean after
    const pm = [58, 46, 24, 21, 33][d + 1], o3 = [41, 37, 31, 34, 38][d + 1];
    for (const [param, aqi] of [['PM2.5', pm], ['O3', o3]]) {
      const [cat, num] = aqiCat(aqi);
      out.push({ issueDate: fmt(issue), validDate: fmt(l), timeValidLocal: '', timeValidGmt: '', dataType: 'F', reportingArea: area, stateCode: k.state, latitude: 32.8, longitude: -117.13, parameter: param, aqi, category: cat, categoryNumber: num, isActionDay: false, discussion: 'Onshore flow and showers associated with the incoming storm will keep particulate levels in check. Air quality is expected to be Good to low Moderate through the weekend.' });
    }
  }
  out.push({ issueDate: fmt(issue), validDate: fmt(issue), timeValidLocal: `${issue.h}:00`, timeValidGmt: `${now.getUTCHours()}:00`, dataType: 'O', reportingArea: area, stateCode: k.state, latitude: 32.8, longitude: -117.13, parameter: 'PM2.5', aqi: 44, category: 'Good', categoryNumber: 1, isActionDay: false, discussion: '' });
  return out;
}
function openMeteoAqi(lat, lon, now) {
  const tz = M.zoneFor(lat, lon);
  const l0 = M.local(tz, now);
  const start = M.fromLocal(tz, l0.y, l0.m, l0.d, 0, 0).getTime();
  const time = [], us = [];
  for (let i = 0; i < 72; i++) {
    const l = M.local(tz, new Date(start + i * M.HOUR));
    time.push(`${l.y}-${pad(l.m)}-${pad(l.d)}T${pad(l.h)}:00`);
    us.push(Math.round(30 + 18 * Math.sin(i / 24 * 2 * Math.PI) - i / 6));
  }
  return { latitude: +lat, longitude: +lon, generationtime_ms: 0.21, utc_offset_seconds: l0.off * 60, timezone: tz, timezone_abbreviation: M.tzAbbr(tz, now), elevation: 20, hourly_units: { time: 'iso8601', us_aqi: 'USAQI' }, hourly: { time, us_aqi: us } };
}

// ---- marine ---------------------------------------------------------------------------------
function l36(lat, lon) {
  const k = P.placeFor(lat, lon);
  const opts = k.marine ? `<option value="${k.marine}">${k.marine} - Coastal Waters from San Mateo Point to the Mexican Border and out to 30 nm</option>\n<option value="PZZ775">PZZ775 - Waters from San Mateo Point to the Mexican Border Extending 30 to 60 nm out including San Clemente Island</option>` : '';
  return `<html><head><title>Marine Weather by lat/long</title></head><body>
<h3>Marine weather for ${(+lat).toFixed(3)}, ${(+lon).toFixed(3)}</h3>
<form action="weather_marine_cg.php" method="get"><select name="zone1">${opts}</select><input type="submit" value="Go"></form>
</body></html>`;
}
function shmrn(mz, now) {
  const tz = 'America/Los_Angeles';
  const iss = issued(tz, now, 2, 14, 41);
  const days = P.periods({ lat: 32.6, lon: -117.45 }, now).slice(0, 6);
  const seas = [[5, 7], [8, 11], [9, 12], [7, 9], [5, 7], [4, 6]];
  const body = days.map((p, i) => {
    const w = p.wind; const dir = P.cardinalShort(w.dir).replace(/^(N|S|E|W)(N|S)(E|W)$/, '$2$3');
    const k = Math.round(w.spd * 0.87 / 5) * 5;
    const s = seas[i] || [4, 6];
    let t = `${dir} winds ${Math.max(5, k - 5)} to ${k + 5} kt${k >= 20 ? `, with gusts to ${k + 15} kt` : ''}. Wind waves ${Math.max(2, Math.round(s[0] / 2))} to ${Math.round(s[1] / 2)} ft. W swell ${s[0]} to ${s[1]} ft at ${11 + i % 3} seconds.`;
    if (p.pop >= 50) t += p.pop >= 80 ? ' Rain. Showers and isolated thunderstorms.' : ' Showers likely.';
    t = t.replace(/Wind waves.*?ft\. W swell (\d+) to (\d+) ft/, (m, a, b) => `Seas ${a} to ${b} ft. ${m}`);
    return `<b><font size="+1" color="#800000">${p.name.toUpperCase()}</font></b>...${t.toUpperCase()}<br><br>`;
  }).join('\n');
  return `<html><head><title>Marine Forecast for ${mz}</title></head><body>
<table width="100%"><tr><td>
<b>Coastal Waters from San Mateo Point to the Mexican Border and out to 30 nm-</b><br>
${nwsStamp(tz, iss)}<br><br>
<font size="+1" color="#FF0000">SMALL CRAFT ADVISORY IN EFFECT FROM 2 PM THIS AFTERNOON TO 4 AM PST FRIDAY</font><br><br>
.SYNOPSIS FOR SOUTHERN CALIFORNIA COASTAL WATERS...At 10 AM PST, a 1002 mb low was located 350 nm west of San Diego. The low will move onshore tonight with a cold front, bringing strong south to southwest winds, steep seas and showers. A large west swell will arrive behind the front.<br><br>
${body}
</td></tr></table></body></html>`;
}

// ---- radar ------------------------------------------------------------------------------------
// IEM n0r CONUS composite geometry: 6000x2600 px, NW corner (-126, 50), 0.01 deg/px.
// We emit it at half resolution (0.02 deg/px); the app rescales it onto a 2550x1600 canvas anyway.
const RW = 3000, RH = 1300, RLON0 = -126, RLAT0 = 50, RDEG = 0.02;
const PAL = [[0, 0, 0], [0, 236, 236], [1, 160, 246], [0, 0, 246], [0, 255, 0], [0, 200, 0], [0, 144, 0], [255, 255, 0], [231, 192, 0], [255, 144, 0], [255, 0, 0], [214, 0, 0], [192, 0, 0], [255, 0, 255]];
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function pngIndexed(w, h, pix, pal, trns) {
  const hdr = Buffer.alloc(13); hdr.writeUInt32BE(w, 0); hdr.writeUInt32BE(h, 4); hdr[8] = 8; hdr[9] = 3; hdr[10] = 0; hdr[11] = 0; hdr[12] = 0;
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; pix.copy(raw, y * (w + 1) + 1, y * w, y * w + w); }
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', hdr), chunk('PLTE', Buffer.from(pal.flat()))];
  if (trns) parts.push(chunk('tRNS', Buffer.from(trns)));
  parts.push(chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}
const radarCache = new Map();
function radarPng(stamp, now) {
  if (radarCache.has(stamp)) return radarCache.get(stamp);
  const when = new Date(Date.UTC(+stamp.substr(0, 4), +stamp.substr(4, 2) - 1, +stamp.substr(6, 2), +stamp.substr(8, 2), +stamp.substr(10, 2)));
  const t = M.tDays(when, now);
  const pix = Buffer.alloc(RW * RH);
  const drift = t * 3.0; // echoes advect with the flow
  for (let y = 0; y < RH; y++) {
    const lat = RLAT0 - y * RDEG;
    for (let x = 0; x < RW; x++) {
      const lon = RLON0 + x * RDEG;
      if ((x & 1) === 0 && (y & 1) === 0) { /* full res */ }
      const p = M.precip(lat, lon, t);
      if (p < 0.08) continue;
      const n1 = M.fbm(lon * 1.3 - drift, lat * 1.3 - drift * 0.4, 11);
      const n2 = M.fbm(lon * 5.5 - drift * 3, lat * 5.5, 23);
      const v = p * (0.25 + 1.25 * n1) + (n2 - 0.5) * 0.35;
      if (v < 0.32) continue;
      const dbz = 5 + (v - 0.32) * 46;
      let idx = Math.min(13, 1 + Math.floor(dbz / 5));
      if (idx <= 3) idx = 4 + (idx === 3 ? 0 : 0); // drop very light returns (app treats them as clear anyway)
      pix[y * RW + x] = idx;
    }
  }
  const png = pngIndexed(RW, RH, pix, PAL, null);
  radarCache.set(stamp, png);
  if (radarCache.size > 30) radarCache.delete(radarCache.keys().next().value);
  return png;
}
function radarListing(ymd, now) {
  // ymd = 'YYYY/MM/DD' (UTC); 5-minute frames up to the latest complete one
  const [y, m, d] = ymd.split('/').map(Number);
  const start = Date.UTC(y, m - 1, d), end = Math.min(start + M.DAY - 1, now.getTime() - 4 * 60000);
  const rows = [];
  for (let t = start; t <= end; t += 5 * 60000) {
    const dt = new Date(t);
    const s = `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}`;
    const lm = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes() + 2)}`;
    rows.push(`<tr><td valign="top"><img src="/icons/image2.gif" alt="[IMG]"></td><td><a href="n0q_${s}.png">n0q_${s}.png</a></td><td align="right">${lm}  </td><td align="right">1.1M</td><td>&nbsp;</td></tr>`);
    rows.push(`<tr><td valign="top"><img src="/icons/image2.gif" alt="[IMG]"></td><td><a href="n0r_${s}.png">n0r_${s}.png</a></td><td align="right">${lm}  </td><td align="right">412K</td><td>&nbsp;</td></tr>`);
    rows.push(`<tr><td valign="top"><img src="/icons/text.gif" alt="[TXT]"></td><td><a href="n0r_${s}.wld">n0r_${s}.wld</a></td><td align="right">${lm}  </td><td align="right"> 60 </td><td>&nbsp;</td></tr>`);
  }
  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
<html><head><title>Index of /archive/data/${ymd}/GIS/uscomp</title></head><body>
<h1>Index of /archive/data/${ymd}/GIS/uscomp</h1>
<table><tr><th valign="top"><img src="/icons/blank.gif" alt="[ICO]"></th><th><a href="?C=N;O=D">Name</a></th><th><a href="?C=M;O=A">Last modified</a></th><th><a href="?C=S;O=A">Size</a></th><th><a href="?C=D;O=A">Description</a></th></tr>
<tr><th colspan="5"><hr></th></tr>
<tr><td valign="top"><img src="/icons/back.gif" alt="[PARENTDIR]"></td><td><a href="/archive/data/${ymd}/GIS/">Parent Directory</a></td><td>&nbsp;</td><td align="right">  - </td><td>&nbsp;</td></tr>
${rows.join('\n')}
<tr><th colspan="5"><hr></th></tr>
</table>
</body></html>`;
}

// ---- CPC 30-day outlook maps (719x707) -------------------------------------------------------
function outlookPng(kind) {
  const W = 719, H = 707;
  const pix = Buffer.alloc(W * H);
  // palette: 0 white, 1 black, 2..: categories
  const pal = kind === 'temp'
    ? [[255, 255, 255], [0, 0, 0], [253, 212, 158], [252, 141, 89], [215, 48, 31], [198, 219, 239], [107, 174, 214], [33, 113, 181], [180, 180, 180]]
    : [[255, 255, 255], [0, 0, 0], [199, 233, 192], [116, 196, 118], [35, 139, 69], [246, 232, 195], [223, 194, 125], [191, 129, 45], [180, 180, 180]];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // crude CONUS mask: the app samples near its own projection of the point
      if (x < 40 || x > 690 || y < 120 || y > 600) { pix[y * W + x] = 0; continue; }
      const nx = x / W, ny = y / H;
      let c;
      if (kind === 'temp') {
        // warm south & east, cool northern plains/northwest
        const s = (ny - 0.35) * 1.6 + (nx - 0.4) * 0.6 + (M.vnoise(nx * 5, ny * 5, 4) - 0.5) * 0.5;
        c = s > 0.55 ? 4 : s > 0.3 ? 3 : s > 0.05 ? 2 : s > -0.2 ? 8 : s > -0.45 ? 5 : 6;
      } else {
        // wet north/west, dry southern tier
        const s = (0.5 - ny) * 1.5 + (0.45 - nx) * 0.5 + (M.vnoise(nx * 4, ny * 4, 9) - 0.5) * 0.5;
        c = s > 0.45 ? 3 : s > 0.15 ? 2 : s > -0.1 ? 8 : s > -0.35 ? 5 : 6;
      }
      pix[y * W + x] = c;
    }
  }
  return pngIndexed(W, H, pix, pal, null);
}

// ---- ArcGIS geocoder ------------------------------------------------------------------------
const STATE_NAMES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia' };
function suggest(text) {
  const q = text.toLowerCase().replace(/,.*$/, '').trim();
  const seen = new Set(), out = [];
  const zipHit = P.KNOWN.find((k) => k.zip && k.zip.startsWith(q));
  if (zipHit) out.push({ text: `${zipHit.zip}, ${zipHit.city}, ${STATE_NAMES[zipHit.state]}, USA`, magicKey: `ws4kp:${zipHit.lon},${zipHit.lat}`, isCollection: false });
  for (const k of P.KNOWN) if (k.city.toLowerCase().startsWith(q)) { const t = `${k.city}, ${STATE_NAMES[k.state]}, USA`; seen.add(t); out.push({ text: t, magicKey: `ws4kp:${k.lon},${k.lat}`, isCollection: false }); }
  for (const s of P.STATIONS) {
    if (out.length >= 10) break;
    const c = s.city.split('/')[0];
    if (!c.toLowerCase().startsWith(q) || !STATE_NAMES[s.state]) continue;
    const t = `${c}, ${STATE_NAMES[s.state]}, USA`;
    if (seen.has(t)) continue; seen.add(t);
    out.push({ text: t, magicKey: `ws4kp:${s.lon},${s.lat}`, isCollection: false });
  }
  return { suggestions: out.slice(0, 10) };
}
function find(text, magicKey) {
  let x, y;
  if (magicKey && magicKey.startsWith('ws4kp:')) [x, y] = magicKey.slice(6).split(',').map(Number);
  else { const s = suggest(text).suggestions[0]; if (s) [x, y] = s.magicKey.slice(6).split(',').map(Number); }
  if (x === undefined) return { spatialReference: { wkid: 4326, latestWkid: 4326 }, locations: [] };
  return { spatialReference: { wkid: 4326, latestWkid: 4326 }, locations: [{ name: text, extent: { xmin: x - 0.05, ymin: y - 0.05, xmax: x + 0.05, ymax: y + 0.05 }, feature: { geometry: { x, y }, attributes: { Score: 100, Addr_Type: 'Locality' } } }] };
}
function reverseGeocode(lon, lat) {
  const k = P.placeFor(lat, lon);
  return {
    address: { Match_addr: `${k.zip || ''}, ${k.city}, ${STATE_NAMES[k.state] || k.state}`, LongLabel: `${k.zip || ''}, ${k.city}, ${STATE_NAMES[k.state] || k.state}, USA`, ShortLabel: k.zip || k.city, Addr_type: 'Postal', Type: '', PlaceName: k.zip || '', AddNum: '', Address: '', Block: '', Sector: '', Neighborhood: '', District: '', City: k.city, MetroArea: '', Subregion: k.city === 'San Diego' ? 'San Diego County' : '', Region: STATE_NAMES[k.state] || k.state, RegionAbbr: k.state, Territory: '', Postal: k.zip || String(10000 + Math.floor(M.hash(lat, lon, 3) * 89999)), PostalExt: '', CntryName: 'United States', CountryCode: 'USA' },
    location: { x: +lon, y: +lat, spatialReference: { wkid: 4326, latestWkid: 4326 } },
  };
}

module.exports = { alertsFor, zoneText, cliText, locationNear, astro, tideStations, tidePredictions, airnow, openMeteoAqi, l36, shmrn, radarPng, radarListing, outlookPng, suggest, find, reverseGeocode };
