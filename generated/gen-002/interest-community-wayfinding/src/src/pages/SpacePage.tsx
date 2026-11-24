import { useState } from 'react';
import { formatCount } from '../lib/format';
import { childSpaces, getSpace, href, threadsInSpace } from '../lib/model';
import { Empty, NotFound, ThreadRow } from '../components/common';

export function SpacePage({ id }: { id: string }) {
  const [sort, setSort] = useState<'latest' | 'replies'>('latest');
  const space = getSpace(id);
  if (!space) return <NotFound />;

  const subs = childSpaces(id);
  const parent = space.parentId ? getSpace(space.parentId) : undefined;
  const threads = [...threadsInSpace(id)].sort((a, b) =>
    sort === 'latest' ? b.lastActivityAt - a.lastActivityAt : b.replyCount - a.replyCount,
  );

  return (
    <>
      <header className="page-head">
        {parent && <p className="eyebrow">Inside {parent.name}</p>}
        <h1>{space.name}</h1>
        <p className="lede">{space.description}</p>
        <p className="hint">{formatCount(space.threadCount)} threads in this space</p>
      </header>

      {subs.length > 0 && (
        <section className="section">
          <h2 className="section-title">Sub-spaces</h2>
          <div className="sub-grid">
            {subs.map((s) => (
              <a key={s.id} className="sub-card" href={href.space(s.id)}>
                <strong>{s.name}</strong>
                <span className="space-desc">{s.description}</span>
                <span className="hint">{formatCount(s.threadCount)} threads</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>{threads.length ? 'Threads' : 'No threads to show here'}</h2>
          <div className="segmented" role="group" aria-label="Sort threads">
            <button type="button" aria-pressed={sort === 'latest'} onClick={() => setSort('latest')}>
              Latest activity
            </button>
            <button type="button" aria-pressed={sort === 'replies'} onClick={() => setSort('replies')}>
              Most replies
            </button>
          </div>
        </div>
        {threads.length === 0 ? (
          <Empty>
            {subs.length > 0
              ? 'Pick one of the sub-spaces above to find threads.'
              : 'Nothing has been posted in this space yet.'}
          </Empty>
        ) : (
          <ul className="thread-list">
            {threads.map((t) => (
              <ThreadRow key={t.id} thread={t} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
