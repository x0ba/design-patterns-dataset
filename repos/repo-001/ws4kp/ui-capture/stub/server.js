// Local stand-in for ws4kp's ASP.NET host (Program.cs + Middleware/CorsMiddleware.cs):
//  * serves the static site from the repo root (default document index.html)
//  * answers GET /cors/?u=<url> — the app's own proxy endpoint — from local stubs of every
//    upstream weather service instead of the internet
//  * answers /stub/<host>/<path> for the few calls the browser makes directly (ArcGIS geocoder,
//    GitHub buttons script); a small shim injected into the HTML rewrites those URLs.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const P = require('./products');
const P2 = require('./products2');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = +(process.env.PORT || 4476);
const LOG = !!process.env.STUB_LOG;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.otf': 'font/otf', '.ico': 'image/x-icon', '.txt': 'text/plain', '.wav': 'audio/wav' };

// case-insensitive path resolution (the code references images/ while the folder is Images/)
const dirCache = new Map();
function resolveCI(rel) {
  let cur = ROOT;
  for (const seg of rel.split('/').filter(Boolean)) {
    if (seg === '..') return null;
    let entries = dirCache.get(cur);
    if (!entries) { try { entries = fs.readdirSync(cur); } catch { return null; } dirCache.set(cur, entries); }
    const hit = entries.find((e) => e === seg) || entries.find((e) => e.toLowerCase() === seg.toLowerCase());
    if (!hit) return null;
    cur = path.join(cur, hit);
  }
  return cur;
}

const SHIM = fs.readFileSync(path.join(__dirname, 'shim.js'), 'utf8');
function injectShim(html) {
  // load right after jQuery so the ajax prefilter is in place before the app scripts run
  return html.replace(/(<script[^>]*jquery-3\.1\.0\.min\.js[^>]*><\/script>)/i, `$1\n    <script type="text/javascript" src="/__stub/shim.js"></script>`)
    .replace('https://buttons.github.io/buttons.js', '/stub/buttons.github.io/buttons.js');
}

function send(res, code, type, body, extra) {
  res.writeHead(code, Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }, extra || {}));
  res.end(body);
}
const json = (res, obj, cb) => cb ? send(res, 200, 'application/javascript', `${cb}(${JSON.stringify(obj)});`) : send(res, 200, 'application/json', JSON.stringify(obj));

