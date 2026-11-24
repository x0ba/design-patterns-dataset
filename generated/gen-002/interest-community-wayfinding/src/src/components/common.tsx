import type { ReactNode } from 'react';
import { useStore } from '../lib/store';
import { formatWhen } from '../lib/format';
import { getThread, href, spacePath, threadLocation } from '../lib/model';
import type { Thread } from '../data/types';

export function SaveButton({ saveKey }: { saveKey: string }) {
  const { state, dispatch } = useStore();
  const saved = state.saved.includes(saveKey);
  return (
    <button
      type="button"
      className={`btn btn-ghost save-btn${saved ? ' is-saved' : ''}`}
      aria-pressed={saved}
      onClick={() => dispatch({ type: 'toggleSave', key: saveKey })}
    >
      {saved ? '★ Saved' : '☆ Save'}
    </button>
  );
}

/** A thread row with its location and last-viewed time. Used in lists and recents. */
export function RecentItem({
  id,
  at,
  showSave = true,
  inCommunity = false,
}: {
  id: string;
  at: number;
  showSave?: boolean;
  /** When the list already sits inside one community, leave the community name out of the location. */
  inCommunity?: boolean;
}) {
  const thread = getThread(id);
  if (!thread) return null;
  return (
    <li className="recent-item">
      <div className="recent-main">
        <a className="recent-title" href={href.thread(thread.id)}>
          {thread.title}
        </a>
        <div className="recent-where">{inCommunity ? spacePath(thread.spaceId) : threadLocation(thread)}</div>
      </div>
      <div className="recent-side">
        <time className="recent-when" dateTime={new Date(at).toISOString()}>
          {formatWhen(at)}
        </time>
        {showSave && <SaveButton saveKey={thread.id} />}
      </div>
    </li>
  );
}

export function ThreadRow({ thread }: { thread: Thread }) {
  const { state } = useStore();
  const viewed = state.recent.find((r) => r.id === thread.id);
  const replies = thread.replyCount + (state.replies[thread.id]?.length ?? 0);
  return (
    <li className="thread-row">
      <div className="thread-main">
        <a className="thread-title" href={href.thread(thread.id)}>
          {thread.title}
        </a>
        <div className="thread-meta">
          Started by {thread.author} · Last activity {formatWhen(thread.lastActivityAt)}
          {viewed && (
            <span className="chip" title="You have opened this thread before">
              You viewed {formatWhen(viewed.at)}
            </span>
          )}
        </div>
      </div>
      <div className="thread-count">
        <strong>{replies.toLocaleString('en-US')}</strong>
        <span>replies</span>
      </div>
    </li>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function NotFound() {
  return (
    <section className="panel">
      <h1>We can’t find that page</h1>
      <p>The link may be out of date, or the thread may have moved. Try one of these:</p>
      <p>
        <a className="btn btn-primary" href="#/community/sourdough">
          Back to Sourdough &amp; Wild Yeast
        </a>{' '}
        <a className="btn" href={href.recent()}>
          Recently viewed
        </a>
      </p>
    </section>
  );
}
