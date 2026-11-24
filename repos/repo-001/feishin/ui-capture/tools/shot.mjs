// Screenshot helper: node shot.mjs <base> <outdir> <path1> [path2...]
import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
const dir = homedir() + '/Library/Caches/ms-playwright/';
const shell = readdirSync(dir).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
const exe = process.env.CHROME || `${dir}${shell}/${readdirSync(dir + shell).find((d) => d.startsWith('chrome-'))}/chrome-headless-shell`;
const [base, out, ...paths] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));
for (const [i, p] of paths.entries()) {
    await page.goto(base + p, { waitUntil: 'load' });
    await page.waitForTimeout(i === 0 ? 5000 : 3000);
    await page.screenshot({ path: `${out}/shot-${i}.png` });
    console.log('shot', i, p, page.url());
}
console.log(errors.slice(0, 30).join('\n'));
await browser.close();
