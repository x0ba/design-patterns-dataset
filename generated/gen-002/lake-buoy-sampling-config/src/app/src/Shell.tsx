import { DEPLOYMENTS, HISTORY, ICE, NOW_LABEL, QA_RULES, SENSORS, fmtDate, fmtDow, CONSUMERS } from './data'
import { useApp, type View } from './store'

export function TopBar() {
  const { st, actions } = useApp()
  const { retrieval, scheduled } = st
  return (
    <div className="topbar">
      <div className="brand">
        <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
          <circle cx="9" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 12v9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M1 16.5c2.2 0 2.2 1.2 4.4 1.2s2.2-1.2 4.4-1.2 2.2 1.2 4.4 1.2 2.2-1.2 3.8-1.2" fill="none" stroke="currentColor" strokeWidth="1.3" opacity=".55" />
        </svg>
        <span className="brand-name">Sondewell</span>
        <span className="brand-site">Lake Tamarack Field Station</span>
      </div>

      <div className="season">
        <button className="season-pill live" onClick={() => actions.setView('profiles')}>
          <span className="dot" /> <span className="k">Live</span> Open Water 2026
        </button>
        <span className="season-arrow" aria-hidden>→</span>
        <button className={`season-pill ${scheduled ? 'sched' : 'draft'}`} onClick={() => actions.setView('profiles')}>
          <span className="k">{scheduled ? 'Scheduled' : 'Draft'}</span> Winter 2026–27
          <span className="when">{fmtDow(retrieval.date)}, {retrieval.time}</span>
        </button>
      </div>

      <div className="top-right">
        <div className="ice" title={ICE.source}>
          <span className="ice-k">Ice outlook</span>
          <span>skim ice {fmtDate(ICE.skim.from, false)}–{ICE.skim.to.slice(8)}</span>
          <span className="sep">·</span>
          <span>full cover est. {fmtDate(ICE.full.from, false)}–{ICE.full.to.slice(8)}</span>
        </div>
        <span className="clock">{NOW_LABEL}</span>
        <span className="avatar" title="Mareike Holt — data manager">MH</span>
      </div>
    </div>
  )
}

const NAV: { id: View; label: string; count: (n: { req: boolean }) => string }[] = [
  { id: 'sensors', label: 'Sensors & sampling', count: () => String(SENSORS.length) },
  { id: 'qa', label: 'QA rules', count: () => String(QA_RULES.length) },
  { id: 'power', label: 'Power & telemetry', count: () => String(DEPLOYMENTS.length) },
  { id: 'exports', label: 'Exports & units', count: () => String(CONSUMERS.length) },
  { id: 'profiles', label: 'Profiles', count: () => '3' },
  { id: 'history', label: 'Change history', count: () => String(HISTORY.length) },
]

export function Nav() {
  const { st, actions, groups } = useApp()
  const condOpen = !groups.some((g) => (g.area === 'units' && g.field === 'cond') || (g.area === 'export' && g.targets.includes('reyes')))
  return (
    <nav className="nav">
      <div className="nav-label">Winter 2026–27 draft</div>
      <ul className="nav-list">
        {NAV.map((n) => (
          <li key={n.id}>
            <button className={`nav-item ${st.view === n.id ? 'active' : ''}`} onClick={() => actions.goto(n.id, n.id === 'sensors' ? { dep: null } : {})}>
              <span>{n.label}</span>
              {n.id === 'exports' && condOpen ? <span className="nav-req" title="Open request from Ana Lucía Reyes">1 request</span> : <span className="nav-count">{n.count({ req: condOpen })}</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="nav-label">Deployments</div>
      <ul className="dep-list">
        {DEPLOYMENTS.map((d) => {
          const n = SENSORS.filter((s) => s.dep === d.id).length
          const isMB = d.id === 'MB'
          return (
            <li key={d.id}>
              <button
                className={`dep-item ${st.view === 'sensors' && st.depFilter === d.id ? 'active' : ''}`}
                onClick={() => actions.goto('sensors', { dep: d.id })}
              >
                <span className="dep-name">{d.name}</span>
                <span className="dep-meta">
                  {isMB ? <>Retrieval {fmtDate(st.retrieval.date, false)}</> : d.where.split(',')[1]?.trim() ?? d.where}
                  <span className="sep">·</span>{n} sensors
                </span>
                <span className="dep-meta mono">
                  {d.battery.toFixed(2)} V<span className="sep">·</span>{d.telemetry === 'Iridium SBD' ? 'Iridium' : 'LTE'} {d.lastContact}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
