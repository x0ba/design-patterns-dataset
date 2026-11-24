// Headless check: log in through the UI and screenshot a few pages. Usage: node shot.mjs <base> <outdir>
import { chromium } from 'playwright';
const [base, out] = [process.argv[2], process.argv[3]];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const external = new Set();
page.on('request', (r) => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data')) external.add(u.hostname); });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
await page.goto(base + '/login');
await page.waitForTimeout(1500);
await page.fill('input[type=email], input[name=email], input[autocomplete=username]', 'maya@trek.local');
await page.fill('input[type=password]', 'Wanderlust2026!');
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);
for (const p of (process.argv[4] || '/dashboard,/trips/2').split(',')) {
  await page.goto(base + p); await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/${p.replace(/\W+/g, '_')}.png` });
  console.log('shot', p, page.url());
}
console.log('external hosts:', [...external].join(', '));
await browser.close();
