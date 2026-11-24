import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALERTS, BARN_START, BREAK_END, CATEGORIES, CLOSE_FRIENDS_START, INITIAL_SETTINGS, OTHER_FRIENDS_START,
  PLAYER, START, VILLAGE, fmtClock, fmtTime, outcome, shiftPreset, type Settings,
} from './data';
import { IconBell, IconClock, IconHouse, IconMoon, IconUndo, IconX } from './icons';
import Tonight from './Tonight';
import AlertsView from './AlertsView';

export type TradeState = 'pending' | 'accepted' | 'declined' | 'blocked';
export type PlanState = 'todo' | 'done' | 'skipped';
export interface Toast { id: number; msg: string; undo?: () => void }
export interface ActionLog { id: string; at: Date; text: string }

export interface AppModel {
  now: Date;
  saved: Settings;
  draft: Settings;
  setDraft: (s: Settings) => void;
  saveDraft: () => void;
  discardDraft: () => void;
  applyShift: () => void;
  close: string[];
  others: string[];
  setTiers: (close: string[], others: string[]) => void;
  trades: Record<string, TradeState>;
  setTrade: (id: string, st: TradeState) => void;
  plan: Record<string, PlanState>;
  setPlan: (id: string, st: PlanState) => void;
  barn: { lavender: number; goldenEgg: number };
  actions: ActionLog[];
  goAlerts: () => void;
  toast: (msg: string, undo?: () => void) => void;
}

const sameSettings = (a: Settings, b: Settings) => JSON.stringify(a) === JSON.stringify(b);

