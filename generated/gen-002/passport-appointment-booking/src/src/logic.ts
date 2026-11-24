import {
  BUFFER_DAYS,
  CLOSURE,
  CURRENCY,
  DELE_ROTA,
  EXPEDITED_WEEKS,
  EXPEDITE_FEE,
  MAIL_IN_WORKING_DAYS,
  MARISOL_WORK,
  OFFICES,
  Opening,
  RETURN_POST_WORKING_DAYS,
  SCHOOL_HOLIDAYS,
  SCHOOL_HOURS,
  SHIFTS,
  STANDARD_WEEKS,
  TODAY_ISO,
  TRIP_ISO,
} from './data';

/* ---------- dates ---------- */
export const pad = (n: number) => String(n).padStart(2, '0');
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const iso = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
export const addDays = (dt: Date, n: number) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtShort = (dt: Date) => `${DOW[dt.getDay()]} ${dt.getDate()} ${MON[dt.getMonth()]}`;
export const fmtDM = (dt: Date) => `${dt.getDate()} ${MON[dt.getMonth()]}`;
export const fmtLong = (dt: Date) => `${DOW_LONG[dt.getDay()]} ${dt.getDate()} ${MON_LONG[dt.getMonth()]} ${dt.getFullYear()}`;
export const fmtDayLong = (dt: Date) => `${DOW_LONG[dt.getDay()]} ${dt.getDate()} ${MON_LONG[dt.getMonth()]}`;
export const monShort = (dt: Date) => MON[dt.getMonth()];
export const dowShort = (dt: Date) => DOW[dt.getDay()];

export const TODAY = parse(TODAY_ISO);
export const TRIP = parse(TRIP_ISO);
export const TARGET = addDays(TRIP, -BUFFER_DAYS);

export const inRange = (dt: Date, r: { from: string; to: string }) => {
  const s = iso(dt);
  return s >= r.from && s <= r.to;
};
export const isClosed = (dt: Date) => inRange(dt, CLOSURE);
export const isWorkingDay = (dt: Date) => dt.getDay() !== 0 && dt.getDay() !== 6 && !isClosed(dt);
export const isSchoolDay = (dt: Date) => dt.getDay() >= 1 && dt.getDay() <= 5 && !inRange(dt, SCHOOL_HOLIDAYS);
export const mondayOf = (dt: Date) => addDays(dt, -((dt.getDay() + 6) % 7));

/* ---------- times ---------- */
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fmtMin = (m: number) => `${Math.floor(m / 60)}:${pad(m % 60)}`;
export const fmtTime = (hhmm: string) => fmtMin(toMin(hhmm));
export const fmtDur = (m: number) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (r === 0) return `${h} h`;
  return `${h} h ${r} min`;
};
const roughDur = (m: number) => {
  if (m < 50) return `${Math.round(m / 5) * 5} min`;
  const h = Math.round((m / 60) * 2) / 2;
  return `${h % 1 === 0 ? h : h.toFixed(1)} h`;
};
const overlap = (a: [number, number], b: [number, number]) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));

export const slotTimes = (o: Opening) => {
  const s = toMin(o.start);
  return { first: s, second: s + 20, end: s + 40 };
};

/* ---------- processing ---------- */
export type Readiness = 'ok' | 'tight' | 'late';

/** Delivery date: processing calendar days (paused during closure) then return post in working days. */
export function readyDate(fromIso: string, weeks: number): Date {
  let left = weeks * 7;
  let cur = parse(fromIso);
  while (left > 0) {
    cur = addDays(cur, 1);
    if (!isClosed(cur)) left--;
  }
  let bd = RETURN_POST_WORKING_DAYS;
  while (bd > 0) {
    cur = addDays(cur, 1);
    if (isWorkingDay(cur)) bd--;
  }
  return cur;
}

export const readinessOf = (worst: Date): Readiness => (worst <= TARGET ? 'ok' : worst < TRIP ? 'tight' : 'late');

