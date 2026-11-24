import { useMemo } from 'react'
import { DEVICES, SERIES, SMALL_END, SMALL_TARGET, SMALL_TEMP_NOW, PEAK_KW } from './data'
import { BIG_HOURS, evaluate, fmtUsd2 } from './model'
import { useStore } from './state'
import { at, EVENT_END, EVENT_START, fmtDayTime, fmtDur, fmtTime, NOW } from './time'
import { startLabel } from './Watch'
import { Card, Pill, Icon } from './ui'

function Spark({ id }: { id: (typeof DEVICES)[number]['id'] }) {
  const n = 96
  const from = SERIES.n - n
  const w = 150
  const h = 34
  const arr = Array.from(SERIES.dev[id].slice(from))
  const max = Math.max(...arr, 0.1)
  const d = arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (n - 1)) * w).toFixed(1)} ${(h - (v / max) * (h - 3) - 1).toFixed(1)}`).join('')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden>
      <path d={d} fill="none" stroke={DEVICES.find((x) => x.id === id)!.color} strokeWidth="1.6" />
    </svg>
  )
}

export function Equipment() {
  const S = useStore()
  const out = useMemo(() => evaluate(S.committed, S.loads), [S.committed, S.loads])
  const last = SERIES.n - 1

  // kWh in last 24 h per device
  const day = (id: (typeof DEVICES)[number]['id']) => {
    let s = 0
    for (let i = SERIES.n - 96; i < SERIES.n; i++) s += SERIES.dev[id][i] * 0.25
    return s
  }

  const timeVal = (m: number) => {
    const mod = m % 1440
    return `${String(Math.floor(mod / 60)).padStart(2, '0')}:${String(mod % 60).padStart(2, '0')}`
  }

  function onTime(v: string) {
    if (!v) return
    const [h, m] = v.split(':').map(Number)
    let t = h * 60 + m
    if (t < 945) t += 1440 // anything earlier than the next slot today is treated as tomorrow
    S.setCommitted(t)
    S.setPreview(t)
    S.setReminder(null)
    S.toast(`Glaze firing set for ${startLabel(t)}.`)
  }

  return (
    <>
      <div className="page-h">
        <div className="eyebrow">Equipment &amp; schedule</div>
        <h1>Two kilns, three small loads, one meter</h1>
        <p className="lede">Peakmind learns each device's draw from your meter readings and uses it to project the next few hours.</p>
      </div>

      <div className="eq-grid">
        {DEVICES.filter((d) => d.id !== 'base').map((d) => {
          const kw = SERIES.dev[d.id][last]
          const on = kw > 0.2
          return (
            <div className="eq big" key={d.id}>
              <div className="eq-top">
                <i style={{ background: d.color }} />
                <b>{d.name}</b>
                <span className={'state ' + (on ? 'run' : '')}>{on ? 'On' : 'Idle'}</span>
              </div>
              <div className="eq-kw">
                {d.kw.toFixed(1)} <small>kW rated</small>
              </div>
              <div className="eq-n">{d.note}</div>
              <Spark id={d.id} />
              <div className="eq-n">Last 24 h: {Math.round(day(d.id))} kWh</div>
            </div>
          )
        })}
      </div>

      <div className="grid-two mt">
        <Card title="Firing schedule" sub="Anything you move here updates tonight's projection.">
          <ul className="sched-list">
            <li>
              <div className="sl-ico run">
                <Icon name="flame" />
              </div>
              <div className="sl-b">
                <b>Bisque · Small kiln</b>
                <span className="muted">Started 9:40 am · 9 h cycle · {SMALL_TEMP_NOW.toLocaleString('en-US')} °F of {SMALL_TARGET.toLocaleString('en-US')} °F</span>
              </div>
              <div className="sl-r">
                <Pill tone="ok">Running</Pill>
                <span className="muted small">ends ≈ {fmtTime(SMALL_END)}</span>
              </div>
            </li>
            <li>
              <div className="sl-ico">
                <Icon name="flame" />
              </div>
              <div className="sl-b">
                <b>Glaze cone 6 · Big kiln</b>
                <span className="muted">
                  About {BIG_HOURS} h · {fmtDayTime(S.committed)} → {fmtDayTime(out.end)}
                </span>
              </div>
              <div className="sl-r">
                <label className="time-in">
                  <span className="muted small">Start</span>
                  <input type="time" step={900} value={timeVal(S.committed)} onChange={(e) => onTime(e.target.value)} aria-label="Glaze firing start time" />
                </label>
              </div>
            </li>
          </ul>
          <div className={'sched-check ' + out.status}>
            {out.status === 'over' ? (
              <>
                <Icon name="alert" size={16} /> Peaks at {out.maxKw.toFixed(1)} kW, {out.overKw.toFixed(1)} kW above your {PEAK_KW} kW cycle peak (+{fmtUsd2(out.demandAdded)}).
              </>
            ) : out.status === 'edge' ? (
              <>
                <Icon name="alert" size={16} /> Peaks at {out.maxKw.toFixed(1)} kW, right at your {PEAK_KW} kW cycle peak.
              </>
            ) : (
              <>
                <Icon name="check" size={16} /> Peaks at {out.maxKw.toFixed(1)} kW, {out.headroom.toFixed(1)} kW under your cycle peak.
              </>
            )}
          </div>
          <button type="button" className="btn ghost sm" onClick={() => S.go('watch')}>
            See tonight's projection <Icon name="arrow" size={15} />
          </button>
        </Card>

        <Card title="Utility notices">
          <ul className="sched-list">
            <li>
              <div className="sl-ico ev">
                <Icon name="bolt" />
              </div>
              <div className="sl-b">
                <b>Peak demand event</b>
                <span className="muted">
                  {fmtDayTime(EVENT_START)}–{fmtTime(EVENT_END)} · announced today, 2:05 pm
                </span>
              </div>
              <div className="sl-r">
                {out.eventKilnMin === 0 ? <Pill tone="ok">No overlap</Pill> : <Pill tone="bad">Overlaps {fmtDur(out.eventKilnMin)}</Pill>}
              </div>
            </li>
            <li>
              <div className="sl-ico">
                <Icon name="clock" />
              </div>
              <div className="sl-b">
                <b>On-peak hours, TOU-B</b>
                <span className="muted">Weekdays 4–9 pm · $0.31/kWh (off-peak $0.14)</span>
              </div>
              <div className="sl-r">
                <span className="muted small">{NOW >= at(11, 16, 16) ? 'Now' : 'Starts 4:00 pm'}</span>
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </>
  )
}
