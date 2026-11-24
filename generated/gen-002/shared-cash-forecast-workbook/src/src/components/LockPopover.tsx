import { BLOCKED_ATTEMPT, LINES, lineById, person } from '../data';
import { useApp } from '../ctx';
import { fmtTime } from '../model';
import { Avatar } from './Avatar';
import { LockIcon } from './Grid';

export function LockPopover({ onClose }: { onClose: () => void }) {
  const { s, dispatch, now } = useApp();
  const lk = s.payrollLock;
  const payroll = LINES.filter((l) => l.group === 'payroll');
  const idleMin = Math.floor((now().getTime() - lk.lastActivity.getTime()) / 60e3);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="pop lock-pop" role="dialog" aria-label="Payroll lock">
        <div className="pop-head">
          <span className="lock-ico"><LockIcon /></span>
          <b>Payroll lines</b>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        {lk.holder ? (
          <>
            <div className="lock-holder">
              <Avatar id={lk.holder} size={30} ring />
              <div>
                <b>{person[lk.holder].name}</b> has these lines locked
                <div className="muted small">
                  Since {fmtTime(lk.since)} · last edit {fmtTime(lk.lastActivity)} ({idleMin <= 0 ? 'just now' : `${idleMin} min ago`}) · RN contract retro pay
                </div>
              </div>
            </div>
            <ul className="lock-lines">
              {payroll.map((l) => (
                <li key={l.id}>
                  {l.name} <span className="ent">{l.entity}</span>
                  <span className="muted small"> backup {person[l.backup!].first}</span>
                </li>
              ))}
            </ul>
            <div className="lock-blocked">
              <Avatar id={BLOCKED_ATTEMPT.by} size={16} />
              <span>
                <b>{person[BLOCKED_ATTEMPT.by].first}</b> (payroll backup) tried to edit {lineById[BLOCKED_ATTEMPT.lineId].name}, wk {BLOCKED_ATTEMPT.week + 1} at {fmtTime(BLOCKED_ATTEMPT.at)}. <span className="neg">Blocked</span>, nothing was overwritten.
              </span>
            </div>
            <label className="hold">
              <input type="checkbox" checked={lk.hold} onChange={() => dispatch({ type: 'toggleHold' })} />
              <span>
                <b>Hold the lock until {person[lk.holder].first} releases it</b>
                <span className="muted small">
                  {' '}By default an idle lock lapses after 20 minutes without an edit. Holding it keeps payroll protected while {person[lk.holder].first} reconciles to the register.
                </span>
              </span>
            </label>
          </>
        ) : (
          <p className="pad">Released by Raj at {fmtTime(lk.releasedAt!)}. Payroll lines are editable by their owner and backup again.</p>
        )}
      </div>
    </>
  );
}
