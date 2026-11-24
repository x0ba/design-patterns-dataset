import { useEffect, useRef, useState } from 'react';
import { entityById, lineById, person, type Thread } from '../data';
import { useApp } from '../ctx';
import { fmtWhen } from '../model';
import { Avatar } from './Avatar';

function anchorLabel(t: Thread) {
  if (t.anchor.kind === 'balance') return `Ending balance · wk ${t.anchor.week + 1}`;
  const l = lineById[t.anchor.lineId];
  return `${l.name} · ${entityById[l.entity].short} · wk ${t.anchor.week + 1}`;
}

export function ThreadsPanel() {
  const { s, dispatch, now } = useApp();
  const [showResolved, setShowResolved] = useState(false);
  const open = s.threads.find((t) => t.id === s.openThreadId);
  if (open)
    return (
      <div className="threads">
        <button className="back link" onClick={() => dispatch({ type: 'openThread', id: null })}>← All threads</button>
        <ThreadView thread={open} />
      </div>
    );
  const list = s.threads.filter((t) => showResolved || t.status === 'open');
  const order = (t: Thread) => (t.status === 'resolved' ? 3 : t.blocking ? 0 : t.messages.at(-1)?.by !== 'helen' ? 1 : 2);
  list.sort((a, b) => order(a) - order(b));
  const resolvedN = s.threads.filter((t) => t.status === 'resolved').length;
  return (
    <div className="threads">
      <div className="list-head">
        <span>{s.threads.filter((t) => t.status === 'open').length} open</span>
        {resolvedN > 0 && (
          <label className="small muted"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show {resolvedN} resolved</label>
        )}
      </div>
      {list.map((t) => {
        const last = t.messages.at(-1);
        const waitingOnMe = last && last.by !== 'helen' && t.status === 'open';
        return (
          <button key={t.id} className={'th-item' + (t.status === 'resolved' ? ' resolved' : '')} onClick={() => {
            dispatch({ type: 'openThread', id: t.id });
            dispatch({ type: 'select', sel: t.anchor.kind === 'balance' ? { kind: 'balance', week: t.anchor.week } : { kind: 'cell', lineId: t.anchor.lineId, week: t.anchor.week }, tab: 'threads' });
          }}>
            <div className="th-top">
              {last ? <Avatar id={last.by} size={18} /> : <Avatar id="helen" size={18} />}
              <b className="th-title">{t.title}</b>
              {t.blocking && t.status === 'open' && <span className="badge-block">Blocks lock</span>}
              {t.status === 'resolved' && <span className="badge-ok">Resolved</span>}
            </div>
            <div className="th-anchor muted small">{anchorLabel(t)}</div>
            {last ? (
              <div className="th-last">
                <span className="muted">{last.by === 'helen' ? 'You' : person[last.by].first}:</span> {last.text}
              </div>
            ) : (
              <div className="th-last muted">Draft, not sent yet</div>
            )}
            <div className="th-meta small">
              {last && <span className="muted">{fmtWhen(last.at, now())}</span>}
              {waitingOnMe && <span className="dot-me">Waiting on you</span>}
              {s.typing?.threadId === t.id && <span className="typing-sm">{person[s.typing.by].first} is typing…</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ThreadView({ thread, inline }: { thread: Thread; inline?: boolean }) {
  const { s, dispatch, post, now } = useApp();
  const draft = s.drafts[thread.id] ?? '';
  const end = useRef<HTMLDivElement>(null);
  const typing = s.typing?.threadId === thread.id ? s.typing.by : null;
  useEffect(() => {
    if (!inline) end.current?.scrollIntoView({ block: 'nearest' });
  }, [thread.messages.length, typing, inline]);
  const resolved = thread.status === 'resolved';
  const participants = [...new Set(thread.messages.map((m) => m.by))];
  return (
    <div className={'thread' + (inline ? ' inline' : '') + (resolved ? ' resolved' : '')}>
      {!inline && (
        <div className="thread-head">
          <div className="th-top">
            <b>{thread.title}</b>
            {thread.blocking && !resolved && <span className="badge-block">Blocks lock</span>}
          </div>
          <button
            className="link small"
            onClick={() =>
              dispatch({ type: 'select', sel: thread.anchor.kind === 'balance' ? { kind: 'balance', week: thread.anchor.week } : { kind: 'cell', lineId: thread.anchor.lineId, week: thread.anchor.week }, tab: 'threads' })
            }
          >
            {anchorLabel(thread)}
          </button>
        </div>
      )}
      {inline && (
        <div className="th-top inline-title">
          <b>{thread.title}</b>
          {thread.blocking && !resolved && <span className="badge-block">Blocks lock</span>}
          {resolved && <span className="badge-ok">Resolved</span>}
        </div>
      )}
      <div className="msgs">
        {thread.messages.map((m) => (
          <div key={m.id} className={'msg' + (m.by === 'helen' ? ' mine' : '')}>
            <Avatar id={m.by} size={22} />
            <div className="msg-body">
              <div className="msg-top">
                <b>{m.by === 'helen' ? 'You' : person[m.by].name}</b>
                <span className="muted small">{fmtWhen(m.at, now())}</span>
              </div>
              <div className="msg-text">{m.text}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="msg typing">
            <Avatar id={typing} size={22} />
            <div className="dots"><i /><i /><i /></div>
          </div>
        )}
        <div ref={end} />
      </div>
      {!resolved && thread.quickReplies && thread.quickReplies.length > 0 && (
        <div className="quick">
          {thread.quickReplies.map((q) => (
            <button key={q.action} className="chip-btn" onClick={() => post(thread, q.label, q.action)}>{q.label}</button>
          ))}
        </div>
      )}
      {!resolved && (
        <div className="composer">
          <textarea
            rows={draft.length > 120 ? 5 : 2}
            value={draft}
            placeholder={participants.filter((p) => p !== 'helen').length ? `Reply to ${participants.filter((p) => p !== 'helen').map((p) => person[p].first).join(', ')}…` : 'Write a message…'}
            onChange={(e) => dispatch({ type: 'draft', threadId: thread.id, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post(thread, draft);
            }}
          />
          <div className="row-end">
            <span className="muted small">⌘↵ to send</span>
            <button className="btn btn-sm" onClick={() => dispatch({ type: 'resolve', threadId: thread.id, resolved: true })}>Resolve</button>
            <button className="btn btn-sm btn-primary" disabled={!draft.trim()} onClick={() => post(thread, draft)}>Send</button>
          </div>
        </div>
      )}
      {resolved && (
        <div className="row-end">
          <span className="muted small">Resolved</span>
          <button className="btn btn-sm" onClick={() => dispatch({ type: 'resolve', threadId: thread.id, resolved: false })}>Reopen</button>
        </div>
      )}
    </div>
  );
}
