import { useMemo, useState } from 'react'
import { MType, SCHOOLS, TYPE_LABEL, school } from './data'
import { fmtDay, fmtTime, pwnState } from './engine'
import { deadlineInfo } from './MeetingPanel'
import { useStore } from './store'
import { Chip, DotsFor, Icon, TypeTag } from './ui'

export function MeetingsView() {
  const { s, openDrawer } = useStore()
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | MType>('all')
  const [sch, setSch] = useState('all')
  const [attn, setAttn] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return s.meetings
      .filter((m) => (type === 'all' || m.type === type) && (sch === 'all' || m.school === sch))
      .filter((m) => !needle || `${m.student} ${school(m.school).name} ${m.parent.name} ${m.participants.map((p) => p.name).join(' ')}`.toLowerCase().includes(needle))
      .filter((m) => !attn || (m.coverage === 'lin' && !m.resolution) || pwnState(m).tone === 'bad' || pwnState(m).tone === 'warn')
      .sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')))
  }, [s.meetings, q, type, sch, attn])

  return (
    <div className="tbl-page">
      <div className="tbl-bar">
        <label className="search">
          <Icon name="list" size={14} />
          <input placeholder="Search student, school, or person" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="sel-wrap"><span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as 'all' | MType)}>
            <option value="all">All types</option>
            {(Object.keys(TYPE_LABEL) as MType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="sel-wrap"><span>School</span>
          <select value={sch} onChange={(e) => setSch(e.target.value)}>
            <option value="all">All 11 schools</option>
            {SCHOOLS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <button className={`tog ${attn ? 'on' : ''}`} onClick={() => setAttn(!attn)}><span className="sw" />Needs attention</button>
        <span className="tbl-count">{rows.length} of {s.meetings.length} meetings · Nov 30 – Dec 18</span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>When</th><th>Student</th><th>Type</th><th>Compliance due</th><th>Psychologist</th><th>Confirmed</th><th>Notice</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const dl = deadlineInfo(m)
              const pw = pwnState(m)
              const psych = m.participants.find((p) => p.role === 'psych')
              const conf = m.participants.filter((p) => p.status === 'confirmed').length
              const lin = m.coverage === 'lin' && !m.resolution
              return (
                <tr key={m.id} onClick={() => openDrawer(m.id)} className={lin ? 'row-lin' : ''}>
                  <td className="nowrap"><b>{fmtDay(m.date)}</b><span className="sub">{fmtTime(m.start)} · {m.dur} min</span></td>
                  <td><b>{m.student}</b><span className="sub">Gr {m.grade} · {school(m.school).short}</span></td>
                  <td><TypeTag type={m.type} /></td>
                  <td className="nowrap">
                    {dl ? <><b className={dl.left <= 14 ? 'strong-amber' : ''}>{fmtDay(dl.eff)}</b><span className="sub">{dl.left} days{dl.shifted ? ' · closure moves it up' : ''}</span></> : <span className="muted">—</span>}
                  </td>
                  <td>
                    {psych ? (
                      <>
                        {psych.name}
                        {psych.status === 'unavailable' && <Chip tone="red">On leave</Chip>}
                        {m.coverage === 'lin' && psych.name.includes('Ostrowski') && <Chip tone="teal">Sub</Chip>}
                      </>
                    ) : <span className="muted">Not required</span>}
                  </td>
                  <td><span className="conf"><DotsFor statuses={m.participants.map((p) => p.status)} /> {conf}/{m.participants.length}</span></td>
                  <td><Chip tone={pw.tone === 'ok' ? 'green' : pw.tone === 'bad' ? 'red' : pw.tone === 'warn' ? 'amber' : 'neutral'}>{pw.label}</Chip></td>
                  <td className="go"><Icon name="chevron" size={14} /></td>
                </tr>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="empty">No meetings match those filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
