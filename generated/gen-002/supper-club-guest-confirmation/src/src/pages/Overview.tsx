import { CAPACITY, DINNER, REQUESTS, VENUE_DEPOSIT, SEAT_PRICE, PROCESSING_RATE, type Request } from '../data';
import {
  dietaryFlags,
  expiringCards,
  founding,
  groups,
  guests,
  memberCount,
  money,
  seatsFor,
  suggestSelection,
  totalsFor,
  fmtDateTime,
} from '../logic';
import { chargedSeats } from '../store';
import { Badge } from '../ui';
import type { PageProps } from '../App';

export function OverviewPage({ state, go }: PageProps) {
  const confirmed = state.confirmedAt !== null;
  const usingSuggestion = !confirmed && state.selected.length === 0;
  const ids = usingSuggestion ? suggestSelection() : state.selected;
  const liveCharges = Object.values(state.charges).filter((c) => c.status === 'charged');

  const seats = confirmed ? chargedSeats(state) : seatsFor(ids);
  const chargeCount = confirmed ? liveCharges.length : ids.length;
  const totals = totalsFor(seats, chargeCount);

  const conflicts = dietaryFlags.filter((r) => r.dietary?.conflict);
  const selectedSet = new Set(state.selected);
  const isSelected = (r: Request) =>
    confirmed ? state.charges[r.id]?.status === 'charged' : selectedSet.has(r.id) || (usingSuggestion && ids.includes(r.id));

  const reversibleUntil = liveCharges.length
    ? Math.max(...liveCharges.map((c) => c.chargedAt)) + 24 * 3600 * 1000
    : null;

  return (
    <div className="page">
      <section className="hero">
        <div>
          <div className="eyebrow">{DINNER.courses}-course dinner · Sunday, November 29</div>
          <h1>{DINNER.title}</h1>
          <p className="lede">
            {DINNER.venue}. {CAPACITY} seats, {REQUESTS.length} requests from {memberCount} members.
          </p>
        </div>
        <div className="hero-action">
          {confirmed ? (
            <>
              <div className="hero-state ok">Guest list confirmed</div>
              <button className="btn secondary" onClick={() => go('charges')}>Open charges</button>
            </>
          ) : (
            <>
              <div className="hero-state">{state.selected.length ? 'Building the guest list' : 'Requests open'}</div>
              <div className="hero-hint">
                {state.selected.length
                  ? `${seatsFor(state.selected)} of ${CAPACITY} seats selected`
                  : 'Nothing selected yet. Use the suggested order or pick by hand.'}
              </div>
              <button className="btn primary" onClick={() => go('requests')}>
                {state.selected.length ? 'Continue selecting' : 'Choose seats'}
              </button>
            </>
          )}
        </div>
      </section>

      <section className="stat-row">
        <Stat label="Seats" value={`${confirmed ? seats : seatsFor(ids)} / ${CAPACITY}`} sub={confirmed ? 'booked and charged' : usingSuggestion ? 'suggested, not yet selected' : 'selected'} />
        <Stat label="Requests" value={String(REQUESTS.length)} sub={`from ${memberCount} members · ${groups.length} groups · ${guests.length} guests`} />
        <Stat label="Founding members" value={String(founding.length)} sub="all requested seats" />
        <Stat
          label="Dietary notes"
          value={String(dietaryFlags.length)}
          sub={`${conflicts.length} conflict with the fixed menu`}
          tone={conflicts.length ? 'warn' : undefined}
        />
        <Stat
          label="Cards expiring"
          value={String(expiringCards.length)}
          sub="expire in November"
          tone={expiringCards.length ? 'warn' : undefined}
        />
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h3>{confirmed ? 'Money collected' : usingSuggestion ? 'Totals for the suggested 24 seats' : 'Totals for current selection'}</h3>
            <span className="muted small">{money(SEAT_PRICE)} per seat · {(PROCESSING_RATE * 100).toFixed(1)}% processing</span>
          </div>
          <table className="money-table">
            <tbody>
              <tr>
                <td>
                  Guest charges
                  <div className="muted small">{totals.charges} charges covering {totals.seats} seats</div>
                </td>
                <td className="num">{money(totals.amount)}</td>
              </tr>
              <tr>
                <td>
                  Card processing fees
                  <div className="muted small">Estimated at {(PROCESSING_RATE * 100).toFixed(1)}% of charges</div>
                </td>
                <td className="num neg">−{money(totals.fee)}</td>
              </tr>
              <tr>
                <td>
                  Venue deposit
                  <div className="muted small">{confirmed ? 'Paid at confirmation. Non-refundable.' : 'Due at confirmation. Non-refundable.'}</div>
                </td>
                <td className="num neg">−{money(VENUE_DEPOSIT)}</td>
              </tr>
              <tr className="total">
                <td>Net after fees and deposit</td>
                <td className="num">{money(totals.net)}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted small">
            Assumes every charged guest attends and nothing is reversed or refunded.
            {confirmed && reversibleUntil ? ` Reversible charges can be undone until ${fmtDateTime(reversibleUntil)}.` : ''}
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>{confirmed ? 'Items you handled' : 'Before you confirm'}</h3>
            <span className="muted small">{confirmed ? 'Resolved at confirmation' : 'Check these first'}</span>
          </div>
          <ul className="checklist">
            {conflicts.map((r) => (
              <li key={r.id}>
                <Badge tone="warn">Menu conflict</Badge>
                <div>
                  <strong>{r.name}</strong> · {r.dietary?.note}. {r.dietary?.detail}
                  <div className="muted small">
                    {confirmed
                      ? isSelected(r) ? 'Charged. Confirm the accommodation with the guest.' : 'Not charged. On the waitlist.'
                      : isSelected(r) ? 'Selected. Needs an accommodation plan before you confirm.' : 'Not selected. Waitlisted.'}
                  </div>
                </div>
              </li>
            ))}
            {dietaryFlags
              .filter((r) => !r.dietary?.conflict)
              .map((r) => (
                <li key={r.id}>
                  <Badge>Dietary note</Badge>
                  <div>
                    <strong>{r.name}</strong> · {r.dietary?.note}. {r.dietary?.detail}
                    <div className="muted small">No conflict with the fixed menu.</div>
                  </div>
                </li>
              ))}
            {expiringCards.map((r: Request) => (
              <li key={`card-${r.id}`}>
                <Badge tone="warn">Card expires</Badge>
                <div>
                  <strong>{r.name}</strong> · {r.card.brand} ••{r.card.last4}, expires {r.card.expiry}.
                  <div className="muted small">
                    {isSelected(r)
                      ? confirmed
                        ? 'Charged. Get an updated card on file before any refund.'
                        : 'Selected. The charge clears tonight, but get an updated card before any refund.'
                      : 'Waitlisted. Ask for an updated card before offering a seat.'}
                  </div>
                </div>
              </li>
            ))}
            {groups.map((r) => (
              <li key={r.id}>
                <Badge tone="accent">Group</Badge>
                <div>
                  <strong>{r.name}</strong> · party of {r.partySize}, seated together or not at all.
                  <div className="muted small">
                    {isSelected(r) ? 'Selected as one block.' : `Not selected. Needs ${r.partySize} seats open at once.`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h3>What can and can't be undone</h3>
          </div>
          <div className="rule-grid">
            <div className="rule ok-rule">
              <div className="rule-kicker">Reversal · 24 hours</div>
              <p>Undoes one charge in full. The money goes back to the card and the seat opens for the waitlist.</p>
            </div>
            <div className="rule">
              <div className="rule-kicker">Refund · after 24 hours</div>
              <p>
                Follows your policy: <strong>100%</strong> up to Nov 22 (7 days before dinner), <strong>50%</strong> from Nov 23.
                Refunds are a separate action from reversals.
              </p>
            </div>
            <div className="rule bad-rule">
              <div className="rule-kicker">Venue deposit · $600</div>
              <p>Paid to the venue when you confirm. Cannot be reversed or refunded.</p>
            </div>
            <div className="rule bad-rule">
              <div className="rule-kicker">Processing fees</div>
              <p>Not returned by reversals or refunds in this build.</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Booking history</h3>
            <span className="muted small">{DINNER.pastDinners} past dinners</span>
          </div>
          <div className="history-grid">
            <div>
              <div className="big-num">{DINNER.avgNoShows}</div>
              <div className="muted small">average no-shows per dinner</div>
            </div>
            <div>
              <div className="big-num">{DINNER.pastDinners}</div>
              <div className="muted small">past dinners the average is based on</div>
            </div>
          </div>
          <p className="muted small">
            At that average, a 24-seat dinner usually has about two empty chairs. Whether to hold extra seats is your call. The app doesn't overbook.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'warn' }) {
  return (
    <div className={`stat ${tone === 'warn' ? 'stat-warn' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
