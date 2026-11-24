import { useState } from 'react';
import type { Comment } from '../types';
import { PEOPLE } from '../data/people';
import { when, nowV } from '../lib/time';
import { useApp } from '../store';
import { Avatar, Icon } from './ui';

export function ReplyBox({ quick = [], onSend, onResolveOnly, rows = 3, autoFocus = false, placeholder }: {
  quick?: string[];
  onSend: (text: string, resolve: boolean) => void;
  onResolveOnly?: () => void;
  rows?: number;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const empty = !text.trim();
  const send = (resolve: boolean) => {
    if (empty) return;
    onSend(text.trim(), resolve);
    setText('');
  };
  return (
    <div className="replybox">
      {quick.length > 0 && (
        <div className="quick" role="group" aria-label="Quick replies">
          {quick.map((q) => (
            <button key={q} type="button" className="chip-btn" onClick={() => setText((t) => (t ? `${t} ${q}` : q))}>{q}</button>
          ))}
        </div>
      )}
      <textarea
        rows={rows}
        value={text}
        autoFocus={autoFocus}
        placeholder={placeholder ?? 'Reply to Sam… (Sam can read and comment, not edit)'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(true); }
        }}
        aria-label="Write a reply"
      />
      <div className="replybox-actions">
        <span className="hint">{'⌘'}+Enter replies and resolves</span>
        <span className="spacer" />
        {onResolveOnly && empty && <button type="button" className="btn ghost" onClick={onResolveOnly}><Icon name="check" size={15} /> Resolve</button>}
        <button type="button" className="btn" disabled={empty} onClick={() => send(false)}>Reply</button>
        <button type="button" className="btn primary" disabled={empty} onClick={() => send(true)}><Icon name="check" size={15} /> Reply &amp; resolve</button>
      </div>
    </div>
  );
}

export function Bubble({ by, at, text, who }: { by: Comment['author']; at: Date; text: string; who?: string }) {
  return (
    <div className="bubble">
      <Avatar id={by} size={28} />
      <div className="bubble-body">
        <div className="bubble-head">
          <strong>{who ?? PEOPLE[by].name}</strong>
          <span className="muted">{when(at, nowV())}</span>
        </div>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function Thread({ comment, compact = false, onAfter }: { comment: Comment; compact?: boolean; onAfter?: () => void }) {
  const { dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const resolved = comment.status === 'resolved';
  return (
    <div className={`thread ${resolved ? 'is-resolved' : ''}`}>
      <Bubble by={comment.author} at={comment.at} text={comment.text} />
      {comment.replies.map((r, i) => <Bubble key={i} by={r.by} at={r.at} text={r.text} />)}
      {resolved ? (
        <div className="thread-foot">
          <span className="status ok"><Icon name="check" size={14} /> Resolved</span>
          <button className="link" onClick={() => dispatch({ type: 'setResolved', commentId: comment.id, resolved: false })}>Reopen</button>
        </div>
      ) : open || !compact ? (
        <ReplyBox
          rows={compact ? 2 : 3}
          autoFocus={compact}
          onSend={(text, resolve) => { dispatch({ type: 'reply', commentId: comment.id, text, resolve }); setOpen(false); onAfter?.(); }}
          onResolveOnly={() => { dispatch({ type: 'setResolved', commentId: comment.id, resolved: true }); onAfter?.(); }}
        />
      ) : (
        <div className="thread-foot">
          <button className="btn small" onClick={() => setOpen(true)}>Reply</button>
          <button className="btn small ghost" onClick={() => dispatch({ type: 'setResolved', commentId: comment.id, resolved: true })}><Icon name="check" size={14} /> Resolve</button>
        </div>
      )}
    </div>
  );
}
