import { useEffect, useRef, useState } from 'react';
import { Breadcrumbs, Sidebar, TopBar } from './components/Chrome';
import { NotFound } from './components/common';
import { CommunityPage, HomePage } from './pages/HomePage';
import { SpacePage } from './pages/SpacePage';
import { ThreadPage } from './pages/ThreadPage';
import { GuidePage } from './pages/GuidePage';
import { GroupPage, RegionalPage } from './pages/GroupPages';
import { RecentPage, SavedPage, SearchPage } from './pages/ListPages';
import { crumbsFor, parseRoute, routeLabel, type Route } from './lib/model';

function PageView({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'community':
      return <CommunityPage id={route.id} />;
    case 'space':
      return <SpacePage id={route.id} />;
    case 'thread':
      return <ThreadPage id={route.id} />;
    case 'guide':
      return <GuidePage id={route.id} section={route.section} />;
    case 'regional':
      return <RegionalPage />;
    case 'group':
      return <GroupPage id={route.id} />;
    case 'recent':
      return <RecentPage community={route.community} />;
    case 'saved':
      return <SavedPage />;
    case 'search':
      return <SearchPage q={route.q} />;
    default:
      return <NotFound />;
  }
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  const [prevHash, setPrevHash] = useState<string | null>(null);
  const currentRef = useRef(hash);

  // Remember the page the reader came from so "Back to …" can name it.
  useEffect(() => {
    const onChange = () => {
      setPrevHash(currentRef.current);
      currentRef.current = window.location.hash;
      setHash(window.location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const route = parseRoute(hash);
  const previous = prevHash && prevHash !== hash ? parseRoute(prevHash) : null;
  const showBack = previous !== null && previous.name !== 'notfound';

  return (
    <div className="app">
      <TopBar route={route} />
      <div className="layout">
        <Sidebar route={route} />
        <main className="main" id="main">
          <div className="main-nav">
            {showBack && prevHash && (
              <a className="back-link" href={prevHash}>
                ← Back to {routeLabel(previous)}
              </a>
            )}
            <Breadcrumbs crumbs={crumbsFor(route)} />
          </div>
          <PageView key={hash} route={route} />
        </main>
      </div>
    </div>
  );
}
