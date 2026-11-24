import { useCallback, useEffect, useState } from 'react'
import { DOCS, REDACTIONS, REQUEST, Spot, Tab, USER, WALK_STEPS } from './data'
import { fmtTime, fmtTimeSec, summarize, useStore } from './store'
import { AppCtx, HelpView, Icon, Modal, Popover, useApp } from './ctx'
import { RedactionsView } from './Redactions'
import { LetterView } from './Letter'
import { SignoffView } from './Signoff'
import { AuditView } from './Audit'
import { HelpPanel } from './HelpPanel'
import { editedParas } from './Letter'

export default function App() {
  const { state, dispatch, saving } = useStore()
  const [spot, setSpot] = useState<Spot | null>(null)
  const [help, setHelp] = useState<HelpView>({ kind: 'home' })
  const [helpOpen, setHelpOpen] = useState(true)

  const showMe = useCallback(
    (s: Spot, tab?: Tab) => {
      if (tab) dispatch({ type: 'tab', tab })
      setSpot(null)
      requestAnimationFrame(() => setSpot(s))
    },
    [dispatch],
  )
  useEffect(() => {
    if (!spot) return
    const el = document.querySelector(`[data-spot="${spot}"]`) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      el.classList.add('spot')
    }
    const t = setTimeout(() => {
      el?.classList.remove('spot')
      setSpot(null)
    }, 3200)
    return () => {
      clearTimeout(t)
      el?.classList.remove('spot')
    }
  }, [spot])

  const openHelp = useCallback((v: HelpView) => {
    setHelp(v)
    setHelpOpen(true)
  }, [])

  // Keyboard shortcuts on the Redactions tab
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (state.tab !== 'redactions' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('.modal-bg')) return
      const ids = REDACTIONS.map((r) => r.id)
      const i = ids.indexOf(state.selected)
      const k = e.key.toLowerCase()
      if (k === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        dispatch({ type: 'select', id: ids[Math.min(ids.length - 1, i + 1)] })
      } else if (k === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        dispatch({ type: 'select', id: ids[Math.max(0, i - 1)] })
      } else if (k === 'p') {
        dispatch({ type: 'preview', on: !state.previewRequester })
      } else if ((k === 'a' || k === 'd') && !state.sent) {
        const d = state.decisions[state.selected]
        if (d.status !== 'pending') return
        const red = REDACTIONS[i]
        if (red.confidence === 'medium' && !d.note.trim()) {
          document.getElementById('note-' + red.id)?.focus()
          return
        }
        dispatch({ type: 'decide', id: state.selected, status: k === 'a' ? 'approved' : 'declined' })
        advance(state.selected)
      }
    }
    const advance = (from: string) => {
      const ids = REDACTIONS.map((r) => r.id)
      const start = ids.indexOf(from)
      for (let j = 1; j <= ids.length; j++) {
        const id = ids[(start + j) % ids.length]
        if (id !== from && state.decisions[id].status === 'pending') return dispatch({ type: 'select', id })
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [state, dispatch])

  const ctx = { state, dispatch, saving, spot, showMe, help, openHelp, helpOpen, setHelpOpen }

  return (
    <AppCtx.Provider value={ctx}>
      <div className={`app ${helpOpen ? 'help-open' : ''}`}>
        <TopBar />
        <div className="body">
          <main className="main">
            <RequestHeader />
            <Tabs />
            <div className="tab-body">
              {state.tab === 'redactions' && <RedactionsView />}
              {state.tab === 'letter' && <LetterView />}
              {state.tab === 'signoff' && <SignoffView />}
              {state.tab === 'audit' && <AuditView />}
            </div>
          </main>
          {helpOpen && <HelpPanel />}
        </div>
      </div>
    </AppCtx.Provider>
  )
}

