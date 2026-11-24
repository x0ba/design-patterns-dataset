import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Search, X } from 'lucide-react'
import { MiniBars } from '../components/charts'
import { Chip, Kv, sevTone } from '../components/ui'
import { BtConfig, EVENTS, evaluate, HistEvent, PROPOSED_CFG, Result, summarize } from '../data/history'
import { Rule, RuleType, ruleReportCount } from '../data/rules'
import { go, Route } from '../nav'
import { useStore } from '../store'
import { fmtDate, fmtWhen, fmtClock, useNow } from '../time'
import { REPORTS } from '../data/reports'

const TYPES: ('all' | RuleType)[] = ['all', 'Freshness', 'Row count', 'Metric swing', 'Load time']

// deterministic 30-day fire pattern for the little bars (sums to rule.fires30d)
function pattern(r: Rule) {
  const out = new Array(30).fill(0)
  let s = r.id.split('').reduce((a, c) => a + c.charCodeAt(0), 7)
  for (let i = 0; i < r.fires30d; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    out[s % 30]++
  }
  return out
}

export default function Rules({ route }: { route: Route }) {
  const { state, dispatch } = useStore()
  const now = useNow()
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | RuleType>('all')
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return state.rules.filter((r) => (type === 'all' || r.type === type) && (!needle || `${r.id} ${r.title} ${r.scope} ${r.route}`.toLowerCase().includes(needle)))
  }, [state.rules, q, type])
  const sel = state.rules.find((r) => r.id === route.id)
  const counts = TYPES.slice(1).map((t) => state.rules.filter((r) => r.type === t).length)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Rules</h1>
          <p>{state.rules.length} alert rules · {TYPES.slice(1).map((t, i) => `${counts[i]} ${t.toLowerCase()}`).join(' · ')}</p>
        </div>
      </div>
      <div className="toolbar">
        <div className="searchbox">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rules by id, report, table or channel" aria-label="Search rules" />
          {q && <button onClick={() => setQ('')} aria-label="Clear"><X size={14} /></button>}
        </div>
        <div className="seg seg-sm">
          {TYPES.map((t) => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t === 'all' ? 'All types' : t}</button>)}
        </div>
        <span className="muted small">{rows.length} shown</span>
      </div>
      <div className={`split-table ${sel ? 'with-panel wide' : ''} ${sel && sel.id === 'R-027' && route.tab === 'tune' ? 'tune-mode' : ''}`}>
        <div className="tbl-scroll">
          <table className="tbl rules">
            <thead>
              <tr><th>Rule</th><th>Type</th><th>Severity</th><th>Notifies</th><th>Last 30 days</th><th className="num">On</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`clickable ${sel?.id === r.id ? 'sel' : ''} ${r.enabled ? '' : 'dim'}`} onClick={() => go({ page: 'rules', id: r.id })}>
                  <td>
                    <strong><span className="mono muted">{r.id}</span> {r.title}</strong>
                    <small className="sub">{r.scope}{r.scope.endsWith('s') ? ` · ${ruleReportCount(r)} reports` : ''}</small>
                  </td>
                  <td>{r.type}</td>
                  <td><Chip tone={sevTone(r.severity)}>{r.severity}</Chip></td>
                  <td>{r.route}</td>
                  <td><span className="firecell"><MiniBars values={pattern(r)} h={20} /><span>{r.fires30d}</span></span></td>
                  <td className="num" onClick={(e) => e.stopPropagation()}>
                    <button className={`switch ${r.enabled ? 'on' : ''}`} role="switch" aria-checked={r.enabled} aria-label={`${r.id} enabled`} onClick={() => dispatch({ t: 'ruleEnabled', id: r.id, enabled: !r.enabled })}><i /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sel && <RulePanel key={sel.id} rule={sel} tab={route.tab} now={now} />}
      </div>
    </div>
  )
}

