// Verification probe: serves out/ on 5445, loads the app in headless Chrome, takes screenshots.
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';
const srv = spawn(process.execPath, ['.ui-capture/serve.mjs'], { stdio: 'inherit', env: { ...process.env, PORT: '5445' } });
await new Promise(r => setTimeout(r, 800));
const path = process.argv[2] || '/';
const browser = await puppeteer.launch({ executablePath: '/Applications/Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--lang=en-US'], userDataDir: process.env.TMPDIR + '/pp-prof' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errs = [];
page.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.type()+': '+m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('requestfailed', r => errs.push('reqfail: ' + r.url()));
await page.goto('http://localhost:5445' + path, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !document.getElementById('start-btn')?.disabled, { timeout: 90000 }).catch(e => errs.push('start btn never enabled'));
await page.screenshot({ path: '.ui-capture/shot-start.png' });
await page.click('#start-btn').catch(()=>{});
await new Promise(r => setTimeout(r, +(process.env.WAIT || 12000)));
await page.screenshot({ path: '.ui-capture/shot-main.png' });
console.log(errs.slice(0, 30).join('\n'));
await browser.close(); srv.kill();
