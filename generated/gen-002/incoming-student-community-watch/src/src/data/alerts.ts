import { SCENARIO_START, t } from './community';

export type CatId =
  | 'wellbeing' | 'safety' | 'money' | 'pii' | 'accounts'
  | 'conduct' | 'dining' | 'parking' | 'movein' | 'orientation';

export interface Category {
  id: CatId;
  label: string;
  desc: string;
  critical: boolean;
}

export const CATEGORIES: Category[] = [
  { id: 'wellbeing', label: 'Wellbeing & distress', desc: 'Hopelessness, self-harm language, “check on this student” reports', critical: true },
  { id: 'safety', label: 'Safety & threats', desc: 'Threats, stalking, harassment in DMs, hazing, weapons', critical: true },
  { id: 'money', label: 'Scams & money', desc: 'Deposits, payment requests, fake sublets, ticket resale, financial hardship', critical: true },
  { id: 'pii', label: 'Personal info exposure', desc: 'Other students’ phone numbers, addresses, IDs, screenshots of chats', critical: true },
  { id: 'accounts', label: 'Suspicious account bursts', desc: '3+ new accounts without an admissions record within an hour', critical: true },
  { id: 'conduct', label: 'Other conduct reports', desc: 'Rudeness, off-topic, duplicate posts, spam without payment terms', critical: false },
  { id: 'dining', label: 'Meal plans & dining', desc: 'Plan choices, swipes, dining dollars, dietary questions', critical: false },
  { id: 'parking', label: 'Parking & transportation', desc: 'Permits, move-in day parking, transit passes', critical: false },
  { id: 'movein', label: 'Move-in & housing logistics', desc: 'Time slots, shipping, what to bring, room furniture', critical: false },
  { id: 'orientation', label: 'Orientation & registration', desc: 'Session times, ID photos, advising, placement exams', critical: false },
];
export const catById = (id: CatId) => CATEGORIES.find((c) => c.id === id)!;

export type Route = 'now' | 'digest' | 'leaders' | 'off';
export type EscalateTo = 'none' | 'backup' | 'dos';

export interface Rules {
  routes: Record<CatId, Route>;
  includeDetections: boolean;
  digestHours: 1 | 2 | 4 | 8;
  quietEnabled: boolean;
  quietStart: number; // hour
  quietEnd: number;
  quietExceptions: CatId[];
  channels: { desk: boolean; push: boolean; sms: boolean };
  sessionMode: 'same' | 'sms';
  escalateAfter: 0 | 5 | 10 | 15;
  escalateTo: EscalateTo;
}

export const CURRENT_RULES: Rules = {
  routes: {
    wellbeing: 'now', safety: 'now', money: 'now', pii: 'now', accounts: 'digest',
    conduct: 'now', dining: 'now', parking: 'now', movein: 'now', orientation: 'now',
  },
  includeDetections: false,
  digestHours: 2,
  quietEnabled: true,
  quietStart: 23,
  quietEnd: 7,
  quietExceptions: ['wellbeing'],
  channels: { desk: true, push: true, sms: false },
  sessionMode: 'same',
  escalateAfter: 0,
  escalateTo: 'none',
};

export const SUGGESTED_RULES: Rules = {
  routes: {
    wellbeing: 'now', safety: 'now', money: 'now', pii: 'now', accounts: 'now',
    conduct: 'leaders', dining: 'leaders', parking: 'leaders', movein: 'leaders', orientation: 'leaders',
  },
  includeDetections: true,
  digestHours: 2,
  quietEnabled: true,
  quietStart: 23,
  quietEnd: 7,
  quietExceptions: ['wellbeing', 'safety', 'money'],
  channels: { desk: true, push: true, sms: true },
  sessionMode: 'sms',
  escalateAfter: 10,
  escalateTo: 'backup',
};

export const ESCALATE_LABEL: Record<EscalateTo, string> = {
  none: 'No one',
  backup: 'Malik Hassan · Associate Director (backup)',
  dos: 'Dean of Students on-call',
};

/* ---------------- Event history for the replay ---------------- */

