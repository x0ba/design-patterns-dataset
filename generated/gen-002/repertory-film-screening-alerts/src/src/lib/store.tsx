import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Decision, Rules } from "../types";
import { CURRENT_RULES, PROPOSED_RULES } from "./rules";

/**
 * "active" is what the service applies to alerts. "draft" is the filter being edited and previewed.
 * Both persist in localStorage so a reload keeps the same state.
 */
export interface StoreState {
  active: Rules;
  draft: Rules;
  decision: Decision;
}

interface StoreApi extends StoreState {
  setDraft: (patch: Partial<Rules>) => void;
  saveDraftAsActive: () => void;
  restoreCurrentRules: () => void;
  resetDraft: () => void;
  setDecision: (choice: Decision["choice"]) => void;
}

const STORAGE_KEY = "reelcall.state.v1";

const INITIAL: StoreState = {
  active: CURRENT_RULES,
  draft: PROPOSED_RULES,
  decision: { choice: "none" },
};

function load(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    return {
      active: { ...CURRENT_RULES, ...parsed.active },
      draft: { ...PROPOSED_RULES, ...parsed.draft },
      decision: { ...INITIAL.decision, ...parsed.decision },
    };
  } catch {
    return INITIAL;
  }
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode); the app still works for this session.
    }
  }, [state]);

  const api = useMemo<StoreApi>(
    () => ({
      ...state,
      setDraft: (patch) => setState((s) => ({ ...s, draft: { ...s.draft, ...patch, mode: "filtered" } })),
      saveDraftAsActive: () => setState((s) => ({ ...s, active: { ...s.draft, mode: "filtered" } })),
      restoreCurrentRules: () => setState((s) => ({ ...s, active: CURRENT_RULES })),
      resetDraft: () => setState((s) => ({ ...s, draft: PROPOSED_RULES })),
      setDecision: (choice) => setState((s) => ({ ...s, decision: { choice } })),
    }),
    [state],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
