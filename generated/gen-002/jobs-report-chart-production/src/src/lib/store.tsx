// App state and reducer. The viewer is always Ana Delacroix (release lead).
// Every mutating action is checked against canAct() before it is applied, so a
// disallowed action is a no-op even if a control somehow dispatches it.

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import { ME_ID, buildInitialState, personById } from '../data/seed';
import { canAct, type Action as PermAction } from './permissions';
import type { AppState, Chart, Comment, DetailTab, Filters, FeedEvent, HistoryEntry, Status } from './types';

export type TextField = 'headline' | 'subtitle' | 'note' | 'caption';

const FIELD_LABEL: Record<TextField, string> = {
  headline: 'Headline',
  subtitle: 'Subtitle',
  note: 'Release note',
  caption: 'Caption',
};

export type Op = 'submitForReview' | 'approve' | 'returnToDrafting' | 'markFinal' | 'reopen';

export type Action =
  | { type: 'select'; id: string }
  | { type: 'filter'; patch: Partial<Filters> }
  | { type: 'tab'; tab: DetailTab }
  | { type: 'markSeen'; now: number }
  | { type: 'toggleFeedAll' }
  | { type: 'editText'; id: string; fields: Partial<Record<TextField, string>>; now: number }
  | { type: 'op'; id: string; op: Op; now: number; confirmed?: boolean }
  | { type: 'hold'; id: string; on: boolean; now: number }
  | { type: 'comment'; chartId: string; text: string; to: string[]; now: number }
  | { type: 'reply'; commentId: string; text: string; now: number }
  | { type: 'resolve'; commentId: string; now: number }
  | { type: 'release'; now: number };

const ACTOR = () => personById(ME_ID)!;

function withChart(state: AppState, id: string, fn: (c: Chart) => Chart): AppState {
  return { ...state, charts: state.charts.map((c) => (c.id === id ? fn(c) : c)) };
}

function pushFeed(state: AppState, event: Omit<FeedEvent, 'id'>): AppState {
  const seq = state.seq + 1;
  return { ...state, seq, feed: [...state.feed, { ...event, id: `ev-${seq}` }] };
}

function openThreadsOn(state: AppState, chartId: string): number {
  return state.comments.filter((c) => c.chartId === chartId && !c.resolved).length;
}

function nextSeq(state: AppState): [number, AppState] {
  const seq = state.seq + 1;
  return [seq, { ...state, seq }];
}

