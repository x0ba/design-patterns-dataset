import { useState } from 'react'
import { fmtDay, fmtTime } from './store'
import { Icon, useApp } from './ctx'

export function AuditView() {
  const { state, openHelp } = useApp()
  const [who, setWho] = useState<'all' | 'user' | 'assistant'>('all')
  const events = [...state.audit].reverse().filter((e) => who === 'all' || e.actor === who)
  let lastDay = ''
  return (
    <div className="audit">
      <div className="audit-head">
        <div>
          <h2>Audit trail</h2>
          <p className="small muted">Every suggestion and every decision on {`PRR-2026-1184`}, newest first. Kept with the request file. Under AP-07 § 7 it is itself a public record. <button className="link small" onClick={() => openHelp({ kind: 'article', id: 'a20' })}>What’s recorded</button></p>
        </div>
        <div className="seg">
          <button className={who === 'all' ? 'on' : ''} onClick={() => setWho('all')}>All</button>
          <button className={who === 'user' ? 'on' : ''} onClick={() => setWho('user')}>Your actions</button>
          <button className={who === 'assistant' ? 'on' : ''} onClick={() => setWho('assistant')}>Assistant</button>
        </div>
      </div>
      <ol className="audit-list">
        {events.map((e) => {
          const day = fmtDay(e.t)
          const showDay = day !== lastDay
          lastDay = day
          return (
            <li key={e.id} className={`ev ev-${e.actor}`}>
              {showDay && <div className="ev-day">{day}</div>}
              <div className="ev-row">
                <span className="ev-time">{fmtTime(e.t)}</span>
                <span className="ev-icon">
                  <Icon name={e.actor === 'assistant' ? 'spark' : e.actor === 'system' ? 'mail' : 'user'} size={13} />
                </span>
                <div className="ev-body">
                  <div><b className="ev-who">{e.who}</b> {e.text}</div>
                  {e.detail && <div className="small muted">{e.detail}</div>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
