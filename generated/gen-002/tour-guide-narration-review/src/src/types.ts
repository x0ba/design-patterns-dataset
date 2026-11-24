export type Speaker = 'Inês' | 'Guest' | 'Guest 2' | 'Margarida' | 'none';

export interface Segment {
  /** start time in seconds */
  t: number;
  speaker: Speaker;
  text: string;
}

export interface Chapter {
  title: string;
  start: number;
  end: number;
  /** planned duration in seconds (tours only) */
  planned?: number;
}

export type BookmarkKind = 'note' | 'cut-start' | 'cut-end';

export interface Bookmark {
  id: string;
  itemId: string;
  t: number;
  note: string;
  kind: BookmarkKind;
  created: string;
}

export interface Item {
  id: string;
  kind: 'tour' | 'lecture';
  title: string;
  subtitle: string;
  /** ISO date recorded (tours) or purchased (lectures) */
  date: string;
  duration: number;
  chapters: Chapter[];
  transcript: Segment[];
  /** planned total, tours only */
  planned?: number;
  /** saved listening position in seconds */
  position: number;
  /** furthest point listened */
  played: number;
  author?: string;
  route?: string;
  guests?: number;
  weather?: string;
  /** short tag shown in lists */
  tag?: string;
}