export interface AlertEvent {
  id: string;
  at: number;
  cat: CatId;
  source: 'report' | 'detection';
  text: string;
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_TEXT: Record<CatId, string[]> = {
  wellbeing: ['Report: “someone may be in distress” in a residence hall group', 'Distress language in a First-Gen 2030 post'],
  safety: ['Report: repeated unwanted DMs after being asked to stop'],
  money: ['Report: sublet offer asking for a deposit', 'Report: ticket resale with CashApp only', 'Payment terms from an unverified account'],
  pii: ['Report: screenshot of a group chat with phone numbers', 'Report: dorm room number posted publicly'],
  accounts: ['3 accounts without admissions match in 40 min'],
  conduct: ['Report: off-topic political argument', 'Report: duplicate roommate post', 'Report: rude reply in Orientation Q&A'],
  dining: ['Report “needs staff answer”: meal plan switch deadline', 'Report “needs staff answer”: dining dollars vs swipes', 'Report “incorrect info”: meal plan price'],
  parking: ['Report “needs staff answer”: first-year parking permits', 'Report “needs staff answer”: move-in day unloading', 'Report “incorrect info”: commuter permit price'],
  movein: ['Report “needs staff answer”: move-in slot email', 'Report “needs staff answer”: shipping boxes to halls', 'Report “incorrect info”: early arrival dates'],
  orientation: ['Report “needs staff answer”: ID photo location', 'Report “needs staff answer”: placement exam deadline'],
};

const HOUR_WEIGHTS = [1, 1, 0.5, 0.3, 0.2, 0.2, 0.4, 1, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 6, 6, 5, 4, 2];

function generateEvents(): AlertEvent[] {
  const rnd = mulberry32(20300813);
  const ev: AlertEvent[] = [];
  const pickHour = () => {
    const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let h = 0; h < 24; h++) { r -= HOUR_WEIGHTS[h]; if (r <= 0) return h; }
    return 20;
  };
  const perDay: Record<CatId, [number, number]> = {
    dining: [5, 8], parking: [4, 7], movein: [5, 9], orientation: [3, 6], conduct: [2, 4],
    money: [0, 2], pii: [0, 1], wellbeing: [0, 0], safety: [0, 0], accounts: [0, 0],
  };
  let n = 0;
  for (let d = -6; d <= -1; d++) {
    (Object.keys(perDay) as CatId[]).forEach((cat) => {
      const [lo, hi] = perDay[cat];
      const count = lo + Math.floor(rnd() * (hi - lo + 1));
      for (let i = 0; i < count; i++) {
        const h = pickHour();
        const m = Math.floor(rnd() * 60);
        const texts = SAMPLE_TEXT[cat];
        ev.push({ id: `e${n++}`, at: t(h, m, d), cat, source: 'report', text: texts[Math.floor(rnd() * texts.length)] });
      }
    });
  }
  // fixed notable earlier events
  ev.push({ id: `e${n++}`, at: t(0, 41, -5), cat: 'wellbeing', source: 'report', text: 'Report: student posting about not sleeping, “can’t do this”' });
  ev.push({ id: `e${n++}`, at: t(16, 12, -3), cat: 'safety', source: 'report', text: 'Report: repeated unwanted DMs after being asked to stop' });
  ev.push({ id: `e${n++}`, at: t(21, 58, -2), cat: 'wellbeing', source: 'detection', text: 'Distress language in First-Gen 2030 (resolved by staff next morning)' });
  ev.push({ id: `e${n++}`, at: t(14, 3, -4), cat: 'accounts', source: 'detection', text: '3 accounts without admissions match in 40 min (a family, redirected)' });

  // Today, fixed to match the queue
  const today: [number, number, CatId, AlertEvent['source'], string][] = [
    [1, 12, 'dining', 'report', 'Report “needs staff answer”: meal plan switch deadline'],
    [2, 30, 'parking', 'report', 'Report “needs staff answer”: first-year parking permits'],
    [7, 41, 'movein', 'report', 'Report “needs staff answer”: move-in slot email'],
    [8, 5, 'dining', 'report', 'Report “incorrect info”: dining dollars price'],
    [8, 22, 'orientation', 'report', 'Report “needs staff answer”: ID photo location'],
    [8, 47, 'conduct', 'report', 'Report: duplicate roommate post in Marisol Towers'],
    [9, 38, 'accounts', 'detection', '6 accounts without admissions match in 26 min'],
    [9, 58, 'money', 'report', 'Report: “cheap room” post in Hartwell Hall 2030'],
    [10, 21, 'money', 'report', 'Report: DM asking for a $300 Zelle deposit'],
    [10, 40, 'money', 'report', 'Report: housing post in Class of 2030 General'],
    [10, 49, 'wellbeing', 'detection', 'Distress language in Hartwell Hall 2030'],
    [11, 2, 'wellbeing', 'report', 'Report: “someone may be in distress” in Hartwell Hall 2030'],
    [11, 7, 'pii', 'report', 'Report: phone numbers posted in Roommate Search 2030'],
    [11, 15, 'money', 'report', 'Report: DM asking for a Zelle deposit by tonight'],
    [11, 31, 'pii', 'report', 'Report: second comment with phone numbers, same thread'],
  ];
  today.forEach(([h, m, cat, source, text]) => ev.push({ id: `e${n++}`, at: t(h, m), cat, source, text }));
  return ev.filter((e) => e.at <= SCENARIO_START).sort((a, b) => a.at - b.at);
}

