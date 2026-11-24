import { useState } from 'react';
import { useStore } from '../store';
import { HELD_POSTS, SCAM_MESSAGES, SCAM_ACCOUNTS, type HeldPost } from '../data/cases';
import { groupById, leaderById } from '../data/community';
import { Btn, Pill, hhmm, AssignModal } from '../components/ui';
import { heldDone } from '../progress';

function HeldRow({ h }: { h: HeldPost }) {
  const s = useStore();
  const st = s.held[h.id];
  const set = (v: 'approved' | 'removed') =>
    s.act(v === 'approved' ? 'Post approved' : 'Post removed', (d) => ({ held: { ...d.held, [h.id]: v } }), { undoable: true, log: `Held posts: ${v} post by ${h.author} in ${groupById(h.groupId).name}` });
  return (
    <div className={`held${st !== 'pending' ? ' decided' : ''}`}>
      <div className="held-main">
        <div className="q-meta">
          <span className="mono">{hhmm(h.at)}</span><b>{h.author}</b><span className="muted">in {groupById(h.groupId).name}</span>
          <Pill tone="slate">{h.reason}</Pill>
        </div>
        <div className="held-body">{h.body}</div>
        {h.hint && <div className={`assess assess-${h.hint.tone === 'ok' ? 'ok' : h.hint.tone === 'care' ? 'care' : 'warn'}`}>{h.hint.text}</div>}
      </div>
      <div className="held-actions">
        {st === 'pending' ? (
          <>
            <Btn small kind={h.hint?.tone === 'ok' ? 'primary' : 'secondary'} onClick={() => set('approved')}>Approve</Btn>
            <Btn small kind="ghost" onClick={() => set('removed')}>Remove</Btn>
          </>
        ) : <Pill tone={st === 'approved' ? 'green' : 'slate'}>{st === 'approved' ? 'Approved' : 'Removed'}</Pill>}
      </div>
    </div>
  );
}

export function HeldPanel({ compact }: { compact?: boolean }) {
  const s = useStore();
  const [assign, setAssign] = useState(false);
  const pending = HELD_POSTS.filter((h) => s.held[h.id] === 'pending');
  const routine = pending.filter((h) => h.hint?.tone === 'ok');
  const needsLook = pending.filter((h) => h.hint?.tone !== 'ok');
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          {compact && <div className="case-kind k-teal">Held posts · hand to leaders</div>}
          <h2 className={compact ? 'case-title' : 'sr-only'}>12 routine held posts</h2>
          <div className="case-meta">{heldDone(s)}/{HELD_POSTS.length} decided{s.heldLeader && <> · remaining with {leaderById(s.heldLeader).name}</>}</div>
        </div>
        <div className="row-gap">
          <Btn kind="primary" disabled={!routine.length} onClick={() => s.act(`${routine.length} routine posts approved`, (d) => ({ held: { ...d.held, ...Object.fromEntries(routine.map((h) => [h.id, 'approved'])) } }), { undoable: true, log: `Held posts: approved ${routine.length} routine posts (textbooks, club links, rideshares)` })}>
            Approve {routine.length} routine
          </Btn>
          <Btn disabled={!pending.length || !!s.heldLeader} onClick={() => setAssign(true)}>{s.heldLeader ? `With ${leaderById(s.heldLeader).name.split(' ')[0]}` : 'Hand the rest to a leader'}</Btn>
        </div>
      </div>
      {needsLook.length > 0 && <h3 className="sub-h">Worth a look ({needsLook.length})</h3>}
      <div className="held-list">{needsLook.map((h) => <HeldRow key={h.id} h={h} />)}</div>
      {routine.length > 0 && <h3 className="sub-h">Look routine ({routine.length})</h3>}
      <div className="held-list">{routine.map((h) => <HeldRow key={h.id} h={h} />)}</div>
      {pending.length === 0 && <h3 className="sub-h">Decided</h3>}
      <div className="held-list">{HELD_POSTS.filter((h) => s.held[h.id] !== 'pending').map((h) => <HeldRow key={h.id} h={h} />)}</div>
      {assign && (
        <AssignModal title="Hand held posts to a leader" sub={`${pending.length} posts still pending`} groupIds={['buysell', 'general', 'parking']}
          defaultNote={'Can you work through the remaining held posts? Remove the parking-permit resale (permits are non-transferable; point to the Transportation refund page) and the concert "tickets" (the event is free). For the GoFundMe in First-Gen 2030, don\'t approve or remove yet — flag it back to me so I can send a Basic Needs referral first.'}
          onClose={() => setAssign(false)}
          onAssign={(lid, _note) => {
            s.act(`Held posts handed to ${leaderById(lid).name}`, (d) => ({ heldLeader: lid, handoffs: { ...d.handoffs, [lid]: (d.handoffs[lid] ?? 0) + 1 } }), { log: `Held posts: handed ${pending.length} pending posts to ${leaderById(lid).name}` });
            setAssign(false);
          }} />
      )}
    </div>
  );
}

export default function HeldPosts() {
  const s = useStore();
  const scamHeld = SCAM_MESSAGES.filter((m) => m.state === 'held');
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Held posts</h1>
          <p className="page-sub">23 posts auto-held since 9:00 for links or payment terms. 11 are from the housing scam wave.</p>
        </div>
      </div>
      <HeldPanel />
      <h3 className="sub-h">From the scam wave ({scamHeld.length}) <button className="link-btn" onClick={() => s.go('catchup', 'scam')}>Open the scam case →</button></h3>
      <table className="table">
        <thead><tr><th>Time</th><th>Account</th><th>Group</th><th>Post</th><th>Status</th></tr></thead>
        <tbody>
          {scamHeld.map((m) => (
            <tr key={m.id}>
              <td className="mono">{hhmm(m.at)}</td>
              <td>{SCAM_ACCOUNTS.find((a) => a.id === m.accountId)!.name}</td>
              <td>{groupById(m.groupId!).name}</td>
              <td className="clip">{m.body}</td>
              <td>{s.scam.removed.includes(m.id) ? <Pill tone="slate">Rejected</Pill> : <Pill tone="amber">Held</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
