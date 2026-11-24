// usage: node tools/shot.mjs <url> <out.png> [waitMs] [js-to-eval-after-load]
import { chromium } from 'playwright-core';
import os from 'node:os';
const [url, out, wait = '6000', evalJs] = process.argv.slice(2);
const exe = `${os.homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: exe, args: ['--single-process', '--no-zygote', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('requestfailed', r => console.log('[reqfail]', r.url().slice(0, 200)));
page.on('response', r => { if (r.status() >= 400) console.log('[http ' + r.status() + ']', r.url().slice(0, 200)); });
await page.goto(url);
await page.waitForTimeout(+wait);
if (evalJs) { console.log('[eval]', JSON.stringify(await page.evaluate(evalJs)).slice(0, 2000)); await page.waitForTimeout(2500); }
if (process.env.CLICK) { await page.click(process.env.CLICK); await page.waitForTimeout(3000); }
await page.screenshot({ path: out });
await browser.close();
