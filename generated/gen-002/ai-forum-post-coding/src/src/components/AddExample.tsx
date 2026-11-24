import { useMemo, useState } from 'react'
import { FlaskConical, TriangleAlert } from 'lucide-react'
import { CODES, type CodeId } from '../data/codes'
import { CODED_BY_ID, DISAGREEMENTS, FORUM_NAME, GOLD_TOTAL, NON_GOLD } from '../data/corpus'
import { heldOutOf } from '../lib/draft'
import { fmtPostDate } from '../lib/format'
import { useStore } from '../store'
import { CodeChip, Dialog } from './ui'

/** Dialog for adding a boundary example to the v4 draft of "request for help". */
export default function AddExample({ initialPostId, onClose, onAdded }: { initialPostId?: string; onClose: () => void; onAdded?: () => void }) {
  const s = useStore()
  const outside = useMemo(
    () => NON_GOLD.filter((p) => p.model.code === 'request' && p.endsQ).sort((a, b) => a.model.conf - b.model.conf).slice(0, 6),
    [],
  )
  const inGold = useMemo(
    () => DISAGREEMENTS.filter((p) => p.gold === 'venting' && p.model.code === 'request').slice(0, 6),
    [],
  )
  const init = initialPostId ? CODED_BY_ID[initialPostId] : undefined
  const [postId, setPostId] = useState<string | undefined>(init?.id)
  const [text, setText] = useState(init?.text ?? '')
  const [code, setCode] = useState<CodeId | ''>(init?.isGold && init.gold ? init.gold : '')
  const [why, setWhy] = useState('')
  const post = postId ? CODED_BY_ID[postId] : undefined
  const held = heldOutOf(s.draft)
  const alreadyUsed = post ? !!s.draft?.request.examples.some((e) => e.postId === post.id) : false

  const choose = (id: string) => {
    const p = CODED_BY_ID[id]
    setPostId(id)
    setText(p.text)
    setCode(p.isGold && p.gold ? p.gold : '')
  }
  const textEdited = !!post && text.trim() !== post.text.trim()
  const valid = text.trim().length >= 20 && code !== '' && why.trim().length >= 8 && !alreadyUsed

  const submit = () => {
    if (!valid || !code) return
    s.addExample('request', { text: text.trim(), code, kind: 'boundary', note: why.trim(), postId: post?.id })
    onAdded?.()
    onClose()
  }

  const cand = (id: string, gold?: boolean) => {
    const p = CODED_BY_ID[id]
    const used = !!s.draft?.request.examples.some((e) => e.postId === id)
    return (
      <li key={id}>
        <button className={`cand ${postId === id ? 'on' : ''}`} onClick={() => choose(id)} disabled={used} aria-pressed={postId === id}>
          <span className="cand-meta mono">{id} · {p.forum}</span>
          <span className="cand-text">{p.text}</span>
          <span className="cand-foot">
            {gold ? <>Gold: <CodeChip id={p.gold!} size="sm" /></> : <>v3: <CodeChip id={p.model.code} size="sm" /> <span className="num">conf {p.model.conf.toFixed(2)}</span></>}
            {used && <em> · already used</em>}
          </span>
        </button>
      </li>
    )
  }

  return (
    <Dialog
      title="Add a boundary example to “Request for help”"
      sub="A boundary example shows the model where the line is: a post that looks like a request but isn’t, or the reverse."
      onClose={onClose} width={980}
      footer={<>
        <span className="small muted foot-note">Goes into the v4 draft only. Nothing runs until v4 is published.</span>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={submit}>Add to draft</button>
      </>}
    >
      <div className="addex">
        <div className="addex-cands">
          <h3>Start from a post <span className="muted">(optional)</span></h3>
          <p className="small muted">Posts outside the gold sample are the safest source: they leave all {GOLD_TOTAL} gold posts available to measure v4.</p>
          <h4>Outside the gold sample</h4>
          <ul>{outside.map((p) => cand(p.id))}</ul>
          <h4>In the gold sample <span className="muted">· held out of scoring if used</span></h4>
          <ul>{inGold.map((p) => cand(p.id, true))}</ul>
        </div>
        <div className="addex-form">
          <label className="field">
            <span>Example text</span>
            <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a post, or write one that shows the boundary." />
          </label>
          {post && (
            <p className="small muted src">
              From <span className="mono">{post.id}</span>, {FORUM_NAME[post.forum]}, {fmtPostDate(post.date)}
              {textEdited && ' (edited)'}
            </p>
          )}
          {post?.isGold && !alreadyUsed && (
            <div className="note warn">
              <TriangleAlert size={16} />
              <span>
                This post is in the gold sample. Once the model sees it in the codebook it can’t fairly be used to test the codebook, so it will be <b>held out of v4 scoring</b>{' '}
                ({GOLD_TOTAL - held.size} → {GOLD_TOTAL - held.size - 1} posts).
              </span>
            </div>
          )}
          {alreadyUsed && <div className="note warn"><TriangleAlert size={16} /><span>This post is already an example in the draft.</span></div>}
          <label className="field">
            <span>Correct code for this post</span>
            <select value={code} onChange={(e) => setCode(e.target.value as CodeId)}>
              <option value="" disabled>Choose the code you would give it…</option>
              {CODES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {code && (
            <p className="small muted">
              Will teach: this kind of post is <CodeChip id={code} size="sm" />{code === 'request' ? '' : ', not a request for help'}.
            </p>
          )}
          <label className="field">
            <span>Why is it on the boundary?</span>
            <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Ends in a rhetorical question but asks the reader for nothing" />
          </label>
          <p className="small muted"><FlaskConical size={13} /> You can score the draft on the gold sample from the Codebook page before publishing.</p>
        </div>
      </div>
    </Dialog>
  )
}
