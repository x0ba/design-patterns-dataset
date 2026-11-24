// Domain types for the Linecall Storm Room.

/** Who is speaking in a thread. `storm` is the storm desk (Renee's position). */
export type Role = 'crew' | 'mutual' | 'dispatch' | 'callcenter' | 'ops' | 'storm' | 'system';

export type OutageStatus = 'reported' | 'assigned' | 'en-route' | 'working' | 'restored';

export type Cause = 'Tree on line' | 'Ice-loaded conductor' | 'Broken pole' | 'Unknown';

/** Call center script state for an outage. */
export type ScriptState = 'current' | 'needs-update' | 'with-member-services';

export interface PendingEtr {
  /** Crew-proposed restoration time, 'HH:MM' (24h). */
  time: string;
  by: string;
  at: number;
  msgId: string;
}

export interface Outage {
  id: string;
  feeder: string;
  substation: string;
  location: string;
  members: number;
  cause: Cause;
  status: OutageStatus;
  /** Crew ids working or assigned to this outage (ids from `crews`). */
  crewIds: string[];
  /** Restoration estimate currently published to the room, 'HH:MM' (24h), or null. */
  etr: string | null;
  etrBy: string | null;
  etrAt: number | null;
  /** Estimate the call center script is reading right now. */
  scriptEtr: string | null;
  scriptState: ScriptState;
  /** Medical-priority callbacks are open on this outage. */
  medical: boolean;
  pendingEtr?: PendingEtr;
}

export interface Crew {
  id: string;
  name: string;
  org: 'Cedar Bend' | 'Prairie Line Electric';
  foreman: string;
  truck: string;
  /** Outage the crew is on, or null when unassigned. */
  outageId: string | null;
  activity: 'Working' | 'On scene' | 'En route' | 'Staged';
  /** Storm-clock minutes of last radio/phone check-in. */
  checkIn: number;
  pingedAt?: number;
}

export interface Awaiting {
  owner: string;
  ownerRole: Role;
  kind: 'estimate' | 'question' | 'request' | 'handoff' | 'medical';
  /** Pre-written reply the storm desk can send with one click. */
  suggestion?: string;
  /** Crew-proposed time this message asks the desk to confirm (estimate kind). */
  etr?: string;
}

export interface Msg {
  id: string;
  /** Outage id, or 'STORM' for storm-wide and staging traffic. */
  outageId: string;
  /** Storm-clock minutes. */
  at: number;
  author: string;
  role: Role;
  /** Crew/unit name shown after the author when it differs from the author. */
  unit?: string;
  body: string;
  awaiting?: Awaiting;
  /** Set on a reply: id of the message it answers. */
  replyTo?: string;
  /** Set on an event recorded by the app (ETR change, ping, status change). */
  system?: boolean;
}

export interface Notice {
  id: string;
  outageId: string | null;
  audience: number;
  text: string;
  /** ETR written into the notice text, 'HH:MM', or null for general notices. */
  etr: string | null;
  /** Null while the notice is still a draft. */
  sentAt: number | null;
  sentBy: string;
  /** Who wrote the draft, shown while sentAt is null. */
  draftedBy?: string;
  label: string;
}

export interface MedicalCallback {
  id: string;
  account: string;
  address: string;
  outageId: string;
  need: string;
  requestedAt: number;
  status: 'open' | 'due' | 'logged';
  owner: string;
  note?: string;
}
