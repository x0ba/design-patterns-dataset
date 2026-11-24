import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileSpreadsheet, KeyRound, MessageSquare, Printer, Redo2, Undo2, Wand2, ChevronDown } from 'lucide-react'
import { Canvas, cx } from './components/Canvas'
import { ChecklistTab } from './components/Checklist'
import { CommentsTab } from './components/Comments'
import { HistoryTab } from './components/History'
import { EdgeInspector, ElementInspector, EmptyDetails } from './components/Inspector'
import { Avatar } from './components/ui'
import { Ctx, useApp as useApp2 } from './components/ctx'
import type { AppCtx, Tab } from './components/ctx'
import { useDocStore, uid, clip } from './lib/store'
import { LANES, LANE_META, PEOPLE, ME, STAGE_META } from './lib/types'
import type { Lane, Selection, Stage } from './lib/types'
import { applyOrders, computeLayout, countCrossings, groupOf, placeElement, stageIndex, tidyOrders } from './lib/layout'
import { computeStats, csvCell } from './lib/graph'
import { relTime } from './lib/time'

export default function App() {
  const { doc, apply, undo, redo, canUndo, canRedo } = useDocStore()
  const [selection, setSelection] = useState<Selection>(null)
  const [tab, setTab] = useState<Tab>('check')
  const [filter, setFilter] = useState<Lane | 'all'>('all')
  const [toastState, setToastState] = useState<{ id: number; text: string; undo: boolean } | null>(null)
  const [focusText, setFocusText] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const layout = useMemo(() => computeLayout(doc.elements), [doc.elements])
  const crossings = useMemo(() => countCrossings(layout, doc.edges), [layout, doc.edges])
  const stats = useMemo(() => computeStats(doc), [doc])

  // drop a selection whose target no longer exists (delete, undo)
  const sel: Selection = useMemo(() => {
    if (!selection) return null
    const exists = selection.kind === 'element' ? doc.elements.some((e) => e.id === selection.id) : doc.edges.some((e) => e.id === selection.id)
    return exists ? selection : null
  }, [selection, doc])

  const toastTimer = useRef<number | undefined>(undefined)
  const toast = useCallback((text: string, undoable = false) => {
    window.clearTimeout(toastTimer.current)
    setToastState({ id: Date.now(), text, undo: undoable })
    toastTimer.current = window.setTimeout(() => setToastState(null), 6500)
  }, [])

  const select = useCallback((s: Selection, t?: Tab | null) => {
    setSelection(s)
    const next = t === undefined ? (s ? 'details' : null) : t
    if (next) setTab(next)
    if (s?.kind === 'element') {
      requestAnimationFrame(() => document.querySelector(`[data-node="${s.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }))
    }
  }, [])

  const name = (id: string) => clip(doc.elements.find((e) => e.id === id)?.text ?? '', 32)

  const toggleEdge = useCallback(
    (from: string, to: string, on: boolean) => {
      const id = `${from}>${to}`
      const exists = doc.edges.some((e) => e.id === id)
      if (on && !exists) {
        apply(`Connected “${name(from)}” to “${name(to)}”`, (d) => void d.edges.push({ id, from, to, notes: [] }))
      } else if (!on && exists) {
        apply(`Removed the link from “${name(from)}” to “${name(to)}”`, (d) => void (d.edges = d.edges.filter((e) => e.id !== id)))
        toast('Connection removed', true)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, apply, toast],
  )

  const removeEdge = useCallback(
    (id: string) => {
      const e = doc.edges.find((x) => x.id === id)
      if (!e) return
      toggleEdge(e.from, e.to, false)
      setSelection((s) => (s?.kind === 'edge' && s.id === id ? null : s))
    },
    [doc.edges, toggleEdge],
  )

  const removeElement = useCallback(
    (id: string) => {
      const e = doc.elements.find((x) => x.id === id)
      if (!e) return
      apply(`Deleted “${clip(e.text, 40)}”`, (d) => {
        d.elements = d.elements.filter((x) => x.id !== id)
        d.edges = d.edges.filter((x) => x.from !== id && x.to !== id)
      })
      setSelection(null)
      toast(`Deleted “${clip(e.text, 34)}”`, true)
    },
    [doc.elements, apply, toast],
  )

  const tidy = useCallback(() => {
    const orders = tidyOrders(doc.elements, doc.edges)
    const next = applyOrders(doc.elements, orders)
    const after = countCrossings(computeLayout(next), doc.edges)
    const changed = next.some((e, i) => e.order !== doc.elements[i].order)
    if (!changed) {
      toast(crossings === 0 ? 'No lines cross.' : `Already as tidy as these rows allow (${crossings} crossing${crossings === 1 ? '' : 's'}). Moving an element to a different program row can untangle more.`)
      return
    }
    apply('Auto-arranged elements to reduce line crossings', (d) => void (d.elements = applyOrders(d.elements, orders)))
    toast(after < crossings ? `Line crossings: ${crossings} → ${after}` : 'Straightened the lines. Crossings unchanged.', true)
  }, [doc.elements, doc.edges, crossings, apply, toast])

  const addElement = (stage: Stage) => {
    const base = sel?.kind === 'element' ? doc.elements.find((e) => e.id === sel.id)?.lane : undefined
    const lane: Lane = filter !== 'all' ? filter : (base ?? 'shared')
    const id = uid('x')
    apply(`Added a new ${STAGE_META[stage].singular}`, (d) => {
      d.elements.push({
        id,
        stage,
        lane,
        order: groupOf(d.elements, stage, lane).length,
        text: `New ${STAGE_META[stage].singular}`,
        term: stage === 'outcome' ? 'short' : undefined,
        indicators: [],
        evidenceIds: [],
      })
    })
    setSelection({ kind: 'element', id })
    setTab('details')
    setFocusText(id)
    requestAnimationFrame(() => document.querySelector(`[data-node="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  const onConnect = (from: string, to: string) => {
    const a = doc.elements.find((e) => e.id === from)
    const b = doc.elements.find((e) => e.id === to)
    if (!a || !b || stageIndex(b.stage) !== stageIndex(a.stage) + 1) return
    if (doc.edges.some((e) => e.id === `${from}>${to}`)) {
      toast('Those two are already connected.')
      return
    }
    toggleEdge(from, to, true)
    setSelection({ kind: 'edge', id: `${from}>${to}` })
    setTab('details')
  }

  const onMove = (id: string, lane: Lane, index: number) => {
    const el = doc.elements.find((e) => e.id === id)!
    const before = groupOf(doc.elements, el.stage, el.lane).findIndex((e) => e.id === id)
    if (el.lane === lane && before === index) return
    // dropping below its own slot shifts the index by one once it leaves
    apply(el.lane !== lane ? `Moved “${clip(el.text, 36)}” to ${LANE_META[lane].name}` : null, (d) => void (d.elements = placeElement(d.elements, id, lane, index)))
  }

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault()
        redo()
      } else if (!typing && !mod && (e.key === 'Delete' || e.key === 'Backspace') && sel) {
        e.preventDefault()
        if (sel.kind === 'element') removeElement(sel.id)
        else removeEdge(sel.id)
      } else if (e.key === 'Escape' && !typing) {
        setSelection(null)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [sel, undo, redo, removeElement, removeEdge])

  const ctx: AppCtx = {
    doc,
    apply,
    selection: sel,
    select,
    setTab,
    toast,
    focusText,
    clearFocusText: useCallback(() => setFocusText(null), []),
    toggleEdge,
    removeElement,
    removeEdge,
    tidy,
    crossings,
  }

  const selEl = sel?.kind === 'element' ? doc.elements.find((e) => e.id === sel.id) : undefined
  const selEdge = sel?.kind === 'edge' ? doc.edges.find((e) => e.id === sel.id) : undefined
  const mustFix = [stats.longtermNoIndicator.length, stats.notMeasurable.length, stats.inherited.length, stats.open].filter((n) => n > 0).length

  const last = doc.log[0]
  const lastLine = `Edited ${relTime(last.ts)} by ${last.author === ME ? 'you' : PEOPLE[last.author].name}`

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        <TopBar title={doc.title} lastLine={lastLine} />
        <div className="main">
          <div className="work">
            <Toolbar filter={filter} setFilter={setFilter} crossings={crossings} tidy={tidy} undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} />
            <Canvas doc={doc} layout={layout} selection={sel} filter={filter} onSelect={(s) => select(s)} onMove={onMove} onConnect={onConnect} onAdd={addElement} onEdit={(id) => { select({ kind: 'element', id }); setFocusText(id) }} />
          </div>
          <aside className="rail" aria-label="Details panel">
            <nav className="tabs" role="tablist">
              {(
                [
                  ['check', 'Checklist', mustFix > 0 ? mustFix : 0],
                  ['details', 'Details', 0],
                  ['comments', 'Comments', stats.open],
                  ['history', 'History', 0],
                ] as [Tab, string, number][]
              ).map(([id, label, n]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={cx('tab', tab === id && 'on')} onClick={() => setTab(id)}>
                  {label}
                  {n > 0 && <span className="badge">{n}</span>}
                </button>
              ))}
            </nav>
            <div className="rail-body">
              {tab === 'check' && <ChecklistTab />}
              {tab === 'details' && (selEl ? <ElementInspector key={selEl.id} el={selEl} /> : selEdge ? <EdgeInspector key={selEdge.id} edge={selEdge} /> : <EmptyDetails doc={doc} />)}
              {tab === 'comments' && <CommentsTab />}
              {tab === 'history' && <HistoryTab />}
            </div>
          </aside>
        </div>
        {toastState && (
          <div className="toast" role="status" key={toastState.id}>
            <span>{toastState.text}</span>
            {toastState.undo && (
              <button
                onClick={() => {
                  undo()
                  setToastState(null)
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}

/* ---------------- top bar ---------------- */

function TopBar({ title, lastLine }: { title: string; lastLine: string }) {
  const { doc, setTab } = useApp2()
  const [menu, setMenu] = useState(false)
  const open = doc.comments.filter((c) => !c.resolved).length

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [menu])

  const exportCsv = () => {
    const rows = [['Stage', 'Time frame', 'Program', 'Statement', 'Feeds into', 'Indicators (target; source)', 'Evidence', 'Open comments']]
    for (const stage of ['input', 'activity', 'output', 'outcome', 'longterm'] as Stage[]) {
      for (const lane of LANES) {
        for (const e of groupOf(doc.elements, stage, lane)) {
          rows.push([
            STAGE_META[stage].title,
            e.term === 'short' ? 'Short-term' : e.term === 'mid' ? 'Mid-term' : '',
            LANE_META[lane].name,
            e.text,
            doc.edges.filter((x) => x.from === e.id).map((x) => doc.elements.find((y) => y.id === x.to)?.text ?? '').join(' | '),
            e.indicators.map((i) => `${i.name} (${i.target}; ${i.source})`).join(' | '),
            e.evidenceIds.map((id) => doc.evidence.find((v) => v.id === id)?.title ?? '').join(' | '),
            String(doc.comments.filter((c) => !c.resolved && c.anchor.type === 'element' && c.anchor.id === e.id).length),
          ])
        }
      }
    }
    const blob = new Blob(['﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.replace(/[^\w\- ()]+/g, '')}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <header className="topbar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#0e5c5c" />
          <path d="M7 10h6c4 0 4 12 8 12h4M7 22h6c4 0 4-12 8-12h4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span>Throughline</span>
      </div>
      <div className="crumbs">
        <span>Page Forward</span>
        <i>/</i>
        <span>Theory of change</span>
      </div>
      <div className="doc-title">
        <h1>{title}</h1>
        <small>{lastLine}</small>
      </div>
      <span className="spacer" />
      <div className="people" aria-label="Collaborators">
        {(['ken', 'tomas', 'marisol'] as const).map((id) => (
          <span className={cx('person', id === ME && 'me')} key={id} title={id === ME ? `${PEOPLE[id].name} (you), editing now` : id === 'ken' ? `${PEOPLE[id].name}, ${PEOPLE[id].role}. Edited 2 hours ago` : `${PEOPLE[id].name}, ${PEOPLE[id].role}. Active 25 min ago`}>
            <Avatar id={id} size={28} ring />
            {id === ME && <b />}
          </span>
        ))}
      </div>
      <button className="btn ghost" onClick={() => setTab('comments')}>
        <MessageSquare size={14} /> {open} open
      </button>
      <div className="menu-wrap" onPointerDown={(e) => e.stopPropagation()}>
        <button className="btn" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <Download size={14} /> Export <ChevronDown size={13} />
        </button>
        {menu && (
          <div className="menu" role="menu">
            <button role="menuitem" onClick={() => { exportCsv(); setMenu(false) }}>
              <FileSpreadsheet size={15} />
              <span>
                <b>Spreadsheet (.csv)</b>
                <small>Every element with its indicators and evidence</small>
              </span>
            </button>
            <button role="menuitem" onClick={() => { setMenu(false); setTimeout(() => window.print(), 50) }}>
              <Printer size={15} />
              <span>
                <b>Print or save as PDF</b>
                <small>The diagram, landscape</small>
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

/* ---------------- toolbar ---------------- */

function Toolbar(p: {
  filter: Lane | 'all'
  setFilter: (l: Lane | 'all') => void
  crossings: number
  tidy: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}) {
  const [key, setKey] = useState(false)
  return (
    <div className="toolbar">
      <div className="tool-group">
        <span className="tool-label">Show</span>
        <div className="seg" role="group" aria-label="Highlight a program">
          <button className={cx(p.filter === 'all' && 'on')} onClick={() => p.setFilter('all')}>
            All
          </button>
          {LANES.map((l) => (
            <button key={l} className={cx(p.filter === l && 'on')} style={{ ['--lane' as string]: LANE_META[l].color }} onClick={() => p.setFilter(p.filter === l ? 'all' : l)}>
              <i /> {LANE_META[l].short}
            </button>
          ))}
        </div>
      </div>
      <div className="tool-group">
        <span className={cx('crossings', p.crossings <= 4 ? 'good' : p.crossings <= 9 ? 'mid' : 'high')} title="Pairs of lines that cross between columns">
          <b>{p.crossings}</b> line crossings
        </span>
        <button className="btn" onClick={p.tidy} title="Reorder rows within each program to cut crossings">
          <Wand2 size={14} /> Auto-arrange
        </button>
      </div>
      <span className="spacer" />
      <div className="tool-group">
        <button className="icon-btn" aria-label="Undo" title="Undo (⌘Z)" disabled={!p.canUndo} onClick={p.undo}>
          <Undo2 size={16} />
        </button>
        <button className="icon-btn" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!p.canRedo} onClick={p.redo}>
          <Redo2 size={16} />
        </button>
        <div className="menu-wrap">
          <button className="btn ghost" aria-expanded={key} onClick={() => setKey((k) => !k)}>
            <KeyRound size={14} /> Key
          </button>
          {key && (
            <div className="menu key" onPointerLeave={() => setKey(false)}>
              <div><svg width="34" height="10"><path d="M0 5h34" stroke="#2b6aa1" strokeWidth="2" /></svg> Connection, colored by program</div>
              <div><svg width="34" height="10"><path d="M0 5h34" stroke="#b7791f" strokeWidth="2" strokeDasharray="5 4" /></svg> Weak evidence</div>
              <div><svg width="34" height="10"><path d="M0 5h34" stroke="#1d6fb8" strokeWidth="2" strokeDasharray="2 4" /></svg> Copied by a split, needs review</div>
              <div><span className="mark a">A</span> Assumption on a link</div>
              <div><span className="mark e">E</span> External factor on a link</div>
              <div><span className="pill ok"><i /></span> Indicators · <span className="pill muted"><i /></span> evidence sources</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
