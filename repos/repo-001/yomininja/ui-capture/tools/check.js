// Dev check: load the UI in jsdom, click through tabs, print text + errors.
const { JSDOM, VirtualConsole } = require('jsdom');
const url = process.argv[2] || 'http://localhost:5444/index.html';
const vc = new VirtualConsole();
const errs = [];
vc.on('jsdomError', e => errs.push('jsdomError: ' + (e.message || e)));
vc.on('error', (...a) => errs.push('console.error: ' + a.map(String).join(' ').slice(0, 300)));
JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    w.speechSynthesis = { getVoices: () => [], addEventListener() {}, onvoiceschanged: null }; w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; } })
.then(async dom => {
  const w = dom.window, d = w.document;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(5000);
  const tabs = [...d.querySelectorAll('[role=tab]')];
  console.log('TABS:', tabs.map(t => t.textContent).join(' | '));
  for (const t of tabs) {
    t.click(); await wait(1500);
    const panel = d.querySelector('[role=tabpanel]:not([hidden])') || d.body;
    console.log('\n=== ' + t.textContent + ' ===\n' + panel.textContent.replace(/\s+/g, ' ').slice(0, 900));
  }
  console.log('\nERRORS:\n' + [...new Set(errs)].slice(0, 15).join('\n'));
  w.close(); process.exit(0);
});
