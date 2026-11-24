import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Exceptions, Meeting, OST, ROLE_LABEL, TODAY, TYPE_LABEL, school,
} from './data'
import {
  DayInfo, GRID_STARTS, WEEKS, daysLeft, diffDays, dayNum, effectiveDeadline, evaluate, fmtDay, fmtRange,
  fmtShort, fmtTime, pwnSendBy, pwnState, scanDay,
} from './engine'
import { useStore } from './store'
import { Chip, Icon, StatusPill, TypeTag } from './ui'

// ---------------------------------------------------------------------------
export function deadlineInfo(m: Meeting) {
  if (!m.due) return null
  const eff = effectiveDeadline(m.due)!
  const left = daysLeft(eff)
  return { due: m.due, eff, left, shifted: eff !== m.due }
}

export function MeetingPanel({ m, stacked }: { m: Meeting; stacked?: boolean }) {
  const { s } = useStore()
  const sch = school(m.school)
  const dl = deadlineInfo(m)
  const pw = pwnState(m)
  return (
    <div className={`mpanel ${stacked ? 'stacked' : ''}`}>
      <header className="mhead">
        <div className="mhead-main">
          <div className="mhead-title">
            <h2>{m.student}</h2>
            <TypeTag type={m.type} />
            {m.coverage === 'lin' && <Chip tone="red" icon="alert">Dr. Lin coverage</Chip>}
          </div>
          <div className="mhead-meta">
            Grade {m.grade} · {sch.name} · SIS {m.sis} · <span className="mono">{m.id}</span>
          </div>
        </div>
        <div className="mhead-slot">
          <div className="slot-when">
            <Icon name="calendar" size={14} /> {fmtDay(m.date)} · {fmtRange(m.start, m.dur)}
          </div>
          <div className="slot-where">
            <Icon name="pin" size={14} /> {m.room}
          </div>
          {m.origin && (
            <div className="slot-was">Was {fmtDay(m.origin.date)}, {fmtTime(m.origin.start)}</div>
          )}
        </div>
      </header>

      <div className="clock-row">
        <div className="clock-cell">
          <span className="eyebrow">Compliance clock</span>
          {dl ? (
            <>
              <strong>
                {TYPE_LABEL[m.type]} due {fmtDay(dl.due)}
              </strong>
              <span className={`muted ${dl.left <= 14 ? 'strong-amber' : ''}`}>
                {dl.left} days left
                {dl.shifted && <> · district closed then, so the last meeting day is <b>{fmtDay(dl.eff)}</b></>}
              </span>
            </>
          ) : (
            <>
              <strong>No statutory clock</strong>
              <span className="muted">Team-requested amendment</span>
            </>
          )}
        </div>
        <div className="clock-cell">
          <span className="eyebrow">Prior written notice</span>
          <strong>
            {m.pwn.status === 'sent' ? `Sent ${fmtShort(m.pwn.sentOn!)}` : m.pwn.status === 'reissue' ? 'Re-issue needed' : 'Draft, not sent'}
          </strong>
          <span className={pw.tone === 'bad' ? 'strong-red' : pw.tone === 'warn' ? 'strong-amber' : 'muted'}>
            {m.pwn.status === 'sent' ? `Needed by ${fmtShort(pwnSendBy(m.date))} · on time` : `Must go out by ${fmtDay(pwnSendBy(m.date))}${pw.tone === 'bad' ? ` — ${pw.label.toLowerCase()}` : ''}`}
          </span>
        </div>
        <div className="clock-cell">
          <span className="eyebrow">Family</span>
          <strong>{m.parent.name}</strong>
          <span className="muted">{m.parent.note}</span>
        </div>
      </div>

      <div className="mbody">
        <section className="mcol people">
          <h3>Required participants</h3>
          <ul className="plist">
            {m.participants.map((p, i) => (
              <li key={i}>
                <div className="pl-role">{ROLE_LABEL[p.role]}</div>
                <div className="pl-name">
                  {p.name}
                  {p.role === 'interp' && <Icon name="globe" size={12} />}
                </div>
                <StatusPill status={p.status} />
                {p.note && <div className="pl-note">{p.note}</div>}
              </li>
            ))}
          </ul>
          <details className="activity">
            <summary>Activity ({m.log.length})</summary>
            <ol>
              {[...m.log].reverse().map((l, i) => (
                <li key={i}>
                  <span className="mono">{fmtShort(l.at)}</span> {l.text}
                </li>
              ))}
            </ol>
          </details>
        </section>
        <section className="mcol resolve">
          <Resolve key={m.id + (s.meetings.find((x) => x.id === m.id)?.resolution?.text ?? '')} m={m} />
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function CheckList({ checks, cols = 1 }: { checks: { ok: boolean; label: string; detail: string; excepted?: boolean }[]; cols?: 1 | 2 }) {
  return (
    <ul className={`checks cols-${cols}`}>
      {checks.map((c, i) => (
        <li key={i} className={c.ok ? (c.excepted ? 'warn' : 'ok') : 'bad'}>
          <span className="ck">
            <Icon name={c.ok ? (c.excepted ? 'alert' : 'check') : 'x'} size={12} />
          </span>
          <span>
            <b>{c.label}</b>
            <em>{c.detail}</em>
          </span>
        </li>
      ))}
    </ul>
  )
}

function Resolve({ m }: { m: Meeting }) {
  const { triageOf, swap, go } = useStore()
  const t = triageOf(m)
  const isLin = m.coverage === 'lin'
  const [ex, setEx] = useState<Exceptions>({})
  const [open, setOpen] = useState(!isLin ? false : t.kind === 'reschedule' || t.kind === 'blocked')
  const hasSlp = m.participants.some((p) => p.role === 'slp')
  const hasOt = m.participants.some((p) => p.role === 'ot')
  const pw = pwnState(m)

  const outstanding: string[] = []
  if (m.pwn.status !== 'sent') outstanding.push(`Send prior written notice by ${fmtDay(pwnSendBy(m.date))}`)
  if (m.interp?.status === 'request-needed') outstanding.push(`Submit ${m.interp.language} interpreter request`)
  m.participants.forEach((p) => {
    if (p.status === 'pending') outstanding.push(`${p.name} to confirm`)
    if (p.status === 'excusal') outstanding.push(`${p.name}: parent consent + written input`)
    if (p.status === 'exception') outstanding.push(`${p.name}: agree to off-schedule day`)
  })

  // ---- resolved
  if (m.resolution && !open) {
    return (
      <div className="rcard resolved">
        <div className="rc-head">
          <span className="rc-ico ok"><Icon name="check" size={14} /></span>
          <div>
            <h3>Resolved</h3>
            <p>{m.resolution.text}</p>
          </div>
        </div>
        {outstanding.length > 0 && (
          <>
            <div className="eyebrow">Still open</div>
            <ul className="todo">
              {outstanding.slice(0, 6).map((o, i) => <li key={i}>{o}</li>)}
              {outstanding.length > 6 && <li className="muted">+{outstanding.length - 6} more</li>}
            </ul>
            <button className="btn link" onClick={() => go('outbox')}>
              Open Notices &amp; replies <Icon name="chevron" size={12} />
            </button>
          </>
        )}
        <button className="btn ghost sm" onClick={() => setOpen(true)}>Change the plan</button>
      </div>
    )
  }

  return (
    <div className="resolve-stack">
      {!m.resolution && !isLin && m.pwn.status === 'draft' && pw.tone === 'bad' && (
        <div className="callout red">
          <Icon name="alert" />
          <div>
            <b>Notice is {diffDays(pwnSendBy(m.date), TODAY)} days late.</b>
            <p>It should have gone out {fmtDay(pwnSendBy(m.date))}. Holding {fmtDay(m.date)} would break the 10-day rule; with a notice sent today the earliest compliant date is {fmtDay(addTen())}. Reschedule below.</p>
          </div>
        </div>
      )}

      {isLin && !m.resolution && t.kind === 'swap' && t.swap && (
        <div className="rcard primary">
          <div className="rc-head">
            <span className="rc-ico swap"><Icon name="swap" size={14} /></span>
            <div>
              <h3>Swap in Dr. Ostrowski</h3>
              <p>
                Keep {fmtDay(m.date)}, {fmtTime(m.start)} at {school(m.school).short}. The date doesn’t change, so the notice that already went out stands.
              </p>
            </div>
          </div>
          <CheckList checks={t.swap.checks.filter((c) => ['psych', 'deadline', 'pwn', 'family', 'slp', 'room'].includes(c.key))} cols={2} />
          <div className="rc-foot">
            <button className="btn primary" onClick={() => swap(m.id)}>
              <Icon name="swap" size={14} /> Assign Dr. Ostrowski
            </button>
            <span className="muted">He gets a confirmation request; {m.parent.name} gets the updated attendee list.</span>
          </div>
        </div>
      )}

      {isLin && !m.resolution && t.kind === 'reschedule' && (
        <div className="callout amber">
          <Icon name="alert" />
          <div>
            <b>Can’t be swapped in place.</b>
            <p>{t.detail} Choose a new date below; every option shown already clears the deadline, 10-day notice, and each person’s availability.</p>
          </div>
        </div>
      )}

      {isLin && !m.resolution && t.kind === 'blocked' && (
        <div className="callout red">
          <Icon name="alert" />
          <div>
            <b>{t.headline}.</b>
            <p>{blockedExplain(m)}</p>
            {t.near && t.near.length > 0 && (
              <div className="near">
                <span className="eyebrow">Closest paths (each needs someone’s sign-off)</span>
                {t.near.map((n) => {
                  const k = n.key === 'ost' ? 'ostOffSchedule' : n.key
                  const on = !!ex[k as keyof Exceptions]
                  return (
                    <button key={n.key} className={`nearbtn ${on ? 'on' : ''}`} onClick={() => { setEx({ ...ex, [k]: !on }); setOpen(true) }}>
                      <span className="sw" />
                      <span>
                        {n.label}
                        <em>{n.days} workable day{n.days > 1 ? 's' : ''} before the deadline</em>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!open && (
        <button className="btn ghost" onClick={() => setOpen(true)}>
          <Icon name="calendar" size={14} /> {isLin && t.kind === 'swap' ? 'Or pick a different date' : 'Reschedule this meeting'}
        </button>
      )}
      {open && (
        <Picker m={m} ex={ex} setEx={setEx} showEx={t.kind === 'blocked' || Object.values(ex).some(Boolean)} hasSlp={hasSlp} hasOt={hasOt} isLin={isLin}
          onClose={m.resolution || t.kind === 'swap' || !isLin ? () => setOpen(false) : undefined} />
      )}
    </div>
  )
}

const addTen = () => {
  const d = new Date(TODAY + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 10)
  return d.toISOString().slice(0, 10)
}

function blockedExplain(m: Meeting) {
  if (m.participants.some((p) => p.role === 'slp' && p.name === 'Rhonda Kim')) {
    return `Rhonda Kim is only at ${school(m.school).short} Tuesdays and Thursdays. Dr. Ostrowski is only in Mondays, Wednesdays and Fridays. Dr. Lin is out through Dec 12, and the 10-day notice rule puts the earliest date at ${fmtShort(addTen())}, so no day has both of them before the ${fmtShort(effectiveDeadline(m.due)!)} deadline.`
  }
  return 'No day before the deadline has every required person available.'
}

// ---------------------------------------------------------------------------
function Picker({
  m, ex, setEx, showEx, hasSlp, hasOt, isLin, onClose,
}: {
  m: Meeting; ex: Exceptions; setEx: (e: Exceptions) => void; showEx: boolean; hasSlp: boolean; hasOt: boolean; isLin: boolean; onClose?: () => void
}) {
  const { s, move } = useStore()
  const [exOpen, setExOpen] = useState(showEx)
  const infos = useMemo(() => {
    const o: Record<string, DayInfo> = {}
    for (const w of WEEKS) for (const d of w) o[d] = scanDay(m, s.meetings, d, { exceptions: ex })
    return o
  }, [m, s.meetings, ex])
  const firstOpen = Object.values(infos).find((i) => i.open.length)?.date
  const [chosen, setDate] = useState<string | undefined>()
  const date = chosen ?? firstOpen
  const [start, setStart] = useState<number | undefined>()

  const evals = useMemo(() => (date ? GRID_STARTS.map((st) => ({ st, ev: evaluate(m, s.meetings, date, st, { exceptions: ex }) })) : []), [date, m, s.meetings, ex])
  const picked = date && start != null ? evals.find((e) => e.st === start) : undefined
  const ev = picked?.ev.ok ? picked.ev : undefined
  const sel = date ? infos[date] : undefined
  const anyEx = Object.values(ex).some(Boolean)
  const curPsych = m.participants.find((p) => p.role === 'psych')
  const ip = m.participants.find((p) => p.role === 'interp')

  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (start != null) boxRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [start])
  const toggle = (k: keyof Exceptions) => { setEx({ ...ex, [k]: !ex[k] }); setStart(undefined) }

  return (
    <div className="picker">
      <div className="pk-head">
        <h3>Pick a new date</h3>
        <div className="pk-legend">
          <span><i className="lg open" />Workable</span>
          <span><i className="lg shut" />Blocked — reason shown</span>
        </div>
        {onClose && <button className="btn ghost sm" onClick={onClose}>Close</button>}
      </div>

      {(hasSlp || hasOt || isLin) && (
        <div className="exrow">
          {!exOpen ? (
            <button className="btn link" onClick={() => setExOpen(true)}>Need an exception? <Icon name="chevdown" size={12} /></button>
          ) : (
            <>
              <span className="eyebrow">Exceptions (need sign-off)</span>
              {hasSlp && <button className={`tog ${ex.slp ? 'on' : ''}`} onClick={() => toggle('slp')}><span className="sw" />Excuse SLP</button>}
              {hasOt && <button className={`tog ${ex.ot ? 'on' : ''}`} onClick={() => toggle('ot')}><span className="sw" />Excuse OT</button>}
              {isLin && <button className={`tog ${ex.ostOffSchedule ? 'on' : ''}`} onClick={() => toggle('ostOffSchedule')}><span className="sw" />Dr. Ostrowski off-schedule</button>}
              {(ex.slp || ex.ot) && <p className="exnote">An excusal needs the parent’s written consent and the excused provider’s written input before the meeting (34 CFR 300.321(e)).</p>}
              {ex.ostOffSchedule && <p className="exnote">Dr. Ostrowski would have to agree to a day or school outside his published Mon/Wed/Fri schedule.</p>}
            </>
          )}
        </div>
      )}

      <div className="weeks">
        <div className="wk-row wk-head">
          <span />
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => <span key={d}>{d}</span>)}
        </div>
        {WEEKS.map((w) => (
          <div className="wk-row" key={w[0]}>
            <span className="wk-lab">{fmtShort(w[0])}</span>
            {w.map((d) => {
              const i = infos[d]
              const cur = d === m.date && !m.resolution
              return (
                <button
                  key={d}
                  className={`day ${i.open.length ? 'open' : 'shut'} ${date === d ? 'sel' : ''}`}
                  onClick={() => { setDate(d); setStart(undefined) }}
                  title={i.open.length ? `${i.open.length} start times` : i.detail}
                >
                  <span className="dn">{dayNum(d)}</span>
                  <span className="dtags">
                    {cur && <span className="tag cur">Now</span>}
                    {i.last && <span className="tag due">Due</span>}
                  </span>
                  <span className="dst">{i.open.length ? `${i.open.length} open` : i.reason}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {date && sel && (
        <div className="times">
          <div className="times-head">
            <b>{fmtDay(date)}</b>
            <span className="muted">{sel.open.length ? `${m.dur} min meeting · pick a start time` : sel.detail}</span>
          </div>
          {sel.open.length > 0 && (
            <div className="tgrid">
              {evals.map(({ st, ev: e }) => {
                const bad = e.checks.find((c) => !c.ok)
                return (
                  <button key={st} disabled={!e.ok} className={`tbtn ${start === st ? 'sel' : ''}`} onClick={() => setStart(st)} title={bad?.detail}>
                    {fmtTime(st)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {ev && date && start != null && (
        <div className="confirmbox" ref={boxRef}>
          <div className="cb-title">
            <b>{fmtDay(date)}, {fmtRange(start, m.dur)}</b>
            <span className="muted">{m.room}</span>
          </div>
          <CheckList checks={ev.checks.filter((c) => !['closed', 'room'].includes(c.key))} cols={2} />
          <div className="eyebrow">What happens when you move it</div>
          <ul className="todo">
            <li>New prior written notice drafted — must go out by <b>{fmtDay(pwnSendBy(date))}</b>; the old one is withdrawn.</li>
            {curPsych && ev.psych && ev.psych !== curPsych.name && <li>{ev.psych} replaces {curPsych.name}{ev.psych === OST ? ' as the substitute' : ''}.</li>}
            {ip && m.interp && <li>{m.interp.language} interpreter: release {ip.name}’s current booking, request {ev.interp} for this slot.</li>}
            <li>{m.participants.length} participants asked to reconfirm.</li>
            {anyEx && <li><b>Exception paperwork</b> opens in Notices &amp; replies.</li>}
          </ul>
          <div className="rc-foot">
            <button className="btn primary" onClick={() => { move(m.id, date, start, ex); onClose?.() }}>
              <Icon name="check" size={14} /> {anyEx ? 'Move with exceptions' : 'Move meeting'}
            </button>
            <button className="btn ghost" onClick={() => setStart(undefined)}>Pick another time</button>
          </div>
        </div>
      )}
    </div>
  )
}
