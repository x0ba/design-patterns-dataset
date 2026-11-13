import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildBundle } from '../src/codebook/bundle.ts';
import { loadCodebook } from '../src/codebook/io.ts';
import { echoTerms, frameArchetypes, frameDomains, planCells, toSlug } from '../src/generate/briefs.ts';
import { generationPrompt } from '../src/generate/app.ts';
import { resolveStatic, startLocalServer } from '../src/pipeline/serve.ts';
import { provenanceOf } from '../src/pipeline/rater.ts';
import { chromium } from 'playwright';
import { unrollPanels } from '../src/pipeline/capture.ts';

const codebook = buildBundle(loadCodebook(), 'now');

test('frame axes: label-schema domains minus landing/portfolio, codebook archetypes', () => {
  const d = frameDomains();
  assert.ok(d.includes('productivity') && d.includes('games'));
  assert.ok(!d.includes('marketing-landing') && !d.includes('portfolio-agency') && !d.includes('other'));
  const a = frameArchetypes(codebook).map((e) => e.id);
  assert.ok(a.includes('analyze') && a.includes('communicate'));
  assert.ok(a.every((id) => codebook.entries.find((e) => e.id === id)?.level === 'archetype'));
});

test('planCells: even marginals, distinct pairs, generators spread within domains', () => {
  const domains = frameDomains();
  const archetypes = frameArchetypes(codebook).map((e) => e.id);
  const gens = ['opus', 'sonnet', 'haiku'];
  const cells = planCells(60, domains, archetypes, gens, 7);
  assert.equal(cells.length, 60);
  const count = (k: 'domain' | 'archetype' | 'generator') => {
    const m = new Map<string, number>();
    for (const c of cells) m.set(c[k], (m.get(c[k]) ?? 0) + 1);
    return [...m.values()];
  };
  for (const k of ['domain', 'archetype', 'generator'] as const) {
    const cs = count(k);
    assert.ok(Math.max(...cs) - Math.min(...cs) <= 1, `${k} counts uneven: ${cs}`);
  }
  assert.equal(new Set(cells.map((c) => `${c.domain}|${c.archetype}`)).size, 60);
  // A domain sampled 3+ times never gets one generator every time.
  const byDomain = new Map<string, Set<string>>();
  for (const c of cells) (byDomain.get(c.domain) ?? byDomain.set(c.domain, new Set()).get(c.domain)!).add(c.generator);
  for (const [d, g] of byDomain) if (cells.filter((c) => c.domain === d).length >= 3) assert.ok(g.size > 1, d);
  // Deterministic for a seed.
  assert.deepEqual(planCells(10, domains, archetypes, gens, 7), cells.slice(0, 10));
});

test('echoTerms flags codebook pattern names, not archetypes', () => {
  const clean = { product: 'Tidewater', summary: 'Harbor berth assignments for a small port.', user: 'A harbormaster.', moment: 'Reassigning two ships after a delay.', data: '14 berths, 9 vessels with ETAs.' };
  assert.deepEqual(echoTerms(clean, codebook), []);
  const leaky = { ...clean, moment: 'Dragging ships across the kanban board to reassign them.' };
  assert.ok(echoTerms(leaky, codebook).some((h) => h.startsWith('kanban-board')));
});

test('toSlug and generation prompt', () => {
  assert.equal(toSlug('  Ambulance Dispatch / Regional!! '), 'ambulance-dispatch-regional');
  assert.ok(toSlug('x'.repeat(80)).length <= 40);
  const p = generationPrompt({ slug: 's', domain: 'health', archetype: 'monitor', generator: 'opus', product: 'Medline', summary: 'S.', user: 'U.', moment: 'M.', data: 'D.' });
  assert.match(p, /\.\/out\/index\.html/);
  assert.doesNotMatch(p, /monitor/i, 'the sampling archetype is not shown to the generator');
});

