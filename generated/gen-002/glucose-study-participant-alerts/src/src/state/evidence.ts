import { MIN, NOW, SAMPLE } from '../lib/time';
import {
  gapRuns,
  longestRunBelow,
  meals as mealsOf,
  minGlucose,
  nightsOf,
  stepsBetween,
  valueAt,
  glucoseSamples,
  type Meal,
  type Night,
} from '../data/series';
import { participant } from '../data/roster';

export interface Around {
  t: number;
  v: number | null;
}

export interface NightLow {
  night: Night;
  min: number;
}

export interface LowEvidence {
  at: number;
  low: number;
  around: Around[]; // five readings either side
  runBelow54: number; // consecutive readings below 54
  dropIn5: number | null;
  riseIn5: number | null;
  backAbove70At: number | null;
  priorNights: NightLow[];
  priorMin: number | null;
  priorMedian: number | null;
  lastMeal: Meal | undefined;
  lastMealGapMin: number | null;
  night: Night;
  stepsInSleep: number;
  missingReadings: number; // readings missing from insertion to now, in the last 6 h
}

export function lowEvidence(pid: string, at: number, low: number): LowEvidence {
  const p = participant(pid);
  const around: Around[] = [];
  for (let k = -5; k <= 5; k++) {
    const t = at + k * SAMPLE;
    around.push({ t, v: valueAt(pid, t) });
  }
  const before = valueAt(pid, at - SAMPLE);
  const after = valueAt(pid, at + SAMPLE);
  const nights = nightsOf(pid);
  const night =
    nights.find((n) => at >= n.start && at < n.end) ?? nights[nights.length - 1];

  // Nights before the event night, counted from sensor insertion.
  const priorNights: NightLow[] = [];
  for (const n of nights) {
    if (n.end > night.start || n.start < p.insertedMs) continue;
    const m = minGlucose(pid, n.start, n.end);
    if (m) priorNights.push({ night: n, min: m.v });
  }
  const mins = priorNights.map((n) => n.min).sort((a, b) => a - b);
  const median = mins.length ? mins[Math.floor(mins.length / 2)] : null;
  const priorMin = mins.length ? mins[0] : null;

  const meals = mealsOf(pid).filter((m) => m.at <= at);
  const lastMeal = meals[meals.length - 1];

  // First reading back at or above 70 after the low.
  const after70 = glucoseSamples(pid, at + SAMPLE, at + 2 * 60 * MIN).find((s) => s.v >= 70);

  const missing = gapRuns(pid, 1, Math.max(p.insertedMs, NOW - 6 * 60 * MIN), NOW).reduce(
    (sum, [a, b]) => sum + Math.round((b - a) / SAMPLE),
    0,
  );

  return {
    at,
    low,
    around,
    runBelow54: longestRunBelow(pid, 54, at - 2 * 60 * MIN, NOW),
    dropIn5: before !== null ? before - low : null,
    riseIn5: after !== null ? after - low : null,
    backAbove70At: after70 ? after70.t : null,
    priorNights,
    priorMin,
    priorMedian: median,
    lastMeal,
    lastMealGapMin: lastMeal ? Math.round((at - lastMeal.at) / MIN) : null,
    night,
    stepsInSleep: stepsBetween(pid, night.start, Math.min(night.end, NOW)),
    missingReadings: missing,
  };
}

/** Readings for the short trace around an event, for display. */
export function traceAround(pid: string, at: number): { t: number; v: number }[] {
  return glucoseSamples(pid, at - 5 * SAMPLE, at + 6 * SAMPLE);
}
