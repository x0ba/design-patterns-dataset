import { Dispatch, useMemo } from 'react';
import { BILLS_DUE, CONNECTIONS, CYCLE, RATES, ROUTES } from './data';
import { Evaluation, billParts, fmt, money } from './logic';
import { Action, State } from './store';
import { Check, Download, Lock, Printer, Warn } from './icons';

interface Props {
  state: State;
  evs: Record<string, Evaluation>;
  dispatch: Dispatch<Action>;
  onBack: () => void;
}

export default function BillsView({ state, evs, dispatch, onBack }: Props) {
  const locked = state.locked;

  const { rows, totals } = useMemo(() => {
    let usage = 0;
    let cents = 0;
    let ready = 0;
    const rows = CONNECTIONS.map((c) => {
      const ev = evs[c.meter];
      const ok = ev.usage != null;
      const b = ok ? billParts(ev.usage!) : null;
      if (ok) {
        usage += ev.usage!;
        cents += b!.totalCents;
        ready++;
      }
      return { c, ev, b };
    });
    return { rows, totals: { usage, cents, ready } };
  }, [evs]);

  const exportCsv = () => {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [['Meter', 'Member', 'Route', 'Gallons used', 'Base charge', 'Gallons over 3000', 'Overage charge', 'Total due', 'Note'].join(',')];
    for (const { c, ev, b } of rows) {
      if (!b) continue;
      const note = state.entries[c.meter].resolution?.note ?? '';
      lines.push([c.meter, q(c.member), q(ROUTES[c.route].name), ev.usage, (b.baseCents / 100).toFixed(2), b.over, (b.overCents / 100).toFixed(2), (b.totalCents / 100).toFixed(2), q(note)].join(','));
    }
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellshare-bills-${CYCLE.end.replace(' ', '').toLowerCase()}-2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1>Member bills</h1>
          <p className="page-sub">
            Billing cycle <b>{CYCLE.label}</b> · ${(RATES.baseCents / 100).toFixed(2)} base covers the first {fmt(RATES.includedGal)} gal, then ${(RATES.perThousandCents / 100).toFixed(2)} per 1,000 gal
          </p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={exportCsv} disabled={!locked}>
            <Download width={20} height={20} /> Download CSV
          </button>
          <button className="btn" onClick={() => window.print()} disabled={!locked}>
            <Printer width={20} height={20} /> Print list
          </button>
        </div>
      </div>

      {locked ? (
        <div className="banner banner--locked" role="status">
          <Lock width={22} height={22} />
          <div>
            <b>Locked {state.lockedOn}. These bills are final.</b> They’re ready to go out by {BILLS_DUE.label}.
          </div>
          <button
            className="btn"
            onClick={() => {
              if (window.confirm('Reopen the cycle for changes? Bills will go back to draft until you lock it again.')) {
                dispatch({ type: 'unlock' });
                onBack();
              }
            }}
          >
            Reopen cycle
          </button>
        </div>
      ) : (
        <div className="banner banner--draft" role="status">
          <Warn width={22} height={22} />
          <div>
            <b>Draft — not final.</b> {totals.ready} of {CONNECTIONS.length} bills can be calculated so far. Amounts can still change until the cycle is locked.
          </div>
          <button className="btn" onClick={onBack}>
            Back to readings
          </button>
        </div>
      )}

      <section className="sheet sheet--bills">
        <div className="scroller">
          <table className="grid grid--bills">
            <thead>
              <tr>
                <th className="c-meter">Meter</th>
                <th className="c-member">Member</th>
                <th className="c-num">Gallons used</th>
                <th className="c-num">Base charge</th>
                <th className="c-num">Gallons over 3,000</th>
                <th className="c-num">Overage charge</th>
                <th className="c-num c-total">Total due</th>
                <th className="c-check">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, ev, b }) => (
                <tr key={c.meter} className="row">
                  <td className="c-meter">
                    <span className="meter-id mono">{c.meter}</span>
                    <span className="line-no">{ROUTES[c.route].name}</span>
                  </td>
                  <td className="c-member">
                    <span className="member">{c.member}</span>
                    {c.status !== 'active' && (
                      <span className="tags">
                        <span className={`tag tag--${c.status}`}>{c.status === 'vacant' ? 'Vacant' : 'Seasonal'}</span>
                      </span>
                    )}
                  </td>
                  <td className="c-num mono">{b ? fmt(ev.usage!) : '—'}</td>
                  <td className="c-num mono">{b ? money(b.baseCents) : '—'}</td>
                  <td className="c-num mono">{b ? (b.over ? fmt(b.over) : '0') : '—'}</td>
                  <td className="c-num mono">{b ? money(b.overCents) : '—'}</td>
                  <td className="c-num mono c-total">{b ? money(b.totalCents) : '—'}</td>
                  <td className="c-check">
                    {!b ? (
                      <span className="check check--empty">{ev.entered ? 'Needs a fix' : 'No reading yet'}</span>
                    ) : ev.open ? (
                      <span className="check check--warn">
                        <Warn width={18} height={18} /> Flagged
                      </span>
                    ) : locked ? (
                      <span className="check check--ok">
                        <Check width={18} height={18} /> Final
                      </span>
                    ) : (
                      <span className="check check--draft">Draft</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  Total, {totals.ready} bills
                </td>
                <td className="c-num mono">{fmt(totals.usage)}</td>
                <td colSpan={3}></td>
                <td className="c-num mono c-total">{money(totals.cents)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
