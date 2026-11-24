// Local stand-ins for the outside services Oksskolten talks to.
//
//  1. Gateway on $PORT (4435): serves the UI by proxying to the Oksskolten
//     server on $APP_PORT, and answers two browser-side external calls locally:
//       /__stub/favicons?domain=…   (replaces https://www.google.com/s2/favicons)
//       /__stub/og/<slug>.svg       (article cover images, instead of remote og:image CDNs)
//  2. Anthropic Messages API on $ANTHROPIC_PORT (4436): the server's
//     @anthropic-ai/sdk client is pointed here via ANTHROPIC_BASE_URL. Handles
//     summaries, translations, conversation titles and tool-using chat turns.
//
// No dependencies; plain node:http.
import http from 'node:http'
import { startMeiliStub } from './meili-stub.mjs'

const PORT = Number(process.env.PORT || 4435)
const APP_PORT = Number(process.env.APP_PORT || 4437)
const ANTHROPIC_PORT = Number(process.env.ANTHROPIC_PORT || 4436)
const MEILI_PORT = Number(process.env.MEILI_PORT || 7735)

// 3. Meilisearch API on $MEILI_PORT (see meili-stub.mjs)
startMeiliStub(MEILI_PORT)

// ---------------------------------------------------------------- helpers
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const PALETTE = ['#0f766e', '#1d4ed8', '#9333ea', '#c2410c', '#be123c', '#15803d', '#0369a1', '#a16207', '#4338ca', '#334155', '#b91c1c', '#047857']
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function faviconSvg(domain) {
  const d = (domain || '?').replace(/^www\./, '')
  const h = hash(d)
  const bg = PALETTE[h % PALETTE.length]
  const letter = d[0]?.toUpperCase() || '?'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="44" font-family="Helvetica,Arial,sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="#fff">${esc(letter)}</text></svg>`
}

function ogSvg(slug) {
  const h = hash(slug)
  const a = PALETTE[h % PALETTE.length]
  const b = PALETTE[(h >>> 8) % PALETTE.length]
  const label = decodeURIComponent(slug).split('--')[0].replace(/[-_]/g, ' ')
  const shapes = []
  for (let i = 0; i < 7; i++) {
    const r = 40 + ((h >>> (i * 3)) % 160)
    const cx = (h >>> (i * 2)) % 1200
    const cy = (h >>> (i * 4 + 1)) % 630
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" fill-opacity="${0.04 + (i % 3) * 0.03}"/>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/>${shapes.join('')}<text x="72" y="560" font-family="Helvetica,Arial,sans-serif" font-size="44" font-weight="700" fill="#fff" fill-opacity="0.92">${esc(label)}</text></svg>`
}

// ---------------------------------------------------------------- gateway
const gateway = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/__stub/favicons') {
    res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' })
    return res.end(faviconSvg(url.searchParams.get('domain')))
  }
  if (url.pathname.startsWith('/__stub/og/')) {
    const slug = url.pathname.slice('/__stub/og/'.length).replace(/\.svg$/, '')
    res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' })
    return res.end(ogSvg(slug))
  }
  // Buffer the request body so the upstream call can be retried while the app
  // server is (re)starting, instead of surfacing a 502 to the browser.
  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => forward(req, res, Buffer.concat(chunks), Date.now()))
})

function forward(req, res, body, startedAt) {
  const upstream = http.request({
    host: '127.0.0.1', port: APP_PORT, method: req.method, path: req.url,
    headers: { ...req.headers, host: req.headers.host || `localhost:${PORT}` },
  }, (up) => {
    res.writeHead(up.statusCode || 502, up.headers)
    up.pipe(res)
  })
  upstream.on('error', (err) => {
    const retriable = ['ECONNREFUSED', 'ECONNRESET', 'EPIPE'].includes(err.code)
    if (retriable && !res.headersSent && Date.now() - startedAt < 30_000) {
      setTimeout(() => forward(req, res, body, startedAt), 250)
      return
    }
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' })
    res.end('Oksskolten server is not reachable')
  })
  upstream.end(body)
}

