import { CONSUMERS, REYES_REQUEST, SENSORS, UNIT_OPTIONS, VAR_LABEL, depById, type VarKey } from './data'
import { useApp } from './store'
import { Badge, ViewHeader, Was } from './ui'

const UNIT_VARS: VarKey[] = ['cond', 'do', 'chl', 'fdom']

export function ExportsView() {
  const { st, actions, locked, SOURCE } = useApp()
  const { draft, pinDnr } = st
  const choice: 'station' | 'export' | null =
    draft.units.cond !== SOURCE.units.cond ? 'station' : draft.overrides.reyes?.cond === 'µS/cm' ? 'export' : null

  const condConsumers = CONSUMERS.filter((c) => c.vars.some((v) => v.varKey === 'cond'))
  const choose = (c: 'station' | 'export' | null) => actions.decideCond(c, pinDnr)

  return (
    <div className="view">
      <ViewHeader title="Exports & units" sub="Five subscribed consumers. Each gets the station's reporting unit unless it has its own override." />

      <section className={`panel request ${choice ? 'decided' : ''}`}>
        <div className="req-head">
          <div>
            <span className="req-k">Request · {REYES_REQUEST.date}</span>
            <h2>Conductivity in µS/cm for the under-ice data</h2>
          </div>
          {choice ? <Badge tone="edit">{choice === 'station' ? 'Station-wide in draft' : 'Her export only, in draft'}</Badge> : <Badge tone="warn">Undecided</Badge>}
        </div>
        <blockquote>
          “{REYES_REQUEST.text}”
          <cite>— {REYES_REQUEST.from}, PhD candidate, Okafor Lab</cite>
        </blockquote>

        <div className="options">
          <div className={`option ${choice === 'export' ? 'on' : ''}`}>
            <h3>Only her export</h3>
            <p>Adds a µS/cm override to <em>Under-ice thesis export</em>. Station unit stays mS/cm.</p>
            <ul className="effects">
              <li><span className="ok">✓</span> Ana gets µS/cm from the first winter export</li>
              <li><span className="ok">✓</span> Okafor Lab dashboard, DNR feed unchanged</li>
              <li><span className="ok">✓</span> QA limits and the archive stay in mS/cm</li>
              <li><span className="dim">–</span> Station still reports two conductivity units across exports (GLEON is already µS/cm)</li>
            </ul>
            <button className={`btn ${choice === 'export' ? '' : 'primary'}`} disabled={locked || choice === 'export'} onClick={() => choose('export')}>
              {choice === 'export' ? 'Chosen' : 'Use export override'}
            </button>
          </div>

          <div className={`option ${choice === 'station' ? 'on' : ''}`}>
            <h3>Station-wide</h3>
            <p>Changes the station reporting unit for specific conductance to µS/cm on every deployment.</p>
            <ul className="effects">
              <li><span className="ok">✓</span> Ana's export and the Okafor Lab dashboard switch to µS/cm</li>
              <li><span className="ok">✓</span> Matches GLEON's pinned unit</li>
              <li><span className="warn">!</span> DNR's parser assumes mS/cm and ignores headers — values would read 1000× high unless pinned</li>
              <li><span className="dim">–</span> QA range shown as 5–1000 µS/cm (same limits, rescaled)</li>
            </ul>
            <label className="check">
              <input type="checkbox" checked={pinDnr} disabled={locked} onChange={(e) => { actions.setPinDnr(e.target.checked); if (choice === 'station') actions.decideCond('station', e.target.checked) }} />
              <span>Pin the DNR feed to mS/cm</span>
            </label>
            <button className={`btn ${choice === 'station' ? '' : 'primary'}`} disabled={locked || choice === 'station'} onClick={() => choose('station')}>
              {choice === 'station' ? 'Chosen' : 'Change station unit'}
            </button>
          </div>
        </div>
        {choice && !locked && <button className="link small" onClick={() => choose(null)}>Undo decision — leave as mS/cm for everyone</button>}
      </section>

      <div className="exp-grid">
        <section className="panel">
          <h2 className="panel-title">Station reporting units</h2>
          <table className="grid compact">
            <tbody>
              {UNIT_VARS.map((k) => {
                const changed = draft.units[k] !== SOURCE.units[k]
                return (
                  <tr key={k}>
                    <td>{VAR_LABEL[k]}</td>
                    <td className={changed ? 'edited' : ''}>
                      <select value={draft.units[k]} disabled={locked} onChange={(e) => k === 'cond' ? choose(e.target.value === 'µS/cm' ? 'station' : choice === 'export' ? 'export' : null) : actions.setUnit(k, e.target.value)}>
                        {UNIT_OPTIONS[k].map((u) => <option key={u}>{u}</option>)}
                      </select>
                      {changed && <Was>{SOURCE.units[k]}</Was>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="note">Units only change what exports carry. Logged values are stored in SI and converted on export.</p>
        </section>

        <section className="panel">
          <h2 className="panel-title">Who receives conductivity, and in what unit</h2>
          <table className="grid compact">
            <thead><tr><th>Consumer</th><th>Now</th><th>From switch-over</th></tr></thead>
            <tbody>
              {condConsumers.map((c) => {
                const before = SOURCE.overrides[c.id]?.cond ?? SOURCE.units.cond
                const after = draft.overrides[c.id]?.cond ?? draft.units.cond
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="mono">{before}</td>
                    <td className={`mono ${before !== after ? 'edited' : ''}`}>{after}{draft.overrides[c.id]?.cond ? <span className="dim"> · override</span> : null}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel">
        <h2 className="panel-title">Subscribed consumers</h2>
        <table className="grid consumers">
          <thead>
            <tr><th>Export</th><th>Delivery</th><th>Variables</th><th>Unit overrides</th><th>Ingest</th><th>Last sent</th></tr>
          </thead>
          <tbody>
            {CONSUMERS.map((c) => {
              const ov = draft.overrides[c.id] ?? {}
              const srcOv = SOURCE.overrides[c.id] ?? {}
              const ovChanged = JSON.stringify(ov) !== JSON.stringify(srcOv)
              return (
                <tr key={c.id}>
                  <td>
                    <div className="s-var">{c.name}</div>
                    <div className="s-pos">{c.owner} · {c.role}</div>
                  </td>
                  <td className="small">{c.cadence}</td>
                  <td>
                    <div className="vars">
                      {c.vars.map((v) => (
                        <VarChip key={`${v.dep}${v.varKey}`} dep={v.dep} varKey={v.varKey} />
                      ))}
                    </div>
                  </td>
                  <td className={ovChanged ? 'edited' : ''}>
                    {Object.keys(ov).length === 0 ? <span className="dim">none</span> : Object.entries(ov).map(([k, u]) => (
                      <span key={k} className="ov">{VAR_LABEL[k as VarKey].replace('Specific conductance', 'SpCond')} <span className="mono">{u}</span>{!locked && <button className="x" aria-label="Remove override" onClick={() => k === 'cond' && c.id === 'reyes' ? choose(choice === 'export' ? null : choice) : actions.setOverride(c.id, k as VarKey, null)}>×</button>}</span>
                    ))}
                  </td>
                  <td className="small dim">{c.ingest}</td>
                  <td className="small mono">{c.lastDelivered}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function VarChip({ dep, varKey }: { dep: keyof typeof depById; varKey: VarKey }) {
  const { st } = useApp()
  const draft = st.draft
  const short: Partial<Record<VarKey, string>> = { wt: 'temp', do: 'DO', cond: 'SpCond', chl: 'chl a', par: 'PAR', airt: 'air temp', snow: 'snow', rad: 'SW rad' }
  const on = !draft.retrieved[dep] && SENSORS.some((s) => s.dep === dep && s.varKey === varKey && draft.sensors[s.id].active)
  return (
    <span className={`vchip ${on ? '' : 'gone'}`} title={on ? undefined : 'No active sensor in the winter draft'}>
      {depById[dep].short} {short[varKey] ?? varKey}
    </span>
  )
}
