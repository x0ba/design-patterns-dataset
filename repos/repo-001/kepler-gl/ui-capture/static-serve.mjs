// Minimal static server with index.html fallback (for local verification only).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2]); const port = Number(process.argv[3] || 5459);
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.pbf':'application/x-protobuf','.ttf':'font/ttf','.csv':'text/csv','.geojson':'application/geo+json','.arrow':'application/octet-stream'};
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  res.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
}).listen(port, '127.0.0.1', () => console.log('serving', root, port));
