import { useMemo, useState } from 'react'
import { LAYERS } from '../data/db'
import { layerStats, freqBins, calibration, SCORE_BINS, fmtInt, pct } from '../data/analytics'
import { useApp } from '../store'
import { LAYER_COLORS, HUMAN_COLORS, Seg, f2 } from '../ui'

export function LayerTab() {
  const { view, setView } = useApp()
  const stats = useMemo(() => layerStats(view.denseT, view.interpT), [view.denseT, view.interpT])
  const isolate = (i: number) => setView({ layers: LAYERS.map((_, j) => j === i), tab: 'scatter', sel: 'dI' })
  const holds = stats.filter((s) => s.verdict === 'holds').map((s) => `L${LAYERS[s.li]}`)
  const fails = stats.filter((s) => s.verdict === 'fails').map((s) => `L${LAYERS[s.li]}`)
  const unclear = stats.filter((s) => s.verdict === 'unclear').map((s) => `L${LAYERS[s.li]}`)
  return (
    <div className="layertab">
      <div className="lt-head grid">
        <span>Layer</span><span>Dense</span><span title="Share of the layer's L0 (mean active features per token) used by dense features">L0 share</span>
        <span>Dense, not interpretable</span><span>Claim</span><span>Score ○ sparse → ● dense</span><span title="Median 95% CI width, sparse → dense">CI width</span>
      </div>
      {stats.map((s) => (
        <button key={s.li} className={`lt-row grid ${view.layers[s.li] ? '' : 'off'}`} onClick={() => isolate(s.li)} title={`Isolate layer ${LAYERS[s.li]} and list its dense, interpretable features`}>
          <span className="lt-l"><i style={{ background: LAYER_COLORS[s.li] }} />L{LAYERS[s.li]}</span>
          <span className="mono">{s.nDense}<em> / {fmtInt(s.alive)}</em></span>
          <span className="mono">{pct(s.l0Share)}</span>
          <span className="lt-bar">
            <svg width="126" height="16" viewBox="0 0 160 16" preserveAspectRatio="none">
              <rect x="0" y="4" width="160" height="8" rx="2" fill="#ece9e2" />
              <rect x="0" y="4" width={160 * (s.junk || 0)} height="8" rx="2" fill={LAYER_COLORS[s.li]} />
              <line x1="80" x2="80" y1="1" y2="15" stroke="#1b1f24" strokeDasharray="2 2" opacity=".5" />
              <line x1={160 * s.junkLo} x2={160 * s.junkHi} y1="8" y2="8" stroke="#1b1f24" strokeWidth="1.6" />
              <line x1={160 * s.junkLo} x2={160 * s.junkLo} y1="5" y2="11" stroke="#1b1f24" strokeWidth="1.6" />
              <line x1={160 * s.junkHi} x2={160 * s.junkHi} y1="5" y2="11" stroke="#1b1f24" strokeWidth="1.6" />
            </svg>
            <b className="mono">{pct(s.junk)}</b>
          </span>
          <span><span className={`verdict ${s.verdict}`}>{s.verdict === 'holds' ? 'Holds' : s.verdict === 'fails' ? 'Does not hold' : 'Unclear'}</span></span>
          <span className="lt-db">
            <svg width="96" height="16" viewBox="0 0 150 16" preserveAspectRatio="none">
              <line x1="0" x2="150" y1="8" y2="8" stroke="#e2dfd8" />
              <line x1="75" x2="75" y1="3" y2="13" stroke="#cfcbc2" />
              <line x1={150 * s.medSparse} x2={150 * s.medDense} y1="8" y2="8" stroke="#8b939c" strokeWidth="2" />
              <circle cx={150 * s.medSparse} cy="8" r="4" fill="#fff" stroke="#1b1f24" strokeWidth="1.5" />
              <circle cx={150 * s.medDense} cy="8" r="4.2" fill="#1b1f24" />
            </svg>
            <span className="mono small">{f2(s.medSparse)} → {f2(s.medDense)}</span>
          </span>
          <span className="mono small">{f2(s.ciSparse)} → {f2(s.ciDense)}</span>
        </button>
      ))}
      <div className="lt-foot">
        <b>Claim: “dense features are mostly not interpretable.”</b>{' '}
        Holds (lower 95% bound of the not-interpretable share &gt; 50%) at <b>{holds.join(', ') || 'no layer'}</b>
        {fails.length ? <>; does not hold at <b>{fails.join(', ')}</b></> : null}
        {unclear.length ? <>; unclear at <b>{unclear.join(', ')}</b></> : null}. Click a row to isolate that layer.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
function LineChart({ metric }: { metric: 'score' | 'ci' }) {
  const { view } = useApp()
  const W = 420, H = 232, m = { l: 38, r: 12, t: 10, b: 34 }
  const pw = W - m.l - m.r, ph = H - m.t - m.b
  const ymax = metric === 'score' ? 1 : 0.7
  const lo = -6.5, hi = -0.4
  const px = (l: number) => m.l + ((l - lo) / (hi - lo)) * pw
  const py = (v: number) => m.t + (1 - Math.min(v, ymax) / ymax) * ph
  const series = useMemo(() => LAYERS.map((_, li) => freqBins(li, metric)), [metric])
  const yt = metric === 'score' ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.2, 0.4, 0.6]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rel-svg" role="img" aria-label={`Median ${metric === 'score' ? 'auto-interp score' : '95% CI width'} by activation frequency, per layer`}>
      <rect x={px(Math.log10(view.denseT))} y={m.t} width={m.l + pw - px(Math.log10(view.denseT))} height={ph} fill="rgba(194,24,91,.06)" />
      {yt.map((v) => (
        <g key={v}><line x1={m.l} x2={m.l + pw} y1={py(v)} y2={py(v)} stroke="#ebe8e1" /><text x={m.l - 6} y={py(v) + 3.5} textAnchor="end" className="ax">{v.toFixed(2)}</text></g>
      ))}
      {[-6, -5, -4, -3, -2, -1].map((e) => (
        <g key={e}><line x1={px(e)} x2={px(e)} y1={m.t} y2={m.t + ph} stroke="#ebe8e1" /><text x={px(e)} y={m.t + ph + 14} textAnchor="middle" className="ax">1e{e}</text></g>
      ))}
      <text x={m.l + pw / 2} y={H - 4} textAnchor="middle" className="ax2">activation frequency (log)</text>
      {series.map((b, li) => {
        if (!view.layers[li]) return null
        let d = ''
        let pen = false
        b.med.forEach((v, k) => {
          if (isNaN(v)) { pen = false; return }
          const x = px((b.edges[k] + b.edges[k + 1]) / 2)
          d += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${py(v).toFixed(1)}`
          pen = true
        })
        return (
          <g key={li}>
            <path d={d} fill="none" stroke={LAYER_COLORS[li]} strokeWidth="1.8" opacity=".95" />
            {b.med.map((v, k) => (isNaN(v) ? null : <circle key={k} cx={px((b.edges[k] + b.edges[k + 1]) / 2)} cy={py(v)} r="2.2" fill={LAYER_COLORS[li]} />))}
          </g>
        )
      })}
    </svg>
  )
}

function Calibration() {
  const { view } = useApp()
  const cal = useMemo(() => calibration(view.layers, view.denseT), [view.layers, view.denseT])
  const W = 400, H = 232, m = { l: 34, r: 8, t: 26, b: 40 }
  const pw = (W - m.l - m.r - 18) / 2, ph = H - m.t - m.b
  const group = (arr: typeof cal.dense, x0: number, title: string) => {
    const bw = pw / arr.length
    return (
      <g transform={`translate(${x0},0)`}>
        <text x={pw / 2} y={12} textAnchor="middle" className="ax3">{title} <tspan className="ax">(n={arr.reduce((a, b) => a + b.n, 0)})</tspan></text>
        {arr.map((b, i) => {
          const x = i * bw + 4, w = bw - 8
          let y = m.t + ph
          const seg = (v: number, color: string, k: string) => {
            const hh = b.n ? (v / b.n) * ph : 0
            y -= hh
            return hh > 0 ? <rect key={k} x={x} y={y} width={w} height={hh} fill={color} /> : null
          }
          return (
            <g key={i}>
              {b.n === 0 ? <rect x={x} y={m.t} width={w} height={ph} fill="#f3f1ec" /> : <>
                {seg(b.interp, HUMAN_COLORS[1], 'a')}{seg(b.partial, HUMAN_COLORS[2], 'b')}{seg(b.not, HUMAN_COLORS[3], 'c')}
              </>}
              <text x={x + w / 2} y={m.t + ph + 13} textAnchor="middle" className="ax">{['0–.25', '.25–.5', '.5–.75', '.75–1'][i]}</text>
              <text x={x + w / 2} y={m.t + ph + 25} textAnchor="middle" className="ax n">n={b.n}</text>
            </g>
          )
        })}
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rel-svg" role="img" aria-label="Human review outcome by auto-interp score bin, dense versus sparse features">
      {[0, 0.5, 1].map((v) => (
        <g key={v}><line x1={m.l} x2={W - m.r} y1={m.t + ph * (1 - v)} y2={m.t + ph * (1 - v)} stroke="#ebe8e1" /><text x={m.l - 5} y={m.t + ph * (1 - v) + 3.5} textAnchor="end" className="ax">{v * 100}%</text></g>
      ))}
      {group(cal.dense, m.l, 'Dense')}
      {group(cal.sparse, m.l + pw + 18, 'Sparse')}
      <text x={W / 2} y={H - 1} textAnchor="middle" className="ax2">auto-interp score bin</text>
    </svg>
  )
}

export function ReliabilityTab() {
  const { view } = useApp()
  const [metric, setMetric] = useState<'score' | 'ci'>('score')
  const cal = useMemo(() => calibration(view.layers, view.denseT), [view.layers, view.denseT])
  const lowBins = [0, 1]
  const agg = (arr: typeof cal.dense) => lowBins.reduce((a, i) => ({ n: a.n + arr[i].n, k: a.k + arr[i].interp + arr[i].partial, i: a.i + arr[i].interp }), { n: 0, k: 0, i: 0 })
  const d = agg(cal.dense), s = agg(cal.sparse)
  return (
    <div className="reltab">
      <div className="rel-panel">
        <div className="rel-h">
          <b>Score and uncertainty vs frequency</b>
          <Seg size="sm" value={metric} onChange={setMetric} options={[{ v: 'score', label: 'Score' }, { v: 'ci', label: '95% CI width' }]} />
        </div>
        <LineChart metric={metric} />
        <div className="rel-cap">Median per log-frequency bin, one line per selected layer (bins with fewer than 8 features omitted). Shaded: dense region.</div>
      </div>
      <div className="rel-panel">
        <div className="rel-h"><b>Auto score vs human review</b>
          <span className="keys"><i style={{ background: HUMAN_COLORS[1] }} />interp. <i style={{ background: HUMAN_COLORS[2] }} />partial <i style={{ background: HUMAN_COLORS[3] }} />not</span>
        </div>
        <Calibration />
        <div className="rel-cap">
          Among reviewed features with score &lt; 0.5: <b>{d.n ? pct(d.k / d.n) : '—'}</b> of dense (n={d.n}) were judged at least partly interpretable, vs <b>{s.n ? pct(s.k / s.n) : '—'}</b> of sparse (n={s.n}).
        </div>
      </div>
    </div>
  )
}
