import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { DEFAULT_ALERTS, INITIAL_NOTICES, MEETINGS, MESSAGES, STAFF } from './data';
import { SCENARIO_NOW, fDay, fShort } from './dates';
import { derive, type Derived } from './logic';
import type { AlertConfig, Meeting, Notice, StaffId } from './types';

export interface State {
  notices: Notice[];
  meetings: Meeting[];
  readMsgs: Set<string>;
  alerts: AlertConfig;
}

type Action =
  | { type: 'rebook'; id: string; index: number; date: string; replace: boolean; at: string }
  | { type: 'confirm'; id: string; index: number; at: string }
  | { type: 'reschedule'; id: string; runDate: string; meetingDate: string; at: string }
  | { type: 'tearSheet'; id: string; value: boolean; at: string }
  | { type: 'requestAffidavit'; ids: string[]; at: string; day: string }
  | { type: 'receiveAffidavit'; id: string; date: string; at: string }
  | { type: 'reassign'; id: string; owner: StaffId; at: string }
  | { type: 'read'; ids: string[] }
  | { type: 'saveAlerts'; cfg: AlertConfig };

const ME: StaffId = 'gloria';

function log(n: Notice, at: string, text: string): Notice {
  return { ...n, activity: [...n.activity, { at, who: ME, text }] };
}

function reducer(s: State, a: Action): State {
  const upd = (id: string, f: (n: Notice) => Notice) => ({ ...s, notices: s.notices.map((n) => (n.id === id ? f(n) : n)) });
  switch (a.type) {
    case 'rebook':
      return upd(a.id, (n) => {
        const old = n.insertions[a.index];
        const fresh = { date: a.date, state: 'unconfirmed' as const, note: `Rebook request sent ${fShort(a.at.slice(0, 10))} by ${STAFF[ME].name}.` };
        const insertions = a.replace
          ? n.insertions.map((x, i) => (i === a.index ? fresh : x))
          : [...n.insertions, fresh];
        insertions.sort((x, y) => x.date.localeCompare(y.date));
        return log({ ...n, insertions, pendingReason: 'Rebook request sent — awaiting paper confirmation.' }, a.at, `Rebook request sent: ${old ? fDay(old.date) : '—'} → ${fDay(a.date)}.`);
      });
    case 'confirm':
      return upd(a.id, (n) =>
        log(
          { ...n, insertions: n.insertions.map((x, i) => (i === a.index ? { ...x, state: 'confirmed', note: 'Placement confirmed by phone with the legal desk.' } : x)) },
          a.at,
          `Marked ${fDay(n.insertions[a.index].date)} placement confirmed (phone confirmation with legal desk).`,
        ),
      );
    case 'reschedule': {
      const n0 = s.notices.find((n) => n.id === a.id)!;
      const m0 = s.meetings.find((m) => m.id === n0.meetingId)!;
      const newId = `${m0.id}-r`;
      const meeting: Meeting = { ...m0, id: newId, date: a.meetingDate, rescheduledFrom: m0.rescheduledFrom ?? m0.date };
      return {
        ...s,
        meetings: [...s.meetings.filter((m) => m.id !== newId), meeting],
        notices: s.notices.map((n) =>
          n.id === a.id
            ? log(
                {
                  ...n,
                  meetingId: newId,
                  insertions: [...n.insertions.filter((x) => x.state !== 'unconfirmed'), { date: a.runDate, state: 'unconfirmed', note: 'Rescheduled run — awaiting paper confirmation.' }],
                  pendingReason: 'Rescheduled — awaiting paper confirmation.',
                },
                a.at,
                `Bid opening moved ${fDay(m0.date)} → ${fDay(a.meetingDate)}; new run requested for ${fDay(a.runDate)}. Addendum No. 1 queued for 3 plan holders.`,
              )
            : n,
        ),
      };
    }
    case 'tearSheet':
      return upd(a.id, (n) => log({ ...n, tearSheet: a.value }, a.at, a.value ? 'Tear sheet logged as received.' : 'Tear sheet unmarked.'));
    case 'requestAffidavit':
      return {
        ...s,
        notices: s.notices.map((n) => (a.ids.includes(n.id) ? log({ ...n, affidavitRequested: a.day }, a.at, 'Affidavit of publication requested from legal desk.') : n)),
      };
    case 'receiveAffidavit':
      return upd(a.id, (n) => log({ ...n, affidavit: 'received', affidavitReceived: a.date, tearSheet: true }, a.at, `Affidavit of publication received ${fDay(a.date)} and filed.`));
    case 'reassign':
      return upd(a.id, (n) => log({ ...n, owner: a.owner }, a.at, `Reassigned to ${STAFF[a.owner].name}.`));
    case 'read': {
      const r = new Set(s.readMsgs);
      a.ids.forEach((i) => r.add(i));
      return { ...s, readMsgs: r };
    }
    case 'saveAlerts':
      return { ...s, alerts: a.cfg };
  }
}

export interface Toast {
  id: number;
  text: string;
  tone?: 'ok' | 'warn';
}

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
  now: Date;
  nowIso: string; // ISO datetime for logs
  derived: Map<string, Derived>;
  openNotice: (id: string | null) => void;
  openId: string | null;
  toast: (text: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
  modal: ModalState | null;
  setModal: (m: ModalState | null) => void;
  messages: typeof MESSAGES;
}

export type ModalState = { kind: 'rebook'; id: string } | { kind: 'reschedule'; id: string };

const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

function useScenarioClock() {
  const [loadedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => new Date(SCENARIO_NOW.getTime() + (Date.now() - loadedAt)), [tick, loadedAt]);
}

function toIsoLocal(dt: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    notices: INITIAL_NOTICES,
    meetings: MEETINGS,
    readMsgs: new Set<string>(),
    alerts: DEFAULT_ALERTS,
  });
  const now = useScenarioClock();
  const [openId, openNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);

  const derived = useMemo(() => {
    const m = new Map<string, Derived>();
    for (const n of state.notices) m.set(n.id, derive(n, state.meetings, now, state.alerts.slackDays));
    return m;
  }, [state.notices, state.meetings, now, state.alerts.slackDays]);

  const toast = (text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  };

  const value: Ctx = {
    state,
    dispatch,
    now,
    nowIso: toIsoLocal(now),
    derived,
    openNotice,
    openId,
    toast,
    toasts,
    modal,
    setModal,
    messages: MESSAGES,
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
