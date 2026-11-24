import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { buildFields, countFields, openItems, SECTIONS } from '../lib/formModel';
import { CAMP, PERSON } from '../lib/seed';
import { longDate, NOW_ISO, NOW_MINUTES, shortDate, timeLabel } from '../lib/dates';
import { Callout } from './ui';

const SIGNER = 'Darnell Brooks';
const REFERENCE = 'RIDGE-26-0412';

export function ReviewView() {
  const { state, dispatch } = useStore();
  const fields = useMemo(() => buildFields(state), [state]);
  const counts = countFields(fields);
  const blocking = openItems(fields).length;

  const [accurate, setAccurate] = useState(false);
  const [contactOk, setContactOk] = useState(false);
  const [typed, setTyped] = useState('');

  const nameMatches = typed.trim().toLowerCase() === SIGNER.toLowerCase();
  const canSubmit = blocking === 0 && accurate && contactOk && nameMatches;

  return (
    <div className="form-page">
      <button className="link-btn" onClick={() => dispatch({ type: 'navigate', view: 'forms' })}>
        ← Back to the form
      </button>
      <div className="page-head">
        <div>
          <h1>Review and sign</h1>
          <p className="page-meta">
            {CAMP.name} · {PERSON.legalName} · Due {longDate(CAMP.dueDate)}, 12:00 PM
          </p>
        </div>
        <div className="due-box">
          <div className="due-label">Complete</div>
          <div className="due-time">
            {counts.filled} of {counts.total} fields
          </div>
        </div>
      </div>

      <div className="review-layout">
        <div className="review-main">
          {SECTIONS.map((s) => {
            const list = fields.filter((f) => f.section === s.id);
            return (
              <section key={s.id} className="sec-card">
                <header className="sec-head">
                  <h2>
                    <span className="sec-letter">{s.id}</span>
                    {s.title}
                  </h2>
                  <span className="sec-count">{list.length} fields</span>
                </header>
                <dl className="review-list">
                  {list.map((f) => (
                    <div key={f.id} className="review-item">
                      <dt>
                        <span className="row-id">{f.id}</span> {f.label}
                      </dt>
                      <dd>{f.value ?? 'Not on file'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>

        <aside className="side" aria-label="Signature">
          <div className="side-card">
            <div className="eyebrow">Changes made in this session</div>
            {state.camp.changes.length === 0 ? (
              <p className="small muted">None. Every value is as stored in the record.</p>
            ) : (
              <ul className="changes">
                {state.camp.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="side-card">
            <h3>Parent or guardian signature</h3>
            {blocking > 0 && (
              <Callout tone="warn">
                {blocking} {blocking === 1 ? 'item is' : 'items are'} still open on the form. Go back to clear them
                before signing.
              </Callout>
            )}

            <div className="sign-form">
              <label className="check">
                <input type="checkbox" checked={accurate} onChange={(e) => setAccurate(e.target.checked)} disabled={blocking > 0} />
                <span>I checked every answer above against Imani’s record and the after-visit summary.</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} disabled={blocking > 0} />
                <span>I agree that camp’s health office may call the emergency contact listed above.</span>
              </label>

              <div className="field">
                <label className="field-label" htmlFor="sign-name">
                  Type your full name to sign
                </label>
                <input
                  id="sign-name"
                  className="input sign-input"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={SIGNER}
                  autoComplete="off"
                  disabled={blocking > 0}
                />
                <p className="field-hint">Signing as the parent or guardian of {PERSON.legalName}.</p>
              </div>
            </div>

            <div className="kv kv-compact">
              <div>
                <span>Signed on</span>
                {longDate(NOW_ISO)}, {timeLabel(NOW_MINUTES)}
              </div>
            </div>

            <button
              className="btn primary block"
              disabled={!canSubmit}
              onClick={() => dispatch({ type: 'submit', reference: REFERENCE })}
            >
              Submit to Camp Ridgeline
            </button>
            <p className="side-foot">
              {canSubmit
                ? `Goes to the ${CAMP.submitTo} before ${shortDate(CAMP.dueDate)}, 12:00 PM.`
                : 'Tick both boxes and type your name to enable submitting.'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function SubmittedView() {
  const { state, dispatch } = useStore();
  const ref = state.camp.submittedRef ?? REFERENCE;
  return (
    <div className="form-page submitted-page">
      <div className="submitted-card">
        <div className="check-badge" aria-hidden="true">
          ✓
        </div>
        <h1>Form submitted</h1>
        <p className="lede">
          {CAMP.name} received the health form for {PERSON.legalName}.
        </p>
        <dl className="submitted-facts">
          <div>
            <dt>Reference</dt>
            <dd className="mono">{ref}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>
              {longDate(NOW_ISO)}, {timeLabel(NOW_MINUTES)}
            </dd>
          </div>
          <div>
            <dt>Signed by</dt>
            <dd>{SIGNER}, parent or guardian</dd>
          </div>
          <div>
            <dt>Fields</dt>
            <dd>48 of 48 complete</dd>
          </div>
        </dl>
        <div className="submitted-actions">
          <button className="btn ghost" onClick={() => window.print()}>
            Print a copy
          </button>
          <button className="btn primary" onClick={() => dispatch({ type: 'navigate', view: 'forms' })}>
            Back to health forms
          </button>
        </div>
      </div>
    </div>
  );
}
