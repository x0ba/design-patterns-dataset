import { CLOSURES, INTERP_EXTERNAL, INTERP_LEAD_HOURS, LEAVE, PWN_DAYS, STAFF, school } from './data'
import { fmtDay, fmtShort, fmtTime } from './engine'
import { useStore } from './store'
import { Chip } from './ui'

const DAYS = ['M', 'T', 'W', 'T', 'F']

export function People() {
  const { s } = useStore()
  const hard = s.meetings.filter((m) => m.parent.after != null || m.parent.before != null || m.interp)
  return (
    <div className="people-page">
      <section className="card">
        <h3>Rules the scheduler enforces</h3>
        <ul className="rules">
          <li><b>Prior written notice</b> at least {PWN_DAYS} calendar days before the meeting. A new date means a new notice.</li>
          <li><b>Interpreters</b> need {INTERP_LEAD_HOURS} hours’ lead time through District Language Services.</li>
          <li><b>District closed</b> {CLOSURES.map((c) => `${fmtShort(c.from)} – ${fmtShort(c.to)}`).join(' and ')}. A due date inside a closure moves up to the last open day.</li>
          <li><b>Meeting hours</b> 8:00 AM – 6:00 PM, 30-minute start times. Nobody is booked into two meetings at once, and rooms can’t be double-held.</li>
        </ul>
      </section>

      <section className="card">
        <h3>Somali interpreters</h3>
        {['Hodan Warsame', 'Abdi Mohamud'].map((n) => (
          <div className="ip" key={n}>
            <b>{n}</b>
            <ul>
              {INTERP_EXTERNAL.filter((x) => x.who === n).map((x, i) => <li key={i}><span>{fmtDay(x.date)} · {fmtTime(x.start)}–{fmtTime(x.end)}</span><em>{x.what}</em></li>)}
              {s.meetings.filter((m) => m.participants.some((p) => p.role === 'interp' && p.name === n)).map((m) => (
                <li key={m.id}><span>{fmtDay(m.date)} · {fmtTime(m.start)}–{fmtTime(m.start + m.dur)}</span><em>{m.student}, {school(m.school).short} (IEP)</em></li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="card wide">
        <h3>Staff availability</h3>
        <table className="tbl compact">
          <thead><tr><th>Person</th><th>Role</th><th>Days</th><th>Schools</th><th>Notes</th></tr></thead>
          <tbody>
            {Object.values(STAFF).filter((p) => !p.title.includes('interpreter')).map((p) => (
              <tr key={p.name}>
                <td><b>{p.name}</b></td>
                <td>{p.title}</td>
                <td>
                  <span className="dayset">
                    {DAYS.map((d, i) => <i key={i} className={!p.days || p.days.includes(i + 1) ? 'on' : ''}>{d}</i>)}
                  </span>
                </td>
                <td>{p.schools ? p.schools.map((id) => school(id).short).join(', ') : 'Region-wide'}</td>
                <td>
                  {p.leave ? <Chip tone="red">Leave {fmtShort(p.leave.from)} – {fmtShort(LEAVE.to)}</Chip> : null}
                  {p.name === 'Dr. Paul Ostrowski' && <Chip tone="teal">Substitute</Chip>} <span className="muted">{p.note}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card wide">
        <h3>Family constraints from contact logs</h3>
        <ul className="fam">
          {hard.map((m) => (
            <li key={m.id}>
              <b>{m.parent.name}</b>
              <span>{m.student} · {school(m.school).short}</span>
              <em>{m.parent.note}</em>
              {m.parent.after != null && <Chip tone="amber">After {fmtTime(m.parent.after)}</Chip>}
              {m.interp && <Chip>{m.interp.language}</Chip>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
