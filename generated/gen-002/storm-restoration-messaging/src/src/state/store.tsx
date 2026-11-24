import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Crew, MedicalCallback, Msg, Notice, Outage, OutageStatus } from '../types';
import {
  DESK_USER,
  STORM_ID,
  initialCrews,
  initialMedical,
  initialMessages,
  initialNotices,
  initialOutages,
} from '../data/mock';
import { h12 } from '../time';

export type Filter = 'all' | 'awaiting' | 'unassigned' | 'working' | 'en-route';

export interface Composer {
  text: string;
  /** Message id this reply answers, or null for a fresh post. */
  replyTo: string | null;
}

export interface AppState {
  outages: Outage[];
  crews: Crew[];
  messages: Msg[];
  /** Awaiting-reply message ids that have been answered or handled. */
  resolved: string[];
  notices: Notice[];
  medical: MedicalCallback[];
  selectedId: string;
  filter: Filter;
  search: string;
  threadAwaitingOnly: boolean;
  composer: Composer;
  /** Counter for generated ids. */
  seq: number;
}

export type Action =
  | { type: 'select'; id: string }
  | { type: 'filter'; filter: Filter }
  | { type: 'search'; value: string }
  | { type: 'threadAwaitingOnly'; value: boolean }
  | { type: 'composer/text'; text: string }
  | { type: 'composer/reply'; msgId: string; text: string }
  | { type: 'composer/cancelReply' }
  | { type: 'post'; outageId: string; text: string; now: number }
  | { type: 'handled'; msgId: string; now: number }
  | { type: 'confirmEtr'; outageId: string; now: number }
  | { type: 'setEtr'; outageId: string; time: string; now: number }
  | { type: 'setStatus'; outageId: string; status: OutageStatus; now: number }
  | { type: 'notifyMemberServices'; outageId: string; now: number }
  | { type: 'ackScript'; outageId: string; now: number }
  | { type: 'editDraft'; id: string; text: string }
  | { type: 'sendNotice'; id: string; now: number }
  | { type: 'pingCrew'; crewId: string; now: number }
  | { type: 'callback'; id: string; status: MedicalCallback['status']; now: number };

function initialState(): AppState {
  return {
    outages: initialOutages,
    crews: initialCrews,
    messages: initialMessages,
    resolved: [],
    notices: initialNotices,
    medical: initialMedical,
    selectedId: 'OUT-1147',
    filter: 'all',
    search: '',
    threadAwaitingOnly: false,
    composer: { text: '', replyTo: null },
    seq: 1000,
  };
}

/** Message to the thread of the given outage, authored by the storm desk. */
function deskMessage(s: AppState, outageId: string, now: number, body: string, replyTo?: string): [AppState, Msg] {
  const id = `d-${s.seq + 1}`;
  const m: Msg = {
    id,
    outageId,
    at: Math.floor(now),
    author: DESK_USER,
    role: 'storm',
    body,
    replyTo,
  };
  return [{ ...s, seq: s.seq + 1 }, m];
}

function systemMessage(s: AppState, outageId: string, now: number, body: string): [AppState, Msg] {
  const id = `s-${s.seq + 1}`;
  const m: Msg = { id, outageId, at: Math.floor(now), author: 'Linecall', role: 'system', body, system: true };
  return [{ ...s, seq: s.seq + 1 }, m];
}

function append(s: AppState, msgs: Msg[]): AppState {
  return { ...s, messages: [...s.messages, ...msgs] };
}

function updateOutage(s: AppState, id: string, patch: (o: Outage) => Outage): AppState {
  return { ...s, outages: s.outages.map((o) => (o.id === id ? patch(o) : o)) };
}

