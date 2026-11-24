import { HANDOFF_DUE, ME_ID, PEOPLE, personById, personName } from '../data/seed';
import { canAct } from '../lib/permissions';
import { fmtClock, fmtCountdown, fmtDayTime, fmtRelative } from '../lib/format';
import { countByStatus, feedSinceLastSeen, hasRecheck, openThreads, presenceGroups, simNow } from '../lib/selectors';
import { useStore } from '../lib/store';
import type { Comment, Status } from '../lib/types';
import { Avatar, Card, Chip, PersonName } from './ui';

interface Props {
  now: number;
  onRelease: () => void;
  onOpenComment: (c: Comment) => void;
  onOpenChart: (id: string) => void;
}

export function SidePanel({ now, onRelease, onOpenComment, onOpenChart }: Props) {
  return (
    <aside className="pane side-pane" aria-label="Release status and activity">
      <ReleaseCard now={now} onRelease={onRelease} />
      <NeedsYou now={now} onOpenComment={onOpenComment} />
      <Working now={now} onOpenChart={onOpenChart} />
      <Changes onOpenChart={onOpenChart} />
    </aside>
  );
}

function ReleaseCard({ now, onRelease }: { now: number; onRelease: () => void }) {
  const { state } = useStore();
  const counts = countByStatus(state.charts);
  const total = state.charts.length;
  const open = openThreads(state.comments).length;
  const holds = counts['disclosure hold'];
  const rechecks = state.charts.filter(hasRecheck).length;
  const notFinal = total - counts.final;
  const verdict = canAct(personById(ME_ID)!, 'release', null, { notFinal, holdsOpen: holds, openComments: open });
  const pct = (counts.final / total) * 100;

  return (
    <Card title="Release to communications" aside={<Chip tone="neutral">Lead only</Chip>} className="release-card">
      <div className="kv">
        <div>
          <span className="muted small">Handoff due</span>
          <b>Wed, Nov 18, 5:00 p.m.</b>
          <span className="muted small">{state.handedOffAt ? 'Done' : `${fmtCountdown(HANDOFF_DUE, now)} left`}</span>
        </div>
      </div>

      <div className="readiness">
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <span>
          <b>{counts.final}</b> of {total} final
        </span>
      </div>

      <ul className="blockers">
        <li className={holds ? 'block' : 'clear'}>
          {holds ? `${holds} charts on disclosure hold` : 'No disclosure holds'}
        </li>
        <li className={open ? 'block' : 'clear'}>{open ? `${open} open comments` : 'No open comments'}</li>
        <li className={rechecks ? 'warn' : 'clear'}>
          {rechecks ? `${rechecks} approved charts need a numbers re-check` : 'No re-checks outstanding'}
        </li>
        <li className={notFinal ? 'block' : 'clear'}>{notFinal ? `${notFinal} charts not yet final` : 'All charts final'}</li>
      </ul>

      {state.handedOffAt ? (
        <p className="ok">Released to communications, {fmtDayTime(state.handedOffAt)}.</p>
      ) : (
        <>
          <button type="button" className="btn primary wide" disabled={!verdict.ok} title={verdict.ok ? '' : verdict.reason} onClick={onRelease}>
            Release to communications…
          </button>
          {!verdict.ok && <p className="muted small">{verdict.reason}</p>}
        </>
      )}
    </Card>
  );
}

function NeedsYou({ now, onOpenComment }: { now: number; onOpenComment: (c: Comment) => void }) {
  const { state } = useStore();
  const counts = countByStatus(state.charts);
  const toMe = openThreads(state.comments).filter((c) => c.to.includes(ME_ID));
  const rechecks = state.charts.filter(hasRecheck).length;

  return (
    <Card title="Needs you" aside={<Chip tone="info">{toMe.length} to you</Chip>}>
      <ul className="to-me-list">
        {toMe.map((c) => (
          <li key={c.id}>
            <button type="button" className="to-me-item" onClick={() => onOpenComment(c)}>
              <span className="row-top">
                <span className="cid">{c.chartId}</span>
                <span className="muted small">
                  {personName(c.authorId).split(' ')[0]} · {fmtRelative(c.at, now)}
                </span>
              </span>
              <span className="snippet">{c.text}</span>
            </button>
          </li>
        ))}
      </ul>

      <h4 className="subhead">Sign-offs</h4>
      <ul className="signoffs">
        <li>
          <FilterLink count={counts.approved} label="approved, not yet final" status="approved" />
          {rechecks > 0 && <span className="warn-text nowrap"> · {rechecks} need a numbers re-check</span>}
        </li>
        <li>
          <FilterLink count={counts['in review']} label="in review, waiting for your approval" status="in review" />
        </li>
        <li>
          <FilterLink count={counts['disclosure hold']} label="on disclosure hold. Only the reviewer can lift these." status="disclosure hold" />
        </li>
        <li>
          <FilterLink count={counts.drafting} label="drafts still open" status="drafting" />
        </li>
      </ul>
    </Card>
  );
}

