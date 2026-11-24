import { useMemo } from 'react';
import { useStore, expiryLabel, type RecordsTab } from '../lib/store';
import { buildFields, countFields, epipenProblem, tdapProblem } from '../lib/formModel';
import { PERSON } from '../lib/seed';
import { addMonths, ageOn, monthEndIso, NOW_ISO, usDate, longDate } from '../lib/dates';
import { useOpenFix } from './fixContext';
import { Callout, StatusPill } from './ui';

function expiredNow(expires: string): boolean {
  const end = expires.length === 7 ? monthEndIso(expires) : expires;
  return end < NOW_ISO;
}

const TABS: { id: RecordsTab; label: string }[] = [
  { id: 'immunizations', label: 'Immunizations' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'medications', label: 'Medications' },
  { id: 'doctor', label: 'Doctor and insurance' },
];

export function RecordsView() {
  const { state, dispatch } = useStore();
  const fields = useMemo(() => buildFields(state), [state]);
  const counts = countFields(fields);
  const flagged = fields.filter((f) => f.status === 'review');
  const age = ageOn(PERSON.dob, NOW_ISO);

  return (
    <div className="form-page">
      <div className="page-head">
        <div>
          <nav className="crumbs" aria-label="Breadcrumb">
            <span>Health records</span>
            <span aria-hidden="true">/</span>
            <span>Imani Brooks</span>
          </nav>
          <h1>Imani Brooks</h1>
          <p className="page-meta">
            Daughter · born {usDate(PERSON.dob)} · age {age} · {PERSON.school}
          </p>
        </div>
        <div className="due-box">
          <div className="due-label">Record status</div>
          <div className="due-time">
            {flagged.length > 0 ? `${flagged.length} to review` : 'No flags'}
          </div>
        </div>
      </div>

      {flagged.length > 0 && (
        <Callout tone="warn" title={`${flagged.length} entries in this record need attention before Friday`}>
          Changes you make here flow straight into the camp form.{' '}
          <button className="link-btn inline" onClick={() => dispatch({ type: 'navigate', view: 'forms' })}>
            Back to the camp form ({counts.filled}/{counts.total} filled)
          </button>
        </Callout>
      )}

      <div className="tabs" role="tablist" aria-label="Record sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={state.recordsTab === t.id}
            className={`tab${state.recordsTab === t.id ? ' is-active' : ''}`}
            onClick={() => dispatch({ type: 'setRecordsTab', tab: t.id })}
          >
            {t.label}
            {t.id === 'immunizations' && <span className="tab-count">{state.record.immunizations.length}</span>}
          </button>
        ))}
      </div>

      {state.recordsTab === 'immunizations' && <ImmunizationsTab />}
      {state.recordsTab === 'allergies' && <AllergiesTab />}
      {state.recordsTab === 'medications' && <MedicationsTab />}
      {state.recordsTab === 'doctor' && <DoctorTab />}
    </div>
  );
}

