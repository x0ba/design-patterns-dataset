import { useMemo, useState } from 'react'
import { Archive, ChevronDown, ChevronRight, Check, History, Lock, Search, ShieldAlert } from 'lucide-react'
import { useStore, isLocked } from './store'
import { Decision, MEMOS, MEMO_TOTAL, MEMOS_NEEDING_DECISION, Memo } from './data'
import { fmtDate } from './logic'
import { Switch } from './ui'

type Filter = 'need' | 'flagged' | 'changed' | 'decided' | 'all'

export default function Memos() {
  const { s, d } = useStore()
  const locked = isLocked(s)
  const [filter, setFilter] = useState<Filter>('need')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)

  const need = MEMOS_NEEDING_DECISION
  const flagged = MEMOS.filter((m) => m.flagged)
  const changed = MEMOS.filter((m) => m.changed)
  const decidedIds = Object.keys(s.decisions)
  const undecided = need.filter((m) => !s.decisions[m.id])

  const rows = useMemo(() => {
    let r: Memo[] = MEMOS
    if (filter === 'need') r = need
    if (filter === 'flagged') r = flagged
    if (filter === 'changed') r = changed
    if (filter === 'decided') r = MEMOS.filter((m) => s.decisions[m.id])
    if (q.trim()) {
      const t = q.toLowerCase()
      r = r.filter((m) => (m.id + m.title + m.section).toLowerCase().includes(t))
    }
    return r
  }, [filter, q, s.decisions])

  const counts = {
    retire: Object.values(s.decisions).filter((v) => v === 'retire').length,
    historical: Object.values(s.decisions).filter((v) => v === 'historical').length,
    keep: Object.values(s.decisions).filter((v) => v === 'keep').length,
  }
  const actionable = rows.filter((m) => m.changed || m.flagged)
  const allSel = actionable.length > 0 && actionable.every((m) => sel.has(m.id))
  const decide = (ids: string[], v: Decision | null) => d({ type: 'decide', ids, value: v })
  const toggleSel = (id: string) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n) }
  const risky = (ids: string[]) => MEMOS.filter((m) => ids.includes(m.id) && m.openPermits > 0)

  const flaggedUndecided = flagged.filter((m) => !s.decisions[m.id])
  const histCandidates = changed.filter((m) => !m.flagged && !s.decisions[m.id])

  return (
    <div className="page">
      <div className="memo-head">
        <div>
          <h1 className="page-h">Interpretation memos</h1>
          <p className="page-sub">{MEMO_TOTAL} memos on file. {need.length} are affected by the 2024 edition and need a decision. The other {MEMO_TOTAL - need.length} stay active.</p>
        </div>
        <div className="progress-card" aria-label="Decision progress">
          <div className="pc-top"><b>{decidedIds.length}</b> of {need.length} decided</div>
          <div className="progress big"><span style={{ width: `${(decidedIds.length / need.length) * 100}%` }} /></div>
          <div className="pc-split"><span className="d-retire">{counts.retire} retire</span><span className="d-hist">{counts.historical} historical</span><span className="d-keep">{counts.keep} keep active</span><span>{undecided.length} open</span></div>
        </div>
      </div>

      <div className="memo-explain">
        <div><span className="tag tag-retire">Retire</span> Removed from search and the reader for every audience. Stays in the records archive.</div>
        <div><span className="tag tag-hist">Historical</span> Still readable, labelled “Historical”. Right for memos that interpret 2021 text, which still governs applications filed before Jan 1, 2027.</div>
        <div><span className="tag tag-keep">Keep active</span> No label and no change.</div>
      </div>

      <div className="memo-tools">
        <div className="filters" role="tablist">
          {([
            ['need', `Needs a decision`, need.length],
            ['flagged', 'Flagged by Building Official', flagged.length],
            ['changed', 'Cites a section changed in 2024', changed.length],
            ['decided', 'Decided', decidedIds.length],
            ['all', 'All memos', MEMO_TOTAL],
          ] as [Filter, string, number][]).map(([k, l, n]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l} <span>{n}</span></button>
          ))}
        </div>
        <div className="search"><Search size={14} /><input placeholder="Search number, title or section" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search memos" /></div>
      </div>

      <div className="memo-quick">
        <button className="btn btn-sm" disabled={locked || flaggedUndecided.length === 0} onClick={() => decide(flaggedUndecided.map((m) => m.id), 'retire')}>
          <Archive size={13} /> Follow the Building Official: retire {flaggedUndecided.length} flagged
        </button>
        <button className="btn btn-sm" disabled={locked || histCandidates.length === 0} onClick={() => decide(histCandidates.map((m) => m.id), 'historical')}>
          <History size={13} /> Label {histCandidates.length} unflagged changed-section memos Historical
        </button>
        <span className="quick-sp" />
        <label className="row-sw hp">
          <Switch checked={s.historicalPublic} onChange={(v) => d({ type: 'historicalPublic', value: v })} label="Show historical memos to the public" />
          <span>Show Historical memos to the public</span>
        </label>
      </div>

      {sel.size > 0 && (
        <div className="bulk" role="region" aria-label="Bulk actions">
          <b>{sel.size} selected</b>
          <button className="btn btn-sm" disabled={locked} onClick={() => { decide([...sel], 'retire'); setSel(new Set()) }}>Retire</button>
          <button className="btn btn-sm" disabled={locked} onClick={() => { decide([...sel], 'historical'); setSel(new Set()) }}>Mark Historical</button>
          <button className="btn btn-sm" disabled={locked} onClick={() => { decide([...sel], 'keep'); setSel(new Set()) }}>Keep active</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setSel(new Set())}>Clear</button>
          {risky([...sel]).length > 0 && <span className="bulk-warn"><ShieldAlert size={13} /> {risky([...sel]).length} of these are cited in open 2021 reviews</span>}
        </div>
      )}
      {locked && <div className="callout callout-lock"><Lock size={15} /><span>Decisions are locked while the draft awaits approval or when viewing as approver.</span></div>}

      <table className="memo-table">
        <thead>
          <tr>
            <th className="c-check"><input type="checkbox" aria-label="Select all shown" checked={allSel} disabled={actionable.length === 0 || locked} onChange={() => setSel(allSel ? new Set() : new Set(actionable.map((m) => m.id)))} /></th>
            <th>Memo</th><th>2021 section</th><th>Why it is listed</th><th className="num">Open 2021 reviews citing it</th><th className="c-dec">Decision</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const dec = s.decisions[m.id]
            const actionableRow = m.changed || m.flagged
            const isOpen = open === m.id
            return (
              <MemoRow key={m.id} m={m} dec={dec} actionable={actionableRow} isOpen={isOpen} selected={sel.has(m.id)} locked={locked}
                onSel={() => toggleSel(m.id)} onOpen={() => setOpen(isOpen ? null : m.id)} onDecide={(v) => decide([m.id], v)} />
            )
          })}
          {rows.length === 0 && <tr><td colSpan={6} className="empty">Nothing matches. {filter === 'decided' ? 'No decisions made yet.' : 'Try a different filter.'}</td></tr>}
        </tbody>
      </table>
      <p className="table-foot">Showing {rows.length} of {MEMO_TOTAL}.</p>
    </div>
  )
}

