import { useEffect, useState } from 'react';
import { SCAN_LABEL, TYPE_LABEL } from '../data/types';
import { DocHit, FacetKey, Filters, SortKey, FaultQuery, pagesMentioning, activeFilterCount } from '../lib/search';
import { fmtMonthYear, plural, years } from '../lib/format';
import { IconAlert, IconX, TypeIcon } from './icons';

interface Props {
  hits: DocHit[];
  total: number;
  filters: Filters;
  sort: SortKey;
  fault: FaultQuery;
  hasQuery: boolean;
  onSort: (s: SortKey) => void;
  onToggle: (key: FacetKey, value: string | number) => void;
  onClearFilters: () => void;
  onClearAll: () => void;
  onOpen: (id: string, page?: number) => void;
}

const PAGE = 20;

const filterLabel = (key: FacetKey, v: string | number) =>
  key === 'type' ? TYPE_LABEL[v as keyof typeof TYPE_LABEL] : key === 'scan' ? SCAN_LABEL[v as keyof typeof SCAN_LABEL] : key === 'decade' ? `${v}s` : String(v);

export function Results({ hits, total, filters, sort, fault, hasQuery, onSort, onToggle, onClearFilters, onClearAll, onOpen }: Props) {
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [hits]);
  const nFilters = activeFilterCount(filters);
  const narrowed = hasQuery || nFilters > 0;

  return (
    <section className="results" aria-label="Documents">
      <div className="results-head">
        <div>
          <h2 className="results-count">
            {narrowed ? plural(hits.length, 'document') : 'All documents'}
            {narrowed && <span className="muted"> of {total.toLocaleString('en-US')}</span>}
            {!narrowed && <span className="muted"> · {total.toLocaleString('en-US')}</span>}
          </h2>
        </div>
        <label className="sort">
          Sort by
          <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)}>
            {hasQuery && <option value="best">Best match</option>}
            <option value="added">Recently added</option>
            <option value="year">Newest product</option>
          </select>
        </label>
      </div>

      {nFilters > 0 && (
        <div className="chips">
          {(Object.keys(filters) as FacetKey[]).flatMap((k) =>
            (filters[k] as (string | number)[]).map((v) => (
              <button key={k + v} className="chip" onClick={() => onToggle(k, v)} title="Remove this filter">
                {filterLabel(k, v)} <IconX size={14} />
              </button>
            )),
          )}
          <button className="link-btn" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>
      )}

      {hits.length === 0 && (
        <div className="no-results">
          <h3>Nothing matches all of that.</h3>
          <p>Try fewer words, just the model number, or remove a filter.</p>
          <button className="btn" onClick={onClearAll}>
            Start again
          </button>
        </div>
      )}

      <ol className="cards">
        {hits.slice(0, shown).map((h) => (
          <ResultCard key={h.doc.id} hit={h} fault={fault} onOpen={onOpen} />
        ))}
      </ol>

      {hits.length > shown && (
        <div className="more-wrap">
          <button className="btn btn-quiet" onClick={() => setShown(shown + PAGE)}>
            Show {Math.min(PAGE, hits.length - shown)} more
          </button>
          <span className="muted">
            Showing {shown} of {hits.length.toLocaleString('en-US')}
          </span>
        </div>
      )}
    </section>
  );
}

function ResultCard({ hit, fault, onOpen }: { hit: DocHit; fault: FaultQuery; onOpen: (id: string, page?: number) => void }) {
  const d = hit.doc;
  const mentions = pagesMentioning(d.id, fault);
  const keys = d.contents?.filter((c) => c.key) ?? [];
  return (
    <li className={`card t-${d.type}`}>
      <button className="card-main" onClick={() => onOpen(d.id)}>
        <span className={`type-tile t-${d.type}`}>
          <TypeIcon type={d.type} size={26} />
        </span>
        <span className="card-text">
          <span className="card-type">{TYPE_LABEL[d.type]}</span>
          <span className="card-title">{d.title}</span>
          <span className="card-meta">
            <span className="models">
              {d.models.map((m) => (
                <span key={m} className={`model ${hit.matchedModels.includes(m) ? 'hit' : ''}`}>
                  {m}
                </span>
              ))}
            </span>
            <span>{years(d.yearFrom, d.yearTo)}</span>
            <span>{plural(d.pages, 'page')}</span>
            {d.language !== 'English' && <span className="lang">{d.language}</span>}
            <span className={`scan-badge s-${d.scan}`}>
              {d.scan !== 'good' && <IconAlert size={13} />}
              {d.scan === 'partial' && d.missingPages ? `${plural(d.missingPages.length, 'page')} missing` : SCAN_LABEL[d.scan]}
            </span>
          </span>
          {d.note && <span className="card-note">“{d.note}”</span>}
          <span className="card-by">
            Added by {d.contributor} · {fmtMonthYear(d.added)}
          </span>
        </span>
        <span className="open-cue">Open</span>
      </button>
      {(keys.length > 0 || mentions.length > 0 || hit.insideOnly.length > 0) && (
        <div className="card-inside">
          {mentions.length > 0 && (
            <div className="inside-row fault-row">
              <span className="inside-label">Mentions your fault on</span>
              {mentions.map((p) => (
                <button key={p} className="pg-btn" onClick={() => onOpen(d.id, p)}>
                  p.{p}
                </button>
              ))}
            </div>
          )}
          {keys.length > 0 && (
            <div className="inside-row">
              <span className="inside-label">Go straight to</span>
              {keys.map((c) => (
                <button key={c.page} className="pg-btn" onClick={() => onOpen(d.id, c.page)}>
                  {c.title} <span className="pg">p.{c.page}</span>
                </button>
              ))}
            </div>
          )}
          {hit.insideOnly.length > 0 && mentions.length === 0 && keys.length === 0 && (
            <div className="inside-row">
              <span className="inside-label">Found inside: “{hit.insideOnly.join('”, “')}”</span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
