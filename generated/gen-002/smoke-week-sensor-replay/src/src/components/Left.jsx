import { useEffect, useRef } from 'react'
import { Play, Flag, Close } from './Icons.jsx'
import { shortStamp, stamp, mmss } from '../data/time.js'

const TARGET = 90

function Chapters({ R, nar, chapterIdx, onPlayChapter }) {
  const n = R.meta.narration
  return (
    <section className="panel chapters" aria-labelledby="ch-h">
      <div className="panel-head">
        <h2 id="ch-h">Chapters</h2>
        {n && <span className="panel-note">Narrated by {n.narrator}</span>}
      </div>
      {R.chapters.length ? (
        <ol className="chapter-list">
          {R.chapters.map((c, i) => {
            const active = i === chapterIdx
            const pct = active ? Math.min(100, Math.max(0, ((nar - c.n0) / (c.n1 - c.n0)) * 100)) : i < chapterIdx ? 100 : 0
            return (
              <li key={c.title}>
                <button className={`chapter${active ? ' active' : ''}`} onClick={() => onPlayChapter(i)} aria-current={active ? 'step' : undefined} aria-label={`Play chapter ${i + 1}: ${c.title}, ${mmss(c.dur)}`}>
                  <span className="ch-num">{i + 1}</span>
                  <span className="ch-body">
                    <span className="ch-title">{c.title}</span>
                    {active && <span className="ch-when">{shortStamp(R.meta.startMs, c.f0)} → {shortStamp(R.meta.startMs, c.f1)}</span>}
                  </span>
                  <span className="ch-dur">{mmss(c.dur)}</span>
                  <span className="ch-play" aria-hidden="true"><Play width={13} height={13} /></span>
                  <span className="ch-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="empty">This replay has no narrated chapters. Use the timeline to explore it, or add bookmarks to mark what you find.</p>
      )}
    </section>
  )
}

function Note({ b, focus, onDone, onEdit }) {
  const ref = useRef(null)
  useEffect(() => {
    if (focus && ref.current) { ref.current.focus(); onDone() }
  }, [focus, onDone])
  return (
    <textarea
      ref={ref}
      className="bm-note"
      rows={2}
      value={b.note}
      placeholder="Add a note to yourself"
      aria-label={`Note for the bookmark at ${b.f}`}
      onChange={(e) => onEdit(b.id, e.target.value)}
    />
  )
}

function Bookmarks({ R, frame, bookmarks, focusId, clearFocus, onSeek, onAdd, onRemove, onEdit, onCopyNotes }) {
  return (
    <section className="panel bookmarks" aria-labelledby="bm-h">
      <div className="panel-head">
        <h2 id="bm-h">My bookmarks <span className="count">{bookmarks.length}</span></h2>
        <button className="btn small" onClick={onAdd} title="Bookmark the current moment (B)"><Flag width={13} height={13} /> Add here</button>
      </div>
      {bookmarks.length === 0 && <p className="empty">Nothing saved yet. Press <kbd>B</kbd> or “Add here” to mark a moment you want to come back to.</p>}
      <ul className="bm-list">
        {bookmarks.map((b) => {
          const here = Math.abs(b.f - frame) <= 1
          return (
            <li key={b.id} className={`bm${here ? ' here' : ''}`}>
              <div className="bm-top">
                <button className="bm-time" onClick={() => onSeek(b.f)} aria-label={`Go to ${stamp(R.meta.startMs, b.f)}`}>
                  <Flag width={12} height={12} /> {stamp(R.meta.startMs, b.f)}
                </button>
                <button className="x" onClick={() => onRemove(b.id)} aria-label={`Delete bookmark at ${stamp(R.meta.startMs, b.f)}`}><Close width={13} height={13} /></button>
              </div>
              <Note b={b} focus={focusId === b.id} onDone={clearFocus} onEdit={onEdit} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Clip({ R, clip, clipSeconds, onSetIn, onSetOut, onClear, onPlayClip, clipRun, onCopyNotes }) {
  const ms = R.meta.startMs
  const complete = clip.in != null && clip.out != null
  const secs = clipSeconds ?? 0
  const pct = Math.min(100, (secs / TARGET) * 100)
  const diff = Math.round(secs - TARGET)
  return (
    <section className="panel clip" aria-labelledby="clip-h">
      <div className="panel-head">
        <h2 id="clip-h">Clip for council</h2>
        <span className="panel-note">aim for 1:30</span>
      </div>
      <dl className="clip-rows">
        <div>
          <dt>In</dt>
          <dd>{clip.in != null ? shortStamp(ms, clip.in) : <span className="muted">not set</span>}</dd>
          <button className="btn small" onClick={onSetIn} title="Set In to the playhead (I)">Set here</button>
        </div>
        <div>
          <dt>Out</dt>
          <dd>{clip.out != null ? shortStamp(ms, clip.out) : <span className="muted">not set</span>}</dd>
          <button className="btn small" onClick={onSetOut} title="Set Out to the playhead (O)" disabled={clip.in == null}>Set here</button>
        </div>
      </dl>
      <div className="clip-len" aria-live="polite">
        <div className="meter" role="img" aria-label={`Clip length ${mmss(secs)} of ${mmss(TARGET)}`}>
          <i style={{ width: `${pct}%` }} className={secs > TARGET + 3 ? 'over' : ''} />
          <b style={{ left: '100%' }} />
        </div>
        <div className="clip-len-text">
          <strong>{clip.in == null ? '0:00' : mmss(secs)}</strong>
          <span>
            {clip.in == null ? 'Set an In point to start'
              : !complete ? 'so far, if you end it at the playhead'
              : Math.abs(diff) <= 3 ? 'right on target at normal speed'
              : diff > 0 ? `${mmss(Math.abs(diff))} over, at normal speed`
              : `${mmss(Math.abs(diff))} under, at normal speed`}
          </span>
        </div>
      </div>
      <div className="clip-actions">
        <button className="btn primary" onClick={onPlayClip} disabled={!complete}>
          <Play width={14} height={14} /> {clipRun ? 'Playing clip' : 'Play clip'}
        </button>
        <button className="btn ghost" onClick={onClear} disabled={clip.in == null}>Clear</button>
      </div>
    </section>
  )
}

export default function Left(props) {
  return (
    <aside className="left" aria-label="Chapters, bookmarks and clip">
      <Chapters R={props.R} nar={props.nar} chapterIdx={props.chapterIdx} onPlayChapter={props.onPlayChapter} />
      <Bookmarks {...props} />
      <Clip {...props} />
    </aside>
  )
}
