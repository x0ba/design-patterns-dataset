import { useEffect, useMemo, useRef } from 'react';
import { BY_METER, CONNECTIONS, CYCLE, BILLS_DUE } from './data';
import { Evaluation, billParts, fmt, money } from './logic';
import { State } from './store';
import { Lock } from './icons';

interface Props {
  state: State;
  evs: Record<string, Evaluation>;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LockDialog({ state, evs, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    cancelRef.current?.focus();
  }, []);

  const summary = useMemo(() => {
    let usage = 0;
    let cents = 0;
    let overBase = 0;
    const rows = CONNECTIONS.map((c) => {
      const u = evs[c.meter].usage ?? 0;
      const b = billParts(u);
      usage += u;
      cents += b.totalCents;
      if (b.over > 0) overBase++;
      return { c, u, cents: b.totalCents };
    });
    const top = [...rows].sort((a, b) => b.u - a.u).slice(0, 5);
    const notes = CONNECTIONS.filter((c) => state.entries[c.meter].resolution).map((c) => ({ c, r: state.entries[c.meter].resolution! }));
    return { usage, cents, overBase, top, notes };
  }, [evs, state.entries]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="lock-title" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <div className="dialog-inner">
        <h2 id="lock-title">
          <Lock width={26} height={26} /> Lock the {CYCLE.short} cycle?
        </h2>
        <p className="dialog-lead">
          This is the last look before bills are set. Last cycle, 3 typos were found only after bills had gone out — this time every reading has passed the checks.
        </p>

        <div className="sum-grid">
          <div className="sum">
            <span className="sum-label">Readings</span>
            <span className="sum-val mono">{CONNECTIONS.length}</span>
          </div>
          <div className="sum">
            <span className="sum-label">Total water used</span>
            <span className="sum-val mono">{fmt(summary.usage)} gal</span>
          </div>
          <div className="sum">
            <span className="sum-label">Total to bill</span>
            <span className="sum-val mono">{money(summary.cents)}</span>
          </div>
          <div className="sum">
            <span className="sum-label">Above the 3,000 gal base</span>
            <span className="sum-val mono">{summary.overBase} of {CONNECTIONS.length}</span>
          </div>
        </div>

        <div className="dialog-cols">
          <div>
            <h3>Five highest use this cycle</h3>
            <table className="mini">
              <tbody>
                {summary.top.map(({ c, u, cents }) => (
                  <tr key={c.meter}>
                    <td>
                      <span className="mono">{c.meter}</span> {c.member}
                    </td>
                    <td className="mono r">{fmt(u)} gal</td>
                    <td className="mono r">{money(cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3>Your notes on file ({summary.notes.length})</h3>
            <ul className="notes">
              {summary.notes.map(({ c, r }) => (
                <li key={c.meter}>
                  <b>{c.member.split(',')[0]}</b> <span className="mono">{BY_METER[c.meter].meter}</span> — {r.note}
                </li>
              ))}
              {summary.notes.length === 0 && <li>No notes.</li>}
            </ul>
          </div>
        </div>

        <p className="dialog-warn">
          After locking, readings can’t be edited and the bills are ready to go out by <b>{BILLS_DUE.label}</b>. You can reopen the cycle if you must, but bills would go back to draft.
        </p>

        <div className="dialog-actions">
          <button ref={cancelRef} className="btn btn--big" onClick={onCancel}>
            Not yet — go back
          </button>
          <button className="btn btn--big btn--lock" onClick={onConfirm}>
            <Lock width={20} height={20} /> Lock cycle
          </button>
        </div>
      </div>
    </dialog>
  );
}
