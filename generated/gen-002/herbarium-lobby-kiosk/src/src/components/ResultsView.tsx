import { useMemo } from 'react';
import { SEASON_LABELS } from '../data/collection';
import {
  DATA_YEAR_MAX,
  DATA_YEAR_MIN,
  SPECIMENS,
  applyFilters,
  countyCounts,
  earliestAndLatest,
  isDefaultFilters,
  sortSpecimens,
  speciesCounts,
  undatedMonthCount,
} from '../lib/model';
import { formatDate, formatMiles } from '../lib/format';
import type { Filters, SortKey, Specimen } from '../types';
import { FilterPanel } from './FilterPanel';
import { MapView } from './MapView';
import { SheetThumb } from './SheetThumb';

interface ResultsViewProps {
  filters: Filters;
  sort: SortKey;
  tab: 'sheets' | 'map';
  canUndo: boolean;
  onChange: (patch: Partial<Filters>, coalesce?: boolean) => void;
  onClear: () => void;
  onUndo: () => void;
  onSort: (sort: SortKey) => void;
  onTab: (tab: 'sheets' | 'map') => void;
  onOpen: (id: string) => void;
  onCompare: (leftId: string, rightId: string) => void;
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'date-asc', label: 'Earliest first' },
  { value: 'date-desc', label: 'Most recent first' },
  { value: 'distance', label: 'Nearest the preserve' },
  { value: 'catalog', label: 'Catalog number' },
];

