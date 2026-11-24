// Points the built bundle's third-party URLs at the local stubs served by
// stub-server.mjs (/_stub/*). Runs on .ui-capture/out after copying dist/;
// the source tree is left untouched.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const out = resolve(dirname(fileURLToPath(import.meta.url)), 'out')
const js = [
  [/`https:\/\/basemaps\.cartocdn\.com\/gl\/dark-matter-gl-style\/style\.json`/g, '(location.origin+"/_stub/basemap/dark-matter.json")'],
  [/`https:\/\/basemaps\.cartocdn\.com\/gl\/positron-gl-style\/style\.json`/g, '(location.origin+"/_stub/basemap/positron.json")'],
  [/`https:\/\/tiles\.openfreemap\.org\/planet`/g, '(location.origin+"/_stub/openfreemap/planet")'],
  [/`https:\/\/dsat\.apigateway\.data\.gov\.mo\/car_park_maintance\?lang=zh_TW`/g, '(location.origin+"/_stub/dsat/car_park_maintance?lang=zh_TW")'],
]
const html = [
  [/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/g, '/_stub/fonts/google.css'],
  [/https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/g, '/_stub/gtag/js?id='],
  [/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>/g, ''],
]
let n = 0
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { if (name !== 'data') walk(p); continue }
    const rules = /\.js$/.test(name) ? js : /\.html$/.test(name) ? html : null
    if (!rules) continue
    let s = readFileSync(p, 'utf8'); const before = s
    for (const [re, to] of rules) s = s.replace(re, (...m) => { n++; return to })
    if (s !== before) writeFileSync(p, s)
  }
}
walk(out)
console.log('rewrote', n, 'external URLs')
