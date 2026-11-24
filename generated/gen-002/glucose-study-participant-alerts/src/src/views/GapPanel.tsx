import { useState } from 'react';
import type { AlertEvent } from '../data/alerts';
import { participant } from '../data/roster';
import { gapRuns, nightsOf, valueAt } from '../data/series';
import { Badge, CheckRow, Field, Panel } from '../components/ui';
import { GlucoseChart } from '../components/GlucoseChart';
import { closureOf } from '../state/derive';
import { useStore } from '../state/store';
import { CURRENT_USER, type CallLog, type CallOutcome } from '../state/types';
import { HOUR, NOW, dayLabel, durationLabel, hhmm, pt, sensorDay, stamp } from '../lib/time';

const ADVICE = [
  'Keep phone within 1 m of sensor',
  'Restart companion app',
  'Check sensor edges and placement',
  'Confirm sensor still on skin',
  'Replacement visit to be scheduled',
];

export function GapPanel({ event }: { event: AlertEvent }) {
  const { state, dispatch } = useStore();
  const p = participant(event.pid);
  const closure = closureOf(event, state);
  const sinceUpload = NOW - p.lastUploadMs;
  const threshold = p.lastUploadMs + 12 * HOUR;
  const remaining = threshold - NOW;
  const pct = Math.min(100, Math.round((sinceUpload / (12 * HOUR)) * 100));
  const lastReadingAt = p.lastReadingMs;
  const lastValue = valueAt(p.id, lastReadingAt);
  const earlierDrops = gapRuns(p.id, 4, p.insertedMs, p.lastReadingMs).length;
  const nights = nightsOf(p.id);
  const night = nights[nights.length - 1];
  const visit = state.visitRequests[p.id];
  const calls = state.calls.filter((c) => c.pid === p.id && c.at >= p.lastUploadMs);
  const chartFrom = NOW - 12 * HOUR;

  return (
    <div className="detail-stack">
      <div className="detail-head">
        <div>
          <div className="eyebrow">Protocol · no sensor data</div>
          <h2>
            {p.id} · no data for {durationLabel(sinceUpload)}
          </h2>
          <p className="sub">
            Last upload {stamp(p.lastUploadMs)} · escalated {hhmm(event.at)} · {closure ? 'closed' : 'open'}
          </p>
        </div>
        <div className="head-badges">
          <Badge tone="protocol">Protocol</Badge>
          <Badge tone={closure ? 'ok' : 'protocol'}>{closure ? 'Closed' : 'Open'}</Badge>
        </div>
      </div>

      {closure && (
        <div className="notice notice-ok">
          <strong>Closed {stamp(closure.at)} by {closure.by}.</strong> {closure.note}
        </div>
      )}

      <Panel title="12-hour replacement threshold">
        <div className="threshold">
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={12} aria-valuenow={Math.round(sinceUpload / HOUR)}>
            <div className="bar-fill protocol" style={{ width: `${pct}%` }} />
            <div className="bar-mark" style={{ left: '100%' }} />
          </div>
          <div className="threshold-labels">
            <span>0 h</span>
            <span>
              <strong>{durationLabel(sinceUpload)}</strong> without data
            </span>
            <span>
              12 h at <strong>{hhmm(threshold)}</strong>
            </span>
          </div>
          <p className="hint">
            {remaining > 0
              ? `Replacement visit is required if no data arrives by ${hhmm(threshold)}, in ${durationLabel(remaining)}.`
              : 'The 12-hour threshold has passed. Replacement visit is required.'}
          </p>
        </div>
        <GlucoseChart
          pid={p.id}
          from={chartFrom}
          to={NOW}
          marker={p.lastUploadMs}
          markerLabel="Last upload"
          tickHours={2}
          label={`CGM trace for ${p.id}, last 12 hours; no data after ${hhmm(p.lastUploadMs)}`}
        />
      </Panel>

      <div className="two-col">
        <Panel title="What the system can see">
          <dl className="facts stacked">
            <div className="fact"><dt>Last reading</dt><dd>{lastValue ?? '—'} mg/dL at {hhmm(lastReadingAt)}, {dayLabel(lastReadingAt)}</dd></div>
            <div className="fact"><dt>Companion app</dt><dd>{p.heartbeatMs ? `Checked in ${hhmm(p.heartbeatMs)} today` : 'No check-in recorded'}</dd></div>
            <div className="fact"><dt>Sensor</dt><dd><span className="mono">{p.sensorSn}</span>, {p.sensorSite}</dd></div>
            <div className="fact"><dt>Sensor day</dt><dd>Day {sensorDay(p.insertedMs, NOW)}, inserted {dayLabel(p.insertedMs)}</dd></div>
            <div className="fact"><dt>Earlier drops</dt><dd>{earlierDrops} this cohort of 20+ min, both recovered after reconnect</dd></div>
            <div className="fact"><dt>Sleep, last night</dt><dd>{hhmm(night.start)} to {hhmm(night.end)} (self-recorded)</dd></div>
            <div className="fact"><dt>Phone</dt><dd><a href={`tel:+1${p.phone.replace(/\D/g, '')}`}>{p.phone}</a></dd></div>
          </dl>
        </Panel>

        <Panel title="Facts for the call decision">
          <ul className="facts-list">
            <li>
              A call before {hhmm(threshold)} is the only way to find out whether the phone or sensor can be fixed before the threshold.
            </li>
            <li>
              The 12-hour rule triggers a replacement visit at {hhmm(threshold)} unless data resumes first.
            </li>
            <li>
              The companion app checked in at {p.heartbeatMs ? hhmm(p.heartbeatMs) : '—'}, so the phone was on this morning. The sensor has not transmitted since {hhmm(p.lastUploadMs)} Mon.
            </li>
            <li>
              Self-recorded sleep ended at {hhmm(night.end)}. Calls are not alerts; the participant can decline.
            </li>
          </ul>
        </Panel>
      </div>

      {!closure && (
        <GapCallForm pid={p.id} done={calls.length > 0} />
      )}

      <Panel title="Replacement visit">
        {visit ? (
          <div className="notice notice-ok">
            Replacement visit requested {stamp(visit.at)}. {visit.note}
          </div>
        ) : (
          <p className="hint">Request this if the 12-hour threshold is reached or the call shows the sensor cannot be restored.</p>
        )}
        {!visit && !closure && (
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={() =>
                dispatch({
                  type: 'visit',
                  pid: p.id,
                  request: {
                    at: NOW,
                    note: `No sensor data since ${hhmm(p.lastUploadMs)} Mon. Replacement sensor and visit requested.`,
                  },
                  audit: `Requested replacement visit for ${p.id}: no sensor data since ${hhmm(p.lastUploadMs)} Mon.`,
                })
              }
            >
              Request replacement visit
            </button>
          </div>
        )}
      </Panel>

      {calls.length > 0 && (
        <Panel title="Calls since last upload">
          <ul className="plain-list">
            {calls.map((c) => (
              <li key={c.id}>
                <strong>{hhmm(c.at)}</strong> {c.purpose}: {c.outcome.toLowerCase()}. {c.advice.join(', ')}
                {c.notes && <div className="muted">{c.notes}</div>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function GapCallForm({ pid, done }: { pid: string; done: boolean }) {
  const { state, dispatch } = useStore();
  const [time, setTime] = useState(hhmm(NOW));
  const [outcome, setOutcome] = useState<CallOutcome>('Reached');
  const [advice, setAdvice] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const submit = () => {
    const [hh, mm] = time.split(':').map(Number);
    const at = pt('2026-11-17', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    const call: CallLog = {
      id: `CALL-${state.calls.length + 1}`,
      pid,
      at,
      by: CURRENT_USER,
      purpose: 'Gap check',
      outcome,
      advice,
      symptoms: [],
      notes: notes.trim(),
    };
    dispatch({
      type: 'call',
      call,
      audit: `Gap check call to ${pid} logged: ${outcome.toLowerCase()} at ${hhmm(at)}.`,
    });
    setNotes('');
    setAdvice([]);
  };

  return (
    <Panel title="Log a call" aside={done ? <span className="muted">Earlier call logged</span> : undefined}>
      <div className="form-grid">
        <Field label="Time of call">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Outcome">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)}>
            <option>Reached</option>
            <option>Voicemail</option>
            <option>No answer</option>
          </select>
        </Field>
      </div>
      <fieldset>
        <legend>Advice given</legend>
        {ADVICE.map((a) => (
          <CheckRow key={a} checked={advice.includes(a)} onChange={(on) => setAdvice(on ? [...advice, a] : advice.filter((x) => x !== a))}>
            {a}
          </CheckRow>
        ))}
      </fieldset>
      <Field label="Notes">
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What the participant reported about the phone, the sensor, and how they are." />
      </Field>
      <div className="actions">
        <button type="button" className="btn primary" onClick={submit}>
          Log call
        </button>
      </div>
    </Panel>
  );
}
