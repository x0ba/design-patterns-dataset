import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_ROWS, EMPTY_FILTERS, RANGE_LABEL, ROW_BY_ID, inRange } from './lib/metrics';
import type { ItemFilters, Range } from './lib/metrics';
import { num } from './lib/format';
import { Segmented } from './components/ui';
import { Overview } from './components/Overview';
import { Cuts } from './components/Cuts';
import { Items } from './components/Items';
import { Drawer } from './components/Drawer';

type Tab = 'overview' | 'cuts' | 'items';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Where it pays' },
  { id: 'cuts', label: 'Price cuts' },
  { id: 'items', label: 'All items' },
];
const tabFromHash = (): Tab => {
  const h = window.location.hash.replace('#/', '').replace('#', '');
  return (TABS.find((t) => t.id === h)?.id ?? 'overview') as Tab;
};

export function App() {
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [range, setRange] = useState<Range>('all');
  const [filters, setFilters] = useState<ItemFilters>(EMPTY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    window.history.replaceState(null, '', '#/' + t);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const rows = useMemo(() => inRange(ALL_ROWS, range), [range]);
  const goItems = useCallback((patch: Partial<ItemFilters>) => {
    setFilters({ ...EMPTY_FILTERS, ...patch });
    setTab('items');
  }, [setTab]);
  const close = useCallback(() => setOpenId(null), []);

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#/overview" onClick={() => setTab('overview')} aria-label="Flipledger home">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#2c2820" /><circle cx="16" cy="16" r="8" fill="none" stroke="#f3ead6" strokeWidth="2.5" /><circle cx="16" cy="16" r="3" fill="#e0a63a" /></svg>
            <span>Flipledger</span>
          </a>
          <nav className="tabs" aria-label="Sections">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </nav>
          <div className="topbar-right">
            <div className="range">
              <span>Acquired</span>
              <Segmented<Range> label="Acquired in" value={range} onChange={setRange} options={(Object.keys(RANGE_LABEL) as Range[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))} />
            </div>
            <div className="imported" title="Full sales history, imported today">
              <i aria-hidden="true" />Imported today · {num(ALL_ROWS.length)} items · Oct 2023 – Nov 2026
            </div>
          </div>
        </div>
      </header>
      <main>
        {tab === 'overview' && <Overview rows={rows} range={range} goItems={goItems} open={setOpenId} />}
        {tab === 'cuts' && <Cuts rows={rows} open={setOpenId} goItems={goItems} />}
        {tab === 'items' && <Items rows={rows} filters={filters} setFilters={setFilters} open={setOpenId} activeId={openId} />}
      </main>
      <Drawer row={openId ? ROW_BY_ID.get(openId) ?? null : null} onClose={close} open={setOpenId} />
    </>
  );
}
