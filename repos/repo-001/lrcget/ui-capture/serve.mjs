// Minimal static server for ./out with index.html fallback (testing only).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const root = process.env.ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), 'out')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]))
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html')
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' })
  fs.createReadStream(p).pipe(res)
}).listen(process.env.PORT || 5428)
