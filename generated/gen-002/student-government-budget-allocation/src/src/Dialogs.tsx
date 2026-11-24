import { useEffect, useRef, useState } from 'react'
import { APPEAL_DAYS, ESPORTS_ID, SPEND_OPENS, TODAY } from './data'
import {
  State,
  addDays,
  byId,
  finalAmount,
  isTrimmed,
  longDate,
  pendingReqs,
  shortDate,
  totals,
  unaddressed,
  usd,
  flagsFor,
} from './model'
import { POOL } from './data'

function useEsc(fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && fn()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fn])
}

function Modal({ children, onClose, narrow, label }: { children: React.ReactNode; onClose: () => void; narrow?: boolean; label: string }) {
  useEsc(onClose)
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (narrow ? ' narrow' : '')} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Rescission */
export function RescissionDialog({
  reqId,
  s,
  onClose,
  onConfirm,
}: {
  reqId: string
  s: State
  onClose: () => void
  onConfirm: (to: number, reason: string) => void
}) {
  const r = byId[reqId]
  const from = s.committed[reqId]
  const isEsports = reqId === ESPORTS_ID
  const [to, setTo] = useState(isEsports ? r.approved : Math.max(0, from - 500))
  const [reason, setReason] = useState(
    isEsports
      ? `The Finance Committee approved this award at ${usd(r.approved)} (5–1–1). It was committed at ${usd(from)}, the amount originally requested, instead of the approved amount. We are correcting the award to the amount the committee approved. No funds have been spent, so no repayment is needed.`
      : '',
  )
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => ref.current?.focus(), [])
  const ends = addDays(TODAY, APPEAL_DAYS)
  const valid = reason.trim().length >= 40 && to < from && to >= 0
  const reduction = from - to

  return (
    <Modal onClose={onClose} label="Rescind award">
      <header>
        <div>
          <div className="eyebrow">Formal rescission</div>
          <h2 style={{ fontSize: 22 }}>{isEsports ? 'Walk back the Esports Club award' : `Reduce ${r.club}’s award`}</h2>
          <p>Reducing an award after it has been committed is a rescission. The club can appeal to the full Senate.</p>
        </div>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="body">
        <div className="rx">
          <div>
            <div className="fromto">
              <div className="a num"><small>Committed</small>{usd(from)}</div>
              <span className="arrow" aria-hidden>→</span>
              <div className="b num">
                <small>New amount</small>
                {isEsports ? usd(to) : (
                  <label className="moneyin" style={{ fontSize: 22 }}>
                    <span>$</span>
                    <input value={to} inputMode="numeric" aria-label="New award amount" onFocus={(e) => e.target.select()} onChange={(e) => setTo(Math.min(from, Number(e.target.value.replace(/[^0-9]/g, '')) || 0))} style={{ width: 90, fontFamily: 'var(--serif)', fontWeight: 600 }} />
                  </label>
                )}
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right', color: 'var(--red)', fontWeight: 650 }} className="num">
                {reduction > 0 ? `−${usd(reduction)}` : ''}
              </div>
            </div>
            <div className="field">
              <label htmlFor="reason">Written reason (required, sent to the club)</label>
              <textarea id="reason" ref={ref} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why the award is being reduced and what the club can do about it." />
              <div className="hint">
                <span>{reason.trim().length < 40 ? `At least 40 characters (${reason.trim().length})` : 'Edit as needed before sending.'}</span>
                <span>Appears in the audit log</span>
              </div>
            </div>
          </div>
          <div>
            <ul className="facts">
              <li><span>✉</span><span><b>{r.president}</b>, {r.club} president, gets the notice by email today.</span></li>
              <li><span>⏱</span><span><b>{APPEAL_DAYS}-day appeal window</b> closes <b>{longDate(ends)}</b>, the day after Thanksgiving. Spending opens {shortDate(SPEND_OPENS)}.</span></li>
              <li><span>⚖</span><span>Appeals go to the <b>full Senate</b>, not the finance committee.</span></li>
              <li><span>$</span><span><b>$0 spent</b> so far, so nothing to recover from the club.</span></li>
            </ul>
            <div className="notice">
              <div className="to">Preview · To: {r.president} · Subject: Change to your Spring 2027 award</div>
              <p>Your award has been reduced from {usd(from)} to {usd(to)}.</p>
              <p style={{ fontStyle: 'italic' }}>{reason.trim() ? reason.trim().slice(0, 160) + (reason.trim().length > 160 ? '…' : '') : 'Your written reason appears here.'}</p>
              <p style={{ marginBottom: 0 }}>You may appeal to the Senate by {shortDate(ends)}.</p>
            </div>
          </div>
        </div>
      </div>
      <footer>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn danger" disabled={!valid} onClick={() => onConfirm(to, reason)}>Send rescission notice</button>
      </footer>
    </Modal>
  )
}

/* ---------------------------------------------------------------- Commit */
export function CommitDialog({ s, onClose, onConfirm }: { s: State; onClose: () => void; onConfirm: () => void }) {
  const t = totals(s)
  const [ack, setAck] = useState(false)
  const open = unaddressed(s)
  const changed = pendingReqs.filter((r) => s.adj[r.id]?.deferred || isTrimmed(r, s.adj[r.id]))
  const flagged = pendingReqs.filter((r) => !s.adj[r.id]?.deferred && flagsFor(r).length > 0).length
  const left = POOL - t.planned

  return (
    <Modal onClose={onClose} narrow label="Commit allocations">
      <header>
        <div>
          <div className="eyebrow">Final step</div>
          <h2 style={{ fontSize: 22 }}>Commit {t.committingAwards} awards for {usd(t.toCommit)}?</h2>
          <p>Clubs are notified as soon as you confirm, and can start spending on {shortDate(SPEND_OPENS)}.</p>
        </div>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="body">
        <table className="chg">
          <tbody>
            <tr><td>Committed with these awards (incl. Esports at $1,400)</td><td className="num">{usd(t.planned)}</td></tr>
            <tr><td>Spring pool</td><td className="num">{usd(POOL)}</td></tr>
            <tr><td>Stays uncommitted</td><td className="num">{usd(left)}</td></tr>
            <tr><td>Clubs notified now</td><td className="num">{t.committingAwards}</td></tr>
            <tr><td>Awards with open policy flags</td><td className="num">{flagged}</td></tr>
          </tbody>
        </table>

        {changed.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="lbl">Differs from the committee’s vote ({changed.length})</div>
            <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 8, padding: '2px 12px' }}>
              <table className="chg" style={{ marginTop: 0 }}>
                <tbody>
                  {changed.map((r) => (
                    <tr key={r.id}>
                      <td>{r.club}</td>
                      <td className="num">{s.adj[r.id]?.deferred ? `Deferred to Jan 14 (${usd(r.approved)})` : `${usd(r.approved)} → ${usd(finalAmount(r, s.adj[r.id]))}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {open.length > 0 && (
          <div className="callout amber" style={{ marginTop: 12 }}>
            <b>{open.length} advisor comment{open.length > 1 ? 's' : ''} from Carla Ruiz not marked addressed</b> ({open.map((c) => byId[c.reqId].club).join(', ')}).
          </div>
        )}

        <label className="ack">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          <span>I understand that after this, any reduction is a formal rescission: written reason, 10-day appeal window, and an appeal to the full Senate.</span>
        </label>
      </div>
      <footer>
        <button className="btn" onClick={onClose}>Back</button>
        <button className="btn primary" disabled={!ack} onClick={onConfirm}>Commit and notify clubs</button>
      </footer>
    </Modal>
  )
}
