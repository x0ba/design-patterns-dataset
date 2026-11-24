import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BINS,
  BIN_BY_ID,
  HEAVY_OVERHEAD_LB,
  LEVEL_LABEL,
  LEVEL_NOTE,
  SHIPMENT,
  SIZES,
  SIZE_BY_KEY,
  SKUS,
  SKU_BY_ID,
  Level,
  SizeKey,
} from './data';
import {
  Allocation,
  BinView,
  Move,
  ScenarioCompare,
  ViewMap,
  WALK_FT_PER_MIN,
  capacity,
  fmtFt,
  fmtMi,
  fmtMin,
  placedUnits,
  planWalk,
  putawayList,
  sortBins,
} from './logic';

// ---------------------------------------------------------------------------
// Small pieces
export function FillBar({ pct, planned = 0, w = 56 }: { pct: number; planned?: number; w?: number }) {
  const base = Math.max(0, pct - planned);
  return (
    <span className="fillbar" style={{ width: w }}>
      <span className="fb-base" style={{ width: `${base}%` }} />
      <span className="fb-plan" style={{ width: `${Math.min(planned, 100 - base)}%` }} />
    </span>
  );
}

function SizeSwatch({ k }: { k: SizeKey }) {
  return <span className={`swatch swatch-${k}`}>{k}</span>;
}

const BLOCK_TEXT = {
  overhead: `Overhead shelf — units over ${HEAVY_OVERHEAD_LB} lb stay below shoulder height`,
  reserved: 'Reserved for relocated fertilizer',
  'too-short': 'Clear height too low for this box',
} as const;

function plannedPct(v: BinView) {
  // share of fill that comes from planned planters
  let pct = 0;
  for (const a of v.planned) {
    const s = SIZE_BY_KEY[a.size];
    const { w, d, h } = s.box;
    const g =
      Math.max(
        Math.floor(v.bin.w / w) * Math.floor(v.bin.d / d),
        Math.floor(v.bin.w / d) * Math.floor(v.bin.d / w),
      ) * Math.floor(v.bin.h / h);
    pct += g ? (a.units / g) * 100 : 0;
  }
  return pct;
}

