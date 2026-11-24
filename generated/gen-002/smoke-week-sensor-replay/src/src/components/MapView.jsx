import { memo, useRef, useState } from 'react'
import { VIEW, VSTREETS, HSTREETS, SCHOOL, HOODS, LANDMARKS, REGIONAL } from '../data/geo.js'
import { CATS, cat, fmt } from '../aqi.js'
import { Cc } from './Icons.jsx'

const Base = memo(function Base() {
  return (
    <g>
      <rect x="-400" y="-200" width={VIEW.w + 800} height={VIEW.h + 400} fill="#efe8d7" />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx="720" cy="190" rx={90 + i * 55} ry={70 + i * 48} fill="none" stroke="#e3dac5" strokeWidth="1.2" />
      ))}
      <path
        d="M-400 -200 H96 V0 C72 70 112 130 86 200 C64 262 100 330 84 400 C76 440 92 470 88 500 V700 H-400 Z"
        fill="#c7d9dd"
      />
      <path d="M96 0 C72 70 112 130 86 200 C64 262 100 330 84 400 C76 440 92 470 88 500" fill="none" stroke="#a9c3c9" strokeWidth="1.5" />
      <text transform="translate(40 262) rotate(-90)" textAnchor="middle" className="map-river">MARLOW RIVER</text>

      {LANDMARKS.filter((l) => l.kind === 'park').map((l) => (
        <g key={l.label}>
          <rect x={l.x} y={l.y} width={l.w} height={l.h} rx="7" fill="#d3e2c0" stroke="#bcd0a6" />
          <text x={l.lx} y={l.ly} textAnchor="middle" className="map-park">{l.label}</text>
        </g>
      ))}

      {/* streets: casing then fill */}
      {[0, 1].map((pass) => (
        <g key={pass} stroke={pass ? '#fffdf7' : '#d8cfb9'} strokeWidth={pass ? 7 : 9.5} strokeLinecap="round">
          {VSTREETS.map((s) => (<line key={s.key} x1={s.x} y1="36" x2={s.x} y2="484" />))}
          {HSTREETS.map((s) => (<line key={s.n} x1="104" y1={s.y} x2="664" y2={s.y} />))}
        </g>
      ))}
      {VSTREETS.map((s) => (
        <text key={s.key} x={s.x} y="496" textAnchor="middle" className="map-street">{s.name}</text>
      ))}
      {HSTREETS.map((s) => (
        <text key={s.n} x="99" y={s.y - 11} className="map-street" textAnchor="start">{s.n}th St</text>
      ))}

      {HOODS.map((h) => (
        <text key={h.lines[0]} x={h.x} y={h.y} textAnchor="middle" className="map-hood">
          {h.lines.map((l, i) => (<tspan key={l} x={h.x} dy={i ? 11.5 : 0}>{l}</tspan>))}
        </text>
      ))}

      {/* landmarks */}
      <g>
        <rect x={SCHOOL.x} y={SCHOOL.y} width={SCHOOL.w} height={SCHOOL.h} rx="5" fill="#f1ddbd" stroke="#b58a52" strokeWidth="1.4" />
        <path d={`M${SCHOOL.x + 4} ${SCHOOL.y + 17} L${SCHOOL.x + SCHOOL.w / 2} ${SCHOOL.y + 5} L${SCHOOL.x + SCHOOL.w - 4} ${SCHOOL.y + 17}`} fill="none" stroke="#b58a52" strokeWidth="1.4" />
        <text x={SCHOOL.x + SCHOOL.w / 2} y={SCHOOL.y + 33} textAnchor="middle" className="map-school">LINDEN</text>
        <text x={SCHOOL.x + SCHOOL.w / 2} y={SCHOOL.y + 43} textAnchor="middle" className="map-school">ELEMENTARY</text>
      </g>
      {LANDMARKS.filter((l) => l.kind !== 'park').map((l) => (
        <g key={l.label}>
          <rect x={l.x} y={l.y + 5} width={l.w} height={l.h - 5} rx="2" fill="#e8d8b6" stroke="#b58a52" />
          <path d={`M${l.x - 2} ${l.y + 6} L${l.x + l.w / 2} ${l.y} L${l.x + l.w + 2} ${l.y + 6}`} fill="#e8d8b6" stroke="#b58a52" strokeLinejoin="round" />
          <text x={l.lx} y={l.ly} textAnchor="middle" className="map-poi">{l.label}</text>
        </g>
      ))}
    </g>
  )
})

