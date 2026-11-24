// Builds the local stand-in for the CARTO Positron / Dark Matter basemaps.
// The real app loads its basemap from basemaps.cartocdn.com (OpenStreetMap
// vector tiles); that host is unreachable here, so this script assembles an
// equivalent basemap from the OSM-derived data the repo already ships:
//   - land: the union of the OSM parish boundaries (public/data/parishes.json)
//     over Natural Earth 10m land for the surrounding mainland (Zhuhai/Hengqin)
//   - roads: the OSM road network carried in public/data/water-distribution.json
//   - a handful of place labels
// Output: .ui-capture/stub-assets/basemap/*.geojson (styles are rendered by
// stub-server.mjs so their URLs carry the request origin).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const require = createRequire(resolve(here, 'stub-deps/package.json'))
const union = require('@turf/union').default
const difference = require('@turf/difference').default
const buffer = require('@turf/buffer').default
const bboxClip = require('@turf/bbox-clip').default
const { featureCollection, polygon, multiPolygon } = require('@turf/helpers')

const out = resolve(here, 'stub-assets/basemap')
mkdirSync(out, { recursive: true })
const read = p => JSON.parse(readFileSync(resolve(repo, p), 'utf8'))

// Macau land from the parishes.
const parishes = read('public/data/parishes.json').parishes
let macau = null
for (const p of parishes) {
  const f = multiPolygon(p.geometry)
  macau = macau ? union(featureCollection([macau, f])) : f
}

// Mainland around Macau, with Natural Earth's coarse copy of Macau itself cut
// out so the parish outlines (and the channels between them) read correctly.
const ne = JSON.parse(readFileSync(resolve(here, 'stub-assets/ne_10m_land.geojson'), 'utf8'))
const bb = [113.2, 21.85, 113.9, 22.55]
const cut = buffer(macau, 0.15, { units: 'kilometers' })
const landParts = []
for (const f of ne.features) {
  const c = bboxClip(f, bb)
  const polys = c.geometry.type === 'Polygon' ? [c.geometry.coordinates] : c.geometry.coordinates
  for (const p of polys) {
    if (!p?.[0] || p[0].length < 4) continue
    // NE's own coarse Macau peninsula / Taipa-Coloane blobs: replaced by the parishes.
    const xs = p[0].map(c => c[0]), ys = p[0].map(c => c[1])
    if (Math.min(...xs) >= 113.51 && Math.max(...xs) <= 113.60 && Math.min(...ys) >= 22.09 && Math.max(...ys) <= 22.23) continue
    const d = difference(featureCollection([polygon(p), cut]))
    if (d) landParts.push(d)
  }
}
// Natural Earth predates the Hengqin reclamation and only has the old southern
// island, so add an approximate outline of today's Hengqin (east shore kept
// west of the Cotai/Coloane channel so the Hengqin LRT terminus sits on land).
const hengqin = polygon([[
  [113.528, 22.178], [113.537, 22.168], [113.541, 22.160], [113.5455, 22.150], [113.5462, 22.135],
  [113.547, 22.120], [113.545, 22.100], [113.535, 22.080], [113.505, 22.068], [113.475, 22.075],
  [113.462, 22.100], [113.470, 22.130], [113.490, 22.155], [113.510, 22.172], [113.528, 22.178],
]])
landParts.push(difference(featureCollection([hengqin, macau])) ?? hengqin)
const mainland = landParts.length ? landParts.reduce((a, b) => union(featureCollection([a, b]))) : null
const land = featureCollection([
  ...(mainland ? [{ ...mainland, properties: { kind: 'mainland' } }] : []),
  { ...macau, properties: { kind: 'macau' } },
])
writeFileSync(resolve(out, 'land.geojson'), JSON.stringify(land))

// Roads.
const roads = read('public/data/water-distribution.json').roads
const rank = { motorway: 1, trunk: 1, primary: 2, secondary: 3, tertiary: 4, unclassified: 5, residential: 5, living_street: 6, service: 6 }
writeFileSync(resolve(out, 'roads.geojson'), JSON.stringify(featureCollection(roads.map(r => ({
  type: 'Feature', properties: { class: r.class, rank: rank[r.class] ?? 6 },
  geometry: { type: 'LineString', coordinates: r.coordinates },
})))))

// Green space: the parks and hills that the IAM trails run through give a
// rough, honest outline (buffered trail lines), drawn as Positron's park tint.
const trails = read('public/data/trails.json')
const trailFeatures = trails.trails.filter(t => t.kind !== 'cycle' && t.geometry?.lines?.length)
  .map(t => ({ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: t.geometry.lines } }))
let parks = null
for (const f of trailFeatures) {
  try {
    const b = buffer(f, 0.12, { units: 'kilometers' })
    parks = parks ? union(featureCollection([parks, b])) : b
  } catch { /* skip odd geometries */ }
}
writeFileSync(resolve(out, 'parks.geojson'), JSON.stringify(featureCollection(parks ? [parks] : [])))

const places = [
  ['Macau', '澳門', 113.5439, 22.1987, 1], ['Taipa', '氹仔', 113.5590, 22.1580, 2],
  ['Coloane', '路環', 113.5560, 22.1220, 2], ['Cotai', '路氹城', 113.5650, 22.1425, 3],
  ['Zhuhai', '珠海', 113.5300, 22.2700, 1], ['Hengqin', '橫琴', 113.5100, 22.1300, 2],
  ['Gongbei', '拱北', 113.5480, 22.2240, 3], ['Wanzai', '灣仔', 113.5290, 22.1950, 3],
  ['Qianshan', '前山', 113.5130, 22.2360, 3], ['Xiangzhou', '香洲', 113.5600, 22.2900, 3],
].map(([en, zh, lng, lat, rank]) => ({ type: 'Feature', properties: { name: en, name_zh: zh, rank }, geometry: { type: 'Point', coordinates: [lng, lat] } }))
const water = [
  ['Pearl River Estuary', '珠江口', 113.6600, 22.2200], ['Inner Harbour', '內港', 113.5345, 22.1960],
  ['Outer Harbour', '外港', 113.5650, 22.1950],
].map(([en, zh, lng, lat]) => ({ type: 'Feature', properties: { name: en, name_zh: zh }, geometry: { type: 'Point', coordinates: [lng, lat] } }))
writeFileSync(resolve(out, 'places.geojson'), JSON.stringify(featureCollection(places)))
writeFileSync(resolve(out, 'water-labels.geojson'), JSON.stringify(featureCollection(water)))
console.log('basemap: land', land.features.length, 'roads', roads.length, 'trail parks', trailFeatures.length, 'places', places.length)
