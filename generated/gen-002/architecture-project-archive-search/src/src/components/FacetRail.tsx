import { useState, type Dispatch, type SetStateAction } from 'react'
import { BUILDING_TYPES, SECTORS, SPEC_TITLES } from '../data/vocab'
import { YEAR_MAX, YEAR_MIN, type Filters, type SearchResult } from '../search'
import { cx } from '../util'
import { YearRange } from './YearRange'

interface Props {
  search: SearchResult
  filters: Filters
  setFilters: Dispatch<SetStateAction<Filters>>
}

type ListKey = 'types' | 'sectors' | 'materials' | 'specs' | 'leads'

export function FacetRail({ search, filters, setFilters }: Props) {
  const toggle = (key: ListKey, v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }))

  const typeValues = BUILDING_TYPES.map(([t]) => t)
  const matValues = [...search.facets.materials.keys()]
  const specValues = Object.keys(SPEC_TITLES)
  const leadValues = [...search.facets.leads.keys()].sort()

  return (
    <aside className="rail" aria-label="Filters">
      <Facet
        title="Building type"
        values={typeValues}
        counts={search.facets.types}
        selected={filters.types}
        onToggle={(v) => toggle('types', v)}
        onClear={() => setFilters((f) => ({ ...f, types: [] }))}
        initial={6}
      />

      <section className="facet">
        <div className="facet-head">
          <h3>Completed</h3>
          {(filters.yearMin !== YEAR_MIN || filters.yearMax !== YEAR_MAX) && (
            <button className="link" onClick={() => setFilters((f) => ({ ...f, yearMin: YEAR_MIN, yearMax: YEAR_MAX }))}>
              Any year
            </button>
          )}
        </div>
        <YearRange counts={search.facets.years} min={filters.yearMin} max={filters.yearMax} onChange={(a, b) => setFilters((f) => ({ ...f, yearMin: a, yearMax: b }))} />
      </section>

      <Facet
        title="Material"
        hint="All selected must match"
        values={matValues}
        counts={search.facets.materials}
        selected={filters.materials}
        onToggle={(v) => toggle('materials', v)}
        onClear={() => setFilters((f) => ({ ...f, materials: [] }))}
        initial={7}
        sortByCount
      />

      <Facet
        title="Client sector"
        values={SECTORS}
        counts={search.facets.sectors}
        selected={filters.sectors}
        onToggle={(v) => toggle('sectors', v)}
        onClear={() => setFilters((f) => ({ ...f, sectors: [] }))}
        initial={5}
        sortByCount
      />

      <section className="facet">
        <label className="facet-toggle">
          <input type="checkbox" checked={filters.awardsOnly} onChange={(e) => setFilters((f) => ({ ...f, awardsOnly: e.target.checked }))} />
          <span className="box" aria-hidden />
          <span className="facet-label">Award-winning only</span>
          <span className="facet-count">{search.facets.awards}</span>
        </label>
      </section>

      <Facet
        title="Spec section"
        values={specValues}
        counts={search.facets.specs}
        selected={filters.specs}
        onToggle={(v) => toggle('specs', v)}
        onClear={() => setFilters((f) => ({ ...f, specs: [] }))}
        initial={5}
        sortByCount
        render={(v) => (
          <>
            <span className="mono spec-code">{v}</span> {SPEC_TITLES[v]}
          </>
        )}
      />

      <Facet
        title="Project lead"
        values={leadValues}
        counts={search.facets.leads}
        selected={filters.leads}
        onToggle={(v) => toggle('leads', v)}
        onClear={() => setFilters((f) => ({ ...f, leads: [] }))}
        initial={4}
        sortByCount
      />
    </aside>
  )
}

interface FacetProps {
  title: string
  hint?: string
  values: string[]
  counts: Map<string, number>
  selected: string[]
  onToggle: (v: string) => void
  onClear: () => void
  initial: number
  sortByCount?: boolean
  render?: (v: string) => React.ReactNode
}

function Facet({ title, hint, values, counts, selected, onToggle, onClear, initial, sortByCount, render }: FacetProps) {
  const [open, setOpen] = useState(false)
  let list = [...new Set([...values, ...selected])]
  if (sortByCount) list.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b))
  list = list.filter((v) => selected.includes(v) || (counts.get(v) ?? 0) > 0 || !sortByCount)
  const shown = open ? list : list.slice(0, initial)
  for (const s of selected) if (!shown.includes(s)) shown.push(s)
  return (
    <section className="facet">
      <div className="facet-head">
        <h3>{title}</h3>
        {selected.length > 0 && (
          <button className="link" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {hint && selected.length > 1 && <p className="facet-hint">{hint}</p>}
      {shown.length === 0 && <p className="facet-hint">None in these results</p>}
      <ul>
        {shown.map((v) => {
          const n = counts.get(v) ?? 0
          const on = selected.includes(v)
          return (
            <li key={v}>
              <label className={cx('facet-item', on && 'on', !n && !on && 'zero')}>
                <input type="checkbox" checked={on} onChange={() => onToggle(v)} />
                <span className="box" aria-hidden />
                <span className="facet-label">{render ? render(v) : v}</span>
                <span className="facet-count">{n}</span>
              </label>
            </li>
          )
        })}
      </ul>
      {list.length > initial && (
        <button className="link more" onClick={() => setOpen(!open)}>
          {open ? 'Show fewer' : `Show all ${list.length}`}
        </button>
      )}
    </section>
  )
}
