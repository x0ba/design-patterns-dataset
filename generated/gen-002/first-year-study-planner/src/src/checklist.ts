import { COURSES, STEP_DONE_DATES } from './data';
import type { State, View } from './store';
import { fmtShort } from './dates';

export interface Step {
  id: string;
  title: string;
  done: boolean;
  detail: string;
  doneOn?: string;
  progress?: [number, number];
  action?: { label: string; view?: View; kind?: 'share' | 'reminders' };
}

export function checklist(s: State): Step[] {
  const syllabiDone = COURSES.filter((c) => s.syllabi[c.id].status === 'done').length;
  const exams = s.items.filter((i) => i.type === 'exam');
  const examsOn = exams.filter((e) => e.remind).length;
  const remindersDone = s.examAutoRemind && exams.length > 0 && examsOn === exams.length;
  const nextCourse = COURSES.find((c) => s.syllabi[c.id].status === 'in-progress') ?? COURSES.find((c) => s.syllabi[c.id].status !== 'done');
  const weekDone = s.plannedWeeks.includes(2);

  return [
    { id: 'courses', title: 'Add your courses', done: true, doneOn: fmtShort(STEP_DONE_DATES.courses), detail: '4 courses, 11 credits' },
    { id: 'work', title: 'Add your work schedule', done: true, doneOn: fmtShort(STEP_DONE_DATES.work), detail: 'Fri 4–10 pm, Sat & Sun 10 am–4 pm (18 hrs/week)' },
    { id: 'study', title: 'Set a weekly study block', done: true, doneOn: fmtShort(STEP_DONE_DATES.study), detail: 'Mon & Wed, 1:30–3:30 pm, Library' },
    {
      id: 'syllabi',
      title: 'Import every syllabus',
      done: syllabiDone === COURSES.length,
      progress: [syllabiDone, COURSES.length],
      detail: syllabiDone === COURSES.length ? 'All 4 syllabi entered' : `${syllabiDone} of 4 done${nextCourse ? `. Next: ${nextCourse.code}` : ''}`,
      action: nextCourse ? { label: s.syllabi[nextCourse.id].status === 'in-progress' ? `Continue ${nextCourse.code}` : `Start ${nextCourse.code}`, view: { name: 'course', courseId: nextCourse.id } } : undefined,
    },
    {
      id: 'reminders',
      title: 'Set exam reminders',
      done: remindersDone,
      progress: [examsOn, exams.length],
      detail: remindersDone
        ? `On for all ${exams.length} exams. New exams get them automatically.`
        : exams.length === 0
          ? 'Add exam dates first'
          : `${examsOn} of ${exams.length} exams have reminders`,
      action: remindersDone || exams.length === 0 ? undefined : { label: 'Turn on for all exams', kind: 'reminders' },
    },
    {
      id: 'week',
      title: 'Plan a week',
      done: weekDone,
      detail: weekDone ? 'Week 2 planned' : 'Give each Week 2 item a time to work on it',
      action: weekDone ? undefined : { label: 'Plan Week 2', view: { name: 'week', week: 2 } },
    },
    {
      id: 'share',
      title: 'Share with your instructor',
      done: !!s.shared,
      detail: s.shared ? 'Ms. Ortega can see your plan' : 'Gives Ms. Ortega a read-only view',
      action: s.shared ? undefined : { label: 'Share with Ms. Ortega', kind: 'share' },
    },
  ];
}
