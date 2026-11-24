// Smoke test: load the static build in jsdom (no real browser available in the
// sandbox), let it run, and report errors plus a summary of what rendered.
// usage: node smoke.mjs [page-nav-label ...]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(here, 'vendor/package.json'))
const { JSDOM, VirtualConsole } = require('jsdom')
const out = path.join(here, 'out')
const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8')
const jsFile = html.match(/src="\/(assets\/[^"]+\.js)"/)[1]
const code = fs.readFileSync(path.join(out, jsFile), 'utf8')

const errors = []
const vc = new VirtualConsole()
vc.on('error', (...a) => errors.push(a.map(String).join(' ')))
vc.on('warn', (...a) => errors.push('warn: ' + a.map(String).join(' ')))
vc.on('jsdomError', (e) => errors.push('jsdom: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')))

const dom = new JSDOM(html.replace(/<script[^>]*><\/script>/, ''), { url: 'http://localhost:4455/', pretendToBeVisual: true, runScripts: 'outside-only', virtualConsole: vc })
const w = dom.window
w.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }
w.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} }
w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
w.HTMLCanvasElement.prototype.getContext = () => null
w.Element.prototype.scrollIntoView = function () {}
w.Element.prototype.scrollTo = function () {}
w.scrollTo = () => {}
const fetchLog = []
w.fetch = async (url) => {
  const u = new URL(url, 'http://localhost:4455/')
  fetchLog.push(u.pathname)
  const f = path.join(out, decodeURIComponent(u.pathname))
  const ok = u.host === 'localhost:4455' && fs.existsSync(f) && fs.statSync(f).isFile()
  const body = ok ? fs.readFileSync(f, 'utf8') : ''
  return { ok, status: ok ? 200 : 404, json: async () => JSON.parse(body), text: async () => body }
}

w.eval(code.replace(/import\.meta\.url/g, '"http://localhost:4455/"'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const text = () => w.document.getElementById('root').textContent.replace(/\s+/g, ' ')
await sleep(2500)
console.log('ROOT TEXT (start):', text().slice(0, 1500))
for (const label of process.argv.slice(2)) {
  const btn = [...w.document.querySelectorAll('button')].find((b) => (b.getAttribute('title') || b.getAttribute('aria-label') || b.textContent).trim().toLowerCase().startsWith(label.toLowerCase()))
  if (!btn) { console.log(`\n[no button "${label}"]`); continue }
  btn.click()
  await sleep(800)
  console.log(`\n== ${label} ==\n`, text().slice(0, 3000))
}
console.log('\nFETCHES:', [...new Set(fetchLog)].join(', '))
console.log('ERRORS:', errors.length ? errors.slice(0, 15).join('\n') : 'none')
process.exit(0)
