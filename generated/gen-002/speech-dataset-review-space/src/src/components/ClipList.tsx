import { useEffect, useRef } from 'react';
import { ACCENTS, DATA, ENV_SHORT, evalClipId } from '../data/model';
import { fmtDelta, nf, pct } from '../format';
import { Badge } from './ComparePanel';

export type ClipSort = 'regressed' | 'sample' | 'lowsnr';

interface Props {
  clips: number[];
  total: number;
  source: 'A' | 'B';
  hasB: boolean;
  setSource: (s: 'A' | 'B') => void;
  sort: ClipSort;
  setSort: (s: ClipSort) => void;
  selected: number | null;
  playing: boolean;
  onPlay: (i: number) => void;
  onReshuffle: () => void;
}

export function ClipList({ clips, total, source, hasB, setSource, sort, setSort, selected, playing, onPlay, onReshuffle }: Props) {
  const { ev } = DATA;
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.querySelector('.clip-row.sel') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  return (
    <section className="clips">
      <div className="panel-head">
        <h2>Listen</h2>
        <div className="seg small">
          <button className={source === 'A' ? 'on' : ''} onClick={() => setSource('A')}>
            <Badge slot="A" size={15} /> clips
          </button>
          <button className={source === 'B' ? 'on' : ''} onClick={() => setSource('B')} disabled={!hasB}>
            <Badge slot="B" size={15} /> clips
          </button>
        </div>
      </div>
      <div className="clips-tools">
        <div className="seg small">
          <button className={sort === 'regressed' ? 'on' : ''} onClick={() => setSort('regressed')}>
            Worst regressions
          </button>
          <button className={sort === 'lowsnr' ? 'on' : ''} onClick={() => setSort('lowsnr')}>
            Noisiest
          </button>
          <button className={sort === 'sample' ? 'on' : ''} onClick={() => setSort('sample')}>
            Random sample
          </button>
        </div>
        {sort === 'sample' && (
          <button className="ghost small" onClick={onReshuffle} title="Draw a new random sample">
            ↻ New sample
          </button>
        )}
        <span className="dim small-text" title="Space plays or pauses · N next clip · Shift+N previous">
          {clips.length} of {nf.format(total)}
        </span>
      </div>
      <div className="clip-list" ref={listRef}>
        {clips.map((i) => {
          const d = ev.wer42[i] - ev.wer41[i];
          const sel = i === selected;
          return (
            <div key={i} className={`clip-row${sel ? ' sel' : ''}`} onClick={() => onPlay(i)}>
              <button className={`play-mini${sel && playing ? ' on' : ''}`} aria-label={sel && playing ? 'Pause' : 'Play'}>
                {sel && playing ? <PauseIcon /> : <PlayIcon />}
              </button>
              <div className="clip-main">
                <div className="clip-id mono">{evalClipId(i)}</div>
                <div className="clip-meta">
                  {ACCENTS[ev.accent[i]].code} · {ENV_SHORT[ev.env[i]]} · {ev.dur[i].toFixed(1)} s
                </div>
              </div>
              <div className="clip-snr mono">{ev.snr[i].toFixed(1)} dB</div>
              <div className="clip-wer">
                <span className="mono">
                  {pct(ev.wer41[i])}→{pct(ev.wer42[i])}
                </span>
                <span className={`delta-chip tiny ${d > 0.02 ? 'bad' : d < -0.02 ? 'good' : 'neutral'}`}>{fmtDelta(d)}</span>
              </div>
            </div>
          );
        })}
        {!clips.length && <div className="empty-note">No eval clips inside this region.</div>}
      </div>
    </section>
  );
}

export const PlayIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden>
    <path d="M2.5 1.2v9.6L10.6 6z" fill="currentColor" />
  </svg>
);
export const PauseIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden>
    <rect x="2" y="1.5" width="3" height="9" rx="0.6" fill="currentColor" />
    <rect x="7" y="1.5" width="3" height="9" rx="0.6" fill="currentColor" />
  </svg>
);