function RulePanel({ rule, tab, now }: { rule: Rule; tab?: string; now: Date }) {
  const { state } = useStore()
  const tunable = rule.id === 'R-027'
  const active = tunable && tab === 'tune' ? 'tune' : 'overview'
  const covered = REPORTS.filter(rule.match)
  const recent = state.alerts.filter((a) => a.ruleId === rule.id)
  return (
    <aside className="panel" aria-label={`${rule.id} details`}>
      <div className="panel-head">
        <div>
          <h2><span className="mono muted">{rule.id}</span> {rule.title}</h2>
          <p>{rule.type} · {rule.scope} · v{rule.version} updated {fmtDate(rule.updated)} by {rule.updatedBy}</p>
        </div>
        <button className="btn btn-sm" onClick={() => go({ page: 'rules' })}>{active === 'tune' ? '← All rules' : 'Close'}</button>
      </div>
      {tunable && (
        <div className="tabs2 inpanel" role="tablist">
          <button role="tab" aria-selected={active === 'overview'} className={active === 'overview' ? 'on' : ''} onClick={() => go({ page: 'rules', id: rule.id })}>Overview</button>
          <button role="tab" aria-selected={active === 'tune'} className={active === 'tune' ? 'on' : ''} onClick={() => go({ page: 'rules', id: rule.id, tab: 'tune' })}>Tune and backtest</button>
        </div>
      )}
      {active === 'overview' ? (
        <>
          <dl className="kvs">
            <Kv k="Fires when" v={rule.condition} />
            <Kv k="Severity" v={<Chip tone={sevTone(rule.severity)}>{rule.severity}</Chip>} />
            <Kv k="Notifies" v={rule.route} />
            <Kv k="Covers" v={`${covered.length} report${covered.length === 1 ? '' : 's'}`} />
            <Kv k="Last fired" v={rule.lastFired ? fmtWhen(rule.lastFired, now) : recent[0] ? fmtWhen(recent[recent.length - 1].firedAt, now) : '—'} />
            <Kv k="Fires in 30 days" v={rule.fires30d} />
          </dl>
          <h3 className="panel-h3">Fires, last 30 days</h3>
          <div className="bigbars"><MiniBars values={pattern(rule)} h={44} color="#17324d" /><div className="axis-note"><span>Oct 17</span><span>Nov 16</span></div></div>
          <h3 className="panel-h3">Reports it covers</h3>
          <ul className="rule-list">
            {covered.slice(0, 8).map((r) => <li key={r.id}><a href={`#/reports/${r.id}`}>{r.name}</a><small className="muted">{r.viewers} viewers</small></li>)}
            {covered.length > 8 && <li className="muted small">+ {covered.length - 8} more</li>}
          </ul>
          {recent.length > 0 && (
            <>
              <h3 className="panel-h3">Alerts in the last 24 hours</h3>
              <ul className="rule-list">
                {recent.map((a) => <li key={a.id}><a href={`#/triage/${a.id}`}><span className="mono">{a.id}</span> {a.title}</a><small className="muted">{fmtClock(a.firedAt)}</small></li>)}
              </ul>
            </>
          )}
          {!tunable && rule.id === 'R-017' && state.mutes.find((m) => m.id === 'M-3')?.active && (
            <div className="callout-box warn">
              <AlertTriangle size={16} />
              <div><strong>Muted by M-3.</strong> This rule found 71% at 5:00 AM today and was silenced. <a href="#/mutes/M-3">Review the mute</a>.</div>
            </div>
          )}
          {tunable && <button className="btn btn-primary" onClick={() => go({ page: 'rules', id: rule.id, tab: 'tune' })}>Tune and backtest this rule</button>}
        </>
      ) : (
        <Tune rule={rule} />
      )}
    </aside>
  )
}

/* ───────────────────────────── backtest ───────────────────────────── */

function describe(e: HistEvent, r: Result): { text: string; tone: 'ok' | 'crit' | 'warn' | 'neutral' } {
  const truth = e.outcome
  if (r.kind === 'quiet') {
    if (truth === 'real') return { text: 'Missed a real event', tone: 'crit' }
    return { text: 'Below threshold', tone: 'neutral' }
  }
  if (r.kind === 'suppressed') return { text: r.why === 'calendar' ? 'Skipped: planned late feed' : 'Held, then cleared on full data', tone: 'ok' }
  const delay = r.delay > 0 ? ` +${r.delay} min${r.provisional ? ', provisional' : ''}` : ''
  if (truth === 'false') return { text: 'False alarm' + delay, tone: 'crit' }
  if (truth === 'minor') return { text: 'Fires (small, real)' + delay, tone: 'warn' }
  if (truth === 'today') return { text: 'Fires' + delay + (r.provisional ? '' : ''), tone: 'warn' }
  return { text: 'Caught' + delay, tone: 'ok' }
}

