import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, FileText, Leaf, Search, SlidersHorizontal, UserRound, VolumeX } from 'lucide-react'
import { Avatar, Toasts } from './components/ui'
import { ME } from './data/people'
import { go, useRoute } from './nav'
import Mutes from './pages/Mutes'
import OnCall from './pages/OnCall'
import Reports from './pages/Reports'
import Rules from './pages/Rules'
import Triage from './pages/Triage'
import { StoreProvider, useStore } from './store'
import { BASE, fmtClock, NowContext, DOW, MON } from './time'

function Shell() {
  const route = useRoute()
  const { state } = useStore()
  const [now, setNow] = useState(BASE)
  const start = useRef(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date(BASE.getTime() + (Date.now() - start.current))), 5000)
    return () => clearInterval(id)
  }, [])
  const [q, setQ] = useState('')
  const unack = state.alerts.filter((a) => a.status === 'open').length

  const tabs = useMemo(
    () => [
      { page: 'triage', label: 'Triage', icon: <Bell size={16} />, badge: unack },
      { page: 'reports', label: 'Reports', icon: <FileText size={16} /> },
      { page: 'rules', label: 'Rules', icon: <SlidersHorizontal size={16} /> },
      { page: 'mutes', label: 'Mutes', icon: <VolumeX size={16} />, badge: state.mutes.filter((m) => m.active).length, quiet: true },
      { page: 'oncall', label: 'On-call', icon: <UserRound size={16} /> },
    ] as const,
    [unack, state.mutes]
  )

  return (
    <NowContext.Provider value={now}>
      <div className="app">
        <header className="topbar">
          <a className="brand" href="#/triage" aria-label="Freshwatch home">
            <span className="brand-mark"><Leaf size={16} strokeWidth={2.4} /></span>
            <span className="brand-name">Freshwatch</span>
            <span className="brand-org">Harlow &amp; Pine BI</span>
          </a>
          <nav className="nav" aria-label="Primary">
            {tabs.map((t) => (
              <a key={t.page} href={`#/${t.page}`} className={route.page === t.page ? 'on' : ''} aria-current={route.page === t.page ? 'page' : undefined}>
                {t.icon} {t.label}
                {'badge' in t && t.badge ? <span className={`nav-badge ${'quiet' in t ? 'quiet' : ''}`}>{t.badge}</span> : null}
              </a>
            ))}
          </nav>
          <form
            className="gsearch"
            onSubmit={(e) => {
              e.preventDefault()
              if (q.trim()) go({ page: 'reports', q: q.trim() })
            }}
          >
            <Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a report, owner or table" aria-label="Find a report, owner or table" />
          </form>
          <div className="clock" title="Eastern time">
            <strong>{fmtClock(now)}</strong>
            <span>{DOW[now.getDay()]}, {MON[now.getMonth()]} {now.getDate()} · ET</span>
          </div>
          <a className="oncall-chip" href="#/oncall">
            <Avatar name={ME.name} size={26} />
            <span><strong>{ME.name}</strong><small>on call · Priya Natarajan from Nov 23</small></span>
          </a>
        </header>
        <div className="content">
          {route.page === 'triage' && <Triage route={route} />}
          {route.page === 'reports' && <Reports route={route} />}
          {route.page === 'rules' && <Rules route={route} />}
          {route.page === 'mutes' && <Mutes route={route} />}
          {route.page === 'oncall' && <OnCall />}
        </div>
        <Toasts />
      </div>
    </NowContext.Provider>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
