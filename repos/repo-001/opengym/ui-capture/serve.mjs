// Local stand-in for web/nginx.conf.template: serves the built frontend (frontend/dist) and the
// 180 px exercise media (catalogue/media at /exercise-media/), and proxies /api/ to the api
// process, so the browser sees one origin as it does behind nginx in the Docker setup.
import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, resolve, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const repo = resolve(here, '..')
const DIST = join(repo, 'frontend/dist')
const MEDIA = join(repo, 'catalogue/media')
const PORT = +(process.env.PORT || 4448)
const API_PORT = +(process.env.API_PORT || 3448)

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm',
}

function sendFile(res, file, status = 200) {
  const st = statSync(file)
  res.writeHead(status, {
    'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': st.size,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': file.endsWith('index.html') || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600',
  })
  createReadStream(file).pipe(res)
}

function safeJoin(root, urlPath) {
  const p = normalize(join(root, decodeURIComponent(urlPath)))
  return p.startsWith(root) ? p : null
}

function proxy(req, res) {
  const up = http.request({
    host: '127.0.0.1', port: API_PORT, path: req.url, method: req.method,
    headers: { ...req.headers, 'x-real-ip': req.socket.remoteAddress, 'x-forwarded-for': req.socket.remoteAddress, 'x-forwarded-proto': 'http' },
  }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res) })
  up.on('error', () => { if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"api unavailable"}') })
  req.pipe(up)
}

http.createServer((req, res) => {
  const path = req.url.split('?')[0]
  if (path.startsWith('/api/') || /^\/\.well-known\/(oauth-authorization-server|oauth-protected-resource|openid-configuration)/.test(path)) return proxy(req, res)
  if (path === '/mcp') { res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end('{"jsonrpc":"2.0","error":{"code":-32000,"message":"MCP is not running on this openGym server"},"id":null}') }
  if (path.startsWith('/exercise-media/')) {
    const f = safeJoin(MEDIA, path.slice('/exercise-media/'.length))
    if (f && existsSync(f) && statSync(f).isFile()) return sendFile(res, f)
    res.writeHead(404); return res.end()
  }
  const f = safeJoin(DIST, path === '/' ? 'index.html' : path.slice(1))
  if (f && existsSync(f) && statSync(f).isFile()) return sendFile(res, f)
  // The app routes with a hash, so any other path is the shell.
  sendFile(res, join(DIST, 'index.html'))
}).listen(PORT, () => console.log(`openGym web on http://localhost:${PORT} (api on ${API_PORT})`))
