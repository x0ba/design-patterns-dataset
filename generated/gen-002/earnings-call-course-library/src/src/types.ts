export type Section = 'ceo' | 'cfo' | 'qa';

export type CallStatus = 'completed' | 'in-progress' | 'not-started';

export interface Speaker {
  id: string;
  name: string;
  title: string;
  org: string;
  kind: 'management' | 'analyst' | 'host' | 'operator';
}

export interface Segment {
  /** Start of the transcript segment, in seconds from the start of the call. */
  t: number;
  speaker: string;
  section: Section;
  question: boolean;
  text: string;
}

export interface CourseNote {
  t: number;
  author: string;
  text: string;
}

export interface Transcript {
  speakers: Record<string, Speaker>;
  segments: Segment[];
  /** Short label for each analyst exchange, keyed by the start time of its opening question. */
  exchangeTopics: Record<number, string>;
  notes: CourseNote[];
  /** Shown under the transcript header when the transcript is not complete. */
  partialNote?: string;
}

export interface CallMeta {
  id: string;
  companyId: string;
  companyName: string;
  ticker: string;
  sector: string;
  quarter: string;
  callDate: string; // YYYY-MM-DD
  durationSec: number;
  hasTranscript: boolean;
}

export interface Clip {
  id: string;
  callId: string;
  companyName: string;
  ticker: string;
  quarter: string;
  callDate: string;
  /** Start of the transcript segment the quote came from. */
  t: number;
  /** Start of the following segment (or end of call). */
  tEnd: number;
  speakerName: string;
  speakerTitle: string;
  quote: string;
  note: string;
  createdAt: string; // ISO local timestamp
}

export interface SavedState {
  version: 1;
  /** Last playback position per call, in seconds. */
  positions: Record<string, number>;
  /** Calls the student has finished listening to. */
  completed: string[];
  clips: Clip[];
  queue: string[];
  rate: number;
}
