import { useState } from 'react';
import { familyBalanceCents, seatsOpen, useNow, useStore } from '../store';
import { buildQuote, RATES, type PricedLine, type Quote } from '../lib/pricing';
import { money } from '../lib/money';
import { EARLY_DEADLINE_MS, fmtCountdown, fmtDate, nowMs, TERM } from '../lib/time';
import { Badge, initials, Modal, PageHeader } from '../components/ui';
import type { AppState, DraftLine, PlanId } from '../types';

export function EnrollView() {
  const { state, dispatch } = useStore();
  const now = useNow();
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (state.receipt) {
    return <ReceiptPanel state={state} />;
  }

  const family = state.families.find((f) => f.id === state.draft.familyId) ?? null;
  if (!family) {
    return (
      <div className="page">
        <PageHeader title="New enrollment" subtitle={`${TERM.name} · ${TERM.rangeLabel} · 10 weeks`} />
        <div className="card empty-state">
          <h2>No enrollment in progress</h2>
          <p className="muted">Choose a family to hold lesson slots and set up their payment plan.</p>
          <button className="btn primary" onClick={() => dispatch({ type: 'setView', view: 'families' })}>
            Choose a family
          </button>
        </div>
      </div>
    );
  }

  const { draft } = state;
  const quote = buildQuote(draft.lines, state.programs, now, draft.plan);
  const balance = familyBalanceCents(state, family.id);
  const countdown = fmtCountdown(now, EARLY_DEADLINE_MS);
  const hasLines = draft.lines.length > 0;
  const pastCount = family.pastTerms.length;

  return (
    <div className="page">
      <PageHeader
        title="New enrollment"
        subtitle={`${TERM.name} · ${TERM.rangeLabel} · 10 weeks`}
        right={
          countdown ? (
            <div className="deadline-pill">
              <strong>Early rate ends tonight at 11:59 PM</strong>
              <span>{countdown} left</span>
            </div>
          ) : (
            <div className="deadline-pill ended">
              <strong>Early-enrollment rate has ended</strong>
            </div>
          )
        }
      />

      <section className="card family-strip">
        <div className="family-id">
          <div className="avatar avatar-lg">{initials(family.name)}</div>
          <div>
            <h2>{family.name} family</h2>
            <p className="muted">
              {family.parents} · {family.phone}
            </p>
          </div>
        </div>
        <div className="strip-cell">
          <span className="label">Card on file</span>
          <strong>
            {family.cardBrand} ending {family.cardLast4}
          </strong>
          <span className="muted small">Exp {family.cardExp}</span>
        </div>
        <div className="strip-cell">
          <span className="label">Account balance</span>
          <strong className={balance > 0 ? 'text-warn' : ''}>{money(balance)}</strong>
        </div>
        <div className="strip-cell">
          <span className="label">Past terms enrolled</span>
          <strong>{pastCount}</strong>
          <span className="muted small">{family.pastTerms.join(', ')}</span>
        </div>
      </section>

      <div className="enroll-grid">
        <section>
          <div className="section-head">
            <h2>Students and classes</h2>
            <span className="muted small">
              {draft.lines.length} {draft.lines.length === 1 ? 'student' : 'students'} · seats are held until you confirm
            </span>
          </div>

          {draft.lines.length === 0 && (
            <div className="card empty-state">
              <p className="muted">No students yet. Add the first student and class.</p>
            </div>
          )}

          <div className="line-list">
            {draft.lines.map((line, i) => (
              <LineCard key={line.id} line={line} priced={quote.lines[i]} state={state} onChange={dispatch} />
            ))}
          </div>

          <button className="btn dashed" onClick={() => setAdding(true)}>
            + Add a student or class
          </button>
        </section>

        <aside className="card summary">
          <h2>Summary</h2>

          <div className="summary-lines">
            {quote.lines.map((pl) => (
              <div className="summary-row" key={pl.lineId}>
                <span>{pl.childName}</span>
                <span>{money(pl.netCents)}</span>
              </div>
            ))}
            {!hasLines && <p className="muted small">No students added.</p>}
          </div>
          <div className="summary-row">
            <span>Tuition</span>
            <span>{money(quote.tuitionCents)}</span>
          </div>
          <div className="summary-row">
            <span>Registration fee (per family)</span>
            <span>{money(quote.registrationCents)}</span>
          </div>
          <div className="summary-row total">
            <span>Total for {TERM.name}</span>
            <span>{money(quote.totalCents)}</span>
          </div>

          <h3>Payment plan</h3>
          <PlanPicker plan={draft.plan} onChange={(plan) => dispatch({ type: 'setPlan', plan })} />

          <table className="schedule-table">
            <tbody>
              {quote.installments.map((inst) => (
                <tr key={inst.index}>
                  <td>
                    {draft.plan === 'full' ? 'Paid today' : `Installment ${inst.index}`} · {fmtDate(inst.dueMs)}
                    {inst.registrationCents > 0 && (
                      <div className="muted small">includes {money(inst.registrationCents)} registration fee</div>
                    )}
                  </td>
                  <td className="num">{money(inst.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="charge-box">
            <span className="label">
              Charge today to {family.cardBrand} ending {family.cardLast4}
            </span>
            <strong>{money(quote.chargeTodayCents)}</strong>
          </div>

          <button className="btn primary block" disabled={!hasLines} onClick={() => setConfirming(true)}>
            Confirm and charge {money(quote.chargeTodayCents)}
          </button>
          <button className="btn ghost block" disabled={!hasLines} onClick={() => setClearing(true)}>
            Clear enrollment
          </button>
        </aside>
      </div>

      {adding && <AddStudentModal onClose={() => setAdding(false)} />}

      {confirming && (
        <Modal
          title={`Charge ${money(quote.chargeTodayCents)} to ${family.cardBrand} ending ${family.cardLast4}?`}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setConfirming(false)}>
                Back to enrollment
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  dispatch({ type: 'confirmDraft', atMs: nowMs() });
                  setConfirming(false);
                }}
              >
                Confirm and charge {money(quote.chargeTodayCents)}
              </button>
            </>
          }
        >
          <ConfirmBody quote={quote} plan={draft.plan} familyName={family.name} studentCount={draft.lines.length} />
        </Modal>
      )}

      {clearing && (
        <Modal
          title="Clear this enrollment?"
          onClose={() => setClearing(false)}
          width={460}
          footer={
            <>
              <button className="btn ghost" onClick={() => setClearing(false)}>
                Keep holds
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  dispatch({ type: 'clearDraft' });
                  setClearing(false);
                }}
              >
                Clear and release seats
              </button>
            </>
          }
        >
          <p>
            This removes {draft.lines.length} student{draft.lines.length === 1 ? '' : 's'} from the {family.name} family
            enrollment and releases the held lesson slots. Nothing has been charged.
          </p>
        </Modal>
      )}
    </div>
  );
}

