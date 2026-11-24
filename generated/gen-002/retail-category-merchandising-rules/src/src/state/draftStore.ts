import { useEffect, useReducer, type Dispatch } from 'react';
import { DEFAULT_SCHEDULE, DRAFT_RULES, LIVE_RULES } from '../domain/rules';
import type {
  AttributeId,
  BrandBoost,
  DraftState,
  OosMode,
  RuleSet,
  ScheduleState,
  SortId,
} from '../domain/types';

const STORAGE_KEY = 'shelfwright.snow-blowers.v1';

export const INITIAL_STATE: DraftState = {
  live: LIVE_RULES,
  rules: DRAFT_RULES,
  schedule: DEFAULT_SCHEDULE,
  scheduled: null,
};

export type Action =
  | { type: 'setSort'; sort: SortId }
  | { type: 'addBoost'; brand: string; start: string; end: string }
  | { type: 'removeBoost'; id: string }
  | { type: 'toggleAttribute'; id: AttributeId }
  | { type: 'moveAttribute'; id: AttributeId; direction: -1 | 1 }
  | { type: 'setOosMode'; mode: OosMode }
  | { type: 'setOosThreshold'; threshold: number }
  | { type: 'setSchedule'; patch: Partial<ScheduleState> }
  | { type: 'schedule'; by: string; at: string }
  | { type: 'cancelSchedule' }
  | { type: 'publishNow'; by: string; at: string }
  | { type: 'discardDraft' };

function withRules(state: DraftState, rules: RuleSet): DraftState {
  return { ...state, rules };
}

export function reducer(state: DraftState, action: Action): DraftState {
  // Edits are locked while a change set is scheduled. Only the schedule itself can be cancelled.
  const locked = state.scheduled !== null;
  const editing = (fn: (r: RuleSet) => RuleSet): DraftState =>
    locked ? state : withRules(state, fn(state.rules));

  switch (action.type) {
    case 'setSort':
      return editing((r) => ({ ...r, sort: action.sort }));

    case 'addBoost':
      return editing((r) => {
        const boost: BrandBoost = {
          id: `draft-${action.brand.toLowerCase().replace(/[^a-z]+/g, '-')}-${action.start}`,
          brand: action.brand,
          start: action.start,
          end: action.end,
        };
        return { ...r, boosts: [...r.boosts, boost] };
      });

    case 'removeBoost':
      return editing((r) => ({ ...r, boosts: r.boosts.filter((b) => b.id !== action.id) }));

    case 'toggleAttribute':
      return editing((r) => ({
        ...r,
        attributes: r.attributes.includes(action.id)
          ? r.attributes.filter((a) => a !== action.id)
          : [...r.attributes, action.id],
      }));

    case 'moveAttribute':
      return editing((r) => {
        const index = r.attributes.indexOf(action.id);
        const target = index + action.direction;
        if (index < 0 || target < 0 || target >= r.attributes.length) return r;
        const next = [...r.attributes];
        [next[index], next[target]] = [next[target], next[index]];
        return { ...r, attributes: next };
      });

    case 'setOosMode':
      return editing((r) => ({ ...r, oos: { ...r.oos, mode: action.mode } }));

    case 'setOosThreshold':
      return editing((r) => ({
        ...r,
        oos: { ...r.oos, threshold: Math.min(50, Math.max(1, Math.round(action.threshold))) },
      }));

    case 'setSchedule':
      return locked ? state : { ...state, schedule: { ...state.schedule, ...action.patch } };

    case 'schedule':
      return {
        ...state,
        scheduled: {
          goLive: state.schedule.mode === 'now' ? action.at : state.schedule.goLive,
          revertOn: state.schedule.revertOn,
          by: action.by,
          at: action.at,
        },
      };

    case 'cancelSchedule':
      return { ...state, scheduled: null };

    case 'publishNow':
      return { ...state, live: state.rules, scheduled: null };

    case 'discardDraft':
      return locked ? state : withRules(state, state.live);

    default:
      return state;
  }
}

function isRuleSet(value: unknown): value is RuleSet {
  if (!value || typeof value !== 'object') return false;
  const v = value as RuleSet;
  return (
    typeof v.sort === 'string' &&
    Array.isArray(v.boosts) &&
    Array.isArray(v.attributes) &&
    typeof v.oos === 'object' &&
    v.oos !== null
  );
}

function loadState(): DraftState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<DraftState>;
    if (!isRuleSet(parsed.live) || !isRuleSet(parsed.rules)) return INITIAL_STATE;
    return {
      live: parsed.live,
      rules: parsed.rules,
      schedule: { ...DEFAULT_SCHEDULE, ...(parsed.schedule ?? {}) },
      scheduled: parsed.scheduled ?? null,
    };
  } catch {
    return INITIAL_STATE;
  }
}

/** Draft state with autosave to this browser. */
export function useDraftStore(): [DraftState, Dispatch<Action>] {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode, quota). The draft still works for this session.
    }
  }, [state]);

  return [state, dispatch];
}
