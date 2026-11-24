import { OUTLET_BY_ID } from '../data/outlets.js';
import { FRIDAY, fmtDate, fmtShortDate, relativeToToday } from '../lib/dates.js';
import { payLabel } from '../lib/search.js';

const PLAN_SIZE = 3;

// The call that best fits this outlet, or null.
function callFor(row) {
  return row?.score?.bestCall || null;
}

function editorFor(outlet, call) {
  return call?.editor || outlet.editor || null;
}

function reasons(row) {
  const out = [];
  const s = row.score;
  if (row.coverage?.recent) {
    out.push(`${row.coverage.recent} recent piece${row.coverage.recent === 1 ? '' : 's'} on this story`);
  }
  const call = callFor(row);
  if (call) {
    out.push(`Open call “${call.title}”, closes ${fmtShortDate(call.deadline)} (${relativeToToday(call.deadline)})`);
  }
  if (s.pay) out.push(payLabel(s.pay));
  if (row.outlet.history) {
    const h = row.outlet.history;
    out.push(`You’ve written for them ${h.wrote}×, last ${fmtShortDate(h.last)}, replies in about ${h.responseDays} days`);
  }
  return out;
}

function planText(items, rowById) {
  const lines = [`Friday pitch plan, send by ${fmtDate(FRIDAY)}`, 'Story: a new virus in urban hives, with Milwaukee losses', ''];
  items.forEach((item, i) => {
    const outlet = OUTLET_BY_ID[item.outletId];
    const row = rowById[item.outletId];
    const call = callFor(row);
    const ed = editorFor(outlet, call);
    lines.push(`${i + 1}. ${outlet.name}${ed ? ` (${ed.name}, ${ed.title})` : ''}`);
    if (call) lines.push(`   Call: “${call.title}”, closes ${fmtDate(call.deadline)}, ${payLabel(call.pay)}`);
    lines.push(`   Angle: ${item.angle}`);
    lines.push('');
  });
  return lines.join('\n');
}

export default function PlanPanel({ plan, rowById, suggestions, held, onAdd, onUpdate, onRemove, onToast, fridayLabel, daysToFriday }) {
  const full = plan.length >= PLAN_SIZE;

  const copy = async () => {
    const text = planText(plan, rowById);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Some plain-HTTP origins block the Clipboard API; fall back to a hidden textarea.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    onToast(ok ? 'Plan copied to clipboard.' : 'Copy failed. Select the plan text manually.');
  };

  return (
    <div className="plan">
      <div className="plan-head">
        <div>
          <h2>Pitch plan for {fridayLabel}</h2>
          <p className="muted small">
            {daysToFriday} days to send. Three outlets, each with a pitch you can finish this week.
          </p>
        </div>
        <div className="progress">
          <span className="progress-n">
            {plan.length} of {PLAN_SIZE}
          </span>
          <span className="progress-bar">
            <span style={{ width: `${(plan.length / PLAN_SIZE) * 100}%` }} />
          </span>
        </div>
      </div>

      <section className="plan-list">
        {plan.length === 0 && (
          <div className="empty">
            <p>No outlets on the plan yet.</p>
            <p className="muted small">Add the top three below, or pick others from Outlets and Open calls.</p>
          </div>
        )}
        {plan.map((item, i) => {
          const outlet = OUTLET_BY_ID[item.outletId];
          const row = rowById[item.outletId];
          const call = callFor(row);
          const ed = editorFor(outlet, call);
          return (
            <article key={item.outletId} className="plan-item">
              <header>
                <span className="num">{i + 1}</span>
                <div className="plan-title">
                  <div className="outlet-name">{outlet.name}</div>
                  <div className="muted tiny">{outlet.kind} · {outlet.city}</div>
                </div>
                <button className="link" onClick={() => onRemove(item.outletId)}>
                  Remove
                </button>
              </header>
              <div className="plan-facts">
                {ed && (
                  <div>
                    <span className="k">Editor</span>
                    {ed.name}, {ed.title}
                  </div>
                )}
                {call ? (
                  <div>
                    <span className="k">Call closes</span>
                    {fmtShortDate(call.deadline)} · {payLabel(call.pay)} · {call.wordMin.toLocaleString()}–{call.wordMax.toLocaleString()} words
                  </div>
                ) : (
                  <div>
                    <span className="k">Pitch</span>
                    Open to pitches, no listed call
                  </div>
                )}
                <div>
                  <span className="k">Send by</span>
                  {fmtShortDate(FRIDAY)}
                </div>
              </div>
              <label className="field">
                <span className="k">Angle</span>
                <textarea
                  rows={3}
                  value={item.angle}
                  onChange={(e) => onUpdate(item.outletId, { angle: e.target.value })}
                />
              </label>
              <div className="plan-checks">
                <label className="check">
                  <input type="checkbox" checked={item.drafted} onChange={(e) => onUpdate(item.outletId, { drafted: e.target.checked })} />
                  Pitch drafted
                </label>
                <label className="check">
                  <input type="checkbox" checked={item.sent} onChange={(e) => onUpdate(item.outletId, { sent: e.target.checked })} />
                  Sent
                </label>
              </div>
            </article>
          );
        })}
      </section>

      {plan.length > 0 && (
        <div className="plan-actions">
          <button className="btn" onClick={copy}>
            Copy plan as text
          </button>
          <span className="muted small">
            {plan.filter((p) => p.sent).length} sent · {plan.filter((p) => p.drafted && !p.sent).length} drafted
          </span>
        </div>
      )}

      {!full && suggestions.length > 0 && (
        <section className="suggest-section">
          <h3>Recommended for Friday</h3>
          <p className="muted small">Ranked by fit. Each one is open to pitches now and was not pitched in the last 30 days.</p>
          <ul className="suggest-list">
            {suggestions.map((row) => (
              <li key={row.outlet.id} className="suggest-card">
                <div className="suggest-top">
                  <div>
                    <div className="outlet-name">{row.outlet.name}</div>
                    <div className="muted tiny">{row.outlet.kind}</div>
                  </div>
                  <span className="fit-badge">Fit {row.score.score}</span>
                </div>
                <ul className="why">
                  {reasons(row).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <button className="btn primary small" onClick={() => onAdd(row.outlet.id)}>
                  Add to plan
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {held.length > 0 && (
        <section className="held">
          <h3>Held back</h3>
          <p className="muted small">
            These fit the story, but you pitched them in the last 30 days. Only add one if the new angle is clearly different.
          </p>
          <ul>
            {held.map((row) => (
              <li key={row.outlet.id}>
                <strong>{row.outlet.name}</strong>
                <span className="muted small">
                  {' '}
                  pitched {fmtShortDate(row.score.pitchedRecently.sent)} on “{row.score.pitchedRecently.title}”
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
