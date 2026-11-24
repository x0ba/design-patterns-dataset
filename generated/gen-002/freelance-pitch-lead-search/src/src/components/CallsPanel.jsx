import { OUTLET_BY_ID } from '../data/outlets.js';
import { FRIDAY, TODAY, fmtShortDate, daysBetween } from '../lib/dates.js';
import { payLabel } from '../lib/search.js';

const DEADLINES = [
  ['any', 'Any deadline'],
  ['friday', `Closes by Fri, ${fmtShortDate(FRIDAY)}`],
  ['fortnight', 'Closes within 14 days'],
];
const PAYS = [
  ['any', 'Any pay'],
  ['word', 'Per word'],
  ['flat', 'Flat fee'],
];

function Seg({ options, value, onChange, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export default function CallsPanel({ rows, opts, setOpts, relevantCount, closingByFriday, planIds, planFull, onAdd }) {
  return (
    <div className="calls">
      <div className="section-head">
        <h2>Open editor calls</h2>
        <span className="muted small">
          {rows.length} shown · {closingByFriday} close by Friday
        </span>
      </div>

      <div className="call-controls">
        <Seg
          label="Relevance"
          options={[
            ['match', `Matches my story (${relevantCount})`],
            ['all', 'All open calls (140)'],
          ]}
          value={opts.relevance}
          onChange={(v) => setOpts((o) => ({ ...o, relevance: v }))}
        />
        <Seg label="Deadline" options={DEADLINES} value={opts.deadline} onChange={(v) => setOpts((o) => ({ ...o, deadline: v }))} />
        <Seg label="Pay" options={PAYS} value={opts.pay} onChange={(v) => setOpts((o) => ({ ...o, pay: v }))} />
      </div>
      <p className="muted small lede">
        “Matches my story” uses the topics of the current search and filters. Sorted by deadline, soonest first.
      </p>

      <table className="table calls-table">
        <thead>
          <tr>
            <th>Deadline</th>
            <th>Outlet and call</th>
            <th>Editor</th>
            <th>Pay and length</th>
            <th aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const outlet = OUTLET_BY_ID[c.outletId];
            const days = daysBetween(TODAY, c.deadline);
            const inPlan = planIds.has(c.outletId);
            const byFriday = c.deadline <= FRIDAY;
            return (
              <tr key={c.id} className={inPlan ? 'in-plan' : ''}>
                <td>
                  <div className={`deadline ${byFriday ? 'urgent' : ''}`}>{fmtShortDate(c.deadline)}</div>
                  <div className="tiny muted">{days === 0 ? 'today' : days === 1 ? 'tomorrow' : `${days} days`}</div>
                  <div className="tiny muted">posted {fmtShortDate(c.posted)}</div>
                </td>
                <td>
                  <div className="outlet-name">{outlet.name}</div>
                  <div className="call-title">{c.title}</div>
                  <div className="chips">
                    {c.topics.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="tiny muted note">{c.note}</div>
                </td>
                <td>
                  <div>{c.editor.name}</div>
                  <div className="tiny muted">{c.editor.title}</div>
                </td>
                <td>
                  <div>{payLabel(c.pay)}</div>
                  <div className="tiny muted">
                    {c.wordMin.toLocaleString()}–{c.wordMax.toLocaleString()} words
                  </div>
                </td>
                <td className="action">
                  {inPlan ? (
                    <span className="pill ok">On plan</span>
                  ) : (
                    <button className="btn small" disabled={planFull} onClick={() => onAdd(c.outletId)}>
                      {planFull ? 'Plan full' : 'Add to plan'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No calls match these settings. Try “All open calls” or a later deadline.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
