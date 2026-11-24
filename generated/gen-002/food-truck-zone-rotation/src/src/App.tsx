import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppContext, Ctx, Selection, Tab } from './ctx';
import { clearPersisted, clockTime, initState, persist, reducer, Snapshot } from './state';
import { analyze, buildIssues, PlanRow, checkPlacement } from './engine/rules';
import { INITIAL_ASSIGNMENTS } from './data/seed';
import { TRUCK_BY_ID } from './data/trucks';
import { ZONE_BY_ID } from './data/zones';
import { dayLabel, weekOfDay } from './data/calendar';
import { SWAP_REQUESTS } from './data/requests';
import { Header } from './components/Header';
import { ScheduleView } from './components/Schedule';
import { SidePanel } from './components/SidePanel';
import { RehomeModal, PublishModal } from './components/Modals';
import { TrucksView, ZonesView, RequestsView, FormsView } from './components/Tables';
import { Icon } from './components/ui';

interface ToastState {
  id: number;
  msg: string;
  undo?: boolean;
  tone?: 'ok' | 'warn';
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [tab, setTab] = useState<Tab>('schedule');
  const [week, setWeek] = useState(1);
  const [mode, setMode] = useState<'week' | 'month'>('week');
  const [sel, setSel] = useState<Selection>(null);
  const [focusTruck, setFocusTruck] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [toastState, setToast] = useState<ToastState | null>(null);
  const [rehome, setRehome] = useState<{ ids: string[]; title: string } | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const toastTimer = useRef<number>();

  useEffect(() => persist(state), [state]);

  const { assignments, requests } = state.doc;
  const acks = useMemo(() => new Set(state.doc.acks), [state.doc.acks]);
  const an = useMemo(() => analyze(assignments), [assignments]);
  const { groups, acked } = useMemo(() => buildIssues(an, assignments, acks, requests), [an, assignments, acks, requests]);
  const initialById = useMemo(() => Object.fromEntries(INITIAL_ASSIGNMENTS.map((a) => [a.id, a])), []);

