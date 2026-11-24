// Dev helper: screenshot the running app with Playwright (uses a locally cached Chromium).
// usage: node .ui-capture/shot.mjs <url> <out.png> [waitMs]
import { chromium } from 'playwright-core';
const [url, out, wait = '8000'] = process.argv.slice(2);
const exe = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const external = new Set();
page.on('request', r => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.add(u.hostname + u.pathname.slice(0, 40)); });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console.' + m.type() + ':', m.text().slice(0, 200)); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.goto(url);
await page.waitForTimeout(Number(wait));
if (process.env.ACTION) { await eval(`(async () => { ${process.env.ACTION} })()`); await page.waitForTimeout(3000); }
await page.screenshot({ path: out });
console.log('external requests:', [...external]);
await browser.close();