function ImmunizationsTab() {
  const { state } = useStore();
  const openFix = useOpenFix();
  const rows = [...state.record.immunizations].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return (
    <section className="panel">
      <table className="table">
        <thead>
          <tr>
            <th>Vaccine</th>
            <th>Dose</th>
            <th>Date given</th>
            <th>Given by</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const bad = r.vaccine === 'Tdap' ? tdapProblem(r.date) : null;
            return (
              <tr key={r.id} className={bad ? 'is-flagged' : undefined}>
                <td>{r.vaccine}</td>
                <td>{r.dose}</td>
                <td className="mono">{usDate(r.date)}</td>
                <td>{r.givenBy}</td>
                <td>
                  {bad ? (
                    <div className="cell-stack">
                      <StatusPill tone="bad">Before 11th birthday</StatusPill>
                      <button className="btn small" onClick={() => openFix('tdap')}>
                        Fix date
                      </button>
                    </div>
                  ) : (
                    <StatusPill tone="ok">Recorded</StatusPill>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-foot">
        {rows.length} entries from the clinic record. Dates are as given. Camp checks the Tdap date against the
        11th birthday.
      </p>
    </section>
  );
}

function AllergiesTab() {
  const { state } = useStore();
  return (
    <section className="panel">
      <table className="table">
        <thead>
          <tr>
            <th>Allergen</th>
            <th>Type</th>
            <th>Severity</th>
            <th>Reaction</th>
            <th>Action plan</th>
          </tr>
        </thead>
        <tbody>
          {state.record.allergies.map((a) => (
            <tr key={a.id}>
              <td>
                <b>{a.allergen}</b>
              </td>
              <td>{a.kind}</td>
              <td>
                <StatusPill tone={a.severity === 'Severe' ? 'bad' : a.severity === 'Moderate' ? 'warn' : 'info'}>
                  {a.severity}
                </StatusPill>
              </td>
              <td>{a.reaction}</td>
              <td>{a.plan ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MedicationsTab() {
  const { state } = useStore();
  const openFix = useOpenFix();
  return (
    <section className="panel">
      <table className="table">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Dose</th>
            <th>Schedule</th>
            <th>Lot</th>
            <th>Expires</th>
          </tr>
        </thead>
        <tbody>
          {state.record.medications.map((m) => {
            const noUnit = m.unit === null;
            const epiIssue = m.id === 'med-epi' && m.expires ? epipenProblem(m.expires) : null;
            return (
              <tr key={m.id} className={noUnit || epiIssue ? 'is-flagged' : undefined}>
                <td>
                  <b>{m.name}</b>
                  <div className="muted small">{m.purpose}</div>
                </td>
                <td>
                  {noUnit ? (
                    <div className="cell-stack">
                      <span className="mono">{m.dose}</span>
                      <StatusPill tone="warn">No unit</StatusPill>
                      <button className="btn small" onClick={() => openFix('cetirizine')}>
                        Add unit
                      </button>
                    </div>
                  ) : (
                    <span className="mono">
                      {m.dose} {m.unit}
                    </span>
                  )}
                </td>
                <td>{m.schedule}</td>
                <td className="mono">{m.lot ?? '—'}</td>
                <td>
                  {m.expires ? (
                    <div className="cell-stack">
                      <span className="mono">{expiryLabel(m.expires)}</span>
                      {epiIssue && (
                        <>
                          <StatusPill tone="bad">{expiredNow(m.expires) ? 'Expired' : 'Before camp ends'}</StatusPill>
                          <button className="btn small" onClick={() => openFix('epipen')}>
                            Replace
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-foot">Medication history is kept for reference when you replace a device.</p>
    </section>
  );
}

function DoctorTab() {
  const { state } = useStore();
  const openFix = useOpenFix();
  const ins = state.record.insurance;
  const stale = addMonths(ins.lastConfirmed, 12) < NOW_ISO;
  return (
    <div className="two-up">
      <section className="panel">
        <h3>Pediatrician</h3>
        <dl className="defs">
          <div>
            <dt>Physician</dt>
            <dd>{state.record.doctor.name}, MD</dd>
          </div>
          <div>
            <dt>Practice</dt>
            <dd>{state.record.doctor.practice}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd className="mono">{state.record.doctor.phone}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{state.record.doctor.address}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <h3>Health insurance</h3>
        <dl className="defs">
          <div>
            <dt>Carrier</dt>
            <dd>{ins.carrier}</dd>
          </div>
          <div>
            <dt>Member ID</dt>
            <dd className="mono">{ins.memberId}</dd>
          </div>
          <div>
            <dt>Group</dt>
            <dd className="mono">{ins.group}</dd>
          </div>
          <div>
            <dt>Last confirmed</dt>
            <dd>
              {longDate(ins.lastConfirmed)}{' '}
              {stale ? (
                <span className="cell-stack inline-stack">
                  <StatusPill tone="warn">Over 12 months</StatusPill>
                  <button className="btn small" onClick={() => openFix('memberId')}>
                    Confirm ID
                  </button>
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
