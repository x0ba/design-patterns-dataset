import { useEffect, useMemo, useRef, useState } from 'react'
import { db, LAYERS, layerOf, idxOf, labelOf, fmtFreq, H_NONE, HUMAN_NAMES } from '../data/db'
import { useApp, type SortKey } from '../store'
import { Star, ScoreBar, HUMAN_COLORS, LAYER_COLORS, Icon } from '../ui'

const ROW = 30

const val = (k: SortKey, g: number): number | string => {
  switch (k) {
    case 'feature': return g
    case 'label': return labelOf(g)
    case 'freq': return db.freq[g]
    case 'score': return db.alive[g] ? db.score[g] : -1
    case 'ci': return db.alive[g] ? db.hi[g] - db.lo[g] : -1
    case 'human': return db.human[g]
  }
}

export function sortIds(ids: Uint32Array, key: SortKey, dir: 1 | -1) {
  const out = Uint32Array.from(ids)
  if (key === 'label') out.sort((a, b) => dir * labelOf(a).localeCompare(labelOf(b)) || a - b)
  else out.sort((a, b) => dir * ((val(key, a) as number) - (val(key, b) as number)) || a - b)
  return out
}

export function exportCsv(ids: ArrayLike<number>, name: string) {
  const rows = ['layer,index,label,frequency,mean_act,max_act,score,ci_lo,ci_hi,human_label,l12_code_cluster']
  for (let k = 0; k < ids.length; k++) {
    const g = ids[k]
    rows.push([LAYERS[layerOf(g)], idxOf(g), `"${labelOf(g).replace(/"/g, '""')}"`, db.freq[g], db.meanAct[g].toFixed(3), db.maxAct[g].toFixed(3),
      db.alive[g] ? db.score[g].toFixed(3) : '', db.alive[g] ? db.lo[g].toFixed(3) : '', db.alive[g] ? db.hi[g].toFixed(3) : '', HUMAN_NAMES[db.human[g]], db.cluster[g]].join(','))
  }
  const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

export function FeatureTable({ ids, title, sub, head }: { ids: Uint32Array; title: string; sub?: string; head?: React.ReactNode }) {
  const { view, setView, selected, select, ws, toggleBookmark } = useApp()
  const sorted = useMemo(() => sortIds(ids, view.sort.key, view.sort.dir), [ids, view.sort])
  const box = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0)
  const [hgt, setHgt] = useState(260)

  useEffect(() => {
    const el = box.current!
    const ro = new ResizeObserver(() => setHgt(el.clientHeight))
    ro.observe(el); setHgt(el.clientHeight)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { if (box.current) { box.current.scrollTop = 0; setTop(0) } }, [ids, view.sort])

  // keep selected row visible when it changes (e.g. j/k)
  const selIdx = useMemo(() => sorted.indexOf(selected), [sorted, selected])
  useEffect(() => {
    const el = box.current
    if (!el || selIdx < 0) return
    const y = selIdx * ROW
    if (y < el.scrollTop) el.scrollTop = y
    else if (y + ROW > el.scrollTop + el.clientHeight) el.scrollTop = y + ROW - el.clientHeight
  }, [selIdx])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if (e.key === 'j' || e.key === 'k' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!sorted.length) return
        e.preventDefault()
        const d = e.key === 'j' || e.key === 'ArrowDown' ? 1 : -1
        const i = Math.min(sorted.length - 1, Math.max(0, (selIdx < 0 ? (d > 0 ? -1 : sorted.length) : selIdx) + d))
        select(sorted[i])
      } else if (e.key === 'b') toggleBookmark(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sorted, selIdx, select, toggleBookmark, selected])

  const start = Math.max(0, Math.floor(top / ROW) - 4)
  const end = Math.min(sorted.length, Math.ceil((top + hgt) / ROW) + 4)
  const rows = []
  for (let i = start; i < end; i++) {
    const g = sorted[i]
    const bm = ws.bookmarks[g]
    const alive = db.alive[g]
    rows.push(
      <div key={g} className={`tr ${g === selected ? 'sel' : ''}`} style={{ top: i * ROW, height: ROW }} onClick={() => select(g)} role="row" aria-selected={g === selected}>
        <button className="c-star" onClick={(e) => { e.stopPropagation(); toggleBookmark(g) }} aria-label={bm ? 'Remove bookmark' : 'Bookmark'}><Star on={!!bm} size={14} /></button>
        <span className="c-feat mono"><i style={{ background: LAYER_COLORS[layerOf(g)] }} />L{LAYERS[layerOf(g)]} <em>#{idxOf(g)}</em></span>
        <span className="c-label" title={alive ? labelOf(g) : ''}>{alive ? labelOf(g) : <span className="muted">dead feature</span>}{db.cluster[g] ? <span className="pill cl sm">code</span> : null}</span>
        <span className="c-num mono">{alive ? fmtFreq(db.freq[g]) : '—'}</span>
        <span className="c-score">{alive ? <><span className="mono">{db.score[g].toFixed(2)}</span><ScoreBar s={db.score[g]} lo={db.lo[g]} hi={db.hi[g]} w={54} /></> : <span className="muted">—</span>}</span>
        <span className="c-num mono">{alive ? (db.hi[g] - db.lo[g]).toFixed(2) : '—'}</span>
        <span className="c-human">{db.human[g] !== H_NONE ? <><i style={{ background: HUMAN_COLORS[db.human[g]] }} />{['', 'Interp.', 'Partial', 'Not'][db.human[g]]}</> : <span className="muted">—</span>}</span>
      </div>,
    )
  }

  const th = (k: SortKey, label: string, cls: string) => (
    <button className={`th ${cls} ${view.sort.key === k ? 'on' : ''}`} onClick={() => setView({ sort: { key: k, dir: view.sort.key === k ? (view.sort.dir === 1 ? -1 : 1) : k === 'label' || k === 'feature' ? 1 : -1 } })}>
      {label}{view.sort.key === k && <Icon n={view.sort.dir === 1 ? 'up' : 'down'} size={11} />}
    </button>
  )

  return (
    <section className="tablepanel">
      <div className="tp-head">
        {head ?? <div><b>{title}</b></div>}
        <div className="tp-actions">
          <span className="muted tp-count" title={title}>{ids.length.toLocaleString()} feature{ids.length === 1 ? '' : 's'}{sub ? ` · ${sub}` : ''}</span>
          {view.sel === 'brush' && <button className="btn sm" onClick={() => setView({ sel: 'all', brush: null })}>Clear</button>}
          <button className="btn sm" onClick={() => exportCsv(sorted, 'featurescope-selection.csv')} disabled={!ids.length} title="Export these rows as CSV"><Icon n="download" size={13} /> CSV</button>
        </div>
      </div>
      <div className="thead" role="row">
        <span className="c-star" />
        {th('feature', 'Feature', 'c-feat')}
        {th('label', 'Auto label', 'c-label')}
        {th('freq', 'Frequency', 'c-num')}
        {th('score', 'Score · CI', 'c-score')}
        {th('ci', 'CI width', 'c-num')}
        {th('human', 'Human', 'c-human')}
      </div>
      <div className="tbody" ref={box} onScroll={(e) => setTop((e.target as HTMLElement).scrollTop)} role="grid">
        {ids.length === 0 ? (
          <div className="empty">No features match. Loosen the filters, or choose another group above.</div>
        ) : (
          <div style={{ height: sorted.length * ROW, position: 'relative' }}>{rows}</div>
        )}
      </div>
    </section>
  )
}
