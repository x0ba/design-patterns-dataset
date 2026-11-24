import { useState } from 'react'
import { REQUEST, SUPERVISOR, USER } from './data'
import { fmtDay, fmtTime, summarize } from './store'
import { Icon, Modal, useApp } from './ctx'
import { editedParas } from './Letter'

export function SignoffView() {
  const { state, dispatch, openHelp } = useApp()
  const sm = summarize(state)
  const [confirm, setConfirm] = useState<null | 'requester' | 'supervisor'>(null)
  const mediumIds = ['R3', 'R12', 'R14']

  const items = [
    {
      ok: sm.decided === 14,
      title: 'Every redaction has your decision',
      cite: 'AP-07 § 3',
      detail: sm.decided === 14 ? `14 of 14 decided: ${sm.approved} approved, ${14 - sm.approved} not redacted.` : `${sm.decided} of 14 decided. ${14 - sm.decided} still need you.`,
      fix: sm.decided < 14 ? { label: 'Review remaining', go: () => { const next = Object.entries(state.decisions).find(([, d]) => d.status === 'pending'); if (next) dispatch({ type: 'select', id: next[0] }); dispatch({ type: 'tab', tab: 'redactions' }) } } : undefined,
    },
    {
      ok: sm.mediumOk,
      title: 'A reason is recorded for each medium-confidence item',
      cite: 'AP-07 § 4',
      detail: mediumIds.map((id) => {
        const d = state.decisions[id]
        return `${id}: ${d.status === 'pending' ? 'not decided' : d.note.trim() ? 'reason recorded' : 'reason missing'}`
      }).join(' · '),
      fix: !sm.mediumOk ? { label: 'Go to medium items', go: () => { const id = mediumIds.find((i) => state.decisions[i].status === 'pending' || !state.decisions[i].note.trim())!; dispatch({ type: 'select', id }); dispatch({ type: 'tab', tab: 'redactions' }) } } : undefined,
    },
    {
      ok: state.letterReviewed,
      title: 'You’ve read the full letter',
      cite: 'AP-07 § 5',
      detail: `${editedParas(state).length} paragraph${editedParas(state).length === 1 ? '' : 's'} edited by you. The rest is the assistant’s wording, which you’re confirming as your own.`,
      fix: !state.letterReviewed ? { label: 'Open letter', go: () => dispatch({ type: 'tab', tab: 'letter' }) } : undefined,
    },
  ]
  const ready = items.every((i) => i.ok)
  const canSend = ready && state.attested

  if (state.sent) return <SentState />

  return (
    <div className="signoff">
      <div className="signoff-main">
        <div className="signoff-intro">
          <h2>Sign off and send</h2>
          <p>
            <b>Yes, you can send a letter the assistant drafted.</b> AP-07 § 2 allows it. When you sign, you become the letter’s author, the same as any letter you write yourself. These are the checks the policy requires:
          </p>
        </div>

        <ol className="checklist" data-spot="checklist">
          {items.map((it, i) => (
            <li key={i} className={it.ok ? 'ok' : ''}>
              <span className="ck">{it.ok ? <Icon name="check" size={14} /> : i + 1}</span>
              <div className="ck-body">
                <div className="ck-title">{it.title} <span className="cite">{it.cite}</span></div>
                <div className="small muted">{it.detail}</div>
              </div>
              {it.fix && <button className="btn btn-sm" onClick={it.fix.go}>{it.fix.label} <Icon name="chev" size={13} /></button>}
            </li>
          ))}
        </ol>

        <div className={`attest ${!ready ? 'dim' : ''}`}>
          <label className="check">
            <input type="checkbox" checked={state.attested} disabled={!ready} onChange={(e) => dispatch({ type: 'attest', on: e.target.checked })} />
            <span>
              I, <b>{USER.name}</b>, reviewed each redaction in this response, confirm the exemptions cited, and approve this letter for release under my name.
            </span>
          </label>
          {!ready && <p className="small muted">Unlocks when the three checks above are done.</p>}
        </div>

        <div className="send-row">
          <button className="btn btn-primary btn-lg" disabled={!canSend} onClick={() => setConfirm('requester')}>
            <Icon name="send" /> Sign and send to {REQUEST.requester}
          </button>
          <span className="or">or</span>
          <button className="btn btn-lg" disabled={sm.decided === 0} onClick={() => setConfirm('supervisor')}>
            <Icon name="user" /> Send to {SUPERVISOR.name} for review first
          </button>
        </div>
        <p className="small muted">A second review is always allowed and doesn’t count against you. {SUPERVISOR.name} sees your decisions and notes and can send it back with comments. <button className="link small" onClick={() => openHelp({ kind: 'article', id: 'a15' })}>When to ask for one</button></p>
      </div>

      <aside className="signoff-side">
        <div className="card">
          <div className="eyebrow">What will be sent</div>
          <ul className="facts">
            <li><Icon name="mail" size={14} /> Letter to {REQUEST.requesterEmail}</li>
            <li><Icon name="doc" size={14} /> 38 records, 212 pages, via the secure portal</li>
            <li><Icon name="shield" size={14} /> {sm.approved} redactions, each labeled with its exemption code</li>
            <li><Icon name="clock" size={14} /> Due {REQUEST.due.replace(' · ', ' at ')}</li>
          </ul>
        </div>
        <div className="card">
          <div className="eyebrow">Logged with your name</div>
          <p className="small">Sign-off adds your name, the time, and the attestation above to the audit trail. The audit trail is kept with the request file (AP-07 § 7).</p>
          <button className="link small" onClick={() => dispatch({ type: 'tab', tab: 'audit' })}>View audit trail</button>
        </div>
        <div className="card">
          <div className="eyebrow">Policy</div>
          <button className="link small" onClick={() => openHelp({ kind: 'article', id: 'a12' })}>AP-07 in plain language</button>
          <br />
          <button className="link small" onClick={() => openHelp({ kind: 'article', id: 'a13' })}>Can I send a letter the assistant drafted?</button>
        </div>
      </aside>

      {confirm && (
        <Modal title={confirm === 'requester' ? 'Send response to requester?' : `Send to ${SUPERVISOR.name} for review?`} onClose={() => setConfirm(null)} width={520}>
          {confirm === 'requester' ? (
            <>
              <p>This sends the signed letter and 38 redacted records to <b>{REQUEST.requester}</b> ({REQUEST.requesterEmail}). <b>It can’t be undone</b>: once records are released, they’re public.</p>
              <ul className="facts">
                <li><Icon name="check" size={14} /> {sm.approved} redactions approved by {USER.name}</li>
                <li><Icon name="check" size={14} /> {14 - sm.approved} suggestions declined, released unredacted</li>
              </ul>
            </>
          ) : (
            <p>{SUPERVISOR.name} ({SUPERVISOR.title}) will get your decisions, notes, and the letter. <b>Nothing is released to the requester.</b> You can recall it if you want to keep working. Leave time for the review before the deadline on {REQUEST.due.split(' · ')[0]}.</p>
          )}
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { dispatch({ type: 'send', mode: confirm }); setConfirm(null) }}>
              <Icon name="send" /> {confirm === 'requester' ? 'Sign and send' : 'Send for review'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SentState() {
  const { state, dispatch } = useApp()
  const s = state.sent!
  const sm = summarize(state)
  return (
    <div className="sent">
      <div className="sent-icon"><Icon name={s.mode === 'requester' ? 'check' : 'user'} size={28} /></div>
      {s.mode === 'requester' ? (
        <>
          <h2>Response sent to {REQUEST.requester}</h2>
          <p>Signed by {USER.name} on {fmtDay(s.t)} at {fmtTime(s.t)}, before the {REQUEST.due.split(' · ')[0]} deadline. {sm.approved} redactions applied, each one individually reviewed and logged.</p>
        </>
      ) : (
        <>
          <h2>With {SUPERVISOR.name} for review</h2>
          <p>Sent {fmtDay(s.t)} at {fmtTime(s.t)}. Nothing has been released to the requester. You’ll be notified when {SUPERVISOR.name} approves it or sends it back with comments.</p>
          <button className="btn" onClick={() => dispatch({ type: 'recall' })}><Icon name="undo" /> Recall and keep working</button>
        </>
      )}
      <button className="link" onClick={() => dispatch({ type: 'tab', tab: 'audit' })}>View audit trail</button>
    </div>
  )
}
