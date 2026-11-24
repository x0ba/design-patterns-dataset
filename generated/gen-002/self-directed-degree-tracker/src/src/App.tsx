import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Course, Exam, HourEntry, ORDER, PROGRAM, ProblemSet, TODAY, initialCourses } from './data';
import { isDone } from './logic';
import { Icon, StatusDot } from './ui';
import { CourseView } from './CourseView';
import { Panel } from './Panel';
import { ExamModal } from './ExamModal';
import { Overview } from './Overview';

export interface Actions {
  select: (id: string) => void;
  removeSet: (cid: string, sid: string) => void;
  keepBoth: (cid: string, ids: string[]) => void;
  saveSet: (cid: string, set: ProblemSet) => void;
  addSet: (cid: string, set: ProblemSet) => void;
  toggleChapter: (cid: string, n: number) => void;
  openExam: (cid: string) => void;
  removeExam: (cid: string, eid: string) => void;
  addHours: (cid: string, entry: HourEntry, resourceId?: string) => void;
  removeHours: (cid: string, hid: string) => void;
  record: (cid: string, kind: 'complete' | 'complete-gaps', gaps: string[], note: string) => void;
  reopen: (cid: string) => void;
  flash: (focus: string) => void;
  toast: (msg: string, undo?: () => void) => void;
}

interface Toast {
  id: number;
  msg: string;
  undo?: () => void;
}

