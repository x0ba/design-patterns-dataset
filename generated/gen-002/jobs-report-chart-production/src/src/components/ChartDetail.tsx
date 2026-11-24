import { useEffect, useState, type FormEvent } from 'react';
import { ME_ID, personById, personName } from '../data/seed';
import { canAct, type Action as PermAction } from '../lib/permissions';
import { fmtClock, fmtDayTime, fmtRelative } from '../lib/format';
import { openCountFor, hasRecheck, simNow } from '../lib/selectors';
import { useStore, type Op, type TextField } from '../lib/store';
import type { Chart, Comment } from '../lib/types';
import { ChartPreview } from './ChartPreview';
import { Avatar, Card, Chip, PersonName, StatusPill } from './ui';

interface Props {
  chart: Chart;
  focusThreadId: string | null;
  onFinalize: () => void;
}

const me = () => personById(ME_ID)!;

const PEOPLE_TO = [
  { id: 'ana', name: 'Ana Delacroix' },
  { id: 'marcus', name: 'Marcus Oyelaran' },
  { id: 'hana', name: 'Hana Kobayashi' },
  { id: 'devon', name: 'Devon Whitfield' },
  { id: 'renee', name: 'Renee Castellanos' },
  { id: 'grace', name: 'Grace Lindqvist' },
];


export function ChartDetail({ chart, focusThreadId, onFinalize }: Props) {
  return (
    <main className="pane detail-pane" aria-label={`Chart ${chart.id}`}>
      <DetailHeader chart={chart} />
      {chart.hold && <HoldBanner chart={chart} />}
      {hasRecheck(chart) && <RecheckBanner chart={chart} />}

      <Card
        title="Preview"
        aside={<span className="muted">{chart.geographyDetail} · {chart.source}</span>}
        className="preview-card"
      >
        <ChartPreview chart={chart} />
        <p className="caption">{chart.caption}</p>
      </Card>

      <div className="two-up">
        <TextBlock chart={chart} />
        <ActionBar chart={chart} onFinalize={onFinalize} />
      </div>

      <Tabs chart={chart} focusThreadId={focusThreadId} />
    </main>
  );
}

function DetailHeader({ chart }: { chart: Chart }) {
  const owner = personById(chart.ownerId);
  return (
    <header className="detail-head">
      <div className="detail-kicker">
        <span className="cid big">{chart.id}</span>
        <StatusPill status={chart.status} />
        <Chip>v{chart.version}</Chip>
        <Chip>{chart.source}</Chip>
        <Chip>{chart.geography}</Chip>
      </div>
      <h1 className="headline">{chart.headline}</h1>
      <p className="subtitle">{chart.subtitle}</p>
      <div className="detail-meta">
        <span>
          Owner <b>{owner?.name ?? 'Unassigned'}</b>
        </span>
        <span>
          Last edit <b>{personName(chart.lastEditorId)}</b>, {fmtDayTime(chart.lastEditAt)}
        </span>
        {chart.approvedAt && chart.approvedBy && (
          <span>
            Approved by <b>{personName(chart.approvedBy)}</b>, {fmtDayTime(chart.approvedAt)}
          </span>
        )}
        {chart.finalAt && <span>Final since {fmtDayTime(chart.finalAt)}</span>}
      </div>
    </header>
  );
}

function HoldBanner({ chart }: { chart: Chart }) {
  const hold = chart.hold!;
  return (
    <section className="banner banner-danger" role="status">
      <div>
        <strong>Disclosure hold</strong> since {fmtDayTime(hold.at)}, placed by <b>{personName(hold.by)}</b>.
        <div className="banner-body">{hold.reason}</div>
        <div className="banner-body small">
          Only the disclosure reviewer can lift a hold. The owner works on the fix while the reviewer checks it.
        </div>
      </div>
    </section>
  );
}

function RecheckBanner({ chart }: { chart: Chart }) {
  return (
    <section className="banner banner-warn" role="status">
      <div>
        <strong>Re-check before final.</strong> Revised September data arrived at 8:41 a.m. and changed values on this chart after it was approved
        {chart.approvedAt ? ` (${fmtDayTime(chart.approvedAt)})` : ''}. Confirm the numbers still match the revised file.
      </div>
    </section>
  );
}