function TopBar() {
  const { state, saving, openHelp, helpOpen, setHelpOpen, dispatch } = useApp()
  const done = state.walkDone.length
  const next = WALK_STEPS.find((w) => !state.walkDone.includes(w.id))
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="26" height="26">
            <rect width="32" height="32" rx="7" fill="#f4efe6" />
            <path d="M9 11h14M9 16h10M9 21h7" stroke="#183a4a" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="brand-name">Clerkwise Assist</span>
        <span className="brand-org">Marren County Clerk-Recorder</span>
      </div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#queue" onClick={(e) => e.preventDefault()} title="Your queue: 6 open requests">My queue <span className="count">6</span></a>
        <Icon name="chev" size={12} />
        <span className="crumb-cur">{REQUEST.id}</span>
      </nav>
      <div className="top-right">
        <button className="walk-pill" data-spot="walk-pill" onClick={() => openHelp(next ? { kind: 'step', id: next.id } : { kind: 'home' })} title="Your walkthrough progress is saved">
          <span className="walk-ring" style={{ ['--p' as string]: `${(done / 5) * 100}%` }} />
          Walkthrough <b>{done} of 5</b>
          {next && <span className="walk-next">· Next: {next.title}</span>}
        </button>
        <SaveStatus saving={saving} />
        <button className={`top-btn ${helpOpen ? 'on' : ''}`} onClick={() => setHelpOpen(!helpOpen)} aria-pressed={helpOpen}>
          <Icon name="help" /> Help
        </button>
        <Popover
          align="right"
          width={260}
          trigger={(_, toggle) => (
            <button className="avatar" onClick={toggle} aria-label={`${USER.name}, account menu`}>
              {USER.initials}
            </button>
          )}
        >
          {(close) => (
            <div className="menu">
              <div className="menu-who">
                <b>{USER.name}</b>
                <span>{USER.title} · Office of the County Clerk-Recorder</span>
              </div>
              <button
                className="menu-item"
                onClick={() => {
                  if (confirm('Reset this demo to its starting state? This clears your decisions and edits in this browser.')) dispatch({ type: 'reset' })
                  close()
                }}
              >
                <Icon name="undo" /> Reset demo data
              </button>
            </div>
          )}
        </Popover>
      </div>
    </header>
  )
}

function SaveStatus({ saving }: { saving: boolean }) {
  const { state, dispatch, openHelp } = useApp()
  const sm = summarize(state)
  const edited = editedParas(state).length
  return (
    <Popover
      align="right"
      width={330}
      trigger={(open, toggle) => (
        <button className={`save ${saving ? 'is-saving' : ''} ${open ? 'on' : ''}`} onClick={toggle} data-spot="save" aria-live="polite">
          {saving ? (
            <>
              <span className="spinner" /> Saving…
            </>
          ) : (
            <>
              <Icon name="check" size={14} /> All changes saved <span className="save-time">{fmtTime(state.lastSaved)}</span>
            </>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="save-pop">
          <div className="save-pop-head">
            <Icon name="cloud" size={18} />
            <div>
              <b>Your work is saved to this request</b>
              <span>Last change saved at {fmtTimeSec(state.lastSaved)}</span>
            </div>
          </div>
          <p>Every decision, note, and letter edit saves the moment you make it. There’s no Save button. You can leave this request or go back to the walkthrough, and your work will be here when you return.</p>
          <ul className="save-list">
            <li><Icon name="check" size={13} /> {sm.decided} of 14 redaction decisions</li>
            <li><Icon name="check" size={13} /> {edited} edited letter paragraph{edited === 1 ? '' : 's'}</li>
            <li><Icon name="check" size={13} /> Notes and sign-off checkboxes</li>
          </ul>
          <div className="callout callout-quiet">
            <b>Saved isn’t sent.</b> Nothing goes to {REQUEST.requester} until you press <i>Send</i> on the Sign-off tab.
          </div>
          <div className="pop-actions">
            <button className="link" onClick={() => { dispatch({ type: 'tab', tab: 'audit' }); close() }}>View audit trail</button>
            <button className="link" onClick={() => { openHelp({ kind: 'article', id: 'a19' }); close() }}>How saving works</button>
          </div>
        </div>
      )}
    </Popover>
  )
}

function RequestHeader() {
  const { state } = useApp()
  const [docsOpen, setDocsOpen] = useState(false)
  const sm = summarize(state)
  const status = state.sent ? (state.sent.mode === 'requester' ? 'Sent' : 'With supervisor') : 'In progress'
  return (
    <section className="req-head">
      <div className="req-main">
        <div className="req-line1">
          <span className="req-id">{REQUEST.id}</span>
          <span className={`status status-${status.replace(' ', '-').toLowerCase()}`}>{status}</span>
        </div>
        <h1>{REQUEST.title}</h1>
        <div className="req-meta">
          <span><Icon name="user" size={14} /> {REQUEST.requester}, {REQUEST.requesterOrg} <span className="tag">Press</span></span>
          <span><Icon name="mail" size={14} /> Received {REQUEST.received}</span>
          <button className="link meta-link" onClick={() => setDocsOpen(true)}>
            <Icon name="doc" size={14} /> {REQUEST.docs} records · {REQUEST.pages} pages
          </button>
          <Popover
            width={380}
            trigger={(_, toggle) => (
              <button className="link meta-link" onClick={toggle}>
                <Icon name="list" size={14} /> Request wording
              </button>
            )}
          >
            {() => (
              <div className="pop-pad">
                <div className="eyebrow">As submitted by {REQUEST.requester}</div>
                <p className="quote">{REQUEST.wording}</p>
              </div>
            )}
          </Popover>
        </div>
      </div>
      <div className="req-side">
        <div className={`deadline ${state.sent?.mode === 'requester' ? 'met' : ''}`}>
          <Icon name="clock" size={18} />
          <div>
            <div className="deadline-label">{state.sent?.mode === 'requester' ? 'Responded on time' : 'Statutory deadline'}</div>
            <div className="deadline-date">{REQUEST.due}</div>
            {state.sent?.mode !== 'requester' && <div className="deadline-left"><b>2 business days</b> left · PRA § 4(a)</div>}
          </div>
        </div>
        <div className="mini-progress" aria-label="Response progress">
          <Step label="Redactions" value={`${sm.decided}/14`} done={sm.decided === 14} active={sm.decided < 14} />
          <Step label="Letter" value={state.letterReviewed ? 'Read' : 'Draft'} done={state.letterReviewed} active={sm.decided === 14 && !state.letterReviewed} />
          <Step label="Sign-off" value={state.sent ? 'Done' : '—'} done={!!state.sent} active={false} />
        </div>
      </div>
      {docsOpen && <DocsModal onClose={() => setDocsOpen(false)} />}
    </section>
  )
}

function Step({ label, value, done, active }: { label: string; value: string; done: boolean; active: boolean }) {
  return (
    <div className={`mp-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
      <span className="mp-dot">{done && <Icon name="check" size={10} />}</span>
      <span className="mp-label">{label}</span>
      <span className="mp-val">{value}</span>
    </div>
  )
}

function Tabs() {
  const { state, dispatch } = useApp()
  const sm = summarize(state)
  const ready = sm.decided === 14 && sm.mediumOk && state.letterReviewed
  const tabs: { id: Tab; label: string; meta: string; spot?: string }[] = [
    { id: 'redactions', label: 'Redactions', meta: `${sm.decided} of 14 reviewed` },
    { id: 'letter', label: 'Response letter', meta: state.letterReviewed ? 'Read in full' : 'Draft · not yet read in full' },
    { id: 'signoff', label: 'Sign-off & send', meta: state.sent ? (state.sent.mode === 'requester' ? 'Sent' : 'With supervisor') : ready ? 'Ready' : 'Locked until review is done', spot: 'signoff-tab' },
    { id: 'audit', label: 'Audit trail', meta: `${state.audit.length} entries`, spot: 'audit-tab' },
  ]
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={state.tab === t.id} className={`tab ${state.tab === t.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'tab', tab: t.id })} data-spot={t.spot}>
          <span className="tab-label">
            {t.id === 'signoff' && !state.sent && <Icon name={ready ? 'send' : 'lock'} size={13} />}
            {t.label}
          </span>
          <span className="tab-meta">{t.meta}</span>
        </button>
      ))}
    </div>
  )
}

function DocsModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp()
  const redByDoc: Record<string, string[]> = {}
  for (const r of REDACTIONS) (redByDoc[r.docId] ??= []).push(r.id)
  return (
    <Modal title={`Responsive records · ${DOCS.length} documents, ${DOCS.reduce((a, d) => a + d.pages, 0)} pages`} onClose={onClose} width={820}>
      <p className="muted small">You marked these responsive on Fri, Nov 13. 14 of them contain suggested redactions. Click one to review it.</p>
      <div className="docs-table">
        <div className="docs-row docs-th">
          <span>ID</span><span>Date</span><span>From → To</span><span>Subject</span><span>Pages</span><span>Redactions</span>
        </div>
        {DOCS.map((d) => {
          const rs = redByDoc[d.id]
          return (
            <button
              key={d.id}
              className={`docs-row ${rs ? 'has' : ''}`}
              disabled={!rs}
              onClick={() => {
                if (!rs) return
                dispatch({ type: 'tab', tab: 'redactions' })
                dispatch({ type: 'select', id: rs[0] })
                onClose()
              }}
            >
              <span className="mono">{d.id}</span>
              <span>{d.date.replace(', 2026', '')}</span>
              <span className="trunc">{d.from.replace(/ \(.*\)/, '')} → {d.to.replace(/ \(.*\)/, '')}</span>
              <span className="trunc">{d.subject}</span>
              <span>{d.pages}</span>
              <span>{rs ? rs.join(', ') : '—'}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
