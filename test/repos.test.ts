import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildBundle } from '../src/codebook/bundle.ts';
import { loadCodebook } from '../src/codebook/io.ts';
import { captureSite } from '../src/pipeline/capture.ts';
import { validateLabel, type Label } from '../src/pipeline/label.ts';
import { provenanceOf } from '../src/pipeline/rater.ts';
import { startLocalServer } from '../src/pipeline/serve.ts';
import { readSiteList } from '../src/pipeline/sites.ts';
import { appUrl, checkStep, describeStep, isAppPath } from '../src/pipeline/steps.ts';
import { spawn } from 'node:child_process';
import { AppHost, checkMise, portInUse, readAppJson, startServer, staticDir, stopStrays } from '../src/repos/apps.ts';
import { archiveContract } from '../src/repos/setup.ts';
import { acceptable, domainQuotas, sample, searchQuery, toCandidate, type Candidate } from '../src/repos/discover.ts';
import { ExplorerTools, jaccard } from '../src/repos/explore.ts';
import { checkoutDir, readReposConfig, type ScreenResult } from '../src/repos/frame.ts';
import { appSpecFor } from '../src/repos/sites.ts';
import { baseEnv, claudeSandboxSettings, denyReadPaths, findMise, setupEnv, miseEnv, runtimeEnv, runtimeProfile, runtimeSandboxAvailable } from '../src/repos/sandbox.ts';
import { frameDomains } from '../src/generate/briefs.ts';

const hasBrowser = fs.existsSync(chromium.executablePath());
const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));

// ---------------------------------------------------------------- discovery

test('config/repos.yaml has search terms for every frame domain', () => {
  const cfg = readReposConfig();
  for (const d of frameDomains()) assert.ok(cfg.discovery.queries[d]?.length, `no queries for ${d}`);
  assert.ok(cfg.setup.sandbox, 'sandbox on by default');
  assert.ok(!cfg.setup.network.includes('api.github.com'), 'the setup sandbox cannot reach the GitHub API');
});

test('search query and candidate filter', () => {
  const q = searchQuery('topic:budgeting', { minStars: 150, pushedWithinDays: 10, languages: ['TypeScript', 'Vue'], licenses: [], perQuery: 50, queries: {} }, new Date('2026-11-15T00:00:00Z'));
  assert.equal(q, 'topic:budgeting stars:>=150 archived:false fork:false pushed:>=2026-11-05 language:TypeScript language:Vue');
  const item = { full_name: 'a/b', html_url: 'https://github.com/a/b', description: 'x', stargazers_count: 300, license: { spdx_id: 'MIT' }, language: 'TypeScript', topics: ['t'], default_branch: 'main', pushed_at: '2026-01-01' };
  assert.equal(toCandidate(item, 'finance', ['MIT'])?.repo, 'a/b');
  assert.equal(toCandidate({ ...item, license: { spdx_id: 'NOASSERTION' } }, 'finance', ['MIT']), undefined);
  assert.equal(toCandidate({ ...item, license: null }, 'finance', ['MIT']), undefined);
  assert.equal(toCandidate({ ...item, is_template: true }, 'finance', ['MIT']), undefined);
});

test('domainQuotas splits n evenly and deterministically', () => {
  const ds = frameDomains();
  const q = domainQuotas(25, ds, 3);
  assert.equal([...q.values()].reduce((a, b) => a + b, 0), 25);
  assert.ok(Math.max(...q.values()) - Math.min(...q.values()) <= 1);
  assert.deepEqual(domainQuotas(25, ds, 3), q);
});

