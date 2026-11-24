import { useCallback, useEffect, useRef, useState } from 'react'
import { Alerts } from './Alerts'
import { Bills } from './Bills'
import { Equipment } from './Equipment'
import { DEFAULT_GUARD, GuardCfg, Loads } from './model'
import { Channels, EventRule, FixedRule, Page, Store, StoreCtx } from './state'
import { at, fmtTime, NOW } from './time'
import { Icon, IconName } from './ui'
import { Watch } from './Watch'
import { RATE } from './data'

const NAV: { id: Page; label: string; icon: IconName }[] = [
  { id: 'watch', label: 'Watch', icon: 'watch' },
  { id: 'alerts', label: 'Alerts', icon: 'bell' },
  { id: 'bills', label: 'Cycle & bills', icon: 'bill' },
  { id: 'equipment', label: 'Equipment', icon: 'plug' },
]

export default function App() {
  const [page, setPage] = useState<Page>('watch')
  const [committed, setCommitted] = useState(at(11, 16, 16, 30))
  const [preview, setPreview] = useState(at(11, 16, 16, 30))
  const [loads, setLoads] = useState<Loads>({ heater: true, lights: true, pug: false })
  const [guard, setGuard] = useState<GuardCfg>(DEFAULT_GUARD)
  const [fixed, setFixed] = useState<FixedRule>({ enabled: true, kw: 18 })
  const [event, setEvent] = useState<EventRule>({ enabled: true, dayBefore: true, hoursBefore: true, flagOverlap: true })
  const [channels, setChannels] = useState<Channels>({ sms: true, email: false, push: true })
  const [reminder, setReminder] = useState<number | null>(null)
  const [toast, setToastState] = useState<{ msg: string; action?: { label: string; run: () => void }; id: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const mainRef = useRef<HTMLElement>(null)

  const showToast = useCallback((msg: string, action?: { label: string; run: () => void }) => {
    window.clearTimeout(timer.current)
    setToastState({ msg, action, id: Date.now() })
    timer.current = window.setTimeout(() => setToastState(null), 7000)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [page])

  const store: Store = {
    page,
    go: setPage,
    committed,
    setCommitted,
    preview,
    setPreview,
    loads,
    setLoads,
    guard,
    patchGuard: (p) => setGuard((g) => ({ ...g, ...p })),
    fixed,
    patchFixed: (p) => setFixed((f) => ({ ...f, ...p })),
    event,
    patchEvent: (p) => setEvent((e) => ({ ...e, ...p })),
    channels,
    patchChannels: (p) => setChannels((c) => ({ ...c, ...p })),
    reminder,
    setReminder,
    toast: showToast,
  }

  return (
    <StoreCtx.Provider value={store}>
      <div className="app">
        <aside className="side">
          <div className="brand">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
              <rect width="32" height="32" rx="8" fill="#c4521d" />
              <path d="M5 23l7-11 5 7 4-5 6 9z" fill="#fff" />
            </svg>
            <span>Peakmind</span>
          </div>
          <nav aria-label="Main">
            {NAV.map((n) => (
              <button key={n.id} type="button" className={'nav' + (page === n.id ? ' on' : '')} aria-current={page === n.id ? 'page' : undefined} onClick={() => setPage(n.id)}>
                <Icon name={n.icon} />
                {n.label}
                {n.id === 'alerts' && !guard.enabled && <span className="dot" aria-label="Needs attention" />}
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <div className="meter">
              <span className="live" />
              <div>
                <b>Meter online</b>
                <small>Last reading {fmtTime(NOW - 10)}</small>
              </div>
            </div>
            <div className="plan">
              <small>Rate plan</small>
              <b>{RATE.name}</b>
              <small>
                On-peak ${RATE.onPeak.toFixed(2)} · off-peak ${RATE.offPeak.toFixed(2)} · ${RATE.demand.toFixed(2)}/kW demand
              </small>
            </div>
            <div className="user">
              <span className="avatar">IC</span>
              <div>
                <b>Ines Calderón</b>
                <small>Ceramics studio</small>
              </div>
            </div>
          </div>
        </aside>
        <main ref={mainRef} className="main">
          <div className="topbar">
            <span>Mon, Nov 16 · {fmtTime(NOW)}</span>
            <span className="top-r">
              Alerts: {guard.enabled ? 'Peak guard' : fixed.enabled ? `${fixed.kw} kW rule` : 'none'}
              {event.enabled ? ' + event notice' : ''}
            </span>
          </div>
          <div className="content">
            {page === 'watch' && <Watch />}
            {page === 'alerts' && <Alerts />}
            {page === 'bills' && <Bills />}
            {page === 'equipment' && <Equipment />}
          </div>
        </main>
        <div className="toast-region" aria-live="polite">
          {toast && (
            <div className="toast" key={toast.id}>
              <span>{toast.msg}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.run()
                    setToastState(null)
                  }}
                >
                  <Icon name="undo" size={15} /> {toast.action.label}
                </button>
              )}
              <button type="button" className="x" aria-label="Dismiss" onClick={() => setToastState(null)}>
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </StoreCtx.Provider>
  )
}
