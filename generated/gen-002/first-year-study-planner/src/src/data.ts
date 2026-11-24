export type ItemType = 'reading' | 'assignment' | 'exam' | 'quiz' | 'other';
export type CourseId = 'psy101' | 'eng101' | 'math095' | 'coll100';

export interface Item {
  id: string;
  courseId: CourseId;
  type: ItemType;
  title: string;
  date: string;
  time?: string; // "HH:MM"
  remind?: boolean;
  seriesId?: string;
  lockedBy?: string; // added by an instructor, can't delete
}

export interface Series {
  id: string;
  courseId: CourseId;
  type: ItemType;
  label: string;
  days: number[];
  count: number;
}

export type SyllabusStep = 0 | 1 | 2 | 3;
export interface SyllabusState {
  status: 'not-started' | 'in-progress' | 'done';
  step: SyllabusStep;
  counts: Partial<Record<ItemType, number>> | null;
}

export interface Course {
  id: CourseId;
  code: string;
  name: string;
  instructor: string;
  days: number[];
  start: string;
  end: string;
  room: string;
  color: string;
  tint: string;
  credits: number;
  note?: string;
}

export interface Block {
  id: string;
  kind: 'work' | 'study' | 'prep' | 'coaching';
  title: string;
  sub?: string;
  // recurring blocks use days; one-off blocks use date
  days?: number[];
  date?: string;
  start: string;
  end: string;
  forItemId?: string;
}

export const COURSES: Course[] = [
  {
    id: 'psy101',
    code: 'PSY 101',
    name: 'Intro to Psychology',
    instructor: 'Dr. Kim',
    days: [2, 4],
    start: '09:30',
    end: '10:45',
    room: 'Bldg C, Rm 114',
    color: '#6D4BC2',
    tint: '#EFEAFB',
    credits: 3,
  },
  {
    id: 'eng101',
    code: 'ENG 101',
    name: 'College Composition',
    instructor: 'Prof. Adeyemi',
    days: [1, 3],
    start: '11:00',
    end: '12:15',
    room: 'Bldg A, Rm 207',
    color: '#C2523A',
    tint: '#FBEDE8',
    credits: 3,
  },
  {
    id: 'math095',
    code: 'MATH 095',
    name: 'Intermediate Algebra',
    instructor: 'Mr. Delgado',
    days: [1, 3, 5],
    start: '08:00',
    end: '08:50',
    room: 'Bldg D, Rm 102',
    color: '#2563A8',
    tint: '#E7F0FA',
    credits: 4,
    note: 'Online homework due every Sunday, 11:59 pm',
  },
  {
    id: 'coll100',
    code: 'COLL 100',
    name: 'College Success',
    instructor: 'Ms. Ortega',
    days: [4],
    start: '13:00',
    end: '14:15',
    room: 'Student Center 210',
    color: '#2F7D4F',
    tint: '#E6F3EA',
    credits: 1,
  },
];

export const courseById = (id: CourseId) => COURSES.find((c) => c.id === id)!;

export const TYPE_META: Record<ItemType, { label: string; plural: string; icon: string; hint: string }> = {
  reading: { label: 'Reading', plural: 'Readings', icon: '📖', hint: 'Read before class. Nothing to turn in.' },
  assignment: { label: 'Assignment', plural: 'Assignments', icon: '📝', hint: 'Something you turn in, like a paper or homework.' },
  exam: { label: 'Exam', plural: 'Exams', icon: '🎯', hint: 'Midterms, finals, and big tests.' },
  quiz: { label: 'Quiz', plural: 'Quizzes', icon: '✏️', hint: 'Short tests, in class or online.' },
  other: { label: 'Other', plural: 'Other', icon: '📌', hint: 'Anything else with a date: labs, presentations, events.' },
};

export const INITIAL_ITEMS: Item[] = [
  // PSY 101: what Jaylen has entered so far
  { id: 'p-r1', courseId: 'psy101', type: 'reading', title: 'Ch. 1, part 1', date: '2026-08-25', time: '09:30' },
  { id: 'p-r2', courseId: 'psy101', type: 'reading', title: 'Ch. 1, part 2', date: '2026-08-27', time: '09:30' },
  { id: 'p-e1', courseId: 'psy101', type: 'exam', title: 'Exam 1', date: '2026-09-17', time: '09:30', remind: false },
  { id: 'p-e2', courseId: 'psy101', type: 'exam', title: 'Exam 2', date: '2026-10-15', time: '09:30', remind: false },
  { id: 'p-e3', courseId: 'psy101', type: 'exam', title: 'Exam 3', date: '2026-11-12', time: '09:30', remind: false },
  { id: 'p-e4', courseId: 'psy101', type: 'exam', title: 'Final exam', date: '2026-12-10', time: '09:30', remind: false },
  { id: 'p-a1', courseId: 'psy101', type: 'assignment', title: 'Short paper 1', date: '2026-10-01', time: '09:30', remind: true },
  // Added to everyone's planner by Ms. Ortega
  {
    id: 'c-checkin',
    courseId: 'coll100',
    type: 'assignment',
    title: 'Week 2 check-in: term setup',
    date: '2026-09-01',
    time: '23:59',
    remind: true,
    lockedBy: 'Ms. Ortega',
  },
];

export const INITIAL_SYLLABI: Record<CourseId, SyllabusState> = {
  psy101: { status: 'in-progress', step: 2, counts: { reading: 30, exam: 4, assignment: 3 } },
  eng101: { status: 'not-started', step: 0, counts: null },
  math095: { status: 'not-started', step: 0, counts: null },
  coll100: { status: 'not-started', step: 0, counts: null },
};

export const INITIAL_BLOCKS: Block[] = [
  { id: 'w-fri', kind: 'work', title: 'Work', sub: 'Valley Fresh Market', days: [5], start: '16:00', end: '22:00' },
  { id: 'w-wknd', kind: 'work', title: 'Work', sub: 'Valley Fresh Market', days: [6, 0], start: '10:00', end: '16:00' },
  { id: 's-mw', kind: 'study', title: 'Study block', sub: 'Library, 2nd floor', days: [1, 3], start: '13:30', end: '15:30' },
];

export const CHECKIN = { date: '2026-09-01', time: '23:59', label: 'Week 2 check-in' };

export const STEP_DONE_DATES: Record<string, string> = {
  courses: '2026-08-26',
  work: '2026-08-27',
  study: '2026-08-27',
};

export const COACHING = {
  name: 'Peer Coaching, Tutoring Center',
  where: 'Learning Commons, Rm 120',
  hours: 'Mon–Thu, 10 am–6 pm',
  days: [1, 2, 3, 4],
  open: '10:00',
  close: '18:00',
};

/** Free, in-hours drop-in slots for Week 2 (precomputed around Jaylen's classes) */
export const COACHING_SLOTS = [
  { date: '2026-08-31', start: '12:30', end: '13:15' },
  { date: '2026-09-01', start: '11:00', end: '11:45' },
  { date: '2026-09-02', start: '16:00', end: '16:45' },
  { date: '2026-09-03', start: '15:00', end: '15:45' },
];
