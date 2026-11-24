import { Pause, Play } from 'lucide-react'
import { useStore } from './store'
import { fmtClock } from './format'
import { ACTOR_INFO } from './ui'
import { HOTEL } from './data'
import type { Actor } from './types'

function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 20V5h7.5a4.5 4.5 0 0 1 0 9H6m7 0 5 6" />
    </svg>
  )
}

export function TopBar() {
  const { s, d, dispatch } = useStore()
  const c = fmtClock(s.now)
  const nextBack = s.rooms
    .filter((r) => r.status === 'ooo' && r.ooo?.estAt != null)
    .sort((a, b) => a.ooo!.estAt! - b.ooo!.estAt!)[0]
  const f = s.statusFilter
  const pct = Math.round((d.departuresOut / d.departuresTotal) * 100)

  const online = s.attendants.filter((a) => a.presence === 'active')

  return (
    <header className="top">
      <div className="brand">
        <div className="logo">
          <Logo />
        </div>
        <div>
          <b>Roomturn</b>
          <span>{HOTEL}</span>
        </div>
      </div>

      <div className="clock" aria-label="Current time">
        <div className="t num">
          {c.hm}
          <small>:{c.ss}</small>
        </div>
        <div className="d">Tuesday</div>
      </div>

      <div className="kpis">
        <div className="kpi" style={{ cursor: 'default' }}>
          <div className="l">Departures out</div>
          <div className="v num">
            {d.departuresOut}
            <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 14 }}>/{d.departuresTotal}</span>
            <i>{d.counts.dueout} due out</i>
          </div>
          <div className="minibar">
            <i style={{ width: pct + '%' }} />
          </div>
        </div>
        <button className={`kpi ${f === 'inspected' ? 'on' : ''}`} onClick={() => dispatch({ type: 'setFilter', status: 'inspected' })}>
          <div className="l">Inspected · ready</div>
          <div className="v num" style={{ color: 'var(--ok)' }}>
            {d.counts.inspected}
          </div>
        </button>
        <button className={`kpi ${f === 'clean' ? 'on' : ''}`} onClick={() => dispatch({ type: 'setFilter', status: 'clean' })}>
          <div className="l">Awaiting inspection</div>
          <div className="v num" style={{ color: 'var(--s-clean)' }}>
            {d.counts.clean}
          </div>
        </button>
        <button className={`kpi ${f === 'ooo' ? 'on' : ''}`} onClick={() => dispatch({ type: 'setFilter', status: 'ooo' })}>
          <div className="l">Out of order</div>
          <div className="v num" style={{ color: 'var(--s-ooo)' }}>
            {d.counts.ooo}
            <i>{nextBack ? `${nextBack.id} ~${nextBack.ooo!.estLabel}` : ''}</i>
          </div>
        </button>
      </div>

      <div className="here" title="Signed in right now">
        <div className="l">Here now · {online.length + 3}</div>
        <div className="avs">
          <span className="av disp" style={{ background: ACTOR_INFO.marisol.color }} title="Marisol D. · at the display">
            MD
          </span>
          <span className="av disp" style={{ background: ACTOR_INFO.kenji.color }} title="Kenji T. · at the display">
            KT
          </span>
          {online.map((a) => (
            <span key={a.id} className="av" style={{ background: '#cfd8df' }} title={`${a.full} · on phone`}>
              {a.name.split(' ')[0][0]}
              {a.name.split(' ')[1][0]}
              <i className="dot" />
            </span>
          ))}
          <span className="av" style={{ background: '#f0b36a' }} title="Dmitri S. · maintenance, on phone">
            DS
            <i className="dot" />
          </span>
        </div>
      </div>

      <div className="actor">
        <div className="l">At the controls</div>
        <div className="seg" role="radiogroup" aria-label="Who is at the controls">
          {(['marisol', 'kenji'] as Actor[]).map((a) => (
            <button
              key={a}
              role="radio"
              aria-checked={s.actor === a}
              className={s.actor === a ? 'on' : ''}
              onClick={() => dispatch({ type: 'setActor', actor: a })}
              title="On the real display this is a badge tap"
            >
              <span className="av" style={{ background: s.actor === a ? '#0b1014' : ACTOR_INFO[a].color, color: s.actor === a ? ACTOR_INFO[a].color : '#0b1014' }}>
                {ACTOR_INFO[a].initials}
              </span>
              <span>
                <b>{ACTOR_INFO[a].name}</b>
                <small>{ACTOR_INFO[a].role}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <button className={`live ${s.live ? '' : 'paused'}`} onClick={() => dispatch({ type: 'setLive', live: !s.live })} title={s.live ? 'Hold the picture still while you decide' : 'Resume phone updates'}>
        {s.live ? (
          <>
            <span className="pip" /> Live <Pause size={13} />
          </>
        ) : (
          <>
            <Play size={13} /> Paused
          </>
        )}
      </button>
    </header>
  )
}
