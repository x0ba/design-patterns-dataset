import { HISTORY, HOLIDAYS, deviceById, personById } from './data';
import { check, show, type EvalCtx } from './expr';
import { joinNames, presenceExpr, stepTitle } from './steps';
import type { HistoryDay, PersonId, Step } from './types';
import { DAY_LONG, fmtDur, fmtTime, weekdayOf } from './time';

export type ResultStatus = 'pass' | 'fail' | 'done' | 'skip' | 'unreached' | 'error' | 'disabled' | 'nottaken';

export interface StepResult {
  status: ResultStatus;
  at: number | null;
  headline: string;
  details: string[];
  branch?: 'then' | 'else';
}

export interface Fired {
  at: number;
  stepId: string;
  kind: 'lights' | 'wifi' | 'notify' | 'plug';
  text: string;
  detail?: string;
  warn?: string;
}

export interface RunResult {
  date: string;
  outcome: 'ran' | 'stopped' | 'notScheduled' | 'holidayStop' | 'error';
  headline: string;
  short: string;
  triggerAt: number | null;
  endAt: number | null;
  stoppedBy?: string;
  steps: Record<string, StepResult>;
  fired: Fired[];
}

const ALL: PersonId[] = ['emeka', 'ruth', 'ada', 'tobi'];

export function dayOf(date: string): HistoryDay | undefined {
  return HISTORY.find((d) => d.date === date);
}

export function presenceAt(day: HistoryDay | undefined, t: number): Record<PersonId, boolean> {
  const st: Record<PersonId, boolean> = { emeka: true, ruth: true, ada: true, tobi: true };
  for (const e of day?.events ?? []) {
    if (e.t > t) break;
    if (e.kind === 'presence') st[e.person] = e.state === 'home';
  }
  return st;
}

export function brightnessAt(day: HistoryDay | undefined, device: string, t: number): number {
  let b = 0;
  for (const e of day?.events ?? []) {
    if (e.t > t) break;
    if (e.kind === 'light' && e.device === device) b = e.brightness;
  }
  return b;
}

export function ctxFor(date: string, t: number): EvalCtx {
  return { date, now: t, presence: presenceAt(dayOf(date), t) };
}