// ---- upstream dispatcher --------------------------------------------------------------------
function upstream(res, target, cb) {
  let u;
  try { u = new URL(target); } catch { return send(res, 400, 'text/plain', 'bad url'); }
  const host = u.hostname.toLowerCase(), p = u.pathname, q = Object.fromEntries(u.searchParams);
  const now = new Date();
  if (LOG) console.log('[stub]', host + p + u.search.slice(0, 120));

  if (host === 'forecast.weather.gov' && /mapclick\.php/i.test(p)) {
    if ((q.FcstType || '').toLowerCase() === 'dwml') return send(res, 200, 'text/xml; charset=ISO-8859-1', P.dwml(+q.lat, +q.lon, now));
    return send(res, 200, 'text/html; charset=utf-8', P.mapClickHtml(+q.lat, +q.lon, now));
  }
  if (host === 'forecast.weather.gov' && /product\.php/i.test(p)) return send(res, 200, 'text/plain', P2.cliText((q.issuedby || 'SAN').toUpperCase(), now));
  if (host === 'forecast.weather.gov' && /shmrn\.php/i.test(p)) return send(res, 200, 'text/html', P2.shmrn(q.mz, now));
  if (host === 'aviationweather.gov' || host === 'www.aviationweather.gov') return send(res, 200, 'text/xml', P.metarResponse(q, now));
  if (host === 'api.weather.gov' && p.startsWith('/alerts/active')) return send(res, 200, 'application/geo+json', JSON.stringify(P2.alertsFor(q.zone || '', now)));
  if (host === 'tgftp.nws.noaa.gov' && p.includes('/forecasts/zone/')) return send(res, 200, 'text/plain', P2.zoneText(path.basename(p, '.txt'), now));
  if (host === 'api.weather.com' && p.startsWith('/v3/location/near')) { const [la, lo] = (q.geocode || '').split(',').map(Number); return json(res, P2.locationNear(la, lo)); }
  if (host === 'api.weather.com' && p.startsWith('/v2/astro')) { const [la, lo] = (q.geocode || '').split(',').map(Number); return json(res, P2.astro(la, lo, q.date, now)); }
  if (host === 'tidesandcurrents.noaa.gov' && p.includes('tidepredstations')) return json(res, P2.tideStations(+q.lat, +q.lon, +q.radius));
  if (host === 'tidesandcurrents.noaa.gov' && p.includes('/api/datagetter')) return json(res, P2.tidePredictions(q.station, q.begin_date, q.end_date));
  if (host === 'airnowgovapi.com') return json(res, P2.airnow(+q.latitude, +q.longitude, now));
  if (host === 'air-quality-api.open-meteo.com') return json(res, P2.openMeteoAqi(+q.latitude, +q.longitude, now));
  if (host === 'l-36.com') { const [la, lo] = (q.lat_long2 || '').split(',').map(Number); return send(res, 200, 'text/html', P2.l36(la, lo)); }
  if (host === 'mesonet.agron.iastate.edu') {
    const m = p.match(/\/archive\/data\/(\d{4}\/\d\d\/\d\d)\/GIS\/uscomp\/(n0r_(\d{12})\.png)?$/);
    if (m && m[2]) return send(res, 200, 'image/png', P2.radarPng(m[3], now));
    if (m) return send(res, 200, 'text/html', P2.radarListing(m[1], now));
    return send(res, 404, 'text/plain', 'not found');
  }
  if (host === 'www.cpc.ncep.noaa.gov') return send(res, 200, 'image/png', P2.outlookPng(p.includes('prcp') ? 'prcp' : 'temp'));
  if (host === 'geocode.arcgis.com') {
    if (p.endsWith('/suggest')) return json(res, P2.suggest(q.text || ''), cb);
    if (p.endsWith('/find') || p.endsWith('/findAddressCandidates')) return json(res, P2.find(q.text || '', q.magicKey), cb);
    if (p.endsWith('/reverseGeocode')) { const [lo, la] = (q.location || '').split(',').map(Number); return json(res, P2.reverseGeocode(lo, la), cb); }
  }
  if (host === 'buttons.github.io') return send(res, 200, 'application/javascript', fs.readFileSync(path.join(__dirname, 'github-buttons.js'), 'utf8'));
  if (target.endsWith('?rss=1')) return send(res, 200, 'application/rss+xml', fs.readFileSync(path.join(__dirname, 'feed.xml'), 'utf8'));
  // Anything else the real proxy would 403 (see HOST CHECK in CorsMiddleware.cs)
  return send(res, 403, 'text/plain', 'Forbidden');
}

const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    if (u.pathname.toLowerCase() === '/cors/' || u.pathname.toLowerCase() === '/cors') {
      const target = u.searchParams.get('u');
      if (!target) return send(res, 200, 'text/plain', '');
      return upstream(res, target, null);
    }
    if (u.pathname === '/__stub/shim.js') return send(res, 200, 'application/javascript', SHIM);
    if (u.pathname.startsWith('/stub/')) {
      const rest = u.pathname.slice(6);
      const sp = new URLSearchParams(u.search); const cb = sp.get('callback'); sp.delete('callback'); sp.delete('_');
      const qs = sp.toString();
      return upstream(res, `https://${rest}${qs ? '?' + qs : ''}`, cb);
    }
    let rel = decodeURIComponent(u.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = resolveCI(rel);
    if (!file || !fs.statSync(file).isFile() || file.includes(`${path.sep}.ui-capture${path.sep}`) || file.includes(`${path.sep}.git${path.sep}`)) return send(res, 404, 'text/plain', 'Not found');
    const ext = path.extname(file).toLowerCase();
    let body = fs.readFileSync(file);
    if (ext === '.html') body = injectShim(body.toString('utf8'));
    send(res, 200, TYPES[ext] || 'application/octet-stream', body, { 'Cache-Control': ext === '.html' ? 'no-store' : 'max-age=300' });
  } catch (e) {
    console.error(e);
    send(res, 500, 'text/plain', String(e && e.stack || e));
  }
});
server.listen(PORT, () => console.log(`ws4kp local server on http://localhost:${PORT}/`));
