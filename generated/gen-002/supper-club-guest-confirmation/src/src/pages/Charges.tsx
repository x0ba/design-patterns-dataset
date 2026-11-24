import { useState } from 'react';
import { CAPACITY, REVERSAL_WINDOW_MS, SEAT_PRICE, VENUE_DEPOSIT, type Request } from '../data';
import {
  cardExpiresBeforeDinner,
  fmtDateTime,
  fmtDuration,
  getRequest,
  money,
  refundRateAt,
  waitlistIds,
} from '../logic';
import { chargedSeats, type Charge } from '../store';
import { Badge, CardLabel, DietaryChip, Modal } from '../ui';
import type { PageProps } from '../App';

type Pending = { kind: 'reverse' | 'refund' | 'offer'; id: string } | null;

export function ChargesPage({ state, dispatch, now, go }: PageProps) {
  const [pending, setPending] = useState<Pending>(null);
  const confirmed = state.confirmedAt !== null;
  const waitIds = waitlistIds(state);
  const openSeats = CAPACITY - chargedSeats(state);

  if (!confirmed) {
    return (
      <div className="page">
        <section className="panel empty-state">
          <h2 className="panel-title">Nothing has been charged yet</h2>
          <p className="muted">
            Charges are created only when you confirm the guest list. Until then, requests sit in the
            waitlist below in priority order.
          </p>
          <button className="btn primary" onClick={() => go('review')}>Review & confirm</button>
        </section>
        <WaitlistPanel ids={waitIds} openSeats={openSeats} state={state} canOffer={false} onOffer={() => {}} />
      </div>
    );
  }

  const charges = Object.values(state.charges).sort((a, b) => {
    const order = (c: Charge) => (c.status === 'charged' ? 0 : 1);
    return order(a) - order(b) || a.chargedAt - b.chargedAt;
  });
  const live = charges.filter((c) => c.status === 'charged');
  const liveAmount = live.reduce((s, c) => s + c.amount, 0);
  const fees = live.reduce((s, c) => s + c.fee, 0);
  const rate = refundRateAt(now);

  const target = pending ? state.charges[pending.id] : undefined;
  const targetReq = pending ? getRequest(pending.id) : undefined;

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'reverse') dispatch({ type: 'reverse', id: pending.id, now });
    if (pending.kind === 'refund') dispatch({ type: 'refund', id: pending.id, now });
    if (pending.kind === 'offer') dispatch({ type: 'offer', id: pending.id, now });
    setPending(null);
  };

  return (
    <div className="page">
      <section className="summary-strip">
        <Metric label="Seats charged" value={`${chargedSeats(state)} / ${CAPACITY}`} sub={`${live.length} charges`} />
        <Metric label="Charged to guests" value={money(liveAmount)} sub={`${money(fees)} est. fees`} />
        <Metric label="Venue deposit" value={money(VENUE_DEPOSIT)} sub={`Paid ${fmtDateTime(state.depositPaidAt!)}`} tone="bad" />
        <Metric label="Open seats" value={String(openSeats)} sub={`${waitIds.length} on the waitlist`} />
      </section>

      <section className="policy">
        <div className="policy-col ok-rule">
          <div className="rule-kicker">Reverse · within 24 hours of each charge</div>
          <p>Undoes the charge completely. The full amount goes back to the card and the seat reopens.</p>
        </div>
        <div className="policy-col">
          <div className="rule-kicker">Refund · after 24 hours</div>
          <p>
            Returns money under your policy. <strong>{rate === 1 ? 'Full refund applies today' : '50% applies from Nov 23'}.</strong>{' '}
            Full through Nov 22, 50% from Nov 23. Releases the seat.
          </p>
        </div>
        <div className="policy-col bad-rule">
          <div className="rule-kicker">Venue deposit · {money(VENUE_DEPOSIT)}</div>
          <p>Cannot be reversed or refunded. It is paid to the venue when you confirm.</p>
        </div>
      </section>

      <section className="panel flush">
        <div className="panel-head pad">
          <h3>Guest charges</h3>
          <span className="muted small">Each row is one card charge. Party charges cover every seat in the party.</span>
        </div>
        <table className="req-table charges-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th className="num">Seats</th>
              <th className="num">Amount</th>
              <th>Card</th>
              <th>Charged</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((c) => {
              const r = getRequest(c.requestId)!;
              return (
                <ChargeRow
                  key={c.requestId}
                  charge={c}
                  req={r}
                  now={now}
                  rate={rate}
                  onReverse={() => setPending({ kind: 'reverse', id: c.requestId })}
                  onRefund={() => setPending({ kind: 'refund', id: c.requestId })}
                />
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="two-col">
        <WaitlistPanel
          ids={waitIds}
          openSeats={openSeats}
          state={state}
          canOffer
          onOffer={(id) => setPending({ kind: 'offer', id })}
        />

        <section className="panel">
          <div className="panel-head">
            <h3>Activity</h3>
          </div>
          <ol className="activity">
            {[...state.log].reverse().map((e, i) => (
              <li key={i}>
                <span className="activity-time">{fmtDateTime(e.at)}</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {pending && target && targetReq && (
        <Modal
          title={
            pending.kind === 'reverse'
              ? `Reverse ${money(target.amount)} for ${targetReq.name}?`
              : pending.kind === 'refund'
                ? `Refund ${targetReq.name}?`
                : `Charge ${targetReq.name} for a waitlisted seat?`
          }
          onClose={() => setPending(null)}
          actions={
            <>
              <button className="btn ghost" onClick={() => setPending(null)}>Cancel</button>
              <button className={`btn ${pending.kind === 'reverse' ? 'danger' : 'primary'}`} onClick={confirm}>
                {pending.kind === 'reverse' ? 'Reverse charge' : pending.kind === 'refund' ? 'Issue refund' : 'Charge and offer seat'}
              </button>
            </>
          }
        >
          {pending.kind === 'reverse' && (
            <>
              <p>
                {money(target.amount)} returns to {targetReq.card.brand} ••{targetReq.card.last4} in full, and {target.seats}{' '}
                {target.seats === 1 ? 'seat' : 'seats'} reopen for the waitlist.
              </p>
              <p className="muted small">
                The {money(target.fee)} processing fee is not returned. This window closes{' '}
                {fmtDateTime(target.chargedAt + REVERSAL_WINDOW_MS)}.
              </p>
            </>
          )}
          {pending.kind === 'refund' && (
            <>
              <p>
                Refund {money(Math.round(target.amount * rate * 100) / 100)} ({rate === 1 ? '100%' : '50%'} under your policy)
                to {targetReq.card.brand} ••{targetReq.card.last4}. The seat reopens.
              </p>
              <p className="muted small">
                Reversal is no longer available because the 24-hour window has passed. Refunds follow the policy: full through Nov 22, 50% from Nov 23.
              </p>
            </>
          )}
          {pending.kind === 'offer' && (
            <>
              <p>
                A new charge of {money(targetReq.partySize * SEAT_PRICE)} goes to {targetReq.card.brand} ••{targetReq.card.last4}.
              </p>
              <p className="muted small">
                Like any charge, it can be reversed for 24 hours. The venue deposit does not change.
              </p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function ChargeRow({
  charge,
  req,
  now,
  rate,
  onReverse,
  onRefund,
}: {
  charge: Charge;
  req: Request;
  now: number;
  rate: number;
  onReverse: () => void;
  onRefund: () => void;
}) {
  const windowLeft = charge.chargedAt + REVERSAL_WINDOW_MS - now;
  const canReverse = charge.status === 'charged' && windowLeft > 0;
  const canRefund = charge.status === 'charged' && windowLeft <= 0;
  const expiring = cardExpiresBeforeDinner(req.card.expiry);

  return (
    <tr className={charge.status !== 'charged' ? 'row-dim' : ''}>
      <td>
        <div className="req-name">
          {req.name}
          {req.kind === 'group' && <Badge tone="accent">Party of {req.partySize}</Badge>}
          {req.kind === 'guest' && <Badge>Guest</Badge>}
        </div>
        <div className="muted small">
          {req.kind === 'group' && `With ${req.partyNames.slice(1).join(', ')}`}
          {req.kind === 'guest' && `Guest of ${req.hostName}`}
          {req.kind === 'member' && (req.dietary ? <DietaryChip dietary={req.dietary} /> : 'Member')}
        </div>
      </td>
      <td className="num">{charge.seats}</td>
      <td className="num">
        {money(charge.status === 'reversed' ? 0 : charge.amount)}
        {charge.status === 'reversed' && <div className="muted small line-through">{money(charge.amount)}</div>}
      </td>
      <td>
        <CardLabel card={req.card} />
        {expiring && charge.status === 'charged' && <div className="warn-text small">Update before any refund</div>}
      </td>
      <td className="muted small">{fmtDateTime(charge.chargedAt)}</td>
      <td>
        {charge.status === 'charged' && <Badge tone="ok">Charged</Badge>}
        {charge.status === 'reversed' && <Badge tone="warn">Reversed {fmtDateTime(charge.updatedAt!)}</Badge>}
        {charge.status === 'refunded' && <Badge>Refunded {money(charge.refundAmount ?? 0)}</Badge>}
      </td>
      <td>
        {canReverse && (
          <div className="action-stack">
            <button className="btn danger small-btn" onClick={onReverse}>Reverse</button>
            <span className="muted small">{fmtDuration(windowLeft)} left to reverse</span>
          </div>
        )}
        {canRefund && (
          <div className="action-stack">
            <button className="btn secondary small-btn" onClick={onRefund}>
              Refund {money(Math.round(charge.amount * rate * 100) / 100)}
            </button>
            <span className="muted small">{rate === 1 ? 'Full refund' : '50% refund'} · reversal window closed</span>
          </div>
        )}
        {charge.status === 'reversed' && <span className="muted small">Seat released</span>}
        {charge.status === 'refunded' && <span className="muted small">Seat released</span>}
      </td>
    </tr>
  );
}

function WaitlistPanel({
  ids,
  openSeats,
  state,
  canOffer,
  onOffer,
}: {
  ids: string[];
  openSeats: number;
  state: PageProps['state'];
  canOffer: boolean;
  onOffer: (id: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Waitlist</h3>
        <span className="muted small">{openSeats} seats open · {ids.length} requests</span>
      </div>
      <p className="muted small">
        {canOffer
          ? 'Offer an open seat to the next guest in priority order. An offer is a new charge.'
          : 'If you confirm, these requests are waitlisted in this order. Offers open after confirmation.'}
      </p>
      <ol className="waitlist">
        {ids.map((id, i) => {
          const r = getRequest(id)!;
          const previously = state.charges[id]?.status === 'reversed';
          const fits = r.partySize <= openSeats;
          return (
            <li key={id}>
              <div className="wait-pos">{i + 1}</div>
              <div className="wait-body">
                <div className="req-name">
                  {r.name}
                  {r.partySize > 1 && <Badge tone="accent">Party of {r.partySize}</Badge>}
                  {r.kind === 'guest' && <Badge>Guest of {r.hostName}</Badge>}
                  {previously && <Badge tone="warn">Reversed earlier</Badge>}
                </div>
                <div className="muted small wait-meta">
                  {r.founding ? 'Founding · ' : ''}
                  {r.dinnersAttended !== undefined ? `${r.dinnersAttended} past dinners · ` : ''}
                  {r.card.brand} ••{r.card.last4}
                  {cardExpiresBeforeDinner(r.card.expiry) && <span className="warn-text"> · expires {r.card.expiry}</span>}
                </div>
                {r.dietary?.conflict && (
                  <div className="decide-note">
                    {r.dietary.note}: menu conflict. Decide before you offer a seat.
                  </div>
                )}
              </div>
              <div className="wait-action">
                {canOffer && (
                  <button className="btn secondary small-btn" disabled={!fits} onClick={() => onOffer(id)} title={fits ? undefined : `Needs ${r.partySize} seats`}>
                    {fits ? `Offer seat · ${money(r.partySize * SEAT_PRICE)}` : `Needs ${r.partySize}`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {ids.length === 0 && <li className="empty">Nobody is waiting.</li>}
      </ol>
    </section>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'bad' }) {
  return (
    <div className={`metric ${tone === 'bad' ? 'metric-bad' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
