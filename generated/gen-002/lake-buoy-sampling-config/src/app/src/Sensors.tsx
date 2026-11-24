import { useMemo, useState } from 'react'
import { DEPLOYMENTS, SENSORS, calStatus, fmtDate, fmtInterval, type Sensor } from './data'
import { useApp } from './store'
import { Badge, Switch, ViewHeader, Was } from './ui'

const INTERVALS = [1, 2, 5, 10, 15, 30, 60]
type Filter = 'all' | 'do' | 'changed' | 'cal'

export function SensorsView() {
  const { st, actions, locked, SOURCE, LIVE } = useApp()
  const { draft, depFilter } = st
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [showLive, setShowLive] = useState(true)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [openMB, setOpenMB] = useState(false)
  const [bulkInterval, setBulkInterval] = useState(30)

  const isChanged = (s: Sensor) => {
    const a = SOURCE.sensors[s.id], b = draft.sensors[s.id]
    return a.interval !== b.interval || a.active !== b.active || SOURCE.units[s.varKey] !== draft.units[s.varKey]
  }
  const overdue = SENSORS.filter((s) => calStatus(s).overdue && !draft.retrieved[s.dep])
  const counts = {
    all: SENSORS.length,
    do: SENSORS.filter((s) => s.varKey === 'do').length,
    changed: SENSORS.filter(isChanged).length,
    cal: overdue.length,
  }

  const visible = useMemo(() => SENSORS.filter((s) => {
    if (depFilter && s.dep !== depFilter) return false
    if (filter === 'do' && s.varKey !== 'do') return false
    if (filter === 'changed' && !isChanged(s)) return false
    if (filter === 'cal' && !calStatus(s).overdue) return false
    if (q) {
      const hay = `${s.variable} ${s.position} ${s.model} ${s.serial}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  }), [depFilter, filter, q, draft]) // eslint-disable-line

  const toggleSel = (id: string) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const selIds = [...sel].filter((id) => !draft.retrieved[SENSORS.find((s) => s.id === id)!.dep])
  const narrowed = filter !== 'all' || !!q || !!depFilter

  return (
    <div className="view">
      <ViewHeader
        title="Sensors & sampling"
        sub={<>31 sensors on 4 deployments. Highlighted values differ from Winter 2025–26; the grey column is what loggers run today under Open Water 2026.</>}
        right={<label className="check"><input type="checkbox" checked={showLive} onChange={(e) => setShowLive(e.target.checked)} /> Show live values</label>}
      />

      {overdue.length > 0 && !st.calAck && (
        <div className="callout warn">
          <div>
            <strong>Two DO sondes are past their 180-day calibration.</strong> {overdue.map((s) => `miniDOT ${s.serial} (${s.position}, ${s.dep === 'UN' ? 'North' : 'South'})`).join(' and ')} were last calibrated {fmtDate(overdue[0].calibrated)}, {calStatus(overdue[0]).age} days ago. They sit at depth on the moorings, so there's no access once ice is on — the QA rule will mark their data <span className="flag">C</span> all winter.
          </div>
          <div className="callout-actions">
            <button className="btn small" onClick={() => setFilter('cal')}>Show them</button>
            <button className="btn small" disabled={locked} onClick={() => actions.ackCal(true)}>Accept, keep them running</button>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="chips" role="tablist">
          {([['all', 'All'], ['do', 'DO sondes'], ['changed', 'Changed'], ['cal', 'Calibration overdue']] as [Filter, string][]).map(([k, l]) => (
            <button key={k} className={`chip ${filter === k ? 'on' : ''} ${k === 'cal' && counts.cal ? 'warnchip' : ''}`} onClick={() => setFilter(k)}>
              {l} <span className="n">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="seg">
          <button className={!depFilter ? 'on' : ''} onClick={() => actions.setDepFilter(null)}>All deployments</button>
          {DEPLOYMENTS.map((d) => (
            <button key={d.id} className={depFilter === d.id ? 'on' : ''} onClick={() => actions.setDepFilter(d.id)}>{d.short}</button>
          ))}
        </div>
        <input className="search" placeholder="Search model, serial, depth…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {selIds.length > 0 && (
        <div className="bulk">
          <span><strong>{selIds.length}</strong> selected</span>
          <span className="bulk-grp">
            Interval
            <select value={bulkInterval} onChange={(e) => setBulkInterval(+e.target.value)}>
              {INTERVALS.map((m) => <option key={m} value={m}>{fmtInterval(m)}</option>)}
            </select>
            <button className="btn small" disabled={locked} onClick={() => actions.setSensor(selIds, { interval: bulkInterval })}>Apply</button>
          </span>
          <button className="btn small" disabled={locked} onClick={() => actions.setSensor(selIds, { active: true })}>Turn on</button>
          <button className="btn small" disabled={locked} onClick={() => actions.setSensor(selIds, { active: false })}>Turn off</button>
          <button className="link" onClick={() => setSel(new Set())}>Clear selection</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="grid sensors">
          <thead>
            <tr>
              <th className="c-sel" />
              <th>Sensor</th>
              <th>Model · serial</th>
              <th className="c-cal">Calibrated</th>
              <th className="c-int">Interval</th>
              <th className="c-unit">Unit</th>
              <th className="c-act">Active</th>
              {showLive && <th className="c-live">Live now</th>}
            </tr>
          </thead>
          {DEPLOYMENTS.map((d) => {
            const rows = visible.filter((s) => s.dep === d.id)
            if (!rows.length) return null
            const retrieved = draft.retrieved[d.id]
            const collapsed = retrieved && !openMB && !narrowed
            const activeN = rows.filter((s) => draft.sensors[s.id].active && !retrieved).length
            return (
              <tbody key={d.id} className={retrieved ? 'retrieved' : ''}>
                <tr className="grp">
                  <td colSpan={showLive ? 8 : 7}>
                    <div className="grp-row">
                      <span className="grp-name">{d.name}</span>
                      {!retrieved && <span className="grp-meta">{d.where.split(', ')[1] ?? d.where}</span>}
                      {retrieved ? (
                        <span className="grp-meta"><Badge tone="muted">Out of water from {fmtDate(st.retrieval.date, false)}</Badge> all {rows.length} sensors stop with the buoy, as last winter</span>
                      ) : (
                        <span className="grp-meta">{activeN} of {rows.length} active in draft · {d.telemetry}</span>
                      )}
                      {retrieved && !narrowed && (
                        <button className="link small grp-toggle" onClick={() => setOpenMB(!openMB)}>{openMB ? 'Hide sensors' : 'Show sensors'}</button>
                      )}
                    </div>
                  </td>
                </tr>
                {!collapsed && rows.map((s) => {
                  const cur = draft.sensors[s.id], src = SOURCE.sensors[s.id], live = LIVE.sensors[s.id]
                  const cal = calStatus(s)
                  const intChanged = cur.interval !== src.interval
                  const actChanged = cur.active !== src.active
                  const unitChanged = draft.units[s.varKey] !== SOURCE.units[s.varKey]
                  const off = !cur.active || retrieved
                  return (
                    <tr key={s.id} className={`${off ? 'off' : ''} ${sel.has(s.id) ? 'selected' : ''}`}>
                      <td className="c-sel">
                        <input type="checkbox" aria-label={`Select ${s.variable} ${s.position}`} checked={sel.has(s.id)} disabled={retrieved} onChange={() => toggleSel(s.id)} />
                      </td>
                      <td>
                        <div className="s-var">{s.variable}</div>
                        <div className="s-pos">{s.position}</div>
                      </td>
                      <td>
                        <div className="s-model">{s.model}</div>
                        <div className="mono dim">{s.serial}</div>
                      </td>
                      <td className="c-cal" title={`Calibration interval ${s.calIntervalDays} days · due ${fmtDate(cal.due)}`}>
                        <div className="mono">{fmtDate(s.calibrated)}</div>
                        <div className="dim small">
                          {cal.overdue ? <Badge tone="bad">Overdue · {cal.age} d</Badge>
                            : cal.soon ? <Badge tone="warn">Due {fmtDate(cal.due, false)}</Badge>
                            : <>{cal.age} days ago</>}
                        </div>
                      </td>
                      <td className={`c-int ${intChanged ? 'edited' : ''}`}>
                        {retrieved ? <span className="dim">—</span> : (
                          <>
                            <select value={cur.interval} disabled={locked || !cur.active} aria-label="Sampling interval"
                              onChange={(e) => actions.setSensor([s.id], { interval: +e.target.value })}>
                              {INTERVALS.map((m) => <option key={m} value={m}>{fmtInterval(m)}</option>)}
                            </select>
                            {intChanged && <Was>{fmtInterval(src.interval)}</Was>}
                          </>
                        )}
                      </td>
                      <td className={`c-unit ${unitChanged ? 'edited' : ''}`}>
                        <span className="mono">{draft.units[s.varKey]}</span>
                        {unitChanged && <Was>{SOURCE.units[s.varKey]}</Was>}
                      </td>
                      <td className={`c-act ${actChanged ? 'edited' : ''}`}>
                        {retrieved ? <span className="dim small">Retrieved</span> : (
                          <div className="act-cell">
                            <Switch on={cur.active} disabled={locked} label={`${s.variable} ${s.position} active`} onChange={(v) => actions.setSensor([s.id], { active: v })} />
                            {actChanged && <Was>{src.active ? 'on' : 'off'}</Was>}
                          </div>
                        )}
                      </td>
                      {showLive && (
                        <td className="c-live mono">{live.active ? fmtInterval(live.interval) : 'off'}</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            )
          })}
        </table>
        {visible.length === 0 && <p className="empty pad">No sensors match.</p>}
      </div>
    </div>
  )
}
