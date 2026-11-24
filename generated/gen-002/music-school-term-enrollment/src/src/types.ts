export type PlanId = 'inst3' | 'full';
export type ViewId = 'dashboard' | 'enroll' | 'families' | 'schedule' | 'transactions';

export interface Program {
  id: string;
  instrument: string;
  teacher: string;
  format: 'private' | 'group';
  /** Shown to staff, e.g. "30-min private" or "Group · max 6". */
  formatLabel: string;
  listCents: number;
  /** Seats per time slot (1 for private lessons). */
  seats: number;
}

export interface Slot {
  id: string;
  programId: string;
  /** e.g. "Tue 4:15 PM" */
  label: string;
  /** Seats taken by enrollments that are not itemised in this demo. */
  baseBooked: number;
}

export interface Family {
  id: string;
  name: string;
  parents: string;
  phone: string;
  email: string;
  cardBrand: string;
  cardLast4: string;
  cardExp: string;
  pastTerms: string[];
}

export interface Allocation {
  /** 1-based installment number. */
  installment: number;
  amountCents: number;
  status: 'paid' | 'scheduled' | 'void';
}

export interface Enrollment {
  id: string;
  familyId: string;
  childName: string;
  age: number;
  programId: string;
  slotId: string;
  listCents: number;
  earlyCents: number;
  siblingCents: number;
  netCents: number;
  /** Per-family registration fee, recorded on the first enrollment of a checkout. */
  registrationCents: number;
  enrolledAt: number;
  status: 'active' | 'withdrawn';
  allocations: Allocation[];
  withdrawnAt?: number;
  refundCents?: number;
  withdrawReason?: string;
  withdrawRule?: 'free-cancel' | 'prorated';
}

export interface Txn {
  id: string;
  at: number;
  familyName: string;
  kind: 'payment' | 'refund';
  type: 'enrollment' | 'withdrawal';
  description: string;
  method: string;
  amountCents: number;
}

export interface DraftLine {
  id: string;
  childName: string;
  age: number;
  programId: string;
  slotId: string;
}

export interface Draft {
  familyId: string | null;
  lines: DraftLine[];
  plan: PlanId;
}

export interface Receipt {
  number: string;
  familyId: string;
  familyName: string;
  chargedCents: number;
  cardLabel: string;
  planLabel: string;
  studentNames: string[];
  nextDueMs: number | null;
  nextDueCents: number | null;
}

export interface AppState {
  families: Family[];
  programs: Program[];
  slots: Slot[];
  enrollments: Enrollment[];
  txns: Txn[];
  draft: Draft;
  view: ViewId;
  selectedFamilyId: string | null;
  receipt: Receipt | null;
  seq: number;
}
