import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
const root = process.argv[2]
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const srv = createServer((req, res) => {
  let p = join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0])
  if (!existsSync(p)) { res.statusCode = 404; return res.end() }
  res.setHeader('content-type', types[extname(p)] || 'application/octet-stream'); res.end(readFileSync(p))
}).listen(0)
const port = srv.address().port
const b = await chromium.launch()
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
pg.on('pageerror', (e) => errs.push(String(e)))
await pg.goto(`http://localhost:${port}/`)
await pg.waitForTimeout(400)
await pg.getByRole('tab', { name: /Through the fen/ }).click()
const stars = pg.locator('.star')
await stars.nth(0).click(); await stars.nth(1).click(); await stars.nth(4).click()
await pg.waitForTimeout(200)
await pg.screenshot({ path: '/tmp/shot3.png' })
console.log('pinned', await pg.locator('.cands li.picked').count(), 'text', await pg.locator('.prep-f').innerText())
// trace mode: click a far hex
await pg.getByRole('button', { name: 'Clear' }).click()
await pg.getByRole('button', { name: 'Trace' }).first().click()
await pg.mouse.click(700, 400)
await pg.waitForTimeout(200)
console.log('toast', await pg.locator('.toast').innerText().catch(() => 'none'))
console.log('legs', await pg.locator('.leg').count())
await pg.getByRole('button', { name: /Session log/ }).click()
await pg.locator('.sess button').first().click()
await pg.waitForTimeout(200)
await pg.screenshot({ path: '/tmp/shot4.png' })
await pg.reload(); await pg.waitForTimeout(300)
console.log('persisted legs after reload', await pg.locator('.leg').count(), 'tab', await pg.locator('.tab.on').innerText())
console.log('errors', errs)
await b.close(); srv.close()
