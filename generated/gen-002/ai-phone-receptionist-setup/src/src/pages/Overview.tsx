import { Card, Pill, PageHeader, StatusDot, type Tone } from '../components/ui';
import { seedCalls, stats30d } from '../data/seed';
import { evaluateCall, isRegularHours, quoteFor, tallyFlags, type CheckResult } from '../lib/engine';
import { fixStatusTone, tonightFixes } from '../lib/fixes';
import { go } from '../lib/route';
import { useAppState } from '../lib/store';
import { useNow } from '../lib/useNow';
import { fmtDay, fmtDayLong, fmtMoney, fmtTime } from '../lib/time';
import type { Call, Flag } from '../types';

function callStatus(results: CheckResult[]): { label: string; tone: Tone } {
  if (results.some((r) => r.status === 'fail')) return { label: 'Still wrong', tone: 'bad' };
  if (results.some((r) => r.status === 'manual')) return { label: 'Needs a rule', tone: 'warn' };
  return { label: 'Settings right', tone: 'ok' };
}

export function Overview() {
  const live = useAppState((s) => s.live);
  const draft = useAppState((s) => s.draft);
  const cleared = useAppState((s) => s.cleared);
  const now = useNow();

  const openFlags = seedCalls.filter(
    (c): c is Call & { flag: Flag } => !!c.flag && !cleared.includes(c.id),
  );
  const liveTally = tallyFlags(live, openFlags);
  const draftTally = tallyFlags(draft, openFlags);
  const dirty = JSON.stringify(live) !== JSON.stringify(draft);
  const fixes = tonightFixes(live);
  const doneCount = fixes.filter((f) => f.status === 'done').length;

  const car = live.services.find((x) => x.id === 'car-lockout');
  const carNow = car ? quoteFor(live, car, now) : null;
  const afterHoursNow = !isRegularHours(live, now);

  return (
    <>
      <PageHeader
        title="Overview"
        lede={`${fmtDayLong(now)}, ${fmtTime(now)} Phoenix time. ${
          afterHoursNow
            ? 'It is after hours, so after-hours rates apply to services that have them switched on.'
            : 'It is regular hours.'
        }`}
      />

      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">Calls handled</div>
          <div className="stat-value">{stats30d.calls}</div>
          <div className="stat-sub">last 30 days</div>
        </div>
        <div className="stat">
          <div className="stat-label">Jobs booked</div>
          <div className="stat-value">{stats30d.booked}</div>
          <div className="stat-sub">{Math.round((stats30d.booked / stats30d.calls) * 100)}% of calls</div>
        </div>
        <button type="button" className="stat stat-button" onClick={() => go('#/calls')}>
          <div className="stat-label">Flagged as wrong info</div>
          <div className="stat-value warn-text">{openFlags.length}</div>
          <div className="stat-sub">open. Review them →</div>
        </button>
      </div>

      <div className="overview-grid">
        <Card
          title="Flagged calls"
          subtitle={
            dirty ? (
              <>
                Live settings handle <strong>{liveTally.pass} of {liveTally.total}</strong>. Your unsaved draft would
                handle <strong>{draftTally.pass} of {draftTally.total}</strong>.
              </>
            ) : (
              <>
                Live settings handle <strong>{liveTally.pass} of {liveTally.total}</strong>. Open a call to re-check it
                against your settings.
              </>
            )
          }
          className="flag-card"
        >
          <ul className="flag-list">
            {openFlags.map((call) => {
              const status = callStatus(evaluateCall(live, call));
              return (
                <li key={call.id}>
                  <a className="flag-row" href={`#/calls/${call.id}`}>
                    <div className="flag-when">
                      <div>{fmtDay(call.startedAt)}</div>
                      <div className="muted small">{fmtTime(call.startedAt)}</div>
                    </div>
                    <div className="flag-main">
                      <div className="flag-top">
                        <span className="flag-city">{call.city}</span>
                        <Pill tone="neutral">{call.flag.category}</Pill>
                      </div>
                      <div className="flag-note">{call.flag.note}</div>
                    </div>
                    <Pill tone={status.tone}>{status.label}</Pill>
                  </a>
                </li>
              );
            })}
          </ul>
          {openFlags.length === 0 && <p className="muted">No open flags.</p>}
        </Card>

        <div className="side-col">
          <Card title="Tonight's fixes" subtitle={`${doneCount} of ${fixes.length} done in saved settings`}>
            <ol className="fix-list">
              {fixes.map((f) => (
                <li key={f.id} className={`fix ${f.status}`}>
                  <StatusDot tone={fixStatusTone(f.status)} />
                  <div className="fix-body">
                    <div className="fix-title">{f.title}</div>
                    <div className="fix-detail muted">{f.detail}</div>
                  </div>
                  <a className="link-btn" href={`#/${f.page}`}>
                    {f.target} →
                  </a>
                </li>
              ))}
            </ol>
            {dirty && (
              <p className="note">Draft changes are not live yet. Save them from the bar at the bottom to update this list.</p>
            )}
          </Card>

          <Card title="A car lockout calling right now">
            {carNow && carNow.kind === 'amount' ? (
              <>
                <div className="now-price">{fmtMoney(carNow.amount)}</div>
                <div className="muted">
                  {carNow.afterHours ? 'After-hours rate.' : 'Regular rate.'} The price sheet lists{' '}
                  {car?.afterHours ? `${fmtMoney(car.afterHours)} after hours` : 'no after-hours rate'}.
                </div>
                {afterHoursNow && !carNow.afterHours && (
                  <p className="now-warn">
                    <Pill tone="bad">Wrong for this hour</Pill>
                  </p>
                )}
              </>
            ) : (
              <div className="muted">Car lockouts are not priced on the sheet.</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
