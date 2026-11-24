import { useState } from 'react';
import { REGION_TOTAL, type Campground } from './data';
import { mustHaves } from './Detail';
import { Alert, Arrow, Clock, Heart } from './icons';
import { OperatorChip, Rating, Scene, fmtDrive, fmtNum } from './ui';

export type SortKey = 'best' | 'drive' | 'price' | 'rating' | 'open';

interface Props {
  list: Campground[];
  total: number;
  selectedId: string;
  onSelect: (id: string) => void;
  saved: string[];
  onToggleSave: (id: string) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  savedCgs: Campground[];
  onOpenCompare: () => void;
  onClearFilters: () => void;
  onShowAll: () => void;
  changed: boolean;
}

const PAGE = 30;

export default function Results(p: Props) {
  const [limit, setLimit] = useState(PAGE);
  const shown = p.list.slice(0, limit);
  return (
    <aside className="results" aria-label="Search results">
      <div className="r-head">
        <div className="r-count"><b>{p.list.length}</b> {p.list.length === 1 ? 'campground fits' : 'campgrounds fit'} your must-haves</div>
        <div className="muted small r-sub">
          {p.total} have a site open May 22–25 within 3 hr ({fmtNum(REGION_TOTAL)} in the region).{' '}
          {p.changed ? (
            <button className="link" onClick={p.onClearFilters}>Back to my must-haves</button>
          ) : (
            p.list.length < p.total && <button className="link muted-link" onClick={p.onShowAll}>Show all {p.total}</button>
          )}
        </div>
        <label className="select-wrap compact r-sort">
          <span className="sr-only">Sort by</span>
          <select value={p.sort} onChange={(e) => p.setSort(e.target.value as SortKey)} aria-label="Sort results">
            <option value="best">Best match</option>
            <option value="drive">Shortest drive</option>
            <option value="price">Lowest price</option>
            <option value="rating">Top rated</option>
            <option value="open">Most sites open</option>
          </select>
        </label>
      </div>
      <ul className="r-list">
        {shown.map((c) => (
          <ResultCard key={c.id} cg={c} selected={c.id === p.selectedId} saved={p.saved.includes(c.id)} onSelect={() => p.onSelect(c.id)} onToggleSave={() => p.onToggleSave(c.id)} />
        ))}
        {p.list.length > limit && (
          <li><button className="btn btn-secondary wide" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, p.list.length - limit)} more</button></li>
        )}
        {!p.list.length && (
          <li className="r-empty">
            <p>Nothing matches all of those. Try turning off one must-have, like shade or bike-friendly loops.</p>
            <button className="btn btn-secondary" onClick={p.onClearFilters}>Reset filters</button>
          </li>
        )}
      </ul>
      <div className="saved-tray">
        <div className="st-thumbs">
          {p.savedCgs.slice(0, 4).map((c) => (
            <button key={c.id} className="st-thumb" onClick={() => p.onSelect(c.id)} title={c.name}>
              <Scene cg={c} />
            </button>
          ))}
        </div>
        <div className="st-text">
          <b>{p.savedCgs.length} saved</b>
          <span className="muted small">for tonight’s decision</span>
        </div>
        <button className="btn btn-primary" onClick={p.onOpenCompare} disabled={p.savedCgs.length < 2}>
          Compare <Arrow size={15} />
        </button>
      </div>
    </aside>
  );
}

function ResultCard({ cg, selected, saved, onSelect, onToggleSave }: { cg: Campground; selected: boolean; saved: boolean; onSelect: () => void; onToggleSave: () => void }) {
  const warns = cg.mentions.filter((m) => m.tone === 'warn').slice(0, 2);
  const low = cg.openAll <= 6;
  return (
    <li className={`r-card ${selected ? 'sel' : ''}`}>
      <button className="r-card-hit" onClick={onSelect} aria-current={selected}>
        <span className="sr-only">Show {cg.name}</span>
      </button>
      <Scene cg={cg} className="r-photo" />
      <div className="r-body">
        <div className="r-title">
          <h3>{cg.name}</h3>
          <button className={`heart ${saved ? 'on' : ''}`} onClick={onToggleSave} aria-pressed={saved} aria-label={saved ? `Remove ${cg.name} from saved` : `Save ${cg.name}`}>
            <Heart size={18} filled={saved} />
          </button>
        </div>
        <div className="r-meta">
          <OperatorChip op={cg.operator} />
          <span className="muted">{cg.region}</span>
        </div>
        <div className="r-meta">
          <Rating value={cg.rating} count={cg.reviewCount} compact />
          <span className="sep">·</span>
          <span><Clock size={12} /> {fmtDrive(cg.driveMin)}</span>
          <span className="sep">·</span>
          <span><b>${cg.priceMin}–{cg.priceMax}</b><span className="muted">/night</span></span>
        </div>
        <div className="r-musts">
          {mustHaves(cg).map((m) => (
            <span key={m.key} className={`r-must ${m.ok ? (m.partial ? 'partial' : 'ok') : 'no'}`} title={m.label}>
              {m.icon}
            </span>
          ))}
          <span className={`r-open ${low ? 'low' : ''}`} title="Sites open all 3 nights">{low ? `Only ${cg.openAll} left` : `${cg.openAll} sites open`}</span>
        </div>
        {warns.length > 0 && (
          <div className="r-warn">
            <Alert size={12} /> {warns.map((w) => w.label).join(' · ')}
          </div>
        )}
      </div>
    </li>
  );
}
