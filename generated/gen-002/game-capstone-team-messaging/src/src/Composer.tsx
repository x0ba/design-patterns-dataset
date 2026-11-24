import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FILES, JONAH_STARTERS, SLOT_BY_ID } from './data'
import type { Thread } from './data/types'
import { IconCalendar, IconCheck, IconClose, IconFile, IconPaperclip, IconQuote, IconSend } from './icons'
import type { Action, State } from './state'
import { slotLabel } from './time'

const PLACEHOLDER: Record<string, string> = {
  team: 'Message Team Tether',
  dana: 'Reply to Dana. Thank her, pick a time, ask one question.',
  staff: 'Reply to Prof. Halvorsen and Mateo',
  jonah: 'Message Jonah privately',
}

export function Composer({ thread, state, dispatch }: { thread: Thread; state: State; dispatch: (a: Action) => void }) {
  const id = thread.id
  const draft = state.drafts[id] ?? ''
  const pending = state.pending[id] ?? { files: [] }
  const ta = useRef<HTMLTextAreaElement>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const attachRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 230) + 'px'
  }, [draft, id])

  useEffect(() => {
    setAttachOpen(false)
  }, [id])

  useEffect(() => {
    if (!attachOpen) return
    const close = (e: MouseEvent) => {
      if (!attachRef.current?.contains(e.target as Node)) setAttachOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAttachOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [attachOpen])

  const canSend = draft.trim().length > 0 || !!pending.slot || pending.files.length > 0
  const send = () => {
    if (!canSend) return
    setAttachOpen(false)
    dispatch({ type: 'send', id })
  }

  const slot = pending.slot ? SLOT_BY_ID[pending.slot] : undefined
  const questions = (draft.match(/\?/g) ?? []).length
  const mentorChecks = [
    { label: 'Thank Dana', ok: /thank/i.test(draft) },
    { label: 'Call time', ok: !!slot || /\b(tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday)\b/i.test(draft) },
    { label: questions > 1 ? `One question (you have ${questions})` : 'One question', ok: questions === 1, warn: questions > 1 },
  ]

  const insert = (text: string) => {
    dispatch({ type: 'draft', id, text: draft ? draft.replace(/\s*$/, ' ') + text : text })
    requestAnimationFrame(() => {
      const el = ta.current
      if (el) {
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
      }
    })
  }

  return (
    <footer className="composer-wrap">
      {id === 'jonah' && !draft && (
        <div className="starters">
          <span>Gentle openers</span>
          {JONAH_STARTERS.map((s) => (
            <button key={s} onClick={() => insert(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="composer">
        {(pending.quote || slot || pending.files.length > 0) && (
          <div className="attachments">
            {pending.quote && (
              <div className="chip chip-quote">
                <IconQuote width={14} height={14} />
                <span><b>{pending.quote.who}</b> {pending.quote.text}</span>
                <button aria-label="Remove quote" onClick={() => dispatch({ type: 'quote', id, quote: undefined })}><IconClose width={12} height={12} /></button>
              </div>
            )}
            {slot && (
              <div className={`chip chip-slot k-${slot.kind}`}>
                <IconCalendar width={14} height={14} />
                <span><b>{slot.kind === 'mentor' ? 'Proposing call' : 'Office hours visit'}</b> {slotLabel(slot.day, slot.start, slot.end)}</span>
                <button aria-label="Remove time" onClick={() => dispatch({ type: 'slot', id, slot: slot.id })}><IconClose width={12} height={12} /></button>
              </div>
            )}
            {pending.files.map((f) => (
              <div key={f} className="chip chip-file">
                <IconFile width={14} height={14} />
                <span><b>{FILES[f].name}</b></span>
                <button aria-label={`Remove ${FILES[f].name}`} onClick={() => dispatch({ type: 'toggleFile', id, file: f })}><IconClose width={12} height={12} /></button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={ta}
          value={draft}
          rows={2}
          placeholder={PLACEHOLDER[id]}
          aria-label={PLACEHOLDER[id]}
          onChange={(e) => dispatch({ type: 'draft', id, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
        />

        <div className="composer-bar">
          <div className="attach-wrap" ref={attachRef}>
            <button className="tool" onClick={() => setAttachOpen((o) => !o)} aria-expanded={attachOpen}>
              <IconPaperclip /> Attach
            </button>
            {attachOpen && (
              <div className="popover" role="menu">
                <div className="popover-title">Shared files</div>
                {Object.values(FILES).map((f) => {
                  const on = pending.files.includes(f.id)
                  return (
                    <button key={f.id} role="menuitemcheckbox" aria-checked={on} onClick={() => dispatch({ type: 'toggleFile', id, file: f.id })}>
                      <span className="file-ico"><IconFile width={16} height={16} /></span>
                      <span><b>{f.name}</b><small>{f.kind} · {f.size}</small></span>
                      {on && <IconCheck className="pop-check" width={16} height={16} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {id === 'dana' && (
            <ul className="checks" aria-label="Reply checklist">
              {mentorChecks.map((c) => (
                <li key={c.label} className={c.ok ? 'ok' : c.warn ? 'warn' : ''}>
                  <span className="dot">{c.ok && <IconCheck width={10} height={10} />}</span>
                  {c.label}
                </li>
              ))}
            </ul>
          )}
          {id === 'staff' && !slot && <span className="bar-hint">Pick an office hours block on the right to say when you'll visit.</span>}

          <span className="spacer" />
          <span className="keys" title="Shift+Enter adds a new line">Enter to send</span>
          <button className="send" disabled={!canSend} onClick={send}>
            Send <IconSend width={15} height={15} />
          </button>
        </div>
      </div>
    </footer>
  )
}
