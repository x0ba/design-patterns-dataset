import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BATCH, ASOF, REVIEWER, daysBetween, fmtDate } from './lib/model';
import { computeStats } from './lib/stats';
import { useDecisions } from './lib/store';
import { LineDrawer } from './components/LineDrawer';
import { Overview } from './views/Overview';
import { Proposals, type ProposalFilters } from './views/Proposals';
import { Groups, type GroupTab } from './views/Groups';
import { Instructions } from './views/Instructions';
import { Submission } from './views/Submission';

export type View = 'overview' | 'proposals' | 'groups' | 'instructions' | 'submission';
export type Preset = Partial<ProposalFilters> & { tab?: GroupTab };
export type Nav = (view: View, preset?: Preset) => void;

const VIEWS: View[] = ['overview', 'proposals', 'groups', 'instructions', 'submission'];

const VIEW_LABEL: Record<View, string> = {
  overview: 'Overview',
  proposals: 'Proposals',
  groups: 'Groups and conflicts',
  instructions: 'Instructions',
  submission: 'Submission',
};

function viewFromHash(): View {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0] as View;
  return VIEWS.includes(h) ? h : 'overview';
}

interface DrawerState {
  id: string;
  list: string[];
}

export default function App() {
  const lines = BATCH.lines;
  const { decisions, setDecision, resetLocalChanges, hasLocalChanges } = useDecisions(BATCH.seedDecisions);
  const stats = useMemo(() => computeStats(lines, decisions), [lines, decisions]);

  const [view, setView] = useState<View>(viewFromHash);
  const [preset, setPreset] = useState<Preset>({});
  const [viewKey, setViewKey] = useState(0);
  const [groupTab, setGroupTab] = useState<GroupTab>('grr');
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Each view starts at the top of the page, as a new screen would.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [viewKey]);

  const go: Nav = useCallback((v, p = {}) => {
    const { tab, ...filters } = p;
    if (tab) setGroupTab(tab);
    setView(v);
    setPreset(filters);
    setViewKey((k) => k + 1);
    setDrawer(null);
    window.history.replaceState(null, '', `#/${v}`);
  }, []);

  useEffect(() => {
    const onHash = () => {
      setView(viewFromHash());
      setPreset({});
      setViewKey((k) => k + 1);
      setDrawer(null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openLine = useCallback((id: string, list: string[]) => setDrawer({ id, list }), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const drawerLine = drawer ? lines.find((l) => l.id === drawer.id) : undefined;
  const drawerIndex = drawer ? drawer.list.indexOf(drawer.id) : -1;
  const prevId = drawer && drawerIndex > 0 ? drawer.list[drawerIndex - 1] : null;
  const nextId = drawer && drawerIndex >= 0 && drawerIndex < drawer.list.length - 1 ? drawer.list[drawerIndex + 1] : null;
  const step = (id: string | null) => {
    if (!id || !drawer) return;
    setDrawer({ id, list: drawer.list });
  };

  const daysLeft = daysBetween(ASOF, BATCH.meta.dueDate);

  const onReset = () => {
    if (!hasLocalChanges) return;
    if (window.confirm('Remove every decision made in this browser and return to the seeded state?')) resetLocalChanges();
  };

  const navCount: Record<View, string | undefined> = {
    overview: undefined,
    proposals: `${stats.proposed}/${stats.total}`,
    groups: String(stats.grr + stats.conflicts),
    instructions: 'v7',
    submission: stats.open === 0 && stats.queued === 0 ? 'ready' : 'blocked',
  };

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Main">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            TA
          </div>
          <div>
            <div className="brand-name">Tapcard Assist</div>
            <div className="small muted">Lead service line review</div>
          </div>
        </div>

        <nav className="nav">
          {VIEWS.map((v) => (
            <button key={v} className={`nav-item ${view === v ? 'on' : ''}`} aria-current={view === v ? 'page' : undefined} onClick={() => go(v)}>
              <span>{VIEW_LABEL[v]}</span>
              {navCount[v] && <span className="nav-count">{navCount[v]}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="small muted">Northgate · {BATCH.meta.batchId}</div>
          <div className="small">
            <strong>{stats.decided}</strong> of {stats.proposed} proposals decided
          </div>
          <div className="mini-bar" aria-hidden="true">
            <div style={{ width: `${(stats.decided / Math.max(1, stats.proposed)) * 100}%` }} />
          </div>
          <div className="user">
            <span className="avatar" aria-hidden="true">
              {REVIEWER.initials}
            </span>
            <div>
              <div className="small"><strong>{REVIEWER.name}</strong></div>
              <div className="small muted">{REVIEWER.role}</div>
            </div>
          </div>
          <p className="prototype-note">
            Prototype. Records are mock data. Decisions are kept only in this browser.
          </p>
        </div>
      </aside>

      <div className="main" ref={mainRef}>
        <header className="topbar">
          <div className="crumbs small">
            <span className="muted">Northgate pressure zone</span>
            <span className="muted"> / </span>
            <strong>{VIEW_LABEL[view]}</strong>
          </div>
          <div className="topbar-right">
            <span className="pill">
              Due {fmtDate(BATCH.meta.dueDate)} · {daysLeft} days
            </span>
            {hasLocalChanges && (
              <button className="btn ghost small-btn" onClick={onReset}>
                Reset local changes
              </button>
            )}
          </div>
        </header>

        <main className="content" key={viewKey}>
          {view === 'overview' && <Overview stats={stats} go={go} onLocalChanges={hasLocalChanges} />}
          {view === 'proposals' && (
            <Proposals
              lines={lines}
              decisions={decisions}
              stats={stats}
              preset={preset}
              onOpen={openLine}
              openId={drawer?.id ?? null}
            />
          )}
          {view === 'groups' && (
            <Groups
              lines={lines}
              decisions={decisions}
              stats={stats}
              tab={groupTab}
              onTab={setGroupTab}
              onOpen={openLine}
              openId={drawer?.id ?? null}
              setDecision={setDecision}
            />
          )}
          {view === 'instructions' && (
            <Instructions lines={lines} decisions={decisions} stats={stats} onOpen={openLine} openId={drawer?.id ?? null} />
          )}
          {view === 'submission' && (
            <Submission lines={lines} decisions={decisions} stats={stats} onOpen={openLine} openId={drawer?.id ?? null} />
          )}
        </main>
      </div>

      {drawerLine && (
        <LineDrawer
          key={drawerLine.id}
          line={drawerLine}
          decision={decisions[drawerLine.id]}
          position={drawer && drawerIndex >= 0 ? { index: drawerIndex + 1, total: drawer.list.length } : null}
          onClose={closeDrawer}
          onPrev={prevId ? () => step(prevId) : undefined}
          onNext={nextId ? () => step(nextId) : undefined}
          onDecide={(ids, d) => setDecision(ids, d)}
        />
      )}
    </div>
  );
}
