// Quick sanity checks on the mock data (run: npx tsx or via vite-node). Kept dependency-free: bundle with esbuild from vite.
import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const { RECORDINGS, ACTIONS } = await vite.ssrLoadModule('/src/data/recordings.ts')
await vite.close()
let bad = 0
const fail = (m) => { console.log('FAIL', m); bad++ }
const re = /\b(Adaeze|Okonkwo)\b/g
let mentions = 0, recsWith = new Set()
let words = {}
for (const r of RECORDINGS) {
  let w = 0
  r.turns.forEach((t, i) => {
    w += t.text.split(/\s+/).length
    const m = t.text.match(re)
    if (m) { mentions += m.length; recsWith.add(r.id); console.log('mention', r.id, t.t, m.length) }
    if (i && t.t <= r.turns[i-1].t) fail(`${r.id} turn order at ${t.t}`)
    if (t.t >= r.duration) fail(`${r.id} turn beyond duration ${t.t}`)
  })
  words[r.id] = w
  r.chapters.forEach((c, i) => {
    if (c.end <= c.start) fail(`${r.id} chapter ${c.title}`)
    if (!r.turns.some((t) => t.t >= c.start && t.t < c.end)) fail(`${r.id} chapter without turns: ${c.title}`)
  })
}
console.log('mentions', mentions, 'recordings', [...recsWith], 'words', words)
if (mentions !== 6) fail('expected 6 mentions')
if (recsWith.size !== 3) fail('expected 3 recordings with mentions')
const people = new Set(RECORDINGS.flatMap((r) => r.turns.map((t) => t.who)))
console.log('speakers', people.size)
if (people.size !== 11) fail('expected 11 speakers')
if (ACTIONS.length !== 9 || ACTIONS.filter((a) => a.owner === 'me').length !== 2) fail('actions')
for (const a of ACTIONS) {
  const r = RECORDINGS.find((x) => x.id === a.rec)
  if (!r.turns.some((t) => t.t === a.at)) fail(`action ${a.id} no turn at ${a.at}`)
}
console.log(bad ? `${bad} problems` : 'data OK')
process.exit(bad ? 1 : 0)
