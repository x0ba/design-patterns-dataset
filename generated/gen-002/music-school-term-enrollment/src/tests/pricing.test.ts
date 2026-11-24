import { describe, expect, it } from 'vitest';
import { buildQuote, splitSchedule, withdrawalQuote, weeksRemaining } from '../src/lib/pricing';
import { PROGRAMS } from '../src/data/seed';
import { EARLY_DEADLINE_MS, INSTALLMENT_DATES_MS, TERM } from '../src/lib/time';
import type { DraftLine, Enrollment } from '../src/types';

const NOW = new Date(2026, 10, 16, 14, 38).getTime();

const PEREIRA: DraftLine[] = [
  { id: 'l1', childName: 'Sofia Pereira', age: 9, programId: 'pno-30', slotId: 'pno30-wed-1530' },
  { id: 'l2', childName: 'Mateo Pereira', age: 12, programId: 'vln-45', slotId: 'vln45-tue-1615' },
  { id: 'l3', childName: 'Lucas Pereira', age: 7, programId: 'gtr-grp', slotId: 'gtr-sat-1000' },
];

describe('Pereira enrollment pricing (Nov 16, before 11:59 pm)', () => {
  const q = buildQuote(PEREIRA, PROGRAMS, NOW, 'inst3');

  it('applies early rate to everyone and sibling rate to second and later children', () => {
    expect(q.earlyApplies).toBe(true);
    const [sofia, mateo, lucas] = q.lines;
    // Sofia: first child, early 5% only.
    expect([sofia!.listCents, sofia!.earlyCents, sofia!.siblingCents, sofia!.netCents]).toEqual([34000, 1700, 0, 32300]);
    // Mateo: second child, early 5% + sibling 10%.
    expect([mateo!.listCents, mateo!.earlyCents, mateo!.siblingCents, mateo!.netCents]).toEqual([48000, 2400, 4800, 40800]);
    // Lucas: third child, early 5% + sibling 10%.
    expect([lucas!.listCents, lucas!.earlyCents, lucas!.siblingCents, lucas!.netCents]).toEqual([21000, 1050, 2100, 17850]);
  });

  it('totals tuition and the $25 family registration fee', () => {
    expect(q.tuitionCents).toBe(90950);
    expect(q.registrationCents).toBe(2500);
    expect(q.totalCents).toBe(93450);
  });

  it('splits into three installments that add back exactly, with registration on installment 1', () => {
    const [i1, i2, i3] = q.installments;
    expect(i1!.totalCents).toBe(32817); // $328.17 charged today
    expect(i2!.totalCents).toBe(30316); // $303.16 on Dec 15
    expect(i3!.totalCents).toBe(30317); // $303.17 on Jan 15
    expect(i1!.totalCents + i2!.totalCents + i3!.totalCents).toBe(q.totalCents);
    expect(i1!.dueMs).toBe(INSTALLMENT_DATES_MS[0]);
    expect(q.chargeTodayCents).toBe(32817);
  });

  it('keeps each child share exact in every installment (Lucas is $59.50 each time)', () => {
    expect(q.lines[2]!.schedule).toEqual([5950, 5950, 5950]);
    expect(q.lines[1]!.schedule).toEqual([13600, 13600, 13600]);
    expect(q.lines[0]!.schedule.reduce((a, b) => a + b, 0)).toBe(32300);
  });

  it('pay-in-full charges the whole total once', () => {
    const full = buildQuote(PEREIRA, PROGRAMS, NOW, 'full');
    expect(full.installments).toHaveLength(1);
    expect(full.chargeTodayCents).toBe(93450);
  });
});

describe('early rate and splits', () => {
  it('drops the early rate after the deadline', () => {
    const late = buildQuote(PEREIRA, PROGRAMS, EARLY_DEADLINE_MS + 60_000, 'inst3');
    expect(late.earlyApplies).toBe(false);
    expect(late.lines.every((l) => l.earlyCents === 0)).toBe(true);
    expect(late.lines[0]!.netCents).toBe(34000);
  });

  it('splitSchedule always sums to the input', () => {
    for (const n of [32300, 40800, 17850, 1, 999999]) {
      expect(splitSchedule(n, 3).reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe('withdrawal policy', () => {
  const lucas: Enrollment = {
    id: 'e1',
    familyId: 'fam-pereira',
    childName: 'Lucas Pereira',
    age: 7,
    programId: 'gtr-grp',
    slotId: 'gtr-sat-1000',
    listCents: 21000,
    earlyCents: 1050,
    siblingCents: 2100,
    netCents: 17850,
    registrationCents: 0,
    enrolledAt: NOW,
    status: 'active',
    allocations: [
      { installment: 1, amountCents: 5950, status: 'paid' },
      { installment: 2, amountCents: 5950, status: 'scheduled' },
      { installment: 3, amountCents: 5950, status: 'scheduled' },
    ],
  };

  it('within 7 days: full refund of what was paid, nothing else', () => {
    const w = withdrawalQuote(lucas, NOW + 10 * 60 * 1000);
    expect(w.rule).toBe('free-cancel');
    expect(w.refundCents).toBe(5950); // $59.50
    expect(w.cancelledScheduleCents).toBe(11900); // Dec and Jan shares removed
  });

  it('after 7 days: weeks remaining / 10 x tuition, less $40', () => {
    const day10 = NOW + 10 * 24 * 60 * 60 * 1000;
    const w = withdrawalQuote(lucas, day10);
    expect(w.rule).toBe('prorated');
    expect(weeksRemaining(NOW)).toBe(10);
    expect(w.proratedCents).toBe(17850);
    expect(w.refundCents).toBe(Math.min(5950, 17850 - 4000));
  });

  it('pre-term prorated refund on a full-paid $340 class is $300', () => {
    const piano: Enrollment = {
      ...lucas,
      programId: 'pno-30',
      netCents: 34000,
      allocations: [{ installment: 1, amountCents: 34000, status: 'paid' }],
      enrolledAt: NOW - 20 * 24 * 60 * 60 * 1000,
    };
    expect(withdrawalQuote(piano, NOW).refundCents).toBe(30000);
  });

  it('weeks remaining count down from the term start', () => {
    expect(weeksRemaining(TERM.startMs - 1000)).toBe(10);
    expect(weeksRemaining(TERM.endMs + 1000)).toBe(0);
  });
});
