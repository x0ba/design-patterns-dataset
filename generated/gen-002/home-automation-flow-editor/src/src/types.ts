export type PersonId = 'emeka' | 'ruth' | 'ada' | 'tobi';

export type DeviceType = 'light' | 'plug' | 'thermostat' | 'door' | 'router' | 'wifi' | 'phone' | 'hub';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  room: string;
  dimmable?: boolean;
  /** Human-readable current state */
  state: string;
  on?: boolean;
  person?: PersonId;
  code: string; // identifier used in code view
}

export interface Person {
  id: PersonId;
  name: string;
  role: string;
  phoneId: string;
  initials: string;
  color: string;
}

export type StepType =
  | 'schedule'
  | 'expr'
  | 'presence'
  | 'lights'
  | 'wifi'
  | 'notify'
  | 'plug'
  | 'waitUntil'
  | 'waitFor'
  | 'branch';

export type StepCategory = 'trigger' | 'condition' | 'action' | 'flow';

interface StepBase {
  id: string;
  disabled?: boolean;
  label?: string;
}

export interface ScheduleStep extends StepBase { type: 'schedule'; time: number; days: number[] }
export interface ExprStep extends StepBase { type: 'expr'; expr: string }
export interface PresenceStep extends StepBase { type: 'presence'; people: PersonId[]; mode: 'any' | 'all'; state: 'home' | 'away' }
export interface LightsStep extends StepBase { type: 'lights'; deviceIds: string[]; on: boolean; brightness: number; fade: number }
export interface WifiStep extends StepBase { type: 'wifi'; deviceIds: string[]; pause: boolean }
export interface NotifyStep extends StepBase { type: 'notify'; recipients: PersonId[]; message: string }
export interface PlugStep extends StepBase { type: 'plug'; deviceIds: string[]; on: boolean }
export interface WaitUntilStep extends StepBase { type: 'waitUntil'; time: number }
export interface WaitForStep extends StepBase { type: 'waitFor'; minutes: number }
export interface BranchStep extends StepBase { type: 'branch'; expr: string; then: Step[]; else: Step[] }

export type Step =
  | ScheduleStep
  | ExprStep
  | PresenceStep
  | LightsStep
  | WifiStep
  | NotifyStep
  | PlugStep
  | WaitUntilStep
  | WaitForStep
  | BranchStep;

export type HistoryEvent =
  | { t: number; kind: 'presence'; person: PersonId; state: 'home' | 'away' }
  | { t: number; kind: 'door'; device: string; state: 'open' | 'closed' }
  | { t: number; kind: 'light'; device: string; brightness: number; by?: string };

export interface HistoryDay {
  date: string; // YYYY-MM-DD
  events: HistoryEvent[];
}

export interface Routine {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  steps: string[];
  lastRun: string;
  lastResult?: 'ok' | 'skipped' | 'failed';
  icon: string;
}

export interface Holiday { date: string; name: string }