function PlanPicker({ plan, onChange }: { plan: PlanId; onChange: (p: PlanId) => void }) {
  const options: { id: PlanId; title: string }[] = [
    { id: 'inst3', title: '3 installments' },
    { id: 'full', title: 'Pay in full' },
  ];
  return (
    <div className="segmented" role="radiogroup" aria-label="Payment plan">
      {options.map((o) => (
        <label key={o.id} className={`seg ${plan === o.id ? 'on' : ''}`}>
          <input type="radio" name="plan" checked={plan === o.id} onChange={() => onChange(o.id)} />
          {o.title}
        </label>
      ))}
    </div>
  );
}

function LineCard({
  line,
  priced,
  state,
  onChange,
}: {
  line: DraftLine;
  priced: PricedLine;
  state: AppState;
  onChange: (a: { type: 'removeLine'; lineId: string } | { type: 'changeSlot'; lineId: string; slotId: string }) => void;
}) {
  const program = state.programs.find((p) => p.id === line.programId)!;
  const slots = state.slots.filter((s) => s.programId === line.programId);
  const open = seatsOpen(state, line.slotId);
  const isGroup = program.format === 'group';

  return (
    <article className="card line-card">
      <div className="avatar">{initials(line.childName)}</div>
      <div className="line-main">
        <div className="line-title">
          <strong>{line.childName}</strong>
          <span className="muted">age {line.age}</span>
          {priced.siblingApplied && <Badge tone="info">Sibling rate</Badge>}
        </div>
        <div className="muted small">
          {program.instrument} · {program.formatLabel} · {program.teacher}
        </div>

        <div className="slot-row">
          <label className="label" htmlFor={`slot-${line.id}`}>
            Lesson time
          </label>
          <select
            id={`slot-${line.id}`}
            value={line.slotId}
            onChange={(e) => onChange({ type: 'changeSlot', lineId: line.id, slotId: e.target.value })}
          >
            {slots.map((s) => {
              const sOpen = seatsOpen(state, s.id);
              const own = s.id === line.slotId;
              const disabled = !own && sOpen <= 0;
              const suffix = isGroup
                ? ` · ${own ? open : sOpen} of ${program.seats} seats left`
                : disabled
                  ? ' · booked'
                  : '';
              return (
                <option key={s.id} value={s.id} disabled={disabled}>
                  {s.label}
                  {suffix}
                </option>
              );
            })}
          </select>
        </div>
        <div className="hold-note small">
          {isGroup
            ? `${open} of ${program.seats} seats left in this class, including this hold`
            : 'Slot held for this enrollment'}
        </div>
      </div>

      <div className="line-price">
        <div className="price-row">
          <span>List price</span>
          <span>{money(priced.listCents)}</span>
        </div>
        {priced.earlyCents > 0 && (
          <div className="price-row discount">
            <span>Early enrollment {RATES.earlyPct}%</span>
            <span>{money(-priced.earlyCents)}</span>
          </div>
        )}
        {priced.siblingCents > 0 && (
          <div className="price-row discount">
            <span>Sibling {RATES.siblingPct}%</span>
            <span>{money(-priced.siblingCents)}</span>
          </div>
        )}
        <div className="price-row net">
          <span>Tuition</span>
          <span>{money(priced.netCents)}</span>
        </div>
        <button className="link-btn danger" onClick={() => onChange({ type: 'removeLine', lineId: line.id })}>
          Remove
        </button>
      </div>
    </article>
  );
}