function Dot({ s, frame, metric, selected, onSelect, onHover }) {
  const online = s.online[frame]
  const v = s[metric][frame]
  const c = cat(s.corrected[frame])
  const sel = selected === s.key
  return (
    <g
      className={`dot${sel ? ' sel' : ''}${online ? '' : ' off'}`}
      transform={`translate(${s.x} ${s.y})`}
      role="button"
      tabIndex={0}
      aria-pressed={sel}
      aria-label={`${s.id}, ${s.block}. ${online ? `${fmt(v)} micrograms per cubic meter, ${c.name}` : 'Offline'}`}
      onClick={() => onSelect(s.key)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onSelect(s.key) } }}
      onMouseEnter={(e) => onHover(e, s)}
      onMouseLeave={(e) => onHover(e, null)}
      onFocus={(e) => onHover(e, s)}
      onBlur={(e) => onHover(e, null)}
    >
      {sel && <circle r="16.5" className="ring" />}
      <circle r="11.5" className="halo" />
      {online ? (
        <>
          <circle r="11" fill={c.fill} className="body" />
          <text className="dot-num" fill={c.ink} y="3.7" textAnchor="middle">{fmt(v)}</text>
        </>
      ) : (
        <>
          <circle r="10.5" className="body-off" />
          <text className="dot-off" y="3" textAnchor="middle">off</text>
        </>
      )}
    </g>
  )
}

