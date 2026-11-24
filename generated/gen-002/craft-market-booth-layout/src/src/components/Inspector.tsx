import { useState, type FormEvent } from 'react';
import { OUTLETS, TABLES_FIXED, TABLES_TOTAL } from '../data/venue';
import { feeFor, outletUsers, pointRectDistance } from '../lib/rules';
import type { Issue, Placement, Placements, Rect, Vendor } from '../lib/types';
import { CATEGORY_COLOR } from '../lib/colors';

interface Props {
  vendor: Vendor | null;
  vendors: Vendor[];
  placement: Placement | undefined;
  placements: Placements;
  issues: Issue[];
  onRect: (rect: Rect) => void;
  onRotate: () => void;
  onRemove: () => void;
  onPlace: () => void;
  onOutlet: (outlet: string | null) => void;
  onTables: (n: number) => void;
}

const wallName = { N: 'north', S: 'south', E: 'east', W: 'west' } as const;

export function Inspector(p: Props) {
  const { vendor, vendors, placement, placements, issues } = p;
  if (!vendor) {
    return (
      <div className="panel inspector empty-state">
        <h2>Booth details</h2>
        <p>Select a booth on the plan, or a vendor in the list, to move it, resize it, or assign an outlet.</p>
        <ul className="keys">
          <li><kbd>Drag</kbd> a booth to move it. Red means it would overlap something.</li>
          <li><kbd>Arrows</kbd> nudge 0.1 m (hold Shift for 1 m).</li>
          <li><kbd>R</kbd> rotates a gym booth. <kbd>Del</kbd> takes it off the floor.</li>
          <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> undo, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> redo.</li>
        </ul>
      </div>
    );
  }

  const isHall = vendor.size === 'hall';
  const tablesCommitted = vendors.reduce((s, v) => s + v.tables, 0) + TABLES_FIXED;

  return (
    <div className="panel inspector">
      <div className="insp-head">
        <span className="booth-no big">{vendor.boothNo}</span>
        <div>
          <h2>{vendor.name}</h2>
          <div className="insp-sub">
            <span className="swatch" style={{ background: CATEGORY_COLOR[vendor.category] }} /> {vendor.category}
            {vendor.lateNote && <span className="tag tag-warn">{vendor.lateNote}</span>}
          </div>
        </div>
      </div>

      <section>
        <h3>Booth</h3>
        {placement ? (
          <>
            <p className="line">
              On the floor at <b>{placement.x.toFixed(1)}, {placement.y.toFixed(1)} m</b> from the gym&rsquo;s north-west corner
              {isHall ? ' (hallway, west to east)' : ''}.
            </p>
            <div className="field-row">
              <label className="field">
                <span>Size</span>
                {isHall ? (
                  <span className="static">2 × 2 m hallway spot</span>
                ) : (
                  <select
                    value={placement.h === 2 ? '3x2' : '3x3'}
                    onChange={(e) => {
                      const h = e.target.value === '3x2' ? 2 : 3;
                      p.onRect({ x: placement.x, y: placement.y, w: 3, h });
                    }}
                  >
                    <option value="3x3">3 × 3 m</option>
                    <option value="3x2">3 × 2 m</option>
                  </select>
                )}
              </label>
              <span className="fee-note">
                Requested {vendor.size === 'hall' ? '2 m hallway' : vendor.size === '3x3' ? '3 × 3 m' : '3 × 2 m'}
                {(placement.w !== (vendor.size === 'hall' ? 2 : 3) || placement.h !== (vendor.size === 'hall' ? 2 : vendor.size === '3x2' ? 2 : 3)) && (
                  <b className="warn-text"> · changed</b>
                )}
              </span>
            </div>
            <form
              className="pos-form"
              key={`${vendor.id}-${placement.x}-${placement.y}`}
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const x = Number(fd.get('x'));
                const y = isHall ? 0 : Number(fd.get('y'));
                if (Number.isFinite(x) && Number.isFinite(y)) p.onRect({ x, y, w: placement.w, h: placement.h });
              }}
            >
              <label className="field small">
                <span>X (m)</span>
                <input name="x" type="number" step="0.1" min="0" defaultValue={placement.x.toFixed(1)} />
              </label>
              <label className="field small">
                <span>Y (m)</span>
                <input name="y" type="number" step="0.1" min="0" defaultValue={placement.y.toFixed(1)} disabled={isHall} />
              </label>
              <button className="ghost-btn" type="submit">Move</button>
            </form>
            <div className="btn-row">
              {!isHall && (
                <button className="ghost-btn" type="button" onClick={p.onRotate}>
                  Rotate (R)
                </button>
              )}
              <button className="ghost-btn danger" type="button" onClick={p.onRemove}>
                Take off floor (Del)
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="line warn-line">Not on the floor yet.</p>
            <button className="primary-btn" type="button" onClick={p.onPlace}>
              Find a spot for {vendor.boothNo}
            </button>
            <p className="hint">Looks for a legal space: no overlaps, and no exit or corridor blocked. Powered booths also need a free outlet within reach.</p>
          </>
        )}
      </section>

      {vendor.power && (
        <section>
          <h3>Power</h3>
          <label className="field">
            <span>Outlet</span>
            <select
              value={placement?.outlet ?? ''}
              disabled={!placement}
              onChange={(e) => p.onOutlet(e.target.value || null)}
            >
              <option value="">{placement ? 'No outlet' : 'Place the booth first'}</option>
              {OUTLETS.map((o) => {
                const users = outletUsers(placements).get(o.id) ?? [];
                const holder = users.find((id) => id !== vendor.id);
                const holderName = holder ? vendors.find((v) => v.id === holder)?.name : undefined;
                const dist = placement && !isHall ? pointRectDistance(o.x, o.y, placement) : null;
                const state = holderName ? `in use by ${holderName}` : 'free';
                return (
                  <option key={o.id} value={o.id}>
                    {`Outlet ${o.n} · ${wallName[o.wall]} wall · ${state}${dist !== null ? ` · ${dist.toFixed(1)} m away` : ''}`}
                  </option>
                );
              })}
            </select>
          </label>
          <p className="hint">
            Picking an outlet that is in use swaps the two booths. Outlets 5 and 6 share one 15 A circuit.
          </p>
          {placement && !placement.outlet && <p className="line warn-line">No outlet yet. This booth needs one.</p>}
        </section>
      )}

      <section>
        <h3>Tables</h3>
        <div className="stepper">
          <button type="button" onClick={() => p.onTables(vendor.tables - 1)} disabled={vendor.tables <= 0} aria-label="Fewer tables">
            −
          </button>
          <span>
            <b>{vendor.tables}</b> of 2 folding tables
          </span>
          <button type="button" onClick={() => p.onTables(vendor.tables + 1)} disabled={vendor.tables >= 2} aria-label="More tables">
            +
          </button>
        </div>
        <p className="hint">
          Market stock: {tablesCommitted} of {TABLES_TOTAL} committed (incl. {TABLES_FIXED} fixed).
        </p>
      </section>

      <section>
        <h3>Booth fee</h3>
        <p className="line">
          ${feeFor(vendor)} · {isHall ? 'hallway spot' : 'full booth'}
        </p>
      </section>

      {vendor.keepAway.length > 0 && (
        <section>
          <h3>Keep away</h3>
          <p className="line">
            Not next to{' '}
            {vendor.keepAway.map((id, i) => (
              <b key={id}>
                {i > 0 ? ', ' : ''}
                {vendors.find((v) => v.id === id)?.name ?? id}
              </b>
            ))}
            . Keep at least 2 m apart.
          </p>
        </section>
      )}

      <section>
        <h3>Vendor notes</h3>
        <p className="notes">{vendor.notes}</p>
      </section>

      <section>
        <h3>This booth</h3>
        {issues.length === 0 ? (
          <p className="line ok-line">No issues.</p>
        ) : (
          <ul className="issues compact">
            {issues.map((i) => (
              <li key={i.key} className={`issue issue-${i.level}`}>
                <span className="issue-icon">{i.level === 'error' ? '!' : i.level === 'caution' ? '?' : '+'}</span>
                <span>{i.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
