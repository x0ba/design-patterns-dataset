// Verification helper: opens the running app in headless Chrome at 1440x900, runs optional steps,
// and saves screenshots. node shot.mjs <baseUrl> <outPrefix> [hash...]
import puppeteer from 'puppeteer-core'
const [base, out, ...hashes] = process.argv.slice(2)
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/Users/bryanmin/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell',
  headless: 'shell', args: ['--no-first-run', '--no-default-browser-check', `--user-data-dir=${process.env.TMPDIR}/og-chrome-${Date.now()}`],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('requestfailed', r => errors.push('failed: ' + r.url()))
await page.goto(base + '/', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 1500))
await page.screenshot({ path: `${out}-0.png` })
if (process.env.LOGIN) {
  const [user, pw] = process.env.LOGIN.split('|')
  const r = await page.evaluate(async (user, pw) => {
    const res = await fetch('/api/login/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user, password: pw }) })
    return res.status
  }, user, pw)
  console.log('login status', r)
  await page.goto(base + '/', { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 2500))
  await page.screenshot({ path: `${out}-1.png` })
}
let i = 2
for (const h of hashes) {
  await page.goto(base + '/#' + h, { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 1500))
  await page.screenshot({ path: `${out}-${i++}.png` })
}
console.log(await page.evaluate(() => document.body.innerText.slice(0, 600)))
console.log(errors.slice(0, 20).join('\n'))
await browser.close()
