// Verification helper: next-auth credentials login + fetch SSR pages, report status and markers.
const base = process.argv[2] || 'http://localhost:5486'
const paths = process.argv.slice(3)
const jar = {}
const cookieHdr = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
const keep = (r) => (r.headers.getSetCookie?.() || []).forEach((c) => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1) })
;(async () => {
  let r = await fetch(base + '/api/auth/csrf', { headers: { cookie: cookieHdr() } }); keep(r)
  const { csrfToken } = await r.json()
  r = await fetch(base + '/api/auth/callback/credentials', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookieHdr() }, body: new URLSearchParams({ csrfToken, email: 'desislava.marinova@abv.bg', password: 'Podkrepi2026!', json: 'true' }) }); keep(r)
  r = await fetch(base + '/api/auth/session', { headers: { cookie: cookieHdr() } })
  const s = await r.json(); console.log('session user:', s.user?.name, s.user?.email)
  for (const p of paths) {
    const t0 = Date.now()
    r = await fetch(base + p, { redirect: 'manual', headers: { cookie: cookieHdr() } })
    const html = await r.text()
    const title = (html.match(/<title>([^<]*)/) || [])[1]
    const err = html.includes('Application error') || html.includes('Internal Server Error')
    console.log(r.status, p, Date.now() - t0 + 'ms', title, err ? 'ERROR' : '', r.headers.get('location') || '', 'len', html.length)
  }
})()
