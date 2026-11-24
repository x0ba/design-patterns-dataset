import React, { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import {
  BASE_NOW, ME, Issue, Message, SavedReply, Thread,
  issues as seedIssues, savedReplies as seedReplies, threads as seedThreads, volunteers,
} from './data';

// ─── clock: the app runs as if it were Mon Nov 16, 2026, 9:38 pm ───
const T0 = Date.now();
export const now = () => new Date(BASE_NOW.getTime() + (Date.now() - T0));

export type View = 'inbox' | 'schedule' | 'volunteers' | 'replies';
export type Filter = 'all' | 'needs' | 'unread';
export type CoverStatus = 'asked' | 'yes' | 'if-needed' | 'no';

export interface State {
  view: View;
  threads: Thread[];
  activeThreadId: string;
  issues: Issue[];
  replies: SavedReply[];
  filter: Filter;
  issueFilter: string | null;
  search: string;
  cover: { asked: Record<string, { at: string; status: CoverStatus }>; assigned?: string };
  scheduleOverrides: Record<string, string>;
  stationLog: { at: string; text: string }[];
  toast: { id: number; text: string } | null;
  focusComposer: number;
  marker: { threadId: string; at: string } | null;
}

type Action =
  | { type: 'view'; view: View }
  | { type: 'open'; threadId: string }
  | { type: 'send'; threadId: string; body: string }
  | { type: 'receive'; threadId: string; message: Message }
  | { type: 'draft'; threadId: string; draft: string }
  | { type: 'prefill'; threadId: string; draft: string }
  | { type: 'toggleDone'; threadId: string }
  | { type: 'check'; issueId: string; itemId: string; done?: boolean }
  | { type: 'resolveIssue'; issueId: string; resolved: boolean }
  | { type: 'filter'; filter: Filter }
  | { type: 'issueFilter'; issueId: string | null }
  | { type: 'search'; search: string }
  | { type: 'coverAsked'; volId: string }
  | { type: 'coverReply'; volId: string; status: CoverStatus }
  | { type: 'assignCover'; volId: string | null }
  | { type: 'replyUpsert'; reply: SavedReply }
  | { type: 'replyDelete'; id: string }
  | { type: 'replyUsed'; id: string }
  | { type: 'startDm'; volId: string }
  | { type: 'log'; text: string }
  | { type: 'toast'; text: string | null };

let msgSeq = 1000;
export const newId = (p = 'm') => `${p}${++msgSeq}`;

export function dmFor(threads: Thread[], volId: string) {
  return threads.find((t) => t.kind === 'dm' && t.members.includes(volId) && t.members.length === 2);
}

function autoCheck(issues: Issue[], threadId: string): Issue[] {
  return issues.map((iss) => ({
    ...iss,
    checklist: iss.checklist.map((c) => (c.autoOnReply && c.threadId === threadId ? { ...c, done: true } : c)),
  }));
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'view':
      return { ...s, view: a.view };
    case 'open': {
      const prev = s.threads.find((t) => t.id === a.threadId);
      return {
        ...s,
        view: 'inbox',
        activeThreadId: a.threadId,
        marker:
          s.activeThreadId === a.threadId && s.marker?.threadId === a.threadId
            ? s.marker
            : prev ? { threadId: a.threadId, at: prev.lastReadAt } : null,
        threads: s.threads.map((t) => (t.id === a.threadId ? { ...t, lastReadAt: now().toISOString() } : t)),
      };
    }
    case 'send': {
      const at = now().toISOString();
      const msg: Message = { id: newId(), from: ME, at, body: a.body };
      const threads = s.threads.map((t) =>
        t.id === a.threadId ? { ...t, messages: [...t.messages, msg], lastReadAt: at, draft: '' } : t,
      );
      // bump to top: keep order by activity (list sorts anyway)
      return { ...s, threads, issues: autoCheck(s.issues, a.threadId) };
    }
    case 'receive': {
      const threads = s.threads.map((t) =>
        t.id === a.threadId
          ? {
              ...t,
              done: false,
              messages: [...t.messages, a.message],
              lastReadAt: s.view === 'inbox' && s.activeThreadId === t.id ? a.message.at : t.lastReadAt,
            }
          : t,
      );
      return { ...s, threads };
    }
    case 'draft':
      return { ...s, threads: s.threads.map((t) => (t.id === a.threadId ? { ...t, draft: a.draft } : t)) };
    case 'prefill':
      return {
        ...s,
        view: 'inbox',
        activeThreadId: a.threadId,
        focusComposer: s.focusComposer + 1,
        threads: s.threads.map((t) =>
          t.id === a.threadId ? { ...t, draft: a.draft, lastReadAt: now().toISOString() } : t,
        ),
      };
    case 'toggleDone':
      return { ...s, threads: s.threads.map((t) => (t.id === a.threadId ? { ...t, done: !t.done } : t)) };
    case 'check':
      return {
        ...s,
        issues: s.issues.map((iss) =>
          iss.id !== a.issueId
            ? iss
            : {
                ...iss,
                checklist: iss.checklist.map((c) =>
                  c.id === a.itemId ? { ...c, done: a.done ?? !c.done } : c,
                ),
              },
        ),
      };
    case 'resolveIssue':
      return {
        ...s,
        issueFilter: a.resolved && s.issueFilter === a.issueId ? null : s.issueFilter,
        issues: s.issues.map((i) => (i.id === a.issueId ? { ...i, resolved: a.resolved } : i)),
      };
    case 'filter':
      return { ...s, filter: a.filter, issueFilter: null, view: 'inbox' };
    case 'issueFilter':
      return { ...s, issueFilter: a.issueId, view: 'inbox' };
    case 'search':
      return { ...s, search: a.search };
    case 'coverAsked':
      return {
        ...s,
        cover: { ...s.cover, asked: { ...s.cover.asked, [a.volId]: { at: now().toISOString(), status: 'asked' } } },
        threads: s.threads.map((t) =>
          t.kind === 'dm' && t.members.includes(a.volId) && !t.issueId ? { ...t, issueId: 'cover-farm' } : t,
        ),
      };
    case 'coverReply':
      return {
        ...s,
        cover: {
          ...s.cover,
          asked: { ...s.cover.asked, [a.volId]: { ...s.cover.asked[a.volId], status: a.status } },
        },
      };
    case 'assignCover': {
      const overrides = { ...s.scheduleOverrides };
      if (a.volId) overrides.farm = a.volId;
      else delete overrides.farm;
      const issues = s.issues.map((iss) =>
        iss.id === 'cover-farm'
          ? { ...iss, checklist: iss.checklist.map((c) => (c.id === 'f2' ? { ...c, done: !!a.volId } : c)) }
          : iss,
      );
      return { ...s, cover: { ...s.cover, assigned: a.volId ?? undefined }, scheduleOverrides: overrides, issues };
    }
    case 'replyUpsert': {
      const exists = s.replies.some((r) => r.id === a.reply.id);
      return {
        ...s,
        replies: exists ? s.replies.map((r) => (r.id === a.reply.id ? a.reply : r)) : [...s.replies, a.reply],
      };
    }
    case 'replyDelete':
      return { ...s, replies: s.replies.filter((r) => r.id !== a.id) };
    case 'replyUsed':
      return { ...s, replies: s.replies.map((r) => (r.id === a.id ? { ...r, uses: r.uses + 1 } : r)) };
    case 'startDm': {
      const existing = dmFor(s.threads, a.volId);
      if (existing) return reducer(s, { type: 'open', threadId: existing.id });
      const th: Thread = {
        id: `th-${a.volId}`,
        kind: 'dm',
        members: [ME, a.volId],
        messages: [],
        lastReadAt: now().toISOString(),
        draft: '',
      };
      return { ...s, view: 'inbox', threads: [...s.threads, th], activeThreadId: th.id, focusComposer: s.focusComposer + 1 };
    }
    case 'log':
      return { ...s, stationLog: [...s.stationLog, { at: now().toISOString(), text: a.text }] };
    case 'toast':
      return { ...s, toast: a.text ? { id: Date.now(), text: a.text } : null };
  }
}

