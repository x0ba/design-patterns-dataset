import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import { PEOPLE, THREADS } from '../data.js';
import { fmtStamp, leakTerms } from '../lib.js';

const PLACEHOLDERS = {
  client: 'Reply to Renée and Sam. Click a month on the chart to pin it to your message.',
  data: 'Reply in the data thread. Sam and Dara will see this.',
  studio: 'Brief Kofi or the studio. Clients can’t see this thread.',
};

const SEND_LABELS = {
  client: 'Send to client review',
  data: 'Send to data thread',
  studio: 'Post to studio',
};

export default function Thread({
  threadId,
  messages,
  firstUnreadId,
  focus,
  flash,
  composer,
  version,
  onComposer,
  onSend,
  onPinChip,
  onFile,
  onRemoveFile,
  onRemovePin,
}) {
  const listRef = useRef(null);
  const textRef = useRef(null);

  // Grow the composer with its text, up to a cap, so a long draft stays readable.
  useLayoutEffect(() => {
    const ta = textRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight + 2, 230)}px`;
  }, [composer.text, threadId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = focus ? list.querySelector(`#m-${focus.msgId}`) : null;
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else list.scrollTop = list.scrollHeight;
  }, [threadId, focus, messages.length]);

  const isStudio = threadId === 'studio';
  const leaks = isStudio ? [] : leakTerms(composer.text);
  const canSend = composer.text.trim().length > 0 && leaks.length === 0;

  return (
    <div className="thread">
      <div className="messages" ref={listRef}>
        {messages.length === 0 && <div className="empty">No messages in this view. Switch the version filter to see all.</div>}
        {messages.map((m) => {
          const flashing = focus && focus.msgId === m.id;
          // Changing the key replays the flash animation when the same message is pinned again.
          return (
            <Fragment key={`${m.id}-${flashing ? focus.n : 0}`}>
              {m.id === firstUnreadId && (
                <div className="divider">
                  <span>New since you last opened this thread</span>
                </div>
              )}
              <Row m={m} flashing={flashing} onPinChip={onPinChip} onFile={onFile} />
            </Fragment>
          );
        })}
      </div>

      <div className={`composer ${isStudio ? 'studio' : ''}`}>
        {(composer.pin || composer.files.length > 0) && (
          <div className="staged">
            {composer.pin && (
              <span className="pin-chip staged-chip">
                Pinned · {composer.pin.label}
                <button aria-label="Remove pin" onClick={onRemovePin}>×</button>
              </span>
            )}
            {composer.files.map((f) => (
              <span className="file-chip staged-chip" key={f.name}>
                {f.name}
                <button aria-label={`Remove ${f.name}`} onClick={() => onRemoveFile(f)}>×</button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textRef}
          value={composer.text}
          placeholder={PLACEHOLDERS[threadId]}
          rows={2}
          onChange={(e) => onComposer({ text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSend) onSend();
          }}
          aria-label={`Message to ${THREADS[threadId].label}`}
        />

        {leaks.length > 0 && (
          <div className="leak-warning" role="alert">
            <strong>Studio-only terms in a client thread:</strong> remove “{leaks.join('”, “')}” before sending. This message can’t go out until they’re gone.
          </div>
        )}

        <div className="composer-bottom">
          <span className="hint">
            Replying on <b>{version}</b> · visible to {THREADS[threadId].audience} · <kbd>⌘</kbd>
            <kbd>Enter</kbd>
          </span>
          <button className="btn primary" disabled={!canSend} onClick={onSend}>
            {SEND_LABELS[threadId]}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ m, flashing, onPinChip, onFile }) {
  const p = PEOPLE[m.from];
  const isMine = m.from === 'ines';
  return (
    <article id={`m-${m.id}`} className={`msg ${flashing ? 'flash' : ''} ${m.sent ? 'sent' : ''}`}>
      <div className={`avatar ${p.side}`}>{p.initials}</div>
      <div className="msg-main">
        <div className="msg-head">
          <span className="who">{p.name}{isMine ? ' (you)' : ''}</span>
          <span className={`side-tag ${p.side}`}>{p.side === 'client' ? 'Client' : 'Studio'}</span>
          <span className="when">{fmtStamp(m.at)}</span>
          <span className="ver-chip">{m.version}</span>
          {m.unread && <span className="new-dot" aria-label="Unread" />}
        </div>
        {m.pin && (
          <button className="pin-chip" onClick={() => onPinChip(m.pin)}>
            Pinned · {m.pin.label}
          </button>
        )}
        <p className="msg-text">{m.text}</p>
        {m.files && m.files.length > 0 && (
          <div className="files-row">
            {m.files.map((f) => (
              <button className="file-chip" key={f.name} onClick={() => onFile(f)}>
                ↓ {f.name} <span className="muted">{f.size}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
