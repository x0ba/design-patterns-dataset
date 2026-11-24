import { useMemo, useState } from 'react'
import { AlertTriangle, Send, VolumeX } from 'lucide-react'
import { Alert } from '../data/alerts'
import { DIRECTORS, ME, PEOPLE } from '../data/people'
import { LAST_WEEK, LFL_PCT, NE_LANDED_PCT, PROJECTED, REPORTED } from '../data/feed'
import { reportById } from '../data/reports'
import { rulesFor } from '../data/rules'
import { fmtClock, useNow, at } from '../time'
import { useStore } from '../store'
import { pct } from '../fmt'
import { Chip, Field, Modal } from './ui'

/* ───────────────────────── Escalate to ops directors ───────────────────────── */

export function EscalateDialog({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  const { dispatch, toast } = useStore()
  const now = useNow()
  const report = reportById(alert.reportId)!
  const [sel, setSel] = useState<Record<string, boolean>>({ colleen: true, raymond: true, sofia: true, jun: true, wes: true, marcus: true, elena: false })
  const [banner, setBanner] = useState(true)
  const [channel, setChannel] = useState({ slack: true, email: true })
  const [subject, setSubject] = useState('Heads-up: Northeast sales figure is provisional')
  const [body, setBody] = useState(
    `Colleen, directors,\n\n` +
      `The Weekly Sales Performance report (refreshed 5:18 AM) shows Northeast revenue down 41% week over week ($${REPORTED.toFixed(2)}M vs. $${LAST_WEEK.toFixed(2)}M). Please treat that figure as provisional for the 8:00 review.\n\n` +
      `Why: as of ${fmtClock(now)}, only ${NE_LANDED_PCT.toFixed(0)}% of expected Northeast POS rows have loaded. The Providence & Cape and Northern New England store groups are missing or partial. The feed normally finishes by 4:15 AM.\n\n` +
      `What we expect: about ${pct(LFL_PCT * 100, 0)} (≈ $${PROJECTED.toFixed(1)}M) once the feed completes. That is a real decline, consistent with the 23 stores closed Saturday for the storm, but roughly half the size of what the report shows.\n\n` +
      `Next: BI is working with Data Engineering to finish the load. I’ll send an update by 7:30 AM and have added a “provisional data” notice to the report.\n\n— ${ME.name}, BI on-call`
  )
  const people = [
    ...DIRECTORS.map((d) => ({ id: d.id, label: d.name, sub: `Director, ${d.region} (${d.stores} stores)`, primary: d.region === 'Northeast' })),
    { id: 'marcus', label: PEOPLE.marcus.name, sub: 'Owner, Weekly Sales Performance', primary: false },
    { id: 'elena', label: PEOPLE.elena.name, sub: 'BI platform lead (FYI)', primary: false },
  ]
  const chosen = people.filter((p) => sel[p.id])
  const canSend = chosen.length > 0 && (channel.slack || channel.email) && body.trim().length > 20
  const send = () => {
    dispatch({
      t: 'escalate',
      esc: { alertId: alert.id, at: now, recipients: chosen.map((c) => c.label), followUpBy: at(0, 7, 30) },
      banner: banner ? { reportId: report.id, text: 'Provisional data: Northeast POS feed is incomplete. Figures will change when the load finishes.' } : undefined,
    })
    toast(`Sent to ${chosen.length} ${chosen.length === 1 ? 'person' : 'people'}. Follow-up due by 7:30 AM.`)
    onClose()
  }
  return (
    <Modal
      title="Escalate to regional ops directors"
      sub={`${report.name} · ${report.viewers} Monday viewers · review at 8:00 AM`}
      onClose={onClose}
      width={760}
      footer={
        <>
          <span className="foot-note">{chosen.length} recipient{chosen.length === 1 ? '' : 's'} · {[channel.slack && 'Slack #regional-ops-review', channel.email && 'email'].filter(Boolean).join(' + ') || 'no channel selected'}</span>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSend} onClick={send}>
            <Send size={15} /> Send heads-up
          </button>
        </>
      }
    >
      <div className="esc-grid">
        <div>
          <div className="field-label">To</div>
          <ul className="people-list">
            {people.map((p) => (
              <li key={p.id}>
                <label className="check">
                  <input type="checkbox" checked={!!sel[p.id]} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} />
                  <span>
                    <strong>{p.label}</strong> {p.primary && <Chip tone="crit">most affected</Chip>}
                    <small>{p.sub}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="field-label" style={{ marginTop: 14 }}>Send via</div>
          <label className="check inline"><input type="checkbox" checked={channel.slack} onChange={(e) => setChannel({ ...channel, slack: e.target.checked })} /> Slack</label>
          <label className="check inline"><input type="checkbox" checked={channel.email} onChange={(e) => setChannel({ ...channel, email: e.target.checked })} /> Email</label>
          <label className="check banner-opt">
            <input type="checkbox" checked={banner} onChange={(e) => setBanner(e.target.checked)} />
            <span>
              <strong>Add “provisional data” notice to the report</strong>
              <small>Viewers see a banner on Weekly Sales Performance until you clear it.</small>
            </span>
          </label>
        </div>
        <div>
          <Field label="Subject">
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Message" hint="Numbers are filled from the evidence on the alert. Edit before sending.">
            <textarea className="input textarea" rows={15} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

/* ───────────────────────────────── Mute ───────────────────────────────── */

const DURATIONS: { id: string; label: string; until: () => Date | null }[] = [
  { id: '1h', label: '1 hour', until: () => null },
  { id: '2h', label: '2 hours', until: () => null },
  { id: '9am', label: 'Until 9:00 AM', until: () => at(0, 9, 0) },
  { id: 'eod', label: 'Until tomorrow 6:00 AM', until: () => at(1, 6, 0) },
  { id: 'lifted', label: 'Until I lift it', until: () => null },
]

export function MuteDialog({ alert, onClose, presetDuration, presetReason }: { alert: Alert; onClose: () => void; presetDuration?: string; presetReason?: string }) {
  const { state, dispatch, toast } = useStore()
  const now = useNow()
  const report = reportById(alert.reportId)!
  const rule = state.rules.find((r) => r.id === alert.ruleId)!
  const [scope, setScope] = useState<'rule-report' | 'report' | 'rule'>('rule-report')
  const [dur, setDur] = useState(presetDuration ?? '2h')
  const [reason, setReason] = useState(presetReason ?? '')
  const siblings = useMemo(() => rulesFor(state.rules, report), [state.rules, report])

  const expiresAt = useMemo(() => {
    if (dur === '1h') return new Date(now.getTime() + 3600000)
    if (dur === '2h') return new Date(now.getTime() + 7200000)
    if (dur === 'lifted') return null
    return DURATIONS.find((d) => d.id === dur)!.until()
  }, [dur, now])

  const isSales = alert.kind === 'sales'
  const sev = alert.severity === 'Critical'
  const target =
    scope === 'rule-report' ? `${rule.id} on ${report.name}` : scope === 'report' ? `All alerts on ${report.name} (${siblings.length} rules)` : `${rule.id} on every report it covers`
  const targetShort = scope === 'rule-report' ? report.name : scope === 'report' ? `${report.name} · all rules` : `${rule.title} · all reports`

  const create = () => {
    const id = `M-${state.nextMute}`
    dispatch({
      t: 'addMute',
      alertId: alert.id,
      now,
      mute: { id, ruleId: rule.id, target: targetShort, reason: reason.trim(), createdBy: ME.name, createdAt: now, expiresAt, suppressed7d: 0, active: true },
    })
    toast(`${id} created · ${expiresAt ? 'until ' + fmtClock(expiresAt) : 'until lifted'}. Alert acknowledged.`, () => {
      dispatch({ t: 'removeMute', id })
      dispatch({ t: 'log', alertId: alert.id, now, text: `Mute ${id} undone`, actor: ME.name })
    })
    onClose()
  }

  return (
    <Modal
      title="Mute alerts"
      sub={`${rule.id} · ${rule.title}`}
      onClose={onClose}
      width={600}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={reason.trim().length < 8} onClick={create}>
            <VolumeX size={15} /> Mute
          </button>
        </>
      }
    >
      {isSales && (
        <div className="callout-box crit">
          <AlertTriangle size={16} />
          <div>
            <strong>This hides a −41% swing that {report.viewers} people will open at 8:00.</strong>
            <p>Muting won’t change what the report shows. Consider escalating or adding a provisional notice instead.</p>
          </div>
        </div>
      )}
      {!isSales && sev && (
        <div className="callout-box warn">
          <AlertTriangle size={16} />
          <div><strong>Critical alert.</strong> Make sure someone owns it before muting.</div>
        </div>
      )}
      <div className="field-label">What to mute</div>
      <div className="radio-stack">
        {([
          ['rule-report', 'Only this rule on this report', `Recommended. Silences ${rule.id} for ${report.name}.`],
          ['report', 'Everything on this report', `Silences all ${siblings.length} rules that cover it, including freshness.`],
          ['rule', 'This rule on every report', `Wide. ${rule.id} covers ${state.rules.find((r) => r.id === rule.id)!.scope.toLowerCase()}.`],
        ] as const).map(([v, t, d]) => (
          <label key={v} className={`radio ${scope === v ? 'on' : ''}`}>
            <input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} />
            <span>
              <strong>{t}</strong>
              <small>{d}</small>
            </span>
          </label>
        ))}
      </div>
      <div className="field-label" style={{ marginTop: 14 }}>For how long</div>
      <div className="seg">
        {DURATIONS.map((d) => (
          <button key={d.id} className={dur === d.id ? 'on' : ''} onClick={() => setDur(d.id)}>{d.label}</button>
        ))}
      </div>
      <p className="hint">
        {expiresAt ? `Alerts resume at ${fmtClock(expiresAt)}.` : 'Stays muted until someone lifts it. Open-ended mutes are how stale mutes happen; prefer a time limit.'}
      </p>
      <Field label="Reason (shown to the team)" hint="Required.">
        <textarea className="input textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What do you know that makes this safe to silence?" />
      </Field>
      <div className="mute-summary">
        <strong>Will mute:</strong> {target}
      </div>
    </Modal>
  )
}
