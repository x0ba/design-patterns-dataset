// Local server for the Mini Map Macau capture.
//   - serves the production build (.ui-capture/out) with SPA fallback
//   - /api/lrt/*  : the repo's own LRT Pages Function code (server/lrt-api.ts,
//                   server/lrt-window.ts, bundled to lrt-bundle/lrt.mjs) fed by
//                   the generated timetable in lrt-data/
//   - /_stub/*    : local stand-ins for the third-party hosts the browser calls
//                   (CARTO basemap styles + glyphs, OpenFreeMap buildings,
//                   DSAT live car-park vacancy, Google Fonts, gtag.js)
import http from 'node:http'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { dirname, resolve, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serveLrt, createLrtWindowProvider } from './lrt-bundle/lrt.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, 'out')
const ASSETS = resolve(here, 'stub-assets')
const PORT = Number(process.env.PORT || 4461)

const readJson = p => JSON.parse(readFileSync(p, 'utf8'))

// ---------- LRT ----------
const lrtProvide = createLrtWindowProvider({
  lrtLines: readJson(resolve(OUT, 'data/lrt-lines.json')),
  stations: readJson(resolve(OUT, 'data/stations.json')),
  trips: ['mon_thu', 'friday', 'sat_sun'].flatMap(t => readJson(resolve(here, `lrt-data/trips-${t}.json`))),
})

