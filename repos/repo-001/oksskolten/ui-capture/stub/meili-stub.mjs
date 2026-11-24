// In-memory stand-in for the Meilisearch HTTP API, covering the subset that
// server/search/*.ts uses via the `meilisearch` JS client: index create/delete/
// swap/stats, settings, document add/update/delete, tasks, and search with
// filter + sort. Used because the real meilisearch binary (pinned in mise.toml)
// cannot size its LMDB memory map inside the capture sandbox.
// Every task completes synchronously ("succeeded").
import http from 'node:http'

const indexes = new Map() // uid -> { uid, primaryKey, docs: Map, createdAt, updatedAt }
const tasks = new Map()
let taskSeq = 0

function task(type, indexUid, details = {}) {
  const t = new Date().toISOString()
  const uid = taskSeq++
  const full = { uid, batchUid: uid, indexUid, status: 'succeeded', type, canceledBy: null, details, error: null, duration: 'PT0.001S', enqueuedAt: t, startedAt: t, finishedAt: t }
  tasks.set(uid, full)
  return { taskUid: uid, indexUid, status: 'enqueued', type, enqueuedAt: t }
}
function ensure(uid, primaryKey = 'id') {
  if (!indexes.has(uid)) {
    const t = new Date().toISOString()
    indexes.set(uid, { uid, primaryKey, docs: new Map(), createdAt: t, updatedAt: t })
  }
  return indexes.get(uid)
}
const pub = (ix) => ({ uid: ix.uid, primaryKey: ix.primaryKey, createdAt: ix.createdAt, updatedAt: ix.updatedAt })

// --- filter: "a = 1 AND b >= 2 AND is_unread = true AND id IN [1,2]"
function compileFilter(filter) {
  if (!filter) return () => true
  const expr = Array.isArray(filter) ? filter.flat().join(' AND ') : String(filter)
  const parts = expr.split(/\s+AND\s+/i)
  const preds = parts.map((p) => {
    let m = p.match(/^\s*(\w+)\s+IN\s+\[([^\]]*)\]\s*$/i)
    if (m) { const set = new Set(m[2].split(',').map(s => s.trim())); const k = m[1]; return d => set.has(String(d[k])) }
    m = p.match(/^\s*(\w+)\s*(>=|<=|!=|=|>|<)\s*(.+?)\s*$/)
    if (!m) return () => true
    const [, k, op, raw] = m
    const v = raw === 'true' ? true : raw === 'false' ? false : Number.isNaN(Number(raw)) ? raw.replace(/^["']|["']$/g, '') : Number(raw)
    return (d) => {
      const x = d[k]
      switch (op) {
        case '=': return x === v
        case '!=': return x !== v
        case '>=': return x >= v
        case '<=': return x <= v
        case '>': return x > v
        case '<': return x < v
      }
      return true
    }
  })
  return d => preds.every(p => p(d))
}

const tokenize = s => (String(s || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'+#.-]*/gu) || []).map(w => w.replace(/[.'-]+$/, ''))

function search(ix, body) {
  const q = tokenize(body.q)
  const pass = compileFilter(body.filter)
  let docs = [...ix.docs.values()].filter(pass)
  let ranked
  if (!q.length) {
    ranked = docs.map(d => ({ d, s: 0 }))
  } else {
    const prep = docs.map(d => ({ d, title: tokenize(d.title), text: tokenize(`${d.full_text || ''} ${d.full_text_translated || ''}`) }))
    // matching strategy "last": require all terms, then drop terms from the end
    for (let n = q.length; n >= 1; n--) {
      const terms = q.slice(0, n)
      const isLast = (i) => i === terms.length - 1
      ranked = []
      for (const p of prep) {
        let s = 0
        let ok = true
        terms.forEach((t, i) => {
          const hit = (w) => w === t || (isLast(i) && t.length >= 2 && w.startsWith(t))
          const inTitle = p.title.some(hit)
          const inText = inTitle ? 0 : p.text.filter(hit).length
          if (!inTitle && !inText) ok = false
          s += (inTitle ? 50 : 0) + Math.min(inText, 20)
        })
        if (ok) ranked.push({ d: p.d, s: s + n * 1000 })
      }
      if (ranked.length) break
    }
  }
  const sort = body.sort?.[0]
  if (sort) {
    const [field, dir] = sort.split(':')
    ranked.sort((a, b) => (dir === 'asc' ? 1 : -1) * ((a.d[field] ?? 0) - (b.d[field] ?? 0)) || b.s - a.s)
  } else if (q.length) {
    ranked.sort((a, b) => b.s - a.s || (b.d.published_at ?? 0) - (a.d.published_at ?? 0))
  } else {
    ranked.sort((a, b) => (b.d.published_at ?? 0) - (a.d.published_at ?? 0))
  }
  const offset = body.offset ?? 0
  const limit = body.limit ?? 20
  const attrs = body.attributesToRetrieve
  const hits = ranked.slice(offset, offset + limit).map(({ d }) => {
    if (!attrs || attrs.includes('*')) return d
    return Object.fromEntries(attrs.filter(a => a in d).map(a => [a, d[a]]))
  })
  return { hits, query: body.q ?? '', processingTimeMs: 1, limit, offset, estimatedTotalHits: ranked.length }
}

