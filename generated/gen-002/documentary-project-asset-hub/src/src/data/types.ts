export type Status = 'cleared-all-media' | 'cleared-festival-only' | 'pending' | 'denied';
export type SceneKind = 'archival' | 'interview' | 'verite' | 'montage' | 'title';

export interface Person { name: string; role: string }

export interface Project {
  id: string;
  title: string;
  format: string;
  stage: string;
  accent: string;
  tint: string;
  unit: 'Reel' | 'Episode';
  logline: string;
  director: string;
  commissioner?: string;
  team: Person[];
  updated: string;
}

export interface Reel {
  project: string;
  n: number;
  title: string;
  blurb: string;
  sceneNums: number[];
  durSec: number;
}

export interface Passage { transcriptId: string; inSec: number; outSec: number }
export interface Usage { sceneN: number; srcIn: number; srcOut: number }

export interface Scene {
  project: string;
  n: number;
  reel: number;
  title: string;
  kind: SceneKind;
  synopsis: string;
  durSec: number;
  startSec: number;
  editor: string;
  cutState: string;
  archival: string[];
  passage?: Passage;
  note?: string;
}

export interface Source {
  id: string;
  project: string;
  name: string;
  prefix: string;
  kind: string;
  contact: string;
  email: string;
  terms: string;
  turnaround: string;
}

export interface LogEntry { date: string; who: string; text: string }

export interface Clearance {
  status: Status;
  ref: string;
  rights: string;
  requestedOn?: string;
  requestedBy: string;
  decidedOn?: string;
  fee?: string;
  expectedBy?: string;
  note?: string;
}

export interface ArchivalItem {
  id: string;
  project: string;
  sourceId: string;
  title: string;
  detail: string;
  year: number;
  date: string;
  format: string;
  durSec: number;
  story: string;
  roll: number;
  rollCount: number;
  clearance: Clearance;
  usages: Usage[];
  log: LogEntry[];
  tone: 'bw' | 'color' | 'sepia' | 'video';
}

export interface Clip {
  id: string;
  project: string;
  type: string;
  desc: string;
  durSec: number;
  shot: string;
  camera: string;
  circled: boolean;
  sceneN?: number;
  itemId?: string;
}

export interface Turn { start: number; end: number; who: 'I' | 'S'; text: string }

export interface Transcript {
  id: string;
  project: string;
  name: string;
  role: string;
  recorded: string;
  location: string;
  durSec: number;
  interviewer: string;
  media: string;
  turns: Turn[];
  usedIn: { sceneN: number; inSec: number; outSec: number }[];
  status: 'Reviewed' | 'Transcribed' | 'In transcription';
}
