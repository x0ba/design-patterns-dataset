import { LABOR_LOAD, LABOR_START, LAST_WEEK, MISSING, NE_LANDED_PCT, REAL_DECLINE, REPORTED, todayCurve, typicalCurve } from '../data/feed'
import { minToClock } from '../time'

/** Cumulative share of expected Northeast rows landed, today vs. the usual Monday. */
export function FeedChart({ nowMin }: { nowMin: number }) {
  const W = 620, H = 270, L = 40, R = 14, T = 34, B = 30
  const t0 = 2 * 60, t1 = 8 * 60
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - R)
  const y = (v: number) => T + (1 - v / 100) * (H - T - B)
  const pts = (fn: (t: number) => number, from: number, to: number) => {
    const out: string[] = []
    for (let t = from; t <= to; t += 4) out.push(`${x(t).toFixed(1)},${y(fn(t)).toFixed(1)}`)
    out.push(`${x(to).toFixed(1)},${y(fn(to)).toFixed(1)}`)
    return out.join(' ')
  }
  const end = Math.min(nowMin, t1)
  const todayLine = pts(todayCurve, t0, end)
  const area = `${x(t0)},${y(0)} ${todayLine} ${x(end)},${y(0)}`
  const marks = [
    { t: 4 * 60 + 15, label: 'Usually complete 4:15', color: '#5d6670', anchor: 'end' as const },
    { t: 5 * 60 + 15, label: 'Report refreshed 5:15', color: '#5d6670', anchor: 'start' as const },
    { t: 8 * 60, label: 'Review 8:00', color: '#17324d', anchor: 'end' as const },
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Northeast POS rows landed: ${NE_LANDED_PCT.toFixed(0)} percent of expected since 5:00 AM, usually complete by 4:15 AM`}>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" className="axis">{v}%</text>
        </g>
      ))}
      {[2, 3, 4, 5, 6, 7, 8].map((hh) => (
        <text key={hh} x={x(hh * 60)} y={H - 10} textAnchor="middle" className="axis">{hh} AM</text>
      ))}
      <line x1={L} x2={W - R} y1={y(95)} y2={y(95)} className="thresh" />
      <text x={W - R} y={y(95) + 13} textAnchor="end" className="axis-soft">95% = complete enough to trust</text>
      {marks.map((m) => (
        <g key={m.label}>
          <line x1={x(m.t)} x2={x(m.t)} y1={T - 6} y2={H - B} stroke={m.color} strokeDasharray="2 3" opacity={0.7} />
          <text x={x(m.t) + (m.anchor === 'end' ? -4 : 4)} y={T - 12} textAnchor={m.anchor} className="mark" fill={m.color}>{m.label}</text>
        </g>
      ))}
      <polyline points={pts(typicalCurve, t0, 4 * 60 + 15) + ` ${x(t1)},${y(100)}`} className="line-typical" fill="none" />
      <polygon points={area} className="area-today" />
      <polyline points={todayLine} className="line-today" fill="none" />
      <line x1={x(end)} x2={x(end)} y1={T} y2={H - B} className="now-line" />
      <circle cx={x(end)} cy={y(NE_LANDED_PCT)} r={4.5} className="now-dot" />
      <text x={x(end) + 8} y={y(NE_LANDED_PCT) - 10} className="callout">{NE_LANDED_PCT.toFixed(0)}% since 5:00 AM</text>
      <text x={x(end) - 6} y={H - B - 8} textAnchor="end" className="axis-now">now {minToClock(nowMin)}</text>
      <text x={x(3 * 60 + 26)} y={y(78)} textAnchor="end" className="legend-typical">usual Monday</text>
    </svg>
  )
}

/** Revenue bridge: last week → real decline → not yet landed → reported. */
export function Bridge() {
  const W = 620, H = 210, L = 12, R = 12, T = 30, B = 46
  const max = LAST_WEEK * 1.04
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const bw = 96
  const gap = (W - L - R - bw * 4) / 3
  const bx = (i: number) => L + i * (bw + gap)
  const lw = LAST_WEEK
  const afterReal = LAST_WEEK - REAL_DECLINE
  const items = [
    { label: 'Last week', top: lw, bottom: 0, val: `$${lw.toFixed(2)}M`, cls: 'bar-base', level: lw },
    { label: 'Real decline (est.)', top: lw, bottom: afterReal, val: `−$${REAL_DECLINE.toFixed(2)}M`, cls: 'bar-real', level: afterReal },
    { label: 'Not yet landed', top: afterReal, bottom: REPORTED, val: `−$${MISSING.toFixed(2)}M`, cls: 'bar-missing', level: REPORTED },
    { label: 'Reported at 5:18 AM', top: REPORTED, bottom: 0, val: `$${REPORTED.toFixed(2)}M`, cls: 'bar-reported', level: REPORTED },
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Revenue bridge: last week ${lw.toFixed(2)} million dollars, minus ${REAL_DECLINE.toFixed(2)} million real decline, minus ${MISSING.toFixed(2)} million not yet landed, equals ${REPORTED.toFixed(2)} million reported`}>
      {items.map((it, i) => (
        <g key={it.label}>
          <rect x={bx(i)} y={y(it.top)} width={bw} height={Math.max(2, y(it.bottom) - y(it.top))} rx={3} className={it.cls} />
          <text x={bx(i) + bw / 2} y={y(it.top) - 7} textAnchor="middle" className="bar-val">{it.val}</text>
          <text x={bx(i) + bw / 2} y={H - 24} textAnchor="middle" className="bar-label">{it.label}</text>
          {i < 3 && <line x1={bx(i) + bw} x2={bx(i + 1)} y1={y(it.level)} y2={y(it.level)} className="connector" />}
        </g>
      ))}
    </svg>
  )
}

