// Verification helper: logs in through the real OAuth flow against the local
// stub and screenshots a few pages. Usage: node shot.mjs <port> [hash ...]
import { chromium } from '@playwright/test';

const port = process.argv[2] || '5440';
const pages = process.argv.slice(3);
const base = `http://localhost:${port}`;
const browser = await chromium.launch({
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text().slice(0, 200)));
await page.goto(`${base}/#/login?instance=localhost:${port}&submit=1`);
await page.waitForTimeout(5000);
console.log('URL after login:', page.url());
await page.screenshot({ path: `${process.env.TMPDIR}/shot-home.png` });
for (const [i, h] of pages.entries()) {
  await page.goto(`${base}/#${h}`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${process.env.TMPDIR}/shot-${i}.png` });
  console.log('shot', i, h);
}
await browser.close();