export function ResultsView(props: ResultsViewProps) {
  const { filters, sort, tab, canUndo, onChange, onClear, onUndo, onSort, onTab, onOpen, onCompare } = props;

  const matched = useMemo(() => applyFilters(SPECIMENS, filters), [filters]);
  const results = useMemo(() => sortSpecimens(matched, sort), [matched, sort]);
  const spCounts = useMemo(() => speciesCounts(SPECIMENS, filters), [filters]);
  const coCounts = useMemo(() => countyCounts(SPECIMENS, filters), [filters]);
  const pair = useMemo(() => earliestAndLatest(matched), [matched]);
  const hiddenUndated = useMemo(() => undatedMonthCount(SPECIMENS, filters), [filters]);

  const chips = activeChips(filters, onChange);
  const showRattaniiHint =
    !filters.earlierNames && filters.text.toLowerCase().includes('rattanii') && matched.length === 0;

  return (
    <div className="results">
      <aside className="filters" aria-label="Filters">
        <div className="filters__head">
          <h2>Narrow the sheets</h2>
          {!isDefaultFilters(filters) && (
            <button type="button" className="link" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>
        <FilterPanel filters={filters} speciesCounts={spCounts} countyCounts={coCounts} onChange={onChange} />
      </aside>

      <section className="results__main">
        <div className="toolbar">
          <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="results-search" className="visually-hidden">
              Search within these sheets
            </label>
            <input
              id="results-search"
              type="search"
              className="search__input"
              placeholder="Name, collector, place, or catalog number"
              value={filters.text}
              onChange={(e) => onChange({ text: e.target.value }, true)}
              autoComplete="off"
            />
          </form>

          <div className="toolbar__row">
            <p className="count" aria-live="polite">
              <strong>{matched.length.toLocaleString('en-US')}</strong>
              <span> of {SPECIMENS.length} Penstemon sheets</span>
            </p>
            <div className="tabs" role="tablist" aria-label="View">
              <button type="button" role="tab" aria-selected={tab === 'sheets'} className="tab" onClick={() => onTab('sheets')}>
                Sheets
              </button>
              <button type="button" role="tab" aria-selected={tab === 'map'} className="tab" onClick={() => onTab('map')}>
                Map
              </button>
            </div>
            <label className="sort">
              <span>Order</span>
              <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn" onClick={onUndo} disabled={!canUndo}>
              Undo last change
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!pair}
              onClick={() => pair && onCompare(pair[0].catalogNumber, pair[1].catalogNumber)}
            >
              {pair ? `Compare ${pair[0].date.year} with ${pair[1].date.year}` : 'Compare earliest and latest'}
            </button>
          </div>

          {chips.length > 0 && (
            <ul className="active-chips" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.key}>
                  <button type="button" className="active-chip" onClick={c.remove} aria-label={`Remove filter: ${c.label}`}>
                    {c.label} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hiddenUndated > 0 && (
            <p className="notice">
              {hiddenUndated === 1 ? '1 sheet has a year but no month' : `${hiddenUndated} sheets have a year but no month`}, so
              the season filter cannot place {hiddenUndated === 1 ? 'it' : 'them'}.
            </p>
          )}
        </div>

        {matched.length === 0 ? (
          <div className="empty">
            <h3>No sheets match these filters.</h3>
            {showRattaniiHint ? (
              <p>
                Earlier determinations are off. Turn on <em>Include earlier determinations</em> to find sheets first identified
                under a name that has since changed.
              </p>
            ) : (
              <p>Remove one filter, or use Undo last change to step back.</p>
            )}
          </div>
        ) : tab === 'sheets' ? (
          <ul className="grid">
            {results.map((s) => (
              <li key={s.catalogNumber}>
                <SheetCard spec={s} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ) : (
          <MapView results={results} onOpen={onOpen} />
        )}
      </section>
    </div>
  );
}

function SheetCard({ spec, onOpen }: { spec: Specimen; onOpen: (id: string) => void }) {
  const reidentified = spec.determinations.length > 1;
  return (
    <button type="button" className="card" onClick={() => onOpen(spec.catalogNumber)}>
      <SheetThumb spec={spec} />
      <div className="card__body">
        <div className="card__name">
          <em>{spec.currentName}</em>
        </div>
        <div className="card__date">{formatDate(spec.date)}</div>
        <div className="card__meta">
          {spec.collector} {spec.collectorNumber}
        </div>
        <div className="card__place">{spec.locality}</div>
        <div className="card__foot">
          <span>
            {spec.county} Co. · {formatMiles(spec.distanceMi)}
          </span>
          <span className="card__cat">{spec.catalogNumber}</span>
        </div>
        <div className="card__tags">
          {reidentified && <span className="tag">Re-identified</span>}
          {!spec.imaged && <span className="tag tag--warn">On loan</span>}
        </div>
      </div>
    </button>
  );
}

interface Chip {
  key: string;
  label: string;
  remove: () => void;
}

function activeChips(f: Filters, onChange: (patch: Partial<Filters>) => void): Chip[] {
  const chips: Chip[] = [];
  if (f.text.trim()) chips.push({ key: 'text', label: `“${f.text.trim()}”`, remove: () => onChange({ text: '' }) });
  for (const ep of f.species) {
    chips.push({
      key: `sp-${ep}`,
      label: `Penstemon ${ep}`,
      remove: () => onChange({ species: f.species.filter((x) => x !== ep) }),
    });
  }
  for (const c of f.counties) {
    chips.push({ key: `co-${c}`, label: `${c} Co.`, remove: () => onChange({ counties: f.counties.filter((x) => x !== c) }) });
  }
  if (f.yearFrom !== DATA_YEAR_MIN || f.yearTo !== DATA_YEAR_MAX) {
    chips.push({
      key: 'years',
      label: `Collected ${f.yearFrom}–${f.yearTo}`,
      remove: () => onChange({ yearFrom: DATA_YEAR_MIN, yearTo: DATA_YEAR_MAX }),
    });
  }
  for (const s of f.seasons) {
    chips.push({
      key: `se-${s}`,
      label: SEASON_LABELS[s].split(' (')[0],
      remove: () => onChange({ seasons: f.seasons.filter((x) => x !== s) }),
    });
  }
  if (f.radiusMi !== null) {
    chips.push({ key: 'radius', label: `Within ${f.radiusMi} mi`, remove: () => onChange({ radiusMi: null }) });
  }
  for (const p of f.phenology) {
    chips.push({
      key: `ph-${p}`,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      remove: () => onChange({ phenology: f.phenology.filter((x) => x !== p) }),
    });
  }
  if (f.imagedOnly) chips.push({ key: 'imaged', label: 'Imaged only', remove: () => onChange({ imagedOnly: false }) });
  if (!f.earlierNames) {
    chips.push({ key: 'current', label: 'Current names only', remove: () => onChange({ earlierNames: true }) });
  }
  return chips;
}
