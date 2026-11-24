// Selectors over the store. Pure functions only.

import type { Crew, Msg, Outage } from './types';
import type { AppState } from './state/store';

/** A crew with no check-in for this many minutes is treated as silent. */
export const SILENT_MINUTES = 45;

export function isSilent(c: Crew, now: number): boolean {
  return now - c.checkIn >= SILENT_MINUTES;
}

export function activeOutages(s: AppState): Outage[] {
  return s.outages.filter((o) => o.status !== 'restored');
}

/** Messages still waiting on a reply, oldest first. */
export function awaitingMessages(s: AppState): Msg[] {
  return s.messages
    .filter((m) => m.awaiting && !s.resolved.includes(m.id))
    .sort((a, b) => a.at - b.at);
}

export function awaitingCountFor(s: AppState, outageId: string): number {
  return awaitingMessages(s).filter((m) => m.outageId === outageId).length;
}

/** An outage needs the desk when a reply is owed or a crew estimate is unconfirmed. */
export function needsDesk(s: AppState, o: Outage): boolean {
  return Boolean(o.pendingEtr) || awaitingCountFor(s, o.id) > 0;
}

export function crewForOutage(s: AppState, outageId: string): Crew[] {
  return s.crews.filter((c) => c.outageId === outageId);
}

export function messagesFor(s: AppState, outageId: string): Msg[] {
  return s.messages
    .filter((m) => m.outageId === outageId)
    .sort((a, b) => a.at - b.at);
}

export function repliesTo(s: AppState, msgId: string): Msg[] {
  return s.messages.filter((m) => m.replyTo === msgId);
}

export function draftNotice(s: AppState) {
  return s.notices.find((n) => n.sentAt === null) ?? null;
}
