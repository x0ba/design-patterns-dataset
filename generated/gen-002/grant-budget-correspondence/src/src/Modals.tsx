import { useState, type ReactNode } from 'react';
import { CHARGE, CT_REASON, docs } from './data';
import type { CostTransfer } from './state';
import { kb, longDate, money } from './util';

function Modal({ title, sub, onClose, children, wide }: { title: string; sub?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <div className="muted small">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function DocModal({ id, onClose, costTransfer }: { id: string; onClose: () => void; costTransfer: CostTransfer | null }) {
  const d = docs[id];
  return (
    <Modal title={d.name} sub={`${d.source} · ${kb(d.sizeKB)}`} onClose={onClose} wide>
      <div className="paper">
        {id === 'cruise' && <CruisePlan />}
        {id === 'vlog' && <VesselLog />}
        {id === 'invoice' && <SummaryInvoice />}
        {id === 'receipt' && <Receipt />}
        {id === 'ct' && <CostTransferDoc ct={costTransfer} />}
        {id === 'rma' && <Rma />}
        {id === 'q3' && <Q3 />}
      </div>
    </Modal>
  );
}

function DocHead({ org, title }: { org: string; title: string }) {
  return (
    <div className="pd-head">
      <div className="pd-org">{org}</div>
      <div className="pd-title">{title}</div>
    </div>
  );
}

function CruisePlan() {
  return (
    <>
      <DocHead org="Larkin Cove Marine Station · Vessel Operations" title="Cruise Plan SL-26-14" />
      <table className="pd-kv">
        <tbody>
          <tr><th>Vessel</th><td>R/V Sea Lark (19.8 m / 65 ft), Dock B</td></tr>
          <tr><th>Chief scientist</th><td>Dr. Beatriz Amaral</td></tr>
          <tr><th>Award</th><td>NSF OCE-2291, Kelp forest recovery after marine heatwaves</td></tr>
          <tr><th>Dates</th><td>Wed Oct 7 – Sun Oct 11, 2026 (5 days). Weather days Oct 12–13</td></tr>
          <tr><th>Operations</th><td>Day cruises, returning to Larkin Cove each evening</td></tr>
        </tbody>
      </table>
      <h4>Objectives</h4>
      <ol>
        <li>Repeat kelp canopy and understory transects at the five permanent sites established in 2025.</li>
        <li>Purple urchin density counts and barren-extent mapping at Bell Rock and Larkin Reef South.</li>
        <li>Swap 10 bottom-temperature loggers deployed after the 2025 heatwave.</li>
      </ol>
      <h4>Daily plan</h4>
      <table className="pd-table">
        <thead><tr><th>Day</th><th>Sites</th><th>Work</th></tr></thead>
        <tbody>
          <tr><td>Oct 7</td><td>Larkin Reef N, Larkin Reef S</td><td>Transects 1–2</td></tr>
          <tr><td>Oct 8</td><td>Bell Rock, Larkin Reef S</td><td>Transect 3, barren mapping</td></tr>
          <tr><td>Oct 9</td><td>Point Sal kelp bed</td><td>Logger swap, fuel at Dock B before departure</td></tr>
          <tr><td>Oct 10</td><td>Bell Rock</td><td>Transect 4</td></tr>
          <tr><td>Oct 11</td><td>Cave Landing</td><td>Transect 5, demobilize</td></tr>
        </tbody>
      </table>
      <h4>Science party</h4>
      <p>B. Amaral (chief scientist), M. Fuentes, L. Brandt, O. Haddad (graduate students), A. Kealoha (research technician), S. Whitford (dive safety officer).</p>
      <h4>Ship time and costs</h4>
      <table className="pd-table">
        <thead><tr><th>Item</th><th>Basis</th><th className="num">Estimate</th><th>Object code</th></tr></thead>
        <tbody>
          <tr><td>Sea Lark day rate</td><td>5 days × $2,850 (FY27; excludes fuel)</td><td className="num">$14,250</td><td>54620 Vessel ops</td></tr>
          <tr className="mark"><td>Fuel</td><td>850–950 gal, billed at cost (Recharge schedule §4.2)</td><td className="num">$4,000–4,600</td><td>54620 Vessel ops</td></tr>
        </tbody>
      </table>
      <p className="pd-sign">Approved: W. Haldane, Boat Operations Coordinator, Sep 24, 2026</p>
    </>
  );
}

function VesselLog() {
  const rows = [
    ['Wed Oct 7', '07:05', '17:20', '8.3', 'Larkin Reef N/S', 'Transects 1–2. 6 divers.', ''],
    ['Thu Oct 8', '06:55', '17:40', '8.6', 'Bell Rock, Larkin Reef S', 'Transect 3, urchin barren mapping.', ''],
    ['Fri Oct 9', '07:30', '17:10', '7.9', 'Point Sal', '06:10 fuel delivery at Dock B, Pacific Marine Fuel truck: 889 gal, tanks 31% → 98%. Logger swap.', 'fuel'],
    ['Sat Oct 10', '07:00', '16:50', '7.8', 'Bell Rock', 'Transect 4. Ride-along: J. Park (Lindqvist lab), 2 sediment cores at Bell Rock, ~1.5 h.', 'ride'],
    ['Sun Oct 11', '07:10', '15:30', '7.4', 'Cave Landing', 'Transect 5. Demobilized 16:30.', ''],
  ];
  return (
    <>
      <DocHead org="R/V Sea Lark · Master’s Log (excerpt)" title="Cruise SL-26-14 · Oct 7–11, 2026" />
      <table className="pd-table log">
        <thead>
          <tr><th>Date</th><th>Depart</th><th>Return</th><th className="num">Eng. h</th><th>Area</th><th>Remarks</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className={r[6] === 'fuel' ? 'mark' : r[6] === 'ride' ? 'mark2' : ''}>
              <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td className="num">{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td>
            </tr>
          ))}
          <tr className="total"><td colSpan={3}>Total engine hours</td><td className="num">40.0</td><td colSpan={2}>Avg. burn ≈ 22 gal/h</td></tr>
        </tbody>
      </table>
      <p className="pd-sign">Master: K. Oyelaran · Excerpt certified by W. Haldane, Oct 31, 2026</p>
      <div className="pd-callouts">
        <div className="callout fuel">The Oct 9 delivery is the only fuel entry during the cruise, which matches invoice PMF-88213.</div>
        <div className="callout ride">The Oct 10 ride-along isn’t in the cruise plan. Ask Dr. Amaral whether any ship time should go to OCE-2307.</div>
      </div>
    </>
  );
}