  const toast = useCallback<Ctx['toast']>((msg, opts) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg, ...opts });
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);

  const commit = useCallback(
    (label: string, patch: Partial<Snapshot>) => {
      dispatch({ type: 'commit', label, doc: { ...state.doc, ...patch } });
    },
    [state.doc],
  );

  // Drop selections that no longer exist (after undo, etc.)
  useEffect(() => {
    if (sel?.type === 'assignment' && !assignments.some((a) => a.id === sel.id)) setSel(null);
  }, [assignments, sel]);

  const select = useCallback<Ctx['select']>(
    (s, opts) => {
      setSel(s);
      if (s?.type === 'truck') setFocusTruck(s.truckId);
      if (opts?.jump && s) {
        let day: number | undefined;
        if (s.type === 'assignment') day = assignments.find((a) => a.id === s.id)?.day;
        if (s.type === 'cell') day = s.day;
        if (day) {
          setWeek(weekOfDay(day));
          setMode('week');
        }
        setTab('schedule');
      }
    },
    [assignments],
  );

  const describe = (truckId: string, zoneId: string, day: number) =>
    `${TRUCK_BY_ID[truckId].name} · ${ZONE_BY_ID[zoneId].name} ${dayLabel(day)}`;

  const ctx: Ctx = {
    state,
    an,
    groups,
    acked,
    initialById,
    sel,
    focusTruck,
    dragId,
    setDragId,
    week,
    setWeek,
    setTab,
    mode,
    setMode,
    select,
    setFocusTruck,
    toast,
    move: (id, zoneId, day, opts) => {
      const a = assignments.find((x) => x.id === id);
      if (!a) return;
      const label = `Moved ${TRUCK_BY_ID[a.truckId].name}: ${ZONE_BY_ID[a.zoneId].name} ${dayLabel(a.day)} → ${ZONE_BY_ID[zoneId].name} ${dayLabel(day)}`;
      commit(label, { assignments: assignments.map((x) => (x.id === id ? { ...x, zoneId, day } : x)) });
      toast(opts?.soft?.length ? `${label}. Heads up: ${opts.soft.join('; ')}` : label, {
        undo: true,
        tone: opts?.soft?.length ? 'warn' : 'ok',
      });
    },
    remove: (id) => {
      const a = assignments.find((x) => x.id === id);
      if (!a) return;
      const label = `Removed ${describe(a.truckId, a.zoneId, a.day)}`;
      commit(label, { assignments: assignments.filter((x) => x.id !== id) });
      toast(label, { undo: true });
    },
    add: (truckId, zoneId, day) => {
      const id = `n${state.nextId}`;
      const label = `Added ${describe(truckId, zoneId, day)}`;
      commit(label, { assignments: [...assignments, { id, truckId, zoneId, day }] });
      toast(label, { undo: true });
    },
    ack: (key) => {
      commit(`Acknowledged ${key.split(':')[0]} issue`, { acks: [...state.doc.acks, key] });
    },
    unack: (key) => {
      commit(`Restored ${key.split(':')[0]} issue`, { acks: state.doc.acks.filter((k) => k !== key) });
    },
    decideRequest: (id, decision) => {
      const r = SWAP_REQUESTS.find((x) => x.id === id)!;
      if (decision === 'declined') {
        commit(`Declined swap ${id}`, { requests: { ...requests, [id]: 'declined' } });
        toast(`Declined ${id}. ${TRUCK_BY_ID[r.requestedBy].owner} will be notified with the rotation.`, { undo: true });
        return;
      }
      const aA = assignments.find((x) => x.truckId === r.a.truckId && x.zoneId === r.a.zoneId && x.day === r.a.day);
      const aB = assignments.find((x) => x.truckId === r.b.truckId && x.zoneId === r.b.zoneId && x.day === r.b.day);
      if (!aA || !aB) {
        toast('One of the slots in this request has changed. Re-check before approving.', { tone: 'warn' });
        return;
      }
      commit(`Approved swap ${id}: ${TRUCK_BY_ID[r.a.truckId].name} ↔ ${TRUCK_BY_ID[r.b.truckId].name}`, {
        requests: { ...requests, [id]: 'approved' },
        assignments: assignments.map((x) =>
          x.id === aA.id ? { ...x, zoneId: aB.zoneId } : x.id === aB.id ? { ...x, zoneId: aA.zoneId } : x,
        ),
      });
      toast(`Approved ${id}: ${TRUCK_BY_ID[r.a.truckId].name} ↔ ${TRUCK_BY_ID[r.b.truckId].name} on ${dayLabel(r.a.day)}`, {
        undo: true,
      });
    },
    applyPlan: (rows: PlanRow[], label: string) => {
      let working = assignments;
      let moved = 0;
      let removed = 0;
      let skipped = 0;
      for (const row of rows) {
        const a = working.find((x) => x.id === row.assignmentId);
        if (!a) continue;
        if (row.choice === -1) {
          working = working.filter((x) => x.id !== a.id);
          removed++;
          continue;
        }
        const o = row.options[row.choice];
        const chk = checkPlacement(analyze(working), a.truckId, o.zoneId, o.day, a.id);
        if (chk.hard || chk.soft.length) {
          skipped++;
          continue;
        }
        working = working.map((x) => (x.id === a.id ? { ...x, zoneId: o.zoneId, day: o.day } : x));
        moved++;
      }
      if (!moved && !removed) {
        toast('Nothing applied — the selected spots are no longer available.', { tone: 'warn' });
        return;
      }
      commit(`${label}: ${moved} moved${removed ? `, ${removed} removed` : ''}`, { assignments: working });
      toast(
        `${label}: ${moved} moved${removed ? `, ${removed} removed` : ''}${skipped ? ` · ${skipped} skipped (spot taken by an earlier row)` : ''}`,
        { undo: true, tone: skipped ? 'warn' : 'ok' },
      );
    },
    openRehome: (ids, title) => setRehome({ ids, title }),
    remind: (truckIds) => {
      dispatch({ type: 'remind', truckIds, time: clockTime() });
      toast(
        truckIds.length === 1
          ? `Reminder sent to ${TRUCK_BY_ID[truckIds[0]].owner} (${TRUCK_BY_ID[truckIds[0]].name})`
          : `Reminders sent to ${truckIds.length} owners — forms due Wed, Nov 18 at 5 PM`,
      );
    },
    reviewForm: (truckId) => dispatch({ type: 'reviewForm', truckId }),
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (typing) return;
      if (e.key === 'Escape') {
        if (rehome || publishOpen) return;
        setSel(null);
        setFocusTruck(null);
      }
      if (tab === 'schedule' && mode === 'week' && !rehome && !publishOpen) {
        if (e.key === 'ArrowLeft') setWeek((w) => Math.max(0, w - 1));
        if (e.key === 'ArrowRight') setWeek((w) => Math.min(4, w + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rehome, publishOpen, tab, mode]);

  const pendingRequests = SWAP_REQUESTS.filter((r) => requests[r.id] === 'pending').length;
  const newForms = Object.values(TRUCK_BY_ID).filter(
    (t) => t.availability.isNew && !state.reviewedForms.includes(t.id),
  ).length;

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        <Header
          onUndo={() => dispatch({ type: 'undo' })}
          onRedo={() => dispatch({ type: 'redo' })}
          onPublish={() => setPublishOpen(true)}
          onRevert={() => {
            clearPersisted();
            dispatch({ type: 'revert' });
            setSel(null);
            setFocusTruck(null);
            toast('Reverted to Friday’s saved draft (v3).');
          }}
        />
        <nav className="tabs" role="tablist">
          {(
            [
              ['schedule', 'Rotation', null],
              ['requests', 'Swap requests', pendingRequests || null],
              ['forms', 'Availability forms', newForms ? `${newForms} new` : null],
              ['trucks', 'Trucks', 62],
              ['zones', 'Zones', 14],
            ] as [Tab, string, string | number | null][]
          ).map(([id, label, badge]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={`tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
              {badge !== null && (
                <span className={`tab-badge ${id === 'requests' || id === 'forms' ? 'hot' : ''}`}>{badge}</span>
              )}
            </button>
          ))}
          <div className="tabs-spacer" />
          <span className="tabs-hint">
            <kbd>⌘Z</kbd> undo · <kbd>←</kbd>
            <kbd>→</kbd> weeks · <kbd>Esc</kbd> clear
          </span>
        </nav>
        <main className="main">
          {tab === 'schedule' && (
            <div className="schedule-layout">
              <ScheduleView />
              <SidePanel />
            </div>
          )}
          {tab === 'trucks' && <TrucksView />}
          {tab === 'zones' && <ZonesView />}
          {tab === 'requests' && <RequestsView />}
          {tab === 'forms' && <FormsView />}
        </main>
        {rehome && <RehomeModal ids={rehome.ids} title={rehome.title} onClose={() => setRehome(null)} />}
        {publishOpen && (
          <PublishModal
            onClose={() => setPublishOpen(false)}
            onPublish={() => {
              dispatch({ type: 'publish' });
              setPublishOpen(false);
              toast('December rotation scheduled to send to 59 vendors Fri, Nov 20 at 7:00 AM.');
            }}
          />
        )}
        {toastState && (
          <div className={`toast toast-${toastState.tone ?? 'ok'}`} key={toastState.id} role="status">
            <Icon name={toastState.tone === 'warn' ? 'warn' : 'check'} />
            <span>{toastState.msg}</span>
            {toastState.undo && (
              <button
                className="toast-undo"
                onClick={() => {
                  dispatch({ type: 'undo' });
                  setToast(null);
                }}
              >
                Undo
              </button>
            )}
            <button className="toast-x" onClick={() => setToast(null)} aria-label="Dismiss">
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
