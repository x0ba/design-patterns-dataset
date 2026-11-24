import { useCallback, useEffect, useReducer, useState } from 'react'
import { ESPORTS_ID, SPEND_OPENS, TODAY, VOTED_ON } from './data'
import { initialState, isCommitted, longDate, reducer, shortDate, daysBetween } from './model'
import { EsportsCard, Levers, PoolStrip, Rail } from './Panels'
import { AwardTable, Tab } from './Table'
import { CommitDialog, RescissionDialog } from './Dialogs'
import { AuditView, RescissionsView } from './Views'

type View = 'alloc' | 'rx' | 'audit'

export default function App() {
  const [s, d] = useReducer(reducer, undefined, initialState)
  const [view, setView] = useState<View>('alloc')
  const [tab, setTab] = useState<Tab>('pending')
  const [filters, setFilters] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [rescind, setRescind] = useState<string | null>(null)
  const [commitOpen, setCommitOpen] = useState(false)
  const committed = isCommitted(s)

  // auto-dismiss toast
  useEffect(() => {
    if (!s.toast) return
    const id = setTimeout(() => d({ type: 'dismissToast' }), 9000)
    return () => clearTimeout(id)
  }, [s.toast])

  // after commit the default tab becomes "committed"
  useEffect(() => {
    if (committed) setTab('committed')
  }, [committed])

  const scrollTo = (id: string) =>
    setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      const y = el.getBoundingClientRect().top + window.scrollY - 140
      window.scrollTo({ top: y, behavior: 'smooth' })
      el.classList.remove('flash')
      void el.offsetWidth
      el.classList.add('flash')
    }, 60)

  const focusAward = useCallback(
    (id: string) => {
      setView('alloc')
      const isCommittedRow = committed && s.committed[id] !== undefined
      setTab(isCommittedRow ? 'committed' : s.adj[id]?.deferred ? 'held' : 'pending')
      setFilters(new Set())
      setOpenId(id)
      scrollTo('row-' + id)
    },
    [committed, s.adj, s.committed],
  )

  const showFilter = (keys: string[]) => {
    setTab('pending')
    setFilters(new Set(keys))
    setOpenId(null)
    scrollTo('award-table')
  }

  const toggleFilter = (k: string) =>
    setFilters((f) => {
      const n = new Set(f)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#f6f3ec" />
            <rect x="7" y="17" width="4" height="7" fill="#134e3f" />
            <rect x="14" y="12" width="4" height="12" fill="#134e3f" />
            <rect x="21" y="8" width="4" height="16" fill="#134e3f" />
            <rect x="5" y="25" width="22" height="2" fill="#e7b24a" />
          </svg>
          Fundfloor
          <small>Associated Students · Finance Committee</small>
        </div>
        <nav className="nav" aria-label="Main">
          <button aria-current={view === 'alloc' ? 'page' : undefined} onClick={() => setView('alloc')}>Allocations</button>
          <button aria-current={view === 'rx' ? 'page' : undefined} onClick={() => setView('rx')}>
            Rescissions &amp; appeals
            {s.rescissions.length > 0 && <span className="badge">{s.rescissions.length}</span>}
          </button>
          <button aria-current={view === 'audit' ? 'page' : undefined} onClick={() => setView('audit')}>Audit log</button>
        </nav>
        <div className="who">
          <div style={{ textAlign: 'right' }}>
            <b>Jordan Mbeki</b>
            <span>Treasurer · Chair</span>
          </div>
          <div className="av" aria-hidden>JM</div>
        </div>
      </header>

      <main className="page">
        {view === 'alloc' && (
          <>
            <div className="titlerow">
              <div>
                <div className="eyebrow">Spring 2027 · Student activity fee pool</div>
                <h1>{committed ? 'Spring allocations are committed' : 'Commit spring allocations'}</h1>
              </div>
              <div className="dates">
                <div className="datechip">Committee voted<b>{longDate(VOTED_ON)}</b></div>
                <div className="datechip">Spending opens<b>{shortDate(SPEND_OPENS)} · in {daysBetween(TODAY, SPEND_OPENS)} days</b></div>
              </div>
            </div>
            <div className="layout">
              <div className="main">
                <PoolStrip s={s} />
                {!committed && <EsportsCard s={s} onWalkBack={() => setRescind(ESPORTS_ID)} onSeeRx={() => setView('rx')} />}
                {!committed && <Levers s={s} d={d} showFilter={showFilter} focusAward={focusAward} />}
                <AwardTable
                  s={s}
                  d={d}
                  tab={tab}
                  setTab={(x) => {
                    setTab(x)
                    setOpenId(null)
                  }}
                  filters={filters}
                  toggleFilter={toggleFilter}
                  clearFilters={() => setFilters(new Set())}
                  openId={openId}
                  setOpenId={setOpenId}
                  onRescind={setRescind}
                />
              </div>
              <Rail
                s={s}
                d={d}
                onCommit={() => setCommitOpen(true)}
                onWalkBack={() => setRescind(ESPORTS_ID)}
                focusAward={focusAward}
                onSeeRx={() => setView('rx')}
              />
            </div>
          </>
        )}
        {view === 'rx' && <RescissionsView s={s} />}
        {view === 'audit' && <AuditView s={s} />}
      </main>

      {rescind && (
        <RescissionDialog
          reqId={rescind}
          s={s}
          onClose={() => setRescind(null)}
          onConfirm={(to, reason) => {
            d({ type: 'rescind', reqId: rescind, to, reason })
            setRescind(null)
          }}
        />
      )}
      {commitOpen && (
        <CommitDialog
          s={s}
          onClose={() => setCommitOpen(false)}
          onConfirm={() => {
            d({ type: 'commit' })
            setCommitOpen(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}
      {s.toast && (
        <div className="toast" role="status">
          <span>{s.toast.text}</span>
          {s.toast.undo && <button onClick={() => d({ type: 'undo' })}>Undo</button>}
          <button className="dismiss" aria-label="Dismiss" onClick={() => d({ type: 'dismissToast' })}>×</button>
        </div>
      )}
    </>
  )
}
