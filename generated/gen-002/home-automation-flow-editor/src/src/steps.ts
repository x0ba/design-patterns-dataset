import { deviceById, personById } from './data';
import type { Step, StepCategory, StepType } from './types';
import { DAY_SHORT, describeDays, fmtDur, fmtTime, toHHMM } from './time';

export const STEP_META: Record<StepType, { category: StepCategory; kind: string; icon: string; blurb: string }> = {
  schedule: { category: 'trigger', kind: 'Schedule', icon: 'clock', blurb: 'Start at a time on chosen days' },
  expr: { category: 'condition', kind: 'Expression', icon: 'code', blurb: 'Continue only if an expression is true' },
  presence: { category: 'condition', kind: 'Presence', icon: 'person', blurb: 'Continue if people are home or away' },
  lights: { category: 'action', kind: 'Lights', icon: 'bulb', blurb: 'Turn on, off or dim lights' },
  wifi: { category: 'action', kind: 'Wi-Fi', icon: 'wifi', blurb: 'Pause or resume a device’s internet' },
  notify: { category: 'action', kind: 'Notify', icon: 'bell', blurb: 'Send a push message to family phones' },
  plug: { category: 'action', kind: 'Smart plug', icon: 'plug', blurb: 'Switch a plug on or off' },
  waitUntil: { category: 'flow', kind: 'Wait until', icon: 'hourglass', blurb: 'Pause the routine until a time' },
  waitFor: { category: 'flow', kind: 'Wait', icon: 'hourglass', blurb: 'Pause for a number of minutes' },
  branch: { category: 'flow', kind: 'Branch', icon: 'branch', blurb: 'Do different things if/otherwise' },
};

export const CATEGORY_LABEL: Record<StepCategory, string> = {
  trigger: 'Trigger',
  condition: 'Condition',
  action: 'Action',
  flow: 'Flow',
};

const names = (ids: string[]) => ids.map((id) => deviceById(id)?.name ?? id);

export function joinNames(list: string[]): string {
  if (list.length <= 1) return list[0] ?? '';
  if (list.length === 2) return `${list[0]} & ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`;
}

export function shortDeviceList(ids: string[]): string {
  if (ids.length === 0) return 'no devices';
  const devs = ids.map((id) => deviceById(id)).filter(Boolean);
  const rooms = [...new Set(devs.map((d) => d!.room))];
  if (devs.length > 2 && rooms.length === 1) return `${rooms[0]} (${devs.length} lights)`;
  return joinNames(names(ids));
}

export function stepTitle(s: Step): string {
  if (s.label) return s.label;
  return autoTitle(s);
}

export function autoTitle(s: Step): string {
  switch (s.type) {
    case 'schedule': return `${describeDays(s.days)} at ${fmtTime(s.time)}`;
    case 'expr': return 'Custom condition';
    case 'presence': return `${s.mode === 'any' ? 'Any of' : 'All of'} ${joinNames(s.people.map((p) => personById(p).name))} ${s.state}`;
    case 'lights': return s.on ? `Set ${shortDeviceList(s.deviceIds)}` : `Turn off ${shortDeviceList(s.deviceIds)}`;
    case 'wifi': return `${s.pause ? 'Pause' : 'Resume'} ${joinNames(names(s.deviceIds)) || 'Wi-Fi'}`;
    case 'notify': return `Notify ${joinNames(s.recipients.map((p) => personById(p).name)) || 'nobody'}`;
    case 'plug': return `${joinNames(names(s.deviceIds)) || 'Plug'} ${s.on ? 'on' : 'off'}`;
    case 'waitUntil': return `Wait until ${fmtTime(s.time)}`;
    case 'waitFor': return `Wait ${fmtDur(s.minutes)}`;
    case 'branch': return 'If / otherwise';
  }
}

/** One-line plain-language description shown under the title. */
export function stepSummary(s: Step): string {
  switch (s.type) {
    case 'schedule': return `Every ${s.days.map((d) => DAY_SHORT[d]).join(', ') || '—'} at ${fmtTime(s.time)}`;
    case 'expr': return s.expr;
    case 'presence': {
      const ppl = s.people.map((p) => `${personById(p).name}'s phone`);
      return `${s.mode === 'any' ? 'At least one of' : 'All of'} ${joinNames(ppl) || '—'} is ${s.state}`;
    }
    case 'lights': {
      const n = names(s.deviceIds);
      if (!s.on) return `${joinNames(n)} → off`;
      return `${joinNames(n) || 'No lights chosen'} → ${s.brightness}%${s.fade ? ` over ${fmtDur(s.fade / 60)}` : ''}`;
    }
    case 'wifi': return `${s.pause ? 'Pause internet for' : 'Resume internet for'} ${joinNames(names(s.deviceIds)) || '—'}`;
    case 'notify': return `“${s.message}”`;
    case 'plug': return `${joinNames(names(s.deviceIds))} → ${s.on ? 'on' : 'off'}`;
    case 'waitUntil': return `Hold the routine until ${fmtTime(s.time)}`;
    case 'waitFor': return `Hold the routine for ${fmtDur(s.minutes)}`;
    case 'branch': return s.expr;
  }
}

