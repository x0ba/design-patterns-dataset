import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { ItemStatus, LogEntry, NOTES, Note, OPEN_ITEMS, OpenItem } from './data';
import { iso, NOW } from './util';

const KEY = 'pilotlight.v1';

interface Persisted {
  notes: Note[];
  items: Record<string, { status?: ItemStatus; extraLog?: LogEntry[]; completed?: string }>;
  handled: Record<string, string>; // noticeId -> date handled
}

const initial: Persisted = { notes: NOTES, items: {}, handled: {} };

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Persisted;
    return { ...initial, ...parsed };
  } catch {
    return initial;
  }
}

interface Store {
  notes: Note[];
  items: OpenItem[];
  handled: Record<string, string>;
  addNote: (n: Omit<Note, 'id' | 'date'>) => void;
  updateNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
  logUpdate: (itemId: string, text: string, status?: ItemStatus) => void;
  setStatus: (itemId: string, status: ItemStatus) => void;
  toggleHandled: (noticeId: string) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — keep working in memory */
    }
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const today = iso(NOW);

  const items = useMemo<OpenItem[]>(
    () =>
      OPEN_ITEMS.map((it) => {
        const o = state.items[it.id];
        if (!o) return it;
        return {
          ...it,
          status: o.status ?? it.status,
          completed: o.completed ?? it.completed,
          log: [...it.log, ...(o.extraLog ?? [])],
        };
      }),
    [state.items],
  );

  const addNote = useCallback((n: Omit<Note, 'id' | 'date'>) => {
    setState((s) => ({ ...s, notes: [{ ...n, id: `note-${Date.now()}`, date: today }, ...s.notes] }));
  }, [today]);

  const updateNote = useCallback((id: string, text: string) => {
    setState((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, text } : n)) }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
  }, []);

  const logUpdate = useCallback((itemId: string, text: string, status?: ItemStatus) => {
    setState((s) => {
      const cur = s.items[itemId] ?? {};
      return {
        ...s,
        items: {
          ...s.items,
          [itemId]: {
            ...cur,
            status: status ?? cur.status,
            completed: status === 'done' ? today : status ? undefined : cur.completed,
            extraLog: [...(cur.extraLog ?? []), { date: today, text, by: 'Danielle' }],
          },
        },
      };
    });
  }, [today]);

  const setStatus = useCallback((itemId: string, status: ItemStatus) => {
    setState((s) => {
      const cur = s.items[itemId] ?? {};
      return {
        ...s,
        items: { ...s.items, [itemId]: { ...cur, status, completed: status === 'done' ? today : undefined } },
      };
    });
  }, [today]);

  const toggleHandled = useCallback((noticeId: string) => {
    setState((s) => {
      const h = { ...s.handled };
      if (h[noticeId]) delete h[noticeId];
      else h[noticeId] = today;
      return { ...s, handled: h };
    });
  }, [today]);

  const value: Store = {
    notes: state.notes,
    items,
    handled: state.handled,
    addNote,
    updateNote,
    deleteNote,
    logUpdate,
    setStatus,
    toggleHandled,
    toast,
    showToast: setToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

// ---------------- Hash router ----------------
export type Route =
  | { name: 'property'; propertyId: string }
  | { name: 'account'; propertyId: string; accountId: string }
  | { name: 'items' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'open-items') return { name: 'items' };
  if (parts[0] === 'p' && parts[1]) {
    if (parts[2] === 'a' && parts[3]) return { name: 'account', propertyId: parts[1], accountId: parts[3] };
    return { name: 'property', propertyId: parts[1] };
  }
  return { name: 'property', propertyId: 'home' };
}

export function hrefFor(r: Route): string {
  if (r.name === 'items') return '#/open-items';
  if (r.name === 'account') return `#/p/${r.propertyId}/a/${r.accountId}`;
  return `#/p/${r.propertyId}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(r: Route) {
  window.location.hash = hrefFor(r);
}
