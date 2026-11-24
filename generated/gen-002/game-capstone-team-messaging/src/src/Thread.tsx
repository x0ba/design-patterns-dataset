import { Fragment, useEffect, useLayoutEffect, useRef } from 'react'
import { MessageView } from './Message'
import { Composer } from './Composer'
import { THREADS } from './data'
import type { Action, State } from './state'
import { dayLabel, sameDay } from './time'
import { ThreadAvatar } from './ui'

export function ThreadView({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const thread = THREADS.find((t) => t.id === state.active)!
  const msgs = state.msgs[thread.id]
  const scroller = useRef<HTMLDivElement>(null)
  const divider = state.divider[thread.id]
  const dividerIdx = msgs.findIndex((m) => m.id === divider)
  const newCount = dividerIdx < 0 ? 0 : msgs.slice(dividerIdx).filter((m) => !m.id.startsWith('new-')).length

  // On opening a conversation: land on the first unread message, otherwise the bottom.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const d = el.querySelector<HTMLElement>('[data-divider]')
    if (d) el.scrollTop = Math.max(0, d.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 64)
    else el.scrollTop = el.scrollHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id])

  // After sending, follow the new message.
  const lastId = msgs[msgs.length - 1]?.id
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (lastId?.startsWith('new-')) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [lastId])

  // Jump to a search result.
  useEffect(() => {
    if (!state.focus) return
    const el = document.getElementById(`msg-${state.focus.id}`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    el.classList.remove('flash')
    void el.offsetWidth
    el.classList.add('flash')
  }, [state.focus])

  const count = thread.total ?? msgs.length

  return (
    <main className="thread" aria-label={`Conversation: ${thread.title}`}>
      <header className="thread-head">
        <ThreadAvatar kind={thread.kind} id={thread.members.find((m) => m !== 'priya')!} size={42} />
        <div className="thread-titles">
          <h1>{thread.title}</h1>
          <p>{thread.subtitle}</p>
        </div>
        <div className="thread-meta">
          <span>{count.toLocaleString('en-US')} messages{thread.total ? ' this term' : ''}</span>
        </div>
      </header>

      <div className="scroller" ref={scroller}>
        <div className="scroll-inner">
          {msgs.map((m, i) => {
            const prev = msgs[i - 1]
            const newDay = !prev || !sameDay(prev.at, m.at)
            const grouped =
              !!prev && !newDay && prev.from === m.from && !m.longRead && !prev.longRead && !m.quote &&
              new Date(m.at).getTime() - new Date(prev.at).getTime() < 8 * 60000 && divider !== m.id
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <div className="day-sep"><span>{dayLabel(m.at)}</span></div>
                )}
                {divider === m.id && (
                  <div className="new-sep" data-divider>
                    <span>{newCount > 1 ? `${newCount} new messages` : 'New message'}</span>
                  </div>
                )}
                <MessageView
                  msg={m}
                  grouped={grouped}
                  onQuote={(q) => dispatch({ type: 'quote', id: thread.id, quote: q })}
                  onOpenFile={(f) => dispatch({ type: 'preview', file: f })}
                />
              </Fragment>
            )
          })}
          <div style={{ height: 8 }} />
        </div>
      </div>

      <Composer thread={thread} state={state} dispatch={dispatch} />
    </main>
  )
}
