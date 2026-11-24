import { EVENTS, RULE_BY_ID, type AlertEvent, type Closure, type RuleId } from '../data/alerts';
import { ROSTER, type Participant } from '../data/roster';
import { NOW, sensorDay } from '../lib/time';
import type { AppState, Snooze } from './types';

export function closureOf(e: AlertEvent, s: AppState): Closure | undefined {
  return e.closed ?? s.closed[e.id];
}

export function openEscalations(s: AppState): AlertEvent[] {
  return EVENTS.filter((e) => e.handling === 'escalated' && !closureOf(e, s));
}

export function closedEscalations(s: AppState): AlertEvent[] {
  return EVENTS.filter((e) => e.handling === 'escalated' && closureOf(e, s));
}

export interface HeldGroup {
  key: string;
  pid: string;
  ruleId: RuleId;
  events: AlertEvent[];
}

/** Non-safety events held by quiet hours, grouped by participant and rule. */
export function heldGroups(): HeldGroup[] {
  const map = new Map<string, HeldGroup>();
  for (const e of EVENTS) {
    if (e.handling !== 'held') continue;
    const key = `${e.pid}|${e.ruleId}`;
    const g = map.get(key) ?? { key, pid: e.pid, ruleId: e.ruleId, events: [] };
    g.events.push(e);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.pid.localeCompare(b.pid) || a.ruleId.localeCompare(b.ruleId));
}

export function activeSnooze(s: AppState, pid: string, ruleId: string): Snooze | undefined {
  return s.snoozes.find((sn) => sn.pid === pid && sn.ruleId === ruleId && sn.untilMs > NOW);
}

export function snoozesFor(s: AppState, pid: string): Snooze[] {
  return s.snoozes.filter((sn) => sn.pid === pid && sn.untilMs > NOW);
}

export interface Status {
  label: string;
  tone: 'safety' | 'protocol' | 'advisory' | 'ok' | 'muted';
}

/** Single headline status for a participant, highest-severity first. */
export function participantStatus(p: Participant, s: AppState): Status {
  const open = openEscalations(s).find((e) => e.pid === p.id);
  if (open) {
    const rule = RULE_BY_ID[open.ruleId];
    if (rule.severity === 'Safety') return { label: 'Safety review open', tone: 'safety' };
    return { label: 'Sensor silent, escalated', tone: 'protocol' };
  }
  if (sensorDay(p.insertedMs, NOW) === 10) return { label: 'Sensor change due today', tone: 'advisory' };
  if (activeSnooze(s, p.id, 'STEP-01')) return { label: 'Step alerts snoozed', tone: 'muted' };
  if (snoozesFor(s, p.id).length > 0) return { label: 'Alerts snoozed', tone: 'muted' };
  return { label: 'On track', tone: 'ok' };
}

export function hoursSinceUpload(p: Participant): number {
  return (NOW - p.lastUploadMs) / 3_600_000;
}

export function countWithStatus(s: AppState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of ROSTER) {
    const st = participantStatus(p, s).label;
    out[st] = (out[st] ?? 0) + 1;
  }
  return out;
}
