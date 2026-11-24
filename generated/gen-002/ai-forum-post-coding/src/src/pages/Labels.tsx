import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react'
import { CODES, CODE_BY_ID, type CodeId } from '../data/codes'
import { CODED, CODED_BY_ID, CONFIG_HASH, FORUMS, FORUM_NAME, MODEL_ID, type CodedPost, type ForumId } from '../data/corpus'
import { affectedByRequestChange } from '../lib/stats'
import { downloadCsv } from '../lib/export'
import { fmtDateTime, fmtInt, fmtPostDate } from '../lib/format'
import { navigate, useRoute } from '../lib/router'
import { useStore, type Decision } from '../store'
import { CodeChip } from '../components/ui'

const PAGE = 40

export function statusOf(p: CodedPost, d: Decision | null): { label: string; tone: 'neutral' | 'warn' | 'bad' | 'info' } {
  if (p.isGold) return { label: 'Evaluation record', tone: 'info' }
  if (!d) return { label: 'Provisional', tone: 'neutral' }
  if (d.choice === 'keep') return { label: 'Kept · v3', tone: 'neutral' }
  if (d.choice === 'discard') return { label: 'Discarded', tone: 'bad' }
  return d.scope === 'all' || affectedByRequestChange(p) ? { label: 'Re-run queued', tone: 'warn' } : { label: 'Kept · v3', tone: 'neutral' }
}

function Highlighted({ text, quote }: { text: string; quote: string }) {
  const i = text.indexOf(quote)
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark>{quote}</mark>{text.slice(i + quote.length)}</>
}

export default function Labels() {
  const { segs } = useRoute()
  const s = useStore()
  const [q, setQ] = useState('')
  const [code, setCode] = useState<CodeId | ''>('')
  const [forum, setForum] = useState<ForumId | ''>('')
  const [src, setSrc] = useState<'' | 'gold' | 'nongold' | 'low'>('')
  const [page, setPage] = useState(0)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return CODED.filter((p) => {
      if (code && p.model.code !== code) return false
      if (forum && p.forum !== forum) return false
      if (src === 'gold' && !p.isGold) return false
      if (src === 'nongold' && p.isGold) return false
      if (src === 'low' && p.model.conf >= 0.7) return false
      if (needle && !(p.text.toLowerCase().includes(needle) || p.id.includes(needle))) return false
      return true
    })
  }, [q, code, forum, src])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const cur = Math.min(page, pages - 1)
  const slice = rows.slice(cur * PAGE, cur * PAGE + PAGE)
  const open = segs[1] ? CODED_BY_ID[segs[1]] : undefined

  const exportCsv = () => {
    const out: (string | number)[][] = [[
      'post_id', 'forum', 'post_date', 'author_hash', 'queue_position', 'label', 'confidence', 'quoted_sentence', 'rationale',
      'codebook_version', 'model', 'run', 'config_hash', 'labeled_at', 'gold_label', 'status', 'post_text',
    ]]
    for (const p of CODED) {
      out.push([
        p.id, FORUM_NAME[p.forum], p.date, p.author, p.queuePos, CODE_BY_ID[p.model.code].name, p.model.conf.toFixed(2),
        p.model.quote, p.model.rationale, 'v3', MODEL_ID, 'run 1', CONFIG_HASH, new Date(p.labeledAt).toISOString(),
        p.gold ? CODE_BY_ID[p.gold].name : '', statusOf(p, s.decision).label, p.text,
      ])
    }
    downloadCsv('threadcoder-labels-run1-codebook-v3.csv', out)
    s.say('Exported 1,240 labels with provenance.', 'info')
  }

  return (
    <div className="page labels">
      <header className="page-head">
        <div>
          <h1>Labels</h1>
          <p className="muted small">All {fmtInt(CODED.length)} labels from run 1. Open one to see exactly where it came from.</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCsv}><Download size={15} /> Export with provenance (CSV)</button>
      </header>

      <div className="toolbar">
        <label className="search">
          <Search size={15} aria-hidden />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search post text or ID" aria-label="Search posts" />
        </label>
        <select value={code} onChange={(e) => { setCode(e.target.value as CodeId | ''); setPage(0) }} aria-label="Label">
          <option value="">Any label</option>
          {CODES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={forum} onChange={(e) => { setForum(e.target.value as ForumId | ''); setPage(0) }} aria-label="Forum">
          <option value="">All forums</option>
          {FORUMS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select value={src} onChange={(e) => { setSrc(e.target.value as typeof src); setPage(0) }} aria-label="Source">
          <option value="">Gold and other</option>
          <option value="gold">Gold sample only (300)</option>
          <option value="nongold">Outside gold (940)</option>
          <option value="low">Confidence under 0.70</option>
        </select>
        <span className="grow" />
        <span className="small muted num">{fmtInt(rows.length)} labels</span>
      </div>

      <div className="card table-card">
        <table className="labels-table">
          <thead>
            <tr><th>Post</th><th>Forum</th><th>Text</th><th>Label</th><th className="r">Conf.</th><th>Gold</th><th>Status</th></tr>
          </thead>
          <tbody>
            {slice.map((p) => {
              const st = statusOf(p, s.decision)
              const gold = p.isGold ? (p.gold === p.model.code ? 'agrees' : 'differs') : null
              return (
                <tr key={p.id} className={open?.id === p.id ? 'on' : ''} onClick={() => navigate(`labels/${p.id}`)} tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`labels/${p.id}`) }}>
                  <td className="mono">{p.id}</td>
                  <td>{p.forum}</td>
                  <td className="cell-text">{p.text}</td>
                  <td><CodeChip id={p.model.code} size="sm" /></td>
                  <td className={`r num ${p.model.conf < 0.7 ? 'warn-text' : ''}`}>{p.model.conf.toFixed(2)}</td>
                  <td className="small">{gold ? <span className={gold === 'differs' ? 'fail-text' : 'muted'}>{gold === 'differs' ? '✕ differs' : '✓ agrees'}</span> : <span className="muted">not in gold</span>}</td>
                  <td><span className={`tone ${st.tone}`}>{st.label}</span></td>
                </tr>
              )
            })}
            {slice.length === 0 && <tr><td colSpan={7} className="empty small muted">No labels match.</td></tr>}
          </tbody>
        </table>
        <footer className="pager-foot">
          <span className="small muted num">{rows.length ? `${cur * PAGE + 1}–${Math.min(rows.length, cur * PAGE + PAGE)} of ${fmtInt(rows.length)}` : '0'}</span>
          <div>
            <button className="icon-btn bordered" onClick={() => setPage(Math.max(0, cur - 1))} disabled={cur === 0} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className="small num pg">Page {cur + 1} of {pages}</span>
            <button className="icon-btn bordered" onClick={() => setPage(Math.min(pages - 1, cur + 1))} disabled={cur >= pages - 1} aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        </footer>
      </div>

      {open && <Drawer post={open} onClose={() => navigate('labels')} />}
    </div>
  )
}

