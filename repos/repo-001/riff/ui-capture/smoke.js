// jsdom smoke test: loads the UI from a running server, reports script errors and some DOM state.
// usage: node .ui-capture/smoke.js http://localhost:5431/ [js expression to print]
const { JSDOM, VirtualConsole, ResourceLoader } = require('./tools/node_modules/jsdom');
const vc = new VirtualConsole();
const errs = [];
vc.on('jsdomError', e => errs.push('jsdomError: ' + (e.message || '').slice(0, 300) + (e.detail ? ' ' + String(e.detail && e.detail.stack || e.detail).slice(0, 300) : '')));
vc.on('error', (...a) => errs.push('console.error: ' + a.map(String).join(' ').slice(0, 300)));
vc.on('warn', (...a) => errs.push('console.warn: ' + a.map(String).join(' ').slice(0, 200)));
class Loader extends ResourceLoader {
  fetch(url, opts) { if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(url)) return null; return super.fetch(url, opts); }
}
(async () => {
  const dom = await JSDOM.fromURL(process.argv[2], {
    runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      w.fetch = (u, o) => fetch(new URL(String(u && u.url || u), w.location.href).href, o).then(async r => { const t = await r.text(); return { ok: r.ok, status: r.status, json: async () => JSON.parse(t), text: async () => t, headers: r.headers, clone() { return this; } }; });
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.HTMLMediaElement.prototype.play = () => Promise.resolve();
      w.HTMLMediaElement.prototype.pause = () => {};
      w.HTMLMediaElement.prototype.load = () => {};
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.AudioContext = undefined;
    }
  });
  await new Promise(r => setTimeout(r, Number(process.env.WAIT || 6000)));
  const w = dom.window;
  if (process.argv[3]) { try { let v = w.eval(process.argv[3]); if (v && v.then) v = await v; console.log(String(v)); } catch (e) { console.log("eval error", e.message); } }
  console.log('--- errors (' + errs.length + ')');
  console.log([...new Set(errs)].slice(0, 30).join('\n'));
  process.exit(0);
})();