// Only open the public port once the app server answers its health check, so
// "port is listening" means "UI is ready".
function waitForApp() {
  return new Promise((resolve) => {
    const attempt = () => {
      const r = http.get({ host: '127.0.0.1', port: APP_PORT, path: '/api/health', timeout: 2000 }, (res) => {
        res.resume()
        if (res.statusCode === 200) resolve()
        else setTimeout(attempt, 250)
      })
      r.on('error', () => setTimeout(attempt, 250))
      r.on('timeout', () => r.destroy())
    }
    attempt()
  })
}
waitForApp().then(() => {
  gateway.listen(PORT, '0.0.0.0', () => console.log(`[stub] gateway on :${PORT} -> app :${APP_PORT} (app healthy)`))
})

// ---------------------------------------------------------------- Anthropic API
const textOf = (content) => typeof content === 'string'
  ? content
  : (content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')

const sentences = (text) => text
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .split(/\n+/)
  .flatMap(line => /^\s*#/.test(line) ? [] : line.replace(/[>*_`|]/g, ' ').split(/(?<=[.!?])\s+/))
  .map(s => s.replace(/\s+/g, ' ').trim())
  .filter(s => s.length > 50 && s.length < 320)

const STOP = new Set('the a an and or of to in on for with is are was were be been this that it its as at by from how what why which who does do did can could should would about into than then them they there their article explain tell me you your i my please more some any anything something new whats there been lately recently up give find show list me has have'.split(' '))
const keywords = (q) => (q.toLowerCase().match(/[a-z0-9][a-z0-9.+-]{2,}/g) || []).filter(w => !STOP.has(w))

function headings(text) {
  return (text.match(/^#{2,3}\s+(.+)$/gm) || []).map(h => h.replace(/^#+\s+/, '').trim()).filter(h => h.length < 80)
}

function summarize(body) {
  const ss = sentences(body)
  if (!ss.length) return 'A short post without enough body text to summarize.'
  const lead = ss.slice(0, 2).join(' ')
  const hs = headings(body)
  const picks = []
  const step = Math.max(1, Math.floor(ss.length / 4))
  for (let i = 2; i < ss.length && picks.length < 4; i += step) picks.push(ss[i])
  const bullets = picks.map((s, i) => {
    const title = hs[i] || s.split(/[,;:—]/)[0].split(' ').slice(0, 5).join(' ')
    return `- **${title.replace(/[.:]$/, '')}** — ${s}`
  })
  return `${lead}\n\n${bullets.join('\n')}`
}

function articleAnswer(system, question) {
  const m = system.match(/<article_content>([\s\S]*?)<\/article_content>/)
  const body = m ? m[1] : ''
  const title = (system.match(/\*\*Title\*\*: (.+)/) || [])[1] || 'this article'
  const ss = sentences(body)
  const kw = keywords(question)
  const scored = ss.map((s, i) => ({ s, i, score: kw.reduce((n, k) => n + (s.toLowerCase().includes(k) ? 1 : 0), 0) }))
  let best = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 4).sort((a, b) => a.i - b.i)
  if (best.length < 2) best = scored.slice(0, 4)
  if (/summar|key point|tl;?dr|main/i.test(question)) {
    return `Here are the main points of **${title}**:\n\n${summarize(body).split('\n\n')[1] || ''}\n\nWant me to look for related articles in your feeds?`
  }
  const lines = best.map(x => `- ${x.s}`)
  return `Based on **${title}**, here's what's relevant to your question:\n\n${lines.join('\n')}\n\nIn short, the article's position is that ${best[0]?.s.charAt(0).toLowerCase()}${best[0]?.s.slice(1) || 'the change is incremental rather than revolutionary.'}\n\nShall I search for related articles on this topic?`
}

function chatPlan(body) {
  const system = Array.isArray(body.system) ? body.system.map(b => b.text).join('\n') : (body.system || '')
  const msgs = body.messages || []
  const last = msgs[msgs.length - 1]
  const lastBlocks = Array.isArray(last?.content) ? last.content : []
  const toolResult = lastBlocks.find(b => b.type === 'tool_result')
  const userMsgs = msgs.filter(m => m.role === 'user' && textOf(m.content).trim())
  const question = textOf(userMsgs[userMsgs.length - 1]?.content || '')

  if (toolResult) {
    let items = []
    try {
      const raw = typeof toolResult.content === 'string' ? toolResult.content : textOf(toolResult.content)
      items = JSON.parse(raw)
    } catch { /* ignore */ }
    if (!Array.isArray(items) || !items.length) {
      return { text: `I couldn't find anything in your feeds matching that. Try a broader keyword, or ask me what's new this week.` }
    }
    const top = items.slice(0, 5)
    const lines = top.map(a => {
      const sum = (a.summary || '').split('\n')[0].slice(0, 160)
      return `- [${a.title}](${a.url}) — *${a.feed_name}*${sum ? `\n  ${sum}${sum.length >= 160 ? '…' : ''}` : ''}`
    })
    const unread = top.filter(a => !a.seen_at).length
    return { text: `Here's what I found in your feeds:\n\n${lines.join('\n')}\n\n${unread ? `${unread} of these are still unread. ` : ''}Want me to summarize any of them?` }
  }

  if (system.includes('<article_content>')) return { text: articleAnswer(system, question) }

  const kw = keywords(question).filter(w => !['article', 'articles', 'recommend', 'week', 'today', 'recent', 'feeds', 'unread', 'read', 'should', 'worth', 'latest', 'news', 'interesting'].includes(w))
  const input = { limit: 8 }
  if (kw.length) input.query = kw.slice(0, 3).join(' ')
  else input.sort = 'score'
  if (/unread/i.test(question)) input.unread = true
  if (/week/i.test(question)) input.since = new Date(Date.now() - 7 * 86400e3).toISOString()
  return { tool: { name: 'search_articles', input } }
}

function respondMessage(body) {
  const sys = Array.isArray(body.system) ? body.system.map(b => b.text).join('\n') : (body.system || '')
  const first = textOf(body.messages?.[0]?.content || '')
  if (sys.includes('short title')) {
    const user = (first.match(/User: ([\s\S]*?)\n\nAI:/) || [])[1] || first
    const words = user.replace(/[?!.]/g, '').split(/\s+/).filter(w => w && !STOP.has(w.toLowerCase())).slice(0, 4)
    return { text: words.map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Feed chat' }
  }
  if (first.startsWith('Summarize the following article')) {
    return { text: summarize(first.split('--- Article body ---')[1] || '') }
  }
  if (first.startsWith('Translate the following article')) {
    return { text: (first.split('--- Article body ---')[1] || '').trim() }
  }
  if (body.tools?.length) return chatPlan(body)
  return { text: 'Done.' }
}

function sse(res, event, data) { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) }
const sleep = ms => new Promise(r => setTimeout(r, ms))

http.createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/v1/messages')) {
    res.writeHead(404, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ type: 'error', error: { type: 'not_found_error', message: 'Not found' } }))
  }
  let raw = ''
  for await (const c of req) raw += c
  const body = JSON.parse(raw || '{}')
  const plan = respondMessage(body)
  const id = `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  const inputTokens = Math.ceil(raw.length / 4)
  const outText = plan.text || ''
  const outputTokens = Math.max(1, Math.ceil(outText.length / 4) + (plan.tool ? 40 : 0))
  const content = plan.tool
    ? [{ type: 'tool_use', id: `toolu_${id.slice(4)}`, name: plan.tool.name, input: plan.tool.input }]
    : [{ type: 'text', text: outText }]
  const stopReason = plan.tool ? 'tool_use' : 'end_turn'

  if (!body.stream) {
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content, stop_reason: stopReason, stop_sequence: null, usage: { input_tokens: inputTokens, output_tokens: outputTokens } }))
  }

  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' })
  sse(res, 'message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: inputTokens, output_tokens: 1 } } })
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (block.type === 'text') {
      sse(res, 'content_block_start', { type: 'content_block_start', index: i, content_block: { type: 'text', text: '' } })
      const chunks = block.text.match(/[\s\S]{1,24}/g) || ['']
      for (const chunk of chunks) {
        sse(res, 'content_block_delta', { type: 'content_block_delta', index: i, delta: { type: 'text_delta', text: chunk } })
        await sleep(12)
      }
    } else {
      sse(res, 'content_block_start', { type: 'content_block_start', index: i, content_block: { type: 'tool_use', id: block.id, name: block.name, input: {} } })
      sse(res, 'content_block_delta', { type: 'content_block_delta', index: i, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } })
    }
    sse(res, 'content_block_stop', { type: 'content_block_stop', index: i })
  }
  sse(res, 'message_delta', { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: outputTokens } })
  sse(res, 'message_stop', { type: 'message_stop' })
  res.end()
}).listen(ANTHROPIC_PORT, '127.0.0.1', () => console.log(`[stub] Anthropic API on :${ANTHROPIC_PORT}`))
