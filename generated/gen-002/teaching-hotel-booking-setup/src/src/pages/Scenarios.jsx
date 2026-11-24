import { useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { Button, Chip, Icon, PageHead } from '../ui.jsx';
import { LAST_TERM, TERM, TOPICS } from '../data.js';
import { actionById, plural, topicLabel } from '../lib.js';

const LEVEL = { Beginner: 1, Intermediate: 2, Advanced: 3 };

function Difficulty({ level }) {
  const n = LEVEL[level];
  return (
    <span className="difficulty" title={level}>
      <span className="dots" aria-hidden="true">
        {[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}
      </span>
      {level}
    </span>
  );
}

const WEEKS = Array.from({ length: TERM.weeks }, (_, i) => i + 1);

export default function Scenarios() {
  const { state, dispatch, notify } = useStore();
  const [selected, setSelected] = useState([]);
  const agent = state.roles.find((r) => r.id === 'agent');

  const lastWeek = useMemo(() => Object.fromEntries(LAST_TERM.scenarios.map((s) => [s.id, s.week])), []);
  const byWeek = WEEKS.map((w) => [w, state.scenarios.filter((s) => s.week === w)]);
  const activePlans = state.rates.filter((r) => r.status === 'active');

  const setWeek = (ids, week, label) => {
    dispatch({ type: 'scenario/week', ids, week });
    notify(`Week ${week} unlock set for ${label}.`, { undo: true });
  };

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const jump = (w) => document.getElementById(`week-${w}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="page">
      <PageHead
        title="Practice scenarios"
        lead={`Choose the week each scenario unlocks for students. Students only see scenarios from their unlock week onward. The term runs ${TERM.weeks} weeks.`}
      />

      <div className="week-strip" role="list" aria-label="Scenarios unlocking each week">
        {byWeek.map(([w, list]) => (
          <button
            key={w}
            type="button"
            role="listitem"
            className={`wk ${list.length ? 'has' : ''}`}
            disabled={!list.length}
            onClick={() => jump(w)}
            aria-label={`Week ${w}: ${plural(list.length, 'scenario')}`}
          >
            <span className="wk-n">Wk {w}</span>
            <span className="wk-bars" aria-hidden="true">{list.map((s) => <i key={s.id} />)}</span>
          </button>
        ))}
      </div>

      <div className="scn-layout">
        <div className="scn-main">
          <div className={`select-bar ${selected.length ? 'is-on' : ''}`} aria-live="polite">
            {selected.length === 0 ? (
              <span className="muted">Tick scenarios to move several at once, or use “Unlock by topic” on the right.</span>
            ) : (
              <>
                <strong>{plural(selected.length, 'scenario')} selected</strong>
                <label className="inline-select">
                  Unlock in
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setWeek(selected, Number(e.target.value), plural(selected.length, 'selected scenario'));
                      setSelected([]);
                    }}
                    aria-label="Unlock selected scenarios in week"
                  >
                    <option value="">Choose week…</option>
                    {WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                </label>
                <span className="spacer" />
                <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Clear</Button>
              </>
            )}
          </div>

          {byWeek.filter(([, l]) => l.length).map(([w, list]) => (
            <section key={w} id={`week-${w}`} className="week-group" aria-labelledby={`wh-${w}`}>
              <h2 id={`wh-${w}`}>Week {w} <span className="count">{plural(list.length, 'scenario')}</span></h2>
              <ul className="scn-list">
                {list.map((s) => {
                  const handoff = s.needs.filter((a) => agent.perms[a] === 'no');
                  const plan = state.rates.find((r) => r.id === s.ratePlan);
                  const planBad = plan && plan.status !== 'active';
                  return (
                    <li key={s.id} className={selected.includes(s.id) ? 'is-selected' : ''}>
                      <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} aria-label={`Select “${s.title}”`} />
                      <div className="scn-body">
                        <div className="scn-title">{s.title}</div>
                        <div className="scn-meta">
                          <span>{topicLabel(s.topic)}</span>
                          <Difficulty level={s.difficulty} />
                          {handoff.length > 0 && (
                            <Chip tone="draft" icon="lock" title={`${agent.name}s are not allowed to do this, so they will need to hand it to a ${state.roles[1].short}.`}>
                              Desk Agents hand off: {handoff.map((a) => actionById(a).short).join(', ')}
                            </Chip>
                          )}
                        </div>
                        {plan && (
                          <div className={`scn-plan ${planBad ? 'is-bad' : ''}`}>
                            <label>
                              Rate plan used
                              <select
                                value={s.ratePlan}
                                onChange={(e) => dispatch({ type: 'scenario/ratePlan', id: s.id, ratePlan: e.target.value })}
                              >
                                {planBad && <option value={plan.id} disabled>{plan.name} ({plan.status})</option>}
                                {activePlans.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                              </select>
                            </label>
                            {planBad && <span className="inline-warn"><Icon name="alert" size={14} /> {plan.name} is {plan.status}. Pick another plan.</span>}
                          </div>
                        )}
                      </div>
                      <div className="scn-week">
                        <label>
                          <span className="sr-only">Unlock week for {s.title}</span>
                          <select value={s.week} onChange={(e) => setWeek([s.id], Number(e.target.value), `“${s.title}”`)}>
                            {WEEKS.map((x) => <option key={x} value={x}>Week {x}</option>)}
                          </select>
                        </label>
                        {lastWeek[s.id] !== s.week && <span className="was">{TERM.lastName}: wk {lastWeek[s.id]}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <aside className="scn-aside panel" aria-labelledby="bt">
          <h2 id="bt" className="panel-title">Unlock by topic</h2>
          <p className="muted small">Set a whole topic at once. Individual scenarios can still differ.</p>
          <ul className="topic-list">
            {TOPICS.map((t) => {
              const list = state.scenarios.filter((s) => s.topic === t.id);
              const weeks = [...new Set(list.map((s) => s.week))];
              const mixed = weeks.length > 1;
              return (
                <li key={t.id}>
                  <div>
                    <strong>{t.label}</strong>
                    <span className="muted small">{plural(list.length, 'scenario')}{mixed ? `, weeks ${Math.min(...weeks)}–${Math.max(...weeks)}` : ''}</span>
                  </div>
                  <select
                    value={mixed ? '' : weeks[0]}
                    onChange={(e) => setWeek(list.map((s) => s.id), Number(e.target.value), t.label)}
                    aria-label={`Unlock week for ${t.label}`}
                  >
                    {mixed && <option value="" disabled>Mixed</option>}
                    {WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
