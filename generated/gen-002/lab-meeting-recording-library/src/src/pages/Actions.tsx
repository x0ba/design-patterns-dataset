import { useState } from 'react'
import { TODAY, recById } from '../data/recordings'
import { personById } from '../data/people'
import { Avatar } from '../components/bits'
import { Icon } from '../components/Icon'
import { toggleAction, useActions } from '../lib/actions'
import { clock, daysBetween, shortDate, weekday } from '../lib/format'
import { go } from '../lib/router'
import { playClip } from '../lib/player'

export function Actions() {
  const items = useActions()
  const [who, setWho] = useState<'me' | 'all'>('me')
  const list = items
    .filter((a) => who === 'all' || a.owner === 'me')
    .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due))
  const open = list.filter((a) => !a.done)
  const done = list.filter((a) => a.done)
  const mineOpen = items.filter((a) => a.owner === 'me' && !a.done).length

  const Row = ({ a }: { a: (typeof items)[number] }) => {
    const left = daysBetween(TODAY, a.due)
    const over = !a.done && left < 0
    const r = recById(a.rec)
    const p = personById(a.owner)
    return (
      <li className={`act${a.done ? ' done' : ''}${a.owner === 'me' ? ' mine' : ''}`}>
        <button className={`check${a.done ? ' on' : ''}`} onClick={() => toggleAction(a.id)} aria-pressed={a.done} aria-label={`Mark “${a.text}” ${a.done ? 'not done' : 'done'}`}>
          {a.done && <Icon name="check" size={14} />}
        </button>
        <div className="act-main">
          <div className="act-text">{a.text}</div>
          <div className="act-src">
            Captured in {r.short} at <span className="tnum">{clock(a.at)}</span>
          </div>
        </div>
        <div className="act-owner">
          <Avatar id={a.owner} size={24} />
          <span>{a.owner === 'me' ? 'You' : p.name}</span>
        </div>
        <div className={`act-due${over ? ' over' : left <= 3 && !a.done ? ' soon' : ''}`}>
          <b>{weekday(a.due)} {shortDate(a.due)}</b>
          <small>{a.done ? 'Done' : over ? `${-left} day${-left > 1 ? 's' : ''} overdue` : left === 0 ? 'Today' : `in ${left} days`}</small>
        </div>
        <div className="act-btns">
          <button className="btn soft sm" onClick={() => playClip({ id: `act-${a.id}`, rec: a.rec, start: Math.max(0, a.at - 20), end: a.at + 70, label: `Action item · ${r.short}` })}>
            <Icon name="play" size={12} /> Hear it
          </button>
          <button className="link" onClick={() => go(`/rec/${a.rec}?at=${a.at}`)}>Transcript</button>
        </div>
      </li>
    )
  }

  return (
    <div className="page actions">
      <div className="page-head row-head">
        <div>
          <div className="eyebrow">Action items</div>
          <h1>{who === 'me' ? 'Assigned to you' : 'Everyone’s action items'}</h1>
          <p className="lede">
            Nine were captured across the six recordings. {mineOpen} {mineOpen === 1 ? 'is' : 'are'} yours and still open.
          </p>
        </div>
        <div className="controls">
          <div className="seg" role="group" aria-label="Whose items">
            <button className={who === 'me' ? 'on' : ''} aria-pressed={who === 'me'} onClick={() => setWho('me')}>Assigned to you · {items.filter((a) => a.owner === 'me').length}</button>
            <button className={who === 'all' ? 'on' : ''} aria-pressed={who === 'all'} onClick={() => setWho('all')}>Everyone · {items.length}</button>
          </div>
        </div>
      </div>

      <h3 className="group-h">Open <span>{open.length}</span></h3>
      <ul className="act-list">{open.map((a) => <Row key={a.id} a={a} />)}</ul>
      {open.length === 0 && <p className="muted">Nothing open.</p>}

      {done.length > 0 && (
        <>
          <h3 className="group-h">Done <span>{done.length}</span></h3>
          <ul className="act-list">{done.map((a) => <Row key={a.id} a={a} />)}</ul>
        </>
      )}
    </div>
  )
}