function Drawer({ post, onClose }: { post: CodedPost; onClose: () => void }) {
  const s = useStore()
  const st = statusOf(post, s.decision)
  const differs = post.isGold && post.gold !== post.model.code
  return (
    <aside className="drawer" aria-label="Label provenance">
      <header className="drawer-head">
        <div>
          <div className="eyebrow">Label provenance</div>
          <div className="mono post-id">{post.id}</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </header>
      <div className="drawer-body">
        <section>
          <h3>Post</h3>
          <blockquote className="post sm"><Highlighted text={post.text} quote={post.model.quote} /></blockquote>
          <p className="small muted">{FORUM_NAME[post.forum]} · {fmtPostDate(post.date)} · author <span className="mono">{post.author}</span></p>
        </section>
        <section>
          <h3>Label</h3>
          <div className="row-gap"><CodeChip id={post.model.code} size="lg" /><span className="num small">confidence <b>{post.model.conf.toFixed(2)}</b></span></div>
          <dl className="kv">
            <div><dt>Quoted sentence</dt><dd>“{post.model.quote}”</dd></div>
            <div><dt>Rationale</dt><dd>{post.model.rationale}</dd></div>
          </dl>
        </section>
        <section>
          <h3>Where it came from</h3>
          <dl className="kv">
            <div><dt>Model</dt><dd className="mono">{MODEL_ID}</dd></div>
            <div><dt>Codebook</dt><dd><a href="#/codebook">v3</a> · published Oct 21, 2026</dd></div>
            <div><dt>Run</dt><dd>Run 1 · queue position {post.queuePos} of 3,800</dd></div>
            <div><dt>Config</dt><dd className="mono">{CONFIG_HASH}</dd></div>
            <div><dt>Labeled</dt><dd>{fmtDateTime(post.labeledAt)}</dd></div>
            <div><dt>Status</dt><dd><span className={`tone ${st.tone}`}>{st.label}</span></dd></div>
          </dl>
        </section>
        <section>
          <h3>Human check</h3>
          {post.isGold ? (
            <>
              <dl className="kv">
                <div><dt>Gold label</dt><dd><CodeChip id={post.gold!} size="sm" /> {differs ? <b className="fail-text">differs from model</b> : <span className="muted">agrees with model</span>}</dd></div>
                <div><dt>First pass</dt><dd className="small">Priya: {CODE_BY_ID[post.priya!].name} · Marcus: {CODE_BY_ID[post.marcus!].name}</dd></div>
              </dl>
              {differs && <button className="link-btn" onClick={() => navigate(`disagreements/${post.id}`)}>Open in Disagreements →</button>}
            </>
          ) : (
            <p className="small muted">Not in the gold sample. No human has checked this label.</p>
          )}
        </section>
      </div>
    </aside>
  )
}
