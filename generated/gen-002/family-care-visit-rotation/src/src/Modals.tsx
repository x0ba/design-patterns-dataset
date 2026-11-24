import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, CircleAlert, Send, Sparkles } from 'lucide-react'
import {
  NIGHTS, PEOPLE, RIDE_DAYS, bestWindows, clearDavid, davidStretch, dayShort, dayNum, fmt, fmtRange, fmtRuns, fmtWithDay,
  openNights, openRides, windowStats, type PersonId, type Plan,
} from './model'
import { Avatar, Modal, personVars } from './ui'

// =====================================================================================
// David's 6-night stretch
// =====================================================================================
export function StretchModal({ plan, preset, onApply, onClose }: { plan: Plan; preset: number | null; onApply: (start: number) => void; onClose: () => void }) {
  const existing = davidStretch(plan)
  const ranked = useMemo(() => bestWindows(plan), [plan])
  const initial = useMemo(() => {
    if (existing) return existing.start
    if (preset !== null) return ranked.find((w) => preset >= w.start && preset <= w.end)?.start ?? ranked[0].start
    return ranked[0].start
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [start, setStart] = useState(initial)
  const base = clearDavid(plan)
  const st = windowStats(plan, start)
  const end = start + 5
  const best = ranked[0]
  const stillOpen = openNights(base).filter((i) => i < start || i > end)
  const ridesLeft = openRides(base).filter((d) => !st.rides.includes(d))
  const move = (d: number) => setStart((s) => Math.max(0, Math.min(NIGHTS - 6, s + d)))

  return (
    <Modal label="Place David's stretch" title={<>David's 6-night stretch <span className="sub">He works remotely, lives 5 hours away, and can come once.</span></>} onClose={onClose} width={880}>
      <div className="modal-body">
        <div className="pickers">
          <span className="pk-label">Best fits</span>
          {ranked.slice(0, 3).map((w, k) => (
            <button key={w.start} className={`pk ${w.start === start ? 'on' : ''}`} onClick={() => setStart(w.start)}>
              {k === 0 && <Sparkles size={12} />} {fmtRange(w.start, w.end)}
              <em>fills {w.fills.length}{w.replaces.length ? ` · bumps ${w.replaces.length}` : ''}</em>
            </button>
          ))}
          <span className="pk-spacer" />
          <button className="icon-btn" onClick={() => move(-1)} aria-label="Start one day earlier" disabled={start === 0}><ChevronLeft size={16} /></button>
          <button className="icon-btn" onClick={() => move(1)} aria-label="Start one day later" disabled={start === NIGHTS - 6}><ChevronRight size={16} /></button>
        </div>

        <div className="sstrip-wrap">
          <div className="sstrip" role="group" aria-label="Choose the first night">
            {Array.from({ length: NIGHTS }, (_, i) => {
              const owner = base.nights[i]
              const inWin = i >= start && i <= end
              return (
                <button
                  key={i}
                  className={`sc ${owner ? '' : 'open'} ${inWin ? 'in' : ''} ${inWin && owner ? 'bump' : ''}`}
                  style={owner ? personVars(owner) : undefined}
                  onClick={() => setStart(Math.min(i, NIGHTS - 6))}
                  title={`${fmtWithDay(i)} · ${owner ? PEOPLE[owner].first : 'open'}`}
                  aria-label={`Start on ${fmtWithDay(i)}`}
                >
                  <span className="sc-d">{dayShort(i)[0]}</span>
                  <span className="sc-n">{dayNum(i)}</span>
                  {owner && <span className="sc-who">{PEOPLE[owner].first[0]}</span>}
                </button>
              )
            })}
            <div className="win" style={{ left: `${(start / NIGHTS) * 100}%`, width: `${(6 / NIGHTS) * 100}%` }} aria-hidden="true">
              <span style={personVars('david')}>David</span>
            </div>
          </div>
          <div className="sstrip-marks">
            <div className="mark away" style={{ left: `${(13 / NIGHTS) * 100}%`, width: `${(5 / NIGHTS) * 100}%`, ...personVars('marisol') }}>Marisol away</div>
          </div>
          <div className="sstrip-key"><span className="k-open" /> Open <span className="k-bump" /> Would replace someone <span>Nov 21 → Dec 18</span></div>
        </div>

        <div className="stats3">
          <div>
            <h4>Fills</h4>
            <p className="big">{st.fills.length} <small>open night{st.fills.length === 1 ? '' : 's'}</small></p>
            <p className="dim">{st.fills.length ? fmtRuns(st.fills) : 'None — this window only replaces planned nights'}</p>
            {st.solo.length > 0 && <p className="note-good"><Check size={12} /> Includes {fmtRuns(st.solo)}, which nobody else can take</p>}
          </div>
          <div>
            <h4>Bumps</h4>
            {st.replaces.length === 0 ? (
              <p className="big good">Nobody</p>
            ) : (
              <>
                <p className="big bad">{st.replaces.length} <small>planned night{st.replaces.length === 1 ? '' : 's'}</small></p>
                <p className="dim">{st.replaces.map((r) => `${PEOPLE[r.who].first} ${fmt(r.i)}`).join(', ')} — they'd go back to open.</p>
              </>
            )}
          </div>
          <div>
            <h4>PT rides he'd take</h4>
            <p className="big">{st.rides.length} <small>of {RIDE_DAYS.length}</small></p>
            <p className="dim">{st.rides.length ? st.rides.map((d) => fmtWithDay(d)).join(', ') : 'No open rides fall in this window'}</p>
          </div>
        </div>

        <p className="arrive">
          Arrives <b>{fmtWithDay(start)}</b> evening, leaves <b>{fmtWithDay(end + 1)}</b> morning.
          {(stillOpen.length > 0 || ridesLeft.length > 0) && (
            <span className="left"><CircleAlert size={13} /> Still open afterwards: {[stillOpen.length ? `${stillOpen.length} night${stillOpen.length > 1 ? 's' : ''} (${fmtRuns(stillOpen)})` : '', ridesLeft.length ? `${ridesLeft.length} ride${ridesLeft.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')}.</span>
          )}
        </p>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={() => onApply(start)}>
          {existing ? 'Move' : 'Place'} David {fmtRange(start, end)}{start === best.start ? ' (recommended)' : ''}
        </button>
      </div>
    </Modal>
  )
}

// =====================================================================================
// Send to family
// =====================================================================================
const REPLY_BY = [
  { v: 'Wed Nov 18', label: 'Wed Nov 18' },
  { v: 'Thu Nov 19', label: 'Thu Nov 19 — two days before she’s home' },
  { v: 'Fri Nov 20', label: 'Fri Nov 20 — the day before' },
]

export function SendModal({
  plan, mode, recipients, onSend, onClose,
}: { plan: Plan; mode: 'first' | 'update'; recipients: PersonId[]; onSend: (replyBy: string) => void; onClose: () => void }) {
  const [replyBy, setReplyBy] = useState('Thu Nov 19')
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState(
    mode === 'first'
      ? "Hi all, here’s the plan for Mom’s first four weeks home (Sat Nov 21 – Sat Dec 19). Your nights and rides are below. Please reply Yes, or tell me what doesn’t work, so I can lock it in before she’s home on Saturday. I know some of these drives aren’t small. Thank you. — Elena"
      : "Quick update: I had to move a few things around, so your part of the plan has changed. The new list is below. Can you confirm again? Thanks. — Elena",
  )
  const oN = openNights(plan)
  const oR = openRides(plan)
  const gaps = oN.length + oR.length

  const rows = recipients.map((id) => {
    const nights = plan.nights.map((x, i) => (x === id ? i : -1)).filter((i) => i >= 0)
    const rides = RIDE_DAYS.filter((d) => plan.rides[d] === id)
    return { id, nights, rides }
  })

  if (done) {
    return (
      <Modal label="Sent" title="Sent" onClose={onClose} width={520}>
        <div className="sent-done">
          <div className="allset-icon"><Check size={24} /></div>
          <h3>{mode === 'first' ? 'The rotation is on its way' : 'Update sent'}</h3>
          <p>
            {recipients.map((r) => PEOPLE[r].first).join(', ').replace(/, ([^,]*)$/, ' and $1')} will each get their own nights and rides.
            Ask for replies by {replyBy}. You’ll see who has confirmed in the family panel.
          </p>
          <button className="btn primary" onClick={onClose}>Back to the rotation</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal label="Send to family" title={mode === 'first' ? 'Send the rotation to the family' : 'Send the update'} onClose={onClose} width={820}>
      <div className="modal-body send">
        {gaps > 0 && (
          <div className="gapwarn">
            <CircleAlert size={16} />
            <div>
              <b>{[oN.length ? `${oN.length} night${oN.length > 1 ? 's' : ''}` : '', oR.length ? `${oR.length} PT ride${oR.length > 1 ? 's' : ''}` : ''].filter(Boolean).join(' and ')} still open.</b>{' '}
              The family will see these as gaps. You can send now, but Ruth won’t be fully covered until they’re filled.
            </div>
          </div>
        )}

        <div className="send-cols">
          <div>
            <h4 className="lbl">Message</h4>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={7} aria-label="Message to family" />
            <label className="lbl" htmlFor="replyby">Reply by</label>
            <select id="replyby" value={replyBy} onChange={(e) => setReplyBy(e.target.value)}>
              {REPLY_BY.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <h4 className="lbl">Each person gets only their own part</h4>
            <ul className="rcpt">
              {rows.map(({ id, nights, rides }) => (
                <li key={id} style={personVars(id)}>
                  <Avatar p={id} size={28} />
                  <div>
                    <b>{PEOPLE[id].first}</b>
                    {id === 'gloria' ? (
                      <span>{plan.checkins.length} midday check-ins · Tue &amp; Thu</span>
                    ) : (
                      <>
                        <span>{nights.length} night{nights.length === 1 ? '' : 's'}{rides.length ? ` · ${rides.length} PT ride${rides.length === 1 ? '' : 's'}` : ''}{id === 'elena' ? '' : ''}</span>
                        {nights.length > 0 && <span className="dates">{fmtRuns(nights)}</span>}
                        {rides.length > 0 && <span className="dates">Rides: {fmtRuns(rides)}</span>}
                      </>
                    )}
                    {id === 'tom' && plan.asks.length > 0 && <span className="ask">+ Could you come to Sunday dinner on {plan.asks.map(fmt).join(', ')}?</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Keep editing</button>
        <button
          className="btn primary"
          onClick={() => {
            onSend(replyBy)
            setDone(true)
          }}
        >
          <Send size={15} /> {gaps > 0 ? 'Send with gaps' : `Send to ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}`}
        </button>
      </div>
    </Modal>
  )
}
