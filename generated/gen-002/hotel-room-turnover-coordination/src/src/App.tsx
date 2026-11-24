import { Lock, X } from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { TopBar } from './TopBar'
import { Board } from './Board'
import { Attendants, OutOfOrder } from './Attendants'
import { Arrivals } from './Arrivals'
import { ContextCard } from './ContextCard'
import { Feed } from './Feed'
import { ACTOR_INFO } from './ui'
import { useEffect } from 'react'

function Toast() {
  const { s, dispatch } = useStore()
  const t = s.toast
  if (!t) return null
  return (
    <div className={`toast ${t.tone}`} role="status" key={t.id}>
      {t.tone === 'warn' && <Lock size={16} color="var(--warn)" />}
      <span>{t.text}</span>
      {t.switchTo && s.actor !== t.switchTo && (
        <button className="btn sm pri" onClick={() => dispatch({ type: 'setActor', actor: t.switchTo! })}>
          Hand to {ACTOR_INFO[t.switchTo].name.split(' ')[0]}
        </button>
      )}
      <button onClick={() => dispatch({ type: 'dismissToast' })} aria-label="Dismiss" style={{ color: 'var(--muted)', display: 'grid' }}>
        <X size={15} />
      </button>
    </div>
  )
}

function Shell() {
  const { s, dispatch } = useStore()
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (s.selRoom != null) dispatch({ type: 'selectRoom', id: s.selRoom })
        else if (s.selGuest) dispatch({ type: 'selectGuest', id: s.selGuest })
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [s.selRoom, s.selGuest, dispatch])
  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <div className="col">
          <Board />
          <div className="bottom">
            <Attendants />
            <OutOfOrder />
          </div>
        </div>
        <div className="col">
          <Arrivals />
        </div>
        <div className="col">
          <ContextCard />
          <Feed />
        </div>
      </div>
      <Toast />
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
