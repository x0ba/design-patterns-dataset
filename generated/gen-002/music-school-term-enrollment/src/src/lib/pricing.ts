import type { DraftLine, Enrollment, PlanId, Program } from '../types';
import { EARLY_DEADLINE_MS, INSTALLMENT_DATES_MS, DAY_MS, TERM, WEEK_MS } from './time';
import { pctOf } from './money';

/** Winter 2027 school policy. All money in integer cents. */
export const RATES = {
  registrationCents: 2500,
  earlyPct: 5,
  siblingPct: 10,
  freeCancelWindowDays: 7,
  prorateFeeCents: 4000,
  termWeeks: TERM.weeks,
} as const;

export interface PricedLine {
  lineId: string;
  childName: string;
  programId: string;
  listCents: number;
  earlyCents: number;
  siblingCents: number;
  netCents: number;
  siblingApplied: boolean;
  /** Net tuition split across installments for this child. */
  schedule: number[];
}

export interface InstallmentQuote {
  index: number;
  dueMs: number;
  tuitionCents: number;
  registrationCents: number;
  totalCents: number;
}

export interface Quote {
  lines: PricedLine[];
  earlyApplies: boolean;
  tuitionCents: number;
  registrationCents: number;
  totalCents: number;
  installments: InstallmentQuote[];
  chargeTodayCents: number;
}

/**
 * Splits one child's net tuition into `count` installments using cumulative
 * rounding, so the pieces always add back to the exact total.
 */
export function splitSchedule(netCents: number, count: number): number[] {
  const out: number[] = [];
  let prev = 0;
  for (let k = 1; k <= count; k++) {
    const cumulative = Math.round((netCents * k) / count);
    out.push(cumulative - prev);
    prev = cumulative;
  }
  return out;
}

/**
 * Prices a set of lines.
 * - Early-enrollment 5% applies to every line while now <= Nov 16, 11:59 pm.
 * - Sibling 10% applies to the second and later lines in the enrollment.
 *   Both are percentages of list price, so they add together (15% total).
 * - The $25 registration fee is charged once per family, with installment 1
 *   (or with the single payment on a pay-in-full plan).
 */
export function buildQuote(
  lines: DraftLine[],
  programs: Program[],
  nowMs: number,
  plan: PlanId,
): Quote {
  const earlyApplies = nowMs <= EARLY_DEADLINE_MS;
  const count = plan === 'full' ? 1 : 3;
  const dueDates = plan === 'full' ? [INSTALLMENT_DATES_MS[0]] : INSTALLMENT_DATES_MS;

  const priced: PricedLine[] = lines.map((line, i) => {
    const program = programs.find((p) => p.id === line.programId);
    if (!program) throw new Error(`Unknown program ${line.programId}`);
    const listCents = program.listCents;
    const siblingApplied = i >= 1;
    const siblingCents = siblingApplied ? pctOf(listCents, RATES.siblingPct) : 0;
    const earlyCents = earlyApplies ? pctOf(listCents, RATES.earlyPct) : 0;
    const netCents = listCents - siblingCents - earlyCents;
    return {
      lineId: line.id,
      childName: line.childName,
      programId: line.programId,
      listCents,
      earlyCents,
      siblingCents,
      netCents,
      siblingApplied,
      schedule: splitSchedule(netCents, count),
    };
  });

  const hasLines = priced.length > 0;
  const tuitionCents = priced.reduce((sum, l) => sum + l.netCents, 0);
  const registrationCents = hasLines ? RATES.registrationCents : 0;

  const installments: InstallmentQuote[] = dueDates.map((dueMs, k) => {
    const tuition = priced.reduce((sum, l) => sum + l.schedule[k], 0);
    const registration = k === 0 ? registrationCents : 0;
    return {
      index: k + 1,
      dueMs,
      tuitionCents: tuition,
      registrationCents: registration,
      totalCents: tuition + registration,
    };
  });

  return {
    lines: priced,
    earlyApplies,
    tuitionCents,
    registrationCents,
    totalCents: tuitionCents + registrationCents,
    installments,
    chargeTodayCents: installments[0]?.totalCents ?? 0,
  };
}

/** Weeks of the term still ahead at `nowMs`, capped at the full term length. */
export function weeksRemaining(nowMs: number): number {
  if (nowMs <= TERM.startMs) return TERM.weeks;
  const left = Math.ceil((TERM.endMs - nowMs) / WEEK_MS);
  return Math.min(TERM.weeks, Math.max(0, left));
}

export interface WithdrawalQuote {
  rule: 'free-cancel' | 'prorated';
  withinWindow: boolean;
  daysSinceEnrolled: number;
  weeksRemaining: number;
  tuitionCents: number;
  paidCents: number;
  /** Prorated tuition before the fee (prorated rule only). */
  proratedCents: number | null;
  feeCents: number;
  refundCents: number;
  /** Scheduled installment amounts for this child that will be cancelled. */
  cancelledScheduleCents: number;
}

export function withdrawalQuote(enrollment: Enrollment, nowMs: number): WithdrawalQuote {
  const elapsed = nowMs - enrollment.enrolledAt;
  const withinWindow = elapsed <= RATES.freeCancelWindowDays * DAY_MS;
  const paidCents = enrollment.allocations
    .filter((a) => a.status === 'paid')
    .reduce((s, a) => s + a.amountCents, 0);
  const cancelledScheduleCents = enrollment.allocations
    .filter((a) => a.status === 'scheduled')
    .reduce((s, a) => s + a.amountCents, 0);
  const tuitionCents = enrollment.netCents;
  const weeks = weeksRemaining(nowMs);

  if (withinWindow) {
    return {
      rule: 'free-cancel',
      withinWindow,
      daysSinceEnrolled: Math.floor(elapsed / DAY_MS),
      weeksRemaining: weeks,
      tuitionCents,
      paidCents,
      proratedCents: null,
      feeCents: 0,
      refundCents: Math.min(paidCents, tuitionCents),
      cancelledScheduleCents,
    };
  }

  const prorated = Math.floor((tuitionCents * weeks) / RATES.termWeeks);
  const refund = Math.max(0, Math.min(prorated - RATES.prorateFeeCents, paidCents));
  return {
    rule: 'prorated',
    withinWindow,
    daysSinceEnrolled: Math.floor(elapsed / DAY_MS),
    weeksRemaining: weeks,
    tuitionCents,
    paidCents,
    proratedCents: prorated,
    feeCents: RATES.prorateFeeCents,
    refundCents: refund,
    cancelledScheduleCents,
  };
}
