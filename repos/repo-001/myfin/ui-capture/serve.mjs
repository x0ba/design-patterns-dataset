// Serves the MyFin production build and proxies /api/* to the MyFin API (same origin, no CORS).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, 'out');
const PORT = Number(process.env.PORT || 4419);
const API_PORT = Number(process.env.API_PORT || 3001);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
  '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
};

http.createServer((req, res) => {
  if (req.url.startsWith('/api/') || req.url === '/api') {
    const target = req.url.slice(4) || '/';
    const p = http.request(
      { host: '127.0.0.1', port: API_PORT, path: target, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${API_PORT}` } },
      (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); },
    );
    p.on('error', () => { res.writeHead(502); res.end('API unavailable'); });
    req.pipe(p);
    return;
  }
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(ROOT, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`MyFin web on http://localhost:${PORT} (API proxied from :${API_PORT})`));
