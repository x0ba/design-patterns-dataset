import { useState } from 'react';
import { Course, RULES } from './data';
import { Check, fmtDate, isDone, runChecks } from './logic';
import { CheckIcon, Icon, STATUS_LABEL } from './ui';
import type { Actions } from './App';

interface Props {
  course: Course;
  all: Record<string, Course>;
  actions: Actions;
}

export function Panel({ course: c, all, actions }: Props) {
  const checks = runChecks(c, all);
  const blocks = checks.filter((k) => k.state === 'block');
  const gaps = checks.filter((k) => k.state === 'fail' || k.state === 'warn');
  const [mode, setMode] = useState<'idle' | 'gaps'>('idle');
  const [note, setNote] = useState('');

  if (c.status === 'not-started') {
    return (
      <div className="panel-inner">
        <h3 className="panel-h">Not started</h3>
        <p className="small muted">Completion checks run once you log work for {c.code}.</p>
        <Rules />
      </div>
    );
  }

  const reviewing = c.status === 'review';
  const heading = reviewing ? 'Completion check' : isDone(c.status) ? 'Record standing' : 'Progress check';
  const openCount = blocks.length + gaps.length;

  return (
    <div className="panel-inner">
      <div className="panel-top">
        <h3 className="panel-h">{heading}</h3>
        <span className={'panel-count ' + (blocks.length ? 'block' : gaps.length ? 'warn' : 'pass')}>{openCount === 0 ? 'All clear' : `${openCount} open`}</span>
      </div>
      {reviewing && <p className="small muted panel-lede">You asked to mark {c.code} complete on {fmtDate('2026-11-17')}. Here’s how the record stands.</p>}

      <ul className="checks">
        {checks.map((k) => (
          <CheckRow key={k.id + k.title} k={k} c={c} actions={actions} />
        ))}
      </ul>

      {reviewing && (
        <div className="decide">
          <div className="decide-h">Record this course as</div>
          {blocks.length > 0 ? (
            <div className="decide-blocked">
              <Icon name="block" size={16} />
              <span>{blocks[0].id === 'dupes' ? 'Resolve the duplicate problem set first — it changes your totals.' : `Can’t record yet: ${blocks[0].title.toLowerCase()}.`}</span>
            </div>
          ) : null}

          <button className={'choice' + (gaps.length === 0 && blocks.length === 0 ? ' ready' : '')} disabled={blocks.length > 0 || gaps.length > 0} onClick={() => actions.record(c.id, 'complete', [], note.trim())}>
            <span className="choice-icon pass">
              <Icon name="check" size={16} />
            </span>
            <span className="choice-body">
              <span className="choice-title">Complete</span>
              <span className="choice-sub">{gaps.length ? `Unavailable while ${gaps.length} gap${gaps.length > 1 ? 's are' : ' is'} open` : blocks.length ? 'Unavailable until blockers are fixed' : 'Every check passes'}</span>
            </span>
          </button>

          <button className={'choice' + (mode === 'gaps' ? ' selected' : '')} disabled={blocks.length > 0 || gaps.length === 0} onClick={() => setMode(mode === 'gaps' ? 'idle' : 'gaps')}>
            <span className="choice-icon warn">
              <Icon name="alert" size={16} />
            </span>
            <span className="choice-body">
              <span className="choice-title">Complete with gaps</span>
              <span className="choice-sub">{gaps.length ? `Counts toward the degree; ${gaps.length > 1 ? `the ${gaps.length} gaps stay` : 'the gap stays'} visible on your record` : 'No gaps to record'}</span>
            </span>
          </button>

          {mode === 'gaps' && gaps.length > 0 && blocks.length === 0 && (
            <div className="gap-form">
              <div className="small strong">These will be recorded with the course:</div>
              <ul className="gap-list">
                {gaps.map((g) => (
                  <li key={g.title}>{g.gapLabel}</li>
                ))}
              </ul>
              <label className="small strong" htmlFor="gapnote">
                Your note <span className="muted">(why it still counts, what you’ll do)</span>
              </label>
              <textarea id="gapnote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Exam scores are solid; I under-logged lecture time early on. Will revisit Ch. 9 before MATH 411." />
              <div className="gap-actions">
                <span className="small muted">{note.trim().length < 15 ? `${15 - note.trim().length} more characters` : 'Ready'}</span>
                <button className="btn btn-warn-solid" disabled={note.trim().length < 15} onClick={() => actions.record(c.id, 'complete-gaps', gaps.map((g) => g.gapLabel!), note.trim())}>
                  Record with {gaps.length} gap{gaps.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          <button className="btn btn-ghost btn-block" onClick={() => actions.toast(`Draft saved. ${c.code} stays in completion review.`)}>
            Keep as draft for now
          </button>
        </div>
      )}

      {c.decision && (
        <div className={'decision decision-' + c.decision.kind}>
          <div className="decision-h">
            <Icon name={c.decision.kind === 'complete' ? 'check' : 'alert'} size={16} />
            Recorded as {STATUS_LABEL[c.decision.kind].toLowerCase()} · {fmtDate(c.decision.on)}
          </div>
          {c.decision.gaps.length > 0 && (
            <ul className="gap-list">
              {c.decision.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
          {c.decision.note && <blockquote>{c.decision.note}</blockquote>}
          <div className="decision-actions">
            {c.decision.kind === 'complete-gaps' && openCount === 0 && (
              <button className="btn btn-sm btn-primary" onClick={() => actions.record(c.id, 'complete', [], c.decision!.note)}>
                Gaps resolved — upgrade to complete
              </button>
            )}
            <button className="btn btn-sm btn-ghost" onClick={() => actions.reopen(c.id)}>
              Reopen review
            </button>
          </div>
        </div>
      )}

      {!c.decision && isDone(c.status) && c.completedOn && (
        <div className="small muted standing-note">
          {STATUS_LABEL[c.status]} since {fmtDate(c.completedOn)}.
          {c.legacyNote && c.exams.length === 0 && <> Recorded before your exam rule — it doesn’t meet the rule today.</>}
        </div>
      )}

      <Rules />
    </div>
  );
}

function CheckRow({ k, c, actions }: { k: Check; c: Course; actions: Actions }) {
  let action: React.ReactNode = null;
  if (k.state !== 'pass') {
    if (k.id === 'prereq') {
      const pid = c.prereqs.find((p) => k.title.includes(p));
      action = pid && (
        <>
          {k.title.includes('no exam') && (
            <button className="btn btn-sm btn-primary" onClick={() => actions.openExam(pid)}>
              Log {pid} exam
            </button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={() => actions.select(pid)}>
            Open {pid}
          </button>
        </>
      );
    } else if (k.id === 'dupes') {
      action = (
        <button className="btn btn-sm" onClick={() => actions.flash('sets')}>
          Review problem sets
        </button>
      );
    } else if (k.id === 'hours') {
      action = (
        <button className="btn btn-sm" onClick={() => actions.flash('hours')}>
          Check for unlogged time
        </button>
      );
    } else if (k.id === 'exams') {
      action = (
        <button className="btn btn-sm btn-primary" onClick={() => actions.openExam(c.id)}>
          Log exam
        </button>
      );
    } else if (k.id === 'coverage') {
      action = (
        <button className="btn btn-sm" onClick={() => actions.flash('chapters')}>
          Review chapters
        </button>
      );
    }
  }
  const severity = k.state === 'block' ? 'Must fix' : k.state === 'fail' ? 'Gap' : k.state === 'warn' ? 'Gap' : null;
  return (
    <li className={'check check-' + k.state}>
      <CheckIcon state={k.state} />
      <div className="check-body">
        <div className="check-title">
          {k.title}
          {severity && <span className={'sev sev-' + k.state}>{severity}</span>}
        </div>
        <div className="check-detail">{k.detail}</div>
        {action && <div className="check-actions">{action}</div>}
      </div>
    </li>
  );
}

function Rules() {
  return (
    <div className="rules">
      <div className="rules-h">Your rules</div>
      <div className="rule">
        <strong>{RULES.examMin}% minimum</strong> on every timed exam to count a course complete
        <span className="muted"> · set {RULES.examRuleSet}</span>
      </div>
      <div className="rule">
        <strong>
          {RULES.hoursPerCreditMin}–{RULES.hoursPerCreditMax} hours per credit
        </strong>{' '}
        as the expected workload
      </div>
    </div>
  );
}
