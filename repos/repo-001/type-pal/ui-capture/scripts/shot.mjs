// Usage: node shot.mjs <url> <out.png> [waitMs]
import { chromium } from 'playwright'
const [url, out, wait = '8000'] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', (e) => errs.push(String(e)))
await p.goto(url)
await p.waitForTimeout(Number(wait))
await p.screenshot({ path: out })
console.log('title:', await p.title())
console.log((await p.innerText('body')).slice(0, 1500))
console.log('errors:', errs.slice(0, 10))
await b.close()
