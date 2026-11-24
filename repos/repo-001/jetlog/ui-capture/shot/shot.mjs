// Screenshot helper for verifying the seeded UI: node shot.mjs http://localhost:5460 outdir
import { chromium } from 'playwright-core'
import os from 'node:os'
import fs from 'node:fs'

const base = process.argv[2]
const out = process.argv[3]
fs.mkdirSync(out, { recursive: true })
const exe = `${os.homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-gpu', '--use-mock-keychain'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('requestfailed', (r) => errors.push('FAILED ' + r.url()))

await page.goto(base + '/login')
await page.waitForTimeout(800)
await page.fill('input[name="username"], input[type="text"]', 'dana')
await page.fill('input[type="password"]', 'skyline-2019')
await page.keyboard.press('Enter')
await page.waitForTimeout(2000)
for (const p of ['/', '/flights', '/statistics', '/settings', '/new']) {
  await page.goto(base + p)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${out}/${p === '/' ? 'home' : p.slice(1)}.png` })
}
console.log(errors.join('\n') || 'no errors')
await browser.close()
