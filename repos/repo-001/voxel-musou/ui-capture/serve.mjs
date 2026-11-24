// Minimal static server for local checks: serves ./.ui-capture/out, unknown paths fall back to index.html.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), 'out');
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(root, p.endsWith('/') ? p + 'index.html' : p);
  if (!f.startsWith(root)) f = join(root, 'index.html');
  let body;
  try { body = await readFile(f); } catch { f = join(root, 'index.html'); body = await readFile(f); }
  res.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }); res.end(body);
}).listen(+process.env.PORT || 5469, () => console.log('serving', root, 'on', +process.env.PORT || 5469));
