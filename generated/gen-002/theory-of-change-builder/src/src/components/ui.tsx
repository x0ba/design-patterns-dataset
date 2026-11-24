import { useEffect, useRef, useState } from 'react'
import type { PersonId } from '../lib/types'
import { PEOPLE } from '../lib/types'

export function Avatar({ id, size = 26, ring }: { id: PersonId; size?: number; ring?: boolean }) {
  const p = PEOPLE[id]
  return (
    <span
      className="avatar"
      title={`${p.name}, ${p.role}`}
      style={{ width: size, height: size, background: p.color, fontSize: size * 0.4, boxShadow: ring ? '0 0 0 2px #fff' : undefined }}
    >
      {p.initials}
    </span>
  )
}

/** A text field that edits locally and commits on blur or Enter, so one edit = one undo step. */
export function CommitText({
  value,
  onCommit,
  onDraft,
  multiline,
  className,
  placeholder,
  ariaLabel,
  inputRef,
}: {
  value: string
  onCommit: (v: string) => void
  onDraft?: (v: string) => void
  multiline?: boolean
  className?: string
  placeholder?: string
  ariaLabel?: string
  inputRef?: React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>
}) {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  const ta = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    if (!focused.current) setDraft(value)
  }, [value])
  useEffect(() => {
    if (ta.current) {
      ta.current.style.height = '0px'
      ta.current.style.height = ta.current.scrollHeight + 2 + 'px'
    }
  }, [draft])
  const commit = () => {
    const v = draft.trim()
    if (v && v !== value) onCommit(v)
    else setDraft(value)
    onDraft?.(v && v !== value ? v : value)
  }
  const common = {
    value: draft,
    placeholder,
    'aria-label': ariaLabel,
    className,
    onFocus: () => (focused.current = true),
    onBlur: () => {
      focused.current = false
      commit()
    },
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setDraft(e.target.value)
      onDraft?.(e.target.value)
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        ;(e.target as HTMLElement).blur()
      }
      if (e.key === 'Escape') {
        setDraft(value)
        onDraft?.(value)
        ;(e.target as HTMLElement).blur()
      }
    },
  }
  if (multiline)
    return (
      <textarea
        {...common}
        rows={2}
        ref={(n) => {
          ta.current = n
          if (inputRef) inputRef.current = n
        }}
      />
    )
  return (
    <input
      {...common}
      ref={(n) => {
        if (inputRef) inputRef.current = n
      }}
    />
  )
}

export function Section({ title, count, children, action }: { title: string; count?: number | string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h3>
          {title}
          {count !== undefined && <span className="count">{count}</span>}
        </h3>
        {action}
      </header>
      {children}
    </section>
  )
}
