import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Grid3x3, Magnet, Maximize, ShieldAlert, ZoomIn, ZoomOut } from 'lucide-react';
import Canvas from './components/Canvas';
import ExportDialog from './components/ExportDialog';
import { FONT_META, boxOf } from './geometry';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import TopBar from './components/TopBar';
import { Modal, NumberField, Segmented } from './components/ui';
import type { ViewMode } from './components/ElementArt';
import { clearBarPatch, fmt, materials, runChecks, type Check } from './model';
import { nov12, workingDoc } from './seed';
import { reducer, type State } from './store';
import type { Doc, El, FontId, Version } from './types';

const KEY = 'gildmark:hollis-daughter-front-window:v2';

interface Saved { doc: Doc; versions: Version[]; manual: Record<string, boolean>; exported: boolean }

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (!Array.isArray(s.doc?.elements) || !s.doc.finishes || !Array.isArray(s.versions)) return null;
    return s;
  } catch {
    return null;
  }
}

const uid = () => Math.random().toString(36).slice(2, 8);

export default function App() {
  const saved = useMemo(load, []);
  const [state, dispatch] = useReducer(reducer, null, (): State => ({
    doc: saved?.doc ?? workingDoc,
    selected: 'script',
    past: [],
    future: [],
    gesture: null,
    lastKey: '',
    lastTime: 0,
  }));
  const [versions, setVersions] = useState<Version[]>(saved?.versions ?? [nov12]);
  const [manual, setManual] = useState<Record<string, boolean>>(saved?.manual ?? {});
  const [exported, setExported] = useState(saved?.exported ?? false);
  const [view, setView] = useState<ViewMode>('glass');
  const [grid, setGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [keepout, setKeepout] = useState(true);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [zoomMul, setZoomMul] = useState(1);
  const [scale, setScale] = useState({ scale: 8, fit: 8 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<null | 'export' | 'add' | 'save' | { restore: Version }>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState('Autosaved');
  const toastTimer = useRef<number | undefined>(undefined);

  const { doc, selected } = state;
  const checks = useMemo(() => runChecks(doc), [doc]);
  const mats = useMemo(() => materials(doc), [doc]);
  const sel = doc.elements.find((e) => e.id === selected) ?? null;
  const errors = checks.filter((c) => c.level === 'error').length;
  const warns = checks.filter((c) => c.level === 'warn').length;
  const compare = versions.find((v) => v.id === compareId) ?? null;

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }, []);

  // autosave
  useEffect(() => {
    if (state.gesture) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify({ doc, versions, manual, exported } satisfies Saved));
        setSavedAt('Autosaved just now');
      } catch {
        setSavedAt('Not saved (storage full)');
      }
    }, 400);
    setSavedAt('Saving…');
    return () => window.clearTimeout(t);
  }, [doc, versions, manual, exported, state.gesture]);

  const edit = useCallback((id: string, patch: Partial<El>, key: string) => dispatch({ t: 'edit', id, patch, key }), []);
  const fixBar = useCallback(
    (c: Check) => {
      if (!c.elementId) return;
      const patch = clearBarPatch(doc, c.elementId);
      if (patch) {
        edit(c.elementId, patch, `${c.elementId}:fix`);
        dispatch({ t: 'select', id: c.elementId });
        const el = doc.elements.find((e) => e.id === c.elementId)!;
        say(`${el.name} moved clear of the push bar (${fmt(el.y)} → ${fmt(patch.y!)} in).`);
      }
    },
    [doc, edit, say],
  );

  const remove = useCallback((id: string) => {
    const el = doc.elements.find((e) => e.id === id);
    dispatch({ t: 'remove', id });
    if (el) say(`Deleted “${el.name}”. Undo with ⌘Z.`);
  }, [doc, say]);
  const duplicate = useCallback((id: string) => dispatch({ t: 'duplicate', id, newId: uid() }), []);

  // keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') || dialog) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        dispatch({ t: e.shiftKey ? 'redo' : 'undo' });
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ t: 'redo' });
      } else if (mod && e.key.toLowerCase() === 'd' && sel) {
        e.preventDefault();
        duplicate(sel.id);
      } else if (e.key === 'Escape') dispatch({ t: 'select', id: null });
      else if (sel && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        remove(sel.id);
      } else if (sel && !sel.locked && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : e.altKey ? 0.0625 : 0.25;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0;
        edit(sel.id, { x: Math.round((sel.x + dx) * 10000) / 10000, y: Math.round((sel.y + dy) * 10000) / 10000 }, `${sel.id}:nudge`);
      } else if (sel && (e.key === '=' || e.key === '+' || e.key === '-')) {
        const d = e.key === '-' ? -0.25 : 0.25;
        edit(sel.id, { cap: Math.max(0.5, Math.round((sel.cap + d) * 100) / 100) }, `${sel.id}:cap`);
      } else if (e.key.toLowerCase() === 'g' && !mod) setGrid((v) => !v);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [sel, dialog, duplicate, remove, edit]);

  const saveVersion = (label: string, note: string) => {
    const v: Version = { id: uid(), label: label || 'Saved version', date: 'Nov 16', note: note || 'Saved from the working copy', doc };
    setVersions((vs) => [v, ...vs]);
    setCompareId(v.id);
    setDialog(null);
    say(`Saved “${v.label}”. It's in Versions for comparing later.`);
  };

  const onZoomWheel = useCallback((d: 1 | -1) => setZoomMul((z) => Math.min(5, Math.max(0.5, d > 0 ? z * 1.15 : z / 1.15))), []);
  const onScale = useCallback((s: number, f: number) => setScale({ scale: s, fit: f }), []);
  const onCursor = useCallback((c: { x: number; y: number } | null) => setCursor(c), []);
  const onSelect = useCallback((id: string | null) => dispatch({ t: 'select', id }), []);
  const onBegin = useCallback(() => dispatch({ t: 'begin' }), []);
  const onLive = useCallback((id: string, patch: Partial<El>) => dispatch({ t: 'live', id, patch }), []);
  const onEnd = useCallback(() => dispatch({ t: 'end' }), []);

  return (
    <div className="app">
      <TopBar
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        onUndo={() => dispatch({ t: 'undo' })}
        onRedo={() => dispatch({ t: 'redo' })}
        compareOn={!!compare}
        onCompare={() => setCompareId(compare ? null : 'nov12')}
        onExport={() => setDialog('export')}
        onSaveVersion={() => setDialog('save')}
        saved={savedAt}
        issues={errors}
      />
      <LeftPanel
        doc={doc}
        selected={selected}
        checks={checks}
        versions={versions}
        compareId={compareId}
        onSelect={(id) => dispatch({ t: 'select', id })}
        onToggle={(id, patch) => edit(id, patch, `${id}:toggle${Object.keys(patch)[0]}`)}
        onAdd={() => setDialog('add')}
        onFix={fixBar}
        onCompare={setCompareId}
        onSaveVersion={() => setDialog('save')}
        onRestore={(v) => setDialog({ restore: v })}
      />
      <main className="stage" aria-label="Window layout">
        <div className="stage-tools top">
          <Segmented<ViewMode>
            small
            ariaLabel="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'glass', label: 'Glass preview' },
              { value: 'pattern', label: 'Pattern' },
            ]}
          />
          <div className="tool-group">
            <button className={`tool${grid ? ' on' : ''}`} aria-pressed={grid} onClick={() => setGrid(!grid)} title="Inch grid (G)"><Grid3x3 size={15} /> Grid</button>
            <button className={`tool${snap ? ' on' : ''}`} aria-pressed={snap} onClick={() => setSnap(!snap)} title="Snap to edges, centre and keep-out (hold Alt to bypass)"><Magnet size={15} /> Snap</button>
            <button className={`tool${keepout ? ' on' : ''}`} aria-pressed={keepout} onClick={() => setKeepout(!keepout)} title="Show push-bar keep-out"><ShieldAlert size={15} /> Keep-out</button>
          </div>
        </div>
        {compare && (
          <div className="compare-pill">
            <i /> Overlay: {compare.label} · {compare.date}
            <button className="link" onClick={() => setCompareId(null)}>Hide</button>
          </div>
        )}
        <Canvas
          doc={doc}
          selected={selected}
          view={view}
          grid={grid}
          snap={snap}
          keepout={keepout}
          ghost={compare?.doc ?? null}
          zoomMul={zoomMul}
          onScale={onScale}
          onSelect={onSelect}
          onBegin={onBegin}
          onLive={onLive}
          onEnd={onEnd}
          onCursor={onCursor}
          onZoomWheel={onZoomWheel}
        />
        <div className="stage-tools zoom">
          <button className="icon-btn" aria-label="Zoom out" onClick={() => setZoomMul((z) => Math.max(0.5, z / 1.25))}><ZoomOut size={16} /></button>
          <button className="zoom-val mono" onClick={() => setZoomMul(1)} title="Zoom relative to fit-to-screen. Click to reset.">{Math.round(zoomMul * 100)}%</button>
          <button className="icon-btn" aria-label="Zoom in" onClick={() => setZoomMul((z) => Math.min(5, z * 1.25))}><ZoomIn size={16} /></button>
          <button className="icon-btn" aria-label="Fit window to screen" title="Fit" onClick={() => setZoomMul(1)}><Maximize size={16} /></button>
        </div>
        <div className="stage-hint">
          Drag to move · corner handles resize · arrow keys nudge ¼″ (⇧ 1″) · ⌘Z undo
        </div>
      </main>
      <RightPanel
        doc={doc}
        selected={sel}
        checks={checks}
        compare={compare}
        exported={exported}
        manual={manual}
        onManual={(k, v) => setManual((m) => ({ ...m, [k]: v }))}
        onEdit={edit}
        onFinishes={(patch, key) => dispatch({ t: 'finishes', patch, key: `fin:${key}` })}
        onDuplicate={duplicate}
        onRemove={remove}
        onSelect={(id) => dispatch({ t: 'select', id })}
      />
      <footer className="statusbar">
        <span className="mono cursor">
          {cursor ? `X ${fmt(Math.max(0, cursor.x), 1)}″  Y ${fmt(cursor.y, 1)}″ from floor` : sel ? `${sel.name}: X ${fmt(sel.x)}″  Y ${fmt(sel.y)}″` : 'Window 72 × 84″'}
        </span>
        <span className="sep" />
        <span>Glass from 6″ · push bar 38–42″</span>
        <span className="grow" />
        <span className={`stat${mats.leaves > 25 ? ' warn' : ''}`}>
          Leaf ≈ <b className="mono">{fmt(mats.leafSqFt, 1)} sq ft</b> · {mats.leaves} leaves · {mats.books} {mats.books === 1 ? 'book' : 'books'}
        </span>
        <span className="sep" />
        <span className={`stat ${errors ? 'error' : warns ? 'warn' : 'ok'}`}>
          {errors || warns ? `${errors ? `${errors} error${errors > 1 ? 's' : ''}` : ''}${errors && warns ? ' · ' : ''}${warns ? `${warns} warning${warns > 1 ? 's' : ''}` : ''}` : 'Layout clear'}
        </span>
      </footer>

      {dialog === 'export' && (
        <ExportDialog
          doc={doc}
          checks={checks}
          onClose={() => setDialog(null)}
          onFix={(id) => dispatch({ t: 'select', id })}
          onExported={(file) => {
            setExported(true);
            setDialog(null);
            say(`Pattern saved as ${file}`);
          }}
        />
      )}
      {dialog === 'add' && (
        <AddDialog
          onClose={() => setDialog(null)}
          onAdd={(el) => {
            dispatch({ t: 'add', el });
            setDialog(null);
          }}
        />
      )}
      {dialog === 'save' && <SaveDialog onClose={() => setDialog(null)} onSave={saveVersion} />}
      {typeof dialog === 'object' && dialog && 'restore' in dialog && (
        <Modal
          title={`Restore ${dialog.restore.label}?`}
          width={460}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDialog(null)}>Keep working copy</button>
              <button
                className="btn primary"
                onClick={() => {
                  dispatch({ t: 'restore', doc: dialog.restore.doc });
                  say(`Restored ${dialog.restore.label} (${dialog.restore.date}). Undo with ⌘Z to get your working copy back.`);
                  setDialog(null);
                }}
              >
                Replace working copy
              </button>
            </>
          }
        >
          <p className="modal-p">The working copy will be replaced by the {dialog.restore.date} layout. Your current work stays on the undo stack, so ⌘Z brings it back.</p>
        </Modal>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function SaveDialog({ onClose, onSave }: { onClose: () => void; onSave: (label: string, note: string) => void }) {
  const [label, setLabel] = useState('Proposal v2 · script enlarged');
  const [note, setNote] = useState('');
  return (
    <Modal
      title="Save version"
      width={460}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!label.trim()} onClick={() => onSave(label.trim(), note.trim())}>Save version</button>
        </>
      }
    >
      <p className="modal-p">Keeps a snapshot of today's layout, so you can lay it over the working copy later.</p>
      <label className="field-label" htmlFor="v-label">Name</label>
      <input id="v-label" className="text-line" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      <label className="field-label" htmlFor="v-note">Note (optional)</label>
      <input id="v-note" className="text-line" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed, or who saw it" />
    </Modal>
  );
}

function AddDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (el: El) => void }) {
  const [text, setText] = useState('');
  const [font, setFont] = useState<FontId>('barlow');
  const [cap, setCap] = useState(2);
  const submit = () => {
    if (!text.trim()) return;
    onAdd({
      id: uid(), name: text.trim().slice(0, 24), kind: 'text', lines: [text.trim()], font, cap, arc: 0, wd: 1, tracking: font === 'barlow' || font === 'oswald' ? 0.08 : 0,
      leading: 1.8, x: 36, y: 30, fill: 'enamel', outline: { on: false, w: 0.05 }, shade: { on: false, dist: 0.1, angle: 315 }, visible: true, locked: false,
    });
  };
  return (
    <Modal
      title="Add lettering line"
      width={460}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!text.trim()} onClick={submit}>Add to window</button>
        </>
      }
    >
      <label className="field-label" htmlFor="a-text">Wording</label>
      <input id="a-text" className="text-line" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="e.g. Sourdough · Rye · Morning buns" autoFocus />
      <label className="field-label" htmlFor="a-font">Typeface</label>
      <select id="a-font" className="select" value={font} onChange={(e) => setFont(e.target.value as FontId)}>
        {(Object.keys(FONT_META) as FontId[]).map((f) => <option key={f} value={f}>{FONT_META[f].label} — {FONT_META[f].sub}</option>)}
      </select>
      <div style={{ marginTop: 12 }}>
        <NumberField label="Cap height" unit="in" value={cap} step={0.25} min={0.5} max={30} onChange={setCap} />
      </div>
    </Modal>
  );
}

export { boxOf };
