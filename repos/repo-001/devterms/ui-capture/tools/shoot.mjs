// Verification helper: drives headless Chrome over CDP, signs in through the
// stubbed GitHub flow, and screenshots pages at 1440x900.
// usage: node shoot.mjs <baseUrl> <outDir> <path1> [path2 ...]   (prefix a path with "!" to stay signed out)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base, outDir, ...paths] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Chrome.app/Contents/MacOS/Google Chrome';
const port = 9333;
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(outDir, '.profile')}`,
  '--window-size=1440,900', 'about:blank'
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map();
const consoleErrors = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(msg.params.exceptionDetails.text);
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') consoleErrors.push(msg.params.entry.text + ' ' + (msg.params.entry.url ?? ''));
};
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const go = async (url, wait = 2500) => { await send('Page.navigate', { url }); await sleep(wait); };
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

let signedIn = false;
for (const raw of paths) {
  const anon = raw.startsWith('!');
  const p = anon ? raw.slice(1) : raw;
  if (!anon && !signedIn) {
    await go(`${base}/login`);
    await evaluate(`[...document.querySelectorAll('button')].find(b => /github/i.test(b.textContent))?.click()`);
    await sleep(4000);
    console.log('after sign-in:', await evaluate('location.href'));
    signedIn = true;
  }
  if (p.startsWith('search:')) {
    await go(`${base}/`);
    await evaluate(`(() => { const i = document.querySelector('input[placeholder="Search..."]'); i.focus(); })()`);
    await send('Input.insertText', { text: p.slice(7) });
    await sleep(1500);
  } else {
    await go(base + p);
  }
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = join(outDir, (p.replace(/[^a-z0-9]+/gi, '_') || 'root') + (anon ? '_anon' : '') + '.png');
  writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
  console.log('saved', file, '| title:', await evaluate('document.title'));
}
if (consoleErrors.length) console.log('console errors:\n ' + [...new Set(consoleErrors)].join('\n '));
ws.close();
chrome.kill();
process.exit(0);
