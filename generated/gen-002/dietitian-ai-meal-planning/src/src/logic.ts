import { CLIENT, DayDef, RECIPES, Recipe, SLOTS, SLOT_LABEL, Slot } from './data';

export type YogAnswer = null | 'yes' | 'limit' | 'no';
export type RuleId = 'allergy' | 'fodmap' | 'fish' | 'time' | 'skill' | 'yogurt';

export const RULES: { id: RuleId; label: string; from: string }[] = [
  { id: 'allergy', label: 'Tree-nut allergy (cashew, pistachio)', from: 'Intake record · Allergies' },
  { id: 'fodmap', label: 'Low-FODMAP elimination servings', from: 'Plan type · FODMAP serving reference' },
  { id: 'time', label: 'No recipes over 30 min on weekdays', from: 'Your standing instruction' },
  { id: 'fish', label: 'Dislikes fish', from: 'Intake record · Preferences' },
  { id: 'skill', label: 'Basic cooking skill', from: 'Intake record · Lifestyle' },
  { id: 'yogurt', label: '“Occasional lactose-free yogurt”', from: 'Intake record · Diet history' },
];

export interface Check {
  rule: RuleId;
  status: 'pass' | 'fail' | 'pending' | 'na';
  detail: string;
}

export interface Ctx {
  yog: YogAnswer;
}

export function leftoverOf(days: DayDef[], idx: number, slot: Slot): number | null {
  if (slot !== 'lunch' || idx === 0) return null;
  const prev = days[idx - 1];
  if (prev && prev.slots.dinner === days[idx].slots.lunch) return prev.n;
  return null;
}

export function itemChecks(r: Recipe, day: DayDef, leftover: number | null, ctx: Ctx): Check[] {
  const out: Check[] = [];
  // allergy
  const nut = r.ing.find((x) => x.tags?.includes('treenut'));
  const maybe = r.ing.find((x) => x.tags?.includes('treenut-maybe'));
  if (nut) out.push({ rule: 'allergy', status: 'fail', detail: `${nut.n} is a tree nut.` });
  else if (maybe)
    out.push({
      rule: 'allergy',
      status: 'fail',
      detail: `${maybe.n}: brand not specified. Common garlic-free pestos use cashew in place of pine nuts.`,
    });
  else out.push({ rule: 'allergy', status: 'pass', detail: 'No tree nuts or tree-nut-derived ingredients.' });

  // fodmap
  const red = r.ing.filter((x) => x.f === 'red');
  const amber = r.ing.filter((x) => x.f === 'amber');
  if (red.length) out.push({ rule: 'fodmap', status: 'fail', detail: red.map((x) => `${x.n}: ${x.note}`).join(' ') });
  else if (amber.length) out.push({ rule: 'fodmap', status: 'fail', detail: amber.map((x) => `${x.n}: ${x.note}`).join(' ') });
  else out.push({ rule: 'fodmap', status: 'pass', detail: `All ${r.ing.length} ingredients within green servings.` });

  // time
  if (!day.weekday) out.push({ rule: 'time', status: 'na', detail: `${day.dow} — weekend, rule doesn’t apply (${r.total} min).` });
  else if (leftover)
    out.push({ rule: 'time', status: 'pass', detail: `Leftover from Day ${leftover} dinner — reheat only.` });
  else if (r.total > 30)
    out.push({
      rule: 'time',
      status: 'fail',
      detail: `${r.total} min total (${r.active} min hands-on) on a ${day.dow}. Your rule is no recipes over 30 minutes on weekdays.`,
    });
  else out.push({ rule: 'time', status: 'pass', detail: `${r.total} min total on a ${day.dow}.` });

  // fish
  const fish = r.ing.find((x) => x.tags?.includes('fish'));
  out.push(fish ? { rule: 'fish', status: 'fail', detail: `${fish.n}.` } : { rule: 'fish', status: 'pass', detail: 'No fish or seafood.' });

  // skill
  out.push(
    r.skill === 'basic'
      ? { rule: 'skill', status: 'pass', detail: 'Tagged basic in the recipe bank.' }
      : { rule: 'skill', status: 'fail', detail: 'Tagged intermediate.' },
  );

  // yogurt
  const y = r.ing.find((x) => x.tags?.includes('lfy'));
  if (y) {
    if (ctx.yog === null)
      out.push({ rule: 'yogurt', status: 'pending', detail: 'Uses lactose-free yogurt. Waiting on your answer about Tom’s tolerance.' });
    else if (ctx.yog === 'no')
      out.push({ rule: 'yogurt', status: 'fail', detail: 'Uses lactose-free yogurt — you said to leave it out.' });
    else if (ctx.yog === 'limit')
      out.push({ rule: 'yogurt', status: 'pass', detail: 'One serving (170 g) — within your one-a-day limit.' });
    else out.push({ rule: 'yogurt', status: 'pass', detail: 'You confirmed he tolerates it.' });
  }
  return out;
}

