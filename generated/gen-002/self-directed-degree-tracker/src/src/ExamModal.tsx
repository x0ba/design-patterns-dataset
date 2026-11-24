import { useEffect, useState } from 'react';
import { Course, Exam, RULES, TODAY } from './data';
import { fmtDate } from './logic';
import { Icon } from './ui';

interface Props {
  course: Course;
  onClose: () => void;
  onSave: (e: Exam) => void;
}

export function ExamModal({ course: c, onClose, onSave }: Props) {
  const hint = c.notableSessions?.find((s) => s.examLike);
  const sourceFromHint = hint?.label.match(/\(([^)]+)\)/)?.[1];
  const [title, setTitle] = useState(c.exams.length ? 'Practice exam' : 'Final');
  const [source, setSource] = useState(sourceFromHint ? `${sourceFromHint.replace(/^Cascade State /, `Cascade State ${c.code} exam archive — `)}` : '');
  const [date, setDate] = useState(hint?.date ?? '');
  const [minutes, setMinutes] = useState<string>(hint ? String(hint.hours * 60) : '');
  const [earned, setEarned] = useState('');
  const [possible, setPossible] = useState('100');
  const [timed, setTimed] = useState(true);
  const [closed, setClosed] = useState(true);
  const [selfGraded, setSelfGraded] = useState(true);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const e = parseFloat(earned);
  const p = parseFloat(possible);
  const scoreValid = e >= 0 && p > 0 && e <= p;
  const score = scoreValid ? Math.round((e / p) * 100) : null;
  const ok = scoreValid && source.trim() && date && parseInt(minutes) > 0 && title.trim();

  const sources = [
    `Cascade State ${c.code} exam archive — `,
    ...c.resources.filter((r) => r.kind === 'ocw').map((r) => `MIT ${r.title.split(' ')[0]} — `),
  ];

  return (
    <div className="modal-backdrop" onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal aria-labelledby="exam-h">
        <div className="modal-head">
          <div>
            <div className="course-code">
              {c.code} · {c.title}
            </div>
            <h2 id="exam-h">Log a timed exam</h2>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        {hint && (
          <div className="callout callout-info">
            <Icon name="info" />
            <div>
              Prefilled from your hours log: <strong>{fmtDate(hint.date)}</strong>, {hint.hours} h — “{hint.label}”. Enter the score from your graded copy.
            </div>
          </div>
        )}

        <form
          className="modal-body"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!ok || score === null) return;
            const cond = [timed && 'Timed', closed ? 'closed book' : 'open book', selfGraded && 'self-graded against posted solutions'].filter(Boolean).join(', ');
            onSave({
              id: 'x' + Date.now(),
              title: title.trim(),
              source: source.trim(),
              date,
              timeLimitMin: parseInt(minutes),
              score,
              pointsEarned: e,
              pointsPossible: p,
              conditions: cond.charAt(0).toUpperCase() + cond.slice(1),
            });
          }}
        >
          <div className="field-row">
            <label className="field">
              <span>Exam</span>
              <select value={title} onChange={(ev) => setTitle(ev.target.value)}>
                {['Final', 'Midterm', 'Practice exam', 'Unit exam'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date taken</span>
              <input type="date" value={date} max={TODAY} onChange={(ev) => setDate(ev.target.value)} required />
            </label>
            <label className="field">
              <span>Time limit (min)</span>
              <input type="number" min={1} value={minutes} onChange={(ev) => setMinutes(ev.target.value)} required />
            </label>
          </div>

          <label className="field">
            <span>Source</span>
            <input value={source} onChange={(ev) => setSource(ev.target.value)} placeholder="Where the exam came from" required />
          </label>
          {!source && (
            <div className="chips">
              {sources.map((s) => (
                <button type="button" key={s} className="chip" onClick={() => setSource(s)}>
                  {s.replace(/ — $/, '')}…
                </button>
              ))}
            </div>
          )}

          <div className="field-row score-row">
            <label className="field">
              <span>Points earned</span>
              <input type="number" step="0.5" min={0} value={earned} onChange={(ev) => setEarned(ev.target.value)} autoFocus placeholder="—" />
            </label>
            <span className="of">of</span>
            <label className="field">
              <span>Points possible</span>
              <input type="number" min={1} value={possible} onChange={(ev) => setPossible(ev.target.value)} />
            </label>
            <div className={'score-preview' + (score === null ? '' : score >= RULES.examMin ? ' ok' : ' low')}>
              {score === null ? (
                earned && !scoreValid ? (
                  <span className="err">Earned can’t exceed possible</span>
                ) : (
                  <span className="muted">Score</span>
                )
              ) : (
                <>
                  <strong>{score}%</strong>
                  <span>{score >= RULES.examMin ? `Meets your ${RULES.examMin}% rule` : `Below your ${RULES.examMin}% rule`}</span>
                </>
              )}
            </div>
          </div>

          <fieldset className="conds">
            <legend>Conditions</legend>
            <label>
              <input type="checkbox" checked={timed} onChange={(ev) => setTimed(ev.target.checked)} /> Timed
            </label>
            <label>
              <input type="checkbox" checked={closed} onChange={(ev) => setClosed(ev.target.checked)} /> Closed book
            </label>
            <label>
              <input type="checkbox" checked={selfGraded} onChange={(ev) => setSelfGraded(ev.target.checked)} /> Self-graded against posted solutions
            </label>
          </fieldset>

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!ok}>
              Save exam to {c.code}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
