import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { BY_ID, PROJECTS, TOTALS } from './data/generate'
import type { Sheet } from './data/types'
import { CURRENT_PROJECT, MAX_COMPARE } from './data/vocab'
import { parseQuery, runSearch, EMPTY_FILTERS, type Filters, type SortKey } from './search'
import { fmt } from './util'
import { FacetRail } from './components/FacetRail'
import { Results } from './components/Results'
import { DetailPanel } from './components/DetailPanel'
import { CompareTray } from './components/CompareTray'
import { CompareView } from './components/CompareView'
import { PullDialog, type PullResult } from './components/PullDialog'
import { SheetViewer } from './components/SheetViewer'
import { ReferenceSet } from './components/ReferenceSet'

const INITIAL_QUERY = 'perforated metal screen'
const INITIAL_FILTERS: Filters = { ...EMPTY_FILTERS, types: ['Parking'], yearMin: 2014, yearMax: 2022 }

export default function App() {
  const [query, setQuery] = useState(INITIAL_QUERY)
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [sort, setSort] = useState<SortKey>('relevance')
  const [selectedId, setSelectedId] = useState<string | null>('2018-041')
  const [compare, setCompare] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [pullOpen, setPullOpen] = useState(false)
  const [pulls, setPulls] = useState<PullResult[]>([])
  const [viewer, setViewer] = useState<{ sheets: Sheet[]; index: number } | null>(null)
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const dq = useDeferredValue(query)
  const pq = useMemo(() => parseQuery(dq), [dq])
  const search = useMemo(() => runSearch(pq, filters, sort), [pq, filters, sort])
  const results = search.results

  useEffect(() => {
    if (!results.length) return
    if (!selectedId || !results.some((p) => p.id === selectedId)) setSelectedId(results[0].id)
    // only react to result changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

  const selected = selectedId ? BY_ID.get(selectedId) ?? null : null

  const showToast = useCallback((text: string, undo?: () => void) => {
    setToast({ text, undo })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  const toggleCompare = useCallback(
    (id: string) => {
      setCompare((c) => {
        if (c.includes(id)) {
          setPicked((p) => p.filter((x) => x !== id))
          return c.filter((x) => x !== id)
        }
        if (c.length >= MAX_COMPARE) {
          showToast(`Compare holds ${MAX_COMPARE} projects. Remove one first.`)
          return c
        }
        return [...c, id]
      })
    },
    [showToast],
  )

  const togglePick = useCallback((id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? [p[1], id] : [...p, id]))
  }, [])

  const openSheets = useCallback((sheets: Sheet[], index: number) => setViewer({ sheets, index }), [])

  // keyboard: / focus search, arrows move selection, C toggles compare, Esc closes overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
      if (e.key === 'Escape') {
        if (viewer) setViewer(null)
        else if (pullOpen) setPullOpen(false)
        else if (compareOpen) setCompareOpen(false)
        else if (typing) el.blur()
        return
      }
      if (viewer || pullOpen) return
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }
      if (compareOpen) return
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (!typing || el === searchRef.current)) {
        e.preventDefault()
        const i = results.findIndex((p) => p.id === selectedId)
        const n = e.key === 'ArrowDown' ? Math.min(results.length - 1, i + 1) : Math.max(0, i - 1)
        if (results[n]) setSelectedId(results[n].id)
        return
      }
      if (typing && !(el === searchRef.current && e.key === 'Enter')) return
      if (el === searchRef.current && e.key === 'Enter') {
        el.blur()
        return
      }
      if (e.key.toLowerCase() === 'c' && selectedId && !e.metaKey && !e.ctrlKey) toggleCompare(selectedId)
      if (e.key === 'Enter' && compare.length >= 2) setCompareOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [results, selectedId, viewer, pullOpen, compareOpen, toggleCompare, compare.length])

  const onPulled = (res: PullResult) => {
    setPulls((p) => [...p, res])
    setPullOpen(false)
    setCompareOpen(false)
    showToast(
      `${res.sheets.length} sheet${res.sheets.length === 1 ? '' : 's'} from ${res.projectIds.join(' + ')} copied to ${CURRENT_PROJECT.id} / ${res.folder}${res.print ? ' · 11×17 set sent to Studio plotter' : ''}`,
      () => setPulls((p) => p.filter((x) => x !== res)),
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="26" height="26">
              <rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
              {[6, 10, 14, 18].map((x) => [6, 10, 14, 18].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={x + y > 22 ? 1.6 : 0.9} fill="currentColor" />))}
            </svg>
          </span>
          <span className="brand-name">Precedent</span>
        </div>
        <div className="searchbox">
          <svg className="search-ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="15.5" y1="15.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, materials, clients, spec sections, 2018-041…"
            aria-label="Search the archive"
            spellCheck={false}
          />
          {query ? (
            <button className="search-clear" onClick={() => (setQuery(''), searchRef.current?.focus())} aria-label="Clear search">
              Clear
            </button>
          ) : (
            <kbd className="search-kbd">/</kbd>
          )}
        </div>
        <div className="topbar-right">
          <ReferenceSet pulls={pulls} onOpenSheet={openSheets} onRemove={(r) => setPulls((p) => p.filter((x) => x !== r))} />
          <div className="archive-stats" title="Archive contents">
            <b>{fmt(PROJECTS.length)}</b> projects · <b>{fmt(TOTALS.drawings)}</b> drawings · <b>{fmt(TOTALS.photos)}</b> photos · <b>{fmt(TOTALS.specDocs)}</b> specs
          </div>
        </div>
      </header>

      <main className="main">
        <FacetRail search={search} filters={filters} setFilters={setFilters} />
        <Results
          query={dq}
          pq={pq}
          search={search}
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          selectedId={selectedId}
          onSelect={setSelectedId}
          compare={compare}
          onToggleCompare={toggleCompare}
          onReset={() => {
            setQuery(INITIAL_QUERY)
            setFilters(INITIAL_FILTERS)
          }}
        />
        <DetailPanel
          project={selected}
          terms={pq.highlight}
          inCompare={selected ? compare.includes(selected.id) : false}
          compare={compare}
          onToggleCompare={toggleCompare}
          onSelect={(id) => setSelectedId(id)}
          onOpenSheets={openSheets}
          onFilterSpec={(code) => setFilters((f) => ({ ...f, specs: f.specs.includes(code) ? f.specs : [...f.specs, code] }))}
          activeSpecs={filters.specs}
          inResults={selected ? results.some((p) => p.id === selected.id) : false}
        />
      </main>

      <CompareTray compare={compare} onRemove={toggleCompare} onOpen={() => setCompareOpen(true)} onClear={() => (setCompare([]), setPicked([]))} onSelect={setSelectedId} />

      {compareOpen && (
        <CompareView
          ids={compare}
          picked={picked}
          onTogglePick={togglePick}
          onRemove={toggleCompare}
          onClose={() => setCompareOpen(false)}
          onOpenSheets={openSheets}
          onPull={() => setPullOpen(true)}
          terms={pq.highlight}
        />
      )}
      {pullOpen && <PullDialog ids={picked} onCancel={() => setPullOpen(false)} onConfirm={onPulled} onOpenSheets={openSheets} />}
      {viewer && <SheetViewer sheets={viewer.sheets} index={viewer.index} onIndex={(i) => setViewer({ ...viewer, index: i })} onClose={() => setViewer(null)} />}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.()
                setToast(null)
              }}
            >
              Undo
            </button>
          )}
          <button className="toast-x" onClick={() => setToast(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