function MemoRow({ m, dec, actionable, isOpen, selected, locked, onSel, onOpen, onDecide }: {
  m: Memo; dec?: Decision; actionable: boolean; isOpen: boolean; selected: boolean; locked: boolean
  onSel: () => void; onOpen: () => void; onDecide: (v: Decision | null) => void
}) {
  const warn = dec === 'retire' && m.openPermits > 0
  return (
    <>
      <tr className={`${isOpen ? 'open' : ''} ${dec ? 'decided' : ''}`}>
        <td className="c-check">{actionable && <input type="checkbox" aria-label={`Select ${m.id}`} checked={selected} disabled={locked} onChange={onSel} />}</td>
        <td>
          <button className="memo-name" onClick={onOpen} aria-expanded={isOpen}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span><span className="memo-id">{m.id}</span><span className="memo-t">{m.title}</span><span className="memo-sub">Issued {fmtDate(m.issued)}</span></span>
          </button>
        </td>
        <td className="sec">§{m.section}</td>
        <td className="why">
          {m.flagged && <span className="tag tag-flag">Flagged to retire</span>}
          {m.changed && <span className="tag tag-chg">Section changed</span>}
          {!actionable && <span className="muted">No action needed</span>}
        </td>
        <td className={`num ${m.openPermits > 0 ? 'strong' : 'muted'}`}>{actionable ? m.openPermits : '—'}</td>
        <td className="c-dec">
          {actionable ? (
            <div className="dec" role="radiogroup" aria-label={`Decision for ${m.id}`}>
              {([['retire', 'Retire'], ['historical', 'Historical'], ['keep', 'Keep']] as [Decision, string][]).map(([v, l]) => (
                <button key={v} role="radio" aria-checked={dec === v} disabled={locked} className={`dec-${v} ${dec === v ? 'on' : ''}`} onClick={() => onDecide(dec === v ? null : v)}>{dec === v && <Check size={12} />}{l}</button>
              ))}
            </div>
          ) : <span className="active-label">Active</span>}
        </td>
      </tr>
      {isOpen && (
        <tr className="detail">
          <td />
          <td colSpan={5}>
            <div className="detail-grid">
              {m.change && <div><h5>What changed in 2024</h5><p>{m.change}</p></div>}
              {m.note && <div><h5>Building Official’s note</h5><p>{m.note}</p></div>}
              {!m.change && !m.note && <div><h5>Status</h5><p>This memo cites a section that is the same in both editions. No decision is needed.</p></div>}
              {actionable && (
                <div>
                  <h5>If you choose…</h5>
                  <p><b>Retire:</b> gone from reader and search{m.openPermits > 0 ? `, including for the ${m.openPermits} open 2021 review${m.openPermits > 1 ? 's' : ''} that cite it` : ''}.<br /><b>Historical:</b> stays on 2021 §{m.section} with a label.</p>
                </div>
              )}
            </div>
            {warn && <div className="callout callout-warn"><ShieldAlert size={15} /><span>{m.openPermits} open permit review{m.openPermits > 1 ? 's' : ''} filed under 2021 cite this memo. Reviewers would lose it from the reader. Consider Historical instead.</span></div>}
          </td>
        </tr>
      )}
    </>
  )
}
