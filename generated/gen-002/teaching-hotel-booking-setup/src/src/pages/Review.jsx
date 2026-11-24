import { useMemo, useState } from 'react';
import { useStore, contentOf } from '../store.jsx';
import { Button, Chip, Icon, Modal, PageHead } from '../ui.jsx';
import { diffAgainstLastTerm, SECTION_ORDER } from '../diff.js';
import { buildChecklist, checklistProgress, buildIssues } from '../checklist.js';
import { LAST_TERM, TERM } from '../data.js';
import { money, pct, plural } from '../lib.js';

const KIND = { added: ['good', 'New'], removed: ['danger', 'Removed'], changed: ['draft', 'Changed'] };

function summarize(c) {
  const weeks = c.scenarios.map((s) => s.week);
  return {
    Rooms: plural(c.rooms.length, 'room'),
    'Rate plans': `${c.rates.filter((r) => r.status === 'active').length} active${c.rates.some((r) => r.status === 'draft') ? `, ${c.rates.filter((r) => r.status === 'draft').length} draft` : ''}${c.rates.some((r) => r.status === 'retired') ? `, ${c.rates.filter((r) => r.status === 'retired').length} retired` : ''}`,
    'Practice scenarios': `${c.scenarios.length}, weeks ${Math.min(...weeks)}–${Math.max(...weeks)}`,
    'Student roles': c.roles.map((r) => `${r.students} ${r.short}s`).join(', '),
    'Taxes & fees': `${pct(c.tax.lodgingPct)} + ${money(c.tax.feePerNight, { cents: true })}/night`,
  };
}

