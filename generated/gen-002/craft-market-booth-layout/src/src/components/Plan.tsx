import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { EXITS, FIXED, GYM, HALL, OUTLETS, STAGE, CORRIDOR } from '../data/venue';
import { CATEGORY_COLOR } from '../lib/colors';
import { hardConflict, outletUsers, venueOf } from '../lib/rules';
import { wrapLines } from '../lib/text';
import type { Placements, Rect, Vendor } from '../lib/types';

export const PAD = { left: 52, top: 34, right: 64, bottom: 36, gap: 70 };

export function planSize(scale: number) {
  const gymH = GYM.h * scale;
  const hallTop = PAD.top + gymH + PAD.gap;
  return {
    width: PAD.left + GYM.w * scale + PAD.right,
    height: hallTop + HALL.h * scale + PAD.bottom,
    hallTop,
  };
}

type Venue = 'gym' | 'hall';

interface DragState {
  id: string;
  venue: Venue;
  dx: number;
  dy: number;
  w: number;
  h: number;
  from: { x: number; y: number };
  /** Last position that was legal (what the booth shows and what gets committed on release). */
  cur: { x: number; y: number };
  /** Where the pointer is asking the booth to go (shown in red when blocked). */
  attempt: { x: number; y: number };
  valid: boolean;
  msg: string | null;
}

export interface PlanProps {
  idPrefix: string;
  placements: Placements;
  vendors: Vendor[];
  scale: number;
  selectedId?: string | null;
  levels?: Map<string, 'error' | 'caution'>;
  readOnly?: boolean;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onInvalidDrop?: (msg: string) => void;
  onOutletClick?: (outletId: string) => void;
}

const snap = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

const FIXED_SHORT: Record<string, string> = { entry: 'Entry & cashbox', bake: 'Bake sale', raffle: 'Raffle' };
const FIXED_OUTSIDE = new Set(['bake', 'raffle']);

