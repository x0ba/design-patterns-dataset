import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, BookOpen, Check, Circle, MessageSquare, Plus, Target, Trash2, TriangleAlert, X } from 'lucide-react'
import { LANES, LANE_META, PEOPLE, STAGES, STAGE_META } from '../lib/types'
import type { Doc, Edge, El, Evidence, Lane } from '../lib/types'
import { ME } from '../lib/types'
import { groupOf, placeElement, stageIndex } from '../lib/layout'
import { reach, openCommentsOn } from '../lib/graph'
import { checkMeasurable } from '../lib/measure'
import { clip, uid } from '../lib/store'
import { useApp } from './ctx'
import { CommitText, Section } from './ui'
import { cx } from './Canvas'

const isOutcomeStage = (e: El) => e.stage === 'outcome' || e.stage === 'longterm'

/* ======================= element ======================= */

export function ElementInspector({ el }: { el: El }) {
  const { doc, apply, focusText, clearFocusText, removeElement, setTab, toggleEdge, select } = useApp()
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const [draft, setDraft] = useState(el.text)
  useEffect(() => setDraft(el.text), [el.id, el.text])
  useEffect(() => {
    if (focusText === el.id) {
      const t = inputRef.current as HTMLTextAreaElement | null
      t?.focus()
      t?.select()
      clearFocusText()
    }
  }, [focusText, el.id, clearFocusText])

  const outcome = isOutcomeStage(el)
  const m = outcome ? checkMeasurable(draft) : null
  const meta = STAGE_META[el.stage]
  const group = groupOf(doc.elements, el.stage, el.lane)
  const pos = group.findIndex((g) => g.id === el.id)
  const open = openCommentsOn(doc, 'element', el.id)

  const setLane = (lane: Lane) => {
    if (lane === el.lane) return
    apply(`Moved “${clip(el.text, 36)}” to ${LANE_META[lane].name}`, (d) => {
      d.elements = placeElement(d.elements, el.id, lane, 999)
    })
  }
  const nudge = (delta: number) =>
    apply(null, (d) => {
      d.elements = placeElement(d.elements, el.id, el.lane, pos + delta)
    })

  const inherited = doc.edges.filter((e) => e.inherited && (e.from === el.id || e.to === el.id))
  const downstream = useMemo(() => {
    const r = reach(doc.edges, el.id, 'down')
    return doc.elements.filter((e) => e.stage === 'longterm' && r.nodes.has(e.id))
  }, [doc.edges, doc.elements, el.id])

  return (
    <div className="inspector">
      <div className="insp-head">
        <span className="stage-chip" style={{ ['--lane' as string]: LANE_META[el.lane].color }}>
          {meta.singular}
        </span>
        {el.stage === 'outcome' && (
          <div className="seg mini" role="group" aria-label="Time frame">
            {(['short', 'mid'] as const).map((t) => (
              <button key={t} className={cx(el.term === t && 'on')} onClick={() => apply(null, (d) => void (d.elements.find((x) => x.id === el.id)!.term = t))}>
                {t === 'short' ? 'Short-term' : 'Mid-term'}
              </button>
            ))}
          </div>
        )}
        <span className="spacer" />
        <button className="icon-btn" title="Move up in this row" aria-label="Move up" disabled={pos <= 0} onClick={() => nudge(-1)}>
          <ArrowUp size={15} />
        </button>
        <button className="icon-btn" title="Move down in this row" aria-label="Move down" disabled={pos >= group.length - 1} onClick={() => nudge(1)}>
          <ArrowDown size={15} />
        </button>
        <button className="icon-btn danger" title="Delete element" aria-label="Delete element" onClick={() => removeElement(el.id)}>
          <Trash2 size={15} />
        </button>
      </div>

      <span className="field-label">Statement</span>
      <CommitText
        multiline
        className="text-field statement"
        value={el.text}
        ariaLabel="Statement"
        inputRef={inputRef}
        onDraft={setDraft}
        onCommit={(v) => apply(`Reworded “${clip(el.text, 36)}”`, (d) => void (d.elements.find((x) => x.id === el.id)!.text = v))}
      />

      {m && (
        <div className={cx('measure', m.ok ? 'ok' : 'bad')} aria-live="polite">
          <div className="measure-chips">
            {(
              [
                ['Who', m.who],
                ['What changes', m.change],
                ['How much', m.amount],
                ['By when', m.when],
              ] as const
            ).map(([label, on]) => (
              <span key={label} className={cx('mchip', on && 'on')}>
                {on ? <Check size={11} /> : <Circle size={9} />} {label}
              </span>
            ))}
          </div>
          <p>
            {m.ok
              ? m.score === 4
                ? 'Reads as measurable: someone could score it against an indicator.'
                : `Mostly measurable. Still missing ${m.missing.join(' and ')}.`
              : `Not yet measurable. Add ${m.missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}. A useful shape: “70% of [who] [change] by [when].”`}
          </p>
        </div>
      )}

      <div className="field-row">
        <span className="field-label">Program</span>
        <div className="seg lanes" role="group" aria-label="Program">
          {LANES.map((l) => (
            <button key={l} className={cx(el.lane === l && 'on')} style={{ ['--lane' as string]: LANE_META[l].color }} onClick={() => setLane(l)}>
              <i /> {LANE_META[l].short}
            </button>
          ))}
        </div>
      </div>

      {el.splitFrom && (
        <div className="callout info">
          <strong>Split from “{el.splitFrom}”.</strong>
          {inherited.length > 0 ? (
            <>
              <p>
                {inherited.length} {inherited.length === 1 ? 'connection was' : 'connections were'} copied over from the original activity. Keep the ones that are true for this activity.
              </p>
              {inherited.map((e) => {
                const other = doc.elements.find((x) => x.id === (e.from === el.id ? e.to : e.from))!
                return (
                  <div className="inh-row" key={e.id}>
                    <span>{clip(other.text, 60)}</span>
                    <button className="btn tiny" onClick={() => apply(`Confirmed a link from “${clip(doc.elements.find((x) => x.id === e.from)!.text, 30)}”`, (d) => void (d.edges.find((x) => x.id === e.id)!.inherited = false))}>
                      Keep
                    </button>
                    <button className="btn tiny danger" onClick={() => toggleEdge(e.from, e.to, false)}>
                      Remove
                    </button>
                  </div>
                )
              })}
            </>
          ) : (
            <p>All copied connections have been reviewed.</p>
          )}
        </div>
      )}

      {outcome && <IndicatorSection el={el} />}
      {outcome && <EvidenceSection el={el} />}

      <ConnectionSection el={el} />

      {el.stage !== 'longterm' && (
        <Section title="Where this leads">
          {downstream.length === 0 ? (
            <p className="muted-p warn-text">
              <TriangleAlert size={13} /> Doesn’t reach a long-term outcome yet.
            </p>
          ) : (
            <ul className="reach">
              {downstream.map((l) => (
                <li key={l.id}>
                  <button className="linkish" onClick={() => select({ kind: 'element', id: l.id }, null)}>
                    <i style={{ background: LANE_META[l.lane].color }} />
                    {l.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section title="Comments" count={open.length}>
        {open.length === 0 ? (
          <p className="muted-p">No open comments on this {meta.singular}.</p>
        ) : (
          <ul className="mini-comments">
            {open.map((c) => (
              <li key={c.id}>
                <b>{PEOPLE[c.author].short}:</b> {clip(c.text, 110)}
              </li>
            ))}
          </ul>
        )}
        <button className="btn tiny" onClick={() => setTab('comments')}>
          <MessageSquare size={12} /> Open comments
        </button>
      </Section>
    </div>
  )
}

/* ======================= indicators ======================= */

function IndicatorSection({ el }: { el: El }) {
  const { doc, apply } = useApp()
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', target: '', source: '' })
  const none = el.indicators.length === 0

  const reuse = useMemo(() => {
    const up = reach(doc.edges, el.id, 'up')
    const have = new Set(el.indicators.map((i) => i.name))
    const out: { from: El; name: string; target: string; source: string }[] = []
    for (const e of doc.elements) {
      if (!up.nodes.has(e.id) || !(e.stage === 'outcome')) continue
      for (const i of e.indicators) if (!have.has(i.name)) out.push({ from: e, name: i.name, target: i.target, source: i.source })
    }
    return out.slice(0, 3)
  }, [doc, el])

  const add = (v: { name: string; target: string; source: string }) => {
    apply(`Added an indicator to “${clip(el.text, 36)}”`, (d) => {
      d.elements.find((x) => x.id === el.id)!.indicators.push({ id: uid('ind'), ...v })
    })
  }
  const patch = (id: string, key: 'name' | 'target' | 'source', v: string) =>
    apply(`Edited an indicator on “${clip(el.text, 36)}”`, (d) => {
      const i = d.elements.find((x) => x.id === el.id)!.indicators.find((x) => x.id === id)!
      i[key] = v
    })

  return (
    <Section
      title="Indicators"
      count={el.indicators.length}
      action={
        !adding && (
          <button className="btn tiny" onClick={() => setAdding(true)}>
            <Plus size={12} /> Add
          </button>
        )
      }
    >
      {none && !adding && (
        <div className="callout warn">
          <TriangleAlert size={14} />
          <div>
            <strong>No indicator yet.</strong> Funders read an outcome with no measure as a hope, not a result.
          </div>
        </div>
      )}
      {el.indicators.map((i) => (
        <div className="card indicator" key={i.id}>
          <button className="card-x" aria-label="Remove indicator" title="Remove indicator" onClick={() => apply(`Removed an indicator from “${clip(el.text, 36)}”`, (d) => {
            const t = d.elements.find((x) => x.id === el.id)!
            t.indicators = t.indicators.filter((x) => x.id !== i.id)
          })}>
            <X size={13} />
          </button>
          <CommitText className="text-field plain name" value={i.name} ariaLabel="Indicator" onCommit={(v) => patch(i.id, 'name', v)} multiline />
          <div className="kv">
            <label>Target</label>
            <CommitText className="text-field plain" value={i.target} ariaLabel="Target" onCommit={(v) => patch(i.id, 'target', v)} />
            <label>Source</label>
            <CommitText className="text-field plain" value={i.source} ariaLabel="Data source" onCommit={(v) => patch(i.id, 'source', v)} />
          </div>
        </div>
      ))}
      {adding && (
        <form
          className="card form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!f.name.trim()) return
            add({ name: f.name.trim(), target: f.target.trim() || 'Target to be set', source: f.source.trim() || 'Source to be set' })
            setF({ name: '', target: '', source: '' })
            setAdding(false)
          }}
        >
          <label className="field-label">What will you measure?</label>
          <input autoFocus className="text-field" placeholder="e.g. ISIP percentile change, fall to fall" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="two">
            <div>
              <label className="field-label">Target</label>
              <input className="text-field" placeholder="e.g. +5 points vs. comparison" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Data source</label>
              <input className="text-field" placeholder="e.g. ISIP, APS data match" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={!f.name.trim()}>
              Add indicator
            </button>
          </div>
        </form>
      )}
      {reuse.length > 0 && (
        <div className="reuse">
          <span className="field-label">Reuse from outcomes that feed this one</span>
          {reuse.map((r) => (
            <button key={r.from.id + r.name} className="reuse-chip" onClick={() => add({ name: r.name, target: r.target, source: r.source })}>
              <Plus size={12} />
              <span>
                <b>{r.name}</b>
                <small>from “{clip(r.from.text, 44)}”; edit the target after adding</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </Section>
  )
}

/* ======================= evidence ======================= */

function EvidenceSection({ el }: { el: El }) {
  const { doc, apply } = useApp()
  const [picking, setPicking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ title: '', cite: '', takeaway: '', kind: 'research' as Evidence['kind'] })
  const attached = el.evidenceIds.map((id) => doc.evidence.find((e) => e.id === id)!).filter(Boolean)
  const rest = doc.evidence.filter((e) => !el.evidenceIds.includes(e.id))

  const attach = (id: string) =>
    apply(`Attached evidence to “${clip(el.text, 36)}”`, (d) => void d.elements.find((x) => x.id === el.id)!.evidenceIds.push(id))

  return (
    <Section
      title="Evidence"
      count={attached.length}
      action={
        !picking &&
        !adding && (
          <button className="btn tiny" onClick={() => (rest.length ? setPicking(true) : setAdding(true))}>
            <Plus size={12} /> Attach
          </button>
        )
      }
    >
      {attached.length === 0 && !picking && !adding && <p className="muted-p">No sources attached. Research or your own data both count.</p>}
      {attached.map((ev) => (
        <div className="card evidence" key={ev.id}>
          <button className="card-x" aria-label="Detach evidence" title="Detach" onClick={() => apply(`Detached evidence from “${clip(el.text, 36)}”`, (d) => {
            const t = d.elements.find((x) => x.id === el.id)!
            t.evidenceIds = t.evidenceIds.filter((x) => x !== ev.id)
          })}>
            <X size={13} />
          </button>
          <span className={cx('kind', ev.kind)}>{ev.kind === 'research' ? 'Research' : 'Internal report'}</span>
          <strong>{ev.title}</strong>
          <p>{ev.takeaway}</p>
          <details>
            <summary>Full citation</summary>
            <p className="cite">{ev.cite}</p>
          </details>
        </div>
      ))}
      {picking && (
        <div className="card picker">
          <span className="field-label">Your evidence library</span>
          {rest.map((ev) => (
            <button
              key={ev.id}
              className="pick-row"
              onClick={() => {
                attach(ev.id)
                setPicking(false)
              }}
            >
              <span className={cx('kind', ev.kind)}>{ev.kind === 'research' ? 'Research' : 'Internal'}</span>
              <span>{ev.title}</span>
            </button>
          ))}
          <div className="form-actions">
            <button className="btn" onClick={() => setPicking(false)}>
              Cancel
            </button>
            <button
              className="btn"
              onClick={() => {
                setPicking(false)
                setAdding(true)
              }}
            >
              Add a new source
            </button>
          </div>
        </div>
      )}
      {adding && (
        <form
          className="card form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!f.title.trim()) return
            const id = uid('ev')
            apply(`Added a source: ${clip(f.title, 40)}`, (d) => {
              d.evidence.push({ id, kind: f.kind, title: f.title.trim(), cite: f.cite.trim() || f.title.trim(), takeaway: f.takeaway.trim() || 'No summary yet.' })
              d.elements.find((x) => x.id === el.id)!.evidenceIds.push(id)
            })
            setF({ title: '', cite: '', takeaway: '', kind: 'research' })
            setAdding(false)
          }}
        >
          <div className="seg mini" role="group" aria-label="Source type">
            {(['research', 'internal'] as const).map((k) => (
              <button type="button" key={k} className={cx(f.kind === k && 'on')} onClick={() => setF({ ...f, kind: k })}>
                {k === 'research' ? 'Research study' : 'Internal report'}
              </button>
            ))}
          </div>
          <label className="field-label">Short title</label>
          <input autoFocus className="text-field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Author (year), topic" />
          <label className="field-label">Full citation</label>
          <textarea className="text-field" rows={2} value={f.cite} onChange={(e) => setF({ ...f, cite: e.target.value })} />
          <label className="field-label">What it shows, in one line</label>
          <input className="text-field" value={f.takeaway} onChange={(e) => setF({ ...f, takeaway: e.target.value })} />
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={!f.title.trim()}>
              Add and attach
            </button>
          </div>
        </form>
      )}
    </Section>
  )
}

/* ======================= connections ======================= */

function ConnectionSection({ el }: { el: El }) {
  const { doc, toggleEdge, select } = useApp()
  const si = stageIndex(el.stage)
  const lists: { title: string; dir: 'prev' | 'next'; stage: (typeof STAGES)[number] }[] = []
  if (si > 0) lists.push({ title: `Fed by (${STAGE_META[STAGES[si - 1]].title.toLowerCase()})`, dir: 'prev', stage: STAGES[si - 1] })
  if (si < STAGES.length - 1) lists.push({ title: `Feeds into (${STAGE_META[STAGES[si + 1]].title.toLowerCase()})`, dir: 'next', stage: STAGES[si + 1] })

  return (
    <>
      {lists.map((l) => {
        const linked = (c: El) => doc.edges.find((e) => (l.dir === 'next' ? e.from === el.id && e.to === c.id : e.from === c.id && e.to === el.id))
        // connected ones first, so what this element touches today is at the top
        const cands = LANES.flatMap((lane) => groupOf(doc.elements, l.stage, lane)).sort((a, b) => Number(!!linked(b)) - Number(!!linked(a)))
        const n = cands.filter((c) => linked(c)).length
        return (
          <Section key={l.dir} title={l.title} count={n}>
            <ul className="conn-list">
              {cands.map((c) => {
                const ed = linked(c)
                return (
                  <li key={c.id} className={cx(ed && 'on')}>
                    <label>
                      <input type="checkbox" checked={!!ed} onChange={(e) => (l.dir === 'next' ? toggleEdge(el.id, c.id, e.target.checked) : toggleEdge(c.id, el.id, e.target.checked))} />
                      <i className="lane-dot" style={{ background: LANE_META[c.lane].color }} title={LANE_META[c.lane].name} />
                      <span>{c.text}</span>
                    </label>
                    {ed?.weak && <span className="tag weak">weak</span>}
                    {ed?.inherited && <span className="tag review">review</span>}
                    {ed && (
                      <button className="linkish small" onClick={() => select({ kind: 'edge', id: ed.id }, 'details')}>
                        details
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </Section>
        )
      })}
    </>
  )
}

/* ======================= edge ======================= */

export function EdgeInspector({ edge }: { edge: Edge }) {
  const { doc, apply, select, removeEdge, setTab } = useApp()
  const from = doc.elements.find((e) => e.id === edge.from)!
  const to = doc.elements.find((e) => e.id === edge.to)!
  const [kind, setKind] = useState<'assumption' | 'external'>('assumption')
  const [text, setText] = useState('')
  const [weakNote, setWeakNote] = useState('')
  const [flagging, setFlagging] = useState(false)
  const open = openCommentsOn(doc, 'edge', edge.id)
  const label = (e: El) => `“${clip(e.text, 36)}”`

  return (
    <div className="inspector">
      <div className="insp-head">
        <span className="stage-chip plain">connection</span>
        <span className="spacer" />
        <button className="icon-btn danger" title="Remove connection" aria-label="Remove connection" onClick={() => removeEdge(edge.id)}>
          <Trash2 size={15} />
        </button>
      </div>

      <div className="edge-ends">
        {[from, to].map((e, i) => (
          <button key={e.id} className="end-card" onClick={() => select({ kind: 'element', id: e.id }, 'details')} style={{ ['--lane' as string]: LANE_META[e.lane].color }}>
            <small>{i === 0 ? 'From ' : 'To '} {STAGE_META[e.stage].singular}</small>
            {e.text}
          </button>
        ))}
      </div>

      {edge.inherited && (
        <div className="callout info">
          <strong>Copied when “Family engagement” was split.</strong>
          <p>Does “{clip(from.text, 40)}” really lead to “{clip(to.text, 40)}”?</p>
          <div className="inh-row">
            <button className="btn tiny" onClick={() => apply('Confirmed a link copied from the split', (d) => void (d.edges.find((x) => x.id === edge.id)!.inherited = false))}>
              <Check size={12} /> Keep
            </button>
            <button className="btn tiny danger" onClick={() => removeEdge(edge.id)}>
              Remove
            </button>
          </div>
        </div>
      )}

      <Section title="Strength of evidence">
        {edge.weak ? (
          <div className="callout warn col">
            <div>
              <strong>Flagged weak by {PEOPLE[edge.weak.by as keyof typeof PEOPLE]?.name ?? edge.weak.by}</strong>
              <p>{edge.weak.note}</p>
            </div>
            <button className="btn tiny" onClick={() => apply('Cleared a weak-evidence flag', (d) => void delete d.edges.find((x) => x.id === edge.id)!.weak)}>
              Clear flag
            </button>
          </div>
        ) : flagging ? (
          <form
            className="card form"
            onSubmit={(e) => {
              e.preventDefault()
              apply('Flagged a link as weak evidence', (d) => void (d.edges.find((x) => x.id === edge.id)!.weak = { by: ME, note: weakNote.trim() || 'Evidence for this link is thin.' }))
              setFlagging(false)
              setWeakNote('')
            }}
          >
            <label className="field-label">Why is the evidence thin?</label>
            <textarea autoFocus className="text-field" rows={2} value={weakNote} onChange={(e) => setWeakNote(e.target.value)} />
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setFlagging(false)}>
                Cancel
              </button>
              <button className="btn primary">Flag as weak</button>
            </div>
          </form>
        ) : (
          <>
            <p className="muted-p">Not flagged. Weak links are drawn dashed so reviewers see you know where the evidence is thin.</p>
            <button className="btn tiny" onClick={() => setFlagging(true)}>
              Flag as weak evidence
            </button>
          </>
        )}
      </Section>

      <Section title="Assumptions and external factors" count={edge.notes.length}>
        {edge.notes.length === 0 && <p className="muted-p">None on this link. Add what has to be true, or what you don’t control, for {label(from)} to lead to {label(to)}.</p>}
        {edge.notes.map((n) => (
          <div className={cx('note', n.kind)} key={n.id}>
            <span className="mark-big">{n.kind === 'assumption' ? 'A' : 'E'}</span>
            <div>
              <small>{n.kind === 'assumption' ? 'Assumption' : 'External factor'}</small>
              <CommitText
                className="text-field plain"
                multiline
                value={n.text}
                ariaLabel={n.kind === 'assumption' ? 'Assumption' : 'External factor'}
                onCommit={(v) => apply('Edited a note on a link', (d) => void (d.edges.find((x) => x.id === edge.id)!.notes.find((x) => x.id === n.id)!.text = v))}
              />
            </div>
            <button className="card-x" aria-label="Remove note" title="Remove" onClick={() => apply('Removed a note from a link', (d) => {
              const t = d.edges.find((x) => x.id === edge.id)!
              t.notes = t.notes.filter((x) => x.id !== n.id)
            })}>
              <X size={13} />
            </button>
          </div>
        ))}
        <form
          className="add-note"
          onSubmit={(e) => {
            e.preventDefault()
            const t = text.trim()
            if (!t) return
            apply(`Added ${kind === 'assumption' ? 'an assumption' : 'an external factor'} to a link`, (d) => void d.edges.find((x) => x.id === edge.id)!.notes.push({ id: uid('nt'), kind, text: t }))
            setText('')
          }}
        >
          <div className="seg mini" role="group" aria-label="Note type">
            <button type="button" className={cx(kind === 'assumption' && 'on')} onClick={() => setKind('assumption')}>
              Assumption
            </button>
            <button type="button" className={cx(kind === 'external' && 'on')} onClick={() => setKind('external')}>
              External factor
            </button>
          </div>
          <div className="add-row">
            <input
              className="text-field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={kind === 'assumption' ? 'What has to be true…' : 'What outside your control could change this…'}
            />
            <button className="btn primary" disabled={!text.trim()}>
              Add
            </button>
          </div>
        </form>
      </Section>

      <Section title="Comments" count={open.length}>
        {open.length === 0 ? (
          <p className="muted-p">No open comments on this link.</p>
        ) : (
          <ul className="mini-comments">
            {open.map((c) => (
              <li key={c.id}>
                <b>{PEOPLE[c.author].short}:</b> {clip(c.text, 120)}
              </li>
            ))}
          </ul>
        )}
        <button className="btn tiny" onClick={() => setTab('comments')}>
          <MessageSquare size={12} /> Open comments
        </button>
      </Section>
    </div>
  )
}

export function EmptyDetails({ doc }: { doc: Doc }) {
  return (
    <div className="inspector empty">
      <div className="empty-art">
        <BookOpen size={20} />
      </div>
      <h3>Select something to edit it</h3>
      <ul>
        <li>Click an element to reword it, attach indicators and evidence, or change what it connects to.</li>
        <li>Drag an element up or down to reorder it, or into another program’s row.</li>
        <li>Drag from the dot on an element’s edge to the next column to connect them.</li>
        <li>Click a line to add an assumption or flag weak evidence.</li>
      </ul>
      <p className="muted-p">
        <Target size={12} /> {doc.elements.length} elements, {doc.edges.length} connections.
      </p>
    </div>
  )
}
