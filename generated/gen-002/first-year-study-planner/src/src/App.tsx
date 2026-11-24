import { useEffect, useState } from 'react';
import { COURSES, courseById } from './data';
import { TERM, weekOf, TODAY, NOW } from './dates';
import { Icon } from './Icon';
import { useStore } from './store';
import { checklist } from './checklist';
import { SyllabusView } from './views/Syllabus';
import { ChecklistView } from './views/Checklist';
import { WeekView } from './views/Week';
import { Rail } from './rail/Rail';
import { Tour, TOUR_STEPS } from './Tour';
import { ShareModal, CoachingModal } from './Modals';

export default function App() {
  const { s } = useStore();
  const title =
    s.view.name === 'course' ? `${courseById(s.view.courseId).code} syllabus` : s.view.name === 'week' ? `Week ${s.view.week}` : 'Setup checklist';
  useEffect(() => {
    document.title = `${title} · Firstweek Planner`;
  }, [title]);

  return (
    <div className={`shell${s.railOpen ? '' : ' rail-closed'}`}>
      <Sidebar />
      <div className="center">
        <TopBar />
        <main className="main" id="main">
          {s.view.name === 'course' && <SyllabusView key={s.view.courseId} courseId={s.view.courseId} />}
          {s.view.name === 'checklist' && <ChecklistView />}
          {s.view.name === 'week' && <WeekView week={s.view.week} />}
        </main>
      </div>
      {s.railOpen && <Rail />}
      <Toasts />
      {s.tourStep !== null && <Tour />}
      {s.modal === 'share' && <ShareModal />}
      {s.modal === 'coaching' && <CoachingModal />}
    </div>
  );
}