export function reducer(state: AppState, action: Action): AppState {
  const actor = ACTOR();
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };

    case 'filter':
      return { ...state, filters: { ...state.filters, ...action.patch } };

    case 'tab':
      return { ...state, tab: action.tab };

    case 'markSeen':
      return { ...state, lastSeenAt: action.now, feedShowAll: false };

    case 'toggleFeedAll':
      return { ...state, feedShowAll: !state.feedShowAll };

    case 'editText': {
      const chart = state.charts.find((c) => c.id === action.id) ?? null;
      const keys = (Object.keys(action.fields) as TextField[]).filter(
        (k) => action.fields[k] !== undefined && action.fields[k] !== chart?.[k],
      );
      if (!chart || keys.length === 0 || !canAct(actor, 'editText', chart, { fields: keys }).ok) return state;

      const reset = chart.status === 'approved';
      const version = chart.version + 1;
      const labels = keys.map((k) => FIELD_LABEL[k].toLowerCase());
      const joined = labels.join(' and ');
      const summary =
        `${joined.charAt(0).toUpperCase()}${joined.slice(1)} edited.` +
        (reset ? ' Status reset from approved to in review after the edit.' : '');
      const entry: HistoryEntry = {
        at: action.now,
        by: actor.id,
        version,
        summary,
        details: keys.map((k) => `${FIELD_LABEL[k]}: “${chart[k]}” → “${action.fields[k]}”`),
      };

      let next = withChart(state, action.id, (c) => {
        const updates: Partial<Chart> = { version, lastEditorId: actor.id, lastEditAt: action.now, history: [...c.history, entry] };
        for (const k of keys) updates[k] = action.fields[k]!;
        if (reset) {
          updates.status = 'in review';
          updates.approvedAt = null;
          updates.approvedBy = null;
        }
        return { ...c, ...updates };
      });
      next = pushFeed(next, {
        at: action.now,
        actorId: actor.id,
        chartId: action.id,
        kind: 'edit',
        text: `${action.id} ${labels.join(' and ')} edited (v${version}).${reset ? ' Status back to in review.' : ''}`,
      });
      return next;
    }

    case 'op': {
      const chart = state.charts.find((c) => c.id === action.id) ?? null;
      const verdict = canAct(actor, action.op as PermAction, chart, { openComments: openThreadsOn(state, action.id) });
      if (!verdict.ok || !chart) return state;
      if (action.op === 'markFinal' && !action.confirmed) return state;

      const entryBase = { at: action.now, by: actor.id };
      switch (action.op) {
        case 'submitForReview': {
          let next = withChart(state, action.id, (c) => ({
            ...c,
            status: 'in review',
            lastEditorId: actor.id,
            lastEditAt: action.now,
            history: [...c.history, { ...entryBase, summary: 'Submitted for review.' }],
          }));
          return pushFeed(next, { at: action.now, actorId: actor.id, chartId: action.id, kind: 'status', text: `${action.id} submitted for review.` });
        }
        case 'approve': {
          let next = withChart(state, action.id, (c) => ({
            ...c,
            status: 'approved',
            approvedAt: action.now,
            approvedBy: actor.id,
            lastEditorId: actor.id,
            lastEditAt: action.now,
            history: [...c.history, { ...entryBase, summary: 'Approved for final sign-off.' }],
          }));
          return pushFeed(next, { at: action.now, actorId: actor.id, chartId: action.id, kind: 'status', text: `${action.id} approved.` });
        }
        case 'returnToDrafting': {
          let next = withChart(state, action.id, (c) => ({
            ...c,
            status: 'drafting',
            lastEditorId: actor.id,
            lastEditAt: action.now,
            history: [...c.history, { ...entryBase, summary: 'Returned to owner for changes.' }],
          }));
          return pushFeed(next, { at: action.now, actorId: actor.id, chartId: action.id, kind: 'status', text: `${action.id} returned to ${personById(chart.ownerId)?.name ?? 'owner'}.` });
        }
        case 'markFinal': {
          let next = withChart(state, action.id, (c) => ({
            ...c,
            status: 'final',
            finalAt: action.now,
            lastEditorId: actor.id,
            lastEditAt: action.now,
            history: [...c.history, { ...entryBase, summary: 'Marked final. Chart is locked until reopened.' }],
          }));
          return pushFeed(next, { at: action.now, actorId: actor.id, chartId: action.id, kind: 'status', text: `${action.id} marked final.` });
        }
        case 'reopen': {
          let next = withChart(state, action.id, (c) => ({
            ...c,
            status: 'approved',
            finalAt: null,
            lastEditorId: actor.id,
            lastEditAt: action.now,
            history: [...c.history, { ...entryBase, summary: 'Reopened from final.' }],
          }));
          return pushFeed(next, { at: action.now, actorId: actor.id, chartId: action.id, kind: 'status', text: `${action.id} reopened to approved.` });
        }
      }
      return state;
    }

    case 'hold': {
      const chart = state.charts.find((c) => c.id === action.id) ?? null;
      const verdict = canAct(actor, action.on ? 'placeHold' : 'liftHold', chart);
      if (!verdict.ok || !chart) return state;
      if (action.on) {
        const reason = 'Placed by disclosure reviewer.';
        let next = withChart(state, action.id, (c) => ({
          ...c,
          status: 'disclosure hold',
          hold: { by: actor.id, at: action.now, reason, prevStatus: c.status as Status },
          history: [...c.history, { at: action.now, by: actor.id, summary: 'Disclosure hold placed.' }],
        }));
        return pushFeed(next, { at: action.now, actorId: actor.id, chartId: action.id, kind: 'hold', text: `${action.id} placed on disclosure hold.` });
      }
      const restore: Status = chart.hold?.prevStatus ?? 'in review';
      let next = withChart(state, action.id, (c) => ({
        ...c,
        status: restore,
        hold: null,
        history: [...c.history, { at: action.now, by: actor.id, summary: 'Disclosure hold lifted.' }],
      }));
      return pushFeed(next, { at: action.now, actorId: actor.id, chartId: action.id, kind: 'hold', text: `${action.id} hold lifted.` });
    }

    case 'comment': {
      if (!canAct(actor, 'comment', null).ok) return state;
      const [seq, s] = nextSeq(state);
      const comment: Comment = {
        id: `cm-${seq}`,
        chartId: action.chartId,
        authorId: actor.id,
        at: action.now,
        text: action.text,
        to: action.to,
        replies: [],
        resolved: false,
        resolvedBy: null,
        resolvedAt: null,
      };
      const next = { ...s, comments: [...s.comments, comment] };
      return pushFeed(next, { at: action.now, actorId: actor.id, chartId: action.chartId, kind: 'comment', text: `Commented on ${action.chartId}.` });
    }

    case 'reply': {
      if (!canAct(actor, 'comment', null).ok) return state;
      const target = state.comments.find((c) => c.id === action.commentId);
      if (!target) return state;
      const [seq, s] = nextSeq(state);
      const comments = s.comments.map((c) =>
        c.id === action.commentId
          ? { ...c, replies: [...c.replies, { id: `cm-${seq}`, authorId: actor.id, at: action.now, text: action.text }] }
          : c,
      );
      return { ...s, comments };
    }

    case 'resolve': {
      const target = state.comments.find((c) => c.id === action.commentId);
      if (!target || target.resolved) return state;
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.commentId ? { ...c, resolved: true, resolvedBy: actor.id, resolvedAt: action.now } : c,
        ),
      };
    }

    case 'release': {
      const notFinal = state.charts.filter((c) => c.status !== 'final').length;
      const holdsOpen = state.charts.filter((c) => c.status === 'disclosure hold').length;
      const openComments = state.comments.filter((c) => !c.resolved).length;
      const verdict = canAct(actor, 'release', null, { notFinal, holdsOpen, openComments });
      if (!verdict.ok || state.handedOffAt) return state;
      const next = { ...state, handedOffAt: action.now };
      return pushFeed(next, { at: action.now, actorId: actor.id, chartId: null, kind: 'status', text: `Released ${state.charts.length} charts to communications.` });
    }
  }
}

// ---------------------------------------------------------------------------
// Context

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
