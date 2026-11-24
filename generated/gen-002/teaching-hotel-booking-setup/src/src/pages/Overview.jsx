import { useMemo } from 'react';
import { useStore, contentOf } from '../store.jsx';
import { Icon, Button, PageHead, Chip } from '../ui.jsx';
import { buildChecklist, checklistProgress, buildIssues } from '../checklist.js';
import { diffAgainstLastTerm, SECTION_ORDER } from '../diff.js';
import { TERM } from '../data.js';
import { money, pct, plural } from '../lib.js';

export default function Overview({ go }) {
  const { state } = useStore();
  const groups = useMemo(() => buildChecklist(state), [state]);
  const { done, total } = checklistProgress(groups);
  const issues = useMemo(() => buildIssues(state), [state]);
  const changes = useMemo(() => diffAgainstLastTerm(contentOf(state)), [state]);

  const next = groups.flatMap((g) => g.tasks).find((t) => !t.done);
  const bySection = SECTION_ORDER.map((s) => [s, changes.filter((c) => c.section === s).length]).filter(([, n]) => n);

  const active = state.rates.filter((r) => r.status === 'active').length;
  const drafts = state.rates.filter((r) => r.status === 'draft').length;
  const weeks = state.scenarios.map((s) => s.week);

  return (
    <div className="page">
      <PageHead
        title={`${TERM.name} setup`}
        lead={`${TERM.students} students start in ${TERM.startsIn}. Work down the checklist, then compare against ${TERM.lastName} and publish.`}
      />

      <div className="overview-grid">
        <section aria-labelledby="chk" className="panel checklist">
          <div className="panel-head">
            <h2 id="chk">Setup checklist</h2>
            <div className="progress-wrap">
              <span className="progress-text">{done} of {total} done</span>
              <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Checklist progress">
                <span style={{ width: `${(done / total) * 100}%` }} />
              </div>
            </div>
          </div>

          {next && done < total && (
            <div className="next-up">
              <span className="eyebrow">Up next</span>
              <strong>{next.label}</strong>
              <Button variant="primary" size="sm" iconRight="arrow" onClick={() => go(next.go, next.goState)}>{next.cta}</Button>
            </div>
          )}
          {done === total && (
            <div className="next-up is-done">
              <Icon name="check" />
              <strong>Everything on the checklist is done.</strong>
              <Button variant="primary" size="sm" iconRight="arrow" onClick={() => go('review')}>Review &amp; publish</Button>
            </div>
          )}

          {groups.map((g) => {
            const gd = g.tasks.filter((t) => t.done).length;
            return (
              <div className="chk-group" key={g.id}>
                <h3>
                  {g.title}
                  <span className="chk-count">{gd}/{g.tasks.length}</span>
                </h3>
                <ul>
                  {g.tasks.map((t) => (
                    <li key={t.id} className={t.done ? 'is-done' : ''}>
                      <span className="tick" aria-hidden="true">{t.done && <Icon name="check" size={14} />}</span>
                      <div className="chk-text">
                        <span className="chk-label">
                          {t.label}
                          <span className="sr-only">{t.done ? ' (done)' : ' (not done)'}</span>
                        </span>
                        {t.hint && (!t.done || t.keepHint) && <span className="chk-hint">{t.hint}</span>}
                      </div>
                      {!t.done && (
                        <Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go(t.go, t.goState)}>{t.cta}</Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <div className="overview-side">
          {issues.length > 0 && (
            <section className="panel" aria-labelledby="heads">
              <h2 id="heads" className="panel-title">Worth a look</h2>
              <ul className="issue-list">
                {issues.map((i) => (
                  <li key={i.id} className={`issue issue-${i.tone}`}>
                    <Icon name="alert" size={17} />
                    <div>
                      <strong>{i.title}</strong>
                      <p>{i.text}</p>
                      <button type="button" className="text-link" onClick={() => go(i.page, i.goState)}>Open {i.page === 'roles' ? 'student roles' : i.page === 'rates' ? 'rate plans' : i.page}</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel" aria-labelledby="glance">
            <h2 id="glance" className="panel-title">Tamarack House now</h2>
            <dl className="glance">
              <div><dt>Rooms</dt><dd><button className="text-link" onClick={() => go('rooms')}>{state.rooms.length} in inventory</button></dd></div>
              <div><dt>Rate plans</dt><dd><button className="text-link" onClick={() => go('rates')}>{active} active{drafts ? `, ${drafts} draft` : ''}</button></dd></div>
              <div><dt>Scenarios</dt><dd><button className="text-link" onClick={() => go('scenarios')}>{state.scenarios.length}, weeks {Math.min(...weeks)}–{Math.max(...weeks)}</button></dd></div>
              <div><dt>Students</dt><dd><button className="text-link" onClick={() => go('roles')}>{state.roles.map((r) => `${r.students} ${r.short}s`).join(' · ')}</button></dd></div>
              <div><dt>Tax</dt><dd><button className="text-link" onClick={() => go('taxes')}>{pct(state.tax.lodgingPct)} + {money(state.tax.feePerNight, { cents: true })}/night</button></dd></div>
            </dl>
          </section>

          <section className="panel" aria-labelledby="since">
            <h2 id="since" className="panel-title">Since {TERM.lastName}</h2>
            <p className="muted small">Saved {TERM.lastSaved}. {plural(changes.length, 'change')} so far.</p>
            {bySection.length > 0 && (
              <ul className="since-list">
                {bySection.map(([s, n]) => (
                  <li key={s}><span>{s}</span><Chip tone="draft">{n}</Chip></li>
                ))}
              </ul>
            )}
            <Button variant="secondary" size="sm" icon="compare" onClick={() => go('review')}>See every change</Button>
          </section>
        </div>
      </div>
    </div>
  );
}
