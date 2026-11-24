import { STORM_ID } from '../data/mock';
import { awaitingCountFor, activeOutages, crewForOutage, isSilent, needsDesk } from '../derive';
import { useStore, type Filter } from '../state/store';
import type { Outage } from '../types';
import { h12 } from '../time';
import { Pill, STATUS_LABEL, statusTone } from './ui';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'awaiting', label: 'Needs desk' },
  { key: 'unassigned', label: 'No crew' },
  { key: 'en-route', label: 'En route' },
  { key: 'working', label: 'Working' },
];

function matchesFilter(f: Filter, o: Outage, needs: boolean): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'awaiting':
      return needs;
    case 'unassigned':
      return o.crewIds.length === 0;
    case 'en-route':
      return o.status === 'en-route' || o.status === 'assigned';
    case 'working':
      return o.status === 'working';
  }
}

export function OutageBoard({ now }: { now: number }) {
  const { state, dispatch } = useStore();
  const active = activeOutages(state);
  const q = state.search.trim().toLowerCase();

  const rows = active
    .map((o) => ({ o, needs: needsDesk(state, o) }))
    .filter(({ o, needs }) => {
      if (!matchesFilter(state.filter, o, needs)) return false;
      if (!q) return true;
      return [o.id, o.feeder, o.location, o.cause, o.substation].some((v) => v.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      // Estimate conflicts and waiting replies first, then medical, then size.
      const score = (x: { o: Outage; needs: boolean }) =>
        (x.o.pendingEtr ? 4 : 0) + (x.needs ? 2 : 0) + (x.o.medical ? 1 : 0);
      return score(b) - score(a) || b.o.members - a.o.members;
    });

  const stormWaiting = state.messages.filter(
    (m) => m.outageId === STORM_ID && m.awaiting && !state.resolved.includes(m.id),
  ).length;

  return (
    <section className="panel board" aria-label="Outage board">
      <div className="panel-head">
        <h2>Outages</h2>
        <span className="muted">{active.length} active</span>
      </div>

      <input
        className="search"
        placeholder="Search OUT number, feeder, road, cause"
        value={state.search}
        onChange={(e) => dispatch({ type: 'search', value: e.target.value })}
        aria-label="Search outages"
      />

      <div className="chips" role="group" aria-label="Filter outages">
        {FILTERS.map((f) => {
          const count = active.filter((o) => matchesFilter(f.key, o, needsDesk(state, o))).length;
          return (
            <button
              key={f.key}
              className={`chip ${state.filter === f.key ? 'chip-on' : ''}`}
              aria-pressed={state.filter === f.key}
              onClick={() => dispatch({ type: 'filter', filter: f.key })}
            >
              {f.label} <span className="chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      <button
        className={`row row-storm ${state.selectedId === STORM_ID ? 'row-sel' : ''}`}
        onClick={() => dispatch({ type: 'select', id: STORM_ID })}
      >
        <div className="row-main">
          <div className="row-top">
            <span className="mono id">Storm-wide</span>
            <span className="muted small">mutual aid, staging, advisories</span>
          </div>
          <div className="row-flags">
            {stormWaiting > 0 ? <Pill tone="orange">{stormWaiting} awaiting</Pill> : <Pill tone="gray">Nothing waiting</Pill>}
          </div>
        </div>
      </button>

      <div className="board-list">
        {rows.map(({ o, needs }) => {
          const crews = crewForOutage(state, o.id);
          const silent = crews.some((c) => isSilent(c, now));
          const awaiting = awaitingCountFor(state, o.id);
          const selected = state.selectedId === o.id;
          return (
            <button
              key={o.id}
              className={`row ${selected ? 'row-sel' : ''}`}
              onClick={() => dispatch({ type: 'select', id: o.id })}
              aria-current={selected ? 'true' : undefined}
            >
              <div className={`row-bar bar-${statusTone(o.status)}`} />
              <div className="row-main">
                <div className="row-top">
                  <span className="mono id">{o.id}</span>
                  <span className="mono feeder">{o.feeder}</span>
                  <span className="members">{o.members}</span>
                </div>
                <div className="row-loc">{o.location}</div>
                <div className="row-meta">
                  <Pill tone={statusTone(o.status)}>{STATUS_LABEL[o.status]}</Pill>
                  <span className="muted">{o.cause}</span>
                  <span className="etr">ETR {o.etr ? h12(o.etr) : '—'}</span>
                </div>
                {(o.pendingEtr || awaiting > 0 || o.medical || silent) && (
                  <div className="row-flags">
                    {o.pendingEtr && <Pill tone="red">Estimate to confirm</Pill>}
                    {awaiting > 0 && <Pill tone="orange">{awaiting} awaiting reply</Pill>}
                    {o.medical && <Pill tone="pink">Medical callback</Pill>}
                    {silent && <Pill tone="red">Crew silent</Pill>}
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {rows.length === 0 && <div className="empty">No outages match this filter.</div>}
      </div>
    </section>
  );
}