const initial: State = {
  view: 'inbox',
  threads: seedThreads,
  activeThreadId: 'th-lourdes',
  issues: seedIssues,
  replies: seedReplies,
  filter: 'all',
  issueFilter: null,
  search: '',
  cover: { asked: {} },
  scheduleOverrides: {},
  stationLog: [],
  toast: null,
  focusComposer: 0,
  marker: null,
};

// Simulated replies from fill-in hosts after Dev asks them.
const coverReplies: Record<string, { delay: number; status: CoverStatus; body: string } | undefined> = {
  curtis: {
    delay: 7000,
    status: 'yes',
    body: "Yes, I can do it. I'll grab Joy's price sheet from the folder Friday night so I'm not scrambling at 5:30. Is Pete still on the board at 8?",
  },
  ellen: {
    delay: 12000,
    status: 'if-needed',
    body: "Saw your note. Like I said in the group, I can if you're stuck, but I'd rather just do Swap Shop. Let me know either way by Thursday?",
  },
  tamsin: undefined, // hasn't answered
};

// One-time replies after Dev first writes back in these threads.
const autoReplies: Record<string, { from: string; delay: number; body: string }> = {
  'th-lourdes': {
    from: 'lourdes',
    delay: 9000,
    body: "Thank you, Dev. I was so embarrassed. My laptop's audio interface dropped out in the middle of a long track and I was crawling under the desk trying to reconnect it. I didn't know there was supposed to be a backup. Tomorrow at 12:20 works for a call.",
  },
  'th-walt': {
    from: 'walt',
    delay: 10000,
    body: "Will do. I'll be there Wednesday at 6, set the playout service to restart on its own and turn off the automatic reboots. Then I'll pull the studio feed on purpose for two minutes after midnight to make sure the failover actually takes over. Will send you the log.",
  },
  'th-abel': {
    from: 'abel',
    delay: 8000,
    body: 'Thanks Dev! Saturday Nov 28 at 10 works great. I\'ll park behind the library. See you then!',
  },
};

