export type Confidence = 'high' | 'medium' | 'low';
export type Method = 'direct' | 'permit' | 'neighbor' | 'none';
/** Inventory category for one side of a service line. */
export type Cls = 'LEAD' | 'GRR' | 'NON_LEAD' | 'UNKNOWN';

export interface Source {
  kind: 'tap_card' | 'permit' | 'field_verification' | 'neighbor_record';
  /** Record identifier as it appears in the city's records, e.g. "Tap card #N-4417". */
  ref: string;
  /** Year, or YYYY-MM-DD for field verifications. */
  date: string;
  /** Transcribed or summarized record text. */
  text: string;
  /** Permits only: whether the permit text names the material at all. */
  statesMaterial?: boolean;
  /** True when the record documents a lead connection upstream of galvanized iron. */
  documentsLeadLink?: boolean;
}

export interface SideProposal {
  material: string;
  cls: Cls;
  method: Method;
  sources: Source[];
  reasoning: string;
}

export interface FieldVerification {
  material: string;
  cls: Cls;
  text: string;
  ref: string;
  date: string;
  crew: string;
}

export interface LineRecord {
  id: string;
  seq: number;
  block: string;
  street: string;
  address: string;
  parcelId: string;
  builtYear: number;
  installYear: number | null;
  installBasis: string | null;
  status: 'proposed' | 'queued';
  /** Confidence applies to the utility-side classification. */
  confidence?: Confidence;
  utility?: SideProposal;
  customer?: SideProposal;
  /** A 2024 field verification on this same line, if one exists. */
  fv2024?: FieldVerification;
}

export type DecisionStatus = 'accepted' | 'overridden' | 'field_dig' | 'held';

export interface SideOverride {
  cls: Cls;
  material: string;
}

export interface Decision {
  status: DecisionStatus;
  utility?: SideOverride;
  customer?: SideOverride;
  note?: string;
  by: string;
  at: string;
}

export interface BatchMeta {
  batchId: string;
  zone: string;
  utility: string;
  purpose: string;
  dueDate: string;
  asOf: string;
  builtRange: [number, number];
  totalLines: number;
  runLabel: string;
  lastRunAt: string;
  citywideSyncedAt: string;
}

export interface BatchFile {
  meta: BatchMeta;
  lines: LineRecord[];
  seedDecisions: Record<string, Decision>;
}