export function Plan(props: PlanProps) {
  const { idPrefix, placements, vendors, scale: S, selectedId, levels, readOnly, onSelect, onMove, onInvalidDrop, onOutletClick } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const vmap = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);
  const { width, height, hallTop } = planSize(S);
  const gx = PAD.left;
  const gy = PAD.top;
  const gw = GYM.w * S;
  const gh = GYM.h * S;
  const hx = PAD.left;
  const hy = hallTop;
  const hw = HALL.w * S;
  const hh = HALL.h * S;
  const used = outletUsers(placements);
  const px = (v: Venue, x: number) => (v === 'gym' ? gx : hx) + x * S;
  const py = (v: Venue, y: number) => (v === 'gym' ? gy : hy) + y * S;
  const rectPx = (v: Venue, r: Rect) => ({ x: px(v, r.x), y: py(v, r.y), w: r.w * S, h: r.h * S });
  const ids = `${idPrefix}`;

  const toMeters = (e: { clientX: number; clientY: number }, venue: Venue) => {
    const box = svgRef.current!.getBoundingClientRect();
    const sx = e.clientX - box.left;
    const sy = e.clientY - box.top;
    return venue === 'gym' ? { x: (sx - gx) / S, y: (sy - gy) / S } : { x: (sx - hx) / S, y: (sy - hy) / S };
  };

  const onBoothDown = (e: ReactPointerEvent<SVGGElement>, id: string) => {
    e.stopPropagation();
    onSelect?.(id);
    if (readOnly || !onMove) return;
    const p = placements[id];
    const v = vmap.get(id);
    if (!p || !v) return;
    const venue: Venue = venueOf(v) === 'hall' ? 'hall' : 'gym';
    const m = toMeters(e, venue);
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag({
      id,
      venue,
      dx: m.x - p.x,
      dy: m.y - p.y,
      w: p.w,
      h: p.h,
      from: { x: p.x, y: p.y },
      cur: { x: p.x, y: p.y },
      attempt: { x: p.x, y: p.y },
      valid: true,
      msg: null,
    });
  };

  const onMoveSvg = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const v = vmap.get(drag.id);
    if (!v) return;
    const m = toMeters(e, drag.venue);
    const maxX = (drag.venue === 'gym' ? GYM.w : HALL.w) - drag.w;
    const maxY = (drag.venue === 'gym' ? GYM.h : HALL.h) - drag.h;
    const x = clamp(snap(m.x - drag.dx), 0, maxX);
    const y = drag.venue === 'hall' ? 0 : clamp(snap(m.y - drag.dy), 0, maxY);
    const msg = hardConflict(v, { x, y, w: drag.w, h: drag.h }, placements, vmap);
    setDrag((d) => (d && d.id === drag.id ? { ...d, valid: !msg, msg, cur: msg ? d.cur : { x, y }, attempt: { x, y } } : d));
  };

  const onUpSvg = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    svgRef.current?.releasePointerCapture?.(e.pointerId);
    const d = drag;
    setDrag(null);
    if (d.cur.x !== d.from.x || d.cur.y !== d.from.y) onMove?.(d.id, d.cur.x, d.cur.y);
    if (!d.valid && d.msg) onInvalidDrop?.(`Stopped short: ${d.msg.charAt(0).toLowerCase()}${d.msg.slice(1)}.`);
  };

  const onBgDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const t = e.target as Element;
    if (t.getAttribute('data-bg')) onSelect?.(null);
  };

  // Booth rendering helpers
  const boothNodes = [];
  for (const [id, placement] of Object.entries(placements)) {
    const v = vmap.get(id);
    if (!v) continue;
    const venue: Venue = venueOf(v) === 'hall' ? 'hall' : 'gym';
    const p = drag && drag.id === id ? { ...placement, x: drag.cur.x, y: drag.cur.y } : placement;
    const r = rectPx(venue, p);
    const level = levels?.get(id);
    const selected = selectedId === id;
    const stroke = selected ? '#1565c0' : level === 'error' ? '#c62828' : level === 'caution' ? '#e08a00' : '#4b4b4b';
    const strokeW = selected ? 3 : level ? 2.2 : 1;
    const maxChars = Math.max(5, Math.floor((r.w - 8) / 5.4));
    const maxLines = Math.max(1, Math.floor((r.h - 22) / 11));
    const lines = wrapLines(v.name, maxChars, maxLines);
    const outletNo = p.outlet ? OUTLETS.find((o) => o.id === p.outlet)?.n : undefined;
    const isHall = venue === 'hall';
    const outletLabel = v.power ? (outletNo ? `⚡${outletNo}` : '⚡ none') : '';
    const lineDescription = `${v.name} · ${v.boothNo} · ${p.w} × ${p.h} m${v.power ? ' · needs power' : ''}`;
    boothNodes.push(
      <g
        key={id}
        data-booth={id}
        style={{ cursor: readOnly || !onMove ? 'default' : drag ? 'grabbing' : 'grab' }}
        onPointerDown={(e) => onBoothDown(e, id)}
      >
        <title>{lineDescription}</title>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={CATEGORY_COLOR[v.category]} stroke={stroke} strokeWidth={strokeW} rx={1.5} />
        {lines.map((line, i) => (
          <text key={i} x={r.x + 4} y={r.y + 12 + i * 11} fontSize={isHall ? 8.6 : 9.6} fill="#1d1d1d">
            {line}
          </text>
        ))}
        <text x={r.x + 4} y={r.y + r.h - 5} fontSize={9.5} fontWeight={700} fill="#1d1d1d">
          {v.boothNo}
        </text>
        {outletLabel && (
          <text x={r.x + r.w - 4} y={r.y + r.h - 5} fontSize={9} textAnchor="end" fill={outletNo ? '#2c3e50' : '#c62828'} fontWeight={600}>
            {outletLabel}
          </text>
        )}
        {level === 'error' && (
          <g>
            <circle cx={r.x + r.w - 6} cy={r.y + 6} r={5.5} fill="#c62828" />
            <text x={r.x + r.w - 6} y={r.y + 9} fontSize={9} fontWeight={700} fill="#fff" textAnchor="middle">
              !
            </text>
          </g>
        )}
      </g>,
    );
  }

  // While dragging into an illegal spot, show the attempted position in red.
  const ghostRect =
    drag && !drag.valid ? rectPx(drag.venue, { x: drag.attempt.x, y: drag.attempt.y, w: drag.w, h: drag.h }) : null;

  const gridLines = [];
  for (let x = 3; x < GYM.w; x += 3) gridLines.push(<line key={`gx${x}`} x1={gx + x * S} x2={gx + x * S} y1={gy} y2={gy + gh} stroke="#e7e4da" strokeDasharray="2 4" />);
  for (let y = 3; y < GYM.h; y += 3) gridLines.push(<line key={`gy${y}`} x1={gx} x2={gx + gw} y1={gy + y * S} y2={gy + y * S} stroke="#e7e4da" strokeDasharray="2 4" />);

  const corridor = rectPx('gym', CORRIDOR);
  const stage = rectPx('gym', STAGE);
  const doorEx = EXITS.find((e) => e.id === 'N');
  const exitLabelPos: Record<string, { x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = {
    N: { x: px('gym', (doorEx?.door.x ?? 0) + 1.2), y: gy - 8, anchor: 'middle' },
    W: { x: gx - 6, y: py('gym', 8.7) + 3, anchor: 'end' },
    E: { x: gx + gw + 6, y: py('gym', 13.5) + 3, anchor: 'start' },
    S: { x: px('gym', 13.8), y: gy + gh + 16, anchor: 'middle' },
  };

  return (
    <svg
      ref={svgRef}
      id={ids}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', userSelect: 'none', touchAction: 'none' }}
      onPointerDown={onBgDown}
      onPointerMove={onMoveSvg}
      onPointerUp={onUpSvg}
      onPointerCancel={onUpSvg}
      role="img"
      aria-label="Booth layout plan: gym and front hallway"
    >
      <defs>
        <pattern id={`${idPrefix}-hatch`} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={6} stroke="#9a9a9a" strokeWidth={2} />
        </pattern>
      </defs>

      {/* Gym */}
      <text x={gx} y={gy - 20} fontSize={11} fontWeight={700} fill="#333">
        Elementary school gym · 30 × 18 m
      </text>
      <text x={PAD.left - 36} y={gy + 12} fontSize={10} fill="#555">
        N ↑
      </text>
      <rect data-bg="1" x={gx} y={gy} width={gw} height={gh} fill="#fbfaf4" stroke="none" />
      {gridLines}
      {/* Stage */}
      <rect x={stage.x} y={stage.y} width={stage.w} height={stage.h} fill={`url(#${idPrefix}-hatch)`} stroke="#666" />
      <rect x={stage.x + 6} y={stage.y + stage.h / 2 - 22} width={stage.w - 12} height={44} fill="#f5f2e8" stroke="none" opacity={0.92} />
      <text x={stage.x + stage.w / 2} y={stage.y + stage.h / 2 - 4} fontSize={9.5} fontWeight={700} fill="#444" textAnchor="middle">
        STAGE
      </text>
      <text x={stage.x + stage.w / 2} y={stage.y + stage.h / 2 + 9} fontSize={8.5} fill="#666" textAnchor="middle">
        off limits
      </text>
      {/* Corridor and clear zones */}
      <rect x={corridor.x} y={corridor.y} width={corridor.w} height={corridor.h} fill="rgba(255,183,0,0.32)" stroke="#b86e00" strokeDasharray="4 3" strokeWidth={1.2} />
      <text transform={`translate(${corridor.x + corridor.w / 2 + 3.5}, ${corridor.y + corridor.h - 6}) rotate(-90)`} fontSize={8.5} fill="#7a4a00" fontWeight={600}>
        1.8 m clear corridor
      </text>
      {EXITS.filter((e) => e.id !== 'N').map((e) => {
        const c = rectPx('gym', e.clear);
        return <rect key={e.id} x={c.x} y={c.y} width={c.w} height={c.h} fill="rgba(255,183,0,0.10)" stroke="#b86e00" strokeDasharray="3 3" strokeWidth={0.8} />;
      })}
      {/* Exits: door gaps in the walls */}
      {EXITS.map((e) => {
        const d = rectPx('gym', e.door);
        return <rect key={`door-${e.id}`} x={d.x} y={d.y} width={d.w} height={d.h} fill="#fbfaf4" stroke="none" />;
      })}
      {EXITS.map((e) => {
        const pos = exitLabelPos[e.id];
        if (!pos) return null;
        const text = e.id === 'N' ? 'NORTH EXIT' : e.id === 'W' ? 'WEST EXIT' : e.id === 'E' ? 'EAST EXIT' : 'SOUTH DOORS · ENTRY';
        return (
          <text key={`lbl-${e.id}`} x={pos.x} y={pos.y} fontSize={8.5} fontWeight={700} fill="#7a4a00" textAnchor={pos.anchor}>
            {text}
          </text>
        );
      })}
      {/* Walls */}
      <rect x={gx} y={gy} width={gw} height={gh} fill="none" stroke="#3a3a3a" strokeWidth={3} />
      {/* Fixed items */}
      {FIXED.map((f) => {
        const r = rectPx('gym', f.rect);
        return (
          <g key={f.id}>
            <title>{f.label} (fixed)</title>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#d4d4d0" stroke="#666" />
            {FIXED_OUTSIDE.has(f.id) ? (
              <text x={r.x + r.w + 4} y={r.y + r.h / 2 + 3} fontSize={8.6} fill="#333" fontWeight={600}>
                {FIXED_SHORT[f.id] ?? f.label}
              </text>
            ) : (
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 3} fontSize={7.6} fill="#333" textAnchor="middle" fontWeight={600}>
                {FIXED_SHORT[f.id] ?? f.label}
              </text>
            )}
          </g>
        );
      })}
      {/* Hallway */}
      <text x={hx} y={hy - 12} fontSize={11} fontWeight={700} fill="#333">
        Front hallway · 22 × 3.5 m · booths on the north wall only
      </text>
      <rect data-bg="1" x={hx} y={hy} width={hw} height={hh} fill="#fbfaf4" stroke="#3a3a3a" strokeWidth={2} />
      <line x1={hx} x2={hx + hw} y1={hy + HALL.boothDepth * S} y2={hy + HALL.boothDepth * S} stroke="#bbb" strokeDasharray="5 4" />
      <text x={hx + hw - 6} y={hy + HALL.boothDepth * S + 12} fontSize={8.5} fill="#777" textAnchor="end">
        open walkway, keep clear
      </text>
      {/* Booths */}
      {boothNodes}
      {/* Outlets */}
      {OUTLETS.map((o) => {
        const cx = px('gym', o.x);
        const cy = py('gym', o.y);
        const users = used.get(o.id) ?? [];
        const holder = users[0] ? vmap.get(users[0]) : undefined;
        return (
          <g
            key={o.id}
            data-ui="1"
            style={{ cursor: onOutletClick ? 'pointer' : 'default' }}
            onClick={() => onOutletClick?.(o.id)}
          >
            <title>
              {`Outlet ${o.n} · ${o.wall === 'N' ? 'north' : o.wall === 'S' ? 'south' : o.wall === 'E' ? 'east' : 'west'} wall · circuit ${o.circuit}${o.circuit === 'C5' ? ' (shared with outlet ' + (o.n === 5 ? 6 : 5) + ')' : ''} · ${holder ? 'in use by ' + holder.name : 'free'}`}
            </title>
            <circle cx={cx} cy={cy} r={7} fill={holder ? '#ffe27a' : '#bdeeb4'} stroke={holder ? '#8a6a00' : '#2e7d32'} strokeWidth={1.5} />
            <text x={cx} y={cy + 3} fontSize={8.5} fontWeight={700} textAnchor="middle" fill="#222">
              {o.n}
            </text>
          </g>
        );
      })}
      {/* Drag ghost (blocked attempt) */}
      {ghostRect && (
        <rect x={ghostRect.x} y={ghostRect.y} width={ghostRect.w} height={ghostRect.h} fill="rgba(198,40,40,0.14)" stroke="#c62828" strokeDasharray="5 3" strokeWidth={2} pointerEvents="none" />
      )}
      {/* Scale bar */}
      <g transform={`translate(${gx + gw - 3 * S}, ${gy + gh + 22})`}>
        <line x1={0} x2={3 * S} y1={0} y2={0} stroke="#444" strokeWidth={2} />
        <text x={3 * S / 2} y={12} fontSize={8.5} textAnchor="middle" fill="#444">
          3 m
        </text>
      </g>
    </svg>
  );
}
