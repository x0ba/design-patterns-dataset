import { useEffect } from 'react'
import { recById } from '../data/recordings'
import { chapterAt, inDecision } from '../lib/derived'
import { clock, dur } from '../lib/format'
import { clearToast, jumpChapter, pause, play, playClip, seek, skipBy, stepRate, toggleAutoSlow, toggleSmartSkip, usePlayer } from '../lib/player'
import { go } from '../lib/router'
import { Icon } from './Icon'
import { Timeline } from './Timeline'

export function PlayerBar() {
  const s = usePlayer()
  const r = recById(s.rec)
  const ch = chapterAt(r, s.t)
  const dec = inDecision(s.rec, s.t)
  const effRate = s.autoSlow && dec && s.rate > 1 ? 1 : s.rate
  const left = (r.duration - s.t) / effRate
  const seg = s.queue?.[s.qi]

  useEffect(() => {
    if (!s.toast) return
    const id = window.setTimeout(clearToast, 3200)
    return () => window.clearTimeout(id)
  }, [s.toast])

  return (
    <footer className="player" aria-label="Player">
      {s.toast && (
        <div className="toast" role="status" key={s.toast.id}>
          {s.toast.msg}
        </div>
      )}
      <div className="np">
        <button className="np-art" onClick={() => go(`/rec/${r.id}`)} aria-label="Open recording" data-kind={r.kind}>
          <Icon name="wave" size={22} />
        </button>
        <div className="np-text">
          <div className="np-title">{ch.title}</div>
          <div className="np-sub">
            {r.short}
            {s.mode === 'path' && seg && <span className="np-tag">Path · {s.qi + 1} of {s.queue!.length}</span>}
            {s.mode === 'clip' && <span className="np-tag me">90-second clip</span>}
            {s.clipEnded && (
              <button className="np-link" onClick={() => playClip(s.clipEnded!)}>
                <Icon name="replay" size={12} /> Replay clip
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="center">
        <div className="transport">
          <button className="tbtn" onClick={() => jumpChapter(-1)} title="Previous chapter (p)" aria-label="Previous chapter">
            <Icon name="prev" size={18} />
          </button>
          <button className="tbtn" onClick={() => skipBy(-15)} title="Back 15 s (j)" aria-label="Back 15 seconds">
            <Icon name="back15" size={26} />
          </button>
          <button className="tbtn big" onClick={() => (s.playing ? pause() : play())} title="Play / pause (space)" aria-label={s.playing ? 'Pause' : 'Play'}>
            <Icon name={s.playing ? 'pause' : 'play'} size={22} />
          </button>
          <button className="tbtn" onClick={() => skipBy(30)} title="Forward 30 s (l)" aria-label="Forward 30 seconds">
            <Icon name="fwd30" size={26} />
          </button>
          <button className="tbtn" onClick={() => jumpChapter(1)} title="Next chapter (n)" aria-label="Next chapter">
            <Icon name="next" size={18} />
          </button>
        </div>
        <div className="scrub">
          <span className="time">{clock(s.t)}</span>
          <Timeline rec={r} t={s.t} playing={s.playing} heard={s.heard[r.id] ?? []} onSeek={(t) => seek(r.id, t)} variant="bar" />
          <span className="time dim" title="Time left at the current speed">
            {dur(left)} left
          </span>
        </div>
      </div>

      <div className="opts">
        <div className="speed" role="group" aria-label="Playback speed">
          <button onClick={() => stepRate(-1)} aria-label="Slower" title="Slower ([)">−</button>
          <output className={s.slowed ? 'slowed' : ''}>{s.slowed ? '1×' : `${s.rate}×`}</output>
          <button onClick={() => stepRate(1)} aria-label="Faster" title="Faster (])">+</button>
        </div>
        <div className="toggles">
          <button className={`chip${s.autoSlow ? ' on' : ''}`} aria-pressed={s.autoSlow} onClick={toggleAutoSlow} title="Drop to 1× while a decision is being explained">
            Slow on decisions
          </button>
          <button className={`chip${s.smartSkip ? ' on' : ''}`} aria-pressed={s.smartSkip} onClick={toggleSmartSkip} title="Jump over chapters marked Skip">
            Skip “Skip” chapters
          </button>
        </div>
        {s.slowed && <div className="slow-note">Slowed for a decision</div>}
      </div>
    </footer>
  )
}

