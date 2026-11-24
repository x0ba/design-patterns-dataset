import { useState } from 'react'
import { ArrowRight, BookPlus, FlaskConical, GitBranch, Lock, Plus, RotateCcw, Trash2, TriangleAlert, Undo2 } from 'lucide-react'
import { CHANGELOG_PUBLISHED, CODEBOOK_V3, CODES, CODE_BY_ID, type CodeId, type Codebook as CB, type Example } from '../data/codes'
import { CODED_BY_ID, GOLD_TOTAL } from '../data/corpus'
import { THRESHOLD, V3_STATS } from '../lib/stats'
import { changedCodes, diffSummary, draftSig, heldOutOf, requestTextChanged, strengthOf } from '../lib/draft'
import { diffWords } from '../lib/diff'
import { fmtDateTime, fmtUSD } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { useStore } from '../store'
import { CodeChip, Dialog, Segmented } from '../components/ui'
import AddExample from '../components/AddExample'

function DiffText({ a, b }: { a: string; b: string }) {
  return (
    <p className="difftext">
      {diffWords(a, b).map((t, i) =>
        t.t === 'same' ? <span key={i}>{t.s}</span> : t.t === 'add' ? <ins key={i}>{t.s}</ins> : <del key={i}>{t.s}</del>,
      )}
    </p>
  )
}

function RuleList({
  title, items, base, editable, onChange,
}: { title: string; items: string[]; base: string[]; editable: boolean; onChange: (v: string[]) => void }) {
  const removed = base.filter((b) => !items.includes(b))
  return (
    <section className="cb-sec">
      <h3>{title}</h3>
      <ul className="rules">
        {items.map((it, i) => {
          const isNew = !base.includes(it)
          return (
            <li key={i} className={isNew ? 'new' : ''}>
              {editable ? (
                <div className="rule-edit">
                  <textarea rows={2} value={it} aria-label={`${title} ${i + 1}`}
                    onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button className="icon-btn" aria-label="Remove rule" title="Remove rule" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
                </div>
              ) : <span>{it}</span>}
              {isNew && <em className="badge-new">{it.trim() ? 'new in v4' : 'empty'}</em>}
            </li>
          )
        })}
      </ul>
      {removed.length > 0 && (
        <ul className="rules removed" aria-label="Removed from v3">
          {removed.map((r) => <li key={r}><del>{r}</del><em className="badge-del">removed in v4</em></li>)}
        </ul>
      )}
      {editable && (
        <button className="link-btn" onClick={() => onChange([...items, ''])}><Plus size={14} /> Add rule</button>
      )}
    </section>
  )
}

function ExampleCard({ ex, parent, onRemove }: { ex: Example; parent: CodeId; onRemove?: () => void }) {
  const post = ex.postId ? CODED_BY_ID[ex.postId] : undefined
  return (
    <li className={`ex ${ex.kind} ${ex.isNew ? 'isnew' : ''}`}>
      <div className="ex-head">
        <span className={`ex-kind ${ex.kind}`}>{ex.kind === 'boundary' ? 'Boundary' : 'Core'}</span>
        <span className="small muted">Correct code</span> <CodeChip id={ex.code} size="sm" />
        {ex.code !== parent && <span className="small muted">(not a {CODE_BY_ID[parent].name.toLowerCase()})</span>}
        {ex.isNew && <em className="badge-new">new in v4</em>}
        <span className="grow" />
        {onRemove && <button className="icon-btn" onClick={onRemove} aria-label="Remove example" title="Remove example"><Trash2 size={15} /></button>}
      </div>
      <blockquote>{ex.text}</blockquote>
      {ex.note && <p className="small ex-note"><b>Why it’s here:</b> {ex.note}</p>}
      {post && (
        <p className="small muted mono">
          {post.id}{post.isGold ? ' · gold sample, held out of v4 scoring' : ' · outside the gold sample'}
        </p>
      )}
    </li>
  )
}

