// Minimal static file server with index.html fallback (mirrors how out/ will be served).
// Usage: node serve.mjs <dir> <port>
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname, normalize } from 'path';
const [dir, port = '5465'] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webp': 'image/webp' };
createServer(async (req, res) => {
	let p = normalize(decodeURIComponent(req.url.split('?')[0]));
	let f = join(dir, p);
	try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { f = join(dir, 'index.html'); }
	try { const b = await readFile(f); res.writeHead(200, { 'Content-Type': types[extname(f).toLowerCase()] || 'application/octet-stream' }); res.end(b); }
	catch { res.writeHead(404); res.end(); }
}).listen(Number(port), () => console.log(`serving ${dir} on ${port}`));
