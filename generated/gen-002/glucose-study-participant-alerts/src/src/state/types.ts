import type { Closure } from '../data/alerts';

export const CURRENT_USER = 'Ines Kowalczyk';
export const STORE_VERSION = 1;

export type View = 'attention' | 'participants' | 'adverse' | 'alerts' | 'snoozes';

export type Selection =
  | { kind: 'event'; id: string }
  | { kind: 'participant'; pid: string }
  | { kind: 'snooze'; pid: string; ruleId: string };

export type TriageDecision = 'real' | 'artifact' | 'undetermined';

export interface TriageRecord {
  decision: TriageDecision;
  at: number;
  reasons: string[];
  note: string;
}

export type CallOutcome = 'Reached' | 'Voicemail' | 'No answer';

export interface CallLog {
  id: string;
  pid: string;
  at: number;
  by: string;
  purpose: 'Safety call' | 'Gap check' | 'Routine';
  outcome: CallOutcome;
  advice: string[];
  symptoms: string[];
  notes: string;
}

export interface AdverseEvent {
  id: string;
  pid: string;
  occurredAt: number;
  term: string;
  peak: number;
  durationMin: number;
  callSummary: string;
  action: string;
  outcome: string;
  reportedBy: string;
  createdAt: number;
  piReview: string | null;
  eventId?: string;
}

export interface Snooze {
  id: string;
  pid: string;
  ruleId: string;
  untilMs: number;
  reason: string;
  note: string;
  createdAt: number;
  createdBy: string;
}

export interface AuditEntry {
  at: number;
  by: string;
  text: string;
}

export interface VisitRequest {
  at: number;
  note: string;
}

export interface AppState {
  version: typeof STORE_VERSION;
  view: View;
  selection: Selection;
  triage: Record<string, TriageRecord>;
  closed: Record<string, Closure>;
  calls: CallLog[];
  adverse: AdverseEvent[];
  snoozes: Snooze[];
  audit: AuditEntry[];
  visitRequests: Record<string, VisitRequest>;
}
