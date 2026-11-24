import { RECORDINGS } from '../data/recordings'
import { chapterAt } from './derived'

export interface Hit {
  rec: string
  t: number
  who: string | null
  text: string
  chapter: string
  kind: 'turn' | 'chapter'
  score: number
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const search = (q: string): Hit[] => {
  const terms = norm(q).split(/\s+/).filter((t) => t.length > 0)
  if (!terms.length || norm(q).trim().length < 2) return []
  const hits: Hit[] = []
  for (const r of RECORDINGS) {
    for (const c of r.chapters) {
      const hay = norm(c.title + ' ' + c.note)
      if (terms.every((t) => hay.includes(t))) {
        hits.push({ rec: r.id, t: c.start, who: null, text: c.note, chapter: c.title, kind: 'chapter', score: 3 })
      }
    }
    for (const turn of r.turns) {
      const hay = norm(turn.text)
      if (terms.every((t) => hay.includes(t))) {
        const count = terms.reduce((n, t) => n + hay.split(t).length - 1, 0)
        hits.push({ rec: r.id, t: turn.t, who: turn.who, text: turn.text, chapter: chapterAt(r, turn.t).title, kind: 'turn', score: count + (turn.decision ? 1 : 0) })
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score || a.rec.localeCompare(b.rec) || a.t - b.t)
}

export const highlightParts = (text: string, q: string): { s: string; hit: boolean }[] => {
  const terms = q.split(/\s+/).filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!terms.length) return [{ s: text, hit: false }]
  const re = new RegExp(`(${terms.join('|')})`, 'gi')
  return text.split(re).filter(Boolean).map((s, i) => ({ s, hit: i % 2 === 1 }))
}
