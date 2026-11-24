import { Dispatch, Fragment, useMemo, useState } from 'react'
import {
  AMENDMENT_LINE_ID,
  COMMITTEE_SIZE,
  ESPORTS_ID,
  JAN_MEETING,
  REQUESTS,
  ROBOTICS_ID,
  Req,
} from './data'
import {
  Action,
  State,
  canWait,
  finalAmount,
  flagsFor,
  foodCapAmount,
  foodOf,
  isAdjusted,
  isCommitted,
  isNarrow,
  isTrimmed,
  lineFinal,
  needsFundsBeforeJan,
  pendingReqs,
  shortDate,
  sumLines,
  usd,
  usdSigned,
} from './model'
import { CAT_LABEL } from './data'

export type Tab = 'pending' | 'held' | 'denied' | 'committed'

export const FILTERS: { key: string; label: string }[] = [
  { key: 'food', label: 'Food over 25%' },
  { key: 'risk', label: 'Risk form flag' },
  { key: 'narrow', label: 'Bare-majority vote' },
  { key: 'early', label: 'Needs funds before Jan 14' },
  { key: 'wait', label: 'Can wait for January' },
  { key: 'adjusted', label: 'Adjusted by you' },
]

function passes(r: Req, s: State, f: Set<string>) {
  const a = s.adj[r.id]
  for (const k of f) {
    if (k === 'food' && !flagsFor(r).some((x) => x.key === 'food')) return false
    if (k === 'risk' && !flagsFor(r).some((x) => x.key === 'risk')) return false
    if (k === 'narrow' && !isNarrow(r)) return false
    if (k === 'early' && !needsFundsBeforeJan(r)) return false
    if (k === 'wait' && !canWait(r)) return false
    if (k === 'adjusted' && !isAdjusted(r, a)) return false
  }
  return true
}

const voteText = (v: [number, number, number]) => v.join('–')

function Dots({ v }: { v: [number, number, number] }) {
  const out = []
  for (let i = 0; i < v[0]; i++) out.push(<i key={'y' + i} className="y" />)
  for (let i = 0; i < v[1]; i++) out.push(<i key={'n' + i} className="n" />)
  for (let i = 0; i < v[2]; i++) out.push(<i key={'a' + i} className="a" />)
  return <span className="dots" aria-hidden>{out}</span>
}

interface Props {
  s: State
  d: Dispatch<Action>
  tab: Tab
  setTab: (t: Tab) => void
  filters: Set<string>
  toggleFilter: (k: string) => void
  clearFilters: () => void
  openId: string | null
  setOpenId: (id: string | null) => void
  onRescind: (id: string) => void
}

