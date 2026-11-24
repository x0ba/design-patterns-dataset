import { DAY, MIN, isQuiet, pt, hhmm } from '../lib/time';
import { mulberry32 } from '../lib/rng';
import { STEP_GOAL } from './roster';
import { stepsBetween } from './series';

export type Severity = 'Safety' | 'Protocol' | 'Advisory' | 'Info';

export type RuleId =
  | 'SAFE-00'
  | 'SAFE-01'
  | 'GAP-02'
  | 'GAP-03'
  | 'GAP-06'
  | 'GAP-12'
  | 'SENS-03'
  | 'SENS-10'
  | 'STEP-01'
  | 'SYNC-01'
  | 'MEAL-02'
  | 'GLU-05';

export interface Rule {
  id: RuleId;
  name: string;
  severity: Severity;
  bypassesQuiet: boolean;
  action: string;
}

export const RULES: Rule[] = [
  { id: 'SAFE-00', name: 'Any glucose reading below 54 mg/dL', severity: 'Safety', bypassesQuiet: true, action: 'Escalate for review' },
  { id: 'SAFE-01', name: 'Glucose below 54 mg/dL sustained 15 min', severity: 'Safety', bypassesQuiet: true, action: 'Safety call script and AE entry' },
  { id: 'GAP-02', name: 'No sensor data for 30 min', severity: 'Info', bypassesQuiet: false, action: 'Show in alert log' },
  { id: 'GAP-03', name: 'Repeated signal loss: three drops of 10+ min within 90 min', severity: 'Protocol', bypassesQuiet: true, action: 'Escalate' },
  { id: 'GAP-06', name: 'No sensor data for 6 h', severity: 'Protocol', bypassesQuiet: true, action: 'Escalate; watch for 12 h' },
  { id: 'GAP-12', name: 'No sensor data for 12 h', severity: 'Protocol', bypassesQuiet: true, action: 'Replacement visit' },
  { id: 'SENS-10', name: 'Sensor day 10', severity: 'Advisory', bypassesQuiet: false, action: 'Scheduled sensor change' },
  { id: 'SENS-03', name: 'Sensor adhesion edge lifted', severity: 'Advisory', bypassesQuiet: false, action: 'Re-tape or replace' },
  { id: 'STEP-01', name: 'Rolling 24 h steps below 8,000; re-notify every 90 min', severity: 'Advisory', bypassesQuiet: false, action: 'Snooze with reason if clinically justified' },
  { id: 'SYNC-01', name: 'Companion app offline 30+ min', severity: 'Advisory', bypassesQuiet: false, action: 'Check phone' },
  { id: 'MEAL-02', name: 'Meal logged without a photo', severity: 'Info', bypassesQuiet: false, action: 'Participant reminder' },
  { id: 'GLU-05', name: 'Post-meal glucose at or above 160 mg/dL', severity: 'Info', bypassesQuiet: false, action: 'None (informational)' },
];

export const RULE_BY_ID: Record<RuleId, Rule> = Object.fromEntries(
  RULES.map((r) => [r.id, r]),
) as Record<RuleId, Rule>;

export type Handling = 'delivered' | 'held' | 'escalated' | 'suppressed';

export interface Closure {
  at: number;
  by: string;
  note: string;
}

export interface AlertEvent {
  id: string;
  ruleId: RuleId;
  pid: string;
  at: number;
  message: string;
  handling: Handling;
  snoozeId?: string;
  closed?: Closure;
}

type Draft = {
  ruleId: RuleId;
  pid: string;
  at: number;
  message?: string;
  handling?: Handling;
  snoozeId?: string;
  closed?: Closure;
};

const fmtInt = (n: number) => n.toLocaleString('en-US');

function stepsMessage(pid: string, at: number): string {
  return `Rolling 24 h steps ${fmtInt(stepsBetween(pid, at - DAY, at))} of ${fmtInt(STEP_GOAL)}`;
}