function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json' })
  res.end(JSON.stringify(obj))
}

export function startMeiliStub(port) {
  http.createServer(async (req, res) => {
    let raw = ''
    for await (const c of req) raw += c
    const body = raw ? JSON.parse(raw) : undefined
    const url = new URL(req.url, 'http://localhost')
    const seg = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const M = req.method

    if (seg[0] === 'health') return send(res, 200, { status: 'available' })
    if (seg[0] === 'version') return send(res, 200, { pkgVersion: '1.13.3', commitSha: 'local-stub', commitDate: '2025-02-24' })
    if (seg[0] === 'tasks' && seg[1]) {
      const t = tasks.get(Number(seg[1]))
      return t ? send(res, 200, t) : send(res, 404, { message: `Task \`${seg[1]}\` not found.`, code: 'task_not_found', type: 'invalid_request', link: '' })
    }
    if (seg[0] === 'swap-indexes' && M === 'POST') {
      for (const { indexes: [a, b] } of body) {
        const A = ensure(a); const B = ensure(b)
        indexes.set(a, { ...B, uid: a }); indexes.set(b, { ...A, uid: b })
      }
      return send(res, 202, task('indexSwap', null, { swaps: body }))
    }
    if (seg[0] !== 'indexes') return send(res, 404, { message: 'not found', code: 'not_found' })

    if (seg.length === 1) {
      if (M === 'GET') { const all = [...indexes.values()].map(pub); return send(res, 200, { results: all, offset: 0, limit: 20, total: all.length }) }
      if (M === 'POST') { ensure(body.uid, body.primaryKey || 'id'); return send(res, 202, task('indexCreation', body.uid, { primaryKey: body.primaryKey })) }
    }
    const uid = seg[1]
    const ix = indexes.get(uid)
    if (seg.length === 2) {
      if (M === 'GET') return ix ? send(res, 200, pub(ix)) : send(res, 404, { message: `Index \`${uid}\` not found.`, code: 'index_not_found', type: 'invalid_request', link: '' })
      if (M === 'DELETE') { indexes.delete(uid); return send(res, 202, task('indexDeletion', uid)) }
    }
    const sub = seg[2]
    if (sub === 'stats') {
      return send(res, 200, { numberOfDocuments: ix ? ix.docs.size : 0, isIndexing: false, fieldDistribution: {} })
    }
    if (sub === 'settings') return send(res, 202, task('settingsUpdate', uid, body))
    if (sub === 'search') {
      if (!ix) return send(res, 404, { message: `Index \`${uid}\` not found.`, code: 'index_not_found', type: 'invalid_request', link: '' })
      return send(res, 200, search(ix, M === 'GET' ? Object.fromEntries(url.searchParams) : body || {}))
    }
    if (sub === 'documents') {
      const target = ensure(uid)
      target.updatedAt = new Date().toISOString()
      if (seg[3] === 'delete' && M === 'POST') {
        const pass = compileFilter(body?.filter)
        for (const [k, d] of target.docs) if (pass(d)) target.docs.delete(k)
        return send(res, 202, task('documentDeletion', uid))
      }
      if (seg[3] === 'delete-batch' && M === 'POST') { for (const id of body) target.docs.delete(String(id)); return send(res, 202, task('documentDeletion', uid)) }
      if (seg[3] && M === 'DELETE') { target.docs.delete(seg[3]); return send(res, 202, task('documentDeletion', uid)) }
      if (M === 'POST' || M === 'PUT') {
        const docs = Array.isArray(body) ? body : [body]
        for (const d of docs) {
          const k = String(d[target.primaryKey])
          target.docs.set(k, M === 'PUT' ? { ...(target.docs.get(k) || {}), ...d } : d)
        }
        return send(res, 202, task('documentAdditionOrUpdate', uid, { receivedDocuments: docs.length, indexedDocuments: docs.length }))
      }
      if (M === 'DELETE') { target.docs.clear(); return send(res, 202, task('documentDeletion', uid)) }
    }
    return send(res, 404, { message: 'not found', code: 'not_found' })
  }).listen(port, '127.0.0.1', () => console.log(`[stub] Meilisearch API on :${port}`))
}
