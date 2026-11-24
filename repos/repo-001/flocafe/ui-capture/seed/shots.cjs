'use strict';
// Verification helper: logs in through the real UI and screenshots key pages.
// usage: node .ui-capture/seed/shots.cjs [baseUrl] [outDir] [paths...]
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../frontend/node_modules/playwright'));
const base = process.argv[2] || 'http://localhost:5425';
const out = process.argv[3] || path.join(process.env.TMPDIR || '/tmp', 'shots');
const pages = process.argv.slice(4);

(async () => {
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text().slice(0, 200)); });
  page.on('requestfailed', (r) => console.log('request failed:', r.url().slice(0, 150)));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('landed on', page.url());
  await page.screenshot({ path: path.join(out, '00-landing.png') });
  if (process.env.LOGIN !== '0') {
    const email = page.locator('input[type=email], input[name=email]').first();
    if (await email.count()) {
      await email.fill('priya@juniperrye.cafe');
      await page.locator('input[type=password]').first().fill('Juniper#Rye2026');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      console.log('after login', page.url());
      await page.screenshot({ path: path.join(out, '01-after-login.png') });
    }
  }
  let i = 2;
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2500);
    const name = `${String(i++).padStart(2, '0')}-${p.replace(/[^a-z0-9]+/gi, '_')}.png`;
    await page.screenshot({ path: path.join(out, name) });
    console.log('shot', p, '->', page.url());
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
