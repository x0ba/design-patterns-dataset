import { useMemo, useState } from 'react';
import { CATEGORIES, type Issue, type Placements, type Vendor } from '../lib/types';
import { CATEGORY_COLOR } from '../lib/colors';

type Filter = 'all' | 'unplaced' | 'issues' | 'power';

interface Props {
  vendors: Vendor[];
  placements: Placements;
  issues: Issue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlace: (id: string) => void;
}

export function VendorPanel({ vendors, placements, issues, selectedId, onSelect, onPlace }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');

  const issueIds = useMemo(() => {
    const s = new Set<string>();
    for (const i of issues) if (i.level !== 'todo') i.vendorIds.forEach((id) => s.add(id));
    return s;
  }, [issues]);

  const matches = (v: Vendor) => {
    if (query && !`${v.name} ${v.boothNo}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (category && v.category !== category) return false;
    const placed = Boolean(placements[v.id]);
    if (filter === 'unplaced') return !placed;
    if (filter === 'issues') return !placed || issueIds.has(v.id);
    if (filter === 'power') return v.power;
    return true;
  };

  const sorted = [...vendors].sort((a, b) => a.boothNo.localeCompare(b.boothNo, 'en', { numeric: true }));
  const unplaced = sorted.filter((v) => !placements[v.id] && matches(v));
  const onFloor = sorted.filter((v) => placements[v.id] && matches(v));

  const chip = (key: Filter, label: string) => (
    <button key={key} className={`chip ${filter === key ? 'on' : ''}`} onClick={() => setFilter(key)} type="button">
      {label}
    </button>
  );

  const row = (v: Vendor) => {
    const placed = Boolean(placements[v.id]);
    const hasIssue = issueIds.has(v.id);
    const dimsText = v.size === 'hall' ? '2 m hallway' : v.size === '3x3' ? '3 × 3 m' : '3 × 2 m';
    return (
      <li key={v.id} className={`vrow ${selectedId === v.id ? 'sel' : ''}`}>
        <div className="vrow-line">
        <button className="vrow-main" type="button" onClick={() => onSelect(v.id)}>
          <span className="booth-no">{v.boothNo}</span>
          <span className="vrow-text">
            <span className="vrow-name">
              <span className="swatch" style={{ background: CATEGORY_COLOR[v.category] }} />
              {v.name}
            </span>
            <span className="vrow-meta">
              {v.category} · {dimsText}
              {v.power ? ' · ⚡ power' : ''}
              {v.lateNote ? ' · late' : ''}
            </span>
          </span>
          <span className="vrow-status">
            {!placed && <span className="tag tag-todo">Not placed</span>}
            {placed && hasIssue && <span className="tag tag-error">Issue</span>}
            {placed && !hasIssue && <span className="tag tag-ok">On floor</span>}
          </span>
        </button>
        </div>
        {!placed && (
          <div className="vrow-actions">
            <button className="ghost-btn small" type="button" onClick={() => onPlace(v.id)}>
              Find a spot
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="vendors">
      <div className="vendors-head">
        <input
          className="search"
          type="search"
          placeholder="Search vendors or booth no."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search vendors"
        />
        <div className="chips">
          {chip('all', 'All 44')}
          {chip('unplaced', 'Not placed')}
          {chip('issues', 'Issues')}
          {chip('power', 'Needs power')}
        </div>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {unplaced.length > 0 && (
        <>
          <div className="group-head warn">Not on the floor yet ({unplaced.length})</div>
          <ul className="vlist">{unplaced.map(row)}</ul>
        </>
      )}
      <div className="group-head">On the floor ({onFloor.length})</div>
      <ul className="vlist">{onFloor.map(row)}</ul>
      {unplaced.length + onFloor.length === 0 && <p className="empty">No vendors match these filters.</p>}
    </div>
  );
}
