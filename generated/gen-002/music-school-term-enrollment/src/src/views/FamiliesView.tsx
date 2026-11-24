import { useState } from 'react';
import {
  familyBalanceCents,
  seatsOpen,
  useNow,
  useStore,
} from '../store';
import { money } from '../lib/money';
import { RATES, withdrawalQuote } from '../lib/pricing';
import { DAY_MS, fmtCountdown, fmtDate, fmtDateTime, INSTALLMENT_DATES_MS, TERM } from '../lib/time';
import { Badge, initials, Modal, PageHeader } from '../components/ui';
import type { AppState, Enrollment, Family } from '../types';

export function FamiliesView() {
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = state.families.filter(
    (f) => !q || f.name.toLowerCase().includes(q) || f.parents.toLowerCase().includes(q),
  );
  const selected = state.families.find((f) => f.id === state.selectedFamilyId) ?? null;

  return (
    <div className="page">
      <PageHeader title="Families" subtitle="Accounts, cards on file, and enrollments" />
      <div className="families-grid">
        <aside className="card family-list">
          <input
            className="search"
            type="search"
            placeholder="Search family or parent name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search families"
          />
          <ul>
            {list.map((f) => (
              <FamilyRow key={f.id} family={f} selected={f.id === selected?.id} state={state} />
            ))}
            {list.length === 0 && <li className="muted small pad">No family matches “{query}”.</li>}
          </ul>
        </aside>
        <section>{selected ? <FamilyDetail family={selected} /> : <div className="card empty-state">Pick a family.</div>}</section>
      </div>
    </div>
  );
}

function FamilyRow({ family, selected, state }: { family: Family; selected: boolean; state: AppState }) {
  const { dispatch } = useStore();
  const balance = familyBalanceCents(state, family.id);
  return (
    <li>
      <button
        className={`family-row ${selected ? 'active' : ''}`}
        onClick={() => dispatch({ type: 'selectFamily', familyId: family.id })}
      >
        <span className="avatar">{initials(family.name)}</span>
        <span className="family-row-text">
          <strong>{family.name} family</strong>
          <span className="muted small">{family.parents}</span>
        </span>
        <span className="family-row-meta small">
          {balance > 0 ? <span className="text-warn">{money(balance)} due</span> : <span className="muted">$0.00</span>}
        </span>
      </button>
    </li>
  );
}