export interface ProcessingOutcome {
  kind: 'standard' | 'expedited';
  best: Date;
  worst: Date;
  status: Readiness;
}
export function processing(fromIso: string, kind: 'standard' | 'expedited'): ProcessingOutcome {
  const [a, b] = kind === 'standard' ? STANDARD_WEEKS : EXPEDITED_WEEKS;
  const best = readyDate(fromIso, a);
  const worst = readyDate(fromIso, b);
  return { kind, best, worst, status: readinessOf(worst) };
}

/** Latest posting date for Marisol's mail renewal that still lands by TARGET on standard processing. */
export function mailRenewalPostBy(): Date {
  let last = TODAY;
  for (let i = 0; i < 60; i++) {
    const p = addDays(TODAY, i);
    if (!isWorkingDay(p)) continue;
    let arrive = p;
    let bd = MAIL_IN_WORKING_DAYS;
    while (bd > 0) {
      arrive = addDays(arrive, 1);
      if (isWorkingDay(arrive)) bd--;
    }
    if (readyDate(iso(arrive), STANDARD_WEEKS[1]) <= TARGET) last = p;
    else break;
  }
  return last;
}

/* ---------- evaluation ---------- */
export type Attendance = 'both' | 'consent';
export type CheckStatus = 'ok' | 'cost' | 'bad' | 'unknown' | 'na';
export interface Check {
  status: CheckStatus;
  short: string;
  detail: string;
  minutes?: number;
  window?: [number, number];
}

export interface Evaluation {
  opening: Opening;
  dateObj: Date;
  dele: Check;
  kids: Check;
  you: Check;
  std: ProcessingOutcome;
  exp: ProcessingOutcome;
  recommended: 'standard' | 'expedited' | null;
  extraCost: number;
  verdict: 'works' | 'check' | 'no';
  headline: string;
  tradeoffs: { key: string; label: string; tone: 'cost' | 'warn' | 'info' }[];
  score: number;
}

export function deleShift(dt: Date) {
  if (dt.getDay() === 0) return { kind: 'off' as const };
  const k = DELE_ROTA[iso(mondayOf(dt))];
  if (!k) return { kind: 'unknown' as const };
  return { kind: k, ...SHIFTS[k] };
}

