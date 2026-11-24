import { useMemo, useState } from 'react';
import { EVENT_BY_ID } from '../data/alerts';
import { ROSTER, participant } from '../data/roster';
import { minGlucose, stepsBetween } from '../data/series';
import { Badge, type Tone } from '../components/ui';
import { participantStatus } from '../state/derive';
import { useStore } from '../state/store';
import { NOW, WINDOW_START, durationLabel, hhmm, sensorDay } from '../lib/time';
import { ParticipantDetail } from './ParticipantDetail';
import { SnoozePanel } from './SnoozePanel';

type Filter = 'all' | 'attention' | 'advisory' | 'snoozed' | 'ok';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'advisory', label: 'Advisory' },
  { key: 'snoozed', label: 'Snoozed' },
  { key: 'ok', label: 'On track' },
];

export function ParticipantsView() {
  const { state, dispatch } = useStore();
  const sel = state.selection;
  const pid =
    sel.kind === 'participant' || sel.kind === 'snooze'
      ? sel.pid
      : sel.kind === 'event'
        ? EVENT_BY_ID[sel.id]?.pid ?? 'P-322'
        : 'P-322';
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(
    () =>
      ROSTER.map((p) => {
        const status = participantStatus(p, state);
        return {
          p,
          status,
          low: minGlucose(p.id, WINDOW_START, NOW),
          steps: stepsBetween(p.id, WINDOW_START, NOW),
        };
      }),
    [state],
  );

  const shown = rows.filter((r) => {
    if (q && !r.p.id.toLowerCase().includes(q.trim().toLowerCase())) return false;
    switch (filter) {
      case 'attention':
        return r.status.tone === 'safety' || r.status.tone === 'protocol';
      case 'advisory':
        return r.status.tone === 'advisory';
      case 'snoozed':
        return r.status.tone === 'muted';
      case 'ok':
        return r.status.tone === 'ok';
      default:
        return true;
    }
  });

  const choose = (id: string) => dispatch({ type: 'select', selection: { kind: 'participant', pid: id } });
  const inSnooze = sel.kind === 'snooze' && sel.pid === pid;

  return (
    <div className="split">
      <section className="list-pane" aria-label="Participants">
        <div className="toolbar">
          <input
            className="search"
            type="search"
            placeholder="Find by ID, e.g. P-317"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Find participant"
          />
          <div className="chips" role="group" aria-label="Filter">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`chip ${filter === f.key ? 'on' : ''}`}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Age, sex</th>
              <th>Sensor</th>
              <th>Last data</th>
              <th className="num">Low, 24 h</th>
              <th className="num">Steps</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ p, status, low, steps }) => (
              <tr
                key={p.id}
                className={p.id === pid ? 'selected' : ''}
                tabIndex={0}
                onClick={() => choose(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') choose(p.id);
                }}
                aria-selected={p.id === pid}
              >
                <td className="mono strong">{p.id}</td>
                <td>{p.age}, {p.sex === 'Female' ? 'F' : 'M'}</td>
                <td>
                  <span className="mono small">{p.sensorSn}</span>
                  <div className="muted small">day {sensorDay(p.insertedMs, NOW)}</div>
                </td>
                <td>
                  <span className="mono">{hhmm(p.lastUploadMs)}</span>
                  {NOW - p.lastUploadMs > 3_600_000 && (
                    <div className="small verdict flag">{durationLabel(NOW - p.lastUploadMs)} silent</div>
                  )}
                </td>
                <td className="num mono">{low ? `${low.v}` : '—'}</td>
                <td className="num mono">{steps.toLocaleString('en-US')}</td>
                <td>
                  <Badge tone={status.tone as Tone}>{status.label}</Badge>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">No participants match.</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="muted small table-foot">
          Showing {shown.length} of {ROSTER.length} participants. Low and steps cover the last 24 hours to 06:40.
          {' '}
          {participant(pid).id} is the open record.
        </p>
      </section>

      <section className="detail" aria-label="Participant record">
        {inSnooze && sel.kind === 'snooze' ? (
          <>
            <div className="back-row">
              <button type="button" className="btn ghost" onClick={() => choose(pid)}>
                ← Back to {pid} record
              </button>
            </div>
            <SnoozePanel pid={sel.pid} ruleId={sel.ruleId} />
          </>
        ) : (
          <ParticipantDetail pid={pid} />
        )}
      </section>
    </div>
  );
}
