import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppContext, type AppState } from './context';
import { BASE_TAGS, REPO_METAS } from './data/seed';
import { matchesCve } from './data/cve';
import type { Env } from './data/types';
import { setQueryParam, useRoute } from './lib/router';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TagDrawer } from './components/TagDrawer';
import { AdvisoryView } from './views/AdvisoryView';
import { RepositoriesView } from './views/RepositoriesView';
import { TagsView } from './views/TagsView';

export function App() {
  const route = useRoute();
  // Environment label edits made in the drawer. Kept in memory for this session.
  const [overrides, setOverrides] = useState<Record<string, Env>>({});
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

  const tags = useMemo(
    () => BASE_TAGS.map((t) => (overrides[t.id] !== undefined && overrides[t.id] !== t.env ? { ...t, env: overrides[t.id] } : t)),
    [overrides],
  );
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t] as const)), [tags]);

  const notify = useCallback((msg: string) => setToast({ msg, key: Date.now() }), []);
  const setEnv = useCallback(
    (id: string, env: Env) => {
      setOverrides((o) => ({ ...o, [id]: env }));
      notify(`${id} labelled ${env}`);
    },
    [notify],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const ctx: AppState = useMemo(
    () => ({ tags, byId, repos: REPO_METAS, setEnv, notify }),
    [tags, byId, setEnv, notify],
  );

  const section = route.segments[0];
  const advisoryCount = useMemo(() => tags.filter((t) => matchesCve(t.base, t.pushedAt)).length, [tags]);
  const tagId = route.query.get('tag');
  const openTag = tagId ? byId.get(tagId) : undefined;
  const closeDrawer = useCallback(() => setQueryParam('tag', undefined), []);

  let title = 'Advisories';
  let view: ReactNode;
  if (section === 'repos' && route.segments[1]) {
    const name = route.segments[1];
    title = name;
    view = <TagsView key={`repo:${name}`} repo={name} />;
  } else if (section === 'repos') {
    title = 'Repositories';
    view = <RepositoriesView />;
  } else if (section === 'tags') {
    title = 'Tags';
    const q = route.query.get('q') ?? '';
    view = <TagsView key={`tags:${q}`} initialQuery={q} />;
  } else {
    view = <AdvisoryView />;
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className="shell">
        <Sidebar
          section={section === 'repos' || section === 'tags' ? section : 'advisory'}
          counts={{ advisories: advisoryCount, repos: REPO_METAS.length, tags: tags.length }}
        />
        <div className="main">
          <TopBar title={title} />
          <main className="content">{view}</main>
        </div>
        {openTag && <TagDrawer key={openTag.id} tag={openTag} onClose={closeDrawer} />}
        {toast && (
          <div className="toast" key={toast.key} role="status">
            {toast.msg}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