// ---------- basemap styles (CARTO Positron / Dark Matter stand-ins) ----------
function basemapStyle(origin, dark) {
  const c = dark
    ? { water: '#191b1d', land: '#0e0e0e', mainland: '#121212', park: '#141a14', casing: '#0e0e0e', road: '#2b2b2b', major: '#3a3a3a', label: '#8a8a8a', halo: '#0e0e0e', waterLabel: '#4d5257', boundary: '#333333' }
    : { water: '#d4dadc', land: '#fafaf8', mainland: '#f4f4f1', park: '#e5ecdf', casing: '#e2e2e2', road: '#ffffff', major: '#ffffff', label: '#7b7b7b', halo: '#ffffff', waterLabel: '#9eaab0', boundary: '#cfcfcf' }
  const src = name => ({ type: 'geojson', data: `${origin}/_stub/basemap/${name}.geojson` })
  const w = (z12, z18) => ['interpolate', ['exponential', 1.5], ['zoom'], 12, z12, 18, z18]
  return {
    version: 8,
    name: dark ? 'Dark Matter (local)' : 'Positron (local)',
    glyphs: `${origin}/_stub/glyphs/{fontstack}/{range}.pbf`,
    sources: { land: src('land'), parks: src('parks'), roads: src('roads'), places: src('places'), waterLabels: src('water-labels') },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': c.water } },
      { id: 'landcover', type: 'fill', source: 'land', paint: { 'fill-color': ['match', ['get', 'kind'], 'mainland', c.mainland, c.land], 'fill-antialias': true } },
      { id: 'park', type: 'fill', source: 'parks', minzoom: 11, paint: { 'fill-color': c.park, 'fill-opacity': 0.8 } },
      { id: 'boundary_sar', type: 'line', source: 'land', filter: ['==', ['get', 'kind'], 'macau'], paint: { 'line-color': c.boundary, 'line-width': 0.6 } },
      { id: 'road_minor_case', type: 'line', source: 'roads', minzoom: 14, filter: ['>=', ['get', 'rank'], 5], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.casing, 'line-width': w(0.5, 14) } },
      { id: 'road_major_case', type: 'line', source: 'roads', filter: ['<', ['get', 'rank'], 5], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.casing, 'line-width': w(1.4, 24) } },
      { id: 'road_minor', type: 'line', source: 'roads', minzoom: 13, filter: ['>=', ['get', 'rank'], 5], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.road, 'line-width': w(0.3, 11) } },
      { id: 'road_major', type: 'line', source: 'roads', filter: ['<', ['get', 'rank'], 5], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': c.major, 'line-width': w(0.9, 20) } },
      { id: 'waterway_label', type: 'symbol', source: 'waterLabels', minzoom: 12, layout: { 'text-field': ['concat', ['get', 'name'], '\n', ['get', 'name_zh']], 'text-font': ['Open Sans Italic'], 'text-size': 11, 'text-letter-spacing': 0.1 }, paint: { 'text-color': c.waterLabel, 'text-halo-color': c.water, 'text-halo-width': 1 } },
      { id: 'place_town', type: 'symbol', source: 'places', filter: ['>=', ['get', 'rank'], 2], minzoom: 11, layout: { 'text-field': ['concat', ['get', 'name'], '\n', ['get', 'name_zh']], 'text-font': ['Open Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 16, 14], 'text-transform': 'uppercase', 'text-letter-spacing': 0.1 }, paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.2 } },
      { id: 'place_city', type: 'symbol', source: 'places', filter: ['==', ['get', 'rank'], 1], maxzoom: 14, layout: { 'text-field': ['concat', ['get', 'name'], '\n', ['get', 'name_zh']], 'text-font': ['Open Sans Semibold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 9, 12, 14, 18], 'text-transform': 'uppercase', 'text-letter-spacing': 0.15 }, paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.4 } },
    ],
  }
}

// ---------- glyphs ----------
const FONTS = readdirSync(resolve(ASSETS, 'glyphs'))
function glyphFile(fontstack, range) {
  const wanted = fontstack.split(',').map(s => s.trim())
  const alias = f => FONTS.includes(f) ? f
    : /bold/i.test(f) ? 'Open Sans Bold'
    : /(medium|semibold)/i.test(f) ? 'Open Sans Semibold'
    : /italic/i.test(f) ? 'Open Sans Italic' : 'Open Sans Regular'
  for (const f of wanted.map(alias)) {
    const p = resolve(ASSETS, 'glyphs', f, `${range}.pbf`)
    if (existsSync(p)) return p
  }
  return null
}

// ---------- DSAT live car-park vacancy ----------
const carParks = readJson(resolve(OUT, 'data/car-parks.json')).carParks
function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 2 ** 32 }
function carParkXml() {
  const now = new Date()
  const macau = new Date(now.getTime() + 8 * 3600_000)
  const hour = macau.getUTCHours() + macau.getUTCMinutes() / 60
  // Occupancy follows the working day: fullest late morning and evening.
  const busy = 0.35 + 0.45 * Math.max(0, Math.sin(((hour - 6) / 16) * Math.PI)) + (hour > 19 && hour < 22 ? 0.1 : 0)
  const stamp = `${macau.getUTCMonth() + 1}/${macau.getUTCDate()}/${macau.getUTCFullYear()} ${((macau.getUTCHours() + 11) % 12) + 1}:${String(macau.getUTCMinutes()).padStart(2, '0')}:${String(macau.getUTCSeconds()).padStart(2, '0')} ${macau.getUTCHours() < 12 ? 'AM' : 'PM'}`
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const tick = Math.floor(now.getTime() / 30_000)
  const rows = carParks.map(p => {
    const r = hash(p.id), wobble = hash(p.id + ':' + tick) - 0.5
    const heavyOnly = /重型|Pesado|Heavy/i.test(p.name.zh + p.name.en)
    const capCar = heavyOnly ? 0 : Math.round(80 + r * 620)
    const capMoto = heavyOnly ? 0 : Math.round(40 + hash(p.id + 'm') * 380)
    const free = cap => cap ? Math.max(0, Math.round(cap * (1 - Math.min(0.995, busy + (r - 0.5) * 0.5 + wobble * 0.06)))) : ''
    const maintenance = hash(p.id + 'mt') < 0.03 ? 1 : 0
    const ev = !heavyOnly && hash(p.id + 'e') < 0.6 ? Math.round(hash(p.id + ':e' + tick) * 12) : ''
    return `  <Car_park_info ID="${esc(p.id)}" name="${esc(p.name.zh)}" CP_EName="${esc(p.name.en)}" CP_PName="${esc(p.name.pt)}" Car_CNT="${maintenance ? '' : free(capCar)}" MB_CNT="${maintenance ? '' : free(capMoto)}" Time="${stamp}" maintenance="${maintenance}" OT_A_CNT="" ELC_CNT="${ev}" DC_CNT="${ev === '' ? '' : Math.round(ev / 3)}">\n  </Car_park_info>`
  })
  return `<CarPark title="停車場車位顯示">\n${rows.join('\n')}\n</CarPark>\n`
}

// ---------- Google Fonts (from @fontsource packages) ----------
const FS = resolve(here, 'stub-deps/node_modules/@fontsource')
function googleCss() {
  const parts = []
  for (const [pkg, weights] of [['orbitron', [700, 900]], ['jetbrains-mono', [400, 500, 700]], ['noto-sans-hk', [400, 500, 700]]]) {
    for (const wgt of weights) {
      const css = readFileSync(resolve(FS, pkg, `${wgt}.css`), 'utf8')
      parts.push(css.replace(/url\(\.\/files\/([^)]+)\)/g, `url(/_stub/fonts/files/${pkg}/$1)`).replace(/font-display:\s*swap/g, 'font-display: swap'))
    }
  }
  return parts.join('\n')
}
const GOOGLE_CSS = googleCss()

// ---------- static ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.pbf': 'application/x-protobuf', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' }
function sendFile(res, path, extraHeaders = {}) {
  res.writeHead(200, { 'Content-Type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream', ...extraHeaders })
  res.end(readFileSync(path))
}
function safeJoin(root, p) {
  const full = normalize(join(root, decodeURIComponent(p)))
  return full.startsWith(root) ? full : null
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? `localhost:${PORT}`
    const origin = `http://${host}`
    const url = new URL(req.url ?? '/', origin)
    const path = url.pathname

    const lrt = /^\/api\/lrt\/([^/]+)\/?$/.exec(path)
    if (lrt) {
      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
      const response = serveLrt(new Request(url, { method: req.method, headers }), lrt[1], lrtProvide)
      res.statusCode = response.status
      response.headers.forEach((v, k) => res.setHeader(k, v))
      return res.end(await response.text())
    }

    if (path.startsWith('/_stub/')) {
      if (path === '/_stub/basemap/positron.json' || path === '/_stub/basemap/dark-matter.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(basemapStyle(origin, path.includes('dark'))))
      }
      let m
      if ((m = /^\/_stub\/basemap\/([\w-]+\.geojson)$/.exec(path))) return sendFile(res, resolve(ASSETS, 'basemap', m[1]), { 'Cache-Control': 'max-age=3600' })
      if ((m = /^\/_stub\/glyphs\/([^/]+)\/(\d+-\d+)\.pbf$/.exec(path))) {
        const f = glyphFile(decodeURIComponent(m[1]), m[2])
        if (f) return sendFile(res, f, { 'Cache-Control': 'max-age=86400' })
        res.writeHead(200, { 'Content-Type': 'application/x-protobuf' }); return res.end()
      }
      if (path === '/_stub/openfreemap/planet') {
        // OpenFreeMap TileJSON. The building tiles themselves are empty: no
        // offline copy of the planet's building footprints is available here.
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ tilejson: '3.0.0', name: 'OpenFreeMap (local stub)', tiles: [`${origin}/_stub/openfreemap/tiles/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 14, bounds: [-180, -85, 180, 85], vector_layers: [{ id: 'building', fields: { render_height: 'Number', render_min_height: 'Number', hide_3d: 'Boolean' } }] }))
      }
      if (path.startsWith('/_stub/openfreemap/tiles/')) { res.writeHead(200, { 'Content-Type': 'application/x-protobuf' }); return res.end() }
      if (path === '/_stub/dsat/car_park_maintance') {
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
        return res.end(carParkXml())
      }
      if (path === '/_stub/fonts/google.css') { res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' }); return res.end(GOOGLE_CSS) }
      if ((m = /^\/_stub\/fonts\/files\/([\w-]+)\/([\w.-]+\.woff2?)$/.exec(path))) {
        const f = resolve(FS, m[1], 'files', m[2])
        if (existsSync(f)) return sendFile(res, f, { 'Cache-Control': 'max-age=86400' })
      }
      if (path === '/_stub/gtag/js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end('/* analytics disabled locally */') }
      res.writeHead(404); return res.end('stub: not found')
    }

    const file = safeJoin(OUT, path === '/' ? '/index.html' : path)
    if (file && existsSync(file) && statSync(file).isFile()) return sendFile(res, file, path.startsWith('/assets/') ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : { 'Cache-Control': 'no-cache' })
    if (file && existsSync(file + '.html')) return sendFile(res, file + '.html')
    if (path.startsWith('/data/') || path.startsWith('/assets/')) { res.writeHead(404); return res.end('Not found') }
    return sendFile(res, resolve(OUT, 'index.html'), { 'Cache-Control': 'no-cache' })
  } catch (err) {
    console.error(err)
    res.writeHead(500); res.end('error')
  }
})
server.listen(PORT, () => console.log(`Mini Map Macau on http://localhost:${PORT}/`))
