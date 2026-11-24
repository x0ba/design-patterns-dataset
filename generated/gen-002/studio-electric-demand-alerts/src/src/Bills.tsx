import { useState } from 'react'
import { BILLS, DEVICES, PEAK_KW, RATE, STATS } from './data'
import { fmtUsd, fmtUsd2 } from './model'
import { Card } from './ui'

export function Bills() {
  const [sel, setSel] = useState<number>(12)
  const so_far = STATS.demandCost + STATS.energyCost
  const all = [...BILLS.map((b) => ({ ...b, cur: false })), { label: 'Now', range: 'Oct 28 – Nov 27 (so far)', total: so_far, note: undefined as string | undefined, cur: true }]
  const max = 700
  const chosen = all[sel]
  const hi = BILLS.reduce((a, b) => (b.total > a.total ? b : a))
  const lo = BILLS.reduce((a, b) => (b.total < a.total ? b : a))
  const demandShare = STATS.demandCost / so_far

  const dev = DEVICES.map((d) => ({ ...d, kwh: STATS.perDevice[d.id] })).sort((a, b) => b.kwh - a.kwh)
  const totalKwh = dev.reduce((s, d) => s + d.kwh, 0)

  return (
    <>
      <div className="page-h">
        <div className="eyebrow">Cycle &amp; bills</div>
        <h1>{fmtUsd(so_far)} so far this cycle, and {Math.round(demandShare * 100)}% of it is one 15-minute reading</h1>
        <p className="lede">
          The {PEAK_KW} kW peak from Nov 4 sets a {fmtUsd2(STATS.demandCost)} demand charge no matter how little power you use for the rest of the cycle. Your last 12 bills ran {fmtUsd(lo.total)} to {fmtUsd(hi.total)}; this one is already above that range with 11 days to go.
        </p>
      </div>

      <div className="grid-two">
        <div className="col">
          <Card title="Bill history" sub="Last 12 cycles and this one so far. Select a bar for details.">
            <div className="bars" role="list">
              {all.map((b, i) => (
                <button key={i} type="button" role="listitem" className={'bar-col' + (b.cur ? ' cur' : '') + (sel === i ? ' sel' : '')} onClick={() => setSel(i)} aria-label={`${b.label}: ${fmtUsd(b.total)}`}>
                  <span className="bar-v">{fmtUsd(b.total)}</span>
                  <span className="bar-b" style={{ height: `${(b.total / max) * 200}px` }}>
                    {b.cur && <span className="bar-d" style={{ height: `${(STATS.demandCost / b.total) * 100}%` }} />}
                  </span>
                  <span className="bar-l">{b.label}</span>
                </button>
              ))}
            </div>
            <div className="bar-detail">
              <b>{chosen.range}</b>
              <span>{fmtUsd(chosen.total)}</span>
              {chosen.note && <p className="small muted">{chosen.note}</p>}
              {chosen.cur && (
                <p className="small muted">
                  Darker base = demand charge ({fmtUsd(STATS.demandCost)}). Energy so far {fmtUsd(STATS.energyCost)}. Estimates exclude taxes and fixed fees.
                </p>
              )}
            </div>
          </Card>

          <Card title="Where the kWh went" sub={`${Math.round(totalKwh).toLocaleString('en-US')} kWh this cycle`}>
            <ul className="split">
              {dev.map((d) => (
                <li key={d.id}>
                  <span className="split-n">
                    <i style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="split-b">
                    <span style={{ width: `${(d.kwh / dev[0].kwh) * 100}%`, background: d.color }} />
                  </span>
                  <span className="split-v">{Math.round(d.kwh)} kWh</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="col">
          <Card title="This cycle, itemized" sub={`${RATE.name} · Oct 28 – Nov 27`}>
            <table className="tbl">
              <tbody>
                <tr>
                  <td>
                    Demand charge
                    <small>
                      {PEAK_KW} kW × ${RATE.demand.toFixed(2)}
                    </small>
                  </td>
                  <td>{fmtUsd2(STATS.demandCost)}</td>
                </tr>
                <tr>
                  <td>
                    On-peak energy
                    <small>
                      {Math.round(STATS.onKwh)} kWh × ${RATE.onPeak.toFixed(2)} · 4–9 pm weekdays
                    </small>
                  </td>
                  <td>{fmtUsd2(STATS.onKwh * RATE.onPeak)}</td>
                </tr>
                <tr>
                  <td>
                    Off-peak energy
                    <small>
                      {Math.round(STATS.offKwh)} kWh × ${RATE.offPeak.toFixed(2)}
                    </small>
                  </td>
                  <td>{fmtUsd2(STATS.offKwh * RATE.offPeak)}</td>
                </tr>
                <tr className="tot">
                  <td>So far</td>
                  <td>{fmtUsd2(so_far)}</td>
                </tr>
              </tbody>
            </table>
            <p className="small muted">Every extra kW on a new peak costs ${RATE.demand.toFixed(2)} for this bill. Energy is the smaller lever: moving a 92 kWh firing from on-peak to off-peak saves at most $15.64.</p>
          </Card>

          <Card title="What a new peak would cost" sub={`If one of these switches on while both kilns are already at ${PEAK_KW} kW. Each kW is $${RATE.demand.toFixed(2)} for the rest of this bill.`}>
            <table className="tbl">
              <tbody>
                {DEVICES.filter((d) => d.id === 'pug' || d.id === 'heater' || d.id === 'lights').map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.name}
                      <small>+{d.kw.toFixed(1)} kW</small>
                    </td>
                    <td>{fmtUsd2(d.kw * RATE.demand)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  )
}
