// Verification helper: logs in through the real /login form and screenshots pages at 1440x900.
// usage: node shoot.js <baseUrl> <outDir> <path1> [path2 ...]   (prefix path with '!' to skip login)
const puppeteer = require('puppeteer-core')
const [base, outDir, ...paths] = process.argv.slice(2)
;(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--disable-crashpad', '--disable-crash-reporter', '--disable-breakpad', '--no-sandbox', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${process.env.TMPDIR}/chrome-prof-${Date.now()}`],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const errs = []
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)))
  page.on('requestfailed', (r) => errs.push('FAILED ' + r.url().slice(0, 150)))
  page.on('response', (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url().slice(0, 150)}`))
  if (!paths[0].startsWith('!')) {
    await page.goto(base + '/login', { waitUntil: 'networkidle2', timeout: 60000 })
    await page.type('input[name=email]', 'desislava.marinova@abv.bg')
    await page.type('input[name=password]', 'Podkrepi2026!')
    await Promise.all([page.waitForNavigation({ timeout: 30000 }).catch(() => {}), page.click('button[type=submit]')])
    await new Promise((r) => setTimeout(r, 2000))
  }
  for (let p of paths) {
    p = p.replace(/^!/, '')
    errs.length = 0
    await page.goto(base + p, { waitUntil: 'networkidle2', timeout: 60000 }).catch((e) => errs.push('NAV ' + e.message))
    await new Promise((r) => setTimeout(r, 1500))
    const name = p.replace(/[^a-z0-9]+/gi, '_') || 'root'
    await page.screenshot({ path: `${outDir}/${name}.png` })
    console.log(p, '->', page.url(), errs.length ? '\n  ' + [...new Set(errs)].slice(0, 8).join('\n  ') : '')
  }
  await browser.close()
})()
