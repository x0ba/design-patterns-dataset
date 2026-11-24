// Logs in and screenshots a few pages at 1440x900 (local verification only).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:5501';
const out = process.argv[3] || './shots';
const pages = process.argv.slice(4);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  userDataDir: out + '/profile',
  args: ['--no-first-run', '--no-default-browser-check'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('requestfailed', (r) => errors.push('failed: ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
await page.goto(base + '/login.php', { waitUntil: 'networkidle2' });
await page.type('input[name=username]', 'maya');
await page.type('input[name=password]', 'Fjordline-2026');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), page.click('button[type=submit], input[type=submit]')]);
for (const [i, p] of (pages.length ? pages : ['/']).entries()) {
  await page.goto(base + p, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${out}/${i}.png` });
  console.log(i, p, page.url());
}
console.log(errors.slice(0, 30).join('\n'));
await browser.close();