function useLiveClock() {
  const [now, setNow] = useState(START);
  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => setNow(new Date(START.getTime() + (Date.now() - t0))), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export default function App() {
  const now = useLiveClock();
  const [tab, setTab] = useState<'tonight' | 'alerts'>('tonight');
  const [saved, setSaved] = useState<Settings>(INITIAL_SETTINGS);
  const [draft, setDraft] = useState<Settings>(INITIAL_SETTINGS);
  const [close, setClose] = useState(CLOSE_FRIENDS_START);
  const [others, setOthers] = useState(OTHER_FRIENDS_START);
  const [trades, setTrades] = useState<Record<string, TradeState>>({ june: 'pending', farmlord: 'pending' });
  const [planRaw, setPlanRaw] = useState<Record<string, PlanState>>({});
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [toastState, setToastState] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const nowRef = useRef(now);
  nowRef.current = now;

  const toast = useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToastState({ id: Date.now(), msg, undo });
    toastTimer.current = window.setTimeout(() => setToastState(null), 6500);
  }, []);

  const log = (id: string, text: string) =>
    setActions((a) => [{ id, at: nowRef.current, text }, ...a.filter((x) => x.id !== id)]);
  const unlog = (id: string) => setActions((a) => a.filter((x) => x.id !== id));

  const setTrade = (id: string, st: TradeState) => {
    const prev = trades[id];
    setTrades((t) => ({ ...t, [id]: st }));
    const who = id === 'june' ? 'June_bug' : 'xXFarmlordXx';
    const text =
      st === 'accepted' ? `You accepted ${who}’s trade — 10 lavender for 1 golden egg`
      : st === 'declined' ? `You declined ${who}’s trade`
      : st === 'blocked' ? `You declined and blocked ${who}`
      : '';
    if (st === 'pending') unlog(`trade-${id}`);
    else log(`trade-${id}`, text);
    if (st !== 'pending') {
      toast(text, () => {
        setTrades((t) => ({ ...t, [id]: prev }));
        unlog(`trade-${id}`);
      });
    }
  };

  const commitSettings = (next: Settings, msg: string) => {
    const prevSaved = saved;
    const prevDraft = draft;
    setSaved(next);
    setDraft(next);
    log('settings', next.quietOn ? 'You turned on shift quiet hours' : 'You updated alert settings');
    toast(msg, () => {
      setSaved(prevSaved);
      setDraft(prevDraft);
      unlog('settings');
    });
  };

  const summarize = (s: Settings) => {
    const n = ALERTS.filter((a) => outcome(a, s, close, others) === 'delivered').length;
    return `Saved. Tonight’s ${ALERTS.length} alerts would have been ${n} with these settings.`;
  };

  const model: AppModel = {
    now,
    saved,
    draft,
    setDraft,
    saveDraft: () => commitSettings(draft, summarize(draft)),
    discardDraft: () => setDraft(saved),
    applyShift: () => {
      const next = shiftPreset(saved);
      commitSettings(next, `Shift quiet hours on, 10 PM–6:30 AM. Only the event deadline and trades from ${close.join(' & ')} get through.`);
    },
    close,
    others,
    setTiers: (c, o) => {
      setClose(c);
      setOthers(o);
    },
    trades,
    setTrade,
    plan: useMemo(() => {
      const p = { ...planRaw };
      if (trades.june === 'accepted') p.june = 'done';
      if (trades.june === 'declined') p.june = 'skipped';
      if (saved.quietOn) p.alerts = 'done';
      return p;
    }, [planRaw, trades, saved]),
    setPlan: (id, st) => setPlanRaw((p) => ({ ...p, [id]: st })),
    barn: {
      lavender: BARN_START.lavender - (trades.june === 'accepted' ? 10 : 0),
      goldenEgg: BARN_START.goldenEgg + (trades.june === 'accepted' ? 1 : 0),
    },
    actions,
    goAlerts: () => setTab('alerts'),
    toast,
  };

  const breakLeft = BREAK_END.getTime() - now.getTime();
  const dirty = !sameSettings(draft, saved);
  const onCount = CATEGORIES.filter((c) => saved.enabled[c.id]).length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><IconHouse size={18} /></span>
          <div>
            <div className="brand-name">Hearthvale <span>Companion</span></div>
          </div>
        </div>

        <div className="village-pill" title={`${VILLAGE.xp.toLocaleString()} / ${VILLAGE.xpNext.toLocaleString()} XP to level 35`}>
          <span className="village-name">{VILLAGE.name}</span>
          <span className="lvl">Lv {VILLAGE.level}</span>
          <span className="xpbar"><span style={{ width: `${(VILLAGE.xp / VILLAGE.xpNext) * 100}%` }} /></span>
        </div>

        <nav className="tabs" role="tablist" aria-label="Sections">
          <button role="tab" aria-selected={tab === 'tonight'} className={tab === 'tonight' ? 'on' : ''} onClick={() => setTab('tonight')}>
            <IconMoon size={16} /> Tonight
          </button>
          <button role="tab" aria-selected={tab === 'alerts'} className={tab === 'alerts' ? 'on' : ''} onClick={() => setTab('alerts')}>
            <IconBell size={16} /> Alerts
            <span className={`tab-badge ${saved.quietOn ? 'calm' : ''}`}>
              {saved.quietOn ? 'Shift quiet' : `${onCount} on`}
            </span>
            {dirty && <span className="dot" title="Unsaved changes" />}
          </button>
        </nav>

        <div className="top-right">
          <div className="sync"><span className="live" /> Synced {fmtTime(now)}</div>
          <div className={`break-pill ${breakLeft <= 0 ? 'over' : breakLeft < 3 * 60000 ? 'low' : ''}`}>
            <IconClock size={16} />
            {breakLeft > 0 ? (
              <>Break <strong>{fmtClock(breakLeft)}</strong> left</>
            ) : (
              <>Break ended {fmtTime(BREAK_END)}</>
            )}
          </div>
          <div className="avatar" title={PLAYER.handle}>P</div>
        </div>
      </header>

      {tab === 'tonight' ? <Tonight m={model} /> : <AlertsView m={model} dirty={dirty} />}

      {toastState && (
        <div className="toast" key={toastState.id} role="status">
          <span>{toastState.msg}</span>
          {toastState.undo && (
            <button
              className="toast-undo"
              onClick={() => {
                toastState.undo?.();
                setToastState(null);
              }}
            >
              <IconUndo size={15} /> Undo
            </button>
          )}
          <button className="toast-x" aria-label="Dismiss" onClick={() => setToastState(null)}>
            <IconX size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