export function evaluate(o: Opening, attendance: Attendance): Evaluation {
  const dt = parse(o.date);
  const office = OFFICES[o.office];
  const { first, end } = slotTimes(o);
  const leave = first - office.driveMin - 10; // arrive 10 min early
  const back = end + office.driveMin;
  const win: [number, number] = [leave, back];

  // Dele
  let dele: Check;
  const sh = deleShift(dt);
  if (attendance === 'consent') {
    dele = { status: 'na', short: 'Signs PC-3', detail: 'Not attending — you bring his signed consent form PC-3' };
  } else if (sh.kind === 'off') {
    dele = { status: 'ok', short: 'Day off', detail: 'Sunday — day off' };
  } else if (sh.kind === 'unknown') {
    dele = { status: 'unknown', short: 'Ask Dele', detail: 'His shifts after 20 Dec aren’t shared yet' };
  } else {
    const s: [number, number] = [toMin(sh.start), toMin(sh.end)];
    const ov = overlap(win, s);
    if (ov > 0) {
      dele = {
        status: 'bad',
        short: `${sh.label} shift`,
        detail:
          sh.kind === 'early'
            ? `Working ${fmtTime(sh.start)}–${fmtTime(sh.end)} (early week)`
            : `Late shift starts ${fmtTime(sh.start)} — he’d still be on the road`,
        window: win,
      };
    } else if (s[1] <= win[0]) {
      dele = { status: 'ok', short: 'Free', detail: `Early week — off at ${fmtTime(sh.end)}, ${fmtDur(win[0] - s[1])} spare`, window: win };
    } else {
      dele = { status: 'ok', short: 'Free', detail: `Late week — back by ${fmtMin(back)}, shift at ${fmtTime(sh.start)}`, window: win };
    }
  }

  // Kids
  let kids: Check;
  if (isSchoolDay(dt)) {
    const ov = overlap(win, [toMin(SCHOOL_HOURS.start), toMin(SCHOOL_HOURS.end)]);
    if (ov > 0) {
      const outFrom = Math.max(leave, toMin(SCHOOL_HOURS.start));
      const outTo = Math.min(back, toMin(SCHOOL_HOURS.end));
      kids = {
        status: 'cost',
        short: `Miss ~${roughDur(ov)}`,
        detail:
          outTo >= toMin(SCHOOL_HOURS.end)
            ? `Leave school at ${fmtMin(outFrom)}, ${fmtDur(toMin(SCHOOL_HOURS.end) - outFrom)} early`
            : `Out of school ${fmtMin(outFrom)}–${fmtMin(outTo)}`,
        minutes: ov,
        window: win,
      };
    } else {
      kids = { status: 'ok', short: 'After school', detail: `School ends ${fmtTime(SCHOOL_HOURS.end)}`, window: win };
    }
  } else {
    const why = dt.getDay() === 6 ? 'Saturday' : inRange(dt, SCHOOL_HOLIDAYS) ? 'School holidays' : 'No school';
    kids = { status: 'ok', short: 'No school', detail: why, window: win };
  }

  // Marisol
  let you: Check;
  if (isSchoolDay(dt)) {
    const ov = overlap(win, [toMin(MARISOL_WORK.start), toMin(MARISOL_WORK.end)]);
    if (ov > 0) {
      you = { status: 'cost', short: `~${roughDur(ov)} off`, detail: `Time off dispatch ${fmtMin(Math.max(leave, toMin(MARISOL_WORK.start)))}–${fmtMin(Math.min(back, toMin(MARISOL_WORK.end)))}`, minutes: ov, window: win };
    } else {
      you = { status: 'ok', short: 'Off work', detail: `Your shift ends ${fmtTime(MARISOL_WORK.end)}`, window: win };
    }
  } else {
    you = { status: 'ok', short: 'Off work', detail: dt.getDay() === 6 ? 'Saturday' : 'No bus runs in school holidays', window: win };
  }

  const std = processing(o.date, 'standard');
  const exp = processing(o.date, 'expedited');
  let recommended: Evaluation['recommended'] = null;
  if (std.status === 'ok') recommended = 'standard';
  else if (exp.status !== 'late') recommended = 'expedited';
  const extraCost = recommended === 'expedited' ? EXPEDITE_FEE * 2 : 0;

  let verdict: Evaluation['verdict'] = 'works';
  let headline = 'Works for everyone';
  if (dele.status === 'bad') {
    verdict = 'no';
    headline = 'Dele is working';
  } else if (!recommended) {
    verdict = 'no';
    headline = 'Too late, even expedited';
  } else if (dele.status === 'unknown') {
    verdict = 'check';
    headline = 'Check Dele’s shift';
  } else if (attendance === 'consent') {
    headline = 'Works with consent form';
  }

  const tradeoffs: Evaluation['tradeoffs'] = [];
  if (kids.status === 'cost') tradeoffs.push({ key: 'school', label: `Kids miss ~${roughDur(kids.minutes!)} school`, tone: 'cost' });
  if (you.status === 'cost') tradeoffs.push({ key: 'work', label: `You take ~${roughDur(you.minutes!)} off`, tone: 'cost' });
  if (recommended === 'expedited') tradeoffs.push({ key: 'exp', label: `Expedited +${CURRENCY}${extraCost}`, tone: 'cost' });
  const chosen = recommended === 'expedited' ? exp : std;
  if (recommended && chosen.status === 'tight') tradeoffs.push({ key: 'tight', label: `Tight — could arrive ${fmtDM(chosen.worst)}`, tone: 'warn' });
  if (attendance === 'consent' && verdict !== 'no') tradeoffs.push({ key: 'consent', label: 'Dele signs PC-3', tone: 'info' });

  const score =
    (verdict === 'works' ? 0 : verdict === 'check' ? 100 : 200) +
    tradeoffs.filter((t) => t.tone !== 'info').length * 10 +
    office.km / 10;

  return { opening: o, dateObj: dt, dele, kids, you, std, exp, recommended, extraCost, verdict, headline, tradeoffs, score };
}

export const timeRange = (o: Opening) => {
  const { first, second } = slotTimes(o);
  return `${fmtMin(first)} & ${fmtMin(second)}`;
};