function ScorePanel() {
  const s = useStore()
  const sc = s.score
  if (!sc) return null
  const stale = sc.sig !== draftSig(s.draft)
  const fixed = sc.changes.filter((c) => c.kind === 'fixed')
  const broken = sc.changes.filter((c) => c.kind === 'broken')
  const mins = CODES.map((c) => sc.stats[c.id].kappa)
  const pass = Math.min(...mins) >= THRESHOLD
  return (
    <section className={`card scorepanel ${stale ? 'stale' : ''}`} aria-labelledby="score-h">
      <header className="card-head tight">
        <div>
          <h2 id="score-h"><FlaskConical size={16} /> Draft v4 on the gold sample</h2>
          <p className="small muted">
            {sc.n} of {GOLD_TOTAL} posts scored{sc.heldOut ? ` (${sc.heldOut} held out because they’re now examples)` : ''} · {fmtDateTime(sc.at)} · {fmtUSD(sc.cost)}
          </p>
        </div>
        {stale && <span className="badge-stale"><TriangleAlert size={13} /> Draft changed since scoring. Score again to refresh.</span>}
      </header>
      <div className="score-grid">
        <table className="mini-table">
          <thead><tr><th>Code</th><th className="r">v3 <span className="k">κ</span></th><th className="r">v4 <span className="k">κ</span></th><th className="r">Change</th></tr></thead>
          <tbody>
            {[...CODES].sort((a, b) => sc.stats[a.id].kappa - sc.stats[b.id].kappa).map((c) => {
              const v3 = V3_STATS[c.id].kappa
              const v4 = sc.stats[c.id].kappa
              const d = v4 - v3
              return (
                <tr key={c.id}>
                  <td><CodeChip id={c.id} size="sm" /></td>
                  <td className="r num muted">{v3.toFixed(2)}</td>
                  <td className={`r num ${v4 >= THRESHOLD ? 'pass-text' : 'fail-text'}`}><b>{v4.toFixed(2)}</b></td>
                  <td className="r num muted">{Math.abs(d) < 0.005 ? '·' : (d > 0 ? '+' : '−') + Math.abs(d).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="score-side">
          <div className={`verdict-box ${pass ? 'pass' : 'fail'}`}>
            <b>{pass ? 'Every code meets 0.75 on this sample.' : `Still short: ${CODES.filter((c) => sc.stats[c.id].kappa < THRESHOLD).map((c) => c.name.toLowerCase()).join(', ')}.`}</b>
            <span className="small">
              {fixed.length} label{fixed.length === 1 ? '' : 's'} now match gold; {broken.length} newly differ{broken.length === 1 ? 's' : ''}.
                          </span>
          </div>
          {broken.length > 0 && (
            <div className="small">
              <b>Newly differs:</b>{' '}
              {broken.map((b) => (
                <button key={b.postId} className="link-btn inline mono" onClick={() => navigate(`labels/${b.postId}`)}>{b.postId}</button>
              ))}{' '}
              <span className="muted">(a genuine request now read as {CODE_BY_ID[broken[0].to].name.toLowerCase()})</span>
            </div>
          )}
          <p className="small muted caveat">
            <b>Treat this as a rehearsal, not validation.</b> The disagreements that prompted the change come from this same sample. To report v4 agreement, double-code a fresh sample the codebook has never seen.
          </p>
        </div>
      </div>
    </section>
  )
}

export default function CodebookPage() {
  const { segs } = useRoute()
  const s = useStore()
  const [tab, setTab] = useState<'codes' | 'log'>('codes')
  const [adding, setAdding] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const sel = (segs[1] as CodeId) in CODEBOOK_V3 ? (segs[1] as CodeId) : 'request'

  const cb: CB = s.published?.codebook ?? s.draft ?? CODEBOOK_V3
  const editable = !!s.draft && !s.published
  const changed = s.draft ? changedCodes(s.draft) : []
  const held = heldOutOf(s.draft)
  const sum = s.draft ? diffSummary(s.draft) : null
  const strength = strengthOf(s.draft)
  const def = cb[sel]
  const base = CODEBOOK_V3[sel]
  const codeChanged = changed.includes(sel)
  const stale = s.score && s.score.sig !== draftSig(s.draft)

  return (
    <div className="page codebook">
      <header className="page-head">
        <div>
          <h1>Codebook</h1>
          <p className="muted small">Runs use a published version only. Every AI label records the version it was made with.</p>
        </div>
        <Segmented label="Codebook view" value={tab} onChange={setTab}
          options={[{ value: 'codes', label: 'Codes' }, { value: 'log', label: 'Change log' }]} />
      </header>

      {/* status banner */}
      {!s.draft && !s.published && (
        <section className="cb-banner">
          <Lock size={17} />
          <div>
            <b>Published: v3</b> <span className="muted">· Oct 21, 2026 · 9 codes · read-only</span>
            <p className="small">Run 1 is using this version. To change a definition, start a v4 draft. The running job isn’t affected until you publish and restart.</p>
          </div>
          <button className="btn btn-primary" onClick={s.startDraft}><GitBranch size={15} /> Start v4 draft</button>
        </section>
      )}
      {s.draft && !s.published && (
        <section className="cb-banner draft">
          <GitBranch size={17} />
          <div>
            <b>Draft v4</b> <span className="muted">· based on v3 · not used by any run</span>
            <p className="small num">
              {changed.length === 0 ? 'No changes yet.' : <>
                {changed.length} code{changed.length === 1 ? '' : 's'} changed · {sum!.ex} example{sum!.ex === 1 ? '' : 's'} added
                {held.size > 0 && ` · ${held.size} gold post${held.size === 1 ? '' : 's'} held out of scoring`}
              </>}
            </p>
          </div>
          <div className="banner-actions">
            <button className="btn btn-ghost" onClick={s.discardDraft}><Undo2 size={15} /> Discard draft</button>
            <button className="btn btn-secondary" onClick={s.runScore} disabled={strength === 0}
              title={strength === 0 ? 'Edit “request for help” first' : undefined}>
              <FlaskConical size={15} /> {s.score && !stale ? 'Score again' : 'Score on gold'} <span className="muted num">≈ {fmtUSD(s.scoreCost)}</span>
            </button>
            <button className="btn btn-primary" onClick={() => setPublishing(true)} disabled={changed.length === 0}>Publish v4…</button>
          </div>
        </section>
      )}
      {s.published && (
        <section className="cb-banner published">
          <Lock size={17} />
          <div>
            <b>v4 published</b> <span className="muted">· {fmtDateTime(s.published.at)} · read-only</span>
            <p className="small">“{s.published.note}”</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('runs')}>Go to Runs <ArrowRight size={15} /></button>
        </section>
      )}

      {tab === 'codes' && <ScorePanel />}

      {tab === 'codes' ? (
        <div className="cb-grid">
          <ul className="cb-list" aria-label="Codes">
            {CODES.map((c) => {
              const k = V3_STATS[c.id].kappa
              return (
                <li key={c.id}>
                  <button className={`cb-item ${sel === c.id ? 'on' : ''}`} onClick={() => navigate(`codebook/${c.id}`)} aria-current={sel === c.id}>
                    <CodeChip id={c.id} />
                    <span className="cb-item-meta small">
                      {cb[c.id].examples.length} examples
                      {changed.includes(c.id) && <em className="badge-new">edited</em>}
                    </span>
                    <span className={`num small ${k < THRESHOLD ? 'fail-text' : 'muted'}`}>κ {k.toFixed(2)}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <article className="cb-detail card" aria-label={`${CODE_BY_ID[sel].name} definition`}>
            <header className="cb-detail-head">
              <div>
                <CodeChip id={sel} size="lg" />
                <span className="small muted"> {s.published ? 'v4' : editable ? 'draft v4' : 'v3'}{codeChanged ? ' · edited from v3' : ''}</span>
              </div>
              {editable && codeChanged && (
                <button className="btn btn-ghost" onClick={() => s.revertCode(sel)}><RotateCcw size={14} /> Revert to v3</button>
              )}
            </header>

            <section className="cb-sec">
              <h3>Definition</h3>
              {editable ? (
                <textarea className="def-edit" rows={3} value={def.definition} aria-label="Definition"
                  onChange={(e) => s.editCode(sel, { definition: e.target.value })} />
              ) : <p className="def">{def.definition}</p>}
              {def.definition.trim() !== base.definition.trim() && (
                <div className="diffbox"><span className="eyebrow">Changes from v3</span><DiffText a={base.definition} b={def.definition} /></div>
              )}
            </section>

            <div className="two">
              <RuleList title="Include" items={def.includes} base={base.includes} editable={editable} onChange={(v) => s.editCode(sel, { includes: v })} />
              <RuleList title="Exclude" items={def.excludes} base={base.excludes} editable={editable} onChange={(v) => s.editCode(sel, { excludes: v })} />
            </div>

            <section className="cb-sec">
              <div className="row-between">
                <h3>Examples <span className="muted num">({def.examples.length})</span></h3>
                {editable && sel === 'request' && (
                  <button className="btn btn-secondary" onClick={() => setAdding(true)}><BookPlus size={15} /> Add boundary example…</button>
                )}
              </div>
              <ul className="examples">
                {def.examples.map((e) => (
                  <ExampleCard key={e.id} ex={e} parent={sel} onRemove={editable && e.isNew ? () => s.removeExample(sel, e.id) : undefined} />
                ))}
              </ul>
              {editable && sel !== 'request' && <p className="small muted">Boundary examples can be added from “Request for help”, or from a disagreement.</p>}
              {sel === 'request' && editable && strength < 3 && (
                <p className="small muted hint">
                  {requestTextChanged(s.draft!) ? 'Rule text edited.' : 'Rule text not edited yet.'}{' '}
                  {Math.min(2, def.examples.filter((e) => e.isNew && e.kind === 'boundary').length)} of 2 boundary examples added.
                </p>
              )}
            </section>
          </article>
        </div>
      ) : (
        <section className="changelog card" aria-label="Change log">
          <ol>
            {s.published && (
              <li>
                <div className="cl-ver">v4</div>
                <div><b>Published {fmtDateTime(s.published.at)}</b> · Priya Ramaswamy<p>{s.published.note}</p>
                  <p className="small muted">Changed: {changed.map((c) => CODE_BY_ID[c].name).join(', ')}</p></div>
              </li>
            )}
            {s.draft && !s.published && (
              <li className="draft">
                <div className="cl-ver">v4</div>
                <div><b>Draft</b> · unpublished<p className="muted">{changed.length ? `Changed: ${changed.map((c) => CODE_BY_ID[c].name).join(', ')}` : 'No changes yet.'}</p></div>
              </li>
            )}
            {CHANGELOG_PUBLISHED.map((e) => (
              <li key={e.version}>
                <div className="cl-ver">{e.version}</div>
                <div><b>{e.date}</b> · {e.author}<p>{e.summary}</p><p className="small muted">Changed: {e.changed.join(', ')}</p></div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {adding && <AddExample onClose={() => setAdding(false)} />}
      {publishing && s.draft && (
        <PublishDialog onClose={() => setPublishing(false)} />
      )}
    </div>
  )
}

function PublishDialog({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [note, setNote] = useState('')
  const draft = s.draft!
  const changed = changedCodes(draft)
  const sum = diffSummary(draft)
  const scored = !!s.score && s.score.sig === draftSig(draft)
  const valid = note.trim().length >= 20
  return (
    <Dialog
      title="Publish codebook v4"
      sub="Published versions can’t be edited. If something is wrong later, you publish v5."
      onClose={onClose} width={560}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Keep editing</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => { s.publish(note.trim()); onClose() }}>Publish v4</button>
      </>}
    >
      <ul className="pub-sum">
        <li><b>{changed.length}</b> code{changed.length === 1 ? '' : 's'} changed: {changed.map((c) => CODE_BY_ID[c].name).join(', ')}</li>
        <li><b>{sum.ex}</b> new example{sum.ex === 1 ? '' : 's'}, <b>{heldOutOf(draft).size}</b> of them from the gold sample (held out of scoring)</li>
      </ul>
      {!scored && (
        <div className="note warn">
          <TriangleAlert size={16} />
          <span>{s.score ? 'You changed the draft after scoring it.' : 'This draft hasn’t been scored on the gold sample.'} You can still publish, but the change log will record that it wasn’t checked.</span>
        </div>
      )}
      <label className="field">
        <span>Change log entry <em className="muted">(required, goes in the change log and the audit trail)</em></span>
        <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="What changed and why. For example: why this boundary matters and which disagreements prompted it." />
        <small className={`muted num ${valid ? '' : 'need'}`}>{note.trim().length} / 20 characters minimum</small>
      </label>
    </Dialog>
  )
}