const devCode = (id: string) => {
  const c = deviceById(id)?.code ?? id;
  return c.startsWith('wifi.') ? c.slice(5) : c;
};

function dayList(days: number[]): string {
  const d = describeDays(days);
  if (/^[A-Z][a-z]{2}–[A-Z][a-z]{2}$/.test(d)) return `[${d.replace('–', '..')}]`;
  return `[${[...days].sort().map((x) => DAY_SHORT[x]).join(', ')}]`;
}

export function presenceExpr(s: Extract<Step, { type: 'presence' }>): string {
  const field = s.state === 'home' ? 'home' : 'away';
  return s.people.map((p) => `${p}.${field}`).join(s.mode === 'any' ? ' or ' : ' and ') || 'false';
}

export function stepCode(s: Step, indent = ''): string {
  const i = indent;
  switch (s.type) {
    case 'schedule': return `${i}when schedule(at: ${toHHMM(s.time)}, days: ${dayList(s.days)})`;
    case 'expr': return `${i}require ${s.expr}`;
    case 'presence': return `${i}require ${presenceExpr(s)}`;
    case 'lights': {
      const list = s.deviceIds.map(devCode);
      const arr = list.length > 1 ? `[\n${list.map((d) => `${i}    ${d}`).join(',\n')}\n${i}  ]` : list[0] ?? '[]';
      if (!s.on) return `${i}lights.off(${arr})`;
      return `${i}lights.set(\n${i}  ${arr},\n${i}  brightness: ${s.brightness}%${s.fade ? `,\n${i}  fade: ${fmtDur(s.fade / 60)}` : ''}\n${i})`;
    }
    case 'wifi': {
      const list = s.deviceIds.map(devCode);
      return `${i}wifi.${s.pause ? 'pause' : 'resume'}(${list.length === 1 ? list[0] : `[${list.join(', ')}]`})`;
    }
    case 'notify': return `${i}notify(\n${i}  to: [${s.recipients.join(', ')}],\n${i}  ${JSON.stringify(s.message)}\n${i})`;
    case 'plug': return `${i}plug.${s.on ? 'on' : 'off'}(${s.deviceIds.map(devCode).join(', ')})`;
    case 'waitUntil': return `${i}wait until ${toHHMM(s.time)}`;
    case 'waitFor': return `${i}wait ${fmtDur(s.minutes)}`;
    case 'branch': {
      const body = (list: Step[]) => (list.length ? list.map((x) => stepCode(x, i + '  ')).join('\n') : `${i}  pass`);
      return `${i}if ${s.expr}:\n${body(s.then)}\n${i}else:\n${body(s.else)}`;
    }
  }
}

export function routineCode(steps: Step[]): string {
  return steps.map((s) => (s.disabled ? stepCode(s).split('\n').map((l) => `# ${l}`).join('\n') : stepCode(s))).join('\n');
}

// ---------------------------------------------------------------- tree ops
export type Arm = 'then' | 'else';
export interface Slot { parentId: string | null; arm: Arm | null; index: number }

export function listAt(steps: Step[], parentId: string | null, arm: Arm | null): Step[] | null {
  if (parentId === null) return steps;
  const p = findStep(steps, parentId);
  if (!p || p.step.type !== 'branch' || !arm) return null;
  return p.step[arm];
}

export function findStep(steps: Step[], id: string, parentId: string | null = null, arm: Arm | null = null): { step: Step; index: number; parentId: string | null; arm: Arm | null } | null {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.id === id) return { step: s, index: i, parentId, arm };
    if (s.type === 'branch') {
      const a = findStep(s.then, id, s.id, 'then') ?? findStep(s.else, id, s.id, 'else');
      if (a) return a;
    }
  }
  return null;
}

function mapTree(steps: Step[], fn: (s: Step) => Step): Step[] {
  return steps.map((s) => {
    const n = fn(s);
    if (n.type === 'branch') return { ...n, then: mapTree(n.then, fn), else: mapTree(n.else, fn) };
    return n;
  });
}

