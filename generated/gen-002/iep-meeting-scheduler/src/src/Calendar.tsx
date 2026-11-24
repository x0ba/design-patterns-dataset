import { useMemo, useState } from 'react'
import { LEAVE, Meeting, OST, SCHOOLS, STAFF, TYPE_SHORT, school } from './data'
import { WEEKS, dow, dowName, effectiveDeadline, fmtRange, fmtShort, fmtTime, pwnState } from './engine'
import { useStore } from './store'
import { Icon } from './ui'

const H0 = 8
const H1 = 18
const PX = 66

export function CalendarView() {
  const { s, openDrawer, triageOf } = useStore()
  const [wk, setWk] = useState(0)
  const [sch, setSch] = useState('all')
  const [linOnly, setLinOnly] = useState(false)
  const days = WEEKS[wk]
  const shown = useMemo(() => s.meetings.filter((m) => (sch === 'all' || m.school === sch) && (!linOnly || m.coverage === 'lin')), [s.meetings, sch, linOnly])
  const dueCount = (d: string) => s.meetings.filter((m) => effectiveDeadline(m.due) === d).length

  return (
    <div className="cal">
      <div className="cal-bar">
        <div className="seg">
          {WEEKS.map((w, i) => (
            <button key={i} className={wk === i ? 'on' : ''} onClick={() => setWk(i)}>
              {fmtShort(w[0])} – {fmtShort(w[4])}
              <em>{s.meetings.filter((m) => m.date >= w[0] && m.date <= w[4]).length}</em>
            </button>
          ))}
        </div>
        <label className="sel-wrap">
          <span>School</span>
          <select value={sch} onChange={(e) => setSch(e.target.value)}>
            <option value="all">All 11 schools</option>
            {SCHOOLS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <button className={`tog ${linOnly ? 'on' : ''}`} onClick={() => setLinOnly(!linOnly)}><span className="sw" />Lin’s six only</button>
        <div className="cal-key">
          <span><i className="k lin" />Needs decision</span>
          <span><i className="k done" />Resolved</span>
          <span><i className="k late" />Notice overdue</span>
          <span><i className="k std" />Other meetings</span>
        </div>
      </div>

      <div className="cal-grid">
        <div className="cal-heads">
          <div className="gutter" />
          {days.map((d) => {
            const lin = d >= LEAVE.from && d <= LEAVE.to
            const w = dow(d)
            const ostIn = STAFF[OST].days!.includes(w)
            const kimIn = STAFF['Rhonda Kim'].days!.includes(w)
            const due = dueCount(d)
            return (
              <div className="cal-head" key={d}>
                <div className="ch-top">
                  <b>{dowName(d)}</b> <span>{fmtShort(d)}</span>
                  {due > 0 && <span className="duepill">{due} due</span>}
                </div>
                <div className="ribbons">
                  <span className={lin ? 'out' : 'in'}>Lin {lin ? 'out' : 'back'}</span>
                  <span className={ostIn ? 'in' : 'off'}>{ostIn ? 'Ostrowski in' : 'Ostrowski off'}</span>
                  <span className={kimIn ? 'in' : 'off'}>Kim {kimIn ? 'in' : 'off'}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="cal-scroll">
          <div className="cal-cols" style={{ height: (H1 - H0) * PX }}>
            <div className="gutter">
              {Array.from({ length: H1 - H0 }, (_, i) => (
                <div key={i} className="hour" style={{ top: i * PX }}>{fmtTime((H0 + i) * 60).replace(':00', '')}</div>
              ))}
            </div>
            {days.map((d) => (
              <div className="cal-col" key={d}>
                {Array.from({ length: H1 - H0 }, (_, i) => <div key={i} className="hline" style={{ top: i * PX }} />)}
                {layout(shown.filter((m) => m.date === d)).map(({ m, lane, lanes }) => {
                  const t = m.coverage === 'lin' ? triageOf(m).kind : null
                  const late = pwnState(m).tone === 'bad'
                  const cls = t === 'resolved' ? 'done' : t ? 'lin' : late ? 'late' : 'std'
                  const top = ((m.start - H0 * 60) / 60) * PX
                  const h = (m.dur / 60) * PX
                  return (
                    <button
                      key={m.id}
                      className={`ev ev-${cls} ${m.dur <= 30 ? 'short' : ''}`}
                      style={{ top, height: h - 2, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
                      onClick={() => openDrawer(m.id)}
                      title={`${m.student} — ${fmtRange(m.start, m.dur)}`}
                    >
                      <span className="ev-time">{fmtTime(m.start, false)}</span>
                      <span className="ev-name">{m.student}</span>
                      <span className="ev-sub">{school(m.school).short} · {TYPE_SHORT[m.type]}</span>
                      {cls === 'lin' && <span className="ev-flag"><Icon name="alert" size={11} /></span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function layout(list: Meeting[]) {
  const sorted = [...list].sort((a, b) => a.start - b.start)
  const out: { m: Meeting; lane: number; lanes: number }[] = []
  let cluster: { m: Meeting; lane: number }[] = []
  let clusterEnd = -1
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1))
    cluster.forEach((c) => out.push({ ...c, lanes }))
    cluster = []
  }
  for (const m of sorted) {
    if (cluster.length && m.start >= clusterEnd) flush()
    const used = new Set(cluster.filter((c) => c.m.start + c.m.dur > m.start).map((c) => c.lane))
    let lane = 0
    while (used.has(lane)) lane++
    cluster.push({ m, lane })
    clusterEnd = Math.max(clusterEnd, m.start + m.dur)
  }
  flush()
  return out
}
