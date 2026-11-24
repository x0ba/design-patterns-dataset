import { useState } from 'react';
import { fmtDate, fmtShortDate, relativeToToday } from '../lib/dates.js';
import { payLabel } from '../lib/search.js';

function Breakdown({ score }) {
  const p = score.parts;
  const rows = [
    ['Recent coverage of this story', p.coverage],
    ['Open call that fits', p.call],
    ['Pay', p.pay],
    ['Your history with them', p.history],
    ['Pitched in the last 30 days', p.penalty ? -p.penalty : 0],
  ];
  return (
    <dl className="breakdown">
      {rows.map(([label, v]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className={v < 0 ? 'neg' : ''}>{v > 0 ? `+${v}` : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function OutletsPanel({ rows, opts, setOpts, plan, planFull, onAdd }) {
  const [open, setOpen] = useState(null);
  const planIds = new Set(plan.map((p) => p.outletId));

  const visible = rows
    .filter((r) => (opts.hideNoCoverage ? r.coverage !== null : true))
    .filter((r) => (opts.writtenOnly ? r.outlet.history : true))
    .sort((a, b) => {
      const sa = a.score ? a.score.score : -1;
      const sb = b.score ? b.score.score : -1;
      if (sa !== sb) return sb - sa;
      return a.outlet.name.localeCompare(b.outlet.name);
    });

  return (
    <div className="outlets">
      <div className="section-head">
        <h2>Outlets ranked by fit</h2>
        <div className="toggles">
          <label className="check">
            <input
              type="checkbox"
              checked={opts.hideNoCoverage}
              onChange={(e) => setOpts((o) => ({ ...o, hideNoCoverage: e.target.checked }))}
            />
            Only outlets with coverage in this search
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={opts.writtenOnly}
              onChange={(e) => setOpts((o) => ({ ...o, writtenOnly: e.target.checked }))}
            />
            Only outlets I've written for
          </label>
        </div>
      </div>
      <p className="muted small lede">
        Fit combines recent coverage, an open call that fits, the pay on offer, your own history with the
        outlet, and a penalty for a pitch sent in the last 30 days. Click a row to see the breakdown.
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>Outlet</th>
            <th>Fit</th>
            <th>Last 6 months</th>
            <th>Open call</th>
            <th>You</th>
            <th aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const o = r.outlet;
            const s = r.score;
            const inPlan = planIds.has(o.id);
            const isOpen = open === o.id;
            const call = s?.bestCall;
            return [
              <tr key={o.id} className={`${isOpen ? 'expanded' : ''} ${inPlan ? 'in-plan' : ''}`} onClick={() => setOpen(isOpen ? null : o.id)}>
                <td>
                  <div className="outlet-name">{o.name}</div>
                  <div className="muted tiny">
                    {o.kind} · {o.city}
                  </div>
                  {!o.freelance && <span className="pill muted-pill">Staff-only, no pitches</span>}
                </td>
                <td>
                  {s ? (
                    <div className="fit">
                      <span className="fit-n">{s.score}</span>
                      <span className="fit-bar">
                        <span style={{ width: `${s.score}%` }} />
                      </span>
                    </div>
                  ) : (
                    <span className="muted">n/a</span>
                  )}
                  {s?.pitchedRecently && (
                    <div className="tiny warn-text">
                      Pitched {fmtShortDate(s.pitchedRecently.sent)} · held
                    </div>
                  )}
                </td>
                <td>
                  {r.coverage ? (
                    <>
                      <strong>{r.coverage.recent}</strong>
                      <span className="muted tiny"> of {r.coverage.total} matched</span>
                      {r.coverage.sample && (
                        <div className="tiny muted">Latest {fmtDate(r.coverage.latest)}</div>
                      )}
                    </>
                  ) : (
                    <span className="muted">No coverage here</span>
                  )}
                </td>
                <td>
                  {call ? (
                    <>
                      <div className="tiny">
                        Closes {fmtShortDate(call.deadline)} <span className="muted">({relativeToToday(call.deadline)})</span>
                      </div>
                      <div className="tiny muted">{payLabel(s.pay)}</div>
                    </>
                  ) : r.relevantCalls.length ? (
                    <span className="muted tiny">Relevant call listed</span>
                  ) : (
                    <span className="muted tiny">None for this story</span>
                  )}
                </td>
                <td>
                  {o.history ? (
                    <>
                      <div className="tiny">
                        Wrote {o.history.wrote}× · last {fmtShortDate(o.history.last)}
                      </div>
                      <div className="tiny muted">
                        {o.history.payLabel} · replies in {o.history.responseDays}d
                      </div>
                    </>
                  ) : (
                    <span className="muted tiny">Not written for yet</span>
                  )}
                </td>
                <td className="action">
                  {inPlan ? (
                    <span className="pill ok">On plan</span>
                  ) : s ? (
                    <button
                      className="btn small"
                      disabled={planFull}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdd(o.id);
                      }}
                    >
                      {planFull ? 'Plan full' : 'Add to plan'}
                    </button>
                  ) : null}
                </td>
              </tr>,
              isOpen && s && (
                <tr key={`${o.id}-detail`} className="detail-row">
                  <td colSpan={6}>
                    <div className="detail">
                      <Breakdown score={s} />
                      <div className="detail-text">
                        {o.angleHint && (
                          <>
                            <div className="tiny muted">Suggested angle</div>
                            <p>{o.angleHint}</p>
                          </>
                        )}
                        {call && (
                          <p className="tiny">
                            <strong>{call.title}</strong> ({call.topics.join(', ')}) · {call.wordMin.toLocaleString()}–
                            {call.wordMax.toLocaleString()} words · {payLabel(call.pay)} · {call.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ),
            ];
          })}
          {visible.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                No outlets match these settings.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {planFull && <p className="muted small">Your Friday plan is full. Remove an outlet from the plan to add another.</p>}
    </div>
  );
}
