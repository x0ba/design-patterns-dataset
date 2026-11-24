import { PEOPLE, PROJECT } from '../data.js';
import { fmtStamp } from '../lib.js';

const TONE_CLASS = { ok: 'ok', wait: 'wait', alert: 'alert', neutral: 'neutral', muted: 'muted' };

// Center view for graphics other than G3: status and approval state only.
export function GraphicSummary({ graphic }) {
  return (
    <div className="workspace">
      <header className="g-head">
        <div className="g-title">
          <span className="g-num">G{graphic.n}</span>
          <h1>{graphic.title}</h1>
        </div>
        <div className="g-sub">{PROJECT.title} · {PROJECT.client}</div>
      </header>
      <div className="summary-body">
        <div className={`status-pill big ${TONE_CLASS[graphic.tone]}`}>{graphic.status}</div>
        <p className="summary-detail">{graphic.detail}</p>
        {graphic.requested && (
          <dl className="facts">
            <dt>Approver</dt>
            <dd>{PEOPLE.renee.name}, Communications</dd>
            <dt>Sent for approval</dt>
            <dd>{graphic.requested}</dd>
            <dt>Waiting</dt>
            <dd>{graphic.waitingDays} days</dd>
          </dl>
        )}
      </div>
    </div>
  );
}

// Center view for another studio project: its unread client messages, read or dismissed one at a time.
export function ProjectInbox({ project, items, onRead, onReadAll }) {
  return (
    <div className="workspace">
      <header className="g-head">
        <div className="g-title">
          <h1>{project.title}</h1>
        </div>
        <div className="g-sub">{project.client} · {project.stage} · due {project.due}</div>
      </header>
      <div className="inbox-head">
        <span>
          <strong>{items.length}</strong> unread client {items.length === 1 ? 'message' : 'messages'}
        </span>
        {items.length > 0 && (
          <button className="btn" onClick={onReadAll}>Mark all read</button>
        )}
      </div>
      <div className="inbox-list">
        {items.length === 0 && <div className="empty">Nothing unread on this project.</div>}
        {items.map((m) => {
          const p = PEOPLE[m.from];
          return (
            <article className="inbox-item" key={m.id}>
              <div className={`avatar ${p.side}`}>{p.initials}</div>
              <div className="inbox-main">
                <div className="msg-head">
                  <span className="who">{p.name}</span>
                  <span className="side-tag client">Client</span>
                  <span className="when">{fmtStamp(m.at)}</span>
                </div>
                <p className="msg-text">{m.text}</p>
                <div className="inbox-foot">
                  <span className="muted small">{p.role}</span>
                  <button className="link-btn" onClick={() => onRead(m.id)}>Mark read</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
