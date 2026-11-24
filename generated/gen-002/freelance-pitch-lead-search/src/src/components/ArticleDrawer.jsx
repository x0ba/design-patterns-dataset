import { ARTICLES, CALLS } from '../data/generate.js';
import { OUTLET_BY_ID } from '../data/outlets.js';
import { FRIDAY, fmtDate, fmtShortDate, relativeToToday } from '../lib/dates.js';
import { matchesQuery, payLabel, tokenize } from '../lib/search.js';

export default function ArticleDrawer({ article, submitted, onClose, rowById, planIds, planFull, onAdd, onOpenCalls }) {
  const outlet = OUTLET_BY_ID[article.outletId];
  const row = rowById[article.outletId];
  const toks = tokenize(submitted);
  const inPlan = planIds.has(article.outletId);

  const sameOutlet = ARTICLES.filter(
    (a) => a.outletId === article.outletId && a.id !== article.id && matchesQuery(a, toks),
  )
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4);

  const calls = CALLS.filter((c) => c.outletId === article.outletId).sort((a, b) => (a.deadline < b.deadline ? -1 : 1));

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Article details">
        <header className="drawer-head">
          <span className="muted small">
            {article.outletName} · {fmtDate(article.date)}
          </span>
          <button className="btn small ghost" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>

        <div className="drawer-body">
          <h2 className="drawer-title">{article.headline}</h2>
          <p className="drawer-summary">{article.summary}</p>

          <dl className="facts">
            <div>
              <dt>Byline</dt>
              <dd>
                {article.author}, <span className={`pill ${article.authorType === 'freelance' ? 'accent' : ''}`}>{article.authorType === 'freelance' ? 'Freelance' : 'Staff'}</span>
              </dd>
            </div>
            <div>
              <dt>Section</dt>
              <dd>{article.section}</dd>
            </div>
            <div>
              <dt>Length</dt>
              <dd>{article.words.toLocaleString()} words</dd>
            </div>
            <div>
              <dt>Angle</dt>
              <dd>{article.angle}</dd>
            </div>
            <div className="wide">
              <dt>Tags</dt>
              <dd className="chips">
                {article.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          </dl>

          <section className="drawer-section">
            <h3>About {outlet.name}</h3>
            <p className="muted small">
              {outlet.kind}, {outlet.city}. {outlet.freelance ? 'Takes pitches from freelancers.' : 'Staff-only, so no pitches.'}
            </p>
            {outlet.history ? (
              <p className="small">
                You’ve written for them {outlet.history.wrote} time{outlet.history.wrote === 1 ? '' : 's'}. Last piece{' '}
                {fmtShortDate(outlet.history.last)}, paid {outlet.history.payLabel}, replies in about{' '}
                {outlet.history.responseDays} days.
              </p>
            ) : (
              <p className="small muted">You haven’t written for them yet.</p>
            )}

            {outlet.freelance && row?.score && (
              <div className="drawer-fit">
                <span>
                  Fit <strong>{row.score.score}</strong>
                </span>
                {inPlan ? (
                  <span className="pill ok">On your Friday plan</span>
                ) : (
                  <button className="btn primary small" disabled={planFull} onClick={() => onAdd(outlet.id)}>
                    {planFull ? 'Plan is full' : 'Add to Friday plan'}
                  </button>
                )}
              </div>
            )}
          </section>

          {sameOutlet.length > 0 && (
            <section className="drawer-section">
              <h3>More from {outlet.name} on this search</h3>
              <ul className="mini-list">
                {sameOutlet.map((a) => (
                  <li key={a.id}>
                    <span className="tiny muted">{fmtDate(a.date)}</span>
                    <span>{a.headline}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="drawer-section">
            <div className="section-head">
              <h3>Open calls from {outlet.name}</h3>
              {calls.length > 0 && (
                <button className="link" onClick={onOpenCalls}>
                  See all calls
                </button>
              )}
            </div>
            {calls.length === 0 && <p className="muted small">No open calls right now.</p>}
            <ul className="mini-list">
              {calls.map((c) => (
                <li key={c.id}>
                  <span className="tiny muted">
                    Closes {fmtShortDate(c.deadline)} ({relativeToToday(c.deadline)})
                  </span>
                  <span>
                    {c.title}
                    <span className="muted"> · {payLabel(c.pay)} · {c.editor.name}</span>
                  </span>
                </li>
              ))}
            </ul>
            {calls.some((c) => c.deadline <= FRIDAY) && <p className="tiny warn-text">At least one call closes by Friday.</p>}
          </section>
        </div>
      </aside>
    </>
  );
}
