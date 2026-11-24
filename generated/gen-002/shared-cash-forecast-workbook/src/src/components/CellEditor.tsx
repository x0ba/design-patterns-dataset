import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { FLOOR, NOTE_REQUIRED_OVER, lineById } from '../data';
import { useApp } from '../ctx';
import { balances, fmtDeltaK, fmtK, fmtM, weekLabel } from '../model';

export function CellEditor({ lineId, week, container }: { lineId: string; week: number; container: RefObject<HTMLDivElement | null> }) {
  const { s, dispatch, now } = useApp();
  const cur = s.values[lineId][week];
  const [raw, setRaw] = useState(String(cur));
  const [note, setNote] = useState('');
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const [tried, setTried] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const el = container.current?.querySelector(`[data-key="${lineId}:${week}"]`) as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 320;
    let left = r.left + r.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 380));
    const above = r.bottom + 340 > window.innerHeight;
    setPos({ left, top: above ? r.top - 6 : r.bottom + 6, above });
    input.current?.focus();
    input.current?.select();
  }, [container, lineId, week]);

  const parsed = useMemo(() => {
    const t = raw.replace(/[,\s$]/g, '');
    const neg = /^\(.*\)$/.test(t);
    const n = Number(t.replace(/[()]/g, ''));
    if (!t || Number.isNaN(n)) return null;
    return Math.round(neg ? -Math.abs(n) : n);
  }, [raw]);

  const preview = useMemo(() => {
    if (parsed == null) return null;
    const vals = { ...s.values, [lineId]: s.values[lineId].map((v, w) => (w === week ? parsed : v)) };
    const before = balances(s.values).end;
    const after = balances(vals).end;
    const lowB = Math.min(...before);
    const lowA = Math.min(...after);
    return { before, after, lowB, lowA, lowWA: after.indexOf(lowA) };
  }, [parsed, s.values, lineId, week]);

  const d = parsed == null ? 0 : parsed - cur;
  const needNote = Math.abs(d) >= NOTE_REQUIRED_OVER;
  const valid = parsed != null && (!needNote || note.trim().length >= 6);

  const save = () => {
    setTried(true);
    if (!valid || parsed == null) return;
    dispatch({ type: 'edit', by: 'helen', lineId, week, value: parsed, note, at: now() });
    if (parsed !== cur) dispatch({ type: 'toast', text: `Saved ${lineById[lineId].name}, wk ${week + 1}: ${fmtDeltaK(d)}` });
  };
  const cancel = () => dispatch({ type: 'startEdit', cell: null });

  if (!pos) return null;
  return (
    <>
      <div className="scrim-clear" onClick={cancel} />
      <div
        className="editor"
        style={{ left: pos.left, top: pos.top, transform: pos.above ? 'translateY(-100%)' : undefined }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel();
          if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement && e.shiftKey)) {
            e.preventDefault();
            save();
          }
        }}
      >
        <div className="ed-head">
          <b>{lineById[lineId].name}</b>
          <span className="muted">{weekLabel(week)}</span>
        </div>
        <label className="ed-row">
          <span>Amount ($000s)</span>
          <input ref={input} value={raw} onChange={(e) => setRaw(e.target.value)} inputMode="numeric" className="num-input" />
        </label>
        <div className="ed-delta muted">
          Was {fmtK(cur)}{parsed != null && d !== 0 && <> · change <b className={d < 0 ? 'neg' : 'pos'}>{fmtDeltaK(d)}</b></>}
          {parsed != null && parsed > 0 && <span> · positive = draw from pool into operating</span>}
        </div>
        <label className="ed-row col">
          <span>
            Note {needNote ? <b className="req">required for changes ≥ $500K</b> : <span className="muted">(optional)</span>}
          </span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this changing? Others will see it in the history."
            className={tried && needNote && note.trim().length < 6 ? 'err' : ''}
          />
        </label>
        {preview && d !== 0 && (
          <div className="ed-impact">
            <div>
              Wk {week + 1} ending: {fmtM(preview.before[week])} → <b className={preview.after[week] < FLOOR ? 'neg' : 'pos'}>{fmtM(preview.after[week])}</b>
            </div>
            <div>
              Low point: {fmtM(preview.lowB)} → <b className={preview.lowA < FLOOR ? 'neg' : 'pos'}>{fmtM(preview.lowA)}</b> (wk {preview.lowWA + 1})
            </div>
          </div>
        )}
        <div className="ed-actions">
          <span className="muted small">Enter to save · Esc to cancel</span>
          <button className="btn" onClick={cancel}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={parsed == null}>Save</button>
        </div>
      </div>
    </>
  );
}
