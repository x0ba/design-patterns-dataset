import { useMemo, useState } from 'react';
import { EVENTS, RULES, type Handling, type Severity } from '../data/alerts';
import { Badge, Field, Panel, type Tone } from '../components/ui';
import { useStore } from '../state/store';
import { stamp } from '../lib/time';

const SEV_TONE: Record<Severity, Tone> = {
  Safety: 'safety',
  Protocol: 'protocol',
  Advisory: 'advisory',
  Info: 'info',
};

const HANDLING_TEXT: Record<Handling, string> = {
  delivered: 'Delivered',
  held: 'Held, released 06:00',
  escalated: 'Escalated',
  suppressed: 'Suppressed (snooze)',
};

export function AlertsView() {
  const { dispatch } = useStore();
  const openInQueue = (id: string) => {
    dispatch({ type: 'select', selection: { kind: 'event', id } });
    dispatch({ type: 'view', view: 'attention' });
  };
  const [sev, setSev] = useState<'all' | Severity>('all');
  const [handling, setHandling] = useState<'all' | Handling>('all');
  const [pid, setPid] = useState('');

  const rows = useMemo(
    () =>
      [...EVENTS]
        .sort((a, b) => b.at - a.at)
        .filter((e) => {
          const rule = RULES.find((r) => r.id === e.ruleId);
          if (sev !== 'all' && rule?.severity !== sev) return false;
          if (handling !== 'all' && e.handling !== handling) return false;
          if (pid && !e.pid.toLowerCase().includes(pid.trim().toLowerCase())) return false;
          return true;
        }),
    [sev, handling, pid],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Alert log</h2>
          <p className="sub">Last 24 hours, Mon 16 Nov 06:40 to Tue 17 Nov 06:40 PT. Quiet hours are 22:00 to 06:00 for non-safety rules.</p>
        </div>
      </div>

      <Panel title="Alert rules" aside={<span className="muted">{RULES.length} active rules, cohort 3</span>}>
        <table className="table compact">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Trigger</th>
              <th>Severity</th>
              <th>Quiet hours</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {RULES.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{r.name}</td>
                <td>
                  <Badge tone={SEV_TONE[r.severity]}>{r.severity}</Badge>
                </td>
                <td>{r.bypassesQuiet ? 'Always delivered' : 'Held 22:00 to 06:00'}</td>
                <td>{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel
        title={`Events, ${rows.length} of ${EVENTS.length}`}
        aside={
          <div className="filters">
            <Field label="Severity">
              <select value={sev} onChange={(e) => setSev(e.target.value as 'all' | Severity)}>
                <option value="all">All</option>
                <option>Safety</option>
                <option>Protocol</option>
                <option>Advisory</option>
                <option>Info</option>
              </select>
            </Field>
            <Field label="Handling">
              <select value={handling} onChange={(e) => setHandling(e.target.value as 'all' | Handling)}>
                <option value="all">All</option>
                <option value="delivered">Delivered</option>
                <option value="held">Held</option>
                <option value="escalated">Escalated</option>
                <option value="suppressed">Suppressed</option>
              </select>
            </Field>
            <Field label="Participant">
              <input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="P-3" />
            </Field>
          </div>
        }
      >
        <div className="table-wrap tall">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>ID</th>
                <th>Participant</th>
                <th>Rule</th>
                <th>Severity</th>
                <th>Handling</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const rule = RULES.find((r) => r.id === e.ruleId);
                return (
                  <tr
                    key={e.id}
                    className="clickable"
                    tabIndex={0}
                    onClick={() => openInQueue(e.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') openInQueue(e.id);
                    }}
                  >
                    <td className="mono nowrap">{stamp(e.at)}</td>
                    <td className="mono small">{e.id}</td>
                    <td className="mono">{e.pid}</td>
                    <td className="mono small">{e.ruleId}</td>
                    <td>{rule && <Badge tone={SEV_TONE[rule.severity]}>{rule.severity}</Badge>}</td>
                    <td className={e.handling === 'escalated' ? 'strong' : ''}>{HANDLING_TEXT[e.handling]}</td>
                    <td>{e.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
