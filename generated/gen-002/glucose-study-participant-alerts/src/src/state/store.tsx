import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { EVENTS } from '../data/alerts';
import { NOW, pt } from '../lib/time';
import {
  CURRENT_USER,
  STORE_VERSION,
  type AdverseEvent,
  type AppState,
  type AuditEntry,
  type CallLog,
  type Selection,
  type Snooze,
  type TriageRecord,
  type View,
  type VisitRequest,
} from './types';
import type { Closure } from '../data/alerts';

const STORAGE_KEY = 'paceline.cohort3.state';

/** Event the on-call coordinator sees first: the 03:14 low for P-322. */
function openSafetyEventId(): string {
  const e = EVENTS.find((x) => x.pid === 'P-322' && x.ruleId === 'SAFE-00');
  if (!e) throw new Error('P-322 safety event missing from mock data');
  return e.id;
}

const SEED_ADVERSE: AdverseEvent[] = [
  {
    id: 'AE-C3-001',
    pid: 'P-305',
    occurredAt: pt('2026-11-10', '02:40'),
    term: 'Hypoglycemia: glucose below 54 mg/dL sustained 15 min',
    peak: 49,
    durationMin: 20,
    callSummary: 'Reached participant at 02:52. Alert, mild tremor. Advised 15 g fast-acting carbohydrate and a recheck.',
    action: 'Safety call completed; carbohydrate taken; recovery confirmed',
    outcome: 'Resolved. Glucose 74 mg/dL at 03:20.',
    reportedBy: 'R. Lindqvist (coordinator)',
    createdAt: pt('2026-11-10', '09:15'),
    piReview: 'Reviewed 10 Nov by Dr. Helen Marsh (PI)',
  },
  {
    id: 'AE-C3-002',
    pid: 'P-311',
    occurredAt: pt('2026-11-12', '15:20'),
    term: 'Hypoglycemia: glucose below 54 mg/dL sustained 15 min',
    peak: 51,
    durationMin: 15,
    callSummary: 'Reached participant at 15:31. Skipped lunch before a two-hour ride; reported shakiness. Advised carbohydrate and rest.',
    action: 'Safety call completed; 15 g carbohydrate; recheck 58 mg/dL at 15:50',
    outcome: 'Resolved. Glucose 83 mg/dL at 16:05.',
    reportedBy: 'M. Okafor (day coordinator)',
    createdAt: pt('2026-11-12', '16:40'),
    piReview: 'Reviewed 13 Nov by Dr. Helen Marsh (PI)',
  },
  {
    id: 'AE-C3-003',
    pid: 'P-318',
    occurredAt: pt('2026-11-14', '04:52'),
    term: 'Hypoglycemia: glucose below 54 mg/dL sustained 15 min',
    peak: 53,
    durationMin: 15,
    callSummary: 'Reached participant at 05:04, awake and asymptomatic. Advised carbohydrate snack and a recheck before sleep.',
    action: 'Safety call completed; carbohydrate snack; recheck 71 mg/dL at 05:20',
    outcome: 'Resolved. No further readings below 70 mg/dL overnight.',
    reportedBy: 'R. Lindqvist (coordinator)',
    createdAt: pt('2026-11-14', '08:30'),
    piReview: 'Reviewed 16 Nov by Dr. Helen Marsh (PI)',
  },
];

const SEED_SNOOZES: Snooze[] = [
  {
    id: 'SNZ-0412',
    pid: 'P-314',
    ruleId: 'SENS-03',
    untilMs: pt('2026-11-18', '00:00'),
    reason: 'Sensor re-taped',
    note: 'Adhesive edge lifted after a shower. Re-taped at 09:10 on 16 Nov; recheck at next data pull.',
    createdAt: pt('2026-11-16', '09:10'),
    createdBy: 'M. Okafor (day coordinator)',
  },
];

