// Core domain types for the Snow Blowers subcategory rules.

export const REGIONS = ['Northeast', 'Midwest', 'Southeast', 'Southwest', 'West'] as const;
export type Region = (typeof REGIONS)[number];

export type Stage = 'single' | 'two' | 'three' | 'electric';

export type SortId = 'best-selling' | 'in-stock-near-you' | 'top-rated' | 'price-asc' | 'price-desc';

export type OosMode = 'notice' | 'end' | 'hide' | 'hide-below';

export interface OosRule {
  mode: OosMode;
  /** Only used by `hide-below`: region availability threshold, in whole percent. */
  threshold: number;
}

/** Dates are ISO calendar dates (YYYY-MM-DD) interpreted in store time. */
export interface BrandBoost {
  id: string;
  brand: string;
  start: string;
  end: string;
}

export type AttributeId =
  | 'clearing-width'
  | 'stage'
  | 'power-source'
  | 'start-type'
  | 'brand'
  | 'price'
  | 'rating'
  | 'drive-type'
  | 'chute-control'
  | 'battery-platform'
  | 'engine-displacement'
  | 'warranty'
  | 'headlights';

export interface RuleSet {
  sort: SortId;
  boosts: BrandBoost[];
  /** Attributes shoppers can narrow by, in the order they appear in the filter panel. */
  attributes: AttributeId[];
  oos: OosRule;
}

export interface ScheduleState {
  /** `now` publishes on confirmation; `later` uses goLive. */
  mode: 'now' | 'later';
  /** Store-local datetime, YYYY-MM-DDTHH:mm (Eastern). */
  goLive: string;
  /** Optional date on which sort and out-of-stock rules revert to live settings. */
  revertOn: string;
}

export interface ScheduledChange {
  goLive: string;
  revertOn: string;
  by: string;
  at: string;
}

export interface DraftState {
  /** Settings currently published to shoppers. */
  live: RuleSet;
  /** Working copy being edited. Equal to `live` when there is nothing to publish. */
  rules: RuleSet;
  schedule: ScheduleState;
  /** null while the change set is an unscheduled draft. Edits are locked while scheduled. */
  scheduled: ScheduledChange | null;
}

export interface Product {
  item: string;
  model: string;
  name: string;
  brand: string;
  stage: Stage;
  clearingWidth: number;
  powerSource: 'Gas' | 'Battery';
  startType: 'Electric start' | 'Recoil start' | 'Push-button start';
  price: number;
  rating: number;
  reviews: number;
  driveType: 'Push' | 'Self-propelled' | 'Track drive';
  chuteControl: 'Manual' | 'Remote' | 'Push-button';
  batteryPlatform: string | null;
  engineDisplacement: number | null;
  warranty: '2 years' | '3 years' | '5 years';
  headlights: boolean;
  unitsSold30d: number;
  inStock: Record<Region, boolean>;
}

export interface HistoryEntry {
  id: string;
  date: string;
  editor: string;
  area: 'Default sort' | 'Brand boost' | 'Shopper filters' | 'Out-of-stock' | 'Setup';
  summary: string;
}