function Sidebar() {
  const { s, d } = useStore();
  const steps = checklist(s);
  const done = steps.filter((x) => x.done).length;
  const week = weekOf(TODAY);
  const is = (name: string, id?: string) =>
    s.view.name === name && (!id || (s.view.name === 'course' && s.view.courseId === id)) ? ' active' : '';

  return (
    <nav className="sidebar" aria-label="Main">
      <div className="brand">
        <img src="./favicon.svg" alt="" width={28} height={28} />
        <div>
          <div className="brand-name">Firstweek</div>
          <div className="brand-sub">Study & deadline planner</div>
        </div>
      </div>

      <div className="term-card" data-tour="term">
        <div className="term-top">
          <span>{TERM.name}</span>
          <span className="term-week">Week {week} of {TERM.weeks}</span>
        </div>
        <div className="term-bar" aria-hidden="true">
          {Array.from({ length: TERM.weeks }, (_, i) => (
            <span key={i} className={i + 1 < week ? 'past' : i + 1 === week ? 'now' : ''} />
          ))}
        </div>
        <div className="term-dates">Aug 24 – Dec 11</div>
      </div>

      <div className="nav-group">
        <button className={`nav-item${is('checklist')}`} onClick={() => d({ type: 'nav', view: { name: 'checklist' } })} data-tour="checklist-nav">
          <Icon name="list" />
          <span>Setup checklist</span>
          <span className="nav-count">{done}/7</span>
        </button>
        <button className={`nav-item${is('week')}`} onClick={() => d({ type: 'nav', view: { name: 'week', week: 2 } })} data-tour="week">
          <Icon name="calendar" />
          <span>Week planner</span>
        </button>
      </div>

      <div className="nav-label" data-tour="courses">
        Courses
        <span className="nav-label-hint">syllabus</span>
      </div>
      <div className="nav-group courses-group" data-tour="courses-list">
        {COURSES.map((c) => {
          const st = s.syllabi[c.id].status;
          return (
            <button key={c.id} className={`nav-item course${is('course', c.id)}`} onClick={() => d({ type: 'nav', view: { name: 'course', courseId: c.id } })}>
              <span className="course-dot" style={{ background: c.color }} />
              <span className="course-nav-text">
                <span className="course-code">{c.code}</span>
                <span className="course-name">{c.name}</span>
              </span>
              <span className={`syl-status ${st}`} title={st === 'done' ? 'Syllabus entered' : st === 'in-progress' ? 'Syllabus in progress' : 'Syllabus not started'}>
                {st === 'done' ? <Icon name="check" size={12} stroke={3} /> : st === 'in-progress' ? '' : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="sidebar-foot">
        <button className="nav-item" onClick={() => d({ type: 'help', article: null })}>
          <Icon name="help" />
          <span>Help & tutoring</span>
        </button>
        <UserMenu />
      </div>
    </nav>
  );
}

function UserMenu() {
  const { d } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="user">
      <button className="user-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="avatar">JB</span>
        <span className="user-text">
          <span className="user-name">Jaylen Brooks</span>
          <span className="user-sub">COLL 100 · Ms. Ortega</span>
        </span>
        <Icon name="chevronD" size={14} />
      </button>
      {open && (
        <div className="user-pop" role="menu">
          <button
            role="menuitem"
            onClick={() => {
              if (confirm('Reset the demo to Sunday evening, Week 1? Everything you changed will be cleared.')) {
                localStorage.clear();
                d({ type: 'reset' });
              }
              setOpen(false);
            }}
          >
            Reset demo data
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const { s, d } = useStore();
  const crumbs: string[] =
    s.view.name === 'course'
      ? ['Courses', `${courseById(s.view.courseId).code}`, 'Syllabus']
      : s.view.name === 'week'
        ? ['Week planner', `Week ${s.view.week}`]
        : ['Setup checklist'];
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);
  const ago = s.savedAt ? Math.round((Date.now() - s.savedAt) / 1000) : null;
  const savedText = ago === null ? 'All changes saved' : ago < 10 ? 'Saved just now' : ago < 60 ? 'Saved a moment ago' : `Saved ${Math.round(ago / 60)} min ago`;

  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i} className={i === crumbs.length - 1 ? 'crumb current' : 'crumb'}>
            {c}
            {i < crumbs.length - 1 && <Icon name="chevronR" size={13} />}
          </span>
        ))}
      </div>
      <div className="topbar-right">
        <span className="saved" aria-live="polite">
          <Icon name="check" size={13} stroke={2.5} /> {savedText}
        </span>
        <span className="now">Sun, Aug 30 · {NOW.getHours() - 12}:{String(NOW.getMinutes()).padStart(2, '0')} pm</span>
        {s.tourResumeAt <= TOUR_STEPS.length && (
          <button className="btn ghost sm" onClick={() => d({ type: 'tour', step: s.tourResumeAt })}>
            <Icon name="play" size={12} /> Resume tour · step {s.tourResumeAt} of {TOUR_STEPS.length}
          </button>
        )}
        <button
          className={`btn help-btn${s.railOpen && s.rail === 'help' ? ' on' : ''}`}
          data-tour="help"
          onClick={() => (s.railOpen && s.rail === 'help' ? d({ type: 'rail', tab: 'checklist' }) : d({ type: 'help', article: s.helpArticle }))}
          aria-pressed={s.railOpen && s.rail === 'help'}
        >
          <Icon name="help" size={16} /> Help
        </button>
        {!s.railOpen && (
          <button className="btn ghost sm icon-only" title="Show side panel" onClick={() => d({ type: 'railOpen', open: true })}>
            <Icon name="panel" />
          </button>
        )}
      </div>
    </header>
  );
}

function Toasts() {
  const { toasts, dismiss, d } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <Icon name={t.tone === 'info' ? 'info' : 'check'} size={16} stroke={2.5} />
          <span>{t.text}</span>
          {t.undo && (
            <button
              className="toast-undo"
              onClick={() => {
                d({ type: 'restore', snap: t.undo! });
                dismiss(t.id);
              }}
            >
              Undo
            </button>
          )}
          <button className="toast-x" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
