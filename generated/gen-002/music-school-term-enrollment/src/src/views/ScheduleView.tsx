import { seatCapacity, seatsOpen, seatsTaken, useStore } from '../store';
import { money } from '../lib/money';
import { RATES } from '../lib/pricing';
import { TERM } from '../lib/time';
import { Badge, PageHeader } from '../components/ui';

export function ScheduleView() {
  const { state } = useStore();

  return (
    <div className="page">
      <PageHeader title="Schedule and seats" subtitle={`${TERM.name} · ${TERM.rangeLabel} · 10 weeks`} />
      <div className="schedule-grid">
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class and teacher</th>
                <th>Time</th>
                <th className="num">Seats taken</th>
                <th className="num">Open</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.programs.map((p) => {
                const slots = state.slots.filter((s) => s.programId === p.id);
                return slots.map((s, i) => {
                  const taken = seatsTaken(state, s.id);
                  const open = seatsOpen(state, s.id);
                  const held = state.draft.lines.filter((l) => l.slotId === s.id).length;
                  return (
                    <tr key={s.id} className={i === 0 ? 'group-start' : ''}>
                      <td>
                        {i === 0 && (
                          <>
                            <strong>
                              {p.instrument} · {p.formatLabel}
                            </strong>
                            <div className="muted small">{p.teacher}</div>
                          </>
                        )}
                      </td>
                      <td>{s.label}</td>
                      <td className="num">
                        {taken} of {seatCapacity(state, s.id)}
                        {held > 0 && <div className="muted small">{held} held in this enrollment</div>}
                      </td>
                      <td className="num">{open}</td>
                      <td>
                        {open === 0 ? (
                          <Badge>Full</Badge>
                        ) : open < seatCapacity(state, s.id) && p.format === 'group' ? (
                          <Badge tone="warning">Filling</Badge>
                        ) : (
                          <Badge tone="success">Open</Badge>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        <aside className="card rate-card">
          <h2>Winter 2027 rates</h2>
          <dl>
            <div>
              <dt>Private, 30 min</dt>
              <dd>{money(34000)} per term</dd>
            </div>
            <div>
              <dt>Private, 45 min</dt>
              <dd>{money(48000)} per term</dd>
            </div>
            <div>
              <dt>Group guitar (max 6)</dt>
              <dd>{money(21000)} per term</dd>
            </div>
            <div>
              <dt>Registration</dt>
              <dd>{money(RATES.registrationCents)} per family</dd>
            </div>
            <div>
              <dt>Early enrollment</dt>
              <dd>{RATES.earlyPct}% off, ends Nov 16 at 11:59 PM</dd>
            </div>
            <div>
              <dt>Sibling</dt>
              <dd>{RATES.siblingPct}% off 2nd and later children</dd>
            </div>
          </dl>
          <h3>Withdrawals</h3>
          <p className="small">
            Within 7 days of enrollment: full refund. After 7 days: weeks remaining ÷ {RATES.termWeeks} × tuition, less{' '}
            {money(RATES.prorateFeeCents)}.
          </p>
        </aside>
      </div>
    </div>
  );
}