function FamilyDetail({ family }: { family: Family }) {
  const { state, dispatch } = useStore();
  const now = useNow();
  const [withdrawing, setWithdrawing] = useState<Enrollment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const enrollments = state.enrollments.filter((e) => e.familyId === family.id);
  const txns = state.txns.filter((t) => t.familyName === family.name);
  const balance = familyBalanceCents(state, family.id);
  const draftHere = state.draft.familyId === family.id && state.draft.lines.length > 0;
  const draftElsewhere = state.draft.lines.length > 0 && state.draft.familyId !== family.id;
  const otherDraftName = state.families.find((f) => f.id === state.draft.familyId)?.name;

  return (
    <div className="family-detail">
      <section className="card family-head">
        <div className="family-id">
          <div className="avatar avatar-lg">{initials(family.name)}</div>
          <div>
            <h2>{family.name} family</h2>
            <p className="muted">{family.parents}</p>
            <p className="muted small">
              {family.phone} · {family.email}
            </p>
          </div>
        </div>
        <div className="family-facts">
          <div>
            <span className="label">Balance</span>
            <strong className={balance > 0 ? 'text-warn' : ''}>{money(balance)}</strong>
          </div>
          <div>
            <span className="label">Card on file</span>
            <strong>
              {family.cardBrand} ending {family.cardLast4}
            </strong>
            <span className="muted small">Exp {family.cardExp}</span>
          </div>
          <div>
            <span className="label">Past terms</span>
            <strong>{family.pastTerms.length}</strong>
            <span className="muted small">{family.pastTerms.join(', ')}</span>
          </div>
        </div>
        <div className="family-actions">
          {draftHere ? (
            <button className="btn primary" onClick={() => dispatch({ type: 'startDraft', familyId: family.id })}>
              Continue enrollment
            </button>
          ) : (
            <button
              className="btn primary"
              disabled={draftElsewhere}
              onClick={() => dispatch({ type: 'startDraft', familyId: family.id })}
            >
              Start {TERM.name} enrollment
            </button>
          )}
          {draftElsewhere && (
            <p className="muted small">
              Finish or clear the {otherDraftName} enrollment first so its held seats are not lost.
            </p>
          )}
        </div>
      </section>

      {notice && (
        <div className="notice success" role="status">
          <span>{notice}</span>
          <button className="link-btn" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <section className="card">
        <div className="section-head">
          <h2>{TERM.name} enrollments</h2>
        </div>
        {enrollments.length === 0 ? (
          <p className="muted">
            No {TERM.name} enrollments yet.
            {draftHere && ' The enrollment in progress is on the Enroll screen.'}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class and time</th>
                <th>Enrolled</th>
                <th className="num">Tuition</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => {
                const program = state.programs.find((p) => p.id === e.programId);
                const slot = state.slots.find((s) => s.id === e.slotId);
                const active = e.status === 'active';
                return (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.childName}</strong>
                      <div className="muted small">age {e.age}</div>
                    </td>
                    <td>
                      {program?.instrument} · {program?.formatLabel}
                      <div className="muted small">
                        {program?.teacher} · {slot?.label}
                      </div>
                    </td>
                    <td>{fmtDateTime(e.enrolledAt)}</td>
                    <td className="num">{money(e.netCents)}</td>
                    <td>
                      {active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <>
                          <Badge tone="danger">Withdrawn</Badge>
                          <div className="muted small">
                            Refunded {money(e.refundCents ?? 0)} · {e.withdrawRule === 'free-cancel' ? 'free cancel' : 'prorated'}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="right">
                      {active && (
                        <button className="btn small danger-outline" onClick={() => setWithdrawing(e)}>
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {enrollments.length > 0 && <PaymentSchedule enrollments={enrollments} />}

      <section className="card">
        <div className="section-head">
          <h2>Transactions</h2>
        </div>
        {txns.length === 0 ? (
          <p className="muted">No transactions on this account.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Method</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {[...txns]
                .sort((a, b) => b.at - a.at)
                .map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDateTime(t.at)}</td>
                    <td>{t.description}</td>
                    <td className="small">{t.method}</td>
                    <td className={`num ${t.kind === 'refund' ? 'text-warn' : ''}`}>
                      {t.kind === 'refund' ? money(-t.amountCents) : money(t.amountCents)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      {withdrawing && (
        <WithdrawModal
          enrollment={withdrawing}
          family={family}
          at={now}
          onClose={() => setWithdrawing(null)}
          onDone={(msg) => {
            setNotice(msg);
            setWithdrawing(null);
          }}
        />
      )}
    </div>
  );
}

function PaymentSchedule({ enrollments }: { enrollments: Enrollment[] }) {
  const active = enrollments.filter((e) => e.status === 'active');
  const indices = [...new Set(enrollments.flatMap((e) => e.allocations.map((a) => a.installment)))].sort();
  const regPaid = enrollments.reduce((s, e) => s + e.registrationCents, 0);

  if (indices.length === 0) return null;

  return (
    <section className="card">
      <div className="section-head">
        <h2>Payment schedule</h2>
        <span className="muted small">Scheduled amounts update when a student is withdrawn</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Installment</th>
            <th>Due</th>
            <th className="num">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {indices.map((k) => {
            const allocs = enrollments.flatMap((e) => e.allocations.filter((a) => a.installment === k && a.status !== 'void'));
            const reg = k === 1 ? regPaid : 0;
            const amount = allocs.reduce((s, a) => s + a.amountCents, 0) + reg;
            const paid = allocs.some((a) => a.status === 'paid');
            const due = INSTALLMENT_DATES_MS[k - 1] ?? INSTALLMENT_DATES_MS[0];
            return (
              <tr key={k}>
                <td>
                  {indices.length === 1 ? 'Paid in full' : `Installment ${k} of ${INSTALLMENT_DATES_MS.length}`}
                  {k === 1 && reg > 0 && <div className="muted small">includes {money(reg)} registration</div>}
                </td>
                <td>{fmtDate(due)}</td>
                <td className="num">{money(amount)}</td>
                <td>{paid ? <Badge tone="success">Paid</Badge> : <Badge>Scheduled</Badge>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {active.length === 0 && <p className="muted small">All students on this account are withdrawn.</p>}
    </section>
  );
}

function WithdrawModal({
  enrollment,
  family,
  at,
  onClose,
  onDone,
}: {
  enrollment: Enrollment;
  family: Family;
  at: number;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const { state, dispatch } = useStore();
  const [reason, setReason] = useState('Family request: wait until spring');
  const program = state.programs.find((p) => p.id === enrollment.programId)!;
  const slot = state.slots.find((s) => s.id === enrollment.slotId)!;
  const q = withdrawalQuote(enrollment, at);
  const openNow = seatsOpen(state, enrollment.slotId);
  const openAfter = Math.min(program.seats, openNow + 1);
  const balanceAfter = familyBalanceCents(state, family.id) - q.cancelledScheduleCents;
  const sinceLabel = `${q.daysSinceEnrolled} ${q.daysSinceEnrolled === 1 ? 'day' : 'days'}`;
  const scheduled = enrollment.allocations.filter((a) => a.status === 'scheduled');
  const countdown = fmtCountdown(at, enrollment.enrolledAt + RATES.freeCancelWindowDays * DAY_MS);

  return (
    <Modal
      title={`Withdraw ${enrollment.childName} from ${program.instrument}?`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Keep enrollment
          </button>
          <button
            className="btn danger"
            onClick={() => {
              dispatch({ type: 'withdraw', enrollmentId: enrollment.id, atMs: at, reason });
              onDone(
                q.refundCents > 0
                  ? `${enrollment.childName} withdrawn. ${money(q.refundCents)} refunded to ${family.cardBrand} ending ${family.cardLast4}.`
                  : `${enrollment.childName} withdrawn. No refund is due under the policy.`,
              );
            }}
          >
            Confirm withdrawal and refund {money(q.refundCents)}
          </button>
        </>
      }
    >
      <div className="withdraw-status">
        {q.withinWindow ? (
          <Badge tone="success">Inside the 7-day free-cancellation window</Badge>
        ) : (
          <Badge tone="warning">Past the 7-day window: prorated</Badge>
        )}
        <span className="muted small">
          Enrolled {fmtDateTime(enrollment.enrolledAt)} · {sinceLabel} ago
          {q.withinWindow && countdown ? ` · ${countdown} left in the window` : ''}
        </span>
      </div>

      <h3>Refund</h3>
      <table className="schedule-table">
        <tbody>
          <tr>
            <td>Tuition for {enrollment.childName} ({program.instrument}, {program.formatLabel})</td>
            <td className="num">{money(q.tuitionCents)}</td>
          </tr>
          <tr>
            <td>Paid so far</td>
            <td className="num">{money(q.paidCents)}</td>
          </tr>
          {q.rule === 'prorated' && (
            <>
              <tr>
                <td>
                  Prorated: {q.weeksRemaining} of {RATES.termWeeks} weeks remain
                </td>
                <td className="num">{money(q.proratedCents ?? 0)}</td>
              </tr>
              <tr>
                <td>Withdrawal fee</td>
                <td className="num">{money(-q.feeCents)}</td>
              </tr>
            </>
          )}
          <tr className="total">
            <td>
              Refund to {family.cardBrand} ending {family.cardLast4}
            </td>
            <td className="num">{money(q.refundCents)}</td>
          </tr>
        </tbody>
      </table>
      {q.rule === 'free-cancel' && (
        <p className="muted small">Full refund of tuition paid, because the withdrawal is inside 7 days of enrollment.</p>
      )}

      <h3>What changes on the account</h3>
      <ul className="change-list">
        <li>
          <strong>Seat released:</strong> {slot.label} {program.instrument} class, seats open goes from {openNow} to{' '}
          {openAfter}
          {program.format === 'group' ? ` of ${program.seats}` : ''}.
        </li>
        {scheduled.length > 0 && (
          <li>
            <strong>Future installments cancelled for {enrollment.childName}:</strong>{' '}
            {scheduled
              .map((a) => `${fmtDate(INSTALLMENT_DATES_MS[a.installment - 1]!)} ${money(a.amountCents)}`)
              .join(', ')}
            .
          </li>
        )}
        <li>
          <strong>Family balance after:</strong> {money(balanceAfter)}
        </li>
        <li className="muted small">
          The $25.00 registration fee is per family and stays on the account, because the family is still enrolled.
        </li>
      </ul>

      <label className="field">
        <span className="label">Reason</span>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option>Family request: wait until spring</option>
          <option>Schedule conflict</option>
          <option>Moving</option>
          <option>Changed to another class</option>
          <option>Other</option>
        </select>
      </label>
    </Modal>
  );
}
