import { memo, useEffect, useMemo, useRef } from 'react'
import { cat, fmt } from '../aqi.js'
import { REGIONAL } from '../data/geo.js'
import { stamp, shortStamp, mmss, clock } from '../data/time.js'

function Spark({ R, series, reg, frame, onSeek, yMax }) {
  const W = 292, H = 58, N = R.data.N
  const x = (f) => (f / (N - 1)) * W
  const y = (v) => H - 3 - (Math.min(v, yMax) / yMax) * (H - 8)
  const line = (arr, step = 3) => {
    let d = ''
    for (let i = 0; i < N; i += step) {
      if (!Number.isFinite(arr[i])) continue
      d += `${d && Number.isFinite(arr[i - step]) ? 'L' : 'M'}${x(i).toFixed(1)} ${y(arr[i]).toFixed(1)}`
    }
    return d
  }
  const dS = useMemo(() => line(series), [series])
  const dR = useMemo(() => line(reg), [reg])
  const seekFrom = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(Math.round(((e.clientX - r.left) / r.width) * (N - 1)))
  }
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} onClick={seekFrom} role="img" aria-label="This sensor's readings over the whole replay. Click to jump to a time.">
      <line x1="0" x2={W} y1={y(55.5)} y2={y(55.5)} className="spark-ref" />
      <path d={dR} className="spark-reg" />
      <path d={dS} className="spark-line" />
      <line x1={x(frame)} x2={x(frame)} y1="0" y2={H} className="spark-now" />
      <circle cx={x(frame)} cy={Number.isFinite(series[frame]) ? y(series[frame]) : H - 3} r="3.4" className="spark-dot" />
    </svg>
  )
}

