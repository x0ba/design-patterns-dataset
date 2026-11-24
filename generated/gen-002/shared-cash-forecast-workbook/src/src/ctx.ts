import { createContext, useContext } from 'react';
import { lineById, person, type Thread } from './data';
import type { balances } from './model';
import type { Action, State } from './state';

export interface Check {
  id: string;
  level: 'block' | 'warn' | 'ok' | 'info';
  title: string;
  detail?: string;
  actions: { label: string; run: () => void }[];
}

export interface Ctx {
  s: State;
  dispatch: (a: Action) => void;
  now: () => Date;
  bal: ReturnType<typeof balances>;
  checks: Check[];
  post: (thread: Thread, text: string, action?: string) => void;
  askEditor: (by: string) => void;
  openLock: () => void;
  openSignoff: () => void;
}

export const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function editBlockReason(s: State, lineId: string): string | null {
  const l = lineById[lineId];
  if (s.signoff.status === 'submitted') return 'Submitted for sign-off. Recall it to make changes.';
  if (l.group === 'payroll' && s.payrollLock.holder && s.payrollLock.holder !== 'helen')
    return `Locked: ${person[s.payrollLock.holder].name} is editing payroll`;
  if (l.owner !== 'helen') {
    const o = person[l.owner];
    const role = o.role === 'liaison' ? 'revenue-cycle liaison' : 'analyst';
    return `Owned by ${o.name} (${role}). Comment or ask them to change it.`;
  }
  return null;
}
