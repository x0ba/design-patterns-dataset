import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
const root = process.argv[2]
const out = process.argv[3] || '/tmp/shot.png'
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
await pg.waitForTimeout(500)
await pg.screenshot({ path: out })
console.log('errors', errs)
await b.close(); srv.close()