export default function App() {
  const [courses, setCourses] = useState<Record<string, Course>>(initialCourses);
  const [view, setView] = useState<string>('MATH 220');
  const [examFor, setExamFor] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [focus, setFocus] = useState<{ key: string; n: number } | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const mutate = useCallback((cid: string, fn: (c: Course) => void) => {
    setCourses((prev) => {
      const next = { ...prev, [cid]: structuredClone(prev[cid]) };
      fn(next[cid]);
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string, undo?: () => void) => setToast({ id: Date.now(), msg, undo }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const actions: Actions = useMemo(
    () => ({
      select: (id) => {
        setView(id);
        mainRef.current?.scrollTo({ top: 0 });
      },
      removeSet: (cid, sid) => {
        let removed: ProblemSet | undefined;
        let index = 0;
        setCourses((prev) => {
          const c = prev[cid];
          index = c.problemSets.findIndex((p) => p.id === sid);
          removed = c.problemSets[index];
          return { ...prev, [cid]: { ...c, problemSets: c.problemSets.filter((p) => p.id !== sid) } };
        });
        setTimeout(() => {
          if (!removed) return;
          const r = removed;
          showToast(`Removed Ch. ${r.chapter} problem set logged ${r.loggedAt}.`, () =>
            mutate(cid, (c) => {
              c.problemSets.splice(index, 0, r);
            }),
          );
        });
      },
      keepBoth: (cid, ids) => {
        mutate(cid, (c) => c.problemSets.forEach((p) => ids.includes(p.id) && (p.keptIntentionally = true)));
        showToast('Kept both entries — counted as two separate attempts.', () =>
          mutate(cid, (c) => c.problemSets.forEach((p) => ids.includes(p.id) && (p.keptIntentionally = false))),
        );
      },
      saveSet: (cid, set) => mutate(cid, (c) => (c.problemSets = c.problemSets.map((p) => (p.id === set.id ? set : p)))),
      addSet: (cid, set) => {
        mutate(cid, (c) => {
          c.problemSets.push(set);
          c.problemSets.sort((a, b) => a.date.localeCompare(b.date));
        });
        showToast(`Added Ch. ${set.chapter} problem set (${set.correct}/${set.attempted}).`);
      },
      toggleChapter: (cid, n) =>
        mutate(cid, (c) => {
          const ch = c.chapters.find((x) => x.n === n);
          if (ch) ch.done = !ch.done;
        }),
      openExam: (cid) => setExamFor(cid),
      removeExam: (cid, eid) => {
        let removed: Exam | undefined;
        setCourses((prev) => {
          const c = prev[cid];
          removed = c.exams.find((e) => e.id === eid);
          return { ...prev, [cid]: { ...c, exams: c.exams.filter((e) => e.id !== eid) } };
        });
        setTimeout(() => removed && showToast(`Removed exam “${removed.title}”.`, () => mutate(cid, (c) => c.exams.push(removed!))));
      },
      addHours: (cid, entry, resourceId) => {
        mutate(cid, (c) => {
          c.extraHours.push(entry);
          const r = c.resources.find((x) => x.id === resourceId);
          if (r?.lectures) r.lectures.hoursLogged += entry.hours;
        });
        showToast(`Added ${entry.hours} h of ${entry.activity.toLowerCase()} to ${cid}.`, () =>
          mutate(cid, (c) => {
            c.extraHours = c.extraHours.filter((h) => h.id !== entry.id);
            const r = c.resources.find((x) => x.id === resourceId);
            if (r?.lectures) r.lectures.hoursLogged -= entry.hours;
          }),
        );
      },
      removeHours: (cid, hid) =>
        mutate(cid, (c) => {
          const h = c.extraHours.find((x) => x.id === hid);
          c.extraHours = c.extraHours.filter((x) => x.id !== hid);
          const r = c.resources.find((x) => x.lectures && h && h.note.startsWith(x.title));
          if (r?.lectures && h) r.lectures.hoursLogged -= h.hours;
        }),
      record: (cid, kind, gaps, note) => {
        mutate(cid, (c) => {
          c.status = kind;
          c.completedOn = TODAY;
          c.decision = { kind, on: TODAY, gaps, note };
        });
        showToast(kind === 'complete' ? `${cid} recorded as complete.` : `${cid} recorded as complete with ${gaps.length} gap${gaps.length === 1 ? '' : 's'}.`, () =>
          mutate(cid, (c) => {
            c.status = 'review';
            c.completedOn = undefined;
            c.decision = undefined;
          }),
        );
      },
      reopen: (cid) =>
        mutate(cid, (c) => {
          c.status = 'review';
          c.completedOn = undefined;
          c.decision = undefined;
        }),
      flash: (key) => setFocus((f) => ({ key, n: (f?.n ?? 0) + 1 })),
      toast: showToast,
    }),
    [mutate, showToast],
  );

  const list = ORDER.map((id) => courses[id]);
  const done = list.filter((c) => isDone(c.status));
  const doneCredits = done.reduce((s, c) => s + c.credits, 0);
  const reqCredits = list.reduce((s, c) => s + c.credits, 0);
  const current = view === 'overview' ? null : courses[view];

  const groups: { label: string; items: Course[] }[] = [
    { label: 'Needs attention', items: list.filter((c) => c.status === 'review') },
    { label: 'In progress', items: list.filter((c) => c.status === 'in-progress') },
    { label: 'Completed', items: list.filter((c) => isDone(c.status)) },
    { label: 'Not started', items: list.filter((c) => c.status === 'not-started') },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            <svg viewBox="0 0 32 32" width="26" height="26">
              <rect width="32" height="32" rx="7" fill="currentColor" />
              <path d="M9 22V10h8a4 4 0 010 8h-8" stroke="#fffdf8" strokeWidth="2.6" fill="none" />
            </svg>
          </span>
          Selfcourse
        </div>
        <div className="program">
          <span className="program-name">{PROGRAM.name}</span>
          <span className="muted">
            {PROGRAM.school} · {PROGRAM.catalog}
          </span>
        </div>
        <div className="top-progress" title={`${done.length} of ${list.length} required courses`}>
          <div className="tp-text">
            <strong>{done.length}</strong> of {list.length} required courses · <strong>{doneCredits}</strong>/{reqCredits} cr
          </div>
          <div className="tp-bar">
            {list.map((c) => (
              <span key={c.id} className={`tp-seg tp-${c.status}`} />
            ))}
          </div>
        </div>
        <div className="user">
          <span className="avatar">MB</span>
          <div>
            <div className="user-name">Marcus Bellweather</div>
            <div className="muted small">Studying since {PROGRAM.started}</div>
          </div>
        </div>
      </header>

      <nav className="sidebar">
        <button className={'nav-overview' + (view === 'overview' ? ' active' : '')} onClick={() => actions.select('overview')}>
          <Icon name="grid" /> Degree requirements
        </button>
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <div className="nav-group" key={g.label}>
                <div className="nav-label">
                  {g.label} <span>{g.items.length}</span>
                </div>
                {g.items.map((c) => (
                  <button key={c.id} className={'nav-item' + (view === c.id ? ' active' : '')} onClick={() => actions.select(c.id)}>
                    <StatusDot status={c.status} />
                    <span className="nav-code">{c.code}</span>
                    <span className="nav-title">{c.title}</span>
                    {c.id === 'MATH 151' && c.exams.length === 0 && <span className="nav-flag" title="No exam on record" />}
                  </button>
                ))}
              </div>
            ),
        )}
      </nav>

      <main className="main" ref={mainRef}>
        {current ? <CourseView key={current.id} course={current} all={courses} actions={actions} focus={focus} /> : <Overview courses={courses} actions={actions} />}
      </main>

      <aside className="panel">{current ? <Panel key={current.id} course={current} all={courses} actions={actions} /> : <OverviewPanel courses={courses} />}</aside>

      {examFor && (
        <ExamModal
          course={courses[examFor]}
          onClose={() => setExamFor(null)}
          onSave={(exam) => {
            mutate(examFor, (c) => {
              c.exams.push(exam);
              const s = c.notableSessions?.find((x) => x.examLike && x.date === exam.date);
              if (s) s.examLike = false;
            });
            showToast(`Logged ${examFor} ${exam.title.toLowerCase()}: ${exam.score}%.`);
            setExamFor(null);
          }}
        />
      )}

      {toast && (
        <div className="toast" key={toast.id} role="status">
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo!();
                setToast(null);
              }}
            >
              <Icon name="undo" size={14} /> Undo
            </button>
          )}
          <button className="toast-x" aria-label="Dismiss" onClick={() => setToast(null)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function OverviewPanel({ courses }: { courses: Record<string, Course> }) {
  const list = ORDER.map((id) => courses[id]);
  const req = list.reduce((s, c) => s + c.credits, 0);
  const gaps = list.filter((c) => c.status === 'complete-gaps').length;
  const noExam = list.filter((c) => isDone(c.status) && c.exams.length === 0);
  return (
    <div className="panel-inner">
      <h3 className="panel-h">Program scope</h3>
      <div className="scope">
        <div className="scope-row">
          <span>Required courses (tracked)</span>
          <strong>{req} cr</strong>
        </div>
        <div className="scope-row muted">
          <span>General education &amp; electives</span>
          <strong>{PROGRAM.totalCredits - req} cr</strong>
        </div>
        <div className="scope-row total">
          <span>Degree total</span>
          <strong>{PROGRAM.totalCredits} cr</strong>
        </div>
        <p className="small muted">You chose to track the 14 required major courses only. General education and elective credits are outside this record.</p>
      </div>
      <h3 className="panel-h">Record health</h3>
      <ul className="health">
        <li>
          <span className={'cicon ' + (noExam.length ? 'cicon-fail' : 'cicon-pass')}>
            <Icon name={noExam.length ? 'x' : 'check'} size={14} />
          </span>
          {noExam.length ? `${noExam.map((c) => c.code).join(', ')} marked complete with no exam on record` : 'Every completed course has an exam on record'}
        </li>
        <li>
          <span className={'cicon ' + (gaps ? 'cicon-warn' : 'cicon-pass')}>
            <Icon name={gaps ? 'alert' : 'check'} size={14} />
          </span>
          {gaps ? `${gaps} course${gaps > 1 ? 's' : ''} recorded with gaps` : 'No courses recorded with gaps'}
        </li>
      </ul>
    </div>
  );
}