test('sample fills quotas by screened domain, skips excluded and unrunnable repos, reports shortfall', async () => {
  const cand = (repo: string, foundFor: string[]): Candidate => ({ repo, url: '', description: '', stars: 1, license: 'MIT', language: 'TypeScript', topics: [], branch: 'main', pushedAt: '', foundFor });
  const pool = new Map([
    ['f/1', cand('f/1', ['finance'])], ['f/2', cand('f/2', ['finance'])], ['f/3', cand('f/3', ['finance'])],
    ['f/lib', cand('f/lib', ['finance'])], ['f/pg', cand('f/pg', ['finance'])],
    ['g/1', cand('g/1', ['games'])], ['g/x', cand('g/x', ['games'])],
  ].map(([k, v]) => [k as string, v as Candidate]));
  const verdict: Record<string, ScreenResult> = {
    'f/1': { kind: 'application', runnable: 'static', domain: 'finance', reason: '' },
    'f/2': { kind: 'application', runnable: 'server', domain: 'games', reason: 'actually a game' },
    'f/3': { kind: 'application', runnable: 'unclear', domain: 'finance', reason: '' },
    'f/lib': { kind: 'library', runnable: 'static', domain: 'finance', reason: '' },
    'f/pg': { kind: 'application', runnable: 'needs-services', domain: 'finance', reason: '' },
    'f/key': { kind: 'application', runnable: 'needs-external', domain: 'finance', reason: 'needs an OpenAI key' },
    'g/1': { kind: 'application', runnable: 'static', domain: 'games', reason: '' },
    'g/x': { kind: 'application', runnable: 'static', domain: 'games', reason: '' },
  };
  let calls = 0;
  const res = await sample(pool, new Map([['finance', 2], ['games', 2], ['health', 1]]), 1, 3, async (cs) => {
    calls++;
    return new Map(cs.map((c) => [c.repo, verdict[c.repo]]));
  }, { exclude: new Set(['g/x']) });
  const picked = res.picked.map((p) => `${p.c.repo}:${p.s.domain}`).sort();
  assert.deepEqual(picked, ['f/1:finance', 'f/2:games', 'f/3:finance', 'g/1:games']);
  assert.deepEqual([...res.shortfall], [['health', 1]]);
  assert.ok(calls <= 4);
  assert.ok(acceptable(verdict['f/3'], ['finance']));
  assert.ok(!acceptable(verdict['f/pg'], ['finance']), 'needs Docker services: dropped');
  assert.ok(acceptable(verdict['f/key'], ['finance']), 'needs API keys: kept, setup stubs them');
});

// -------------------------------------------------------------------- steps

test('steps are validated, in site lists too', () => {
  assert.deepEqual(checkStep({ action: 'click', target: { role: 'button', name: 'Save' } }), []);
  assert.match(checkStep({ action: 'click' }).join(), /needs a target/);
  assert.match(checkStep({ action: 'click', target: { role: 'button', text: 'x' } as any }).join(), /exactly one/);
  assert.match(checkStep({ action: 'goto', path: 'x' }).join(), /starting with a single \//);
  for (const off of ['//evil.example/x', '/\\evil.example/x', '/\t/evil.example/x', 'http://evil.example/']) {
    assert.ok(!isAppPath(off), off);
    assert.match(checkStep({ action: 'goto', path: off }).join(), /path on the app/, off);
    assert.throws(() => appUrl('http://localhost:4400/', off), /not a path on the app/, off);
  }
  assert.equal(appUrl('http://localhost:4400/', '/inbox?x=1#/thread/2'), 'http://localhost:4400/inbox?x=1#/thread/2');
  assert.equal(describeStep({ action: 'fill', target: { label: 'Email' }, value: 'a@b.c' }), 'fill field labelled "Email" with "a@b.c"');
  const dir = tmp('sites-');
  const f = path.join(dir, 's.yaml');
  fs.writeFileSync(f, 'sites:\n  - url: http://a.localhost:1/\n    steps:\n      - { action: fill, target: { label: Name } }\n');
  assert.throws(() => readSiteList(f), /steps\[0\]: fill needs a value/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('jaccard', () => {
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['a', 'b'])), 1);
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['b', 'c'])), 1 / 3);
});

// A small app with state that has no URL: a button opens an editor panel.
const FIXTURE = `<!doctype html><title>Fixture</title><body style="font:16px system-ui;margin:0">
<nav><a href="/">Home</a> <a href="/reports">Reports</a></nav>
<main id="m"><h1>Projects</h1><ul><li>Harbor survey</li><li>Tide tables</li><li>Buoy maintenance</li></ul>
<button onclick="document.getElementById('ed').hidden=false;document.getElementById('m').hidden=true">Open editor</button></main>
<section id="ed" hidden><h1>Editor panel</h1><label>Title <input></label><p>Draft notes for the harbor survey with mooring positions and depths.</p></section>
<script>if (location.pathname === '/reports') document.getElementById('m').innerHTML = '<h1>Reports</h1><p>Quarterly tide report</p>';
if (location.hash === '#/drafts') { document.getElementById('ed').hidden = false; document.getElementById('m').hidden = true; }</script>
</body>`;

