export type Category =
  | 'Ceramics'
  | 'Jewelry'
  | 'Food'
  | 'Textiles'
  | "Kids' activities"
  | 'Candles'
  | 'Woodwork';

export const CATEGORIES: Category[] = [
  'Ceramics',
  'Jewelry',
  'Food',
  'Textiles',
  "Kids' activities",
  'Candles',
  'Woodwork',
];

/** Requested booth size. '3x3' and '3x2' are gym booths; 'hall' is a 2 m hallway spot. */
export type BoothSize = '3x3' | '3x2' | 'hall';

export interface Vendor {
  id: string;
  boothNo: string;
  name: string;
  category: Category;
  size: BoothSize;
  power: boolean;
  tables: number;
  notes: string;
  /** Vendor ids this booth must stay at least KEEP_AWAY_M from. */
  keepAway: string[];
  /** Set for vendors accepted after the last layout was saved. */
  lateNote?: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Placement extends Rect {
  /** Outlet id ('O1'..'O6') for power booths, otherwise null. */
  outlet: string | null;
}

export type Placements = Record<string, Placement>;

export interface Draft {
  id: string;
  name: string;
  savedAt: string;
  placements: Placements;
}

export interface Outlet {
  id: string;
  n: number;
  x: number;
  y: number;
  wall: 'N' | 'S' | 'E' | 'W';
  circuit: string;
}

export interface ExitDef {
  id: 'N' | 'W' | 'S' | 'E';
  label: string;
  door: Rect;
  /** Area that must stay free of booths. */
  clear: Rect;
}

export interface FixedItem {
  id: string;
  label: string;
  rect: Rect;
}

export type IssueLevel = 'error' | 'caution' | 'todo';

export interface Issue {
  key: string;
  level: IssueLevel;
  vendorIds: string[];
  text: string;
}
