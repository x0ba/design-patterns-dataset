import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import { formatCount, formatWhen } from '../lib/format';
import { getGuide, getThread, href } from '../lib/model';
import { NotFound, SaveButton } from '../components/common';

interface ShownReply {
  key: string;
  author: string;
  text: string;
  at: number;
  helpful: number;
  mine: boolean;
}

export function ThreadPage({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  const thread = getThread(id);
  // Captured on mount, before this visit is recorded, so we can say when they were last here.
  const [previousViewAt] = useState<number | null>(() => state.recent.find((r) => r.id === id)?.at ?? null);
  const [order, setOrder] = useState<'helpful' | 'newest'>('helpful');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    dispatch({ type: 'viewThread', id });
  }, [id, dispatch]);

  if (!thread) return <NotFound />;

  const userPosts = state.replies[thread.id] ?? [];
  const isVoted = (key: string) => state.votes.includes(key);

  const seeded: ShownReply[] = thread.replies.map((r) => {
    const key = `${thread.id}:${r.id}`;
    return {
      key,
      author: r.author,
      text: r.text,
      at: r.at,
      helpful: r.helpful + (isVoted(key) ? 1 : 0),
      mine: false,
    };
  });
  const mine: ShownReply[] = userPosts.map((r) => ({
    key: `${thread.id}:${r.id}`,
    author: 'Lorna B.',
    text: r.text,
    at: r.at,
    helpful: 0,
    mine: true,
  }));

  const sortedSeeded = [...seeded].sort((a, b) =>
    order === 'helpful' ? b.helpful - a.helpful : b.at - a.at,
  );
  const allReplies = [...mine.sort((a, b) => b.at - a.at), ...sortedSeeded];

  const totalReplies = thread.replyCount + userPosts.length;
  const guide = thread.guide ? getGuide(thread.guide.guideId) : undefined;
  const guideSection = guide && thread.guide ? guide.sections[thread.guide.section - 1] : undefined;

  const onPost = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: 'addReply', threadId: thread.id, text });
    setDraft('');
  };

  return (
    <article className="thread-page">
      <header className="thread-head">
        <h1>{thread.title}</h1>
        <p className="byline">
          Started by <strong>{thread.author}</strong> · {formatWhen(thread.createdAt)} ·{' '}
          {formatCount(totalReplies)} replies
        </p>
        <div className="btn-row">
          <SaveButton saveKey={thread.id} />
        </div>
      </header>

      <div className="notice" role="status">
        {previousViewAt ? (
          <>
            Your last visit: <strong>{formatWhen(previousViewAt)}</strong> This thread is listed under{' '}
            <a href={href.recent()}>Recently viewed</a> from now on.
          </>
        ) : (
          <>
            This is your first time opening this thread. It is now listed under{' '}
            <a href={href.recent()}>Recently viewed</a>.
          </>
        )}
      </div>

      <div className="post-body">
        <p>{thread.body}</p>
      </div>

      {guide && guideSection && thread.guide && (
        <aside className="related">
          <span className="eyebrow">Related guide</span>
          <a href={href.guide(guide.id, thread.guide.section)}>
            {guide.title}, section {thread.guide.section}: {guideSection.title}
          </a>
        </aside>
      )}

      <section className="replies" aria-label="Replies">
        <div className="panel-head">
          <h2>Replies</h2>
          <div className="segmented" role="group" aria-label="Sort replies">
            <button type="button" aria-pressed={order === 'helpful'} onClick={() => setOrder('helpful')}>
              Most helpful
            </button>
            <button type="button" aria-pressed={order === 'newest'} onClick={() => setOrder('newest')}>
              Newest
            </button>
          </div>
        </div>
        <p className="hint">
          {totalReplies > seeded.length + userPosts.length
            ? `Showing the ${seeded.length} most helpful of ${formatCount(totalReplies)} replies.`
            : `Showing all ${formatCount(totalReplies)} replies.`}
        </p>

        <ol className="reply-list">
          {allReplies.map((r) => (
            <li key={r.key} className={`reply${r.mine ? ' reply-mine' : ''}`}>
              <div className="reply-head">
                <strong>{r.author}</strong>
                {r.mine && <span className="chip">Your reply</span>}
                <span className="reply-when">{formatWhen(r.at)}</span>
              </div>
              <p>{r.text}</p>
              {!r.mine && (
                <button
                  type="button"
                  className={`btn btn-ghost helpful${isVoted(r.key) ? ' is-on' : ''}`}
                  aria-pressed={isVoted(r.key)}
                  onClick={() => dispatch({ type: 'toggleVote', key: r.key })}
                >
                  Helpful · {r.helpful}
                </button>
              )}
            </li>
          ))}
        </ol>

        <form className="reply-form" onSubmit={onPost}>
          <label htmlFor="reply-box">Add your reply</label>
          <textarea
            id="reply-box"
            rows={4}
            value={draft}
            placeholder="Tell them what you fed it, how it smelled, and what day it is."
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>
              Post reply
            </button>
          </div>
        </form>
      </section>
    </article>
  );
}