export function AwardTable(p: Props) {
  const { s, d, tab, setTab, filters, toggleFilter, clearFilters, openId, setOpenId, onRescind } = p
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('amount')
  const committed = isCommitted(s)

  const pending = pendingReqs.filter((r) => !s.adj[r.id]?.deferred)
  const held = REQUESTS.filter((r) => r.status === 'tabled' || (r.status === 'approved' && s.adj[r.id]?.deferred && !committed))
  const heldAll = committed
    ? REQUESTS.filter((r) => r.status === 'tabled' || (r.status === 'approved' && s.committed[r.id] === undefined))
    : held
  const denied = REQUESTS.filter((r) => r.status === 'denied')
  const committedList = REQUESTS.filter((r) => s.committed[r.id] !== undefined)

  const tabs: { key: Tab; label: string; n: number }[] = committed
    ? [
        { key: 'committed', label: 'Committed', n: committedList.length },
        { key: 'held', label: 'Held for January', n: heldAll.length },
        { key: 'denied', label: 'Denied', n: denied.length },
      ]
    : [
        { key: 'pending', label: 'To commit', n: pending.length },
        { key: 'held', label: 'Held for January', n: heldAll.length },
        { key: 'denied', label: 'Denied', n: denied.length },
        { key: 'committed', label: 'Already committed', n: committedList.length },
      ]

  const base = tab === 'pending' ? pending : tab === 'held' ? heldAll : tab === 'denied' ? denied : committedList
  const rows = useMemo(() => {
    let list = base.filter((r) => r.club.toLowerCase().includes(q.trim().toLowerCase()))
    if (tab === 'pending') list = list.filter((r) => passes(r, s, filters))
    const amt = (r: Req) => (tab === 'committed' ? s.committed[r.id] ?? 0 : tab === 'pending' ? finalAmount(r, s.adj[r.id]) : r.status === 'approved' ? r.approved : r.requested)
    const sorted = [...list]
    if (sort === 'amount') sorted.sort((a, b) => amt(b) - amt(a))
    if (sort === 'name') sorted.sort((a, b) => a.club.localeCompare(b.club))
    if (sort === 'spend') sorted.sort((a, b) => a.firstSpend.localeCompare(b.firstSpend))
    if (sort === 'vote') sorted.sort((a, b) => (a.amendmentVote ?? a.vote)[0] - (b.amendmentVote ?? b.vote)[0] || b.approved - a.approved)
    return sorted
  }, [base, q, filters, sort, tab, s])

  const cols = tab === 'pending' ? 8 : tab === 'committed' ? 7 : tab === 'held' ? 6 : 5

  return (
    <section className="card tablecard" id="award-table" aria-label="Awards">
      <div className="tbl-head">
        <h2 style={{ marginRight: 'auto' }}>Awards</h2>
        <label className="search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" /></svg>
          <input placeholder="Find a club" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a club" />
        </label>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}<span className="count num">{t.n}</span>
          </button>
        ))}
      </div>
      {tab === 'pending' && (
        <div className="filters">
          {FILTERS.map((f) => (
            <button key={f.key} className="fchip" aria-pressed={filters.has(f.key)} onClick={() => toggleFilter(f.key)}>{f.label}</button>
          ))}
          {filters.size > 0 && <button className="btn ghost sm" onClick={clearFilters}>Clear</button>}
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="amount">Sort: largest award</option>
            <option value="name">Sort: club name</option>
            <option value="spend">Sort: first spend date</option>
            <option value="vote">Sort: narrowest vote</option>
          </select>
        </div>
      )}
      <table className="grid">
        <thead>
          {tab === 'pending' && (
            <tr>
              <th>Club</th><th className="r">Requested</th><th className="r">Approved</th><th>Vote</th><th>Flags</th><th>First spend</th><th className="r">To commit</th><th />
            </tr>
          )}
          {tab === 'held' && (
            <tr><th>Club</th><th className="r">Requested</th><th className="r">Approved</th><th>Vote</th><th>Status</th><th /></tr>
          )}
          {tab === 'denied' && (
            <tr><th>Club</th><th className="r">Requested</th><th>Vote</th><th>Reason</th><th /></tr>
          )}
          {tab === 'committed' && (
            <tr><th>Club</th><th className="r">Approved</th><th className="r">Committed</th><th className="r">Spent</th><th>Status</th><th /><th /></tr>
          )}
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={cols} className="empty">Nothing matches. {filters.size > 0 && <button className="btn ghost sm" onClick={clearFilters}>Clear filters</button>}</td></tr>
          )}
          {rows.map((r) => {
            const open = openId === r.id
            const a = s.adj[r.id]
            const flags = flagsFor(r)
            const comment = s.comments.find((c) => c.reqId === r.id && !c.addressed)
            const toggle = () => setOpenId(open ? null : r.id)
            const kb = (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggle()
              }
            }
            const nameCell = (
              <td>
                <div className="club">{r.club}<small>{r.kind}</small></div>
              </td>
            )
            const caret = (
              <td className="r"><span className="caret" aria-hidden>›</span></td>
            )
            const rowProps = { id: 'row-' + r.id, className: 'row' + (open ? ' open' : ''), onClick: toggle, onKeyDown: kb, tabIndex: 0, 'aria-expanded': open }
            return (
              <Fragment key={r.id}>
                {tab === 'pending' && (() => {
                  const fin = finalAmount(r, a)
                  const adjusted = isAdjusted(r, a)
                  const early = needsFundsBeforeJan(r)
                  return (
                    <tr {...rowProps}>
                      {nameCell}
                      <td className="r num">{usd(r.requested)}</td>
                      <td className="r num">{usd(r.approved)}</td>
                      <td className={'vote num' + (isNarrow(r) ? ' narrow' : '')}>
                        {voteText(r.amendmentVote ?? r.vote)}{r.amendmentVote && <small>amend.</small>}
                      </td>
                      <td>
                        <div className="flags">
                          {flags.map((f) => <span key={f.key} className={'chip ' + f.tone} title={f.long}>{f.short}</span>)}
                          {comment && <span className="chip blue" title="Advisor comment not yet addressed">Advisor note</span>}
                        </div>
                      </td>
                      <td className="firstspend num">
                        <span className={early ? 'early' : ''}>{shortDate(r.firstSpend)}</span>
                        <small>{r.firstSpendFor}</small>
                      </td>
                      <td className="r num">
                        {adjusted && <span className="struck">{usd(r.approved)}</span>}
                        <b>{usd(fin)}</b>
                        {adjusted && <span className="delta">{usdSigned(fin - r.approved)}</span>}
                      </td>
                      {caret}
                    </tr>
                  )
                })()}
                {tab === 'held' && (
                  <tr {...rowProps}>
                    {nameCell}
                    <td className="r num">{usd(r.requested)}</td>
                    <td className="r num">{r.status === 'approved' ? usd(r.approved) : '—'}</td>
                    <td className="vote num">{voteText(r.vote)}</td>
                    <td>{r.status === 'tabled' ? <span className="chip gray">Tabled until January</span> : <span className="chip amber">Deferred by chair to Jan 14</span>}</td>
                    {caret}
                  </tr>
                )}
                {tab === 'denied' && (
                  <tr {...rowProps}>
                    {nameCell}
                    <td className="r num">{usd(r.requested)}</td>
                    <td className="vote num">{voteText(r.vote)}</td>
                    <td style={{ color: 'var(--ink-2)', maxWidth: 440 }}>{r.notes.replace(/^Denied\.\s*/, '').split('. ')[0]}.</td>
                    {caret}
                  </tr>
                )}
                {tab === 'committed' && (() => {
                  const amt = s.committed[r.id]
                  const rx = s.rescissions.find((x) => x.reqId === r.id)
                  const wrong = amt !== r.approved
                  return (
                    <tr {...rowProps}>
                      {nameCell}
                      <td className="r num">{usd(r.approved)}</td>
                      <td className="r num"><b>{usd(amt)}</b>{wrong && <span className="delta">{usdSigned(amt - r.approved)} vs. vote</span>}</td>
                      <td className="r num">$0</td>
                      <td>
                        {rx ? <span className="chip amber">Appeal window to {shortDate(rx.windowEnds)}</span> : wrong && r.id === ESPORTS_ID ? <span className="chip red">Differs from vote</span> : wrong ? <span className="chip gray">Trimmed before commit</span> : <span className="chip green">Committed</span>}
                      </td>
                      <td className="r" onClick={(e) => e.stopPropagation()}>
                        {r.id === ESPORTS_ID && !rx ? (
                          <button className="btn sm warn" onClick={() => onRescind(r.id)}>Walk back…</button>
                        ) : (
                          committed && !rx && <button className="btn sm" onClick={() => onRescind(r.id)}>Reduce or rescind…</button>
                        )}
                      </td>
                      {caret}
                    </tr>
                  )
                })()}
                {open && (
                  <tr className="detail">
                    <td colSpan={cols}>
                      <Detail r={r} s={s} d={d} tab={tab} onRescind={onRescind} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

/* ---------------------------------------------------------------- Detail */
function Detail({ r, s, d, tab, onRescind }: { r: Req; s: State; d: Dispatch<Action>; tab: Tab; onRescind: (id: string) => void }) {
  const a = s.adj[r.id]
  const committed = isCommitted(s)
  const editable = tab === 'pending' && !committed
  const flags = flagsFor(r)
  const comment = s.comments.find((c) => c.reqId === r.id)
  const early = needsFundsBeforeJan(r)
  const food = foodOf(r, a)
  const cap = foodCapAmount(r, a)
  const overCap = editable && food > cap
  const adjusted = isAdjusted(r, a)

  return (
    <div className="detail-in">
      <div>
        <table className="lines">
          <thead>
            <tr><th>Line item</th><th>Requested</th><th>Committee</th>{editable && <th>To commit</th>}</tr>
          </thead>
          <tbody>
            {r.lines.map((l) => {
              const v = lineFinal(a, l.id, l.approved)
              return (
                <tr key={l.id}>
                  <td>
                    {l.label === CAT_LABEL[l.cat] ? l.label : <>{l.label}</>}
                    {l.label !== CAT_LABEL[l.cat] && <span className="sub">{CAT_LABEL[l.cat]}</span>}
                    {l.amendment && <span className="chip blue" style={{ marginLeft: 6 }}>Late amendment</span>}
                    {l.needBy && <span className="sub">needed by {shortDate(l.needBy)}{l.needBy > JAN_MEETING ? ' · can wait for Jan 14' : ''}</span>}
                  </td>
                  <td className="num">{usd(l.requested)}</td>
                  <td className="num">{usd(l.approved)}</td>
                  {editable && (
                    <td>
                      {l.approved === 0 ? (
                        <span className="num" style={{ color: 'var(--ink-3)' }}>$0</span>
                      ) : (
                        <label className={'moneyin' + (v !== l.approved ? ' changed' : '')}>
                          <span>$</span>
                          <input
                            inputMode="numeric"
                            value={v}
                            aria-label={`${r.club} ${l.label} amount to commit`}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => d({ type: 'setLine', reqId: r.id, lineId: l.id, value: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                          />
                        </label>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{usd(r.requested)}</td>
              <td className="num">{usd(r.approved)}</td>
              {editable && <td className="num">{usd(sumLines(r, a))}</td>}
            </tr>
          </tfoot>
        </table>

        {editable && (
          <>
            <div className="actions">
              {overCap && (
                <button className="btn sm" onClick={() => d({ type: 'capFood', reqId: r.id })}>
                  Cap food at 25% ({usd(food)} → {usd(cap)})
                </button>
              )}
              {r.id === ROBOTICS_ID && (lineFinal(a, AMENDMENT_LINE_ID, 6200) > 0) && (
                <button className="btn sm" onClick={() => d({ type: 'holdAmendment' })}>Hold Dayton amendment (−$6,200)</button>
              )}
              {adjusted && <button className="btn sm ghost" onClick={() => d({ type: 'resetAward', reqId: r.id })}>Reset to committee amount</button>}
            </div>
            <textarea
              className="note-in"
              rows={2}
              placeholder="Note for the audit log (optional): why this differs from the vote"
              value={a?.note ?? ''}
              onChange={(e) => d({ type: 'setNote', reqId: r.id, note: e.target.value })}
              aria-label="Chair note"
            />
          </>
        )}
      </div>

      <div className="dl">
        <h4>Vote{r.amendmentVote ? 's' : ''}</h4>
        <div style={{ marginBottom: 12 }}>
          <Dots v={r.vote} />
          <span className="num"><b>{voteText(r.vote)}</b> of {COMMITTEE_SIZE}</span>
          <span style={{ color: 'var(--ink-3)' }}> for · against · abstain{r.amendmentVote ? ' (base request)' : ''}</span>
          {r.amendmentVote && (
            <div style={{ marginTop: 4 }}>
              <Dots v={r.amendmentVote} />
              <span className="num"><b>{voteText(r.amendmentVote)}</b></span>
              <span style={{ color: 'var(--ink-3)' }}> Dayton amendment</span>
            </div>
          )}
        </div>

        <h4>Deliberation</h4>
        <blockquote>{r.notes}</blockquote>

        {flags.length > 0 && (
          <>
            <h4>Policy flags</h4>
            <ul>{flags.map((f) => <li key={f.key}>{f.long}</li>)}</ul>
          </>
        )}

        {comment && (
          <div className="callout blue" style={{ marginBottom: 10 }}>
            <b>Carla Ruiz, advisor:</b> {comment.text}
            <div style={{ marginTop: 6 }}>
              <button className="btn sm" onClick={() => d({ type: 'addressComment', id: comment.id, value: !comment.addressed })}>
                {comment.addressed ? 'Reopen comment' : 'Mark addressed'}
              </button>
            </div>
          </div>
        )}

        {r.status === 'approved' && (
          <div style={{ marginBottom: 6 }}>
            <h4>First planned spend</h4>
            <span className="num">{shortDate(r.firstSpend)}</span> · {r.firstSpendFor}
          </div>
        )}

        {editable && (
          <div className={'callout ' + (early ? 'amber' : 'blue')}>
            {early ? (
              <><b>Needs funds before the Jan 14 meeting.</b> Deferring leaves this club unable to pay for {r.firstSpendFor.toLowerCase()} on {shortDate(r.firstSpend)}.</>
            ) : (
              <><b>First spend is after the Jan 14 meeting.</b> A deferral wouldn’t stop this club from paying anyone.</>
            )}
            <div style={{ marginTop: 6 }}>
              <button className="btn sm" onClick={() => d({ type: 'setDeferred', reqId: r.id, value: true })}>Defer to January docket</button>
            </div>
          </div>
        )}

        {tab === 'held' && r.status === 'approved' && !committed && (
          <div className="actions">
            <button className="btn sm primary" onClick={() => d({ type: 'setDeferred', reqId: r.id, value: false })}>Restore to this round</button>
          </div>
        )}
        {tab === 'committed' && committed && !s.rescissions.some((x) => x.reqId === r.id) && (
          <div className="actions">
            <button className="btn sm" onClick={() => onRescind(r.id)}>Reduce or rescind…</button>
          </div>
        )}
      </div>
    </div>
  )
}