function Tune({ rule }: { rule: Rule }) {
  const { state, dispatch, toast } = useStore()
  const now = useNow()
  const current: BtConfig = { threshold: rule.threshold ?? 25, gateMin: rule.gateMin ?? null, maxHold: rule.maxHold ?? 90, honorCalendar: !!rule.honorCalendar }
  const [cfg, setCfg] = useState<BtConfig>(() => (current.gateMin === null && !current.honorCalendar ? PROPOSED_CFG : current))
  const before = useMemo(() => summarize(current), [rule]) // eslint-disable-line react-hooks/exhaustive-deps
  const after = useMemo(() => summarize(cfg), [cfg])
  const changed = JSON.stringify(cfg) !== JSON.stringify(current)
  const m3 = state.mutes.find((m) => m.id === 'M-3')!
  const falseTotal = EVENTS.filter((e) => e.outcome === 'false').length
  const realTotal = EVENTS.filter((e) => e.outcome === 'real').length
  const set = (p: Partial<BtConfig>) => setCfg({ ...cfg, ...p })

  const rowsStat: { label: string; b: number | string; a: number | string; good: 'down' | 'up' | 'same'; hint?: string }[] = [
    { label: 'Alerts fired', b: before.fired, a: after.fired, good: 'down' },
    { label: `False alarms (of ${falseTotal})`, b: before.falseFired, a: after.falseFired, good: 'down' },
    { label: `Real events alerted (of ${realTotal})`, b: before.realCaught, a: after.realCaught, good: 'up' },
    { label: 'Real events missed', b: before.realMissed, a: after.realMissed, good: 'down' },
    { label: 'Small-but-real alerts', b: before.noise, a: after.noise, good: 'down', hint: 'true swings nobody acted on' },
    { label: 'Real alerts delayed', b: before.delayed ? `${before.delayed} · avg ${before.avgDelay} m` : '0', a: after.delayed ? `${after.delayed} · avg ${after.avgDelay} m` : '0', good: 'down' },
  ]

  const apply = () => {
    dispatch({ t: 'ruleApply', id: rule.id, cfg, now })
    toast(`${rule.id} updated to v${rule.version + 1}. Takes effect at the next evaluation.`)
  }

  return (
    <div className="tune">
     <div className="tune-grid">
      <div className="tune-left">
      <div className="tune-intro">
        <strong>Why it’s noisy.</strong> Week-over-week treats a feed that’s still loading as a collapse. Hold the alert until upstream rows are mostly there, and skip planned late windows.</div>

      <div className="controls">
        <div className="ctl">
          <div className="ctl-head"><strong>Swing threshold</strong><span className="ctl-val">±{cfg.threshold}%</span></div>
          <input type="range" min={15} max={40} step={1} value={cfg.threshold} onChange={(e) => set({ threshold: +e.target.value })} aria-label="Swing threshold percent" />
          <div className="ctl-scale"><span>15%</span><span>noisier ← → quieter</span><span>40%</span></div>
        </div>
        <div className="ctl">
          <div className="ctl-head">
            <label className="check inline"><input type="checkbox" checked={cfg.gateMin !== null} onChange={(e) => set({ gateMin: e.target.checked ? 95 : null })} /> <strong>Hold until upstream rows are complete</strong></label>
            <span className="ctl-val">{cfg.gateMin === null ? 'off' : `≥ ${cfg.gateMin}%`}</span>
          </div>
          <input type="range" min={80} max={100} step={1} disabled={cfg.gateMin === null} value={cfg.gateMin ?? 95} onChange={(e) => set({ gateMin: +e.target.value })} aria-label="Completeness gate percent" />
          <div className="ctl-row">
            <span className="muted small">Fire anyway, marked provisional, after</span>
            <div className="seg seg-sm">
              {[30, 60, 90, 120].map((m) => <button key={m} disabled={cfg.gateMin === null} className={cfg.maxHold === m ? 'on' : ''} onClick={() => set({ maxHold: m })}>{m} min</button>)}
            </div>
          </div>
        </div>
        <label className="ctl check-card">
          <input type="checkbox" checked={cfg.honorCalendar} onChange={(e) => set({ honorCalendar: e.target.checked })} />
          <span><strong>Skip planned late-feed windows</strong><small>Uses the feed calendar, where the Oct 19 POS vendor maintenance was already listed.</small></span>
        </label>
        {cfg.gateMin !== null && m3.active && (
          <div className="callout-box warn">
            <AlertTriangle size={16} />
            <div>
              <strong>The gate relies on R-017 to flag a stalled feed,</strong> and mute M-3 silences R-017 until Nov 30.
              <div className="callout-actions"><button className="btn btn-sm" onClick={() => { dispatch({ t: 'liftMute', id: 'M-3', now }); toast('M-3 lifted. The row-count alert has been raised.') }}>Lift M-3</button></div>
            </div>
          </div>
        )}
        {cfg.gateMin !== null && !m3.active && (
          <p className="ok-text small"><Check size={13} className="inl" /> R-017 is live, so a stalled feed will still be flagged on its own.</p>
        )}
      </div>

      <div className="tune-foot">
        <button className="btn" disabled={!changed} onClick={() => setCfg(current)}>Reset to live settings</button>
        <button className="btn btn-primary" disabled={!changed} onClick={apply}><Check size={15} /> Apply to {rule.id}</button>
      </div>
      {!changed && rule.version > 4 && <p className="ok-text small">Applied as v{rule.version} by {rule.updatedBy}.</p>}
      </div>
      <div className="tune-right">
      <h3 className="panel-h3" style={{ marginTop: 0 }}>Backtest · last 30 days (Oct 17 – Nov 16)</h3>
      <table className="tbl stats">
        <thead><tr><th></th><th className="num">Current</th><th className="num">With changes</th></tr></thead>
        <tbody>
          {rowsStat.map((r) => {
            const better = (r.good === 'down' && typeof r.a === 'number' && typeof r.b === 'number' && r.a < r.b) || (r.good === 'up' && typeof r.a === 'number' && typeof r.b === 'number' && r.a > r.b)
            const worse = (r.good === 'down' && typeof r.a === 'number' && typeof r.b === 'number' && r.a > r.b) || (r.good === 'up' && typeof r.a === 'number' && typeof r.b === 'number' && r.a < r.b)
            return (
              <tr key={r.label}>
                <td>{r.label}{r.hint && <small className="sub">{r.hint}</small>}</td>
                <td className="num">{r.b}</td>
                <td className={`num ${better ? 'ok-text' : worse ? 'crit-text' : ''}`}><strong>{r.a}</strong></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="verdict-line">
        {changed ? (
          <>
            With these settings: <strong>{after.falsePrevented} of {falseTotal} false alarms prevented</strong>,{' '}
            {after.realMissed > 0 ? <strong className="crit-text">{after.realMissed} real event{after.realMissed > 1 ? 's' : ''} missed</strong> : 'no real events missed'}
            {after.delayed > 0 ? `, ${after.delayed} real alert delayed by up to ${after.maxDelay} min.` : '.'}
          </>
        ) : (
          <>These are the live settings. Change a control to see the difference.</>
        )}
      </p>

      <table className="tbl events">
        <thead><tr><th>When</th><th>Region</th><th className="num">Swing</th><th className="num">Feed</th><th>Current rule</th><th>With changes</th></tr></thead>
        <tbody>
          {[...EVENTS].reverse().map((e) => {
            const b = describe(e, evaluate(e, current))
            const a = describe(e, evaluate(e, cfg))
            return (
              <tr key={e.id} title={e.note} className={e.outcome === 'today' ? 'today' : ''}>
                <td>{fmtDate(e.when).replace(/^\w+ /, '')}{e.outcome === 'today' && <small className="sub">today</small>}</td>
                <td>{e.region}</td>
                <td className="num">{e.swing > 0 ? '+' : '−'}{Math.abs(e.swing)}%</td>
                <td className={`num ${e.completeness < 95 ? 'crit-text' : ''}`}>{e.completeness}%</td>
                <td><span className={`res res-${b.tone}`}>{b.text}</span></td>
                <td><span className={`res res-${a.tone}`}>{a.text}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="cap">Hover a row for what actually happened. “Feed” is the share of expected upstream rows loaded when the alert would have fired. Under 95% is incomplete.</p>

      </div>
     </div>
    </div>
  )
}
