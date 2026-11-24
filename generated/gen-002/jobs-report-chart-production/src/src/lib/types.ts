// Domain types for Releasewell. Timestamps are epoch milliseconds so the whole
// app state can be serialized to localStorage and restored without loss.

export type Role = 'lead' | 'analyst' | 'editor' | 'disclosure';

export interface Person {
  id: string;
  name: string;
  initials: string;
  role: Role;
  title: string;
}

export type Status = 'drafting' | 'in review' | 'disclosure hold' | 'approved' | 'final';

export type Source = 'CES' | 'LAUS' | 'QCEW';

export interface LinePoint {
  label: string;
  value: number | null;
  /** true when the point is a revised September value */
  revised?: boolean;
}

export interface TilePoint {
  label: string;
  value: number | null;
}

export type ChartSpec =
  | { kind: 'column'; unit: 'jobs' | 'percent' | 'rate'; points: LinePoint[] }
  | { kind: 'line'; unit: 'jobs' | 'percent' | 'rate'; points: LinePoint[] }
  | { kind: 'hbar'; unit: 'jobs' | 'percent' | 'rate' | 'dollars'; rows: TilePoint[] }
  | { kind: 'tiles'; unit: 'rate' | 'points'; cells: TilePoint[]; diverging: boolean }
  | { kind: 'table'; columns: string[]; rows: { label: string; cells: (string | null)[] }[] };

export interface HistoryEntry {
  at: number;
  by: string; // person id, or 'system'
  summary: string;
  version?: number;
  details?: string[];
}

export interface ActiveEditor {
  personId: string;
  since: number;
  activity: string;
}

export interface Hold {
  by: string;
  at: number;
  reason: string;
  prevStatus: Status;
}

export interface Chart {
  id: string; // e.g. OCT-01
  headline: string;
  subtitle: string;
  note: string;
  caption: string;
  source: Source;
  geography: 'Statewide' | 'Metro (7)' | 'County (64)';
  geographyDetail: string;
  ownerId: string;
  status: Status;
  version: number;
  lastEditorId: string;
  lastEditAt: number;
  approvedAt: number | null;
  approvedBy: string | null;
  finalAt: number | null;
  hold: Hold | null;
  /** approved charts that use September data, which was revised after approval */
  needsRecheck: boolean;
  chart: ChartSpec;
  history: HistoryEntry[];
  active: ActiveEditor[];
}

export interface Reply {
  id: string;
  authorId: string;
  at: number;
  text: string;
}

export interface Comment {
  id: string;
  chartId: string;
  authorId: string;
  at: number;
  text: string;
  to: string[];
  replies: Reply[];
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: number | null;
}

export type FeedKind = 'data' | 'edit' | 'status' | 'hold' | 'comment' | 'system';

export interface FeedEvent {
  id: string;
  at: number;
  actorId: string;
  chartId: string | null;
  kind: FeedKind;
  text: string;
}

export interface Filters {
  query: string;
  status: Status | 'all';
  ownerId: string | 'all';
  geography: Chart['geography'] | 'all';
  source: Source | 'all';
}

export type DetailTab = 'comments' | 'history';

export interface AppState {
  charts: Chart[];
  comments: Comment[];
  feed: FeedEvent[];
  lastSeenAt: number;
  selectedId: string;
  filters: Filters;
  tab: DetailTab;
  feedShowAll: boolean;
  handedOffAt: number | null;
  seq: number;
}
