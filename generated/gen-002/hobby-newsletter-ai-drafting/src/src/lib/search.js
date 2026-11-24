import { DOCS } from '../data/sources.js'
import { paragraphs, isHeading, sentenceAt } from './text.js'

// Plain-text search across every readable page. Scanned pages have no text layer, so they can't match.
export function searchSources(query) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return { hits: [], unsearchable: [] }
  const hits = []
  const unsearchable = []
  for (const doc of DOCS) {
    for (const page of doc.pages) {
      if (page.unreadable) {
        unsearchable.push({ doc: doc.id, page: page.n })
        continue
      }
      for (const para of paragraphs(page.text)) {
        if (isHeading(para) && !para.toLowerCase().includes(q)) continue
        const i = para.toLowerCase().indexOf(q)
        if (i === -1) continue
        hits.push({
          doc: doc.id,
          page: page.n,
          snippet: sentenceAt(para, i),
          term: para.slice(i, i + q.length),
        })
      }
    }
  }
  return { hits, unsearchable }
}
