'use strict';
// Front server for running Riff's renderer in a desktop browser.
// - serves src/renderer (+ /assets) and injects a browser stand-in for the Electron preload bridge
// - persists localStorage through a storage.json file, exactly like the Electron main process does
// - proxies /api/* to the app's real local server (src/server/server.js), except endpoints that
//   would reach YouTube / SoundCloud / lyrics providers, which are answered by ./stubs.js
// - serves Google Fonts / Material Symbols locally and generated cover art
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CAP = __dirname;
const PORT = parseInt(process.env.PORT || '4431', 10);
const RUNTIME = path.join(CAP, 'runtime');
const DATA_DIR = path.join(RUNTIME, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
process.env.RIFF_DATA_DIR = DATA_DIR;

const STORAGE_FILE = path.join(RUNTIME, 'storage.json');
const SEED_STORAGE = path.join(CAP, 'seed', 'storage.json');
if (!fs.existsSync(STORAGE_FILE) || process.env.RIFF_RESEED !== '0') {
  if (fs.existsSync(SEED_STORAGE)) fs.copyFileSync(SEED_STORAGE, STORAGE_FILE);
}

const stubs = require('./stubs');
const art = require('./art');
const fonts = require('./fonts');

const riffServer = require(path.join(ROOT, 'src/server/server.js'));
let innerPort = 0;
const TOKEN = riffServer.getServerToken();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.glsl': 'text/plain'
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true'
};

function rewriteExternal(text) {
  return text
    .replace(/https:\/\/fonts\.googleapis\.com\/css2/g, '/__fonts/css2')
    .replace(/<link rel="preconnect"[^>]*>/g, '');
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function sendFile(res, file, transform) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, CORS); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    if (transform && /\.(html|js|css)$/.test(ext)) {
      let text = fs.readFileSync(file, 'utf8');
      text = transform(text, file);
      res.writeHead(200, { ...CORS, 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(text);
    }
    res.writeHead(200, { ...CORS, 'Content-Type': type, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

function safeJoin(base, rel) {
  const p = path.normalize(path.join(base, decodeURIComponent(rel)));
  return p.startsWith(base) ? p : null;
}

function proxyToRiff(req, res, body) {
  if (process.env.RIFF_UI_LOG) console.log('[proxy]', req.method, req.url.slice(0, 160));
  const headers = { ...req.headers, 'x-riff-token': TOKEN, host: `127.0.0.1:${innerPort}` };
  delete headers.origin; delete headers.referer;
  const preq = http.request({ host: '127.0.0.1', port: innerPort, method: req.method, path: req.url, headers }, (pres) => {
    const h = { ...pres.headers, ...CORS };
    res.writeHead(pres.statusCode || 502, h);
    pres.pipe(res);
  });
  preq.on('error', (e) => {
    if (!res.headersSent) res.writeHead(502, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: e.message }));
  });
  if (body && body.length) preq.write(body);
  preq.end();
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  try {
    // ---- storage bridge (replaces Electron's storage.json IPC) ----
    if (p === '/__riff/storage') {
      if (req.method === 'GET') {
        let data = '{}';
        try { data = fs.readFileSync(STORAGE_FILE, 'utf8') || '{}'; } catch (_) {}
        res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(data);
      }
      const body = await readBody(req);
      try {
        const parsed = JSON.parse(body.toString('utf8'));
        if (parsed && typeof parsed === 'object') fs.writeFileSync(STORAGE_FILE, JSON.stringify(parsed, null, 2));
      } catch (_) {}
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
      return res.end('true');
    }
    if (p === '/__riff/shim.js') return sendFile(res, path.join(CAP, 'shim.js'));
    if (p.startsWith('/__fonts/')) return fonts.handle(req, res, u, CORS);
    if (p.startsWith('/__art/')) return art.handle(req, res, u, CORS);
    if (p.startsWith('/__audio/')) return stubs.audio.handle(req, res, u, CORS);
    if (p === '/__riff/cache') {
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
      return res.end('null');
    }

    // ---- API ----
    if (p.startsWith('/api/')) {
      const body = (req.method === 'POST' || req.method === 'PUT') ? await readBody(req) : null;
      const handled = await stubs.handle(req, res, u, body, CORS);
      if (handled) return;
      return proxyToRiff(req, res, body);
    }

    // ---- static renderer ----
    if (p === '/' || p === '/index.html') {
      return sendFile(res, path.join(ROOT, 'src/renderer/index.html'), (t) => {
        t = rewriteExternal(t);
        return t.replace('<head>', '<head>\n  <script src="/__riff/shim.js"></script>');
      });
    }
    if (p === '/assets/lottie.min.js' && !fs.existsSync(path.join(ROOT, 'assets/lottie.min.js'))) {
      // the app falls back to cdnjs/jsdelivr for lottie-web 5.12.2; serve the same build locally
      return sendFile(res, path.join(CAP, 'tools/node_modules/lottie-web/build/player/lottie.min.js'));
    }
    if (p.startsWith('/assets/')) {
      const f = safeJoin(path.join(ROOT, 'assets'), p.slice('/assets/'.length));
      return f ? sendFile(res, f) : (res.writeHead(404), res.end());
    }
    if (p.startsWith('/node_modules/')) {
      const f = safeJoin(path.join(ROOT, 'node_modules'), p.slice('/node_modules/'.length));
      return f ? sendFile(res, f) : (res.writeHead(404), res.end());
    }
    const f = safeJoin(path.join(ROOT, 'src/renderer'), p.slice(1));
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) return sendFile(res, f, rewriteExternal);
    // SPA fallback
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (e) {
    console.error('[front] error', p, e);
    if (!res.headersSent) res.writeHead(500, CORS);
    res.end(String(e && e.message));
  }
});

riffServer.startServer(0).then((p) => {
  innerPort = p;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[riff-ui] serving Riff UI on http://localhost:${PORT}/ (internal API on ${p})`);
  });
});
