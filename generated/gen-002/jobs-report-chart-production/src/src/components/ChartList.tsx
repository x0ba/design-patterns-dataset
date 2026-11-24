import { PEOPLE, ME_ID } from '../data/seed';
import type { Chart, Filters, Status } from '../lib/types';
import { filteredCharts, hasRecheck, openCountFor, presenceGroups, STATUS_LIST } from '../lib/selectors';
import { useStore } from '../lib/store';
import { Avatar, StatusPill } from './ui';

const OWNERS = PEOPLE.filter((p) => p.role === 'analyst' || p.role === 'lead');

function ChartRow({ chart, selected, toMe, onSelect }: { chart: Chart; selected: boolean; toMe: number; onSelect: () => void }) {
  const { state } = useStore();
  const open = openCountFor(state.comments, chart.id);
  const active = chart.active.map((a) => a.personId);
  return (
    <button
      type="button"
      className={`chart-row ${selected ? 'selected' : ''}`}
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
    >
      <div className="row-top">
        <span className="cid">{chart.id}</span>
        <StatusPill status={chart.status} />
        <span className="ver">v{chart.version}</span>
      </div>
      <div className="row-title">{chart.headline}</div>
      <div className="row-meta">
        <span className="src">{chart.source}</span>
        <span className="geo">{chart.geography}</span>
        {open > 0 && (
          <span
            className={`badge ${toMe ? 'badge-me' : ''}`}
            title={`${open} open comment${open === 1 ? '' : 's'}${toMe ? `, ${toMe} addressed to you` : ''}`}
          >
            {toMe ? `${toMe} to you` : `${open} open`}
          </span>
        )}
        {hasRecheck(chart) && <span className="badge badge-warn">re-check</span>}
        {chart.hold && <span className="badge badge-danger">hold</span>}
        <span className="row-spacer" />
        {active.length > 0 && (
          <span className="active-dots" title="Being edited now">
            {active.map((id) => (
              <Avatar key={id} personId={id} size="sm" />
            ))}
          </span>
        )}
        <span className="owner" title="Owner">{PEOPLE.find((p) => p.id === chart.ownerId)?.initials}</span>
      </div>
    </button>
  );
}

export function ChartList() {
  const { state, dispatch } = useStore();
  const list = filteredCharts(state);
  const f = state.filters;
  const filtersActive = f.query || f.status !== 'all' || f.ownerId !== 'all' || f.geography !== 'all' || f.source !== 'all';
  const set = (patch: Partial<Filters>) => dispatch({ type: 'filter', patch });
  const toMeByChart = new Map<string, number>();
  for (const c of state.comments) {
    if (!c.resolved && c.to.includes(ME_ID)) toMeByChart.set(c.chartId, (toMeByChart.get(c.chartId) ?? 0) + 1);
  }
  const people = presenceGroups(state.charts).length;

  return (
    <aside className="pane list-pane" aria-label="Charts">
      <div className="pane-head">
        <div className="pane-title">
          <h2>Charts</h2>
          <span className="muted">{people} people editing now</span>
        </div>
        <input
          type="search"
          className="search"
          placeholder="Search headline, ID or source"
          value={f.query}
          onChange={(e) => set({ query: e.target.value })}
          aria-label="Search charts"
        />
        <div className="filters">
          <label>
            <span>Status</span>
            <select value={f.status} onChange={(e) => set({ status: e.target.value as Status | 'all' })}>
              <option value="all">All</option>
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Owner</span>
            <select value={f.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
              <option value="all">All</option>
              {OWNERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Geography</span>
            <select value={f.geography} onChange={(e) => set({ geography: e.target.value as Filters['geography'] })}>
              <option value="all">All</option>
              <option value="Statewide">Statewide</option>
              <option value="Metro (7)">Metro (7)</option>
              <option value="County (64)">County (64)</option>
            </select>
          </label>
          <label>
            <span>Source</span>
            <select value={f.source} onChange={(e) => set({ source: e.target.value as Filters['source'] })}>
              <option value="all">All</option>
              <option value="CES">CES payroll</option>
              <option value="LAUS">LAUS unemployment</option>
              <option value="QCEW">QCEW</option>
            </select>
          </label>
        </div>
        <div className="list-count">
          <span>
            Showing <b>{list.length}</b> of {state.charts.length}
          </span>
          {filtersActive && (
            <button
              type="button"
              className="link"
              onClick={() => dispatch({ type: 'filter', patch: { query: '', status: 'all', ownerId: 'all', geography: 'all', source: 'all' } })}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <ol className="chart-list">
        {list.length === 0 && <li className="empty">No charts match these filters.</li>}
        {list.map((c) => (
          <li key={c.id}>
            <ChartRow
              chart={c}
              selected={c.id === state.selectedId}
              toMe={toMeByChart.get(c.id) ?? 0}
              onSelect={() => dispatch({ type: 'select', id: c.id })}
            />
          </li>
        ))}
      </ol>
    </aside>
  );
}
