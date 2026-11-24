import { OUTLET_BY_ID } from '../data/outlets.js';
import { fmtDate } from '../lib/dates.js';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Wraps query terms in <mark>. Matches the start of a word, like the search does, and marks the whole word.
export function Highlight({ text, toks }) {
  if (!toks.length) return text;
  const re = new RegExp(`(?<![a-z0-9])((?:${toks.map(esc).join('|')})[a-z0-9]*)`, 'gi');
  return text.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}

export default function CoveragePanel({
  submitted,
  baseCount,
  recentCount,
  filteredCount,
  freelanceRecent,
  angleRows6m,
  activeAngle,
  onAngle,
  sort,
  setSort,
  rows,
  total,
  toks,
  onMore,
  onOpen,
  hasMore,
  onSwitchWindow,
}) {
  const maxAngle = Math.max(1, ...angleRows6m.map(([, n]) => n));

  return (
    <div className="coverage">
      <section className="funnel" aria-label="Narrowing steps">
        <button className="stat" onClick={() => onSwitchWindow('all')}>
          <span className="stat-n">{baseCount.toLocaleString()}</span>
          <span className="stat-l">matches for “{submitted}”</span>
        </button>
        <button className="stat" onClick={() => onSwitchWindow('6m')}>
          <span className="stat-n">{recentCount.toLocaleString()}</span>
          <span className="stat-l">in the last 6 months</span>
          <span className="stat-hint">Narrow to these</span>
        </button>
        <div className="stat">
          <span className="stat-n">{freelanceRecent.toLocaleString()}</span>
          <span className="stat-l">of those written by freelancers</span>
        </div>
        <div className="stat strong">
          <span className="stat-n">{filteredCount.toLocaleString()}</span>
          <span className="stat-l">shown with your filters</span>
        </div>
      </section>

      <section className="angles">
        <div className="section-head">
          <h2>Angles covered in the last 6 months</h2>
          <span className="muted small">Click an angle to filter</span>
        </div>
        {angleRows6m.length === 0 && <p className="muted">No pieces in the last 6 months for this search.</p>}
        <ul className="angle-bars">
          {angleRows6m.slice(0, 7).map(([angle, n]) => (
            <li key={angle}>
              <button className={`angle-row ${activeAngle === angle ? 'on' : ''}`} onClick={() => onAngle(angle)}>
                <span className="angle-name">{angle}</span>
                <span className="angle-bar">
                  <span style={{ width: `${(n / maxAngle) * 100}%` }} />
                </span>
                <span className="angle-n">{n}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="results">
        <div className="section-head">
          <h2>
            {total ? `Showing ${Math.min(rows.length, total)} of ${total.toLocaleString()} pieces` : 'No pieces match'}
          </h2>
          <label className="sort">
            <span className="muted small">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="relevance">Best match</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="words">Longest first</option>
            </select>
          </label>
        </div>

        {total === 0 && (
          <div className="empty">
            <p>Nothing matches these filters.</p>
            <p className="muted small">Try widening the date range or removing a tag.</p>
          </div>
        )}

        <ol className="cards">
          {rows.map((a) => {
            const outlet = OUTLET_BY_ID[a.outletId];
            return (
              <li key={a.id}>
                <article
                  className="card"
                  tabIndex={0}
                  onClick={() => onOpen(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onOpen(a.id);
                  }}
                >
                  <div className="meta">
                    <span className="outlet">{a.outletName}</span>
                    <span className="sep">·</span>
                    <span>{fmtDate(a.date)}</span>
                    <span className="sep">·</span>
                    <span>{a.section}</span>
                    <span className="sep">·</span>
                    <span>{a.words.toLocaleString()} words</span>
                    {outlet?.kind && (
                      <>
                        <span className="sep">·</span>
                        <span className="muted">{outlet.kind}</span>
                      </>
                    )}
                  </div>
                  <h3 className="headline">
                    <Highlight text={a.headline} toks={toks} />
                  </h3>
                  <p className="summary">
                    <Highlight text={a.summary} toks={toks} />
                  </p>
                  <div className="chips">
                    <span className={`chip byline ${a.authorType}`}>
                      {a.author} · {a.authorType === 'freelance' ? 'freelance' : 'staff'}
                    </span>
                    {a.tags.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                    <span className="chip angle">{a.angle}</span>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        {hasMore && (
          <div className="more">
            <button className="btn" onClick={onMore}>
              Show {Math.min(20, total - rows.length)} more
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
