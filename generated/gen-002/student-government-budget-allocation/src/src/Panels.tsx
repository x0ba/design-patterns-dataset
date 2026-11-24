import { Dispatch } from 'react'
import {
  AMENDMENT_LINE_ID,
  ESPORTS_ID,
  POOL,
  ROBOTICS_ID,
  SPEND_OPENS,
  TODAY,
} from './data'
import {
  Action,
  State,
  blockers,
  byId,
  canWait,
  committedTotal,
  daysBetween,
  esportsFiled,
  finalAmount,
  foodCapAmount,
  foodOf,
  isCommitted,
  isNarrow,
  longDate,
  pendingReqs,
  shortDate,
  totals,
  unaddressed,
  usd,
  usdSigned,
} from './model'

/* ------------------------------------------------------------------ Pool */
export function PoolStrip({ s }: { s: State }) {
  const t = totals(s)
  const committed = isCommitted(s)

  if (committed) {
    const total = committedTotal(s)
    const left = POOL - total
    const scale = POOL * 1.04
    return (
      <section className="card pool" aria-label="Pool balance">
        <div className="pool-top">
          <Stat k="Spring pool" v={usd(POOL)} sub="Student activity fee" />
          <Stat k="Committed" v={usd(total)} sub={`${Object.keys(s.committed).length} awards`} />
          <Stat k="Held for January" v={usd(t.deferredAwards ? pendingReqs.filter((r) => s.adj[r.id]?.deferred).reduce((a, r) => a + r.approved, 0) : 0)} sub={`${t.deferredAwards} chair-deferred, 2 tabled`} />
          <span />
          <div className="verdict ok">
            <div className="k">Uncommitted in pool</div>
            <div className="v num">{usd(left)}</div>
          </div>
        </div>
        <div className="bar">
          <div className="track">
            <div className="fill" style={{ width: `${(total / scale) * 100}%` }} />
          </div>
          <div className="marker" style={{ left: `${(POOL / scale) * 100}%` }} />
        </div>
      </section>
    )
  }

  const scale = Math.max(POOL, t.planned) * 1.03
  const pct = (n: number) => `${(n / scale) * 100}%`
  const over = t.gap > 0
  const fillTo = Math.min(t.planned, POOL)
  return (
    <section className="card pool" aria-label="Pool balance">
      <div className="pool-top">
        <Stat k="Spring pool" v={usd(POOL)} sub="Student activity fee" />
        <Stat k="Committee approved" v={usd(t.approvedAll)} sub="58 awards, as voted" />
        <Stat k="Your adjustments" v={t.adjustments === 0 ? '$0' : usdSigned(t.adjustments)} sub={`${t.trimmedAwards} trimmed · ${t.deferredAwards} deferred`} />
        <Stat k="Planned commit" v={usd(t.planned)} sub={`${t.committingAwards + 1} awards`} />
        <div className={'verdict ' + (over ? 'over' : 'ok')} aria-live="polite">
          <div className="k">{over ? 'Over the pool by' : t.gap === 0 ? 'Exactly at the pool' : 'Within the pool, left over'}</div>
          <div className="v num">{over ? usd(t.gap) : usd(-t.gap)}</div>
        </div>
      </div>
      <div className="bar-labels" style={{ marginTop: 12 }}>
        <span style={{ left: pct(POOL), transform: 'translateX(-100%)', paddingRight: 6, fontWeight: 600, color: 'var(--ink)' }}>Pool {usd(POOL)}</span>
      </div>
      <div className="bar" style={{ marginTop: 0 }}>
        <div className="track">
          <div className="fill" style={{ width: pct(fillTo) }} />
          {over && <div className="over" style={{ left: pct(POOL), width: pct(t.planned - POOL) }} />}
        </div>
        <div className="marker" style={{ left: pct(POOL) }} />
      </div>
    </section>
  )
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v num">{v}</div>
      <div className="s">{sub}</div>
    </div>
  )
}

