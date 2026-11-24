import { COURSES, TYPE_META } from '../data';
import { Icon } from '../Icon';
import { checklist, type Step } from '../checklist';
import { useStore } from '../store';
import { CheckinCountdown } from '../rail/Rail';

export function ChecklistView() {
  const { s, d, toast } = useStore();
  const steps = checklist(s);
  const done = steps.filter((x) => x.done).length;
  const exams = s.items.filter((i) => i.type === 'exam');

  const runAction = (st: Step) => {
    if (!st.action) return;
    if (st.action.view) d({ type: 'nav', view: st.action.view });
    if (st.action.kind === 'share') d({ type: 'modal', modal: 'share' });
    if (st.action.kind === 'reminders') {
      d({ type: 'remindAllExams' });
      toast(`Reminders on for ${exams.length} exams: 1 week and 1 day before`, { undoable: true });
    }
  };

  return (
    <div className="page checklist-page">
      <header className="page-head">
        <div>
          <div className="eyebrow">COLL 100 · Ms. Ortega</div>
          <h1>Your term setup</h1>
          <p className="muted">Seven steps to finish before the Week 2 check-in. Each step checks itself off when you finish it.</p>
        </div>
        <CheckinCountdown done={done} />
      </header>

      <ol className="big-steps">
        {steps.map((st, i) => (
          <li key={st.id} className={`big-step${st.done ? ' done' : ''}`}>
            <div className="bs-num">{st.done ? <Icon name="check" size={16} stroke={3} /> : i + 1}</div>
            <div className="bs-body">
              <div className="bs-title">
                <h2>{st.title}</h2>
                {st.done && st.doneOn && <span className="muted sm">Done {st.doneOn}</span>}
                {st.done && !st.doneOn && <span className="muted sm">Done</span>}
              </div>
              <div className="bs-detail">{st.detail}</div>

              {st.id === 'syllabi' && (
                <ul className="syl-rows">
                  {COURSES.map((c) => {
                    const syl = s.syllabi[c.id];
                    const items = s.items.filter((x) => x.courseId === c.id && !x.lockedBy);
                    const want = Object.values(syl.counts ?? {}).reduce((a, b) => a + (b ?? 0), 0);
                    return (
                      <li key={c.id}>
                        <span className="course-dot" style={{ background: c.color }} />
                        <span className="syl-code">{c.code}</span>
                        <span className="syl-name">{c.name}</span>
                        <span className={`syl-state ${syl.status}`}>
                          {syl.status === 'done' ? 'Done' : syl.status === 'in-progress' ? `In progress · ${items.length} of ${want} items` : 'Not started'}
                        </span>
                        <button className="btn sm" onClick={() => d({ type: 'nav', view: { name: 'course', courseId: c.id } })}>
                          {syl.status === 'done' ? 'View' : syl.status === 'in-progress' ? 'Continue' : 'Start'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {st.id === 'reminders' && exams.length > 0 && (
                <ul className="exam-chips">
                  {exams.map((e) => (
                    <li key={e.id} className={e.remind ? 'on' : ''}>
                      <Icon name={e.remind ? 'bell' : 'bellOff'} size={13} /> {COURSES.find((c) => c.id === e.courseId)!.code} {e.title}
                    </li>
                  ))}
                </ul>
              )}

              {!st.done && st.action && (
                <div className="bs-actions">
                  <button className={`btn${i === steps.findIndex((x) => !x.done) ? ' primary' : ''}`} onClick={() => runAction(st)}>
                    {st.action.label} <Icon name="arrowR" />
                  </button>
                  {st.id === 'reminders' && <button className="link sm" onClick={() => d({ type: 'help', article: 'exam-reminders' })}>How exam reminders work</button>}
                  {st.id === 'share' && <button className="link sm" onClick={() => d({ type: 'help', article: 'share' })}>What will she see?</button>}
                  {st.id === 'week' && <button className="link sm" onClick={() => d({ type: 'help', article: 'plan-week' })}>Plan a week in 3 moves</button>}
                  {st.id === 'syllabi' && <button className="link sm" onClick={() => d({ type: 'help', article: 'repeating' })}>Add repeating {TYPE_META.reading.plural.toLowerCase()} fast</button>}
                </div>
              )}
              {st.id === 'share' && st.done && (
                <div className="bs-actions">
                  <button className="link sm" onClick={() => d({ type: 'unshare' })}>Stop sharing</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
