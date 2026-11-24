import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Search, Users, X } from 'lucide-react'
import { REPORTS, Report, regionName } from '../data/reports'
import { PEOPLE } from '../data/people'
import { rulesFor } from '../data/rules'
import { Chip, Kv, sevTone } from '../components/ui'
import { go, Route } from '../nav'
import { useStore } from '../store'
import { ago, fmtClock, fmtDur, fmtWhen, minutesSince, useNow } from '../time'

type Health = 'alerting' | 'acknowledged' | 'healthy'
type SortKey = 'name' | 'viewers' | 'refresh' | 'load'

export default function Reports({ route }: { route: Route }) {
  const { state, dispatch, toast } = useStore()
  const now = useNow()
  const [q, setQ] = useState(route.q ?? '')
  const [domain, setDomain] = useState('all')
  const [health, setHealth] = useState<'all' | Health>('all')
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'viewers', dir: -1 })
  const [limit, setLimit] = useState(60)

  useEffect(() => {
    if (route.q !== undefined) setQ(route.q)
  }, [route.q])

  const healthOf = useMemo(() => {
    const m = new Map<string, Health>()
    for (const a of state.alerts) {
      if (a.status === 'resolved') continue
      const cur = m.get(a.reportId)
      const h: Health = a.status === 'open' ? 'alerting' : 'acknowledged'
      if (cur !== 'alerting') m.set(a.reportId, h)
    }
    return m
  }, [state.alerts])

  const domains = useMemo(() => ['all', ...Array.from(new Set(REPORTS.map((r) => r.domain))).sort()], [])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const f = REPORTS.filter((r) => {
      if (domain !== 'all' && r.domain !== domain) return false
      const h = healthOf.get(r.id) ?? 'healthy'
      if (health !== 'all' && h !== health) return false
      if (!needle) return true
      return (
        r.name.toLowerCase().includes(needle) ||
        PEOPLE[r.owner].name.toLowerCase().includes(needle) ||
        r.upstream.some((u) => u.toLowerCase().includes(needle)) ||
        r.domain.toLowerCase().includes(needle)
      )
    })
    const cmp = (a: Report, b: Report) => {
      switch (sort.k) {
        case 'name': return a.name.localeCompare(b.name)
        case 'viewers': return a.viewers - b.viewers
        case 'refresh': return a.lastRefresh.getTime() - b.lastRefresh.getTime()
        case 'load': return a.loadP95 - b.loadP95
      }
    }
    return f.sort((a, b) => cmp(a, b) * sort.dir)
  }, [q, domain, health, sort, healthOf])

  const sel = REPORTS.find((r) => r.id === route.id)
  const th = (k: SortKey, label: string, cls = '') => (
    <th className={cls}>
      <button className="thbtn" onClick={() => setSort({ k, dir: sort.k === k ? (sort.dir === 1 ? -1 : 1) : k === 'name' ? 1 : -1 })}>
        {label} {sort.k === k && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  )
  const counts = { alerting: 0, acknowledged: 0 }
  healthOf.forEach((v) => { if (v !== 'healthy') counts[v]++ })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>{REPORTS.length} published reports · {counts.alerting} alerting · {counts.acknowledged} acknowledged · {REPORTS.length - counts.alerting - counts.acknowledged} healthy</p>
        </div>
      </div>
      <div className="toolbar">
        <div className="searchbox">
          <Search size={15} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(60) }} placeholder="Search reports, owners, upstream tables" aria-label="Search reports" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
        <select className="input select" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Domain">
          {domains.map((d) => <option key={d} value={d}>{d === 'all' ? 'All domains' : d}</option>)}
        </select>
        <div className="seg seg-sm">
          {([['all', 'All'], ['alerting', 'Alerting'], ['acknowledged', 'Acknowledged'], ['healthy', 'Healthy']] as const).map(([v, l]) => (
            <button key={v} className={health === v ? 'on' : ''} onClick={() => setHealth(v)}>{l}</button>
          ))}
        </div>
        <span className="muted small">{rows.length} shown</span>
      </div>
      <div className={`split-table ${sel ? 'with-panel' : ''}`}>
        <div className="tbl-scroll">
          <table className="tbl reports">
            <thead>
              <tr>
                {th('name', 'Report')}
                <th>Owner</th>
                <th>Schedule</th>
                {th('refresh', 'Last refresh')}
                {th('viewers', 'Viewers', 'num')}
                {th('load', 'p95 load', 'num')}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((r) => {
                const h = healthOf.get(r.id) ?? 'healthy'
                const late = minutesSince(r.lastRefresh, now) > (r.scheduleKind === 'daily' ? 26 * 60 : r.scheduleKind === 'weekly' ? 8 * 24 * 60 : 3 * 60)
                return (
                  <tr key={r.id} className={`clickable ${sel?.id === r.id ? 'sel' : ''}`} onClick={() => go({ page: 'reports', id: r.id })}>
                    <td>
                      <strong>{r.name}</strong>
                      <small className="sub">{r.domain}{r.region ? ` · ${regionName(r.region)}` : ''}</small>
                    </td>
                    <td>{PEOPLE[r.owner].name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.schedule}</td>
                    <td className={late ? 'crit-text' : ''}>{fmtWhen(r.lastRefresh, now)}{late && <small className="sub crit-text">{fmtDur(minutesSince(r.lastRefresh, now))} old</small>}</td>
                    <td className="num">{r.viewers}</td>
                    <td className={`num ${r.loadP95 > 12 ? 'crit-text' : ''}`}>{r.loadP95.toFixed(1)} s</td>
                    <td>
                      {h === 'alerting' ? <Chip tone="crit">Alerting</Chip> : h === 'acknowledged' ? <Chip tone="warn">Acknowledged</Chip> : state.banners[r.id] ? <Chip tone="info">Notice live</Chip> : <Chip tone="ok">Healthy</Chip>}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="empty-cell">No reports match. Try a table name like <span className="mono">lp.shrink_events_curated</span> or an owner.</td></tr>
              )}
            </tbody>
          </table>
          {rows.length > limit && (
            <div className="more-row"><button className="btn" onClick={() => setLimit(limit + 60)}>Show 60 more ({rows.length - limit} left)</button></div>
          )}
        </div>
        {sel && (
          <aside className="panel" aria-label={`${sel.name} details`}>
            <div className="panel-head">
              <div>
                <h2>{sel.name}</h2>
                <p>{sel.domain}{sel.region ? ` · ${regionName(sel.region)}` : ''}</p>
              </div>
              <button className="icon-btn" onClick={() => go({ page: 'reports' })} aria-label="Close panel"><X size={18} /></button>
            </div>
            <dl className="kvs">
              <Kv k="Owner" v={`${PEOPLE[sel.owner].name} · ${PEOPLE[sel.owner].role}`} />
              <Kv k="Schedule" v={sel.schedule} />
              <Kv k="Last refresh" v={`${fmtWhen(sel.lastRefresh, now)} (${ago(sel.lastRefresh, now)})`} />
              <Kv k="Next refresh" v={fmtWhen(sel.nextRefresh, now)} />
              <Kv k="Typical viewers" v={<span><Users size={13} className="inl" /> {sel.viewers}{sel.viewersNote ? ` (${sel.viewersNote})` : ' per weekday'}</span>} />
              <Kv k="p95 load time" v={`${sel.loadP95.toFixed(1)} s`} />
            </dl>
            <h3 className="panel-h3">Upstream tables</h3>
            <ul className="chips-col">
              {sel.upstream.map((u) => (
                <li key={u}><button className="tablechip mono" onClick={() => go({ page: 'reports', q: u })} title="Find other reports that read this table">{u}</button></li>
              ))}
            </ul>
            <h3 className="panel-h3">Alert rules covering it</h3>
            <ul className="rule-list">
              {rulesFor(state.rules, sel).map((r) => (
                <li key={r.id}>
                  <a href={`#/rules/${r.id}`}><span className="mono">{r.id}</span> {r.type}</a>
                  <Chip tone={sevTone(r.severity)}>{r.severity}</Chip>
                  {!r.enabled && <Chip>off</Chip>}
                </li>
              ))}
            </ul>
            <h3 className="panel-h3">Recent alerts</h3>
            {state.alerts.filter((a) => a.reportId === sel.id).length === 0 ? (
              <p className="muted small">None in the last 24 hours.</p>
            ) : (
              <ul className="rule-list">
                {state.alerts.filter((a) => a.reportId === sel.id).map((a) => (
                  <li key={a.id}><a href={`#/triage/${a.id}`}><span className="mono">{a.id}</span> {a.title}</a><small className="muted">{fmtClock(a.firedAt)}</small></li>
                ))}
              </ul>
            )}
            <h3 className="panel-h3">Viewer notice</h3>
            {state.banners[sel.id] ? (
              <div className="callout-box info">
                <div><strong>Live:</strong> {state.banners[sel.id]}<button className="linkish" onClick={() => { dispatch({ t: 'banner', reportId: sel.id, text: null }); toast('Notice removed.') }}>Remove</button></div>
              </div>
            ) : (
              <button className="btn" onClick={() => { dispatch({ t: 'banner', reportId: sel.id, text: 'Data may be delayed. The owning team is investigating.' }); toast('Notice added to the report.') }}>Add a “data may be delayed” notice</button>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