test('resolveStatic stays inside the root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<h1>hi</h1>');
  fs.mkdirSync(path.join(root, 'a'));
  fs.writeFileSync(path.join(root, 'a', 'index.html'), 'a');
  assert.equal(resolveStatic(root, '/'), path.join(root, 'index.html'));
  assert.equal(resolveStatic(root, '/a/'), path.join(root, 'a', 'index.html'));
  assert.equal(resolveStatic(root, '/../../etc/passwd'), undefined);
  assert.equal(resolveStatic(root, '/%2e%2e/%2e%2e/etc/passwd'), undefined);
  fs.rmSync(root, { recursive: true, force: true });
});

test('local server routes by <slug>.localhost and falls back to index.html for routes', async () => {
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-a-'));
  const b = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-b-'));
  fs.writeFileSync(path.join(a, 'index.html'), 'app-a');
  fs.mkdirSync(path.join(a, 'assets'));
  fs.writeFileSync(path.join(a, 'assets', 'x.js'), 'js');
  fs.writeFileSync(path.join(b, 'index.html'), 'app-b');
  const s = await startLocalServer(0);
  try {
    s.mount('app-a', a);
    s.mount('app-b', b);
    const get = async (host: string, p: string) => {
      const http = await import('node:http');
      return new Promise<{ status: number; body: string; type?: string }>((resolve, reject) => {
        http.get({ host: '127.0.0.1', port: s.port, path: p, headers: { host: `${host}:${s.port}` } }, (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => resolve({ status: res.statusCode!, body, type: res.headers['content-type'] }));
        }).on('error', reject);
      });
    };
    assert.equal((await get('app-a.localhost', '/')).body, 'app-a');
    assert.equal((await get('app-b.localhost', '/')).body, 'app-b');
    const js = await get('app-a.localhost', '/assets/x.js');
    assert.equal(js.body, 'js');
    assert.match(js.type!, /javascript/);
    assert.equal((await get('app-a.localhost', '/settings/profile')).body, 'app-a');
    assert.equal((await get('app-a.localhost', '/assets/missing.js')).status, 404);
    assert.equal((await get('nope.localhost', '/')).status, 404);
  } finally {
    await s.close();
    fs.rmSync(a, { recursive: true, force: true });
    fs.rmSync(b, { recursive: true, force: true });
  }
});

test('provenance defaults to captured', () => {
  assert.deepEqual(provenanceOf({ url: 'https://x.test' }), { source: 'captured' });
  assert.deepEqual(provenanceOf({ url: 'http://a.localhost:4318/', source: 'generated' }), { source: 'generated' });
});

// ------------------------------------------------- panel unrolling (browser)
const hasBrowser = fs.existsSync(chromium.executablePath());

test('unrollPanels reveals panel content in app layouts and leaves documents alone', { skip: !hasBrowser && 'no Playwright browser installed' }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const rows = (n: number) => Array.from({ length: n }, (_, i) => `<div style="height:40px">row ${i}</div>`).join('');
    // Fills the window; a sidebar that grows with it, and a fixed-height panel that does not.
    await page.setContent(`<body style="margin:0"><div style="height:100vh;display:flex;flex-direction:column">
      <header style="height:60px">top</header>
      <div style="flex:1;min-height:0;display:flex">
        <aside id="side" style="width:300px;overflow-y:auto">${rows(40)}</aside>
        <main style="flex:1;overflow-y:auto"><section id="fixed" style="height:300px;overflow-y:auto">${rows(20)}</section></main>
      </div></div></body>`);
    const r = await unrollPanels(page);
    assert.ok(r, 'panels detected');
    assert.equal(r.hiddenRemaining, 0);
    assert.equal(r.expandedInPlace, 1);
    assert.ok(r.viewportHeight >= 60 + 40 * 40, `window grew to fit the sidebar (${r.viewportHeight})`);
    const fixed = await page.locator('#fixed').evaluate((el) => el.scrollHeight - el.clientHeight);
    assert.ok(fixed < 24);

    const doc = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await doc.setContent(`<body>${rows(100)}</body>`);
    assert.equal(await unrollPanels(doc), undefined);
  } finally {
    await browser.close();
  }
});
