import { useMemo, useRef, useState } from 'react';
import { useApp } from '../App';
import type { Item } from '../types';
import { chapterIndexAt, cutRanges, fmt, fmtFor, waveform } from '../util';

const BINS = 300;

export default function Closeup({ item }: { item: Item }) {
  const { state, dispatch } = useApp();
  const ci = chapterIndexAt(item.chapters, state.position);
  const ch = item.chapters[ci];
  const len = ch.end - ch.start;
  const wave = useMemo(() => waveform(item.transcript, ch.start, ch.end, BINS), [item, ch.start, ch.end]);
  const bms = state.bookmarks.filter((b) => b.itemId === item.id && b.t >= ch.start && b.t <= ch.end);
  const { ranges } = cutRanges(state.bookmarks.filter((b) => b.itemId === item.id));
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const x = (t: number) => ((t - ch.start) / len) * 100;
  const timeAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return ch.start + Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * len;
  };
  const isTour = item.kind === 'tour';
  const hasGuests = item.transcript.some((s) => s.speaker.startsWith('Guest'));

  // Guest-question markers: where a guest spoke after a stretch of the guide talking
  const guestTurns = item.transcript.filter(
    (s, i) => s.speaker.startsWith('Guest') && s.t >= ch.start && s.t < ch.end && !item.transcript[i - 1]?.speaker.startsWith('Guest'),
  );

  return (
    <section className="closeup">
      <div className="section-row">
        <h2 className="section-title">
          <span className="muted">{isTour ? 'Stop' : 'Chapter'} {ci + 1} of {item.chapters.length} ·</span> {ch.title}
        </h2>
        <div className="closeup-meta">
          {fmtFor(item, ch.start)} – {fmtFor(item, ch.end)} · {fmt(len)}
          {ch.planned ? <> (planned {fmt(ch.planned)})</> : null}
          <span className="legend">
            <span><i className="sw sw-ines" /> {isTour ? 'Inês' : item.author?.split(' ')[0]}</span>
            {hasGuests && <span><i className="sw sw-guest" /> Guest</span>}
            {isTour && <span><i className="sw sw-quiet" /> walking / quiet</span>}
          </span>
        </div>
      </div>
      <div
        className="wave"
        ref={ref}
        onMouseMove={(e) => setHover(timeAt(e.clientX))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => dispatch({ type: 'seek', t: timeAt(e.clientX) })}
        role="slider"
        aria-label={`Position within ${ch.title}`}
        aria-valuemin={ch.start}
        aria-valuemax={ch.end}
        aria-valuenow={Math.floor(state.position)}
        aria-valuetext={fmtFor(item, state.position)}
        tabIndex={-1}
      >
        <svg viewBox={`0 0 ${BINS} 100`} preserveAspectRatio="none" className="wave-svg">
          {ranges.map((r) => {
            const s = Math.max(r.start, ch.start);
            const e = Math.min(r.end, ch.end);
            if (e <= s) return null;
            return <rect key={r.startId} x={(x(s) / 100) * BINS} y={0} width={((e - s) / len) * BINS} height={100} className="wave-cut" />;
          })}
          {wave.map((b, i) => {
            const h = Math.max(3, b.amp * 88);
            const played = b.t <= state.position;
            const cls = b.speaker === 'none' ? 'q' : b.speaker.startsWith('Guest') ? 'g' : 'i';
            return <rect key={i} x={i + 0.15} y={50 - h / 2} width={0.7} height={h} className={`bar ${cls} ${played ? 'played' : ''}`} />;
          })}
        </svg>
        {guestTurns.map((g) => (
          <span key={g.t} className="guest-tick" style={{ left: `${x(g.t)}%` }} title={`Guest speaks at ${fmtFor(item, g.t)}: “${g.text.slice(0, 70)}…”`} />
        ))}
        {bms.map((b) => (
          <span key={b.id} className={`wave-pin ${b.kind}`} style={{ left: `${x(b.t)}%` }}>
            <span className="wave-pin-label">
              {b.kind === 'cut-start' ? 'Cut starts' : b.kind === 'cut-end' ? 'Cut ends' : b.note || 'Bookmark'}
            </span>
          </span>
        ))}
        <span className="wave-head" style={{ left: `${x(state.position)}%` }} />
        {hover !== null && (
          <span className="wave-hover" style={{ left: `${x(hover)}%` }}>
            <span>{fmtFor(item, hover)}</span>
          </span>
        )}
      </div>
    </section>
  );
}
