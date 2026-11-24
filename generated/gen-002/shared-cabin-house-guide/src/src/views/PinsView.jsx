import { useMemo } from 'react';
import { PINS } from '../data/pins.js';
import { PIN_TYPES, TYPE_NAMES } from '../data/types.js';
import { PIN_BY_ID, pinPlaceLabel, stepsForPin } from '../lib/lookup.js';
import { useGo } from '../lib/router.js';
import PinDetail from '../components/PinDetail.jsx';
import { TypeChip } from '../components/ui.jsx';

const LOCS = [
  { id: 'all', label: 'Everywhere' },
  { id: 'site', label: 'On the property' },
  { id: 'ground', label: 'Ground floor' },
  { id: 'upper', label: 'Upper floor' },
  { id: 'crawl', label: 'Crawlspace' },
];

export default function PinsView({ params }) {
  const go = useGo();
  const q = (params.get('q') || '').trim();
  const typeParam = params.get('type') || '';
  const loc = params.get('loc') || 'all';

  const results = useMemo(() => {
    const needle = q.toLowerCase();
    return PINS.filter((p) => {
      if (typeParam && p.type !== typeParam) return false;
      if (loc !== 'all' && p.loc !== loc) return false;
      if (!needle) return true;
      const hay = `${p.id} ${p.title} ${p.notes} ${p.type} ${pinPlaceLabel(p)}`.toLowerCase();
      return needle.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [q, typeParam, loc]);

  const selected = PIN_BY_ID[params.get('pin')] && results.some((p) => p.id === params.get('pin'))
    ? PIN_BY_ID[params.get('pin')]
    : results[0];

  const update = (patch) => {
    const next = { q, type: typeParam, loc, pin: selected?.id, ...patch };
    go('pins', next);
  };

  return (
    <div className="pins-view">
      <section className="card pins-list-card">
        <div className="pins-tools">
          <input
            className="search"
            type="search"
            placeholder="Search pins: valve, breaker, trap, propane…"
            value={q}
            onChange={(e) => update({ q: e.target.value, pin: undefined })}
            aria-label="Search pins"
          />
          <div className="filter-row">
            <select value={loc} onChange={(e) => update({ loc: e.target.value, pin: undefined })} aria-label="Location">
              {LOCS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            <select value={typeParam} onChange={(e) => update({ type: e.target.value, pin: undefined })} aria-label="Type">
              <option value="">All types</option>
              {TYPE_NAMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="type-filters" role="group" aria-label="Quick type filter">
            {TYPE_NAMES.map((t) => (
              <button
                key={t}
                type="button"
                className={`type-pill${typeParam === t ? ' is-on' : ''}`}
                style={{ '--c': PIN_TYPES[t].color }}
                aria-pressed={typeParam === t}
                onClick={() => update({ type: typeParam === t ? '' : t, pin: undefined })}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="muted small">
            {results.length} of {PINS.length} pins
          </p>
        </div>

        <ul className="pin-table" aria-label="Pins">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`pin-line${selected?.id === p.id ? ' is-sel' : ''}`}
                onClick={() => update({ pin: p.id })}
              >
                <span className="type-bar" style={{ background: PIN_TYPES[p.type].color }} aria-hidden="true" />
                <span className="pin-line-main">
                  <span className="pin-line-title">{p.title}</span>
                  <span className="pin-line-meta">
                    <span className="pin-id">{p.id}</span>
                    {pinPlaceLabel(p)} · {p.type}
                    {stepsForPin(p.id).length > 0 && <span className="step-ref"> · step {stepsForPin(p.id).map((s) => s.n).join(', ')}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="muted empty-line">No pins match. Try fewer words, or clear the filters.</li>}
        </ul>
      </section>

      <section className="pins-detail">
        {selected ? <PinDetail pin={selected} /> : <div className="card muted">Nothing selected.</div>}
      </section>
    </div>
  );
}
