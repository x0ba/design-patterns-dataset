const { spawn } = require('child_process'); const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '../stub/server.js')], { env: { ...process.env, PORT: '5477' }, stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 700));
  const vc = new VirtualConsole(); const logs = [];
  vc.on('error', (...a) => logs.push('E ' + a.join(' ').slice(0, 200))); vc.on('jsdomError', (e) => logs.push('J ' + String(e.message).slice(0, 200)));
  const dom = await JSDOM.fromURL('http://localhost:5477/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.HTMLCanvasElement.prototype.getContext = () => null; w.matchMedia = () => ({ matches: false, addListener() {} }); } });
  await new Promise((r) => setTimeout(r, 5000));
  const d = dom.window.document;
  console.log('query=', d.getElementById('txtAddress').value, '| iframe=', d.getElementById('iframeTwc').getAttribute('src'));
  console.log('ls=', JSON.stringify(Object.assign({}, dom.window.localStorage)).slice(0, 300));
  console.log('gh buttons=', d.querySelectorAll('.gh-btn').length, 'shim in html=', d.documentElement.innerHTML.includes('/__stub/shim.js'));
  // geocoder suggest via shim
  const r = await new Promise((res) => dom.window.$.ajax({ url: 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest', data: { text: 'Denv', f: 'json' }, dataType: 'jsonp', jsonp: 'callback' }).done(res).fail((x, e) => res('FAIL ' + e)));
  console.log('suggest=', JSON.stringify(r).slice(0, 300));
  console.log('ALL ERRORS:\n' + logs.slice(0, 40).join('\n'));
  srv.kill(); process.exit(0);
})();
