import { useEffect, useRef, useState } from 'react'
import { relatedFor, SPEC_COUNTS } from '../data/generate'
import type { Project, Sheet } from '../data/types'
import { SPEC_TITLES } from '../data/vocab'
import { cx, fmt, highlight, matchesAny } from '../util'
import { ProjectImage } from './ProjectImage'
import { SheetImage } from './SheetImage'

interface Props {
  project: Project | null
  terms: string[]
  inCompare: boolean
  compare: string[]
  onToggleCompare: (id: string) => void
  onSelect: (id: string) => void
  onOpenSheets: (sheets: Sheet[], index: number) => void
  onFilterSpec: (code: string) => void
  activeSpecs: string[]
  inResults: boolean
}

const VIEWS = ['Exterior', 'Screen close-up', 'Corner', 'Dusk']

export function DetailPanel({ project: p, terms, inCompare, compare, onToggleCompare, onSelect, onOpenSheets, onFilterSpec, activeSpecs, inResults }: Props) {
  const [photo, setPhoto] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setPhoto(0)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [p?.id])

  if (!p) {
    return (
      <aside className="detail empty-detail">
        <p>Select a project to see its drawings, specs and related work.</p>
      </aside>
    )
  }

  const related = relatedFor(p)
  const b = p.breakdown

  return (
    <aside className="detail" aria-label={`${p.name} details`}>
      <div className="detail-scroll" ref={scrollRef}>
        <div className="hero">
          <ProjectImage p={p} variant={photo} className="hero-img" />
          <div className="hero-bar">
            <div className="hero-tabs" role="tablist" aria-label="Photos">
              {VIEWS.map((v, i) => (
                <button key={v} role="tab" aria-selected={photo === i} className={cx(photo === i && 'on')} onClick={() => setPhoto(i)}>
                  {v}
                </button>
              ))}
            </div>
            <span className="hero-count">{p.photos} photos</span>
          </div>
        </div>

        <div className="detail-head">
          <div className="row-meta">
            <span className="mono pnum">{p.id}</span>
            <span>Completed {p.year}</span>
            {!inResults && <span className="outside">Outside current filters</span>}
          </div>
          <h2>{p.name}</h2>
          <p className="detail-client">
            {p.client} · {p.city}
          </p>
          <p className="detail-summary">{p.summary}</p>
          <div className="detail-actions">
            <button className={cx('btn', inCompare ? 'btn-on' : 'btn-primary')} onClick={() => onToggleCompare(p.id)}>
              {inCompare ? '✓ In compare' : '+ Add to compare'}
            </button>
            <span className="kbd-hint">
              or press <kbd>C</kbd>
            </span>
          </div>
        </div>

        <dl className="facts">
          <div>
            <dt>Type</dt>
            <dd>
              {p.type}
              {p.stalls ? ` · ${p.levels} levels · ${fmt(p.stalls)} stalls` : ` · ${fmt(p.sizeSf)} sf`}
            </dd>
          </div>
          <div>
            <dt>Lead</dt>
            <dd>{p.lead}</dd>
          </div>
          <div className="wide">
            <dt>Facade</dt>
            <dd>{highlight(p.facade, terms)}</dd>
          </div>
          {p.openArea && (
            <div>
              <dt>Open area</dt>
              <dd>{p.openArea}</dd>
            </div>
          )}
          {p.panel && (
            <div>
              <dt>Panel</dt>
              <dd>{p.panel}</dd>
            </div>
          )}
        </dl>

        <div className="detail-tags">
          {p.materials.map((m) => (
            <span key={m} className={cx('tag', matchesAny(m, terms) && 'hit')}>
              {m}
            </span>
          ))}
        </div>

        {p.awards.length > 0 && (
          <div className="awards">
            {p.awards.map((a) => (
              <div key={a} className="award">
                <span className="award-dot" aria-hidden />
                {a}
              </div>
            ))}
          </div>
        )}

        <section className="dsec">
          <div className="dsec-head">
            <h3>Detail sheets</h3>
            <span className="dim">
              {p.detailSheets.length} envelope details · {p.drawings} drawings total
            </span>
          </div>
          <div className="sheet-grid">
            {p.detailSheets.map((s, i) => (
              <button key={s.id} className="sheet-tile" onClick={() => onOpenSheets(p.detailSheets, i)} title={`${s.number} ${s.title}`}>
                <SheetImage sheet={s} project={p} className="sheet-thumb" />
                <span className="sheet-num mono">{s.number}</span>
                <span className="sheet-title">{s.title}</span>
              </button>
            ))}
          </div>
          <div className="breakdown">
            {(
              [
                ['Plans', b.plans],
                ['Elevations', b.elevations],
                ['Sections', b.sections],
                ['Details', b.details],
                ['Consultant', b.consultant],
              ] as const
            ).map(([k, v]) => (
              <div key={k} style={{ flexGrow: Math.max(v, 4) }}>
                <span>{v}</span>
                {k}
              </div>
            ))}
          </div>
        </section>

        <section className="dsec">
          <div className="dsec-head">
            <h3>Spec sections</h3>
            <span className="dim">{p.specDocs} spec documents</span>
          </div>
          <ul className="spec-list">
            {p.specs.map((s) => {
              const on = activeSpecs.includes(s)
              return (
                <li key={s} className={cx(s === '05 75 00' && 'key')}>
                  <span className="mono spec-code">{s}</span>
                  <span className="spec-title">{SPEC_TITLES[s]}</span>
                  <button className="link" onClick={() => onFilterSpec(s)} disabled={on} title={`Filter archive to projects using ${s}`}>
                    {on ? 'Filtering' : `in ${SPEC_COUNTS.get(s)} projects`}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {related.length > 0 && (
          <section className="dsec">
            <div className="dsec-head">
              <h3>Often referenced together</h3>
            </div>
            <ul className="related">
              {related.map(({ project: q, count }) => (
                <li key={q.id}>
                  <button className="related-main" onClick={() => onSelect(q.id)}>
                    <ProjectImage p={q} className="related-img" />
                    <span className="related-text">
                      <span className="related-name">{q.name}</span>
                      <span className="dim">
                        <span className="mono">{q.id}</span> · {q.year} · pulled together {count}×
                      </span>
                    </span>
                  </button>
                  <button className={cx('cmp-mini', compare.includes(q.id) && 'on')} onClick={() => onToggleCompare(q.id)} aria-label={compare.includes(q.id) ? `Remove ${q.id} from compare` : `Add ${q.id} to compare`}>
                    {compare.includes(q.id) ? '✓' : '+'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}
