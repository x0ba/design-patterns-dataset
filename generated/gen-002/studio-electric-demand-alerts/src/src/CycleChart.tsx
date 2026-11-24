import { useMemo, useState } from 'react'
import { PEAK_AT, PEAK_KW, SERIES } from './data'
import { Alert } from './model'
import { CYCLE_END, CYCLE_START, DAY, dayStart, fmtDate, fmtStamp, fmtTime, NOW } from './time'

interface Row {
  label: string
  alerts: Alert[]
  tone: 'old' | 'new'
}

export function CycleChart({
  width = 1100,
  height = 190,
  rows = [],
  fixedKw,
  guardKw,
}: {
  width?: number
  height?: number
  rows?: Row[]
  fixedKw?: number | null
  guardKw?: number | null
}) {
  const [hover, setHover] = useState<number | null>(null)
  const rowH = 22
  const M = { l: 30, r: 8, t: 10, b: 20 }
  const markH = rows.length * rowH
  const plotB = height - M.b - markH
  const x = (m: number) => M.l + ((m - CYCLE_START) / (CYCLE_END - CYCLE_START)) * (width - M.l - M.r)
  const y = (kw: number) => M.t + (1 - kw / 24) * (plotB - M.t)

  const path = useMemo(() => {
    // draw demand as bars: one vertical stroke per reading keeps spikes crisp
    let d = ''
    for (let i = 0; i < SERIES.n; i++) {
      const px = x(SERIES.t[i])
      d += `M${px.toFixed(1)} ${plotB}V${y(SERIES.kw[i]).toFixed(1)}`
    }
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, rows.length])

  const days: number[] = []
  for (let d = dayStart(CYCLE_START) + DAY; d <= CYCLE_END; d += DAY) days.push(d)

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * width
    const m = CYCLE_START + ((px - M.l) / (width - M.l - M.r)) * (CYCLE_END - CYCLE_START)
    const i = Math.round((m - CYCLE_START) / 15)
    setHover(i >= 0 && i < SERIES.n ? i : null)
  }

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Demand across the billing cycle, Oct 28 to Nov 27" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <pattern id="future" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#e5ddd0" strokeWidth="1.2" />
          </pattern>
        </defs>
        {[0, 10, 20].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={width - M.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end" className="ax">
              {v}
            </text>
          </g>
        ))}
        <rect x={x(NOW)} y={M.t} width={x(CYCLE_END) - x(NOW)} height={plotB - M.t} fill="url(#future)" />
        <path d={path} className="cyc-bars" />
        {fixedKw != null && <line x1={M.l} x2={width - M.r} y1={y(fixedKw)} y2={y(fixedKw)} className="ln-fixed" />}
        {guardKw != null && <line x1={M.l} x2={width - M.r} y1={y(guardKw)} y2={y(guardKw)} className="ln-guard" />}
        <line x1={M.l} x2={width - M.r} y1={y(PEAK_KW)} y2={y(PEAK_KW)} className="ln-peak" />
        <circle cx={x(PEAK_AT)} cy={y(PEAK_KW)} r={4.5} className="peak-dot" />
        <text x={x(PEAK_AT) + 9} y={y(PEAK_KW) - 5} className="ln-l peak-l">
          {PEAK_KW} kW · Nov 4, 6:15 pm
        </text>
        <text x={x(NOW) + 6} y={y(3)} className="ax-d">
          11 days left in cycle
        </text>

        {rows.map((r, ri) => {
          const cy = plotB + ri * rowH + rowH / 2 + 2
          return (
            <g key={r.label}>
              <line x1={M.l} x2={width - M.r} y1={cy} y2={cy} className="mk-row" />
              <text x={width - M.r - 4} y={cy + 4} textAnchor="end" className="row-l">
                {r.label}
              </text>
              {r.alerts.map((a) => (
                <circle key={a.i} cx={x(a.t)} cy={cy} r={5} className={r.tone === 'old' ? 'dot-old' : 'dot-new'} />
              ))}
            </g>
          )
        })}

        <line x1={M.l} x2={width - M.r} y1={height - M.b} y2={height - M.b} className="axis" />
        {days.map((d, i) =>
          i % 3 === 0 || d === dayStart(NOW) ? (
            <g key={d}>
              <line x1={x(d)} x2={x(d)} y1={height - M.b} y2={height - M.b + 4} className="axis" />
              <text x={x(d)} y={height - 5} textAnchor="middle" className="ax">
                {fmtDate(d)}
              </text>
            </g>
          ) : null,
        )}
        {hover != null && <line x1={x(SERIES.t[hover])} x2={x(SERIES.t[hover])} y1={M.t} y2={plotB} className="hover-ln" />}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: `${(x(SERIES.t[hover]) / width) * 100}%`, top: 4, transform: x(SERIES.t[hover]) > width * 0.6 ? 'translateX(-108%)' : 'translateX(12px)' }}>
          <div className="tip-h">
            {fmtStamp(SERIES.t[hover])}–{fmtTime(SERIES.t[hover] + 15)}
          </div>
          <div className="tip-r tot">
            <span>15-min demand</span>
            <b>{SERIES.kw[hover].toFixed(1)} kW</b>
          </div>
        </div>
      )}
    </div>
  )
}