// Hand-placed events: the overnight story and the context around it.
const HAND: Draft[] = [
  {
    ruleId: 'SAFE-00', pid: 'P-313', at: pt('2026-11-16', '17:04'), handling: 'escalated',
    message: 'Glucose 53 mg/dL, a single reading below 54. Readings either side: 88 (16:59), 66 (17:09).',
    closed: {
      at: pt('2026-11-16', '17:26'),
      by: 'M. Okafor (day coordinator)',
      note: 'Closed as probable artifact. Participant had been lying on the sensor arm. Sensor re-seated at 17:20; 17:14 reading 75 mg/dL. No safety call.',
    },
  },
  { ruleId: 'GAP-02', pid: 'P-317', at: pt('2026-11-16', '20:08'), message: 'No sensor data for 30 min. Last reading 19:35, last upload 19:38.' },
  {
    ruleId: 'GAP-03', pid: 'P-306', at: pt('2026-11-16', '22:41'), handling: 'escalated',
    message: 'Three signal drops of 10+ min within 84 min (21:10, 21:45, 22:20).',
    closed: {
      at: pt('2026-11-16', '23:02'),
      by: 'System auto-close',
      note: 'Signal resumed 22:34 and no further drops for 28 min. No staff action.',
    },
  },
  {
    ruleId: 'GAP-06', pid: 'P-317', at: pt('2026-11-17', '01:38'), handling: 'escalated',
    message: 'No sensor data for 6 h. Last upload 19:38 Mon. Replacement visit required at 12 h (07:38).',
  },
  {
    ruleId: 'SAFE-00', pid: 'P-322', at: pt('2026-11-17', '03:14'), handling: 'escalated',
    message: 'Glucose 52 mg/dL. Readings either side: 71 (03:09), 68 (03:19). Single reading below 54.',
  },
  { ruleId: 'STEP-01', pid: 'P-309', at: pt('2026-11-16', '19:30') },
  { ruleId: 'STEP-01', pid: 'P-309', at: pt('2026-11-16', '21:00') },
  { ruleId: 'STEP-01', pid: 'P-309', at: pt('2026-11-16', '22:30') },
  { ruleId: 'STEP-01', pid: 'P-309', at: pt('2026-11-17', '00:00') },
  { ruleId: 'STEP-01', pid: 'P-309', at: pt('2026-11-17', '01:30') },
  { ruleId: 'STEP-01', pid: 'P-309', at: pt('2026-11-17', '03:00') },
  { ruleId: 'STEP-01', pid: 'P-309', at: pt('2026-11-17', '04:30') },
  { ruleId: 'MEAL-02', pid: 'P-320', at: pt('2026-11-16', '22:20'), message: 'Dinner logged at 21:20 without a photo.' },
  { ruleId: 'SENS-03', pid: 'P-319', at: pt('2026-11-16', '23:12'), message: 'Adhesion edge lifted on sensor check (left upper arm).' },
  { ruleId: 'SYNC-01', pid: 'P-308', at: pt('2026-11-17', '02:44'), message: 'Companion app offline 40 min (02:04 to 02:44).' },
  { ruleId: 'SENS-10', pid: 'P-311', at: pt('2026-11-17', '00:00'), message: 'Sensor day 10: scheduled change due today.' },
  { ruleId: 'SENS-10', pid: 'P-319', at: pt('2026-11-17', '00:00'), message: 'Sensor day 10: scheduled change due today.' },
  { ruleId: 'SENS-03', pid: 'P-314', at: pt('2026-11-16', '14:10'), message: 'Adhesion edge lifted on sensor check (right upper arm). Suppressed by snooze SNZ-0412.', handling: 'suppressed', snoozeId: 'SNZ-0412' },
  { ruleId: 'SENS-03', pid: 'P-314', at: pt('2026-11-16', '18:40'), message: 'Adhesion edge lifted on sensor check (right upper arm). Suppressed by snooze SNZ-0412.', handling: 'suppressed', snoozeId: 'SNZ-0412' },
];

const FILL_PIDS = ['P-305', 'P-307', 'P-310', 'P-312', 'P-315', 'P-316', 'P-318', 'P-321'];
const DAY_RULES: RuleId[] = ['MEAL-02', 'MEAL-02', 'GLU-05', 'GLU-05', 'GAP-02', 'SYNC-01', 'STEP-01', 'STEP-01', 'SENS-03'];
const NIGHT_RULES: RuleId[] = ['GLU-05', 'MEAL-02', 'STEP-01', 'SYNC-01'];
const TOTAL_EVENTS = 63; // events in the 24 h before the snapshot

function fillMessage(rule: RuleId, pid: string, at: number): string | undefined {
  switch (rule) {
    case 'STEP-01':
      return stepsMessage(pid, at);
    case 'MEAL-02':
      return 'Meal logged without a photo.';
    case 'GLU-05':
      return 'Post-meal glucose reached 160 mg/dL or higher.';
    case 'GAP-02':
      return 'No sensor data for 30 min.';
    case 'SYNC-01':
      return 'Companion app offline for 30 min or more.';
    case 'SENS-03':
      return 'Adhesion edge lifted on sensor check.';
    default:
      return undefined;
  }
}

function buildFill(count: number): Draft[] {
  const rand = mulberry32(7117);
  const out: Draft[] = [];
  const overnight = 5;
  for (let k = 0; k < count; k++) {
    const isNight = k < overnight;
    const pool = isNight ? NIGHT_RULES : DAY_RULES;
    const ruleId = pool[Math.floor(rand() * pool.length)];
    const pid = FILL_PIDS[Math.floor(rand() * FILL_PIDS.length)];
    const at = isNight
      ? pt('2026-11-17', '00:05') + Math.floor(rand() * (5 * 60 + 50)) * MIN
      : pt('2026-11-16', '07:00') + Math.floor(rand() * (14 * 60 + 50)) * MIN;
    out.push({ ruleId, pid, at, message: fillMessage(ruleId, pid, at) });
  }
  return out;
}

function build(): AlertEvent[] {
  const drafts: Draft[] = [...HAND, ...buildFill(TOTAL_EVENTS - HAND.length)];
  drafts.sort((a, b) => a.at - b.at || a.pid.localeCompare(b.pid));
  return drafts.map((d, i) => {
    const rule = RULE_BY_ID[d.ruleId];
    const message =
      d.message ??
      (d.ruleId === 'STEP-01' ? stepsMessage(d.pid, d.at) : fillMessage(d.ruleId, d.pid, d.at) ?? rule.name);
    const handling: Handling =
      d.handling ?? (!rule.bypassesQuiet && isQuiet(d.at) ? 'held' : 'delivered');
    return {
      id: `EV-${String(i + 1).padStart(3, '0')}`,
      ruleId: d.ruleId,
      pid: d.pid,
      at: d.at,
      message,
      handling,
      snoozeId: d.snoozeId,
      closed: d.closed,
    };
  });
}

export const EVENTS: AlertEvent[] = build();

export const EVENT_BY_ID: Record<string, AlertEvent> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
);

/** Label used when a time appears next to an event in the alert log. */
export function eventTime(e: AlertEvent): string {
  return hhmm(e.at);
}
