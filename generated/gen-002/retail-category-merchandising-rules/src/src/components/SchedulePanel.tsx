import { useState, type Dispatch } from 'react';
import {
  APPROVAL_THRESHOLD,
  APPROVER,
  checkSchedule,
  type Impact,
  type SettingChange,
} from '../domain/rules';
import { NOW_DATETIME, TODAY, formatDateTime, longDate } from '../domain/time';
import type { DraftState } from '../domain/types';
import { CURRENT_USER } from '../data/history';
import type { Action } from '../state/draftStore';
import { Button, Callout, Card, Modal, fmtInt } from './ui';

/** First day of the post-Thanksgiving boost window in the draft. */
const BOOST_START = '2026-11-27';

interface SchedulePanelProps {
  state: DraftState;
  changes: SettingChange[];
  impact: Impact;
  dispatch: Dispatch<Action>;
  onFlash: (message: string) => void;
}

export function SchedulePanel({ state, changes, impact, dispatch, onFlash }: SchedulePanelProps) {
  const { schedule, rules, scheduled } = state;
  const locked = scheduled !== null;
  const check = checkSchedule(schedule, rules);
  const [confirming, setConfirming] = useState(false);

  const changed = changes.filter((c) => c.changed);
  const nothingToPublish = changed.length === 0;
  const approvalBlocked = impact.needsApproval;
  const blockers = [
    ...(nothingToPublish ? ['Nothing to publish: the draft matches live.'] : []),
    ...(approvalBlocked
      ? [`Needs approval from ${APPROVER.name}, ${APPROVER.title}, before it can be scheduled.`]
      : []),
    ...check.errors,
  ];
  const canConfirm = !locked && blockers.length === 0;

  function confirm() {
    if (schedule.mode === 'now') {
      dispatch({ type: 'publishNow', by: CURRENT_USER.name, at: NOW_DATETIME });
      onFlash(`Published to live at ${formatDateTime(NOW_DATETIME)}.`);
    } else {
      dispatch({ type: 'schedule', by: CURRENT_USER.name, at: NOW_DATETIME });
      onFlash(`Scheduled to go live ${formatDateTime(check.goLive)}.`);
    }
    setConfirming(false);
  }

  return (
    <div className="stack">
      {locked && scheduled && (
        <div className="banner banner-info" role="status">
          <div>
            <strong>Scheduled to go live {formatDateTime(scheduled.goLive)}.</strong>{' '}
            Scheduled by {scheduled.by} on {formatDateTime(scheduled.at)}. Edits are locked until the schedule is
            cancelled.
          </div>
          <Button variant="secondary" onClick={() => dispatch({ type: 'cancelSchedule' })}>
            Cancel schedule
          </Button>
        </div>
      )}

      <div className="two-up">
        <Card
          id="schedule-timing"
          title="When it goes live"
          subtitle="All times are Eastern. Changes apply to all products in the subcategory at go-live."
        >
          <fieldset className="fieldset" disabled={locked}>
            <legend className="sr-only">Go-live timing</legend>
            <label className={`option${schedule.mode === 'later' ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="go-live"
                checked={schedule.mode === 'later'}
                onChange={() => dispatch({ type: 'setSchedule', patch: { mode: 'later' } })}
              />
              <span className="option-text">
                <span className="option-label">Schedule for a later time</span>
                <span className="option-help">
                  Default. The first boost window opens {longDate(BOOST_START)}, so the change set should be live before
                  then.
                </span>
                {schedule.mode === 'later' && (
                  <span className="inline-field">
                    <input
                      type="datetime-local"
                      aria-label="Go-live date and time"
                      value={schedule.goLive}
                      min={NOW_DATETIME}
                      onChange={(e) => dispatch({ type: 'setSchedule', patch: { goLive: e.target.value } })}
                    />
                  </span>
                )}
              </span>
            </label>
            <label className={`option${schedule.mode === 'now' ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="go-live"
                checked={schedule.mode === 'now'}
                onChange={() => dispatch({ type: 'setSchedule', patch: { mode: 'now' } })}
              />
              <span className="option-text">
                <span className="option-label">Publish now</span>
                <span className="option-help">Goes live as soon as you confirm: {formatDateTime(NOW_DATETIME)}.</span>
              </span>
            </label>

            <div className="field-block">
              <label className="field">
                <span className="field-label">Revert sort and out-of-stock rules on (optional)</span>
                <input
                  type="date"
                  value={schedule.revertOn}
                  min={TODAY}
                  onChange={(e) => dispatch({ type: 'setSchedule', patch: { revertOn: e.target.value } })}
                />
              </label>
              <p className="hint">
                Brand boosts end on their own dates. Leave this blank to keep the new sort and out-of-stock rules until
                someone changes them.
              </p>
            </div>
          </fieldset>

          {check.errors.map((e) => (
            <Callout key={e} tone="danger">
              {e}
            </Callout>
          ))}
          {check.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
        </Card>

        <Card
          id="schedule-review"
          title="Review before confirming"
          subtitle="Only changed settings are listed. The approval rule applies to the whole change set."
        >
          {changed.length === 0 ? (
            <p className="empty">No changes from live.</p>
          ) : (
            <ul className="review-list">
              {changed.map((c) => (
                <li key={c.key}>
                  <span className="cell-strong">{c.label}</span>
                  <span className="review-diff">
                    <span className="diff-old">{c.liveText}</span>
                    <span aria-hidden="true"> → </span>
                    <span className="diff-new">{c.draftText}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="approval">
            <div className="approval-row">
              <span>Products in scope</span>
              <strong>{fmtInt(impact.productsAffected)}</strong>
            </div>
            <div className="meter" role="img" aria-label={`${impact.productsAffected} of ${APPROVAL_THRESHOLD} approval limit`}>
              <span style={{ width: `${Math.min(100, (impact.productsAffected / APPROVAL_THRESHOLD) * 100)}%` }} />
            </div>
            <p className="hint">
              {impact.needsApproval
                ? `Above the ${fmtInt(APPROVAL_THRESHOLD)}-product limit. Approval is required.`
                : `Approval not required: under the ${fmtInt(APPROVAL_THRESHOLD)}-product limit. ${APPROVER.name} (${APPROVER.title}) only approves changes above it.`}
            </p>
          </div>

          {blockers.length > 0 && !locked && (
            <ul className="blocker-list">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}

          <div className="confirm-row">
            <Button variant="primary" size="md" disabled={!canConfirm} onClick={() => setConfirming(true)}>
              {schedule.mode === 'now' ? 'Publish now…' : 'Schedule change set…'}
            </Button>
          </div>
        </Card>
      </div>

      {confirming && (
        <Modal
          title={schedule.mode === 'now' ? 'Publish to live now?' : 'Schedule this change set?'}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="primary" data-autofocus onClick={confirm}>
                {schedule.mode === 'now' ? 'Publish now' : 'Schedule'}
              </Button>
            </>
          }
        >
          <p>
            {schedule.mode === 'now' ? (
              <>
                This replaces the live Snow Blowers rules for all {fmtInt(impact.productsAffected)} products in scope.
              </>
            ) : (
              <>
                The {changed.length} changed {changed.length === 1 ? 'setting' : 'settings'} will go live on{' '}
                <strong>{formatDateTime(check.goLive)}</strong>. The schedule can be cancelled until then.
              </>
            )}
          </p>
          <ul className="review-list">
            {changed.map((c) => (
              <li key={c.key}>
                <span className="cell-strong">{c.label}:</span> {c.draftText}
              </li>
            ))}
          </ul>
          {schedule.revertOn && (
            <p className="hint">Sort and out-of-stock rules revert on {longDate(schedule.revertOn)}.</p>
          )}
        </Modal>
      )}
    </div>
  );
}
