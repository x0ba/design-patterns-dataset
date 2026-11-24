import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { recentSeed } from '../data/seed';
import { nowMs } from './format';

export interface UserReply {
  id: string;
  text: string;
  at: number;
}

export interface UserState {
  /** Threads the user has opened, newest first. */
  recent: { id: string; at: number }[];
  /** Saved thread ids, or `guide:<id>` for guides. */
  saved: string[];
  joinedGroups: string[];
  rsvps: string[];
  /** Replies the user has posted, keyed by thread id. */
  replies: Record<string, UserReply[]>;
  /** Reply keys (`threadId:replyId`) the user has marked helpful. */
  votes: string[];
}

export type Action =
  | { type: 'viewThread'; id: string }
  | { type: 'toggleSave'; key: string }
  | { type: 'toggleJoin'; id: string }
  | { type: 'toggleRsvp'; id: string }
  | { type: 'addReply'; threadId: string; text: string }
  | { type: 'toggleVote'; key: string };

const STORAGE_KEY = 'meadowmark.web.v1';

function initialState(): UserState {
  return {
    recent: recentSeed.map(([id, at]) => ({ id, at })),
    saved: [],
    joinedGroups: [],
    rsvps: [],
    replies: {},
    votes: [],
  };
}

function loadState(): UserState {
  const base = initialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<UserState>;
    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

function reducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case 'viewThread': {
      const at = nowMs();
      return {
        ...state,
        recent: [{ id: action.id, at }, ...state.recent.filter((r) => r.id !== action.id)].slice(0, 200),
      };
    }
    case 'toggleSave':
      return {
        ...state,
        saved: state.saved.includes(action.key)
          ? state.saved.filter((k) => k !== action.key)
          : [action.key, ...state.saved],
      };
    case 'toggleJoin': {
      const joined = state.joinedGroups.includes(action.id);
      return {
        ...state,
        joinedGroups: joined
          ? state.joinedGroups.filter((g) => g !== action.id)
          : [...state.joinedGroups, action.id],
        rsvps: joined ? state.rsvps.filter((g) => g !== action.id) : state.rsvps,
      };
    }
    case 'toggleRsvp':
      return {
        ...state,
        rsvps: state.rsvps.includes(action.id)
          ? state.rsvps.filter((g) => g !== action.id)
          : [...state.rsvps, action.id],
      };
    case 'addReply': {
      const existing = state.replies[action.threadId] ?? [];
      const now = nowMs();
      return {
        ...state,
        replies: {
          ...state.replies,
          [action.threadId]: [{ id: `me-${now}`, text: action.text, at: now }, ...existing],
        },
      };
    }
    case 'toggleVote':
      return {
        ...state,
        votes: state.votes.includes(action.key)
          ? state.votes.filter((k) => k !== action.key)
          : [...state.votes, action.key],
      };
    default:
      return state;
  }
}

interface StoreValue {
  state: UserState;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => loadState());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode). The app still works for the session.
    }
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
