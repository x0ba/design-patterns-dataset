import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { BookOpen, MessageSquare, Plus, Split, Target, TriangleAlert } from 'lucide-react'
import { LANE_META, STAGES, STAGE_META } from '../lib/types'
import type { Doc, El, Lane, Selection, Stage } from '../lib/types'
import { COL_GAP, GUTTER, HEADER_H, NODE_GAP, NODE_W, colX, edgePath, groupOf, stageIndex } from '../lib/layout'
import type { Box, Layout } from '../lib/layout'
import { focusFor, openCommentsOn } from '../lib/graph'
import { checkMeasurable } from '../lib/measure'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

/* ---------- animated layout ---------- */

const sameLayout = (a: Layout, b: Layout) => {
  if (a === b) return true
  const ka = Object.keys(a.nodes)
  if (ka.length !== Object.keys(b.nodes).length) return false
  for (const k of ka) {
    const p = a.nodes[k]
    const q = b.nodes[k]
    if (!q || p.x !== q.x || p.y !== q.y || p.h !== q.h) return false
  }
  return a.bands.every((x, i) => x.top === b.bands[i].top && x.h === b.bands[i].h) && a.height === b.height
}

function lerpLayout(a: Layout, b: Layout, t: number): Layout {
  const nodes: Record<string, Box> = {}
  for (const id of Object.keys(b.nodes)) {
    const p = a.nodes[id]
    const q = b.nodes[id]
    nodes[id] = p ? { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, w: q.w, h: q.h } : q
  }
  return {
    nodes,
    bands: b.bands.map((q, i) => ({ ...q, top: a.bands[i].top + (q.top - a.bands[i].top) * t, h: a.bands[i].h + (q.h - a.bands[i].h) * t })),
    width: b.width,
    height: a.height + (b.height - a.height) * t,
  }
}

function useAnimatedLayout(target: Layout): Layout {
  const [shown, setShown] = useState(target)
  const ref = useRef(target)
  useEffect(() => {
    if (sameLayout(ref.current, target)) return
    const from = ref.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      ref.current = target
      setShown(target)
      return
    }
    const start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 260)
      const e = 1 - Math.pow(1 - k, 3)
      const l = k >= 1 ? target : lerpLayout(from, target, e)
      ref.current = l
      setShown(l)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return shown
}

/* ---------- component ---------- */

interface Props {
  doc: Doc
  layout: Layout
  selection: Selection
  filter: Lane | 'all'
  onSelect: (s: Selection) => void
  onMove: (id: string, lane: Lane, index: number) => void
  onConnect: (from: string, to: string) => void
  onAdd: (stage: Stage) => void
  onEdit: (id: string) => void
}

interface DragState {
  id: string
  y: number
  lane: Lane
  index: number
  indicatorY: number
}
interface ConnState {
  from: string
  side: 'right' | 'left'
  x: number
  y: number
  target: string | null
}

