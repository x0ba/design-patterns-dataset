import { useMemo, useState } from 'react';
import { PINS } from '../data/pins.js';
import { PIN_TYPES, TYPE_NAMES } from '../data/types.js';
import { PIN_BY_ID } from '../lib/lookup.js';
import { useGo } from '../lib/router.js';
import { distance, bearing, compass } from '../lib/geo.js';
import SiteMap, { REFERENCES } from '../components/SiteMap.jsx';
import PinDetail from '../components/PinDetail.jsx';
import { TypeChip } from '../components/ui.jsx';

export default function MapView({ params }) {
  const go = useGo();
  const sitePins = useMemo(() => PINS.filter((p) => p.loc === 'site'), []);
  const [hidden, setHidden] = useState(() => new Set());
  const [refId, setRefId] = useState('boathouse');
  const ref = REFERENCES.find((r) => r.id === refId) || REFERENCES[0];

  const selectedId = PIN_BY_ID[params.get('pin')]?.loc === 'site' ? params.get('pin') : sitePins[0].id;
  const selected = PIN_BY_ID[selectedId];

  const visible = sitePins.filter((p) => !hidden.has(p.type));
  const byDistance = [...sitePins].sort((a, b) => distance(ref, a) - distance(ref, b));

  const toggleType = (t) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="map-view">
      <section className="card map-card">
        <div className="map-head">
          <div>
            <div className="eyebrow">Property map · 2.3 acres · north up</div>
            <h2>Ten Mile Lake, Hackensack MN</h2>
          </div>
          <div className="measure-pick">
            <label htmlFor="ref-select">Measure from</label>
            <select id="ref-select" value={refId} onChange={(e) => setRefId(e.target.value)}>
              {REFERENCES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="map-stage">
          <SiteMap
            pins={visible}
            selectedId={selectedId}
            onPin={(p) => go('map', { pin: p.id })}
            reference={ref}
          />
        </div>
        <div className="legend">
          {TYPE_NAMES.filter((t) => sitePins.some((p) => p.type === t)).map((t) => (
            <button
              key={t}
              type="button"
              className={`legend-item${hidden.has(t) ? ' is-off' : ''}`}
              onClick={() => toggleType(t)}
              aria-pressed={!hidden.has(t)}
            >
              <span className="swatch" style={{ background: PIN_TYPES[t].color }} />
              {t}
            </button>
          ))}
        </div>
      </section>

      <aside className="map-side">
        <section className="card">
          <PinDetail pin={selected} onPlan={false} />
        </section>
        <section className="card distance-list">
          <h3 className="section-h">
            Property items, from {ref.label.toLowerCase()}
          </h3>
          <ol>
            {byDistance.map((p) => {
              const d = Math.round(distance(ref, p));
              const dir = compass(bearing(ref, p));
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`dist-row${p.id === selectedId ? ' is-sel' : ''}`}
                    onClick={() => go('map', { pin: p.id })}
                  >
                    <TypeChip type={p.type} small />
                    <span className="dist-title">{p.title.split(/ [–—] | \(/)[0]}</span>
                    <span className="dist-val">{d} m {dir}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      </aside>
    </div>
  );
}
