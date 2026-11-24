import { useStore } from '../lib/store';
import { HOUSEHOLD } from '../lib/seed';
import { ageOn, NOW_ISO, usDate } from '../lib/dates';

export function HouseholdView() {
  const { dispatch } = useStore();
  return (
    <div className="form-page">
      <div className="page-head">
        <div>
          <h1>Brooks household</h1>
          <p className="page-meta">Five people. Each person’s records fill in the forms that person needs.</p>
        </div>
      </div>

      <div className="member-grid">
        {HOUSEHOLD.map((m) => {
          const initials = m.name
            .split(' ')
            .map((p) => p[0])
            .join('');
          const isCamper = m.id === 'imani';
          return (
            <article key={m.id} className="member-card">
              <div className="avatar avatar-lg" aria-hidden="true">
                {initials}
              </div>
              <div className="member-body">
                <h2>{m.name}</h2>
                <p className="muted">{m.relation}</p>
                {m.dob ? (
                  <p className="small">
                    Born {usDate(m.dob)} · age {ageOn(m.dob, NOW_ISO)}
                  </p>
                ) : (
                  <p className="small">Adult</p>
                )}
                <p className="small muted">
                  {isCamper ? 'One form in progress: Camp Ridgeline Winter Session' : 'No forms open'}
                </p>
                {isCamper && (
                  <div className="member-actions">
                    <button className="btn small" onClick={() => dispatch({ type: 'navigate', view: 'records' })}>
                      Open health record
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
