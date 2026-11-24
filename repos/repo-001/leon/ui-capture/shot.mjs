// Captures screenshots of the running app for a visual check: node shot.mjs <baseURL> <outDir> [paths...]
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('@playwright/test')
const [base, out, ...paths] = process.argv.slice(2)
const exe = process.env.CHROME_PATH
const browser = await chromium.launch(exe ? { executablePath: exe } : {})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()) })
for (const [i, p] of (paths.length ? paths : ['']).entries()) {
  await page.goto(base + p, { waitUntil: 'networkidle' }).catch((e) => console.log('goto', e.message))
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(out, `shot-${i}.png`) })
  console.log('shot', i, p, page.url())
}
await browser.close()