interface Ctx {
  s: State;
  d: React.Dispatch<Action>;
  askCover: (asks: { volId: string; body: string }[]) => void;
  sendMessage: (threadId: string, body: string) => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, d] = useReducer(reducer, initial);
  const stateRef = useRef(s);
  stateRef.current = s;

  const askCover = useCallback((asks: { volId: string; body: string }[]) => {
    for (const { volId, body } of asks) {
      let th = dmFor(stateRef.current.threads, volId);
      if (!th) {
        d({ type: 'startDm', volId });
        th = { id: `th-${volId}` } as Thread;
      }
      const threadId = th.id;
      d({ type: 'send', threadId, body });
      d({ type: 'coverAsked', volId });
      const r = coverReplies[volId];
      if (r) {
        window.setTimeout(() => {
          d({ type: 'receive', threadId, message: { id: newId(), from: volId, at: now().toISOString(), body: r.body } });
          d({ type: 'coverReply', volId, status: r.status });
          const v = volunteers.find((x) => x.id === volId)!;
          d({ type: 'toast', text: `${v.name.split(' ')[0]} replied about Farm Report` });
        }, r.delay);
      }
    }
    // if startDm switched the view, return to where Dev was
    if (stateRef.current.activeThreadId) d({ type: 'open', threadId: stateRef.current.activeThreadId });
  }, []);

  const fired = useRef<Set<string>>(new Set());
  const sendMessage = useCallback((threadId: string, body: string) => {
    d({ type: 'send', threadId, body });
    const r = autoReplies[threadId];
    if (r && !fired.current.has(threadId)) {
      fired.current.add(threadId);
      window.setTimeout(() => {
        d({ type: 'receive', threadId, message: { id: newId(), from: r.from, at: now().toISOString(), body: r.body } });
        const v = volunteers.find((x) => x.id === r.from)!;
        d({ type: 'toast', text: `New message from ${v.name}` });
      }, r.delay);
    }
  }, []);

  const value = useMemo(() => ({ s, d, askCover, sendMessage }), [s, askCover, sendMessage]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('no store');
  return c;
}

// ─── derived helpers ───

export function unreadCount(t: Thread) {
  return t.messages.filter((m) => m.from !== ME && m.at > t.lastReadAt).length;
}

export function needsReply(t: Thread) {
  if (t.done) return false;
  if (t.messages.length === 0) return false;
  const last = t.messages[t.messages.length - 1];
  if (t.kind !== 'group') return last.from !== ME;
  let lastMine = -1;
  t.messages.forEach((m, i) => { if (m.from === ME) lastMine = i; });
  return t.messages.slice(lastMine + 1).some((m) => m.asksMe);
}

/** Time since the oldest message Dev hasn't answered. */
export function waitingSince(t: Thread): string | null {
  if (!needsReply(t)) return null;
  let i = t.messages.length - 1;
  while (i > 0 && t.messages[i - 1].from !== ME) i--;
  if (t.kind === 'group') {
    const ask = t.messages.find((m, idx) => idx >= i && m.asksMe);
    return ask?.at ?? null;
  }
  return t.messages[i].at;
}

export function lastActivity(t: Thread) {
  return t.messages.length ? t.messages[t.messages.length - 1].at : t.lastReadAt;
}
