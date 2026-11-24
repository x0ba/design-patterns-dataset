import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STEPS } from './data/steps.js';
import { NOTES } from './data/notes.js';

const KEY = 'cabinbook:demo:v1';

// The state Ellen sees on Saturday afternoon: steps 1–4 done, and Ellen is in the utility room.
function seedState() {
  const stepsDone = {};
  for (const s of STEPS) {
    if (s.done) stepsDone[s.n] = { by: s.done.by, at: s.done.at };
  }
  return {
    stepsDone,
    notes: NOTES,
    location: { floor: 'ground', room: 'utility' },
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    return { ...seedState(), ...parsed };
  } catch {
    return seedState();
  }
}

const StateContext = createContext(null);

// Local "YYYY-MM-DDTHH:MM" so stored times read back in the same zone.
function localIso(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StateProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage can be full or blocked; the app still works in memory */
    }
  }, [state]);

  const toggleStep = useCallback((n, by, now) => {
    setState((s) => {
      const stepsDone = { ...s.stepsDone };
      if (stepsDone[n]) delete stepsDone[n];
      else stepsDone[n] = { by, at: localIso(now) };
      return { ...s, stepsDone };
    });
  }, []);

  const addNote = useCallback((note) => {
    setState((s) => ({ ...s, notes: [note, ...s.notes] }));
  }, []);

  const setLocation = useCallback((location) => {
    setState((s) => ({ ...s, location }));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setState(seedState());
  }, []);

  const value = useMemo(
    () => ({ ...state, toggleStep, addNote, setLocation, reset }),
    [state, toggleStep, addNote, setLocation, reset],
  );

  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used inside StateProvider');
  return ctx;
}