export const EVENTS = generateEvents();

// Renée's orientation sessions this week (from calendar sync)
export const SESSIONS: [number, number][] = [
  [t(9, 0, -6), t(12, 0, -6)],
  [t(8, 30, -3), t(11, 45, -3)], [t(13, 30, -3), t(15, 0, -3)],
  [t(8, 30, -2), t(11, 45, -2)], [t(13, 30, -2), t(15, 0, -2)],
  [t(8, 30, -1), t(11, 45, -1)], [t(13, 30, -1), t(15, 0, -1)],
  [t(8, 30), t(11, 45)],
];
export const inSession = (at: number) => SESSIONS.some(([a, b]) => at >= a && at < b);

/* ---------------- Simulation ---------------- */

export interface SimResult {
  interrupts: AlertEvent[];
  deferred: AlertEvent[]; // 'now' but held by quiet hours until morning
  digest: AlertEvent[];
  leaders: AlertEvent[];
  off: AlertEvent[];
  ignoredDetections: AlertEvent[];
  criticalNotImmediate: AlertEvent[];
  sessionCritical: AlertEvent[];
  routineInterrupts: number;
  perDay: { label: string; count: number }[];
}

const inQuiet = (at: number, r: Rules) => {
  if (!r.quietEnabled) return false;
  const h = new Date(at).getHours();
  return r.quietStart > r.quietEnd ? h >= r.quietStart || h < r.quietEnd : h >= r.quietStart && h < r.quietEnd;
};

export function simulate(r: Rules, from: number): SimResult {
  const res: SimResult = {
    interrupts: [], deferred: [], digest: [], leaders: [], off: [], ignoredDetections: [],
    criticalNotImmediate: [], sessionCritical: [], routineInterrupts: 0, perDay: [],
  };
  const days = new Map<string, number>();
  for (let d = new Date(from); d.getTime() <= SCENARIO_START; d.setDate(d.getDate() + 1)) {
    days.set(d.toDateString(), 0);
  }
  for (const e of EVENTS) {
    if (e.at < from) continue;
    const cat = catById(e.cat);
    if (e.source === 'detection' && !r.includeDetections && e.cat !== 'accounts') {
      res.ignoredDetections.push(e);
      if (cat.critical) res.criticalNotImmediate.push(e);
      continue;
    }
    const route = r.routes[e.cat];
    if (route === 'now') {
      if (inQuiet(e.at, r) && !r.quietExceptions.includes(e.cat)) {
        res.deferred.push(e);
        if (cat.critical) res.criticalNotImmediate.push(e);
      } else {
        res.interrupts.push(e);
        if (!cat.critical) res.routineInterrupts++;
        if (cat.critical && inSession(e.at)) res.sessionCritical.push(e);
        const key = new Date(e.at).toDateString();
        days.set(key, (days.get(key) ?? 0) + 1);
      }
    } else {
      if (cat.critical) res.criticalNotImmediate.push(e);
      if (route === 'digest') res.digest.push(e);
      else if (route === 'leaders') res.leaders.push(e);
      else res.off.push(e);
    }
  }
  res.perDay = [...days.entries()].map(([k, count]) => ({
    label: new Date(k).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    count,
  }));
  return res;
}

export const WINDOWS = [
  { id: 'today', label: 'Since 9:00 today', from: t(9, 0) },
  { id: 'week', label: 'Last 7 days', from: t(0, 0, -6) },
] as const;
