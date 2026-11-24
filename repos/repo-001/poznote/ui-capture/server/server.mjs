// Local stand-in for the Docker image's nginx + php-fpm pair.
//
// PHP 8.5 runs as WebAssembly (@php-wasm/node), with the repo's src/ mounted at
// /var/www/html exactly as in the container and the data volume
// (.ui-capture/data) mounted at /var/www/html/data. Routing mirrors
// docker/nginx/default.conf: static files from src/public, /api/v1/* to the
// API router, pretty public share URLs to public_*.php, and .php to PHP.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNodeRuntime, createNodeFsMountHandler } from '@php-wasm/node';
import { PHP, PHPRequestHandler, setPhpIniEntries } from '@php-wasm/universal';

const here = path.dirname(fileURLToPath(import.meta.url));
const CAPTURE = path.resolve(here, '..');
const REPO = path.resolve(CAPTURE, '..');
const SRC = path.join(REPO, 'src');
const PUBLIC = path.join(SRC, 'public');
const DATA = process.env.POZNOTE_HOST_DATA || path.join(CAPTURE, 'data');
const TMP = path.join(CAPTURE, 'runtime', 'tmp');
const PORT = Number(process.env.PORT || 4500);
const DOCROOT = '/var/www/html/public';

for (const d of [DATA, TMP, path.join(TMP, 'sessions'), path.join(SRC, 'data')]) fs.mkdirSync(d, { recursive: true });

const env = {
  SQLITE_DATABASE: '/var/www/html/data/database/poznote.db',
  SERVER_NAME: 'localhost',
  TZ: 'Europe/Paris',
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('POZNOTE_'))),
};

async function createPhp() {
  const php = new PHP(await loadNodeRuntime('8.5', { emscriptenOptions: { processId: 1, ENV: env } }));
  php.mkdir('/var/www/html');
  await php.mount('/var/www/html', createNodeFsMountHandler(SRC));
  await php.mount('/var/www/html/data', createNodeFsMountHandler(DATA));
  php.mkdir('/srv/tmp');
  await php.mount('/srv/tmp', createNodeFsMountHandler(TMP));
  await setPhpIniEntries(php, {
    error_reporting: 'E_ERROR | E_PARSE',
    display_errors: 'Off',
    log_errors: 'On',
    error_log: '/srv/tmp/php_errors.log',
    upload_max_filesize: '750M',
    post_max_size: '800M',
    max_execution_time: '600',
    memory_limit: '512M',
    upload_tmp_dir: '/srv/tmp',
    'session.save_path': '/srv/tmp/sessions',
    'session.upload_progress.enabled': '0',
    'date.timezone': 'Europe/Paris',
    expose_php: 'Off',
  });
  php.chdir('/var/www/html/public');
  return php;
}

const php = await createPhp();
const handler = new PHPRequestHandler({
  php,
  documentRoot: DOCROOT,
  absoluteUrl: `http://localhost:${PORT}`,
  cookieStore: false,
  getFileNotFoundAction: (p) =>
    p.startsWith('/api/v1') ? { type: 'internal-redirect', uri: '/api/v1/index.php' } : { type: '404' },
});

// One PHP instance: serialize requests to it.
let queue = Promise.resolve();
function runSerial(fn) {
  const p = queue.then(fn, fn);
  queue = p.catch(() => {});
  return p;
}

const MIME = {
  js: 'application/javascript', mjs: 'application/javascript', css: 'text/css', html: 'text/html; charset=utf-8',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
  ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject', webmanifest: 'application/manifest+json',
  map: 'application/json', txt: 'text/plain; charset=utf-8', wasm: 'application/wasm', mp3: 'audio/mpeg',
  pdf: 'application/pdf', xml: 'application/xml',
};
const SEC_HEADERS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

function sendFile(res, file, req) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const stat = fs.statSync(file);
  res.writeHead(200, {
    ...SEC_HEADERS,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'public, max-age=3600',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return new Uint8Array(Buffer.concat(chunks));
}

async function runPhp(req, res, url) {
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k] = Array.isArray(v) ? v.join(', ') : v;
  const started = Date.now();
  const response = await runSerial(() => handler.request({ method: req.method, url, headers, body }));
  const out = {};
  for (const [k, v] of Object.entries(response.headers)) {
    if (k === 'content-length' || k === 'transfer-encoding') continue;
    out[k] = v.length === 1 && k !== 'set-cookie' ? v[0] : v;
  }
  for (const [k, v] of Object.entries(SEC_HEADERS)) if (!(k.toLowerCase() in out)) out[k] = v;
  res.writeHead(response.httpStatusCode, out);
  res.end(req.method === 'HEAD' ? undefined : Buffer.from(response.bytes));
  if (process.env.POZNOTE_LOG_REQUESTS) console.log(`${req.method} ${url} -> ${response.httpStatusCode} ${Date.now() - started}ms`);
  if (response.errors && process.env.POZNOTE_LOG_REQUESTS) console.error(response.errors);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    let p;
    try { p = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end(); }
    if (p.includes('..') || /\/\./.test(p)) { res.writeHead(403); return res.end('Forbidden'); }

    // Files served from the data volume (see nginx config)
    if (/^\/data\/users\/[0-9]+\/backgrounds\//.test(p) || /^\/data\/css\/[A-Za-z0-9._-]+\.css$/.test(p) ||
        /^\/data\/fonts\/[A-Za-z0-9._-]+\.(woff2|woff|ttf|otf)$/.test(p) || /^\/data\/branding\/logo-(192|512)\.png$/.test(p)) {
      const f = path.join(DATA, p.slice('/data/'.length));
      if (isFile(f)) return sendFile(res, f, req);
      res.writeHead(404); return res.end('Not found');
    }
    if (/^\/(data|config)\//.test(p)) { res.writeHead(403); return res.end('Forbidden'); }
    if (p === '/favicon.ico') {
      const logo = path.join(DATA, 'branding', 'logo-512.png');
      return sendFile(res, isFile(logo) ? logo : path.join(PUBLIC, 'favicon.ico'), req);
    }
    if (p === '/api/health' || p === '/api/info') return await runPhp(req, res, '/api_health.php' + u.search);

    const fsPath = path.join(PUBLIC, p);
    if (isFile(fsPath)) {
      if (fsPath.endsWith('.php')) return await runPhp(req, res, req.url);
      return sendFile(res, fsPath, req);
    }
    if (isDir(fsPath)) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' + u.search }); return res.end(); }
      if (isFile(path.join(fsPath, 'index.php'))) return await runPhp(req, res, req.url);
      if (isFile(path.join(fsPath, 'index.html'))) return sendFile(res, path.join(fsPath, 'index.html'), req);
    }
    if (p.startsWith('/api/v1')) return await runPhp(req, res, req.url);

    let m;
    if ((m = p.match(/^\/folder\/([^/]+)\/?$/))) return await runPhp(req, res, `/public_folder.php?token=${encodeURIComponent(m[1])}`);
    if ((m = p.match(/^\/workspace\/([^/]+)\/?$/))) return await runPhp(req, res, `/public_note.php?token=${encodeURIComponent(m[1])}`);
    if ((m = p.match(/^\/([^/]+)\/?$/))) return await runPhp(req, res, `/public_slug.php?slug=${encodeURIComponent(m[1])}`);
    res.writeHead(404); res.end('Not found');
  } catch (e) {
    console.error('request failed', req.url, e);
    if (!res.headersSent) res.writeHead(500);
    res.end('Internal error');
  }
});

server.listen(PORT, () => console.log(`Poznote (php-wasm 8.5) listening on http://localhost:${PORT}/`));
