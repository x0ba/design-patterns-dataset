import { useEffect, useRef } from 'react';
import { DESK_USER } from '../data/mock';
import { messagesFor, repliesTo } from '../derive';
import { useStore } from '../state/store';
import type { Msg } from '../types';
import { elapsed, h12, hm } from '../time';
import { ageTone, ROLE_LABEL, roleClass } from './ui';

export function Thread({ outageId, now }: { outageId: string; now: number }) {
  const { state, dispatch } = useStore();
  const all = messagesFor(state, outageId);
  const unresolved = (m: Msg) => Boolean(m.awaiting) && !state.resolved.includes(m.id);
  const awaitingCount = all.filter(unresolved).length;
  const list = state.threadAwaitingOnly ? all.filter(unresolved) : all;
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view when the thread changes or a message lands.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [outageId, all.length]);

  const outage = state.outages.find((o) => o.id === outageId);

  return (
    <div className="thread">
      <div className="thread-head">
        <h3>
          Thread <span className="muted">· {all.length} since 17:30</span>
        </h3>
        <div className="thread-tools">
          {awaitingCount > 0 && <span className="await-count">{awaitingCount} awaiting</span>}
          <label className="toggle">
            <input
              type="checkbox"
              checked={state.threadAwaitingOnly}
              onChange={(e) => dispatch({ type: 'threadAwaitingOnly', value: e.target.checked })}
            />
            Awaiting only
          </label>
        </div>
      </div>

      <div className="thread-list" ref={listRef}>
        {list.length === 0 && <div className="empty">Nothing waiting on a reply in this thread.</div>}
        {list.map((m) => {
          const open = unresolved(m);
          const replies = repliesTo(state, m.id);
          if (m.system) {
            return (
              <div className="sys-line" key={m.id}>
                <span className="mono">{hm(m.at)}</span> {m.body}
              </div>
            );
          }
          return (
            <article key={m.id} className={`msg ${open ? 'msg-open' : ''}`}>
              <div className="msg-head">
                <span className="mono msg-time">{hm(m.at)}</span>
                <span className={`who ${roleClass(m.role)}`}>{m.author}</span>
                {m.unit && <span className="unit">{m.unit}</span>}
                <span className="role-tag">{ROLE_LABEL[m.role]}</span>
              </div>
              <div className="msg-body">{m.body}</div>

              {open && m.awaiting && (
                <div className="await-bar">
                  <span className="owed">
                    Owed by <strong>{m.awaiting.owner}</strong>
                  </span>
                  <span className={`age age-${ageTone(Math.max(0, now - m.at))}`}>
                    waiting {elapsed(m.at, now)}
                  </span>
                  <span className="grow" />
                  {m.awaiting.kind === 'estimate' && outage?.pendingEtr?.msgId === m.id && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => dispatch({ type: 'confirmEtr', outageId, now })}
                    >
                      Confirm {h12(outage.pendingEtr.time)}
                    </button>
                  )}
                  <button
                    className="btn btn-sm"
                    onClick={() => dispatch({ type: 'composer/reply', msgId: m.id, text: m.awaiting?.suggestion ?? '' })}
                  >
                    Reply
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'handled', msgId: m.id, now })}>
                    Handled
                  </button>
                </div>
              )}

              {replies.map((r) => (
                <div className="answered" key={r.id}>
                  <span className="answered-arrow">↳</span>
                  <strong>{r.author}</strong> answered {hm(r.at)}: <span>{r.body}</span>
                </div>
              ))}
            </article>
          );
        })}
      </div>

      <Composer outageId={outageId} now={now} />
    </div>
  );
}

function Composer({ outageId, now }: { outageId: string; now: number }) {
  const { state, dispatch } = useStore();
  const target = state.composer.replyTo ? state.messages.find((m) => m.id === state.composer.replyTo) : undefined;
  const text = state.composer.text;

  const send = () => {
    if (!text.trim()) return;
    dispatch({ type: 'post', outageId, text, now });
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      {target && (
        <div className="replying">
          <span>
            Replying to <strong>{target.author}</strong> · {hm(target.at)}
          </span>
          <button type="button" className="link" onClick={() => dispatch({ type: 'composer/cancelReply' })}>
            Cancel reply
          </button>
        </div>
      )}
      <textarea
        rows={3}
        value={text}
        placeholder={`Post to this thread as ${DESK_USER}. Ctrl+Enter to send.`}
        onChange={(e) => dispatch({ type: 'composer/text', text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
        aria-label="Message"
      />
      <div className="composer-foot">
        <span className="muted small">Crews, dispatch, call center and operations see this in the room at once.</span>
        <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
          Send
        </button>
      </div>
    </form>
  );
}
