import { MARKET, TABLES_FIXED } from '../data/venue';
import { Plan } from './Plan';
import { outletById } from '../lib/rules';
import type { Issue, Placements, Vendor } from '../lib/types';

interface Props {
  draftName: string;
  placements: Placements;
  vendors: Vendor[];
  issues: Issue[];
  printedAt: string;
}

/** Hidden on screen; shown only by the browser's print dialog. */
export function PrintSheet({ draftName, placements, vendors, issues, printedAt }: Props) {
  const sorted = [...vendors].sort((a, b) => a.boothNo.localeCompare(b.boothNo, 'en', { numeric: true }));
  const remaining = issues.filter((i) => i.level !== 'todo');
  const notPlaced = issues.filter((i) => i.level === 'todo');
  const tables = vendors.reduce((s, v) => s + v.tables, 0) + TABLES_FIXED;
  const sizeLabel = (v: Vendor, p?: Placements[string]) => {
    if (!p) return v.size === 'hall' ? '2 × 2 m hall' : v.size === '3x3' ? '3 × 3 m' : '3 × 2 m';
    if (v.size === 'hall') return '2 × 2 m hall';
    return `${p.w} × ${p.h} m`;
  };

  return (
    <div className="print-sheet" aria-hidden="true">
      <header className="ps-head">
        <div>
          <h1>{MARKET.title}: booth setup plan</h1>
          <p>
            {MARKET.dateLabel} · {MARKET.venueLabel}
          </p>
        </div>
        <div className="ps-meta">
          <b>{draftName}</b>
          <span>Printed {printedAt}</span>
        </div>
      </header>

      <div className="ps-plan">
        <Plan idPrefix="print-plan" placements={placements} vendors={vendors} scale={15} readOnly />
        <p className="ps-key">
          Gym: exits and the 1.8 m north corridor stay clear. Stage on the east wall is off limits. Outlets 1 to 6 are on walls. Hallway booths sit on the north wall only.
        </p>
      </div>

      <table className="ps-table">
        <thead>
          <tr>
            <th>Booth</th>
            <th>Vendor</th>
            <th>Category</th>
            <th>Size</th>
            <th>Position (m)</th>
            <th>Outlet</th>
            <th>Tables</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => {
            const p = placements[v.id];
            const out = p?.outlet ? outletById(p.outlet) : undefined;
            return (
              <tr key={v.id} className={p ? '' : 'unplaced'}>
                <td>{v.boothNo}</td>
                <td>{v.name}</td>
                <td>{v.category}</td>
                <td>{sizeLabel(v, p)}</td>
                <td>{p ? `${p.x.toFixed(1)}, ${p.y.toFixed(1)}` : 'Not placed'}</td>
                <td>{v.power ? (out ? `Outlet ${out.n}` : 'None') : '—'}</td>
                <td>{v.tables}</td>
                <td>{v.notes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="ps-foot">
        Tables committed: {tables} of 44 (incl. {TABLES_FIXED} for the bake sale, raffle and entry).
      </p>
      {remaining.length > 0 && (
        <>
          <h2>Open issues</h2>
          <ul>
            {remaining.map((i) => (
              <li key={i.key}>{i.text}</li>
            ))}
          </ul>
        </>
      )}
      {notPlaced.length > 0 && (
        <>
          <h2>Not yet on the floor</h2>
          <ul>
            {notPlaced.map((i) => (
              <li key={i.key}>{i.text}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