test('explorer saves replayable views, refuses duplicates; capture replays steps', { skip: !hasBrowser && 'no Playwright browser installed' }, async () => {
  const out = tmp('fixture-');
  fs.writeFileSync(path.join(out, 'index.html'), FIXTURE);
  const views = tmp('views-');
  const server = await startLocalServer(0);
  const browser = await chromium.launch();
  try {
    const base = server.mount('fixture', out);
    const tools = new ExplorerTools({ browser, base, entry: '/', maxViews: 3, maxActions: 10, viewsDir: views });
    await tools.open();
    const tree = await tools.execute('read_page', {});
    assert.match(tree.text, /button "Open editor"/);
    let r = await tools.execute('act', { action: 'click', target: { role: 'button', name: 'Open editor' } });
    assert.ok(!r.isError, r.text);
    r = await tools.execute('save_view', { slug: 'editor', name: 'Editor', description: 'Editing a project' });
    assert.ok(!r.isError, r.text);
    assert.deepEqual(tools.views[0].steps, [{ action: 'click', target: { role: 'button', name: 'Open editor' } }]);
    assert.ok(fs.existsSync(path.join(views, 'editor.png')));
    r = await tools.execute('save_view', { slug: 'editor-again', name: 'Editor', description: 'same' });
    assert.ok(r.isError && /looks the same/.test(r.text), r.text);
    r = await tools.execute('goto', { path: '/reports' });
    r = await tools.execute('save_view', { slug: 'reports', name: 'Reports', description: 'Reports list' });
    assert.ok(!r.isError, r.text);
    assert.equal(tools.views[1].path, '/reports');
    assert.equal(tools.views[1].steps.length, 0);
    // A hash route is its own screen, even with the same words as another view.
    r = await tools.execute('goto', { path: '/#/drafts' });
    r = await tools.execute('save_view', { slug: 'drafts', name: 'Drafts', description: 'Drafts route' });
    assert.ok(!r.isError, r.text);
    assert.equal(tools.views[2].path, '/#/drafts');
    assert.ok((await tools.execute('finish', { summary: 'done' })).stop);
    await tools.close();

    // Capture lands in the replayed state.
    const cdir = tmp('cap-');
    const meta = await captureSite(browser, base, cdir, { steps: tools.views[0].steps });
    assert.equal(meta.steps, 1);
    const elements = JSON.parse(fs.readFileSync(path.join(cdir, 'elements.json'), 'utf8'));
    assert.ok(elements.some((e: any) => e.kind === 'heading' && e.text === 'Editor panel'));
    assert.ok(!elements.some((e: any) => e.kind === 'heading' && e.text === 'Projects'));
    await assert.rejects(captureSite(browser, base, cdir, { steps: [{ action: 'click', target: { role: 'button', name: 'Nope' } }] }), /step 1\/1 \(click button "Nope"\) failed/);
    fs.rmSync(cdir, { recursive: true, force: true });
  } finally {
    await browser.close();
    await server.close();
    fs.rmSync(out, { recursive: true, force: true });
    fs.rmSync(views, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------ sandbox

test('sandbox settings and runtime profile', () => {
  const s = claudeSandboxSettings(['registry.npmjs.org']) as any;
  assert.equal(s.sandbox.enabled, true);
  assert.equal(s.sandbox.allowUnsandboxedCommands, false);
  assert.equal(s.sandbox.network.allowLocalBinding, true);
  assert.equal(s.sandbox.enableWeakerNetworkIsolation, true);
  assert.ok(s.sandbox.filesystem.denyRead.includes('~/.ssh'));
  const p = runtimeProfile(['/work/x'], '/home/u');
  assert.match(p, /\(subpath "\/work\/x"\)/);
  assert.match(p, /\(deny network-outbound\)/);
  assert.match(p, /\(subpath "\/home\/u\/\.ssh"\)/);
  // A custom CLAUDE_CONFIG_DIR (where the login may live) is denied too, in each syntax.
  const c = claudeSandboxSettings([], '/home/u', { CLAUDE_CONFIG_DIR: '/srv/claude-cfg' }) as any;
  assert.ok(c.sandbox.filesystem.denyRead.includes('/srv/claude-cfg'));
  assert.ok(c.permissions.deny.includes('Read(//srv/claude-cfg/**)'));
  const h = claudeSandboxSettings([], '/home/u', { CLAUDE_CONFIG_DIR: '~/cfg/claude' }) as any;
  assert.ok(h.sandbox.filesystem.denyRead.includes('~/cfg/claude'));
  assert.ok(h.permissions.deny.includes('Read(~/cfg/claude/**)'));
  assert.ok(denyReadPaths('/home/u', { CLAUDE_CONFIG_DIR: '/srv/claude-cfg' }).includes('/srv/claude-cfg'));
});

test('contract check', () => {
  const dir = tmp('co-');
  assert.match(readAppJson(dir).problems[0], /app\.json is missing/);
  fs.mkdirSync(path.join(dir, '.ui-capture'));
  fs.writeFileSync(path.join(dir, '.ui-capture', 'app.json'), JSON.stringify({ mode: 'server', entry: 'home', notes: '' }));
  const p = readAppJson(dir).problems.join('\n');
  assert.match(p, /"entry" must be a path/);
  assert.match(p, /start\.sh does not exist/);
  assert.match(p, /"stubs" must be a list/);
  fs.writeFileSync(path.join(dir, '.ui-capture', 'start.sh'), '');
  fs.writeFileSync(path.join(dir, '.ui-capture', 'app.json'), JSON.stringify({ mode: 'server', entry: '/', notes: 'n', stubs: [{ service: 'OpenAI API', how: 'local stub server on PORT+1' }] }));
  assert.deepEqual(readAppJson(dir).problems, []);
  fs.writeFileSync(path.join(dir, '.ui-capture', 'app.json'), JSON.stringify({ mode: 'server', entry: '//evil.example/', notes: 'n', stubs: [] }));
  assert.match(readAppJson(dir).problems.join(), /"entry" must be a path on the app/);
  // Static builds must be a real dir in the checkout, not a link to the host.
  const host = tmp('hostdir-');
  fs.writeFileSync(path.join(host, 'index.html'), 'x');
  fs.symlinkSync(host, path.join(dir, '.ui-capture', 'out'));
  fs.writeFileSync(path.join(dir, '.ui-capture', 'app.json'), JSON.stringify({ mode: 'static', entry: '/', notes: 'n', stubs: [] }));
  assert.match(readAppJson(dir).problems.join(), /out resolves outside the checkout/);
  assert.throws(() => staticDir(dir), /outside the checkout/);
  fs.rmSync(path.join(dir, '.ui-capture', 'out'));
  fs.mkdirSync(path.join(dir, '.ui-capture', 'out'));
  fs.writeFileSync(path.join(dir, '.ui-capture', 'out', 'index.html'), 'x');
  assert.deepEqual(readAppJson(dir).problems, []);
  assert.equal(staticDir(dir), fs.realpathSync(path.join(dir, '.ui-capture', 'out')));
  fs.rmSync(host, { recursive: true, force: true });
  fs.rmSync(dir, { recursive: true, force: true });
});

test('mise is per checkout: its shims first, the user\'s mise shims and global config out', () => {
  const co = '/x/co';
  const saved = process.env.PATH;
  process.env.PATH = ['/Users/u/.local/share/mise/shims', '/usr/bin'].join(path.delimiter);
  try {
    const env = miseEnv(co, '/opt/mise/bin/mise');
    const dirs = env.PATH.split(path.delimiter);
    assert.equal(dirs[0], '/x/co/.ui-capture/mise/data/shims');
    assert.equal(dirs[1], '/opt/mise/bin');
    assert.ok(!dirs.includes('/Users/u/.local/share/mise/shims'));
    assert.equal(env.MISE_GLOBAL_CONFIG_FILE, '/x/co/.ui-capture/mise/config/config.toml');
    assert.equal(env.MISE_TRUSTED_CONFIG_PATHS, co);
  } finally {
    process.env.PATH = saved;
  }
  const rt = tmp('rt-');
  assert.equal(runtimeEnv(rt).MISE_OFFLINE, '1', 'serving never downloads tools');
  fs.rmSync(rt, { recursive: true, force: true });
});

test('setup and serving get an allowlisted environment, not exported secrets', () => {
  process.env.GH_TOKEN = 'ghp_secret';
  process.env.AWS_SECRET_ACCESS_KEY = 'aws_secret';
  try {
    const co = '/tmp/co';
    for (const env of [setupEnv(co), baseEnv()]) {
      assert.equal(env.GH_TOKEN, undefined);
      assert.equal(env.AWS_SECRET_ACCESS_KEY, undefined);
      assert.equal(env.HOME, process.env.HOME);
    }
    assert.equal(setupEnv(co).npm_config_cache, path.join(co, '.ui-capture', 'cache', 'npm'));
  } finally {
    delete process.env.GH_TOKEN;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  }
});

test('checkMise wants exact, installed versions in the checkout\'s mise.toml', { skip: !findMise() && 'mise not installed' }, async () => {
  const co = tmp('mise-');
  try {
    assert.match((await checkMise(co)).problems.join(), /no mise\.toml/);
    fs.writeFileSync(path.join(co, 'mise.toml'), '[tools]\nnode = "20"\n');
    assert.match((await checkMise(co)).problems.join('\n'), /node = "20"; use an exact version/);
    fs.writeFileSync(path.join(co, 'mise.toml'), '[tools]\nnode = "20.18.0"\n');
    const r = await checkMise(co);
    assert.match(r.problems.join('\n'), /node@20\.18\.0 is in mise\.toml but not installed/);
    assert.deepEqual(r.tools, { node: '20.18.0' }, 'only tools from this checkout, not the user\'s global config');
  } finally {
    fs.rmSync(co, { recursive: true, force: true });
  }
});

test('archiveContract keeps the agent\'s scripts, not builds, caches or installs', () => {
  const co = tmp('arch-co-');
  const out = tmp('arch-out-');
  const u = path.join(co, '.ui-capture');
  for (const d of ['out', 'cache/npm', 'mise/data', 'stubs']) fs.mkdirSync(path.join(u, d), { recursive: true });
  fs.writeFileSync(path.join(u, 'app.json'), '{}');
  fs.writeFileSync(path.join(u, 'seed.mjs'), 'seed');
  fs.writeFileSync(path.join(u, 'stubs', 'openai.mjs'), 'stub');
  fs.writeFileSync(path.join(u, 'out', 'index.html'), 'x');
  fs.writeFileSync(path.join(u, 'cache', 'npm', 'blob'), 'x');
  fs.writeFileSync(path.join(u, 'server.log'), 'x');
  fs.writeFileSync(path.join(u, 'big.bin'), Buffer.alloc(2 * 1024 * 1024));
  fs.writeFileSync(path.join(co, 'mise.toml'), '[tools]\n');
  const hostFile = path.join(tmp('arch-host-'), 'secret');
  fs.writeFileSync(hostFile, 'secret');
  fs.symlinkSync(hostFile, path.join(co, 'mise.lock'));
  archiveContract(co, out);
  assert.ok(!fs.existsSync(path.join(out, 'mise.lock')), 'a symlink out of the checkout is not followed');
  const files = fs.readdirSync(path.join(out, 'ui-capture'), { recursive: true }).map(String).sort();
  assert.deepEqual(files, ['app.json', 'seed.mjs', 'stubs', path.join('stubs', 'openai.mjs')]);
  assert.ok(fs.existsSync(path.join(out, 'mise.toml')));
  fs.rmSync(co, { recursive: true, force: true });
  fs.rmSync(out, { recursive: true, force: true });
});

test('server apps run sandboxed: localhost works, writes outside the checkout and outbound network do not', { skip: !runtimeSandboxAvailable() && 'needs macOS sandbox-exec or Linux bubblewrap' }, async () => {
  const co = tmp('srv-');
  const outside = path.join(os.homedir(), `.ui-capture-sandbox-probe-${process.pid}`);
  fs.mkdirSync(path.join(co, '.ui-capture'));
  fs.writeFileSync(path.join(co, 'server.mjs'), `
import http from 'node:http'; import fs from 'node:fs';
const r = {};
try { fs.writeFileSync(${JSON.stringify(outside)}, 'x'); r.outside = 'written'; } catch (e) { r.outside = e.code; }
try { fs.writeFileSync('inside.txt', 'x'); r.inside = 'written'; } catch (e) { r.inside = e.code; }
try { await fetch('https://example.com', { signal: AbortSignal.timeout(4000) }); r.net = 'reached'; } catch { r.net = 'blocked'; }
r.secret = process.env.SECRET_TOKEN ?? null;
http.createServer((q, s) => s.end(JSON.stringify(r))).listen(+process.env.PORT);`);
  fs.writeFileSync(path.join(co, '.ui-capture', 'start.sh'), `#!/bin/bash\nexec node server.mjs\n`);
  const victim = path.join(tmp('victim-'), 'host-file');
  fs.writeFileSync(victim, 'keep me');
  fs.symlinkSync(victim, path.join(co, '.ui-capture', 'server.log'));
  const port = 4490 + (process.pid % 9);
  process.env.SECRET_TOKEN = 'hunter2';
  const host = new AppHost({ sandbox: true, startupSeconds: 20 });
  const spec = { slug: 'probe', mode: 'server' as const, checkout: co, port };
  try {
    const url = await host.acquire(spec);
    await host.acquire(spec); // second view of the same app shares the server
    const r = await (await fetch(url)).json();
    // sandbox-exec denies the write (EPERM); bubblewrap mounts it read-only (EROFS).
    assert.deepEqual(r, { outside: process.platform === 'linux' ? 'EROFS' : 'EPERM', inside: 'written', net: 'blocked', secret: null });
    assert.equal(fs.readFileSync(victim, 'utf8'), 'keep me', 'the log is not opened through a path in the checkout');
    await host.release(spec);
    assert.ok(await portInUse(port), 'still running while a view holds it');
    await host.release(spec);
    assert.ok(!(await portInUse(port)), 'stopped after the last release');
    await assert.rejects(startServer({ ...spec, checkout: tmp('empty-') }, { sandbox: true, startupSeconds: 5 }), /start\.sh is missing/);
  } finally {
    delete process.env.SECRET_TOKEN;
    await host.closeAll();
    fs.rmSync(co, { recursive: true, force: true });
    fs.rmSync(outside, { force: true });
  }
});

/** A checkout whose start.sh runs a node server on $PORT, launched as `launch` (e.g. `exec node server.mjs`). */
function serverCheckout(launch: string): string {
  const co = tmp('srvco-');
  fs.mkdirSync(path.join(co, '.ui-capture'));
  fs.writeFileSync(path.join(co, 'server.mjs'), `import http from 'node:http'; http.createServer((q, s) => s.end('ok')).listen(+process.env.PORT);`);
  fs.writeFileSync(path.join(co, '.ui-capture', 'start.sh'), `#!/bin/bash\nPATH=${JSON.stringify(path.dirname(process.execPath))}:$PATH\n${launch}\n`);
  return co;
}

test('stopping a server stops what start.sh backgrounded, even after start.sh exited', async () => {
  const co = serverCheckout('node server.mjs &\nsleep 2\nexit 0');
  const port = 4500 + (process.pid % 9);
  try {
    const s = await startServer({ slug: 'bg', mode: 'server', checkout: co, port }, { sandbox: false, startupSeconds: 20 });
    await new Promise((r) => setTimeout(r, 3000)); // start.sh has exited; its server lives on
    assert.ok(await portInUse(port));
    await s.stop();
    assert.ok(!(await portInUse(port)), 'the backgrounded server was stopped with start.sh\'s group');
  } finally {
    fs.rmSync(co, { recursive: true, force: true });
  }
});

test('a view acquired while its app is stopping waits for the old server instead of colliding on the port', async () => {
  const co = serverCheckout('exec node server.mjs');
  const port = 4510 + (process.pid % 9);
  const host = new AppHost({ sandbox: false, startupSeconds: 20 });
  const spec = { slug: 'race', mode: 'server' as const, checkout: co, port };
  try {
    await host.acquire(spec);
    const released = host.release(spec); // last view done: server stopping
    const url = await host.acquire(spec); // next queued view of the same app
    await released;
    assert.equal(await (await fetch(url)).text(), 'ok');
    await host.release(spec);
    assert.ok(!(await portInUse(port)));
  } finally {
    await host.closeAll();
    fs.rmSync(co, { recursive: true, force: true });
  }
});

test('stopStrays stops listeners started inside the checkout and nothing else', { skip: process.platform !== 'darwin' && 'uses macOS lsof output' }, async () => {
  const co = tmp('stray-');
  const elsewhere = tmp('elsewhere-');
  const port = 4480 + (process.pid % 9);
  const other = port + 10;
  const serve = (cwd: string, p: number) => spawn(process.execPath, ['-e', `require('http').createServer((q,s)=>s.end()).listen(${p})`], { cwd, stdio: 'ignore' });
  const a = serve(co, port);
  const b = serve(elsewhere, other);
  try {
    for (let i = 0; i < 50 && !((await portInUse(port)) && (await portInUse(other))); i++) await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(await stopStrays(co, port), [a.pid]);
    assert.ok(!(await portInUse(port)));
    assert.deepEqual(await stopStrays(co, other), [], 'a listener outside the checkout is left alone');
    assert.ok(await portInUse(other));
  } finally {
    a.kill(); b.kill();
    fs.rmSync(co, { recursive: true, force: true });
    fs.rmSync(elsewhere, { recursive: true, force: true });
  }
});

test('labeling finds the checkout under the root setup recorded, not the current config\'s', () => {
  const dir = tmp('rec-');
  const setup = path.join(dir, 'setup.json');
  const cfg = readReposConfig();
  fs.writeFileSync(setup, JSON.stringify({ batch: 'b', slug: 'app', ok: true, mode: 'server', port: 4400, checkoutRoot: '/elsewhere/checkouts' }));
  assert.equal(appSpecFor({ slug: 'app--x', url: 'http://localhost:4400/', app: setup }, cfg).checkout, path.join('/elsewhere/checkouts', 'b', 'app'));
  fs.writeFileSync(setup, JSON.stringify({ batch: 'b', slug: 'app', ok: true, mode: 'server', port: 4400 }));
  assert.equal(appSpecFor({ slug: 'app--x', url: 'http://localhost:4400/', app: setup }, cfg).checkout, checkoutDir(cfg, 'b', 'app'), 'older records fall back to the config');
  fs.rmSync(dir, { recursive: true, force: true });
});

// --------------------------------------------------------------- provenance

test('repo provenance reads the setup and explore records', () => {
  const dir = tmp('rec-');
  fs.writeFileSync(path.join(dir, 'setup.json'), JSON.stringify({ repo: { name: 'a/b', url: 'https://github.com/a/b', commit: 'c'.repeat(40), license: 'MIT', branch: 'main' } }));
  fs.writeFileSync(path.join(dir, 'explore.json'), JSON.stringify({ views: [{ slug: 'inbox', name: 'Inbox', description: 'Mail list' }] }));
  const p = provenanceOf({ url: 'http://localhost:4400/', source: 'repo', app: path.join(dir, 'setup.json'), view: 'inbox' })!;
  assert.equal(p.source, 'repo');
  assert.deepEqual(p.repo, { name: 'a/b', url: 'https://github.com/a/b', commit: 'c'.repeat(40), license: 'MIT' });
  assert.deepEqual(p.view, { slug: 'inbox', name: 'Inbox', description: 'Mail list' });

  const codebook = buildBundle(loadCodebook(), 'now');
  const label: Label = {
    schemaVersion: '1.0.0', codebookVersion: codebook.version, batch: 't',
    site: { slug: 's', url: 'http://localhost:4400/', finalUrl: 'http://localhost:4400/', status: 200, title: 'X', capturedAt: '2026-01-01T00:00:00Z', viewport: { width: 1440, height: 900 }, screenshot: { ref: 'capture/screenshot.png', width: 1440, height: 900 }, userAgent: 'ua', domain: 'productivity', provenance: p },
    regions: [{ id: 'main', role: 'main', label: 'Main', bbox: { x: 0, y: 0, width: 1440, height: 900 }, patterns: ['card'] }],
    patterns: [{ id: 'card', status: 'present', confidence: 0.9, evidence: [{ bbox: { x: 0, y: 0, width: 100, height: 100 } }], dims: {} }],
    structure: { layout: 'x', regions: ['main'], density: 'medium' },
    aesthetics: { palette: ['#ffffff', '#111111'], colorRoles: { background: '#ffffff', text: '#111111' }, typography: 'x', typeScale: 'x', shape: 'soft', elevation: 'flat', borders: 'none', imagery: [], iconStyle: 'line', whitespace: 'moderate', backgroundTreatment: 'solid', mood: ['calm'] },
    model: { rater: 'r', provider: 'p', name: 'm', generatedAt: '2026-01-01T00:00:00Z' },
    notes: '',
  };
  assert.deepEqual(validateLabel(label, codebook).errors, []);
  fs.rmSync(dir, { recursive: true, force: true });
});
