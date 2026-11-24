import { useState } from 'react'
import type { Doc, Selection } from './types'
import { IDown, IPlus, IClose, ITrash, IUp, ITarget, IAlert } from './icons'
import * as op from './ops'
import { TOOL_SUGGESTIONS } from './data'
import { fmtTorque, uid } from './util'

interface Props {
  doc: Doc
  sel: Selection
  setSel: (s: Selection) => void
  edit: (fn: (d: Doc) => Doc, key?: string) => void
  locked: boolean
  placing: string | null
  setPlacing: (id: string | null) => void
  toast: (msg: string) => void
  focusStep: (id: string) => void
  onAddPhoto: () => void
}

function Btn({
  children, onClick, disabled, danger, on, wide,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean; on?: boolean; wide?: boolean }) {
  return (
    <button className={`ibtn${danger ? ' danger' : ''}${on ? ' on' : ''}${wide ? ' wide' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function StepChips({
  doc, value, onPick, allowNone, noneLabel,
}: { doc: Doc; value: string | null; onPick: (id: string | null) => void; allowNone?: boolean; noneLabel?: string }) {
  return (
    <div className="chips" role="group">
      {allowNone && (
        <button className={`chip${value === null ? ' on' : ''}`} onClick={() => onPick(null)}>
          {noneLabel ?? 'None'}
        </button>
      )}
      {doc.steps.map((s, i) => (
        <button key={s.id} className={`chip num${value === s.id ? ' on' : ''}`} onClick={() => onPick(s.id)} aria-label={`Step ${i + 1}`}>
          {i + 1}
        </button>
      ))}
    </div>
  )
}

export function Inspector(p: Props) {
  const { doc, sel, edit, locked } = p
  const [toolDraft, setToolDraft] = useState('')

  let title = 'Nothing selected'
  let sub: React.ReactNode = 'Tap a step, photo, mark or note on the sheet. Tap text to change it.'
  let body: React.ReactNode = null

  if (locked) {
    title = 'Sheet is locked'
    sub = `It has gone to ${doc.reviewer.name} for sign-off. Recall it to make changes.`
  } else if (sel.kind === 'step') {
    const i = doc.steps.findIndex((s) => s.id === sel.id)
    if (i >= 0) {
      title = `Step ${i + 1}`
      sub = 'Drag the grip on the sheet, or use the buttons.'
      body = (
        <div className="igrid">
          <Btn disabled={i === 0} onClick={() => edit(op.moveStep(sel.id, i - 1))}>
            <IUp size={20} /> Move up
          </Btn>
          <Btn disabled={i === doc.steps.length - 1} onClick={() => edit(op.moveStep(sel.id, i + 1))}>
            <IDown size={20} /> Move down
          </Btn>
          <Btn
            onClick={() => {
              const id = uid('s')
              edit(op.addStepAfter(sel.id, id))
              p.setSel({ kind: 'step', id })
              p.focusStep(id)
            }}
          >
            <IPlus size={20} /> Insert below
          </Btn>
          <Btn
            danger
            disabled={doc.steps.length <= 1}
            onClick={() => {
              edit(op.deleteStep(sel.id))
              p.setSel({ kind: 'none' })
              p.toast(`Step ${i + 1} deleted`)
            }}
          >
            <ITrash size={20} /> Delete step
          </Btn>
        </div>
      )
    }
  } else if (sel.kind === 'photo') {
    const ph = doc.photos.find((x) => x.id === sel.id)
    if (ph) {
      const i = doc.photos.indexOf(ph)
      title = `Photo ${ph.file}`
      sub = `Taken on the tablet at ${ph.takenAt}.`
      body = (
        <div className="igrid">
          <Btn on={p.placing === ph.id} onClick={() => p.setPlacing(p.placing === ph.id ? null : ph.id)}>
            <ITarget size={20} /> {p.placing === ph.id ? 'Cancel marking' : 'Mark something'}
          </Btn>
          <Btn disabled={doc.photos.length < 2} onClick={() => edit(op.movePhoto(ph.id, i === 0 ? 1 : -1))}>
            {i === 0 ? <IDown size={20} /> : <IUp size={20} />} {i === 0 ? 'Move lower' : 'Move higher'}
          </Btn>
          <Btn
            danger
            wide
            onClick={() => {
              const n = doc.callouts.filter((c) => c.photoId === ph.id).length
              edit(op.deletePhoto(ph.id))
              p.setSel({ kind: 'none' })
              p.toast(`${ph.file} removed${n ? ` with ${n} mark${n > 1 ? 's' : ''}` : ''}`)
            }}
          >
            <ITrash size={20} /> Remove photo
          </Btn>
        </div>
      )
    }
  } else if (sel.kind === 'callout') {
    const c = doc.callouts.find((x) => x.id === sel.id)
    if (c) {
      const ph = doc.photos.find((x) => x.id === c.photoId)
      title = `Mark ${op.calloutNumbers(doc)[c.id]} on ${ph?.file ?? 'photo'}`
      sub = null
      const side = c.side ?? (c.x > 55 ? 'l' : 'r')
      body = (
        <div className="stack tight">
          <div className="addrow">
            <input
              className="iinput"
              aria-label="Mark label"
              value={c.label}
              onChange={(e) => edit(op.patchCallout(c.id, { label: e.target.value }), `clabel:${c.id}`)}
              spellCheck={false}
            />
            <button
              className="ibtn danger sq"
              aria-label="Delete mark"
              onClick={() => {
                edit(op.deleteCallout(c.id))
                p.setSel({ kind: 'photo', id: c.photoId })
                p.toast('Mark deleted')
              }}
            >
              <ITrash size={20} />
            </button>
          </div>
          <div className="inline-row">
            <span className="ilabel">Step</span>
            <StepChips doc={doc} value={c.stepId} allowNone noneLabel="–" onPick={(id) => edit(op.patchCallout(c.id, { stepId: id }))} />
          </div>
          <div className="inline-row">
            <span className="ilabel">Label</span>
            <div className="chips" role="group" aria-label="Where the label sits">
              {([['l', '←', 'left'], ['t', '↑', 'above'], ['b', '↓', 'below'], ['r', '→', 'right']] as const).map(([k, glyph, name]) => (
                <button
                  key={k}
                  className={`chip num${side === k ? ' on' : ''}`}
                  aria-label={`Label ${name}`}
                  onClick={() => edit(op.patchCallout(c.id, { side: k }))}
                >
                  {glyph}
                </button>
              ))}
            </div>
          </div>
          <div className="insp-sub tiny">Drag the ring on the photo to move it.</div>
        </div>
      )
    }
  } else if (sel.kind === 'note') {
    title = 'Common-mistake note'
    sub = doc.note.stepId ? `Sits beside step ${op.stepNo(doc, doc.note.stepId)}.` : 'At the foot of the sheet. Drag it, or pick the step it belongs to.'
    body = (
      <div className="stack">
        <div className="ilabel">Put it beside step</div>
        <StepChips doc={doc} value={doc.note.stepId} allowNone noneLabel="Foot" onPick={(id) => edit(op.attachNote(id))} />
      </div>
    )
  } else if (sel.kind === 'loto') {
    title = 'Lockout / tagout warning'
    sub = 'Stays above step 1 on every sheet. Edit the wording on the sheet.'
  } else if (sel.kind === 'tools') {
    title = 'Required tools'
    const hasTorqueTool = doc.tools.some((t) => /torque/i.test(t))
    sub = null
    body = (
      <div className="stack tight">
        <div className="chips">
          {doc.tools.map((t) => (
            <button key={t} className="chip tool" onClick={() => edit(op.removeTool(t))} aria-label={`Remove ${t}`}>
              {t} <IClose size={16} />
            </button>
          ))}
        </div>
        <form
          className="addrow"
          onSubmit={(e) => {
            e.preventDefault()
            const t = toolDraft.trim()
            if (t) edit(op.addTool(t))
            setToolDraft('')
          }}
        >
          <input className="iinput" placeholder="Add a tool" list="tool-suggestions" value={toolDraft} onChange={(e) => setToolDraft(e.target.value)} />
          <datalist id="tool-suggestions">
            {TOOL_SUGGESTIONS.filter((t) => !doc.tools.includes(t)).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <button className="ibtn" type="submit" disabled={!toolDraft.trim()}>
            <IPlus size={20} /> Add
          </button>
        </form>
        {!hasTorqueTool && (
          <div className="hint warn">
            <IAlert size={18} />
            <span>
              {fmtTorque(doc.torque)} N·m is given but no torque wrench is listed.{' '}
              <button className="inline-act" onClick={() => edit(op.addTool(TOOL_SUGGESTIONS[0]))}>
                Add {TOOL_SUGGESTIONS[0]}
              </button>
            </span>
          </div>
        )}
      </div>
    )
  } else if (sel.kind === 'torque') {
    title = 'Torque value'
    sub = 'Printed in the box on the sheet. Steps in 0.5 N·m.'
    const mismatch = doc.steps
      .map((s, i) => ({ i, m: s.text.match(/(\d+(?:[.,]\d+)?)\s*N[·.\s]?m/i) }))
      .filter((x) => x.m && parseFloat(x.m[1].replace(',', '.')) !== doc.torque)
    body = (
      <div className="stack">
        <div className="stepper">
          <button className="ibtn big" aria-label="Decrease torque" onClick={() => edit(op.setTorque(doc.torque - 0.5), 'torque')}>
            −
          </button>
          <div className="stepper-val">
            {fmtTorque(doc.torque)} <span>N·m</span>
          </div>
          <button className="ibtn big" aria-label="Increase torque" onClick={() => edit(op.setTorque(doc.torque + 0.5), 'torque')}>
            +
          </button>
        </div>
        {mismatch.map((x) => (
          <div key={x.i} className="hint warn">
            <IAlert size={18} /> Step {x.i + 1} says {x.m![0]}.
          </div>
        ))}
      </div>
    )
  }

  if (!locked && sel.kind === 'none') {
    body = (
      <div className="igrid">
        <Btn
          onClick={() => {
            const id = uid('s')
            edit(op.addStepAfter(null, id))
            p.setSel({ kind: 'step', id })
            p.focusStep(id)
          }}
        >
          <IPlus size={20} /> Add a step
        </Btn>
        <Btn disabled={doc.photos.length >= 3} onClick={p.onAddPhoto}>
          <IPlus size={20} /> Add a photo
        </Btn>
      </div>
    )
  }

  return (
    <section className="inspector" aria-live="polite">
      <div className="insp-head">
        <span className="insp-kicker">{sel.kind === 'none' || locked ? 'Selection' : 'Selected'}</span>
        <h2>{title}</h2>
      </div>
      {sub && <p className="insp-sub">{sub}</p>}
      {body}
    </section>
  )
}
