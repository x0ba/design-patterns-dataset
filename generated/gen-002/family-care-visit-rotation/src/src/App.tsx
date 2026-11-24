import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Car, Check, CircleAlert, Send, Stethoscope, Undo2 } from 'lucide-react'
import {
  NIGHTS, PEOPLE, RIDE_DAYS, acceptAll, applyStretch, assignNights, buildIssues, davidStretch, fairFill, fmt, fmtRange,
  fmtWithDay, initialPlan, openNights, openRides, personSig, setNight, setRide, splitRides, windowStats,
  type PersonId, type Plan,
} from './model'
import { Avatar, Logo, type Slot } from './ui'
import { Calendar } from './Calendar'
import { DayPanel, FamilyPanel, TodoPanel } from './Panels'
import { SendModal, StretchModal } from './Modals'

const RECIPIENTS: PersonId[] = ['tom', 'marisol', 'david', 'gloria']

interface SentInfo {
  snapshot: Plan
  replyBy: string
  confirmed: PersonId[]
}

function CoverBar({ total, open, label, covered }: { total: number; open: boolean[]; label: string; covered: number }) {
  return (
    <div className="stat" role="group" aria-label={`${label}: ${covered} of ${total} covered`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-num"><b>{covered}</b>/{total}</span>
      </div>
      <div className="bar" aria-hidden="true">
        {open.map((o, i) => <i key={i} className={o ? 'o' : 'c'} />)}
      </div>
      <div className="stat-sub">{total - covered === 0 ? 'All covered' : `${total - covered} still open`}</div>
    </div>
  )
}

export default function App() {
  const [plan, setPlan] = useState<Plan>(initialPlan)
  const [history, setHistory] = useState<Plan[]>([])
  const [sel, setSel] = useState<{ i: number; slot: Slot } | null>(null)
  const [focus, setFocus] = useState<PersonId | null>(null)
  const [stretchModal, setStretchModal] = useState<{ preset: number | null } | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [sent, setSent] = useState<SentInfo | null>(null)
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null)
  const toastId = useRef(0)

  const issues = useMemo(() => buildIssues(plan), [plan])
  const oN = openNights(plan)
  const oR = openRides(plan)

  const affected = useMemo(
    () => (sent ? RECIPIENTS.filter((p) => personSig(p, plan) !== personSig(p, sent.snapshot)) : []),
    [plan, sent],
  )
  const dirty = !!sent && affected.length > 0

  const say = useCallback((msg: string) => setToast({ id: ++toastId.current, msg }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 9000)
    return () => clearTimeout(t)
  }, [toast])

  const commit = (next: Plan, msg: string) => {
    setHistory((h) => [...h, plan])
    setPlan(next)
    say(msg)
  }
  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    setPlan(last)
    setHistory((h) => h.slice(0, -1))
    say('Undone')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (stretchModal) setStretchModal(null)
      else if (sendOpen) setSendOpen(false)
      else if (sel) setSel(null)
      else if (focus) setFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stretchModal, sendOpen, sel, focus])

  // ---- actions
  const placeStretch = (start: number) => {
    const st = windowStats(plan, start)
    const moved = !!davidStretch(plan)
    commit(
      applyStretch(plan, start),
      `David ${moved ? 'moved to' : 'placed'} ${fmtRange(start, start + 5)} — ${st.fills.length} open nights${st.rides.length ? ` and ${st.rides.length} PT rides` : ''} covered`,
    )
    setStretchModal(null)
  }

  const assignNight = (i: number, p: PersonId | null) => {
    if (p === 'david' && !davidStretch(plan)) return setStretchModal({ preset: i })
    if (p === null) return commit(setNight(plan, i, null), `${fmtWithDay(i)} night is open again`)
    commit(setNight(plan, i, p), `${PEOPLE[p].first} has the night of ${fmtWithDay(i)}`)
  }
  const assignRide = (d: number, p: PersonId | null) =>
    commit(setRide(plan, d, p), p ? `${PEOPLE[p].first} takes the ${fmtWithDay(d)} PT ride` : `${fmtWithDay(d)} PT ride is open again`)
  const toggleCheckin = (i: number) => {
    const on = plan.checkins.includes(i)
    commit(
      { ...plan, checkins: on ? plan.checkins.filter((c) => c !== i) : [...plan.checkins, i].sort((a, b) => a - b) },
      on ? `Removed Gloria's check-in on ${fmtWithDay(i)}` : `Gloria will check in midday on ${fmtWithDay(i)}`,
    )
  }

  const doRides = (rides: number[], mode: 'split' | 'marisol' | 'elena') => {
    if (mode === 'split') {
      const r = splitRides(plan, rides)
      commit(r.plan, `Marisol takes ${rides.filter((d) => d !== r.elenaRide).map(fmt).join(', ')}; Elena takes ${fmt(r.elenaRide)}`)
    } else {
      let next = plan
      rides.forEach((d) => (next = setRide(next, d, mode)))
      commit(next, `${PEOPLE[mode].first} takes the ${rides.map(fmt).join(' and ')} PT ride${rides.length > 1 ? 's' : ''}`)
    }
  }

  const applyAll = () => {
    const r = acceptAll(plan)
    commit(r.plan, `Applied ${r.summary.length} suggestions: ${r.summary.join(', ')}`)
  }

  const send = (replyBy: string) => {
    if (!sent) setSent({ snapshot: plan, replyBy, confirmed: [] })
    else setSent({ snapshot: plan, replyBy, confirmed: sent.confirmed.filter((p) => !affected.includes(p)) })
  }

  const nightsCovered = NIGHTS - oN.length
  const ridesCovered = RIDE_DAYS.length - oR.length
  const confirmedCount = sent ? sent.confirmed.filter((p) => p !== 'gloria' && !affected.includes(p)).length : 0

  return (
    <div className={`app ${sent ? 'has-banner' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span className="wordmark">Kinloop</span>
        </div>
        <div className="crumb">
          <span>Ruth's care circle</span>
          <i />
          <b>Rotation</b>
        </div>
        <div className="topbar-right">
          <div className="avstack" aria-label="Circle members: Elena, Marisol, Tom, David and Gloria">
            {(['elena', 'marisol', 'tom', 'david', 'gloria'] as PersonId[]).map((p) => <Avatar key={p} p={p} size={26} />)}
          </div>
          <div className="me"><Avatar p="elena" size={28} /> <span>Elena Brandt</span></div>
        </div>
      </header>

      <main className="page">
        <section className="pagehead">
          <div className="titleblock">
            <p className="eyebrow"><span className="dot" /> Hip replacement recovery · home from rehab Sat Nov 21, in 5 days</p>
            <h1>Ruth’s first four weeks home</h1>
            <ul className="meta">
              <li><CalendarClock size={14} /> Nov 21 – Dec 19 · 28 nights</li>
              <li><Car size={14} /> PT Mon/Wed/Fri 10:30am · Lakeshore Rehab</li>
              <li><Stethoscope size={14} /> Surgeon Wed Dec 2, 2:15pm</li>
            </ul>
          </div>
          <div className="stats">
            <CoverBar label="Overnights" total={NIGHTS} covered={nightsCovered} open={plan.nights.map((n) => !n)} />
            <CoverBar label="PT rides" total={RIDE_DAYS.length} covered={ridesCovered} open={RIDE_DAYS.map((d) => !plan.rides[d])} />
            {sent && !dirty ? (
              <button className="btn done" disabled><Check size={16} /> Sent to family</button>
            ) : (
              <button className="btn primary big" onClick={() => setSendOpen(true)}>
                <Send size={16} /> {dirty ? 'Send update' : 'Review & send'}
              </button>
            )}
          </div>
        </section>

        {sent && (
          <div className={`banner ${dirty ? 'warn' : 'ok'}`} role="status">
            {dirty ? <CircleAlert size={16} /> : <Check size={16} />}
            {dirty ? (
              <span>
                You changed the plan after sending. <b>{affected.map((p) => PEOPLE[p].first).join(', ').replace(/, ([^,]*)$/, ' and $1')}</b> {affected.length > 1 ? 'have' : 'has'} different nights or rides now.
              </span>
            ) : (
              <span>
                Sent to Tom, Marisol, David and Gloria · reply by <b>{sent.replyBy}</b> · <b>{confirmedCount} of 3</b> siblings confirmed
              </span>
            )}
            {dirty && <button className="btn primary sm" onClick={() => setSendOpen(true)}>Send update</button>}
          </div>
        )}

        <div className="board">
          <TodoPanel
            plan={plan}
            issues={issues}
            onPlaceStretch={placeStretch}
            onChooseStretch={() => setStretchModal({ preset: null })}
            onMarisolNights={(n) => commit(assignNights(plan, n, 'marisol'), `Marisol takes ${n.map(fmt).join(', ')}`)}
            onRides={doRides}
            onFill={(n) => commit(fairFill(plan, n), `Filled ${n.length} nights, fewest-nights-first`)}
            onOpenDay={(i, slot) => setSel({ i, slot })}
            onAskTom={(s) => commit({ ...plan, asks: [...plan.asks, s] }, `Added a Sunday dinner ask for Tom (${fmt(s)}) to your message`)}
            onDismiss={(id) => commit({ ...plan, dismissed: [...plan.dismissed, id] }, 'Marked as fine')}
            onAcceptAll={applyAll}
            onReview={() => setSendOpen(true)}
          />

          <Calendar
            plan={plan}
            selected={sel ? sel.i : null}
            focus={focus}
            onSelect={(i, slot) => setSel({ i, slot })}
            onClearFocus={() => setFocus(null)}
          />

          {sel ? (
            <DayPanel
              i={sel.i}
              slot={sel.slot}
              plan={plan}
              onBack={() => setSel(null)}
              onAssignNight={assignNight}
              onAssignRide={assignRide}
              onAssignAppt={(p) => commit({ ...plan, appt: p }, p ? `${PEOPLE[p].first} goes to the surgeon appointment` : 'Surgeon appointment needs someone')}
              onToggleCheckin={toggleCheckin}
            />
          ) : (
            <FamilyPanel
              plan={plan}
              focus={focus}
              onFocus={setFocus}
              onEditStretch={() => setStretchModal({ preset: null })}
              sent={sent ? { confirmed: sent.confirmed, affected } : null}
              onConfirm={(p) => setSent((s) => (s ? { ...s, confirmed: [...s.confirmed, p] } : s))}
            />
          )}
        </div>
      </main>

      {stretchModal && (
        <StretchModal plan={plan} preset={stretchModal.preset} onApply={placeStretch} onClose={() => setStretchModal(null)} />
      )}
      {sendOpen && (
        <SendModal
          plan={plan}
          mode={sent ? 'update' : 'first'}
          recipients={sent ? affected : RECIPIENTS}
          onSend={send}
          onClose={() => setSendOpen(false)}
        />
      )}

      <div className="toast-zone" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.msg}</span>
            {history.length > 0 && toast.msg !== 'Undone' && (
              <button onClick={() => { undo() }}><Undo2 size={14} /> Undo</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