export function simulate(steps: Step[], date: string): RunResult {
  const day = dayOf(date);
  const res: RunResult = { date, outcome: 'ran', headline: '', short: '', triggerAt: null, endAt: null, steps: {}, fired: [] };
  const wd = weekdayOf(date);

  const markAll = (list: Step[], status: ResultStatus, headline: string) => {
    for (const s of list) {
      res.steps[s.id] = { status: s.disabled ? 'disabled' : status, at: null, headline: s.disabled ? 'Step is turned off' : headline, details: [] };
      if (s.type === 'branch') {
        markAll(s.then, status, headline);
        markAll(s.else, status, headline);
      }
    }
  };

  const trigger = steps[0];
  if (!trigger || trigger.type !== 'schedule') {
    markAll(steps, 'unreached', 'No trigger');
    res.outcome = 'error';
    res.headline = 'This routine needs a schedule trigger as its first step.';
    res.short = 'No trigger';
    return res;
  }
  if (trigger.disabled || !trigger.days.includes(wd)) {
    markAll(steps.slice(1), 'unreached', `Not reached — no trigger on ${DAY_LONG[wd]}`);
    res.steps[trigger.id] = { status: 'skip', at: null, headline: trigger.disabled ? 'Trigger is turned off' : `Doesn’t fire on ${DAY_LONG[wd]}s`, details: [] };
    res.outcome = 'notScheduled';
    res.headline = trigger.disabled ? 'The trigger is turned off, so nothing would have happened.' : `Not a scheduled day — the trigger only fires ${trigger.days.length ? 'on the selected days' : 'on no days'}.`;
    res.short = 'Not scheduled';
    return res;
  }

  let clock = trigger.time;
  res.triggerAt = clock;
  res.steps[trigger.id] = { status: 'pass', at: clock, headline: `Fired at ${fmtTime(clock)}`, details: [] };
  let stopped: { by: string; why: string } | null = null;

  const evalExpr = (s: Step, expr: string) => check(expr, ctxFor(date, clock));

  const walk = (list: Step[]) => {
    for (const s of list) {
      if (stopped) {
        markAll([s], 'unreached', `Not reached — stopped at “${stopped.by}”`);
        continue;
      }
      if (s.disabled) {
        markAll([s], 'disabled', 'Step is turned off');
        continue;
      }
      const at = clock;
      switch (s.type) {
        case 'schedule':
          res.steps[s.id] = { status: 'skip', at, headline: 'Only the first step can be a trigger', details: [] };
          break;
        case 'expr':
        case 'presence': {
          const expr = s.type === 'expr' ? s.expr : presenceExpr(s);
          const r = evalExpr(s, expr);
          const details = (r.terms ?? []).map((t) => `${t.joiner ? `${t.joiner} ` : ''}${t.text} → ${t.error ? `error` : show(t.value!)}`);
          if (s.type === 'presence') {
            const p = presenceAt(day, clock);
            details.splice(0, details.length, ...s.people.map((id) => `${personById(id).name}: ${p[id] ? 'home' : 'away'} at ${fmtTime(clock)}`));
          }
          if (!r.ok) {
            res.steps[s.id] = { status: 'error', at, headline: r.error!.message, details };
            stopped = { by: stepTitle(s), why: 'error' };
          } else if (r.value!.t === 'bool' && r.value!.v) {
            res.steps[s.id] = { status: 'pass', at, headline: 'Passed', details };
          } else {
            const isHoliday = s.type === 'expr' && /holiday/.test(s.expr) && HOLIDAYS.some((h) => h.date === date);
            res.steps[s.id] = {
              status: 'fail', at,
              headline: isHoliday ? `Stopped — ${HOLIDAYS.find((h) => h.date === date)!.name} is on the school calendar` : 'Condition was false — routine stops here',
              details,
            };
            stopped = { by: stepTitle(s), why: isHoliday ? 'holiday' : 'false' };
          }
          break;
        }
        case 'lights': {
          const details: string[] = [];
          let warn: string | undefined;
          for (const id of s.deviceIds) {
            const d = deviceById(id);
            const b0 = brightnessAt(day, id, clock);
            const target = s.on ? (d?.dimmable ? s.brightness : 100) : 0;
            const fmt = (b: number) => (b === 0 ? 'off' : d?.dimmable ? `${b}%` : 'on');
            details.push(b0 === target ? `${d?.name}: already ${fmt(b0)}` : `${d?.name}: ${fmt(b0)} → ${fmt(target)}`);
            // manual override within the next hour?
            const later = day?.events.find((e) => e.kind === 'light' && e.device === id && e.t > clock && e.t <= clock + 60 && e.by);
            if (later && later.kind === 'light' && !warn) {
              warn = `${later.by} set ${d?.name} to ${later.brightness ? `${later.brightness}%` : 'off'} at ${fmtTime(later.t)}, ${fmtDur(later.t - clock)} later`;
            }
          }
          if (s.deviceIds.length === 0) {
            res.steps[s.id] = { status: 'error', at, headline: 'No lights chosen', details };
            break;
          }
          res.steps[s.id] = { status: 'done', at, headline: `Would run at ${fmtTime(at)}`, details };
          res.fired.push({ at, stepId: s.id, kind: 'lights', text: stepTitle(s), detail: details.join(' · '), warn });
          break;
        }
        case 'wifi': {
          if (s.deviceIds.length === 0) {
            res.steps[s.id] = { status: 'error', at, headline: 'No Wi-Fi devices chosen', details: [] };
            break;
          }
          const details = s.deviceIds.map((id) => {
            const d = deviceById(id)!;
            const owner = d.person ? presenceAt(day, clock)[d.person] : true;
            return `${d.name}: internet ${s.pause ? 'paused' : 'resumed'}${d.person && !owner ? ` (${personById(d.person).name} was away)` : ''}`;
          });
          res.steps[s.id] = { status: 'done', at, headline: `Would run at ${fmtTime(at)}`, details };
          res.fired.push({ at, stepId: s.id, kind: 'wifi', text: stepTitle(s), detail: details.join(' · ') });
          break;
        }
        case 'notify': {
          const to = joinNames(s.recipients.map((p) => personById(p).name));
          if (!s.recipients.length) {
            res.steps[s.id] = { status: 'error', at, headline: 'No recipients chosen', details: [] };
            break;
          }
          res.steps[s.id] = { status: 'done', at, headline: `Would send at ${fmtTime(at)}`, details: [`To ${to}`] };
          res.fired.push({ at, stepId: s.id, kind: 'notify', text: `Message to ${to}`, detail: s.message ? `“${s.message}”` : '(empty message)', warn: s.message ? undefined : 'Message is empty' });
          break;
        }
        case 'plug': {
          const details = s.deviceIds.map((id) => `${deviceById(id)?.name}: ${s.on ? 'on' : 'off'}`);
          res.steps[s.id] = { status: s.deviceIds.length ? 'done' : 'error', at, headline: s.deviceIds.length ? `Would run at ${fmtTime(at)}` : 'No plugs chosen', details };
          if (s.deviceIds.length) res.fired.push({ at, stepId: s.id, kind: 'plug', text: stepTitle(s), detail: details.join(' · ') });
          break;
        }
        case 'waitUntil': {
          if (s.time >= clock) {
            const waited = s.time - clock;
            clock = s.time;
            res.steps[s.id] = { status: 'pass', at: clock, headline: `Waited ${fmtDur(waited)} → ${fmtTime(clock)}`, details: [] };
          } else {
            res.steps[s.id] = { status: 'pass', at, headline: `Already past ${fmtTime(s.time)} — continues right away`, details: [] };
          }
          break;
        }
        case 'waitFor': {
          clock += s.minutes;
          res.steps[s.id] = { status: 'pass', at: clock, headline: `Waited ${fmtDur(s.minutes)} → ${fmtTime(clock)}`, details: [] };
          break;
        }
        case 'branch': {
          const r = evalExpr(s, s.expr);
          const details = (r.terms ?? []).map((t) => `${t.joiner ? `${t.joiner} ` : ''}${t.text} → ${t.error ? 'error' : show(t.value!)}`);
          if (!r.ok) {
            res.steps[s.id] = { status: 'error', at, headline: r.error!.message, details };
            stopped = { by: stepTitle(s), why: 'error' };
            markAll([...s.then, ...s.else], 'unreached', 'Not reached — branch condition has an error');
            break;
          }
          const yes = r.value!.t === 'bool' && r.value!.v;
          res.steps[s.id] = { status: 'pass', at, headline: yes ? `True at ${fmtTime(at)} → took “If”` : `False at ${fmtTime(at)} → took “Otherwise”`, details, branch: yes ? 'then' : 'else' };
          markAll(yes ? s.else : s.then, 'nottaken', 'Branch not taken');
          walk(yes ? s.then : s.else);
          break;
        }
      }
    }
  };

  walk(steps.slice(1));
  res.endAt = clock;
  const st = stopped as { by: string; why: string } | null;
  if (st) {
    res.stoppedBy = st.by;
    res.outcome = st.why === 'holiday' ? 'holidayStop' : st.why === 'error' ? 'error' : 'stopped';
    const hol = HOLIDAYS.find((h) => h.date === date);
    res.headline =
      st.why === 'holiday'
        ? `Triggered at ${fmtTime(res.triggerAt!)}, then skipped — ${hol?.name} is a school holiday.`
        : st.why === 'error'
          ? `Triggered at ${fmtTime(res.triggerAt!)} but “${st.by}” has an error.`
          : `Triggered at ${fmtTime(res.triggerAt!)}, then stopped at “${st.by}”.`;
    res.short = st.why === 'holiday' ? 'Holiday — skipped' : st.why === 'error' ? 'Error' : 'Stopped';
    if (res.fired.length) res.headline += ` ${res.fired.length} action${res.fired.length > 1 ? 's' : ''} ran before that.`;
  } else {
    res.outcome = 'ran';
    res.headline = `Would have run at ${fmtTime(res.triggerAt!)} and finished at ${fmtTime(res.endAt!)} — ${res.fired.length} action${res.fired.length === 1 ? '' : 's'}.`;
    res.short = `${res.fired.length} actions`;
  }
  return res;
}

export const PEOPLE_IDS = ALL;
