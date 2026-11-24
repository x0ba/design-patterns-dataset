import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Header, RequestStrip } from './components/Header.jsx'
import NeedsRail from './components/NeedsRail.jsx'
import Workspace from './components/Workspace.jsx'
import Detail from './components/Detail.jsx'
import Compare from './components/Compare.jsx'
import { ShortlistPanel, SendDialog } from './components/Shortlist.jsx'
import Icon from './components/Icons.jsx'
import { BY_ID, findByName } from './data/gen.js'
import { runNeed, similarTo, applyFilters, DEFAULT_FILTERS } from './data/search.js'

const mk = (id, title, ask, text) => ({ id, title, ask, text, q: text, mode: 'words', refId: null, off: [], filters: DEFAULT_FILTERS(), sort: 'fit', view: 'list' })
const INITIAL = [
  { ...mk('courthouse', 'Courthouse interior', 'A 1970s-style small-town courthouse interior with a balcony gallery', 'Seventies courthouse interior, wood-paneled courtroom with a balcony gallery'), refId: findByName('Fenner County Courthouse').id },
  mk('street', 'Main street, two-night closure', 'A main street that can be closed for two nights', 'Small-town main street the city will let us close for two nights'),
  mk('yard', 'Disused rail yard', 'A disused rail yard', 'Disused rail yard with sidings and old freight cars'),
]

const baseCache = new Map()
function baseFor(n) {
  const key = n.mode === 'similar' ? 's:' + n.refId : 'w:' + n.q + '|' + n.off.join(',')
  if (!baseCache.has(key)) {
    baseCache.set(key, n.mode === 'similar' ? { criteria: [], results: n.refId ? similarTo(BY_ID[n.refId]) : [] } : runNeed(n.q, n.off))
    if (baseCache.size > 40) baseCache.delete(baseCache.keys().next().value)
  }
  return baseCache.get(key)
}

export default function App() {
  const [needs, setNeeds] = useState(INITIAL)
  const [activeId, setActiveId] = useState('courthouse')
  const [shortlist, setShortlist] = useState({})
  const [compare, setCompare] = useState([])
  const [detailId, setDetailId] = useState(null)
  const [showCompare, setShowCompare] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [sent, setSent] = useState(null)
  const [notes, setNotes] = useState({})
  const [toast, setToast] = useState(null)
  const tRef = useRef()

  const say = useCallback((msg) => {
    setToast(msg)
    clearTimeout(tRef.current)
    tRef.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const computed = useMemo(() => {
    const out = {}
    for (const n of needs) {
      const b = baseFor(n)
      const { shown, hidden } = applyFilters(b.results, n.filters, n.sort)
      out[n.id] = { criteria: b.criteria, shown, hidden, total: b.results.length }
    }
    return out
  }, [needs])

  const patch = useCallback((id, p) => setNeeds((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n))), [])
  const active = needs.find((n) => n.id === activeId)

  const toggleShortlist = useCallback((needId, locId) => {
    setShortlist((s) => {
      const cur = s[needId] || []
      const has = cur.some((x) => x.id === locId)
      return { ...s, [needId]: has ? cur.filter((x) => x.id !== locId) : [...cur, { id: locId, note: '' }] }
    })
    const n = needs.find((x) => x.id === needId)
    const has = (shortlist[needId] || []).some((x) => x.id === locId)
    say(has ? `Removed ${BY_ID[locId].name} from ${n.title}` : `Shortlisted ${BY_ID[locId].name} for ${n.title}`)
  }, [needs, shortlist, say])

  const handlers = {
    open: (id) => setDetailId(id),
    toggleShortlist,
    toggleCompare: (id) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 4 ? c : [...c, id])),
    clearCompare: () => setCompare([]),
    openCompare: () => setShowCompare(true),
    similar: (id) => {
      patch(activeId, { mode: 'similar', refId: id, sort: 'fit', view: 'list' })
      setDetailId(null); setShowCompare(false)
      say(`Showing properties like ${BY_ID[id].name}`)
    },
  }

  useEffect(() => {
    const el = document.querySelector('.work')
    if (el) el.scrollTop = 0
  }, [activeId])

  const slIds = new Set((shortlist[activeId] || []).map((x) => x.id))
  const detail = detailId ? BY_ID[detailId] : null
  const idx = needs.findIndex((n) => n.id === activeId)

  return (
    <div className="app">
      <Header onOpen={setDetailId} />
      <RequestStrip />
      <div className="body">
        <NeedsRail needs={needs} computed={computed} activeId={activeId} onSelect={setActiveId} shortlist={shortlist} />
        <Workspace
          key={activeId}
          need={active} c={computed[activeId]} onPatch={(p) => patch(activeId, p)}
          ui={{ index: idx, shortlist, compare }} handlers={handlers}
        />
        <ShortlistPanel
          needs={needs} shortlist={shortlist} activeId={activeId} sent={sent}
          onSelect={setActiveId} onOpen={setDetailId}
          onRemove={(n, id) => toggleShortlist(n, id)}
          onNote={(n, id, note) => setShortlist((s) => ({ ...s, [n]: s[n].map((x) => (x.id === id ? { ...x, note } : x)) }))}
          onCompareNeed={(n) => { setCompare((shortlist[n] || []).slice(0, 4).map((x) => x.id)); setShowCompare(true) }}
          onReview={() => setShowSend(true)}
        />
      </div>
      {detail && (
        <Detail
          loc={detail} needTitle={active.title} onClose={() => setDetailId(null)}
          inShortlist={slIds.has(detail.id)} inCompare={compare.includes(detail.id)}
          onShortlist={() => toggleShortlist(activeId, detail.id)} onCompare={() => handlers.toggleCompare(detail.id)} onSimilar={() => handlers.similar(detail.id)}
          note={notes[detail.id]} setNote={(v) => setNotes((n) => ({ ...n, [detail.id]: v }))}
        />
      )}
      {showCompare && compare.length > 0 && (
        <Compare
          locs={compare.map((id) => BY_ID[id])} shortlistedIds={slIds} needTitle={active.title}
          onClose={() => setShowCompare(false)} onOpen={(id) => { setShowCompare(false); setDetailId(id) }}
          onRemove={(id) => { const next = compare.filter((x) => x !== id); setCompare(next); if (next.length < 2) setShowCompare(false) }}
          onShortlist={(id) => toggleShortlist(activeId, id)}
        />
      )}
      {showSend && <SendDialog needs={needs} shortlist={shortlist} sent={sent} onClose={() => setShowSend(false)} onSend={setSent} />}
      {toast && <div className="toast" role="status"><Icon n="check" size={14} />{toast}</div>}
    </div>
  )
}
