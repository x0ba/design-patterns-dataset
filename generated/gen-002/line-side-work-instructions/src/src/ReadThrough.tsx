import { useEffect, useMemo, useState } from 'react'
import type { Comment, Doc } from './types'
import { ROSTER } from './data'
import * as op from './ops'
import { PhotoFrame } from './photos'
import { Roster } from './Roster'
import { IArrowL, IArrowR, IClose, IFlag, IPen, PadlockMark } from './icons'
import { fmtTorque, nowLabel, uid } from './util'

type Item = { kind: 'intro' } | { kind: 'loto' } | { kind: 'step'; id: string } | { kind: 'tools' } | { kind: 'agree' }

interface Props {
  doc: Doc
  agreed: string[]
  toggleAgree: (id: string) => void
  editComments: (fn: (c: Comment[]) => Comment[]) => void
  speaker: string
  setSpeaker: (n: string) => void
  onClose: () => void
  onFix: (stepId: string) => void
  toast: (m: string) => void
  startAt?: number
}

export function ReadThrough(p: Props) {
  const { doc } = p
  const items: Item[] = useMemo(
    () => [
      { kind: 'intro' },
      { kind: 'loto' },
      ...doc.steps.map((s) => ({ kind: 'step', id: s.id }) as Item),
      { kind: 'tools' },
      { kind: 'agree' },
    ],
    [doc.steps],
  )
  const [i, setI] = useState(p.startAt ?? 0)
  const [flagging, setFlagging] = useState(false)
  const [text, setText] = useState('')
  const numbers = useMemo(() => op.calloutNumbers(doc), [doc])
  const item = items[Math.min(i, items.length - 1)]

  const go = (n: number) => {
    setI(Math.max(0, Math.min(items.length - 1, n)))
    setFlagging(false)
    setText('')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select')) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur()
        return
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        setI((x) => Math.min(items.length - 1, x + 1))
      } else if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
      else if (e.key === 'Escape') p.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items.length, p])

  const stepIndex = item.kind === 'step' ? doc.steps.findIndex((s) => s.id === item.id) : -1
  const label =
    item.kind === 'intro' ? 'Title' : item.kind === 'loto' ? 'Safety first' : item.kind === 'step' ? `Step ${stepIndex + 1} of ${doc.steps.length}` : item.kind === 'tools' ? 'Tools and torque' : 'Agreement'

  const flag = () => {
    const t = text.trim()
    if (!t) return
    p.editComments((cs) => [
      ...cs,
      {
        id: uid('cm'),
        author: p.speaker,
        time: nowLabel(),
        text: t,
        target: item.kind === 'step' ? { kind: 'step', id: item.id } : { kind: 'sheet' },
        resolved: false,
      },
    ])
    p.toast('Added to comments')
    setText('')
    setFlagging(false)
  }

  const step = item.kind === 'step' ? doc.steps[stepIndex] : null
  const photos = step ? doc.photos.filter((ph) => doc.callouts.some((c) => c.photoId === ph.id && c.stepId === step.id)) : []

  return (
    <div className="rt" role="dialog" aria-label="Read-through">
      <header className="rt-top">
        <div>
          <span className="rt-kicker">Reading through together</span>
          <span className="rt-doc mono">{doc.id}</span>
        </div>
        <div className="rt-label">{label}</div>
        <button className="ibtn" onClick={p.onClose}>
          <IClose size={22} /> Back to the sheet
        </button>
      </header>

      <main className={`rt-main kind-${item.kind}${photos.length ? ' with-photos' : ''}`}>
        {item.kind === 'intro' && (
          <div className="rt-intro">
            <span className={`rt-cat cat-${doc.category.split(' ')[0].toLowerCase()}`}>{doc.category}</span>
            <h1>{doc.title}</h1>
            <p>
              {doc.line} · {doc.machine}
            </p>
            <p className="rt-small">
              Written by {doc.author} · {doc.date}
            </p>
          </div>
        )}

        {item.kind === 'loto' && (
          <div className="rt-loto">
            <div className="rt-loto-icon">
              <PadlockMark size={120} />
            </div>
            <div>
              <h2>Lock out / tag out before step 1</h2>
              <p>{doc.loto}</p>
            </div>
          </div>
        )}

        {step && (
          <>
            <div className="rt-step">
              <div className="rt-num">{stepIndex + 1}</div>
              <div className="rt-steptext">
                <p>{step.text || <em>This step is empty.</em>}</p>
                {doc.note.stepId === step.id && (
                  <div className="rt-note">
                    <b>✕ Common mistake</b>
                    {doc.note.text}
                  </div>
                )}
              </div>
            </div>
            {photos.length > 0 && (
              <div className="rt-photos">
                {photos.map((ph) => (
                  <figure key={ph.id}>
                    <PhotoFrame
                      photo={ph}
                      large
                      readOnly
                      numbers={numbers}
                      highlightStepId={step.id}
                      callouts={doc.callouts.filter((c) => c.photoId === ph.id)}
                    />
                    <figcaption>{ph.caption}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </>
        )}

        {item.kind === 'tools' && (
          <div className="rt-tools">
            <section>
              <h2>Required tools</h2>
              <ul>
                {doc.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2>Torque</h2>
              <div className="rt-torque">
                {fmtTorque(doc.torque)} <span>N·m</span>
              </div>
            </section>
            {doc.note.stepId === null && (
              <section className="wide">
                <div className="rt-note">
                  <b>✕ Common mistake</b>
                  {doc.note.text}
                </div>
              </section>
            )}
          </div>
        )}

        {item.kind === 'agree' && (
          <div className="rt-agree">
            <h2>Does it read correctly to everyone?</h2>
            <p>Each person taps their name when they agree.</p>
            <Roster big agreed={p.agreed} onToggle={p.toggleAgree} />
            <div className={`rt-count${p.agreed.length === ROSTER.length ? ' all' : ''}`}>
              {p.agreed.length === ROSTER.length ? 'Everyone agrees' : `${p.agreed.length} of ${ROSTER.length} agree`}
            </div>
          </div>
        )}
      </main>

      {flagging && (
        <form
          className="rt-flag"
          onSubmit={(e) => {
            e.preventDefault()
            flag()
          }}
        >
          <label>
            <span>Who is speaking</span>
            <select value={p.speaker} onChange={(e) => p.setSpeaker(e.target.value)}>
              {ROSTER.map((r) => (
                <option key={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={`What is wrong with ${label.toLowerCase()}?`} />
          <button className="ibtn primary" type="submit" disabled={!text.trim()}>
            Add to comments
          </button>
          <button type="button" className="ibtn" onClick={() => setFlagging(false)}>
            Cancel
          </button>
        </form>
      )}

      <footer className="rt-bar">
        <button className="rt-nav" disabled={i === 0} onClick={() => go(i - 1)}>
          <IArrowL size={28} /> Back
        </button>
        <div className="rt-dots" role="tablist" aria-label="Sections">
          {items.map((it, n) => (
            <button
              key={n}
              className={`rt-dot${n === i ? ' on' : ''}${n < i ? ' past' : ''}`}
              onClick={() => go(n)}
              aria-label={it.kind === 'step' ? `Step ${doc.steps.findIndex((s) => s.id === it.id) + 1}` : it.kind}
              aria-selected={n === i}
            />
          ))}
        </div>
        {item.kind !== 'agree' && (
          <>
            <button className="ibtn" onClick={() => setFlagging(true)}>
              <IFlag size={22} /> Something's wrong
            </button>
            {step && (
              <button className="ibtn" onClick={() => p.onFix(step.id)}>
                <IPen size={22} /> Fix it now
              </button>
            )}
          </>
        )}
        {item.kind === 'agree' ? (
          <button className="rt-nav primary" onClick={p.onClose}>
            Done
          </button>
        ) : (
          <button className="rt-nav primary" onClick={() => go(i + 1)}>
            {i === items.length - 2 ? 'Agreement' : 'Next'} <IArrowR size={28} />
          </button>
        )}
      </footer>
    </div>
  )
}
