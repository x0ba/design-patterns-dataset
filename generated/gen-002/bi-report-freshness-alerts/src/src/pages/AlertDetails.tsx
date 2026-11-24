import { ReactNode, useState } from 'react'
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, CloudSnow, Database, Lock, Phone, RefreshCw, Send, SlidersHorizontal, VolumeX, Users,
} from 'lucide-react'
import { Alert } from '../data/alerts'
import {
  batchPct, CLOSURE_EST, LAST_WEEK, LFL_PCT, MISSING, NE_BATCHES, NE_CLOSED, NE_EXPECTED, NE_LANDED, NE_LANDED_PCT, PROJECTED, REGION_WOW, REPORTED, SWING_PCT,
} from '../data/feed'
import { EVENTS } from '../data/history'
import { PEOPLE, ME } from '../data/people'
import { dependentsOf, NE_FEED_TABLE, reportById, SHRINK_TABLE } from '../data/reports'
import { Bridge, FeedChart, LoadChart } from '../components/charts'
import { EscalateDialog, MuteDialog } from '../components/dialogs'
import { Avatar, Chip, Kv, Section, sevTone } from '../components/ui'
import { go } from '../nav'
import { pct } from '../fmt'
import { useStore } from '../store'
import { ago, at, fmtClock, fmtDur, fmtWhen, nowMinutes, useNow } from '../time'

const money = (v: number) => `$${v.toFixed(2)}M`
const num = (n: number) => n.toLocaleString('en-US')

/* ───────────────────────── shared pieces ───────────────────────── */

function StatusLine({ a }: { a: Alert }) {
  const now = useNow()
  if (a.status === 'open') return <Chip tone="crit" icon={<span className="pulse" />}>Unacknowledged for {fmtDur((now.getTime() - a.firedAt.getTime()) / 60000)}</Chip>
  if (a.status === 'acknowledged') return <Chip tone="warn" icon={<Check size={12} />}>Acknowledged{a.ackBy ? ` by ${a.ackBy}` : ''}</Chip>
  return <Chip tone="ok" icon={<CheckCircle2 size={12} />}>Resolved{a.resolvedAt ? ` ${fmtWhen(a.resolvedAt, now)}` : ''}</Chip>
}

function Header({ a, actions }: { a: Alert; actions: ReactNode }) {
  const { state } = useStore()
  const now = useNow()
  const rep = reportById(a.reportId)!
  const rule = state.rules.find((r) => r.id === a.ruleId)!
  const owner = PEOPLE[rep.owner]
  return (
    <header className="dhead">
      <div className="dhead-top">
        <Chip tone={sevTone(a.severity)}>{a.severity}</Chip>
        <span className="mono muted">{a.id}</span>
        <StatusLine a={a} />
        <span className="muted small">Fired {fmtWhen(a.firedAt, now)} · {ago(a.firedAt, now)}</span>
      </div>
      <h1>{a.title}</h1>
      <p className="dhead-sub">
        <a href={`#/reports/${rep.id}`}>{rep.name}</a> · rule <a href={`#/rules/${rule.id}`}>{rule.id}</a> · owner {owner.name} · <Users size={13} className="inl" /> {rep.viewers} {rep.viewersNote ?? 'typical viewers'}
      </p>
      <div className="actions">{actions}</div>
    </header>
  )
}

function Activity({ a }: { a: Alert }) {
  const { dispatch } = useStore()
  const now = useNow()
  const [note, setNote] = useState('')
  const entries = [...a.timeline].sort((x, y) => x.at.getTime() - y.at.getTime())
  return (
    <Section title="Activity">
      <ol className="tl">
        {entries.map((e, i) => (
          <li key={i}>
            <time>{fmtWhen(e.at, now)}</time>
            <span>{e.text}{e.actor && <em> · {e.actor}</em>}</span>
          </li>
        ))}
      </ol>
      <form
        className="note-form"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (!note.trim()) return
          dispatch({ t: 'log', alertId: a.id, now, text: `Note: ${note.trim()}`, actor: ME.name })
          setNote('')
        }}
      >
        <input className="input" placeholder="Add a note for whoever picks this up next" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn" disabled={!note.trim()}>Add note</button>
      </form>
    </Section>
  )
}

