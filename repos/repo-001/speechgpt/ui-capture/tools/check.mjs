// Verification helper: opens the app at 1440x900, screenshots, optionally sends a message.
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';

const base = process.argv[2] || 'http://localhost:5443/';
const shotDir = process.argv[3] || '.';
const cache = homedir() + '/Library/Caches/ms-playwright';
const dir = readdirSync(cache).filter(d => d.startsWith('chromium_headless_shell')).sort().pop();
const sub = readdirSync(`${cache}/${dir}`).find(d => d.startsWith('chrome-headless-shell'));
const exe = `${cache}/${dir}/${sub}/chrome-headless-shell`;

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== 'localhost') errors.push('external: ' + r.url()); });
await page.goto(base);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${shotDir}/shot-1.png` });
if (process.argv[4] === 'send') {
  await page.locator('textarea').first().fill('hola, me gustaría practicar cómo pedir direcciones en la ciudad');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${shotDir}/shot-2.png` });
}
await page.reload();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${shotDir}/shot-3.png` });
console.log('errors:', JSON.stringify(errors, null, 1));
await browser.close();
