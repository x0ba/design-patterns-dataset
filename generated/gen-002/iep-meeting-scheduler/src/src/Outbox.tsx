import { useState } from 'react'
import { INTERP_EXTERNAL, INTERP_LEAD_HOURS, Meeting, ROLE_LABEL, TODAY, school } from './data'
import { addDays, fmtDay, fmtShort, fmtTime, pwnSendBy, pwnState } from './engine'
import { useStore } from './store'
import { Chip, Icon, StatusPill } from './ui'

type Tab = 'pwn' | 'interp' | 'confirm'

export function Outbox() {
  const { s } = useStore()
  const [tab, setTab] = useState<Tab>('pwn')
  const pwn = s.meetings.filter((m) => m.pwn.status !== 'sent')
  const interps = s.meetings.filter((m) => m.interp)
  const interpOpen = interps.filter((m) => m.interp!.status !== 'confirmed')
  const conf = s.meetings.flatMap((m) => m.participants.map((p, idx) => ({ m, p, idx }))).filter((x) => x.p.status !== 'confirmed' && x.p.status !== 'unavailable')
  const approvals = conf.filter((x) => x.p.status === 'excusal' || x.p.status === 'exception')

  return (
    <div className="outbox">
      <div className="tabs">
        <button className={tab === 'pwn' ? 'on' : ''} onClick={() => setTab('pwn')}>Prior written notices <em className={pwn.some((m) => pwnState(m).tone === 'bad') ? 'red' : ''}>{pwn.length}</em></button>
        <button className={tab === 'interp' ? 'on' : ''} onClick={() => setTab('interp')}>Interpreter requests <em>{interpOpen.length}</em></button>
        <button className={tab === 'confirm' ? 'on' : ''} onClick={() => setTab('confirm')}>Confirmations &amp; approvals <em>{conf.length}</em></button>
      </div>
      <div className="ob-body">
        {tab === 'pwn' && <PwnTab list={pwn} />}
        {tab === 'interp' && <InterpTab list={interps} />}
        {tab === 'confirm' && <ConfirmTab list={conf} approvals={approvals} />}
      </div>
    </div>
  )
}

