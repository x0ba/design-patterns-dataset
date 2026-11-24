import { useMemo, useState } from 'react';
import type { AlertEvent } from '../data/alerts';
import { participant } from '../data/roster';
import { valueAt } from '../data/series';
import { CheckRow, Badge, Field, MealThumb, Panel } from '../components/ui';
import { GlucoseChart } from '../components/GlucoseChart';
import { closureOf } from '../state/derive';
import { lowEvidence, traceAround } from '../state/evidence';
import { useStore } from '../state/store';
import { CURRENT_USER, type AdverseEvent, type CallLog, type CallOutcome, type TriageDecision } from '../state/types';
import { HOUR, MIN, NOW, dayLabel, durationLabel, hhmm, pt, sensorDay, stamp } from '../lib/time';

const SYMPTOMS = ['None reported', 'Shaky', 'Sweaty', 'Confused', 'Headache', 'Dizzy', 'Other'];

const SCRIPT_STEPS: { title: string; body: string }[] = [
  {
    title: 'Introduce and identify',
    body: 'Say who you are and that you are calling about the glucose sensor. Confirm identity with the study ID and date of birth.',
  },
  {
    title: 'Ask how they feel',
    body: 'Ask whether they are awake and whether they feel shaky, sweaty, dizzy, confused or unusually tired. Ask whether anything woke them.',
  },
  {
    title: 'Stop and escalate if',
    body: 'They are confused, cannot swallow, are drowsy or unresponsive, or have a seizure. End the call, follow the emergency section of protocol 2026-0884, call 911, and notify the PI now.',
  },
  {
    title: 'Treat if symptomatic or unsure',
    body: 'Advise 15 g of fast-acting carbohydrate (about 4 oz of juice or 4 glucose tablets). Recheck after 15 minutes as the protocol directs, then eat a snack once recovered.',
  },
  {
    title: 'Ask what happened',
    body: 'Ask about food, drink, medicines, supplements or exercise in the last 4 hours. Ask whether they were lying on the sensor arm.',
  },
  {
    title: 'Check the sensor',
    body: 'Ask them to check that the sensor edges are down and not pressed against a pillow or mattress. Note any discomfort at the site.',
  },
  {
    title: 'Close the call',
    body: 'Confirm they know whom to call if they feel unwell and when they will next hear from the lab. Log the outcome below.',
  },
];

const ARTIFACT_REASONS = [
  'Sharp single-point dip that recovered within 10 minutes',
  'Pattern consistent with pressure on the sensor (sleep position noted)',
  'No intake or activity that would explain a drop',
  'Prior nights stayed well above 54 mg/dL',
  'No symptoms in the participant diary',
];

const DECISIONS: { key: TriageDecision; title: string; body: string }[] = [
  {
    key: 'real',
    title: 'Real low',
    body: 'Opens the safety call script and an adverse-event entry. The alert stays open until both are saved.',
  },
  {
    key: 'artifact',
    title: 'Pressure artifact',
    body: 'Records the reasons. No safety call and no adverse-event entry. The alert closes.',
  },
  {
    key: 'undetermined',
    title: 'Not clear yet',
    body: 'Keeps the alert open and records what would settle it. Nothing is called or filed.',
  },
];