/** p95 load time with the 12 s limit. */
export function LoadChart() {
  const W = 620, H = 220, L = 40, R = 14, T = 30, B = 28
  const t0 = LABOR_START, t1 = LABOR_START + (LABOR_LOAD.length - 1) * 5
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - R)
  const ymax = 20
  const y = (v: number) => T + (1 - v / ymax) * (H - T - B)
  const pts = LABOR_LOAD.map((v, i) => `${x(t0 + i * 5).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = LABOR_LOAD[LABOR_LOAD.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Labor Hours report p95 load time rose from about 6 seconds to ${last} seconds, above the 12 second limit`}>
      {[0, 5, 10, 15, 20].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" className="axis">{v}s</text>
        </g>
      ))}
      {[4, 5, 6].map((hh) => (
        <text key={hh} x={x(hh * 60)} y={H - 8} textAnchor="middle" className="axis">{hh}:00 AM</text>
      ))}
      <rect x={L} y={T} width={W - L - R} height={y(12) - T} className="over-zone" />
      <line x1={L} x2={W - R} y1={y(12)} y2={y(12)} className="limit" />
      <text x={L + 6} y={y(12) - 6} className="mark" fill="#b42318">12 s limit</text>
      <line x1={x(5 * 60 + 42)} x2={x(5 * 60 + 42)} y1={T} y2={H - B} stroke="#5d6670" strokeDasharray="2 3" opacity={0.7} />
      <text x={x(5 * 60 + 42) - 4} y={T - 10} textAnchor="end" className="mark" fill="#5d6670">report refresh 5:42</text>
      <polyline points={pts} className="line-load" fill="none" />
      <circle cx={x(t1)} cy={y(last)} r={4.5} className="now-dot" />
      <text x={x(t1) - 12} y={y(last) - 4} textAnchor="end" className="callout">{last} s now</text>
    </svg>
  )
}

export function MiniBars({ values, color = '#5d6670', h = 28 }: { values: number[]; color?: string; h?: number }) {
  const max = Math.max(1, ...values)
  const w = 3, gap = 1.5
  return (
    <svg width={values.length * (w + gap)} height={h} aria-hidden>
      {values.map((v, i) => (
        <rect key={i} x={i * (w + gap)} y={h - Math.max(v ? 2 : 0.5, (v / max) * h)} width={w} height={Math.max(v ? 2 : 0.5, (v / max) * h)} fill={v ? color : '#d9d6cc'} rx={1} />
      ))}
    </svg>
  )
}