function SummaryInvoice() {
  return (
    <>
      <DocHead org="Pacific Marine Fuel · 1420 Harbor Way, Morro Bay CA" title={`Invoice ${CHARGE.invoice}`} />
      <table className="pd-kv">
        <tbody>
          <tr><th>Date</th><td>10/09/2026</td></tr>
          <tr><th>Bill to</th><td>Larkin Cove Marine Station, Accounts Payable</td></tr>
          <tr><th>Terms</th><td>Net 30</td></tr>
        </tbody>
      </table>
      <table className="pd-table">
        <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Amount</th></tr></thead>
        <tbody>
          <tr><td>Fuel delivery – Dock B</td><td className="num">1</td><td className="num">{money(CHARGE.amount, true)}</td></tr>
          <tr className="total"><td colSpan={2}>Total due</td><td className="num">{money(CHARGE.amount, true)}</td></tr>
        </tbody>
      </table>
      <div className="pd-callouts">
        <div className="callout fuel">Missing what Greg needs: gallons, unit price, fees, and which vessel was fueled.</div>
      </div>
    </>
  );
}

function Receipt() {
  return (
    <>
      <DocHead org="Breakwater Dive & Rental · Larkin Cove" title="Rental receipt #BW-20431 (reprint)" />
      <table className="pd-table">
        <thead><tr><th>Item</th><th>Dates</th><th className="num">Amount</th></tr></thead>
        <tbody>
          <tr><td>Drysuit rental × 2</td><td>Oct 7–10, 2026</td><td className="num">$176.00</td></tr>
          <tr><td>Regulator set rental × 2</td><td>Oct 7–10, 2026</td><td className="num">$88.00</td></tr>
          <tr><td>Sales tax</td><td></td><td className="num">$22.00</td></tr>
          <tr className="total"><td colSpan={2}>Total, paid Visa ••4471</td><td className="num">$286.00</td></tr>
        </tbody>
      </table>
      <p className="pd-sign">Renter: Mateo Fuentes · Picked up Oct 7, returned Oct 10</p>
    </>
  );
}

