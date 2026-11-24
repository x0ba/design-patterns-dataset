// Runs IGdm's real Electron main process (main/main.js) under Node and serves
// the real renderer (browser/*.html) to a normal web browser.
//  - `electron` is replaced by lib/electron-main.js (main side) and
//    public/electron-renderer.js (renderer side); IPC is bridged over SSE+POST.
//  - `instagram-private-api`, `auto-launch`, `electron-updater` and
//    `electron-connect` are replaced by local stubs in ./stubs.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..');
const PORT = Number(process.env.PORT || 4439);

const shim = require('./lib/electron-main');
const media = require('./lib/media');

const STUBS = {
  electron: path.join(HERE, 'lib', 'electron-main-entry.js'),
  'instagram-private-api': path.join(HERE, 'stubs', 'instagram-private-api', 'index.js'),
  'auto-launch': path.join(HERE, 'stubs', 'auto-launch', 'index.js'),
  'electron-updater': path.join(HERE, 'stubs', 'electron-updater', 'index.js'),
  'electron-connect': path.join(HERE, 'stubs', 'electron-connect', 'index.js'),
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (STUBS[request]) return STUBS[request];
  return origResolve.call(this, request, ...rest);
};

// ---- SSE bridge -----------------------------------------------------------
const clients = new Set();
function push (payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((res) => res.write(data));
}
shim.bridge.on('send', (channel, args) => push({ type: 'ipc', channel, args }));
let navigated = false;
const onFirstNav = [];
shim.bridge.on('navigate', (p) => {
  push({ type: 'navigate', path: p });
  if (!navigated) { navigated = true; onFirstNav.splice(0).forEach((f) => f()); }
});

// ---- boot the app's main process -----------------------------------------
require(path.join(ROOT, 'main', 'main.js'));
const { app, ipcMain } = shim.electron;
app.emit('ready');
app.emit('browser-window-focus');

// ---- HTTP ------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.map': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const ALLOWED_MODULES = ['bootstrap', 'nojs', 'moment', 'jquery', 'popper.js'];
const INJECT = '<script src="/node_modules/moment/min/moment.min.js"></script><script src="/__shim/electron-renderer.js"></script>';

function readBody (req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (e) { resolve({}); } });
  });
}

function sendFile (res, file, inject) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file);
    const headers = { 'Content-Type': TYPES[ext] || 'application/octet-stream' };
    if (ext === '.html') {
      headers['Cache-Control'] = 'no-store';
      if (inject) buf = Buffer.from(buf.toString('utf8').replace(/<head>/i, '<head>' + INJECT));
    }
    res.writeHead(200, headers);
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(u.pathname);

  if (p === '/' || p === '/index.html') {
    res.writeHead(302, { Location: shim.currentPage() });
    return res.end();
  }
  if (p === '/__events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify({ type: 'hello', page: shim.currentPage() })}\n\n`);
    clients.add(res);
    const ka = setInterval(() => res.write(': ka\n\n'), 20000);
    req.on('close', () => { clients.delete(res); clearInterval(ka); });
    return;
  }
  if (p === '/__ipc' && req.method === 'POST') {
    const { channel, args } = await readBody(req);
    const evt = { sender: { send: (ch, ...a) => push({ type: 'ipc', channel: ch, args: a }) }, reply: (ch, ...a) => push({ type: 'ipc', channel: ch, args: a }) };
    try { ipcMain.emit(channel, evt, ...(args || [])); } catch (e) { console.error('[ipc]', channel, e); }
    res.writeHead(204); return res.end();
  }
  if (p === '/__dialog' && req.method === 'POST') {
    const { id, response } = await readBody(req);
    shim.resolveDialog(id, response);
    res.writeHead(204); return res.end();
  }
  if (p === '/__shim/electron-renderer.js') return sendFile(res, path.join(HERE, 'public', 'electron-renderer.js'));

  // local CDN stand-in
  let m;
  if ((m = p.match(/^\/cdn\/avatar\/([\w.\-]+)\.svg$/))) {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=86400' });
    return res.end(media.avatar(m[1], u.searchParams.get('kind'), u.searchParams.get('label')));
  }
  if ((m = p.match(/^\/cdn\/photo\/(\w+)\/([\w.\-]+)\.svg$/))) {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=86400' });
    return res.end(media.photo(m[1], m[2], u.searchParams.get('w'), u.searchParams.get('h')));
  }
  if ((m = p.match(/^\/cdn\/gif\/([\w.\-]+)\.svg$/))) {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=86400' });
    return res.end(media.gif(m[1]));
  }
  if ((m = p.match(/^\/cdn\/voice\/([\w.\-]+)\.wav$/))) {
    res.writeHead(200, { 'Content-Type': 'audio/wav', 'Cache-Control': 'max-age=86400' });
    return res.end(media.voice(m[1], Number(u.searchParams.get('s'))));
  }

  // static: renderer + the few node_modules it references
  const rel = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  const top = rel.split('/').filter(Boolean);
  if (top[0] === 'browser') {
    if (/^browser\/(index|login)\.html$/.test(top.join('/')) && '/' + top.join('/') !== shim.currentPage()) {
      res.writeHead(302, { Location: shim.currentPage() });
      return res.end();
    }
    return sendFile(res, file, file.endsWith('.html'));
  }
  if (top[0] === 'node_modules' && ALLOWED_MODULES.includes(top[1])) return sendFile(res, file);
  if (p === '/favicon.ico') return sendFile(res, path.join(ROOT, 'docs', 'favicon.ico'));
  res.writeHead(404); res.end('Not found');
});

function listen () {
  server.listen(PORT, () => console.log(`IGdm (browser bridge) on http://localhost:${PORT}/  -> ${shim.currentPage()}`));
}
if (navigated) listen();
else {
  onFirstNav.push(listen);
  setTimeout(() => { if (!server.listening) listen(); }, 4000);
}
