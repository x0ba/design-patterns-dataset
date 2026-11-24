import { useEffect, useMemo, useRef, useState } from 'react'
import { ACTIONS, recById } from '../data/recordings'
import { personById } from '../data/people'
import { Avatar, NameMarked, VerdictPill } from '../components/bits'
import { Icon } from '../components/Icon'
import { Timeline } from '../components/Timeline'
import { DECISIONS, MENTIONS, NAME_RE, overlap, turnIndexAt, chapterAt } from '../lib/derived'
import { DECISION_LABELS } from '../data/decisions'
import { clock, dur, shortDate } from '../lib/format'
import { highlightParts } from '../lib/search'
import { pause, play, playClip, seek, usePlayer } from '../lib/player'

type Mode = 'all' | 'you' | 'decisions'

export function Recording({ id, at }: { id: string; at: number | null }) {
  const rec = recById(id)
  const s = usePlayer()
  const loaded = s.rec === rec.id
  const heard = s.heard[rec.id] ?? []
  const heardPct = Math.round((overlap(heard, 0, rec.duration) / rec.duration) * 100)
  const [mode, setMode] = useState<Mode>('all')
  const [speaker, setSpeaker] = useState('')
  const [find, setFind] = useState('')
  const [follow, setFollow] = useState(true)
  const [flash, setFlash] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const mentions = MENTIONS.filter((m) => m.rec === rec.id)
  const decisions = DECISIONS[rec.id]
  const mine = ACTIONS.filter((a) => a.rec === rec.id && a.owner === 'me')
  const activeIdx = loaded ? turnIndexAt(rec, s.t) : -1

  const rows = useMemo(() => {
    const q = find.trim().toLowerCase()
    const out: { kind: 'chapter' | 'turn'; i: number }[] = []
    let lastCh = ''
    rec.turns.forEach((t, i) => {
      if (speaker && t.who !== speaker) return
      if (mode === 'you' && !NAME_RE.test(t.text)) return
      if (mode === 'decisions' && !t.decision) return
      if (q && !t.text.toLowerCase().includes(q)) return
      const c = chapterAt(rec, t.t)
      if (c.id !== lastCh) {
        out.push({ kind: 'chapter', i: rec.chapters.indexOf(c) })
        lastCh = c.id
      }
      out.push({ kind: 'turn', i })
    })
    return out
  }, [rec, mode, speaker, find])

  const scrollTo = (t: number, smooth = true) => {
    const box = scroller.current
    if (!box) return
    const el = box.querySelector<HTMLElement>(`[data-i="${turnIndexAt(rec, t)}"]`)
    if (el) box.scrollTo({ top: el.offsetTop - box.clientHeight / 3, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Deep link from mentions / action items / search.
  useEffect(() => {
    if (at == null) return
    setMode('all'); setSpeaker(''); setFind('')
    setFollow(false)
    const idx = turnIndexAt(rec, at)
    setFlash(idx)
    const t = window.setTimeout(() => scrollTo(at, false), 30)
    const t2 = window.setTimeout(() => setFlash(null), 2600)
    return () => { window.clearTimeout(t); window.clearTimeout(t2) }
  }, [id, at]) // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the playhead.
  useEffect(() => {
    if (loaded && follow && activeIdx >= 0 && mode === 'all' && !speaker && !find) scrollTo(rec.turns[activeIdx].t)
  }, [activeIdx, loaded, follow]) // eslint-disable-line react-hooks/exhaustive-deps

  const playHere = (t: number) => { setFollow(true); seek(rec.id, t, { play: true }) }
  const primary = () => {
    if (loaded && s.playing) return pause()
    if (loaded) return play()
    seek(rec.id, s.pos[rec.id] ?? 0, { play: true })
  }
  const pos = loaded ? s.t : s.pos[rec.id] ?? 0

  return (
    <div className="page rec-page">
      <div className="rec-head">
        <div className="rec-head-l">
          <a className="back" href="#/library"><Icon name="arrowLeft" size={15} /> Library</a>
          <div className="eyebrow">{rec.kind === 'lab' ? 'Lab meeting' : 'Journal club'} · {shortDate(rec.date)}, 2026</div>
          <h1>{rec.kind === 'lab' ? `Lab meeting — ${shortDate(rec.date)}` : rec.paper}</h1>
          {rec.kind === 'journal' && <div className="rec-paper">Presented by {personById(rec.presenter!).name}</div>}
        </div>
        <div className="rec-head-r">
          <div className="stack">
            {rec.attendees.slice(0, 5).map((a) => <Avatar key={a} id={a} size={28} ring />)}
            {rec.attendees.length > 5 && <span className="more">+{rec.attendees.length - 5}</span>}
          </div>
          <div className="rec-stats">{clock(rec.duration)} · {rec.chapters.length} chapters · {rec.attendees.length} speakers{heardPct > 0 ? ` · ${heardPct}% heard` : ''}</div>
          <button className="btn primary" onClick={primary}>
            <Icon name={loaded && s.playing ? 'pause' : 'play'} size={15} />
            {loaded && s.playing ? 'Pause' : pos > 5 ? `Resume ${clock(pos)}` : 'Play'}
          </button>
        </div>
      </div>

      <div className="rec-tl-wrap">
        <Timeline rec={rec} t={loaded ? s.t : null} playing={loaded && s.playing} heard={heard} variant="page"
          onSeek={(t) => seek(rec.id, t, loaded ? {} : { play: true })} />
      </div>

      <div className="rec-cols">
        <aside className="rail" aria-label="Chapters">
          <div className="rail-h">Chapters</div>
          {mine.length > 0 && (
            <div className="rail-mine">
              {mine.map((a) => (
                <button key={a.id} onClick={() => playClip({ id: `act-${a.id}`, rec: a.rec, start: Math.max(0, a.at - 20), end: a.at + 70, label: 'Action item for you' })}>
                  <span className="tag me">For you</span> {a.text}
                </button>
              ))}
            </div>
          )}
          {rec.chapters.map((c) => {
            const active = loaded && s.t >= c.start && s.t < c.end
            const names = mentions.filter((m) => m.t >= c.start && m.t < c.end)
            const decs = decisions.filter((d) => d.t >= c.start && d.t < c.end)
            const got = overlap(heard, c.start, c.end)
            return (
              <div key={c.id} className={`chap${active ? ' active' : ''}`}>
                <button className="chap-main" onClick={() => playHere(c.start)}>
                  <span className={`chap-bar v-${c.verdict}`} />
                  <span className="chap-body">
                    <span className="chap-title">{c.title}</span>
                    <span className="chap-meta">
                      <span className="tnum">{clock(c.start)}</span> · {dur(c.end - c.start)} <VerdictPill v={c.verdict} />
                      {names.length > 0 && <span className="tag me">Your name ×{names.length}</span>}
                      {got >= (c.end - c.start) * 0.9 && <span className="tag">Heard</span>}
                    </span>
                    <span className="chap-note">{c.note}</span>
                  </span>
                </button>
                {decs.length > 0 && (
                  <ul className="chap-decs">
                    {decs.map((d) => (
                      <li key={d.id}>
                        <button onClick={() => playHere(d.t)}>
                          <Icon name="diamond" size={9} /> <span>{d.label}</span> <span className="tnum">{clock(d.t)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </aside>

        <section className="transcript" aria-label="Transcript">
          <div className="tr-bar">
            <div className="seg" role="group" aria-label="Which turns to show">
              <button className={mode === 'all' ? 'on' : ''} onClick={() => setMode('all')}>All</button>
              <button className={mode === 'you' ? 'on' : ''} disabled={!mentions.length} onClick={() => setMode('you')}>Your name · {mentions.length}</button>
              <button className={mode === 'decisions' ? 'on' : ''} disabled={!decisions.length} onClick={() => setMode('decisions')}>Decisions · {decisions.length}</button>
            </div>
            <select value={speaker} onChange={(e) => setSpeaker(e.target.value)} aria-label="Filter by speaker">
              <option value="">All speakers</option>
              {rec.attendees.map((a) => <option key={a} value={a}>{personById(a).name}</option>)}
            </select>
            <input type="search" className="tr-find" placeholder="Find in this transcript" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Find in transcript" />
            {loaded && !follow && (
              <button className="btn soft sm" onClick={() => { setFollow(true); scrollTo(s.t) }}>Jump to now</button>
            )}
          </div>
          <div className="tr-scroll" ref={scroller} onWheel={() => setFollow(false)} onTouchMove={() => setFollow(false)}>
            {rows.length === 0 && <p className="muted pad">No turns match these filters.</p>}
            {rows.map((r, k) => {
              if (r.kind === 'chapter') {
                const c = rec.chapters[r.i]
                return (
                  <div className="tr-chap" key={`c${r.i}-${k}`}>
                    <span className={`sw v-${c.verdict}`} /> {c.title} <VerdictPill v={c.verdict} />
                  </div>
                )
              }
              const t = rec.turns[r.i]
              const p = personById(t.who)
              const isMe = NAME_RE.test(t.text)
              const m = isMe ? mentions.find((x) => x.t === t.t) : undefined
              return (
                <div key={r.i} data-i={r.i}
                  className={`turn${r.i === activeIdx ? ' active' : ''}${isMe ? ' mention' : ''}${t.decision ? ' decision' : ''}${flash === r.i ? ' flash' : ''}`}
                  onClick={() => { if (!window.getSelection()?.toString()) playHere(t.t) }}>
                  <button className="turn-time tnum" onClick={(e) => { e.stopPropagation(); playHere(t.t) }} aria-label={`Play from ${clock(t.t)}`}>{clock(t.t)}</button>
                  <div className="turn-body">
                    <div className="turn-head">
                      <Avatar id={t.who} size={20} />
                      <b>{p.name}</b>
                      <span className="turn-role">{p.role}</span>
                      {t.decision && <span className="tag dec"><Icon name="diamond" size={8} /> {DECISION_LABELS[`${rec.id}@${clock(t.t)}`] ?? 'Decision'}</span>}
                      {isMe && <span className="tag me">Your name</span>}
                    </div>
                    <p>
                      {find.trim()
                        ? highlightParts(t.text, find.trim()).map((x, j) => (x.hit ? <mark key={j}>{x.s}</mark> : <span key={j}>{x.s}</span>))
                        : <NameMarked text={t.text} />}
                    </p>
                    {m && (
                      <button className="btn soft sm" onClick={(e) => { e.stopPropagation(); playClip(m.clip) }}>
                        <Icon name="replay" size={13} /> Replay 90 s around your name
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
