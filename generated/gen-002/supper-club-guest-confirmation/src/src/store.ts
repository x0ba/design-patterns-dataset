import { useEffect, useReducer, useState } from 'react';
import { CAPACITY, MOCK_NOW, REVERSAL_WINDOW_MS, VENUE_DEPOSIT } from './data';
import { chargeFor, feeFor, getRequest, refundRateAt, round2, seatsFor } from './logic';

const STORAGE_KEY = 'longtable.polish-harvest-nov29.v1';

export interface Charge {
  requestId: string;
  seats: number;
  amount: number;
  fee: number;
  status: 'charged' | 'reversed' | 'refunded';
  chargedAt: number;
  updatedAt?: number;
  refundAmount?: number;
}

export interface LogEntry {
  at: number;
  text: string;
}

export interface AppState {
  // Offset from the real clock so the demo's "now" starts at MOCK_NOW and keeps running.
  clockOffset: number;
  selected: string[];
  confirmedAt: number | null;
  depositPaidAt: number | null;
  charges: Record<string, Charge>;
  log: LogEntry[];
}

export type Action =
  | { type: 'toggle'; id: string }
  | { type: 'setSelection'; ids: string[] }
  | { type: 'confirm'; now: number }
  | { type: 'reverse'; id: string; now: number }
  | { type: 'refund'; id: string; now: number }
  | { type: 'offer'; id: string; now: number };

function freshState(): AppState {
  return {
    clockOffset: MOCK_NOW - Date.now(),
    selected: [],
    confirmedAt: null,
    depositPaidAt: null,
    charges: {},
    log: [],
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // fall through to a fresh state
  }
  return freshState();
}

const name = (id: string) => getRequest(id)?.name ?? id;

function makeCharge(id: string, now: number): Charge {
  const r = getRequest(id)!;
  const amount = chargeFor(r.partySize);
  return { requestId: id, seats: r.partySize, amount, fee: feeFor(amount), status: 'charged', chargedAt: now };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'toggle': {
      if (state.confirmedAt) return state;
      const on = state.selected.includes(action.id);
      if (on) return { ...state, selected: state.selected.filter((x) => x !== action.id) };
      const r = getRequest(action.id);
      if (!r || seatsFor(state.selected) + r.partySize > CAPACITY) return state;
      return { ...state, selected: [...state.selected, action.id] };
    }
    case 'setSelection': {
      if (state.confirmedAt) return state;
      return { ...state, selected: action.ids };
    }
    case 'confirm': {
      if (state.confirmedAt || state.selected.length === 0) return state;
      const charges: Record<string, Charge> = {};
      for (const id of state.selected) charges[id] = makeCharge(id, action.now);
      const seats = seatsFor(state.selected);
      return {
        ...state,
        confirmedAt: action.now,
        depositPaidAt: action.now,
        charges,
        log: [
          ...state.log,
          { at: action.now, text: `Guest list confirmed: ${seats} seats in ${state.selected.length} charges.` },
          { at: action.now, text: `Venue deposit of $${VENUE_DEPOSIT} paid. Non-refundable.` },
        ],
      };
    }
    case 'reverse': {
      const c = state.charges[action.id];
      if (!c || c.status !== 'charged') return state;
      if (action.now - c.chargedAt >= REVERSAL_WINDOW_MS) return state;
      return {
        ...state,
        charges: { ...state.charges, [action.id]: { ...c, status: 'reversed', updatedAt: action.now } },
        log: [...state.log, { at: action.now, text: `Reversed ${name(action.id)}'s charge of $${c.amount.toFixed(2)}. Seat released.` }],
      };
    }
    case 'refund': {
      const c = state.charges[action.id];
      if (!c || c.status !== 'charged') return state;
      if (action.now - c.chargedAt < REVERSAL_WINDOW_MS) return state;
      const refundAmount = round2(c.amount * refundRateAt(action.now));
      return {
        ...state,
        charges: {
          ...state.charges,
          [action.id]: { ...c, status: 'refunded', updatedAt: action.now, refundAmount },
        },
        log: [...state.log, { at: action.now, text: `Refunded $${refundAmount.toFixed(2)} to ${name(action.id)} under the refund policy. Seat released.` }],
      };
    }
    case 'offer': {
      const existing = state.charges[action.id];
      if (existing && (existing.status === 'charged' || existing.status === 'refunded')) return state;
      const r = getRequest(action.id);
      if (!r || !state.confirmedAt) return state;
      if (seatsFor(Object.values(state.charges).filter((c) => c.status === 'charged').map((c) => c.requestId)) + r.partySize > CAPACITY) return state;
      return {
        ...state,
        charges: { ...state.charges, [action.id]: makeCharge(action.id, action.now) },
        log: [...state.log, { at: action.now, text: `Offered seat to ${name(action.id)} from the waitlist and charged $${chargeFor(r.partySize).toFixed(2)}.` }],
      };
    }
    default:
      return state;
  }
}

export function useAppStore() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [, setTick] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Re-render every 15 seconds so countdowns stay current.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15000);
    return () => window.clearInterval(id);
  }, []);

  const now = Date.now() + state.clockOffset;
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };
  return { state, dispatch, now, reset };
}

export const chargedSeats = (state: AppState) =>
  Object.values(state.charges)
    .filter((c) => c.status === 'charged')
    .reduce((sum, c) => sum + c.seats, 0);
