import { memo } from 'react'
import { FILES, PEOPLE, SLOT_BY_ID, ME } from './data'
import type { Msg, Quote } from './data/types'
import { IconCalendar, IconFile, IconQuote } from './icons'
import { slotLabel, timeOf } from './time'
import { Avatar, RoleTag, inline, wordCount } from './ui'

type Block =
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'h'; n?: number; title: string }

export function parseBlocks(text: string): Block[] {
  const out: Block[] = []
  let para: string[] = []
  let list: string[] = []
  const flush = () => {
    if (para.length) out.push({ t: 'p', text: para.join(' ') })
    if (list.length) out.push({ t: 'ul', items: list })
    para = []
    list = []
  }
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      flush()
    } else if (line.startsWith('## ')) {
      flush()
      const m = line.slice(3).match(/^(\d+)\.\s+(.*)$/)
      out.push(m ? { t: 'h', n: Number(m[1]), title: m[2] } : { t: 'h', title: line.slice(3) })
    } else if (line.startsWith('- ')) {
      if (para.length) {
        out.push({ t: 'p', text: para.join(' ') })
        para = []
      }
      list.push(line.slice(2))
    } else {
      if (list.length) {
        out.push({ t: 'ul', items: list })
        list = []
      }
      para.push(line)
    }
  }
  flush()
  return out
}

interface Props {
  msg: Msg
  grouped: boolean
  onQuote: (q: Quote) => void
  onOpenFile: (id: string) => void
}

function MessageImpl({ msg, grouped, onQuote, onOpenFile }: Props) {
  const p = PEOPLE[msg.from]
  const mine = msg.from === ME
  const blocks = parseBlocks(msg.text)
  const words = msg.longRead ? wordCount(msg.text) : 0
  const quoteMe = () => {
    const plain = msg.text.replace(/^## /gm, '').replace(/\*/g, '').replace(/\s+/g, ' ')
    onQuote({ who: p.first, text: plain.length > 150 ? plain.slice(0, 147).trimEnd() + '…' : plain, msgId: msg.id })
  }
  const slot = msg.call ? SLOT_BY_ID[msg.call] : undefined

  return (
    <article id={`msg-${msg.id}`} className={`msg ${grouped ? 'is-grouped' : ''} ${mine ? 'is-mine' : ''} ${msg.unread ? 'is-unread' : ''}`}>
      <div className="msg-gutter">{grouped ? <span className="msg-hover-time">{timeOf(new Date(msg.at))}</span> : <Avatar id={msg.from} size={38} />}</div>
      <div className="msg-main">
        {!grouped && (
          <header className="msg-head">
            <b className="msg-name">{mine ? 'You' : p.name}</b>
            <RoleTag id={msg.from} />
            <time dateTime={msg.at}>{timeOf(new Date(msg.at))}</time>
            {msg.longRead && <span className="read-meta">{words.toLocaleString('en-US')} words · {Math.round(words / 220)} min read</span>}
          </header>
        )}
        {msg.quote && (
          <div className="msg-quote">
            <b>{msg.quote.who}</b>
            <span>{msg.quote.text}</span>
          </div>
        )}
        <div className={`msg-body ${msg.longRead ? 'is-long' : ''}`}>
          {blocks.map((b, i) => {
            if (b.t === 'p') return <p key={i}>{inline(b.text)}</p>
            if (b.t === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>
            return (
              <h3 key={i} id={b.n ? `${msg.id}-point-${b.n}` : undefined} className={`point ${b.n ? '' : 'point-plain'}`}>
                {b.n && <span className="point-n">{b.n}</span>}
                <span className="point-title">{b.title}</span>
                {b.n && (
                  <button
                    className="point-quote"
                    onClick={() => onQuote({ who: `${p.first}, point ${b.n}`, text: b.title, msgId: msg.id })}
                    title="Quote this point in your reply"
                  >
                    <IconQuote width={14} height={14} /> Quote
                  </button>
                )}
              </h3>
            )
          })}
        </div>
        {slot && (
          <div className="call-card">
            <span className="call-ico"><IconCalendar width={18} height={18} /></span>
            <div>
              <b>{slot.kind === 'mentor' ? 'Proposed call with Dana' : 'Office hours visit'}</b>
              <span>{slotLabel(slot.day, slot.start, slot.end, true)}</span>
            </div>
            <em>{slot.kind === 'mentor' ? 'Waiting for Dana to confirm' : 'Drop-in, no booking needed'}</em>
          </div>
        )}
        {msg.files && (
          <div className="msg-files">
            {msg.files.map((f) => (
              <button key={f} className="file-chip" onClick={() => onOpenFile(f)}>
                <span className="file-ico"><IconFile width={18} height={18} /></span>
                <span>
                  <b>{FILES[f].name}</b>
                  <small>{FILES[f].kind} · {FILES[f].size}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {!msg.longRead && (
        <button className="msg-quote-btn" onClick={quoteMe} title="Quote in reply" aria-label={`Quote ${p.first}'s message in your reply`}>
          <IconQuote width={15} height={15} />
        </button>
      )}
    </article>
  )
}

export const MessageView = memo(MessageImpl)
