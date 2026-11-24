import { useMemo, useState } from 'react'
import { Check, CornerDownRight, RotateCcw, Sparkles } from 'lucide-react'
import { PEOPLE, ME } from '../lib/types'
import type { Comment, Doc } from '../lib/types'
import { now, relTime } from '../lib/time'
import { clip, uid } from '../lib/store'
import { checkMeasurable } from '../lib/measure'
import { useApp } from './ctx'
import { Avatar } from './ui'
import { cx } from './Canvas'

function anchorLabel(doc: Doc, c: Comment): string {
  if (c.anchor.type === 'model') return 'Whole model'
  if (c.anchor.type === 'element') {
    const id = c.anchor.id
    const e = doc.elements.find((x) => x.id === id)
    return e ? clip(e.text, 52) : 'Deleted element'
  }
  const id = c.anchor.id
  const ed = doc.edges.find((x) => x.id === id)
  if (!ed) return 'Deleted link'
  const a = doc.elements.find((x) => x.id === ed.from)
  const b = doc.elements.find((x) => x.id === ed.to)
  return `Link: ${clip(a?.text ?? '', 26)} → ${clip(b?.text ?? '', 26)}`
}

/** When the thing a comment complained about has been fixed, say so. */
function readyHint(doc: Doc, c: Comment): string | null {
  if (c.resolved || c.anchor.type !== 'element') return null
  const id = c.anchor.id
  const el = doc.elements.find((x) => x.id === id)
  if (!el) return null
  if (/no indicator/i.test(c.text) && el.indicators.length > 0)
    return `This outcome now has ${el.indicators.length} indicator${el.indicators.length === 1 ? '' : 's'}.`
  if (/cannot be scored|not measurable/i.test(c.text) && checkMeasurable(el.text).score === 4)
    return 'The statement now says who, what changes, how much and by when.'
  return null
}

export function CommentsTab() {
  const { doc, apply, selection, select, toast } = useApp()
  const [view, setView] = useState<'open' | 'resolved'>('open')
  const [draft, setDraft] = useState('')
  const [replyOpen, setReplyOpen] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const open = doc.comments.filter((c) => !c.resolved)
  const resolved = doc.comments.filter((c) => c.resolved)
  const list = (view === 'open' ? open : resolved).slice().sort((a, b) => {
    // threads on the selected item first, then newest
    const sa = isSelected(a) ? 1 : 0
    const sb = isSelected(b) ? 1 : 0
    return sb - sa || b.ts - a.ts
  })

  function isSelected(c: Comment) {
    return !!selection && c.anchor.type === selection.kind && 'id' in c.anchor && c.anchor.id === selection.id
  }

  const target = useMemo(() => {
    if (!selection) return { label: 'the whole model', anchor: { type: 'model' } as Comment['anchor'] }
    if (selection.kind === 'element') {
      const e = doc.elements.find((x) => x.id === selection.id)
      return { label: `“${clip(e?.text ?? '', 40)}”`, anchor: { type: 'element', id: selection.id } as Comment['anchor'] }
    }
    return { label: 'the selected link', anchor: { type: 'edge', id: selection.id } as Comment['anchor'] }
  }, [selection, doc.elements])

  const post = () => {
    const text = draft.trim()
    if (!text) return
    apply('Added a comment', (d) => {
      d.comments.unshift({ id: uid('c'), author: ME, ts: now(), text, anchor: target.anchor, resolved: false, replies: [] })
    })
    setDraft('')
    setView('open')
  }

  return (
    <div className="tab-body">
      <div className="composer">
        <textarea
          className="text-field"
          rows={2}
          value={draft}
          placeholder={`Comment on ${target.label}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post()
          }}
        />
        <div className="composer-foot">
          <span>⌘↵ to post</span>
          <button className="btn primary" disabled={!draft.trim()} onClick={post}>
            Comment
          </button>
        </div>
      </div>

      <div className="seg wide" role="tablist" aria-label="Comment status">
        <button className={cx(view === 'open' && 'on')} onClick={() => setView('open')}>
          Open <span className="n">{open.length}</span>
        </button>
        <button className={cx(view === 'resolved' && 'on')} onClick={() => setView('resolved')}>
          Resolved <span className="n">{resolved.length}</span>
        </button>
      </div>

      {list.length === 0 && (
        <div className="all-clear">
          <Check size={18} />
          <strong>{view === 'open' ? 'No open comments' : 'Nothing resolved yet'}</strong>
          {view === 'open' && <span>Everything your team raised has been resolved.</span>}
        </div>
      )}

      {list.map((c) => {
        const hint = readyHint(doc, c)
        const p = PEOPLE[c.author]
        const clickable = c.anchor.type !== 'model'
        return (
          <article key={c.id} className={cx('thread', isSelected(c) && 'sel', c.resolved && 'done')}>
            <header>
              <Avatar id={c.author} size={26} />
              <div>
                <strong>{p.name}</strong>
                <small>
                  {p.role} · {relTime(c.ts)}
                </small>
              </div>
            </header>
            <button
              className="anchor-chip"
              disabled={!clickable}
              onClick={() => {
                if (c.anchor.type === 'model') return
                select({ kind: c.anchor.type, id: c.anchor.id }, null)
              }}
              title="Show on the canvas"
            >
              {anchorLabel(doc, c)}
            </button>
            <p className="body">{c.text}</p>
            {c.replies.map((r) => (
              <div className="reply" key={r.id}>
                <Avatar id={r.author} size={20} />
                <div>
                  <strong>{PEOPLE[r.author].short}</strong> <small>{relTime(r.ts)}</small>
                  <p>{r.text}</p>
                </div>
              </div>
            ))}
            {hint && (
              <div className="ready-hint">
                <Sparkles size={13} /> {hint} Ready to resolve?
              </div>
            )}
            {replyOpen === c.id && (
              <form
                className="reply-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  const text = reply.trim()
                  if (!text) return
                  apply('Replied to a comment', (d) => void d.comments.find((x) => x.id === c.id)!.replies.push({ id: uid('r'), author: ME, ts: now(), text }))
                  setReply('')
                  setReplyOpen(null)
                }}
              >
                <input autoFocus className="text-field" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" onKeyDown={(e) => e.key === 'Escape' && setReplyOpen(null)} />
                <button className="btn primary" disabled={!reply.trim()}>
                  Reply
                </button>
              </form>
            )}
            <footer>
              {replyOpen !== c.id && (
                <button className="btn tiny" onClick={() => setReplyOpen(c.id)}>
                  <CornerDownRight size={12} /> Reply
                </button>
              )}
              {c.resolved ? (
                <button
                  className="btn tiny"
                  onClick={() => apply('Reopened a comment', (d) => {
                    const t = d.comments.find((x) => x.id === c.id)!
                    t.resolved = false
                    delete t.resolvedBy
                  })}
                >
                  <RotateCcw size={12} /> Reopen
                </button>
              ) : (
                <button
                  className={cx('btn tiny', hint && 'primary')}
                  onClick={() => {
                    apply(`Resolved a comment from ${p.short}`, (d) => {
                      const t = d.comments.find((x) => x.id === c.id)!
                      t.resolved = true
                      t.resolvedBy = ME
                    })
                    toast(`Resolved ${p.short}’s comment`, true)
                  }}
                >
                  <Check size={12} /> Resolve
                </button>
              )}
              {c.resolved && c.resolvedBy && <small className="by">Resolved by {PEOPLE[c.resolvedBy].short}</small>}
            </footer>
          </article>
        )
      })}
    </div>
  )
}