function seedAudit(): AuditEntry[] {
  const held = EVENTS.filter((e) => e.handling === 'held').length;
  return [
    { at: pt('2026-11-16', '09:10'), by: 'M. Okafor (day coordinator)', text: 'Snoozed sensor-adhesion alerts for P-314 until 18 Nov 00:00 (SNZ-0412).' },
    { at: pt('2026-11-16', '17:26'), by: 'M. Okafor (day coordinator)', text: 'Closed safety review for P-313 (glucose 53 mg/dL at 17:04) as probable artifact. No safety call.' },
    { at: pt('2026-11-16', '23:02'), by: 'System', text: 'Auto-closed signal-loss escalation for P-306. Signal resumed; no staff action.' },
    { at: pt('2026-11-17', '01:38'), by: 'System', text: 'Escalated P-317: no sensor data for 6 h (escalation threshold).' },
    { at: pt('2026-11-17', '03:14'), by: 'System', text: 'Escalated P-322: glucose 52 mg/dL, single reading below 54.' },
    { at: pt('2026-11-17', '06:00'), by: 'System', text: `Quiet hours ended. ${held} held non-safety events released to the queue.` },
  ];
}

export function initialState(): AppState {
  return {
    version: STORE_VERSION,
    view: 'attention',
    selection: { kind: 'event', id: openSafetyEventId() },
    triage: {},
    closed: {},
    calls: [],
    adverse: SEED_ADVERSE,
    snoozes: SEED_SNOOZES,
    audit: seedAudit(),
    visitRequests: {},
  };
}

function loadState(): AppState {
  const fallback = initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== STORE_VERSION) return fallback;
    return { ...fallback, ...parsed, selection: parsed.selection ?? fallback.selection };
  } catch {
    return fallback;
  }
}

type Stamped = { audit?: string };

export type Action =
  | { type: 'view'; view: View }
  | { type: 'select'; selection: Selection }
  | ({ type: 'triage'; eventId: string; record: TriageRecord } & Stamped)
  | ({ type: 'close'; eventId: string; closure: Closure } & Stamped)
  | ({ type: 'call'; call: CallLog } & Stamped)
  | ({ type: 'ae'; entry: AdverseEvent; eventId: string; closure: Closure } & Stamped)
  | ({ type: 'snooze'; snooze: Snooze } & Stamped)
  | ({ type: 'unsnooze'; id: string } & Stamped)
  | ({ type: 'visit'; pid: string; request: VisitRequest } & Stamped)
  | { type: 'reset' };

function reducer(state: AppState, action: Action): AppState {
  const withAudit = (next: AppState, text?: string): AppState =>
    text ? { ...next, audit: [{ at: NOW, by: CURRENT_USER, text }, ...next.audit] } : next;

  switch (action.type) {
    case 'view':
      return { ...state, view: action.view };
    case 'select':
      return { ...state, selection: action.selection };
    case 'triage':
      return withAudit(
        { ...state, triage: { ...state.triage, [action.eventId]: action.record } },
        action.audit,
      );
    case 'close':
      return withAudit({ ...state, closed: { ...state.closed, [action.eventId]: action.closure } }, action.audit);
    case 'call':
      return withAudit({ ...state, calls: [action.call, ...state.calls] }, action.audit);
    case 'ae':
      return withAudit(
        {
          ...state,
          adverse: [action.entry, ...state.adverse],
          closed: { ...state.closed, [action.eventId]: action.closure },
        },
        action.audit,
      );
    case 'snooze':
      return withAudit({ ...state, snoozes: [action.snooze, ...state.snoozes] }, action.audit);
    case 'unsnooze':
      return withAudit({ ...state, snoozes: state.snoozes.filter((s) => s.id !== action.id) }, action.audit);
    case 'visit':
      return withAudit(
        { ...state, visitRequests: { ...state.visitRequests, [action.pid]: action.request } },
        action.audit,
      );
    case 'reset':
      return initialState();
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: (a: Action) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or disabled: the session still works in memory.
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}

export function resetStorage(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
