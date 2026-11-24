import { createContext, useContext } from 'react';
import { Analysis, IssueGroup, IssueItem, PlanRow } from './engine/rules';
import { AppState } from './state';
import { Assignment } from './data/seed';

export type Tab = 'schedule' | 'trucks' | 'zones' | 'requests' | 'forms';

export type Selection =
  | { type: 'assignment'; id: string }
  | { type: 'cell'; zoneId: string; day: number }
  | { type: 'truck'; truckId: string }
  | null;

export interface Ctx {
  state: AppState;
  an: Analysis;
  groups: IssueGroup[];
  acked: IssueItem[];
  initialById: Record<string, Assignment>;
  sel: Selection;
  focusTruck: string | null;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  week: number;
  setWeek: (w: number) => void;
  setTab: (t: Tab) => void;
  mode: 'week' | 'month';
  setMode: (m: 'week' | 'month') => void;
  select: (s: Selection, opts?: { jump?: boolean }) => void;
  setFocusTruck: (id: string | null) => void;
  move: (id: string, zoneId: string, day: number, opts?: { soft?: string[] }) => void;
  remove: (id: string) => void;
  add: (truckId: string, zoneId: string, day: number) => void;
  ack: (key: string) => void;
  unack: (key: string) => void;
  decideRequest: (id: string, decision: 'approved' | 'declined') => void;
  applyPlan: (rows: PlanRow[], label: string) => void;
  openRehome: (assignmentIds: string[], title: string) => void;
  remind: (truckIds: string[]) => void;
  reviewForm: (truckId: string) => void;
  toast: (msg: string, opts?: { undo?: boolean; tone?: 'ok' | 'warn' }) => void;
}

export const AppContext = createContext<Ctx | null>(null);
export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('no ctx');
  return c;
}
