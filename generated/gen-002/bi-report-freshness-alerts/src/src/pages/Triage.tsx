import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Clock, Users, VolumeX } from 'lucide-react'
import { Alert, SALES_ALERT_ID } from '../data/alerts'
import { reportById } from '../data/reports'
import { Chip, Empty, sevTone } from '../components/ui'
import { go, Route } from '../nav'
import { useStore } from '../store'
import { ago, at, fmtDur, fmtWhen, useNow } from '../time'
import { AlertDetail } from './AlertDetails'

const PRIORITY: Record<string, number> = { sales: 0, feed: 1, shrink: 2, labor: 3, generic: 4 }

const READ: Record<string, { tone: 'crit' | 'warn' | 'info' | 'accent'; text: string }> = {
  sales: { tone: 'crit', text: 'On the 8:00 path · likely partial data' },
  feed: { tone: 'crit', text: 'Likely cause of the sales swing' },
  shrink: { tone: 'warn', text: 'Access issue · not on the 8:00 path' },
  labor: { tone: 'info', text: 'Pay-period load · low urgency' },
}

function AlertCard({ a, selected, now }: { a: Alert; selected: boolean; now: Date }) {
  const { state } = useStore()
  const rep = reportById(a.reportId)!
  const read = READ[a.kind]
  const esc = state.escalations.find((e) => e.alertId === a.id)
  return (
    <button className={`acard ${selected ? 'sel' : ''}`} onClick={() => go({ page: 'triage', id: a.id })} aria-current={selected}>
      <span className={`sev-bar sev-${sevTone(a.severity)}`} />
      <div className="acard-body">
        <div className="acard-top">
          <Chip tone={sevTone(a.severity)}>{a.severity}</Chip>
          <span className="mono muted">{a.id}</span>
          <span className="acard-time">{fmtWhen(a.firedAt, now)} · {ago(a.firedAt, now)}</span>
        </div>
        <h4>{a.title}</h4>
        <div className="acard-rep">{rep.name}</div>
        <div className="acard-meta">
          <span><Users size={13} /> {rep.viewers} {rep.viewersNote ?? 'typical viewers'}</span>
          {a.muteId && <span><VolumeX size={13} /> muted</span>}
          {esc && <span className="ok-text"><CheckCircle2 size={13} /> directors told</span>}
        </div>
        {read && (
          <div className={`acard-read read-${read.tone}`}>
            <ChevronRight size={13} /> {read.text}
          </div>
        )}
      </div>
    </button>
  )
}

function Strip() {
  const { state } = useStore()
  const now = useNow()
  const unacked = state.alerts.filter((a) => a.status === 'open').length
  const review = at(0, 8, 0)
  const left = Math.max(0, Math.round((review.getTime() - now.getTime()) / 60000))
  const suppressed = state.mutes.some((m) => m.id === 'M-3' && m.active) && !state.alerts.some((a) => a.kind === 'feed') ? 1 : 0
  const activeMutes = state.mutes.filter((m) => m.active).length
  return (
    <div className="strip">
      <div className="strip-cell strip-hero">
        <span className="strip-label">Regional ops review</span>
        <span className="strip-value">8:00 AM <em className={left < 30 ? 'crit-text' : ''}>in {fmtDur(left)}</em></span>
        <span className="strip-sub"><Clock size={12} /> Weekly Sales Performance · {reportById(state.alerts.find((a) => a.id === SALES_ALERT_ID)!.reportId)!.viewers} viewers</span>
      </div>
      <div className="strip-cell">
        <span className="strip-label">Alerts, last 24 h</span>
        <span className="strip-value">{state.alerts.length} <em>{unacked} unacknowledged</em></span>
        <span className="strip-sub">{suppressed ? `${suppressed} more held back by a mute` : 'none held back by mutes'}</span>
      </div>
      <div className="strip-cell">
        <span className="strip-label">Reports watched</span>
        <span className="strip-value">240 <em>{state.rules.filter((r) => r.enabled).length} rules on</em></span>
        <span className="strip-sub">{unacked + state.alerts.filter((a) => a.status === 'acknowledged').length} with open alerts</span>
      </div>
      <div className="strip-cell">
        <span className="strip-label">Mutes</span>
        <span className="strip-value">{activeMutes} <em>active</em></span>
        <span className="strip-sub"><a href="#/mutes">Review before they go stale</a></span>
      </div>
    </div>
  )
}