function PwnTab({ list }: { list: Meeting[] }) {
  const { sendPwn, openDrawer } = useStore()
  const sorted = [...list].sort((a, b) => pwnSendBy(a.date).localeCompare(pwnSendBy(b.date)))
  return (
    <>
      <p className="ob-intro">Notice must reach parents at least <b>10 days</b> before each meeting. Sorted by send-by date; today is {fmtDay(TODAY)}.</p>
      {sorted.length === 0 && <div className="empty big">All notices are out.</div>}
      <ul className="rows">
        {sorted.map((m) => {
          const pw = pwnState(m)
          return (
            <li key={m.id} className={`row tone-${pw.tone}`}>
              <div className="r-main">
                <button className="linkname" onClick={() => openDrawer(m.id)}>{m.student}</button>
                <span className="sub">{school(m.school).short} · meeting {fmtDay(m.date)}, {fmtTime(m.start)}</span>
                {pw.tone === 'bad' && m.pwn.status === 'draft' && <span className="sub strong-red">Already inside the 10-day window — a notice sent today can only support {fmtDay(addDays(TODAY, 10))} or later</span>}
                {m.pwn.status === 'reissue' && <span className="sub">Date changed — previous notice withdrawn</span>}
                {m.interp?.language === 'Somali' && <span className="sub"><Icon name="globe" size={12} /> Notice must be translated into Somali</span>}
              </div>
              <div className="r-when">
                <span className="eyebrow">Send by</span>
                <b>{fmtDay(pw.sendBy)}</b>
              </div>
              <Chip tone={pw.tone === 'bad' ? 'red' : pw.tone === 'warn' ? 'amber' : 'neutral'}>{pw.label}</Chip>
              {pw.tone === 'bad' ? (
                <div className="r-actions">
                  <button className="btn ghost sm" onClick={() => sendPwn(m.id)}>Send anyway</button>
                  <button className="btn primary sm" onClick={() => openDrawer(m.id)}><Icon name="calendar" size={13} /> Reschedule</button>
                </div>
              ) : (
                <button className="btn primary sm" onClick={() => sendPwn(m.id)}><Icon name="send" size={13} /> Send notice</button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function InterpTab({ list }: { list: Meeting[] }) {
  const { submitInterp, openDrawer } = useStore()
  const sorted = [...list].sort((a, b) => (a.interp!.status === 'confirmed' ? 1 : 0) - (b.interp!.status === 'confirmed' ? 1 : 0) || a.date.localeCompare(b.date))
  return (
    <>
      <p className="ob-intro">District Language Services needs <b>{INTERP_LEAD_HOURS} hours’</b> lead time. Two Somali interpreters (Hodan Warsame, Abdi Mohamud) are shared across the district.</p>
      <ul className="rows">
        {sorted.map((m) => {
          const ip = m.participants.find((p) => p.role === 'interp')!
          const st = m.interp!.status
          return (
            <li key={m.id} className={`row tone-${st === 'request-needed' ? 'warn' : 'muted'}`}>
              <div className="r-main">
                <button className="linkname" onClick={() => openDrawer(m.id)}>{m.student}</button>
                <span className="sub">{m.interp!.language} · {school(m.school).short} · {fmtDay(m.date)}, {fmtTime(m.start)}</span>
              </div>
              <div className="r-when"><span className="eyebrow">Interpreter</span><b>{ip.name}</b></div>
              <Chip tone={st === 'confirmed' ? 'green' : st === 'requested' ? 'blue' : 'amber'}>{st === 'confirmed' ? 'Booked' : st === 'requested' ? 'Requested' : 'Request needed'}</Chip>
              {st === 'request-needed' ? (
                <button className="btn primary sm" onClick={() => submitInterp(m.id)}><Icon name="send" size={13} /> Submit request</button>
              ) : <span className="r-spacer" />}
            </li>
          )
        })}
      </ul>
      <h4 className="ob-sub">Other bookings on the interpreters’ calendars</h4>
      <ul className="rows slim">
        {INTERP_EXTERNAL.map((x, i) => (
          <li key={i} className="row tone-muted">
            <div className="r-main"><b>{x.who}</b><span className="sub">{x.what}</span></div>
            <div className="r-when"><b>{fmtDay(x.date)}</b><span className="sub">{fmtTime(x.start)}–{fmtTime(x.end)}</span></div>
          </li>
        ))}
      </ul>
    </>
  )
}

function ConfirmTab({ list, approvals }: { list: { m: Meeting; p: Meeting['participants'][number]; idx: number }[]; approvals: { m: Meeting; p: Meeting['participants'][number]; idx: number }[] }) {
  const { confirm, remind, openDrawer } = useStore()
  const rest = list.filter((x) => !approvals.includes(x)).sort((a, b) => a.m.date.localeCompare(b.m.date))
  const line = (x: (typeof list)[number]) => (
    <li key={x.m.id + x.idx} className="row tone-muted">
      <div className="r-main">
        <button className="linkname" onClick={() => openDrawer(x.m.id)}>{x.p.name}</button>
        <span className="sub">{ROLE_LABEL[x.p.role]} · {x.m.student}, {school(x.m.school).short} · {fmtShort(x.m.date)}</span>
        {x.p.note && <span className="sub">{x.p.note}</span>}
      </div>
      <StatusPill status={x.p.status} />
      <div className="r-actions">
        {x.p.status === 'pending' && <button className="btn ghost sm" onClick={() => remind(x.m.id, x.idx)}>Remind</button>}
        <button className="btn sm" onClick={() => confirm(x.m.id, x.idx)}>{x.p.status === 'excusal' ? 'Consent received' : x.p.status === 'exception' ? 'He agreed' : x.p.role === 'parent' ? 'Log confirmation' : 'Mark confirmed'}</button>
      </div>
    </li>
  )
  return (
    <>
      {approvals.length > 0 && (
        <>
          <h4 className="ob-sub first">Approvals &amp; consents <Chip tone="amber">{approvals.length}</Chip></h4>
          <ul className="rows">{approvals.map(line)}</ul>
        </>
      )}
      <h4 className={`ob-sub ${approvals.length ? '' : 'first'}`}>Awaiting a reply <Chip>{rest.length}</Chip></h4>
      <ul className="rows">{rest.map(line)}</ul>
      <p className="ob-foot">Today is {fmtDay(TODAY)}; interpreter lead time cut-off for a {fmtShort(addDays(TODAY, 2))} meeting is today.</p>
    </>
  )
}
