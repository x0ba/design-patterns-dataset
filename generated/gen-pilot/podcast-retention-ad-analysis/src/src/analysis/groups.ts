import type { Episode } from '../data/generate';
import { PLATFORMS, SHOW_BY_ID, type Platform, type ShowDef } from '../data/shows';
import type { Derived, Filters } from './model';
import { LENGTH_SEGMENTS } from './model';
import { estimateChange, meanCliff, medianMidroll, splitByDate, unitsByShow, type ChangeEstimate, type Unit } from './stats';

export interface ShowRow {
  show: ShowDef;
  narrative: boolean;
  pre: Episode[];
  post: Episode[];
  est: ChangeEstimate | null;
  /** Gap from the median narrative show, in standard errors (narrative only). */
  z: number | null;
  outlier: boolean;
  cliffPre: number | null;
  cliffPost: number | null;
  midPre: number | null;
  midPost: number | null;
}

/** One row per show in the selection, with its change estimate and outlier check. */
export function showRows(d: Derived, f: Filters): ShowRow[] {
  const rows: ShowRow[] = [];
  const ctrlUnits = unitsByShow(d.control, f.split);
  for (const id of f.showIds) {
    const show = SHOW_BY_ID[id];
    if (!show) continue;
    const eps = d.base.filter((e) => e.showId === id);
    const { pre, post } = splitByDate(eps, f.split);
    const narrative = show.format === 'Narrative';
    const unit: Unit = { key: id, pre, post };
    const est = estimateChange([unit], narrative ? ctrlUnits : null, 600, 11 + rows.length);
    rows.push({
      show,
      narrative,
      pre,
      post,
      est,
      z: null,
      outlier: false,
      cliffPre: meanCliff(pre),
      cliffPost: meanCliff(post),
      midPre: medianMidroll(pre),
      midPost: medianMidroll(post),
    });
  }
  // Outlier: a narrative show whose adjusted drop is at least 3 pts below the median narrative show
  // and at least 2 standard errors below it. Only drops are flagged, since drops are the concern here.
  const narr = rows.filter((r) => r.narrative && r.est);
  if (narr.length >= 3) {
    const ests = narr.map((r) => (r.est as ChangeEstimate).est).sort((a, b) => a - b);
    const mid = Math.floor(ests.length / 2);
    const median = ests.length % 2 ? ests[mid] : (ests[mid - 1] + ests[mid]) / 2;
    for (const r of narr) {
      const e = r.est as ChangeEstimate;
      const gap = e.est - median;
      r.z = e.se > 0 ? gap / e.se : null;
      r.outlier = gap <= -0.03 && r.z !== null && r.z <= -2;
    }
  }
  return rows;
}

export type Dim = 'length' | 'platform' | 'breaks' | 'downloads';

export const DIM_LABEL: Record<Dim, string> = {
  length: 'Episode length',
  platform: 'Majority platform',
  breaks: 'Ad breaks per episode',
  downloads: 'Downloads per episode',
};

export function segmentsFor(dim: Dim): { key: string; label: string; test: (e: Episode) => boolean }[] {
  if (dim === 'length') return LENGTH_SEGMENTS;
  if (dim === 'platform') {
    return PLATFORMS.map((p: Platform) => ({ key: p, label: p, test: (e: Episode) => e.majorityPlatform === p }));
  }
  if (dim === 'breaks') {
    return [1, 2, 3, 4].map((n) => ({ key: `b${n}`, label: `${n} break${n === 1 ? '' : 's'}`, test: (e: Episode) => e.adBreaks === n }));
  }
  return [
    { key: 'd1', label: 'Under 10k', test: (e: Episode) => e.downloads < 10000 },
    { key: 'd2', label: '10k–50k', test: (e: Episode) => e.downloads >= 10000 && e.downloads < 50000 },
    { key: 'd3', label: '50k–150k', test: (e: Episode) => e.downloads >= 50000 && e.downloads < 150000 },
    { key: 'd4', label: 'Over 150k', test: (e: Episode) => e.downloads >= 150000 },
  ];
}

export interface SegmentRow {
  key: string;
  label: string;
  est: ChangeEstimate | null;
  nTreat: number;
  nCtrl: number;
}

/**
 * Within each segment: the narrative change minus the non-narrative change in the same segment.
 * This keeps segment comparisons on the same footing as the headline estimate.
 */
export function segmentRows(d: Derived, f: Filters, dim: Dim): SegmentRow[] {
  return segmentsFor(dim).map((seg) => {
    const treatEps = d.treat.filter(seg.test);
    const ctrlEps = d.control.filter(seg.test);
    const t = splitByDate(treatEps, f.split);
    const est = d.hasTreat
      ? estimateChange(unitsByShow(treatEps, f.split), unitsByShow(ctrlEps, f.split), 500, 31)
      : estimateChange(unitsByShow(d.selected.filter(seg.test), f.split), null, 500, 31);
    return { key: seg.key, label: seg.label, est, nTreat: t.pre.length + t.post.length, nCtrl: ctrlEps.length };
  });
}
