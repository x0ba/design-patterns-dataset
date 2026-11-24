import { useMemo } from 'react';
import { Icon } from './Icon';
import { CodeBlock, CodeEditor } from './CodeEditor';
import { DEVICES, HOLIDAYS, NOW, PEOPLE, SWIM, deviceById, personById } from './data';
import { check, show } from './expr';
import { CATEGORY_LABEL, STEP_META, autoTitle, presenceExpr, routineCode, stepCode } from './steps';
import { ctxFor, presenceAt, dayOf, type RunResult } from './sim';
import type { BranchStep, ExprStep, PersonId, Step } from './types';
import { DAY_SHORT, describeDays, fmtDate, fmtTime, fromHHMM, toHHMM, weekdayOf, addDays } from './time';

interface Props {
  step: Step | null;
  number: string | null;
  steps: Step[];
  run: RunResult | null;
  testDate: string;
  codeOpen: boolean;
  routineName: string;
  onSetCode: (open: boolean) => void;
  onChange: (patch: Partial<Step>, coalesce?: string) => void;
  onReplace: (s: Step) => void;
  onAction: (a: 'duplicate' | 'delete' | 'toggle') => void;
  onClose: () => void;
}

export function Inspector(p: Props) {
  if (!p.step) return <RoutineOverview steps={p.steps} run={p.run} name={p.routineName} />;
  const s = p.step;
  const meta = STEP_META[s.type];
  const isTrigger = p.steps[0]?.id === s.id;
  const hasEditableCode = s.type === 'expr' || s.type === 'branch';

  return (
    <div className={`inspector cat-${meta.category}`}>
      <div className="insp-head">
        <div className="insp-kicker">
          <span className="insp-icon"><Icon name={meta.icon} size={15} /></span>
          <span>
            {p.number ? `Step ${p.number} · ` : ''}
            {CATEGORY_LABEL[meta.category]} · {meta.kind}
          </span>
          <button type="button" className="icon-btn insp-close" onClick={p.onClose} title="Close (Esc)" aria-label="Close inspector">
            <Icon name="x" size={15} />
          </button>
        </div>
        <input
          className="insp-title"
          value={s.label ?? ''}
          placeholder={autoTitle(s)}
          aria-label="Step name"
          onChange={(e) => p.onChange({ label: e.target.value || undefined }, `${s.id}-label`)}
        />
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={!p.codeOpen} className={!p.codeOpen ? 'on' : ''} onClick={() => p.onSetCode(false)}>
            <Icon name="sliders" size={13} /> Visual
          </button>
          <button type="button" role="tab" aria-selected={p.codeOpen} className={p.codeOpen ? 'on' : ''} onClick={() => p.onSetCode(true)}>
            <Icon name="code" size={13} /> Code
          </button>
        </div>
      </div>

      <div className="insp-body">
        {p.codeOpen ? (
          hasEditableCode ? (
            <ExprEditor step={s as ExprStep | BranchStep} run={p.run} testDate={p.testDate} onChange={p.onChange} steps={p.steps} />
          ) : (
            <GeneratedCode step={s} onReplace={p.onReplace} />
          )
        ) : (
          <Visual {...p} />
        )}
      </div>

      <div className="insp-foot">
        <button type="button" className="btn btn-ghost" onClick={() => p.onAction('toggle')}>
          <Icon name={s.disabled ? 'eye' : 'eyeOff'} size={14} /> {s.disabled ? 'Turn on' : 'Turn off'}
        </button>
        {!isTrigger && (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => p.onAction('duplicate')}>
              <Icon name="copy" size={14} /> Duplicate
            </button>
            <button type="button" className="btn btn-ghost danger" onClick={() => p.onAction('delete')}>
              <Icon name="trash" size={14} /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- code tab
function evalPoint(step: Step, run: RunResult | null, steps: Step[], testDate: string) {
  const r = run?.steps[step.id];
  if (r && r.at !== null) return { t: r.at, reached: true };
  const trig = steps[0];
  return { t: trig?.type === 'schedule' ? trig.time : 20 * 60 + 15, reached: false, date: testDate };
}

function ExprEditor({ step, run, testDate, onChange, steps }: { step: ExprStep | BranchStep; run: RunResult | null; testDate: string; onChange: Props['onChange']; steps: Step[] }) {
  const pt = evalPoint(step, run, steps, testDate);
  const res = useMemo(() => check(step.expr, ctxFor(testDate, pt.t)), [step.expr, testDate, pt.t]);
  const isWindow = /\.\.|now\(\)/.test(step.expr);

  // Show the expression's value at several moments to make time windows legible.
  const sweep = useMemo(() => {
    if (!isWindow || !res.ok) return null;
    const times = [20 * 60 + 15, 20 * 60 + 30, 20 * 60 + 45, 21 * 60, 21 * 60 + 15, 21 * 60 + 30];
    return times.map((t) => {
      const r = check(step.expr, ctxFor(testDate, t));
      return { t, v: r.ok && r.value?.t === 'bool' ? r.value.v : null };
    });
  }, [isWindow, res.ok, step.expr, testDate]);

  return (
    <div className="expr-editor">
      <label className="field-label">
        {step.type === 'branch' ? 'Branch condition' : 'Condition'} <span className="muted">· continue {step.type === 'branch' ? 'down “If true”' : ''} when this is true</span>
      </label>
      <div className="code-prefix">{step.type === 'branch' ? 'if' : 'require'}</div>
      <CodeEditor value={step.expr} onChange={(v) => onChange({ expr: v } as Partial<Step>, `${step.id}-expr`)} error={res.error} ariaLabel="Expression" autoFocus />

      <div className={`eval ${res.ok ? (res.value?.t === 'bool' && res.value.v ? 'eval-true' : 'eval-false') : 'eval-error'}`}>
        <div className="eval-head">
          {res.ok ? (
            <>
              <span className="eval-val">{show(res.value!)}</span>
              <span className="eval-when">
                on {fmtDate(testDate)} at {fmtTime(pt.t)}
                {!pt.reached && ' (step not reached in dry run)'}
              </span>
            </>
          ) : (
            <>
              <Icon name="alert" size={14} />
              <span className="eval-msg">
                {res.error!.message}
                <span className="muted"> · col {res.error!.start + 1}</span>
              </span>
            </>
          )}
        </div>
        {res.terms && res.terms.length > 1 && (
          <ul className="terms">
            {res.terms.map((t, i) => (
              <li key={i}>
                {t.joiner && <span className="term-join">{t.joiner}</span>}
                <code>{t.text}</code>
                <span className={`term-val ${t.error ? 'bad' : t.value?.t === 'bool' ? (t.value.v ? 'yes' : 'no') : ''}`}>{t.error ? 'error' : show(t.value!)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sweep && (
        <div className="sweep">
          <div className="field-label">Across the evening of {fmtDate(testDate, { weekday: true })}</div>
          <div className="sweep-row">
            {sweep.map((x) => (
              <div key={x.t} className={`sweep-cell ${x.v === null ? '' : x.v ? 'yes' : 'no'}${x.t === pt.t ? ' cur' : ''}`}>
                <span className="sweep-t">{fmtTime(x.t).replace(' PM', '')}</span>
                <span className="sweep-v">{x.v === null ? '—' : x.v ? 'true' : 'false'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step.type === 'expr' && /weekday in \[Sun\.\.Thu\]/.test(step.expr) && steps[0]?.type === 'schedule' && describeDays(steps[0].days) === 'Sun–Thu' && (
        <div className="hint">
          <Icon name="info" size={14} />
          <span>The trigger already only fires Sun–Thu, so <code>weekday in [Sun..Thu]</code> is a safety net. <code>holiday(today)</code> reads the <b>School Holidays</b> calendar ({HOLIDAYS.length} dates).</span>
        </div>
      )}

      <details className="ref">
        <summary>Expression reference</summary>
        <table>
          <tbody>
            <tr><td><code>and</code> <code>or</code> <code>not</code></td><td>Combine conditions</td></tr>
            <tr><td><code>&lt; &lt;= == != &gt;= &gt;</code></td><td>Compare times, durations, numbers</td></tr>
            <tr><td><code>x in [a, b]</code></td><td>Membership; <code>[Sun..Thu]</code> expands to weekdays</td></tr>
            <tr><td><code>now() in 20:15..21:00</code></td><td>Time window, inclusive; may cross midnight</td></tr>
            <tr><td><code>20:30 + 30m</code></td><td>Time arithmetic with <code>m</code>, <code>h</code>, <code>d</code></td></tr>
            <tr><td><code># note</code></td><td>Comment to end of line</td></tr>
          </tbody>
        </table>
      </details>
    </div>
  );
}

function GeneratedCode({ step, onReplace }: { step: Step; onReplace: (s: Step) => void }) {
  return (
    <div className="gen-code">
      <div className="field-label">
        Generated from the visual settings <span className="muted">· read-only</span>
      </div>
      <CodeBlock code={stepCode(step)} />
      {step.type === 'presence' ? (
        <div className="hint">
          <Icon name="code" size={14} />
          <span>
            Need more than “any/all”? Convert this step into an editable expression — e.g. add <code>and now() in 20:15..21:00</code>.
            <button type="button" className="btn btn-small" onClick={() => onReplace({ id: step.id, type: 'expr', label: step.label, expr: presenceExpr(step), disabled: step.disabled })}>
              Convert to expression
            </button>
          </span>
        </div>
      ) : step.type === 'waitUntil' ? (
        <div className="hint">
          <Icon name="info" size={14} />
          <span>Waits are evaluated in household time ({fmtTime(step.time)} CST). If the routine is already past this time, it continues right away.</span>
        </div>
      ) : (
        <div className="hint">
          <Icon name="info" size={14} />
          <span>Switch to Visual to change this step. Conditions and branches can be written as code directly.</span>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- visual tab
function Visual(p: Props) {
  const s = p.step!;
  switch (s.type) {
    case 'schedule': return <ScheduleForm {...p} step={s} />;
    case 'expr':
    case 'branch': return <ExprVisual step={s} onCode={() => p.onSetCode(true)} run={p.run} />;
    case 'presence': return <PresenceForm step={s} onChange={p.onChange} testDate={p.testDate} run={p.run} />;
    case 'lights': return <LightsForm step={s} onChange={p.onChange} />;
    case 'wifi': return <DevicePicker type="wifi" selected={s.deviceIds} onChange={(ids) => p.onChange({ deviceIds: ids })} extra={
      <Toggle2 a="Pause internet" b="Resume internet" value={s.pause} onChange={(v) => p.onChange({ pause: v })} />
    } note="Pausing blocks the device on the Mesh Router until a routine resumes it or a parent unpauses it in the app." />;
    case 'plug': return <DevicePicker type="plug" selected={s.deviceIds} onChange={(ids) => p.onChange({ deviceIds: ids })} extra={
      <Toggle2 a="Turn on" b="Turn off" value={s.on} onChange={(v) => p.onChange({ on: v })} />
    } />;
    case 'notify': return <NotifyForm step={s} onChange={p.onChange} />;
    case 'waitUntil': return (
      <div className="form">
        <label className="field-label" htmlFor="wu">Continue at</label>
        <input id="wu" type="time" className="input" value={toHHMM(s.time)} onChange={(e) => e.target.value && p.onChange({ time: fromHHMM(e.target.value) })} />
        <RunNote run={p.run} id={s.id} />
      </div>
    );
    case 'waitFor': return (
      <div className="form">
        <label className="field-label" htmlFor="wf">Wait for (minutes)</label>
        <input id="wf" type="number" min={1} max={600} className="input" value={s.minutes} onChange={(e) => p.onChange({ minutes: Math.max(1, Number(e.target.value) || 1) })} />
        <RunNote run={p.run} id={s.id} />
      </div>
    );
  }
}

function RunNote({ run, id }: { run: RunResult | null; id: string }) {
  const r = run?.steps[id];
  if (!r) return null;
  return (
    <div className={`run-note r-${r.status}`}>
      <Icon name="flask" size={13} />
      <span>
        Dry run, {fmtDate(run!.date)}: {r.headline}
      </span>
    </div>
  );
}

function ScheduleForm({ step, onChange, run }: Props & { step: Extract<Step, { type: 'schedule' }> }) {
  // next run from "now"
  let next = '';
  for (let i = 0; i < 8; i++) {
    const d = addDays(NOW.date, i);
    if (!step.days.includes(weekdayOf(d))) continue;
    if (i === 0 && step.time <= NOW.minutes) continue;
    const hol = HOLIDAYS.find((h) => h.date === d);
    next = `${i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : fmtDate(d)} at ${fmtTime(step.time)}${hol ? ` (${hol.name} — the holiday check will stop it)` : ''}`;
    break;
  }
  return (
    <div className="form">
      <label className="field-label" htmlFor="st">Time</label>
      <input id="st" type="time" className="input" value={toHHMM(step.time)} onChange={(e) => e.target.value && onChange({ time: fromHHMM(e.target.value) })} />
      <div className="field-label">Days</div>
      <div className="daypick">
        {DAY_SHORT.map((d, i) => (
          <button
            type="button"
            key={d}
            aria-pressed={step.days.includes(i)}
            className={step.days.includes(i) ? 'on' : ''}
            onClick={() => onChange({ days: step.days.includes(i) ? step.days.filter((x) => x !== i) : [...step.days, i].sort() })}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="kv">
        <span>Repeats</span>
        <b>{describeDays(step.days)} at {fmtTime(step.time)}</b>
      </div>
      <div className="kv">
        <span>Next run</span>
        <b>{next || 'Never — choose at least one day'}</b>
      </div>
      <div className="hint">
        <Icon name="clock" size={14} />
        <span>Housewire uses household time, America/Chicago. Daylight saving ended Nov 1 — schedules follow the wall clock, so 8:15 PM stays 8:15 PM.</span>
      </div>
      <RunNote run={run} id={step.id} />
    </div>
  );
}

function ExprVisual({ step, onCode, run }: { step: ExprStep | BranchStep; onCode: () => void; run: RunResult | null }) {
  return (
    <div className="form">
      <div className="field-label">{step.type === 'branch' ? 'If this is true, take the “If true” path; otherwise the other one' : 'Continue only when'}</div>
      <pre className="code-block">{step.expr}</pre>
      <button type="button" className="btn btn-small" onClick={onCode}>
        <Icon name="code" size={13} /> Edit expression
      </button>
      {step.type === 'branch' && (
        <div className="kv-list">
          <div className="kv"><span>If true</span><b>{step.then.length} step{step.then.length === 1 ? '' : 's'}</b></div>
          <div className="kv"><span>Otherwise</span><b>{step.else.length} step{step.else.length === 1 ? '' : 's'}</b></div>
          <div className="kv"><span>Ada · Swim</span><b>{SWIM.days.map((d) => DAY_SHORT[d]).join(' & ')}, {fmtTime(SWIM.start)}–{fmtTime(SWIM.end)}</b></div>
        </div>
      )}
      <RunNote run={run} id={step.id} />
    </div>
  );
}

function PresenceForm({ step, onChange, testDate, run }: { step: Extract<Step, { type: 'presence' }>; onChange: Props['onChange']; testDate: string; run: RunResult | null }) {
  const t = run?.steps[step.id]?.at ?? run?.triggerAt ?? 20 * 60 + 15;
  const then = presenceAt(dayOf(testDate), t);
  const nowDev = (id: PersonId) => deviceById(personById(id).phoneId)!.state;
  return (
    <div className="form">
      <Toggle2 a="Any of" b="All of" value={step.mode === 'any'} onChange={(v) => onChange({ mode: v ? 'any' : 'all' })} />
      <div className="people">
        {PEOPLE.map((pp) => {
          const on = step.people.includes(pp.id);
          return (
            <label key={pp.id} className={`person-row${on ? ' on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => onChange({ people: on ? step.people.filter((x) => x !== pp.id) : [...step.people, pp.id] })} />
              <span className="avatar" style={{ background: pp.color }}>{pp.initials}</span>
              <span className="person-name">
                {pp.name}’s phone <span className="muted">· {pp.role}</span>
              </span>
              <span className="person-state">
                <span className={`dot ${nowDev(pp.id).startsWith('Home') ? 'home' : 'away'}`} /> {nowDev(pp.id).split(' · ')[0]} now
                <span className="muted"> · {then[pp.id] ? 'home' : 'away'} {fmtTime(t)} {fmtDate(testDate, { weekday: true }).split(',')[0]}</span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="field-label">Is</div>
      <Toggle2 a="Home" b="Away" value={step.state === 'home'} onChange={(v) => onChange({ state: v ? 'home' : 'away' })} />
      <RunNote run={run} id={step.id} />
    </div>
  );
}

function LightsForm({ step, onChange }: { step: Extract<Step, { type: 'lights' }>; onChange: Props['onChange'] }) {
  const nonDim = step.deviceIds.map((id) => deviceById(id)).filter((d) => d && !d.dimmable);
  return (
    <DevicePicker
      type="light"
      selected={step.deviceIds}
      onChange={(ids) => onChange({ deviceIds: ids })}
      extra={
        <>
          <Toggle2 a="Turn on / dim" b="Turn off" value={step.on} onChange={(v) => onChange({ on: v })} />
          {step.on && (
            <>
              <div className="field-label">
                Brightness <b className="field-val">{step.brightness}%</b>
              </div>
              <input type="range" min={1} max={100} value={step.brightness} className="range" onChange={(e) => onChange({ brightness: Number(e.target.value) }, `${step.id}-bright`)} aria-label="Brightness" />
              <div className="field-label">Fade</div>
              <select className="input" value={step.fade} onChange={(e) => onChange({ fade: Number(e.target.value) })}>
                <option value={0}>Instant</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
              {nonDim.length > 0 && (
                <div className="hint warn">
                  <Icon name="alert" size={14} />
                  <span>{nonDim.map((d) => d!.name).join(', ')} can’t dim — {nonDim.length > 1 ? 'they' : 'it'} will just turn on.</span>
                </div>
              )}
            </>
          )}
        </>
      }
    />
  );
}

function NotifyForm({ step, onChange }: { step: Extract<Step, { type: 'notify' }>; onChange: Props['onChange'] }) {
  return (
    <div className="form">
      <div className="field-label">Send to</div>
      <div className="chip-toggle">
        {PEOPLE.map((pp) => {
          const on = step.recipients.includes(pp.id);
          return (
            <button type="button" key={pp.id} aria-pressed={on} className={on ? 'on' : ''} onClick={() => onChange({ recipients: on ? step.recipients.filter((x) => x !== pp.id) : [...step.recipients, pp.id] })}>
              <span className="avatar sm" style={{ background: pp.color }}>{pp.initials}</span> {pp.name}
            </button>
          );
        })}
      </div>
      <label className="field-label" htmlFor="msg">
        Message <span className="muted">· {step.message.length}/140</span>
      </label>
      <textarea id="msg" className="input textarea" maxLength={140} rows={3} value={step.message} onChange={(e) => onChange({ message: e.target.value }, `${step.id}-msg`)} placeholder="What should the phone say?" />
      <div className="field-label">Preview</div>
      <div className="push">
        <div className="push-app">
          <span className="push-logo"><Icon name="home" size={11} stroke={2.4} /></span> HOUSEWIRE <span className="muted">· now</span>
        </div>
        <div className="push-title">School-Night Wind-Down</div>
        <div className="push-body">{step.message || 'Empty message'}</div>
      </div>
    </div>
  );
}

function Toggle2({ a, b, value, onChange }: { a: string; b: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="seg seg-full">
      <button type="button" className={value ? 'on' : ''} aria-pressed={value} onClick={() => onChange(true)}>{a}</button>
      <button type="button" className={!value ? 'on' : ''} aria-pressed={!value} onClick={() => onChange(false)}>{b}</button>
    </div>
  );
}

function DevicePicker({ type, selected, onChange, extra, note }: { type: 'light' | 'wifi' | 'plug'; selected: string[]; onChange: (ids: string[]) => void; extra?: React.ReactNode; note?: string }) {
  const devs = DEVICES.filter((d) => d.type === type);
  const rooms = [...new Set(devs.map((d) => d.room))];
  return (
    <div className="form">
      {extra}
      <div className="field-label">
        {type === 'light' ? 'Lights' : type === 'wifi' ? 'Wi-Fi devices' : 'Plugs'} <span className="muted">· {selected.length} of {devs.length} selected</span>
      </div>
      <div className="devpick">
        {rooms.map((room) => {
          const inRoom = devs.filter((d) => d.room === room);
          const all = inRoom.every((d) => selected.includes(d.id));
          return (
            <div key={room} className="devpick-room">
              {type !== 'wifi' && (
                <div className="devpick-roomhead">
                  <span>{room}</span>
                  {inRoom.length > 1 && (
                    <button type="button" className="link" onClick={() => onChange(all ? selected.filter((id) => !inRoom.some((d) => d.id === id)) : [...new Set([...selected, ...inRoom.map((d) => d.id)])])}>
                      {all ? 'Clear room' : 'Whole room'}
                    </button>
                  )}
                </div>
              )}
              {inRoom.map((d) => {
                const on = selected.includes(d.id);
                return (
                  <label key={d.id} className={`dev-row${on ? ' on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => onChange(on ? selected.filter((x) => x !== d.id) : [...selected, d.id])} />
                    <span className="dev-name">{d.name}</span>
                    {type === 'light' && !d.dimmable && <span className="tag">on/off only</span>}
                    <span className="dev-state">{d.state}</span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
      {note && (
        <div className="hint">
          <Icon name="info" size={14} />
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- overview
function RoutineOverview({ steps, run, name }: { steps: Step[]; run: RunResult | null; name: string }) {
  const flat = (list: Step[]): Step[] => list.flatMap((s) => (s.type === 'branch' ? [s, ...flat(s.then), ...flat(s.else)] : [s]));
  const all = flat(steps);
  const devices = new Set(all.flatMap((s) => ('deviceIds' in s ? s.deviceIds : [])));
  const people = new Set(all.flatMap((s) => (s.type === 'notify' ? s.recipients : [])));
  return (
    <div className="inspector overview">
      <div className="insp-head">
        <div className="insp-kicker">
          <span className="insp-icon"><Icon name="moon" size={15} /></span>
          <span>Routine overview</span>
        </div>
        <div className="ov-title">{name}</div>
      </div>
      <div className="insp-body">
        <div className="kv-list">
          <div className="kv"><span>Steps</span><b>{steps.length} top-level · {all.length} total</b></div>
          <div className="kv"><span>Controls</span><b>{devices.size} devices</b></div>
          <div className="kv"><span>Notifies</span><b>{[...people].map((x) => personById(x as PersonId).name).join(', ') || 'Nobody'}</b></div>
          {run && <div className="kv"><span>Dry run</span><b>{run.short} · {fmtDate(run.date)}</b></div>}
        </div>
        <div className="field-label">Whole routine as code</div>
        <CodeBlock code={routineCode(steps)} className="tall" />
        <p className="muted small">Select a step to edit it. Drag cards by their handle to reorder, or use the + between steps.</p>
      </div>
    </div>
  );
}
