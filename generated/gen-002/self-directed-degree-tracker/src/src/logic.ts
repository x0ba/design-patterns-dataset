import { Course, ProblemSet, RULES } from './data';

export const totalHours = (c: Course) =>
  c.baseHours.reading + c.baseHours.sets + c.baseHours.lectures + c.baseHours.exams +
  c.extraHours.reduce((s, h) => s + h.hours, 0);

export const hoursByActivity = (c: Course) => {
  const r = { Reading: c.baseHours.reading, 'Problem sets': c.baseHours.sets, Lectures: c.baseHours.lectures, Exams: c.baseHours.exams, Review: 0 };
  for (const h of c.extraHours) r[h.activity] += h.hours;
  return r;
};

export const expectedHours = (c: Course) => [c.credits * RULES.hoursPerCreditMin, c.credits * RULES.hoursPerCreditMax] as const;

export const setKey = (p: ProblemSet) => `${p.chapter}|${p.sections}|${p.attempted}|${p.correct}|${p.date}`;

/** Pairs of problem sets that look like the same work entered twice. */
export function duplicateGroups(c: Course): ProblemSet[][] {
  const map = new Map<string, ProblemSet[]>();
  for (const p of c.problemSets) {
    const k = setKey(p);
    map.set(k, [...(map.get(k) ?? []), p]);
  }
  return [...map.values()].filter((g) => g.length > 1 && !g.every((p) => p.keptIntentionally));
}

export const isDuplicate = (c: Course, id: string) => duplicateGroups(c).some((g) => g.some((p) => p.id === id));

export const examPasses = (c: Course) => c.exams.length > 0 && c.exams.every((e) => e.score >= RULES.examMin);

export const isDone = (s: Course['status']) => s === 'complete' || s === 'complete-gaps';

export type CheckState = 'pass' | 'fail' | 'warn' | 'block';
export interface Check {
  id: 'exams' | 'prereq' | 'dupes' | 'hours' | 'coverage';
  state: CheckState;
  title: string;
  detail: string;
  gapLabel?: string; // how it's recorded if accepted as a gap
}

export function runChecks(c: Course, all: Record<string, Course>): Check[] {
  const checks: Check[] = [];

  // 1. Exam rule
  const low = c.exams.filter((e) => e.score < RULES.examMin);
  if (c.exams.length === 0) {
    checks.push({ id: 'exams', state: 'block', title: 'No timed exam logged', detail: `Your rule needs at least one timed exam at ${RULES.examMin}% or higher.` });
  } else if (low.length) {
    checks.push({ id: 'exams', state: 'block', title: `Exam below ${RULES.examMin}%`, detail: low.map((e) => `${e.title}: ${e.score}%`).join(', ') + ` — your rule requires ${RULES.examMin}% on every exam.` });
  } else {
    checks.push({ id: 'exams', state: 'pass', title: `Exams meet your ${RULES.examMin}% rule`, detail: c.exams.map((e) => `${e.title} ${e.score}%`).join(' · ') });
  }

  // 2. Prerequisites
  for (const pid of c.prereqs) {
    const p = all[pid];
    if (!p) continue;
    if (!isDone(p.status)) {
      checks.push({ id: 'prereq', state: 'warn', title: `Prerequisite ${p.code} not complete`, detail: `${p.code} ${p.title} is ${p.status.replace('-', ' ')}.`, gapLabel: `Prerequisite ${p.code} not complete` });
    } else if (p.exams.length === 0) {
      checks.push({ id: 'prereq', state: 'fail', title: `Prerequisite ${p.code} has no exam`, detail: `${p.code} ${p.title} has lectures and ${p.problemSets.length} problem sets, but no timed exam on record.`, gapLabel: `Prerequisite ${p.code} ${p.title} has no exam on record` });
    } else if (!examPasses(p)) {
      const worst = Math.min(...p.exams.map((e) => e.score));
      checks.push({ id: 'prereq', state: 'fail', title: `Prerequisite ${p.code} exam below ${RULES.examMin}%`, detail: `${p.code} ${p.title}: lowest exam ${worst}%. It doesn’t meet your rule.`, gapLabel: `Prerequisite ${p.code} exam ${worst}% (below ${RULES.examMin}%)` });
    } else {
      checks.push({ id: 'prereq', state: 'pass', title: `Prerequisite ${p.code} satisfied`, detail: `${p.title} · exam ${p.exams.map((e) => e.score + '%').join(', ')}` });
    }
  }

  // 3. Duplicates
  const dupes = duplicateGroups(c);
  if (dupes.length) {
    const g = dupes[0];
    checks.push({ id: 'dupes', state: 'block', title: `Ch. ${g[0].chapter} problem set entered ${g.length === 2 ? 'twice' : g.length + ' times'}`, detail: `Same sections, same score (${g[0].correct}/${g[0].attempted}), logged ${g.map((p) => p.loggedAt.split(', ')[1]).join(' and ')} on ${g[0].loggedAt.split(', ')[0]}. Fix before recording — it inflates your totals.` });
  } else {
    checks.push({ id: 'dupes', state: 'pass', title: 'No duplicate problem sets', detail: `${c.problemSets.length} sets, ${c.problemSets.reduce((s, p) => s + p.attempted, 0)} problems` });
  }

  // 4. Hours
  const h = totalHours(c);
  const [lo, hi] = expectedHours(c);
  if (h < lo) {
    checks.push({ id: 'hours', state: 'warn', title: `Hours below range for ${c.credits} credits`, detail: `${fmtH(h)} logged; expected ${lo}–${hi} h (${RULES.hoursPerCreditMin}–${RULES.hoursPerCreditMax} per credit). Short by ${fmtH(lo - h)}.`, gapLabel: `Hours ${fmtH(h)} vs. ${lo}–${hi} expected` });
  } else {
    checks.push({ id: 'hours', state: 'pass', title: 'Hours within expected range', detail: `${fmtH(h)} logged; expected ${lo}–${hi} h.` });
  }

  // 5. Coverage
  if (c.catalogTopics.length) {
    const done = new Set(c.chapters.filter((ch) => ch.done).map((ch) => ch.n));
    const missing = c.catalogTopics.filter((t) => !t.chapters.some((n) => done.has(n)));
    if (missing.length) {
      checks.push({ id: 'coverage', state: 'warn', title: `${missing.length} catalog topic${missing.length > 1 ? 's' : ''} not covered`, detail: missing.map((m) => m.topic).join('; '), gapLabel: `Catalog topics not covered: ${missing.map((m) => m.topic).join('; ')}` });
    } else {
      const skipped = c.chapters.filter((ch) => !ch.done);
      checks.push({ id: 'coverage', state: 'pass', title: `All ${c.catalogTopics.length} catalog topics covered`, detail: skipped.length ? `Skipped Ch. ${skipped.map((s) => s.n).join(', ')} (${skipped.map((s) => s.title).join(', ')}) — not in the catalog description.` : 'Every chapter covered.' });
    }
  }

  const order = { block: 0, fail: 1, warn: 2, pass: 3 };
  return checks.sort((a, b) => order[a.state] - order[b.state]);
}

export const fmtH = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso: string, withYear = true) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? ', ' + y : ''}`;
}
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
