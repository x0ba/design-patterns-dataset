import type { Block, Course, CourseId, Item, ItemType } from './data';
import { COURSES } from './data';
import { TERM, addDays, closureOn, dow, fmtShort, parse, toMin, fromMin, weekStart } from './dates';

export type Naming = 'chapter' | 'chapter-read' | 'numbered' | 'same';

export interface Draft {
  type: ItemType;
  title: string;
  date: string;
  time: string;
  repeat: 'none' | 'weekly';
  days: number[];
  naming: Naming;
  chapterFrom: number;
  chapterTo: number;
  perChapter: number;
  until: string;
  skipClosures: boolean;
  skipExams: boolean;
}

export function blankDraft(course: Course): Draft {
  return {
    type: 'reading',
    title: '',
    date: '2026-08-31',
    time: course.start,
    repeat: 'none',
    days: [...course.days],
    naming: 'numbered',
    chapterFrom: 1,
    chapterTo: 10,
    perChapter: 1,
    until: '2026-12-08',
    skipClosures: true,
    skipExams: false,
  };
}

export const INITIAL_DRAFTS = (): Record<CourseId, Draft> => {
  const d = Object.fromEntries(COURSES.map((c) => [c.id, blankDraft(c)])) as Record<CourseId, Draft>;
  // Jaylen was halfway through typing his next PSY 101 reading when he got stuck.
  d.psy101 = {
    ...d.psy101,
    type: 'assignment',
    title: 'Read Ch. 2',
    date: '2026-09-01',
    time: '09:30',
    naming: 'chapter',
    chapterFrom: 2,
    chapterTo: 15,
    perChapter: 2,
  };
  d.math095 = { ...d.math095, type: 'assignment', title: 'Online homework', date: '2026-08-30', until: '2026-12-06', time: '23:59', days: [0], naming: 'numbered' };
  return d;
};

export interface GenResult {
  items: { title: string; date: string }[];
  skipped: { date: string; reason: string }[];
  overflow: number; // chapter mode: how many didn't fit before term end
  target: number;
}

const LAST_CLASS_DAY = '2026-12-11';

export function generate(draft: Draft, examDates: string[]): GenResult {
  const chapterMode = draft.naming === 'chapter' || draft.naming === 'chapter-read';
  const target = chapterMode ? Math.max(0, (draft.chapterTo - draft.chapterFrom + 1) * Math.max(1, draft.perChapter)) : Infinity;
  const end = chapterMode ? LAST_CLASS_DAY : draft.until < LAST_CLASS_DAY ? draft.until : LAST_CLASS_DAY;
  const items: { title: string; date: string }[] = [];
  const skipped: { date: string; reason: string }[] = [];
  if (draft.days.length === 0 || !draft.date) return { items, skipped, overflow: 0, target: chapterMode ? target : 0 };

  let d = draft.date;
  let n = 0;
  while (d <= end && items.length < target) {
    if (draft.days.includes(dow(d))) {
      const closure = closureOn(d);
      if (draft.skipClosures && closure) {
        skipped.push({ date: d, reason: `${closure.label}, campus closed` });
      } else if (draft.skipExams && examDates.includes(d)) {
        skipped.push({ date: d, reason: 'Exam day' });
      } else {
        items.push({ title: seriesTitle(draft, n), date: d });
        n++;
      }
    }
    d = addDays(d, 1);
  }
  const overflow = chapterMode ? target - items.length : 0;
  return { items, skipped, overflow, target: chapterMode ? target : items.length };
}

export function seriesTitle(draft: Draft, n: number): string {
  const per = Math.max(1, draft.perChapter);
  const ch = draft.chapterFrom + Math.floor(n / per);
  const part = (n % per) + 1;
  const base = draft.title.trim() || 'Item';
  switch (draft.naming) {
    case 'chapter':
      return per === 1 ? `Ch. ${ch}` : `Ch. ${ch}, part ${part}`;
    case 'chapter-read':
      return per === 1 ? `Read Ch. ${ch}` : `Read Ch. ${ch} (${part} of ${per})`;
    case 'numbered':
      return `${base} ${n + 1}`;
    case 'same':
      return base;
  }
}

export function seriesLabel(draft: Draft): string {
  const days = draft.days
    .slice()
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);
  return days.join(' & ');
}

// ── Week planning ─────────────────────────────────────────────

export interface CalEvent {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  sub?: string;
  kind: 'class' | 'work' | 'study' | 'prep' | 'coaching';
  color?: string;
  tint?: string;
  blockId?: string;
  courseId?: CourseId;
}

export function weekDates(week: number): string[] {
  const s = weekStart(week);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export function eventsForDate(date: string, blocks: Block[]): CalEvent[] {
  const out: CalEvent[] = [];
  const day = dow(date);
  const closed = closureOn(date);
  const inTerm = date >= TERM.start && date <= TERM.end;
  if (inTerm && !closed) {
    for (const c of COURSES) {
      if (c.days.includes(day)) {
        out.push({ id: `${c.id}-${date}`, date, start: c.start, end: c.end, title: c.code, sub: c.room, kind: 'class', color: c.color, tint: c.tint, courseId: c.id });
      }
    }
  }
  for (const b of blocks) {
    const applies = b.days ? b.days.includes(day) && (b.kind === 'work' || (!closed && inTerm)) : b.date === date;
    if (applies) {
      out.push({ id: `${b.id}-${date}`, date, start: b.start, end: b.end, title: b.title, sub: b.sub, kind: b.kind, blockId: b.id });
    }
  }
  return out.sort((a, b) => toMin(a.start) - toMin(b.start));
}

const PREFERRED = ['18:00', '19:00', '16:30', '20:00', '12:30', '15:45', '10:00', '21:00'];

export function findPrepSlot(item: Item, blocks: Block[], minDate: string): { date: string; start: string; end: string } | null {
  const dur = item.type === 'reading' ? 45 : item.type === 'exam' ? 90 : 90;
  const dueMin = toMin(item.time ?? '23:59');
  const candidates: string[] = [];
  // the due day itself only counts if it's due in the evening
  if (dueMin >= 17 * 60) candidates.push(item.date);
  for (let i = 1; i <= 6; i++) candidates.push(addDays(item.date, -i));
  for (const date of candidates) {
    if (date < minDate) continue;
    const events = eventsForDate(date, blocks);
    for (const s of PREFERRED) {
      const a = toMin(s);
      const b = a + dur;
      if (date === item.date && b > dueMin - 30) continue;
      const clash = events.some((e) => a < toMin(e.end) + 15 && b > toMin(e.start) - 15);
      if (!clash && b <= 22 * 60) return { date, start: s, end: fromMin(b) };
    }
  }
  return null;
}

export function minutes(e: { start: string; end: string }) {
  return toMin(e.end) - toMin(e.start);
}

export function relDue(date: string, today: string): string {
  const diff = Math.round((parse(date).getTime() - parse(today).getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff < 0) return `${fmtShort(date)} (past)`;
  return `in ${diff} days`;
}
