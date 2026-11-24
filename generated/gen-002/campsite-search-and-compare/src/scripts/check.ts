import { CAMPGROUNDS, CG_BY_ID } from '../src/data';
import { matches, DEFAULT_FILTERS } from '../src/filters';

const m = CAMPGROUNDS.filter((c) => matches(c, DEFAULT_FILTERS));
console.log('total', CAMPGROUNDS.length, 'match', m.length);
console.log(m.map((c) => `${c.name} (${c.operator}) ${c.driveMin}m $${c.priceMin}-${c.priceMax} ★${c.rating} openAll=${c.openAll}/${c.totalSites}`).join('\n'));
for (const id of ['pine-hollow', 'cedar-flat', 'manzanita-shores']) {
  const c = CG_BY_ID[id];
  const open = c.sites.filter((s) => s.open.every(Boolean));
  console.log(id, 'openAll', open.length, 'openAny', c.openAny, 'pct', c.openPct);
  console.log(open.map((s) => `${s.number} ${s.type} ${s.shade} ${s.restroomM}m ${s.tags.join('/')}`).join(' | '));
  console.log('restroom range', Math.min(...c.sites.map((s) => s.restroomM)), Math.max(...c.sites.map((s) => s.restroomM)));
}
console.log('price', Math.min(...CAMPGROUNDS.map((c) => c.priceMin)), Math.max(...CAMPGROUNDS.map((c) => c.priceMax)));
