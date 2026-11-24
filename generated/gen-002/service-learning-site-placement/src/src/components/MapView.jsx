import { useMemo, useState } from 'react';
import { SITES } from '../data/sites.js';
import { NEIGHBORHOODS, STATIONS, LINES } from '../data/network.js';
import * as P from '../lib/placement.js';
import SiteMap from './SiteMap.jsx';
import { OrgBadge, SlotChips, RouteChips, Tag } from './ui.jsx';

const EXTENSION_STOPS = new Set(STATIONS.filter((s) => s.extension).map((s) => s.name));

const SEAT_BANDS = [
  { min: 3, label: '3 or more open', color: '#15803d' },
  { min: 1, label: '1–2 open', color: '#d97706' },
  { min: -Infinity, label: 'Full', color: '#c3cad5' },
];

const MINUTE_BANDS = [
  { max: 30, label: 'Within 30 min', color: '#15803d' },
  { max: 45, label: '31–45 min', color: '#d97706' },
  { max: Infinity, label: 'Over 45 min', color: '#b91c1c' },
];

function bandFor(bands, value) {
  return bands.find((b) => (b.max !== undefined ? value <= b.max : value >= b.min)) ?? bands[bands.length - 1];
}

export default function MapView({ counts, students, assignments }) {
  const [colorBy, setColorBy] = useState('seats');
  const [origin, setOrigin] = useState('Cedar Hill');
  const [selectedId, setSelectedId] = useState(null);

  const rows = useMemo(
    () =>
      SITES.map((site, i) => {
        const open = site.capacity - (counts[site.id] || 0);
        const originNb = P.NEIGHBORHOOD_BY_ID[origin];
        const minutes = P.estimateMinutes({ neighborhood: origin, mode: 'Bus' }, site);
        return { site, number: i + 1, open, minutes, dist: originNb ? P.distanceKm(originNb, site) : 0 };
      }),
    [counts, origin],
  );

  const markers = useMemo(() => {
    const out = {};
    for (const r of rows) {
      if (colorBy === 'seats') {
        out[r.site.id] = { fill: bandFor(SEAT_BANDS, r.open).color, r: 0.32 };
      } else {
        out[r.site.id] = { fill: bandFor(MINUTE_BANDS, r.minutes).color, r: 0.32 };
      }
    }
    return out;
  }, [rows, colorBy]);

  const selected = rows.find((r) => r.site.id === selectedId) ?? null;
  const placedHere = selected ? students.filter((s) => assignments[s.id] === selected.site.id) : [];
  const originNb = P.NEIGHBORHOOD_BY_ID[origin];

  const totalOpen = rows.reduce((a, r) => a + Math.max(0, r.open), 0);
  const withinLimit = rows.filter((r) => r.minutes <= P.DEFAULT_LIMIT).length;

  return (
    <div className="map-view">
      <aside className="panel map-side" aria-label="Map controls and site list">
        <div className="panel-head">
          <h2>Map</h2>
          <p className="muted small">
            Schematic: campus at the centre, north up. Sites are numbered in the same order as the Sites table.
          </p>
        </div>

        <div className="segmented" role="group" aria-label="Colour sites by">
          <button className={colorBy === 'seats' ? 'on' : ''} onClick={() => setColorBy('seats')}>
            Open seats
          </button>
          <button className={colorBy === 'minutes' ? 'on' : ''} onClick={() => setColorBy('minutes')}>
            Transit minutes
          </button>
        </div>

        {colorBy === 'minutes' && (
          <label className="field">
            <span>Measure from home neighborhood</span>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {NEIGHBORHOODS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))}
            </select>
          </label>
        )}

        <ul className="legend">
          {(colorBy === 'seats' ? SEAT_BANDS : MINUTE_BANDS).map((b) => (
            <li key={b.label}>
              <i className="dot" style={{ background: b.color }} /> {b.label}
            </li>
          ))}
        </ul>

        {colorBy === 'seats' ? (
          <p className="muted small">
            {totalOpen} open seats across the network. Line colours: Blue Line in blue, bus routes in grey.
          </p>
        ) : (
          <p className="muted small">
            {withinLimit} of {SITES.length} sites are within 45 min by transit from {origin}. Estimates are straight-line
            distance with line sharing, not a routing result.
          </p>
        )}

        {selected ? (
          <div className="map-selected">
            <div className="ms-head">
              <span className="ms-num">{selected.number}</span>
              <div>
                <strong>{selected.site.name}</strong>
                <div className="muted small">{selected.site.address}</div>
              </div>
            </div>
            <OrgBadge type={selected.site.type} />
            <dl className="mini-facts">
              <div>
                <dt>Open seats</dt>
                <dd>
                  {Math.max(0, selected.open)} of {selected.site.capacity}
                </dd>
              </div>
              <div>
                <dt>From {origin}</dt>
                <dd>~{selected.minutes} min</dd>
              </div>
              <div>
                <dt>Campus</dt>
                <dd>{selected.site.campusMin} min</dd>
              </div>
            </dl>
            <p className="small">
              <strong>Stop:</strong> {selected.site.stop}{' '}
              {EXTENSION_STOPS.has(selected.site.stop) && <Tag tone="rail">New Blue Line stop</Tag>}
            </p>
            <RouteChips routes={selected.site.routes} />
            <p className="small">
              <strong>Slots:</strong> <SlotChips codes={selected.site.slots} />
            </p>
            <p className="small muted">
              {placedHere.length} placed here. Full roster on the Roster tab.
            </p>
            <button className="btn link" onClick={() => setSelectedId(null)}>
              Clear selection
            </button>
          </div>
        ) : (
          <p className="muted small">Select a site on the map or in the list for details.</p>
        )}

        <ol className="site-index">
          {rows.map((r) => (
            <li key={r.site.id}>
              <button
                className={`index-row${selectedId === r.site.id ? ' active' : ''}`}
                onClick={() => setSelectedId(r.site.id)}
              >
                <span className="ms-num small">{r.number}</span>
                <span className="index-name">{r.site.name}</span>
                <span className="index-val">
                  {colorBy === 'seats' ? (r.open <= 0 ? 'Full' : `${r.open} open`) : `${r.minutes} min`}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <section className="map-stage" aria-label="Network map">
        <div className="map-canvas">
          <SiteMap
            full
            markers={markers}
            origin={colorBy === 'minutes' ? originNb : null}
            selectedSiteId={selectedId}
            onSelectSite={setSelectedId}
            caption="Schematic, north up. Blue Line in blue; teal dots are the four extension stations. Grey lines are bus routes. Diamond = home area when measuring minutes."
          />
        </div>
        <aside className="ext-card" aria-label="Blue Line extension and stop access">
          <h3>Blue Line extension</h3>
          <p className="small muted">
            Opened Sep 2026 with four new stations. Sites listed under each station have it as their nearest stop.
          </p>
          {STATIONS.filter((st) => st.extension).map((st) => {
            const here = rows.filter((r) => r.site.stop === st.name);
            return (
              <div key={st.name} className="ext-station">
                <div className="ext-head">
                  <span className="ext-dot" /> {st.name}
                </div>
                {here.length === 0 && <div className="small muted">No partner site uses this stop yet.</div>}
                <ul>
                  {here.map((r) => (
                    <li key={r.site.id}>
                      <button className={`link-row${selectedId === r.site.id ? ' active' : ''}`} onClick={() => setSelectedId(r.site.id)}>
                        <span className="ms-num small">{r.number}</span>
                        <span>{r.site.name}</span>
                        <span className="muted small">{r.open <= 0 ? 'Full' : `${r.open} open`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <h3 className="section-title">Lines</h3>
          <ul className="line-key">
            {LINES.map((l) => {
              const served = rows.filter((r) => r.site.routes.includes(l.id)).length;
              return (
                <li key={l.id}>
                  <span className={`swatch ${l.kind}`} />
                  <span>{l.id}{l.kind === 'rail' ? ' (light rail)' : ''}</span>
                  <span className="muted small">{served} sites</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </section>
    </div>
  );
}
