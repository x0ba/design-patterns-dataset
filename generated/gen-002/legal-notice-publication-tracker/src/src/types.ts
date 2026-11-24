export type NoticeType =
  | 'public_hearing'
  | 'ordinance_summary'
  | 'bid_solicitation'
  | 'budget_hearing'
  | 'election_notice';

export type StaffId = 'gloria' | 'raj' | 'lena' | 'tim';

export type InsertionState =
  | 'confirmed' // paper confirmed the booking
  | 'unconfirmed' // booked, paper has not confirmed placement
  | 'published' // paper confirms it ran
  | 'not_published' // held / dropped
  | 'edition_cancelled'; // booked into an edition that won't print

export interface Insertion {
  date: string;
  state: InsertionState;
  note?: string;
}

export type AffidavitState = 'not_due' | 'awaiting' | 'received';

export interface Activity {
  at: string; // ISO datetime
  who: StaffId | 'system';
  text: string;
}

export interface Meeting {
  id: string;
  body: string;
  short: string;
  date: string;
  time: string;
  place: string;
  kind: 'meeting' | 'bid_opening' | 'election';
  rescheduledFrom?: string;
}

export interface Notice {
  id: string;
  adNo: string;
  type: NoticeType;
  title: string;
  summary: string;
  meetingId: string;
  statutoryDays: 10 | 15 | 30;
  requiredRuns: 1 | 2;
  submitted: string; // ISO datetime
  insertions: Insertion[];
  tearSheet: boolean;
  affidavit: AffidavitState;
  affidavitReceived?: string;
  affidavitRequested?: string;
  cost: number;
  owner: StaffId;
  pendingReason?: string;
  activity: Activity[];
}

export type Signal = 'policy' | 'not_run' | 'past_deadline' | 'pending_near_deadline' | 'proof_pending';

export interface PaperMessage {
  id: string;
  at: string; // ISO datetime
  category: string;
  subject: string;
  body: string;
  noticeId?: string;
  signal?: Signal;
  /** Proofrun's annotation: why this matters (or doesn't) for a hearing date. */
  analysis?: string;
}

export type Status = 'missed' | 'at_risk' | 'unconfirmed' | 'awaiting_affidavit' | 'on_track';

export type AlertMode = 'all' | 'threats' | 'threats_digest';

export interface AlertConfig {
  mode: AlertMode;
  signals: Record<Signal, boolean>;
  slackDays: number; // unconfirmed with slack <= this is "at risk"
  copyGloria: boolean;
  routing: Record<StaffId, { types: NoticeType[]; channel: 'email' | 'email_sms' }>;
}
