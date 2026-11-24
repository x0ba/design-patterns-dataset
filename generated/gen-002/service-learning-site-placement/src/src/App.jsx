import { useCallback, useEffect, useMemo, useState } from 'react';
import { SITES } from './data/sites.js';
import { PLACED } from './data/placed.js';
import { UNPLACED } from './data/unplaced.js';
import * as P from './lib/placement.js';
import Header from './components/Header.jsx';
import Kpis from './components/Kpis.jsx';
import AssignView from './components/AssignView.jsx';
import SitesView from './components/SitesView.jsx';
import MapView from './components/MapView.jsx';
import RosterView from './components/RosterView.jsx';
import Toast from './components/Toast.jsx';

const STORAGE_KEY = 'commonplace-placements:spring-2027:changes:v1';

// Baseline roster (placed) plus the unplaced queue. Every student is in one list
// so that unplacing a baseline student returns them to the queue.
const STUDENTS = [
  ...PLACED.map((s) => ({ ...s })),
  ...UNPLACED.map((s) => ({ ...s, siteId: null })),
];

const TABS = [
  { id: 'assign', label: 'Assign' },
  { id: 'sites', label: 'Sites' },
  { id: 'map', label: 'Map' },
  { id: 'roster', label: 'Roster' },
];

function loadChanges() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [changes, setChanges] = useState(loadChanges);
  const [tab, setTab] = useState('assign');
  const [limit, setLimit] = useState(P.DEFAULT_LIMIT);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
    } catch {
      // Storage unavailable (private mode, quota): changes stay in memory.
    }
  }, [changes]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(timer);
  }, [toast]);

  const assignments = useMemo(() => P.resolveAssignments(STUDENTS, changes), [changes]);
  const counts = useMemo(() => P.seatCounts(assignments), [assignments]);
  const unplaced = useMemo(() => STUDENTS.filter((s) => !assignments[s.id]), [assignments]);
  const changeCount = useMemo(
    () => STUDENTS.filter((s) => (assignments[s.id] ?? null) !== (s.siteId ?? null)).length,
    [assignments],
  );

  // Every unplaced student with their assessment against every site.
  const queue = useMemo(
    () =>
      unplaced.map((student) => {
        const assessments = SITES.map((site) =>
          P.assess(student, site, { openSeats: P.openSeatsFor(site, counts), limit }),
        );
        return {
          student,
          assessments,
          recommendedCount: assessments.filter((a) => a.recommended).length,
        };
      }),
    [unplaced, counts, limit],
  );

  const kpis = useMemo(() => {
    const eveningSites = SITES.filter((s) => s.slots.includes('WD-EVE'));
    const eveningOpen = eveningSites.map((s) => Math.max(0, P.openSeatsFor(s, counts)));
    return {
      total: STUDENTS.length,
      placed: STUDENTS.length - unplaced.length,
      unplaced: unplaced.length,
      evening: unplaced.filter(P.needsWeekdayEvening).length,
      eveningSeats: eveningOpen.reduce((a, b) => a + b, 0),
      eveningSitesWithSeats: eveningOpen.filter((n) => n > 0).length,
      openSeats: SITES.reduce((a, s) => a + Math.max(0, P.openSeatsFor(s, counts)), 0),
      sitesWithSeats: SITES.filter((s) => P.openSeatsFor(s, counts) > 0).length,
      seatTotal: SITES.reduce((a, s) => a + s.capacity, 0),
      noOption: queue.filter((q) => q.recommendedCount === 0).length,
    };
  }, [unplaced, counts, queue]);

  const assign = useCallback(
    (student, siteId, { overLimit = false } = {}) => {
      const previous = assignments[student.id] ?? null;
      setChanges((c) => ({ ...c, [student.id]: siteId }));
      setToast({
        key: `${student.id}-${Date.now()}`,
        text: `${student.name} placed at ${P.SITE_BY_ID[siteId].name}${overLimit ? ', over the commute limit' : ''}.`,
        undo: () => setChanges((c) => ({ ...c, [student.id]: previous })),
      });
    },
    [assignments],
  );

  const unassign = useCallback(
    (student) => {
      const previous = assignments[student.id] ?? null;
      setChanges((c) => ({ ...c, [student.id]: null }));
      setToast({
        key: `${student.id}-${Date.now()}`,
        text: `${student.name} removed from ${P.SITE_BY_ID[previous].name} and returned to the queue.`,
        undo: () => setChanges((c) => ({ ...c, [student.id]: previous })),
      });
    },
    [assignments],
  );

  const reset = () => {
    if (window.confirm('Discard every change made in this browser and restore the baseline roster?')) {
      setChanges({});
      setToast(null);
    }
  };

  const exportCsv = () => {
    const rows = STUDENTS.map((s) => ({ ...s, siteId: assignments[s.id] ?? null }));
    const blob = new Blob([P.placementsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spring-2027-placements.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const tabCounts = { assign: unplaced.length, sites: SITES.length, roster: STUDENTS.length };

  return (
    <div className="app">
      <Header changeCount={changeCount} onExport={exportCsv} onReset={reset} />
      <Kpis kpis={kpis} />
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
            {tabCounts[t.id] !== undefined && <span className="tab-count">{tabCounts[t.id]}</span>}
          </button>
        ))}
        <div className="limit-inline">
          Commute limit <strong>{limit} min</strong> transit, drivers excluded
        </div>
      </nav>

      <main className="main">
        {tab === 'assign' && (
          <AssignView
            queue={queue}
            counts={counts}
            limit={limit}
            setLimit={setLimit}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onAssign={assign}
          />
        )}
        {tab === 'sites' && <SitesView students={STUDENTS} assignments={assignments} counts={counts} limit={limit} />}
        {tab === 'map' && <MapView counts={counts} students={STUDENTS} assignments={assignments} />}
        {tab === 'roster' && (
          <RosterView
            students={STUDENTS}
            assignments={assignments}
            onUnassign={unassign}
            onAssignFromRoster={(student) => {
              setSelectedId(student.id);
              setTab('assign');
            }}
          />
        )}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
