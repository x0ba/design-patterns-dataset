import { ITEMS, ITEM5_PLANNING_ONLY } from '../src/data/draft.js'
import { getPage } from '../src/data/sources.js'

const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
let total = 0, claims = 0, unlinked = 0, bad = 0
const check = (item, tag) => {
  for (const c of item.claims) {
    for (const s of c.sources || []) {
      const p = getPage(s.doc, s.page)
      if (!p || !p.text || !p.text.includes(s.quote)) { console.log('MISSING QUOTE', tag, c.id, s.doc, s.page, s.quote.slice(0, 60)); bad++ }
      else if (p.text.split('\n\n').every((para) => !para.includes(s.quote))) { console.log('QUOTE SPANS PARAGRAPHS', tag, c.id); bad++ }
    }
    for (const g of c.suggestions || []) for (const s of g.sources || []) {
      const p = getPage(s.doc, s.page)
      if (!p.text.includes(s.quote)) { console.log('MISSING SUGGESTION QUOTE', c.id); bad++ }
    }
  }
}
for (const it of ITEMS) {
  const w = it.claims.reduce((n, c) => n + words(c.text), 0)
  total += w; claims += it.claims.length; unlinked += it.claims.filter((c) => !c.sources.length).length
  console.log(it.id, w, w < 80 ? '' : 'TOO LONG')
  check(it, it.id)
}
check(ITEM5_PLANNING_ONLY, 'r5')
console.log('redraft5', ITEM5_PLANNING_ONLY.claims.reduce((n, c) => n + words(c.text), 0))
console.log({ total, claims, unlinked, bad, low: ITEMS.filter((i) => i.confidence === 'low').map((i) => i.id) })
