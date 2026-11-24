// Loads the served app in headless Chromium at 1440x900, reports console errors and
// any non-localhost requests, and saves a screenshot.
// Usage: node check.mjs <url> <screenshot.png> [waitMs] [jsToEvalAfter]
import { chromium } from 'playwright-core';
import { homedir } from 'os';
const [url, shot, waitMs = '8000', js] = process.argv.slice(2);
const browser = await chromium.launch({
	executablePath: `${homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
	args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));
page.on('dialog', (d) => { console.log('[dialog]', d.message()); d.dismiss(); });
page.on('request', (r) => { const u = r.url(); if (!/^(https?:\/\/(localhost|127\.0\.0\.1)|data:|blob:)/.test(u)) console.log('[external]', u.slice(0, 200)); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(Number(waitMs));
if (js) { console.log('[eval]', JSON.stringify(await page.evaluate(js)).slice(0, 2000)); await page.waitForTimeout(1500); }
await page.screenshot({ path: shot });
await browser.close();
