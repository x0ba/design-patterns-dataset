import type { ReactNode } from 'react'
import { ART_TASKS, BETA_DUE, FILES, PEOPLE, PLAN_ITEMS, POINTS, SLOT_BY_ID, THREAD_FILES } from './data'
import { Calendar } from './Calendar'
import { IconCalendar, IconCheck, IconFile, IconQuote } from './icons'
import type { Action, State } from './state'
import { daysUntil, slotLabel } from './time'
import { Avatar } from './ui'

function Card({ title, aside, children, className = '' }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <header className="card-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

function Files({ ids, onOpen }: { ids: string[]; onOpen: (id: string) => void }) {
  if (!ids.length) return null
  return (
    <Card title="Shared files" aside={<span className="card-aside">{ids.length}</span>}>
      <ul className="file-list">
        {ids.map((id) => (
          <li key={id}>
            <button onClick={() => onOpen(id)}>
              <span className="file-ico"><IconFile width={18} height={18} /></span>
              <span>
                <b>{FILES[id].name}</b>
                <small>{FILES[id].blurb}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function Panel({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const id = state.active
  const pending = state.pending[id]
  const open = (f: string) => dispatch({ type: 'preview', file: f })
  const files = <Files ids={THREAD_FILES[id]} onOpen={open} />
  const slot = pending?.slot ? SLOT_BY_ID[pending.slot] : undefined

  if (id === 'dana') {
    const msgId = state.msgs.dana.find((m) => m.longRead)!.id
    return (
      <aside className="panel" aria-label="Conversation details">
        <Card title="Dana's three points" aside={<span className="card-aside">Fri, Nov 13</span>}>
          <ol className="points">
            {POINTS.map((p) => (
              <li key={p.n}>
                <span className="point-n">{p.n}</span>
                <div>
                  <b>{p.title}</b>
                  <span>{p.gist}</span>
                  <div className="row-actions">
                    <button onClick={() => document.getElementById(`${msgId}-point-${p.n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Jump to it</button>
                    <button onClick={() => dispatch({ type: 'quote', id, quote: { who: `Dana, point ${p.n}`, text: p.title, msgId } })}>
                      <IconQuote width={13} height={13} /> Quote in reply
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Pick a call time" aside={<span className="card-aside">30 min · Pacific</span>}>
          <p className="card-note">Dana is free in the teal blocks. Tap one 30-minute slot to propose it in your reply.</p>
          <Calendar mode="mentor" selected={pending?.slot} onSelect={(s) => dispatch({ type: 'slot', id, slot: s })} />
          <div className={`slot-summary ${slot ? 'has' : ''}`}>
            <IconCalendar width={16} height={16} />
            {slot ? <span><b>{slotLabel(slot.day, slot.start, slot.end, true)}</b> is attached to your reply.</span> : <span>No time chosen yet. Plum blocks are Prof. Halvorsen's office hours, shown so you can avoid clashes.</span>}
          </div>
        </Card>
        {files}
      </aside>
    )
  }

  if (id === 'staff') {
    const days = daysUntil(BETA_DUE)
    return (
      <aside className="panel" aria-label="Conversation details">
        <Card title="Plan on file" aside={<span className="card-aside">Posted Nov 6</span>}>
          <p className="card-note">Beta is due <b>Tue, Dec 1 at 11:59 PM</b>, {days} days out. This is the scope the staff last saw.</p>
          <ul className="plan">
            {PLAN_ITEMS.map((p) => (
              <li key={p.text}>
                <span className="plan-dot" />
                <div>
                  <span>{p.text}</span>
                  {p.flag && <em>{p.flag}</em>}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Office hours" aside={<span className="card-aside">Mon and Wed · 2 to 3 pm</span>}>
          <p className="card-note">Tap a block to say you'll drop in. Monday is tomorrow.</p>
          <Calendar mode="office" selected={pending?.slot} onSelect={(s) => dispatch({ type: 'slot', id, slot: s })} />
          <div className={`slot-summary ${slot ? 'has' : ''}`}>
            <IconCalendar width={16} height={16} />
            {slot ? <span><b>{slotLabel(slot.day, slot.start, slot.end, true)}</b> is attached to your reply.</span> : <span>No block chosen. Teal blocks are Dana's open call times.</span>}
          </div>
        </Card>
        {files}
      </aside>
    )
  }

  if (id === 'jonah') {
    const j = PEOPLE.jonah
    return (
      <aside className="panel" aria-label="Conversation details">
        <Card title="Worth remembering">
          <div className="person-line">
            <Avatar id="jonah" size={40} />
            <div>
              <b>{j.name}</b>
              <span>{j.title}</span>
            </div>
          </div>
          <ul className="facts">
            <li><span>Your last chat</span>Nov 11. Jonah said Thursday night was dicey because a Ling 140 paper was due Friday.</li>
            <li><span>Last post in team thread</span>Wed, Nov 11 at 11:26 PM, four days ago.</li>
            <li><span>Earlier this term</span>Midterms slowed the tileset, and Jonah said so up front.</li>
          </ul>
        </Card>

        <Card title="Open art tasks" aside={<span className="card-aside">{ART_TASKS.filter((t) => t.state === 'open').length} open</span>}>
          <ul className="tasks">
            {ART_TASKS.map((t) => (
              <li key={t.name} className={t.state}>
                <span className="task-mark">{t.state === 'done' && <IconCheck width={11} height={11} />}</span>
                <div>
                  <b>{t.name}</b>
                  <span>{t.note}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    )
  }

  // team
  const asks = state.msgs.team.filter((m) => m.unread && m.text.includes('?'))
  return (
    <aside className="panel" aria-label="Conversation details">
      {asks.length > 0 && (
        <Card title="Questions for you" aside={<span className="card-aside">from today</span>}>
          <ul className="asks">
            {asks.map((m) => (
              <li key={m.id}>
                <Avatar id={m.from} size={28} />
                <div>
                  <b>{PEOPLE[m.from].first}</b>
                  <span>{m.text.match(/[^.?!]*\?/)?.[0].replace(/^\s*also\s+/i, '').trim().replace(/^./, (c) => c.toUpperCase())}</span>
                  <div className="row-actions">
                    <button onClick={() => dispatch({ type: 'quote', id, quote: { who: PEOPLE[m.from].first, text: m.text.slice(0, 120), msgId: m.id } })}>
                      <IconQuote width={13} height={13} /> Quote in reply
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card title="Team Tether" aside={<span className="card-aside">5 students</span>}>
        <ul className="members">
          {['priya', 'jonah', 'tomas', 'wen', 'aisha'].map((m) => (
            <li key={m}>
              <Avatar id={m} size={32} />
              <div>
                <b>{PEOPLE[m].name}{m === 'priya' && <small> (you)</small>}</b>
                <span>{PEOPLE[m].title}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="card-note" style={{ marginTop: 10 }}>
          Dana (mentor) and the course staff have their own threads, separate from this one.
        </p>
      </Card>
      {files}
    </aside>
  )
}

