import { useMemo, useRef, useState } from 'react';
import {
  BAYS_PER_ROW,
  BINS,
  BIN_BY_ID,
  LEVEL_LABEL,
  ROWS,
  SIZES,
  SIZE_BY_KEY,
  SKU_BY_ID,
  RowId,
  SizeKey,
} from './data';
import { BinView, Capacity, Move, ViewMap, capacity } from './logic';

export type ColorMode = 'fill' | 'picks' | 'walk';

const ROW_TOP = (r: RowId) => 80 + ROWS.indexOf(r) * 56;
const BAY_RIGHT = 500;
const CELL_H = 9;
const bayX = (bay: number, wIn: number) => {
  const right = BAY_RIGHT - (bay - 1) * 40;
  const width = (wIn / 48) * 40;
  return { x: right - width, width };
};

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function ramp(stops: string[], t: number) {
  const x = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return mix(stops[i], stops[i + 1], x - i);
}
export const FILL_STOPS = ['#f1eee6', '#d8d3c6', '#aba495', '#7a7363', '#4a463d'];
export const PICK_STOPS = ['#f3eedf', '#f0d9a8', '#e3a35f', '#c9622f', '#8f3216'];
export const WALK_STOPS = ['#2f6b4f', '#7da57f', '#c9d6b4', '#ece4cc', '#e0cfb0'];

export function binPicks(v: BinView) {
  return v.lines.reduce((m, l) => Math.max(m, SKU_BY_ID[l.skuId].picks30), 0);
}

function cellColor(v: BinView, mode: ColorMode) {
  if (mode === 'fill') {
    if (v.fill <= 0.5) return '#fdfcf8';
    return ramp(FILL_STOPS, 0.12 + (v.fill / 100) * 0.88);
  }
  if (mode === 'picks') {
    if (!v.lines.length) return '#fdfcf8';
    return ramp(PICK_STOPS, binPicks(v) / 100);
  }
  return ramp(WALK_STOPS, (v.bin.distFt - 12) / 84);
}

interface Props {
  view: ViewMap;
  moves: Move[];
  mode: ColorMode;
  size: SizeKey;
  showFits: boolean;
  minFreePct: number | null;
  selectedBin: string | null;
  hoverBin: string | null;
  highlightBins: Set<string>;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function FloorMap(p: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ id: string; x: number; y: number } | null>(null);
  const sz = SIZE_BY_KEY[p.size];

  const caps = useMemo(() => {
    const m: Record<string, Capacity> = {};
    for (const b of BINS) m[b.id] = capacity(sz, p.view[b.id]);
    return m;
  }, [p.view, sz]);

  const fits = (id: string) => {
    const c = caps[id];
    if (c.units <= 0) return false;
    if (p.minFreePct != null && 100 - p.view[id].fill < p.minFreePct && !p.view[id].planned.length) return false;
    return true;
  };

  const center = (id: string, dy: number) => {
    const b = BIN_BY_ID[id];
    const bx = bayX(b.bay, b.w);
    return { x: bx.x + bx.width / 2, y: ROW_TOP(b.row) + (4 - b.level) * CELL_H + dy };
  };

  // Individual move arrows only for the bin under the cursor / selected.
  const focus = [p.hoverBin, p.selectedBin].filter(Boolean) as string[];
  const arrows = p.moves
    .filter((m) => m.toBin && (focus.includes(m.fromBin) || focus.includes(m.toBin)))
    .map((m) => {
      const a = center(m.fromBin, CELL_H / 2);
      const b = center(m.toBin!, CELL_H / 2);
      const cx = (a.x + b.x) / 2 + 60;
      const cy = (a.y + b.y) / 2 - 20;
      return { d: `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`, key: `${m.fromBin}-${m.toBin}` };
    });

