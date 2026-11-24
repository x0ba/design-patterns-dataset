import { useDeferredValue, useMemo, useRef } from 'react'
import { db, LAYERS, NF, N, layerOf, fmtFreq } from '../data/db'
import { layerStats, filterIds, labelMask, median, fmtInt, pct, wilson } from '../data/analytics'
import { useApp, type Sel } from '../store'
import { Seg, Icon, LAYER_COLORS, CLUSTER_COLOR, f2 } from '../ui'
import { Scatter } from './Scatter'
import { LayerTab, ReliabilityTab } from './Tabs'
import { FeatureTable } from './FeatureTable'

function FilterBar() {
  const { view, setView } = useApp()
  const qRef = useRef<HTMLInputElement>(null)
  const allOn = view.layers.every(Boolean)
  const toggle = (i: number, only: boolean) => {
    if (only) setView({ layers: view.layers.map((_, j) => j === i) })
    else setView({ layers: view.layers.map((v, j) => (j === i ? !v : v)) })
  }
  return (
    <div className="filterbar">
      <div className="fb-group">
        <label className="fb-l">Layers</label>
        <div className="layerchips">
          {LAYERS.map((l, i) => (
            <button key={l} className={`lchip ${view.layers[i] ? 'on' : ''}`} style={{ ['--c' as any]: LAYER_COLORS[i] }} onClick={(e) => toggle(i, e.altKey || e.metaKey)} title={`Toggle layer ${l} (⌥-click to isolate)`} aria-pressed={view.layers[i]}>
              {l}
            </button>
          ))}
          <button className="lchip text" onClick={() => setView({ layers: LAYERS.map(() => !allOn) })}>{allOn ? 'None' : 'All'}</button>
        </div>
      </div>
      <div className="fb-group grow">
        <label className="fb-l" htmlFor="q">Label</label>
        <div className="search">
          <Icon n="search" size={14} />
          <input id="q" ref={qRef} value={view.q} placeholder="Search auto labels, e.g. “Python”, “negation”" onChange={(e) => setView({ q: e.target.value })} />
          {view.q && <button onClick={() => setView({ q: '' })} aria-label="Clear search"><Icon n="close" size={12} /></button>}
        </div>
      </div>
      <label className="check"><input type="checkbox" checked={view.humanOnly} onChange={(e) => setView({ humanOnly: e.target.checked })} /> Human-reviewed <span className="muted">(600)</span></label>
      <label className="check"><input type="checkbox" checked={view.showDead} onChange={(e) => setView({ showDead: e.target.checked })} /> Show dead</label>
    </div>
  )
}

