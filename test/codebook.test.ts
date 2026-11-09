import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P } from '../src/paths.ts';
import { loadCodebook, readAtlasMeta } from '../src/codebook/io.ts';
import { validateCodebook, validateEntries } from '../src/codebook/validate.ts';
import { buildBundle } from '../src/codebook/bundle.ts';
import { slugify, uniqueSlugs, computeMetrics } from '../src/codebook/convert.ts';
import { checkProposal } from '../src/pipeline/proposals.ts';

test('the codebook validates', () => {
  assert.deepEqual(validateCodebook(), []);
});

test('validator catches dangling ids, bad preview dims and filename mismatches', () => {
  const cb = loadCodebook();
  const card = structuredClone(cb.entries.find((e) => e.id === 'card')!);
  card.relations.uses.push('no-such-pattern');
  card.previews = [{ file: 'card.svg', dims: { media: 'hologram', nope: 'x' } }];
  const problems = validateEntries([{ file: `${P.patterns}/carrd.yaml`, data: card }], cb.meta, { known: new Map(cb.entries.map((e) => [e.id, e])) });
  const msgs = problems.map((p) => p.message).join('\n');
  assert.match(msgs, /no-such-pattern/);
  assert.match(msgs, /"hologram" is not a declared value/);
  assert.match(msgs, /dims\.nope is not a declared sub-dimension/);
  assert.match(msgs, /filename does not match/);
});

test('slugs are kebab-case and unique within a list', () => {
  assert.equal(slugify('Focus + context'), 'focus-plus-context');
  assert.equal(slugify('Café & bar'), 'cafe-and-bar');
  assert.deepEqual(uniqueSlugs(['None', 'none', 'Top image']), ['none', 'none-2', 'top-image']);
});

test('metrics follow the documented formulas', () => {
  const m = computeMetrics({
    dims: [{ name: 'a', family: 'layout', q: '', subs: [{ name: 's', key: 's', sel: 'one', vars: [['x', '', ''], ['y', '', ''], ['z', '', '']] }, { name: 't', key: 't', sel: 'many', vars: [['p', '', ''], ['q', '', '']] }] }],
    scores: { ubiquity: 3, potential: 4, spec: 3 },
    wild: { score: 1, note: '', examples: [] },
  }, ['content', 'layout']);
  assert.equal(m.configSpace, 3 * 2 ** 2);
  assert.equal(m.malleabilityGap, 2);
  assert.equal(m.familyProfile, '01');
});

test('dist bundle references previews by path and carries the version', () => {
  const b = buildBundle(loadCodebook(), 'now');
  assert.equal(b.version, fs.readFileSync(P.version, 'utf8').trim());
  const card = b.entries.find((e) => e.id === 'card')!;
  assert.deepEqual(card.previews, [{ path: 'previews/card.svg' }]);
  assert.ok(!JSON.stringify(card.previews).includes('<svg'));
});

test('proposal checks', () => {
  const cb = loadCodebook();
  const entries = new Map(cb.entries.map((e) => [e.id, e]));
  const fams = readAtlasMeta().families.map((f) => f.id);
  assert.deepEqual(checkProposal({ id: 'card', kind: 'new-values', rationale: 'r', dimensions: [{ subdimensions: [{ id: 'media', values: [{ id: 'looping-video', name: 'Looping video' }] }] }] }, entries, fams), []);
  assert.match(checkProposal({ id: 'card', kind: 'new-values', rationale: 'r', dimensions: [{ subdimensions: [{ id: 'media', values: [{ id: 'none', name: 'None' }] }] }] }, entries, fams).join(), /already has value "none"/);
  assert.match(checkProposal({ id: 'card', kind: 'new-entry', rationale: 'r' }, entries, fams).join(), /already exists/);
  assert.match(checkProposal({ id: 'cookie-consent', kind: 'new-entry', rationale: 'r', name: 'Cookie consent', level: 'component', parent: 'card', definition: 'd', dimensions: [] }, entries, fams).join(), /not an archetype/);
});