function TextBlock({ chart }: { chart: Chart }) {
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ headline: chart.headline, subtitle: chart.subtitle, note: chart.note, caption: chart.caption });
  const verdict = canAct(me(), 'editText', chart);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const fields: Partial<Record<TextField, string>> = {};
    (Object.keys(draft) as TextField[]).forEach((k) => {
      const next = draft[k].trim();
      if (next !== chart[k]) fields[k] = next;
    });
    if (Object.keys(fields).length) dispatch({ type: 'editText', id: chart.id, fields, now: simNow() });
    setEditing(false);
  };

  const rows: { key: TextField; label: string; multi?: boolean }[] = [
    { key: 'headline', label: 'Headline' },
    { key: 'subtitle', label: 'Subtitle', multi: true },
    { key: 'note', label: 'Release note', multi: true },
    { key: 'caption', label: 'Caption and source', multi: true },
  ];

  return (
    <Card
      title="Text"
      aside={
        editing ? null : (
          <button
            type="button"
            className="btn small"
            disabled={!verdict.ok}
            title={verdict.ok ? 'Edit headline, subtitle, release note and caption' : verdict.reason}
            onClick={() => {
              setDraft({ headline: chart.headline, subtitle: chart.subtitle, note: chart.note, caption: chart.caption });
              setEditing(true);
            }}
          >
            Edit text
          </button>
        )
      }
    >
      {!editing ? (
        <dl className="text-view">
          {rows.map((r) => (
            <div key={r.key}>
              <dt>{r.label}</dt>
              <dd>{chart[r.key]}</dd>
            </div>
          ))}
          {!verdict.ok && <p className="muted small">{verdict.reason}</p>}
        </dl>
      ) : (
        <form className="text-edit" onSubmit={save}>
          {rows.map((r) => (
            <label key={r.key}>
              <span>
                {r.label}
                <span className="muted small"> · {draft[r.key].length} characters</span>
              </span>
              {r.multi ? (
                <textarea rows={r.key === 'note' ? 3 : 2} value={draft[r.key]} onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })} />
              ) : (
                <input type="text" value={draft[r.key]} onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })} />
              )}
            </label>
          ))}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Save as v{chart.version + 1}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function ActionBar({ chart, onFinalize }: { chart: Chart; onFinalize: () => void }) {
  const { state, dispatch } = useStore();
  const [confirmReopen, setConfirmReopen] = useState(false);
  const actor = me();
  const openHere = openCountFor(state.comments, chart.id);
  const ctx = { openComments: openHere };

  const opButtons: { op: Op; label: string; tone?: 'primary' | 'danger' }[] = [];
  if (chart.status === 'drafting') opButtons.push({ op: 'submitForReview', label: 'Submit for review' });
  if (chart.status === 'in review') {
    opButtons.push({ op: 'approve', label: 'Approve', tone: 'primary' });
    opButtons.push({ op: 'returnToDrafting', label: 'Return to owner' });
  }
  if (chart.status === 'approved') opButtons.push({ op: 'markFinal', label: 'Mark final…', tone: 'primary' });
  if (chart.status === 'final') opButtons.push({ op: 'reopen', label: 'Reopen…', tone: 'danger' });

  const hold = chart.hold;
  const holdVerdict = canAct(actor, hold ? 'liftHold' : 'placeHold', chart);

  const run = (op: Op) => {
    if (op === 'markFinal') return onFinalize();
    if (op === 'reopen') return setConfirmReopen(true);
    dispatch({ type: 'op', id: chart.id, op, now: simNow() });
  };

  // The reason shown under the buttons is the first blocking reason for the primary action.
  const blocking = opButtons.map((b) => ({ ...b, verdict: canAct(actor, b.op as PermAction, chart, ctx) }));
  const firstBlock = blocking.find((b) => !b.verdict.ok);

  return (
    <Card title="Sign-off" aside={<span className="muted small">Lead sign-off only</span>}>
      {opButtons.length === 0 && chart.status === 'disclosure hold' && (
        <p className="muted">Approval waits for the disclosure hold to be lifted.</p>
      )}
      <div className="action-row">
        {blocking.map((b) => (
          <button
            key={b.op}
            type="button"
            className={`btn ${b.tone ?? ''}`}
            disabled={!b.verdict.ok}
            title={b.verdict.ok ? b.label : b.verdict.reason}
            onClick={() => run(b.op)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {confirmReopen && (
        <div className="confirm">
          <span>Reopening sends {chart.id} back to approved and unlocks it for edits.</span>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setConfirmReopen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                dispatch({ type: 'op', id: chart.id, op: 'reopen', now: simNow() });
                setConfirmReopen(false);
              }}
            >
              Reopen chart
            </button>
          </div>
        </div>
      )}

      {firstBlock && !firstBlock.verdict.ok && <p className="muted small verdict">{firstBlock.verdict.reason}</p>}

      <div className="hold-row">
        <div>
          <div className="hold-title">Disclosure hold</div>
          <div className="muted small">
            {hold ? `On hold since ${fmtClock(hold.at)}.` : 'No hold on this chart.'} {!holdVerdict.ok && <span>{holdVerdict.reason}</span>}
          </div>
        </div>
        <button
          type="button"
          className="btn"
          disabled={!holdVerdict.ok}
          title={holdVerdict.ok ? '' : holdVerdict.reason}
          onClick={() => dispatch({ type: 'hold', id: chart.id, on: !hold, now: simNow() })}
        >
          {hold ? 'Lift hold' : 'Place hold'}
        </button>
      </div>
    </Card>
  );
}

function Tabs({ chart, focusThreadId }: { chart: Chart; focusThreadId: string | null }) {
  const { state, dispatch } = useStore();
  const tab = state.tab;
  const openHere = openCountFor(state.comments, chart.id);
  return (
    <section className="tabs-wrap">
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'comments'}
          className={tab === 'comments' ? 'on' : ''}
          onClick={() => dispatch({ type: 'tab', tab: 'comments' })}
        >
          Comments <span className="count">{openHere} open</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={tab === 'history' ? 'on' : ''}
          onClick={() => dispatch({ type: 'tab', tab: 'history' })}
        >
          Change history <span className="count">{chart.history.length}</span>
        </button>
      </div>
      {tab === 'comments' ? <CommentsPanel chart={chart} focusThreadId={focusThreadId} /> : <HistoryPanel chart={chart} />}
    </section>
  );
}

function CommentsPanel({ chart, focusThreadId }: { chart: Chart; focusThreadId: string | null }) {
  const { state, dispatch } = useStore();
  const threads = state.comments
    .filter((c) => c.chartId === chart.id)
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || a.at - b.at);
  const [text, setText] = useState('');
  const [to, setTo] = useState<string[]>([]);

  useEffect(() => {
    if (!focusThreadId) return;
    const el = document.getElementById(`thread-${focusThreadId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusThreadId, chart.id]);

  const post = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch({ type: 'comment', chartId: chart.id, text: text.trim(), to, now: simNow() });
    setText('');
    setTo([]);
  };

  return (
    <div className="comments">
      {threads.length === 0 && <p className="muted">No comments on this chart yet.</p>}
      {threads.map((t) => (
        <Thread key={t.id} thread={t} />
      ))}

      <form className="composer" onSubmit={post}>
        <label className="composer-label">
          <span>New comment on {chart.id}</span>
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment for the team" />
        </label>
        <div className="composer-foot">
          <div className="recipients" role="group" aria-label="Address this comment to">
            <span className="muted small">To:</span>
            {PEOPLE_TO.map((p) => (
              <label key={p.id} className={`recipient ${to.includes(p.id) ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={to.includes(p.id)}
                  onChange={(e) => setTo(e.target.checked ? [...to, p.id] : to.filter((x) => x !== p.id))}
                />
                {p.name.split(' ')[0]}
              </label>
            ))}
          </div>
          <button type="submit" className="btn primary" disabled={!text.trim()}>
            Post comment
          </button>
        </div>
      </form>
    </div>
  );
}