  // One bundled arrow summarising the whole relocation.
  const bundle = useMemo(() => {
    const done = p.moves.filter((m) => m.toBin);
    if (!done.length) return null;
    const avg = (pts: { x: number; y: number }[]) => ({
      x: pts.reduce((t, q) => t + q.x, 0) / pts.length,
      y: pts.reduce((t, q) => t + q.y, 0) / pts.length,
    });
    const a = avg(done.map((m) => center(m.fromBin, 0)));
    const b = avg(done.map((m) => center(m.toBin!, 0)));
    const start = { x: a.x - 6, y: a.y + 30 };
    const end = { x: b.x + 10, y: b.y - 8 };
    return {
      d: `M${start.x},${start.y} C${start.x - 20},${start.y + 150} ${end.x + 120},${end.y - 40} ${end.x},${end.y}`,
      label: { x: (start.x + end.x) / 2 + 40, y: (start.y + end.y) / 2 + 16 },
      n: done.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.moves]);

  const searching = p.highlightBins.size > 0;
  const tipView = tip ? p.view[tip.id] : null;

  const onMove = (e: React.MouseEvent, id: string) => {
    const r = wrapRef.current!.getBoundingClientRect();
    setTip({ id, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  // Receiving area carton glyphs: 18 cartons by size
  const cartons: { key: SizeKey; i: number }[] = [];
  SIZES.forEach((s) => {
    for (let i = 0; i < s.cartons; i++) cartons.push({ key: s.key, i });
  });

  return (
    <div className="map-wrap" ref={wrapRef} onMouseLeave={() => setTip(null)}>
      <svg viewBox="-6 -14 612 428" className="floor-map" role="img" aria-label="Warehouse floor plan">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#d9b9a3" strokeWidth="2.2" />
          </pattern>
          <pattern id="fert" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="4" height="4" fill="#d8cc9a" />
            <line x1="0" y1="0" x2="0" y2="4" stroke="#a8964d" strokeWidth="1.4" />
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#7d6a2c" />
          </marker>
          <marker id="arrow-big" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#8b7a33" />
          </marker>
        </defs>

        {/* compass + scale */}
        <g className="map-meta">
          <text x="2" y="-4">N ↑</text>
          <g transform="translate(150,-8)">
            <line x1="0" y1="0" x2="100" y2="0" stroke="#8a8d82" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#8a8d82" />
            <line x1="100" y1="-3" x2="100" y2="3" stroke="#8a8d82" />
            <text x="106" y="3">10 ft</text>
          </g>
          <text x="600" y="-4" textAnchor="end">Unit 4 · 60 × 40 ft · 2,400 sq ft</text>
        </g>

        {/* shell */}
        <rect x="0" y="0" width="600" height="400" className="wall" />

        {/* door */}
        <line x1="30" y1="0" x2="140" y2="0" stroke="#fdfcf8" strokeWidth="5" />
        <line x1="30" y1="0" x2="140" y2="0" className="door" />
        <text x="85" y="13" className="zone-label" textAnchor="middle">Roll-up door</text>

        {/* receiving */}
        <rect x="14" y="24" width="104" height="150" className="zone receiving" rx="3" />
        <text x="66" y="38" className="zone-label" textAnchor="middle">Receiving</text>
        <text x="66" y="48" className="zone-sub" textAnchor="middle">18 cartons · Thu</text>
        {cartons.map((c, n) => (
          <rect
            key={n}
            x={24 + (n % 4) * 22}
            y={58 + Math.floor(n / 4) * 20}
            width="17"
            height="15"
            rx="1.5"
            className={`carton carton-${c.key}`}
          />
        ))}
        <g className="carton-legend">
          {SIZES.map((s, i) => (
            <g key={s.key} transform={`translate(${24 + i * 30},${166})`}>
              <rect width="6" height="6" className={`carton carton-${s.key}`} y="-5.5" />
              <text x="8">{s.key}</text>
            </g>
          ))}
        </g>
        <rect x="14" y="200" width="104" height="190" className="zone overflow" rx="3" />
        <text x="66" y="296" className="zone-sub" textAnchor="middle">Pallet overflow</text>
        <text x="66" y="306" className="zone-sub" textAnchor="middle">(floor, not slotted)</text>
        <text x="300" y="409" className="zone-label" textAnchor="middle">Back wall (south)</text>

        {/* packing */}
        <rect x="452" y="6" width="140" height="40" className="zone packing" rx="3" />
        <text x="522" y="24" className="zone-label strong" textAnchor="middle">Packing bench</text>
        <text x="522" y="35" className="zone-sub" textAnchor="middle">walk distances measured from here</text>
        <rect x="552" y="52" width="40" height="28" className="zone scale" rx="3" />
        <text x="572" y="69" className="zone-sub" textAnchor="middle">Scale</text>

        {/* fragile */}
        <rect x="562" y="100" width="32" height="294" fill="url(#hatch)" className="zone fragile" rx="3" />
        <text x="580" y="247" className="zone-label fragile-label" textAnchor="middle" transform="rotate(90 580 247)">
          Fragile goods · glass &amp; terrariums
        </text>

        {/* main walkway */}
        <path d="M522,46 L522,396" className="walkway" />
        <text x="534" y="230" className="zone-sub" transform="rotate(90 534 230)" textAnchor="middle">main walkway</text>

        {/* row labels & bay numbers */}
        {ROWS.map((r) => (
          <text key={r} x="128" y={ROW_TOP(r) + 20} className="row-label" textAnchor="middle">
            {r}
          </text>
        ))}
        {Array.from({ length: 9 }, (_, i) => i + 1).map((bay) => {
          const { x, width } = bayX(bay, bay === 9 ? 36 : 48);
          return (
            <text key={bay} x={x + width / 2} y={ROW_TOP('A') - 4} className="bay-label" textAnchor="middle">
              {bay}
            </text>
          );
        })}
        <rect x="167" y={ROW_TOP('E') + 8} width="9" height="16" className="post" />
        <text x="171.5" y={ROW_TOP('E') + 34} className="bay-label" textAnchor="middle">post</text>
        

        {/* bins */}
        {ROWS.map((r) =>
          Array.from({ length: BAYS_PER_ROW[r] }, (_, i) => i + 1).map((bay) => {
            const top = ROW_TOP(r);
            const sample = BIN_BY_ID[`${r}${bay}-1`];
            const { x, width } = bayX(bay, sample.w);
            return (
              <g key={`${r}${bay}`}>
                <rect x={x} y={top} width={width} height={CELL_H * 4} className="bay-frame" />
                {[4, 3, 2, 1].map((lvl) => {
                  const id = `${r}${bay}-${lvl}`;
                  const v = p.view[id];
                  const y = top + (4 - lvl) * CELL_H;
                  const planned = v.planned.reduce((t, a) => t + a.units, 0);
                  const fit = p.showFits && fits(id);
                  const isSel = p.selectedBin === id;
                  const isHover = p.hoverBin === id;
                  const hit = p.highlightBins.has(id);
                  return (
                    <g
                      key={id}
                      className="cell"
                      onClick={() => p.onSelect(id)}
                      onMouseEnter={() => p.onHover(id)}
                      onMouseMove={(e) => onMove(e, id)}
                      onMouseLeave={() => p.onHover(null)}
                      opacity={searching && !hit ? 0.35 : 1}
                    >
                      <rect
                        x={x + 0.6}
                        y={y + 0.6}
                        width={width - 1.2}
                        height={CELL_H - 1.2}
                        fill={v.reserved ? 'url(#fert)' : cellColor(v, p.mode)}
                        className="cell-bg"
                      />
                      {planned > 0 && (
                        <rect
                          x={x + 0.6}
                          y={y + 0.6}
                          width={width - 1.2}
                          height={CELL_H - 1.2}
                          className="cell-planned"
                        />
                      )}
                      {planned > 0 && (
                        <text x={x + 3} y={y + 6.4} className="cell-text">
                          {[...new Set(v.planned.map((a) => a.size))].join('+')} {planned}
                        </text>
                      )}
                      {v.movedTo && !planned && (
                        <text x={x + width / 2} y={y + 6.4} className="cell-text freed" textAnchor="middle">
                          freed
                        </text>
                      )}
                      {fit && !planned && (
                        <rect
                          x={x + 1.2}
                          y={y + 1.2}
                          width={width - 2.4}
                          height={CELL_H - 2.4}
                          className="cell-fit"
                        />
                      )}
                      {(hit || isHover || isSel) && (
                        <rect
                          x={x + 0.3}
                          y={y + 0.3}
                          width={width - 0.6}
                          height={CELL_H - 0.6}
                          className={isSel ? 'cell-sel' : hit ? 'cell-hit' : 'cell-hover'}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          }),
        )}

        {/* relocation arrows */}
        {bundle && (
          <g className="bundle">
            <path d={bundle.d} markerEnd="url(#arrow-big)" className="bundle-halo" />
            <path d={bundle.d} markerEnd="url(#arrow-big)" />
            <g transform={`translate(${bundle.label.x},${bundle.label.y})`}>
              <rect x="-62" y="-9" width="124" height="15" rx="7.5" />
              <text textAnchor="middle" y="2">
                Fertilizer → back wall · {bundle.n} bins
              </text>
            </g>
          </g>
        )}
        <g className="arrows">
          {arrows.map((a) => (
            <path key={a.key} d={a.d} markerEnd="url(#arrow)" />
          ))}
        </g>
      </svg>

      {tip && tipView && (
        <div
          className="map-tip"
          style={{
            left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 800) - 250),
            top: tip.y + 16,
          }}
        >
          <div className="tip-head">
            <b>{tip.id}</b>
            <span>
              {LEVEL_LABEL[tipView.bin.level]} · {tipView.bin.distFt} ft
            </span>
          </div>
          <div className="tip-row">
            {Math.round(tipView.fill)}% full · {Math.round(tipView.loadLb)}/{tipView.bin.limitLb} lb
          </div>
          {tipView.lines.slice(0, 2).map((l) => (
            <div className="tip-row muted" key={l.skuId}>
              {SKU_BY_ID[l.skuId].name} · {l.units} u · {SKU_BY_ID[l.skuId].picks30} picks/30d
            </div>
          ))}
          {tipView.movedTo && <div className="tip-row fert">Fertilizer moves to {tipView.movedTo}</div>}
          {tipView.movedFrom && <div className="tip-row fert">Receives fertilizer from {tipView.movedFrom}</div>}
          {tipView.planned.map((a) => (
            <div className="tip-row planned" key={a.id}>
              Planned: {a.units} × {SIZE_BY_KEY[a.size].short}
            </div>
          ))}
          <div className="tip-row fitline">
            {(() => {
              const c = caps[tip.id];
              if (c.blocked === 'overhead') return `${sz.short}: too heavy for overhead`;
              if (c.blocked === 'reserved') return `Reserved for fertilizer`;
              if (c.blocked === 'too-short') return `${sz.short}: box too tall`;
              return c.units > 0 ? `Room for ${c.units} × ${sz.short}` : `No room for ${sz.short}`;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
