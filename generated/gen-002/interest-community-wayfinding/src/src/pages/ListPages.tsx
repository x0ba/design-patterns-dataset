import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { communities } from '../data/seed';
import { dayGroup, plural } from '../lib/format';
import {
  getCommunity,
  getGuide,
  getThread,
  href,
  searchSite,
  threadLocation,
  type SearchHit,
} from '../lib/model';
import { Empty, RecentItem } from '../components/common';

export function RecentPage({ community }: { community: string | null }) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();

  const inScope = state.recent.filter((r) => {
    const t = getThread(r.id);
    return t && (!community || t.communityId === community);
  });
  const items = inScope.filter((r) => {
    if (!term) return true;
    const t = getThread(r.id);
    return !!t && `${t.title} ${threadLocation(t)}`.toLowerCase().includes(term);
  });

  const days = ['Today', 'Yesterday', 'Earlier'] as const;
  const scopeName = community ? getCommunity(community)?.name : null;

  return (
    <>
      <header className="page-head">
        <h1>Recently viewed</h1>
        <p className="lede">
          Every thread you have opened, newest first, with where it lives. Tap a title to go back to it.
        </p>
      </header>

      <nav className="tabs" aria-label="Filter by community">
        <a href={href.recent()} aria-current={!community ? 'page' : undefined}>
          All communities <span className="badge">{state.recent.filter((r) => getThread(r.id)).length}</span>
        </a>
        {communities.map((c) => {
          const count = state.recent.filter((r) => getThread(r.id)?.communityId === c.id).length;
          if (count === 0) return null;
          return (
            <a key={c.id} href={href.recent(c.id)} aria-current={community === c.id ? 'page' : undefined}>
              {c.name} <span className="badge">{count}</span>
            </a>
          );
        })}
      </nav>

      <div className="filter-row">
        <label className="sr-only" htmlFor="recent-filter">
          Find a thread you opened
        </label>
        <input
          id="recent-filter"
          type="search"
          placeholder="Find a thread by its title or where it lives"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="hint">
          {plural(items.length, 'thread')}
          {scopeName ? ` in ${scopeName}` : ''}
        </span>
      </div>

      {items.length === 0 ? (
        <Empty>
          {term ? `Nothing you opened matches “${q}”.` : 'You have not opened any threads here yet.'}{' '}
          {term && (
            <button type="button" className="link-button" onClick={() => setQ('')}>
              Clear the search
            </button>
          )}
        </Empty>
      ) : (
        days.map((day) => {
          const group = items.filter((r) => dayGroup(r.at) === day);
          if (!group.length) return null;
          return (
            <section key={day} className="day-section">
              <h2 className="day-heading">{day}</h2>
              <ul className="recent-list">
                {group.map((r) => (
                  <RecentItem key={r.id} id={r.id} at={r.at} />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {state.recent.length > 0 && (
        <p className="hint footer-note">
          History is kept on this device. To keep a thread even after it falls down this list, press Save on it and find
          it under <a href={href.saved()}>Saved</a>.
        </p>
      )}
    </>
  );
}

export function SavedPage() {
  const { state, dispatch } = useStore();
  return (
    <>
      <header className="page-head">
        <h1>Saved</h1>
        <p className="lede">Threads and guides you have marked to keep. Saved items stay here when they scroll out of your history.</p>
      </header>

      {state.saved.length === 0 ? (
        <Empty>
          Nothing saved yet. On any thread or guide, press <strong>Save</strong> to keep it here.
        </Empty>
      ) : (
        <ul className="recent-list">
          {state.saved.map((key) => {
            if (key.startsWith('guide:')) {
              const guide = getGuide(key.slice('guide:'.length));
              if (!guide) return null;
              return (
                <li key={key} className="recent-item">
                  <div className="recent-main">
                    <a className="recent-title" href={href.guide(guide.id)}>
                      {guide.title}
                    </a>
                    <div className="recent-where">Pinned guide · {getCommunity(guide.communityId)?.name}</div>
                  </div>
                  <div className="recent-side">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => dispatch({ type: 'toggleSave', key })}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            }
            const thread = getThread(key);
            if (!thread) return null;
            return (
              <li key={key} className="recent-item">
                <div className="recent-main">
                  <a className="recent-title" href={href.thread(thread.id)}>
                    {thread.title}
                  </a>
                  <div className="recent-where">{threadLocation(thread)}</div>
                </div>
                <div className="recent-side">
                  <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'toggleSave', key })}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  Thread: 'Threads',
  'Guide section': 'Guide sections',
  'Regional group': 'Regional groups',
  Space: 'Spaces',
  Community: 'Communities',
};

export function SearchPage({ q }: { q: string }) {
  const hits = useMemo(() => searchSite(q), [q]);
  const kinds = Object.keys(KIND_LABEL) as SearchHit['kind'][];

  return (
    <>
      <header className="page-head">
        <h1>Search results</h1>
        <p className="lede">
          {q.trim() ? `${plural(hits.length, 'match')} for “${q.trim()}”` : 'Type a word in the search box at the top.'}
        </p>
      </header>

      {q.trim() && hits.length === 0 && (
        <Empty>
          No matches for “{q.trim()}”. Try a shorter word, like “smell” or “starter”.
        </Empty>
      )}

      {kinds.map((kind) => {
        const list = hits.filter((h) => h.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind} className="day-section">
            <h2 className="day-heading">{KIND_LABEL[kind]}</h2>
            <ul className="result-list">
              {list.map((h) => (
                <li key={h.href}>
                  <a className="result-title" href={h.href}>
                    {h.title}
                  </a>
                  <div className="result-where">{h.where}</div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
