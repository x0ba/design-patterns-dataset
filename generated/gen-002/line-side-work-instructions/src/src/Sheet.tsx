import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Category, Comment, Doc, Selection } from './types'
import { IChat, IGrip, IPlus, PadlockMark } from './icons'
import { PhotoFrame } from './photos'
import * as op from './ops'
import { findLibrary } from './data'
import { fmtTorque } from './util'

const CATS: Category[] = ['Basic Knowledge', 'Improvement', 'Problem Case']

/* ---------- text inputs that look like printed text ---------- */

interface TextProps {
  value: string
  onChange: (v: string) => void
  className?: string
  readOnly?: boolean
  placeholder?: string
  label: string
  onFocus?: () => void
  dataStep?: string
}

function AutoText({ value, onChange, className, readOnly, placeholder, label, onFocus, dataStep }: TextProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fit = () => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }
  useLayoutEffect(fit, [value])
  useEffect(() => {
    document.fonts?.ready.then(fit)
  }, [])
  return (
    <textarea
      ref={ref}
      rows={1}
      className={`txt ${className ?? ''}`}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-label={label}
      data-step-text={dataStep}
      spellCheck={false}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          ;(e.target as HTMLTextAreaElement).blur()
        }
      }}
    />
  )
}

function Field({
  label, value, onChange, readOnly, onFocus, width, mono,
}: {
  label: string; value: string; onChange: (v: string) => void; readOnly?: boolean; onFocus?: () => void; width?: number; mono?: boolean
}) {
  return (
    <label className="meta-field" style={width ? { flex: `0 0 ${width}px` } : undefined}>
      <span className="meta-label">{label}</span>
      <input
        className={`meta-input${mono ? ' mono' : ''}`}
        value={value}
        readOnly={readOnly}
        spellCheck={false}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

/* ---------- the sheet ---------- */

export interface SheetProps {
  doc: Doc
  comments: Comment[]
  sel: Selection
  setSel: (s: Selection) => void
  edit: (fn: (d: Doc) => Doc, key?: string) => void
  locked: boolean
  scale: number
  placing: string | null
  setPlacing: (id: string | null) => void
  onFit: (overPx: number) => void
  onOpenComments: () => void
  onAddPhoto: () => void
  focusReq: { id: string; n: number } | null
  highlight?: string | null
}

type Drag =
  | { kind: 'step'; id: string; startY: number; dy: number; insertAt: number }
  | { kind: 'note'; startY: number; dy: number; target: string | null }

export function Sheet(p: SheetProps) {
  const { doc, sel, setSel, edit, locked } = p
  const numbers = useMemo(() => op.calloutNumbers(doc), [doc])
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  dragRef.current = drag

  const blank = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget) {
      setSel({ kind: 'none' })
      p.setPlacing(null)
    }
  }

  /* how far the content spills past the page */
  useLayoutEffect(() => {
    const l = leftRef.current
    const r = rightRef.current
    if (!l || !r) return
    const over = Math.max(l.scrollHeight - l.clientHeight, r.scrollHeight - r.clientHeight, 0)
    p.onFit(over > 1 ? over : 0)
  })

  /* "Fix now" from the read-through puts the caret in the step text */
  useEffect(() => {
    if (!p.focusReq) return
    const el = document.querySelector<HTMLTextAreaElement>(`[data-step-text="${p.focusReq.id}"]`)
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [p.focusReq])

  /* ---- drag: reorder steps, or drop the note beside a step ---- */
  const startDrag = (e: React.PointerEvent, kind: 'step' | 'note', id?: string) => {
    if (locked) return
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (kind === 'step' && id) {
      setSel({ kind: 'step', id })
      setDrag({ kind: 'step', id, startY: e.clientY, dy: 0, insertAt: doc.steps.findIndex((s) => s.id === id) })
    } else {
      setSel({ kind: 'note' })
      setDrag({ kind: 'note', startY: e.clientY, dy: 0, target: doc.note.stepId })
    }
  }

  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const y = e.clientY
    if (d.kind === 'step') {
      const others = doc.steps.filter((s) => s.id !== d.id)
      let at = 0
      others.forEach((s) => {
        const r = rows.current.get(s.id)?.getBoundingClientRect()
        if (r && r.top + r.height / 2 < y) at++
      })
      setDrag({ ...d, dy: y - d.startY, insertAt: at })
    } else {
      let best: string | null = null
      let bestDist = Infinity
      doc.steps.forEach((s) => {
        const r = rows.current.get(s.id)?.getBoundingClientRect()
        if (!r) return
        const dist = Math.abs(r.top + r.height / 2 - y)
        if (dist < bestDist) {
          bestDist = dist
          best = s.id
        }
      })
      setDrag({ ...d, dy: y - d.startY, target: best })
    }
  }

  const endDrag = () => {
    const d = dragRef.current
    if (!d) return
    if (d.kind === 'step') edit(op.moveStep(d.id, d.insertAt))
    else if (d.target) edit(op.attachNote(d.target))
    setDrag(null)
  }

  /* where the drop line goes while a step is being dragged */
  let dropLineTop: number | null = null
  if (drag?.kind === 'step' && listRef.current) {
    const box = listRef.current.getBoundingClientRect()
    const others = doc.steps.filter((s) => s.id !== drag.id)
    const ref = drag.insertAt === 0 ? others[0] : others[drag.insertAt - 1]
    const r = ref && rows.current.get(ref.id)?.getBoundingClientRect()
    if (r) dropLineTop = ((drag.insertAt === 0 ? r.top : r.bottom) - box.top) / p.scale
  }

  const openOn = (stepId: string) => p.comments.filter((c) => !c.resolved && c.target.kind === 'step' && c.target.id === stepId).length

  const noteBlock = (attached: boolean) => (
    <div
      className={`note ${attached ? 'attached' : 'loose'}${sel.kind === 'note' ? ' sel' : ''}${drag?.kind === 'note' ? ' dragging' : ''}`}
      style={drag?.kind === 'note' ? { transform: `translateY(${drag.dy / p.scale}px)` } : undefined}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('textarea')) return
        setSel({ kind: 'note' })
      }}
    >
      {!locked && (
        <button
          className="grip chrome"
          aria-label="Drag the common-mistake note next to a step"
          onPointerDown={(e) => startDrag(e, 'note')}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={() => setDrag(null)}
        >
          <IGrip size={20} />
        </button>
      )}
      <div className="note-body">
        <div className="note-flag">
          <span className="note-x" aria-hidden="true">✕</span> Common mistake
          {!attached && <span className="loose-hint chrome">Not beside a step yet – drag it next to its step</span>}
        </div>
        <AutoText
          value={doc.note.text}
          label="Common mistake"
          readOnly={locked}
          className="note-text"
          onFocus={() => setSel({ kind: 'note' })}
          onChange={(v) => edit(op.setNoteText(v), 'note')}
        />
      </div>
    </div>
  )

  const related = doc.related.map((id) => findLibrary(id)).filter(Boolean)

  return (
    <div className={`page${p.placing ? ' is-placing' : ''}`} onPointerDown={blank}>
      {/* ---- header ---- */}
      <header className="pg-head" onPointerDown={blank}>
        <div className="pg-head-main" onPointerDown={blank}>
          <div className="pg-kicker">
            One-point lesson <span className="dot">·</span> <span className="mono">{doc.id}</span>
          </div>
          <AutoText
            value={doc.title}
            label="Lesson title"
            className="pg-title"
            readOnly={locked}
            placeholder="Lesson title"
            onChange={(v) => edit(op.setField('title', v), 'title')}
          />
        </div>
        <div className="pg-cats" role="radiogroup" aria-label="Category">
          {CATS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={doc.category === c}
              className={`cat cat-${c.split(' ')[0].toLowerCase()}${doc.category === c ? ' on' : ''}`}
              disabled={locked}
              onClick={() => edit(op.setField('category', c))}
            >
              <span className="cat-box">{doc.category === c ? '✓' : ''}</span>
              {c}
            </button>
          ))}
        </div>
      </header>

      <div className="pg-meta" onPointerDown={blank}>
        <Field label="Line" value={doc.line} readOnly={locked} width={110} onChange={(v) => edit(op.setField('line', v), 'line')} />
        <Field label="Machine" value={doc.machine} readOnly={locked} onChange={(v) => edit(op.setField('machine', v), 'machine')} />
        <Field label="Author" value={doc.author} readOnly={locked} width={190} onChange={(v) => edit(op.setField('author', v), 'author')} />
        <Field label="Date" value={doc.date} readOnly={locked} width={130} mono onChange={(v) => edit(op.setField('date', v), 'date')} />
      </div>

      {/* ---- body ---- */}
      <div className="pg-body" onPointerDown={blank}>
        <div className="pg-left" ref={leftRef} onPointerDown={blank}>
          <section
            className={`loto${sel.kind === 'loto' ? ' sel' : ''}`}
            onPointerDown={(e) => {
              if (!(e.target as HTMLElement).closest('textarea')) setSel({ kind: 'loto' })
            }}
          >
            <div className="loto-icon">
              <PadlockMark size={38} />
            </div>
            <div className="loto-body">
              <div className="loto-head">Lock out / tag out before step 1</div>
              <AutoText
                value={doc.loto}
                label="Lockout tagout warning"
                className="loto-text"
                readOnly={locked}
                onFocus={() => setSel({ kind: 'loto' })}
                onChange={(v) => edit(op.setField('loto', v), 'loto')}
              />
            </div>
          </section>

          <ol className="steps" ref={listRef} onPointerDown={blank}>
            {doc.steps.map((s, i) => {
              const dragging = drag?.kind === 'step' && drag.id === s.id
              const isSel = sel.kind === 'step' && sel.id === s.id
              const open = openOn(s.id)
              const marks = doc.callouts.filter((c) => c.stepId === s.id)
              const emphasised = p.highlight === s.id
              return (
                <li
                  key={s.id}
                  ref={(el) => {
                    if (el) rows.current.set(s.id, el)
                    else rows.current.delete(s.id)
                  }}
                  className={`step${open > 0 ? ' has-comment' : ''}${isSel ? ' sel' : ''}${dragging ? ' dragging' : ''}${drag?.kind === 'note' && drag.target === s.id ? ' drop-target' : ''}${emphasised ? ' pulse' : ''}`}
                  style={dragging ? { transform: `translateY(${drag.dy / p.scale}px)` } : undefined}
                  onPointerDown={(e) => {
                    if (!(e.target as HTMLElement).closest('textarea,button')) setSel({ kind: 'step', id: s.id })
                  }}
                >
                  <div className="step-row">
                    {!locked && (
                      <button
                        className="grip chrome"
                        aria-label={`Drag step ${i + 1} to reorder`}
                        onPointerDown={(e) => startDrag(e, 'step', s.id)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={() => setDrag(null)}
                      >
                        <IGrip size={20} />
                      </button>
                    )}
                    <span className="num">{i + 1}</span>
                    <AutoText
                      value={s.text}
                      label={`Step ${i + 1}`}
                      className="step-text"
                      dataStep={s.id}
                      readOnly={locked}
                      placeholder="Write the step as a short instruction"
                      onFocus={() => setSel({ kind: 'step', id: s.id })}
                      onChange={(v) => edit(op.editStep(s.id, v), `step:${s.id}`)}
                    />
                    <span className="step-tags">
                      {open > 0 && (
                        <button className="cmark chrome" onClick={p.onOpenComments} aria-label={`${open} open comment on step ${i + 1}`}>
                          <IChat size={14} />
                          {open}
                        </button>
                      )}
                      {marks.map((c) => (
                        <span key={c.id} className="stepref" title={`Photo mark ${numbers[c.id]}: ${c.label}`}>
                          {numbers[c.id]}
                        </span>
                      ))}
                    </span>
                  </div>
                  {doc.note.stepId === s.id && noteBlock(true)}
                </li>
              )
            })}
            {dropLineTop !== null && <div className="dropline" style={{ top: dropLineTop }} />}
          </ol>

          {doc.note.stepId === null && noteBlock(false)}
        </div>

        <div className="pg-right" ref={rightRef} onPointerDown={blank}>
          {doc.photos.map((ph) => (
            <figure key={ph.id} className={`phwrap${sel.kind === 'photo' && sel.id === ph.id ? ' sel' : ''}`}>
              <PhotoFrame
                photo={ph}
                callouts={doc.callouts.filter((c) => c.photoId === ph.id)}
                numbers={numbers}
                selectedId={sel.kind === 'callout' ? sel.id : null}
                placing={p.placing === ph.id}
                readOnly={locked}
                highlightStepId={p.highlight ?? undefined}
                onSelectPhoto={() => {
                  setSel({ kind: 'photo', id: ph.id })
                }}
                onSelectCallout={(id) => setSel({ kind: 'callout', id })}
                onMoveCallout={(id, x, y) => edit(op.moveCallout(id, x, y), `callout:${id}`)}
                onPlace={(x, y) => {
                  const id = `k${Date.now() % 100000}`
                  edit(op.addCallout({ id, photoId: ph.id, x, y, label: 'New mark', stepId: null }))
                  p.setPlacing(null)
                  setSel({ kind: 'callout', id })
                }}
              />
              <figcaption>
                <AutoText
                  value={ph.caption}
                  label={`Caption for ${ph.file}`}
                  className="cap-text"
                  readOnly={locked}
                  placeholder="Caption"
                  onFocus={() => setSel({ kind: 'photo', id: ph.id })}
                  onChange={(v) => edit(op.setCaption(ph.id, v), `cap:${ph.id}`)}
                />
              </figcaption>
            </figure>
          ))}
          {!locked && doc.photos.length < 3 && (
            <button className="add-photo chrome" onClick={p.onAddPhoto}>
              <IPlus size={20} /> Add photo from this device
            </button>
          )}
        </div>
      </div>

      {/* ---- footer ---- */}
      <footer className="pg-foot" onPointerDown={blank}>
        <div
          className={`foot-block tools${sel.kind === 'tools' ? ' sel' : ''}`}
          onPointerDown={() => setSel({ kind: 'tools' })}
        >
          <div className="foot-label">Required tools</div>
          <ul>
            {doc.tools.length === 0 && <li className="empty">None listed</li>}
            {doc.tools.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div
          className={`foot-block torque${sel.kind === 'torque' ? ' sel' : ''}`}
          onPointerDown={() => setSel({ kind: 'torque' })}
        >
          <div className="foot-label">Torque</div>
          <div className="torque-val">
            {fmtTorque(doc.torque)} <span>N·m</span>
          </div>
        </div>
        <div className="foot-block see">
          <div className="foot-label">See also</div>
          {related.length === 0 && <div className="empty">–</div>}
          {related.slice(0, 2).map((r) => (
            <div key={r!.id} className="see-row">
              <span className="mono">{r!.id}</span> {r!.title.replace(/^.*? – /, '')}
            </div>
          ))}
          {related.length > 2 && <div className="see-row">+{related.length - 2} more</div>}
        </div>
        <div className="foot-block sign">
          <div className="foot-label">Sign-off</div>
          <div className="sign-row">
            <span>
              {doc.reviewer.role} <b>{doc.reviewer.name}</b>
            </span>
            <span className={`sign-state${locked ? ' sent' : ''}`}>{locked ? 'Sent' : 'Pending'}</span>
          </div>
          <div className="sign-line">Signature / date</div>
        </div>
      </footer>
    </div>
  )
}
