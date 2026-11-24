// usage: node tools/shot.js <url> <out.png> [fakecam] [openchat]
const { chromium } = require('playwright-core');
const fs = require('fs');
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell';
(async () => {
  const [url, out, fake, chat] = process.argv.slice(2);
    const args = fake === '1' ? ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] : [];
  const b = await chromium.launch({ executablePath: exe, args });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  if (fake === '1') await ctx.grantPermissions(['camera', 'microphone']);
  const p = await ctx.newPage();
  p.on('console', m => console.log('console:', m.type(), m.text()));
  p.on('requestfailed', r => console.log('failed:', r.url()));
  await p.goto(url); await p.waitForTimeout(4000);
  if (chat === '1') { await p.click('#toggle-chat-pane'); await p.waitForTimeout(800); }
  await p.screenshot({ path: out });
  console.log('rows:', await p.locator('#chat-messages .row').count(), 'cards:', await p.locator('.card-sm').count());
  await b.close();
})();
