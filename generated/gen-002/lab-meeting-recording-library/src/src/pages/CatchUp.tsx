
import { PRESENT_DATE, RECORDINGS, TODAY, recById } from '../data/recordings'
import { personById } from '../data/people'
import { NameMarked, VerdictPill, Avatar } from '../components/bits'
import { Icon } from '../components/Icon'
import { Timeline } from '../components/Timeline'
import {
  MENTIONS, PATH, PATH_LISTEN, PATH_SKIM, PATH_SKIP, PREP, THREADS, chapterAt, overlap, segDone, unheard,
  type Mention, type PathItem,
} from '../lib/derived'
import { clock, daysBetween, dur, shortDate, weekday } from '../lib/format'
import { useActions } from '../lib/actions'
import { go } from '../lib/router'
import { pause, play, playClip, seek, startPath, usePlayer } from '../lib/player'

export function CatchUp() {
  const s = usePlayer()
  const actions = useActions()
  const r = recById(s.rec)
  const ch = chapterAt(r, s.t)
  const heard = s.heard
  const L = unheard(heard, PATH_LISTEN)
  const K = unheard(heard, PATH_SKIM)
  const S = unheard(heard, PATH_SKIP)
  const total = L + K + S
  const days = daysBetween(TODAY, PRESENT_DATE)
  const mine = actions.filter((a) => a.owner === 'me')
  const prepLeft = unheard(heard, PREP)
  const idxInPath = PATH.findIndex((p) => p.rec === s.rec && s.t >= p.start && s.t < p.end)
  const playingHere = s.playing && s.mode === 'path'
  const listenDone = PATH_LISTEN.filter((p) => segDone(heard, p)).length

  const resume = () => {
    if (s.playing) return pause()
    if (idxInPath >= 0) startPath(idxInPath, PATH, s.t)
    else seek(s.rec, s.t, { play: true })
  }

  return (
    <div className="page catchup">
      <div className="page-head">
        <div>
          <div className="eyebrow">Catch-up · back from the cruise</div>
          <h1>Welcome back, Adaeze</h1>
          <p className="lede">
            You’ve been away since Oct 22. {RECORDINGS.length} recordings are waiting, and only <b>{dur(L)}</b> of them are marked <em>Listen</em>
            {' '}— about <b>{dur(L / s.rate)}</b> at {s.rate}×. Your name comes up {MENTIONS.length} times and two action items are yours.
          </p>
        </div>
      </div>

      <section className="hero">
        <div className="card resume">
          <div className="card-eyebrow">Pick up where you left off</div>
          <div className="resume-main">
            <div>
              <div className="resume-title">{ch.title}</div>
              <div className="resume-sub">
                {r.short} · <span className="tnum">{clock(s.t)}</span> of <span className="tnum">{clock(r.duration)}</span>
              </div>
            </div>
            <button className="btn primary lg" onClick={resume}>
              <Icon name={s.playing ? 'pause' : 'play'} size={18} />
              {s.playing ? 'Pause' : `Resume at ${clock(s.t)}`}
              <span className="btn-sub">{s.rate}×</span>
            </button>
          </div>
          <div className="resume-tl">
            <Timeline rec={r} t={s.t} playing={s.playing} heard={heard[r.id] ?? []} onSeek={() => {}} variant="mini" markers={false} />
          </div>
          <div className="upnext">
            <div className="upnext-h">Then, on your path</div>
            <ol>
              {PATH_LISTEN.filter((p) => !segDone(heard, p) && p.id !== PATH[idxInPath]?.id).slice(0, 3).map((p) => (
                <li key={p.id}>
                  <span className="tnum">{shortDate(p.recording.date)}</span>
                  <span className="upnext-t">{p.chapter.title}</span>
                  <span className="upnext-d">{dur((p.end - p.start) / s.rate)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="card thursday">
          <div className="card-eyebrow amber">
            {weekday(PRESENT_DATE)}, {shortDate(PRESENT_DATE)} · in {days} days
          </div>
          <div className="thu-title">You present the cruise data plan</div>
          <p className="thu-sub">Fifteen minutes, one page. These two chapters are the ones that shape it.</p>
          <ul className="prep">
            {PREP.map((p) => (
              <li key={p.id}>
                <span className="prep-check">{segDone(heard, p) ? <Icon name="check" size={14} /> : null}</span>
                <div>
                  <div className="prep-t">{p.chapter.title}</div>
                  <div className="prep-s">{p.recording.short} · {dur(p.end - p.start)}</div>
                </div>
              </li>
            ))}
          </ul>
          <button className="btn accent" onClick={() => startPath(0, PREP)}>
            <Icon name="play" size={15} /> Play both · {dur(prepLeft / s.rate)} at {s.rate}×
          </button>
        </div>
      </section>

      <section className="cols">
        <div className="col-main">
          <div className="card path">
            <div className="path-head">
              <div>
                <h2>Your listening path</h2>
                <p className="muted">
                  {PATH_LISTEN.length} sections to listen to, in the order that makes sense, then {PATH_SKIM.length} to skim if you have time. Everything else is safe to skip.
                </p>
              </div>
              <button className="btn primary" onClick={() => (playingHere ? pause() : startPath(PATH.findIndex((p) => !segDone(heard, p))))}>
                <Icon name={playingHere ? 'pause' : 'play'} size={15} /> {playingHere ? 'Pause path' : listenDone ? 'Continue path' : 'Play path'}
              </button>
            </div>

            <div className="split" aria-label="Where your time goes">
              <div className="split-bar">
                <i className="v-listen" style={{ flex: L }} />
                <i className="v-skim" style={{ flex: K }} />
                <i className="v-skip" style={{ flex: S }} />
              </div>
              <div className="split-key">
                <span><b className="k-listen">Listen</b> {dur(L)} <small>{dur(L / s.rate)} at {s.rate}×</small></span>
                <span><b className="k-skim">Skim</b> {dur(K)}</span>
                <span><b className="k-skip">Skip</b> {dur(S)}</span>
                <span className="split-total">of {dur(total)} unheard</span>
              </div>
            </div>

            <h3 className="group-h">Listen <span>{listenDone} of {PATH_LISTEN.length} heard</span></h3>
            <ol className="rows">
              {PATH_LISTEN.map((p) => (
                <PathRow key={p.id} p={p} index={PATH.indexOf(p)} />
              ))}
            </ol>

            <h3 className="group-h">Skim if you have time</h3>
            <ol className="rows compact">
              {PATH_SKIM.map((p) => (
                <PathRow key={p.id} p={p} index={PATH.indexOf(p)} compact />
              ))}
            </ol>

            <details className="skips">
              <summary>
                <Icon name="chevron" size={14} />
                <span>Safe to skip: {PATH_SKIP.filter((p) => !segDone(heard, p)).length} chapters, {dur(S)}</span>
                <small>No mention of you, no decisions, nothing assigned to you</small>
              </summary>
              <ul className="skip-list">
                {PATH_SKIP.filter((p) => !segDone(heard, p)).map((p) => (
                  <li key={p.id}>
                    <div>
                      <div className="skip-t">{p.chapter.title}</div>
                      <div className="skip-s">{p.recording.short} · {clock(p.start)}–{clock(p.end)} · {p.chapter.note}</div>
                    </div>
                    <button className="btn ghost sm" onClick={() => seek(p.rec, p.start, { play: true })}>Play anyway</button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>

        <div className="col-side">
          <div className="card">
            <div className="card-head">
              <h2>Your name came up</h2>
              <span className="count-pill me">{MENTIONS.length}</span>
            </div>
            <p className="muted small">Each replay is 90 seconds: 20 seconds before your name and a little over a minute after.</p>
            <ul className="mentions">
              {MENTIONS.map((m) => (
                <MentionRow key={m.id} m={m} />
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Assigned to you</h2>
              <a className="link" href="#/actions">All 9 items</a>
            </div>
            <ul className="mine">
              {mine.map((a) => {
                const left = daysBetween(TODAY, a.due)
                return (
                  <li key={a.id}>
                    <div className="mine-t">{a.text}</div>
                    <div className="mine-s">
                      <span className={`due${left <= 3 ? ' soon' : ''}`}>
                        Due {weekday(a.due)} {shortDate(a.due)} · {left === 0 ? 'today' : `${left} days`}
                      </span>
                      <button
                        className="link"
                        onClick={() => playClip({ id: `act-${a.id}`, rec: a.rec, start: Math.max(0, a.at - 20), end: a.at + 70, label: `Action item · ${recById(a.rec).short}` })}
                      >
                        <Icon name="play" size={11} /> Hear where it came up
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="threads">
        <div className="section-head">
          <h2>What changed while you were away</h2>
          <p className="muted">Three threads ran across several meetings. Tap a step to hear it in context.</p>
        </div>
        <div className="thread-grid">
          {THREADS.map((t) => (
            <article key={t.id} className="card thread">
              <h3>{t.title}</h3>
              <ul className="gist">
                {t.gist.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <div className="yours">
                <span className="yours-label">For you</span> {t.yours}
              </div>
              <ol className="steps">
                {t.steps.map((st) => {
                  const rr = recById(st.rec)
                  const c = rr.chapters.find((x) => x.id === st.chapterId)!
                  const done = overlap(heard[st.rec], c.start, c.end) >= (c.end - c.start) * 0.9
                  return (
                    <li key={st.chapterId}>
                      <button onClick={() => seek(st.rec, c.start, { play: true })}>
                        <span className={`step-dot${done ? ' done' : ''}`} />
                        <span className="step-l">{st.label}</span>
                        <span className="step-d">{dur(c.end - c.start)}</span>
                        <Icon name="play" size={11} />
                      </button>
                    </li>
                  )
                })}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function PathRow({ p, index, compact }: { p: PathItem; index: number; compact?: boolean }) {
  const s = usePlayer()
  const done = segDone(s.heard, p)
  const got = overlap(s.heard[p.rec], p.start, p.end)
  const left = p.end - p.start - got
  const current = s.queue && s.mode === 'path' && s.queue[s.qi]?.id === p.id
  const partial = !done && got > 1
  const nameCount = MENTIONS.filter((m) => m.rec === p.rec && m.t >= p.start && m.t < p.end).length
  const decisions = p.recording.turns.filter((t) => t.decision && t.t >= p.start && t.t < p.end).length
  return (
    <li className={`row${done ? ' done' : ''}${current ? ' current' : ''}`}>
      <span className={`row-state${done ? ' done' : partial ? ' part' : ''}`} aria-label={done ? 'Heard' : partial ? 'Partly heard' : 'Not heard'}>
        {done ? <Icon name="check" size={14} /> : null}
      </span>
      <div className="row-body">
        <div className="row-title">
          {p.chapter.title}
          <VerdictPill v={p.verdict} />
        </div>
        <div className="row-meta">
          {p.recording.short} · {clock(p.start)}–{clock(p.end)}
          {nameCount > 0 && <span className="tag me">Your name ×{nameCount}</span>}
          {decisions > 0 && <span className="tag dec">{decisions} decision{decisions > 1 ? 's' : ''}</span>}
          {partial && <span className="tag">{clock(got)} heard</span>}
        </div>
        {!compact && <div className="row-note">{p.chapter.note}</div>}
        {compact && <div className="row-note one">{p.chapter.note}</div>}
      </div>
      <div className="row-time">
        <b>{done ? 'Heard' : dur(left / s.rate)}</b>
        {!done && <small>at {s.rate}×</small>}
      </div>
      <button
        className={`round${current && s.playing ? ' on' : ''}`}
        onClick={() => (current && s.playing ? pause() : current ? play() : startPath(index))}
        aria-label={current && s.playing ? `Pause ${p.chapter.title}` : `Play ${p.chapter.title}`}
      >
        <Icon name={current && s.playing ? 'pause' : 'play'} size={15} />
      </button>
    </li>
  )
}

function MentionRow({ m }: { m: Mention }) {
  const s = usePlayer()
  const r = recById(m.rec)
  const isThis = s.mode === 'clip' && s.queue?.[0].id === m.clip.id
  const playing = isThis && s.playing
  const heardAlready = overlap(s.heard[m.rec], m.clip.start, m.clip.end) >= 80
  const idx = m.text.search(/Adaeze|Okonkwo/)
  const before = m.text.slice(0, idx)
  const sb = Math.max(before.lastIndexOf('. '), before.lastIndexOf('? '))
  const from = sb >= 0 && idx - sb < 150 ? sb + 2 : Math.max(0, idx - 60)
  let to = Math.min(m.text.length, idx + 120)
  if (to < m.text.length) to = Math.max(idx + 20, m.text.lastIndexOf(' ', to))
  const snippet = (from > 0 && sb < 0 ? '…' : '') + m.text.slice(from, to).trim() + (to < m.text.length ? '…' : '')
  return (
    <li className={`mention${isThis ? ' current' : ''}`}>
      <div className="mention-meta">
        <span className="tnum">{shortDate(r.date)} · {clock(m.t)}</span>
        <span className="mention-who"><Avatar id={m.who} size={18} /> {personById(m.who).first}</span>
        {heardAlready && <span className="tag">Heard</span>}
      </div>
      <p className="mention-q"><span><NameMarked text={snippet} /></span></p>
      <div className="mention-actions">
        <button className="btn soft sm" onClick={() => (playing ? pause() : isThis && s.clipEnded == null ? play() : playClip(m.clip))}>
          <Icon name={playing ? 'pause' : 'replay'} size={13} /> {playing ? 'Pause' : isThis && !s.clipEnded ? 'Resume clip' : 'Replay 90 s'}
        </button>
        <button className="link" onClick={() => go(`/rec/${m.rec}?at=${m.t}`)}>
          Open transcript
        </button>
      </div>
    </li>
  )
}