export function updateStep(steps: Step[], id: string, patch: Partial<Step>): Step[] {
  return mapTree(steps, (s) => (s.id === id ? ({ ...s, ...patch } as Step) : s));
}

export function replaceStep(steps: Step[], id: string, next: Step): Step[] {
  return mapTree(steps, (s) => (s.id === id ? next : s));
}

export function removeStep(steps: Step[], id: string): Step[] {
  const strip = (list: Step[]): Step[] =>
    list.filter((s) => s.id !== id).map((s) => (s.type === 'branch' ? { ...s, then: strip(s.then), else: strip(s.else) } : s));
  return strip(steps);
}

export function insertAt(steps: Step[], slot: Slot, step: Step): Step[] {
  if (slot.parentId === null) {
    const copy = [...steps];
    copy.splice(slot.index, 0, step);
    return copy;
  }
  return mapTree(steps, (s) => {
    if (s.id === slot.parentId && s.type === 'branch' && slot.arm) {
      const copy = [...s[slot.arm]];
      copy.splice(slot.index, 0, step);
      return { ...s, [slot.arm]: copy };
    }
    return s;
  });
}

export function containsId(step: Step, id: string): boolean {
  if (step.id === id) return true;
  if (step.type === 'branch') return [...step.then, ...step.else].some((c) => containsId(c, id));
  return false;
}

export function moveStep(steps: Step[], id: string, slot: Slot): Step[] {
  const found = findStep(steps, id);
  if (!found) return steps;
  if (slot.parentId && containsId(found.step, slot.parentId)) return steps;
  let index = slot.index;
  if (found.parentId === slot.parentId && found.arm === slot.arm && found.index < index) index -= 1;
  if (found.parentId === slot.parentId && found.arm === slot.arm && found.index === index) return steps;
  const without = removeStep(steps, id);
  return insertAt(without, { ...slot, index }, found.step);
}

export function flatSteps(steps: Step[]): Step[] {
  return steps.flatMap((s) => (s.type === 'branch' ? [s, ...flatSteps(s.then), ...flatSteps(s.else)] : [s]));
}

let counter = 0;
export const newId = () => `s-new-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function cloneWithNewIds(s: Step): Step {
  const base = { ...s, id: newId() } as Step;
  if (base.type === 'branch') return { ...base, then: base.then.map(cloneWithNewIds), else: base.else.map(cloneWithNewIds) };
  return base;
}

export function makeStep(type: StepType, variant?: string): Step {
  const id = newId();
  switch (type) {
    case 'schedule': return { id, type, time: 20 * 60, days: [1, 2, 3, 4, 5] };
    case 'expr':
      if (variant === 'window') return { id, type, label: 'Time window', expr: 'now() in 20:15..21:00' };
      return { id, type, expr: 'not holiday(today)' };
    case 'presence': return { id, type, people: ['ada', 'tobi'], mode: 'any', state: 'home' };
    case 'lights': return { id, type, deviceIds: [], on: true, brightness: 50, fade: 0 };
    case 'wifi': return { id, type, deviceIds: [], pause: true };
    case 'notify': return { id, type, recipients: ['emeka', 'ruth'], message: '' };
    case 'plug': return { id, type, deviceIds: [], on: true };
    case 'waitUntil': return { id, type, time: 21 * 60 };
    case 'waitFor': return { id, type, minutes: 15 };
    case 'branch': return { id, type, expr: 'ada.home', then: [], else: [] };
  }
}

export const PALETTE: { category: StepCategory; items: { type: StepType; variant?: string; label: string; blurb: string }[] }[] = [
  {
    category: 'condition',
    items: [
      { type: 'presence', label: 'Presence', blurb: STEP_META.presence.blurb },
      { type: 'expr', variant: 'window', label: 'Time window', blurb: 'Only between two times, e.g. 20:15..21:00' },
      { type: 'expr', label: 'Expression', blurb: STEP_META.expr.blurb },
    ],
  },
  {
    category: 'action',
    items: [
      { type: 'lights', label: 'Lights', blurb: STEP_META.lights.blurb },
      { type: 'wifi', label: 'Wi-Fi pause', blurb: STEP_META.wifi.blurb },
      { type: 'notify', label: 'Notify', blurb: STEP_META.notify.blurb },
      { type: 'plug', label: 'Smart plug', blurb: STEP_META.plug.blurb },
    ],
  },
  {
    category: 'flow',
    items: [
      { type: 'waitUntil', label: 'Wait until', blurb: STEP_META.waitUntil.blurb },
      { type: 'waitFor', label: 'Wait for', blurb: STEP_META.waitFor.blurb },
      { type: 'branch', label: 'Branch', blurb: STEP_META.branch.blurb },
    ],
  },
];
