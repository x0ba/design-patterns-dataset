import { ROSTER } from '../data/roster';
import { Panel } from '../components/ui';
import { useStore } from '../state/store';
import { stamp } from '../lib/time';
import type { AdverseEvent } from '../state/types';

function csvCell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function exportCsv(rows: AdverseEvent[]) {
  const header = ['AE ID', 'Participant', 'Occurred', 'Term', 'Peak mg/dL', 'Duration below 54 (min)', 'Call summary', 'Action', 'Outcome', 'Reported by', 'PI review'];
  const lines = rows.map((a) =>
    [a.id, a.pid, stamp(a.occurredAt), a.term, a.peak, a.durationMin, a.callSummary, a.action, a.outcome, a.reportedBy, a.piReview ?? 'Pending']
      .map(csvCell)
      .join(','),
  );
  const csv = [header.map(csvCell).join(','), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cohort3-adverse-events.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdverseView() {
  const { state, dispatch } = useStore();
  const rows = [...state.adverse].sort((a, b) => b.occurredAt - a.occurredAt);
  const pending = rows.filter((r) => !r.piReview).length;
  const screened = ROSTER.length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Adverse-event log</h2>
          <p className="sub">
            Cohort 3, protocol 2026-0884. {rows.length} entries, {pending} awaiting PI review. {screened} participants enrolled.
          </p>
        </div>
        <div className="head-badges">
          <button type="button" className="btn" onClick={() => exportCsv(rows)}>
            Export CSV
          </button>
        </div>
      </div>

      <Panel>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>AE</th>
                <th>Participant</th>
                <th>Occurred</th>
                <th>Term</th>
                <th className="num">Peak</th>
                <th className="num">Min below 54</th>
                <th>Action taken</th>
                <th>Outcome</th>
                <th>Reported by</th>
                <th>PI review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={a.piReview ? '' : 'pending-row'}>
                  <td className="mono strong">{a.id}</td>
                  <td className="mono">{a.pid}</td>
                  <td>{stamp(a.occurredAt)}</td>
                  <td>{a.term}</td>
                  <td className="num mono">{a.peak} mg/dL</td>
                  <td className="num mono">{a.durationMin}</td>
                  <td>{a.action}</td>
                  <td>{a.outcome}</td>
                  <td>{a.reportedBy}</td>
                  <td>{a.piReview ?? <span className="verdict flag">Pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="muted small">
        Entries are created from a safety call on the alert. Edits are not available here; they would go through the PI review.
        <button
          type="button"
          className="link-btn inline"
          onClick={() => {
            dispatch({ type: 'select', selection: { kind: 'participant', pid: rows[0]?.pid ?? 'P-305' } });
            dispatch({ type: 'view', view: 'participants' });
          }}
        >
          Open the most recent participant record
        </button>
      </p>
    </div>
  );
}