/* ---------------------------------------------------------------- Esports */
export function EsportsCard({ s, onWalkBack, onSeeRx }: { s: State; onWalkBack: () => void; onSeeRx: () => void }) {
  const r = byId[ESPORTS_ID]
  const rx = s.rescissions.find((x) => x.reqId === ESPORTS_ID)
  if (rx) {
    return (
      <section className="card alert done">
        <div className="ico">✓</div>
        <div>
          <h3>Esports Club walked back from {usd(rx.from)} to {usd(rx.to)}</h3>
          <p>
            Notice sent today to {rx.president}. Appeal window is open through {longDate(rx.windowEnds)}; appeals go to the full Senate. $0 spent, so nothing to recover.
          </p>
        </div>
        <button className="btn" onClick={onSeeRx}>View rescission</button>
      </section>
    )
  }
  return (
    <section className="card alert">
      <div className="ico">!</div>
      <div>
        <h3>
          Esports Club is committed at <span className="num">{usd(2400)}</span> but the committee approved <span className="num">{usd(r.approved)}</span>
        </h3>
        <p>
          Committed Nov 9 at the requested amount, not the voted amount. Club already notified, $0 spent. Taking back {usd(1000)} is a formal rescission: written reason, 10-day appeal window.
        </p>
      </div>
      <button className="btn warn" onClick={onWalkBack}>Walk back to {usd(r.approved)}…</button>
    </section>
  )
}

