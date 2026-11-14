import { useMemo, useState } from 'react';
import { generateDataset, type Episode } from './data/generate';
import { DEFAULT_FILTERS, derive, flaggedCount, type Filters } from './analysis/model';
import { splitByDate } from './analysis/stats';
import { Sidebar } from './components/Sidebar';
import { Overview } from './views/Overview';
import { Shows } from './views/Shows';
import { Segments } from './views/Segments';
import { Episodes } from './views/Episodes';
import { Method } from './views/Method';

export type Tab = 'overview' | 'shows' | 'segments' | 'episodes' | 'method';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'shows', label: 'Shows' },
  { id: 'segments', label: 'Segments' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'method', label: 'Method & data' },
];

const DATASET = generateDataset();
const EPISODES: Episode[] = DATASET.episodes;

export function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [openEpisodeId, setOpenEpisodeId] = useState<string | null>(null);
  const [focusShowId, setFocusShowId] = useState<string | null>(null);

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));

  const d = useMemo(() => derive(EPISODES, filters), [filters]);

  const counts = useMemo(() => {
    const t = splitByDate(d.treat, filters.split);
    const c = splitByDate(d.control, filters.split);
    const s = splitByDate(d.selected, filters.split);
    return {
      treatPre: d.hasTreat ? t.pre.length : s.pre.length,
      treatPost: d.hasTreat ? t.post.length : s.post.length,
      ctrlPre: c.pre.length,
      ctrlPost: c.post.length,
      hasTreat: d.hasTreat,
    };
  }, [d, filters.split]);

  const flagged = useMemo(() => {
    const f = flaggedCount(EPISODES, filters.split, filters.end, filters.showIds);
    const split = splitByDate(f.list, filters.split);
    return { total: f.total, pre: split.pre.length, post: split.post.length };
  }, [filters.split, filters.end, filters.showIds]);

  const openEpisode = openEpisodeId ? EPISODES.find((e) => e.id === openEpisodeId) ?? null : null;

  const openShow = (id: string) => {
    setFocusShowId(id);
    setTab('shows');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">E</span>
          Earshot Analytics
          <small>Listening retention</small>
        </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <span className="pill" title="All figures in this build come from a generated demo dataset, not from the network's analytics feed.">
            Synthetic demo data
          </span>
          <span>Episodes Jan 2025 – 13 Nov 2026</span>
        </div>
      </header>

      <div className="body">
        <Sidebar filters={filters} onChange={patch} onReset={() => setFilters(DEFAULT_FILTERS)} flagged={flagged} counts={counts} />

        <main className="main">
          {tab === 'overview' && (
            <Overview all={EPISODES} d={d} f={filters} onOpenShow={openShow} />
          )}
          {tab === 'shows' && (
            <Shows d={d} f={filters} focusShowId={focusShowId} setFocusShowId={setFocusShowId} />
          )}
          {tab === 'segments' && <Segments d={d} f={filters} />}
          {tab === 'episodes' && (
            <Episodes all={EPISODES} d={d} f={filters} onOpenEpisode={setOpenEpisodeId} openEpisode={openEpisode} onCloseEpisode={() => setOpenEpisodeId(null)} />
          )}
          {tab === 'method' && <Method all={EPISODES} f={filters} />}
        </main>
      </div>
    </div>
  );
}