export function Canvas({ doc, layout: targetLayout, selection, filter, onSelect, onMove, onConnect, onAdd, onEdit }: Props) {
  const animated = useAnimatedLayout(targetLayout)
  const contentRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [conn, setConn] = useState<ConnState | null>(null)

  // While dragging, the dragged node follows the pointer and its links follow it.
  const layout = useMemo<Layout>(() => {
    if (!drag) return animated
    const b = animated.nodes[drag.id]
    if (!b) return animated
    return { ...animated, nodes: { ...animated.nodes, [drag.id]: { ...b, y: drag.y } } }
  }, [animated, drag])

  const byId = useMemo(() => new Map(doc.elements.map((e) => [e.id, e])), [doc.elements])

  const focus = useMemo(() => {
    if (selection) return focusFor(doc, selection.kind, selection.id)
    if (hover && !drag && !conn) return focusFor(doc, 'element', hover)
    return null
  }, [doc, selection, hover, drag, conn])

  const toLocal = (ev: { clientX: number; clientY: number }) => {
    const r = contentRef.current!.getBoundingClientRect()
    return { x: ev.clientX - r.left, y: ev.clientY - r.top }
  }

  /* --- reorder / move between programs --- */
  const startNodeDrag = (e: React.PointerEvent, el: El) => {
    if (e.button !== 0) return
    const box = animated.nodes[el.id]
    const p0 = toLocal(e)
    const grab = p0.y - box.y
    let moved = false
    let last: DragState | null = null

    const compute = (clientY: number): DragState => {
      const py = toLocal({ clientX: 0, clientY }).y
      const top = Math.max(HEADER_H, Math.min(animated.height - box.h, py - grab))
      const centre = top + box.h / 2
      const band = animated.bands.find((b) => centre >= b.top && centre <= b.top + b.h) ?? (centre < animated.bands[0].top ? animated.bands[0] : animated.bands[animated.bands.length - 1])
      const others = groupOf(doc.elements, el.stage, band.lane).filter((x) => x.id !== el.id)
      let index = 0
      for (const o of others) {
        const ob = animated.nodes[o.id]
        if (ob && ob.y + ob.h / 2 < centre) index++
      }
      let indicatorY: number
      if (others.length === 0) indicatorY = band.top + band.h / 2
      else if (index === 0) indicatorY = animated.nodes[others[0].id].y - NODE_GAP / 2
      else indicatorY = animated.nodes[others[index - 1].id].y + animated.nodes[others[index - 1].id].h + NODE_GAP / 2
      return { id: el.id, y: top, lane: band.lane, index, indicatorY }
    }

    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientY - e.clientY) < 5 && Math.abs(ev.clientX - e.clientX) < 5) return
      moved = true
      last = compute(ev.clientY)
      setDrag(last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (!moved) {
        onSelect({ kind: 'element', id: el.id })
      } else if (last) {
        onMove(el.id, last.lane, last.index)
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /* --- draw a connection from a port --- */
  const startConnect = (e: React.PointerEvent, el: El, side: 'right' | 'left') => {
    e.stopPropagation()
    e.preventDefault()
    const want = stageIndex(el.stage) + (side === 'right' ? 1 : -1)
    const find = (x: number, y: number): string | null => {
      for (const o of doc.elements) {
        if (stageIndex(o.stage) !== want) continue
        const b = animated.nodes[o.id]
        if (b && x >= b.x - COL_GAP / 2 && x <= b.x + b.w + COL_GAP / 2 && y >= b.y - 4 && y <= b.y + b.h + 4) return o.id
      }
      return null
    }
    let last: ConnState = { from: el.id, side, ...toLocal(e), target: null }
    setConn(last)
    const move = (ev: PointerEvent) => {
      const p = toLocal(ev)
      last = { from: el.id, side, x: p.x, y: p.y, target: find(p.x, p.y) }
      setConn(last)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (last.target) {
        if (side === 'right') onConnect(el.id, last.target)
        else onConnect(last.target, el.id)
      }
      setConn(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const validTargetStage = conn ? stageIndex(byId.get(conn.from)!.stage) + (conn.side === 'right' ? 1 : -1) : -9

  const nodeDim = (e: El) => {
    if (focus) return !focus.nodes.has(e.id)
    if (filter !== 'all') return e.lane !== filter
    return false
  }

  return (
    <div
      className="canvas-scroll"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.bg) onSelect(null)
      }}
    >
      <div className={cx('canvas-content', !selection && focus && 'hover-focus')} ref={contentRef} style={{ width: layout.width, height: layout.height }} data-bg="1">
        {/* sticky column headers */}
        <div className="stage-headers" style={{ width: layout.width, height: HEADER_H }}>
          {STAGES.map((s) => (
            <div key={s} className="stage-head" style={{ left: colX(s), width: NODE_W }}>
              <div className="stage-head-text">
                <span className="stage-title">{STAGE_META[s].title}</span>
                <span className="stage-hint" title={STAGE_META[s].hint}>{doc.elements.filter((e) => e.stage === s).length} · {STAGE_META[s].hint}</span>
              </div>
              <button className="icon-btn small" title={`Add ${STAGE_META[s].singular}`} aria-label={`Add ${STAGE_META[s].singular}`} onClick={() => onAdd(s)}>
                <Plus size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* program lanes */}
        {layout.bands.map((b) => {
          const m = LANE_META[b.lane]
          const dropHere = drag?.lane === b.lane
          return (
            <div
              key={b.lane}
              className={cx('lane', dropHere && 'drop', filter === b.lane && 'active')}
              style={{ top: b.top, height: b.h, width: layout.width, background: m.tint, ['--lane' as string]: m.color }}
              data-bg="1"
            >
              <div className="lane-label" style={{ width: GUTTER - 2 }}>
                <span>{m.name}</span>
              </div>
            </div>
          )
        })}

        {/* links */}
        <svg className="edges" width={layout.width} height={layout.height}>
          {doc.edges.map((ed) => {
            const a = layout.nodes[ed.from]
            const b = layout.nodes[ed.to]
            if (!a || !b) return null
            const src = byId.get(ed.from)!
            const { d } = edgePath(a, b)
            const x2 = b.x
            const y2 = b.y + b.h / 2
            const isSel = selection?.kind === 'edge' && selection.id === ed.id
            const inFocus = focus ? focus.edges.has(ed.id) : false
            const dim = focus ? !inFocus : filter !== 'all' && src.lane !== filter && byId.get(ed.to)!.lane !== filter
            const color = ed.inherited ? '#1d6fb8' : ed.weak ? '#b7791f' : LANE_META[src.lane].color
            return (
              <g key={ed.id} className={cx('edge', isSel && 'sel', inFocus && 'focus', dim && 'dim', ed.weak && 'weak', ed.inherited && 'inherited')} style={{ ['--ec' as string]: color }}>
                <path d={d} className="edge-hit" onPointerDown={(e) => e.stopPropagation()} onClick={() => onSelect({ kind: 'edge', id: ed.id })} />
                <path d={d} className="edge-line" />
                <path d={`M${x2} ${y2} L${x2 - 8} ${y2 - 4} L${x2 - 8} ${y2 + 4} Z`} className="edge-arrow" />
              </g>
            )
          })}
          {conn && (() => {
            const s = layout.nodes[conn.from]
            const sx = conn.side === 'right' ? s.x + s.w : s.x
            const sy = s.y + s.h / 2
            const dx = (conn.x - sx) * 0.5
            return <path className="edge-temp" d={`M${sx} ${sy} C${sx + dx} ${sy}, ${conn.x - dx} ${conn.y}, ${conn.x} ${conn.y}`} />
          })()}
        </svg>

        {/* markers on links: assumptions, external factors, review flags */}
        {doc.edges.map((ed) => {
          const a = layout.nodes[ed.from]
          const b = layout.nodes[ed.to]
          if (!a || !b) return null
          const hasA = ed.notes.some((n) => n.kind === 'assumption')
          const hasE = ed.notes.some((n) => n.kind === 'external')
          if (!hasA && !hasE && !ed.inherited && !ed.weak) return null
          const { mx, my } = edgePath(a, b)
          const inFocus = focus ? focus.edges.has(ed.id) : true
          const dim = focus ? !inFocus : false
          const isSel = selection?.kind === 'edge' && selection.id === ed.id
          const label = [
            ed.inherited ? 'Copied from split, needs review' : '',
            ed.weak ? 'Flagged weak evidence' : '',
            ...ed.notes.map((n) => `${n.kind === 'assumption' ? 'Assumption' : 'External factor'}: ${n.text}`),
          ]
            .filter(Boolean)
            .join('. ')
          return (
            <div key={`m-${ed.id}`} className={cx('edge-marks', dim && 'dim', isSel && 'sel')} style={{ left: mx, top: my }}>
              <button
                className="mark-group"
                title={label}
                aria-label={label}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect({ kind: 'edge', id: ed.id })}
              >
                {ed.inherited && <span className="mark review">Review</span>}
                {hasA && <span className="mark a">A</span>}
                {hasE && <span className="mark e">E</span>}
                {ed.weak && !ed.inherited && !hasA && !hasE && <span className="mark w">!</span>}
              </button>
            </div>
          )
        })}

        {/* drop indicator while reordering */}
        {drag && (
          <div className="drop-line" style={{ left: colX(byId.get(drag.id)!.stage) - 4, width: NODE_W + 8, top: drag.indicatorY - 1.5 }} />
        )}

        {/* elements */}
        {doc.elements.map((el) => {
          const b = layout.nodes[el.id]
          if (!b) return null
          const sel = selection?.kind === 'element' && selection.id === el.id
          const open = openCommentsOn(doc, 'element', el.id).length
          const isOutcome = el.stage === 'outcome' || el.stage === 'longterm'
          const m = isOutcome ? checkMeasurable(el.text) : null
          const dragging = drag?.id === el.id
          const connTarget = conn && stageIndex(el.stage) === validTargetStage
          const edgeSelectedEnds = selection?.kind === 'edge' && (doc.edges.find((x) => x.id === selection.id)?.from === el.id || doc.edges.find((x) => x.id === selection.id)?.to === el.id)
          return (
            <div
              key={el.id}
              role="button"
              tabIndex={0}
              aria-label={`${STAGE_META[el.stage].singular}: ${el.text}`}
              aria-pressed={sel}
              className={cx(
                'node',
                `stage-${el.stage}`,
                sel && 'sel',
                edgeSelectedEnds && 'edge-end',
                nodeDim(el) && 'dim',
                dragging && 'dragging',
                connTarget && 'conn-valid',
                conn?.target === el.id && 'conn-hot',
              )}
              style={{ left: b.x, top: b.y, width: b.w, height: b.h, ['--lane' as string]: LANE_META[el.lane].color }}
              data-node={el.id}
              onPointerDown={(e) => startNodeDrag(e, el)}
              onDoubleClick={() => onEdit(el.id)}
              onPointerEnter={() => setHover(el.id)}
              onPointerLeave={() => setHover((h) => (h === el.id ? null : h))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect({ kind: 'element', id: el.id })
                }
              }}
            >
              <div className="node-text" title={el.text}>{el.text}</div>
              {isOutcome && (
                <div className="node-foot">
                  {el.indicators.length > 0 ? (
                    <span className="pill ok" title={`${el.indicators.length} indicator${el.indicators.length === 1 ? '' : 's'}`}>
                      <Target size={11} /> {el.indicators.length}
                    </span>
                  ) : (
                    <span className="pill warn" title="No indicator attached">
                      <TriangleAlert size={11} /> No indicator
                    </span>
                  )}
                  <span className={cx('pill', el.evidenceIds.length === 0 && 'muted')} title={`${el.evidenceIds.length} evidence source${el.evidenceIds.length === 1 ? '' : 's'}`}>
                    <BookOpen size={11} /> {el.evidenceIds.length}
                  </span>
                  {m && !m.ok && (
                    <span className="pill warn" title={`Statement is missing: ${m.missing.join(', ')}`}>
                      Needs target
                    </span>
                  )}
                  {m && m.ok && el.stage === 'outcome' && el.term && <span className="term">{el.term === 'short' ? 'Short' : 'Mid'}</span>}
                </div>
              )}
              {el.splitFrom && el.stage === 'activity' && (
                <div className="node-foot">
                  <span className="pill split" title={`Split from “${el.splitFrom}”`}>
                    <Split size={10} /> Split{doc.edges.some((x) => x.inherited && (x.from === el.id || x.to === el.id)) ? ' · links to review' : ''}
                  </span>
                </div>
              )}
              {open > 0 && (
                <span className="node-comments" title={`${open} open comment${open === 1 ? '' : 's'}`}>
                  <MessageSquare size={10} /> {open}
                </span>
              )}
              {el.stage !== 'longterm' && <span className="port right" onPointerDown={(e) => startConnect(e, el, 'right')} title="Drag to connect" />}
              {el.stage !== 'input' && <span className="port left" onPointerDown={(e) => startConnect(e, el, 'left')} title="Drag to connect" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
