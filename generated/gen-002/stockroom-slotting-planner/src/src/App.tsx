import { useCallback, useEffect, useMemo, useState } from 'react';
import { BINS, INITIAL_ALLOCATIONS, SIZES, SIZE_BY_KEY, SKU_BY_ID, SizeKey } from './data';
import {
  Allocation,
  autoPlan,
  buildView,
  capacity,
  compareScenarios,
  fertilizerWalkDelta,
  newId,
  placedUnits,
  reconcile,
} from './logic';
import { ColorMode, FILL_STOPS, FloorMap, PICK_STOPS, WALK_STOPS } from './FloorMap';
import { BinPanel, PutawayModal, ScenarioCard, SearchBox, ShipmentPanel, SpotFilters, SpotsPanel } from './panels';

const initialAllocs: Allocation[] = INITIAL_ALLOCATIONS.map((a) => ({ ...a, id: newId() }));

export default function App() {
  const [allocs, setAllocs] = useState<Allocation[]>(initialAllocs);
  const [relocate, setRelocate] = useState(false);
  const [size, setSize] = useState<SizeKey>('L');
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'spots' | 'bin'>('spots');
  const [hoverBin, setHoverBin] = useState<string | null>(null);
  const [mode, setMode] = useState<ColorMode>('fill');
  const [showFits, setShowFits] = useState(true);
  const [filters, setFilters] = useState<SpotFilters>({ mostlyEmpty: true, showExcluded: true, sort: 'distance' });
  const [query, setQuery] = useState('');
  const [pickedSku, setPickedSku] = useState<string | null>(null);
  const [putaway, setPutaway] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { view, moves } = useMemo(() => buildView(allocs, relocate), [allocs, relocate]);
  const compare = useMemo(() => compareScenarios(), []);
  const fertDelta = useMemo(() => fertilizerWalkDelta(moves), [moves]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const selectBin = useCallback((id: string) => {
    setSelectedBin(id);
    setRightTab('bin');
  }, []);

  const place = useCallback(
    (key: SizeKey, binId: string, units: number) => {
      const s = SIZE_BY_KEY[key];
      const cap = capacity(s, view[binId]).units;
      const remaining = s.units - placedUnits(allocs, key);
      const n = Math.min(units, cap, remaining);
      if (n <= 0) return;
      setAllocs((prev) => {
        const ex = prev.find((a) => a.binId === binId && a.size === key);
        if (ex) return prev.map((a) => (a === ex ? { ...a, units: a.units + n } : a));
        return [...prev, { id: newId(), size: key, binId, units: n }];
      });
      setToast(`Placed ${n} × ${s.short} in ${binId}${n < units ? ` (only ${n} fit)` : ''}`);
    },
    [view, allocs],
  );

  const remove = (id: string) => setAllocs((prev) => prev.filter((a) => a.id !== id));

  const toggleRelocate = () => {
    const next = !relocate;
    const r = reconcile(allocs, next);
    setAllocs(r.allocs);
    setRelocate(next);
    if (r.dropped > 0) {
      setToast(`${r.dropped} planned units no longer fit with fertilizer staying up front — removed from plan`);
    } else {
      setToast(next ? 'Fertilizer move added — 12 front bins are now open' : 'Fertilizer stays in the front bays');
    }
  };

  const suggest = () => {
    const before = allocs.reduce((t, a) => t + a.units, 0);
    const next = autoPlan(allocs, relocate, { minFreePct: filters.mostlyEmpty ? 50 : undefined });
    const added = next.reduce((t, a) => t + a.units, 0) - before;
    setAllocs(next);
    const short = SIZES.map((s) => s.units - placedUnits(next, s.key)).reduce((a, b) => a + b, 0);
    setToast(
      added
        ? `Added ${added} units to the nearest bins that fit${short ? ` · ${short} still have no room` : ''}`
        : 'No more room that fits the remaining units',
    );
  };

  const highlightBins = useMemo(() => {
    const set = new Set<string>();
    const q = query.trim().toLowerCase();
    if (pickedSku) {
      const sz = SIZES.find((s) => s.skuId === pickedSku);
      for (const b of BINS) {
        const v = view[b.id];
        if (sz ? v.planned.some((a) => a.size === sz.key) : v.lines.some((l) => l.skuId === pickedSku)) set.add(b.id);
      }
      return set;
    }
    if (q.length < 2) return set;
    for (const b of BINS) {
      const v = view[b.id];
      if (
        v.lines.some((l) => {
          return l.skuId.toLowerCase().includes(q) || skuName(l.skuId).includes(q) || skuCat(l.skuId).includes(q);
        }) ||
        (v.planned.length && 'ceramic planter speckle'.includes(q))
      )
        set.add(b.id);
    }
    return set;
  }, [query, pickedSku, view]);

  useEffect(() => {
    if (pickedSku && query === '') setPickedSku(null);
  }, [query, pickedSku]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !putaway) {
        if (rightTab === 'bin') setRightTab('spots');
        setSelectedBin(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [putaway, rightTab]);

  const onPickSku = (skuId: string) => {
    setPickedSku(skuId);
    const sz = SIZES.find((s) => s.skuId === skuId);
    const first = BINS.find((b) =>
      sz ? view[b.id].planned.some((a) => a.size === sz.key) : view[b.id].lines.some((l) => l.skuId === skuId),
    );
    if (sz) setSize(sz.key);
    if (first) selectBin(first.id);
    setQuery(skuNameRaw(skuId));
  };

  const totalPlaced = allocs.reduce((t, a) => t + a.units, 0);

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#2f5d47" />
            <rect x="7" y="8" width="18" height="4" rx="1" fill="#f3efe6" />
            <rect x="7" y="14" width="18" height="4" rx="1" fill="#f3efe6" />
            <rect x="7" y="20" width="8" height="4" rx="1" fill="#d9824f" />
          </svg>
          <span className="brand-name">Slotroom</span>
          <span className="brand-sep" />
          <span className="ws">
            <b>Fernhollow Goods</b>
            <span className="muted"> · Unit 4 · 212 bins · 186 SKUs</span>
          </span>
        </div>
        <SearchBox query={query} setQuery={setQuery} onPick={onPickSku} view={view} />
        <div className="top-right">
          <span className="muted">Mon, Nov 16</span>
          <span className="draft">
            Draft plan · {totalPlaced}/340 units{relocate ? ' · incl. fertilizer move' : ''}
          </span>
          <span className="avatar" title="Priya — Operations">
            P
          </span>
        </div>
      </header>

      <main className="layout">
        <ShipmentPanel
          allocs={allocs}
          size={size}
          setSize={setSize}
          onRemove={remove}
          onSuggest={suggest}
          onClear={() => {
            setAllocs([]);
            setToast('Plan cleared');
          }}
          onPutaway={() => setPutaway(true)}
          relocate={relocate}
          fertDelta={fertDelta}
          selectBin={selectBin}
          setHover={setHoverBin}
          hoverBin={hoverBin}
        />

        <section className="center">
          <div className="map-toolbar">
            <div className="seg">
              <span className="seg-label">Color by</span>
              {(
                [
                  ['fill', 'Fill %'],
                  ['picks', 'Picks / 30 days'],
                  ['walk', 'Walk to packing'],
                ] as [ColorMode, string][]
              ).map(([k, l]) => (
                <button key={k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>
                  {l}
                </button>
              ))}
            </div>
            <label className="chk-inline">
              <input type="checkbox" checked={showFits} onChange={(e) => setShowFits(e.target.checked)} />
              Outline bins that fit <b>{SIZE_BY_KEY[size].short}</b>
            </label>
          </div>

          <FloorMap
            view={view}
            moves={moves}
            mode={mode}
            size={size}
            showFits={showFits}
            minFreePct={filters.mostlyEmpty ? 50 : null}
            selectedBin={selectedBin}
            hoverBin={hoverBin}
            highlightBins={highlightBins}
            onSelect={selectBin}
            onHover={setHoverBin}
          />

          <div className="legend">
            <Legend mode={mode} />
            <span className="lg-item">
              <i className="lg-planned" /> Planned planters
            </span>
            {showFits && (
              <span className="lg-item">
                <i className="lg-fit" /> Fits {SIZE_BY_KEY[size].short.split(' · ')[0]}
              </span>
            )}
            {relocate && (
              <span className="lg-item">
                <i className="lg-fert" /> Relocated fertilizer
              </span>
            )}
            <span className="lg-item muted">Each bay: top strip = overhead (L4), bottom = floor (L1)</span>
          </div>

          <ScenarioCard
            relocate={relocate}
            onToggle={toggleRelocate}
            moves={moves}
            compare={compare}
            onSelect={selectBin}
            setHover={setHoverBin}
          />
        </section>

        {rightTab === 'bin' && selectedBin ? (
          <BinPanel
            view={view}
            binId={selectedBin}
            size={size}
            allocs={allocs}
            onPlace={place}
            onRemove={remove}
            onBack={() => {
              setRightTab('spots');
            }}
            onSelect={selectBin}
          />
        ) : (
          <SpotsPanel
            view={view}
            size={size}
            setSize={setSize}
            allocs={allocs}
            filters={filters}
            setFilters={setFilters}
            onPlace={(binId, units) => place(size, binId, units)}
            onSelect={selectBin}
            setHover={setHoverBin}
            hoverBin={hoverBin}
            selectedBin={selectedBin}
            relocate={relocate}
          />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
      {putaway && <PutawayModal allocs={allocs} moves={moves} relocate={relocate} onClose={() => setPutaway(false)} />}
    </div>
  );
}

const skuName = (id: string) => SKU_BY_ID[id].name.toLowerCase();
const skuNameRaw = (id: string) => SKU_BY_ID[id].name;
const skuCat = (id: string) => SKU_BY_ID[id].category.toLowerCase();

function Legend({ mode }: { mode: ColorMode }) {
  const cfg =
    mode === 'fill'
      ? { stops: FILL_STOPS, lo: 'Empty', hi: '100% full' }
      : mode === 'picks'
        ? { stops: PICK_STOPS, lo: '0 picks', hi: '96+ picks / 30d' }
        : { stops: WALK_STOPS, lo: '12 ft', hi: '96 ft from packing' };
  return (
    <span className="lg-ramp">
      <span>{cfg.lo}</span>
      <span className="ramp" style={{ background: `linear-gradient(90deg, ${cfg.stops.join(',')})` }} />
      <span>{cfg.hi}</span>
    </span>
  );
}
