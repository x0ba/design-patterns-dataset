import { useRef, useState } from 'react';
import type { CourseNote } from '../types';
import type { SectionBounds } from '../lib/transcript';
import { formatTime } from '../lib/time';

export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

interface PlayerProps {
  duration: number;
  pos: number;
  playing: boolean;
  rate: number;
  bounds: SectionBounds;
  notes: CourseNote[];
  clipTimes: number[];
  onToggle: () => void;
  onSeek: (sec: number) => void;
  onSkip: (delta: number) => void;
  onRate: (rate: number) => void;
  onReplay: () => void;
}

export function Player(props: PlayerProps) {
  const { duration, pos, playing, rate, onToggle, onSkip, onRate, onReplay } = props;
  const pct = duration > 0 ? (pos / duration) * 100 : 0;

  return (
    <section className="player" aria-label="Audio player">
      <div className="transport">
        <div className="transport-buttons">
          <button className="icon-btn" onClick={() => onSkip(-10)} aria-label="Back 10 seconds" title="Back 10 s (←)">
            <span className="skip-label">−10</span>
          </button>
          <button
            className="play-btn"
            onClick={onToggle}
            aria-label={playing ? 'Pause' : 'Play'}
            title="Play / pause (Space)"
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button className="icon-btn" onClick={() => onSkip(10)} aria-label="Forward 10 seconds" title="Forward 10 s (→)">
            <span className="skip-label">+10</span>
          </button>
        </div>

        <div className="clock" aria-live="off">
          <span className="clock-pos">{formatTime(pos)}</span>
          <span className="clock-sep">/</span>
          <span className="clock-dur">{formatTime(duration)}</span>
        </div>

        <div className="speed" role="group" aria-label="Playback speed">
          {RATES.map((r) => (
            <button
              key={r}
              className={r === rate ? 'on' : ''}
              onClick={() => onRate(r)}
              aria-pressed={r === rate}
            >
              {r}×
            </button>
          ))}
        </div>

        <button className="btn btn-sm replay-btn" onClick={onReplay} title="Go back 30 seconds and play at 1× (R)">
          Replay 30 s at 1×
        </button>

        <div className={`state-pill ${playing ? 'live' : ''}`}>
          {playing ? `Playing at ${rate}×` : 'Paused'}
        </div>
      </div>

      <Timeline {...props} pct={pct} />

      <p className="keys muted small">
        <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> ±10 s · <kbd>[</kbd>/<kbd>]</kbd> speed ·{' '}
        <kbd>N</kbd>/<kbd>P</kbd> next/previous analyst · <kbd>R</kbd> replay 30 s at 1×
      </p>
    </section>
  );
}

function Timeline({ duration, pos, bounds, notes, clipTimes, onSeek, pct }: PlayerProps & { pct: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const toSec = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * duration;
  };

  const at = (sec: number) => `${(sec / duration) * 100}%`;
  const width = (from: number, to: number) => `${((to - from) / duration) * 100}%`;

  return (
    <div className="timeline">
      <div
        className="track"
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={formatTime(pos)}
        tabIndex={0}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setDragging(true);
          onSeek(toSec(e.clientX));
        }}
        onPointerMove={(e) => {
          if (dragging) onSeek(toSec(e.clientX));
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="sec sec-ceo" style={{ left: 0, width: width(0, bounds.cfoStart) }} title="Prepared remarks · CEO" />
        <div className="sec sec-cfo" style={{ left: at(bounds.cfoStart), width: width(bounds.cfoStart, bounds.qaStart) }} title="Prepared remarks · CFO" />
        <div className="sec sec-qa" style={{ left: at(bounds.qaStart), width: width(bounds.qaStart, duration) }} title="Analyst Q&A" />
        <div className="progress" style={{ width: `${pct}%` }} />

        {notes.map((n) => (
          <button
            key={n.t}
            className="marker marker-note"
            style={{ left: at(n.t) }}
            title={`Course note ${formatTime(n.t)}: ${n.text}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSeek(n.t);
            }}
            aria-label={`Course note at ${formatTime(n.t)}`}
          />
        ))}
        {clipTimes.map((t, i) => (
          <span key={`${t}-${i}`} className="marker marker-clip" style={{ left: at(t) }} aria-hidden="true" />
        ))}
        <div className="playhead" style={{ left: `${pct}%` }} />
      </div>
      <div className="axis">
        <span style={{ left: 0 }}>0:00</span>
        <span style={{ left: at(bounds.cfoStart) }}>{formatTime(bounds.cfoStart)} CFO</span>
        <span style={{ left: at(bounds.qaStart) }}>{formatTime(bounds.qaStart)} Q&amp;A</span>
        <span className="axis-end">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
