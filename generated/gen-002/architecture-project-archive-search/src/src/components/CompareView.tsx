import type { ReactNode } from 'react'
import { BY_ID, relatedFor } from '../data/generate'
import type { Project, Sheet } from '../data/types'
import { CURRENT_PROJECT, SPEC_TITLES } from '../data/vocab'
import { cx, fmt, highlight } from '../util'
import { ProjectImage } from './ProjectImage'
import { SheetImage } from './SheetImage'

interface Props {
  ids: string[]
  picked: string[]
  onTogglePick: (id: string) => void
  onRemove: (id: string) => void
  onClose: () => void
  onOpenSheets: (sheets: Sheet[], index: number) => void
  onPull: () => void
  terms: string[]
}

export function CompareView({ ids, picked, onTogglePick, onRemove, onClose, onOpenSheets, onPull, terms }: Props) {
  const ps = ids.map((id) => BY_ID.get(id)!).filter(Boolean)
  const sheetCount = picked.reduce((s, id) => s + (BY_ID.get(id)?.detailSheets.length ?? 0), 0)

  const rows: { label: string; render: (p: Project) => ReactNode; differs?: boolean }[] = [
    { label: 'Completed', render: (p) => <span className="cv-big">{p.year}</span> },
    { label: 'Client', render: (p) => `${p.client} (${p.sector})` },
    { label: 'Location', render: (p) => p.city },
    { label: 'Size', render: (p) => (p.stalls ? `${p.levels} levels · ${fmt(p.stalls)} stalls` : `${fmt(p.sizeSf)} sf · ${p.levels} levels`) },
    { label: 'Screen system', render: (p) => <span className="cv-facade">{highlight(p.facade, terms)}</span> },
    { label: 'Panel', render: (p) => p.panel ?? '—' },
    { label: 'Open area', render: (p) => p.openArea ?? '—' },
    { label: 'Support', render: (p) => p.support ?? '—' },
    {
      label: 'Detail sheets',
      render: (p) => (
        <div className="cv-sheets">
          {p.detailSheets.slice(0, 3).map((s, i) => (
            <button key={s.id} className="cv-sheet" onClick={() => onOpenSheets(p.detailSheets, i)} title={`${s.number} ${s.title}`}>
              <SheetImage sheet={s} project={p} />
              <span className="mono">{s.number}</span>
            </button>
          ))}
          {p.detailSheets.length > 3 && (
            <button className="cv-more" onClick={() => onOpenSheets(p.detailSheets, 3)}>
              +{p.detailSheets.length - 3}
            </button>
          )}
          <div className="cv-sheetcount">{p.detailSheets.length} sheets</div>
        </div>
      ),
    },
    {
      label: 'Spec sections',
      render: (p) => (
        <div className="cv-specs">
          {p.specs.map((s) => (
            <span key={s} className={cx('cv-spec', s === '05 75 00' && 'key')} title={SPEC_TITLES[s]}>
              {s}
            </span>
          ))}
        </div>
      ),
    },
    { label: 'Awards', render: (p) => (p.awards.length ? p.awards.join('; ') : <span className="dim">—</span>) },
    { label: 'Project lead', render: (p) => p.lead },
    {
      label: 'Pulled with',
      render: (p) => {
        const rel = relatedFor(p).filter((r) => ids.includes(r.project.id))
        return rel.length ? rel.map((r) => `${r.project.id} (${r.count}×)`).join(', ') : <span className="dim">Not with these</span>
      },
    },
  ]

  return (
    <div className="overlay cv" role="dialog" aria-modal="true" aria-label="Compare candidates">
      <div className="cv-top">
        <div>
          <h2>Comparing {ps.length} candidates</h2>
          <p className="dim">Pick two to pull detail drawings into {CURRENT_PROJECT.id} {CURRENT_PROJECT.name}.</p>
        </div>
        <button className="btn" onClick={onClose}>
          Back to results <kbd>Esc</kbd>
        </button>
      </div>

      <div className="cv-scroll">
        <div className="cv-grid" style={{ gridTemplateColumns: `168px repeat(${ps.length}, minmax(0, 1fr))` }}>
          <div className="cv-corner" />
          {ps.map((p) => {
            const on = picked.includes(p.id)
            return (
              <div key={p.id} className={cx('cv-head', on && 'picked')}>
                <div className="cv-img">
                  <ProjectImage p={p} />
                  <button className="cv-x" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.id}`}>
                    ×
                  </button>
                </div>
                <span className="mono pnum">{p.id}</span>
                <h3>{p.name}</h3>
                <button className={cx('pick-btn', on && 'on')} onClick={() => onTogglePick(p.id)} aria-pressed={on}>
                  <span className="pick-box" aria-hidden>
                    {on ? '✓' : ''}
                  </span>
                  {on ? `Pulling ${p.detailSheets.length} sheets` : 'Pull drawings from this'}
                </button>
              </div>
            )
          })}
          {rows.map((r) => (
            <Row key={r.label} label={r.label} ps={ps} picked={picked} render={r.render} />
          ))}
        </div>
      </div>

      <div className="cv-foot">
        <div className="cv-foot-text">
          {picked.length === 0 && 'Pick the two projects to pull detail drawings from.'}
          {picked.length === 1 && (
            <>
              <b>{picked[0]}</b> picked — pick one more, or pull from this one only.
            </>
          )}
          {picked.length === 2 && (
            <>
              <b>{picked[0]}</b> + <b>{picked[1]}</b> · {sheetCount} detail sheets
            </>
          )}
        </div>
        <button className="btn btn-primary btn-lg" disabled={picked.length === 0} onClick={onPull}>
          Pull detail drawings{picked.length ? ` from ${picked.length} project${picked.length > 1 ? 's' : ''}` : ''} →
        </button>
      </div>
    </div>
  )
}

function Row({ label, ps, picked, render }: { label: string; ps: Project[]; picked: string[]; render: (p: Project) => ReactNode }) {
  return (
    <>
      <div className="cv-label">{label}</div>
      {ps.map((p) => (
        <div key={p.id} className={cx('cv-cell', picked.includes(p.id) && 'picked')}>
          {render(p)}
        </div>
      ))}
    </>
  )
}
