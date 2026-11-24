import { useStore, type Data } from '../store';
import { UNVERIFIED, SCAM_ACCOUNTS, type UnverifiedAccount } from '../data/cases';
import { Btn, Pill, hhmm } from '../components/ui';

const STATE_LABEL: Record<Data['accounts'][string], string> = {
  pending: 'Needs decision', verify_sent: 'Verification link sent', redirected: 'Moved to Families community', suspended: 'Suspended', verified: 'Verified',
};

function AccountRow({ a }: { a: UnverifiedAccount }) {
  const s = useStore();
  const st = s.accounts[a.id];
  const set = (v: Data['accounts'][string], text: string, log: string) =>
    s.act(text, (d) => ({ accounts: { ...d.accounts, [a.id]: v } }), { undoable: true, log });
  const sugg = a.suggested;
  return (
    <div className={`acct${st !== 'pending' ? ' decided' : ''}`}>
      <div className="acct-main">
        <div className="acct-name">{a.name} <span className="muted small mono">{a.email}</span></div>
        <div className="muted small">Created {hhmm(a.createdAt)} · joined {a.joinedGroups.join(', ')}</div>
        <div className="acct-activity">{a.activity}</div>
        <div className={`assess assess-${a.assessment.tone}`}>{a.assessment.text}</div>
      </div>
      <div className="acct-actions">
        {st === 'pending' ? (
          <>
            <Btn small kind={sugg === 'verify' ? 'primary' : 'secondary'} onClick={() => set('verify_sent', `Verification link sent to ${a.name}`, `Accounts: sent admissions verification link to “${a.name}”`)}>Send verification</Btn>
            <Btn small kind={sugg === 'redirect' ? 'primary' : 'secondary'} onClick={() => set('redirected', `${a.name} moved to Families community`, `Accounts: moved “${a.name}” to the Families community with a welcome note`)}>Move to Families</Btn>
            <Btn small kind={sugg === 'suspend' ? 'danger' : 'secondary'} onClick={() => set('suspended', `${a.name} suspended`, `Accounts: suspended “${a.name}”`)}>Suspend</Btn>
          </>
        ) : <Pill tone={st === 'suspended' ? 'slate' : 'green'}>{STATE_LABEL[st]}</Pill>}
      </div>
    </div>
  );
}

export function AccountsPanel() {
  return <div className="acct-list">{UNVERIFIED.map((a) => <AccountRow key={a.id} a={a} />)}</div>;
}

export default function Accounts() {
  const s = useStore();
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>New unverified accounts</h1>
          <p className="page-sub">9 accounts created today with no matching admissions record. Six belong to the housing scam wave.</p>
        </div>
      </div>
      <h3 className="sub-h">Need a decision ({UNVERIFIED.length})</h3>
      <AccountsPanel />
      <h3 className="sub-h">Scam wave accounts ({SCAM_ACCOUNTS.length}) <button className="link-btn" onClick={() => s.go('catchup', 'scam')}>Open the scam case →</button></h3>
      <table className="table">
        <thead><tr><th>Account</th><th>Email</th><th>Created</th><th>Posts</th><th>DMs sent</th><th>Status</th></tr></thead>
        <tbody>
          {SCAM_ACCOUNTS.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td><td className="mono muted">{a.email}</td><td className="mono">{hhmm(a.createdAt)}</td><td>{a.posts}</td><td>{a.dms} to {a.dmRecipients} students</td>
              <td>{s.scam.suspended.includes(a.id) ? <Pill tone="slate">Suspended</Pill> : <Pill tone="amber">Active</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
