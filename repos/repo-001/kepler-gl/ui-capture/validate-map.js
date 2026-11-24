// Sanity-check the seeded map with kepler.gl's own saved-map loader (KeplerGlSchema via processKeplerglJSON).
// Run from repo root: NODE_ENV=test node -r ./babel-register.js .ui-capture/validate-map.js
const fs = require('fs');
const {processKeplerglJSON} = require('@kepler.gl/processors');
const json = JSON.parse(
  fs.readFileSync(process.cwd() + '/.ui-capture/out/maps/norcal-seismic-ops.json', 'utf8')
);
const p = processKeplerglJSON(json);
p.datasets.forEach(d =>
  console.log(d.info.id, d.data.rows.length, d.data.fields.map(f => f.name + ':' + f.type).join(' '))
);
const c = p.config.visState;
console.log('layers', c.layers.map(l => l.type + ':' + l.config.label).join(' | '));
console.log('filters', c.filters.map(f => f.type + ':' + f.name).join(' | '));
