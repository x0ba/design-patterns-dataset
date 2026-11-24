import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { DRAFTED_DAYS, DayDef, PENDING_DAYS, POOL, RECIPES, SHOP_W1, SHOP_W2, SLOTS, SLOT_LABEL, ShopItem, Slot } from './data';
import { Issue, YogAnswer, dayIssues, dayTotals, itemChecks, leftoverOf } from './logic';

export type DayStatus = 'review' | 'accepted' | 'redrafting' | 'drafting' | 'queued';
export interface DayState {
  def: DayDef;
  status: DayStatus;
  version: number;
}

export type Block =
  | { p: string }
  | { ul: string[] }
  | { links: { label: string; day: number; slot?: Slot }[] };

export type Msg =
  | { id: string; kind: 'text'; who: 'rebecca' | 'assistant'; time: string; blocks: Block[] }
  | { id: string; kind: 'question'; time: string }
  | { id: string; kind: 'event'; time: string; text: string };

type DistOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

export type Phase = 'paused' | 'drafting' | 'shopping' | 'explainer' | 'done';
export type Tab = 'plan' | 'shopping' | 'explainer';

const BASE = new Date(2026, 10, 17, 20, 42, 0).getTime();
const LOADED = Date.now();
export function clock(offsetMin = 0) {
  const d = new Date(BASE + (Date.now() - LOADED) + offsetMin * 60000);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

let idc = 0;
const uid = () => `m${++idc}`;

export const YOG_LABEL: Record<Exclude<YogAnswer, null>, string> = {
  yes: 'Yes — he tolerates it. Use it as planned.',
  limit: 'He tolerates it in small amounts. Keep it to one serving a day.',
  no: 'No — leave lactose-free yogurt out of the plan.',
};

const INITIAL_THREAD: Msg[] = [
  {
    id: uid(), kind: 'text', who: 'rebecca', time: '7:52 pm',
    blocks: [
      { p: 'Draft Tom Brennan’s 14-day low-FODMAP elimination plan starting Mon Nov 23 — 3 meals and 2 snacks a day. Fit his intake record, basic cooking and about $120 a week for groceries. Add a week-by-week shopping list and a one-page explainer he can read. I’m sending it Friday.' },
    ],
  },
  {
    id: uid(), kind: 'text', who: 'assistant', time: '7:53 pm',
    blocks: [
      { p: 'Starting. I’m working from:' },
      { ul: [
        'Tom’s intake record (updated Nov 10) and your targets: 2,100 kcal, 95 g protein, 25–30 g fiber, carbs spread evenly across meals.',
        'Your standing rule: no recipes over 30 minutes on weekdays.',
        'The practice recipe bank (212 recipes) and the FODMAP serving reference. Each item cites its source and the serving I used.',
      ] },
      { p: 'Two assumptions — tell me if either is wrong:' },
      { ul: [
        'I’m leaving out all tree nuts, not just cashew and pistachio. Peanuts and seeds instead.',
        'Because of his rotating shifts, most dinners make a second portion for next-day lunch, and snacks are packable.',
      ] },
    ],
  },
  {
    id: uid(), kind: 'text', who: 'assistant', time: '8:21 pm',
    blocks: [
      { p: 'Days 1–9 are drafted (45 items), and the week 1 shopping list comes to about $104. I flagged 3 items I’m not sure about:' },
      { links: [
        { label: 'Day 4 breakfast — granola recipe uses honey', day: 4, slot: 'breakfast' },
        { label: 'Day 6 lunch — jarred pesto may contain cashew', day: 6, slot: 'lunch' },
        { label: 'Day 8 — fiber 19 g, under target', day: 8 },
      ] },
      { p: 'Day 4 is Thanksgiving. I planned it as a normal day since he may be on shift — you might want a line about the holiday in the explainer.' },
    ],
  },
  { id: uid(), kind: 'question', time: '8:24 pm' },
];

export interface Toast {
  id: number;
  text: string;
  undo?: boolean;
}

interface Snapshot {
  days: DayState[];
  overrides: Record<string, string>;
}

function useStoreValue() {
  const [days, setDays] = useState<DayState[]>(() => [
    ...DRAFTED_DAYS.map((d) => ({ def: d, status: 'review' as DayStatus, version: 1 })),
    ...PENDING_DAYS.map((d) => ({ def: d, status: 'queued' as DayStatus, version: 0 })),
  ]);
  const [yog, setYog] = useState<YogAnswer>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>('paused');
  const [thread, setThread] = useState<Msg[]>(INITIAL_THREAD);
  const [steer, setSteer] = useState<{ text: string; time: string }[]>([]);
  const [selected, setSelected] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('plan');
  const [recordOpen, setRecordOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [w1Snap, setW1Snap] = useState<string[]>(() => DRAFTED_DAYS.slice(0, 7).flatMap((d) => Object.values(d.slots)));
  const [w1Updating, setW1Updating] = useState(false);
  const [have, setHave] = useState<Set<string>>(new Set());
  const [w2, setW2] = useState<ShopItem[] | null>(null);
  const [explainer, setExplainer] = useState<'queued' | 'drafting' | 'drafted' | 'reviewed'>('queued');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const undoRef = useRef<Snapshot | null>(null);

  const ctx = useMemo(() => ({ yog }), [yog]);
  const defs = useMemo(() => days.map((d) => d.def), [days]);

  const issuesByDay = useMemo(() => {
    const m: Record<number, Issue[]> = {};
    days.forEach((d, i) => {
      if (d.status === 'queued' || d.status === 'drafting' || d.status === 'redrafting') m[d.def.n] = [];
      else m[d.def.n] = dayIssues(defs, i, ctx);
    });
    return m;
  }, [days, defs, ctx]);

  const openIssues = useCallback(
    (n: number) => (issuesByDay[n] || []).filter((x) => !overrides[x.key]),
    [issuesByDay, overrides],
  );

  const push = useCallback((m: DistOmit<Msg, 'id'>) => setThread((t) => [...t, { ...m, id: uid() } as Msg]), []);
  const say = useCallback((blocks: Block[]) => push({ kind: 'text', who: 'assistant', time: clock(), blocks }), [push]);
  const event = useCallback((text: string) => push({ kind: 'event', time: clock(), text }), [push]);

  const showToast = useCallback((text: string, undo = false) => setToast({ id: Date.now(), text, undo }), []);
  const snapshot = useCallback(() => {
    undoRef.current = { days, overrides };
  }, [days, overrides]);

  const undo = useCallback(() => {
    if (!undoRef.current) return;
    setDays(undoRef.current.days);
    setOverrides(undoRef.current.overrides);
    undoRef.current = null;
    setToast({ id: Date.now(), text: 'Undone' });
  }, []);

  const go = useCallback((n: number, slot?: Slot) => {
    setTab('plan');
    setSelected(n);
    setExpanded(slot ? `${n}:${slot}` : null);
  }, []);

  // ─── Day actions ─────────────────────────────
  const accept = useCallback(
    (n: number) => {
      snapshot();
      setDays((ds) => ds.map((d) => (d.def.n === n ? { ...d, status: 'accepted' } : d)));
      event(`You accepted Day ${n}`);
      showToast(`Day ${n} accepted`, true);
      // advance to the next day needing review
      const next = days.find((d) => d.def.n > n && d.status === 'review') || days.find((d) => d.status === 'review' && d.def.n !== n);
      if (next) {
        setSelected(next.def.n);
        setExpanded(null);
      }
    },
    [days, snapshot, event, showToast],
  );

  const reopen = useCallback(
    (n: number) => {
      setDays((ds) => ds.map((d) => (d.def.n === n ? { ...d, status: 'review' } : d)));
      event(`You reopened Day ${n}`);
    },
    [event],
  );

  const swapSlot = useCallback(
    (n: number, slot: Slot, to: string, why: string) => {
      snapshot();
      const from = days.find((d) => d.def.n === n)!.def.slots[slot];
      setDays((ds) =>
        ds.map((d) => (d.def.n === n ? { ...d, status: d.status === 'accepted' ? 'review' : d.status, def: { ...d.def, slots: { ...d.def.slots, [slot]: to } } } : d)),
      );
      event(`Day ${n} ${SLOT_LABEL[slot].toLowerCase()}: ${RECIPES[from].name} → ${RECIPES[to].name}${why ? ` (${why})` : ''}`);
      showToast(`Day ${n} ${SLOT_LABEL[slot].toLowerCase()} swapped`, true);
    },
    [days, snapshot, event, showToast],
  );

  const applyFix = useCallback(
    (iss: Issue) => {
      if (!iss.fix) return;
      swapSlot(iss.day, iss.fix.slot, iss.fix.to, 'applied fix');
    },
    [swapSlot],
  );

  const override = useCallback(
    (iss: Issue, note: string) => {
      snapshot();
      setOverrides((o) => ({ ...o, [iss.key]: note || 'Kept as drafted' }));
      event(`Day ${iss.day}: you kept “${iss.title}”${note ? ` — ${note}` : ''}`);
      showToast('Kept — noted on the plan', true);
    },
    [snapshot, event, showToast],
  );

  const clearOverride = useCallback((key: string) => {
    setOverrides((o) => {
      const c = { ...o };
      delete c[key];
      return c;
    });
  }, []);

  const reject = useCallback(
    (n: number, note: string) => {
      setDays((ds) => ds.map((d) => (d.def.n === n ? { ...d, status: 'redrafting' } : d)));
      push({ kind: 'text', who: 'rebecca', time: clock(), blocks: [{ p: `Rejected Day ${n}: ${note}` }] });
      setAssistantBusy(true);
      window.setTimeout(() => {
        setDays((ds) => {
          const idx = ds.findIndex((d) => d.def.n === n);
          const defsNow = ds.map((d) => d.def);
          const { slots, changed } = redraft(defsNow, idx, note, ds[idx].version, yog);
          const nd = ds.map((d, i) => (i === idx ? { ...d, status: 'review' as DayStatus, version: d.version + 1, def: { ...d.def, slots } } : d));
          const after = dayIssues(nd.map((d) => d.def), idx, { yog });
          const lines = changed.map((s) => `${SLOT_LABEL[s]}: ${RECIPES[ds[idx].def.slots[s]].name} → ${RECIPES[slots[s]].name}`);
          const t = dayTotals(nd[idx].def);
          window.setTimeout(() => {
            say([
              { p: `Redrafted Day ${n} (version ${ds[idx].version + 1}) based on your note.` },
              { ul: lines.length ? lines : ['No alternative in the recipe bank passed every rule for that day — kept the original. Try naming the meal to change.'] },
              { p: `Now ${t.kcal.toLocaleString()} kcal, ${t.p} g protein, ${t.fib} g fiber. ${after.length ? `Record check found ${after.length} issue${after.length > 1 ? 's' : ''} — see the day.` : 'Record check: no issues.'}` },
              { links: [{ label: `Open Day ${n}`, day: n }] },
            ]);
            setAssistantBusy(false);
          }, 0);
          return nd;
        });
      }, 2400);
    },
    [push, say, yog],
  );

  // ─── Assistant interaction ───────────────────
  const answerYog = useCallback(
    (a: Exclude<YogAnswer, null>, own?: string) => {
      const prev = yog;
      setYog(a);
      push({ kind: 'text', who: 'rebecca', time: clock(), blocks: [{ p: own || YOG_LABEL[a] }] });
      const affected = days
        .filter((d) => d.status !== 'queued')
        .flatMap((d) => SLOTS.filter((s) => RECIPES[d.def.slots[s]].ing.some((x) => x.tags?.includes('lfy'))).map((s) => ({ day: d.def.n, slot: s })));
      const where = affected.map((x) => `Day ${x.day} ${SLOT_LABEL[x.slot].toLowerCase()}`).join(', ');
      setAssistantBusy(true);
      window.setTimeout(() => {
        const interp = own ? [{ p: `I’m reading that as: “${YOG_LABEL[a]}” If that’s not right, change the answer above.` } as Block] : [];
        if (a === 'no') {
          say([
            ...interp,
            { p: `Got it — no lactose-free yogurt. ${affected.length ? `I’ve proposed swaps for the drafted items that use it (${where}). They’re on those days for you to apply.` : ''}` },
            ...(affected.length ? [{ links: affected.map((x) => ({ label: `Day ${x.day} ${SLOT_LABEL[x.slot].toLowerCase()}`, day: x.day, slot: x.slot })) } as Block] : []),
            { p: phase === 'paused' ? 'Days 10–14 will be yogurt-free. Resuming now.' : 'Undrafted days will be yogurt-free.' },
          ]);
        } else if (a === 'limit') {
          say([
            ...interp,
            { p: `Got it — at most one 170 g serving a day. ${affected.length ? `The drafted days already stay under that (${where}), so no changes.` : ''}` },
            { p: phase === 'paused' ? 'Resuming days 10–14 with the same limit.' : 'I’ll keep to that limit.' },
          ]);
        } else {
          say([
            ...interp,
            { p: `Got it — lactose-free yogurt stays in. ${affected.length ? `${where} are unchanged.` : ''}` },
            { p: phase === 'paused' ? 'Resuming days 10–14.' : '' },
          ]);
        }
        setAssistantBusy(false);
        if (phase === 'paused' && prev === null) setPhase('drafting');
      }, 1100);
    },
    [yog, days, push, say, phase],
  );

  const sendSteer = useCallback(
    (text: string) => {
      const t = clock();
      push({ kind: 'text', who: 'rebecca', time: t, blocks: [{ p: text }] });
      setSteer((s) => [...s, { text, time: t }]);
      setAssistantBusy(true);
      window.setTimeout(() => {
        const queued = days.filter((d) => d.status === 'queued').map((d) => d.def.n);
        if (phase === 'paused') {
          say([
            { p: `Noted for days ${queued[0]}–${queued[queued.length - 1]}: “${text}”. I’ve added it to the instructions for this plan.` },
            { p: 'I still need your answer on the yogurt question before I continue.' },
          ]);
        } else if (queued.length) {
          say([{ p: `Noted — applying “${text}” to days ${queued[0]}–${queued[queued.length - 1]} as I draft them.` }]);
        } else {
          say([
            { p: `Noted and added to this plan’s instructions. All 14 days are already drafted — to apply it to a day, reject that day with a note and I’ll redraft it.` },
          ]);
        }
        setAssistantBusy(false);
      }, 900);
    },
    [push, say, days, phase],
  );

  // ─── Drafting pipeline ───────────────────────
  useEffect(() => {
    if (phase !== 'drafting') return;
    const next = days.find((d) => d.status === 'queued');
    const inFlight = days.find((d) => d.status === 'drafting');
    if (inFlight) {
      const t = window.setTimeout(() => {
        setDays((ds) =>
          ds.map((d) => {
            if (d !== inFlight) return d;
            const slots = { ...d.def.slots };
            if (yog === 'no')
              for (const s of SLOTS) {
                const r = RECIPES[slots[s]];
                if (r.noYog && r.ing.some((x) => x.tags?.includes('lfy'))) slots[s] = r.noYog;
              }
            return { ...d, status: 'review', version: 1, def: { ...d.def, slots } };
          }),
        );
      }, 1500);
      return () => window.clearTimeout(t);
    }
    if (next) {
      setDays((ds) => ds.map((d) => (d === next ? { ...d, status: 'drafting' } : d)));
      return;
    }
    // all drafted
    const newDays = days.filter((d) => d.def.n >= 10);
    const iss = newDays.flatMap((d) => dayIssues(defs, days.indexOf(d), ctx));
    const fibs = newDays.map((d) => ({ n: d.def.n, f: dayTotals(d.def).fib }));
    const low = fibs.reduce((a, b) => (a.f <= b.f ? a : b));
    say([
      { p: 'Days 10–14 are drafted (25 items).' },
      {
        p: iss.length
          ? `Record check found ${iss.length} issue${iss.length > 1 ? 's' : ''}:`
          : `Record check against Tom’s file: no issues. Lowest fiber is Day ${low.n} at ${low.f} g, still inside 25–30 g.`,
      },
      ...(iss.length ? [{ links: iss.map((x) => ({ label: `Day ${x.day} — ${x.title}`, day: x.day, slot: x.slot === 'day' ? undefined : x.slot })) } as Block] : []),
      ...(steer.length ? [{ p: `Applied your instructions: ${steer.map((s) => `“${s.text}”`).join(', ')}.` } as Block] : []),
      { p: 'Starting the week 2 shopping list.' },
    ]);
    setPhase('shopping');
  }, [phase, days, yog, defs, ctx, say, steer]);

  useEffect(() => {
    if (phase === 'shopping') {
      const t = window.setTimeout(() => {
        const list = SHOP_W2.filter((x) => !(yog === 'no' && x.id === 'w2yogurt'));
        setW2(list);
        const total = list.reduce((a, b) => a + b.price, 0);
        say([
          { p: `Week 2 shopping list is ready — about $${total.toFixed(2)}. It’s lower than week 1 because pantry items (oats, seeds, garlic-infused oil, maple syrup) carry over.` },
          { p: 'Drafting the one-page explainer now.' },
        ]);
        setPhase('explainer');
        setExplainer('drafting');
      }, 1800);
      return () => window.clearTimeout(t);
    }
    if (phase === 'explainer') {
      const t = window.setTimeout(() => {
        setExplainer('drafted');
        say([
          { p: 'The explainer is drafted: one page, written at about a 7th-grade reading level. It covers what the elimination phase is, his go-to foods, label checks for his nut allergy, shift-work tips and a Thanksgiving note.' },
          { p: 'That’s everything in the task. Over to you for review — nothing goes to Tom until you send it.' },
        ]);
        setPhase('done');
      }, 2200);
      return () => window.clearTimeout(t);
    }
  }, [phase, yog, say]);

  // ─── Shopping ────────────────────────────────
  const w1Current = useMemo(() => days.slice(0, 7).flatMap((d) => Object.values(d.def.slots)), [days]);
  const w1Stale = useMemo(() => {
    const a = new Set(w1Current);
    const b = new Set(w1Snap);
    const added = [...a].filter((x) => !b.has(x));
    const removed = [...b].filter((x) => !a.has(x));
    return { added, removed };
  }, [w1Current, w1Snap]);

  const w1Items = useMemo(() => {
    const set = new Set(w1Snap);
    const base = SHOP_W1.filter((x) => x.for.some((r) => set.has(r)));
    const ids = new Set(base.map((x) => x.id));
    const extra: ShopItem[] = [];
    for (const r of set) {
      for (const line of RECIPES[r].shop || []) {
        if (!ids.has(line.id)) {
          ids.add(line.id);
          extra.push({ ...line, for: [r] });
        }
      }
    }
    return [...base, ...extra];
  }, [w1Snap]);

  const updateW1 = useCallback(() => {
    setW1Updating(true);
    const { added, removed } = w1Stale;
    window.setTimeout(() => {
      setW1Snap(w1Current);
      setW1Updating(false);
      say([
        { p: `Updated the week 1 shopping list for ${removed.length + added.length} plan change${removed.length + added.length === 1 ? '' : 's'}. Ingredients only the removed items needed are off the list; the new items are covered.` },
        { ul: [...added.map((r) => `Now covers: ${RECIPES[r].name}`), ...removed.map((r) => `No longer needed: ${RECIPES[r].name}`)] },
      ]);
    }, 1300);
  }, [w1Stale, w1Current, say]);

  const toggleHave = useCallback((id: string) => {
    setHave((h) => {
      const n = new Set(h);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  // readiness
  const readiness = useMemo(() => {
    const accepted = days.filter((d) => d.status === 'accepted').length;
    const open = days.reduce((a, d) => a + openIssues(d.def.n).length, 0);
    return {
      accepted,
      open,
      question: yog === null,
      w2: !!w2,
      w1Fresh: w1Stale.added.length === 0 && w1Stale.removed.length === 0,
      explainer,
      ready: accepted === 14 && open === 0 && yog !== null && !!w2 && w1Stale.added.length === 0 && w1Stale.removed.length === 0 && explainer === 'reviewed',
    };
  }, [days, openIssues, yog, w2, w1Stale, explainer]);

  return {
    days, defs, yog, ctx, overrides, phase, thread, steer, selected, setSelected, expanded, setExpanded, tab, setTab,
    recordOpen, setRecordOpen, sendOpen, setSendOpen, sent, setSent, toast, setToast, issuesByDay, openIssues,
    accept, reopen, reject, swapSlot, applyFix, override, clearOverride, answerYog, sendSteer, go, undo,
    w1Items, w1Stale, updateW1, w1Updating, have, toggleHave, w2, explainer, setExplainer, readiness, assistantBusy, event,
  };
}

function redraft(defs: DayDef[], idx: number, note: string, version: number, yog: YogAnswer) {
  const day = defs[idx];
  const lower = note.toLowerCase();
  const named = SLOTS.filter((s) => (s.startsWith('snack') ? /snack/.test(lower) : lower.includes(s)));
  let targets: Slot[] = named.length ? named : ['breakfast', 'lunch', 'dinner'];
  if (!named.includes('lunch') && leftoverOf(defs, idx, 'lunch')) targets = targets.filter((s) => s !== 'lunch');
  const next = defs[idx + 1];
  if (!named.includes('dinner') && next && next.slots.lunch === day.slots.dinner) targets = targets.filter((s) => s !== 'dinner');
  if (!targets.length) targets = ['breakfast', 'snack2'];
  const slots = { ...day.slots };
  const changed: Slot[] = [];
  const avoid = /tofu/.test(lower) ? 'tofu' : /egg/.test(lower) ? 'egg' : /chicken/.test(lower) ? 'chicken' : null;
  for (const s of targets) {
    const pool = POOL[s];
    for (let k = 0; k < pool.length; k++) {
      const cand = pool[(k + version) % pool.length];
      if (cand === slots[s]) continue;
      if (Object.values(slots).includes(cand)) continue;
      const prev = defs[idx - 1];
      if (prev && prev.slots[s] === cand) continue;
      if (next && next.slots[s] === cand) continue;
      if (avoid && RECIPES[cand].name.toLowerCase().includes(avoid)) continue;
      const tmp = { ...day, slots: { ...slots, [s]: cand } };
      const tmpDefs = defs.map((d, i) => (i === idx ? tmp : d));
      const checks = itemChecks(RECIPES[cand], tmp, leftoverOf(tmpDefs, idx, s), { yog });
      if (checks.some((c) => c.status === 'fail' || c.status === 'pending')) continue;
      const fib = SLOTS.reduce((a, sl) => a + RECIPES[tmp.slots[sl]].fib, 0);
      if (fib < 25 || fib > 31) continue;
      slots[s] = cand;
      changed.push(s);
      break;
    }
  }
  return { slots, changed };
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('no store');
  return v;
}
