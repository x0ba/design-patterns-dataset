import { useState } from 'react';
import { CAPACITY, REQUESTS, VENUE_DEPOSIT, PROCESSING_RATE, SEAT_PRICE, type Request } from '../data';
import {
  cardExpiresBeforeDinner,
  fmtDateTime,
  money,
  PRIORITY_ORDER,
  seatsFor,
  totalsFor,
  waitlistIds,
} from '../logic';
import { Badge, CardLabel, DietaryChip, Modal } from '../ui';
import type { PageProps } from '../App';

interface Acks {
  charge: boolean;
  deposit: boolean;
  reversal: boolean;
  menu: boolean;
}

const EMPTY_ACKS: Acks = { charge: false, deposit: false, reversal: false, menu: false };

export function ReviewPage({ state, dispatch, now, go }: PageProps) {
  const confirmed = state.confirmedAt !== null;
  const [acks, setAcks] = useState<Acks>(EMPTY_ACKS);
  const [modal, setModal] = useState(false);

  const picked: Request[] = PRIORITY_ORDER.filter((r) => state.selected.includes(r.id));
  const seats = seatsFor(state.selected);
  const totals = totalsFor(seats, picked.length);
  const open = CAPACITY - seats;
  const conflicts = picked.filter((r) => r.dietary?.conflict);
  const expiring = picked.filter((r) => cardExpiresBeforeDinner(r.card.expiry));
  const waitIds = new Set(waitlistIds(state));
  const waitlisted = waitIds.size;
  const waitlistSeats = REQUESTS.filter((r) => waitIds.has(r.id)).reduce((s, r) => s + r.partySize, 0);

  if (confirmed) {
    return (
      <div className="page">
        <section className="panel banner-ok">
          <div>
            <div className="eyebrow">Confirmed {fmtDateTime(state.confirmedAt!)}</div>
            <h2 className="panel-title">{totals.seats} seats in {totals.charges} charges</h2>
            <p className="muted">
              {money(totals.amount)} charged to guest cards. {money(VENUE_DEPOSIT)} deposit paid to the venue.
              The list is locked here; reversals and refunds happen on Charges & waitlist.
            </p>
          </div>
          <button className="btn primary" onClick={() => go('charges')}>Open charges</button>
        </section>
        <GuestTable picked={picked} />
      </div>
    );
  }

  const ackOk = acks.charge && acks.deposit && acks.reversal && (conflicts.length === 0 || acks.menu);
  const canConfirm = seats > 0 && ackOk;

  return (
    <div className="page">
      {seats === 0 && (
        <section className="notice">
          Nothing is selected yet. Pick seats on Requests & seats first.
          <button className="btn secondary small-btn" onClick={() => go('requests')}>Go to requests</button>
        </section>
      )}

      <div className="review-grid">
        <div>
          <section className="panel">
            <div className="panel-head">
              <h3>Guests in this list</h3>
              <span className="muted small">{picked.length} charges · {seats} seats</span>
            </div>
            <GuestTable picked={picked} />
          </section>

          {(conflicts.length > 0 || expiring.length > 0) && (
            <section className="panel">
              <div className="panel-head">
                <h3>Flags on this list</h3>
              </div>
              <ul className="checklist">
                {conflicts.map((r) => (
                  <li key={r.id}>
                    <Badge tone="warn">Menu conflict</Badge>
                    <div>
                      <strong>{r.name}</strong> · {r.dietary?.note}. {r.dietary?.detail}
                      <div className="muted small">Confirm an accommodation before the dinner.</div>
                    </div>
                  </li>
                ))}
                {expiring.map((r) => (
                  <li key={r.id}>
                    <Badge tone="warn">Card expires</Badge>
                    <div>
                      <strong>{r.name}</strong> · {r.card.brand} ••{r.card.last4}, expires {r.card.expiry}.
                      <div className="muted small">The charge clears tonight. Get an updated card before any refund.</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div>
          <section className="panel summary">
            <h3>Summary</h3>
            <table className="money-table">
              <tbody>
                <tr>
                  <td>Guest charges<div className="muted small">{seats} seats × {money(SEAT_PRICE)}</div></td>
                  <td className="num">{money(totals.amount)}</td>
                </tr>
                <tr>
                  <td>Processing fees (est.)<div className="muted small">{(PROCESSING_RATE * 100).toFixed(1)}%</div></td>
                  <td className="num neg">−{money(totals.fee)}</td>
                </tr>
                <tr>
                  <td>Venue deposit<div className="muted small">Paid at confirmation</div></td>
                  <td className="num neg">−{money(VENUE_DEPOSIT)}</td>
                </tr>
                <tr className="total">
                  <td>Net</td>
                  <td className="num">{money(totals.net)}</td>
                </tr>
              </tbody>
            </table>
            <div className="sum-meta">
              <div>{open === 0 ? 'List is full.' : `${open} seats stay empty.`}</div>
              <div>{waitlisted} requests ({waitlistSeats} seats) go to the waitlist in priority order.</div>
            </div>
          </section>

          <section className="panel">
            <h3>Before you commit</h3>
            <p className="muted small">
              Charges are real the moment you confirm. Read each line, then tick it.
            </p>
            <label className="ack">
              <input
                type="checkbox"
                checked={acks.charge}
                onChange={(e) => setAcks({ ...acks, charge: e.target.checked })}
              />
              <span>
                Charge {picked.length} cards {money(totals.amount)} total now ({seats} seats at {money(SEAT_PRICE)}).
              </span>
            </label>
            <label className="ack">
              <input
                type="checkbox"
                checked={acks.deposit}
                onChange={(e) => setAcks({ ...acks, deposit: e.target.checked })}
              />
              <span>
                Pay the {money(VENUE_DEPOSIT)} venue deposit now. <strong>It cannot be refunded or reversed.</strong>
              </span>
            </label>
            <label className="ack">
              <input
                type="checkbox"
                checked={acks.reversal}
                onChange={(e) => setAcks({ ...acks, reversal: e.target.checked })}
              />
              <span>
                Each guest charge can be reversed for <strong>24 hours</strong>. After that, refunds follow your policy:
                100% through Nov 22, 50% from Nov 23.
              </span>
            </label>
            {conflicts.length > 0 && (
              <label className="ack">
                <input
                  type="checkbox"
                  checked={acks.menu}
                  onChange={(e) => setAcks({ ...acks, menu: e.target.checked })}
                />
                <span>I have a plan for the {conflicts.length} menu conflict{conflicts.length > 1 ? 's' : ''} on this list.</span>
              </label>
            )}

            <button className="btn primary wide" disabled={!canConfirm} onClick={() => setModal(true)}>
              Confirm guest list and charge {picked.length} cards
            </button>
            {!canConfirm && seats > 0 && (
              <div className="muted small center">Tick each line above to unlock confirmation.</div>
            )}
          </section>
        </div>
      </div>

      {modal && (
        <Modal
          title={`Charge ${picked.length} cards and pay the venue deposit?`}
          onClose={() => setModal(false)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setModal(false)}>Back</button>
              <button
                className="btn primary"
                onClick={() => {
                  dispatch({ type: 'confirm', now });
                  setModal(false);
                  go('charges');
                }}
              >
                Confirm and charge
              </button>
            </>
          }
        >
          <p>
            This charges {money(totals.amount)} across {picked.length} cards and pays {money(VENUE_DEPOSIT)} to the venue.
            The venue deposit can't be undone. Each guest charge can be reversed for 24 hours.
          </p>
          <p className="muted small">
            Waitlisted requests are not charged. You can offer them a seat later from Charges & waitlist.
          </p>
        </Modal>
      )}
    </div>
  );
}

function GuestTable({ picked }: { picked: Request[] }) {
  return (
    <table className="simple-table">
      <thead>
        <tr>
          <th>Requester</th>
          <th className="num">Seats</th>
          <th className="num">Charge</th>
          <th>Dietary</th>
          <th>Card</th>
        </tr>
      </thead>
      <tbody>
        {picked.map((r) => (
          <tr key={r.id}>
            <td>
              <div className="req-name">
                {r.name}
                {r.founding && <Badge tone="accent">Founding</Badge>}
              </div>
              {r.kind === 'group' && <div className="muted small">With {r.partyNames.slice(1).join(', ')}</div>}
              {r.kind === 'guest' && <div className="muted small">Guest of {r.hostName}</div>}
            </td>
            <td className="num">{r.partySize}</td>
            <td className="num">{money(r.partySize * SEAT_PRICE)}</td>
            <td>
              <DietaryChip dietary={r.dietary} />
            </td>
            <td>
              <CardLabel card={r.card} />
            </td>
          </tr>
        ))}
        {picked.length === 0 && (
          <tr>
            <td colSpan={5} className="empty">No guests selected.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
