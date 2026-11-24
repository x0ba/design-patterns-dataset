import { useEffect, useState } from 'react';
import { CommandPalette, Sidebar, Toasts, Topbar, TrailBar, labelFor } from './components/Shell';
import { nowMs, useRoute, useStore } from './store';
import { BriefPage, ProblemSetsPage } from './pages/Brief';
import { ThisWeekPage, WeeksPage, WeekPage } from './pages/Weeks';
import { ReadingPage, ReadingsPage } from './pages/Readings';
import { DatasetPage, DatasetsPage } from './pages/Datasets';
import { DraftPage } from './pages/Draft';
import { CritiqueEditor, CritiquePage } from './pages/Critique';
import { LecturePage, SlidesPage } from './pages/Lecture';
import { SectionPage } from './pages/Section';

export default function App() {
  const route = useRoute();
  const { update } = useStore();
  const [palette, setPalette] = useState(false);

  // Record the path Dana takes so she can retrace it.
  const full = route.path + (route.query.toString() ? '?' + route.query.toString() : '');
  useEffect(() => {
    const label = labelFor(route);
    update((s) => {
      const last = s.trail[s.trail.length - 1];
      if (last && last.path === full) return s;
      const trail = s.trail.filter((t) => t.path !== full && t.label !== label);
      return { ...s, trail: [...trail, { path: full, label, at: nowMs() }].slice(-10) };
    });
    document.title = `${label} · VIZ 120 · Plotyard`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const [a, b] = route.parts;
  let page: JSX.Element;
  switch (a) {
    case 'week': page = <ThisWeekPage />; break;
    case 'weeks': page = b ? <WeekPage n={+b} /> : <WeeksPage />; break;
    case 'readings': page = b ? <ReadingPage id={b} /> : <ReadingsPage route={route} />; break;
    case 'datasets': page = b ? <DatasetPage id={b} route={route} /> : <DatasetsPage />; break;
    case 'ps': page = b ? <BriefPage n={+b} /> : <ProblemSetsPage />; break;
    case 'draft': page = <DraftPage />; break;
    case 'critique': page = b ? <CritiqueEditor id={b} /> : <CritiquePage />; break;
    case 'lecture': page = <LecturePage n={+b} route={route} />; break;
    case 'slides': page = <SlidesPage deck={b === 'b' ? 'b' : 'a'} route={route} />; break;
    case 'section': page = <SectionPage route={route} />; break;
    default: page = <BriefPage n={4} />;
  }

  return (
    <div className="app">
      <Sidebar route={route} />
      <div className="main">
        <Topbar onSearch={() => setPalette(true)} />
        <TrailBar route={route} />
        <div className="main-scroll">
          <div key={full} className="page">{page}</div>
        </div>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <Toasts />
    </div>
  );
}
