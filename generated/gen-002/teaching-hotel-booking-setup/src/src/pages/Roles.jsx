import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Button, Icon, Notice, PageHead } from '../ui.jsx';
import { ACTIONS } from '../data.js';
import { LEVELS, levelLabel, plural } from '../lib.js';

const GROUPS = ['Money', 'Reservations'];
const MONEY_FIX = ['override', 'waiveLco', 'waiveCancel'];

export default function Roles() {
  const { state, dispatch, notify } = useStore();
  const [agent, lead] = state.roles;

  const set = (roleId, actionId, level) => dispatch({ type: 'role/perm', roleId, actionId, level });

  const applyPlan = () => {
    MONEY_FIX.forEach((a) => {
      set('agent', a, 'no');
      set('lead', a, 'reason');
    });
    notify('Desk Agents can’t override or waive. Shift Leads can, with a reason.', { undo: true });
  };
  const planApplied = MONEY_FIX.every((a) => agent.perms[a] === 'no' && lead.perms[a] === 'reason');

  const stuck = state.scenarios.filter((s) => s.needs.some((a) => agent.perms[a] === 'no'));

  return (
    <div className="page">
      <PageHead
        title="Student roles"
        lead="What each role can do at the front desk. “Allowed with a reason” makes the student type a note before the action goes through, and the note is saved on the reservation."
        actions={
          <Button variant="secondary" icon="lock" onClick={applyPlan} disabled={planApplied}>
            {planApplied ? 'Override and waive limits set' : 'Limit overrides and waivers by term'}
          </Button>
        }
      />

      <div className="roles-layout">
        <div>
          <div className="table-wrap">
            <table className="grid perm-grid">
              <thead>
                <tr>
                  <th>Action</th>
                  {state.roles.map((r) => (
                    <th key={r.id} className="perm-col">
                      <span className="role-name">{r.name}</span>
                      <span className="role-count">{plural(r.students, 'student')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              {GROUPS.map((g) => (
                <tbody key={g}>
                  <tr className="group-row"><th colSpan={3} scope="colgroup">{g === 'Money' ? 'Money and rates' : g}</th></tr>
                  {ACTIONS.filter((a) => a.group === g).map((a) => (
                    <tr key={a.id}>
                      <th scope="row" className="action-cell">
                        <span>{a.label}</span>
                        <small>{a.hint}</small>
                      </th>
                      {state.roles.map((r) => (
                        <td key={r.id} className="perm-col">
                          <div className="seg seg-3" role="radiogroup" aria-label={`${a.label} for ${r.name}`}>
                            {LEVELS.map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                role="radio"
                                aria-checked={r.perms[a.id] === l.id}
                                title={l.label}
                                className={`${r.perms[a.id] === l.id ? 'is-on' : ''} lv-${l.id}`}
                                onClick={() => set(r.id, a.id, l.id)}
                              >
                                {l.short}
                              </button>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {stuck.length > 0 && (
            <Notice tone="warn" icon="lock" title={`${plural(stuck.length, 'scenario')} will need a hand-off from Desk Agents.`}>
              {stuck.map((s) => `“${s.title}”`).join(', ')}. First-term students can start these, but a Shift Lead has to finish the restricted step.
            </Notice>
          )}
        </div>

        <StudentPreview roles={state.roles} />
      </div>
    </div>
  );
}

function StudentPreview({ roles }) {
  const [roleId, setRoleId] = useState(roles[0].id);
  const role = roles.find((r) => r.id === roleId);
  const [pending, setPending] = useState(null); // action id awaiting reason
  const [reason, setReason] = useState('');
  const [log, setLog] = useState(null);

  const pick = (a) => {
    setLog(null);
    const level = role.perms[a.id];
    if (level === 'no') setLog({ tone: 'no', text: `${role.short}s can’t ${a.label.toLowerCase()}. They’d be told to ask a Shift Lead.` });
    else if (level === 'reason') { setPending(a.id); setReason(''); }
    else setLog({ tone: 'ok', text: `Done. ${a.short} recorded for ${role.short}.` });
  };

  const confirm = (a) => {
    if (!reason.trim()) return;
    setLog({ tone: 'ok', text: `Done. ${a.short} recorded with reason: “${reason.trim()}”.` });
    setPending(null);
  };

  const sample = ACTIONS.filter((a) => a.group === 'Money').concat(ACTIONS.filter((a) => ['move', 'cancel'].includes(a.id)));

  return (
    <aside className="panel preview-panel" aria-labelledby="sv">
      <h2 id="sv" className="panel-title">What students see</h2>
      <p className="muted small">Try the buttons on a sample folio as each role.</p>
      <div className="seg" role="radiogroup" aria-label="Preview as">
        {roles.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={roleId === r.id} className={roleId === r.id ? 'is-on' : ''} onClick={() => { setRoleId(r.id); setPending(null); setLog(null); }}>
            {r.short}
          </button>
        ))}
      </div>

      <div className="folio">
        <div className="folio-head">
          <strong>Reservation 4471 · Rm 202</strong>
          <span>Dana Okafor · 2 nights</span>
        </div>
        <div className="folio-line"><span>Room, Standard</span><span>$258.00</span></div>
        <div className="folio-line"><span>Late checkout fee</span><span>$35.00</span></div>
        <div className="folio-actions">
          {sample.map((a) => {
            const level = role.perms[a.id];
            return (
              <div key={a.id} className="folio-act">
                <button type="button" className={`folio-btn lv-${level}`} onClick={() => pick(a)} aria-disabled={level === 'no'}>
                  {level === 'no' && <Icon name="lock" size={13} />}
                  {a.short}
                </button>
                {pending === a.id && (
                  <div className="reason-box">
                    <label htmlFor="why">Reason (required)</label>
                    <textarea id="why" rows="2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being done?" autoFocus />
                    <div className="reason-actions">
                      <Button variant="primary" size="sm" disabled={!reason.trim()} onClick={() => confirm(a)}>Confirm</Button>
                      <Button variant="ghost" size="sm" onClick={() => setPending(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className={`folio-log ${log ? `is-${log.tone}` : ''}`} role="status">{log ? log.text : 'Click an action to see what happens.'}</div>
      </div>
      <p className="muted small">Current setting for {role.short}s on overrides: <strong>{levelLabel(role.perms.override)}</strong>.</p>
    </aside>
  );
}
