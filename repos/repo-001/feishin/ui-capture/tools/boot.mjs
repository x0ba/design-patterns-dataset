// Boots the built Feishin web bundle in jsdom against a running server and reports API calls / DOM text.
import 'fake-indexeddb/auto';
import { JSDOM, VirtualConsole } from 'jsdom';
const base = process.argv[2] || 'http://localhost:5427';
const hash = process.argv[3] || '';
const vc = new VirtualConsole();
const errs = [];
vc.on('error', (e) => errs.push(String(e?.stack || e).slice(0, 300)));
vc.on('jsdomError', (e) => errs.push('JSDOM ' + String(e?.message || e).slice(0, 300)));
const calls = [];
const dom = await JSDOM.fromURL(base + '/' + hash, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
        w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange;
        w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
        w.HTMLMediaElement.prototype.load = () => {}; w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLMediaElement.prototype.play = () => Promise.resolve();
        w.scrollTo = () => {}; Object.defineProperty(w.navigator, 'mediaSession', { value: { setActionHandler() {}, setPositionState() {}, metadata: null, playbackState: 'none' } }); w.MediaMetadata = class { constructor(o) { Object.assign(this, o); } }; w.Element.prototype.scrollTo = () => {}; w.Element.prototype.scrollIntoView = () => {};
        w.structuredClone = structuredClone; w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
        w.crypto.randomUUID = () => crypto.randomUUID();
        const XO = w.XMLHttpRequest.prototype.open;
        w.XMLHttpRequest.prototype.open = function (m, u, ...r) { calls.push(m + ' ' + String(u).replace(base, '').replace(/[?&](u|s|t|p|c|f|v)=[^&]*/g, '').slice(0, 110)); return XO.call(this, m, u, ...r); };
        w.fetch = (u, o) => { calls.push('FETCH ' + String(u).slice(0, 100)); return fetch(new URL(u, base), o); };
    },
});
await new Promise((r) => setTimeout(r, 1500));
{
    const { readFileSync } = await import('node:fs');
    const code = readFileSync(process.env.TMPDIR + '/boot-bundle.js', 'utf8');
    try { dom.window.eval(code); } catch (e) { errs.push('EVAL ' + (e.stack || e).slice(0, 500)); }
}
await new Promise((r) => setTimeout(r, Number(process.argv[4] || 12000)));
const doc = dom.window.document;
console.log('URL', dom.window.location.href);
console.log('CALLS', calls.length); console.log([...new Set(calls)].slice(0, 60).join('\n'));
console.log('ERRORS'); console.log(errs.slice(0, 15).join('\n---\n'));
doc.querySelectorAll('style,script').forEach((e) => e.remove()); console.log('TEXT', doc.body.textContent.replace(/\s+/g, ' ').slice(0, 2500));
console.log('IMGS', doc.querySelectorAll('img').length);
process.exit(0);
