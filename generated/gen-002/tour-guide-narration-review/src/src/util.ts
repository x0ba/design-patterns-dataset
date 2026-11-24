import type { Bookmark, Chapter, Item, Segment } from './types';

export function fmt(sec: number, forceHours = false): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0 || forceHours) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** Fmt for an item: tours always h:mm:ss so columns line up. */
export function fmtFor(item: Item, sec: number): string {
  return fmt(sec, item.duration >= 3600);
}

/** "+19:45" style signed delta */
export function fmtDelta(sec: number): string {
  const sign = sec > 0 ? '+' : sec < 0 ? '−' : '±';
  return sign + fmt(Math.abs(sec));
}

/** "2h 22m" style */
export function fmtLong(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

export function chapterIndexAt(chapters: Chapter[], t: number): number {
  for (let i = chapters.length - 1; i >= 0; i--) if (t >= chapters[i].start) return i;
  return 0;
}

export function segmentIndexAt(segments: Segment[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].t <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso: string, withDay = false): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const base = `${d} ${MONTHS[m - 1]} ${y}`;
  return withDay ? `${DAYS[date.getUTCDay()]} ${base}` : base;
}

/** Today in the app's world. */
export const TODAY = '2026-11-16';

export function relDate(iso: string): string {
  const a = Date.parse(iso.slice(0, 10));
  const b = Date.parse(TODAY);
  const days = Math.round((b - a) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

export interface CutRange {
  start: number;
  end: number;
  startId: string;
  endId: string;
}

/** Pair each cut-start with the next cut-end after it. */
export function cutRanges(bookmarks: Bookmark[]): { ranges: CutRange[]; openStart: Bookmark | null; orphanEnds: Bookmark[] } {
  const sorted = bookmarks.filter((b) => b.kind !== 'note').sort((a, b) => a.t - b.t);
  const ranges: CutRange[] = [];
  const orphanEnds: Bookmark[] = [];
  let open: Bookmark | null = null;
  for (const b of sorted) {
    if (b.kind === 'cut-start') {
      if (!open) open = b;
      else open = b; // a later start replaces an unclosed one
    } else if (b.kind === 'cut-end') {
      if (open) {
        ranges.push({ start: open.t, end: b.t, startId: open.id, endId: b.id });
        open = null;
      } else orphanEnds.push(b);
    }
  }
  return { ranges, openStart: open, orphanEnds };
}

export function totalCut(ranges: CutRange[]): number {
  return ranges.reduce((a, r) => a + (r.end - r.start), 0);
}

/** Deterministic pseudo-random */
export function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export interface WaveBin {
  t: number;
  amp: number;
  speaker: Segment['speaker'];
}

/** Synthesize a plausible amplitude envelope for a time range from the transcript. */
export function waveform(segments: Segment[], from: number, to: number, bins: number): WaveBin[] {
  const out: WaveBin[] = [];
  const step = (to - from) / bins;
  for (let i = 0; i < bins; i++) {
    const t = from + i * step;
    const seg = segments[segmentIndexAt(segments, t)];
    const speaker = seg?.speaker ?? 'none';
    const r1 = rand(Math.floor(t * 3.1) + 1);
    const r2 = rand(Math.floor(t / 4) + 7);
    let amp: number;
    if (speaker === 'none') amp = 0.08 + r1 * 0.14;
    else if (speaker === 'Inês' || speaker === 'Margarida') amp = 0.35 + r1 * 0.45 + r2 * 0.18;
    else amp = 0.22 + r1 * 0.35;
    // brief pauses between sentences
    if (rand(Math.floor(t * 1.3) + 3) > 0.93) amp *= 0.35;
    out.push({ t, amp: Math.min(1, amp), speaker });
  }
  return out;
}
