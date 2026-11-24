import { useApp } from './App';
import { ADDENDUM_ITEMS, draftSection } from './data';
import { StatusPill, Icon } from './ui';

const TIMELINE = [
  { date: 'Oct 26', label: 'RFP issued', sub: '84 pages, 9 sections' },
  { date: 'Nov 3', label: 'Pre-proposal conference', sub: 'Kestrel Point attended' },
  { date: 'Nov 9', label: 'Addendum 1', sub: '3 pages · 3 items', doc: 'A1' },
  { date: 'Nov 13', label: 'Addendum 2', sub: '5 pages · 4 items', doc: 'A2' },
  { date: 'Nov 16', label: 'Draft v6', sub: 'Mon 5:48 PM' },
  { date: 'Nov 17', label: 'Today', sub: 'AI run 8:12 AM', now: true },
  { date: 'Nov 20', label: 'Due 2:00 PM', sub: 'eProcurement portal', due: true },
];

export function AddendaView() {
  const { state, dispatch } = useApp();
  const byId = (id: string) => state.reqs.find((r) => r.id === id)!;
  const verified = state.verifiedAddenda;
  const nVer = Object.keys(verified).length;

  const open = (id: string) => { dispatch({ type: 'select', id }); dispatch({ type: 'view', view: 'matrix' }); };

  return (
    <div className="addenda">
      <aside className="timeline">
        <div className="strip-label">Procurement timeline</div>
        <ol>
          {TIMELINE.map((t) => (
            <li key={t.label} className={`${t.now ? 'now' : ''} ${t.due ? 'due' : ''} ${t.doc ? 'doc' : ''}`}>
              <span className="tl-date">{t.date}</span>
              <span className="tl-dot" />
              <span className="tl-text"><b>{t.label}</b><span>{t.sub}</span></span>
            </li>
          ))}
        </ol>
        <div className="tl-note">
          <p><b>Rule you gave the model:</b> where an addendum changes the RFP, the addendum wins.</p>
          <p className="muted small">The model marked 2 original RFP requirements as superseded and left them out of the 137.</p>
        </div>
      </aside>
      <section className="add-main">
        <div className="add-head">
          <div>
            <h2>Did the model catch every addendum change?</h2>
            <p className="muted">7 items across both addenda. The model created 5 requirements from them and treated 2 as informational. Mark each item verified once you’ve checked it against the addendum PDF.</p>
          </div>
          <div className="add-progress">
            <div className="ap-n">{nVer}<span>/{ADDENDUM_ITEMS.length}</span></div>
            <div className="muted small">verified by you</div>
          </div>
        </div>

        {(['A1', 'A2'] as const).map((d) => (
          <div key={d} className="add-group">
            <div className="add-group-h">{d === 'A1' ? 'Addendum No. 1 · November 9, 2026 · 3 pages' : 'Addendum No. 2 · November 13, 2026 · 5 pages'}</div>
            {ADDENDUM_ITEMS.filter((i) => i.doc === d).map((it) => {
              const v = verified[it.key];
              const primary = it.reqIds[0] ? byId(it.reqIds[0]) : null;
              const isMain = it.key === 'A2-1';
              return (
                <article key={it.key} className={`add-card ${v ? 'verified' : ''} ${isMain ? 'main' : ''}`}>
                  <div className="add-card-h">
                    <span className="add-item">{it.item} · p.{it.page}</span>
                    <h3>{it.title}</h3>
                    <span className="spacer" />
                    <label className={`verify-toggle ${v ? 'on' : ''}`}>
                      <input type="checkbox" checked={!!v} onChange={(e) => dispatch({ type: 'verifyAddendum', key: it.key, on: e.target.checked })} />
                      {v ? <><Icon name="check" size={12} /> Verified {v}</> : 'Mark verified'}
                    </label>
                  </div>
                  {it.original ? (
                    <div className="diff">
                      <div className="diff-col was">
                        <div className="mq-label">Before: {it.original.ref}, p.{it.original.page}</div>
                        <p className="doc-text">{it.original.text}</p>
                      </div>
                      <div className="diff-arrow"><Icon name="arrow" /></div>
                      <div className="diff-col now">
                        <div className="mq-label">After: {d === 'A1' ? 'Addendum 1' : 'Addendum 2'}, {it.item}</div>
                        <p className="doc-text">{it.revised}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="diff single">
                      <div className="diff-col now">
                        <div className="mq-label">{d === 'A1' ? 'Addendum 1' : 'Addendum 2'}, {it.item}</div>
                        <p className="doc-text">{it.revised}</p>
                      </div>
                    </div>
                  )}
                  <div className="handling">
                    <div className="h-col">
                      <div className="mq-label">What the model did</div>
                      <p>{it.handling}</p>
                    </div>
                    <div className="h-col">
                      <div className="mq-label">Linked requirements</div>
                      {it.reqIds.length === 0 && <p className="muted small">None. Informational item.</p>}
                      {it.reqIds.map((id) => {
                        const r = byId(id);
                        return (
                          <button key={id} className="linked" onClick={() => open(id)}>
                            <span className="rid">{id}</span>
                            <span className="linked-t">{r.title}</span>
                            <StatusPill status={r.status} conflict={r.conflict} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {primary && primary.draftSec && primary.status !== 'addressed' && (
                    <div className={`impact ${primary.conflict ? 'bad' : 'warn'}`}>
                      <Icon name="alert" size={13} />
                      <span>
                        <b>Draft impact:</b> §{primary.draftSec} {draftSection(primary.draftSec)?.title}, p.{primary.draftPage} says “{primary.excerpt}”
                        {primary.assignee ? ` Assigned to ${primary.assignee[0].toUpperCase() + primary.assignee.slice(1)}.` : ' Not yet assigned.'}
                      </span>
                    </div>
                  )}
                  {primary && !primary.draftSec && primary.status === 'missing' && (
                    <div className="impact bad">
                      <Icon name="alert" size={13} />
                      <span><b>Draft impact:</b> not in draft v6 or the forms index.{primary.assignee ? ` Assigned to ${primary.assignee[0].toUpperCase() + primary.assignee.slice(1)}.` : ' Not yet assigned.'}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );
}
