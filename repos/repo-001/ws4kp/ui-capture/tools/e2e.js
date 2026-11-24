// dev-only: run twc3.html (the WeatherStar canvas app) in jsdom against the stub server and
// report which screens finish loading. Canvas & image decoding are faked.
const { spawn } = require('child_process'); const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const BASE = 'http://localhost:' + (process.env.TPORT || '5477') + '/';
(async () => {
  const srv = global.__srv = spawn(process.execPath, [path.join(__dirname, '../stub/server.js')], { env: { ...process.env, PORT: process.env.TPORT || '5477', STUB_LOG: process.env.STUB_LOG || '' }, stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 700));
  const vc = new VirtualConsole();
  const logs = [];
  vc.on('error', (...a) => logs.push('E ' + a.map(String).join(' ').slice(0, 300)));
  vc.on('jsdomError', (e) => logs.push('JSDOM ' + String(e.message || e).slice(0, 300)));
  if (process.env.LOGALL) vc.on('log', (...a) => logs.push('L ' + a.map((x) => typeof x === 'object' ? JSON.stringify(x).slice(0, 200) : String(x)).join(' ').slice(0, 300)));
  const dom = await JSDOM.fromURL(BASE + 'twc3.html', {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      const ctxFor = (cv) => new Proxy({}, { get(t, k) {
        if (k === 'canvas') return cv;
        if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)).fill(k === 'x' ? 0 : 200), width: w, height: h });
        if (k === 'measureText') return () => ({ width: 10 });
        if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop() {} });
        if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
        if (k in t) return t[k];
        return () => {};
      }, set(t, k, v) { t[k] = v; return true; } });
      win.HTMLCanvasElement.prototype.getContext = function () { return this.__ctx || (this.__ctx = ctxFor(this)); };
      win.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
      win.HTMLMediaElement.prototype.play = () => Promise.resolve();
      win.HTMLMediaElement.prototype.pause = () => {};
      win.HTMLMediaElement.prototype.load = () => {};
      const desc = Object.getOwnPropertyDescriptor(win.HTMLImageElement.prototype, 'src');
      Object.defineProperty(win.HTMLImageElement.prototype, 'src', { get() { return desc.get.call(this); }, set(v) {
        desc.set.call(this, v); const img = this; const url = new URL(v, BASE).href;
        if (url.startsWith('data:')) { setTimeout(() => img.onload && img.onload()); return; }
        fetch(url).then((r) => { global.__imgs = (global.__imgs || 0) + 1; if (r.status >= 400) { logs.push('IMG ' + r.status + ' ' + decodeURIComponent(url).slice(0, 150)); img.onerror && img.onerror(); } else { Object.defineProperty(img, 'width', { value: 640, configurable: true }); Object.defineProperty(img, 'height', { value: 480, configurable: true }); img.onload && img.onload(); } }).catch((e) => { logs.push('IMGERR ' + url + e); img.onerror && img.onerror(); });
      } });
      win.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
      win.SpeechSynthesisUtterance = function () {};
      win.Worker = function () { this.postMessage = () => {}; this.terminate = () => {}; };
    },
  });
  const w = dom.window;
  if (process.env.EARLY) { while (typeof w.NavigatePlayToggle !== 'function') await new Promise((r) => setTimeout(r, 2)); logs.push('EARLY toggle, _WeatherParameters is ' + (w._WeatherParameters === null ? 'null' : 'set')); w.NavigatePlayToggle(); w.AudioPlayToggle(); }
  await new Promise((r) => setTimeout(r, 1500));
  w.SetCallBack && w.SetCallBack({ CallBack: (e) => { if (e.Status === 'WEATHERPARAMETERS') logs.push('CALLBACK WEATHERPARAMETERS ' + e.WeatherParameters.City + ' ' + e.WeatherParameters.StationId + ' ' + e.WeatherParameters.ZoneId + ' ' + e.WeatherParameters.RadarId); } });
  const mc = 'https://forecast.weather.gov/MapClick.php?lat=' + (process.env.LAT || '32.7157') + '&lon=' + (process.env.LON || '-117.1611');
  w.GetLatLng('cors/?u=' + encodeURIComponent(mc));
  if (process.env.PLAY) { w.NavigatePlayToggle(); w.AudioPlayToggle(); }
  await new Promise((r) => setTimeout(r, +(process.env.WAIT || 12000)));
  const wp = w._WeatherParameters;
  const LS = w.LoadStatuses; const inv = {}; for (const k in LS) inv[LS[k]] = k;
  const prog = {}; for (const k in wp.Progress) if (typeof wp.Progress[k] === 'number') prog[k] = inv[wp.Progress[k]] || wp.Progress[k];
  console.log('PROGRESS', JSON.stringify(prog));
  console.log('PARAMS', JSON.stringify({ City: wp.City, State: wp.State, StationId: wp.StationId, ZoneId: wp.ZoneId, RadarId: wp.RadarId, TimeZone: wp.TimeZone, ZipCode: wp.ZipCode }));
  if (process.env.EVAL) console.log('EVAL', JSON.stringify(w.eval(process.env.EVAL), null, 1).slice(0, +(process.env.EVN || 5000)));
  console.log(logs.slice(0, 60).join('\n'));
  srv.kill(); process.exit(0);
})().catch((e) => { console.error('HARNESS', e); global.__srv && global.__srv.kill(); process.exit(1); });
