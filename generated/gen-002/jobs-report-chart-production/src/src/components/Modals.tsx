import { useEffect, useState } from 'react';
import { EMBARGO_LIFTS, HANDOFF_DUE, ME_ID, personById } from '../data/seed';
import { fmtDayTime } from '../lib/format';
import { canAct } from '../lib/permissions';
import { countByStatus, hasRecheck, openCountFor, openThreads, simNow } from '../lib/selectors';
import { useStore } from '../lib/store';
import type { Chart } from '../lib/types';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

const FINAL_CHECKS = [
  'The figures match the revised September file (rev. 2).',
  'The headline and release note read correctly after the revision.',
  'The caption and source line match the chart.',
];

export function FinalizeModal({ chart, onClose }: { chart: Chart; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [checks, setChecks] = useState<boolean[]>(FINAL_CHECKS.map(() => false));
  useEscape(onClose);

  const openHere = openCountFor(state.comments, chart.id);
  const verdict = canAct(personById(ME_ID)!, 'markFinal', chart, { openComments: openHere });
  const allChecked = checks.every(Boolean);

  const confirm = () => {
    dispatch({ type: 'op', id: chart.id, op: 'markFinal', now: simNow(), confirmed: true });
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="finalize-title" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="finalize-title">Mark {chart.id} final</h2>
        <p className="modal-lede">{chart.headline}</p>
        <p className="muted">
          A final chart is locked until someone reopens it. It goes to communications at the Wednesday handoff.
        </p>

        <ul className="checklist">
          {FINAL_CHECKS.map((label, i) => (
            <li key={label}>
              <label>
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks(checks.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                <span>
                  {label}
                  {i === 0 && hasRecheck(chart) && (
                    <span className="warn-text"> Flagged: this chart was approved before the September revision arrived.</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <p className={openHere ? 'block-text' : 'ok-text'}>
          {openHere
            ? `${openHere} open comment${openHere === 1 ? '' : 's'} on this chart. Resolve ${openHere === 1 ? 'it' : 'them'} first.`
            : 'No open comments on this chart.'}
        </p>
        {!verdict.ok && <p className="block-text">{verdict.reason}</p>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!allChecked || !verdict.ok} onClick={confirm}>
            Mark final
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReleaseModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [ack, setAck] = useState(false);
  useEscape(onClose);

  const counts = countByStatus(state.charts);
  const total = state.charts.length;
  const open = openThreads(state.comments).length;
  const notFinal = total - counts.final;
  const verdict = canAct(personById(ME_ID)!, 'release', null, { notFinal, holdsOpen: counts['disclosure hold'], openComments: open });

  const confirm = () => {
    dispatch({ type: 'release', now: simNow() });
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="release-title" onMouseDown={(e) => e.stopPropagation()}>
        <h2 id="release-title">Release October charts to communications</h2>
        <p className="modal-lede">
          Handoff is due {fmtDayTime(HANDOFF_DUE)}. The embargo lifts {fmtDayTime(EMBARGO_LIFTS)}.
        </p>
        <ul className="kv-list">
          <li>
            <span>Final</span>
            <b>
              {counts.final} of {total}
            </b>
          </li>
          <li>
            <span>Disclosure holds</span>
            <b>{counts['disclosure hold']}</b>
          </li>
          <li>
            <span>Open comments</span>
            <b>{open}</b>
          </li>
        </ul>
        <label className="ack">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>I have checked all {total} charts and the release notes against the revised September data.</span>
        </label>
        <p className="muted small">After release, the charts are locked and sent to the communications office.</p>
        {!verdict.ok && <p className="block-text">{verdict.reason}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!ack || !verdict.ok} onClick={confirm}>
            Release to communications
          </button>
        </div>
      </div>
    </div>
  );
}
