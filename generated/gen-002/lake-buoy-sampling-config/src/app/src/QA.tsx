import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { FLAG_CODES, LAST_WINTER_ROC, QA_RULES, VAR_LABEL, WINTER_SERIES, runRoc, type QARule, type Series } from './data'
import { fmtNum, fmtQA, useApp } from './store'
import { ViewHeader, Was } from './ui'

const KIND: Record<QARule['kind'], string> = { range: 'Range', roc: 'Rate of change', flat: 'Flatline', cal: 'Calibration age' }

function NumIn({ value, onChange, step, disabled, w = 64, label }: { value: number; onChange: (v: number) => void; step: number; disabled?: boolean; w?: number; label: string }) {
  const [txt, setTxt] = useState(fmtNum(value).replace('−', '-'))
  useEffect(() => { setTxt(fmtNum(value).replace('−', '-')) }, [value])
  return (
    <input className="num" style={{ width: w }} type="number" step={step} value={txt} disabled={disabled} aria-label={label}
      onChange={(e) => { setTxt(e.target.value); const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(v) }} />
  )
}

export function QAView() {
  const { st, actions, locked, SOURCE } = useApp()
  const { draft, qaFocus } = st
  const condUnit = draft.units.cond
  const k = condUnit === 'µS/cm' ? 1000 : 1
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!st.scrollQA) return
    if (qaFocus === 'wt-roc') previewRef.current?.scrollIntoView({ block: 'start' })
    else document.getElementById(`qa-${qaFocus}`)?.scrollIntoView({ block: 'center' })
    actions.clearScrollQA()
  }, [st.scrollQA]) // eslint-disable-line

  return (
    <div className="view">
      <ViewHeader title="QA rules" sub="Run on every incoming sample while Winter 2026–27 is live. A failing sample keeps its value and gets the flag code alongside it." />

      <div>
        <div className="table-wrap">
          <table className="grid qa">
            <thead>
              <tr><th>Variable</th><th>Check</th><th>Limit</th><th>Flag</th><th>Applies to</th></tr>
            </thead>
            <tbody>
              {QA_RULES.map((r) => {
                const q = draft.qa[r.id], src = SOURCE.qa[r.id]
                const changed = JSON.stringify(q) !== JSON.stringify(src)
                const kk = r.varKey === 'cond' ? k : 1
                const unitLabel = r.varKey === 'cond' ? condUnit : r.varKey === 'wt' || r.varKey === 'airt' ? '°C' : r.varKey === 'do' ? 'mg/L' : r.varKey === 'chl' ? 'µg/L' : r.varKey === 'wind' ? 'm/s' : r.varKey === 'par' ? 'µmol m⁻² s⁻¹' : ''
                return (
                  <tr key={r.id} id={`qa-${r.id}`} className={qaFocus === r.id ? 'focus' : ''}>
                    <td className="s-var">{r.kind === 'cal' ? 'All sensors' : VAR_LABEL[r.varKey]}</td>
                    <td>{KIND[r.kind]}</td>
                    <td className={changed ? 'edited' : ''}>
                      {r.kind === 'range' && (
                        <span className="lim">
                          <NumIn label={`${r.id} min`} value={(q.min ?? 0) * kk} step={r.varKey === 'cond' && kk === 1 ? 0.005 : 0.5} disabled={locked} onChange={(v) => actions.setQA(r.id, { min: v / kk })} />
                          <span className="dim">to</span>
                          <NumIn label={`${r.id} max`} value={(q.max ?? 0) * kk} step={r.varKey === 'cond' && kk === 1 ? 0.05 : 1} disabled={locked} onChange={(v) => actions.setQA(r.id, { max: v / kk })} />
                          <span className="unit">{unitLabel}</span>
                        </span>
                      )}
                      {r.kind === 'roc' && r.id === 'wt-roc' && (
                        <span className="lim">
                          <span className="mono strong">{q.roc?.toFixed(1)} °C / 10 min</span>
                          {q.persist ? <span className="dim">· reverts ≤ {q.persist}</span> : null}
                          <button className="link small" onClick={() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Test against last winter ↓</button>
                        </span>
                      )}
                      {r.kind === 'roc' && r.id !== 'wt-roc' && (
                        <span className="lim">
                          <NumIn label={`${r.id} limit`} value={q.roc ?? 0} step={0.1} disabled={locked} onChange={(v) => actions.setQA(r.id, { roc: v })} />
                          <span className="unit">{unitLabel} / 10 min</span>
                        </span>
                      )}
                      {r.kind === 'flat' && (
                        <span className="lim">
                          <NumIn label="flatline samples" value={q.roc ?? 6} step={1} w={52} disabled={locked} onChange={(v) => actions.setQA(r.id, { roc: Math.max(2, Math.round(v)) })} />
                          <span className="unit">{r.note}</span>
                        </span>
                      )}
                      {r.kind === 'cal' && <span className="dim">{r.note}</span>}
                      {changed && <div><Was>{fmtQA(r.id, src, condUnit)}</Was></div>}
                    </td>
                    <td><span className="flag">{r.flag}</span></td>
                    <td className="dim">{r.scope}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="qa-flags">
            <span className="k">Flag codes</span>
            {FLAG_CODES.map((f) => <span key={f.code} className="item"><span className="flag">{f.code}</span>{f.label}{!f.auto && <span className="dim">(by hand)</span>}</span>)}
          </div>
          {condUnit !== SOURCE.units.cond && <p className="note">Conductivity limits shown in {condUnit} because the draft changes the station unit. Stored rule is unchanged.</p>}
        </div>


      </div>

      <div ref={previewRef}>
        <SpikePreview />
      </div>
    </div>
  )
}

function SpikePreview() {
  const { st, actions, locked, SOURCE } = useApp()
  const q = st.draft.qa['wt-roc']
  const src = SOURCE.qa['wt-roc']
  const [node, setNode] = useState(WINTER_SERIES[0].id)
  const thr = q.roc ?? 1.5
  const persist = q.persist ?? 0

  const res = useMemo(() => WINTER_SERIES.map((s) => ({ s, now: runRoc(s, thr, persist), was: runRoc(s, src.roc ?? 1.5, src.persist ?? 0) })), [thr, persist, src])
  const sum = (key: 'now' | 'was') => res.reduce((a, r) => ({
    n: a.n + r[key].flagged.length, mix: a.mix + r[key].onMixing, caught: a.caught + r[key].faultsCaught, faults: a.faults + r[key].faultsTotal,
  }), { n: 0, mix: 0, caught: 0, faults: 0 })
  const now = sum('now'), was = sum('was')
  const cur = res.find((r) => r.s.id === node)!

  return (
    <section className="panel spike">
      <div className="panel-head">
        <div>
          <h2>Water temperature rate of change — test against last winter</h2>
          <p className="sub">
            Under-ice thermistor data, Jan 4 – Mar 21, 2026. Shaded bands are the events you reviewed in March as real mixing ({LAST_WINTER_ROC.mix} of the {LAST_WINTER_ROC.n} S flags were reclassified P). × marks the sensor faults you kept flagged.
          </p>
        </div>
      </div>

      <div className="spike-controls">
        <div className="ctl">
          <label htmlFor="thr">Flag a step larger than</label>
          <div className="ctl-row">
            <input id="thr" type="range" min={0.5} max={5} step={0.1} value={thr} disabled={locked}
              onChange={(e) => actions.setQA('wt-roc', { roc: +(+e.target.value).toFixed(1) })} />
            <span className="mono strong">{thr.toFixed(1)} °C</span><span className="dim">per 10 min</span>
          </div>
        </div>
        <div className="ctl">
          <label htmlFor="persist">Spike shape check</label>
          <select id="persist" value={persist} disabled={locked} onChange={(e) => actions.setQA('wt-roc', { persist: +e.target.value })}>
            <option value={0}>Off — flag every large step</option>
            <option value={1}>Only if it reverts on the next sample</option>
            <option value={2}>Only if it reverts within 2 samples (20 min)</option>
            <option value={3}>Only if it reverts within 3 samples (30 min)</option>
            <option value={6}>Only if it reverts within 6 samples (1 h)</option>
          </select>
        </div>

        <table className="mini">
          <thead><tr><th /><th>Flags raised</th><th>On real mixing</th><th>Faults caught</th></tr></thead>
          <tbody>
            <tr>
              <td className="dim">Last winter's rule · {src.roc?.toFixed(1)} °C, no shape check</td>
              <td className="mono">{was.n}</td><td className="mono">{was.mix}</td><td className="mono">{was.caught} / {was.faults}</td>
            </tr>
            <tr className="strong">
              <td>Draft rule</td>
              <td className="mono">{now.n}</td>
              <td className={`mono ${now.mix === 0 ? 'good' : now.mix < was.mix ? '' : 'bad'}`}>{now.mix}</td>
              <td className={`mono ${now.caught < now.faults ? 'bad' : 'good'}`}>{now.caught} / {now.faults}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="node-tabs" role="tablist">
        {res.map((r) => (
          <button key={r.s.id} role="tab" aria-selected={node === r.s.id} className={node === r.s.id ? 'on' : ''} onClick={() => setNode(r.s.id)}>
            {r.s.label} <span className="dim">{r.now.flagged.length} flag{r.now.flagged.length === 1 ? '' : 's'}</span>
          </button>
        ))}
      </div>
      <SeriesChart s={cur.s} now={cur.now.flagged} was={cur.was.flagged} />
    </section>
  )
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(900)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(400, Math.round(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

const MON = ['Jan', 'Feb', 'Mar']
const dayLabel = (s: Series, i: number) => {
  const d = new Date(s.start + i * 600000)
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`
}

function SeriesChart({ s, now, was }: { s: Series; now: number[]; was: number[] }) {
  const [wrapRef, W] = useWidth()
  const [win, setWin] = useState<[number, number] | null>(null)
  useEffect(() => { setWin(null) }, [s])
  const H = 230, L = 78, R = 10, T = 36, B = 22
  const n = s.values.length
  const [a, b] = win ?? [0, n - 1]
  const faultSet = useMemo(() => new Set(s.faults), [s])
  const clean = s.values.filter((_, i) => !faultSet.has(i))
  const lo = Math.max(0, Math.floor((Math.min(...clean) - 0.2) * 2) / 2)
  const hi = Math.ceil((Math.max(...clean) + 0.2) * 2) / 2
  const x = (i: number) => L + ((i - a) / (b - a)) * (W - L - R)
  const y = (v: number) => T + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (H - T - B)
  const inWin = (i: number) => i >= a && i <= b

  const path = useMemo(() => {
    if (win) {
      const pts: string[] = []
      for (let i = a; i <= b; i++) if (!faultSet.has(i)) pts.push(`${x(i).toFixed(1)},${y(s.values[i]).toFixed(1)}`)
      return `M${pts.join('L')}`
    }
    const step = 6
    const up: string[] = [], dn: string[] = []
    for (let i = 0; i < n; i += step) {
      let mn = Infinity, mx = -Infinity
      for (let k = i; k < Math.min(n, i + step); k++) { if (faultSet.has(k)) continue; mn = Math.min(mn, s.values[k]); mx = Math.max(mx, s.values[k]) }
      if (mn === Infinity) continue
      up.push(`${x(i).toFixed(1)},${y(mx).toFixed(1)}`); dn.push(`${x(i).toFixed(1)},${y(mn).toFixed(1)}`)
    }
    return `M${up.join('L')}L${dn.reverse().join('L')}Z`
  }, [s, W, win]) // eslint-disable-line

  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += (hi - lo) > 3 ? 1 : 0.5) ticks.push(+v.toFixed(1))
  // x labels: month starts (series starts Jan 4) or days when zoomed
  const xl: { label: string; i: number }[] = win
    ? Array.from({ length: 4 }, (_, k) => Math.ceil(a / 144) * 144 + k * 144).filter((i) => i <= b).map((i) => ({ label: dayLabel(s, i), i }))
    : [{ label: 'Jan 4', i: 0 }, { label: 'Feb', i: 28 * 144 }, { label: 'Mar', i: 56 * 144 }]

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    if (win) return
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const px = e.clientX - r.left
    if (px < L) return
    let i = Math.round(((px - L) / (W - L - R)) * (n - 1))
    // snap to the nearest reviewed event (mixing front or fault) if one is close
    const events = [...s.mixing.map(([ma]) => ma), ...s.faults]
    const near = events.reduce((best, e) => (Math.abs(e - i) < Math.abs(best - i) ? e : best), events[0])
    if (near !== undefined) i = near
    const half = 216 // 1.5 days
    const c = Math.min(n - 1 - half, Math.max(half, i))
    setWin([c - half, c + half])
  }
  const tickCls = (i: number) => (faultSet.has(i) || faultSet.has(i - 1) ? 'f' : '')

  return (
    <div ref={wrapRef} className="chart-wrap">
      <div className="chart-bar">
        <span>{win ? <>Showing {dayLabel(s, a)} – {dayLabel(s, b)}, every 10-min sample</> : 'Click near an event to see 3 days of raw 10-min samples.'}</span>
        {win && <button className="link small" onClick={() => setWin(null)}>Back to full winter</button>}
      </div>
      <svg className={`chart ${win ? 'zoomed' : ''}`} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.label} water temperature with flags`} onClick={onClick}>
        <defs><clipPath id="plot"><rect x={L} y={0} width={W - L - R} height={H} /></clipPath></defs>
        <g clipPath="url(#plot)">
          {s.mixing.filter(([ma, mb]) => mb >= a && ma <= b).map(([ma, mb]) => <rect key={ma} x={x(ma)} y={T} width={Math.max(2, x(mb) - x(ma))} height={H - T - B} className="mixband" />)}
        </g>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={L - 6} y={y(t) + 3} className="axis" textAnchor="end">{t === ticks[ticks.length - 1] ? `${t.toFixed(1)} °C` : t.toFixed(1)}</text>
          </g>
        ))}
        {xl.map((m) => (
          <g key={m.i}>
            <line x1={x(m.i)} x2={x(m.i)} y1={T} y2={H - B} className="gridline" />
            <text x={x(m.i) + 4} y={H - 6} className="axis">{m.label}</text>
          </g>
        ))}
        <g clipPath="url(#plot)">
          <path d={path} className={win ? 'series-line' : 'series'} />
          {s.faults.filter(inWin).map((i) => {
            const v = s.values[i]
            const yy = v > hi ? T + 9 : v < lo ? H - B - 2 : y(v) + 4
            return (
              <g key={i}>
                <text x={x(i)} y={yy} className="fault" textAnchor="middle">×</text>
                {win && (v > hi || v < lo) && <text x={x(i) + 8} y={yy} className="axis">{v.toFixed(1)} °C (fault)</text>}
              </g>
            )
          })}
          {was.filter(inWin).map((i) => <line key={`w${i}`} x1={x(i)} x2={x(i)} y1={3} y2={13} className={`tick was ${tickCls(i)}`} />)}
          {now.filter(inWin).map((i) => <line key={`n${i}`} x1={x(i)} x2={x(i)} y1={19} y2={30} className={`tick now ${tickCls(i)}`} />)}
        </g>
        <text x={L - 8} y={12} className="axis lbl" textAnchor="end">Last winter</text>
        <text x={L - 8} y={28} className="axis lbl strong" textAnchor="end">Draft</text>
      </svg>
    </div>
  )
}
