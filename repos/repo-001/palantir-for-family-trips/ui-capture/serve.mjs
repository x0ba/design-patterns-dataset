// Minimal static file server with index.html fallback (used only for local checks).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(process.argv[2] || 'out')
const port = Number(process.env.PORT || 5455)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' }
http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]))
  let file = p.startsWith(root) && fs.existsSync(p) && fs.statSync(p).isFile() ? p : path.join(root, 'index.html')
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/json' })
  fs.createReadStream(file).pipe(res)
}).listen(port, () => console.log(`serving ${root} on ${port}`))
