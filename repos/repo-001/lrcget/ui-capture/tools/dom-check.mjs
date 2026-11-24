// Loads the built static app in jsdom (no browser available in sandbox) and dumps rendered text.
import { JSDOM, VirtualConsole } from 'jsdom'
const vc = new VirtualConsole()
const errs = []
vc.on('error', e => errs.push('console.error: ' + e))
vc.on('warn', e => errs.push('console.warn: ' + e))
vc.on('jsdomError', e => errs.push('jsdomError: ' + e.message))
const dom = await JSDOM.fromURL(process.env.URL || 'http://localhost:5429/', {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.matchMedia = q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
    Object.defineProperty(w.HTMLElement.prototype, 'offsetHeight', { get() { return 800 } })
    Object.defineProperty(w.HTMLElement.prototype, 'offsetWidth', { get() { return 1200 } })
    w.HTMLElement.prototype.getBoundingClientRect = () => ({ width: 1200, height: 800, top: 0, left: 0, right: 1200, bottom: 800 })
  },
})
const w = dom.window
const sleep = ms => new Promise(r => setTimeout(r, ms))
await sleep(4000)
const clean = el => (el ? el.textContent.replace(/\s+/g, ' ') : '')
const text = () => {
  const lc = w.document.querySelector('#library-content')
  if (!lc) return clean(w.document.querySelector('#app'))
  const vis = [...lc.children].filter(c => c.style.display !== 'none').map(clean).join(' | ')
  const modal = [...w.document.querySelectorAll('.vfm__content, [role=dialog]')].map(clean).join(' | ')
  const np = clean(lc.parentElement.lastElementChild)
  return `VISIBLE: ${vis.slice(0, 700)}\n  NOWPLAYING: ${np.slice(0, 400)}\n  MODAL: ${modal.slice(0, 600)}\n  TOASTS: ${clean(w.document.querySelector('.Vue-Toastification__container'))}`
}
w.$click = t => { const el = [...w.document.querySelectorAll('button, a, div, span')].reverse().find(e => e.textContent.trim() === t); if (!el) throw new Error('no ' + t); el.click() }
console.log('INITIAL:', text())
for (const step of process.argv.slice(2)) {
  w.eval(step)
  await sleep(1500)
  console.log('\nAFTER', step.slice(0,80), ':', text())
}
console.log('\nERRORS:', errs.slice(0, 20).join('\n'))
w.close()
process.exit(0)
