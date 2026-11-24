// Smoke test: start the stub server on a test port, open the UI headless, sign in, take screenshots.
const path = require('path');
const { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(require.resolve('playwright-core', { paths: [ROOT] }));
const PORT = process.env.TEST_PORT || 5406;
const exe = process.env.CHROME || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const shots = path.join(process.env.TMPDIR || '/tmp', 'fc-shots');
require('fs').mkdirSync(shots, { recursive: true });

(async () => {
  const srv = spawn('bash', [path.join(__dirname, 'start.sh')], { env: { ...process.env, PORT }, stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--single-process', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
  const pageErrors = [];
  page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('[pageerror]', e.message.slice(0, 300)); });
  page.on('requestfailed', (r) => console.log('[reqfail]', r.url().slice(0, 120), r.failure()?.errorText));
  try {
    await page.goto(`http://localhost:${PORT}${process.env.ENTRY || '/'}`, { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${shots}/1-guest.png` });
    const steps = process.argv.slice(2);
    for (const s of steps) {
      // eslint-disable-next-line no-eval
      await eval(`(async () => { ${s} })()`);
    }
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await page.screenshot({ path: `${shots}/9-final.png` });
    console.log(`UNCAUGHT PAGE ERRORS: ${pageErrors.length}`, 'url:', page.url());
    await browser.close();
    srv.kill();
  }
})();