export default memo(MapView)
function MapView({ R, frame, stamp, metric, setMetric, selected, onSelect }) {
  const wrap = useRef(null)
  const [tip, setTip] = useState(null)
  const regV = R.data.regional.corrected[frame]
  const regCat = cat(regV)

  const onHover = (e, s) => {
    if (!s) return setTip(null)
    const r = e.currentTarget.getBoundingClientRect()
    const w = wrap.current.getBoundingClientRect()
    setTip({ s, x: r.left - w.left + r.width / 2, y: r.top - w.top })
  }
  const sorted = [...R.data.sensors].sort((a, b) => (a.key === selected) - (b.key === selected))

  return (
    <div className="map-wrap" ref={wrap}>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="map" style={{ overflow: 'visible' }} role="group" aria-label={`Sensor readings at ${stamp}`} preserveAspectRatio="xMidYMid meet">
        <Base />
        {sorted.map((s) => (
          <Dot key={s.key} s={s} frame={frame} metric={metric} selected={selected} onSelect={onSelect} onHover={onHover} />
        ))}
      </svg>

      <div className="off-key" aria-hidden="true"><i /> Dashed = sensor offline (no reading)</div>

      <div className="now-pill" aria-hidden="true">
        <span className="now-label">Showing</span>
        <span className="now-time">{stamp}</span>
      </div>

      <div className="metric-toggle" role="group" aria-label="Which reading to show">
        <button
          aria-pressed={metric === 'corrected'}
          onClick={() => setMetric('corrected')}
          title="Backyard sensors read high in damp air. This adjusts for that. Use these numbers when quoting."
        >
          Humidity-corrected
        </button>
        <button aria-pressed={metric === 'raw'} onClick={() => setMetric('raw')} title="What the sensor itself reported, before the humidity adjustment.">
          Raw sensor
        </button>
      </div>

      <button className={`reg-card${selected === 'REG' ? ' sel' : ''}`} onClick={() => onSelect('REG')} aria-pressed={selected === 'REG'}>
        <span className="reg-label">Regional monitor</span>
        <span className="reg-row">
          <span className="reg-sq" style={{ background: regCat.fill, color: regCat.ink }}>{fmt(regV)}</span>
          <span className="reg-cat">{regCat.short}</span>
        </span>
        <span className="reg-place">Delmar Rd, 3.4 km SE (off map)</span>
      </button>

      {tip && (
        <div className="tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <span className="tip-h"><strong>{tip.s.id}</strong> · {tip.s.hood}</span>
          <span>{tip.s.block}</span>
          <span className="tip-v">
            {tip.s.online[frame] ? `${fmt(tip.s[metric][frame])} µg/m³ · ${cat(tip.s.corrected[frame]).short}` : 'Offline: no reading'}
          </span>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, swatch, children, hint }) {
  return (
    <div className="stat" title={hint}>
      <div className="stat-label">{label}</div>
      <div className="stat-main">
        {swatch && <span className="stat-sw" style={{ background: swatch.fill }} aria-hidden="true" />}
        {children ?? (
          <>
            <span className="stat-val">{value}</span>
            <span className="stat-unit">µg/m³</span>
          </>
        )}
      </div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

export const StatStrip = memo(function StatStrip({ R, frame, metric }) {
  const d = R.data
  const school = d.series[metric].school[frame]
  const median = d.series[metric].median[frame]
  const reg = d.regional.corrected[frame]
  const total = d.sensors.length
  const online = total - d.offline[frame]
  const ratio = school / reg
  const gap =
    ratio >= 1.4 ? { big: `${ratio.toFixed(1)}×`, sub: 'higher than regional', tone: 'alarm' }
    : ratio <= 0.7 ? { big: `${ratio.toFixed(1)}×`, sub: 'lower than regional', tone: 'calm' }
    : { big: 'In step', sub: 'within a third of regional', tone: 'calm' }
  return (
    <div className="stats" role="group" aria-label="Readings at this moment">
      <Stat hint="Average of the 5 backyard sensors within a block or two of Linden Elementary" label="Linden Elementary area" value={fmt(school)} swatch={cat(d.series.corrected.school[frame])} sub={cat(d.series.corrected.school[frame]).short} />
      <Stat hint="The official regulatory monitor on Delmar Rd, 3.4 km southeast" label="Regional monitor" value={fmt(reg)} swatch={cat(reg)} sub={cat(reg).short} />
      <Stat hint="The middle reading across every volunteer sensor that is online" label="All volunteer sensors" value={fmt(median)} swatch={cat(d.series.corrected.median[frame])} sub={`Median · ${online} of ${total} online`} />
      <Stat hint="Linden-area average divided by the regional monitor" label="Linden vs. regional" sub={gap.sub}>
        <span className={`stat-val gap ${gap.tone}`}>{gap.big}</span>
      </Stat>
    </div>
  )
})

export const Legend = memo(function Legend() {
  return (
    <div className="legend" role="group" aria-label="Color key">
      <span className="legend-title" title="PM2.5 means fine smoke particles. µg/m³ is micrograms per cubic meter.">µg/m³</span>
      {CATS.map((c) => (
        <span className="legend-chip" key={c.key}>
          <i style={{ background: c.fill }} />
          <b>{c.key === 'usg' ? 'Sensitive' : c.short}</b>
          <em>{c.range}</em>
        </span>
      ))}
    </div>
  )
})

export const CaptionBand = memo(function CaptionBand({ R, cue, chapter, cc, setCC }) {
  const narrated = R.cues.length > 0
  return (
    <div className="captions" aria-label="Captions">
      <div className="cap-meta">
        {narrated ? (
          <>
            <span className="cap-chap">{chapter ? `Chapter ${chapter.index + 1}` : 'Intro'}</span>
            <span className="cap-name">{chapter?.title}</span>
          </>
        ) : (
          <span className="cap-name">No narration for this replay</span>
        )}
      </div>
      <p className={`cap-text${cue && cc ? '' : ' quiet'}`} aria-live="off">
        {!narrated ? 'Use the timeline, speed buttons, and bookmarks to explore it.' : !cc ? 'Captions are off.' : cue ? cue.text : 'Ama is letting the map speak for a moment.'}
      </p>
      {narrated && (
        <button className="cc-btn" aria-label="Captions" aria-pressed={cc} onClick={() => setCC((v) => !v)} title="Captions (C)">
          <Cc /> <span>Captions</span>
        </button>
      )}
    </div>
  )
})
