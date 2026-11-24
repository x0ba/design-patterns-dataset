import type { CourseNote, Segment, Transcript } from '../types';

/** Index of the segment being played at `pos` (last segment that has started), or -1 before the first. */
export function activeIndexAt(segments: Segment[], pos: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].t <= pos) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export interface SectionBounds {
  ceoStart: number;
  cfoStart: number;
  qaStart: number;
}

export function sectionBounds(transcript: Transcript): SectionBounds {
  const first = (section: Segment['section']) =>
    transcript.segments.find((s) => s.section === section)?.t ?? 0;
  return {
    ceoStart: first('ceo'),
    cfoStart: first('cfo'),
    qaStart: first('qa'),
  };
}

export interface Exchange {
  /** Index into segments of the opening question. */
  index: number;
  t: number;
  end: number;
  speaker: string;
  topic: string;
}

/**
 * One entry per analyst exchange. A follow-up from the same analyst stays in the same exchange,
 * so the list reads as one row per analyst.
 */
export function analystExchanges(transcript: Transcript, duration: number): Exchange[] {
  const out: Exchange[] = [];
  let lastSpeaker: string | null = null;
  transcript.segments.forEach((seg, index) => {
    if (!seg.question) return;
    if (seg.speaker === lastSpeaker) return;
    lastSpeaker = seg.speaker;
    out.push({
      index,
      t: seg.t,
      end: duration,
      speaker: seg.speaker,
      topic: transcript.exchangeTopics[seg.t] ?? 'Analyst question',
    });
  });
  // An exchange runs until the next one begins (or the end of the call).
  out.forEach((ex, i) => {
    ex.end = out[i + 1]?.t ?? duration;
  });
  return out;
}

/** Course notes keyed by the segment they fall inside. */
export function notesBySegment(transcript: Transcript): Map<number, CourseNote[]> {
  const map = new Map<number, CourseNote[]>();
  for (const note of transcript.notes) {
    let idx = -1;
    transcript.segments.forEach((seg, i) => {
      if (seg.t <= note.t) idx = i;
    });
    if (idx < 0) continue;
    map.set(idx, [...(map.get(idx) ?? []), note]);
  }
  return map;
}

/** End time of a segment: the start of the next one, or the end of the call. */
export function segmentEnd(transcript: Transcript, index: number, duration: number): number {
  return transcript.segments[index + 1]?.t ?? duration;
}
