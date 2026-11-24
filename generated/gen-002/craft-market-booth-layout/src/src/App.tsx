import { useEffect, useMemo, useReducer } from 'react';
import { MARKET, OUTLETS, TABLES_FIXED, TABLES_TOTAL, FEE } from './data/venue';
import { evaluate, worstLevelByVendor, issuesFor } from './lib/rules';
import { loadSession, saveSession } from './lib/session';
import { reduce, samePlacements, nowLabel, vendorsWith, type AppState } from './lib/store';
import { Plan } from './components/Plan';
import { VendorPanel } from './components/VendorPanel';
import { AttentionPanel } from './components/AttentionPanel';
import { Inspector } from './components/Inspector';
import { PrintSheet } from './components/PrintSheet';
import { CATEGORY_COLOR } from './lib/colors';
import { CATEGORIES } from './lib/types';

function initState(): AppState {
  const s = loadSession();
  return { ...s, past: [], future: [], selectedId: null, flash: null, scale: 22 };
}

const SCALES = [18, 22, 26];

export default function App() {
  const [state, dispatch] = useReducer(reduce, undefined, initState);
  const { working, drafts, currentId, tableOverrides, selectedId, flash, scale, past, future } = state;

  const vendors = useMemo(() => vendorsWith(tableOverrides), [tableOverrides]);
  const issues = useMemo(() => evaluate(working, vendors), [working, vendors]);
  const levels = useMemo(() => worstLevelByVendor(issues), [issues]);
  const current = drafts.find((d) => d.id === currentId) ?? drafts[0];
  const dirty = !samePlacements(working, current.placements);
  const selected = selectedId ? vendors.find((v) => v.id === selectedId) ?? null : null;
  const tablesCommitted = vendors.reduce((s, v) => s + v.tables, 0) + TABLES_FIXED;
  const onFloor = Object.keys(working).length;
  const days = Math.max(0, Math.ceil((new Date(MARKET.dateISO).getTime() - Date.now()) / 86_400_000));
  const printedAt = nowLabel();

  // Persist drafts, edits and table counts in this browser.
  useEffect(() => {
    saveSession({ drafts, currentId, working, tableOverrides });
  }, [drafts, currentId, working, tableOverrides]);

  // Toasts clear themselves.
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => dispatch({ type: 'flash', flash: null }), 4800);
    return () => window.clearTimeout(t);
  }, [flash]);

  // Keyboard: undo/redo, delete, rotate, nudge.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (mod && k === 'y') {
        e.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'select', id: null });
        return;
      }
      if (!selectedId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'remove', id: selectedId });
        return;
      }
      if (k === 'r' && !mod) {
        dispatch({ type: 'rotate', id: selectedId });
        return;
      }
      const step = e.shiftKey ? 1 : 0.1;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const m = moves[e.key];
      if (m) {
        e.preventDefault();
        dispatch({ type: 'nudge', id: selectedId, dx: m[0], dy: m[1] });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const switchDraft = (id: string) => {
    if (id === currentId) return;
    if (dirty && !window.confirm(`Discard unsaved changes to ${current.name} and open the other draft?`)) return;
    dispatch({ type: 'switch', id });
  };

  const saveAs = () => {
    const name = window.prompt('Name for the new draft', `v${drafts.length + 2} draft`);
    if (name && name.trim()) dispatch({ type: 'saveAs', name: name.trim() });
  };

  return (
    <>
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">▦</span>
          <div>
            <b>Stallplan</b>
            <small>Market booth layout</small>
          </div>
        </div>
        <div className="event">
          <b>{MARKET.title}</b>
          <span>
            {MARKET.shortDate} · {MARKET.venueLabel}
          </span>
        </div>
        <div className="draft-tools">
          <label className="draft-pick">
            <span>Draft</span>
            <select value={currentId} onChange={(e) => switchDraft(e.target.value)}>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <span className={`save-state ${dirty ? 'dirty' : ''}`}>{dirty ? 'Unsaved changes' : `Saved ${current.savedAt}`}</span>
          <button className="ghost-btn" type="button" disabled={!past.length} onClick={() => dispatch({ type: 'undo' })}>
            Undo
          </button>
          <button className="ghost-btn" type="button" disabled={!future.length} onClick={() => dispatch({ type: 'redo' })}>
            Redo
          </button>
          <button className="ghost-btn" type="button" disabled={!dirty} onClick={() => dispatch({ type: 'revert' })}>
            Revert
          </button>
          <button className="ghost-btn" type="button" disabled={!dirty} onClick={() => dispatch({ type: 'save' })}>
            Save draft
          </button>
          <button className="ghost-btn" type="button" onClick={saveAs}>
            Save as…
          </button>
          <button className="primary-btn" type="button" onClick={() => window.print()}>
            Print setup sheet
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="col-left">
          <div className="stats">
            <div className="stat">
              <span>On the floor</span>
              <b>
                {onFloor} <small>of 44</small>
              </b>
            </div>
            <div className="stat">
              <span>Layout checks</span>
              <b className={issues.some((i) => i.level === 'error') ? 'bad' : 'good'}>
                {issues.filter((i) => i.level === 'error').length} <small>to fix</small>
              </b>
            </div>
            <div className="stat">
              <span>Tables committed</span>
              <b>
                {tablesCommitted} <small>of {TABLES_TOTAL}</small>
              </b>
            </div>
            <div className="stat">
              <span>Booth fees collected</span>
              <b>${MARKET.feesCollected.toLocaleString('en-US')}</b>
            </div>
          </div>
          <p className="countdown">
            {days > 0 ? `${days} days to market day` : 'Market day'} · full booth ${FEE.full}, hallway ${FEE.hallway}
          </p>
          <VendorPanel
            vendors={vendors}
            placements={working}
            issues={issues}
            selectedId={selectedId}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onPlace={(id) => dispatch({ type: 'place', id })}
          />
        </aside>

        <section className="col-center">
          <div className="canvas-tools">
            <span className="venue-dims">Gym 30 × 18 m · Front hallway 22 × 3.5 m · North up</span>
            <div className="zoom" role="group" aria-label="Zoom">
              {SCALES.map((s, i) => (
                <button key={s} type="button" className={scale === s ? 'on' : ''} onClick={() => dispatch({ type: 'zoom', scale: s })}>
                  {['Small', 'Medium', 'Large'][i]}
                </button>
              ))}
            </div>
          </div>
          <div className="canvas-scroll">
            <Plan
              idPrefix="live-plan"
              placements={working}
              vendors={vendors}
              scale={scale}
              selectedId={selectedId}
              levels={levels}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onMove={(id, x, y) => dispatch({ type: 'move', id, x, y })}
              onInvalidDrop={(msg) => dispatch({ type: 'flash', flash: { text: msg, tone: 'warn' } })}
              onOutletClick={(oid) => {
                if (selectedId) dispatch({ type: 'outlet', id: selectedId, outlet: oid });
              }}
            />
          </div>
          <div className="legend">
            {CATEGORIES.map((c) => (
              <span key={c}>
                <i style={{ background: CATEGORY_COLOR[c] }} /> {c}
              </span>
            ))}
            <span>
              <i className="legend-outlet" /> Outlet (free {OUTLETS.filter((o) => !Object.values(working).some((p) => p.outlet === o.id)).length})
            </span>
            <span>
              <i className="legend-corridor" /> Keep clear
            </span>
            <span>
              <i className="legend-stage" /> Stage
            </span>
          </div>
        </section>

        <aside className="col-right">
          <AttentionPanel issues={issues} onSelect={(id) => dispatch({ type: 'select', id })} />
          <Inspector
            vendor={selected}
            vendors={vendors}
            placement={selected ? working[selected.id] : undefined}
            placements={working}
            issues={selected ? issuesFor(selected.id, issues) : []}
            onRect={(rect) => selected && dispatch({ type: 'setRect', id: selected.id, rect })}
            onRotate={() => selected && dispatch({ type: 'rotate', id: selected.id })}
            onRemove={() => selected && dispatch({ type: 'remove', id: selected.id })}
            onPlace={() => selected && dispatch({ type: 'place', id: selected.id })}
            onOutlet={(outlet) => selected && dispatch({ type: 'outlet', id: selected.id, outlet })}
            onTables={(n) => selected && dispatch({ type: 'tables', id: selected.id, n })}
          />
        </aside>
      </main>

      {flash && (
        <div className={`toast ${flash.tone}`} role="status">
          {flash.text}
          <button type="button" aria-label="Dismiss" onClick={() => dispatch({ type: 'flash', flash: null })}>
            ×
          </button>
        </div>
      )}

    </div>

      <PrintSheet draftName={current.name} placements={working} vendors={vendors} issues={issues} printedAt={printedAt} />
    </>
  );
}
