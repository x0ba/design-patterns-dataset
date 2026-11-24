// Test helper: open the app headless at 1440x900 with outside network blocked, log errors, screenshot.
import { chromium } from './vendor/node_modules/playwright-core/index.mjs';
const [url, out, evalJs, waitMs] = process.argv.slice(2);
const exe = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1255/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ executablePath: exe, args: (process.env.CARGS||'').split(' ').filter(Boolean) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', m => { if (['error','warning'].includes(m.type())) console.log('console.'+m.type()+':', m.text().slice(0,300)); });
page.on('pageerror', e => console.log('pageerror:', e.message));
await page.route('**/*', r => { const u = new URL(r.request().url()); if (['localhost','127.0.0.1'].includes(u.hostname) || u.protocol==='blob:' || u.protocol==='data:') return r.continue(); console.log('BLOCKED', u.href.slice(0,120)); return r.abort(); });
page.on('requestfailed', r => console.log('REQFAILED', r.url(), r.failure() && r.failure().errorText));
page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
page.on('response', r => { const ct = r.headers()['content-type'] || ''; const p = new URL(r.url()).pathname; if (ct.includes('html') && p !== '/' && p !== '/index.html') console.log('HTMLRESP', r.url()); });
page.on('pageerror', e => console.log('pageerror-stack:', (e.stack || '').slice(0, 400)));
await page.goto(url);
try { await page.waitForSelector('html[data-huey-seeded=true]', { timeout: 60000 }); } catch (e) { console.log('not seeded in time'); }
await page.waitForTimeout(+(waitMs||2000));
if (evalJs) console.log('EVAL:', JSON.stringify(await page.evaluate(evalJs)).slice(0, 4000));
await page.screenshot({ path: out });
await browser.close();
