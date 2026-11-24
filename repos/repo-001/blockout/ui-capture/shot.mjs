// Verification helper: screenshot the running app with the system Chrome.
import { chromium } from '../node_modules/playwright/index.mjs'
const url = process.argv[2] || 'http://localhost:5474/'
const out = process.argv[3] || process.env.TMPDIR + '/shot.png'
const steps = process.argv[4] || ''
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text().slice(0, 300)) })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto(url)
await page.waitForTimeout(4000)
for (const s of steps.split(';').filter(Boolean)) { await page.evaluate(s); await page.waitForTimeout(1500) }
await page.screenshot({ path: out })
await browser.close()