function markResolved(s: AppState, msgId: string): AppState {
  return s.resolved.includes(msgId) ? s : { ...s, resolved: [...s.resolved, msgId] };
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'select': {
      // A pending reply target only makes sense inside its own thread.
      const target = s.composer.replyTo ? s.messages.find((m) => m.id === s.composer.replyTo) : undefined;
      const keepReply = !target || target.outageId === a.id;
      return {
        ...s,
        selectedId: a.id,
        composer: keepReply ? s.composer : { ...s.composer, replyTo: null },
      };
    }

    case 'filter':
      return { ...s, filter: a.filter };

    case 'search':
      return { ...s, search: a.value };

    case 'threadAwaitingOnly':
      return { ...s, threadAwaitingOnly: a.value };

    case 'composer/text':
      return { ...s, composer: { ...s.composer, text: a.text } };

    case 'composer/reply': {
      const target = s.messages.find((m) => m.id === a.msgId);
      if (!target) return s;
      return {
        ...s,
        selectedId: target.outageId,
        composer: { text: a.text, replyTo: a.msgId },
      };
    }

    case 'composer/cancelReply':
      return { ...s, composer: { ...s.composer, replyTo: null } };

    case 'post': {
      const text = a.text.trim();
      if (!text) return s;
      const replyTo = s.composer.replyTo ?? undefined;
      const [s1, m] = deskMessage(s, a.outageId, a.now, text, replyTo);
      let s2 = append(s1, [m]);
      if (replyTo) s2 = markResolved(s2, replyTo);
      return { ...s2, composer: { text: '', replyTo: null } };
    }

    case 'handled': {
      const target = s.messages.find((m) => m.id === a.msgId);
      if (!target) return s;
      const [s1, sysMsg] = systemMessage(s, target.outageId, a.now, `Marked handled by ${DESK_USER} (no reply sent).`);
      const s2 = markResolved(append(s1, [sysMsg]), a.msgId);
      return s2.composer.replyTo === a.msgId ? { ...s2, composer: { text: '', replyTo: null } } : s2;
    }

    case 'confirmEtr': {
      const o = s.outages.find((x) => x.id === a.outageId);
      if (!o || !o.pendingEtr) return s;
      const pending = o.pendingEtr;
      const awaiting = s.messages.find((m) => m.id === pending.msgId)?.awaiting;
      const oldEtr = o.etr;
      let s1 = updateOutage(s, o.id, (x) => ({
        ...x,
        etr: pending.time,
        etrBy: DESK_USER,
        etrAt: Math.floor(a.now),
        pendingEtr: undefined,
        scriptState: pending.time === x.scriptEtr ? 'current' : 'needs-update',
      }));
      const [s2, sysMsg] = systemMessage(
        s1,
        o.id,
        a.now,
        `ETR changed to ${h12(pending.time)} (was ${oldEtr ? h12(oldEtr) : 'none'}) by ${DESK_USER}. Call center script needs an update.`,
      );
      const replyBody = awaiting?.suggestion ?? `Confirmed, ${h12(pending.time)}.`;
      const [s3, reply] = deskMessage(s2, o.id, a.now, replyBody, pending.msgId);
      return markResolved(append(s3, [sysMsg, reply]), pending.msgId);
    }

    case 'setEtr': {
      const o = s.outages.find((x) => x.id === a.outageId);
      if (!o || !/^\d{2}:\d{2}$/.test(a.time)) return s;
      if (o.etr === a.time) return s;
      const s1 = updateOutage(s, o.id, (x) => ({
        ...x,
        etr: a.time,
        etrBy: DESK_USER,
        etrAt: Math.floor(a.now),
        scriptState: a.time === x.scriptEtr ? 'current' : 'needs-update',
      }));
      const [s2, sysMsg] = systemMessage(
        s1,
        o.id,
        a.now,
        `ETR set to ${h12(a.time)} by ${DESK_USER} (was ${o.etr ? h12(o.etr) : 'none'}).`,
      );
      return append(s2, [sysMsg]);
    }

    case 'setStatus': {
      const o = s.outages.find((x) => x.id === a.outageId);
      if (!o || o.status === a.status) return s;
      const s1 = updateOutage(s, o.id, (x) => ({ ...x, status: a.status }));
      const label: Record<OutageStatus, string> = {
        reported: 'Reported',
        assigned: 'Crew assigned',
        'en-route': 'En route',
        working: 'Working',
        restored: 'Restored',
      };
      const [s2, sysMsg] = systemMessage(s1, o.id, a.now, `Status set to ${label[a.status]} by ${DESK_USER}.`);
      return append(s2, [sysMsg]);
    }

    case 'notifyMemberServices': {
      const o = s.outages.find((x) => x.id === a.outageId);
      if (!o || !o.etr) return s;
      const s1 = updateOutage(s, o.id, (x) => ({ ...x, scriptState: 'with-member-services' }));
      const [s2, m] = deskMessage(
        s1,
        o.id,
        a.now,
        `Member services: change the ${o.location} script to ${h12(o.etr)}. Hold the outbound text until the correction is approved, then send it.`,
      );
      return append(s2, [m]);
    }

    case 'ackScript': {
      const o = s.outages.find((x) => x.id === a.outageId);
      if (!o || !o.etr) return s;
      const s1 = updateOutage(s, o.id, (x) => ({ ...x, scriptEtr: x.etr, scriptState: 'current' }));
      const [s2, sysMsg] = systemMessage(
        s1,
        o.id,
        a.now,
        `Call center acknowledged: script now reads ${h12(o.etr)}.`,
      );
      return append(s2, [sysMsg]);
    }

    case 'editDraft':
      return { ...s, notices: s.notices.map((n) => (n.id === a.id ? { ...n, text: a.text } : n)) };

    case 'sendNotice': {
      const n = s.notices.find((x) => x.id === a.id);
      if (!n || n.sentAt !== null) return s;
      const o = s.outages.find((x) => x.id === n.outageId);
      if (n.etr && o && o.etr !== n.etr) return s;
      const sent = s.notices.map((x) => (x.id === a.id ? { ...x, sentAt: Math.floor(a.now), sentBy: DESK_USER } : x));
      let s1: AppState = { ...s, notices: sent };
      if (n.outageId) {
        const [s2, sysMsg] = systemMessage(
          s1,
          n.outageId,
          a.now,
          `Member text sent to ${n.audience.toLocaleString('en-US')} members${n.etr ? ` (restoration ${h12(n.etr)})` : ''} by ${DESK_USER}.`,
        );
        s1 = append(s2, [sysMsg]);
      }
      return s1;
    }

    case 'pingCrew': {
      const c = s.crews.find((x) => x.id === a.crewId);
      if (!c) return s;
      const crews = s.crews.map((x) => (x.id === c.id ? { ...x, pingedAt: Math.floor(a.now) } : x));
      const target = c.outageId ?? STORM_ID;
      const [s2, sysMsg] = systemMessage(
        { ...s, crews },
        target,
        a.now,
        `Ping sent to ${c.name} (${c.foreman}) by ${DESK_USER}. Asking for a check-in now.`,
      );
      return append(s2, [sysMsg]);
    }

    case 'callback': {
      const medical = s.medical.map((x) => (x.id === a.id ? { ...x, status: a.status } : x));
      const item = s.medical.find((x) => x.id === a.id);
      if (!item) return s;
      const label = a.status === 'logged' ? 'called back, ETA given' : a.status === 'due' ? 'callback due' : 'open';
      const [s2, sysMsg] = systemMessage(
        { ...s, medical },
        item.outageId,
        a.now,
        `Medical callback ${item.id}: ${label} (${DESK_USER}).`,
      );
      return append(s2, [sysMsg]);
    }

  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
