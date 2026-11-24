import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Flow, type CardAction } from './Flow';
import { Inspector } from './Inspector';
import { DryRun } from './DryRun';
import { LeftRail } from './LeftRail';
import { DEFAULT_TEST_DATE, INITIAL_STEPS, NOW, ROUTINES, deviceById, personById } from './data';
import { check } from './expr';
import { ctxFor, simulate } from './sim';
import {
  CATEGORY_LABEL, PALETTE, STEP_META, cloneWithNewIds, findStep, flatSteps, insertAt, listAt, makeStep, moveStep, removeStep, replaceStep, stepTitle, updateStep, type Slot,
} from './steps';
import type { Device, Step, StepType } from './types';
import { describeDays, fmtDate, fmtTime } from './time';

interface Doc {
  past: Step[][];
  present: Step[];
  future: Step[][];
  lastKey: string | null;
  lastTime: number;
}

const LOADED_AT = Date.now();
const clockNow = () => NOW.minutes + Math.floor((Date.now() - LOADED_AT) / 60000);

export default function App() {
  const [doc, setDoc] = useState<Doc>({ past: [], present: INITIAL_STEPS, future: [], lastKey: null, lastTime: 0 });
  const steps = doc.present;
  const [saved, setSaved] = useState<{ steps: Step[]; at: number }>({ steps: INITIAL_STEPS, at: NOW.minutes - 1 });
  const [selectedId, setSelectedId] = useState<string | null>('s-swim');
  const [codeOpen, setCodeOpen] = useState<Set<string>>(() => new Set(['s-schoolnight', 's-swim']));
  const [testDate, setTestDate] = useState(DEFAULT_TEST_DATE);
  const [dockOpen, setDockOpen] = useState(true);
  const [routines, setRoutines] = useState(ROUTINES);
  const [name, setName] = useState('School-Night Wind-Down');
  const [status, setStatus] = useState<'draft' | 'enabled'>('draft');
  const [view, setView] = useState<string>('draft');
  const [palette, setPalette] = useState<{ slot: Slot; x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<'enable' | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: boolean; id: number } | null>(null);

  const commit = useCallback((fn: (s: Step[]) => Step[], key?: string) => {
    setDoc((d) => {
      const next = fn(d.present);
      if (next === d.present) return d;
      const coalesce = !!key && d.lastKey === key && Date.now() - d.lastTime < 1500;
      return { past: coalesce ? d.past : [...d.past.slice(-60), d.present], present: next, future: [], lastKey: key ?? null, lastTime: Date.now() };
    });
  }, []);
  const undo = useCallback(() => setDoc((d) => (d.past.length ? { past: d.past.slice(0, -1), present: d.past[d.past.length - 1], future: [d.present, ...d.future], lastKey: null, lastTime: 0 } : d)), []);
  const redo = useCallback(() => setDoc((d) => (d.future.length ? { past: [...d.past, d.present], present: d.future[0], future: d.future.slice(1), lastKey: null, lastTime: 0 } : d)), []);

  const showToast = useCallback((msg: string, undoable = false) => setToast({ msg, undo: undoable, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const run = useMemo(() => simulate(steps, testDate), [steps, testDate]);

  const issues = useMemo(() => {
    const out: Record<string, string> = {};
    const trig = steps[0];
    const t0 = trig?.type === 'schedule' ? trig.time : 20 * 60;
    for (const s of flatSteps(steps)) {
      if (s.disabled) continue;
      if (s.type === 'expr' || s.type === 'branch') {
        const r = check(s.expr, ctxFor(testDate, run.steps[s.id]?.at ?? t0));
        if (!r.ok) out[s.id] = 'Expression error';
      }
      if ((s.type === 'lights' || s.type === 'wifi' || s.type === 'plug') && s.deviceIds.length === 0) out[s.id] = 'No devices chosen';
      if (s.type === 'notify' && !s.recipients.length) out[s.id] = 'No recipients';
      if (s.type === 'notify' && s.recipients.length && !s.message.trim()) out[s.id] = 'Empty message';
      if (s.type === 'schedule' && s.days.length === 0) out[s.id] = 'No days chosen';
      if (s.type === 'schedule' && s !== steps[0]) out[s.id] = 'Trigger must be first';
    }
    return out;
  }, [steps, testDate, run]);
  const issueIds = Object.keys(issues);

  const selected = selectedId ? findStep(steps, selectedId) : null;
  const dirty = saved.steps !== steps;

  const onAction = useCallback(
    (id: string, a: CardAction) => {
      const f = findStep(steps, id);
      if (!f) return;
      if (a === 'delete') {
        commit((s) => removeStep(s, id));
        if (selectedId === id) setSelectedId(null);
        showToast(`Deleted “${stepTitle(f.step)}”`, true);
      } else if (a === 'duplicate') {
        const copy = cloneWithNewIds(f.step);
        commit((s) => insertAt(s, { parentId: f.parentId, arm: f.arm, index: f.index + 1 }, copy));
        setSelectedId(copy.id);
      } else if (a === 'toggle') {
        commit((s) => updateStep(s, id, { disabled: !f.step.disabled }));
      } else if (a === 'up' || a === 'down') {
        const list = listAt(steps, f.parentId, f.arm)!;
        const target = a === 'up' ? f.index - 1 : f.index + 2;
        if (target < (f.parentId === null ? 1 : 0) || target > list.length) return;
        commit((s) => moveStep(s, id, { parentId: f.parentId, arm: f.arm, index: target }));
      }
    },
    [steps, commit, selectedId, showToast],
  );

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSaved({ steps, at: clockNow() });
        showToast('Draft saved');
        return;
      }
      if (e.key === 'Escape') {
        if (palette) setPalette(null);
        else if (dialog) setDialog(null);
        else if (!typing) setSelectedId(null);
        return;
      }
      if (typing || !selectedId || view !== 'draft') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && steps[0]?.id !== selectedId) {
        e.preventDefault();
        onAction(selectedId, 'delete');
      } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        onAction(selectedId, e.key === 'ArrowUp' ? 'up' : 'down');
      } else if (!e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const flat = flatSteps(steps);
        const i = flat.findIndex((s) => s.id === selectedId);
        const n = flat[i + (e.key === 'ArrowUp' ? -1 : 1)];
        if (n) {
          e.preventDefault();
          setSelectedId(n.id);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [undo, redo, selectedId, steps, onAction, palette, dialog, view, showToast]);

  const insertStep = (type: StepType, variant?: string) => {
    if (!palette) return;
    const s = makeStep(type, variant);
    commit((list) => insertAt(list, palette.slot, s));
    setSelectedId(s.id);
    if (type === 'expr' || type === 'branch') setCodeOpen((c) => new Set(c).add(s.id));
    setPalette(null);
  };

  const toggleCode = (id: string) =>
    setCodeOpen((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const number = (() => {
    if (!selected) return null;
    if (selected.parentId === null) return String(selected.index + 1);
    const parent = findStep(steps, selected.parentId);
    return `${(parent?.index ?? 0) + 1}${selected.arm === 'then' ? 'a' : 'b'}.${selected.index + 1}`;
  })();

  const addableType: Device['type'] | null = selected && view === 'draft' ? (selected.step.type === 'lights' ? 'light' : selected.step.type === 'wifi' ? 'wifi' : selected.step.type === 'plug' ? 'plug' : null) : null;
  const selectedDeviceIds = selected && 'deviceIds' in selected.step ? selected.step.deviceIds : [];

  const trig = steps[0]?.type === 'schedule' ? steps[0] : null;
  const triggerText = trig ? `${describeDays(trig.days)} at ${fmtTime(trig.time)}` : 'No trigger';
  const all = flatSteps(steps);
  const deviceCount = new Set(all.flatMap((s) => ('deviceIds' in s ? s.deviceIds : []))).size;
  const notifyPeople = [...new Set(all.flatMap((s) => (s.type === 'notify' ? s.recipients : [])))];
  const viewingRoutine = routines.find((r) => r.id === view);

  return (
    <div className="app" onClick={() => palette && setPalette(null)}>
      <header className="topbar">
        <div className="brand">
          <span className="logo"><Icon name="home" size={15} stroke={2.4} /></span>
          Housewire
        </div>
        <nav className="crumbs">
          <span>Routines</span>
          <Icon name="chevronRight" size={12} />
          {viewingRoutine && view !== 'draft' ? (
            <>
              <b>{viewingRoutine.name}</b>
              {viewingRoutine.enabled ? <span className="tag tag-on">On</span> : <span className="tag">Off</span>}
            </>
          ) : (
            <>
              <b>{name || 'Untitled routine'}</b>
              {status === 'draft' ? <span className="tag tag-draft">Draft</span> : <span className="tag tag-on">Enabled</span>}
            </>
          )}
          <span className="savestate">{dirty ? 'Unsaved changes' : `Saved ${fmtTime(saved.at)}`}</span>
        </nav>
        <div className="top-actions">
          <button type="button" className="icon-btn" onClick={undo} disabled={!doc.past.length} title="Undo (⌘Z)" aria-label="Undo">
            <Icon name="undo" size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={redo} disabled={!doc.future.length} title="Redo (⇧⌘Z)" aria-label="Redo">
            <Icon name="redo" size={16} />
          </button>
          <span className="vsep" />
          <button
            type="button"
            className={`issues ${issueIds.length ? 'has' : 'none'}`}
            onClick={() => {
              if (issueIds.length) {
                setView('draft');
                setSelectedId(issueIds[0]);
              }
            }}
            title={issueIds.length ? issueIds.map((id) => `${stepTitle(findStep(steps, id)!.step)}: ${issues[id]}`).join('\n') : 'No problems found'}
          >
            <Icon name={issueIds.length ? 'alert' : 'check'} size={14} stroke={2.2} />
            {issueIds.length ? `${issueIds.length} issue${issueIds.length > 1 ? 's' : ''}` : 'Checks pass'}
          </button>
          <button type="button" className={`btn btn-ghost${dockOpen ? ' active' : ''}`} onClick={() => setDockOpen((o) => !o)}>
            <Icon name="flask" size={14} /> Dry run
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSaved({ steps, at: clockNow() });
              showToast(status === 'draft' ? 'Draft saved — only you can see it' : 'Changes saved');
            }}
          >
            <Icon name="save" size={14} /> {status === 'draft' ? 'Save draft' : 'Save'}
          </button>
          {status === 'draft' ? (
            <button type="button" className="btn btn-primary" onClick={() => setDialog('enable')}>
              <Icon name="power" size={14} /> Enable routine
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setStatus('draft');
                showToast('Routine turned off and moved back to drafts');
              }}
            >
              <Icon name="power" size={14} /> Turn off
            </button>
          )}
          <span className="me" title="Emeka Fairweather · admin">EF</span>
        </div>
      </header>

      <div className="main">
        <LeftRail
          routines={routines}
          draft={{ name, status, trigger: triggerText }}
          viewing={view}
          onOpen={(id) => setView(id)}
          onToggleRoutine={(id) => {
            const r = routines.find((x) => x.id === id)!;
            setRoutines((rs) => rs.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
            showToast(`${r.name} turned ${r.enabled ? 'off' : 'on'}`);
          }}
          addableType={addableType}
          selectedDeviceIds={selectedDeviceIds}
          onAddDevice={(devId) => selected && commit((s) => updateStep(s, selected.step.id, { deviceIds: [...selectedDeviceIds, devId] } as Partial<Step>))}
          testDate={testDate}
        />

        <main className="center">
          {view === 'draft' || !viewingRoutine ? (
            <div className="canvas" onClick={() => setSelectedId(null)}>
              <div className="canvas-head" onClick={(e) => e.stopPropagation()}>
                <input className="routine-name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Routine name" />
                <p className="routine-desc">Bedtimes have slipped since the clocks changed — wind the house down on school nights, give everyone a heads-up, and take the tablets offline.</p>
                <div className="stats">
                  <span className="stat"><Icon name="clock" size={13} /> {triggerText}</span>
                  <span className="stat"><Icon name="calendar" size={13} /> Skips school holidays</span>
                  <span className="stat"><Icon name="sliders" size={13} /> {steps.length} steps</span>
                  <span className="stat"><Icon name="bulb" size={13} /> {deviceCount} devices</span>
                  <span className="stat"><Icon name="bell" size={13} /> {notifyPeople.map((p) => personById(p).name).join(' & ') || 'No one'}</span>
                  <span className="grow" />
                  <button
                    type="button"
                    className="link"
                    onClick={() => setCodeOpen((c) => (c.size >= all.length ? new Set() : new Set(all.map((s) => s.id))))}
                  >
                    <Icon name="code" size={13} /> {codeOpen.size >= all.length ? 'Hide all code' : 'Show all code'}
                  </button>
                </div>
              </div>
              <Flow
                steps={steps}
                run={dockOpen ? run : null}
                selectedId={selectedId}
                codeOpen={codeOpen}
                issues={issues}
                onSelect={setSelectedId}
                onToggleCode={toggleCode}
                onMove={(id, slot) => commit((s) => moveStep(s, id, slot))}
                onInsert={(slot, rect) => setPalette({ slot, x: rect.left + rect.width / 2, y: rect.bottom + 6 })}
                onAction={onAction}
              />
              <div className="canvas-foot">Drag a card by its handle to reorder · <kbd>↑</kbd><kbd>↓</kbd> select · <kbd>⌥↑</kbd><kbd>⌥↓</kbd> move · <kbd>⌘Z</kbd> undo</div>
            </div>
          ) : (
            <RoutinePreview
              routine={viewingRoutine}
              onBack={() => setView('draft')}
              onToggle={() => {
                setRoutines((rs) => rs.map((x) => (x.id === viewingRoutine.id ? { ...x, enabled: !x.enabled } : x)));
                showToast(`${viewingRoutine.name} turned ${viewingRoutine.enabled ? 'off' : 'on'}`);
              }}
            />
          )}
          {view === 'draft' && (
            <DryRun
              steps={steps}
              run={run}
              date={testDate}
              open={dockOpen}
              onDate={(d) => {
                setTestDate(d);
                setDockOpen(true);
              }}
              onToggle={() => setDockOpen((o) => !o)}
              onSelectStep={(id) => setSelectedId(id)}
            />
          )}
        </main>

        {viewingRoutine && view !== 'draft' ? (
          <aside className="inspector overview">
            <div className="insp-head">
              <div className="insp-kicker">
                <span className="insp-icon"><Icon name={viewingRoutine.icon} size={15} /></span>
                <span>Routine details</span>
              </div>
              <div className="ov-title">{viewingRoutine.name}</div>
            </div>
            <div className="insp-body">
              <div className="kv-list">
                <div className="kv"><span>Status</span><b>{viewingRoutine.enabled ? 'On' : 'Off'}</b></div>
                <div className="kv"><span>Trigger</span><b>{viewingRoutine.trigger}</b></div>
                <div className="kv"><span>Steps</span><b>{viewingRoutine.steps.length + 1}</b></div>
                <div className="kv"><span>Last run</span><b>{viewingRoutine.lastRun} · completed</b></div>
                <div className="kv"><span>Edited by</span><b>Emeka</b></div>
              </div>
              <div className="hint">
                <Icon name="info" size={14} />
                <span>Ruth, Ada and Tobi see this routine in their app but can’t change it. Only admins can edit routines.</span>
              </div>
            </div>
          </aside>
        ) : (
        <Inspector
          step={view === 'draft' ? (selected?.step ?? null) : null}
          number={number}
          steps={steps}
          run={run}
          testDate={testDate}
          routineName={name}
          codeOpen={!!selected && codeOpen.has(selected.step.id)}
          onSetCode={(open) =>
            selected &&
            setCodeOpen((c) => {
              const n = new Set(c);
              if (open) n.add(selected.step.id);
              else n.delete(selected.step.id);
              return n;
            })
          }
          onChange={(patch, key) => selected && commit((s) => updateStep(s, selected.step.id, patch), key)}
          onReplace={(next) => commit((s) => replaceStep(s, next.id, next))}
          onAction={(a) => selected && onAction(selected.step.id, a)}
          onClose={() => setSelectedId(null)}
        />
        )}
      </div>

      {palette && <Palette x={palette.x} y={palette.y} slot={palette.slot} onPick={insertStep} onClose={() => setPalette(null)} />}

      {dialog === 'enable' && (
        <EnableDialog
          name={name}
          triggerText={triggerText}
          issues={issueIds.map((id) => `${stepTitle(findStep(steps, id)!.step)} — ${issues[id]}`)}
          deviceCount={deviceCount}
          notify={notifyPeople.map((p) => personById(p).name)}
          steps={steps}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            setStatus('enabled');
            setSaved({ steps, at: clockNow() });
            showToast(`${name} is on. First run tonight at ${trig ? fmtTime(trig.time) : '—'}.`);
          }}
        />
      )}

      {toast && (
        <div className="toast" key={toast.id} role="status">
          <Icon name="check" size={14} stroke={2.4} />
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              type="button"
              className="link"
              onClick={() => {
                undo();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Palette({ x, y, slot, onPick, onClose }: { x: number; y: number; slot: Slot; onPick: (t: StepType, v?: string) => void; onClose: () => void }) {
  const W = 300;
  const H = 440;
  const left = Math.min(Math.max(12, x - W / 2), window.innerWidth - W - 12);
  const top = y + H > window.innerHeight - 12 ? Math.max(12, y - H - 40) : y;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button.pal-item')?.focus();
  }, []);
  return (
    <div className="palette" style={{ left, top, width: W }} ref={ref} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add a step">
      <div className="pal-head">
        Add a step {slot.parentId ? <span className="muted">· inside {slot.arm === 'then' ? '“If true”' : '“Otherwise”'}</span> : null}
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={14} /></button>
      </div>
      {PALETTE.map((g) => (
        <div key={g.category} className={`pal-group cat-${g.category}`}>
          <div className="pal-cat">{CATEGORY_LABEL[g.category]}s</div>
          {g.items
            .filter((it) => !(slot.parentId && it.type === 'branch'))
            .map((it) => (
              <button type="button" key={it.label} className="pal-item" onClick={() => onPick(it.type, it.variant)}>
                <span className="pal-icon"><Icon name={it.variant === 'window' ? 'clock' : STEP_META[it.type].icon} size={14} /></span>
                <span>
                  <b>{it.label}</b>
                  <span className="pal-blurb">{it.blurb}</span>
                </span>
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}

function EnableDialog({ name, triggerText, issues, deviceCount, notify, steps, onCancel, onConfirm }: { name: string; triggerText: string; issues: string[]; deviceCount: number; notify: string[]; steps: Step[]; onCancel: () => void; onConfirm: () => void }) {
  const tonight = { ada: !!deviceById('phone-ada')?.on, tobi: !!deviceById('phone-tobi')?.on };
  const trig = steps[0]?.type === 'schedule' ? steps[0] : null;
  const wifi = [...new Set(flatSteps(steps).flatMap((s) => (s.type === 'wifi' && s.pause ? s.deviceIds : [])))];
  return (
    <div className="scrim" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title">Enable “{name}”?</h2>
        <p className="muted">It will run automatically for the whole household. Ruth, Ada and Tobi can see it in the app but can’t edit it.</p>
        <ul className="checklist">
          <li><Icon name="clock" size={14} /> <span>Runs <b>{triggerText}</b> — first run <b>tonight, {fmtDate(NOW.date)}{trig ? ` at ${fmtTime(trig.time)}` : ''}</b></span></li>
          <li><Icon name="calendar" size={14} /> <span>Skips the 6 dates on <b>School Holidays</b> — next is Wed, Nov 25</span></li>
          <li><Icon name="bulb" size={14} /> <span>Controls <b>{deviceCount} devices</b>{wifi.length ? `, pauses ${wifi.map((id) => deviceById(id)?.name).join(' & ')}` : ''}</span></li>
          <li><Icon name="bell" size={14} /> <span>Notifies <b>{notify.join(' & ') || 'no one'}</b></span></li>
          <li><Icon name="person" size={14} /> <span>Right now: Ada is {tonight.ada ? 'home' : 'away (swim practice)'}, Tobi is {tonight.tobi ? 'home' : 'away'}</span></li>
        </ul>
        {issues.length > 0 && (
          <div className="hint warn">
            <Icon name="alert" size={14} />
            <span>
              Fix {issues.length === 1 ? 'this' : 'these'} first:
              <br />
              {issues.map((i) => (
                <span key={i} className="block">{i}</span>
              ))}
            </span>
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Keep as draft</button>
          <button type="button" className="btn btn-primary" disabled={issues.length > 0} onClick={onConfirm} autoFocus>
            <Icon name="power" size={14} /> Enable
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutinePreview({ routine, onBack, onToggle }: { routine: (typeof ROUTINES)[number]; onBack: () => void; onToggle: () => void }) {
  return (
    <div className="canvas preview">
      <button type="button" className="link back" onClick={onBack}>
        <Icon name="chevronLeft" size={14} /> Back to School-Night Wind-Down draft
      </button>
      <div className="canvas-head">
        <div className="preview-title">
          <span className="r-icon big"><Icon name={routine.icon} size={18} /></span>
          <h1>{routine.name}</h1>
          <button type="button" className={`switch${routine.enabled ? ' on' : ''}`} role="switch" aria-checked={routine.enabled} onClick={onToggle} aria-label="Enabled">
            <i />
          </button>
          <span className="muted">{routine.enabled ? 'On' : 'Off'}</span>
        </div>
        <div className="stats">
          <span className="stat"><Icon name="clock" size={13} /> {routine.trigger}</span>
          <span className="stat"><Icon name="check" size={13} /> Last ran {routine.lastRun}</span>
          <span className="stat"><Icon name="sliders" size={13} /> {routine.steps.length + 1} steps</span>
        </div>
      </div>
      <div className="flow readonly">
        <div className="card cat-trigger">
          <div className="card-main">
            <div className="card-icon"><Icon name="clock" size={16} /><span className="card-num">1</span></div>
            <div className="card-body">
              <div className="card-kicker"><span className="kicker-cat">Trigger</span></div>
              <div className="card-title">{routine.trigger}</div>
            </div>
          </div>
        </div>
        {routine.steps.map((s, i) => {
          const cat = /^(Only|Skip)/.test(s) ? 'condition' : /^(Wait|At )/.test(s) ? 'flow' : 'action';
          return (
            <div key={i} className="flow-item">
              <div className="gap static"><span className="gap-line" /></div>
              <div className={`card cat-${cat}`}>
                <div className="card-main">
                  <div className="card-icon"><Icon name={cat === 'condition' ? 'code' : cat === 'flow' ? 'hourglass' : 'play'} size={15} /><span className="card-num">{i + 2}</span></div>
                  <div className="card-body">
                    <div className="card-kicker"><span className="kicker-cat">{CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL]}</span></div>
                    <div className="card-title">{s}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="muted small center-note">This routine is {routine.enabled ? 'running' : 'off'}. Open the draft to keep working on School-Night Wind-Down.</p>
    </div>
  );
}
