import { BAYS } from '../data/mock';
import { statusOf, unitById } from '../lib/engine';
import { chargeCents, fmtDuration, fmtMoney, fmtRange, RATE_PER_HOUR } from '../lib/time';
import type { Booking, KitUnit } from '../types';

const STATUS_LABEL = {
  done: 'Completed',
  'in-session': 'In session',
  upcoming: 'Upcoming',
  offered: 'Offered · awaiting client',
} as const;

interface Props {
  booking: Booking | undefined;
  units: KitUnit[];
}

export function BookingDetail({ booking, units }: Props) {
  if (!booking) {
    return (
      <section className="card detail">
        <div className="eyebrow">Selected booking</div>
        <p className="muted">Select a booking on the board to see its details.</p>
      </section>
    );
  }

  const bay = BAYS.find((x) => x.id === booking.bayId)!;
  const from = booking.movedFrom ? BAYS.find((x) => x.id === booking.movedFrom)! : undefined;
  const dur = booking.end - booking.start;
  const kitNames = booking.kit.map((k) => unitById(units, k)?.name).filter(Boolean) as string[];
  const addons = booking.addons.length ? booking.addons : ['None'];

  return (
    <section className="card detail" aria-label="Selected booking">
      <div className="detail-head">
        <div>
          <div className="eyebrow">
            Selected booking · {STATUS_LABEL[statusOf(booking)]}
          </div>
          <h2>{booking.client}</h2>
          <div className="muted">
            {booking.project} · contact {booking.contact}
          </div>
        </div>
        <div className="detail-time">
          <div className="big">{fmtRange(booking.start, booking.end)}</div>
          <div className="muted">{fmtDuration(dur)}</div>
        </div>
      </div>

      <dl className="facts">
        <div>
          <dt>Bay</dt>
          <dd>
            {bay.name} · {bay.surface} · {bay.sqm} m²
            {from ? <span className="tag">moved from {from.name}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Crew</dt>
          <dd>{booking.crew}</dd>
        </div>
        <div>
          <dt>Deposit</dt>
          <dd className={booking.deposit === 'Paid' ? 'ok-text' : 'warn-text'}>{booking.deposit}</dd>
        </div>
        <div>
          <dt>Charge</dt>
          <dd>
            {fmtMoney(chargeCents(dur))}{' '}
            <span className="muted">
              ({(dur / 60).toFixed(1)} h × ${RATE_PER_HOUR})
            </span>
          </dd>
        </div>
        <div className="wide">
          <dt>Add-ons</dt>
          <dd>{addons.join(' · ')}</dd>
        </div>
        <div className="wide">
          <dt>Kit reserved</dt>
          <dd>{kitNames.length ? kitNames.join(' · ') : 'No kit reserved'}</dd>
        </div>
      </dl>
    </section>
  );
}