// ---------------------------------------------------------------------------
// Header search
export function SearchBox({
  query,
  setQuery,
  onPick,
  view,
}: {
  query: string;
  setQuery: (q: string) => void;
  onPick: (skuId: string) => void;
  view: ViewMap;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (q.length < 2) return [];
    return SKUS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [q]);
  const locate = (skuId: string) => {
    const size = SIZES.find((s) => s.skuId === skuId);
    if (size) return BINS.filter((b) => view[b.id].planned.some((a) => a.size === size.key)).map((b) => b.id);
    return BINS.filter((b) => view[b.id].lines.some((l) => l.skuId === skuId)).map((b) => b.id);
  };
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="search" ref={ref}>
      <svg width="15" height="15" viewBox="0 0 20 20" className="search-ic" aria-hidden>
        <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="13" y1="13" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={query}
        placeholder="Find a product or SKU — e.g. fertilizer, pothos, FZ-LIQ"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
          if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
          if (e.key === 'Enter' && results[active]) {
            onPick(results[active].id);
            setOpen(false);
          }
          if (e.key === 'Escape') {
            setQuery('');
            setOpen(false);
          }
        }}
      />
      {query && (
        <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
          ×
        </button>
      )}
      {open && results.length > 0 && (
        <div className="search-pop">
          {results.map((s, i) => {
            const bins = locate(s.id);
            return (
              <button
                key={s.id}
                className={`search-item ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  onPick(s.id);
                  setOpen(false);
                }}
              >
                <span className="si-name">{s.name}</span>
                <span className="si-meta">
                  {s.id} · {s.category} · {s.picks30} picks/30d
                </span>
                <span className="si-bins">
                  {bins.length ? bins.join(', ') : SIZES.some((z) => z.skuId === s.id) ? 'Not yet stocked' : '—'}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open && q.length >= 2 && results.length === 0 && (
        <div className="search-pop empty">No product matches “{query}”.</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left: shipment & plan
export function ShipmentPanel(p: {
  allocs: Allocation[];
  size: SizeKey;
  setSize: (k: SizeKey) => void;
  onRemove: (id: string) => void;
  onSuggest: () => void;
  onClear: () => void;
  onPutaway: () => void;
  relocate: boolean;
  fertDelta: number;
  selectBin: (id: string) => void;
  setHover: (id: string | null) => void;
  hoverBin: string | null;
}) {
  const walk = planWalk(p.allocs);
  const totalUnits = SIZES.reduce((t, s) => t + s.units, 0);
  const totalLb = SIZES.reduce((t, s) => t + s.units * s.unitLb, 0);
  const placedAll = SIZES.reduce((t, s) => t + placedUnits(p.allocs, s.key), 0);
  return (
    <aside className="panel left">
      <section className="ship-card">
        <div className="eyebrow">
          Incoming · {SHIPMENT.po} · {SHIPMENT.vendor}
        </div>
        <h2>{SHIPMENT.product}</h2>
        <div className="ship-meta">
          <span className="pill due">Arrives {SHIPMENT.arrives} · in 3 days</span>
        </div>
        <div className="ship-stats">
          <div>
            <b>{totalUnits}</b>
            <span>units</span>
          </div>
          <div>
            <b>{SHIPMENT.cartons}</b>
            <span>cartons</span>
          </div>
          <div>
            <b>{Math.round(totalLb).toLocaleString()}</b>
            <span>lb total</span>
          </div>
          <div>
            <b>{SIZES.reduce((t, s) => t + s.forecastPicks30, 0)}</b>
            <span>picks/mo fcst</span>
          </div>
        </div>
      </section>

      <section className="sizes">
        {SIZES.map((s) => {
          const placed = placedUnits(p.allocs, s.key);
          const w = walk.sizes.find((x) => x.key === s.key)!;
          const sel = p.size === s.key;
          return (
            <button key={s.key} className={`size-row ${sel ? 'sel' : ''}`} onClick={() => p.setSize(s.key)}>
              <div className="sr-top">
                <SizeSwatch k={s.key} />
                <span className="sr-name">{s.short}</span>
                <span className="sr-count">
                  <b>{placed}</b>/{s.units}
                </span>
              </div>
              <div className="sr-bar">
                <span style={{ width: `${(placed / s.units) * 100}%` }} className={`sr-fill sr-${s.key}`} />
              </div>
              <div className="sr-meta">
                <span>{s.unitLb} lb/unit</span>
                <span>
                  box {s.box.w}×{s.box.d}×{s.box.h} in
                </span>
                <span>
                  {s.cartons} ctn × {s.perCarton}
                </span>
                <span>{s.forecastPicks30} picks/30d fcst</span>
                {s.unitLb > HEAVY_OVERHEAD_LB && <span className="warn-text">no overhead shelves</span>}
              </div>
              <div className="sr-walk">
                {w.avgDist != null ? (
                  <span>
                    avg walk <b>{Math.round(w.avgDist)} ft</b> to packing · {fmtMi(w.ftPerMonth!)}/mo
                  </span>
                ) : (
                  <span className="muted">Not placed yet</span>
                )}
              </div>
            </button>
          );
        })}
      </section>

      <section className="plan">
        <div className="sec-head">
          <h3>Slotting plan</h3>
          <span className="muted">
            {placedAll}/{totalUnits} placed
          </span>
        </div>
        <div className="plan-list">
          {p.allocs.length === 0 && <div className="empty-note">No bins chosen yet. Pick from open spots →</div>}
          {[...p.allocs]
            .sort((a, b) => a.size.localeCompare(b.size) || sortBins(BIN_BY_ID[a.binId], BIN_BY_ID[b.binId]))
            .sort((a, b) => SIZES.findIndex((s) => s.key === a.size) - SIZES.findIndex((s) => s.key === b.size))
            .map((a) => {
              const b = BIN_BY_ID[a.binId];
              return (
                <div
                  key={a.id}
                  className={`plan-row ${p.hoverBin === a.binId ? 'hover' : ''}`}
                  onMouseEnter={() => p.setHover(a.binId)}
                  onMouseLeave={() => p.setHover(null)}
                >
                  <SizeSwatch k={a.size} />
                  <button className="link bin-link" onClick={() => p.selectBin(a.binId)}>
                    {a.binId}
                  </button>
                  <span className="pr-lvl">{LEVEL_LABEL[b.level]}</span>
                  <span className="pr-units">{a.units} u</span>
                  <span className="pr-dist">{b.distFt} ft</span>
                  <button className="icon-btn" onClick={() => p.onRemove(a.id)} aria-label={`Remove ${a.binId}`}>
                    ×
                  </button>
                </div>
              );
            })}
        </div>
        <div className="plan-actions">
          <button className="btn" onClick={p.onSuggest} disabled={placedAll >= totalUnits}>
            Fill the rest by nearest fit
          </button>
          <button className="btn ghost" onClick={p.onClear} disabled={!p.allocs.length}>
            Clear
          </button>
        </div>
      </section>

      <section className="walk-sum">
        <div className="ws-row">
          <span>Planter picks{walk.allPlaced ? '' : ', placed so far'}</span>
          <b>{fmtMi(walk.total)}/mo</b>
        </div>
        {p.relocate && (
          <div className="ws-row fert">
            <span>Fertilizer picks after move</span>
            <b>+{fmtMi(p.fertDelta)}/mo</b>
          </div>
        )}
        <div className="ws-row muted small">
          <span>
            ≈ {fmtMin((walk.total + (p.relocate ? p.fertDelta : 0)) / WALK_FT_PER_MIN)} of picker walking per month at
            forecast
          </span>
        </div>
        <button className="btn primary wide" onClick={p.onPutaway} disabled={!p.allocs.length}>
          Putaway list for Thursday
        </button>
      </section>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Right: open spots
export interface SpotFilters {
  mostlyEmpty: boolean;
  showExcluded: boolean;
  sort: 'distance' | 'room';
}

function SpotRow({
  v,
  size,
  remaining,
  onPlace,
  onSelect,
  setHover,
  hover,
  selected,
}: {
  v: BinView;
  size: SizeKey;
  remaining: number;
  onPlace: (binId: string, units: number) => void;
  onSelect: (id: string) => void;
  setHover: (id: string | null) => void;
  hover: boolean;
  selected: boolean;
}) {
  const s = SIZE_BY_KEY[size];
  const cap = capacity(s, v);
  const def = Math.min(cap.units, remaining);
  const [qty, setQty] = useState(def);
  useEffect(() => setQty(def), [def]);
  const others = v.lines.map((l) => SKU_BY_ID[l.skuId].name);
  const mine = v.planned.filter((a) => a.size === size).reduce((t, a) => t + a.units, 0);
  const b = v.bin;
  const blocked = cap.blocked;
  return (
    <div
      className={`spot ${blocked ? 'blocked' : ''} ${hover ? 'hover' : ''} ${selected ? 'selected' : ''}`}
      onMouseEnter={() => setHover(b.id)}
      onMouseLeave={() => setHover(null)}
    >
      <div className="spot-main" onClick={() => onSelect(b.id)}>
        <div className="spot-id">
          <b>{b.id}</b>
          <span className={`lvl lvl-${b.level}`}>
            {LEVEL_LABEL[b.level]} · {b.shelfIn} in
          </span>
        </div>
        <div className="spot-dist">
          <b>{b.distFt}</b> ft
        </div>
        <div className="spot-sub" title={`Inside ${b.w}×${b.d}×${b.h} in · limit ${b.limitLb} lb`}>
          <FillBar pct={v.fill} planned={plannedPct(v)} w={40} />
          <span>{Math.round(v.fill)}% full</span>
          <span className="dot">·</span>
          <span>{Math.max(0, Math.round(b.limitLb - v.loadLb))} lb free</span>
        </div>
        <div className="spot-tags">
          {v.movedTo && <span className="tag good">freed by move</span>}
          {mine > 0 && <span className="tag plan">{mine} already planned</span>}
          {others.length > 0 && !blocked && <span className="tag">shares with {others[0]}</span>}
          {!blocked && cap.limitedBy === 'weight' && cap.units > 0 && <span className="tag warn">weight-limited</span>}
          {blocked && <span className="tag warn">{BLOCK_TEXT[blocked]}</span>}
        </div>
      </div>
      {!blocked && (
        <div className="spot-act">
          <div className="fits">
            fits <b>{cap.units}</b>
            <span className="muted"> · {(cap.units / s.perCarton).toFixed(cap.units % s.perCarton ? 1 : 0)} ctn</span>
          </div>
          <div className="place">
            <input
              type="number"
              min={1}
              max={Math.min(cap.units, remaining)}
              value={qty}
              disabled={remaining === 0}
              onChange={(e) => setQty(Math.max(0, Math.min(cap.units, remaining, Number(e.target.value) || 0)))}
              aria-label={`Units to place in ${b.id}`}
            />
            <button className="btn sm primary" disabled={remaining === 0 || qty <= 0} onClick={() => onPlace(b.id, qty)}>
              Place
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SpotsPanel(p: {
  view: ViewMap;
  size: SizeKey;
  setSize: (k: SizeKey) => void;
  allocs: Allocation[];
  filters: SpotFilters;
  setFilters: (f: SpotFilters) => void;
  onPlace: (binId: string, units: number) => void;
  onSelect: (id: string) => void;
  setHover: (id: string | null) => void;
  hoverBin: string | null;
  selectedBin: string | null;
  relocate: boolean;
}) {
  const s = SIZE_BY_KEY[p.size];
  const remaining = s.units - placedUnits(p.allocs, p.size);
  const rows = useMemo(() => {
    const out: { v: BinView; units: number; blocked: boolean }[] = [];
    for (const b of BINS) {
      const v = p.view[b.id];
      const cap = capacity(s, v);
      const free = 100 - v.fill;
      const mostly = free >= 50 || v.planned.some((a) => a.size === p.size);
      if (cap.units > 0) {
        if (p.filters.mostlyEmpty && !mostly) continue;
        out.push({ v, units: cap.units, blocked: false });
      } else if (p.filters.showExcluded && cap.blocked && cap.blocked !== 'too-short' && free >= 50) {
        out.push({ v, units: 0, blocked: true });
      }
    }
    out.sort((a, b) =>
      p.filters.sort === 'room' ? b.units - a.units || sortBins(a.v.bin, b.v.bin) : sortBins(a.v.bin, b.v.bin),
    );
    return out;
  }, [p.view, s, p.filters, p.size]);

  const open = rows.filter((r) => !r.blocked);
  const bands = [
    { label: '≤ 30 ft', min: 0, max: 30 },
    { label: '31–60 ft', min: 31, max: 60 },
    { label: '> 60 ft', min: 61, max: 999 },
  ].map((band) => ({
    ...band,
    units: open.filter((r) => r.v.bin.distFt >= band.min && r.v.bin.distFt <= band.max).reduce((t, r) => t + r.units, 0),
  }));
  const maxBand = Math.max(s.units, ...bands.map((b) => b.units));

  return (
    <aside className="panel right">
      <div className="sec-head">
        <h3>Open spots</h3>
        <div className="seg">
          {SIZES.map((z) => (
            <button key={z.key} className={p.size === z.key ? 'on' : ''} onClick={() => p.setSize(z.key)}>
              {z.short.split(' · ')[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="spots-summary">
        <div className="ss-line">
          <span>
            <b>{s.name.replace('Ceramic Planter ', '')}</b> · {remaining} of {s.units} still to place
          </span>
        </div>
        <div className="bands">
          {bands.map((b) => (
            <div key={b.label} className="band">
              <span className="band-label">{b.label}</span>
              <span className="band-bar">
                <span style={{ width: `${(b.units / maxBand) * 100}%` }} className={`band-fill sr-${p.size}`} />
              </span>
              <span className="band-val">
                room for <b>{b.units}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="filters">
        <label>
          <input
            type="checkbox"
            checked={p.filters.mostlyEmpty}
            onChange={(e) => p.setFilters({ ...p.filters, mostlyEmpty: e.target.checked })}
          />
          ≥ 50% empty
        </label>
        <label>
          <input
            type="checkbox"
            checked={p.filters.showExcluded}
            onChange={(e) => p.setFilters({ ...p.filters, showExcluded: e.target.checked })}
          />
          Ruled-out
        </label>
        <select
          value={p.filters.sort}
          onChange={(e) => p.setFilters({ ...p.filters, sort: e.target.value as SpotFilters['sort'] })}
          aria-label="Sort open spots"
        >
          <option value="distance">Nearest first</option>
          <option value="room">Most room</option>
        </select>
      </div>
      <div className="spot-list">
        {rows.length === 0 && <div className="empty-note">No bins match these filters.</div>}
        {rows.map((r) => (
          <SpotRow
            key={r.v.bin.id}
            v={r.v}
            size={p.size}
            remaining={remaining}
            onPlace={p.onPlace}
            onSelect={p.onSelect}
            setHover={p.setHover}
            hover={p.hoverBin === r.v.bin.id}
            selected={p.selectedBin === r.v.bin.id}
          />
        ))}
      </div>
      <div className="spot-foot muted small">
        {open.length} bins can take {s.short.toLowerCase()} · {p.relocate ? 'with' : 'without'} the fertilizer move
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Right: bin details
export function BinPanel(p: {
  view: ViewMap;
  binId: string;
  size: SizeKey;
  allocs: Allocation[];
  onPlace: (size: SizeKey, binId: string, units: number) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  const v = p.view[p.binId];
  const b = v.bin;
  const bayBins = ([4, 3, 2, 1] as Level[]).map((l) => p.view[`${b.row}${b.bay}-${l}`]);
  return (
    <aside className="panel right">
      <div className="sec-head">
        <button className="link back" onClick={p.onBack}>
          ← Open spots
        </button>
        <span className="muted small">Bin details</span>
      </div>
      <div className="bin-head">
        <div>
          <h2>{b.id}</h2>
          <div className="muted">
            Row {b.row} · Bay {b.bay} · Level {b.level} — {LEVEL_LABEL[b.level]}, {LEVEL_NOTE[b.level].toLowerCase()}
          </div>
        </div>
        <div className="bin-dist">
          <b>{b.distFt}</b>
          <span>ft to packing</span>
        </div>
      </div>

      <div className="bin-grid">
        <div className="elev">
          <div className="elev-title">Bay {b.row}{b.bay} elevation</div>
          {bayBins.map((bv) => (
            <button
              key={bv.bin.id}
              className={`elev-shelf ${bv.bin.id === b.id ? 'on' : ''}`}
              style={{ height: 14 + bv.bin.h * 1.1 }}
              onClick={() => p.onSelect(bv.bin.id)}
            >
              <span className="es-fill" style={{ width: `${bv.fill}%` }} />
              {bv.planned.length > 0 && (
                <span className="es-plan" style={{ width: `${Math.min(plannedPct(bv), bv.fill)}%`, left: `${Math.max(0, bv.fill - plannedPct(bv))}%` }} />
              )}
              <span className="es-label">
                L{bv.bin.level} · {bv.bin.shelfIn}″
              </span>
              <span className="es-pct">{Math.round(bv.fill)}%</span>
            </button>
          ))}
          <div className="elev-floor" />
        </div>
        <dl className="bin-facts">
          <dt>Inside</dt>
          <dd>
            {b.w} × {b.d} × {b.h} in
          </dd>
          <dt>Fill</dt>
          <dd>
            <FillBar pct={v.fill} planned={plannedPct(v)} w={70} /> {Math.round(v.fill)}%
          </dd>
          <dt>Load</dt>
          <dd>
            {Math.round(v.loadLb)} / {b.limitLb} lb
          </dd>
          <dt>Shelf deck</dt>
          <dd>{b.shelfIn} in off floor</dd>
          {v.movedTo && (
            <>
              <dt>Scenario</dt>
              <dd className="fert">Fertilizer moves to {v.movedTo}</dd>
            </>
          )}
          {v.movedFrom && (
            <>
              <dt>Scenario</dt>
              <dd className="fert">Takes fertilizer from {v.movedFrom}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="sub-head">Contents</div>
      <div className="contents">
        {v.lines.length === 0 && v.planned.length === 0 && <div className="empty-note">Empty bin.</div>}
        {v.lines.map((l) => {
          const s = SKU_BY_ID[l.skuId];
          return (
            <div key={l.skuId} className="content-row">
              <div>
                <div className="cr-name">{s.name}</div>
                <div className="muted small">
                  {s.id} · {s.category}
                </div>
              </div>
              <div className="cr-num">
                <b>{l.units}</b> u
                <div className="muted small">{s.picks30} picks/30d</div>
              </div>
            </div>
          );
        })}
        {v.planned.map((a) => (
          <div key={a.id} className="content-row planned">
            <div>
              <div className="cr-name">
                <SizeSwatch k={a.size} /> {SIZE_BY_KEY[a.size].name}
              </div>
              <div className="muted small">Planned · arrives Thu</div>
            </div>
            <div className="cr-num">
              <b>{a.units}</b> u
              <button className="link small" onClick={() => p.onRemove(a.id)}>
                remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="sub-head">Room for the new planters</div>
      <div className="fit-table">
        {SIZES.map((s) => {
          const cap = capacity(s, v);
          const remaining = s.units - placedUnits(p.allocs, s.key);
          const n = Math.min(cap.units, remaining);
          return (
            <div key={s.key} className={`fit-row ${p.size === s.key ? 'cur' : ''}`}>
              <SizeSwatch k={s.key} />
              <span className="fr-name">{s.short}</span>
              {cap.blocked ? (
                <span className="fr-why">{BLOCK_TEXT[cap.blocked]}</span>
              ) : (
                <>
                  <span className="fr-cap">
                    fits <b>{cap.units}</b>
                    {cap.units > 0 && cap.limitedBy === 'weight' && <span className="muted"> (weight)</span>}
                  </span>
                  <button
                    className="btn sm"
                    disabled={n <= 0}
                    onClick={() => p.onPlace(s.key, b.id, n)}
                    title={remaining === 0 ? 'All units of this size are placed' : ''}
                  >
                    {n > 0 ? `Place ${n}` : remaining === 0 ? 'All placed' : 'Full'}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Scenario card
export function ScenarioCard(p: {
  relocate: boolean;
  onToggle: () => void;
  moves: Move[];
  compare: ScenarioCompare;
  onSelect: (id: string) => void;
  setHover: (id: string | null) => void;
}) {
  const [showMoves, setShowMoves] = useState(false);
  const c = p.compare;
  const max = Math.max(c.stay.total, c.move.total);
  const fertSkus = [...new Set(c.move.moves.map((m) => m.skuId))];
  const fertUnits = c.move.moves.reduce((t, m) => t + m.units, 0);
  const fertPicks = fertSkus.reduce((t, id) => t + SKU_BY_ID[id].picks30, 0);
  const freedD = c.freedBins.map((id) => BIN_BY_ID[id].distFt);
  const destD = c.move.moves.filter((m) => m.toBin).map((m) => BIN_BY_ID[m.toBin!].distFt);
  const moves = p.relocate ? p.moves : c.move.moves;
  return (
    <section className={`scenario ${p.relocate ? 'on' : ''}`}>
      <div className="sc-left">
        <div className="eyebrow">What-if</div>
        <h3>Move front-bay fertilizer to the back wall</h3>
        <p>
          {fertSkus.length} slow sellers ({fertUnits.toLocaleString()} units, {fertPicks} picks/30d combined) take up{' '}
          {c.freedBins.length} bins {Math.min(...freedD)}–{Math.max(...freedD)} ft from packing. Row F has room at{' '}
          {Math.min(...destD)}–{Math.max(...destD)} ft.
        </p>
        <div className="sc-actions">
          <label className="switch">
            <input type="checkbox" checked={p.relocate} onChange={p.onToggle} />
            <span className="track">
              <span className="thumb" />
            </span>
            <span>{p.relocate ? 'Included in plan' : 'Preview in plan'}</span>
          </label>
          <button className="link" onClick={() => setShowMoves((s) => !s)}>
            {showMoves ? 'Hide' : 'See'} the {moves.length} moves
          </button>
        </div>
      </div>
      {showMoves ? (
        <div className="sc-moves">
          {moves.map((m) => (
            <div
              key={m.fromBin}
              className="mv-row"
              onMouseEnter={() => p.setHover(m.fromBin)}
              onMouseLeave={() => p.setHover(null)}
            >
              <button className="link bin-link" onClick={() => p.onSelect(m.fromBin)}>
                {m.fromBin}
              </button>
              <span className="mv-arrow">→</span>
              {m.toBin ? (
                <button className="link bin-link" onClick={() => p.onSelect(m.toBin!)}>
                  {m.toBin}
                </button>
              ) : (
                <span className="warn-text">no room</span>
              )}
              <span className="mv-sku">{SKU_BY_ID[m.skuId].name}</span>
              <span className="mv-u">{m.units} u</span>
              <span className="mv-u">{m.minutes} min</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="sc-compare">
          <div className="cmp-title">
            Monthly picker walking if all 340 planters go to the nearest spots that fit
          </div>
          {[
            { label: 'Keep fertilizer up front', d: c.stay, on: !p.relocate },
            { label: 'Move it to the back wall', d: c.move, on: p.relocate },
          ].map((r) => (
            <div key={r.label} className={`cmp-row ${r.on ? 'cur' : ''}`}>
              <span className="cmp-label">{r.label}</span>
              <span className="cmp-bar">
                <span className="cmp-planter" style={{ width: `${(r.d.planter / max) * 100}%` }} />
                <span className="cmp-fert" style={{ width: `${(r.d.fert / max) * 100}%` }} />
              </span>
              <span className="cmp-val">{fmtMi(r.d.total)}</span>
            </div>
          ))}
          <div className="cmp-legend">
            <span>
              <i className="k-planter" /> planter picks (avg {Math.round(c.stay.avgByKey.L)} → {Math.round(c.move.avgByKey.L)} ft
              for large)
            </span>
            <span>
              <i className="k-fert" /> extra fertilizer walking
            </span>
          </div>
          <div className="cmp-stats">
            <div>
              <b>{fmtMi(c.savedFtPerMonth)}</b>
              <span>saved / month</span>
            </div>
            <div>
              <b>{fmtMin(c.savedMinPerMonth)}</b>
              <span>picker time / month</span>
            </div>
            <div>
              <b>{fmtMin(c.moveMinutes)}</b>
              <span>to move {c.freedBins.length} bins</span>
            </div>
            <div>
              <b>{c.paybackDays ? `${Math.round(c.paybackDays / 7)} wks` : '—'}</b>
              <span>to pay back</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Putaway modal
export function PutawayModal(p: { allocs: Allocation[]; moves: Move[]; relocate: boolean; onClose: () => void }) {
  const lines = putawayList(p.allocs);
  const unplaced = SIZES.map((s) => ({ s, left: s.units - placedUnits(p.allocs, s.key) })).filter((x) => x.left > 0);
  const moveMin = p.moves.reduce((t, m) => t + (m.toBin ? m.minutes : 0), 0);
  const walk = planWalk(p.allocs);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && p.onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [p]);
  return (
    <div className="modal-back" onClick={p.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Putaway list">
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              {SHIPMENT.po} · {SHIPMENT.vendor} · {SHIPMENT.arrives}
            </div>
            <h2>Putaway list — {SHIPMENT.product}</h2>
          </div>
          <div className="modal-btns">
            <button className="btn" onClick={() => window.print()}>
              Print
            </button>
            <button className="btn ghost" onClick={p.onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="modal-body">
          {unplaced.length > 0 && (
            <div className="alert">
              Not slotted yet:{' '}
              {unplaced.map((u, i) => (
                <span key={u.s.key}>
                  {i > 0 && ', '}
                  <b>{u.left}</b> × {u.s.short}
                </span>
              ))}
              . These cartons will stay in receiving.
            </div>
          )}
          {p.relocate && p.moves.length > 0 && (
            <>
              <h4>
                Before Thursday · relocate fertilizer <span className="muted">≈ {fmtMin(moveMin)} with a cart</span>
              </h4>
              <table className="pt">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Product</th>
                    <th className="num">Units</th>
                    <th className="num">Est.</th>
                    <th className="chk">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {p.moves.map((m) => (
                    <tr key={m.fromBin}>
                      <td className="mono">{m.fromBin}</td>
                      <td className="mono">{m.toBin ?? '—'}</td>
                      <td>{SKU_BY_ID[m.skuId].name}</td>
                      <td className="num">{m.units}</td>
                      <td className="num">{m.minutes} min</td>
                      <td className="chk">
                        <span className="box" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <h4>
            Thursday · putaway in walking order{' '}
            <span className="muted">
              {lines.length} stops · planter picks ≈ {fmtFt(walk.total)}/mo
            </span>
          </h4>
          <table className="pt">
            <thead>
              <tr>
                <th>#</th>
                <th>Bin</th>
                <th>Shelf</th>
                <th className="num">Walk</th>
                <th>Size</th>
                <th className="num">Units</th>
                <th>Cartons</th>
                <th className="chk">Done</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const b = BIN_BY_ID[l.binId];
                return (
                  <tr key={`${l.binId}-${l.size}`}>
                    <td className="muted">{i + 1}</td>
                    <td className="mono">{l.binId}</td>
                    <td>
                      {LEVEL_LABEL[b.level]} · {b.shelfIn} in
                    </td>
                    <td className="num">{b.distFt} ft</td>
                    <td>
                      <SizeSwatch k={l.size} /> {SIZE_BY_KEY[l.size].short.split(' · ')[0]}
                    </td>
                    <td className="num">{l.units}</td>
                    <td className="cartons">
                      {l.cartons.map((c) => (
                        <span key={c.label} className="ctn">
                          {c.label}
                          {c.units < c.of && <em> ({c.units})</em>}
                        </span>
                      ))}
                    </td>
                    <td className="chk">
                      <span className="box" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted small">
            Carton labels follow the packing list: S-01…S-06 hold 20 small, M-01…M-07 hold 20 medium, L-01…L-05 hold 16
            large. A number in brackets means split the carton.
          </p>
        </div>
      </div>
    </div>
  );
}
