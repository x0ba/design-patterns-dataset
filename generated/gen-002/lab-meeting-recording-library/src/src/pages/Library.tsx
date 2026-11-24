import { useState } from 'react'
import { ACTIONS, RECORDINGS } from '../data/recordings'
import { personById } from '../data/people'
import { Avatar } from '../components/bits'
import { Icon } from '../components/Icon'
import { Timeline } from '../components/Timeline'
import { DECISIONS, MENTIONS, overlap } from '../lib/derived'
import { clock, dur, shortDate } from '../lib/format'
import { go } from '../lib/router'
import { pause, resumeRec, usePlayer } from '../lib/player'

export function Library() {
  const s = usePlayer()
  const [kind, setKind] = useState<'all' | 'lab' | 'journal'>('all')
  const [order, setOrder] = useState<'new' | 'old'>('new')
  const list = RECORDINGS.filter((r) => kind === 'all' || r.kind === kind).sort((a, b) => (order === 'new' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))

  return (
    <div className="page library">
      <div className="page-head row-head">
        <div>
          <div className="eyebrow">Library</div>
          <h1>Six recordings, Oct 15 – Nov 7</h1>
          <p className="lede">Lab meetings and journal clubs for the Halvorsen Lab. Each has a transcript, speaker labels and topic chapters.</p>
        </div>
        <div className="controls">
          <div className="seg" role="group" aria-label="Filter by type">
            {([['all', 'All'], ['lab', 'Lab meetings'], ['journal', 'Journal clubs']] as const).map(([k, l]) => (
              <button key={k} className={kind === k ? 'on' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Sort order">
            <button className={order === 'new' ? 'on' : ''} aria-pressed={order === 'new'} onClick={() => setOrder('new')}>Newest first</button>
            <button className={order === 'old' ? 'on' : ''} aria-pressed={order === 'old'} onClick={() => setOrder('old')}>Listening order</button>
          </div>
        </div>
      </div>

      <ul className="rec-list">
        {list.map((r) => {
          const heard = s.heard[r.id] ?? []
          const heardSec = overlap(heard, 0, r.duration)
          const by = { listen: 0, skim: 0, skip: 0 }
          r.chapters.forEach((c) => (by[c.verdict] += c.end - c.start))
          const names = MENTIONS.filter((m) => m.rec === r.id).length
          const decs = DECISIONS[r.id].length
          const mine = ACTIONS.filter((a) => a.rec === r.id && a.owner === 'me').length
          const playingThis = s.playing && s.rec === r.id
          const speakers = r.attendees
          return (
            <li key={r.id} className="card rec-card">
              <div className="rec-date">
                <div className="rd-day">{shortDate(r.date)}</div>
                <div className={`rd-kind ${r.kind}`}>{r.kind === 'lab' ? 'Lab meeting' : 'Journal club'}</div>
                <div className="rd-len">{clock(r.duration)}</div>
              </div>
              <div className="rec-body">
                <div className="rec-top">
                  <h2>
                    <a href={`#/rec/${r.id}`}>{r.kind === 'lab' ? `Lab meeting — ${shortDate(r.date)}` : r.paper}</a>
                  </h2>
                </div>
                {r.kind === 'journal' && <div className="rec-paper">Journal club — {shortDate(r.date)} · presented by {personById(r.presenter!).name}</div>}
                <div className="rec-tl">
                  <Timeline rec={r} t={s.rec === r.id ? s.t : null} heard={heard} onSeek={() => {}} variant="mini" markers={false} />
                </div>
                <div className="rec-worth">
                  <span><b className="k-listen">Listen</b> {dur(by.listen)}</span>
                  <span><b className="k-skim">Skim</b> {dur(by.skim)}</span>
                  <span><b className="k-skip">Skip</b> {dur(by.skip)}</span>
                  <span className="dotsep" />
                  <span>{r.chapters.length} chapters</span>
                </div>
                <div className="rec-badges">
                  {names > 0 && <span className="tag me">Your name ×{names}</span>}
                  {mine > 0 && <span className="tag me">{mine} action item{mine > 1 ? 's' : ''} for you</span>}
                  {decs > 0 && <span className="tag dec">{decs} decision{decs > 1 ? 's' : ''}</span>}
                  {heardSec > 5 && <span className="tag">{Math.round((heardSec / r.duration) * 100)}% heard</span>}
                  {names + mine + decs === 0 && <span className="tag quiet">Nothing for you</span>}
                </div>
              </div>
              <div className="rec-side">
                <div className="stack" title={speakers.map((id) => personById(id).name).join(', ')}>
                  {speakers.slice(0, 5).map((id) => (
                    <Avatar key={id} id={id} size={26} ring />
                  ))}
                  {speakers.length > 5 && <span className="more">+{speakers.length - 5}</span>}
                </div>
                <div className="rec-btns">
                  <button className="btn primary sm" onClick={() => (playingThis ? pause() : resumeRec(r.id))}>
                    <Icon name={playingThis ? 'pause' : 'play'} size={13} />
                    {playingThis ? 'Pause' : heardSec > 5 ? `Resume ${clock(s.pos[r.id] ?? 0)}` : 'Play'}
                  </button>
                  <button className="btn ghost sm" onClick={() => go(`/rec/${r.id}`)}>Open</button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
