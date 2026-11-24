import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GROUPS, REVIEW_ITEMS } from './analysis'
import { ACCOUNTS, TXNS, type AccountId } from './data'
import { fmtDate, fmtMoney, ordinal } from './dates'
import { Detail, bankDetails, type Decision } from './Detail'
import { parseQuery, runSearch, type Parsed, type Result } from './search'
import { Chip, IconArrow, IconClose, IconCopy, IconFlag, IconSearch, Logo, copyText } from './ui'

type View = 'find' | 'review'
type Ignored = { date?: boolean; amount?: boolean; account?: boolean; intent?: boolean; day?: boolean }

const INITIAL_QUERY = 'that yoga or fitness app from March'
const EXAMPLES = [
  'the $71.94 charge last week',
  'streaming services on the 15th',
  'coffee in October on my Visa',
  'newspaper subscription',
]

const DECISION_LABEL: Record<Decision, string> = { keep: 'Keeping', cancel: 'Cancelling', unknown: 'Flagged' }
const DECISION_TONE: Record<Decision, 'pine' | 'amber' | 'rose'> = { keep: 'pine', cancel: 'amber', unknown: 'rose' }

export default function App() {
  const [view, setView] = useState<View>('find')
  const [query, setQuery] = useState(INITIAL_QUERY)
  const [accountFilter, setAccountFilter] = useState<AccountId | 'all'>('all')
  const [ignored, setIgnored] = useState<Ignored>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [reviewSel, setReviewSel] = useState<string>(REVIEW_ITEMS[0].merchantId)
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [cancelDone, setCancelDone] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const mainRef = useRef<HTMLElement>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const copy = useCallback(async (text: string, message: string) => {
    const ok = await copyText(text)
    showToast(ok ? message : 'Couldn’t copy automatically. Select the text and copy it.')
  }, [showToast])

  /* ---- search ---- */
  const parsed: Parsed = useMemo(() => {
    const p = parseQuery(query)
    return {
      ...p,
      date: ignored.date ? null : p.date,
      amount: ignored.amount ? null : p.amount,
      account: ignored.account ? null : p.account,
      accountLabel: ignored.account ? null : p.accountLabel,
      intent: ignored.intent ? null : p.intent,
      day: ignored.day ? null : p.day,
    }
  }, [query, ignored])
  const results: Result[] = useMemo(() => runSearch(parsed, accountFilter), [parsed, accountFilter])
  const hasQuery = query.trim().length > 0

  const effectiveId = selected && GROUPS.has(selected) ? selected : results[0]?.group.merchant.id ?? null
  const selectedResult = results.find((r) => r.group.merchant.id === effectiveId) ?? null

  const onQuery = (q: string) => {
    setQuery(q)
    setIgnored({})
    setSelected(null)
  }

  /* ---- decisions ---- */
  const decide = (id: string, d: Decision | null) => {
    setDecisions((cur) => {
      const next = { ...cur }
      if (d) next[id] = d
      else delete next[id]
      return next
    })
    if (d !== 'cancel') setCancelDone((c) => ({ ...c, [id]: false }))
  }

  const reviewIds = REVIEW_ITEMS.map((r) => r.merchantId)
  const checked = reviewIds.filter((id) => decisions[id]).length
  const unchecked = reviewIds.length - checked

  const openMerchant = (id: string) => {
    if (view === 'review' && reviewIds.includes(id)) setReviewSel(id)
    else { setView('find'); setSelected(id) }
  }

  const nextUnchecked = (fromId: string) => {
    const start = reviewIds.indexOf(fromId)
    for (let i = 1; i <= reviewIds.length; i++) {
      const id = reviewIds[(start + i) % reviewIds.length]
      if (id !== fromId && !decisions[id]) return id
    }
    return null
  }

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [view])

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} unchecked={unchecked} />
      <main ref={mainRef} className="main" id="main">
        {view === 'find' ? (
          <FindView
            query={query}
            onQuery={onQuery}
            parsed={parsed}
            ignored={ignored}
            setIgnored={setIgnored}
            accountFilter={accountFilter}
            setAccountFilter={setAccountFilter}
            results={results}
            hasQuery={hasQuery}
            effectiveId={effectiveId}
            selectedResult={selectedResult}
            setSelected={setSelected}
            decisions={decisions}
            cancelDone={cancelDone}
            decide={decide}
            setCancelDone={(id, v) => setCancelDone((c) => ({ ...c, [id]: v }))}
            openMerchant={openMerchant}
            copy={copy}
            unchecked={unchecked}
            goReview={() => setView('review')}
          />
        ) : (
          <ReviewView
            selectedId={reviewSel}
            setSelectedId={setReviewSel}
            decisions={decisions}
            cancelDone={cancelDone}
            decide={decide}
            setCancelDone={(id, v) => setCancelDone((c) => ({ ...c, [id]: v }))}
            openMerchant={openMerchant}
            copy={copy}
            checked={checked}
            nextUnchecked={nextUnchecked}
            goFind={() => setView('find')}
          />
        )}
      </main>
      <div className="toast-wrap" aria-live="polite" role="status">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Sidebar({ view, setView, unchecked }: { view: View; setView: (v: View) => void; unchecked: number }) {
  return (
    <aside className="side">
      <div className="brand"><Logo /> <span>Tallyway</span></div>
      <nav aria-label="Main">
        <button className={`nav ${view === 'find' ? 'nav-on' : ''}`} aria-current={view === 'find' ? 'page' : undefined} onClick={() => setView('find')}>
          <IconSearch /> Find a charge
        </button>
        <button className={`nav ${view === 'review' ? 'nav-on' : ''}`} aria-current={view === 'review' ? 'page' : undefined} onClick={() => setView('review')}>
          <IconFlag /> Forgotten subscriptions
          {unchecked > 0 && <span className="badge" aria-label={`${unchecked} to check`}>{unchecked}</span>}
        </button>
      </nav>

      <section className="side-accounts" aria-label="Your accounts">
        <h2>Your accounts</h2>
        {ACCOUNTS.map((a) => (
          <div className="acct" key={a.id}>
            <div className="acct-name">{a.name}</div>
            <div className="acct-mask">Ending in {a.mask}</div>
            <div className="acct-bal">
              {fmtMoney(a.balanceCents)} <span>{a.balanceLabel.toLowerCase()}</span>
            </div>
          </div>
        ))}
        <p className="side-foot">{TXNS.length.toLocaleString('en-US')} charges searchable, going back 14 months.</p>
      </section>

      <div className="me"><span className="avatar">R</span> Renée</div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */

interface FindProps {
  query: string
  onQuery: (q: string) => void
  parsed: Parsed
  ignored: Ignored
  setIgnored: (f: (i: Ignored) => Ignored) => void
  accountFilter: AccountId | 'all'
  setAccountFilter: (a: AccountId | 'all') => void
  results: Result[]
  hasQuery: boolean
  effectiveId: string | null
  selectedResult: Result | null
  setSelected: (id: string) => void
  decisions: Record<string, Decision>
  cancelDone: Record<string, boolean>
  decide: (id: string, d: Decision | null) => void
  setCancelDone: (id: string, v: boolean) => void
  openMerchant: (id: string) => void
  copy: (t: string, m: string) => void
  unchecked: number
  goReview: () => void
}

function FindView(p: FindProps) {
  const { parsed, results } = p
  const group = p.effectiveId ? GROUPS.get(p.effectiveId)! : null
  const highlight = useMemo(
    () => (p.selectedResult && (parsed.date || parsed.amount || parsed.day) ? new Set(p.selectedResult.matching.map((t) => t.id)) : undefined),
    [p.selectedResult, parsed.date, parsed.amount, parsed.day],
  )
  const dateLabel = parsed.date?.label ?? null

  const chips: { key: string; text: string; remove?: () => void }[] = []
  parsed.terms.forEach((t) => chips.push({ key: `t-${t}`, text: t }))
  if (parsed.intent) {
    chips.push({
      key: 'intent',
      text: parsed.intent === 'once' ? 'one-time only' : parsed.intent === 'recurring' ? 'repeating' : 'subscriptions',
      remove: () => p.setIgnored((i) => ({ ...i, intent: true })),
    })
  }
  if (parsed.day) chips.push({ key: 'day', text: `on the ${ordinal(parsed.day)}`, remove: () => p.setIgnored((i) => ({ ...i, day: true })) })
  if (parsed.date) chips.push({ key: 'date', text: parsed.date.label, remove: () => p.setIgnored((i) => ({ ...i, date: true })) })
  if (parsed.amount) chips.push({ key: 'amount', text: parsed.amount.label, remove: () => p.setIgnored((i) => ({ ...i, amount: true })) })
  if (parsed.account) chips.push({ key: 'account', text: parsed.accountLabel!, remove: () => p.setIgnored((i) => ({ ...i, account: true })) })

  const topIsStrong = results[0] && p.parsed.terms.length > 0 && results[0].score >= 12

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Find a charge</h1>
          <p className="lede">Describe it the way you remember it: what it was, roughly when, how much.</p>
        </div>
        <div className="seg" role="group" aria-label="Which accounts to search">
          <button aria-pressed={p.accountFilter === 'all'} onClick={() => p.setAccountFilter('all')}>All accounts</button>
          {ACCOUNTS.map((a) => (
            <button key={a.id} aria-pressed={p.accountFilter === a.id} onClick={() => p.setAccountFilter(a.id)}>
              {a.short} <span>••{a.mask}</span>
            </button>
          ))}
        </div>
      </header>

      <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="q" className="sr">Describe the charge you’re looking for</label>
        <IconSearch />
        <input
          id="q"
          type="search"
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          placeholder="For example: gym from last spring, or $40 at a restaurant in October"
          autoComplete="off"
          spellCheck={false}
        />
        {p.query && (
          <button type="button" className="clear" aria-label="Clear search" onClick={() => p.onQuery('')}>
            <IconClose />
          </button>
        )}
      </form>

      <div className="understood" aria-label="What we looked for">
        {chips.length > 0 ? (
          <>
            <span className="u-label">We looked for</span>
            {chips.map((c) => (
              <span key={c.key} className={`ucap ${c.remove ? 'ucap-filter' : ''}`}>
                {c.text}
                {c.remove && (
                  <button aria-label={`Stop filtering by ${c.text}`} onClick={c.remove}><IconClose /></button>
                )}
              </span>
            ))}
            {parsed.date && parsed.terms.length > 0 && <span className="u-hint">Dates are matched loosely, since memory isn’t exact.</span>}
          </>
        ) : (
          <>
            <span className="u-label">Try</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="example" onClick={() => p.onQuery(ex)}>{ex}</button>
            ))}
          </>
        )}
      </div>

      <div className="panes">
        <section className="results" aria-labelledby="res-h">
          <div className="res-head">
            <h2 id="res-h" aria-live="polite">
              {!p.hasQuery
                ? 'Results'
                : results.length === 0
                ? 'No matches'
                : `${results.length} possible ${results.length === 1 ? 'match' : 'matches'}`}
            </h2>
            {results.length > 1 && <span>Best guess first</span>}
          </div>

          {results.length === 0 && (
            <div className="empty">
              {p.hasQuery ? (
                <>
                  <p><strong>Nothing matched that.</strong></p>
                  <p>Try fewer words, or remove a filter above. Tallyway searches charges only, not money coming in.</p>
                  <div className="example-list">
                    {EXAMPLES.slice(0, 3).map((ex) => (
                      <button key={ex} className="example" onClick={() => p.onQuery(ex)}>{ex}</button>
                    ))}
                  </div>
                </>
              ) : (
                <p>Type a few words about the charge and it will show up here.</p>
              )}
            </div>
          )}

          <ul className="cards">
            {results.map((r, i) => {
              const g = r.group
              const id = g.merchant.id
              const sel = id === p.effectiveId
              const d = p.decisions[id]
              return (
                <li key={id}>
                  <button className={`card ${sel ? 'card-on' : ''}`} aria-pressed={sel} onClick={() => p.setSelected(id)}>
                    <span className="card-top">
                      <span className="card-name">{g.merchant.name}</span>
                      <span className="card-total">{fmtMoney(g.totalCents)}</span>
                    </span>
                    <span className="card-mid">
                      <span>
                        {g.cadence.kind === 'once'
                          ? `One time, ${fmtDate(g.firstDate)}`
                          : g.cadence.recurring
                          ? `${g.cadence.short}, ${fmtMoney(g.lastCents)}`
                          : `${g.count} charges in all`}
                      </span>
                      <span className="card-paid">paid so far</span>
                    </span>
                    <span className="card-bot">
                      {i === 0 && topIsStrong && <Chip tone="pine">Best match</Chip>}
                      {d && <Chip tone={DECISION_TONE[d]}>{DECISION_LABEL[d]}</Chip>}
                      <span className="card-why">
                        {r.reasons.length > 0 ? `Matches “${r.reasons.join('”, “')}”` : ''}
                        {r.reasons.length > 0 && r.dateNote ? '. ' : ''}
                        {r.dateNote ?? ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {p.unchecked > 0 && (
            <aside className="nudge">
              <h3>While you’re here</h3>
              <p>
                Tallyway noticed <strong>{p.unchecked} other charges</strong> that look like subscriptions you may have forgotten about.
              </p>
              <button className="btn btn-primary" onClick={p.goReview}>Go through them <IconArrow /></button>
            </aside>
          )}
        </section>

        <div className="detail-col">
          {group ? (
            <Detail
              group={group}
              decision={p.decisions[group.merchant.id]}
              cancelDone={!!p.cancelDone[group.merchant.id]}
              highlight={highlight}
              dateNote={p.selectedResult?.dateNote}
              rememberedDate={dateLabel}
              onDecide={(d) => p.decide(group.merchant.id, d)}
              onCancelDone={(v) => p.setCancelDone(group.merchant.id, v)}
              onOpenOther={p.openMerchant}
              onCopy={p.copy}
            />
          ) : (
            <div className="detail detail-empty">
              <h2>Pick a result to see the details</h2>
              <p>You’ll see how often it’s charged, what you’ve paid in total, and whether you want to cancel it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface ReviewProps {
  selectedId: string
  setSelectedId: (id: string) => void
  decisions: Record<string, Decision>
  cancelDone: Record<string, boolean>
  decide: (id: string, d: Decision | null) => void
  setCancelDone: (id: string, v: boolean) => void
  openMerchant: (id: string) => void
  copy: (t: string, m: string) => void
  checked: number
  nextUnchecked: (id: string) => string | null
  goFind: () => void
}

function ReviewView(p: ReviewProps) {
  const group = GROUPS.get(p.selectedId)!
  const item = REVIEW_ITEMS.find((r) => r.merchantId === p.selectedId)!
  const total = REVIEW_ITEMS.length
  const flagged = REVIEW_ITEMS.filter((r) => p.decisions[r.merchantId] === 'unknown')
  const cancelling = REVIEW_ITEMS.filter((r) => p.decisions[r.merchantId] === 'cancel')
  const keeping = REVIEW_ITEMS.filter((r) => p.decisions[r.merchantId] === 'keep')
  const atIssue = [...flagged, ...cancelling].map((r) => GROUPS.get(r.merchantId)!)
  const yearly = atIssue.reduce((s, g) => s + (g.yearlyCents ?? 0), 0)
  const hasBoxes = atIssue.some((g) => g.yearlyCents === null)
  const nextId = p.nextUnchecked(p.selectedId)

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Forgotten subscriptions</h1>
          <p className="lede">Tallyway noticed these charges repeating or changing. Mark the ones you don’t recognize.</p>
        </div>
        <div className="progress" aria-label={`${p.checked} of ${total} checked`}>
          <div className="progress-text"><strong>{p.checked} of {total}</strong> checked</div>
          <div className="progress-bar" aria-hidden="true"><i style={{ width: `${(p.checked / total) * 100}%` }} /></div>
        </div>
      </header>

      <div className="panes panes-review">
        <section className="results" aria-label="Charges to check">
          <ul className="cards">
            {REVIEW_ITEMS.map((r) => {
              const g = GROUPS.get(r.merchantId)!
              const d = p.decisions[r.merchantId]
              const sel = r.merchantId === p.selectedId
              return (
                <li key={r.merchantId}>
                  <button className={`card ${sel ? 'card-on' : ''} ${d ? 'card-done' : ''}`} aria-pressed={sel} onClick={() => p.setSelectedId(r.merchantId)}>
                    <span className="card-top">
                      <span className="card-name">{g.merchant.name}</span>
                      <span className="card-total">{fmtMoney(g.lastCents)}</span>
                    </span>
                    <span className="card-mid">
                      <span>{r.headline}</span>
                    </span>
                    <span className="card-bot">
                      {d ? <Chip tone={DECISION_TONE[d]}>{DECISION_LABEL[d]}</Chip> : <Chip tone="amber">Not checked yet</Chip>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {p.checked > 0 && (
            <aside className="tally" aria-label="Your answers so far">
              <h3>{p.checked === total ? 'All checked. Here’s where you landed.' : 'So far'}</h3>
              <ul>
                {flagged.length > 0 && <li><Chip tone="rose">Flagged</Chip> {flagged.length} you don’t recognize</li>}
                {cancelling.length > 0 && <li><Chip tone="amber">Cancelling</Chip> {cancelling.length} to cancel</li>}
                {keeping.length > 0 && <li><Chip tone="pine">Keeping</Chip> {keeping.length} you’re keeping</li>}
              </ul>
              {atIssue.length > 0 && yearly > 0 && (
                <p className="tally-save">
                  Cancelling or flagging these adds up to about <strong>{fmtMoney(yearly, { noCents: true })} a year</strong>
                  {hasBoxes ? ', plus whatever meal-kit boxes you’d be charged' : ''}.
                </p>
              )}
              {atIssue.length > 0 && yearly === 0 && hasBoxes && (
                <p className="tally-save">Each box is {fmtMoney(GROUPS.get('basil')!.lastCents)}, so what you save depends on how often you’d have ordered.</p>
              )}
              {flagged.length > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => p.copy(flagged.map((r) => bankDetails(GROUPS.get(r.merchantId)!)).join('\n\n———\n\n'), 'Details copied. Paste them into a message to your bank.')}
                >
                  <IconCopy /> Copy flagged charges for your bank
                </button>
              )}
            </aside>
          )}
          <button className="btn btn-quiet back" onClick={p.goFind}>Back to searching</button>
        </section>

        <div className="detail-col">
          <Detail
            group={group}
            reason={item.why}
            decision={p.decisions[group.merchant.id]}
            cancelDone={!!p.cancelDone[group.merchant.id]}
            onDecide={(d) => p.decide(group.merchant.id, d)}
            onCancelDone={(v) => p.setCancelDone(group.merchant.id, v)}
            onOpenOther={p.openMerchant}
            onCopy={p.copy}
            next={nextId ? { label: 'Next one to check', onClick: () => p.setSelectedId(nextId) } : null}
          />
        </div>
      </div>
    </div>
  )
}