export default function Review({ go }) {
  const { state, dispatch, notify } = useStore();
  const [confirming, setConfirming] = useState(false);
  const cur = contentOf(state);
  const changes = useMemo(() => diffAgainstLastTerm(cur), [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const issues = useMemo(() => buildIssues(state), [state]);
  const groups = useMemo(() => buildChecklist(state), [state]);
  const { done, total } = checklistProgress(groups);
  const open = groups.flatMap((g) => g.tasks).filter((t) => !t.done);
  const blockers = issues.filter((i) => i.tone === 'danger');
  const warnings = issues.filter((i) => i.tone !== 'danger');
  const published = state.published && JSON.stringify(state.published.content) === JSON.stringify(cur);

  const before = summarize(LAST_TERM);
  const after = summarize(cur);

  const publish = () => {
    dispatch({ type: 'publish', at: '2026-11-17' });
    setConfirming(false);
    notify('Published. Students get these settings when the term starts.');
  };

  return (
    <div className="page">
      <PageHead
        title="Compare & publish"
        lead={`Your ${TERM.name} draft next to ${TERM.lastName}, saved ${TERM.lastSaved}. Check the differences, then publish.`}
      />

      <div className="review-layout">
        <div>
          <div className="table-wrap">
            <table className="grid summary-grid">
              <thead>
                <tr><th>Section</th><th>{TERM.lastName}</th><th>{TERM.name} draft</th><th className="num">Changes</th></tr>
              </thead>
              <tbody>
                {SECTION_ORDER.map((s) => {
                  const n = changes.filter((c) => c.section === s).length;
                  return (
                    <tr key={s}>
                      <th scope="row">{s}</th>
                      <td>{before[s]}</td>
                      <td>{after[s]}</td>
                      <td className="num">{n ? <Chip tone="draft">{n}</Chip> : <span className="muted">None</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {changes.length === 0 && <p className="empty">No differences from {TERM.lastName} yet.</p>}

          {SECTION_ORDER.map((s) => {
            const list = changes.filter((c) => c.section === s);
            if (!list.length) return null;
            return (
              <section key={s} className="diff-section" aria-labelledby={`d-${s}`}>
                <h2 id={`d-${s}`} className="section-title">{s} <span className="count">{list.length}</span></h2>
                <ul className="diff-list">
                  {list.map((c, i) => {
                    const [tone, label] = KIND[c.kind];
                    return (
                      <li key={`${c.title}-${i}`}>
                        <div className="diff-head">
                          <Chip tone={tone}>{label}</Chip>
                          <strong>{c.title}</strong>
                          {c.note && <span className="muted small">{c.note}</span>}
                          {c.summary && <span className="muted">{c.summary}</span>}
                        </div>
                        {c.changes && (
                          <dl className="diff-rows">
                            {c.changes.map((ch) => (
                              <div key={ch.field}>
                                <dt>{ch.field}</dt>
                                <dd>
                                  {ch.added || ch.removed ? (
                                    <>
                                      {ch.added.map((f) => <span key={f} className="tag tag-add">+ {f}</span>)}
                                      {ch.removed.map((f) => <span key={f} className="tag tag-del">− {f}</span>)}
                                    </>
                                  ) : (
                                    <><span className="was-val">{ch.before}</span><Icon name="arrow" size={14} /><span className="now-val">{ch.after}</span></>
                                  )}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className="panel publish-panel" aria-labelledby="pb">
          <h2 id="pb" className="panel-title">Ready to publish?</h2>

          {published && (
            <div className="pub-state is-good"><Icon name="check" /> Published {state.published.at === '2026-11-17' ? 'Nov 17, 2026' : state.published.at}. No edits since.</div>
          )}

          <ul className="pub-checks">
            <li className={blockers.length ? 'is-bad' : 'is-ok'}>
              <Icon name={blockers.length ? 'alert' : 'check'} size={16} />
              <span>{blockers.length ? plural(blockers.length, 'problem') + ' to fix first' : 'No blocking problems'}</span>
            </li>
            <li className={open.length ? 'is-warn' : 'is-ok'}>
              <Icon name={open.length ? 'alert' : 'check'} size={16} />
              <span>{open.length ? `${open.length} of ${total} checklist tasks still open` : 'Checklist complete'}</span>
            </li>
          </ul>

          {blockers.map((i) => (
            <div key={i.id} className="issue issue-danger">
              <Icon name="alert" size={17} />
              <div>
                <strong>{i.title}</strong>
                <p>{i.text}</p>
                <button type="button" className="text-link" onClick={() => go(i.page, i.goState)}>Fix it</button>
              </div>
            </div>
          ))}
          {open.length > 0 && (
            <details className="open-tasks">
              <summary>Open checklist tasks</summary>
              <ul>
                {open.map((t) => (
                  <li key={t.id}><button type="button" className="text-link" onClick={() => go(t.go, t.goState)}>{t.label}</button></li>
                ))}
              </ul>
            </details>
          )}
          {warnings.map((i) => (
            <div key={i.id} className="issue issue-warn">
              <Icon name="alert" size={17} />
              <div>
                <strong>{i.title}</strong>
                <p>{i.text}</p>
                <button type="button" className="text-link" onClick={() => go(i.page, i.goState)}>Take a look</button>
              </div>
            </div>
          ))}

          <Button variant="primary" icon="rocket" disabled={blockers.length > 0 || published} onClick={() => setConfirming(true)} className="btn-block">
            {published ? 'Published' : open.length ? 'Publish anyway' : 'Publish for students'}
          </Button>
          <p className="muted small">You can keep editing after you publish. Changes are marked as unpublished until you publish again.</p>
        </aside>
      </div>

      {confirming && (
        <Modal
          title={`Publish ${TERM.name} setup?`}
          subtitle={`${plural(changes.length, 'change')} since ${TERM.lastName}.`}
          onClose={() => setConfirming(false)}
          width={520}
          footer={
            <>
              <span className="spacer" />
              <Button variant="ghost" onClick={() => setConfirming(false)}>Not yet</Button>
              <Button variant="primary" icon="rocket" onClick={publish}>Publish</Button>
            </>
          }
        >
          <p>All {TERM.students} students will work with these rooms, rates, scenario weeks and permissions from week 1.</p>
          {open.length > 0 && <p className="field-warn"><Icon name="alert" size={14} /> {plural(open.length, 'checklist task')} still open.</p>}
        </Modal>
      )}
    </div>
  );
}
