import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, StepBack, StepFwd } from './Icons.jsx'
import { CATS, fmt } from '../aqi.js'
import { parts, clock, shortStamp, stamp, mmss } from '../data/time.js'

const PAD = { l: 38, r: 12 }
const H = { chap: 22, top: 33, chartH: 80, lane: 12, axis: 18 }
const SPEEDS = [0.5, 1, 2, 4]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const Chart = memo(function Chart({ R, metric, W, yMax }) {
  const d = R.data
  const N = d.N
  const iw = W - PAD.l - PAD.r
  const x = (f) => PAD.l + (f / (N - 1)) * iw
  const y0 = H.top
  const y1 = H.top + H.chartH
  const y = (v) => y1 - (Math.min(v, yMax) / yMax) * H.chartH
  const ser = d.series[metric]

  const path = (arr) => {
    let s = ''
    let pen = false
    for (let i = 0; i < N; i++) {
      const v = arr[i]
      if (!Number.isFinite(v)) { pen = false; continue }
      s += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`
      pen = true
    }
    return s
  }
  const median = useMemo(() => path(ser.median) + `L${x(N - 1)} ${y1}L${x(0)} ${y1}Z`, [ser, W])
  const school = useMemo(() => path(ser.school), [ser, W])
  const regional = useMemo(() => path(d.regional.corrected), [d, W])

  // background bands by category
  const bands = []
  let lo = 0
  for (const c of CATS) {
    const hi = Math.min(c.max === Infinity ? yMax : c.max + 0.6, yMax)
    if (lo >= yMax) break
    bands.push({ c, y: y(hi), h: y(lo) - y(hi) })
    lo = hi
  }
  const gridStep = yMax <= 250 ? 50 : 100
  const grid = []
  for (let v = 0; v <= yMax; v += gridStep) grid.push(v)

  // day ticks
  const ticks = []
  for (let i = 0; i < N; i++) {
    const p = parts(R.meta.startMs, i)
    if (i === 0 || (p.h === 0 && p.m === 0)) ticks.push({ i, label: `${DAYS[p.dow]} ${p.day}`, mid: p.h === 0 && p.m === 0 })
    else if (p.h === 12 && p.m === 0) ticks.push({ i, label: '', noon: true })
  }

  // offline lane
  const maxOff = Math.max(1, ...d.offline)
  let lane = ''
  {
    const ly1 = y1 + 6 + H.lane
    for (let i = 0; i < N; i++) {
      const hgt = (d.offline[i] / maxOff) * H.lane
      lane += `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${(ly1 - hgt).toFixed(1)}`
    }
    lane += `L${x(N - 1)} ${ly1}L${x(0)} ${ly1}Z`
  }

  return (
    <g>
      {bands.map((b) => (
        <rect key={b.c.key} x={PAD.l} y={b.y} width={iw} height={Math.max(0, b.h)} fill={b.c.fill} opacity="0.13" />
      ))}
      {grid.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="gridline" />
          <text x={PAD.l - 6} y={y(v) + 3.5} textAnchor="end" className="axis-t">{v}</text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={t.i}>
          <line x1={x(t.i)} x2={x(t.i)} y1={y0} y2={y1 + 6 + H.lane} className={t.mid || t.i === 0 ? 'daytick' : 'noontick'} />
          {t.label && <text x={x(t.i) + 5} y={y1 + 6 + H.lane + 13} className="axis-t day">{t.label}</text>}
        </g>
      ))}
      <path d={median} className="median-area" />
      <path d={regional} className="reg-line" />
      <path d={school} className="school-line" />
      <path d={lane} className="lane-area" />
      <text x={PAD.l - 6} y={y1 + 6 + H.lane - 1} textAnchor="end" className="axis-t lane-t">offline</text>
    </g>
  )
})

function Timeline({ R, t, metric, W, yMax, bookmarks, clip, chapterIdx, onSeek, setPlaying, playing, onAddBookmark }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)
  const drag = useRef({ on: false, was: false })
  const d = R.data
  const N = d.N
  const iw = W - PAD.l - PAD.r
  const x = (f) => PAD.l + (f / (N - 1)) * iw
  const y1 = H.top + H.chartH
  const y = (v) => y1 - (Math.min(v, yMax) / yMax) * H.chartH
  const frameAtEvent = (e) => {
    const r = svgRef.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    return Math.min(N - 1, Math.max(0, Math.round(((px - PAD.l) / iw) * (N - 1))))
  }
  const down = (e) => {
    if (e.button !== 0) return
    drag.current = { on: true, was: playing }
    setPlaying(false)
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeek(frameAtEvent(e))
  }
  const move = (e) => {
    const f = frameAtEvent(e)
    setHover({ f, px: ((e.clientX - svgRef.current.getBoundingClientRect().left)) })
    if (drag.current.on) onSeek(f)
  }
  const up = () => {
    if (drag.current.on && drag.current.was) setPlaying(true)
    drag.current.on = false
  }
  const frame = Math.round(t)
  const ms = R.meta.startMs
  const pk = R.keyMoments.find((k) => k.kind === 'peak')
  const al = R.keyMoments.find((k) => k.kind === 'alert')
  const sc = d.series[metric].school
  const clipEnd = clip.in != null ? (clip.out != null ? clip.out : Math.max(clip.in, t)) : null

  const hv = hover
  const tipRight = hv ? hv.px < W - 190 : true

  return (
    <div className="timeline">
      <svg
        ref={svgRef}
        className="tl-svg"
        width={W}
        height={H.top + H.chartH + 6 + H.lane + H.axis}
        viewBox={`0 0 ${W} ${H.top + H.chartH + 6 + H.lane + H.axis}`}
        role="slider"
        tabIndex={0}
        aria-label="Replay timeline"
        aria-valuemin={0}
        aria-valuemax={N - 1}
        aria-valuenow={frame}
        aria-valuetext={stamp(ms, frame)}
        aria-keyshortcuts="ArrowLeft ArrowRight"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => !drag.current.on && setHover(null)}
      >
        {/* chapter strip */}
        <g>
          {R.chapters.map((c, i) => {
            const x0 = x(c.f0)
            const x1 = x(c.f1)
            const wide = x1 - x0 > 110
            return (
              <g key={c.title} className={`tl-chap${i === chapterIdx ? ' on' : ''}`}>
                <title>{`${i + 1}. ${c.title} (${mmss(c.dur)})`}</title>
                <rect x={x0 + 0.5} y="0" width={Math.max(1, x1 - x0 - 1)} height={H.chap} rx="4" />
                <text x={x0 + 8} y="15" className="tl-chap-t">
                  <tspan className="n">{i + 1}</tspan>
                  {wide ? <tspan dx="6">{c.title}</tspan> : null}
                </text>
              </g>
            )
          })}
        </g>

        <Chart R={R} metric={metric} W={W} yMax={yMax} />

        {/* clip */}
        {clipEnd != null && (
          <g className="tl-clip">
            <rect x={x(clip.in)} y={H.top} width={Math.max(0, x(clipEnd) - x(clip.in))} height={H.chartH} className={clip.out != null ? 'clip-fill' : 'clip-fill draft'} />
            <line x1={x(clip.in)} x2={x(clip.in)} y1={H.top - 4} y2={y1} className="clip-edge" />
            <text x={x(clip.in) - 3} y={H.top - 5} textAnchor="end" className="clip-t">IN</text>
            {clip.out != null && (
              <>
                <line x1={x(clip.out)} x2={x(clip.out)} y1={H.top - 4} y2={y1} className="clip-edge" />
                <text x={x(clip.out) + 3} y={H.top - 5} className="clip-t">OUT</text>
              </>
            )}
          </g>
        )}

        {/* key moments */}
        {al && (
          <g className="km">
            <line x1={x(al.frame)} x2={x(al.frame)} y1={H.top} y2={y1} className="km-line" />
            <text x={x(al.frame) + (x(al.frame) > W - 200 ? -6 : 6)} y={H.top + 11} textAnchor={x(al.frame) > W - 200 ? 'end' : 'start'} className="km-t">
              {al.label} · {clock(ms, al.frame)}
            </text>
          </g>
        )}
        {pk && (
          <g className="km">
            <circle cx={x(pk.frame)} cy={y(pk.value)} r="4.5" className="km-dot" />
            <text x={x(pk.frame) + (x(pk.frame) < 220 ? 9 : -9)} y={y(pk.value) + 4} textAnchor={x(pk.frame) < 220 ? 'start' : 'end'} className="km-t">
              Peak {fmt(pk.value)} · {clock(ms, pk.frame)}
            </text>
          </g>
        )}

        {/* bookmarks */}
        {bookmarks.map((b) => (
          <g key={b.id} className="tl-bm" transform={`translate(${x(b.f)} ${y1})`} onPointerDown={(e) => e.stopPropagation()} onClick={() => onSeek(b.f)}>
            <title>{`${stamp(ms, b.f)}${b.note ? ': ' + b.note : ''}`}</title>
            <line y1="0" y2="-14" />
            <path d="M0 -14 H9 L6.5 -10.5 L9 -7 H0 Z" />
            <rect x="-6" y="-16" width="16" height="18" fill="transparent" />
          </g>
        ))}

        {/* hover */}
        {hv && !drag.current.on && (
          <line x1={x(hv.f)} x2={x(hv.f)} y1={H.top} y2={y1} className="hover-line" />
        )}

        {/* playhead */}
        <g className="playhead" transform={`translate(${x(t)} 0)`}>
          <line y1={H.chap + 2} y2={y1 + 6 + H.lane} />
          <path d={`M-6 ${H.chap + 1} H6 V${H.chap + 9} L0 ${H.chap + 15} L-6 ${H.chap + 9} Z`} />
        </g>
      </svg>

      {hv && (
        <div className={`tl-tip ${tipRight ? 'r' : 'l'}`} style={{ left: hv.px }} role="presentation">
          <b>{stamp(ms, hv.f)}</b>
          <span><i className="k-school" /> Linden area <strong>{fmt(sc[hv.f])}</strong></span>
          <span><i className="k-reg" /> Regional <strong>{fmt(d.regional.corrected[hv.f])}</strong></span>
        </div>
      )}

      <div className="tl-key" aria-hidden="true">
        <span><i className="ln school" />Linden Elementary area</span>
        <span><i className="ln reg" />Regional monitor</span>
        <span><i className="ln med" />All sensors (median)</span>
      </div>
    </div>
  )
}

export default function Dock(p) {
  const { R, t, frame, nar, stampLong, chapter, playing, speed, setSpeed, metric, togglePlay, onStep, onJump, onSeek, setPlaying, bookmarks, clip, chapterIdx } = p
  const box = useRef(null)
  const [W, setW] = useState(1100)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const yMax = Math.max(100, Math.ceil(R.data.peak.value / 50) * 50)
  const narrated = R.chapters.length > 0
  const total = R.map.total

  return (
    <footer className="dock" aria-label="Playback">
      <div className="transport">
        <div className="tp-btns" role="group" aria-label="Playback controls">
          <button className="tbtn" onClick={() => onJump(-1)} aria-label={narrated ? 'Previous chapter' : 'Previous key moment'} title={narrated ? 'Previous chapter  [' : 'Previous key moment  ['}><StepBack /></button>
          <button className="tbtn txt" onClick={() => onStep(-6)} title="Back one hour (Shift+←)">−1 h</button>
          <button className="tbtn txt" onClick={() => onStep(-1)} title="Back one step, 10 minutes (←)">−10 m</button>
          <button className="play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (Space)">{playing ? <Pause width={22} height={22} /> : <Play width={22} height={22} />}</button>
          <button className="tbtn txt" onClick={() => onStep(1)} title="Forward one step, 10 minutes (→)">+10 m</button>
          <button className="tbtn txt" onClick={() => onStep(6)} title="Forward one hour (Shift+→)">+1 h</button>
          <button className="tbtn" onClick={() => onJump(1)} aria-label={narrated ? 'Next chapter' : 'Next key moment'} title={narrated ? 'Next chapter  ]' : 'Next key moment  ]'}><StepFwd /></button>
        </div>

        <div className="readout" aria-live="off">
          <div className="ro-time">{stampLong}</div>
          <div className="ro-sub">
            Step {(frame + 1).toLocaleString()} of {R.meta.frames.toLocaleString()}
            <span className="dotsep">·</span>
            {narrated ? <>Narration {mmss(nar)} / {mmss(total)}</> : <>Replay {mmss(nar)} / {mmss(total)}</>}
            {chapter && <><span className="dotsep">·</span>Chapter {chapter.index + 1}</>}
          </div>
        </div>

        <div className="speed" role="group" aria-label="Playback speed">
          <span className="speed-label">Speed</span>
          {SPEEDS.map((s) => (
            <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)} title={`Speed ${s}× (${SPEEDS.indexOf(s) + 1})`}>{s}×</button>
          ))}
        </div>
      </div>

      <div className="tl-box" ref={box}>
        <Timeline R={R} t={t} metric={metric} W={W} yMax={yMax} bookmarks={bookmarks} clip={clip} chapterIdx={chapterIdx} onSeek={onSeek} setPlaying={setPlaying} playing={playing} onAddBookmark={p.onAddBookmark} />
      </div>
    </footer>
  )
}