function useAlertActions(a: Alert) {
  const { dispatch, toast } = useStore()
  const now = useNow()
  return {
    ack: () => {
      dispatch({ t: 'ack', id: a.id, now })
      toast(`${a.id} acknowledged.`)
    },
    resolve: () => {
      dispatch({ t: 'resolve', id: a.id, now })
      toast(`${a.id} marked resolved.`)
    },
  }
}

function AckButtons({ a, onMute, skipAck }: { a: Alert; onMute: () => void; skipAck?: boolean }) {
  const act = useAlertActions(a)
  return (
    <>
      {a.status === 'open' && !skipAck && (
        <button className="btn" onClick={act.ack}><Check size={15} /> Acknowledge</button>
      )}
      {a.status === 'acknowledged' && (
        <button className="btn" onClick={act.resolve}><CheckCircle2 size={15} /> Mark resolved</button>
      )}
      {a.status !== 'resolved' && !a.muteId && (
        <button className="btn" onClick={onMute}><VolumeX size={15} /> Mute…</button>
      )}
      {a.muteId && <Chip tone="neutral" icon={<VolumeX size={12} />}>Muted by {a.muteId}</Chip>}
    </>
  )
}

function Step({ done, title, sub, action }: { done: boolean; title: string; sub?: string; action?: ReactNode }) {
  return (
    <li className={`step ${done ? 'done' : ''}`}>
      <span className="step-mark">{done ? <Check size={13} /> : null}</span>
      <div className="step-text">
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </div>
      {action && <div className="step-action">{action}</div>}
    </li>
  )
}

function useTicketer(a: Alert) {
  const { state, dispatch, toast } = useStore()
  const now = useNow()
  const mine = state.tickets.filter((t) => t.alertId === a.id)
  const create = (prefix: string, text: string, toastText: string) => {
    const n = state.tickets.length
    const id = prefix === 'GOV' ? `GOV-${2307 + n}` : prefix === 'PG' ? `PG-${410 + n}` : `DM-${88 + n}`
    dispatch({ t: 'ticket', ticket: { id, alertId: a.id, text, at: now } })
    toast(toastText)
  }
  return { mine, has: (prefix: string) => mine.some((t) => t.id.startsWith(prefix)), create }
}

/* ───────────────────────── dispatcher ───────────────────────── */

export function AlertDetail({ alert }: { alert: Alert }) {
  switch (alert.kind) {
    case 'sales': return <SalesDetail a={alert} />
    case 'feed': return <FeedDetail a={alert} />
    case 'shrink': return <ShrinkDetail a={alert} />
    case 'labor': return <LaborDetail a={alert} />
    default: return <GenericDetail a={alert} />
  }
}

/* ───────────────────────── Northeast sales swing ───────────────────────── */

