import { useMemo, useState } from 'react';
import { CAPACITY, REQUESTS, SEAT_PRICE, type Request } from '../data';
import {
  cardExpiresBeforeDinner,
  chargeFor,
  fmtRequested,
  money,
  PRIORITY_RANK,
  seatsFor,
  suggestSelection,
  waitlistIds,
} from '../logic';
import { chargedSeats } from '../store';
import { Badge, CardLabel, DietaryChip } from '../ui';
import type { PageProps } from '../App';

type Filter = 'all' | 'founding' | 'groups' | 'guests' | 'dietary' | 'cards' | 'selected' | 'waitlist';
type Sort = 'priority' | 'requested' | 'name';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'founding', label: 'Founding' },
  { id: 'groups', label: 'Groups' },
  { id: 'guests', label: 'Guests' },
  { id: 'dietary', label: 'Dietary' },
  { id: 'cards', label: 'Card expiring' },
  { id: 'selected', label: 'Selected' },
  { id: 'waitlist', label: 'Waitlist' },
];

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

export function RequestsPage({ state, dispatch, go }: PageProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('priority');

  const confirmed = state.confirmedAt !== null;
  const selected = new Set(state.selected);
  const inSeat = (id: string) =>
    confirmed ? state.charges[id]?.status === 'charged' : selected.has(id);

  const seats = confirmed ? chargedSeats(state) : seatsFor(state.selected);
  const remaining = CAPACITY - seats;
  const waitIds = useMemo(() => waitlistIds(state), [state]);
  const waitPos = new Map(waitIds.map((id, i) => [id, i + 1]));
  const chargeCount = Object.values(state.charges).filter((c) => c.status === 'charged').length;
  const chargedAmount = Object.values(state.charges)
    .filter((c) => c.status === 'charged')
    .reduce((s, c) => s + c.amount, 0);
  const selectedAmount = chargeFor(seats);

  const counts: Record<Filter, number> = {
    all: REQUESTS.length,
    founding: REQUESTS.filter((r) => r.founding).length,
    groups: REQUESTS.filter((r) => r.kind === 'group').length,
    guests: REQUESTS.filter((r) => r.kind === 'guest').length,
    dietary: REQUESTS.filter((r) => r.dietary).length,
    cards: REQUESTS.filter((r) => cardExpiresBeforeDinner(r.card.expiry)).length,
    selected: REQUESTS.filter((r) => inSeat(r.id)).length,
    waitlist: waitIds.length,
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pass = (r: Request): boolean => {
      switch (filter) {
        case 'founding': return r.founding;
        case 'groups': return r.kind === 'group';
        case 'guests': return r.kind === 'guest';
        case 'dietary': return !!r.dietary;
        case 'cards': return cardExpiresBeforeDinner(r.card.expiry);
        case 'selected': return inSeat(r.id);
        case 'waitlist': return waitPos.has(r.id);
        default: return true;
      }
    };
    const list = REQUESTS.filter(
      (r) =>
        pass(r) &&
        (!q || r.partyNames.some((n) => n.toLowerCase().includes(q)) || (r.hostName ?? '').toLowerCase().includes(q)),
    );
    list.sort((a, b) => {
      if (sort === 'requested') return a.requestedAt.localeCompare(b.requestedAt);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return PRIORITY_RANK.get(a.id)! - PRIORITY_RANK.get(b.id)!;
    });
    return list;
  }, [filter, query, sort, state]);

  const suggestion = suggestSelection();

  return (
    <div className="page">
      <section className="seat-meter">
        <div className="meter-main">
          <div className="meter-numbers">
            <span className="meter-big">{seats}</span>
            <span className="meter-of">of {CAPACITY} seats</span>
            {!confirmed && remaining === 0 && <Badge tone="ok">Full</Badge>}
            {confirmed && <Badge tone="ok">Confirmed</Badge>}
          </div>
          <div className="meter-bar" aria-hidden="true">
            <div className="meter-fill" style={{ width: `${(seats / CAPACITY) * 100}%` }} />
          </div>
          <div className="muted small">
            {confirmed
              ? `${chargeCount} charges · ${money(chargedAmount)} charged. Manage them on Charges & waitlist.`
              : `${state.selected.length} selections · ${remaining} seats open · ${money(selectedAmount)} across ${state.selected.length} charges at $${SEAT_PRICE} a seat`}
          </div>
        </div>

        <div className="meter-actions">
          {confirmed ? (
            <button className="btn primary" onClick={() => go('charges')}>Go to charges</button>
          ) : (
            <>
              <button
                className="btn secondary"
                onClick={() => dispatch({ type: 'setSelection', ids: suggestion })}
                title="Replaces the current selection"
              >
                Use suggested order
              </button>
              <button
                className="btn ghost"
                disabled={state.selected.length === 0}
                onClick={() => dispatch({ type: 'setSelection', ids: [] })}
              >
                Clear
              </button>
              <button className="btn primary" disabled={state.selected.length === 0} onClick={() => go('review')}>
                Review & confirm
              </button>
            </>
          )}
        </div>
      </section>

      {!confirmed && (
        <p className="rule-line">
          The suggested order works down the priority list: founding members, then members by past dinners attended,
          then guests of members. It skips the menu conflicts so you can decide on those, and takes each party whole.
        </p>
      )}
      {confirmed && (
        <p className="rule-line">
          The guest list is locked. To reverse a charge or refund a guest, use Charges & waitlist. Reversals are available for 24 hours after each charge.
        </p>
      )}

      <div className="toolbar">
        <div className="chips" role="tablist" aria-label="Filter requests">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip ${filter === f.id ? 'on' : ''}`}
              onClick={() => setFilter(f.id)}
              role="tab"
              aria-selected={filter === f.id}
            >
              {f.label} <span className="chip-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <input
            className="search"
            placeholder="Search name or host"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search requests"
          />
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
            <option value="priority">Sort: priority</option>
            <option value="requested">Sort: requested (oldest)</option>
            <option value="name">Sort: name</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="req-table">
          <thead>
            <tr>
              <th className="c-check" aria-label="Select" />
              <th className="c-rank">#</th>
              <th>Requester</th>
              <th className="c-party">Seats</th>
              <th>Founding</th>
              <th className="c-dinners">Past dinners</th>
              <th>Dietary</th>
              <th>Card on file</th>
              <th>Requested</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = inSeat(r.id);
              const wouldOverflow = !on && r.partySize > remaining;
              const pos = waitPos.get(r.id);
              const charge = state.charges[r.id];
              return (
                <tr key={r.id} className={on ? 'row-on' : ''}>
                  <td className="c-check">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={confirmed || wouldOverflow}
                      title={
                        confirmed
                          ? 'Guest list is confirmed'
                          : wouldOverflow
                            ? `Needs ${r.partySize} seats together; ${remaining} left`
                            : undefined
                      }
                      aria-label={`Select ${r.name}`}
                      onChange={() => dispatch({ type: 'toggle', id: r.id })}
                    />
                  </td>
                  <td className="c-rank muted">{PRIORITY_RANK.get(r.id)}</td>
                  <td>
                    <div className="req-name">
                      {r.name}
                      {r.kind === 'group' && <Badge tone="accent">Party of {r.partySize}</Badge>}
                      {r.kind === 'guest' && <Badge>Guest</Badge>}
                    </div>
                    <div className="muted small">
                      {r.kind === 'member' && r.joinedOn && `Member since ${monthYear.format(new Date(r.joinedOn))}`}
                      {r.kind === 'group' && `With ${r.partyNames.slice(1).join(', ')}`}
                      {r.kind === 'guest' && `Guest of ${r.hostName}`}
                    </div>
                  </td>
                  <td className="c-party">{r.partySize}</td>
                  <td>{r.founding ? <Badge tone="accent">Founding</Badge> : <span className="muted">—</span>}</td>
                  <td className="c-dinners">
                    {r.dinnersAttended !== undefined ? `${r.dinnersAttended} / 11` : <span className="muted">—</span>}
                  </td>
                  <td>
                    <DietaryChip dietary={r.dietary} />
                  </td>
                  <td>
                    <CardLabel card={r.card} />
                  </td>
                  <td className="muted small">{fmtRequested(r.requestedAt)}</td>
                  <td>
                    <StatusCell
                      confirmed={confirmed}
                      on={on}
                      charge={charge}
                      pos={pos}
                      partySize={r.partySize}
                      conflict={!!r.dietary?.conflict}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="empty">No requests match this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusCell({
  confirmed,
  on,
  charge,
  pos,
  partySize,
  conflict,
}: {
  confirmed: boolean;
  on: boolean;
  charge?: { status: string; amount: number; refundAmount?: number };
  pos?: number;
  partySize: number;
  conflict: boolean;
}) {
  if (confirmed && charge) {
    if (charge.status === 'charged') return <Badge tone="ok">Charged {money(charge.amount)}</Badge>;
    if (charge.status === 'reversed') return <Badge tone="warn">Reversed</Badge>;
    if (charge.status === 'refunded') return <Badge>Refunded {money(charge.refundAmount ?? 0)}</Badge>;
  }
  if (!confirmed && on) return <Badge tone="ok">Selected · {partySize} {partySize === 1 ? 'seat' : 'seats'}</Badge>;
  return (
    <span className="muted small">
      Waitlist #{pos}
      {conflict && <span className="decide"> · decide</span>}
    </span>
  );
}