/* ----------------------------------------------------------------- Levers */
export function Levers({
  s,
  d,
  showFilter,
  focusAward,
}: {
  s: State
  d: Dispatch<Action>
  showFilter: (keys: string[]) => void
  focusAward: (id: string) => void
}) {
  const t = totals(s)
  // food
  let foodN = 0
  let foodSave = 0
  for (const r of pendingReqs) {
    const a = s.adj[r.id]
    if (a?.deferred) continue
    const f = foodOf(r, a)
    const cap = foodCapAmount(r, a)
    if (f > cap) {
      foodN++
      foodSave += f - cap
    }
  }
  // narrow + can wait
  const waiting = pendingReqs.filter((r) => !s.adj[r.id]?.deferred && isNarrow(r) && canWait(r))
  const waitSum = waiting.reduce((x, r) => x + finalAmount(r, s.adj[r.id]), 0)
  const heldAlready = pendingReqs.filter((r) => s.adj[r.id]?.deferred && isNarrow(r) && canWait(r)).length
  // robotics
  const rob = byId[ROBOTICS_ID]
  const amend = rob.lines.find((l) => l.id === AMENDMENT_LINE_ID)!
  const amendNow = s.adj[ROBOTICS_ID]?.lines[AMENDMENT_LINE_ID] ?? amend.approved
  const amendHeld = s.adj[ROBOTICS_ID]?.deferred || amendNow === 0

  return (
    <div>
      <div className="sect-label" style={{ marginBottom: 8 }}>
        {t.gap > 0 ? `Ways to find the ${usd(t.gap)}` : 'Other adjustments'}
      </div>
      <div className="levers">
        <div className="card lever">
          <div className="t">Food over the 25% guideline</div>
          <div className="big num">{foodN ? `${usdSigned(-foodSave)}` : '$0'}</div>
          <p>
            {foodN
              ? `${foodN} awards exceed it. Several are meal-centered programs the committee kept on purpose (Shabbat dinners, iftars).`
              : 'No remaining awards exceed the guideline.'}
          </p>
          <div className="row">
            <button className="btn sm ghost" onClick={() => showFilter(['food'])}>Show {foodN || ''}</button>
            <button className="btn sm" disabled={!foodN} onClick={() => d({ type: 'capFoodAll' })}>Cap all at 25%</button>
          </div>
        </div>
        <div className="card lever">
          <div className="t">Bare-majority votes that can wait</div>
          <div className="big num">{waiting.length ? `${waiting.length} awards · ${usd(waitSum)}` : heldAlready ? 'All held' : 'None'}</div>
          <p>Passed with 4 votes and first spend after the Jan 14 meeting, so a deferral costs no spending time.</p>
          <div className="row">
            <button className="btn sm" onClick={() => showFilter(['narrow', 'wait'])}>Review in table</button>
          </div>
        </div>
        <div className="card lever">
          <div className="t">Robotics Dayton amendment</div>
          <div className="big num">{amendHeld ? 'Held' : usd(amend.approved)}</div>
          <p>
            Late amendment, passed 4–2–1. Airfare and lodging aren’t needed until {shortDate(amend.needBy!)}. Advisor flagged a missing risk form.
          </p>
          <div className="row">
            <button className="btn sm" onClick={() => focusAward(ROBOTICS_ID)}>Review award</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- Rail */
export function Rail({
  s,
  d,
  onCommit,
  onWalkBack,
  focusAward,
  onSeeRx,
}: {
  s: State
  d: Dispatch<Action>
  onCommit: () => void
  onWalkBack: () => void
  focusAward: (id: string) => void
  onSeeRx: () => void
}) {
  const t = totals(s)
  const committed = isCommitted(s)

  if (committed && s.receipt) {
    const rc = s.receipt
    return (
      <aside className="rail" aria-label="Commit status">
        <div className="card receipt">
          <h2>Committed</h2>
          <p style={{ margin: '0 0 10px', color: 'var(--ink-2)' }}>
            {rc.awards} awards totaling <b className="num">{usd(rc.total)}</b> are live. Clubs were notified today; spending opens {shortDate(SPEND_OPENS)}.
          </p>
          <dl className="summary">
            <dt>Awards committed now</dt><dd className="num">{rc.awards}</dd>
            <dt>Trimmed before commit</dt><dd className="num">{rc.trimmed ? `${rc.trimmed} (${usdSigned(-rc.trimmedBy)})` : 'None'}</dd>
            <dt>Moved to January docket</dt><dd className="num">{rc.deferred}</dd>
          </dl>
        </div>
        <div className="card">
          <h2>From here, reductions are rescissions</h2>
          <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 13 }}>
            Any reduction needs a written reason and opens a 10-day appeal window; appeals go to the full Senate. Use “Reduce or rescind” on a committed award.
          </p>
          {s.rescissions.length > 0 && (
            <button className="btn sm" style={{ marginTop: 10 }} onClick={onSeeRx}>
              View {s.rescissions.length} rescission{s.rescissions.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </aside>
    )
  }

  const bl = blockers(s)
  const open = unaddressed(s)
  const poolOk = t.gap <= 0
  const filed = esportsFiled(s)
  const canCommit = bl.length === 0

  return (
    <aside className="rail" aria-label="Before you commit">
      <div className="card" style={{ overflow: 'auto' }}>
        <h2>Before you commit</h2>

        <div className="check">
          <div className={'tick ' + (poolOk ? 'good' : 'bad')}>{poolOk ? '✓' : '✕'}</div>
          <div>
            <b>{poolOk ? 'Plan fits the pool' : `${usd(t.gap)} over the pool`}</b>
            <p>
              {poolOk
                ? `${usd(-t.gap)} stays uncommitted.`
                : 'Trim or defer awards in the table until the plan fits. Committing over the pool isn’t allowed.'}
            </p>
          </div>
        </div>

        <div className="check">
          <div className={'tick ' + (filed ? 'good' : 'bad')}>{filed ? '✓' : '✕'}</div>
          <div>
            <b>{filed ? 'Esports correction filed' : 'Esports Club correction'}</b>
            <p>{filed ? 'Rescission notice sent; appeal window open.' : 'Committed at $2,400, approved at $1,400.'}</p>
            {!filed && (
              <button className="btn sm" style={{ marginTop: 6 }} onClick={onWalkBack}>Walk back…</button>
            )}
          </div>
        </div>

        <div className="check">
          <div className={'tick ' + (open.length ? 'warn' : 'good')}>{open.length ? '!' : '✓'}</div>
          <div>
            <b>Advisor review: Carla Ruiz</b>
            <p>
              Reviewed, {s.comments.length} comments{open.length ? ` · ${open.length} not yet addressed` : ' · all addressed'}. Advisory only; they don’t block the commit.
            </p>
            {s.comments.map((c) => (
              <div key={c.id} className={'cmt' + (c.addressed ? ' ok' : '')}>
                <div className="h">
                  <button className="link" onClick={() => focusAward(c.reqId)}>{byId[c.reqId].club}</button>
                  <button className="btn sm" onClick={() => d({ type: 'addressComment', id: c.id, value: !c.addressed })}>
                    {c.addressed ? 'Reopen' : 'Mark addressed'}
                  </button>
                </div>
                <p style={{ marginBottom: 0 }} title={c.text}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <dl className="summary">
          <dt>Awards to commit</dt><dd className="num">{t.committingAwards}</dd>
          <dt>Amount</dt><dd className="num">{usd(t.toCommit)}</dd>
          <dt>Deferred · trimmed</dt><dd className="num">{t.deferredAwards} · {t.trimmedAwards}</dd>
        </dl>
        <button className="btn primary big" disabled={!canCommit} onClick={onCommit}>
          Commit {t.committingAwards} awards · {usd(t.toCommit)}
        </button>
        {bl.map((b) => (
          <p key={b.key} className="why">{b.text}</p>
        ))}
        {canCommit && (
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--ink-2)' }}>
            Clubs are notified on commit. Reductions after that are rescissions.
          </p>
        )}
      </div>
    </aside>
  )
}

