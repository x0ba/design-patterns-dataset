import { Phone } from 'lucide-react'
import { Avatar, Chip, Section } from '../components/ui'
import { PEOPLE } from '../data/people'
import { useStore } from '../store'
import { at, fmtDate, useNow } from '../time'

const ROTATION = [
  { start: -7, who: 'kiran', note: 'Handed off Monday 9:00 AM' },
  { start: 0, who: 'tomas', note: 'Current' },
  { start: 7, who: 'priya', note: 'Next · includes Thanksgiving (Nov 26)' },
  { start: 14, who: 'kiran', note: '' },
  { start: 21, who: 'tomas', note: '' },
  { start: 28, who: 'priya', note: '' },
]

export default function OnCall() {
  const { state, dispatch, toast } = useStore()
  const now = useNow()
  const open = state.alerts.filter((a) => a.status !== 'resolved')
  const insert = () => {
    const lines = open.map((a) => `• ${a.id} ${a.title} (${state.alerts.find((x) => x.id === a.id)!.status === 'open' ? 'unacknowledged' : 'acknowledged'})`)
    const extra = state.mutes.filter((m) => m.active && m.id === 'M-3').map(() => '• Mute M-3 (NE POS row count) runs until Nov 30; review it.')
    const text = `Open items as of Mon 6:40 AM:\n${[...lines, ...extra].join('\n')}\n\n` + state.handoff
    dispatch({ t: 'handoff', text })
    toast('Open items added to the handoff note.')
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>On-call</h1>
          <p>BI platform rotation. Handoffs happen Mondays at 9:00 AM.</p>
        </div>
      </div>
      <div className="oncall-grid">
        <div>
          <Section title="Rotation">
            <ul className="rota">
              {ROTATION.map((r) => {
                const p = PEOPLE[r.who]
                const start = at(r.start, 9, 0)
                const end = at(r.start + 7, 9, 0)
                return (
                  <li key={r.start} className={r.start === 0 ? 'now' : ''}>
                    <Avatar name={p.name} size={32} />
                    <div className="rota-main">
                      <strong>{p.name} {r.who === 'tomas' && r.start === 0 && <Chip tone="accent">you</Chip>}</strong>
                      <small>{fmtDate(start)} 9:00 AM → {fmtDate(end)} 9:00 AM</small>
                    </div>
                    <span className="muted small">{r.note}</span>
                  </li>
                )
              })}
            </ul>
          </Section>
          <Section title="Escalation path">
            <ol className="esc-path">
              <li><span>1</span><div><strong>Tomás Reyes</strong><small>Primary. Paged immediately. Expected to acknowledge within 15 minutes.</small></div></li>
              <li><span>2</span><div><strong>Kiran Shah</strong><small>Secondary this week. Paged after 15 minutes unacknowledged.</small></div></li>
              <li><span>3</span><div><strong>Elena Voss</strong><small>BI platform lead. Paged after 30 minutes.</small></div></li>
            </ol>
          </Section>
          <Section title="Who to call upstream">
            <ul className="contacts">
              {[PEOPLE.anselm, PEOPLE.beatriz, PEOPLE.dana].map((p) => (
                <li key={p.id}><Avatar name={p.name} size={28} /><div><strong>{p.name}</strong><small>{p.role}</small></div><button className="btn btn-sm" onClick={() => toast(`Paged ${p.name}.`)}><Phone size={13} /> Page</button></li>
              ))}
            </ul>
          </Section>
        </div>
        <Section title="Handoff note for Priya Natarajan" aside={<span className="muted small">Visible to Priya from Mon Nov 23, 9:00 AM</span>}>
          <textarea
            className="input textarea handoff"
            rows={16}
            value={state.handoff}
            onChange={(e) => dispatch({ t: 'handoff', text: e.target.value })}
            placeholder={`Anything Priya should know when she picks this up. Open alerts, mutes that need a second look, rules you changed.`}
          />
          <div className="handoff-foot">
            <button className="btn" onClick={insert}>Insert {open.length} open item{open.length === 1 ? '' : 's'}</button>
            <span className="muted small">Saved as you type · {state.handoff.length} characters · {fmtDate(now)}</span>
          </div>
        </Section>
      </div>
    </div>
  )
}
