import { buildQuote } from '../lib/pricing';
import { money } from '../lib/money';
import { EARLY_DEADLINE_MS, fmtCountdown, fmtDate, fmtTime, TERM } from '../lib/time';
import { Badge, PageHeader } from '../components/ui';
import { useNow, useStore } from '../store';

export function DashboardView() {
  const { state, dispatch } = useStore();
  const now = useNow();
  const enrollments = state.txns.filter((t) => t.type === 'enrollment');
  const withdrawals = state.txns.filter((t) => t.type === 'withdrawal');
  const collected = state.txns.filter((t) => t.kind === 'payment').reduce((s, t) => s + t.amountCents, 0);
  const refunds = state.txns.filter((t) => t.kind === 'refund').reduce((s, t) => s + t.amountCents, 0);
  const countdown = fmtCountdown(now, EARLY_DEADLINE_MS);
  const draftFamily = state.families.find((f) => f.id === state.draft.familyId);
  const draftQuote =
    draftFamily && state.draft.lines.length > 0 ? buildQuote(state.draft.lines, state.programs, now, state.draft.plan) : null;
  const recent = [...state.txns].sort((a, b) => b.at - a.at).slice(0, 12);

  return (
    <div className="page">
      <PageHeader
        title="Today at Riverbend"
        subtitle={`${fmtDate(now)} · ${TERM.name} enrollment · last day of early enrollment`}
        right={
          countdown ? (
            <div className="deadline-pill">
              <strong>Early rate ends tonight at 11:59 PM</strong>
              <span>{countdown} left</span>
            </div>
          ) : null
        }
      />

      <div className="kpi-row">
        <Kpi label="Enrollments today" value={String(enrollments.length)} />
        <Kpi label="Withdrawals today" value={String(withdrawals.length)} />
        <Kpi label="Collected today" value={money(collected)} />
        <Kpi label="Refunds today" value={money(refunds)} />
      </div>

      {draftFamily && draftQuote && (
        <section className="card in-progress">
          <div>
            <Badge tone="warning">In progress · not charged</Badge>
            <h2>{draftFamily.name} family enrollment</h2>
            <p className="muted">
              {state.draft.lines.length} students · {money(draftQuote.totalCents)} total · first payment{' '}
              {money(draftQuote.chargeTodayCents)} to {draftFamily.cardBrand} ending {draftFamily.cardLast4}
            </p>
          </div>
          <button className="btn primary" onClick={() => dispatch({ type: 'setView', view: 'enroll' })}>
            Resume enrollment
          </button>
        </section>
      )}

      <section className="card">
        <div className="section-head">
          <h2>Activity today</h2>
          <button className="link-btn" onClick={() => dispatch({ type: 'setView', view: 'transactions' })}>
            All transactions
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Family</th>
              <th>Type</th>
              <th>Description</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((t) => (
              <tr key={t.id}>
                <td>{fmtTime(t.at)}</td>
                <td>
                  <strong>{t.familyName}</strong>
                </td>
                <td>
                  {t.type === 'enrollment' ? <Badge tone="success">Enrollment</Badge> : <Badge tone="danger">Withdrawal</Badge>}
                </td>
                <td className="small">{t.description}</td>
                <td className={`num ${t.kind === 'refund' ? 'text-warn' : ''}`}>
                  {t.kind === 'refund' ? money(-t.amountCents) : money(t.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card kpi">
      <span className="label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
