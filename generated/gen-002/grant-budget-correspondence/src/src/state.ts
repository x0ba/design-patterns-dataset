import {
  CHARGE,
  GREG_DRAFT_START,
  PI_DRAFT,
  VENDOR_DRAFT,
  type Message,
  type PersonId,
  type Thread,
  threads as seedThreads,
} from './data';

export type DraftKind = 'greg' | 'pi' | 'vendor' | 'reply';

export interface Draft {
  id: string;
  kind: DraftKind;
  threadId: string | null;
  to: PersonId[];
  subject: string;
  body: string;
  attachments: string[];
  channel: 'email' | 'satellite';
}

export interface Ask {
  sentAt: string;
  followUp: string;
  status: 'sent' | 'received';
}

export interface CostTransfer {
  id: string;
  submittedAt: string;
  reason: string;
}

export interface AppState {
  threads: Thread[];
  drafts: Record<string, Draft>;
  activeThreadId: string;
  composerOpen: boolean;
  activeDraftId: string | null;
  asks: { pi?: Ask; vendor?: Ask };
  costTransfer: CostTransfer | null;
  reimbSubmitted: string | null;
}

export const CHARGE_KINDS: DraftKind[] = ['greg', 'pi', 'vendor'];

export function makeDraft(kind: DraftKind, thread?: Thread): Draft {
  switch (kind) {
    case 'greg':
      return {
        id: 'greg',
        kind,
        threadId: 'greg',
        to: ['greg'],
        subject: 'Re: OCE-2291 — question on October charge PMF-88213',
        body: GREG_DRAFT_START,
        attachments: [],
        channel: 'email',
      };
    case 'pi':
      return {
        id: 'pi',
        kind,
        threadId: 'amaral',
        to: ['amaral'],
        subject: 'Fuel chg PMF-88213 - 2 quick confirms',
        body: PI_DRAFT,
        attachments: [],
        channel: 'satellite',
      };
    case 'vendor':
      return {
        id: 'vendor',
        kind,
        threadId: null,
        to: ['dana'],
        subject: `Itemized invoice request — ${CHARGE.invoice} (Oct 9)`,
        body: VENDOR_DRAFT,
        attachments: ['invoice'],
        channel: 'email',
      };
    case 'reply': {
      const t = thread!;
      const last = t.messages[t.messages.length - 1];
      const other = t.participants.find((p) => p !== 'teodora') ?? last.from;
      return {
        id: `reply-${t.id}`,
        kind,
        threadId: t.id,
        to: [other],
        subject: t.subject.startsWith('Re:') ? t.subject : `Re: ${t.subject}`,
        body: '',
        attachments: [],
        channel: 'email',
      };
    }
  }
}

export const initialState: AppState = {
  threads: seedThreads,
  drafts: { greg: makeDraft('greg') },
  activeThreadId: 'greg',
  composerOpen: false,
  activeDraftId: 'greg',
  asks: {},
  costTransfer: null,
  reimbSubmitted: null,
};

export function lastMessage(t: Thread): Message {
  return t.messages[t.messages.length - 1];
}

export function gregReplied(s: AppState): boolean {
  const t = s.threads.find((x) => x.id === 'greg')!;
  return t.messages.some((m) => m.from === 'teodora' && m.date > '2026-11-13T15:30');
}