function nextAeId(existing: AdverseEvent[]): string {
  const max = existing.reduce((m, a) => {
    const n = Number(a.id.split('-').pop());
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `AE-C3-${String(max + 1).padStart(3, '0')}`;
}

export function TriagePanel({ event }: { event: AlertEvent }) {
  const { state, dispatch } = useStore();
  const p = participant(event.pid);
  const closure = closureOf(event, state);
  const record = state.triage[event.id];
  const low = valueAt(event.pid, event.at) ?? 0;
  const ev = useMemo(() => lowEvidence(event.pid, event.at, low), [event.pid, event.at, low]);
  const trace = useMemo(() => traceAround(event.pid, event.at), [event.pid, event.at]);
  const sd = sensorDay(p.insertedMs, NOW);
  const symptom = p.lastSymptomEntry;
  const decided = record?.decision;

  const chartFrom = Math.max(p.insertedMs, NOW - 6 * HOUR);

  const pick = (decision: TriageDecision) => {
    if (closure) return;
    const label = DECISIONS.find((d) => d.key === decision)?.title ?? decision;
    dispatch({
      type: 'triage',
      eventId: event.id,
      record: {
        decision,
        at: NOW,
        reasons: record?.reasons ?? [],
        note: record?.note ?? '',
      },
      audit: `Triage ${p.id} glucose ${low} mg/dL at ${hhmm(event.at)}: classified as "${label}".`,
    });
  };

  const rows: { tag: string; text: string; verdict?: string; tone?: 'ok' | 'flag' }[] = [
    {
      tag: 'Protocol',
      text: `${ev.runBelow54} consecutive reading${ev.runBelow54 === 1 ? '' : 's'} below 54 mg/dL (${ev.runBelow54 * 5} min). Safety-call trigger is below 54 mg/dL sustained for 15 min.`,
      verdict: ev.runBelow54 * 5 >= 15 ? 'Trigger met' : 'Trigger not met',
      tone: ev.runBelow54 * 5 >= 15 ? 'flag' : 'ok',
    },
    {
      tag: 'Shape',
      text:
        ev.dropIn5 !== null && ev.riseIn5 !== null
          ? `Fell ${ev.dropIn5} mg/dL in the 5 minutes before the reading and rose ${ev.riseIn5} mg/dL in the 5 minutes after.${ev.backAbove70At ? ` Back at or above 70 by ${hhmm(ev.backAbove70At)}.` : ''}`
          : 'Readings on one side of the low are missing.',
    },
    {
      tag: 'Baseline',
      text:
        ev.priorNights.length > 0
          ? `${ev.priorNights.length} prior nights since sensor insertion: lowest reading ${ev.priorMin} mg/dL, median nightly low ${ev.priorMedian} mg/dL.`
          : 'No prior nights on this sensor.',
    },
    {
      tag: 'Intake',
      text: ev.lastMeal
        ? `Last logged meal: ${ev.lastMeal.text}, at ${hhmm(ev.lastMeal.at)}${ev.lastMeal.photo ? ', photo on file' : ', no photo'}. ${durationLabel(ev.lastMealGapMin! * MIN)} before the reading.`
        : 'No meal logged before the reading.',
    },
    {
      tag: 'Activity',
      text: `${ev.stepsInSleep} steps in the sleep window (${hhmm(ev.night.start)} to ${hhmm(ev.night.end)}).`,
    },
    {
      tag: 'Self-report',
      text: symptom
        ? `Last diary entry ${stamp(symptom.at)}: “${symptom.text}” Nothing logged since.`
        : 'No symptom diary entries on file.',
    },
    {
      tag: 'Notes',
      text: p.notes.length
        ? p.notes.map((n) => `${dayLabel(pt(n.on, '12:00'))}: ${n.text}`).join(' ')
        : 'No participant notes on file.',
    },
    {
      tag: 'Sensor',
      text: `Day ${sd} of this sensor (inserted ${dayLabel(p.insertedMs)}), ${p.sensorSite}. ${
        ev.missingReadings
          ? `${ev.missingReadings} readings missing 00:40 to 06:40.`
          : 'No missing readings 00:40 to 06:40.'
      }`,
    },
  ];

  const callLogged = state.calls.find(
    (c) => c.pid === p.id && c.purpose === 'Safety call' && c.at >= event.at,
  );

  return (
    <div className="detail-stack">
      <div className="detail-head">
        <div>
          <div className="eyebrow">Safety · glucose below 54 mg/dL</div>
          <h2>
            {p.id} · {low} mg/dL at {hhmm(event.at)}
          </h2>
          <p className="sub">
            {dayLabel(event.at)} · escalated {hhmm(event.at)} · {closure ? 'closed' : `open for ${durationLabel(NOW - event.at)}`}
          </p>
        </div>
        <div className="head-badges">
          <Badge tone="safety">Safety</Badge>
          <Badge tone={closure ? 'ok' : 'safety'}>{closure ? 'Closed' : 'Open'}</Badge>
        </div>
      </div>

      {closure && (
        <div className="notice notice-ok">
          <strong>Closed {stamp(closure.at)} by {closure.by}.</strong> {closure.note}
        </div>
      )}

      <Panel title="Readings" aside={<span className="muted">5-minute CGM, PT</span>}>
        <GlucoseChart
          pid={p.id}
          from={chartFrom}
          to={NOW}
          marker={event.at}
          markerLabel={`${low} at ${hhmm(event.at)}`}
          tickHours={1}
          label={`Glucose trace for ${p.id} from ${hhmm(chartFrom)} to ${hhmm(NOW)}, low of ${low} at ${hhmm(event.at)}`}
        />
        <div className="trace">
          {trace.map((r) => (
            <div key={r.t} className={`trace-cell ${r.v < 54 ? 'lo' : r.v < 70 ? 'mid' : ''} ${r.t === event.at ? 'focus' : ''}`}>
              <span>{hhmm(r.t)}</span>
              <strong>{r.v}</strong>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="What the record shows" aside={<span className="muted">Evidence only. The call is yours.</span>}>
        <table className="evidence">
          <tbody>
            {rows.map((r) => (
              <tr key={r.tag}>
                <th scope="row">{r.tag}</th>
                <td>{r.text}</td>
                <td className="verdict-cell">
                  {r.verdict && <span className={`verdict ${r.tone === 'flag' ? 'flag' : 'ok'}`}>{r.verdict}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ev.lastMeal && (
          <div className="meal-inline">
            <MealThumb hue={ev.lastMeal.hue} photo={ev.lastMeal.photo} label={`${ev.lastMeal.kind} ${hhmm(ev.lastMeal.at)}`} />
            <div>
              <strong>{ev.lastMeal.kind} {hhmm(ev.lastMeal.at)}</strong>
              <div className="muted">{ev.lastMeal.text}</div>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Your call">
        <p className="hint">
          Protocol trigger: below 54 mg/dL sustained for 15 minutes. A single reading below 54 is escalated for review, but on its own it does not meet that trigger.
        </p>
        <div className="decision-grid" role="radiogroup" aria-label="Classification">
          {DECISIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              role="radio"
              aria-checked={decided === d.key}
              className={`decision ${decided === d.key ? 'on' : ''}`}
              disabled={!!closure}
              onClick={() => pick(d.key)}
            >
              <strong>{d.title}</strong>
              <span>{d.body}</span>
            </button>
          ))}
        </div>
      </Panel>

      {!closure && decided === 'real' && (
        <>
          <SafetyScript />
          <CallForm pid={p.id} eventAt={event.at} done={!!callLogged} />
          {callLogged ? (
            <AeForm eventId={event.id} pid={p.id} at={event.at} low={low} runMin={ev.runBelow54 * 5} lastCall={callLogged} />
          ) : (
            <div className="notice">Log the safety call first. The adverse-event entry opens after the call outcome is recorded.</div>
          )}
        </>
      )}

      {!closure && decided === 'artifact' && <ArtifactForm eventId={event.id} pid={p.id} low={low} at={event.at} />}

      {!closure && decided === 'undetermined' && <UndeterminedForm eventId={event.id} pid={p.id} low={low} />}

      {!closure && !decided && <div className="notice">Choose a classification to continue.</div>}

      {state.calls.some((c) => c.pid === p.id && c.at >= event.at) && (
        <CallList pid={p.id} since={event.at} />
      )}
    </div>
  );
}

function SafetyScript() {
  const [done, setDone] = useState<boolean[]>(SCRIPT_STEPS.map(() => false));
  const toggle = (i: number, v: boolean) => setDone((d) => d.map((x, j) => (j === i ? v : x)));
  return (
    <Panel
      title="Safety call script"
      aside={<span className="muted">{done.filter(Boolean).length} of {SCRIPT_STEPS.length} steps</span>}
    >
      <div className="notice notice-warn">
        Working draft for this lab. If your binder has the IRB-approved safety script for protocol 2026-0884, use that wording.
      </div>
      <ol className="script">
        {SCRIPT_STEPS.map((s, i) => (
          <li key={s.title} className={done[i] ? 'checked' : ''}>
            <CheckRow checked={done[i]} onChange={(v) => toggle(i, v)}>
              <strong>{s.title}.</strong> {s.body}
            </CheckRow>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function CallForm({ pid, eventAt, done }: { pid: string; eventAt: number; done: boolean }) {
  const { dispatch, state } = useStore();
  const [time, setTime] = useState(hhmm(NOW));
  const [outcome, setOutcome] = useState<CallOutcome>('Reached');
  const [symptoms, setSymptoms] = useState<string[]>(['None reported']);
  const [advice, setAdvice] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const adviceOptions = ['15 g carbohydrate advised', 'Recheck in 15 min', 'Snack after recovery', 'Emergency instructions given', 'Stay reachable on the study line'];

  const toggle = (list: string[], v: string, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));

  const submit = () => {
    const [hh, mm] = time.split(':').map(Number);
    const at = pt('2026-11-17', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    const call: CallLog = {
      id: `CALL-${state.calls.length + 1}`,
      pid,
      at,
      by: CURRENT_USER,
      purpose: 'Safety call',
      outcome,
      advice,
      symptoms,
      notes: notes.trim(),
    };
    dispatch({
      type: 'call',
      call,
      audit: `Safety call to ${pid} logged: ${outcome.toLowerCase()} at ${hhmm(at)}.`,
    });
  };

  if (done) {
    return (
      <Panel title="Call logged">
        <div className="notice notice-ok">
          Safety call recorded for {pid} at {hhmm(state.calls.find((c) => c.pid === pid && c.purpose === 'Safety call' && c.at >= eventAt)?.at ?? eventAt)}. Add another call from the form only if you contact them again.
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Log the safety call" aside={<span className="muted">Participant {pid}</span>}>
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
      <div className="form-cols">
        <fieldset>
          <legend>Symptoms reported</legend>
          {SYMPTOMS.map((s) => (
            <CheckRow key={s} checked={symptoms.includes(s)} onChange={(on) => setSymptoms(toggle(symptoms, s, on))}>
              {s}
            </CheckRow>
          ))}
        </fieldset>
        <fieldset>
          <legend>Advice given</legend>
          {adviceOptions.map((s) => (
            <CheckRow key={s} checked={advice.includes(s)} onChange={(on) => setAdvice(toggle(advice, s, on))}>
              {s}
            </CheckRow>
          ))}
        </fieldset>
      </div>
      <Field label="Notes from the call">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What the participant said, what was advised, and what they agreed to do." />
      </Field>
      <div className="actions">
        <button type="button" className="btn primary" onClick={submit}>
          Log safety call
        </button>
      </div>
    </Panel>
  );
}

function AeForm({
  eventId,
  pid,
  at,
  low,
  runMin,
  lastCall,
}: {
  eventId: string;
  pid: string;
  at: number;
  low: number;
  runMin: number;
  lastCall: CallLog;
}) {
  const { state, dispatch } = useStore();
  const [term, setTerm] = useState('Hypoglycemia: glucose below 54 mg/dL, single reading');
  const [peak, setPeak] = useState(String(low));
  const [duration, setDuration] = useState(String(Math.max(5, runMin)));
  const [action, setAction] = useState(
    lastCall.advice.includes('15 g carbohydrate advised')
      ? 'Safety call completed; 15 g carbohydrate advised'
      : 'Safety call completed; no action required',
  );
  const [outcome, setOutcome] = useState('Recovered. Next reading in range.');
  const [piNotified, setPiNotified] = useState(false);
  const [summary, setSummary] = useState(lastCall.notes || `Reached participant at ${hhmm(lastCall.at)}.`);

  const submit = () => {
    const id = nextAeId(state.adverse);
    const entry: AdverseEvent = {
      id,
      pid,
      occurredAt: at,
      term,
      peak: Number(peak),
      durationMin: Number(duration),
      callSummary: summary.trim(),
      action,
      outcome: outcome.trim(),
      reportedBy: CURRENT_USER,
      createdAt: NOW,
      piReview: null,
      eventId,
    };
    dispatch({
      type: 'ae',
      entry,
      eventId,
      closure: { at: NOW, by: CURRENT_USER, note: `Safety call logged. ${id} documented${piNotified ? ' and PI notified' : ''}.` },
      audit: `Documented ${id} for ${pid} (glucose ${peak} mg/dL at ${hhmm(at)}). PI review pending.${piNotified ? ' PI notified.' : ''}`,
    });
  };

  return (
    <Panel title="Adverse-event entry" aside={<span className="muted">Next number: {nextAeId(state.adverse)}</span>}>
      <div className="form-grid">
        <Field label="Event term">
          <select value={term} onChange={(e) => setTerm(e.target.value)}>
            <option>Hypoglycemia: glucose below 54 mg/dL, single reading</option>
            <option>Hypoglycemia: glucose below 54 mg/dL sustained 15 min</option>
          </select>
        </Field>
        <Field label="Occurred">
          <input value={`${dayLabel(at)} ${hhmm(at)}`} readOnly />
        </Field>
        <Field label="Peak glucose (mg/dL)">
          <input type="number" value={peak} onChange={(e) => setPeak(e.target.value)} />
        </Field>
        <Field label="Duration below 54 (min)">
          <input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
      </div>
      <Field label="Call summary">
        <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <Field label="Action taken">
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option>Safety call completed; 15 g carbohydrate advised</option>
          <option>Safety call completed; no action required</option>
          <option>Safety call completed; participant asked to recheck</option>
          <option>Participant not reached; voicemail left</option>
        </select>
      </Field>
      <Field label="Outcome">
        <input value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      </Field>
      <div className="form-cols">
        <Field label="Reported by">
          <input value={CURRENT_USER} readOnly />
        </Field>
        <div className="field">
          <span className="field-label">PI</span>
          <CheckRow checked={piNotified} onChange={setPiNotified}>
            Dr. Helen Marsh has been notified
          </CheckRow>
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn primary" onClick={submit}>
          Save adverse-event entry and close alert
        </button>
      </div>
    </Panel>
  );
}

function ArtifactForm({ eventId, pid, low, at }: { eventId: string; pid: string; low: number; at: number }) {
  const { state, dispatch } = useStore();
  const existing = state.triage[eventId];
  const [reasons, setReasons] = useState<string[]>(existing?.reasons ?? []);
  const [note, setNote] = useState(existing?.note ?? '');

  const toggle = (r: string, on: boolean) => setReasons((rs) => (on ? [...rs, r] : rs.filter((x) => x !== r)));

  const submit = () => {
    dispatch({
      type: 'triage',
      eventId,
      record: { decision: 'artifact', at: NOW, reasons, note: note.trim() },
    });
    dispatch({
      type: 'close',
      eventId,
      closure: {
        at: NOW,
        by: CURRENT_USER,
        note: `Closed as pressure artifact: ${reasons.join('; ')}.${note.trim() ? ` ${note.trim()}` : ''} No safety call, no adverse-event entry.`,
      },
      audit: `Closed ${pid} glucose ${low} mg/dL (${hhmm(at)}) as pressure artifact. No safety call or AE entry.`,
    });
  };

  return (
    <Panel title="Document the artifact reasons">
      <p className="hint">Tick the reasons that apply from the record above. At least one is needed.</p>
      {ARTIFACT_REASONS.map((r) => (
        <CheckRow key={r} checked={reasons.includes(r)} onChange={(on) => toggle(r, on)}>
          {r}
        </CheckRow>
      ))}
      <Field label="Note for the record">
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything that would change this view, e.g. a sensor re-check at the next data pull." />
      </Field>
      <div className="actions">
        <button type="button" className="btn primary" disabled={reasons.length === 0} onClick={submit}>
          Document artifact and close alert
        </button>
      </div>
    </Panel>
  );
}

function UndeterminedForm({ eventId, pid, low }: { eventId: string; pid: string; low: number }) {
  const { state, dispatch } = useStore();
  const existing = state.triage[eventId];
  const [note, setNote] = useState(existing?.note ?? '');
  const submit = () => {
    dispatch({
      type: 'triage',
      eventId,
      record: { decision: 'undetermined', at: NOW, reasons: [], note: note.trim() },
      audit: `${pid} glucose ${low} mg/dL: still not clear. Alert kept open.${note.trim() ? ` Note: ${note.trim()}` : ''}`,
    });
  };
  return (
    <Panel title="What would settle it">
      <Field label="Note">
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: next readings, a sensor check, or a call once the participant is awake." />
      </Field>
      <div className="actions">
        <button type="button" className="btn" disabled={!note.trim()} onClick={submit}>
          Save note and keep alert open
        </button>
      </div>
    </Panel>
  );
}

function CallList({ pid, since }: { pid: string; since: number }) {
  const { state } = useStore();
  const calls = state.calls.filter((c) => c.pid === pid && c.at >= since);
  if (!calls.length) return null;
  return (
    <Panel title="Calls on this alert">
      <ul className="plain-list">
        {calls.map((c) => (
          <li key={c.id}>
            <strong>{hhmm(c.at)}</strong> {c.purpose}: {c.outcome.toLowerCase()}. {c.advice.join(', ')}
            {c.notes && <div className="muted">{c.notes}</div>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