function SensorCard({ R, frame, metric, selected, onSeek }) {
  const d = R.data
  const isReg = selected === 'REG'
  const s = isReg ? null : d.sensors.find((q) => q.key === selected)
  const corrected = isReg ? d.regional.corrected : s.corrected
  const shown = isReg || metric === 'corrected' ? corrected : s.raw
  const online = isReg ? true : !!s.online[frame]
  const regNow = d.regional.corrected[frame]
  const v = shown[frame]
  const c = cat(corrected[frame])
  const ms = R.meta.startMs

  // peak for this sensor (online only) and last report if offline
  const { peakF, peakV, lastF } = useMemo(() => {
    let pf = 0, pv = -1
    for (let i = 0; i < d.N; i++) if ((isReg || s.online[i]) && corrected[i] > pv) { pv = corrected[i]; pf = i }
    let lf = -1
    if (!isReg) for (let i = frame; i >= 0; i--) if (s.online[i]) { lf = i; break }
    return { peakF: pf, peakV: pv, lastF: lf }
  }, [selected, frame, d])
  const yMax = Math.max(100, Math.ceil(d.peak.value / 50) * 50)
  const diff = v - regNow
  const seriesForSpark = useMemo(() => {
    if (isReg) return corrected
    const a = new Float32Array(d.N)
    for (let i = 0; i < d.N; i++) a[i] = s.online[i] ? corrected[i] : NaN
    return a
  }, [selected, d])

  return (
    <section className="panel sensor" aria-labelledby="sn-h">
      <div className="panel-head">
        <h2 id="sn-h">{isReg ? 'Regional monitor' : s.id}</h2>
        <span className={`pill ${online ? 'ok' : 'down'}`}>{isReg ? 'Official monitor' : online ? 'Online' : 'Offline'}</span>
      </div>
      <p className="sensor-where">{isReg ? REGIONAL.place : `${s.block} · ${s.hood}`}</p>
      {online ? (
        <div className="sensor-read">
          <span className="sensor-val" style={{ '--c': c.fill }}>
            <i style={{ background: c.fill }} />
            {fmt(v)}
            <small>µg/m³</small>
          </span>
          <span className="sensor-cat">{c.name}</span>
          {!isReg && (
            <span className="sensor-vs">
              <span>{Math.abs(diff) < 3 ? 'Same as regional' : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))} vs. regional monitor`}</span>
              <span>Raw {fmt(s.raw[frame])} · Humidity {s.rh[frame]}%</span>
            </span>
          )}
        </div>
      ) : (
        <div className="sensor-read">
          <span className="sensor-val off">No reading</span>
          <span className="sensor-cat">
            {lastF >= 0 ? `Last report ${shortStamp(ms, lastF)}, reading ${fmt(shown[lastF])}` : 'Not reporting yet'}
          </span>
          <span className="sensor-vs">Offline does not mean clean air; it means unknown.</span>
        </div>
      )}
      <Spark R={R} series={seriesForSpark} reg={d.regional.corrected} frame={frame} onSeek={onSeek} yMax={yMax} />
      <div className="spark-key">
        <span><i className="k-line" />{isReg ? 'Regional' : 'This sensor'}</span>
        {!isReg && <span><i className="k-dash" />Regional</span>}
        <button className="linkbtn" onClick={() => onSeek(peakF)} title="Jump to this sensor's highest reading">Peak {fmt(peakV)} · {shortStamp(ms, peakF)} →</button>
      </div>
    </section>
  )
}

const Cue = memo(function Cue({ cue, active, follow, ms, onSeek }) {
  return (
    <li>
      <button className={`cue${active ? ' active' : ''}${follow ? ' follow' : ''}`} onClick={() => onSeek(cue.f)} aria-current={active ? 'true' : undefined}>
        <span className="cue-t">{mmss(cue.n0)}</span>
        <span className="cue-body">
          <span className="cue-text">{cue.text}</span>
          <span className="cue-when">{shortStamp(ms, cue.f)}</span>
        </span>
      </button>
    </li>
  )
})

function Transcript({ R, cueIdx, lastCue, onSeek }) {
  const box = useRef(null)
  const reduce = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])
  const first = useRef(true)
  useEffect(() => {
    const b = box.current
    const el = b?.querySelector('.cue.follow')
    if (!el) return
    // keep the live line a little below the top so the line before it stays readable
    const top = el.getBoundingClientRect().top - b.getBoundingClientRect().top + b.scrollTop - 10
    b.scrollTo({ top: Math.max(0, top), behavior: reduce || first.current ? 'auto' : 'smooth' })
    first.current = false
  }, [lastCue, reduce])

  const groups = useMemo(() => R.chapters.map((c) => ({ c, cues: R.cues.filter((q) => q.chapter === c.index) })), [R])
  return (
    <section className="panel transcript" aria-labelledby="tr-h">
      <div className="panel-head">
        <h2 id="tr-h">Transcript</h2>
        {R.cues.length > 0 && <span className="panel-note">click a line to jump there</span>}
      </div>
      {R.cues.length === 0 ? (
        <p className="empty">This replay has no narration, captions, or transcript. The timeline, speed controls, and your bookmarks all still work.</p>
      ) : (
        <div className="tr-scroll" ref={box} tabIndex={-1}>
          {groups.map(({ c, cues }) => (
            <div key={c.title}>
              <h3 className="tr-chap"><span>{c.index + 1}</span>{c.title}</h3>
              <ul>
                {cues.map((q) => (
                  <Cue key={q.i} cue={q} active={q.i === cueIdx} follow={q.i === lastCue} ms={R.meta.startMs} onSeek={onSeek} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default memo(Right)
function Right({ R, frame, metric, selected, cueIdx, lastCue, onSeek }) {
  return (
    <aside className="right" aria-label="Selected sensor and transcript">
      <SensorCard R={R} frame={frame} metric={metric} selected={selected} onSeek={onSeek} />
      <Transcript R={R} cueIdx={cueIdx} lastCue={lastCue} onSeek={onSeek} />
    </aside>
  )
}
