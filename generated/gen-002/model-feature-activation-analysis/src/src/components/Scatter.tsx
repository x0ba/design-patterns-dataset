import { useEffect, useMemo, useRef, useState } from 'react'
import { db, N, NF, LAYERS, layerOf, labelOf, featName, fmtFreq, H_NONE } from '../data/db'
import { median } from '../data/analytics'
import { useApp, type Sel } from '../store'
import { LAYER_COLORS, HUMAN_COLORS, CLUSTER_COLOR } from '../ui'

const M = { l: 46, r: 14, t: 12, b: 36 }
const CI_COLORS = ['#cfd8e8', '#9db3d6', '#6a8cc4', '#3e63a8', '#1f3a78']

export interface QuadCounts { dI: number; dN: number; sI: number; sN: number }

export function Scatter({ ids, counts }: { ids: Uint32Array; counts: QuadCounts }) {
  const { view, setView, selected, select, ws } = useApp()
  const wrap = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 800, h: 300 })
  const [hover, setHover] = useState<{ g: number; x: number; y: number } | null>(null)
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const dragRef = useRef<typeof drag>(null)

  useEffect(() => {
    const el = wrap.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const { w, h } = size
  const [X0, X1] = view.zoom === 'dense' ? [-2.35, -0.3] : [-7.15, -0.3]
  const pw = w - M.l - M.r, ph = h - M.t - M.b
  const px = (lf: number) => M.l + ((lf - X0) / (X1 - X0)) * pw
  const py = (s: number) => M.t + (1 - s) * ph
  const ix = (x: number) => X0 + ((x - M.l) / pw) * (X1 - X0)
  const iy = (y: number) => 1 - (y - M.t) / ph

  const trend = useMemo(() => {
    const nb = 26, lo = -7, hi = -0.4, bw = (hi - lo) / nb
    const bk: number[][] = Array.from({ length: nb }, () => [])
    for (let k = 0; k < ids.length; k++) {
      const g = ids[k]
      if (!db.alive[g]) continue
      const b = Math.min(nb - 1, Math.max(0, Math.floor((Math.log10(db.freq[g]) - lo) / bw)))
      bk[b].push(db.score[g])
    }
    return bk.map((b, i) => (b.length >= 30 ? { x: lo + (i + 0.5) * bw, y: median(b) } : null)).filter(Boolean) as { x: number; y: number }[]
  }, [ids])

  // draw
  useEffect(() => {
    const c = cv.current!
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr; c.height = h * dpr
    c.style.width = w + 'px'; c.style.height = h + 'px'
    const g2 = c.getContext('2d')!
    g2.setTransform(dpr, 0, 0, dpr, 0, 0)
    g2.clearRect(0, 0, w, h)
    g2.font = '11px "JetBrains Mono Variable", ui-monospace, monospace'

    // dense region band
    const xd = px(Math.log10(view.denseT))
    g2.fillStyle = 'rgba(194,24,91,0.045)'
    g2.fillRect(xd, M.t, M.l + pw - xd, ph)

    // grid
    g2.strokeStyle = '#ebe8e1'; g2.lineWidth = 1
    g2.fillStyle = '#7b848e'
    g2.textAlign = 'center'
    const ticks: [number, string][] = view.zoom === 'dense'
      ? [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.4].map((v) => [Math.log10(v), String(v)])
      : [-7, -6, -5, -4, -3, -2, -1].map((e) => [e, `1e${e}`])
    for (const [e, t] of ticks) {
      const x = Math.round(px(e)) + 0.5
      g2.beginPath(); g2.moveTo(x, M.t); g2.lineTo(x, M.t + ph); g2.stroke()
      g2.fillText(t, x, M.t + ph + 15)
    }
    g2.textAlign = 'right'
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      const y = Math.round(py(s)) + 0.5
      g2.beginPath(); g2.moveTo(M.l, y); g2.lineTo(M.l + pw, y); g2.stroke()
      g2.fillText(s.toFixed(2), M.l - 7, y + 4)
    }
    g2.textAlign = 'center'
    g2.fillStyle = '#4b535d'
    g2.fillText('activation frequency (log scale)', M.l + pw / 2, h - 5)
    g2.save()
    g2.translate(11, M.t + ph / 2); g2.rotate(-Math.PI / 2)
    g2.fillText('auto-interp score', 0, 0)
    g2.restore()

    // points
    g2.save()
    g2.beginPath(); g2.rect(M.l, M.t - 4, pw, ph + 8); g2.clip()
    const mode = view.colorBy
    const n = ids.length
    const alpha = n > 60000 ? 0.2 : n > 20000 ? 0.28 : n > 4000 ? 0.4 : 0.6
    const sz = n > 60000 ? 2 : 2.4
    if (mode === 'layer') {
      const layersOn = view.layers.filter(Boolean).length
      const sA = layersOn <= 1 ? 0.3 : layersOn <= 3 ? 0.16 : 0.1
      const dT = view.denseT
      for (let pass = 0; pass < 2; pass++) {
        g2.globalAlpha = pass === 0 ? sA : 0.9
        const s2 = pass === 0 ? sz : 3.6
        for (let li = 0; li < LAYERS.length; li++) {
          g2.fillStyle = LAYER_COLORS[li]
          for (let k = 0; k < n; k++) {
            const g = ids[k]
            if (((g / NF) | 0) !== li || !db.alive[g]) continue
            if ((db.freq[g] >= dT) !== (pass === 1)) continue
            g2.fillRect(px(Math.log10(db.freq[g])) - s2 / 2, py(db.score[g]) - s2 / 2, s2, s2)
          }
        }
      }
    } else if (mode === 'ci') {
      g2.globalAlpha = alpha + 0.1
      for (let b = 0; b < 5; b++) {
        g2.fillStyle = CI_COLORS[b]
        for (let k = 0; k < n; k++) {
          const g = ids[k]
          if (!db.alive[g]) continue
          const wd = db.hi[g] - db.lo[g]
          const bi = Math.min(4, Math.floor(wd / 0.1))
          if (bi !== b) continue
          g2.fillRect(px(Math.log10(db.freq[g])) - sz / 2, py(db.score[g]) - sz / 2, sz, sz)
        }
      }
    } else {
      g2.globalAlpha = 0.16
      g2.fillStyle = '#8b939c'
      for (let k = 0; k < n; k++) {
        const g = ids[k]
        if (!db.alive[g] || db.human[g]) continue
        g2.fillRect(px(Math.log10(db.freq[g])) - 1, py(db.score[g]) - 1, 2, 2)
      }
      g2.globalAlpha = 0.95
      for (let k = 0; k < n; k++) {
        const g = ids[k]
        if (!db.alive[g] || !db.human[g]) continue
        g2.fillStyle = HUMAN_COLORS[db.human[g]]
        g2.beginPath(); g2.arc(px(Math.log10(db.freq[g])), py(db.score[g]), 3.2, 0, 6.3); g2.fill()
      }
    }
    g2.globalAlpha = 1

    // thresholds
    g2.setLineDash([4, 3]); g2.lineWidth = 1.2
    g2.strokeStyle = CLUSTER_COLOR
    g2.beginPath(); g2.moveTo(Math.round(xd) + 0.5, M.t); g2.lineTo(Math.round(xd) + 0.5, M.t + ph); g2.stroke()
    g2.strokeStyle = '#1b1f24'
    const yi = Math.round(py(view.interpT)) + 0.5
    g2.beginPath(); g2.moveTo(M.l, yi); g2.lineTo(M.l + pw, yi); g2.stroke()
    g2.setLineDash([])

    // trend
    if (trend.length > 2) {
      g2.beginPath()
      trend.forEach((p, i) => (i ? g2.lineTo(px(p.x), py(p.y)) : g2.moveTo(px(p.x), py(p.y))))
      g2.lineWidth = 4.5; g2.strokeStyle = 'rgba(255,255,255,0.9)'; g2.stroke()
      g2.lineWidth = 2; g2.strokeStyle = '#1b1f24'; g2.stroke()
    }

    // cluster highlight
    if (view.hlCluster) {
      g2.lineWidth = 1.4; g2.strokeStyle = CLUSTER_COLOR; g2.fillStyle = 'rgba(194,24,91,0.18)'
      for (let k = 0; k < n; k++) {
        const g = ids[k]
        if (!db.cluster[g]) continue
        g2.beginPath(); g2.arc(px(Math.log10(db.freq[g])), py(db.score[g]), 4.2, 0, 6.3); g2.fill(); g2.stroke()
      }
    }
    // bookmarks (diamonds)
    g2.strokeStyle = '#1b1f24'; g2.lineWidth = 1.2; g2.fillStyle = '#ffd43b'
    for (const key of Object.keys(ws.bookmarks)) {
      const g = +key
      if (!db.alive[g] || !view.layers[layerOf(g)]) continue
      const x = px(Math.log10(db.freq[g])), y = py(db.score[g])
      g2.beginPath(); g2.moveTo(x, y - 5); g2.lineTo(x + 5, y); g2.lineTo(x, y + 5); g2.lineTo(x - 5, y); g2.closePath(); g2.fill(); g2.stroke()
    }
    // selected
    if (db.alive[selected] && view.layers[layerOf(selected)]) {
      const x = px(Math.log10(db.freq[selected])), y = py(db.score[selected])
      g2.strokeStyle = '#1b1f24'; g2.lineWidth = 1.6
      g2.beginPath(); g2.arc(x, y, 8, 0, 6.3); g2.stroke()
      g2.strokeStyle = '#fff'; g2.lineWidth = 1
      g2.beginPath(); g2.arc(x, y, 9.6, 0, 6.3); g2.stroke()
    }
    // persisted brush
    if (view.brush) {
      const b = view.brush
      g2.setLineDash([5, 3]); g2.strokeStyle = '#2342c4'; g2.lineWidth = 1.3
      g2.fillStyle = 'rgba(35,66,196,0.06)'
      const rx = px(b.x0), ry = py(b.y1), rw = px(b.x1) - px(b.x0), rh = py(b.y0) - py(b.y1)
      g2.fillRect(rx, ry, rw, rh); g2.strokeRect(rx, ry, rw, rh)
      g2.setLineDash([])
    }
    g2.restore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, w, h, view.colorBy, view.zoom, view.denseT, view.interpT, view.hlCluster, view.brush, view.layers, selected, ws.bookmarks, trend])

  const nearest = (mx: number, my: number) => {
    let best = -1, bd = 7 * 7
    for (let k = 0; k < ids.length; k++) {
      const g = ids[k]
      if (!db.alive[g]) continue
      const dx = px(Math.log10(db.freq[g])) - mx
      if (dx > 7 || dx < -7) continue
      const dy = py(db.score[g]) - my
      const d = dx * dx + dy * dy
      if (d < bd) { bd = d; best = g }
    }
    return best
  }

  const rel = (e: React.MouseEvent) => {
    const r = cv.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const p = rel(e)
    if (p.x < M.l || p.x > M.l + pw || p.y < M.t || p.y > M.t + ph) return
    dragRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
    setDrag(dragRef.current)
  }
  const onMove = (e: React.MouseEvent) => {
    const p = rel(e)
    if (dragRef.current) {
      dragRef.current = { ...dragRef.current, x1: Math.min(M.l + pw, Math.max(M.l, p.x)), y1: Math.min(M.t + ph, Math.max(M.t, p.y)) }
      setDrag(dragRef.current)
      setHover(null)
      return
    }
    const g = nearest(p.x, p.y)
    setHover(g >= 0 ? { g, x: p.x, y: p.y } : null)
  }
  const onUp = (e: React.MouseEvent) => {
    const d = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!d) return
    if (Math.abs(d.x1 - d.x0) < 4 && Math.abs(d.y1 - d.y0) < 4) {
      const p = rel(e)
      const g = nearest(p.x, p.y)
      if (g >= 0) select(g)
      return
    }
    const lx0 = Math.min(ix(d.x0), ix(d.x1)), lx1 = Math.max(ix(d.x0), ix(d.x1))
    const sy0 = Math.min(iy(d.y0), iy(d.y1)), sy1 = Math.max(iy(d.y0), iy(d.y1))
    const out: number[] = []
    for (let k = 0; k < ids.length; k++) {
      const g = ids[k]
      if (!db.alive[g]) continue
      const l = Math.log10(db.freq[g]), s = db.score[g]
      if (l >= lx0 && l <= lx1 && s >= sy0 && s <= sy1) out.push(g)
    }
    setView({ brush: { x0: lx0, x1: lx1, y0: sy0, y1: sy1, ids: Uint32Array.from(out) }, sel: 'brush' })
    if (out.length) select(out.sort((a, b) => db.freq[b] - db.freq[a])[0])
  }

  const quad = (s: Sel, label: string, n: number, accent?: boolean) => (
    <button className={`quad ${view.sel === s ? 'on' : ''} ${accent ? 'accent' : ''}`} onClick={() => setView({ sel: s })} title="Show these features in the table">
      <span>{label}</span><b>{n.toLocaleString()}</b>
    </button>
  )

  return (
    <div className="scatter">
      <div className="quads">
        {quad('dI', 'Dense · interpretable', counts.dI, true)}
        {quad('dN', 'Dense · not interp.', counts.dN, true)}
        {quad('sI', 'Sparse · interpretable', counts.sI)}
        {quad('sN', 'Sparse · not interp.', counts.sN)}
        <span className="quadhint">drag to select</span>
      </div>
      <div className="plot" ref={wrap}>
        <canvas ref={cv} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => { setHover(null); if (dragRef.current) { dragRef.current = null; setDrag(null) } }} />
        {drag && <div className="brushrect" style={{ left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1), width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0) }} />}
        {hover && !drag && (
          <div className="tip" style={{ left: Math.min(hover.x + 14, w - 300), top: Math.max(4, hover.y - 62) }}>
            <div className="tip-h"><b>{featName(hover.g)}</b>{db.cluster[hover.g] ? <span className="pill cl">L12 code cluster</span> : null}{db.human[hover.g] !== H_NONE ? <span className="pill">human-reviewed</span> : null}</div>
            <div className="tip-l">{labelOf(hover.g)}</div>
            <div className="tip-m">freq {fmtFreq(db.freq[hover.g])} · score {db.score[hover.g].toFixed(2)} <span className="muted">[{db.lo[hover.g].toFixed(2)}, {db.hi[hover.g].toFixed(2)}]</span></div>
          </div>
        )}
      </div>
      <div className="legend">
        {view.colorBy === 'layer' && LAYERS.map((l, i) => (
          <span key={l} className={view.layers[i] ? '' : 'off'}><i style={{ background: LAYER_COLORS[i] }} />L{l}</span>
        ))}
        {view.colorBy === 'human' && ['Interpretable', 'Partial', 'Not interpretable'].map((t, i) => <span key={t}><i style={{ background: HUMAN_COLORS[i + 1], borderRadius: 6 }} />{t}</span>)}
        {view.colorBy === 'ci' && <><span className="muted">95% CI width</span>{CI_COLORS.map((c, i) => <span key={c}><i style={{ background: c }} />{i === 4 ? '≥ 0.4' : `${(i * 0.1).toFixed(1)}–${((i + 1) * 0.1).toFixed(1)}`}</span>)}</>}
        {view.hlCluster && <span><i className="ring" />L12 code cluster</span>}
        <span><i className="dia" />bookmarked</span>
        <span><svg width="16" height="6"><line x1="0" x2="16" y1="3" y2="3" stroke="#1b1f24" strokeWidth="2" /></svg>median</span>
        <span><svg width="18" height="6"><line x1="0" x2="18" y1="3" y2="3" stroke="#c2185b" strokeWidth="1.5" strokeDasharray="4 3" /></svg>dense ≥ {view.denseT}</span>
        <span><svg width="18" height="6"><line x1="0" x2="18" y1="3" y2="3" stroke="#1b1f24" strokeWidth="1.5" strokeDasharray="4 3" /></svg>≥ {view.interpT}</span>
      </div>
    </div>
  )
}

export function totalPoints() { return N }
