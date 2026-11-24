import { useState } from 'react';
import { overallNote, rubric, TEACHER, type TeacherComment } from '../data';
import { fmt } from '../model';

export interface LiveComment {
  c: TeacherComment;
  pos: number;
  status: 'ok' | 'cut' | 'gone';
  done: boolean;
  replies: { text: string; when: string }[];
  hint: { ok: boolean; text: string };
}

export interface Check {
  label: string;
  ok: boolean;
  detail?: string;
}

interface Props {
  tab: 'feedback' | 'rubric';
  setTab: (t: 'feedback' | 'rubric') => void;
  comments: LiveComment[];
  activeId: string | null;
  checks: Record<string, Check[]>;
  tenseCounts: { pr: number; im: number };
  onGo: (id: string) => void;
  onToggleDone: (id: string) => void;
  onReply: (id: string, text: string) => void;
  onAction: (c: TeacherComment) => void;
  onShowTenses: () => void;
}

const ACTION_LABEL: Record<NonNullable<TeacherComment['action']>, string> = {
  rerecord: 'Re-record this line',
  'trim-rosa': 'Open the interview',
  closing: 'Record a closing line',
};

export function SidePanel(p: Props) {
  const open = p.comments.filter((c) => !c.done).length;
  return (
    <aside className="side">
      <div className="tabs">
        <button className={p.tab === 'feedback' ? 'on' : ''} onClick={() => p.setTab('feedback')}>
          Feedback {open > 0 && <span className="badge">{open}</span>}
        </button>
        <button className={p.tab === 'rubric' ? 'on' : ''} onClick={() => p.setTab('rubric')}>
          Rubric
        </button>
      </div>
      {p.tab === 'feedback' ? <Feedback {...p} /> : <Rubric {...p} />}
    </aside>
  );
}

function Avatar() {
  return <span className="avatar teacher">MD</span>;
}

function Feedback(p: Props) {
  return (
    <div className="side-body">
      <div className="note-card">
        <div className="note-head">
          <Avatar />
          <div>
            <b>{TEACHER.name}</b>
            <span className="muted"> · draft feedback · {overallNote.date}</span>
          </div>
        </div>
        <p lang="es">{overallNote.text}</p>
      </div>
      <div className="side-section-title">
        Pinned to your draft <span className="muted">· {p.comments.filter((c) => c.done).length} of {p.comments.length} done</span>
      </div>
      {p.comments.map((lc) => (
        <CommentCard key={lc.c.id} lc={lc} active={p.activeId === lc.c.id} {...p} />
      ))}
    </div>
  );
}

function CommentCard({ lc, active, onGo, onToggleDone, onReply, onAction }: { lc: LiveComment; active: boolean } & Props) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const { c } = lc;
  return (
    <div className={`comment ${active ? 'active' : ''} ${lc.done ? 'done' : ''}`} id={`comment-${c.id}`}>
      <div className="comment-top">
        <span className="pin-num">{lc.done ? '✓' : c.n}</span>
        <button
          className="time-chip mono"
          onClick={() => onGo(c.id)}
          disabled={lc.status === 'gone'}
          title={Math.abs(lc.pos - c.draftPos) > 1 ? `Jump to this moment (was at ${fmt(c.draftPos)} in the draft)` : 'Jump to this moment'}
        >
          {lc.status === 'gone' ? 'removed' : 'end' in c.anchor ? `end · ${fmt(lc.pos)}` : `at ${fmt(lc.pos)}`}
        </button>
        <span className="cat">{c.category}</span>
        <label className="done-box" title="Mark as done">
          <input type="checkbox" checked={lc.done} onChange={() => onToggleDone(c.id)} />
          Done
        </label>
      </div>
      <p lang="es">{c.text}</p>
      <div className={`hint ${lc.hint.ok ? 'ok' : ''}`}>
        <span className="hint-dot" />
        {lc.hint.text}
      </div>
      {lc.replies.map((r, i) => (
        <div key={i} className="reply">
          <span className="avatar me">SR</span>
          <div>
            <p>{r.text}</p>
            <span className="muted small">You · {r.when}</span>
          </div>
        </div>
      ))}
      {replying ? (
        <form
          className="reply-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onReply(c.id, text.trim());
            setText('');
            setReplying(false);
          }}
        >
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${TEACHER.name}…`} rows={2} />
          <div className="row-end">
            <button type="button" className="btn ghost small" onClick={() => setReplying(false)}>Cancel</button>
            <button type="submit" className="btn primary small" disabled={!text.trim()}>Send</button>
          </div>
        </form>
      ) : (
        <div className="comment-actions">
          {c.action && !lc.done && (
            <button className="btn small primary-ghost" onClick={() => onAction(c)}>
              {c.action === 'rerecord' || c.action === 'closing' ? <span className="rec-dot" /> : null}
              {ACTION_LABEL[c.action]}
            </button>
          )}
          <button className="btn small ghost" onClick={() => setReplying(true)}>Reply</button>
        </div>
      )}
    </div>
  );
}

function Rubric(p: Props) {
  const total = rubric.reduce((a, r) => a + r.draft, 0);
  return (
    <div className="side-body">
      <div className="rubric-sum">
        <div>
          <div className="muted small">Draft check-in · not graded</div>
          <div className="rubric-total">
            <b>{total}</b>/100
          </div>
        </div>
        <p className="muted small">Scored by {TEACHER.name} on your 5:52 draft. The final version is graded on the same four criteria, 25 points each.</p>
      </div>
      {rubric.map((r) => (
        <div key={r.id} className="crit">
          <div className="crit-head">
            <div>
              <b>{r.name}</b> <span className="muted" lang="es">· {r.es}</span>
            </div>
            <span className="crit-score mono">{r.draft}/25</span>
          </div>
          <div className="crit-bar">
            <span style={{ width: `${(r.draft / 25) * 100}%` }} />
          </div>
          <p className="crit-full"><span className="muted">Full marks:</span> {r.full}</p>
          <p className="crit-remark" lang="es">
            <span className="avatar teacher xs">MD</span> {r.remark}
          </p>
          <ul className="checks">
            {(p.checks[r.id] ?? []).map((ch, i) => (
              <li key={i} className={ch.ok ? 'ok' : ''}>
                <span className="ck">{ch.ok ? '✓' : ''}</span>
                <span>
                  {ch.label}
                  {ch.detail && <em> · {ch.detail}</em>}
                </span>
              </li>
            ))}
          </ul>
          {r.id === 'past' && (
            <button className="btn small ghost" onClick={p.onShowTenses}>
              Highlight past tenses in the transcript
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
