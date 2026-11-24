import { AlertTriangle, Clock, VolumeX } from 'lucide-react'
import { Chip } from '../components/ui'
import { Route } from '../nav'
import { useStore } from '../store'
import { fmtDate, fmtDur, fmtWhen, useNow } from '../time'

export default function Mutes({ route }: { route: Route }) {
  const { state, dispatch, toast } = useStore()
  const now = useNow()
  const active = state.mutes.filter((m) => m.active)
  const ended = state.mutes.filter((m) => !m.active)
  const feed = state.alerts.find((a) => a.kind === 'feed')

  const row = (m: (typeof state.mutes)[number]) => {
    const rule = state.rules.find((r) => r.id === m.ruleId)!
    const ageDays = Math.floor((now.getTime() - m.createdAt.getTime()) / 86400000)
    const leftMin = m.expiresAt ? (m.expiresAt.getTime() - now.getTime()) / 60000 : null
    const long = m.expiresAt ? (m.expiresAt.getTime() - m.createdAt.getTime()) / 86400000 > 14 : true
    return (
      <li key={m.id} id={m.id} className={`mute ${route.id === m.id ? 'focus' : ''} ${m.conflict && m.active ? 'conflict' : ''} ${m.active ? '' : 'ended'}`}>
        <div className="mute-main">
          <div className="mute-top">
            <span className="mono muted">{m.id}</span>
            <strong>{m.target}</strong>
            <Chip>{rule.type}</Chip>
            <a className="mono small" href={`#/rules/${rule.id}`}>{rule.id}</a>
            {!m.active && <Chip tone="neutral">Lifted</Chip>}
          </div>
          <p className="mute-reason">“{m.reason}”</p>
          <div className="mute-meta">
            <span>Created by {m.createdBy}, {fmtDate(m.createdAt)}{ageDays > 0 ? ` (${ageDays} days ago)` : ''}</span>
            <span><Clock size={12} className="inl" /> {m.expiresAt ? `Expires ${fmtDate(m.expiresAt)}${leftMin !== null && leftMin < 24 * 60 ? ` (in ${fmtDur(leftMin)})` : ''}` : 'Until lifted'}</span>
            <span>{m.suppressed7d} alert{m.suppressed7d === 1 ? '' : 's'} suppressed in 7 days</span>
            {m.active && long && ageDays >= 14 && <Chip tone="warn">Long-running</Chip>}
          </div>
          {m.conflict && m.active && (
            <div className="callout-box warn">
              <AlertTriangle size={16} />
              <div>
                <strong>Hiding an open problem.</strong> {m.conflict}
                <div className="callout-actions">
                  <button className="btn btn-sm btn-primary" onClick={() => { dispatch({ t: 'liftMute', id: m.id, now }); toast(`${m.id} lifted. The held row-count alert has been raised.`) }}>Lift {m.id} and release the alert</button>
                  <a className="btn btn-sm btn-ghost" href="#/triage">Back to triage</a>
                </div>
              </div>
            </div>
          )}
          {m.id === 'M-3' && !m.active && feed && (
            <p className="ok-text small">Released alert <a href={`#/triage/${feed.id}`}>{feed.id}</a> is now in triage.</p>
          )}
        </div>
        {m.active && (
          <div className="mute-actions">
            {m.expiresAt && <button className="btn btn-sm" onClick={() => { dispatch({ t: 'extendMute', id: m.id, hours: 24 }); toast(`${m.id} extended by 24 hours.`) }}>Extend 24 h</button>}
            {!m.conflict && <button className="btn btn-sm" onClick={() => { dispatch({ t: 'liftMute', id: m.id, now }); toast(`${m.id} lifted.`) }}>Lift now</button>}
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Mutes</h1>
          <p>{active.length} active · a mute silences alerts, not the problem. Anything older than two weeks deserves a second look.</p>
        </div>
      </div>
      <ul className="mutes">
        {active.map(row)}
      </ul>
      {ended.length > 0 && (
        <>
          <h3 className="sect-h">Lifted today</h3>
          <ul className="mutes">{ended.map(row)}</ul>
        </>
      )}
      {active.length === 0 && ended.length === 0 && <p className="muted"><VolumeX size={14} className="inl" /> No mutes.</p>}
      <p className="muted small" style={{ marginTop: 16 }}>Times are {fmtWhen(now, now)} ET. Mutes created from an alert appear here immediately and can be undone from the confirmation.</p>
    </div>
  )
}
