// Seeds .ui-capture/seed-data/ through the app's own API: starts api/server.js on a private port
// with an empty DATA_DIR, registers the account with a password (PASSWORD_LOGIN=1), and saves the
// generated profile (gen-state.mjs) with PUT /api/data, the way a device syncs. start.sh copies
// seed-data/ to data/ on every start.
//   node .ui-capture/seed.mjs
import { spawn } from 'node:child_process'
import { rmSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildState } from './gen-state.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const repo = resolve(here, '..')
const DATA = join(here, 'seed-data')
const PORT = 5461
const ORIGIN = 'http://localhost:4448'
export const LOGIN = { username: 'Jonas Keller', email: 'jonas.keller@example.com', password: 'kraftwerk-oerlikon-115' }

rmSync(DATA, { recursive: true, force: true })
mkdirSync(DATA, { recursive: true })
const api = spawn(process.execPath, ['server.js'], {
  cwd: join(repo, 'api'),
  env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, RP_ID: 'localhost', ORIGIN, PASSWORD_LOGIN: '1', NODE_ENV: 'production' },
  stdio: ['ignore', 'inherit', 'inherit'],
})
const base = `http://127.0.0.1:${PORT}`
let cookie = ''
async function call(method, path, body) {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const set = r.headers.get('set-cookie')
  if (set) cookie = set.split(';')[0]
  const text = await r.text()
  let json; try { json = JSON.parse(text) } catch { json = text }
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${text.slice(0, 300)}`)
  return json
}

try {
  for (let i = 0; ; i++) {
    try { await call('GET', '/api/health'); break } catch (e) { if (i > 50) throw e; await new Promise(r => setTimeout(r, 200)) }
  }
  const reg = await call('POST', '/api/register/password', { name: LOGIN.username, email: LOGIN.email, password: LOGIN.password })
  console.log('registered', reg.user)
  const { rev } = await call('GET', '/api/data')
  const state = buildState()
  const put = await call('PUT', '/api/data', { state, baseRev: rev })
  console.log('saved state rev', put.rev ?? put, 'workouts', state.workouts.length, 'weigh-ins', state.bodyweight.length)
  const back = await call('GET', '/api/data')
  console.log('read back', back.state.workouts.length, 'workouts,', back.state.routines.length, 'routines')
  await call('POST', '/api/logout')
} finally {
  api.kill()
}
