import { useMemo, useState } from 'react';
import { SITES } from '../data/sites.js';
import { ORG_TYPES, NEIGHBORHOODS, STATIONS, SLOTS } from '../data/network.js';
import * as P from '../lib/placement.js';
import { OrgBadge, SlotChips, RouteChips, SeatBar, Tag, plural } from './ui.jsx';

const TYPES = Object.keys(ORG_TYPES);
const EXTENSION_STOPS = new Set(STATIONS.filter((s) => s.extension).map((s) => s.name));

const SORTS = {
  name: (a, b) => a.site.name.localeCompare(b.site.name),
  type: (a, b) => a.site.type.localeCompare(b.site.type) || a.site.name.localeCompare(b.site.name),
  neighborhood: (a, b) => a.site.neighborhood.localeCompare(b.site.neighborhood),
  open: (a, b) => a.open - b.open,
  fill: (a, b) => a.fillRatio - b.fillRatio,
  campusMin: (a, b) => a.site.campusMin - b.site.campusMin,
};

export default function SitesView({ students, assignments, counts }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [hood, setHood] = useState('all');
  const [slot, setSlot] = useState('all');
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState({ key: 'open', dir: 'desc' });
  const [selectedId, setSelectedId] = useState(null);

  const rows = useMemo(
    () =>
      SITES.map((site) => {
        const filled = counts[site.id] || 0;
        return { site, filled, open: site.capacity - filled, fillRatio: filled / site.capacity };
      }),
    [counts],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(({ site, open }) => {
      if (type !== 'all' && site.type !== type) return false;
      if (hood !== 'all' && site.neighborhood !== hood) return false;
      if (slot !== 'all' && !site.slots.includes(slot)) return false;
      if (openOnly && open <= 0) return false;
      if (!q) return true;
      return [site.name, site.address, site.stop, site.neighborhood, site.type, ...site.routes]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    const cmp = SORTS[sort.key];
    filtered.sort((a, b) => (sort.dir === 'asc' ? cmp(a, b) : cmp(b, a)));
    return filtered;
  }, [rows, query, type, hood, slot, openOnly, sort]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, r) => ({ cap: acc.cap + r.site.capacity, filled: acc.filled + r.filled, open: acc.open + Math.max(0, r.open) }),
        { cap: 0, filled: 0, open: 0 },
      ),
    [visible],
  );

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'type' || key === 'neighborhood' || key === 'campusMin' ? 'asc' : 'desc' }));

  const selected = selectedId ? rows.find((r) => r.site.id === selectedId) : null;
  const placedHere = selected
    ? students.filter((s) => assignments[s.id] === selected.site.id)
    : [];

  const header = (key, label, className = '') => (
    <th className={className} aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button className="th-btn" onClick={() => toggleSort(key)}>
        {label}
        <span className="sort-ind" aria-hidden="true">
          {sort.key === key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
        </span>
      </button>
    </th>
  );

  return (
    <div className="sites-view">
      <div className="toolbar">
        <input
          className="search wide"
          type="search"
          placeholder="Search site, address, stop, route"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search sites"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Organization type">
          <option value="all">All organization types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={hood} onChange={(e) => setHood(e.target.value)} aria-label="Neighborhood">
          <option value="all">All neighborhoods</option>
          {NEIGHBORHOODS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.id}
            </option>
          ))}
        </select>
        <select value={slot} onChange={(e) => setSlot(e.target.value)} aria-label="Time slot">
          <option value="all">Any time slot</option>
          {Object.entries(SLOTS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
          Open seats only
        </label>
        <span className="toolbar-summary muted small">
          {visible.length} sites · {totals.filled} of {totals.cap} seats filled · {totals.open} open
        </span>
      </div>

      <div className={`sites-body${selected ? ' with-drawer' : ''}`}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {header('name', 'Site')}
                {header('type', 'Type')}
                {header('neighborhood', 'Neighborhood')}
                {header('fill', 'Seats filled', 'num')}
                {header('open', 'Open', 'num')}
                <th>Time slots</th>
                <th>Nearest stop</th>
                {header('campusMin', 'Campus min', 'num')}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const { site } = r;
                const isSelected = selectedId === site.id;
                return (
                  <tr
                    key={site.id}
                    className={`${isSelected ? 'selected ' : ''}${r.open <= 0 ? 'is-full' : ''}`}
                    onClick={() => setSelectedId(isSelected ? null : site.id)}
                  >
                    <td>
                      <div className="site-name">{site.name}</div>
                      <div className="muted small">{site.address}</div>
                    </td>
                    <td>
                      <OrgBadge type={site.type} />
                    </td>
                    <td>{site.neighborhood}</td>
                    <td className="num">
                      <div className="seat-cell">
                        <span>
                          {r.filled}/{site.capacity}
                        </span>
                        <SeatBar filled={r.filled} capacity={site.capacity} />
                      </div>
                    </td>
                    <td className="num">
                      <span className={`open-n${r.open <= 0 ? ' zero' : r.open <= 1 ? ' low' : ''}`}>
                        {r.open <= 0 ? 'Full' : r.open}
                      </span>
                    </td>
                    <td>
                      <SlotChips codes={site.slots} />
                    </td>
                    <td>
                      <div>{site.stop}</div>
                      {EXTENSION_STOPS.has(site.stop) && <Tag tone="rail">New Blue Line stop</Tag>}
                    </td>
                    <td className="num">{site.campusMin}</td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    No sites match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <aside className="drawer" aria-label={`${selected.site.name} details`}>
            <div className="drawer-head">
              <div>
                <OrgBadge type={selected.site.type} />
                <h2>{selected.site.name}</h2>
                <p className="muted">
                  {selected.site.address} · {selected.site.neighborhood}
                </p>
              </div>
              <button className="btn icon" onClick={() => setSelectedId(null)} aria-label="Close details">
                ×
              </button>
            </div>

            <div className="drawer-stats">
              <div>
                <span>Filled</span>
                <strong>
                  {selected.filled} / {selected.site.capacity}
                </strong>
              </div>
              <div>
                <span>Open</span>
                <strong className={selected.open <= 0 ? 'danger-text' : ''}>{Math.max(0, selected.open)}</strong>
              </div>
              <div>
                <span>Campus</span>
                <strong>{selected.site.campusMin} min</strong>
              </div>
            </div>

            <h3 className="section-title">Transit access</h3>
            <p>
              Nearest stop: <strong>{selected.site.stop}</strong>
              {EXTENSION_STOPS.has(selected.site.stop) && <Tag tone="rail">New Blue Line stop</Tag>}
            </p>
            <RouteChips routes={selected.site.routes} />

            <h3 className="section-title">Time slots offered</h3>
            <ul className="slot-list">
              {selected.site.slots.map((code) => (
                <li key={code}>{SLOTS[code]}</li>
              ))}
            </ul>

            <h3 className="section-title">
              Placed here <span className="muted small">{plural(placedHere.length, 'student')}</span>
            </h3>
            {placedHere.length === 0 && <p className="muted small">Nobody placed here yet.</p>}
            <ul className="roster-mini">
              {placedHere.map((s) => (
                <li key={s.id}>
                  <span>{s.name}</span>
                  <span className="muted small">
                    {s.course} · {s.neighborhood}
                    <> · ~{P.estimateMinutes(s, selected.site)} min</>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
