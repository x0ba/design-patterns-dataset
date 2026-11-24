import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import { communities, groups } from '../data/seed';
import {
  childSpaces,
  communityOfRoute,
  getThread,
  href,
  spaceChain,
  topSpaces,
  type Crumb,
  type Route,
} from '../lib/model';
import { formatMembers } from '../lib/format';

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2d6a4f" />
      <path
        d="M16 25V13M16 13c0-4 3-6 7-6-0 4-3 6-7 6zM16 17c-3 0-6-2-6-5 3 0 6 2 6 5z"
        stroke="#fbf8f2"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopBar({ route }: { route: Route }) {
  const { state } = useStore();
  const routeQuery = route.name === 'search' ? route.q : '';
  const [q, setQ] = useState(routeQuery);

  useEffect(() => {
    setQ(routeQuery);
  }, [routeQuery]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) window.location.hash = href.search(term);
  };

  return (
    <header className="topbar">
      <a className="brand" href={href.home()}>
        <Logo />
        <span>Meadowmark</span>
      </a>

      <form className="search" role="search" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="site-search">
          Search Meadowmark
        </label>
        <input
          id="site-search"
          type="search"
          placeholder="Search threads, guides, and groups"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <nav className="top-links" aria-label="Your places">
        <a href={href.recent()}>
          Recently viewed
          <span className="badge">{state.recent.length}</span>
        </a>
        <a href={href.saved()}>
          Saved
          <span className="badge">{state.saved.length}</span>
        </a>
        <span className="me">
          <span className="avatar" aria-hidden="true">
            LB
          </span>
          Lorna Beckwith
        </span>
      </nav>
    </header>
  );
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="You are here" className="crumbs">
      <ol>
        {crumbs.map((c, i) => (
          <li key={`${c.label}-${i}`}>
            {c.href ? (
              <a href={c.href}>{c.label}</a>
            ) : (
              <span aria-current="page" className="crumb-current">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Sidebar({ route }: { route: Route }) {
  const { state } = useStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const activeCommunity = communityOfRoute(route);

  // The space you are in (or the space a thread lives in), and every space above it.
  const currentSpaceId =
    route.name === 'space' ? route.id : route.name === 'thread' ? getThread(route.id)?.spaceId : undefined;
  const activeChain = new Set<string>();
  if (currentSpaceId) spaceChain(currentSpaceId).forEach((s) => activeChain.add(s.id));

  const joinedGroups = groups.filter((g) => state.joinedGroups.includes(g.id));

  return (
    <nav className="sidebar" aria-label="Main">
      <ul className="side-group">
        <li>
          <a className="side-link" href={href.home()} aria-current={route.name === 'home' ? 'page' : undefined}>
            Home
          </a>
        </li>
        <li>
          <a
            className="side-link"
            href={href.recent()}
            aria-current={route.name === 'recent' && !route.community ? 'page' : undefined}
          >
            Recently viewed
            <span className="count">{state.recent.length}</span>
          </a>
        </li>
        <li>
          <a className="side-link" href={href.saved()} aria-current={route.name === 'saved' ? 'page' : undefined}>
            Saved
            <span className="count">{state.saved.length}</span>
          </a>
        </li>
      </ul>

      <h2 className="side-heading">My communities</h2>
      <ul className="side-group">
        {communities.map((c) => {
          const isActive = activeCommunity === c.id;
          return (
            <li key={c.id}>
              <a
                className={`side-link community-link${isActive ? ' is-active' : ''}`}
                href={href.community(c.id)}
                aria-current={route.name === 'community' && route.id === c.id ? 'page' : undefined}
              >
                <span className="community-name">{c.name}</span>
                <span className="community-members">{formatMembers(c.members)} members</span>
              </a>

              {isActive && c.id === 'sourdough' && (
                <ul className="tree" aria-label={`${c.name} spaces`}>
                  {topSpaces(c.id).map((s) => {
                    const kids = childSpaces(s.id);
                    const isOpen = expanded[s.id] ?? activeChain.has(s.id);
                    const current = currentSpaceId === s.id;
                    const isRegional = s.id === 'regional-groups';
                    const isOnRegional = route.name === 'regional' || route.name === 'group';
                    return (
                      <li key={s.id}>
                        <div className="tree-row">
                          {kids.length > 0 ? (
                            <button
                              type="button"
                              className="tree-toggle"
                              aria-expanded={isOpen}
                              aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${s.name}`}
                              onClick={() => setExpanded((prev) => ({ ...prev, [s.id]: !isOpen }))}
                            >
                              {isOpen ? '▾' : '▸'}
                            </button>
                          ) : (
                            <span className="tree-toggle-spacer" aria-hidden="true" />
                          )}
                          <a
                            className="tree-link"
                            href={href.space(s.id)}
                            aria-current={current || (isRegional && isOnRegional) ? 'page' : undefined}
                          >
                            {s.name}
                          </a>
                        </div>

                        {isOpen && kids.length > 0 && (
                          <ul className="tree tree-nested">
                            {kids.map((k) => (
                              <li key={k.id}>
                                <a
                                  className="tree-link"
                                  href={href.space(k.id)}
                                  aria-current={currentSpaceId === k.id ? 'page' : undefined}
                                >
                                  {k.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}

                        {isRegional && joinedGroups.length > 0 && (
                          <ul className="tree tree-nested">
                            {joinedGroups.map((g) => (
                              <li key={g.id}>
                                <a
                                  className="tree-link"
                                  href={href.group(g.id)}
                                  aria-current={route.name === 'group' && route.id === g.id ? 'page' : undefined}
                                >
                                  {g.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <p className="side-note">
        Everything you open is listed under <a href={href.recent()}>Recently viewed</a>, with where it lives.
      </p>
    </nav>
  );
}
