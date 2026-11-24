import { memo, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Project } from '../data/types'
import { SPEC_TITLES } from '../data/vocab'
import { FIELD_LABEL, YEAR_MAX, YEAR_MIN, type Filters, type Hit, type ParsedQuery, type SearchResult, type SortKey } from '../search'
import { cx, highlight, matchesAny } from '../util'
import { ProjectImage } from './ProjectImage'

interface Props {
  query: string
  pq: ParsedQuery
  search: SearchResult
  filters: Filters
  setFilters: Dispatch<SetStateAction<Filters>>
  sort: SortKey
  setSort: (s: SortKey) => void
  selectedId: string | null
  onSelect: (id: string) => void
  compare: string[]
  onToggleCompare: (id: string) => void
  onReset: () => void
}

const PAGE = 40

export function Results({ query, pq, search, filters, setFilters, sort, setSort, selectedId, onSelect, compare, onToggleCompare, onReset }: Props) {
  const [limit, setLimit] = useState(PAGE)
  const listRef = useRef<HTMLDivElement>(null)
  const { results } = search

  useEffect(() => setLimit(PAGE), [search])

  useEffect(() => {
    if (!selectedId || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-id="${selectedId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const chips: { label: string; remove: () => void }[] = []
  for (const t of filters.types) chips.push({ label: t, remove: () => setFilters((f) => ({ ...f, types: f.types.filter((x) => x !== t) })) })
  if (filters.yearMin !== YEAR_MIN || filters.yearMax !== YEAR_MAX)
    chips.push({ label: `Completed ${filters.yearMin}–${filters.yearMax}`, remove: () => setFilters((f) => ({ ...f, yearMin: YEAR_MIN, yearMax: YEAR_MAX })) })
  for (const m of filters.materials) chips.push({ label: m, remove: () => setFilters((f) => ({ ...f, materials: f.materials.filter((x) => x !== m) })) })
  for (const s of filters.sectors) chips.push({ label: `${s} client`, remove: () => setFilters((f) => ({ ...f, sectors: f.sectors.filter((x) => x !== s) })) })
  for (const s of filters.specs) chips.push({ label: `${s} ${SPEC_TITLES[s]}`, remove: () => setFilters((f) => ({ ...f, specs: f.specs.filter((x) => x !== s) })) })
  for (const l of filters.leads) chips.push({ label: `Lead: ${l}`, remove: () => setFilters((f) => ({ ...f, leads: f.leads.filter((x) => x !== l) })) })
  if (filters.awardsOnly) chips.push({ label: 'Award-winning', remove: () => setFilters((f) => ({ ...f, awardsOnly: false })) })

  const suggestions = pq.interps.filter((i) => !filters[i.facet].includes(i.value))

  return (
    <section className="results" aria-label="Results">
      <div className="results-head">
        <div className="results-count">
          <span className="big">{results.length}</span>
          <span className="of">
            {results.length === 1 ? 'project' : 'projects'}
            {query.trim() ? (
              <>
                {' '}
                matching <q>{query.trim()}</q>
              </>
            ) : null}
          </span>
          <label className="sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="relevance">Best match</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="details">Most detail sheets</option>
            </select>
          </label>
        </div>
        {(chips.length > 0 || suggestions.length > 0) && (
          <div className="chips">
            {chips.map((c) => (
              <button key={c.label} className="chip" onClick={c.remove} title="Remove filter">
                {c.label}
                <span className="chip-x" aria-hidden>
                  ×
                </span>
              </button>
            ))}
            {suggestions.map((s) => (
              <button key={s.value} className="chip suggest" onClick={() => setFilters((f) => ({ ...f, [s.facet]: [...f[s.facet], s.value] }))} title={`From “${s.from}” in your search`}>
                <span className="plus" aria-hidden>
                  +
                </span>
                {s.facet === 'sectors' ? `${s.value} client` : s.value}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="results-list" ref={listRef}>
        {results.slice(0, limit).map((p, i) => (
          <ResultRow
            key={p.id}
            p={p}
            rank={i + 1}
            hit={search.scored?.get(p.id)}
            terms={pq.highlight}
            selected={p.id === selectedId}
            inCompare={compare.includes(p.id)}
            onSelect={onSelect}
            onToggleCompare={onToggleCompare}
          />
        ))}
        {results.length > limit && (
          <button className="load-more" onClick={() => setLimit(limit + PAGE)}>
            Show {Math.min(PAGE, results.length - limit)} more of {results.length - limit} remaining
          </button>
        )}
        {results.length === 0 && (
          <div className="empty">
            <h3>Nothing matches all of that.</h3>
            <p>
              {search.baseCount > 0
                ? `${search.baseCount} projects match the search words — the filters are excluding them. Try widening the year range or removing a filter.`
                : 'Try fewer words, or a material or client name.'}
            </p>
            <button className="btn" onClick={onReset}>
              Back to “perforated metal screen” in parking
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

interface RowProps {
  p: Project
  rank: number
  hit?: Hit
  terms: string[]
  selected: boolean
  inCompare: boolean
  onSelect: (id: string) => void
  onToggleCompare: (id: string) => void
}

const ResultRow = memo(function ResultRow({ p, hit, terms, selected, inCompare, onSelect, onToggleCompare }: RowProps) {
  const why = hit?.fields.filter((f) => f !== 'summary').map((f) => FIELD_LABEL[f]) ?? []
  return (
    <article className={cx('row', selected && 'sel', inCompare && 'cmp')} data-id={p.id} onClick={() => onSelect(p.id)} aria-selected={selected}>
      <div className="row-thumb">
        <ProjectImage p={p} />
        {p.awards.length > 0 && (
          <span className="award-badge" title={p.awards.join('; ')}>
            Award
          </span>
        )}
      </div>
      <div className="row-body">
        <div className="row-meta">
          <span className="mono pnum">{p.id}</span>
          <span>Completed {p.year}</span>
          <span>{p.city}</span>
        </div>
        <h2 className="row-title">{highlight(p.name, terms)}</h2>
        <div className="row-client">
          {highlight(p.client, terms)} <span className="dim">· Lead {p.lead}</span>
        </div>
        <p className="row-facade">{highlight(p.facade, terms)}</p>
        <div className="row-tags">
          {p.materials.map((m) => (
            <span key={m} className={cx('tag', matchesAny(m, terms) && 'hit')}>
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="row-side">
        <button
          className={cx('cmp-btn', inCompare && 'on')}
          onClick={(e) => {
            e.stopPropagation()
            onToggleCompare(p.id)
          }}
          aria-pressed={inCompare}
        >
          {inCompare ? '✓ In compare' : '+ Compare'}
        </button>
        <dl className="row-stats">
          <div>
            <dt>Detail sheets</dt>
            <dd>{p.detailSheets.length}</dd>
          </div>
          <div>
            <dt>Photos</dt>
            <dd>{p.photos}</dd>
          </div>
        </dl>
        {why.length > 0 && <div className="row-why">Matched {why.slice(0, 2).join(', ')}</div>}
      </div>
    </article>
  )
})
