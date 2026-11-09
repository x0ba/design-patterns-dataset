import { test } from 'node:test';
import assert from 'node:assert/strict';
import { krippendorffAlpha } from '../src/irr/krippendorff.ts';
import { siteAgreement, consensusLabel } from '../src/irr/site.ts';
import type { Label } from '../src/pipeline/label.ts';

// Krippendorff (2011), "Computing Krippendorff's Alpha-Reliability", §C:
// 4 observers, 12 units, missing data. Published: nominal .743, ordinal .815, interval .849.
const A = [1, 2, 3, 3, 2, 1, 4, 1, 2, null, null, null];
const B = [1, 2, 3, 3, 2, 2, 4, 1, 2, 5, null, 3];
const C = [null, 3, 3, 3, 2, 3, 4, 2, 2, 5, 1, null];
const D = [1, 2, 3, 3, 2, 4, 4, 1, 2, 5, 1, null];
const units = A.map((_, i) => [A[i], B[i], C[i], D[i]]);

test('nominal alpha matches the published example', () => {
  const r = krippendorffAlpha(units.map((u) => u.map((v) => (v === null ? null : String(v)))), 'nominal');
  assert.equal(r.alpha!.toFixed(3), '0.743');
  assert.equal(r.units, 11); // unit 12 has a single value
});

test('ordinal alpha matches the published example', () => {
  const r = krippendorffAlpha(units.map((u) => u.map((v) => (v === null ? null : String(v)))), 'ordinal', ['1', '2', '3', '4', '5']);
  assert.equal(r.alpha!.toFixed(3), '0.815');
});

test('interval alpha matches the published example', () => {
  const r = krippendorffAlpha(units, 'interval');
  assert.equal(r.alpha!.toFixed(3), '0.849');
});

test('alpha is undefined without variation and 1 for perfect varied agreement', () => {
  assert.equal(krippendorffAlpha([['a', 'a'], ['a', 'a']], 'nominal').alpha, null);
  assert.equal(krippendorffAlpha([['a', 'a', 'a'], ['b', 'b', 'b']], 'nominal').alpha, 1);
});

function label(rater: string, over: Partial<Label['aesthetics']>, patterns: Label['patterns']): Label {
  return {
    schemaVersion: '1.0.0', codebookVersion: '1.0.0', batch: 't',
    site: { slug: 's', url: 'https://x', finalUrl: 'https://x', status: 200, title: '', capturedAt: '', viewport: { width: 1, height: 1 }, screenshot: { ref: '', width: 1440, height: 2000 }, userAgent: '', domain: 'productivity' },
    regions: [], patterns,
    structure: { layout: '', regions: [], density: 'medium' },
    aesthetics: { palette: ['#ffffff'], colorRoles: { background: '#ffffff', text: '#ffffff' }, typography: '', typeScale: '', shape: 'soft', elevation: 'flat', borders: 'thin', imagery: [], iconStyle: 'line', whitespace: 'generous', backgroundTreatment: 'solid', mood: ['x'], ...over },
    model: { rater, provider: 'x', name: 'm', generatedAt: '' },
    notes: '',
  };
}
const p = (id: string, status: 'present' | 'absent' | 'uncertain', confidence = 0.9, dims = {}) => ({ id, status, confidence, evidence: [{ bbox: { x: 0, y: 0, width: 10, height: 10 } }], dims });

test('site agreement lists disagreements and consensus takes the majority', () => {
  const ls = [
    label('r1', {}, [p('card', 'present', 0.9, { media: 'top-image' }), p('tabs', 'present')]),
    label('r2', { shape: 'sharp' }, [p('card', 'present', 0.8, { media: 'top-image' })]),
    label('r3', {}, [p('card', 'present', 0.9, { media: 'none' }), p('tabs', 'uncertain', 0.5)]),
  ];
  const a = siteAgreement(ls, ['r1', 'r2', 'r3'])!;
  assert.ok(a.disagreements.some((d) => d.field === 'aesthetics.shape'));
  assert.ok(a.disagreements.some((d) => d.field === 'pattern.status' && d.unit === 'tabs'));
  assert.ok(!a.disagreements.some((d) => d.field === 'pattern.status' && d.unit === 'card'));
  const c = consensusLabel(ls, ['r1', 'r2', 'r3'])!;
  assert.equal(c.aesthetics.shape.value, 'soft');
  const card = c.patterns.find((x) => x.id === 'card')!;
  assert.equal(card.status, 'present');
  assert.equal(card.support, 3);
  assert.equal(card.dims.media, 'top-image');
  // tabs: present / absent (unlisted) / uncertain -> three-way tie -> uncertain
  assert.equal(c.patterns.find((x) => x.id === 'tabs')!.status, 'uncertain');
});
