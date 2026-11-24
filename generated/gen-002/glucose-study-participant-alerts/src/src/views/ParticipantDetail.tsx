import { EVENTS, RULE_BY_ID, RULES } from '../data/alerts';
import { STEP_GOAL, participant } from '../data/roster';
import { glucoseSamples, meals, minGlucose, nightsOf, stepsBetween } from '../data/series';
import { Badge, Facts, MealThumb, Panel, SectionLabel, type Tone } from '../components/ui';
import { GlucoseChart } from '../components/GlucoseChart';
import { participantStatus, snoozesFor } from '../state/derive';
import { useStore } from '../state/store';
import { HOUR, NOW, SAMPLE, WINDOW_START, dayLabel, durationLabel, hhmm, pt, sensorDay, stamp } from '../lib/time';

export function ParticipantDetail({ pid }: { pid: string }) {
  const { state, dispatch } = useStore();
  const p = participant(pid);
  const status = participantStatus(p, state);
  const samples = glucoseSamples(pid, WINDOW_START, NOW);
  const mean = samples.length ? Math.round(samples.reduce((a, s) => a + s.v, 0) / samples.length) : null;
  const low = minGlucose(pid, WINDOW_START, NOW);
  const coverage = Math.round((samples.length / ((NOW - WINDOW_START) / SAMPLE)) * 100);
  const steps = stepsBetween(pid, WINDOW_START, NOW);
  const nights = nightsOf(pid);
  const lastNight = nights[nights.length - 1];
  const overnight = minGlucose(pid, lastNight.start, Math.min(lastNight.end, NOW));
  const mealList = meals(pid).filter((m) => m.at >= WINDOW_START && m.at <= NOW);
  const alerts = EVENTS.filter((e) => e.pid === pid);
  const calls = state.calls.filter((c) => c.pid === pid);
  const adverse = state.adverse.filter((a) => a.pid === pid);
  const snoozes = snoozesFor(state, pid);
  const sd = sensorDay(p.insertedMs, NOW);

  const snoozeable = RULES.filter((r) => ['STEP-01', 'SENS-03', 'SYNC-01', 'MEAL-02'].includes(r.id));
  const hasStepAlerts = alerts.some((e) => e.ruleId === 'STEP-01');

  return (
    <div className="detail-stack">
      <div className="detail-head">
        <div>
          <div className="eyebrow">Participant record · cohort 3</div>
          <h2>
            {p.id}
          </h2>
          <p className="sub">
            {p.sex}, {p.age} · sensor {p.sensorSn} · day {sd} · last data {stamp(p.lastUploadMs)}
            {NOW - p.lastUploadMs > HOUR ? ` (${durationLabel(NOW - p.lastUploadMs)} ago)` : ''}
          </p>
        </div>
        <div className="head-badges">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <Panel title="Last 24 hours" aside={<span className="muted">{hhmm(WINDOW_START)} to {hhmm(NOW)}, {dayLabel(WINDOW_START)} to {dayLabel(NOW)}</span>}>
        <GlucoseChart
          pid={pid}
          from={WINDOW_START}
          to={NOW}
          tickHours={3}
          label={`24-hour glucose trace for ${pid}`}
        />
        <div className="stat-row">
          <Stat label="Lowest reading" value={low ? `${low.v} mg/dL` : '—'} sub={low ? hhmm(low.t) : ''} tone={low && low.v < 54 ? 'safety' : undefined} />
          <Stat label="Mean" value={mean ? `${mean} mg/dL` : '—'} sub="24 h" />
          <Stat label="Overnight low" value={overnight ? `${overnight.v} mg/dL` : '—'} sub={`sleep ${hhmm(lastNight.start)}–${hhmm(lastNight.end)}`} />
          <Stat label="Coverage" value={`${coverage}%`} sub={`${samples.length} readings`} />
          <Stat label="Steps, 24 h" value={steps.toLocaleString('en-US')} sub={`goal ${STEP_GOAL.toLocaleString('en-US')}`} tone={steps < STEP_GOAL ? 'advisory' : undefined} />
        </div>
      </Panel>

      <div className="two-col">
        <Panel title="Meals, last 24 hours">
          {mealList.length === 0 && <p className="muted">No meals logged.</p>}
          <ul className="meal-list">
            {mealList.map((m) => (
              <li key={m.id}>
                <MealThumb hue={m.hue} photo={m.photo} label={`${m.kind} ${hhmm(m.at)}`} />
                <div>
                  <strong>{m.kind} · {hhmm(m.at)}</strong>
                  <div className="muted">{m.text}{m.photo ? '' : ' · no photo'}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Study details">
          <Facts
            rows={[
              ['Sensor', <span className="mono">{p.sensorSn}</span>],
              ['Site', p.sensorSite],
              ['Inserted', `${dayLabel(p.insertedMs)}, sensor day ${sd}`],
              ['Phone', <a href={`tel:+1${p.phone.replace(/\D/g, '')}`}>{p.phone}</a>],
              ['Companion app', p.heartbeatMs ? `Checked in ${hhmm(p.heartbeatMs)}` : 'Not reported today'],
              ['Injury', p.injuredOn ? `Reported ${dayLabel(pt(p.injuredOn, '12:00'))}` : 'None reported'],
            ]}
          />
          <SectionLabel>Notes</SectionLabel>
          {p.notes.length ? (
            <ul className="plain-list">
              {p.notes.map((n) => (
                <li key={n.on + n.text}>
                  <strong>{dayLabel(pt(n.on, '12:00'))}</strong> {n.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No notes on file.</p>
          )}
        </Panel>
      </div>

      <Panel title="Alerts, last 24 hours" aside={<span className="muted">{alerts.length} events</span>}>
        {alerts.length === 0 && <p className="muted">No alerts for this participant.</p>}
        <table className="table compact">
          <tbody>
            {alerts.map((e) => (
              <tr key={e.id}>
                <td className="mono">{hhmm(e.at)}</td>
                <td>{RULE_BY_ID[e.ruleId].name}</td>
                <td>{e.handling}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="actions">
          {hasStepAlerts && !snoozes.some((s) => s.ruleId === 'STEP-01') && (
            <button
              type="button"
              className="btn"
              onClick={() => dispatch({ type: 'select', selection: { kind: 'snooze', pid, ruleId: 'STEP-01' } })}
            >
              Snooze step-goal alerts…
            </button>
          )}
          {snoozeable.length > 0 && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => dispatch({ type: 'select', selection: { kind: 'snooze', pid, ruleId: 'SENS-03' } })}
            >
              Snooze another alert…
            </button>
          )}
        </div>
      </Panel>

      {(snoozes.length > 0 || calls.length > 0 || adverse.length > 0) && (
        <div className="two-col">
          {snoozes.length > 0 && (
            <Panel title="Active snoozes">
              <ul className="plain-list">
                {snoozes.map((s) => (
                  <li key={s.id}>
                    <strong>{s.ruleId}</strong> until {stamp(s.untilMs)}. {s.reason}.
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {calls.length > 0 && (
            <Panel title="Calls logged this session">
              <ul className="plain-list">
                {calls.map((c) => (
                  <li key={c.id}>
                    <strong>{stamp(c.at)}</strong> {c.purpose}: {c.outcome.toLowerCase()}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {adverse.length > 0 && (
            <Panel title="Adverse events">
              <ul className="plain-list">
                {adverse.map((a) => (
                  <li key={a.id}>
                    <strong>{a.id}</strong> {stamp(a.occurredAt)} · {a.term}. {a.piReview ?? 'PI review pending'}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <span className="muted small">Daily step goal {STEP_GOAL.toLocaleString('en-US')}. Steps come from the activity tracker, not the CGM.</span>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: Tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