export default function Triage({ route }: { route: Route }) {
  const { state } = useStore()
  const now = useNow()
  const [tab, setTab] = useState<'act' | 'all'>('act')
  const [flt, setFlt] = useState<'all' | 'open' | 'resolved'>('all')

  const sorted = useMemo(
    () => [...state.alerts].sort((a, b) => (PRIORITY[a.kind] - PRIORITY[b.kind]) || b.firedAt.getTime() - a.firedAt.getTime()),
    [state.alerts]
  )
  const unack = sorted.filter((a) => a.status === 'open')
  const ackOpen = sorted.filter((a) => a.status === 'acknowledged' && !a.resolvedAt)
  const log = [...state.alerts]
    .sort((a, b) => b.firedAt.getTime() - a.firedAt.getTime())
    .filter((a) => (flt === 'all' ? true : flt === 'open' ? a.status !== 'resolved' : a.status === 'resolved'))

  const selectedId = route.id ?? SALES_ALERT_ID
  const selected = state.alerts.find((a) => a.id === selectedId) ?? state.alerts.find((a) => a.id === SALES_ALERT_ID)!

  return (
    <div className="page">
      <Strip />
      <div className="split">
        <aside className="listcol" aria-label="Alerts">
          <div className="tabs2" role="tablist">
            <button role="tab" aria-selected={tab === 'act'} className={tab === 'act' ? 'on' : ''} onClick={() => setTab('act')}>
              Needs a decision <span className="count">{unack.length}</span>
            </button>
            <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
              Last 24 hours <span className="count">{state.alerts.length}</span>
            </button>
          </div>
          <div className="list-scroll">
            {tab === 'act' ? (
              <>
                {unack.length === 0 ? (
                  <Empty title="Nothing waiting on you" sub="Every alert from the last 24 hours has been acknowledged. Open the log to review them." />
                ) : (
                  <>
                    <div className="group-label">Unacknowledged · ordered by what’s at stake at 8:00</div>
                    {unack.map((a) => <AlertCard key={a.id} a={a} selected={a.id === selected.id} now={now} />)}
                  </>
                )}
                {ackOpen.length > 0 && (
                  <>
                    <div className="group-label">Acknowledged, still open</div>
                    {ackOpen.map((a) => <AlertCard key={a.id} a={a} selected={a.id === selected.id} now={now} />)}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="seg seg-sm">
                  {([['all', 'All'], ['open', 'Still open'], ['resolved', 'Resolved']] as const).map(([v, l]) => (
                    <button key={v} className={flt === v ? 'on' : ''} onClick={() => setFlt(v)}>{l}</button>
                  ))}
                </div>
                {log.map((a) => {
                  const rep = reportById(a.reportId)!
                  return (
                    <button key={a.id} className={`lrow ${a.id === selected.id ? 'sel' : ''}`} onClick={() => go({ page: 'triage', id: a.id })}>
                      <span className={`dot dot-${a.status === 'open' ? sevTone(a.severity) : a.status === 'acknowledged' ? 'warn' : 'ok'}`} />
                      <span className="lrow-main">
                        <strong>{a.title}</strong>
                        <small>{rep.name}</small>
                      </span>
                      <span className="lrow-side">
                        <span>{fmtWhen(a.firedAt, now)}</span>
                        <small>{a.status === 'open' ? 'Unacknowledged' : a.status === 'acknowledged' ? 'Acknowledged' : a.resolution?.startsWith('Auto') ? 'Auto-resolved' : 'Resolved'}</small>
                      </span>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </aside>
        <main className="detailcol">
          <AlertDetail alert={selected} />
        </main>
      </div>
    </div>
  )
}
