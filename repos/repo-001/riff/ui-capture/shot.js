// usage: node .ui-capture/shot.js <url> <out.png> [jsToRunBefore]
const { chromium } = require('./tools/node_modules/playwright-core');
(async () => {
  const exe = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
  const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message.slice(0, 300)));
  page.on('requestfailed', r => errs.push('reqfail: ' + r.url().slice(0, 150) + ' ' + (r.failure() || {}).errorText));
  await page.goto(process.argv[2], { waitUntil: 'load' });
  await page.waitForTimeout(Number(process.env.WAIT || 4000));
  if (process.argv[4]) { await page.evaluate(process.argv[4]); await page.waitForTimeout(Number(process.env.WAIT2 || 2500)); }
  await page.screenshot({ path: process.argv[3] });
  console.log(errs.slice(0, 40).join('\n'));
  await browser.close();
})();
