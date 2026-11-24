// Dev check: serve ../out statically (index.html fallback) and screenshot with Playwright.
// usage: node check.mjs <url-path> <out.png> [--eval "js"]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright-core';

const OUT = path.join(import.meta.dirname, '..', 'out');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.woff': 'font/woff', '.md': 'text/markdown', '.webmanifest': 'application/manifest+json'};
const server = http.createServer((req, res) => {
	let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	let f = path.join(OUT, p);
	if (!f.startsWith(OUT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(OUT, 'index.html');
	res.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'});
	fs.createReadStream(f).pipe(res);
}).listen(5471);

const [, , urlPath = '/', shot = 'shot.png', ...rest] = process.argv;
const evalIdx = rest.indexOf('--eval');
const evalCode = evalIdx >= 0 ? rest[evalIdx + 1] : null;
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const browser = await chromium.launch({executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--single-process', '--no-zygote', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const external = new Set();
await page.route('**/*', route => {
	const u = route.request().url();
	if (u.startsWith('http://localhost:5471') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
	external.add(u); return route.abort();
});
page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5471' + urlPath);
await page.waitForTimeout(6000);
if (evalCode) { console.log('eval:', JSON.stringify(await page.evaluate(evalCode))); await page.waitForTimeout(1500); }
await page.screenshot({path: shot});
console.log('external blocked:', [...external]);
await browser.close();
server.close();
