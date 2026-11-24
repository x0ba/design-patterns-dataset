import { chromium } from 'playwright-core'
const exe = process.env.CHROME || '/Users/bryanmin/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const browser = await chromium.launch({ executablePath: exe })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const logs = []
page.on('console', m => logs.push(`${m.type()}: ${m.text()}`))
page.on('pageerror', e => logs.push(`pageerror: ${e.message}`))
await page.goto('http://localhost:5428/')
await page.waitForTimeout(2500)
const steps = process.argv.slice(2)
let i = 0
await page.screenshot({ path: `${process.env.OUT}/shot-${i++}.png` })
for (const step of steps) {
  await eval(`(async () => { ${step} })()`)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${process.env.OUT}/shot-${i++}.png` })
}
console.log(logs.filter(l => !l.includes('Download the Vue')).slice(0, 30).join('\n'))
await browser.close()
