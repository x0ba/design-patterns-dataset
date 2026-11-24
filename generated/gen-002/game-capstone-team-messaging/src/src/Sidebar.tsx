import { useMemo, useRef, useEffect } from 'react'
import { BETA_DUE, PEOPLE, THREADS, ME } from './data'
import { IconCheck, IconSearch, Logo } from './icons'
import type { Action, State, TaskId } from './state'
import { daysUntil, listStamp } from './time'
import { Avatar, ThreadAvatar } from './ui'

const TASKS: { id: TaskId; thread: string; title: string; sub: string }[] = [
  { id: 'dana', thread: 'dana', title: 'Reply to Dana', sub: 'Thank her, pick a call time, ask one question' },
  { id: 'staff', thread: 'staff', title: 'Confirm the milestone plan', sub: 'Office hours Mon and Wed, 2 to 3 pm' },
  { id: 'jonah', thread: 'jonah', title: 'Check in with Jonah', sub: 'Private message, low pressure' },
]

function snippet(text: string, q: string) {
  const plain = text.replace(/^## /gm, '').replace(/^- /gm, '').replace(/\*/g, '').replace(/\s+/g, ' ')
  const i = plain.toLowerCase().indexOf(q.toLowerCase())
  const start = Math.max(0, i - 36)
  const pre = (start > 0 ? '…' : '') + plain.slice(start, i)
  const hit = plain.slice(i, i + q.length)
  const post = plain.slice(i + q.length, i + q.length + 70) + (i + q.length + 70 < plain.length ? '…' : '')
  return { pre, hit, post }
}

export function Sidebar({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const search = useRef<HTMLInputElement>(null)
  const q = state.query.trim()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const rows = useMemo(
    () =>
      THREADS.map((t) => {
        const list = state.msgs[t.id]
        const last = list[list.length - 1]
        return { t, last, unread: list.filter((m) => m.unread).length }
      }).sort((a, b) => +new Date(b.last.at) - +new Date(a.last.at)),
    [state.msgs],
  )
  const totalUnread = rows.reduce((n, r) => n + r.unread, 0)

  const results = useMemo(() => {
    if (q.length < 2) return []
    const out: { threadId: string; msgId: string; who: string; at: string; s: ReturnType<typeof snippet> }[] = []
    for (const t of THREADS) {
      for (const m of [...state.msgs[t.id]].reverse()) {
        if (m.text.toLowerCase().includes(q.toLowerCase())) out.push({ threadId: t.id, msgId: m.id, who: m.from, at: m.at, s: snippet(m.text, q) })
      }
    }
    return out.slice(0, 40)
  }, [q, state.msgs])

  const done = Object.values(state.tasks).filter(Boolean).length
  const days = daysUntil(BETA_DUE)

  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo />
        <div>
          <b>Studio Hours</b>
          <span>DSGN 192 · Game Design Capstone</span>
        </div>
      </div>

      <label className="search">
        <IconSearch />
        <input
          ref={search}
          value={state.query}
          onChange={(e) => dispatch({ type: 'query', q: e.target.value })}
          onKeyDown={(e) => e.key === 'Escape' && dispatch({ type: 'query', q: '' })}
          placeholder="Search messages"
          aria-label="Search messages"
        />
        <kbd>⌘K</kbd>
      </label>

      {q.length >= 2 ? (
        <div className="list-scroll" aria-live="polite">
          <div className="list-label"><span>{results.length ? `${results.length} result${results.length > 1 ? 's' : ''}` : 'No matches'}</span></div>
          {results.map((r) => (
            <button
              key={r.msgId}
              className="result"
              onClick={() => {
                dispatch({ type: 'open', id: r.threadId })
                dispatch({ type: 'query', q: '' })
                setTimeout(() => dispatch({ type: 'focus', id: r.msgId }), 30)
              }}
            >
              <span className="result-top"><b>{THREADS.find((t) => t.id === r.threadId)!.title}</b><span>{listStamp(r.at)}</span></span>
              <span className="result-snip"><em>{r.who === ME ? 'You' : PEOPLE[r.who].first}:</em> {r.s.pre}<mark>{r.s.hit}</mark>{r.s.post}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="list-label">
            <span>Conversations</span>
            {totalUnread > 0 && <span className="unread-total">{totalUnread} unread</span>}
          </div>
          <nav className="list-scroll" aria-label="Conversations">
            {rows.map(({ t, last, unread }) => {
              const active = state.active === t.id
              const mine = last.from === ME
              const preview = last.longRead
                ? 'Notes on v0.7, in three points'
                : last.text.replace(/^## /gm, '').replace(/\n+/g, ' ').replace(/\*/g, '')
              return (
                <button key={t.id} className={`conv ${active ? 'is-active' : ''} ${unread ? 'has-unread' : ''}`} onClick={() => dispatch({ type: 'open', id: t.id })} aria-current={active ? 'true' : undefined}>
                  <ThreadAvatar kind={t.kind} id={t.members.find((m) => m !== ME)!} size={40} />
                  <span className="conv-main">
                    <span className="conv-top">
                      <b>{t.title}</b>
                      <time>{listStamp(last.at)}</time>
                    </span>
                    <span className="conv-bottom">
                      <span className="conv-preview">
                        {t.kind === 'team' || t.kind === 'staff' ? <em>{mine ? 'You' : PEOPLE[last.from].first.replace('Prof. ', '')}: </em> : mine ? <em>You: </em> : null}
                        {preview}
                      </span>
                      {unread > 0 && <span className="badge" aria-label={`${unread} unread`}>{unread}</span>}
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>
        </>
      )}

      <section className="todo" aria-label="Before the beta milestone">
        <div className="todo-head">
          <div>
            <span className="eyebrow">Beta milestone</span>
            <b>Tue, Dec 1 · 11:59 PM</b>
          </div>
          <div className="countdown"><b>{days}</b><span>days</span></div>
        </div>
        <ul>
          {TASKS.map((t) => (
            <li key={t.id} className={state.tasks[t.id] ? 'done' : ''}>
              <button className="check" role="checkbox" aria-checked={state.tasks[t.id]} aria-label={`Mark "${t.title}" ${state.tasks[t.id] ? 'not done' : 'done'}`} onClick={() => dispatch({ type: 'task', id: t.id })}>
                {state.tasks[t.id] && <IconCheck width={12} height={12} />}
              </button>
              <button className="todo-text" onClick={() => dispatch({ type: 'open', id: t.thread })}>
                <b>{t.title}</b>
                <span>{t.sub}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="todo-foot">{done === 3 ? 'All three sent. Nice work.' : `${done} of 3 done tonight`}</div>
      </section>

      <div className="me">
        <Avatar id={ME} size={32} />
        <div>
          <b>Priya Raman</b>
          <span>Producer · Team Tether · Week 12 of 15</span>
        </div>
      </div>
    </aside>
  )
}
