import { useMemo, useState } from 'react'
import { DEVICES, DeviceId, PEAK_KW, SERIES, SMALL_END, RATE } from './data'
import { BIG_HOURS, FIRST_FORECAST, GuardCfg, Loads, PLAN_FROM, PLAN_TO, guardLine, projectSlots } from './model'
import { at, EVENT_END, EVENT_START, fmtDayTime, fmtHour, fmtTime, NOW, STEP } from './time'

const W = 760
const H = 306
const M = { l: 34, r: 10, t: 46, b: 40 }
const YMAX = 26
const STACK: DeviceId[] = ['base', 'lights', 'heater', 'pug', 'small', 'big']

export function PlannerChart({
  glazeStart,
  loads,
  guard,
  fixedKw,
}: {
  glazeStart: number
  loads: Loads
  guard: GuardCfg
  fixedKw: number | null
}) {
  const [hover, setHover] = useState<number | null>(null)
  const slots = useMemo(() => projectSlots(glazeStart, loads), [glazeStart, loads])

  const x = (m: number) => M.l + ((m - PLAN_FROM) / (PLAN_TO - PLAN_FROM)) * (W - M.l - M.r)
  const y = (kw: number) => M.t + (1 - kw / YMAX) * (H - M.t - M.b)
  const slotW = x(PLAN_FROM + STEP) - x(PLAN_FROM)
  const base = y(0)

  // actual readings today, from noon
  const actual = useMemo(() => {
    const out: { t: number; kw: number }[] = []
    for (let i = 0; i < SERIES.n; i++) if (SERIES.t[i] >= PLAN_FROM) out.push({ t: SERIES.t[i], kw: SERIES.kw[i] })
    return out
  }, [])

  const mon = at(11, 16)
  const tue = at(11, 17)
  const onPeaks = [
    [mon + 16 * 60, mon + 21 * 60],
    [tue + 16 * 60, tue + 21 * 60],
  ]
  const glazeEnd = glazeStart + BIG_HOURS * 60
  const guardY = y(guardLine(guard))

  const ticks: number[] = []
  for (let t = PLAN_FROM; t <= PLAN_TO; t += 180) ticks.push(t)

  const hs = hover != null ? slots.find((s) => s.t === hover) : null
  const hAct = hover != null ? actual.find((s) => s.t === hover) : null

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const m = PLAN_FROM + ((px - M.l) / (W - M.l - M.r)) * (PLAN_TO - PLAN_FROM)
    const slot = Math.floor(m / STEP) * STEP
    if (slot >= PLAN_FROM && slot < PLAN_TO) setHover(slot)
    else setHover(null)
  }

  const flagGlaze = glazeStart >= PLAN_FROM && glazeStart < PLAN_TO
  const labelFlip = x(glazeStart) > W - 150
  const startText = (m: number) => (m >= at(11, 17) ? 'Tue ' : '') + fmtTime(m)

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Projected 15-minute demand in kilowatts from Monday noon to Tuesday 9 pm, against the 21.6 kW cycle peak"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#f6dcd6" />
            <rect width="2.4" height="7" fill="#e9b3a8" />
          </pattern>
        </defs>

        {/* y grid */}
        {[0, 5, 10, 15, 20, 25].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end" className="ax">
              {v}
            </text>
          </g>
        ))}
        <text x={M.l - 6} y={M.t - 6} textAnchor="end" className="ax-u">
          kW
        </text>

        {/* on-peak bands */}
        {onPeaks.map(([a, b], i) => (
          <g key={i}>
            <rect x={x(a)} y={M.t} width={x(b) - x(a)} height={base - M.t} className="onpeak" />
            <rect x={x(a)} y={base + 22} width={x(b) - x(a)} height={3} fill="#e6b04f" rx={1.5} />
            <text x={(x(a) + x(b)) / 2} y={base + 36} textAnchor="middle" className="band-l">
              {i === 0 ? `On-peak $${RATE.onPeak.toFixed(2)}` : 'On-peak'}
            </text>
          </g>
        ))}
        {/* event window */}
        <rect x={x(EVENT_START)} y={M.t} width={x(EVENT_END) - x(EVENT_START)} height={base - M.t} fill="url(#hatch)" opacity={0.9} />
        <text x={x(EVENT_START) + 4} y={M.t + 12} className="band-l ev">
          Peak event
        </text>
        <text x={x(EVENT_START) + 4} y={M.t + 24} className="band-l ev">
          5–8 pm
        </text>

        {/* midnight divider */}
        <line x1={x(tue)} x2={x(tue)} y1={M.t - 6} y2={base + 20} className="midnight" />

        {/* actual readings */}
        {actual.map((a) => (
          <rect key={a.t} x={x(a.t)} y={y(a.kw)} width={slotW + 0.4} height={base - y(a.kw)} className="actual" />
        ))}

        {/* forecast stacks */}
        {slots.map((s) => {
          let acc = 0
          return (
            <g key={s.t} opacity={s.t === hover ? 1 : 0.94}>
              {STACK.map((id) => {
                const v = s.b[id]
                if (v <= 0.001) return null
                const y0 = y(acc + v)
                const h = y(acc) - y0
                acc += v
                return <rect key={id} x={x(s.t)} y={y0} width={slotW + 0.4} height={h} fill={DEVICES.find((d) => d.id === id)!.color} />
              })}
            </g>
          )
        })}

        {/* over-the-line caps */}
        {slots
          .filter((s) => s.total > PEAK_KW + 0.001)
          .map((s) => (
            <rect key={'o' + s.t} x={x(s.t)} y={y(s.total)} width={slotW + 0.4} height={y(PEAK_KW) - y(s.total)} className="over" />
          ))}

        {/* now */}
        <line x1={x(NOW)} x2={x(NOW)} y1={M.t - 20} y2={base} className="now" />
        <text x={x(NOW) - 5} y={M.t - 9} textAnchor="end" className="now-l">
          Now · {fmtTime(NOW)}
        </text>

        {/* thresholds */}
        {fixedKw != null && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={y(fixedKw)} y2={y(fixedKw)} className="ln-fixed" />
            <text x={M.l + 6} y={y(fixedKw) + 12} className="ln-l muted-l">
              {fixedKw} kW alert
            </text>
          </g>
        )}
        {guard.enabled && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={guardY} y2={guardY} className="ln-guard" />
            <text x={M.l + 6} y={guardY + 12} className="ln-l guard-l">
              Guard {guardLine(guard).toFixed(1)} kW
            </text>
          </g>
        )}
        <line x1={M.l} x2={W - M.r} y1={y(PEAK_KW)} y2={y(PEAK_KW)} className="ln-peak" />
        <text x={M.l + 6} y={y(PEAK_KW) - 5} className="ln-l peak-l">
          Peak {PEAK_KW} kW
        </text>

        {/* event markers on the timeline */}
        {flagGlaze && (
          <g>
            <line x1={x(glazeStart)} x2={x(glazeStart)} y1={M.t - 32} y2={base} className="mk" />
            <text x={x(glazeStart) + (labelFlip ? -4 : 4)} y={M.t - 22} textAnchor={labelFlip ? 'end' : 'start'} className="mk-l">
              Glaze starts {startText(glazeStart)}
            </text>
          </g>
        )}
        <g>
          <line x1={x(SMALL_END)} x2={x(SMALL_END)} y1={M.t - 20} y2={base} className="mk soft" />
          <text x={x(SMALL_END) + 4} y={M.t - 9} className="mk-l soft">
            Bisque ends ≈{fmtTime(SMALL_END)}
          </text>
        </g>
        {glazeEnd < PLAN_TO && glazeEnd > NOW && (
          <g>
            <line x1={x(glazeEnd)} x2={x(glazeEnd)} y1={M.t - 32} y2={base} className="mk soft" />
            <text x={x(glazeEnd) + (x(glazeEnd) > W - 150 ? -4 : 4)} y={M.t - 22} textAnchor={x(glazeEnd) > W - 150 ? 'end' : 'start'} className="mk-l soft">
              Glaze ends {fmtDayTime(glazeEnd)}
            </text>
          </g>
        )}

        {/* x axis */}
        <line x1={M.l} x2={W - M.r} y1={base} y2={base} className="axis" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={base} y2={base + 4} className="axis" />
            <text x={x(t)} y={base + 16} textAnchor="middle" className="ax">
              {fmtHour(((t - mon) / 60) % 24).replace(' ', '')}
            </text>
          </g>
        ))}
        <text x={x(mon + 12 * 60) + 2} y={base + 32} className="ax-d">
          Mon Nov 16
        </text>
        <text x={x(tue) + 6} y={base + 32} className="ax-d">
          Tue Nov 17
        </text>

        {/* hover */}
        {hover != null && (
          <rect x={x(hover)} y={M.t} width={slotW} height={base - M.t} className="hover" />
        )}
      </svg>

      {hover != null && (hs || hAct) && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) > W * 0.62 ? 'translateX(-108%)' : 'translateX(14px)' }}>
          <div className="tip-h">
            {fmtDayTime(hover)}–{fmtTime(hover + STEP)}
          </div>
          {hAct && hover < FIRST_FORECAST && (
            <div className="tip-r">
              <span>Metered demand</span>
              <b>{hAct.kw.toFixed(1)} kW</b>
            </div>
          )}
          {hs && hover >= FIRST_FORECAST && (
            <>
              <div className="tip-r tot">
                <span>Projected demand</span>
                <b className={hs.total > PEAK_KW + 0.001 ? 'bad' : ''}>{hs.total.toFixed(1)} kW</b>
              </div>
              {[...STACK].reverse().map((id) =>
                hs.b[id] > 0.001 ? (
                  <div className="tip-r" key={id}>
                    <span>
                      <i style={{ background: DEVICES.find((d) => d.id === id)!.color }} />
                      {DEVICES.find((d) => d.id === id)!.name}
                    </span>
                    <b>{hs.b[id].toFixed(1)}</b>
                  </div>
                ) : null,
              )}
              <div className="tip-f">
                {hs.total > PEAK_KW + 0.001
                  ? `${(hs.total - PEAK_KW).toFixed(1)} kW over your peak`
                  : `${(PEAK_KW - hs.total).toFixed(1)} kW under your peak`}
              </div>
            </>
          )}
        </div>
      )}

      <ul className="legend">
        <li>
          <i style={{ background: '#6f655b' }} />
          Metered
        </li>
        {DEVICES.filter((d) => d.id !== 'base').map((d) => (
          <li key={d.id}>
            <i style={{ background: d.color }} />
            {d.name}
          </li>
        ))}
        <li>
          <i className="sw-over" />
          Above peak
        </li>
      </ul>
    </div>
  )
}