function BatchTable() {
  const [open, setOpen] = useState<string | null>('NE-5')
  return (
    <div className="tbl-wrap">
      <table className="tbl batch">
        <thead>
          <tr>
            <th>Store group</th>
            <th className="num">Stores</th>
            <th className="num">Closed Sat</th>
            <th>Rows landed</th>
            <th>Landed</th>
            <th className="num">Revenue vs. last week</th>
          </tr>
        </thead>
        <tbody>
          {NE_BATCHES.map((b) => {
            const landed = batchPct(b)
            const closed = b.stores.filter((s) => s.closedSat).length
            const complete = landed >= 99.5
            const isOpen = open === b.id
            return (
              <FragmentRow key={b.id}>
                <tr className={`clickable ${complete ? '' : 'bad-row'}`} onClick={() => setOpen(isOpen ? null : b.id)}>
                  <td>
                    <span className="row-toggle">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                    <strong>{b.id}</strong> {b.name}
                  </td>
                  <td className="num">{b.stores.length}</td>
                  <td className="num">{closed}</td>
                  <td>
                    <span className="pctbar"><span style={{ width: `${landed}%` }} className={complete ? 'ok' : landed === 0 ? 'none' : 'part'} /></span>
                    <span className={`pct-text ${complete ? '' : 'crit-text'}`}>{landed.toFixed(0)}%</span>
                  </td>
                  <td className={complete ? '' : 'crit-text'}>{b.landedAt}</td>
                  <td className="num">
                    {complete ? (
                      <span>{money(b.thisWeek)} <small className="muted">vs {money(b.lastWeek)}</small> <strong>{pct((b.thisWeek / b.lastWeek - 1) * 100)}</strong></span>
                    ) : (
                      <span className="muted">{money(b.thisWeek)} · incomplete</span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="expand">
                    <td colSpan={6}>
                      <div className="stores">
                        {b.stores.map((s) => {
                          const sp = (s.landed / s.expected) * 100
                          return (
                            <div key={s.id} className={`store ${sp < 99.5 ? 'missing' : ''}`}>
                              <span className="mono">{s.id}</span>
                              <span>{s.town}</span>
                              {s.closedSat && <Chip tone="info">Closed Sat</Chip>}
                              <span className="store-rows">{sp >= 99.5 ? 'complete' : sp === 0 ? 'no rows' : `${sp.toFixed(0)}%`}</span>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </FragmentRow>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
const FragmentRow = ({ children }: { children: ReactNode }) => <>{children}</>

function SalesDetail({ a }: { a: Alert }) {
  const { state, dispatch, toast } = useStore()
  const now = useNow()
  const tk = useTicketer(a)
  const [esc, setEsc] = useState(false)
  const [mute, setMute] = useState(false)
  const rep = reportById(a.reportId)!
  const rule = state.rules.find((r) => r.id === a.ruleId)!
  const escalation = state.escalations.find((e) => e.alertId === a.id)
  const m3 = state.mutes.find((m) => m.id === 'M-3')!
  const feedAlert = state.alerts.find((x) => x.kind === 'feed')
  const deps = dependentsOf(NE_FEED_TABLE).sort((x, y) => y.viewers - x.viewers)
  const depViewers = deps.reduce((s, r) => s + r.viewers, 0)
  const stalled = nowMinutes(now) - (4 * 60 + 58)
  const falseAlarms = EVENTS.filter((e) => e.outcome === 'false').length
  const banner = state.banners[rep.id]
  const [rechecking, setRechecking] = useState(false)
  const [checked, setChecked] = useState<string | null>(null)
  const recheck = () => {
    setRechecking(true)
    setTimeout(() => {
      setRechecking(false)
      setChecked(fmtClock(now))
      dispatch({ t: 'log', alertId: a.id, now, text: `Feed re-checked: still ${NE_LANDED_PCT.toFixed(0)}% of expected rows, no new rows since 4:58 AM`, actor: ME.name })
    }, 1100)
  }
  return (
    <div className="detail">
      <Header
        a={a}
        actions={
          <>
            {!escalation ? (
              <button className="btn btn-primary" onClick={() => setEsc(true)}><Send size={15} /> Escalate to directors…</button>
            ) : (
              <Chip tone="ok" icon={<CheckCircle2 size={12} />}>Directors told {fmtClock(escalation.at)}</Chip>
            )}
            <AckButtons a={a} onMute={() => setMute(true)} />
            <button className="btn btn-ghost" onClick={() => go({ page: 'rules', id: rule.id, tab: 'tune' })}><SlidersHorizontal size={15} /> Tighten {rule.id}</button>
          </>
        }
      />

      {banner && (
        <div className="callout-box ok">
          <CheckCircle2 size={16} />
          <div>
            <strong>Provisional notice is live on {rep.name}.</strong> Viewers see “{banner}”
            <button className="linkish" onClick={() => { dispatch({ t: 'banner', reportId: rep.id, text: null }); toast('Provisional notice removed.') }}>Remove</button>
          </div>
        </div>
      )}

      <section className="verdict">
        <div className="verdict-head">
          <span className="verdict-label">Freshwatch read</span>
          <h2>Mostly missing data, with a real storm decline underneath.</h2>
          <p>
            Expect about <strong>{money(PROJECTED)} ({pct(LFL_PCT * 100, 0)})</strong> when the Northeast feed finishes, not {money(REPORTED)} (−41%). The directors should hear both: the number on screen is wrong, and the storm hit is still large.
          </p>
        </div>
        <div className="verdict-stats">
          <div><span>Reported</span><strong className="crit-text">{pct(SWING_PCT)}</strong><small>{money(REPORTED)} vs {money(LAST_WEEK)}</small></div>
          <div><span>Stores with complete data</span><strong>{pct(LFL_PCT * 100)}</strong><small>56 of 84 stores, like-for-like</small></div>
          <div><span>Rows landed</span><strong className="crit-text">{NE_LANDED_PCT.toFixed(0)}%</strong><small>{(NE_LANDED / 1e6).toFixed(2)}M of {(NE_EXPECTED / 1e6).toFixed(2)}M</small></div>
          <div><span>No new rows for</span><strong>{fmtDur(stalled)}</strong><small>last rows 4:58 AM</small></div>
        </div>
        <ol className="steps">
          <Step
            done={!!escalation}
            title="Tell the directors the −41% is provisional"
            sub={escalation ? `Sent ${fmtClock(escalation.at)} to ${escalation.recipients.length} people. Follow-up due by 7:30 AM.` : '180 people open this at 8:00. Message is pre-filled with the numbers above.'}
            action={!escalation ? <button className="btn btn-sm btn-primary" onClick={() => setEsc(true)}>Draft message</button> : escalation.updated ? <Chip tone="ok">Update sent</Chip> : <button className="btn btn-sm" onClick={() => { dispatch({ t: 'followUpDone', alertId: a.id, now }); toast('Follow-up logged.') }}>Log 7:30 update</button>}
          />
          <Step
            done={tk.has('PG')}
            title="Get the Providence & Cape and Northern New England loads moving"
            sub={tk.has('PG') ? 'Anselm Okoye (Data Engineering on-call) paged.' : 'The feed has been flat since 4:58 AM. This is not a normal late load.'}
            action={!tk.has('PG') ? <button className="btn btn-sm" onClick={() => tk.create('PG', 'Paged Anselm Okoye (Data Engineering on-call): NE POS feed stalled at 71%, NE-5 missing, NE-6 partial', 'Paged Anselm Okoye, Data Engineering on-call.')}><Phone size={13} /> Page Data Eng.</button> : undefined}
          />
          <Step
            done={!m3.active}
            title="Lift mute M-3 so the feed alert is visible"
            sub={m3.active ? 'It silenced the 5:00 AM row-count alert that names the cause. Details below.' : `M-3 lifted${feedAlert ? `; ${feedAlert.id} raised` : ''}.`}
            action={m3.active ? <a className="btn btn-sm" href="#/mutes/M-3">Review M-3</a> : undefined}
          />
          <Step
            done={false}
            title={`Stop this from firing on late feeds next month`}
            sub={`${rule.id} has raised ${falseAlarms} false alarms from late data in 30 days. Backtest a completeness gate.`}
            action={<button className="btn btn-sm" onClick={() => go({ page: 'rules', id: rule.id, tab: 'tune' })}>Open backtest <ArrowRight size={13} /></button>}
          />
        </ol>
      </section>

      {m3.active && (
        <div className="callout-box warn">
          <AlertTriangle size={16} />
          <div>
            <strong>Why didn’t the feed alert fire?</strong> Rule <a href="#/rules/R-017">R-017</a> checked <span className="mono">{NE_FEED_TABLE}</span> at 5:00 AM and found 71% of expected rows. Mute <strong>M-3</strong> (created Oct 19 by Kiran Shah for the POS vendor maintenance window, set to run until Nov 30) held that alert back.
            <div className="callout-actions">
              <button className="btn btn-sm" onClick={() => { dispatch({ t: 'liftMute', id: 'M-3', now }); toast('M-3 lifted. The row-count alert has been raised in Needs a decision.') }}>Lift M-3 and release the alert</button>
              <button className="btn btn-sm btn-ghost" onClick={() => go({ page: 'mutes', id: 'M-3' })}>See mute</button>
            </div>
          </div>
        </div>
      )}
      {!m3.active && feedAlert && (
        <div className="callout-box ok">
          <CheckCircle2 size={16} />
          <div>Mute M-3 lifted. The held row-count alert is now <a href={`#/triage/${feedAlert.id}`}>{feedAlert.id}</a>.</div>
        </div>
      )}

      <div className="grid2">
        <Section title="Northeast POS rows landed" aside={<button className="btn btn-sm btn-ghost" onClick={recheck} disabled={rechecking}><RefreshCw size={13} className={rechecking ? 'spin' : ''} /> {rechecking ? 'Checking…' : 'Re-check feed'}</button>}>
          <FeedChart nowMin={nowMinutes(now)} />
          <p className="cap">
            {checked ? <><strong>Checked {checked}:</strong> still {NE_LANDED_PCT.toFixed(0)}%, no new rows since 4:58 AM. </> : null}
            Usually all {NE_BATCHES.length} store groups are in by 4:15 AM. Today’s feed stopped climbing at 4:58 AM.
          </p>
        </Section>
        <Section title="Where the −41% comes from" aside={<Chip tone="neutral">estimate</Chip>}>
          <Bridge />
          <p className="cap">
            {Math.round((MISSING / (MISSING + (LAST_WEEK - PROJECTED))) * 100)}% of the drop is data that hasn’t landed. The rest is a real {pct(LFL_PCT * 100, 0)} decline, of which the 23 closures explain about {money(CLOSURE_EST)}. Assumes the missing stores track the loaded ones.
          </p>
        </Section>
      </div>

      <Section title="Which store groups are missing" aside={<span className="muted small">Select a group to see its stores</span>}>
        <BatchTable />
        <p className="cap">Whole groups arriving as 0% or a trickle looks like a pipeline stall. A real sales drop would show up as low but nonzero sales in every store.</p>
      </Section>

      <div className="grid3">
        <Section title="Storm, per Store Ops" aside={<span className="muted small">note from {PEOPLE.dana.name}</span>}>
          <div className="ctx-icon"><CloudSnow size={18} /></div>
          <p className="ctx-big">{NE_CLOSED} of 84 stores closed Saturday</p>
          <p className="cap" style={{ marginTop: 4 }}>Closures were spread across all six store groups, two to five in each. Estimated cost is about 4–5 points of the weekly drop; the rest of the real decline is lower traffic in stores that stayed open.</p>
        </Section>
        <Section title="Other regions, vs. last week">
          <ul className="reg">
            {REGION_WOW.map((r) => (
              <li key={r.region}>
                <span>{r.region}</span>
                <span className={`regbar ${r.pct < -10 ? 'neg' : ''}`}><i style={{ width: `${Math.min(100, Math.abs(r.pct) * 2.4)}%`, marginLeft: r.pct < 0 ? 0 : 0 }} /></span>
                <strong className={r.pct < -10 ? 'crit-text' : ''}>{pct(r.pct, 1, true)}</strong>
              </li>
            ))}
          </ul>
          <p className="cap">Only Northeast moved. That points to Northeast data or Northeast weather, not a chain-wide problem.</p>
        </Section>
        <Section title="Other reports on this feed">
          <p className="ctx-big">{deps.length} reports</p>
          <p className="cap" style={{ marginTop: 2 }}>read Northeast POS data · about {num(depViewers)} typical daily viewers</p>
          <ul className="deps">
            {deps.slice(0, 3).map((r) => (
              <li key={r.id}><a href={`#/reports/${r.id}`}>{r.name}</a><span>{r.viewers}</span></li>
            ))}
          </ul>
          <a className="more" href={`#/reports?q=${encodeURIComponent('pos.ne_transaction_lines')}`}>See reports using this table</a>
        </Section>
      </div>

      <Section title="Rule that fired">
        <div className="rulecard">
          <div>
            <strong>{rule.id} · {rule.title}</strong>
            <p className="muted">{rule.condition}</p>
            <p>Fired {rule.fires30d} times in 30 days. <strong>{falseAlarms} were false alarms from late feeds</strong>, including the known POS maintenance window on Oct 19.</p>
          </div>
          <button className="btn" onClick={() => go({ page: 'rules', id: rule.id, tab: 'tune' })}><SlidersHorizontal size={15} /> Tune and backtest</button>
        </div>
      </Section>

      <Activity a={a} />
      {esc && <EscalateDialog alert={a} onClose={() => setEsc(false)} />}
      {mute && <MuteDialog alert={a} onClose={() => setMute(false)} />}
    </div>
  )
}

/* ───────────────────── Released row-count alert (feed) ───────────────────── */

function FeedDetail({ a }: { a: Alert }) {
  const now = useNow()
  const tk = useTicketer(a)
  const [mute, setMute] = useState(false)
  const sales = useStore().state.alerts.find((x) => x.kind === 'sales')
  return (
    <div className="detail">
      <Header
        a={a}
        actions={
          <>
            {!tk.has('PG') ? (
              <button className="btn btn-primary" onClick={() => tk.create('PG', 'Paged Anselm Okoye (Data Engineering on-call): NE POS feed stalled at 71%', 'Paged Anselm Okoye, Data Engineering on-call.')}><Phone size={15} /> Page Data Engineering</button>
            ) : <Chip tone="ok" icon={<CheckCircle2 size={12} />}>Data Engineering paged</Chip>}
            <AckButtons a={a} onMute={() => setMute(true)} />
          </>
        }
      />
      <div className="callout-box info">
        <Database size={16} />
        <div>
          Released from mute M-3 at {fmtClock(now)}. It would have fired at 5:00 AM. This is the likely cause of <a href={`#/triage/${sales?.id}`}>the Northeast sales swing</a>.
        </div>
      </div>
      <div className="grid2">
        <Section title="Northeast POS rows landed"><FeedChart nowMin={nowMinutes(now)} /></Section>
        <Section title="Check details">
          <dl className="kvs">
            <Kv k="Table" v={<span className="mono">{NE_FEED_TABLE}</span>} />
            <Kv k="Check time" v="5:00 AM" />
            <Kv k="Landed" v={`${num(NE_LANDED)} of ${num(NE_EXPECTED)} rows (${NE_LANDED_PCT.toFixed(0)}%)`} />
            <Kv k="Threshold" v="Alert when 25% or more below the 4-week Monday average" />
            <Kv k="Typical completion" v="4:15 AM" />
            <Kv k="Last rows landed" v="4:58 AM" />
          </dl>
        </Section>
      </div>
      <Section title="Which store groups are missing"><BatchTable /></Section>
      <Activity a={a} />
      {mute && <MuteDialog alert={a} onClose={() => setMute(false)} />}
    </div>
  )
}

/* ───────────────────────── Shrink refresh failure ───────────────────────── */

function ShrinkDetail({ a }: { a: Alert }) {
  const { state, dispatch, toast } = useStore()
  const now = useNow()
  const tk = useTicketer(a)
  const [mute, setMute] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const rep = reportById(a.reportId)!
  const owner = PEOPLE[rep.owner]
  const retries = state.retries[a.id] ?? 0
  const atRisk = dependentsOf(SHRINK_TABLE).filter((r) => r.id !== rep.id && r.nextRefresh.getTime() > now.getTime() && r.nextRefresh.getTime() <= at(0, 8, 0).getTime())
  const atRiskViewers = atRisk.reduce((s, r) => s + r.viewers, 0)
  const staleFor = (now.getTime() - rep.lastRefresh.getTime()) / 60000
  const retry = () => {
    setRetrying(true)
    setTimeout(() => {
      setRetrying(false)
      dispatch({ t: 'retry', alertId: a.id, now })
      toast('Retry failed: still PERMISSION_DENIED. The grant hasn’t been restored.')
    }, 1500)
  }
  return (
    <div className="detail">
      <Header
        a={a}
        actions={
          <>
            {!tk.has('GOV') ? (
              <button className="btn btn-primary" onClick={() => tk.create('GOV', 'Access request to Data Governance (Beatriz Almeida): restore SELECT on lp.shrink_events_curated for svc_bi_refresh', 'Request sent to Data Governance on-call (Beatriz Almeida).')}><Lock size={15} /> Request access restore</button>
            ) : <Chip tone="ok" icon={<CheckCircle2 size={12} />}>Access request open</Chip>}
            <button className="btn" onClick={retry} disabled={retrying}><RefreshCw size={15} className={retrying ? 'spin' : ''} /> {retrying ? 'Retrying…' : 'Retry refresh'}</button>
            {!tk.has('DM') ? (
              <button className="btn" onClick={() => tk.create('DM', `Messaged ${owner.name}: Shrink & Loss Summary is serving Sunday’s data`, `Messaged ${owner.name}.`)}><Send size={15} /> Tell {owner.name.split(' ')[0]}</button>
            ) : <Chip tone="ok" icon={<CheckCircle2 size={12} />}>{owner.name.split(' ')[0]} told</Chip>}
            <AckButtons a={a} onMute={() => setMute(true)} />
          </>
        }
      />
      <section className="verdict">
        <div className="verdict-head">
          <span className="verdict-label">Freshwatch read</span>
          <h2>An access change, not a pipeline fault. Not on the 8:00 path.</h2>
          <p>
            The refresh service account lost read access to <span className="mono">{SHRINK_TABLE}</span> about three hours before the run. Retrying won’t help until Data Governance restores the grant. The report is serving Sunday’s numbers.
          </p>
        </div>
        <div className="verdict-stats">
          <div><span>Data age</span><strong>{fmtDur(staleFor)}</strong><small>last good refresh Sun 3:01 AM</small></div>
          <div><span>Typical viewers</span><strong>{rep.viewers}</strong><small>Shrink & Loss Summary</small></div>
          <div><span>Refresh attempts</span><strong>{3 + retries}</strong><small>3 automatic{retries ? `, ${retries} manual` : ''} · all failed</small></div>
          <div><span>Reports that will fail next</span><strong className={atRisk.length ? 'crit-text' : ''}>{atRisk.length}</strong><small>{atRisk.length ? `before 8:00 AM · ${atRiskViewers} viewers` : 'none before 8:00 AM'}</small></div>
        </div>
      </section>

      <div className="grid2">
        <Section title="Error from the 3:02 AM refresh">
          <pre className="errbox">{`refresh   Shrink & Loss Summary
started   Mon Nov 16 3:00 AM
attempt   3 of 3 · failed 3:02 AM

PERMISSION_DENIED
  principal  svc_bi_refresh
  action     SELECT
  resource   ${SHRINK_TABLE}`}</pre>
        </Section>
        <Section title="What changed on the table">
          <ul className="changes">
            <li>
              <time>Sun 11:48 PM</time>
              <div>
                <strong>Access list changed by Data Governance</strong>
                <small>Change GOV-2291, quarterly access review: “revoke unused service grants.” <span className="mono">svc_bi_refresh</span> was removed.</small>
              </div>
            </li>
            <li>
              <time>Sun 3:01 AM</time>
              <div>
                <strong>Last successful refresh</strong>
                <small>Report has used the grant every day for 14 months.</small>
              </div>
            </li>
          </ul>
          <div className="contact">
            <Avatar name="Beatriz Almeida" size={30} />
            <div><strong>Beatriz Almeida</strong><small>Data Governance on-call · owns GOV-2291</small></div>
          </div>
        </Section>
      </div>

      {atRisk.length > 0 && (
        <Section title="Will fail next" aside={<span className="muted small">read the same table, refresh before 8:00 AM</span>}>
          <ul className="deps wide">
            {atRisk.map((r) => (
              <li key={r.id}><a href={`#/reports/${r.id}`}>{r.name}</a><span>refreshes {fmtClock(r.nextRefresh)}</span><span>{r.viewers} viewers</span></li>
            ))}
          </ul>
          <p className="cap">These would raise their own alerts at 7:00 AM. Restoring the grant first avoids five more pages.</p>
        </Section>
      )}
      <Activity a={a} />
      {mute && <MuteDialog alert={a} onClose={() => setMute(false)} />}
    </div>
  )
}

/* ───────────────────────── Labor slow load ───────────────────────── */

function LaborDetail({ a }: { a: Alert }) {
  const { dispatch, toast } = useStore()
  const now = useNow()
  const [mute, setMute] = useState(false)
  const rep = reportById(a.reportId)!
  return (
    <div className="detail">
      <Header
        a={a}
        actions={
          <>
            {a.status === 'open' && !a.muteId && (
              <button className="btn btn-primary" onClick={() => setMute(true)}><VolumeX size={15} /> Acknowledge and snooze until 9:00…</button>
            )}
            <AckButtons a={a} onMute={() => setMute(true)} skipAck={false} />
            {a.status !== 'resolved' && (
              <button className="btn btn-ghost" onClick={() => { dispatch({ t: 'log', alertId: a.id, now, text: 'Messaged Ingrid Castellanos (report owner)', actor: ME.name }); toast('Messaged Ingrid Castellanos.') }}><Send size={14} /> Tell Ingrid</button>
            )}
          </>
        }
      />
      <section className="verdict">
        <div className="verdict-head">
          <span className="verdict-label">Freshwatch read</span>
          <h2>Pay-period close is loading the report. Expect it to settle by mid-morning.</h2>
          <p>
            The pay period closed Sunday at 11:59 PM, so <span className="mono">labor.punch_detail</span> holds 2.4× its normal rows and each load scans more. The same thing happened at each of the last four closes; the slow window lasted 1 h 35 m to 2 h 20 m.
          </p>
        </div>
        <div className="verdict-stats">
          <div><span>p95 load time</span><strong className="crit-text">18.4 s</strong><small>limit 12 s · normal ~6 s</small></div>
          <div><span>Above limit for</span><strong>{fmtDur(nowMinutes(now) - (5 * 60 + 57))}</strong><small>since 5:57 AM</small></div>
          <div><span>Typical viewers 6–8 AM</span><strong>12</strong><small>{rep.viewers} on a typical Monday</small></div>
          <div><span>Last 4 pay-period closes</span><strong>15–21 s</strong><small>peak p95, then back to normal</small></div>
        </div>
      </section>
      <div className="grid2">
        <Section title="p95 load time, 5-minute buckets"><LoadChart /></Section>
        <Section title="Context">
          <dl className="kvs">
            <Kv k="Report" v={<a href={`#/reports/${rep.id}`}>{rep.name}</a>} />
            <Kv k="Last refresh" v="5:42 AM, succeeded" />
            <Kv k="Upstream" v={<span className="mono">labor.punch_detail · 2.4× normal rows</span>} />
            <Kv k="Owner" v="Ingrid Castellanos, Workforce Analytics" />
            <Kv k="Store managers review" v="from about 9:00 AM" />
          </dl>
          <p className="cap">Suggestion: snooze this rule on this report until 9:00 AM. If p95 is still above 12 s at 9:00, tell Ingrid and look at the report’s query plan.</p>
        </Section>
      </div>
      <Activity a={a} />
      {mute && <MuteDialog alert={a} onClose={() => setMute(false)} presetDuration="9am" presetReason="Pay-period close: labor.punch_detail has 2.4× normal rows. Slow loads are expected for ~2 h and have settled by mid-morning at each of the last four closes." />}
    </div>
  )
}

/* ───────────────────────── Everything else ───────────────────────── */

function GenericDetail({ a }: { a: Alert }) {
  const [mute, setMute] = useState(false)
  const rep = reportById(a.reportId)!
  return (
    <div className="detail">
      <Header a={a} actions={<AckButtons a={a} onMute={() => setMute(true)} />} />
      <div className="grid2">
        <Section title="What happened">
          <p className="body-text">{a.summary}</p>
          <dl className="kvs">
            <Kv k="Observed" v={a.observed} />
            <Kv k="Expected" v={a.expected} />
            <Kv k="Report" v={<a href={`#/reports/${rep.id}`}>{rep.name}</a>} />
            <Kv k="Schedule" v={rep.schedule} />
          </dl>
        </Section>
        <Section title={a.status === 'resolved' ? 'How it ended' : 'Current state'}>
          <p className="body-text">{a.resolution ?? 'Still open. Nothing has resolved it yet.'}</p>
        </Section>
      </div>
      <Activity a={a} />
      {mute && <MuteDialog alert={a} onClose={() => setMute(false)} />}
    </div>
  )
}
