import { useMemo } from 'react'
import { recById } from '../data/recordings'
import { personById } from '../data/people'
import { Avatar } from '../components/bits'
import { Icon } from '../components/Icon'
import { clock } from '../lib/format'
import { go } from '../lib/router'
import { highlightParts, search } from '../lib/search'
import { seek } from '../lib/player'

const SUGGEST = ['cytometer', 'authorship', 'priority', 'CRediT', 'station ID', 'embargo', 'dry shipper']

export function Search({ q }: { q: string }) {
  const hits = useMemo(() => search(q), [q])
  const shown = hits.slice(0, 40)
  return (
    <div className="page search-page">
      <div className="page-head">
        <div className="eyebrow">Search</div>
        <h1>{q.trim().length < 2 ? 'Search every transcript' : `${hits.length} ${hits.length === 1 ? 'match' : 'matches'} for “${q}”`}</h1>
        {q.trim().length < 2 && <p className="lede">Searches what people said in all six recordings, plus chapter titles. Click a result to jump there.</p>}
      </div>
      {q.trim().length < 2 ? (
        <div className="suggest">
          {SUGGEST.map((s) => (
            <button key={s} className="chip" onClick={() => go(`/search?q=${encodeURIComponent(s)}`, true)}>{s}</button>
          ))}
        </div>
      ) : hits.length === 0 ? (
        <p className="muted">No transcript or chapter contains all of those words. Try fewer terms.</p>
      ) : (
        <ul className="hits">
          {shown.map((h, i) => {
            const r = recById(h.rec)
            const idx = Math.max(0, h.text.toLowerCase().indexOf(q.trim().split(/\s+/)[0].toLowerCase()))
            const from = Math.max(0, idx - 90)
            const text = (from > 0 ? '…' : '') + h.text.slice(from, from + 260) + (from + 260 < h.text.length ? '…' : '')
            return (
              <li key={i} className="hit">
                <div className="hit-meta">
                  <span className="hit-rec">{r.short}</span>
                  <span className="tnum">{clock(h.t)}</span>
                  {h.who ? (
                    <span className="mention-who"><Avatar id={h.who} size={18} /> {personById(h.who).name}</span>
                  ) : (
                    <span className="tag">Chapter</span>
                  )}
                  <span className="hit-ch">in “{h.chapter}”</span>
                </div>
                <p>
                  {highlightParts(text, q.trim()).map((p, j) => (p.hit ? <mark key={j}>{p.s}</mark> : <span key={j}>{p.s}</span>))}
                </p>
                <div className="hit-actions">
                  <button className="btn soft sm" onClick={() => { seek(h.rec, Math.max(0, h.t - 1), { play: true }) }}>
                    <Icon name="play" size={12} /> Play from here
                  </button>
                  <button className="link" onClick={() => go(`/rec/${h.rec}?at=${h.t}`)}>Open in transcript</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
