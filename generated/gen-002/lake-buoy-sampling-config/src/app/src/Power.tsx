import { useState } from 'react'
import { DEPLOYMENTS, LAST_WINTER_POWER, fmtUplink, type DepId, type PowerSetting } from './data'
import { BELOW_LABEL, useApp } from './store'
import { Badge, ViewHeader, Was } from './ui'

const IRIDIUM = [1, 2, 3, 6, 12]
const LTE = [0.25, 0.5, 1, 3]

export function PowerView() {
  const { st, actions, locked, SOURCE, LIVE } = useApp()
  const { draft } = st
  const inWater = DEPLOYMENTS.filter((d) => !draft.retrieved[d.id]).map((d) => d.id)
  const [all, setAll] = useState(() => draft.power.UN.cutoff.toFixed(1))

  const step = (id: DepId, dv: number) => actions.setPower([id], { cutoff: Math.round((draft.power[id].cutoff + dv) * 10) / 10 })

  return (
    <div className="view">
      <ViewHeader
        title="Power & telemetry"
        sub="When battery voltage drops below the cutoff, the logger stops transmitting but keeps recording to its card. Cold batteries sag; the cutoff is the margin."
        right={
          <span className="bulk-grp">
            Cutoff for all in-water
            <input className="num" style={{ width: 64 }} type="number" step={0.1} value={all} disabled={locked} onChange={(e) => setAll(e.target.value)} aria-label="Cutoff for all in-water deployments" />
            V
            <button className="btn small" disabled={locked || Number.isNaN(parseFloat(all))} onClick={() => actions.setPower(inWater, { cutoff: Math.round(parseFloat(all) * 10) / 10 })}>Apply to {inWater.length}</button>
          </span>
        }
      />
      <div className="table-wrap">
        <table className="grid power">
          <thead>
            <tr>
              <th>Deployment</th>
              <th>Battery now</th>
              <th>Low-battery cutoff</th>
              <th>Below cutoff</th>
              <th>Uplink</th>
              <th className="c-last">Last winter</th>
            </tr>
          </thead>
          <tbody>
            {DEPLOYMENTS.map((d) => {
              const p = draft.power[d.id], src = SOURCE.power[d.id], live = LIVE.power[d.id]
              const ret = draft.retrieved[d.id]
              const iridium = d.telemetry.startsWith('Iridium')
              const opts = iridium ? IRIDIUM : LTE
              const msgs = Math.round((30 * 24) / p.uplinkH)
              return (
                <tr key={d.id} className={ret ? 'off' : ''}>
                  <td>
                    <div className="s-var">{d.name}</div>
                    <div className="s-pos">{d.power}</div>
                  </td>
                  <td>
                    <div className="mono">{d.battery.toFixed(2)} V</div>
                    <div className="dim small">at {d.lastContact} today</div>
                  </td>
                  {ret ? (
                    <td colSpan={3}><Badge tone="muted">Retrieved</Badge> <span className="dim">Logger comes ashore with the buoy {st.retrieval.date.slice(5).replace('-', '/')}. Live cutoff {live.cutoff.toFixed(1)} V until then.</span></td>
                  ) : (
                    <>
                      <td className={p.cutoff !== src.cutoff ? 'edited' : ''}>
                        <div className="stepper">
                          <button disabled={locked} onClick={() => step(d.id, -0.1)} aria-label="Lower cutoff">−</button>
                          <span className="mono strong">{p.cutoff.toFixed(1)} V</span>
                          <button disabled={locked} onClick={() => step(d.id, 0.1)} aria-label="Raise cutoff">+</button>
                        </div>
                        {p.cutoff !== src.cutoff && <Was>{src.cutoff.toFixed(1)} V</Was>}
                      </td>
                      <td className={p.below !== src.below ? 'edited' : ''}>
                        <select className="txt" value={p.below} disabled={locked} onChange={(e) => actions.setPower([d.id], { below: e.target.value as PowerSetting['below'] })}>
                          {Object.entries(BELOW_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </td>
                      <td className={p.uplinkH !== src.uplinkH ? 'edited' : ''}>
                        <div className="uplink">
                          <span className="dim">{iridium ? 'Iridium' : 'LTE'} every</span>
                          <select value={p.uplinkH} disabled={locked} onChange={(e) => actions.setPower([d.id], { uplinkH: +e.target.value })}>
                            {opts.map((h) => <option key={h} value={h}>{fmtUplink(h)}</option>)}
                          </select>
                        </div>
                        <div className="dim small">{iridium ? `${msgs} SBD messages / month` : `${msgs} pushes / month`}</div>
                        {p.uplinkH !== src.uplinkH && <Was>{fmtUplink(src.uplinkH)}</Was>}
                      </td>
                    </>
                  )}
                  <td className="small c-last">{LAST_WINTER_POWER[d.id]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
