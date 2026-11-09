import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBundle } from '../src/codebook/bundle.ts';
import { loadCodebook } from '../src/codebook/io.ts';
import { validateLabel, type Label } from '../src/pipeline/label.ts';
import { modelLabelSchema } from '../src/pipeline/prompt.ts';

const codebook = buildBundle(loadCodebook(), 'now');

function good(): Label {
  return {
    schemaVersion: '1.0.0', codebookVersion: codebook.version, batch: 't',
    site: { slug: 's', url: 'https://x.test', finalUrl: 'https://x.test/', status: 200, title: 'X', capturedAt: '2026-01-01T00:00:00Z', viewport: { width: 1440, height: 900 }, screenshot: { ref: 'capture/screenshot.png', width: 1440, height: 3000 }, userAgent: 'ua', domain: 'commerce' },
    regions: [{ id: 'grid', role: 'product-grid', label: 'Products', bbox: { x: 0, y: 600, width: 1440, height: 1200 }, patterns: ['card'] }],
    patterns: [{ id: 'card', status: 'present', confidence: 0.9, evidence: [{ bbox: { x: 40, y: 640, width: 320, height: 420 }, region: 'grid', quote: 'Wool Runner' }], dims: { media: 'top-image', style: 'borderless' } }],
    structure: { layout: 'grid', regions: ['grid'], density: 'medium' },
    aesthetics: { palette: ['#ffffff', '#111111'], colorRoles: { background: '#ffffff', text: '#111111' }, typography: 'Sans', typeScale: '16/24/48', shape: 'soft', elevation: 'flat', borders: 'none', imagery: ['photography'], iconStyle: 'line', whitespace: 'generous', backgroundTreatment: 'solid', mood: ['calm'] },
    model: { rater: 'r', provider: 'anthropic', name: 'm', generatedAt: '2026-01-01T00:00:00Z' },
    notes: '',
  };
}

test('a correct label has no errors', () => {
  const r = validateLabel(good(), codebook);
  assert.deepEqual(r.errors, []);
});

test('codebook cross-checks', () => {
  const l = good();
  l.patterns[0].dims = { media: ['top-image'], hologram: 'x', style: 'glass' } as any;
  l.patterns.push({ id: 'crad', status: 'present', confidence: 0.9, evidence: [], dims: {} });
  l.patterns.push({ id: 'tabs', status: 'present', confidence: 0.4, evidence: [], dims: {} });
  l.patterns[0].evidence.push({ bbox: { x: 1400, y: 2900, width: 100, height: 200 } });
  const e = validateLabel(l, codebook).errors.join('\n');
  assert.match(e, /dims\.media is single-select/);
  assert.match(e, /dims\.hologram is not a sub-dimension/);
  assert.match(e, /"glass" is not a value of card\.style/);
  assert.match(e, /"crad" is not a codebook id \(did you mean card/);
  assert.match(e, /needs at least one evidence item with a bbox/);
  assert.match(e, /requires a rationale/);
  assert.match(e, /extends past the 1440x3000 screenshot/);
});

test('region/pattern consistency', () => {
  const l = good();
  l.regions[0].patterns.push('tabs');
  l.patterns[0].evidence[0].region = 'nav';
  const e = validateLabel(l, codebook).errors.join('\n');
  assert.match(e, /pattern "tabs" is not in patterns/);
  assert.match(e, /region "nav" is not a region id/);
});

test('model-facing schema has no harness fields and no $refs', () => {
  const s = modelLabelSchema();
  assert.deepEqual(Object.keys(s.properties).sort(), ['aesthetics', 'notes', 'patterns', 'regions', 'site', 'structure']);
  assert.ok(!JSON.stringify(s).includes('$ref'));
  assert.deepEqual(Object.keys(s.properties.structure.properties).sort(), ['density', 'layout']);
});
