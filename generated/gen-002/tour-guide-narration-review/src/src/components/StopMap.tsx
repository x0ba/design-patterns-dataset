import { useApp } from '../App';
import type { Item } from '../types';
import { chapterIndexAt, cutRanges, fmt, fmtDelta, fmtFor } from '../util';

export default function StopMap({ item }: { item: Item }) {
  const { state, dispatch } = useApp();
  const pos = state.position;
  const ci = chapterIndexAt(item.chapters, pos);
  const bms = state.bookmarks.filter((b) => b.itemId === item.id);
  const { ranges } = cutRanges(bms);
  const pct = (t: number) => `${(t / item.duration) * 100}%`;
  const isTour = item.kind === 'tour';

  // Which stop accounts for most of the overrun?
  let worst = -1;
  if (isTour) {
    let max = 120;
    item.chapters.forEach((c, i) => {
      const d = c.end - c.start - (c.planned ?? 0);
      if (d > max) {
        max = d;
        worst = i;
      }
    });
  }

  return (
    <section className="stopmap" aria-label={isTour ? 'Stops: actual against planned time' : 'Chapters'}>
      <div className="section-row">
        <h2 className="section-title">{isTour ? 'Stops — actual vs planned' : 'Chapters'}</h2>
        {isTour && (
          <div className="legend">
            <span><i className="sw sw-plan" /> within plan</span>
            <span><i className="sw sw-over" /> over plan</span>
            <span><i className="sw sw-bm" /> bookmark</span>
            <span><i className="sw sw-cut" /> marked cut</span>
          </div>
        )}
      </div>
      <div className="stopmap-track">
        {item.chapters.map((c, i) => {
          const len = c.end - c.start;
          const planned = c.planned ?? len;
          const inPlan = Math.min(1, planned / len);
          const delta = len - planned;
          return (
            <button
              key={i}
              className={`stop-seg ${i === ci ? 'current' : ''} ${i === worst ? 'worst' : ''}`}
              style={{ width: pct(len) }}
              onClick={() => dispatch({ type: 'seek', t: c.start })}
              title={`${isTour ? 'Stop' : 'Chapter'} ${i + 1}: ${c.title}\nStarts ${fmtFor(item, c.start)} · ${fmt(len)}${
                isTour ? ` (planned ${fmt(planned)}, ${fmtDelta(delta)})` : ''
              }\nClick to jump to the start`}
            >
              <span className="seg-fill">
                <span className="seg-plan" style={{ width: `${inPlan * 100}%` }} />
                {isTour && inPlan < 1 && <span className="seg-over" style={{ width: `${(1 - inPlan) * 100}%` }} />}
              </span>
              <span className="seg-label">
                <span className="seg-num">{i + 1}</span>
                <span className="seg-name">{c.title.split(' — ')[0].replace(/ \(.*\)$/, '')}</span>
              </span>
              {isTour && delta >= 60 && <span className="seg-delta">{fmtDelta(delta)}</span>}
            </button>
          );
        })}
        {ranges.map((r) => (
          <span key={r.startId} className="map-cut" style={{ left: pct(r.start), width: pct(r.end - r.start) }} />
        ))}
        {bms.map((b) => (
          <span key={b.id} className={`map-pin ${b.kind}`} style={{ left: pct(b.t) }} title={`${fmtFor(item, b.t)} — ${b.note || 'Bookmark'}`} />
        ))}
        <span className="map-head" style={{ left: pct(pos) }} />
      </div>
      {isTour && worst >= 0 && item.duration - (item.planned ?? 0) > 120 && (
        <p className="map-insight">
          Stop {worst + 1} ran{' '}
          <strong>{fmtDelta(item.chapters[worst].end - item.chapters[worst].start - (item.chapters[worst].planned ?? 0))}</strong>{' '}
          over its {fmt(item.chapters[worst].planned ?? 0)} plan — that's{' '}
          {Math.round(
            ((item.chapters[worst].end - item.chapters[worst].start - (item.chapters[worst].planned ?? 0)) /
              (item.duration - (item.planned ?? item.duration))) *
              100,
          )}
          % of the {fmt(item.duration - (item.planned ?? 0))} overrun.{' '}
          {ci !== worst && (
            <button className="link" onClick={() => dispatch({ type: 'seek', t: item.chapters[worst].start })}>
              Jump to stop {worst + 1} at {fmtFor(item, item.chapters[worst].start)}
            </button>
          )}
        </p>
      )}
    </section>
  );
}
