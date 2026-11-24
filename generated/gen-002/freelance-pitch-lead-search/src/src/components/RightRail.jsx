import { OUTLET_BY_ID } from '../data/outlets.js';
import { LAST_CHECK, daysSince, fmtShortDate, fmtDate } from '../lib/dates.js';

export default function RightRail({ saved, onRun, pitches, planIds }) {
  const suggestions = saved
    .map((s) => ({ ...s, rank: s.newCount + s.openCalls.length * 3 }))
    .filter((s) => s.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 3);

  return (
    <aside className="rail right" aria-label="Saved interests and pitches">
      <section className="rcard">
        <div className="rail-head">
          <h2>Saved interests</h2>
          <span className="muted small">{saved.length}</span>
        </div>
        <p className="muted tiny">New since you last checked, {fmtShortDate(LAST_CHECK)}.</p>
        <ul className="saved-list">
          {saved.map((s) => (
            <li key={s.id}>
              <button className="saved-row" onClick={() => onRun(s.q)}>
                <span className="saved-q">{s.q}</span>
                <span className={`saved-new ${s.newCount ? 'has' : ''}`}>
                  {s.newCount ? `+${s.newCount}` : 'none'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rcard">
        <div className="rail-head">
          <h2>Suggested from your interests</h2>
        </div>
        {suggestions.map((s) => {
          const call = [...s.openCalls].sort((a, b) => (a.deadline < b.deadline ? -1 : 1))[0];
          return (
            <button key={s.id} className="suggest" onClick={() => onRun(s.q)}>
              <span className="suggest-q">{s.q}</span>
              <span className="suggest-why">
                {s.newCount > 0 && <>{s.newCount} new piece{s.newCount === 1 ? '' : 's'} since {fmtShortDate(LAST_CHECK)}</>}
                {s.newCount > 0 && s.openCalls.length > 0 && ' · '}
                {s.openCalls.length > 0 && (
                  <>
                    {s.openCalls.length} open call{s.openCalls.length === 1 ? '' : 's'}
                    {call && <> (earliest: {OUTLET_BY_ID[call.outletId].name}, {fmtShortDate(call.deadline)})</>}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </section>

      <section className="rcard">
        <div className="rail-head">
          <h2>Pitches out</h2>
          <span className="muted small">{pitches.length}</span>
        </div>
        <ul className="pitch-list">
          {pitches.map((p) => {
            const outlet = OUTLET_BY_ID[p.outletId];
            const days = daysSince(p.sent);
            const held = days <= 30;
            return (
              <li key={p.id} className="pitch-row">
                <div className="pitch-top">
                  <span className="pitch-outlet">{outlet.name}</span>
                  <span className={`pill ${p.status === 'no-reply' ? 'warn' : ''}`}>
                    {p.status === 'no-reply' ? `No reply, ${days}d` : `Awaiting, ${days}d`}
                  </span>
                </div>
                <div className="pitch-title">{p.title}</div>
                <div className="tiny muted">
                  Sent {fmtDate(p.sent)}
                  {held && planIds.has(p.outletId) ? ' · conflicts with plan' : ''}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="tiny muted">Outlets with a pitch in the last 30 days are held out of your Friday plan.</p>
      </section>
    </aside>
  );
}
