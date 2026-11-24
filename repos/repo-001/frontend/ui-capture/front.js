// Single entry point on PORT (4486): /api/v1/* and /ghost/* -> in-process stub API, everything else -> Next.js.
// Stub and Next listen on free loopback ports chosen at runtime, so only PORT has to be free.
const http = require('http')
const net = require('net')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, '..')
const PORT = +process.env.PORT || 4486
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) }) })

function proxy(req, res, port) {
  const up = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode, r.headers)
    r.pipe(res)
  })
  up.on('error', (e) => { if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' }); res.end('upstream error: ' + e.message) })
  req.pipe(up)
}

;(async () => {
  const { server: stub } = require('./stub/server')
  await new Promise((r) => stub.listen(0, '127.0.0.1', r))
  const stubPort = stub.address().port
  const nextPort = await freePort()
  console.log(`stub API on 127.0.0.1:${stubPort}, Next.js on 127.0.0.1:${nextPort}`)

  const next = spawn(process.execPath, [path.join(ROOT, 'node_modules/next/dist/bin/next'), 'start', '-p', String(nextPort), '-H', '127.0.0.1'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, PORT: String(nextPort) } })
  const stop = () => { try { next.kill('SIGTERM') } catch {} ; process.exit(0) }
  process.on('SIGTERM', stop); process.on('SIGINT', stop)
  next.on('exit', (code) => { console.error('Next.js exited with code', code); process.exit(code || 1) })

  // wait for Next to answer before opening the public port
  for (let i = 0; i < 300; i++) {
    const ok = await new Promise((r) => http.get({ host: '127.0.0.1', port: nextPort, path: '/api/healthcheck' }, (x) => { x.resume(); r(true) }).on('error', () => r(false)))
    if (ok) break
    await new Promise((r) => setTimeout(r, 200))
  }

  const front = http.createServer((req, res) => {
    const isStub = req.url.startsWith('/api/v1/') || req.url === '/api/v1' || req.url.startsWith('/ghost/')
    proxy(req, res, isStub ? stubPort : nextPort)
  })
  front.on('error', (e) => { console.error(`cannot listen on port ${PORT}: ${e.message}`); stop() })
  front.listen(PORT, () => console.log(`Podkrepi.bg UI ready on http://localhost:${PORT}/`))
})()
