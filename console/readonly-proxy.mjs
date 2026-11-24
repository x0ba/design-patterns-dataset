// Read-only front for the dataset console: forwards GET/HEAD to the console,
// refuses every other method (so proposals can't be accepted or rejected).
import http from 'node:http';

const TARGET = { host: '127.0.0.1', port: 4317 };
const PORT = Number(process.env.PORT ?? 4318);

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'application/json', allow: 'GET, HEAD' });
    return res.end(JSON.stringify({ error: 'read-only view' }));
  }
  const up = http.request({ ...TARGET, method: req.method, path: req.url, headers: { ...req.headers, host: `${TARGET.host}:${TARGET.port}` } }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('console unavailable'); });
  req.on('close', () => up.destroy());
  up.end();
}).listen(PORT, '127.0.0.1', () => console.log(`read-only proxy: http://127.0.0.1:${PORT}`));
