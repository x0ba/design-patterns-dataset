import { useEffect } from 'react';
import { useRoute } from './lib/router';
import { getSite, useLoad } from './lib/data';
import { Footer, Masthead, ModeBar } from './components/Chrome';
import { Status } from './components/Pieces';
import IssuePage from './pages/IssuePage';
import ArchivePage from './pages/ArchivePage';
import SearchPage from './pages/SearchPage';
import ArticlePage from './pages/ArticlePage';
import EventsPage from './pages/EventsPage';
import { PlacesPage, PlacePage } from './pages/PlacesPage';
import { ContributorsPage, ContributorPage } from './pages/ContributorsPage';
import HelpPage from './pages/HelpPage';

export default function App() {
  const route = useRoute();
  const siteState = useLoad(getSite, []);
  const site = siteState.data;
  const [first, second] = route.segs;

  // Scroll to the top when the reader moves to a different page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [first, second]);

  useEffect(() => {
    document.title = titleFor(route, site);
  }, [route, site]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to the main content</a>
      <Masthead route={route} />
      <ModeBar route={route} site={site} />
      <main id="main" tabIndex={-1}>
        {siteState.error ? (
          <div className="container page"><Status error={siteState.error} /></div>
        ) : !site ? (
          <div className="container page"><Status loading label="Loading the Gazette" /></div>
        ) : (
          <Page route={route} site={site} />
        )}
      </main>
      <Footer />
    </>
  );
}

function Page({ route, site }) {
  const [first] = route.segs;
  switch (first) {
    case undefined:
      return <IssuePage route={route} site={site} home />;
    case 'issue':
      return <IssuePage route={route} site={site} />;
    case 'archive':
      return <ArchivePage route={route} site={site} />;
    case 'search':
      return <SearchPage route={route} site={site} />;
    case 'article':
      return <ArticlePage route={route} site={site} />;
    case 'events':
      return <EventsPage route={route} site={site} />;
    case 'places':
      return <PlacesPage route={route} site={site} />;
    case 'street':
      return <PlacePage route={route} site={site} kind="street" />;
    case 'neighborhood':
      return <PlacePage route={route} site={site} kind="neighborhood" />;
    case 'contributors':
      return <ContributorsPage route={route} site={site} />;
    case 'contributor':
      return <ContributorPage route={route} site={site} />;
    case 'help':
      return <HelpPage route={route} />;
    default:
      return (
        <div className="container page">
          <Status error={new Error('That page does not exist. Use the menu above to find what you need.')} />
        </div>
      );
  }
}

function titleFor(route, site) {
  const base = 'The Millrace Gazette Online';
  const [first, second] = route.segs;
  if (!site) return base;
  const issueLabel = (id) => site.issues.find((i) => i.id === id)?.label;
  switch (first) {
    case undefined:
      return `This month’s issue, ${issueLabel(site.currentIssue)} · ${base}`;
    case 'issue':
      return `${issueLabel(second) ?? 'Issue'} · ${base}`;
    case 'archive':
      return `Archive${second ? `, ${second}` : ''} · ${base}`;
    case 'search':
      return `Search${route.query.get('q') ? `: ${route.query.get('q')}` : ''} · ${base}`;
    case 'events':
      return `Holiday events · ${base}`;
    case 'places':
      return `Places · ${base}`;
    case 'street':
      return `${site.streets.find((s) => s.slug === second)?.name ?? 'Street'} · ${base}`;
    case 'neighborhood':
      return `${site.neighborhoods.find((h) => h.slug === second)?.name ?? 'Neighborhood'} · ${base}`;
    case 'contributors':
      return `Contributors · ${base}`;
    case 'contributor':
      return `${site.contributors.find((c) => c.slug === second)?.name ?? 'Contributor'} · ${base}`;
    case 'help':
      return `How to use this site · ${base}`;
    default:
      return base;
  }
}
