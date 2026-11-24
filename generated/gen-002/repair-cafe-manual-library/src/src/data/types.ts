export type DocType = 'service' | 'user' | 'wiring' | 'parts' | 'note';
export type Scan = 'good' | 'faded' | 'partial';
export type Outcome = 'fixed' | 'partly' | 'not';

export interface ContentsEntry {
  title: string;
  page: number;
  endPage?: number;
  key?: boolean; // highlighted as a quick jump
}

export interface Doc {
  id: string;
  type: DocType;
  title: string;
  brand: string;
  family?: string;
  models: string[];
  category: string;
  product: string;
  yearFrom: number;
  yearTo: number;
  language: string;
  scan: Scan;
  pages: number;
  contributor: string;
  added: string; // ISO date
  note?: string; // short description from the contributor
  contents?: ContentsEntry[];
  missingPages?: number[];
}

export interface RepairLog {
  id: string;
  date: string; // ISO
  item: string;
  brand: string;
  family?: string;
  model?: string;
  product: string;
  category: string;
  fault: string;
  outcome: Outcome;
  fixer: string;
  notes: string;
  minutes: number;
  parts?: string;
}

export const TYPE_LABEL: Record<DocType, string> = {
  service: 'Service manual',
  user: 'User manual',
  wiring: 'Wiring diagram',
  parts: 'Parts list',
  note: 'Repair note',
};

export const TYPE_ORDER: DocType[] = ['service', 'wiring', 'parts', 'user', 'note'];

export const SCAN_LABEL: Record<Scan, string> = {
  good: 'Good scan',
  faded: 'Faded',
  partial: 'Pages missing',
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  fixed: 'Fixed',
  partly: 'Partly fixed',
  not: 'Not fixed',
};
