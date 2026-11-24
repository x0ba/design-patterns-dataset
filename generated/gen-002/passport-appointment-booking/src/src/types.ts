import type { ChildId } from './data';

export type ProcChoice = Record<ChildId, 'standard' | 'expedited'>;

export type Reservation =
  | { kind: 'hold'; openingId: string; expiresAt: number }
  | { kind: 'expired'; openingId: string; expiredAt: number }
  | { kind: 'booked'; openingId: string; ref: string; processing: ProcChoice; order: [ChildId, ChildId]; moved?: boolean }
  | { kind: 'cancelled'; openingId: string; ref: string }
  | { kind: 'none'; releasedId?: string };

export type FlowState = { openingId: string; mode: 'book' | 'move' } | null;
