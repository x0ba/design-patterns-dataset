// Headless smoke test (no real browser available in the sandbox): runs seed.html's script and the
// built catai-react bundle in jsdom with fake-indexeddb against a running server, prints the rendered sidebar.
import 'fake-indexeddb/auto';
import {JSDOM} from 'jsdom';
import fs from 'node:fs';
import WS from '../../server/node_modules/ws/wrapper.mjs';
const base = process.argv[2];
const www = new URL('../../server/www/catai-react/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', www), 'utf8');
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ''), {url: base + '/', runScripts: 'outside-only', pretendToBeVisual: true});
const w = dom.window;
Object.assign(w, {indexedDB, IDBKeyRange, WebSocket: WS, fetch: (u, o) => fetch(new URL(u, base), o),
  matchMedia: () => ({matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}}),
  ResizeObserver: class {observe() {} unobserve() {} disconnect() {}}, IntersectionObserver: class {observe() {} unobserve() {} disconnect() {}}});
w.HTMLElement.prototype.scrollIntoView = () => {};
w.console.error = (...a) => console.log('[app error]', ...a.map(String).map(s => s.slice(0, 200)));
// 1) seed page script
const seedHtml = fs.readFileSync(new URL('seed.html', www), 'utf8');
const seedJs = seedHtml.match(/<script>([\s\S]*)<\/script>/)[1].replace("location.replace('/')", "window.__seeded = true");
w.eval(seedJs);
while (!w.__seeded) await new Promise(r => setTimeout(r, 50));
console.log('localStorage keys:', Object.keys(w.localStorage));
// 2) app bundle
const js = fs.readdirSync(new URL('assets/', www)).find(f => f.endsWith('.js'));
w.eval(fs.readFileSync(new URL('assets/' + js, www), 'utf8'));
await new Promise(r => setTimeout(r, 4000));
const text = w.document.body.textContent.replace(/\s+/g, ' ');
console.log(text.slice(0, 1500));
process.exit(0);
