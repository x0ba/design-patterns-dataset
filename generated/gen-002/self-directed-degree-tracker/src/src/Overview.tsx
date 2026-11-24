import { Course, ORDER, PROGRAM, RULES } from './data';
import { expectedHours, fmtDate, fmtH, isDone, totalHours } from './logic';
import { Icon, StatusPill } from './ui';
import type { Actions } from './App';

export function Overview({ courses, actions }: { courses: Record<string, Course>; actions: Actions }) {
  const list = ORDER.map((id) => courses[id]);
  const done = list.filter((c) => isDone(c.status));
  const hours = list.reduce((s, c) => s + totalHours(c), 0);
  const counts = {
    complete: list.filter((c) => c.status === 'complete').length,
    gaps: list.filter((c) => c.status === 'complete-gaps').length,
    active: list.filter((c) => c.status === 'in-progress' || c.status === 'review').length,
    todo: list.filter((c) => c.status === 'not-started').length,
  };

  return (
    <div className="course">
      <div className="course-code">
        {PROGRAM.school} · {PROGRAM.catalog}
      </div>
      <h1>Degree requirements</h1>
      <p className="catalog">
        <span className="catalog-label">Target program</span>
        {PROGRAM.name}, {PROGRAM.totalCredits} credits. You’re tracking the {list.length} required major courses and their prerequisites, using the published catalog as your guide.
      </p>

      <div className="stats">
        <div className="stat static">
          <span className="stat-label">Complete</span>
          <span className="stat-val">
            {done.length}
            <small>/{list.length}</small>
          </span>
          <span className="stat-sub">
            {counts.complete} clean{counts.gaps ? ` · ${counts.gaps} with gaps` : ''}
          </span>
        </div>
        <div className="stat static">
          <span className="stat-label">Active</span>
          <span className="stat-val">{counts.active}</span>
          <span className="stat-sub">{list.filter((c) => c.status === 'review' || c.status === 'in-progress').map((c) => c.code).join(', ')}</span>
        </div>
        <div className="stat static">
          <span className="stat-label">Not started</span>
          <span className="stat-val">{counts.todo}</span>
          <span className="stat-sub">{list.filter((c) => c.status === 'not-started').map((c) => c.code).join(', ')}</span>
        </div>
        <div className="stat static">
          <span className="stat-label">Hours logged</span>
          <span className="stat-val">
            {Math.round(hours).toLocaleString()}
            <small> h</small>
          </span>
          <span className="stat-sub">since {PROGRAM.started}</span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>
            Required courses <span className="count">{list.length}</span>
          </h2>
          <span className="hint">Click a course to open its record</span>
        </div>
        <div className="table-wrap">
          <table className="sets req">
            <thead>
              <tr>
                <th>Course</th>
                <th className="num">Cr</th>
                <th>Prerequisites</th>
                <th>Status</th>
                <th className="num">Exams</th>
                <th className="num">Hours</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const flags: string[] = [];
                if (isDone(c.status) && c.exams.length === 0) flags.push('No exam on record');
                if (c.exams.some((e) => e.score < RULES.examMin)) flags.push(`Exam below ${RULES.examMin}%`);
                const [lo] = expectedHours(c);
                const h = totalHours(c);
                if (isDone(c.status) && h < lo) flags.push('Hours below range');
                if (c.status === 'review') flags.push('Awaiting your decision');
                const blockedBy = c.prereqs.filter((p) => !isDone(courses[p].status));
                if (c.status === 'not-started' && blockedBy.length) flags.push(`Waiting on ${blockedBy.join(', ')}`);
                if (c.decision?.gaps.length) flags.push(`${c.decision.gaps.length} recorded gap${c.decision.gaps.length > 1 ? 's' : ''}`);
                return (
                  <tr key={c.id} className="clickable" onClick={() => actions.select(c.id)}>
                    <td>
                      <div className="nav-code">{c.code}</div>
                      <div>{c.title}</div>
                    </td>
                    <td className="num">{c.credits}</td>
                    <td className="muted">{c.prereqs.join(', ') || '—'}</td>
                    <td>
                      <StatusPill status={c.status} />
                      {c.completedOn && isDone(c.status) && <div className="muted small">{fmtDate(c.completedOn, true)}</div>}
                    </td>
                    <td className="num nowrap">{c.exams.length ? c.exams.map((e) => e.score + '%').join(', ') : c.status === 'not-started' ? '' : '—'}</td>
                    <td className="num">{h ? fmtH(h) : ''}</td>
                    <td>
                      {flags.map((f) => (
                        <span key={f} className={'flag' + (f.startsWith('No exam') || f.startsWith('Exam below') ? ' flag-fail' : f.startsWith('Waiting') ? ' flag-soft' : '')}>
                          {f}
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted footnote">
          <Icon name="info" size={13} /> Hours range is {RULES.hoursPerCreditMin}–{RULES.hoursPerCreditMax} h per credit. Exam rule: {RULES.examMin}% minimum on every timed exam, set {RULES.examRuleSet}.
        </p>
      </section>
    </div>
  );
}