function TSel({ id, value, opts, fmt, onChange }: { id: string; value: number; opts: number[]; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return <select id={id} className="tsel" value={value} onChange={(e) => onChange(+e.target.value)} aria-label={id === 'dt' ? 'Dense frequency threshold' : 'Interpretability score threshold'}>{opts.map((v) => <option key={v} value={v}>{fmt(v)}</option>)}</select>
}

function Stat({ label, value, sub, children, tone }: { label: React.ReactNode; value: string; sub?: string; children?: React.ReactNode; tone?: string }) {
  return (
    <div className={`tile ${tone ?? ''}`}>
      <label>{label}</label>
      <div className="tile-v"><b className="mono">{value}</b>{children}</div>
      {sub && <div className="tile-s">{sub}</div>}
    </div>
  )
}

export function Explorer() {
  const { view, setView } = useApp()
  const deferredQ = useDeferredValue(view.q)

  const mask = useMemo(() => labelMask(deferredQ), [deferredQ])
  const ids = useMemo(
    () => filterIds({ layers: view.layers, labelMask: mask, humanOnly: view.humanOnly, includeDead: view.showDead }),
    [view.layers, mask, view.humanOnly, view.showDead],
  )

  const agg = useMemo(() => {
    const { denseT, interpT } = view
    const c = { dI: 0, dN: 0, sI: 0, sN: 0 }
    const dS: number[] = [], sS: number[] = [], dC: number[] = [], sC: number[] = []
    const perLayer = LAYERS.map(() => ({ d: 0, i: 0 }))
    let alive = 0, clusterN = 0
    for (let k = 0; k < ids.length; k++) {
      const g = ids[k]
      if (!db.alive[g]) continue
      alive++
      if (db.cluster[g]) clusterN++
      const dense = db.freq[g] >= denseT, interp = db.score[g] >= interpT
      if (dense) {
        const pl = perLayer[layerOf(g)]; pl.d++; if (interp) pl.i++
        dS.push(db.score[g]); dC.push(db.hi[g] - db.lo[g])
      } else { sS.push(db.score[g]); sC.push(db.hi[g] - db.lo[g]) }
      c[dense ? (interp ? 'dI' : 'dN') : interp ? 'sI' : 'sN']++
    }
    return { c, alive, clusterN, perLayer, medD: median(dS), medS: median(sS), ciD: median(dC), ciS: median(sC), nDense: dS.length }
  }, [ids, view.denseT, view.interpT])

  // rows for the table
  const rowIds = useMemo(() => {
    const { sel, denseT, interpT, brush } = view
    if (sel === 'all') return ids
    if (sel === 'brush') return brush ? brush.ids : ids
    const out: number[] = []
    for (let k = 0; k < ids.length; k++) {
      const g = ids[k]
      if (!db.alive[g]) continue
      if (sel === 'cluster') { if (db.cluster[g]) out.push(g); continue }
      const dense = db.freq[g] >= denseT, interp = db.score[g] >= interpT
      if ((sel === 'dI' && dense && interp) || (sel === 'dN' && dense && !interp) || (sel === 'sI' && !dense && interp) || (sel === 'sN' && !dense && !interp)) out.push(g)
    }
    return Uint32Array.from(out)
  }, [ids, view.sel, view.denseT, view.interpT, view.brush])

  const titles: Record<Sel, string> = {
    all: 'All features in view', dI: 'Dense & interpretable (exceptions to the claim)', dN: 'Dense & not interpretable', sI: 'Sparse & interpretable',
    sN: 'Sparse & not interpretable', cluster: 'Layer 12 code cluster', brush: 'Brushed region',
  }

  const { c } = agg
  const junkFrac = agg.nDense ? (agg.nDense - (c.dI)) / agg.nDense : NaN
  const [jl, jh] = wilson(agg.nDense - c.dI, agg.nDense)
  const totalAlive = agg.alive
  const layersOn = view.layers.filter(Boolean).length

  const groupSeg = (
    <Seg size="sm" value={view.sel} onChange={(sel) => setView({ sel })} options={[
      { v: 'dI', label: <>Dense · interp. <b>{fmtInt(c.dI)}</b></>, title: 'Dense features scoring at or above the interpretability threshold: exceptions to the claim' },
      { v: 'dN', label: <>Dense · not <b>{fmtInt(c.dN)}</b></>, title: 'Dense features below the interpretability threshold' },
      { v: 'cluster', label: <><i className="ring" style={{ borderColor: CLUSTER_COLOR }} />L12 code <b>{agg.clusterN}</b></>, title: 'The 34 layer-12 features that fire on code tokens' },
      { v: 'sI', label: <>Sparse · interp.</> },
      { v: 'sN', label: <>Sparse · not</> },
      { v: 'all', label: <>All</>, title: `All ${fmtInt(ids.length)} features in view` },
      ...(view.brush ? [{ v: 'brush' as Sel, label: <>Brush <b>{fmtInt(view.brush.ids.length)}</b></> }] : []),
    ]} />
  )

  return (
    <div className="explorer">
      <FilterBar />
      <div className="tiles">
        <Stat label={<>Dense features · freq ≥ <TSel id="dt" value={view.denseT} opts={[0.02, 0.05, 0.1, 0.2]} fmt={(v) => String(v)} onChange={(v) => setView({ denseT: v, brush: null, sel: view.sel === 'brush' ? 'all' : view.sel })} /></>} value={fmtInt(agg.nDense)} sub={`${pct(agg.nDense / (totalAlive || 1), 2)} of ${fmtInt(totalAlive)} alive`} />
        <Stat tone="key" label={<>Dense &amp; not interpretable · score &lt; <TSel id="it" value={view.interpT} opts={[0.3, 0.4, 0.5, 0.6, 0.7]} fmt={(v) => v.toFixed(1)} onChange={(v) => setView({ interpT: v })} /></>} value={pct(junkFrac)} sub={isNaN(junkFrac) ? 'no dense features in view' : `95% CI ${pct(jl)}–${pct(jh)} · by layer →`}>
          <div className="spark" title="Share of dense features below the interpretability threshold, by layer">
            {LAYERS.map((l, i) => {
              const p = agg.perLayer[i]
              const v = p.d ? 1 - p.i / p.d : 0
              return <span key={l} className={view.layers[i] ? '' : 'off'}><i style={{ height: `${Math.max(2, v * 28)}px`, background: p.d ? LAYER_COLORS[i] : '#d8d5cd' }} /><em>{l}</em></span>
            })}
          </div>
        </Stat>
        <Stat label="Median score" value={`${f2(agg.medD)} / ${f2(agg.medS)}`} sub="dense / sparse" />
        <Stat label="Median 95% CI width" value={`${f2(agg.ciD)} / ${f2(agg.ciS)}`} sub={isNaN(agg.ciD) ? '' : `dense / sparse · ${(agg.ciD / agg.ciS).toFixed(1)}×`} />
      </div>

      <section className="chartpanel">
        <div className="cp-head">
          <Seg value={view.tab} onChange={(tab) => setView({ tab })} options={[
            { v: 'scatter', label: 'Frequency × score' },
            { v: 'layers', label: 'By layer' },
            { v: 'reliability', label: 'Reliability' },
          ]} />
          <div className="cp-tools">
            {view.tab === 'scatter' && (
              <>
                <label className="check"><input type="checkbox" checked={view.hlCluster} onChange={(e) => setView({ hlCluster: e.target.checked })} /><i className="ring" /> L12 code cluster</label>
                <Seg size="sm" value={view.zoom} onChange={(zoom) => setView({ zoom })} options={[{ v: 'full', label: 'Full', title: 'Show the full frequency axis' }, { v: 'dense', label: 'Dense', title: 'Zoom the frequency axis to 0.005–0.4' }]} />
                <Seg size="sm" value={view.colorBy} onChange={(colorBy) => setView({ colorBy })} options={[{ v: 'layer', label: 'Layer', title: 'Color by layer' }, { v: 'human', label: 'Human', title: 'Color by human review label' }, { v: 'ci', label: 'CI', title: 'Color by 95% CI width' }]} />
              </>
            )}
          </div>
        </div>
        <div className="cp-body">
          {view.tab === 'scatter' && <Scatter ids={ids} counts={agg.c} />}
          {view.tab === 'layers' && <LayerTab />}
          {view.tab === 'reliability' && <ReliabilityTab />}
        </div>
      </section>

      <FeatureTable ids={rowIds} head={groupSeg} title={titles[view.sel]} sub={view.sel === 'brush' && view.brush ? `freq ${fmtFreq(Math.pow(10, view.brush.x0))}–${fmtFreq(Math.pow(10, view.brush.x1))}, score ${f2(view.brush.y0)}–${f2(view.brush.y1)}` : undefined} />
    </div>
  )
}

export { NF, N }
