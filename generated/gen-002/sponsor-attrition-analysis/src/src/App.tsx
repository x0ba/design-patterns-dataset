import { useCallback, useMemo, useRef, useState } from 'react';
import { ACTIVE_TOTAL, DIMS, DimKey, REASONS } from './data';
import { fmt } from './format';
import { Attribution, BaselineMode, EMPTY_FILTERS, Filters, Settings, anyFilter, overview } from './model';
import { MultiSelect, Segmented } from './components/controls';
import { Finding } from './findings';
import { stamp, useBrief } from './notes';
import Drivers from './views/Drivers';
import Segments from './views/Segments';
import Timing from './views/Timing';
import Payments from './views/Payments';
import BriefView from './views/Brief';

type Tab = 'drivers' | 'segments' | 'timing' | 'payments' | 'brief';

export default function App() {
  const [tab, setTab] = useState<Tab>('drivers');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [attribution, setAttribution] = useState<Attribution>('stated');
  const [baseline, setBaseline] = useState<BaselineMode>('pre');
  const [segDim, setSegDim] = useState<DimKey>('t');
  const [brief, setBrief] = useBrief();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const settings: Settings = useMemo(() => ({ filters, attribution, baseline }), [filters, attribution, baseline]);
  const ov = useMemo(() => overview(settings), [settings]);

  const addNote = useCallback((f: Finding) => {
    setBrief((b) => ({ ...b, notes: [...b.notes, { ...f, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, added: stamp() }] }));
    setToast(`Added to brief: “${f.title}”`);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, [setBrief]);

  const setDim = (k: DimKey, v: number[]) => setFilters((f) => ({ ...f, [k]: v }));
  const setReason = (r: number | null) => setFilters((f) => ({ ...f, reason: r }));

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'drivers', label: 'Drivers' },
    { id: 'segments', label: 'Segments' },
    { id: 'timing', label: 'Timing' },
    { id: 'payments', label: 'Payment failures' },
    { id: 'brief', label: 'Brief', badge: brief.notes.length },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="16" r="12" fill="none" stroke="#fff" strokeWidth="3.5" /><circle cx="16" cy="16" r="4.5" fill="#E9875C" /></svg>
          <span>Retention Lens</span>
        </div>
        <div className="crumb">
          <span className="muted-inv">Supporter Care</span>
          <span className="sep">/</span>
          <span>Sep–Oct 2026 cancellation spike</span>
        </div>
        <div className="topbar-right">
          <span className="fresh" title="Refreshed Mon Nov 16, 06:40">Cancellations through Oct 31 · failed charges through Nov 15</span>
          <span className="deadline">Exec briefing <b>Fri Nov 20</b> · 4 days</span>
          <span className="avatar" title="Hana Lindqvist · Senior Supporter Insights Analyst">HL</span>
        </div>
      </header>

      <nav className="tabbar">
        <div className="tabs">
          {tabs.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.badge !== undefined && <span className="badge">{t.badge}</span>}
            </button>
          ))}
        </div>
        <div className="settings">
          <div className="setting">
            <span className="setting-label">Compare Sep–Oct 2026 with</span>
            <Segmented size="sm" value={baseline} onChange={setBaseline} options={[
              { value: 'pre', label: 'Pre-change avg', title: 'Monthly average Jan 2025 – Jul 2026, before letters and migration' },
              { value: 'yoy', label: 'Sep–Oct 2025', title: 'Same months last year' },
            ]} />
          </div>
          <div className="setting">
            <span className="setting-label">Failed card, then gave a reason</span>
            <Segmented size="sm" value={attribution} onChange={setAttribution} options={[
              { value: 'stated', label: 'Count as stated reason' },
              { value: 'payment', label: 'Count as payment lapse' },
            ]} />
          </div>
        </div>
      </nav>

      {tab !== 'brief' && (
        <div className="filterbar">
          <span className="fb-title">Filter</span>
          {DIMS.map((d) => (
            <MultiSelect key={d.key} label={d.label} values={d.values} selected={filters[d.key]} onChange={(v) => setDim(d.key, v)} wide={d.key === 'k'} />
          ))}
          {filters.reason !== null && (
            <span className="chip">
              <span className="mono">{REASONS[filters.reason].code}</span>
              <button aria-label="Remove reason filter" onClick={() => setReason(null)}>×</button>
            </span>
          )}
          {anyFilter(filters) && <button className="link" onClick={() => setFilters(EMPTY_FILTERS)}>Reset</button>}
          <span className="fb-count">
            {anyFilter(filters) ? <><b>{fmt(ov.active)}</b> of {fmt(ACTIVE_TOTAL)} active sponsorships</> : <><b>{fmt(ACTIVE_TOTAL)}</b> active sponsorships · Nov 1</>}
          </span>
        </div>
      )}

      <main className="content">
        {tab === 'drivers' && <Drivers s={settings} ov={ov} setReason={setReason} setAttribution={setAttribution} addNote={addNote} goSegments={() => { setSegDim('t'); setTab('segments'); }} />}
        {tab === 'segments' && <Segments s={settings} dim={segDim} setDim={setSegDim} addNote={addNote} />}
        {tab === 'timing' && <Timing s={settings} ov={ov} addNote={addNote} />}
        {tab === 'payments' && <Payments s={settings} ov={ov} addNote={addNote} />}
        {tab === 'brief' && <BriefView brief={brief} setBrief={setBrief} s={settings} addNote={addNote} />}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
