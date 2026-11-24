import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookPlus, Check, ChevronDown, ChevronUp, X } from 'lucide-react'
import { CODE_BY_ID, type CodeId } from '../data/codes'
import {
  CODED_BY_ID, DISAGREEMENTS, FORUMS, FORUM_NAME, MODEL_ID, CONFIG_HASH,
  type CodedPost, type ForumId,
} from '../data/corpus'
import { V3_PAIRS, confusionCounts } from '../lib/stats'
import { fmtDateTime, fmtPostDate } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { useStore, type Cause } from '../store'
import { CodeChip, Kbd, Segmented } from '../components/ui'
import AddExample from '../components/AddExample'

const PAIR_ORDER = confusionCounts(V3_PAIRS)
const pairRank = (p: CodedPost) =>
  PAIR_ORDER.findIndex((x) => x.gold === p.gold && x.model === p.model.code)
const ORDERED = [...DISAGREEMENTS].sort((a, b) => pairRank(a) - pairRank(b) || b.model.conf - a.model.conf)

export const CAUSES: { id: Cause; label: string; hint: string; key: string }[] = [
  { id: 'model', label: 'Model misread it', hint: 'The codebook is clear; the model got it wrong.', key: '1' },
  { id: 'codebook', label: 'Codebook gap', hint: 'The codebook doesn’t say how to handle this.', key: '2' },
  { id: 'gold', label: 'Gold label looks wrong', hint: 'Flag for Priya and Marcus to re-adjudicate.', key: '3' },
]

function Highlighted({ text, quote }: { text: string; quote: string }) {
  const i = text.indexOf(quote)
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark>{quote}</mark>
      {text.slice(i + quote.length)}
    </>
  )
}

function ConfMeter({ v }: { v: number }) {
  return (
    <span className="conf" role="img" aria-label={`confidence ${v.toFixed(2)}`}>
      <span className="conf-bar"><i style={{ width: `${v * 100}%` }} /></span>
      <b className="num">{v.toFixed(2)}</b>
    </span>
  )
}

