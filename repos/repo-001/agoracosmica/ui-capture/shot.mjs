// Verification helper: open a URL in headless Chromium at 1440x900, log
// failed requests / console errors, save a screenshot.
// usage: node shot.mjs <url> <out.png> [waitMs] [actions.js]
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
const require = createRequire(new URL('./tools/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const base = `${homedir()}/Library/Caches/ms-playwright`;
const dir = readdirSync(base).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
const exe = `${base}/${dir}/chrome-mac/headless_shell`;
const [url, out, wait = '4000', actions] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: (() => { try { readFileSync(exe); return exe; } catch { return `${base}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`; } })() });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text().slice(0, 200)); });
page.on('requestfailed', (r) => console.log('failed:', r.url().slice(0, 150)));
page.on('response', (r) => { if (r.status() >= 400) console.log(r.status(), r.url().slice(0, 150)); });
await page.goto(url);
await page.waitForTimeout(Number(wait));
if (actions) { const fn = (await import(new URL(actions, `file://${process.cwd()}/`))).default; await fn(page); }
await page.screenshot({ path: out });
await browser.close();