function ConfirmBody({
  quote,
  plan,
  familyName,
  studentCount,
}: {
  quote: Quote;
  plan: PlanId;
  familyName: string;
  studentCount: number;
}) {
  const first = quote.installments[0];
  return (
    <div className="confirm-body">
      <p>
        {familyName} family · {studentCount} {studentCount === 1 ? 'student' : 'students'} · {TERM.name}
      </p>
      <table className="schedule-table">
        <tbody>
          <tr>
            <td>
              {plan === 'full' ? 'Full tuition' : 'Installment 1 tuition'}
            </td>
            <td className="num">{money(first.tuitionCents)}</td>
          </tr>
          <tr>
            <td>Registration fee (once per family)</td>
            <td className="num">{money(first.registrationCents)}</td>
          </tr>
          <tr className="total">
            <td>Charged today</td>
            <td className="num">{money(first.totalCents)}</td>
          </tr>
        </tbody>
      </table>
      {plan === 'inst3' && (
        <p className="muted small">
          Remaining installments: {quote.installments.slice(1).map((i) => `${fmtDate(i.dueMs)} ${money(i.totalCents)}`).join(' and ')}.
        </p>
      )}
      <p className="small">Seats are confirmed for every student once the charge goes through.</p>
    </div>
  );
}

function ReceiptPanel({ state }: { state: AppState }) {
  const { dispatch } = useStore();
  const r = state.receipt!;
  return (
    <div className="page">
      <PageHeader title="New enrollment" subtitle={`${TERM.name} · ${TERM.rangeLabel}`} />
      <section className="card receipt">
        <div className="receipt-head">
          <span className="check-badge" aria-hidden="true">
            ✓
          </span>
          <div>
            <h2>Enrollment confirmed</h2>
            <p className="muted">
              {r.familyName} family · receipt {r.number}
            </p>
          </div>
        </div>
        <div className="receipt-grid">
          <div>
            <span className="label">Charged today</span>
            <strong>{money(r.chargedCents)}</strong>
            <span className="muted small">
              {r.cardLabel} · {r.planLabel}
            </span>
          </div>
          <div>
            <span className="label">Next payment</span>
            <strong>{r.nextDueMs ? `${fmtDate(r.nextDueMs)} · ${money(r.nextDueCents ?? 0)}` : 'None: paid in full'}</strong>
          </div>
          <div>
            <span className="label">Students enrolled</span>
            <strong>{r.studentNames.join(', ')}</strong>
          </div>
        </div>
        <div className="receipt-actions">
          <button className="btn primary" onClick={() => dispatch({ type: 'selectFamily', familyId: r.familyId })}>
            Open {r.familyName} account
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              dispatch({ type: 'dismissReceipt' });
              dispatch({ type: 'setView', view: 'families' });
            }}
          >
            Start another enrollment
          </button>
        </div>
      </section>
    </div>
  );
}

function AddStudentModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [programId, setProgramId] = useState(state.programs[0]!.id);
  const openSlotsFor = (pid: string) => state.slots.filter((s) => s.programId === pid && seatsOpen(state, s.id) > 0);
  const [slotId, setSlotId] = useState(openSlotsFor(state.programs[0]!.id)[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const slotChoices = openSlotsFor(programId);
  const program = state.programs.find((p) => p.id === programId)!;

  const submit = () => {
    const ageNum = Number(age);
    if (!name.trim()) return setError('Enter the student’s name.');
    if (!Number.isInteger(ageNum) || ageNum < 3 || ageNum > 99) return setError('Enter the student’s age (3–99).');
    if (!slotId) return setError('Pick a lesson time with an open seat.');
    dispatch({ type: 'addLine', childName: name.trim(), age: ageNum, programId, slotId });
    onClose();
  };

  return (
    <Modal
      title="Add a student or class"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit}>
            Add and hold seat
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field span-2">
          <span className="label">Student name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" autoFocus />
        </label>
        <label className="field">
          <span className="label">Age</span>
          <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="Age" />
        </label>
        <label className="field span-2">
          <span className="label">Class</span>
          <select
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value);
              setSlotId(openSlotsFor(e.target.value)[0]?.id ?? '');
            }}
          >
            {state.programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.instrument} · {p.formatLabel} · {p.teacher} · {money(p.listCents)}
              </option>
            ))}
          </select>
        </label>
        <label className="field span-2">
          <span className="label">Lesson time (open seats only)</span>
          <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            {slotChoices.length === 0 && <option value="">No open times</option>}
            {slotChoices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {program.format === 'group' ? ` · ${seatsOpen(state, s.id)} of ${program.seats} seats left` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <p className="muted small">The seat is held for this enrollment until you confirm or clear it.</p>
    </Modal>
  );
}

