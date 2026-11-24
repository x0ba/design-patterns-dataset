import { addDays, daysBetween, editionExists, fDay, iso, nextBookableEdition, type Edition } from './dates';
import type { AlertConfig, Insertion, Meeting, Notice, PaperMessage, StaffId, Status } from './types';

export const STATUS_LABEL: Record<Status, string> = {
  missed: 'Missed',
  at_risk: 'At risk',
  unconfirmed: 'Unconfirmed',
  awaiting_affidavit: 'Awaiting affidavit',
  on_track: 'On track',
};

export const STATUS_LONG: Record<Status, string> = {
  missed: 'Missed — reschedule required',
  at_risk: 'At risk',
  unconfirmed: 'Scheduled, no confirmation',
  awaiting_affidavit: 'Run, awaiting affidavit',
  on_track: 'On track',
};

export const STATUS_ORDER: Status[] = ['missed', 'at_risk', 'unconfirmed', 'awaiting_affidavit', 'on_track'];

export interface Derived {
  status: Status;
  meeting: Meeting;
  lastLegal: string;
  published: Insertion[];
  pending: Insertion[]; // valid, not yet run
  slack: number | null;
  finalRun?: string;
  affidavitAge?: number;
  complete: boolean;
  problemIndex: number; // insertion that needs action, -1 if none
  headline: string;
  nextEdition: Edition;
}

export function isValidPending(ins: Insertion, lastLegal: string) {
  return (ins.state === 'confirmed' || ins.state === 'unconfirmed') && ins.date <= lastLegal && editionExists(ins.date);
}

export function derive(n: Notice, meetings: Meeting[], now: Date, slackDays: number): Derived {
  const meeting = meetings.find((m) => m.id === n.meetingId)!;
  const lastLegal = addDays(meeting.date, -n.statutoryDays);
  const today = iso(now);
  const published = n.insertions.filter((i) => i.state === 'published');
  const pending = n.insertions.filter((i) => isValidPending(i, lastLegal));
  const nextEdition = nextBookableEdition(now);
  const base = { meeting, lastLegal, published, pending, nextEdition };

  if (published.length >= n.requiredRuns) {
    const finalRun = published.map((p) => p.date).sort().at(-1)!;
    const complete = n.affidavit === 'received';
    return {
      ...base,
      status: complete ? 'on_track' : 'awaiting_affidavit',
      slack: null,
      finalRun,
      affidavitAge: daysBetween(finalRun, today),
      complete,
      problemIndex: -1,
      headline: complete
        ? `Ran ${fDay(finalRun)} · affidavit on file`
        : `Ran ${fDay(finalRun)} · affidavit outstanding ${daysBetween(finalRun, today)} days`,
    };
  }

  const problemIndex = n.insertions.findIndex(
    (i) => i.state === 'edition_cancelled' || i.state === 'not_published' || (i.state !== 'published' && !isValidPending(i, lastLegal)),
  );

  if (published.length + pending.length < n.requiredRuns) {
    const canStillRun = nextEdition.date <= lastLegal;
    const bad = problemIndex >= 0 ? n.insertions[problemIndex] : undefined;
    let headline: string;
    if (!canStillRun) {
      headline = bad
        ? `Didn’t run ${fDay(bad.date)} — ${n.statutoryDays}-day rule can’t be met for ${fDay(meeting.date)}`
        : `No edition left before ${fDay(lastLegal)}`;
    } else if (bad?.state === 'edition_cancelled') {
      headline = `Booked into cancelled ${fDay(bad.date)} edition — must run by ${fDay(lastLegal)}`;
    } else {
      headline = `No valid run booked — must run by ${fDay(lastLegal)}`;
    }
    return {
      ...base,
      status: canStillRun ? 'at_risk' : 'missed',
      slack: canStillRun ? daysBetween(nextEdition.date, lastLegal) : daysBetween(nextEdition.date, lastLegal),
      complete: false,
      problemIndex,
      headline,
    };
  }

  const latest = pending.map((p) => p.date).sort().at(-1)!;
  const slack = daysBetween(latest, lastLegal);
  const unconf = pending.filter((p) => p.state === 'unconfirmed');
  const tight = unconf.find((p) => daysBetween(p.date, lastLegal) <= slackDays);
  if (tight) {
    const idx = n.insertions.indexOf(tight);
    const k = n.requiredRuns === 2 ? `Insertion ${idx + 1} of 2` : 'Insertion';
    return {
      ...base,
      status: 'at_risk',
      slack,
      complete: false,
      problemIndex: idx,
      headline:
        tight.date === lastLegal
          ? `${k} unconfirmed for ${fDay(tight.date)} — the last legal day`
          : `${k} unconfirmed for ${fDay(tight.date)}, ${daysBetween(tight.date, lastLegal)} day before deadline`,
    };
  }
  if (unconf.length) {
    return {
      ...base,
      status: 'unconfirmed',
      slack,
      complete: false,
      problemIndex: n.insertions.indexOf(unconf[0]),
      headline: n.pendingReason ?? `Booked ${fDay(unconf[0].date)} — awaiting paper confirmation`,
    };
  }
  return {
    ...base,
    status: 'on_track',
    slack,
    complete: false,
    problemIndex: -1,
    headline:
      published.length > 0
        ? `${published.length} of ${n.requiredRuns} ran · next ${fDay(pending[0].date)} confirmed`
        : `Confirmed for ${pending.map((p) => fDay(p.date)).join(' & ')}`,
  };
}

