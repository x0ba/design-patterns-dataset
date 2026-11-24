import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useApp } from '../App';
import { positionOf } from '../store';
import { chapterIndexAt, fmt, fmtFor } from '../util';
import * as I from './Icons';

const SPEEDS = [0.75, 1, 1.1, 1.25, 1.5, 1.75, 2];

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

export default function PlayerBar() {
  const { state, dispatch } = useApp();
  const item = state.items[state.currentId];
  const ci = chapterIndexAt(item.chapters, state.position);
  const ch = item.chapters[ci];
  const speed = usePopover();
  const queue = usePopover();
  const scrub = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const label = (t: number) => fmtFor(item, t);
  const pos = drag ?? state.position;
  const isTour = item.kind === 'tour';
  const bms = state.bookmarks.filter((b) => b.itemId === item.id);

  const timeAt = (x: number) => {
    const r = scrub.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (x - r.left) / r.width)) * item.duration;
  };
  const onDown = (e: RPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag(timeAt(e.clientX));
  };
  const onMove = (e: RPointerEvent) => {
    setHover(timeAt(e.clientX));
    if (drag !== null) setDrag(timeAt(e.clientX));
  };
  const onUp = () => {
    if (drag !== null) dispatch({ type: 'seek', t: drag });
    setDrag(null);
  };

  const prevStop = () => {
    const target = state.position - ch.start > 3 || ci === 0 ? ch.start : item.chapters[ci - 1].start;
    dispatch({ type: 'seek', t: target });
  };
  const nextStop = () => {
    if (ci < item.chapters.length - 1) dispatch({ type: 'seek', t: item.chapters[ci + 1].start });
  };
  const unit = isTour ? 'stop' : 'chapter';
  const hoverCh = hover !== null ? item.chapters[chapterIndexAt(item.chapters, hover)] : null;

  return (
    <footer className="player">
      <div className="pl-now">
        <div className={`pl-art ${item.kind}`}>{isTour ? <I.Mic size={20} /> : <I.Lecture size={20} />}</div>
        <div className="pl-now-text">
          <div className="pl-title" title={item.title}>{item.title}</div>
          <div className="pl-sub">
            {isTour ? 'Stop' : 'Ch.'} {ci + 1} · {ch.title}
          </div>
        </div>
      </div>

      <div className="pl-center">
        <div className="pl-transport">
          <button className="pl-btn" onClick={prevStop} title={`Previous ${unit} (Shift + ←)`} aria-label={`Previous ${unit}`}>
            <I.PrevStop size={18} />
          </button>
          <button className="pl-btn" onClick={() => dispatch({ type: 'skip', by: -15 })} title="Back 15 seconds (←)" aria-label="Back 15 seconds">
            <I.Back15 size={24} />
          </button>
          <button className="pl-play" onClick={() => dispatch({ type: 'toggle' })} aria-label={state.playing ? 'Pause' : 'Play'} title={state.playing ? 'Pause (Space)' : 'Play (Space)'}>
            {state.playing ? <I.Pause size={22} /> : <I.Play size={22} />}
          </button>
          <button className="pl-btn" onClick={() => dispatch({ type: 'skip', by: 30 })} title="Ahead 30 seconds (→)" aria-label="Ahead 30 seconds">
            <I.Fwd30 size={24} />
          </button>
          <button className="pl-btn" onClick={nextStop} disabled={ci >= item.chapters.length - 1} title={`Next ${unit} (Shift + →)`} aria-label={`Next ${unit}`}>
            <I.NextStop size={18} />
          </button>
        </div>
        <div className="pl-scrub-row">
          <span className="pl-time">{label(pos)}</span>
          <div
            className="pl-scrub"
            ref={scrub}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={() => setHover(null)}
            role="slider"
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={item.duration}
            aria-valuenow={Math.floor(pos)}
            aria-valuetext={label(pos)}
          >
            <div className="pl-rail">
              <div className="pl-fill" style={{ width: `${(pos / item.duration) * 100}%` }} />
            </div>
            {item.chapters.slice(1).map((c) => (
              <span key={c.start} className="pl-tick" style={{ left: `${(c.start / item.duration) * 100}%` }} />
            ))}
            {bms.map((b) => (
              <span key={b.id} className={`pl-bm ${b.kind}`} style={{ left: `${(b.t / item.duration) * 100}%` }} />
            ))}
            <span className="pl-knob" style={{ left: `${(pos / item.duration) * 100}%` }} />
            {hover !== null && hoverCh && (
              <span className="pl-tip" style={{ left: `${(hover / item.duration) * 100}%` }}>
                {label(hover)} · {hoverCh.title}
              </span>
            )}
          </div>
          <span className="pl-time right" title={`${label(item.duration - pos)} left at 1×`}>
            −{label((item.duration - pos) / state.speed)}
          </span>
        </div>
      </div>

      <div className="pl-right">
        <button className="pl-bm-btn" onClick={() => dispatch({ type: 'addBookmark' })} title="Bookmark this moment (B)">
          <I.BookmarkPlus size={17} /> Bookmark
        </button>

        <div className="pop-wrap" ref={speed.ref}>
          <button
            className={`pl-speed ${speed.open ? 'open' : ''}`}
            onClick={() => speed.setOpen(!speed.open)}
            aria-haspopup="menu"
            aria-expanded={speed.open}
            title="Playback speed"
          >
            {state.speed}×
          </button>
          {speed.open && (
            <div className="popover speed-pop" role="menu">
              <div className="pop-head">Playback speed</div>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  role="menuitemradio"
                  aria-checked={s === state.speed}
                  className={`pop-item ${s === state.speed ? 'sel' : ''}`}
                  onClick={() => {
                    dispatch({ type: 'speed', speed: s });
                    speed.setOpen(false);
                  }}
                >
                  <span>{s}×</span>
                  {s === 1.25 && <span className="pop-note">your default</span>}
                  {s === state.speed && <I.Check size={15} />}
                </button>
              ))}
              <div className="pop-foot">Remaining at {state.speed}×: {fmt((item.duration - state.position) / state.speed, item.duration > 3600)}</div>
            </div>
          )}
        </div>

        <div className="pop-wrap" ref={queue.ref}>
          <button className={`pl-queue ${queue.open ? 'open' : ''}`} onClick={() => queue.setOpen(!queue.open)} aria-haspopup="dialog" aria-expanded={queue.open} title="Up next">
            <I.Queue size={19} />
            <span>Up next</span>
            {state.queue.length > 0 && <span className="badge">{state.queue.length}</span>}
          </button>
          {queue.open && (
            <div className="popover queue-pop" role="dialog" aria-label="Up next">
              <div className="pop-head">
                Up next <span className="muted">· plays after “{item.title}”</span>
              </div>
              {state.queue.length === 0 ? (
                <p className="empty">Nothing queued. Use “Play next” or “Add to queue” in your library.</p>
              ) : (
                <ol className="queue-list">
                  {state.queue.map((id, i) => {
                    const q = state.items[id];
                    const p = positionOf(state, id);
                    return (
                      <li key={id} className="q-row">
                        <span className="q-num">{i + 1}</span>
                        <span className={`kind-dot ${q.kind}`} />
                        <div className="q-text">
                          <div className="q-title">{q.title}</div>
                          <div className="q-sub">
                            {q.kind === 'tour' ? `Tour · ${q.subtitle}` : 'Lecture'} · {fmt(q.duration)}
                            {p > 0 && ` · resumes at ${fmt(p)}`}
                          </div>
                        </div>
                        <div className="q-actions">
                          <button className="icon-btn" title="Play now" aria-label="Play now" onClick={() => { dispatch({ type: 'queuePlay', index: i }); queue.setOpen(false); }}>
                            <I.Play size={14} />
                          </button>
                          <button className="icon-btn" title="Move up" aria-label="Move up" disabled={i === 0} onClick={() => dispatch({ type: 'queueMove', index: i, dir: -1 })}>
                            <I.Up size={15} />
                          </button>
                          <button className="icon-btn" title="Move down" aria-label="Move down" disabled={i === state.queue.length - 1} onClick={() => dispatch({ type: 'queueMove', index: i, dir: 1 })}>
                            <I.Down size={15} />
                          </button>
                          <button className="icon-btn" title="Remove from queue" aria-label="Remove from queue" onClick={() => dispatch({ type: 'queueRemove', index: i })}>
                            <I.Close size={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
