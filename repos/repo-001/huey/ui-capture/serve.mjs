// Minimal static file server for local testing of ./out.
// Missing files with an extension get a real 404 (like a plain static server); extension-less
// unknown paths fall back to index.html. Every 404 is logged.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] || 'out'); const port = +(process.env.PORT || 5462);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.wasm':'application/wasm', '.woff2':'font/woff2', '.png':'image/png', '.svg':'image/svg+xml', '.csv':'text/csv' };
http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(root, p);
  if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(root) || !fs.existsSync(f)) {
    if (path.extname(p)) {
      console.log('404', p);
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found');
    }
    f = path.join(root, 'index.html');
  }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('serving', root, 'on', port));
