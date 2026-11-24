// Verification helper: node shot.js <url> <out.png> [waitMs] [fakeMedia=0|1]
// Blocks every non-localhost request (like the offline capture environment) and logs them.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const os = require('os');
(async () => {
    const [url, out, wait = '6000', fake = '0', actions = ''] = process.argv.slice(2);
    const dir = path.join(os.homedir(), 'Library/Caches/ms-playwright');
    const shellDir = fs.readdirSync(dir).filter((d) => /^chromium_headless_shell-\d+$/.test(d)).sort().pop();
    const exe = path.join(dir, shellDir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');
    const args = fake === '1' ? ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] : [];
    const browser = await chromium.launch({ executablePath: exe, args, headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const blocked = new Set();
    await page.route('**/*', (route) => {
        const u = new URL(route.request().url());
        if (['localhost', '127.0.0.1'].includes(u.hostname) || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
        blocked.add(u.origin + u.pathname.slice(0, 60));
        return route.abort();
    });
    page.on('response', (r) => {
        if (r.status() >= 400) console.log('HTTP', r.status(), r.url());
    });
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    page.on('console', (m) => {
        if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200));
    });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(parseInt(wait, 10));
    if (actions) {
        for (const a of actions.split(';')) {
            const [kind, arg] = a.split('=');
            try {
                if (kind === 'click') await page.click(arg, { timeout: 3000 });
                if (kind === 'wait') await page.waitForTimeout(parseInt(arg, 10));
                if (kind === 'eval') console.log('EVAL', await page.evaluate(arg));
            } catch (e) {
                console.log('ACTION FAIL', a, e.message.split('\n')[0]);
            }
        }
    }
    await page.screenshot({ path: out });
    console.log('BLOCKED', [...blocked].join('\n  '));
    await browser.close();
})();
