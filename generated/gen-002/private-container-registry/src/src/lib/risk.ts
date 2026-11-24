import type { Tag } from '../data/types';
import { ageMs, relTime } from './time';

const WEEK_MS = 7 * 24 * 3_600_000;

export interface Tier {
  label: 'Prod' | 'Live' | 'Cold';
  /** 1 is the most urgent. */
  level: 1 | 2 | 3;
  reason: string;
}

/**
 * Triage order for advisory rows:
 *   Prod  - labelled prod
 *   Live  - labelled staging, or pulled in the last 7 days
 *   Cold  - no deploy label and no recent pulls
 */
export function tierOf(t: Tag): Tier {
  if (t.env === 'prod') return { label: 'Prod', level: 1, reason: 'Labelled prod' };
  if (t.env === 'staging') return { label: 'Live', level: 2, reason: 'Labelled staging' };
  if (t.lastPulledAt && ageMs(t.lastPulledAt) <= WEEK_MS) {
    return { label: 'Live', level: 2, reason: `Pulled ${relTime(t.lastPulledAt)}, no deploy label` };
  }
  return { label: 'Cold', level: 3, reason: 'No deploy label and no pull in the last 7 days' };
}

/** Last pull as epoch ms. Never-pulled sorts as 0. */
export function pulledMs(t: Tag): number {
  return t.lastPulledAt ? Date.parse(t.lastPulledAt) : 0;
}
