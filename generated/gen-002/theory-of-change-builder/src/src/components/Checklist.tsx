import { Check, Wand2 } from 'lucide-react'
import { DUE, now, DAY } from '../lib/time'
import { computeStats } from '../lib/graph'
import { clip } from '../lib/store'
import { LANE_META } from '../lib/types'
import type { Edge, El } from '../lib/types'
import { useApp } from './ctx'
import { cx } from './Canvas'

type Row = { label: string; to?: string; sub?: string; onClick: () => void; lane?: El['lane'] }

export function ChecklistTab() {
  const { doc, select, setTab, tidy, crossings } = useApp()
  const s = computeStats(doc)
  const daysLeft = Math.max(0, Math.ceil((DUE - now()) / DAY))
  const linkName = (e: Edge) => {
    const a = doc.elements.find((x) => x.id === e.from)!
    const b = doc.elements.find((x) => x.id === e.to)!
    return `${clip(a.text, 24)} → ${clip(b.text, 24)}`
  }
  const el = (e: El): Row => ({ label: clip(e.text, 62), lane: e.lane, onClick: () => select({ kind: 'element', id: e.id }, 'details') })

  const items: { title: string; done: boolean; detail: string; rows: Row[]; action?: React.ReactNode; soft?: boolean }[] = [
    {
      title: 'Every long-term outcome has an indicator',
      done: s.longtermNoIndicator.length === 0,
      detail: `${s.longterm.length - s.longtermNoIndicator.length} of ${s.longterm.length} have one`,
      rows: s.longtermNoIndicator.map(el),
    },
    {
      title: 'Outcome statements are measurable',
      done: s.notMeasurable.length === 0,
      detail: `${s.outcomes.length - s.notMeasurable.length} of ${s.outcomes.length} say who, what changes, how much and by when`,
      rows: s.notMeasurable.map(el),
    },
    {
      title: 'Connections copied by the split are reviewed',
      done: s.inherited.length === 0,
      detail: s.inherited.length === 0 ? 'Nothing left to confirm' : `${s.inherited.length} still need a keep or remove`,
      rows: s.inherited.map((e) => ({ label: linkName(e), onClick: () => select({ kind: 'edge', id: e.id }, 'details') })),
    },
    {
      title: 'Open comments are resolved',
      done: s.open === 0,
      detail: s.open === 0 ? 'All clear' : `${s.open} open from your team`,
      rows: [],
      action: s.open > 0 && (
        <button className="btn tiny" onClick={() => setTab('comments')}>
          Go to comments
        </button>
      ),
    },
    {
      title: 'Lines cross as little as they can',
      done: crossings <= 4,
      soft: true,
      detail: `${crossings} crossing${crossings === 1 ? '' : 's'} between columns`,
      rows: [],
      action: (
        <button className="btn tiny" onClick={tidy}>
          <Wand2 size={12} /> Auto-arrange
        </button>
      ),
    },
    {
      title: 'Links with thin evidence are acknowledged',
      done: s.weak.length === 0,
      soft: true,
      detail: s.weak.length === 0 ? 'None flagged' : `${s.weak.length} flagged by Ken, drawn dashed on the canvas`,
      rows: s.weak.map((e) => ({ label: linkName(e), onClick: () => select({ kind: 'edge', id: e.id }, 'details') })),
    },
  ]
  const hard = items.filter((i) => !i.soft)
  const doneHard = hard.filter((i) => i.done).length

  return (
    <div className="tab-body">
      <div className="due-card">
        <div>
          <small>McCune Foundation · full proposal</small>
          <strong>Due Friday, Nov 20</strong>
        </div>
        <span className="days">
          {daysLeft}
          <small>days</small>
        </span>
      </div>
      <div className="progress" aria-label={`${doneHard} of ${hard.length} must-fix items done`}>
        <div style={{ width: `${(doneHard / hard.length) * 100}%` }} />
      </div>
      <p className="muted-p">
        {doneHard} of {hard.length} must-fix items done. {s.noEvidence.length} of {s.outcomes.length} outcomes have no evidence attached yet.
      </p>

      <ul className="checks">
        {items.map((i) => (
          <li key={i.title} className={cx(i.done && 'done', i.soft && 'soft')}>
            <span className="tick">{i.done ? <Check size={13} /> : null}</span>
            <div className="check-main">
              <strong>{i.title}</strong>
              <small>{i.detail}</small>
              {!i.done &&
                i.rows.map((r) => (
                  <button key={r.label} className="check-row" onClick={r.onClick}>
                    {r.lane && <i style={{ background: LANE_META[r.lane].color }} />}
                    {r.label}
                  </button>
                ))}
              {!i.done && i.action}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
