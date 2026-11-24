// Builds the offline stand-in for MapTiler map styles: two MapLibre style
// JSONs (light/dark) backed by Natural Earth country polygons (world-atlas),
// plus an empty glyph PBF so symbol layers (route arrows) don't error.
const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

const out = path.resolve(__dirname, '../maptiler-stub');
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
const topo = require('world-atlas/countries-50m.json');
const countries = topojson.feature(topo, topo.objects.countries);
const borders = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);
const round = (c) => (typeof c[0] === 'number' ? [Math.round(c[0] * 1e3) / 1e3, Math.round(c[1] * 1e3) / 1e3] : c.map(round));
for (const f of countries.features) f.geometry.coordinates = round(f.geometry.coordinates);
borders.coordinates = round(borders.coordinates);
fs.writeFileSync(path.join(out, 'countries.geojson'), JSON.stringify(countries));
fs.writeFileSync(path.join(out, 'borders.geojson'), JSON.stringify({ type: 'Feature', properties: {}, geometry: borders }));
fs.writeFileSync(path.join(out, 'fonts', 'empty.pbf'), Buffer.alloc(0));

const base = 'http://localhost:4457/maptiler-stub';
function style(name, c) {
  return {
    version: 8,
    name,
    glyphs: `${base}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      countries: { type: 'geojson', data: `${base}/countries.geojson`, attribution: '© Natural Earth (offline stub)' },
      borders: { type: 'geojson', data: `${base}/borders.geojson` },
    },
    layers: [
      { id: 'water', type: 'background', paint: { 'background-color': c.water } },
      { id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': c.land, 'fill-outline-color': c.coast } },
      { id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': c.border, 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.5, 10, 1.5], 'line-dasharray': [3, 2] } },
    ],
  };
}
fs.writeFileSync(path.join(out, 'style-light.json'), JSON.stringify(style('Offline light', { water: '#bfdcec', land: '#f2efe6', coast: '#a9c7d8', border: '#b7ab98' })));
fs.writeFileSync(path.join(out, 'style-dark.json'), JSON.stringify(style('Offline dark', { water: '#18222c', land: '#2a2e35', coast: '#33414f', border: '#55606c' })));
console.log('map stub written to', out);

// Country gazetteer for the geocoding stub (name + bbox + center).
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const gaz = countries.features.map((f) => {
  let [w, s, e, n] = [180, 90, -180, -90];
  const walk = (c) => { if (typeof c[0] === 'number') { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); } else c.forEach(walk); };
  walk(f.geometry.coordinates);
  return { name: f.properties.name, bbox: [w, s, e, n], center: [(w + e) / 2, (s + n) / 2] };
});
fs.writeFileSync(path.join(out, 'countries-gazetteer.json'), JSON.stringify(gaz));
