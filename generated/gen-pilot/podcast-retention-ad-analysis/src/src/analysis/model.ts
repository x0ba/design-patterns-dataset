import type { Episode } from '../data/generate';
import { MOVE_ISO } from '../data/generate';
import { SHOWS, SHOW_BY_ID, type Format, type Platform } from '../data/shows';
import { splitByDate } from './stats';

export type FormatFilter = 'All' | Format;
export type LengthBand = 'all' | 'short' | 'medium' | 'long';
export type PlatformFilter = 'All' | Platform;

export interface Filters {
  format: FormatFilter;
  showIds: string[];
  length: LengthBand;
  platform: PlatformFilter;
  excludeFlagged: boolean;
  split: string;
  /** Last date included (inclusive). Episodes after it are left out. */
  end: string;
}

export const DATA_LAST_DAY = '2026-11-13';
export const DATA_FIRST_DAY = '2025-01-01';

export const NARRATIVE_IDS = SHOWS.filter((s) => s.format === 'Narrative').map((s) => s.id);

export const DEFAULT_FILTERS: Filters = {
  format: 'Narrative',
  showIds: NARRATIVE_IDS,
  length: 'all',
  platform: 'All',
  excludeFlagged: true,
  split: MOVE_ISO,
  end: DATA_LAST_DAY,
};

export const LENGTH_LABEL: Record<LengthBand, string> = {
  all: 'All lengths',
  short: 'Under 45 min',
  medium: '45–60 min',
  long: 'Over 60 min',
};

export function lengthBandOf(min: number): Exclude<LengthBand, 'all'> {
  if (min < 45) return 'short';
  if (min <= 60) return 'medium';
  return 'long';
}

export const LENGTH_SEGMENTS: { key: string; label: string; test: (e: Episode) => boolean }[] = [
  { key: 'short', label: 'Under 45 min', test: (e) => e.lengthMin < 45 },
  { key: 'medium', label: '45–60 min', test: (e) => e.lengthMin >= 45 && e.lengthMin <= 60 },
  { key: 'long', label: 'Over 60 min', test: (e) => e.lengthMin > 60 },
];

export function isNarrative(showId: string): boolean {
  return SHOW_BY_ID[showId]?.format === 'Narrative';
}

/** Filters that apply to every group: length, majority platform, and production-note exclusion. */
export function passesBase(e: Episode, f: Filters): boolean {
  if (e.date > f.end) return false;
  if (f.excludeFlagged && e.note !== null) return false;
  if (f.length !== 'all' && lengthBandOf(e.lengthMin) !== f.length) return false;
  if (f.platform !== 'All' && e.majorityPlatform !== f.platform) return false;
  return true;
}

export interface Derived {
  /** Every show, after length/platform/flag filters. */
  base: Episode[];
  /** Episodes from the shows chosen in the sidebar. */
  selected: Episode[];
  /** Narrative episodes from the chosen shows: the group whose ad slot moved. */
  treat: Episode[];
  /** Non-narrative episodes: no ad change, used as the comparison group. */
  control: Episode[];
  /** Whether the selection includes narrative shows (so an adjusted comparison is possible). */
  hasTreat: boolean;
}

export function derive(all: Episode[], f: Filters): Derived {
  const ids = new Set(f.showIds);
  const base = all.filter((e) => passesBase(e, f));
  const selected = base.filter((e) => ids.has(e.showId));
  const treat = selected.filter((e) => isNarrative(e.showId));
  const control = base.filter((e) => !isNarrative(e.showId));
  return { base, selected, treat, control, hasTreat: treat.length > 0 };
}

export function flaggedCount(all: Episode[], split: string, end: string, showIds?: string[]) {
  const ids = showIds ? new Set(showIds) : null;
  const flagged = all.filter((e) => e.note !== null && e.date <= end && (!ids || ids.has(e.showId)));
  const { pre, post } = splitByDate(flagged, split);
  return { total: flagged.length, pre: pre.length, post: post.length, list: flagged };
}

/** Narrative shows that appear in the selection, by format filter. */
export function showsForFormat(format: FormatFilter) {
  return SHOWS.filter((s) => format === 'All' || s.format === format);
}

