import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, FileText, ListChecks, Shield, Users2, X } from 'lucide-react'
import { Provider, useStore, NAMES, Tab } from './store'
import { changedMemoIds, countChangedAudiences } from './logic'
import { MEMOS } from './data'
import Audiences from './Audiences'
import Memos from './Memos'
import Review from './Review'

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="2" y="5" width="5" height="17" rx="1" fill="#1b4b43" />
      <rect x="9" y="2" width="5" height="20" rx="1" fill="#2f7a6d" />
      <rect x="16" y="7" width="5" height="15" rx="1" fill="#b7791f" transform="rotate(8 18.5 22)" />
      <rect x="1" y="22" width="24" height="2" rx="1" fill="#1d2733" />
    </svg>
  )
}

function Shell() {
  const { s, d } = useStore()
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => { if (s.toast) { const t = setTimeout(() => d({ type: 'toast', value: '' }), 5000); return () => clearTimeout(t) } }, [s.toast])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [s.tab])

  const changedAud = countChangedAudiences(s.published, s.draft)
  const decisions = Object.keys(s.decisions).length
  const memoChanges = changedMemoIds(s.decisions, s.pubDecisions).length
  const total = changedAud + memoChanges + (s.historicalPublic !== s.pubHistoricalPublic ? 1 : 0)
  const me = NAMES[s.user]
  const initials = me.name.split(' ').map((x) => x[0]).join('')
  const statusLabel = { draft: 'Draft, not submitted', changes: 'Changes requested', pending: 'Awaiting Marcus Bell', approved: 'Approved, not published', scheduled: 'Scheduled for Jan 1' }[s.status]
  const tabs: { id: Tab; label: string; icon: typeof Users2; badge?: string }[] = [
    { id: 'audiences', label: 'Audiences', icon: Users2, badge: changedAud ? String(changedAud) : undefined },
    { id: 'memos', label: 'Interpretation memos', icon: FileText, badge: `${decisions}/${MEMOS.filter((m) => m.changed || m.flagged).length}` },
    { id: 'review', label: 'Review & publish', icon: ListChecks },
  ]

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="brand"><Logo /><div><div className="brand-n"><b>Codeshelf</b> Municipal</div><span>City of Lindenwood · Development Services</span></div></div>
          <nav className="tabs" aria-label="Sections">
            {tabs.map((t) => (
              <button key={t.id} className={s.tab === t.id ? 'on' : ''} aria-current={s.tab === t.id ? 'page' : undefined} onClick={() => d({ type: 'tab', tab: t.id })}>
                <t.icon size={15} />{t.label}{t.badge && <span className="badge">{t.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="top-right">
            <button className={`status st-${s.status}`} onClick={() => d({ type: 'tab', tab: 'review' })} title="Open review">
              <i />{statusLabel}{total > 0 && s.status !== 'pending' && <span>{total} change{total > 1 ? 's' : ''}</span>}
            </button>
            <div className="user" ref={ref}>
              <button className="user-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
                <span className="avatar">{initials}</span>
                <span className="user-t"><b>{me.name}</b><span>{me.role}</span></span>
                <ChevronDown size={14} />
              </button>
              {menu && (
                <div className="menu" role="menu">
                  <div className="menu-h">Switch user (demo)</div>
                  {(['priya', 'marcus'] as const).map((w) => (
                    <button key={w} role="menuitem" onClick={() => { d({ type: 'user', user: w }); setMenu(false) }}>
                      <span className="avatar sm">{NAMES[w].name.split(' ').map((x) => x[0]).join('')}</span>
                      <span><b>{NAMES[w].name}</b><em>{NAMES[w].role}{w === 'marcus' ? ' · approver' : ''}</em></span>
                      {s.user === w && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {s.user === 'marcus' && (
        <div className="asbar"><Shield size={14} /> Viewing as the approver. Settings are read-only; use Review & publish to approve.</div>
      )}

      <main>
        {s.tab === 'audiences' && <Audiences />}
        {s.tab === 'memos' && <Memos />}
        {s.tab === 'review' && <Review />}
      </main>

      {s.toast && (
        <div className="toast" role="status"><Check size={15} />{s.toast}<button aria-label="Dismiss" onClick={() => d({ type: 'toast', value: '' })}><X size={14} /></button></div>
      )}
    </>
  )
}

export default function App() {
  return <Provider><Shell /></Provider>
}
