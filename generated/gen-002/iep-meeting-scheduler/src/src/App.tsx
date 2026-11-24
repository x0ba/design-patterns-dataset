import { useEffect } from 'react'
import { NOW_LABEL, SCHOOLS, TOTAL_ACTIVE } from './data'
import { CalendarView } from './Calendar'
import { Coverage } from './Coverage'
import { MeetingPanel } from './MeetingPanel'
import { MeetingsView } from './Meetings'
import { Outbox } from './Outbox'
import { People } from './People'
import { pwnState } from './engine'
import { StoreProvider, View, useStore } from './store'
import { Icon } from './ui'

const TITLES: Record<View, { t: string; sub: string }> = {
  coverage: { t: 'Dr. Lin coverage plan', sub: 'Decide who moves to the substitute, who gets a new date, and what needs sign-off' },
  calendar: { t: 'Calendar', sub: 'Nov 30 – Dec 18 · North Region' },
  meetings: { t: 'All meetings', sub: '27 IEP meetings in the window' },
  outbox: { t: 'Notices & replies', sub: 'What still has to go out, and who still has to say yes' },
  people: { t: 'People & rules', sub: 'Availability and constraints behind every date shown' },
}

function Shell() {
  const { s, go, linMeetings, triageOf, dismiss, undo, openDrawer } = useStore()
  const open = linMeetings.filter((m) => triageOf(m).kind !== 'resolved').length
  const outbox = s.meetings.filter((m) => m.pwn.status !== 'sent').length + s.meetings.filter((m) => m.interp?.status === 'request-needed').length
  const urgent = s.meetings.some((m) => pwnState(m).tone === 'bad')
  const drawerM = s.meetings.find((m) => m.id === s.drawer)

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && openDrawer(null)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [openDrawer])
  useEffect(() => {
    if (!s.toast) return
    const t = setTimeout(dismiss, 7000)
    return () => clearTimeout(t)
  }, [s.toast, dismiss])

  const nav: { v: View; label: string; icon: string; badge?: number; tone?: string }[] = [
    { v: 'coverage', label: 'Dr. Lin coverage', icon: 'alert', badge: open, tone: 'red' },
    { v: 'calendar', label: 'Calendar', icon: 'calendar' },
    { v: 'meetings', label: 'All meetings', icon: 'list', badge: s.meetings.length },
    { v: 'outbox', label: 'Notices & replies', icon: 'inbox', badge: outbox, tone: urgent ? 'red' : 'amber' },
    { v: 'people', label: 'People & rules', icon: 'people' },
  ]

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo"><i /><i /></span>
          <div><b>Convene IEP</b><span>North Region</span></div>
        </div>
        <nav>
          {nav.map((n) => (
            <button key={n.v} className={s.view === n.v ? 'on' : ''} onClick={() => go(n.v)}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.badge != null && n.badge > 0 && <em className={n.tone ?? ''}>{n.badge}</em>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="sf-title">Region roster</div>
          <div className="sf-big">{TOTAL_ACTIVE}<span>active IEPs</span></div>
          <div className="sf-sub">{SCHOOLS.length} elementary schools · 27 meetings Nov 30 – Dec 18</div>
          <div className="sf-sis"><i /> Synced with SIS · 6:40 AM today</div>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <div>
            <h1>{TITLES[s.view].t}</h1>
            <p>{TITLES[s.view].sub}</p>
          </div>
          <div className="top-right">
            <div className="today"><Icon name="calendar" size={14} /> {NOW_LABEL}</div>
            <div className="user">
              <span className="avatar">KB</span>
              <div><b>Keisha Branford</b><span>Special Ed Coordinator</span></div>
            </div>
          </div>
        </header>
        <div className="content">
          {s.view === 'coverage' && <Coverage />}
          {s.view === 'calendar' && <CalendarView />}
          {s.view === 'meetings' && <MeetingsView />}
          {s.view === 'outbox' && <Outbox />}
          {s.view === 'people' && <People />}
        </div>
      </div>

      {drawerM && (
        <>
          <div className="scrim" onClick={() => openDrawer(null)} />
          <aside className="drawer" role="dialog" aria-label={`${drawerM.student} meeting`}>
            <button className="drawer-x" onClick={() => openDrawer(null)} aria-label="Close"><Icon name="x" /></button>
            <MeetingPanel m={drawerM} stacked />
          </aside>
        </>
      )}

      {s.toast && (
        <div className="toast" role="status" key={s.toast.id}>
          <Icon name="check" size={14} />
          <span>{s.toast.text}</span>
          {s.toast.undo && <button onClick={undo}><Icon name="undo" size={13} /> Undo</button>}
          <button className="tx" onClick={dismiss} aria-label="Dismiss"><Icon name="x" size={12} /></button>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
