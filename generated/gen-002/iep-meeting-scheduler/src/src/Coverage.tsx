import { LEAVE, Meeting, OST, school } from './data'
import { MeetingPanel, deadlineInfo } from './MeetingPanel'
import { addDays, fmtDay, fmtShort, fmtTime } from './engine'
import { useStore } from './store'
import { Chip, Icon, TypeTag } from './ui'

const GROUPS = [
  { kind: 'blocked', label: 'No compliant date', tone: 'red', hint: 'Needs your call' },
  { kind: 'reschedule', label: 'Must be rescheduled', tone: 'amber', hint: 'Workable dates found' },
  { kind: 'swap', label: 'Can swap to Dr. Ostrowski', tone: 'teal', hint: 'Keep date and time' },
  { kind: 'resolved', label: 'Resolved', tone: 'green', hint: '' },
] as const

export function Coverage() {
  const { s, select, triageOf, linMeetings } = useStore()
  const withT = linMeetings.map((m) => ({ m, t: triageOf(m) }))
  const selected = s.meetings.find((m) => m.id === s.selected) ?? linMeetings[0]
  const resolved = withT.filter((x) => x.t.kind === 'resolved').length

  return (
    <div className="coverage">
      <div className="banner">
        <div className="banner-ico"><Icon name="alert" size={18} /></div>
        <div className="banner-text">
          <b>Dr. Mei Lin is on medical leave {fmtShort(LEAVE.from)} – {fmtShort(LEAVE.to)}</b>
          <span>
            Back Mon {fmtShort(addDays(LEAVE.to, 2))}. Six meetings in the Nov 30 – Dec 18 window list her as the psychologist.
            Substitute <b>{OST}</b> works Mon / Wed / Fri at Whitfield, Hartwell, Eastgate and Pinecrest only.
          </span>
        </div>
        <div className="banner-prog">
          <div className="bp-num"><b>{resolved}</b> / {withT.length}</div>
          <div className="bp-lab">resolved</div>
          <div className="bp-bar"><i style={{ width: `${(resolved / withT.length) * 100}%` }} /></div>
        </div>
      </div>

      <div className="cov-body">
        <aside className="cov-list">
          {GROUPS.map((g) => {
            const items = withT.filter((x) => x.t.kind === g.kind).sort((a, b) => (a.m.date + a.m.start).localeCompare(b.m.date + b.m.start))
            if (!items.length) return null
            return (
              <section key={g.kind}>
                <h4 className={`grp grp-${g.tone}`}>
                  <i /> {g.label} <span className="count">{items.length}</span>
                  {g.hint && <span className="hint">{g.hint}</span>}
                </h4>
                {items.map(({ m, t }) => (
                  <Card key={m.id} m={m} verdict={t.kind === 'resolved' ? t.headline : t.kind === 'swap' ? 'Ostrowski is in that day' : t.kind === 'reschedule' ? t.headline.replace('Needs a new date — ', '') : 'Every day is blocked for someone'} selected={m.id === selected.id} onClick={() => select(m.id)} />
                ))}
              </section>
            )
          })}
        </aside>
        <main className="cov-detail">
          <MeetingPanel m={selected} />
        </main>
      </div>
    </div>
  )
}

function Card({ m, verdict, selected, onClick }: { m: Meeting; verdict: string; selected: boolean; onClick: () => void }) {
  const dl = deadlineInfo(m)
  return (
    <button className={`mcard ${selected ? 'sel' : ''}`} onClick={onClick}>
      <div className="mc-top">
        <span className="mc-name">{m.student}</span>
        <span className="mc-sub">Gr {m.grade} · {school(m.school).short}</span>
        <TypeTag type={m.type} />
      </div>
      <div className="mc-mid">
        <span><Icon name="calendar" size={12} /> {fmtDay(m.date)}, {fmtTime(m.start)}</span>
        {dl ? (
          <span className={dl.left <= 14 ? 'due soon' : 'due'} title={dl.shifted ? `Due ${fmtShort(dl.due)}, but the district is closed — last meeting day is ${fmtShort(dl.eff)}` : undefined}>Due {fmtShort(dl.eff)} · {dl.left}d</span>
        ) : (
          <span className="due none">No deadline</span>
        )}
      </div>
      <div className="mc-flags">
        {dl?.shifted && <Chip tone="neutral" icon="flag">Due {fmtShort(dl.due)} · closed</Chip>}
        {m.parent.after != null && <Chip tone="neutral" icon="clock">After {fmtTime(m.parent.after)}</Chip>}
        {m.interp && <Chip tone="neutral" icon="globe">{m.interp.language}</Chip>}
        {m.participants.some((p) => p.name === 'Rhonda Kim') && <Chip tone="neutral" icon="people">SLP Tue/Thu</Chip>}
      </div>
      <div className="mc-verdict">{verdict}</div>
    </button>
  )
}
