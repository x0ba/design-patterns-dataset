import { useApp } from '../App';
import { cutRanges, fmt, fmtDate, fmtDelta, fmtFor, relDate, totalCut } from '../util';
import StopMap from './StopMap';
import Closeup from './Closeup';
import Transcript from './Transcript';
import SidePanel from './SidePanel';

export default function NowPlaying() {
  const { state } = useApp();
  const item = state.items[state.currentId];
  const bms = state.bookmarks.filter((b) => b.itemId === item.id);
  const { ranges } = cutRanges(bms);
  const cut = totalCut(ranges);

  return (
    <div className="np">
      <header className="np-head">
        <div className="np-title-block">
          <div className="eyebrow">
            {item.kind === 'tour' ? (
              <>
                <span className="kind-dot tour" /> My tour recording · {item.subtitle}
                {item.tag && <span className="tag">{item.tag}</span>}
              </>
            ) : (
              <>
                <span className="kind-dot lecture" /> Reference lecture · {item.author}
              </>
            )}
          </div>
          <h1>{item.title}</h1>
          <div className="np-meta">
            {item.kind === 'tour' ? (
              <>
                Recorded {relDate(item.date).toLowerCase() === 'yesterday' ? 'yesterday, ' : ''}
                {fmtDate(item.date, true)} · {item.guests} guests · {item.chapters.length} stops
                {item.weather ? ` · ${item.weather}` : ''}
              </>
            ) : (
              <>
                {item.subtitle} · bought {fmtDate(item.date)} · {item.chapters.length} chapters
              </>
            )}
          </div>
        </div>

        {item.kind === 'tour' && item.planned ? (
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Planned</div>
              <div className="stat-value">{fmt(item.planned, true)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Recorded</div>
              <div className="stat-value">
                {fmt(item.duration, true)}
                <span className={`delta ${item.duration > item.planned ? 'over' : 'under'}`}>
                  {fmtDelta(item.duration - item.planned)}
                </span>
              </div>
            </div>
            <div className={`stat ${cut > 0 ? 'stat-live' : ''}`}>
              <div className="stat-label">After marked cuts</div>
              <div className="stat-value">
                {fmt(item.duration - cut, true)}
                <span className={`delta ${item.duration - cut > item.planned ? 'over' : 'under'}`}>
                  {fmtDelta(item.duration - cut - item.planned)}
                </span>
              </div>
              <div className="stat-foot">
                {ranges.length === 0
                  ? 'No cuts marked yet'
                  : `${ranges.length} cut${ranges.length > 1 ? 's' : ''} · saves ${fmt(cut)}`}
              </div>
            </div>
          </div>
        ) : (
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Length</div>
              <div className="stat-value">{fmt(item.duration)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Played</div>
              <div className="stat-value">{Math.round((Math.max(item.played, state.position) / item.duration) * 100)}%</div>
            </div>
            <div className="stat">
              <div className="stat-label">Left at {state.speed}×</div>
              <div className="stat-value">{fmtFor(item, (item.duration - state.position) / state.speed)}</div>
            </div>
          </div>
        )}
      </header>

      <StopMap item={item} />
      <Closeup item={item} />

      <div className="np-body">
        <Transcript key={item.id} item={item} />
        <SidePanel item={item} />
      </div>
    </div>
  );
}
