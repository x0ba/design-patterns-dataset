// dev-only harness: start stub server on 5477, load the app in headless Chromium, screenshot.
const { spawn } = require('child_process');
const path = require('path');
const { chromium } = require('playwright-core');
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '../stub/server.js')], { env: { ...process.env, PORT: '5477', STUB_LOG: process.env.STUB_LOG || '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', (d) => process.env.VERBOSE && process.stdout.write('SRV ' + d));
  srv.stderr.on('data', (d) => process.stdout.write('SRVERR ' + d));
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  const hook = (p) => {
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
    p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  };
  hook(page);
  page.on('requestfailed', (r) => errs.push('reqfail: ' + r.url().slice(0, 200) + ' ' + (r.failure() || {}).errorText));
  page.on('response', (r) => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + decodeURIComponent(r.url()).slice(0, 200)); });
  page.on('frameattached', () => {});
  await page.goto('http://localhost:5477/', { waitUntil: 'load' });
  const waits = (process.env.WAITS || '15').split(',').map(Number);
  let i = 0;
  for (const w of waits) {
    await page.waitForTimeout(w * 1000);
    await page.screenshot({ path: path.join(__dirname, `shot${i++}.png`) });
  }
  if (process.env.EVAL) {
    const f = page.frames().find((f) => f.url().includes('twc3.html'));
    console.log('EVAL', JSON.stringify(await f.evaluate(process.env.EVAL), null, 1).slice(0, 4000));
  }
  console.log(errs.join('\n'));
  await browser.close();
  srv.kill();
})().catch((e) => { console.error(e); process.exit(1); });