function CostTransferDoc({ ct }: { ct: CostTransfer | null }) {
  return (
    <>
      <DocHead org="Sponsored Projects Accounting · Cost Transfer Request" title={ct?.id ?? 'CT-2291-0117'} />
      <table className="pd-kv">
        <tbody>
          <tr><th>Award</th><td>NSF OCE-2291</td></tr>
          <tr><th>Transaction</th><td>{CHARGE.invoice} · Pacific Marine Fuel · posted Oct 14, 2026</td></tr>
          <tr><th>Amount</th><td>{money(CHARGE.amount, true)}</td></tr>
          <tr><th>From</th><td>53110 Field supplies</td></tr>
          <tr><th>To</th><td>54620 Vessel operations</td></tr>
          <tr><th>Submitted</th><td>{ct ? longDate(ct.submittedAt) : '—'} by Teodora Ilic</td></tr>
        </tbody>
      </table>
      <h4>Justification</h4>
      <p>{ct?.reason ?? CT_REASON}</p>
    </>
  );
}

function Rma() {
  return (
    <>
      <DocHead org="Tidewater Scientific · Returns" title="Return Material Authorization 7731" />
      <table className="pd-kv">
        <tbody>
          <tr><th>Item</th><td>Underwater PAR sensor, S/N TQ-55102</td></tr>
          <tr><th>Reason</th><td>Housing seal failure, water intrusion at 12 m</td></tr>
          <tr><th>Original PO</th><td>4500918842, invoiced Sep 18, 2026 · $1,150.00</td></tr>
          <tr><th>Resolution</th><td>Credit to original PO on receipt and inspection</td></tr>
        </tbody>
      </table>
    </>
  );
}

function Q3() {
  return (
    <>
      <DocHead org="Sea Grant R/OA-31 · Dr. Chidi Okafor" title="Q3 budget table (through Sep 30, 2026)" />
      <table className="pd-table">
        <thead><tr><th>Category</th><th className="num">Budget</th><th className="num">Spent</th><th className="num">Remaining</th></tr></thead>
        <tbody>
          <tr><td>Salaries & fringe</td><td className="num">$228,000</td><td className="num">$151,200</td><td className="num">$76,800</td></tr>
          <tr><td>Supplies</td><td className="num">$61,500</td><td className="num">$38,940</td><td className="num">$22,560</td></tr>
          <tr><td>Travel</td><td className="num">$18,000</td><td className="num">$9,410</td><td className="num">$8,590</td></tr>
          <tr><td>Indirect costs</td><td className="num">$105,000</td><td className="num">$66,080</td><td className="num">$38,920</td></tr>
          <tr className="total"><td>Total</td><td className="num">$412,500</td><td className="num">$265,630</td><td className="num">$146,870</td></tr>
        </tbody>
      </table>
    </>
  );
}

export function CostTransferModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string, attach: boolean) => void }) {
  const [reason, setReason] = useState(CT_REASON);
  const [attach, setAttach] = useState(true);
  return (
    <Modal title="Cost transfer request" sub="Moves the charge to the correct object code on the same award" onClose={onClose}>
      <div className="ct-grid">
        <div className="ct-box">
          <div className="ct-k">From</div>
          <div className="ct-v">Field supplies</div>
          <div className="mono muted">OCE-2291 · 53110</div>
        </div>
        <div className="ct-arrow">→</div>
        <div className="ct-box good">
          <div className="ct-k">To</div>
          <div className="ct-v">Vessel operations</div>
          <div className="mono muted">OCE-2291 · 54620</div>
        </div>
      </div>
      <dl className="kv ct-kv">
        <dt>Transaction</dt>
        <dd>
          <span className="mono">{CHARGE.invoice}</span> · Pacific Marine Fuel · {money(CHARGE.amount, true)} (full amount)
        </dd>
        <dt>Original posting</dt>
        <dd>Oct 14, 2026 · 33 days ago, inside the 90-day window</dd>
        <dt>Budget effect</dt>
        <dd>Vessel ops remaining $44,050 → $39,737.40. Field supplies $16,290 → $20,602.60</dd>
      </dl>
      <label className="ct-label" htmlFor="ct-reason">
        Justification <span className="muted small">(goes to Sponsored Projects Accounting)</span>
      </label>
      <textarea id="ct-reason" className="ct-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={6} />
      <label className="ct-check">
        <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
        Attach to my reply to Greg Tanaka
      </label>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={reason.trim().length < 20} onClick={() => onSubmit(reason.trim(), attach)}>
          Submit cost transfer
        </button>
      </div>
    </Modal>
  );
}
