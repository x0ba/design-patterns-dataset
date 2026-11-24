// Screenshot helper: serves ./out on a local port and captures key states at 1440x900.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve('out');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(4519, r));

const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1255/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:4519/');
await page.waitForTimeout(400);
const dir = 'scripts/shots';
fs.mkdirSync(dir, { recursive: true });
await page.screenshot({ path: `${dir}/1-initial.png` });

const steps = process.argv.slice(2);
if (steps.includes('more')) {
  await page.locator('.detail').evaluate((el) => el.scrollTo(0, 500));
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${dir}/2-scrolled.png` });
  await page.locator('.detail').evaluate((el) => el.scrollTo(0, 0));
  await page.getByRole('tab', { name: /Amenities/ }).click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${dir}/3-overview.png` });
  await page.getByRole('tab', { name: /Reviews/ }).click();
  await page.getByRole('button', { name: /Loop C is loud/ }).last().click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${dir}/4-reviews.png` });
  await page.getByRole('tab', { name: /Pick a site/ }).click();
  await page.locator('.saved-tray .btn-primary').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dir}/5-compare.png` });
  await page.getByRole('button', { name: 'Close compare' }).click();
  await page.getByRole('button', { name: /New to camping/ }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${dir}/6-glossary.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /More filters/ }).click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${dir}/7-morefilters.png` });
  await page.keyboard.press('Escape');
  await page.locator('.r-card').nth(1).locator('.r-card-hit').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${dir}/8-other.png` });
  await page.getByRole('button', { name: 'Reserve' }).first().isVisible();
}
if (steps.includes('flow')) {
  await page.reload();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);
  const count = async () => (await page.locator('.r-count b').textContent());
  console.log('initial count', await count());
  await page.getByRole('button', { name: /Shady sites/ }).click();
  console.log('without shade', await count());
  await page.getByRole('button', { name: /Shady sites/ }).click();
  // pick a different site in the list and save it
  await page.locator('.site-row').nth(1).click();
  console.log('selected', await page.locator('.sc-title').textContent());
  await page.getByRole('button', { name: /Save site to compare/ }).click();
  await page.waitForTimeout(100);
  console.log('toast', await page.locator('.toast').textContent());
  await page.getByRole('button', { name: 'Reserve' }).click();
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByLabel('Expires').fill('08/29');
  await page.waitForTimeout(400); await page.screenshot({ path: `${dir}/9-reserve.png` });
  await page.getByRole('button', { name: /^Pay/ }).click();
  console.log('done', await page.locator('.rs-done p').first().textContent());
  await page.getByRole('button', { name: 'Done' }).click();
  // click a site on the map
  await page.locator('.site-dot:not(.booked)').nth(5).click();
  console.log('map-selected', await page.locator('.sc-title').textContent());
  await page.locator('.saved-tray .btn-primary').click();
  await page.waitForTimeout(200);
  await page.locator('.cmp-scroll').evaluate((el) => el.scrollTo(0, 2000));
  await page.screenshot({ path: `${dir}/10-compare-bottom.png` });
  await page.locator('textarea.note').first().pressSequentially('Ask about loop D');
  console.log('note', await page.locator('textarea.note').first().inputValue());
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
server.close();
