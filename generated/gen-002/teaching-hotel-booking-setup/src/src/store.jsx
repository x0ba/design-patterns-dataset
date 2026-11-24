import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react';
import { INITIAL } from './data.js';

const KEY = 'innlab.tamarack.spring2027.v1';

export const contentOf = (s) => ({ rooms: s.rooms, rates: s.rates, scenarios: s.scenarios, roles: s.roles, tax: s.tax });

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return structuredClone(INITIAL);
}

function reducer(s, a) {
  switch (a.type) {
    case 'restore':
      return a.state;
    case 'reset':
      return structuredClone(INITIAL);

    case 'room/update':
      return { ...s, rooms: s.rooms.map((r) => (r.id === a.id ? { ...r, ...a.patch } : r)) };
    case 'room/add':
      return { ...s, rooms: [...s.rooms, a.room] };
    case 'room/remove':
      return { ...s, rooms: s.rooms.filter((r) => r.id !== a.id) };
    case 'room/combine': {
      const [keep, ...drop] = a.ids;
      const rooms = s.rooms
        .filter((r) => !drop.includes(r.id))
        .map((r) => (r.id === keep ? { ...a.room, id: keep } : r));
      return { ...s, rooms };
    }

    case 'rate/save': {
      const exists = s.rates.some((r) => r.id === a.rate.id);
      return { ...s, rates: exists ? s.rates.map((r) => (r.id === a.rate.id ? a.rate : r)) : [...s.rates, a.rate] };
    }
    case 'rate/status':
      return { ...s, rates: s.rates.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)) };
    case 'rate/retire':
      return {
        ...s,
        rates: s.rates.map((r) => (r.id === a.id ? { ...r, status: 'retired' } : r)),
        scenarios: s.scenarios.map((sc) => (sc.ratePlan === a.id ? { ...sc, ratePlan: a.reassignTo } : sc)),
      };
    case 'rate/remove':
      return { ...s, rates: s.rates.filter((r) => r.id !== a.id) };

    case 'scenario/week':
      return { ...s, scenarios: s.scenarios.map((sc) => (a.ids.includes(sc.id) ? { ...sc, week: a.week } : sc)) };
    case 'scenario/ratePlan':
      return { ...s, scenarios: s.scenarios.map((sc) => (sc.id === a.id ? { ...sc, ratePlan: a.ratePlan } : sc)) };

    case 'role/perm':
      return {
        ...s,
        roles: s.roles.map((r) => (r.id === a.roleId ? { ...r, perms: { ...r.perms, [a.actionId]: a.level } } : r)),
      };

    case 'tax/set':
      return { ...s, tax: { ...s.tax, ...a.patch }, flags: { ...s.flags, taxConfirmed: false } };
    case 'flag':
      return { ...s, flags: { ...s.flags, ...a.patch } };
    case 'publish':
      return { ...s, published: { at: a.at, content: contentOf(s) } };
    default:
      return s;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, load);
  const [toast, setToast] = useState(null);
  const timer = useRef();

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const notify = useCallback((message, { undo = false, tone = 'ok' } = {}) => {
    clearTimeout(timer.current);
    const prev = undo ? stateRef.current : null;
    setToast({ message, prev, tone, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), undo ? 9000 : 4500);
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ state, dispatch, toast, notify, dismissToast }), [state, toast, notify, dismissToast]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