export default function Disagreements() {
  const { segs, query } = useRoute()
  const s = useStore()
  const [addFor, setAddFor] = useState<string | null>(null)
  const scope = (query.get('scope') as 'all' | 'request' | 'untagged') || 'all'
  const codeQ = query.get('code') as CodeId | null
  const goldQ = query.get('gold') as CodeId | null
  const modelQ = query.get('model') as CodeId | null
  const forumQ = query.get('forum') as ForumId | null

  const setQ = (patch: Record<string, string | null>, id?: string) => {
    const q = new URLSearchParams(query)
    for (const [k, v] of Object.entries(patch)) { if (v) q.set(k, v); else q.delete(k) }
    const qs = q.toString()
    navigate(`disagreements${id ?? segs[1] ? '/' + (id ?? segs[1]) : ''}${qs ? '?' + qs : ''}`)
  }

  const isReq = (p: CodedPost) => p.gold === 'request' || p.model.code === 'request'
  const list = useMemo(() => ORDERED.filter((p) => {
    if (scope === 'request' && !isReq(p)) return false
    if (scope === 'untagged' && s.tags[p.id]?.cause) return false
    if (codeQ && p.gold !== codeQ && p.model.code !== codeQ) return false
    if (goldQ && p.gold !== goldQ) return false
    if (modelQ && p.model.code !== modelQ) return false
    if (forumQ && p.forum !== forumQ) return false
    return true
  }), [scope, codeQ, goldQ, modelQ, forumQ, s.tags])

  const taggedCount = DISAGREEMENTS.filter((p) => s.tags[p.id]?.cause).length
  const requestCount = DISAGREEMENTS.filter(isReq).length
  const selectedId = segs[1]
  const selected = list.find((p) => p.id === selectedId) ?? list[0] ?? null
  const idx = selected ? list.findIndex((p) => p.id === selected.id) : -1

  const go = (p: CodedPost | undefined) => { if (p) setQ({}, p.id) }
  const next = () => go(list[Math.min(list.length - 1, idx + 1)])
  const prev = () => go(list[Math.max(0, idx - 1)])
  const nextUntagged = () => {
    const after = [...list.slice(idx + 1), ...list.slice(0, idx)]
    go(after.find((p) => !s.tags[p.id]?.cause))
  }

  // keyboard: j/k move, 1/2/3 tag
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('textarea, input, select, [role=dialog]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'j') { e.preventDefault(); next() }
      else if (e.key === 'k') { e.preventDefault(); prev() }
      else if (selected && ['1', '2', '3'].includes(e.key)) {
        const c = CAUSES[Number(e.key) - 1].id
        s.setCause(selected.id, s.tags[selected.id]?.cause === c ? undefined : c)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const pairOptions = PAIR_ORDER
  const pairValue = goldQ && modelQ ? `${goldQ}>${modelQ}` : ''
  const hasExtra = !!(codeQ || forumQ)

  return (
    <div className="page disag">
      <aside className="disag-list" aria-label="Disagreements">
        <header className="disag-list-head">
          <div className="row-between">
            <h1>Disagreements</h1>
            <span className="small muted num">{taggedCount} of {DISAGREEMENTS.length} tagged</span>
          </div>
          <Segmented
            label="Show" value={scope} onChange={(v) => setQ({ scope: v === 'all' ? null : v })}
            options={[
              { value: 'all', label: <>All <b className="num">{DISAGREEMENTS.length}</b></> },
              { value: 'request', label: <>Request <b className="num">{requestCount}</b></> },
              { value: 'untagged', label: <>Untagged <b className="num">{DISAGREEMENTS.length - taggedCount}</b></> },
            ]}
          />
          <div className="filters">
            <select aria-label="Filter by gold and model label" value={pairValue}
              onChange={(e) => {
                const [g, m] = e.target.value.split('>')
                setQ({ gold: g || null, model: m || null, code: null })
              }}>
              <option value="">Any gold → model pair</option>
              {pairOptions.map((p) => (
                <option key={p.gold + p.model} value={`${p.gold}>${p.model}`}>
                  {CODE_BY_ID[p.gold].name} → {CODE_BY_ID[p.model].name} ({p.n})
                </option>
              ))}
            </select>
            <select aria-label="Filter by forum" value={forumQ ?? ''} onChange={(e) => setQ({ forum: e.target.value || null })}>
              <option value="">All forums</option>
              {FORUMS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          {(codeQ || hasExtra) && (
            <div className="active-filters">
              {codeQ && (
                <button className="filter-chip" onClick={() => setQ({ code: null })}>
                  Involves <CodeChip id={codeQ} size="sm" /> <X size={12} />
                </button>
              )}
            </div>
          )}
        </header>
        <ul className="disag-rows" role="listbox" aria-label="Posts where the model and gold labels differ">
          {list.length === 0 && <li className="empty small muted">No disagreements match these filters.</li>}
          {list.map((p, i) => {
            const t = s.tags[p.id]
            const on = selected?.id === p.id
            return (
              <li key={p.id} role="option" aria-selected={on}>
                <button className={`drow ${on ? 'on' : ''}`} onClick={() => go(p)}>
                  <span className="drow-top">
                    <span className="drow-pair">
                      <CodeChip id={p.gold!} size="sm" /><ArrowRight size={12} aria-hidden /><CodeChip id={p.model.code} size="sm" />
                    </span>
                    <span className={`drow-tag ${t?.cause ? 'done' : ''}`}>
                      {t?.cause ? <><Check size={12} /> {CAUSES.find((c) => c.id === t.cause)!.label}</> : <>#{i + 1}</>}
                    </span>
                  </span>
                  <span className="drow-text">{p.text}</span>
                  <span className="drow-meta mono">{p.id} · {p.forum} · conf {p.model.conf.toFixed(2)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="disag-detail" aria-label="Selected disagreement">
        {selected ? (
          <Detail
            key={selected.id} post={selected} pos={idx + 1} total={list.length}
            onPrev={prev} onNext={next} onNextUntagged={nextUntagged}
            onUse={() => {
              if (!s.draft) s.startDraft()
              setAddFor(selected.id)
            }}
          />
        ) : (
          <div className="empty-detail muted">Nothing selected.</div>
        )}
      </section>
      {addFor && <AddExample initialPostId={addFor} onClose={() => setAddFor(null)} onAdded={() => {}} />}
    </div>
  )
}

function Detail({ post, pos, total, onPrev, onNext, onNextUntagged, onUse }: {
  post: CodedPost; pos: number; total: number
  onPrev: () => void; onNext: () => void; onNextUntagged: () => void; onUse: () => void
}) {
  const s = useStore()
  const tag = s.tags[post.id]
  const reconciled = post.priya !== post.marcus
  const g = post.gold!
  const m = post.model.code
  const used = !!s.draft?.request.examples.some((e) => e.postId === post.id)
  const [open, setOpen] = useState(false)
  return (
    <div className="detail">
      <header className="detail-head">
        <div>
          <div className="mono post-id">{post.id}</div>
          <div className="small muted">
            {FORUM_NAME[post.forum]} · {fmtPostDate(post.date)} · author <span className="mono">{post.author}</span> · queue position <span className="num">{post.queuePos}</span>
          </div>
        </div>
        <div className="pager">
          <span className="small muted num">{pos} of {total}</span>
          <button className="icon-btn bordered" onClick={onPrev} aria-label="Previous disagreement" title="Previous (K)"><ChevronUp size={16} /></button>
          <button className="icon-btn bordered" onClick={onNext} aria-label="Next disagreement" title="Next (J)"><ChevronDown size={16} /></button>
        </div>
      </header>

      <div className="verdicts">
        <div className="verdict gold">
          <div className="eyebrow">Gold label</div>
          <CodeChip id={g} size="lg" />
          <p className="small">
            {reconciled
              ? <>Priya coded <b>{CODE_BY_ID[post.priya!].name.toLowerCase()}</b>, Marcus <b>{CODE_BY_ID[post.marcus!].name.toLowerCase()}</b>; reconciled to {CODE_BY_ID[g].name.toLowerCase()}.</>
              : <>Priya and Marcus both coded this <b>{CODE_BY_ID[g].name.toLowerCase()}</b> on first pass.</>}
          </p>
        </div>
        <div className="verdict-arrow" aria-hidden><ArrowRight size={18} /></div>
        <div className="verdict model">
          <div className="eyebrow">Model label</div>
          <div className="row-gap"><CodeChip id={m} size="lg" /><ConfMeter v={post.model.conf} /></div>
          <p className="small rationale">“{post.model.rationale}”</p>
        </div>
      </div>

      <div className="postwrap">
        <div className="postwrap-head">
          <span className="eyebrow">Post</span>
          <span className="small muted"><mark className="mini">Highlighted</mark> = sentence the model relied on</span>
        </div>
        <blockquote className="post"><Highlighted text={post.text} quote={post.model.quote} /></blockquote>
      </div>

      <details className="prov" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Where this label came from</summary>
        <dl>
          <div><dt>Model</dt><dd className="mono">{MODEL_ID}</dd></div>
          <div><dt>Codebook</dt><dd>v3 (published Oct 21, 2026)</dd></div>
          <div><dt>Run</dt><dd>Run 1 · {CONFIG_HASH}</dd></div>
          <div><dt>Labeled</dt><dd>{fmtDateTime(post.labeledAt)}</dd></div>
        </dl>
      </details>

      <section className="review" aria-label="Your review">
        <div className="review-head">
          <h2>Why do they differ?</h2>
          <span className="small muted">Keys <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd> · next <Kbd>J</Kbd> previous <Kbd>K</Kbd></span>
        </div>
        <div className="causes" role="radiogroup" aria-label="Cause">
          {CAUSES.map((c) => (
            <button key={c.id} role="radio" aria-checked={tag?.cause === c.id}
              className={`cause ${tag?.cause === c.id ? 'on' : ''}`}
              onClick={() => s.setCause(post.id, tag?.cause === c.id ? undefined : c.id)}>
              <span className="cause-key"><Kbd>{c.key}</Kbd></span>
              <b>{c.label}</b>
              <span className="small">{c.hint}</span>
            </button>
          ))}
        </div>
        <label className="field">
          <span className="sr">Note</span>
          <textarea rows={2} value={tag?.note ?? ''} onChange={(e) => s.setNote(post.id, e.target.value)}
            placeholder="Optional note: what makes this one hard?" />
        </label>
        <div className="review-actions">
          <button className="btn btn-secondary" onClick={onUse} disabled={used}>
            <BookPlus size={15} /> {used ? 'Already a boundary example in draft v4' : 'Use as boundary example…'}
          </button>
          <span className="grow" />
          <button className="btn btn-ghost" onClick={onNext}>Next</button>
          <button className="btn btn-primary" onClick={onNextUntagged}>Next untagged <ArrowRight size={15} /></button>
        </div>
      </section>
    </div>
  )
}