export interface DayTotals {
  kcal: number;
  p: number;
  c: number;
  fib: number;
  fat: number;
  cost: number;
  carbs: Record<Slot, number>;
}

export function dayTotals(day: DayDef): DayTotals {
  const t: DayTotals = { kcal: 0, p: 0, c: 0, fib: 0, fat: 0, cost: 0, carbs: {} as Record<Slot, number> };
  for (const s of SLOTS) {
    const r = RECIPES[day.slots[s]];
    t.kcal += r.kcal;
    t.p += r.p;
    t.c += r.c;
    t.fib += r.fib;
    t.fat += r.fat;
    t.cost += r.cost;
    t.carbs[s] = r.c;
  }
  return t;
}

export interface Issue {
  key: string;
  day: number;
  slot: Slot | 'day';
  rule: RuleId | 'fiber';
  title: string;
  detail: string;
  by: 'assistant' | 'record';
  pending?: boolean;
  fix?: { slot: Slot; to: string; label: string };
}

export const ASSISTANT_FLAGGED = new Set(['4:breakfast:fodmap', '6:lunch:allergy', '8:day:fiber']);

export function dayIssues(days: DayDef[], idx: number, ctx: Ctx): Issue[] {
  const day = days[idx];
  const out: Issue[] = [];
  for (const s of SLOTS) {
    const r = RECIPES[day.slots[s]];
    const lo = leftoverOf(days, idx, s);
    for (const c of itemChecks(r, day, lo, ctx)) {
      if (c.status !== 'fail' && c.status !== 'pending') continue;
      const key = `${day.n}:${s}:${c.rule}`;
      let fix: Issue['fix'];
      if (c.rule === 'yogurt' && r.noYog) {
        const alt = RECIPES[r.noYog];
        fix = { slot: s, to: r.noYog, label: `Swap to ${alt.name}` };
      } else if (r.fix && c.rule !== 'yogurt') fix = { slot: s, to: r.fix.to, label: r.fix.label };
      const ruleLabel: Record<RuleId, string> = {
        allergy: 'May contain cashew',
        fodmap: 'Above green FODMAP serving',
        time: 'Over 30 min on a weekday',
        fish: 'Contains fish',
        skill: 'Above basic skill',
        yogurt: c.status === 'pending' ? 'Depends on yogurt answer' : 'Contains lactose-free yogurt',
      };
      out.push({
        key,
        day: day.n,
        slot: s,
        rule: c.rule,
        title: `${SLOT_LABEL[s]} · ${ruleLabel[c.rule]}`,
        detail: c.detail,
        by: c.rule === 'yogurt' || ASSISTANT_FLAGGED.has(key) ? 'assistant' : 'record',
        pending: c.status === 'pending',
        fix,
      });
    }
  }
  const t = dayTotals(day);
  if (t.fib < CLIENT.targets.fibMin) {
    // find best snack swap to raise fiber
    const snackSlot: Slot = (['snack2', 'snack1'] as Slot[]).reduce((a, b) =>
      RECIPES[day.slots[a]].fib <= RECIPES[day.slots[b]].fib ? a : b,
    );
    const cur = RECIPES[day.slots[snackSlot]];
    const alt = RECIPES.kiwiChia;
    const gain = alt.fib - cur.fib;
    out.push({
      key: `${day.n}:day:fiber`,
      day: day.n,
      slot: 'day',
      rule: 'fiber',
      title: `Day total · Fiber ${t.fib} g, below ${CLIENT.targets.fibMin}–${CLIENT.targets.fibMax} g target`,
      detail: `Lowest-fiber item is the ${SLOT_LABEL[snackSlot].toLowerCase()} (${cur.name}, ${cur.fib} g).`,
      by: ASSISTANT_FLAGGED.has(`${day.n}:day:fiber`) ? 'assistant' : 'record',
      fix:
        cur.id !== alt.id
          ? { slot: snackSlot, to: alt.id, label: `Swap ${SLOT_LABEL[snackSlot].toLowerCase()} to ${alt.name} (+${gain} g → ${t.fib + gain} g)` }
          : undefined,
    });
  }
  return out;
}

export const fmt$ = (n: number) => `$${n.toFixed(2)}`;
