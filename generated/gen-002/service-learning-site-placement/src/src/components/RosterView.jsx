import { useMemo, useState } from 'react';
import * as P from '../lib/placement.js';
import { COURSES, NEIGHBORHOODS } from '../data/network.js';
import { SITES } from '../data/sites.js';
import { SlotChips, Tag } from './ui.jsx';

export default function RosterView({ students, assignments, onUnassign, onAssignFromRoster }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all'); // all | placed | unplaced | changed
  const [siteFilter, setSiteFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [hoodFilter, setHoodFilter] = useState('all');

  const baseline = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s.siteId ?? null])), [students]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .map((s) => {
        const siteId = assignments[s.id] ?? null;
        const site = siteId ? P.SITE_BY_ID[siteId] : null;
        const minutes = site ? P.estimateMinutes(s, site) : null;
        return { s, siteId, site, minutes, changed: siteId !== baseline[s.id] };
      })
      .filter(({ s, siteId, changed }) => {
        if (status === 'placed' && !siteId) return false;
        if (status === 'unplaced' && siteId) return false;
        if (status === 'changed' && !changed) return false;
        if (siteFilter !== 'all' && siteId !== siteFilter) return false;
        if (courseFilter !== 'all' && s.course !== courseFilter) return false;
        if (hoodFilter !== 'all' && s.neighborhood !== hoodFilter) return false;
        if (!q) return true;
        return [s.name, s.id, s.course, s.neighborhood, s.mode, siteId ? P.SITE_BY_ID[siteId].name : 'unplaced']
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => a.s.name.localeCompare(b.s.name));
  }, [students, assignments, baseline, query, status, siteFilter, courseFilter, hoodFilter]);

  const placedCount = students.filter((s) => assignments[s.id]).length;
  const changedCount = students.filter((s) => (assignments[s.id] ?? null) !== (s.siteId ?? null)).length;

  return (
    <div className="roster-view">
      <div className="toolbar">
        <input
          className="search wide"
          type="search"
          placeholder="Search name, ID, course, neighborhood, site"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search roster"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All students</option>
          <option value="placed">Placed</option>
          <option value="unplaced">Unplaced</option>
          <option value="changed">Changed this browser</option>
        </select>
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} aria-label="Site">
          <option value="all">Any site</option>
          {SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} aria-label="Course">
          <option value="all">Any course</option>
          {Object.entries(COURSES).map(([code, c]) => (
            <option key={code} value={code}>
              {code} · {c.title}
            </option>
          ))}
        </select>
        <select value={hoodFilter} onChange={(e) => setHoodFilter(e.target.value)} aria-label="Home neighborhood">
          <option value="all">Any home neighborhood</option>
          {NEIGHBORHOODS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.id}
            </option>
          ))}
        </select>
        <span className="toolbar-summary muted small">
          {placedCount} placed · {students.length - placedCount} unplaced · {changedCount} changed here · showing{' '}
          {rows.length}
        </span>
      </div>

      <div className="table-wrap roster-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Home</th>
              <th>Transit</th>
              <th>Can attend</th>
              <th>Site</th>
              <th className="num">Est. min</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, siteId, site, minutes, changed }) => (
              <tr key={s.id} className={changed ? 'changed' : ''}>
                <td>
                  <div className="site-name">{s.name}</div>
                  <div className="muted small">{s.id}</div>
                </td>
                <td>
                  <div>{s.course}</div>
                  <div className="muted small">{COURSES[s.course]?.title}</div>
                </td>
                <td>{s.neighborhood}</td>
                <td>{s.mode}</td>
                <td>
                  <SlotChips codes={s.availability} />
                </td>
                <td>{site ? site.name : <span className="muted">Not placed</span>}</td>
                <td className="num">{minutes ?? '—'}</td>
                <td>
                  {site ? <Tag tone="ok">Placed</Tag> : <Tag tone="warn">Unplaced</Tag>}
                  {changed && <Tag tone="fit">Changed</Tag>}
                </td>
                <td className="row-actions">
                  {siteId ? (
                    <button className="btn link" onClick={() => onUnassign(s)}>
                      Unplace
                    </button>
                  ) : (
                    <button className="btn link" onClick={() => onAssignFromRoster(s)}>
                      Find a site
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="empty">
                  No students match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
