import { useMemo, useState } from 'react';
import { RULE_BY_ID, EVENTS, type RuleId } from '../data/alerts';
import { STEP_GOAL, participant } from '../data/roster';
import { dailySteps, stepsBetween } from '../data/series';
import { Badge, Field, Panel } from '../components/ui';
import { activeSnooze, snoozesFor } from '../state/derive';
import { useStore } from '../state/store';
import { CURRENT_USER, type Snooze } from '../state/types';
import { DAY, NOW, dayLabel, hhmm, pt, stamp } from '../lib/time';

const SNOOZABLE: RuleId[] = ['STEP-01', 'SENS-03', 'SYNC-01', 'MEAL-02'];

const DURATIONS: { key: string; label: string; until: () => number }[] = [
  { key: 'noon', label: 'Until 12:00 today', until: () => pt('2026-11-17', '12:00') },
  { key: 'day', label: 'Next 24 hours', until: () => NOW + DAY },
  { key: 'study', label: 'Until study end (Sun 22 Nov)', until: () => pt('2026-11-22', '23:59') },
];

const REASONS = [
  'Injury reported by participant',
  'Medical restriction on file',
  'Device problem being fixed',
  'Other (describe in note)',
];

function nextSnoozeId(list: Snooze[]): string {
  const max = list.reduce((m, s) => {
    const n = Number(s.id.split('-').pop());
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 412);
  return `SNZ-${String(max + 1).padStart(4, '0')}`;
}

export function SnoozePanel({ pid, ruleId }: { pid: string; ruleId: string }) {
  const { state, dispatch } = useStore();
  const p = participant(pid);
  const rule = RULE_BY_ID[(ruleId as RuleId)] ?? RULE_BY_ID['STEP-01'];
  const ruleKey = rule.id;
  const active = activeSnooze(state, p.id, ruleKey);
  const others = snoozesFor(state, p.id).filter((s) => s.id !== active?.id);

  const [duration, setDuration] = useState(DURATIONS[0].key);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState(
    p.notes.length ? p.notes[p.notes.length - 1].text : '',
  );
  const [chosenRule, setChosenRule] = useState<RuleId>(ruleKey as RuleId);

  const days = useMemo(() => {
    const list: string[] = [];
    for (let d = 10; d <= 16; d++) list.push(`2026-11-${String(d).padStart(2, '0')}`);
    return dailySteps(p.id, list);
  }, [p.id]);
  const maxDay = Math.max(STEP_GOAL, ...days.map((d) => d.steps));
  const rolling = stepsBetween(p.id, NOW - DAY, NOW);
  const openEvents = EVENTS.filter((e) => e.pid === p.id && e.ruleId === chosenRule && e.handling !== 'suppressed');

  const save = () => {
    const d = DURATIONS.find((x) => x.key === duration) ?? DURATIONS[0];
    const until = d.until();
    const snooze: Snooze = {
      id: nextSnoozeId(state.snoozes),
      pid: p.id,
      ruleId: chosenRule,
      untilMs: until,
      reason,
      note: note.trim(),
      createdAt: NOW,
      createdBy: CURRENT_USER,
    };
    dispatch({
      type: 'snooze',
      snooze,
      audit: `Snoozed ${chosenRule} for ${p.id} until ${stamp(until)}. Reason: ${reason}. ${note.trim()}`,
    });
  };

  return (
    <div className="detail-stack">
      <div className="detail-head">
        <div>
          <div className="eyebrow">Alert snooze · {p.id}</div>
          <h2>Quiet {RULE_BY_ID[chosenRule].name.toLowerCase()} for {p.id}</h2>
          <p className="sub">Scope is this participant and this rule only. Other alerts for {p.id} stay active.</p>
        </div>
        <div className="head-badges">
          <Badge tone={active ? 'muted' : 'advisory'}>{active ? 'Snoozed' : 'Active'}</Badge>
        </div>
      </div>

      <div className="two-col">
        <Panel title="Steps, last 7 days">
          <div className="bars" role="img" aria-label="Daily steps for the last seven days">
            {days.map((d) => (
              <div className="bar-col" key={d.day}>
                <div className="bar-track">
                  <div
                    className={`bar-val ${d.steps < STEP_GOAL ? 'below' : ''}`}
                    style={{ height: `${Math.round((d.steps / maxDay) * 100)}%` }}
                    title={`${d.steps.toLocaleString('en-US')} steps`}
                  />
                </div>
                <span>{dayLabel(pt(d.day, '12:00')).split(' ')[0]}</span>
                <strong>{Math.round(d.steps / 100) / 10}k</strong>
              </div>
            ))}
          </div>
          <p className="hint">
            Goal {STEP_GOAL.toLocaleString('en-US')} steps. Rolling 24 h now: <strong>{rolling.toLocaleString('en-US')}</strong>.
            Bars below the goal are shown in amber.
          </p>
        </Panel>

        <Panel title="Participant notes">
          {p.notes.length ? (
            <ul className="plain-list">
              {p.notes.map((n) => (
                <li key={n.on + n.text}>
                  <strong>{dayLabel(pt(n.on, '12:00'))}</strong>: {n.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No notes on file.</p>
          )}
          <p className="hint">Held events for {p.id} in the queue are hidden while the snooze is active. Events already in the alert log are kept.</p>
        </Panel>
      </div>

      {active && (
        <Panel title="Snooze in effect">
          <div className="notice">
            <strong>{active.id}</strong> silences {active.ruleId} for {p.id} until {stamp(active.untilMs)}.
            <div className="muted">{active.reason}. {active.note}</div>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={() =>
                dispatch({ type: 'unsnooze', id: active.id, audit: `Cancelled snooze ${active.id} for ${p.id} (${active.ruleId}).` })
              }
            >
              Cancel snooze
            </button>
          </div>
        </Panel>
      )}

      {!active && (
        <Panel title="Set snooze">
          <div className="form-cols">
            <Field label="Rule">
              <select value={chosenRule} onChange={(e) => setChosenRule(e.target.value as RuleId)}>
                {SNOOZABLE.map((r) => (
                  <option key={r} value={r}>
                    {r}: {RULE_BY_ID[r].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Reason">
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
          <fieldset className="radio-group">
            <legend>Duration</legend>
            {DURATIONS.map((d) => (
              <label key={d.key} className="radio">
                <input type="radio" name="duration" checked={duration === d.key} onChange={() => setDuration(d.key)} />
                <span>{d.label}</span>
                <span className="muted">
                  {d.key === 'noon' ? hhmm(pt('2026-11-17', '12:00')) : d.key === 'day' ? `to ${stamp(NOW + DAY)}` : 'to 22 Nov 23:59'}
                </span>
              </label>
            ))}
          </fieldset>
          <Field label="Note for the record" hint={`${openEvents.length} ${chosenRule} events for ${p.id} in the last 24 h will stay in the alert log.`}>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="actions">
            <button type="button" className="btn primary" disabled={!note.trim()} onClick={save}>
              Snooze {chosenRule} for {p.id}
            </button>
          </div>
        </Panel>
      )}

      {others.length > 0 && (
        <Panel title={`Other snoozes for ${p.id}`}>
          <ul className="plain-list">
            {others.map((s) => (
              <li key={s.id}>
                <strong>{s.id}</strong> {s.ruleId} until {stamp(s.untilMs)}. {s.reason}.
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