/** Sort key: worst first, then by urgency within group. */
export function urgencyKey(dv: Derived): [number, number] {
  const g = STATUS_ORDER.indexOf(dv.status);
  if (dv.status === 'awaiting_affidavit') return [g, -(dv.affidavitAge ?? 0)];
  if (dv.status === 'on_track') return [g + (dv.complete ? 1 : 0), daysBetween('2025-01-01', dv.meeting.date)];
  return [g, daysBetween('2025-01-01', dv.lastLegal)];
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export const SIGNAL_LABEL = {
  policy: 'Paper changed deadlines, print days or holiday schedule',
  not_run: 'An insertion was held, dropped, or its edition cancelled',
  past_deadline: 'Paper moved an insertion past the last legal run date',
  pending_near_deadline: 'A booking is still unconfirmed within the slack threshold',
  proof_pending: 'A proof is waiting on city approval',
} as const;

export function isRepeat(m: PaperMessage) {
  return m.subject.startsWith('Reminder:');
}

export function isThreat(m: PaperMessage, cfg: AlertConfig) {
  return !!m.signal && cfg.signals[m.signal] && !isRepeat(m);
}

/** Does this message generate an alert (to anyone) under cfg? */
export function alerts(m: PaperMessage, cfg: AlertConfig) {
  if (cfg.mode === 'all') return true;
  return isThreat(m, cfg);
}

export function recipients(m: PaperMessage, cfg: AlertConfig, notices: Notice[]): StaffId[] {
  if (!alerts(m, cfg)) return [];
  const all: StaffId[] = ['gloria', 'raj', 'lena', 'tim'];
  if (!m.noticeId) return all; // account-wide / policy messages go to everyone
  const n = notices.find((x) => x.id === m.noticeId);
  const out = new Set<StaffId>();
  if (n) {
    for (const s of all) if (cfg.routing[s].types.includes(n.type)) out.add(s);
  }
  if (cfg.copyGloria) out.add('gloria');
  return [...out];
}

export function alertCounts(msgs: PaperMessage[], cfg: AlertConfig, notices: Notice[]) {
  const per: Record<StaffId, number> = { gloria: 0, raj: 0, lena: 0, tim: 0 };
  let total = 0;
  for (const m of msgs) {
    const r = recipients(m, cfg, notices);
    if (r.length) total++;
    for (const s of r) per[s]++;
  }
  const digests = cfg.mode === 'threats_digest' ? 1 : 0;
  return { total, per, digests };
}