function Thread({ thread }: { thread: Comment }) {
  const { dispatch } = useStore();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const now = simNow();
  const toMe = thread.to.includes(ME_ID) && !thread.resolved;

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    dispatch({ type: 'reply', commentId: thread.id, text: reply.trim(), now });
    setReply('');
    setReplying(false);
  };

  return (
    <article id={`thread-${thread.id}`} className={`thread ${thread.resolved ? 'resolved' : ''} ${toMe ? 'to-me' : ''}`}>
      <header>
        <Avatar personId={thread.authorId} size="sm" />
        <div className="thread-who">
          <PersonName id={thread.authorId} />
          <span className="muted small"> · {fmtRelative(thread.at, now)}</span>
        </div>
        <div className="thread-to">
          {thread.to.map((id) => (
            <Chip key={id} tone={id === ME_ID ? 'info' : 'neutral'}>
              To {personName(id).split(' ')[0]}
            </Chip>
          ))}
        </div>
      </header>
      <p className="thread-text">{thread.text}</p>
      {thread.replies.map((r) => (
        <div key={r.id} className="reply">
          <Avatar personId={r.authorId} size="sm" />
          <div>
            <div className="thread-who">
              <PersonName id={r.authorId} />
              <span className="muted small"> · {fmtRelative(r.at, now)}</span>
            </div>
            <p className="thread-text">{r.text}</p>
          </div>
        </div>
      ))}

      {thread.resolved ? (
        <div className="muted small">
          Resolved by {personName(thread.resolvedBy ?? '')}
          {thread.resolvedAt ? `, ${fmtClock(thread.resolvedAt)}` : ''}
        </div>
      ) : (
        <div className="thread-actions">
          <button type="button" className="link" onClick={() => setReplying((v) => !v)}>
            {replying ? 'Cancel reply' : 'Reply'}
          </button>
          <button type="button" className="link" onClick={() => dispatch({ type: 'resolve', commentId: thread.id, now })}>
            Resolve
          </button>
        </div>
      )}

      {replying && (
        <form className="reply-form" onSubmit={send}>
          <textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Reply" />
          <button type="submit" className="btn primary small" disabled={!reply.trim()}>
            Send reply
          </button>
        </form>
      )}
    </article>
  );
}

function HistoryPanel({ chart }: { chart: Chart }) {
  const entries = [...chart.history].reverse();
  return (
    <ol className="history">
      {entries.map((h, i) => (
        <li key={`${h.at}-${i}`}>
          <div className="h-time">{fmtDayTime(h.at)}</div>
          <div className="h-body">
            <div className="h-who">
              <b>{personName(h.by)}</b>
              {h.version !== undefined && <span className="ver">v{h.version}</span>}
            </div>
            <div>{h.summary}</div>
            {h.details && (
              <ul className="h-details">
                {h.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