function FilterLink({ count, label, status }: { count: number; label: string; status: Status }) {
  const { state, dispatch } = useStore();
  const active = state.filters.status === status;
  return (
    <button
      type="button"
      className={`filter-link ${active ? 'on' : ''}`}
      aria-pressed={active}
      onClick={() => dispatch({ type: 'filter', patch: { status: active ? 'all' : status } })}
    >
      <b>{count}</b> {label}
    </button>
  );
}

function Working({ now, onOpenChart }: { now: number; onOpenChart: (id: string) => void }) {
  const { state } = useStore();
  const groups = presenceGroups(state.charts);
  const active = new Set(groups.map((g) => g.person.id));

  // Last time each idle teammate touched anything, from comments, replies, history and feed.
  const lastActive = (personId: string): number | null => {
    const stamps: number[] = [];
    state.comments.forEach((c) => {
      if (c.authorId === personId) stamps.push(c.at);
      c.replies.forEach((r) => r.authorId === personId && stamps.push(r.at));
    });
    state.charts.forEach((c) => c.history.forEach((h) => h.by === personId && stamps.push(h.at)));
    state.feed.forEach((e) => e.actorId === personId && stamps.push(e.at));
    return stamps.length ? Math.max(...stamps) : null;
  };
  const idle = PEOPLE.filter((p) => p.id !== ME_ID && !active.has(p.id));

  return (
    <Card title="Working now" aside={<Chip tone="ok">{groups.length} people</Chip>}>
      <ul className="presence-list">
        {groups.map((g) => (
          <li key={g.person.id} className="presence">
            <Avatar personId={g.person.id} />
            <div className="presence-body">
              <div>
                <b>{g.person.name}</b> <span className="muted small">{g.person.title}</span>
              </div>
              {g.items.map((it) => (
                <div key={it.chartId} className="presence-item">
                  <button type="button" className="link cid" onClick={() => onOpenChart(it.chartId)}>
                    {it.chartId}
                  </button>
                  <span className="muted small">
                    {it.activity}, since {fmtClock(it.since)}
                  </span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="idle">
        <span className="muted small">Not active</span>
        {idle.map((p) => {
          const t = lastActive(p.id);
          return (
            <div key={p.id} className="idle-row">
              <PersonName id={p.id} />
              <span className="muted small">
                {p.title} · {t ? `last active ${fmtRelative(t, now)}` : 'no activity'}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Changes({ onOpenChart }: { onOpenChart: (id: string) => void }) {
  const { state, dispatch } = useStore();
  const { items, newCount } = feedSinceLastSeen(state);
  return (
    <Card
      title="Since you last looked"
      aside={<Chip tone={newCount ? 'info' : 'neutral'}>{newCount} new</Chip>}
    >
      <p className="muted small">
        Last visit {fmtDayTime(state.lastSeenAt)}. {state.feedShowAll ? 'Showing all changes.' : 'Showing changes after that visit.'}
      </p>
      <div className="feed-actions">
        <button type="button" className="btn small primary" onClick={() => dispatch({ type: 'markSeen', now: simNow() })} disabled={newCount === 0}>
          Mark as seen
        </button>
        <button type="button" className="link" onClick={() => dispatch({ type: 'toggleFeedAll' })}>
          {state.feedShowAll ? 'Show new only' : 'Show all changes'}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="muted">Nothing new since your last visit.</p>
      ) : (
        <ol className="feed">
          {items.map((e) => (
            <li key={e.id} className={`k-${e.kind}`}>
              {e.chartId ? (
                <button type="button" className="feed-item" onClick={() => onOpenChart(e.chartId!)}>
                  <FeedBody e={e} />
                </button>
              ) : (
                <div className="feed-item static">
                  <FeedBody e={e} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function FeedBody({ e }: { e: { at: number; actorId: string; text: string } }) {
  return (
    <>
      <time>{fmtDayTime(e.at)}</time>
      <span className="feed-text">
        <b>{personName(e.actorId)}</b> {e.text}
      </span>
    </>
  );
}
