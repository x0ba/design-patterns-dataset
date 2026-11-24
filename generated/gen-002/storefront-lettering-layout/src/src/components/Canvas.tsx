import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { boxOf } from '../geometry';
import { barZone, fmt } from '../model';
import type { Box, Doc, El } from '../types';
import { BAR_CLEAR, BAR_X0, BAR_X1, BAR_Y0, BAR_Y1, DOOR_X0, GLASS_BOTTOM, MARGIN, WIN_H, WIN_W } from '../window';
import { ElementArt, GoldDefs, type ViewMode } from './ElementArt';

const VB = { x: -5.5, y: -5, w: 84, h: 96 };
export const sy = (y: number) => WIN_H - y;

type Corner = 'tl' | 'tr' | 'bl' | 'br';
interface Drag {
  mode: 'move' | 'resize';
  id: string;
  sx: number;
  sy: number;
  start: El;
  box: Box;
  corner?: Corner;
  moved: boolean;
}

interface Props {
  doc: Doc;
  selected: string | null;
  view: ViewMode;
  grid: boolean;
  snap: boolean;
  keepout: boolean;
  ghost: Doc | null;
  zoomMul: number;
  onScale: (scale: number, fit: number) => void;
  onSelect: (id: string | null) => void;
  onBegin: () => void;
  onLive: (id: string, patch: Partial<El>) => void;
  onEnd: () => void;
  onCursor: (p: { x: number; y: number } | null) => void;
  onZoomWheel: (dir: 1 | -1) => void;
}

export default function Canvas(p: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [fit, setFit] = useState(8);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const scale = fit * p.zoomMul;
  const px = 1 / scale;

  useLayoutEffect(() => {
    const el = wrap.current!;
    const measure = () => {
      const f = Math.min((el.clientWidth - 8) / VB.w, (el.clientHeight - 8) / VB.h);
      setFit(Math.max(2, f));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    p.onScale(scale, fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, fit]);

  useEffect(() => {
    const el = wrap.current!;
    const h = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        p.onZoomWheel(e.deltaY < 0 ? 1 : -1);
      }
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [p]);

  const toInches = useCallback((e: { clientX: number; clientY: number }) => {
    const s = svg.current!;
    const m = s.getScreenCTM()!.inverse();
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: pt.x, y: WIN_H - pt.y };
  }, []);

  const els = p.doc.elements;
  const sel = els.find((e) => e.id === p.selected) ?? null;
  const selBox = sel && sel.visible ? boxOf(sel) : null;

  const snapTargets = useMemo(() => {
    return (id: string) => {
      const xs: number[] = [WIN_W / 2, MARGIN, WIN_W - MARGIN, BAR_X0, BAR_X1];
      const ys: number[] = [barZone.b, barZone.t, GLASS_BOTTOM + MARGIN, WIN_H - MARGIN];
      for (const o of els) {
        if (o.id === id || !o.visible) continue;
        const b = boxOf(o);
        xs.push(b.l, (b.l + b.r) / 2, b.r);
        ys.push(b.b, (b.b + b.t) / 2, b.t);
      }
      return { xs, ys };
    };
  }, [els]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const t = e.target as Element;
    const handle = t.closest('[data-handle]') as SVGElement | null;
    const hit = t.closest('[data-el]') as SVGElement | null;
    const pt = toInches(e);
    if (handle && sel && selBox && !sel.locked) {
      svg.current!.setPointerCapture(e.pointerId);
      drag.current = { mode: 'resize', id: sel.id, sx: pt.x, sy: pt.y, start: sel, box: selBox, corner: handle.dataset.handle as Corner, moved: false };
      p.onBegin();
      setDragging(true);
      return;
    }
    if (hit) {
      const id = hit.dataset.el!;
      const el = els.find((x) => x.id === id)!;
      p.onSelect(id);
      if (!el.locked) {
        svg.current!.setPointerCapture(e.pointerId);
        drag.current = { mode: 'move', id, sx: pt.x, sy: pt.y, start: el, box: boxOf(el), moved: false };
        p.onBegin();
        setDragging(true);
      }
      return;
    }
    p.onSelect(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const pt = toInches(e);
    p.onCursor(pt);
    const d = drag.current;
    if (!d) return;
    const dx = pt.x - d.sx, dy = pt.y - d.sy;
    if (!d.moved && Math.hypot(dx, dy) * scale < 3) return;
    d.moved = true;
    if (d.mode === 'move') {
      let nx = d.start.x + dx, ny = d.start.y + dy;
      const gx: number[] = [], gy: number[] = [];
      if (p.snap && !e.altKey) {
        const { xs, ys } = snapTargets(d.id);
        const thr = 7 / scale;
        const w = d.box.r - d.box.l, h = d.box.t - d.box.b;
        const l = d.box.l + dx, b = d.box.b + dy;
        let bestX = { d: Infinity, shift: 0, at: 0 };
        for (const off of [0, w / 2, w]) {
          for (const t of xs) {
            const dd = t - (l + off);
            if (Math.abs(dd) < Math.abs(bestX.d) && Math.abs(dd) < thr) bestX = { d: dd, shift: dd, at: t };
          }
        }
        let bestY = { d: Infinity, shift: 0, at: 0 };
        for (const off of [0, h / 2, h]) {
          for (const t of ys) {
            const dd = t - (b + off);
            if (Math.abs(dd) < Math.abs(bestY.d) && Math.abs(dd) < thr) bestY = { d: dd, shift: dd, at: t };
          }
        }
        if (bestX.d !== Infinity) { nx += bestX.shift; gx.push(bestX.at); } else nx = Math.round(nx * 8) / 8;
        if (bestY.d !== Infinity) { ny += bestY.shift; gy.push(bestY.at); } else ny = Math.round(ny * 8) / 8;
      } else if (!e.altKey) {
        nx = Math.round(nx * 8) / 8;
        ny = Math.round(ny * 8) / 8;
      }
      setGuides({ x: gx, y: gy });
      p.onLive(d.id, { x: round2(nx), y: round2(ny) });
    } else {
      const corner = d.corner!;
      const b = d.box;
      const cx = corner.includes('l') ? b.l : b.r;
      const cy = corner.includes('b') ? b.b : b.t;
      const fx = corner.includes('l') ? b.r : b.l;
      const fy = corner.includes('b') ? b.t : b.b;
      const vx = cx - fx, vy = cy - fy;
      const k0 = ((pt.x - fx) * vx + (pt.y - fy) * vy) / (vx * vx + vy * vy);
      const cap = Math.max(0.5, Math.min(48, Math.round(d.start.cap * k0 * 20) / 20));
      const k = cap / d.start.cap;
      p.onLive(d.id, { cap, x: round2(fx - k * (fx - d.start.x)), y: round2(fy - k * (fy - d.start.y)) });
    }
  };

  const endDrag = () => {
    if (drag.current) {
      drag.current = null;
      setDragging(false);
      setGuides({ x: [], y: [] });
      p.onEnd();
    }
  };

  const glass = p.view === 'glass';
  const lbl = 1.55;
  const hs = 9 * px; // handle size

  return (
    <div className="stage-scroll" ref={wrap}>
      <svg
        ref={svg}
        className={`stage-svg${dragging ? ' dragging' : ''}`}
        width={VB.w * scale}
        height={VB.h * scale}
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => !drag.current && p.onCursor(null)}
      >
        <defs>
          <GoldDefs />
          <linearGradient id="glass-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#dbe8e6" />
            <stop offset="0.5" stopColor="#c3d6d6" />
            <stop offset="1" stopColor="#a9c1c4" />
          </linearGradient>
          <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2f3f3" />
            <stop offset="0.35" stopColor="#bfc4c8" />
            <stop offset="0.7" stopColor="#8c9297" />
            <stop offset="1" stopColor="#d5d8da" />
          </linearGradient>
          <pattern id="keepout" width="1.1" height="1.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1.1" stroke="#c2352b" strokeWidth="0.22" />
          </pattern>
          <pattern id="kick-hatch" width="0.8" height="0.8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="0.8" stroke="#a7a39a" strokeWidth="0.08" />
          </pattern>
          <pattern id="ground" width="2" height="2" patternUnits="userSpaceOnUse">
            <rect width="2" height="2" fill="#cdc8bb" />
            <circle cx="0.5" cy="0.6" r="0.09" fill="#b4afa2" />
            <circle cx="1.4" cy="1.4" r="0.08" fill="#b9b4a6" />
          </pattern>
          <clipPath id="glass-clip">
            <rect x="0" y={0} width={WIN_W} height={WIN_H - GLASS_BOTTOM} />
          </clipPath>
        </defs>

        {/* ground */}
        <rect x={VB.x} y={WIN_H} width={VB.w} height={VB.y + VB.h - WIN_H} fill="url(#ground)" />
        <line x1={VB.x} x2={VB.x + VB.w} y1={WIN_H} y2={WIN_H} stroke="#6f6a5e" strokeWidth={1.5 * px} />

        {/* frame */}
        <rect x={-0.9} y={-0.9} width={WIN_W + 1.8} height={WIN_H + 0.9} fill={glass ? '#44494e' : '#bdb8ab'} rx={0.3} />
        {/* panel under the glass */}
        <rect x={0} y={WIN_H - GLASS_BOTTOM} width={WIN_W} height={GLASS_BOTTOM} fill={glass ? '#5b6166' : '#ebe7dc'} />
        {!glass && <rect x={0} y={WIN_H - GLASS_BOTTOM} width={WIN_W} height={GLASS_BOTTOM} fill="url(#kick-hatch)" />}
        {/* glass */}
        <rect x={0} y={0} width={WIN_W} height={WIN_H - GLASS_BOTTOM} fill={glass ? 'url(#glass-fill)' : '#fffdf8'} />
        {glass && (
          <g clipPath="url(#glass-clip)" pointerEvents="none">
            <polygon points="6,0 20,0 3,52 -8,52" fill="#fff" opacity="0.22" />
            <polygon points="24,0 29,0 12,52 7,52" fill="#fff" opacity="0.14" />
            <polygon points="46,0 66,0 74,30 74,52 56,52" fill="#fff" opacity="0.1" />
            <rect x={0} y={44} width={WIN_W} height={34} fill="#fff6e3" opacity="0.1" />
          </g>
        )}

        {/* door */}
        <g pointerEvents="none" stroke={glass ? '#4a5056' : '#8a857a'} strokeWidth={glass ? 0.5 : 1.2 * px} fill="none">
          <line x1={DOOR_X0} y1={sy(0)} x2={DOOR_X0} y2={sy(80)} />
          <line x1={DOOR_X0} y1={sy(80)} x2={WIN_W} y2={sy(80)} />
          <line x1={DOOR_X0 + 3.5} y1={sy(0)} x2={DOOR_X0 + 3.5} y2={sy(76.5)} strokeWidth={glass ? 0.12 : 1 * px} opacity={0.6} />
          <line x1={WIN_W - 3.5} y1={sy(0)} x2={WIN_W - 3.5} y2={sy(76.5)} strokeWidth={glass ? 0.12 : 1 * px} opacity={0.6} />
          <line x1={DOOR_X0 + 3.5} y1={sy(76.5)} x2={WIN_W - 3.5} y2={sy(76.5)} strokeWidth={glass ? 0.12 : 1 * px} opacity={0.6} />
        </g>

        {/* grid */}
        {p.grid && (
          <g pointerEvents="none" stroke={glass ? '#3d5560' : '#7d93a6'}>
            {Array.from({ length: WIN_W + 1 }, (_, i) => (
              <line key={`gx${i}`} x1={i} x2={i} y1={0} y2={WIN_H - GLASS_BOTTOM} strokeWidth={(i % 6 === 0 ? 1.1 : 0.55) * px} opacity={i % 6 === 0 ? 0.38 : 0.16} />
            ))}
            {Array.from({ length: WIN_H - GLASS_BOTTOM + 1 }, (_, i) => {
              const fy = WIN_H - i;
              return <line key={`gy${i}`} x1={0} x2={WIN_W} y1={sy(fy)} y2={sy(fy)} strokeWidth={(fy % 6 === 0 ? 1.1 : 0.55) * px} opacity={fy % 6 === 0 ? 0.38 : 0.16} />;
            })}
          </g>
        )}
        <line x1={WIN_W / 2} x2={WIN_W / 2} y1={0} y2={WIN_H} stroke="#0f7b6c" strokeWidth={1 * px} strokeDasharray={`${8 * px} ${5 * px}`} opacity={0.5} pointerEvents="none" />

        {/* compare ghost */}
        {p.ghost && (
          <g pointerEvents="none">
            {p.ghost.elements.map((e) => (
              <ElementArt key={`g-${e.id}`} el={e} finishes={p.ghost!.finishes} mode={p.view} ghost px={px} />
            ))}
          </g>
        )}

        {/* lettering */}
        {els.map((e) => (
          <ElementArt key={e.id} el={e} finishes={p.doc.finishes} mode={p.view} px={px} />
        ))}

        {/* push bar sits in front of the glass lettering */}
        <g pointerEvents="none">
          {p.keepout && (
            <g>
              <rect x={barZone.l} y={sy(barZone.t)} width={barZone.r - barZone.l} height={barZone.t - barZone.b} fill="url(#keepout)" opacity={0.28} />
              <rect x={barZone.l} y={sy(barZone.t)} width={barZone.r - barZone.l} height={barZone.t - barZone.b} fill="none" stroke="#c2352b" strokeWidth={1.2 * px} strokeDasharray={`${5 * px} ${3 * px}`} />
            </g>
          )}
          <rect x={BAR_X0} y={sy(BAR_Y1)} width={BAR_X1 - BAR_X0} height={BAR_Y1 - BAR_Y0} rx={0.9} fill={glass ? 'url(#bar-fill)' : '#e7e3d8'} stroke={glass ? '#6d7378' : '#6b665b'} strokeWidth={glass ? 0.12 : 1.2 * px} opacity={glass ? 0.96 : 1} />
          <rect x={BAR_X0 - 0.3} y={sy(BAR_Y1) - 0.3} width={1.6} height={BAR_Y1 - BAR_Y0 + 0.6} rx={0.4} fill={glass ? '#4d5358' : '#cfcabd'} stroke={glass ? 'none' : '#6b665b'} strokeWidth={px} />
          <rect x={BAR_X1 - 1.3} y={sy(BAR_Y1) - 0.3} width={1.6} height={BAR_Y1 - BAR_Y0 + 0.6} rx={0.4} fill={glass ? '#4d5358' : '#cfcabd'} stroke={glass ? 'none' : '#6b665b'} strokeWidth={px} />
          <text x={(BAR_X0 + BAR_X1) / 2} y={sy((BAR_Y0 + BAR_Y1) / 2) + 0.55} textAnchor="middle" fontSize={1.5} letterSpacing="0.3" fill={glass ? '#454b50' : '#5b564b'} className="dim-label">PUSH BAR</text>
        </g>

        {/* dimension ticks */}
        <g pointerEvents="none" className="dims" fontSize={lbl} fill="#5d574b" stroke="#8d8676" strokeWidth={px}>
          {[0, 12, 24, 36, 48, 60, 72, 84].map((v) => (
            <g key={`dy${v}`}>
              <line x1={-0.9} x2={-2} y1={sy(v)} y2={sy(v)} />
              <text x={-2.5} y={sy(v) + 0.5} textAnchor="end" stroke="none" className="dim-label">{v}″</text>
            </g>
          ))}
          <g>
            <line x1={-0.9} x2={-2} y1={sy(GLASS_BOTTOM)} y2={sy(GLASS_BOTTOM)} stroke="#2b6f8a" />
            <text x={-2.5} y={sy(GLASS_BOTTOM) + 0.5} textAnchor="end" stroke="none" fill="#2b6f8a" className="dim-label">glass 6″</text>
          </g>
          {[BAR_Y0, BAR_Y1].map((v) => (
            <g key={`bar${v}`}>
              <line x1={WIN_W + 0.9} x2={WIN_W + 2} y1={sy(v)} y2={sy(v)} stroke="#c2352b" />
              <text x={WIN_W + 2.5} y={sy(v) + 0.5} textAnchor="start" stroke="none" fill="#c2352b" className="dim-label">{v}″</text>
            </g>
          ))}
          <line x1={WIN_W + 1.4} x2={WIN_W + 1.4} y1={sy(BAR_Y0)} y2={sy(BAR_Y1)} stroke="#c2352b" strokeWidth={2 * px} />
          {[0, 12, 24, 36, 48, 60, 72].map((v) => (
            <g key={`dx${v}`}>
              <line x1={v} x2={v} y1={-0.9 - 0.2} y2={-2} />
              <text x={v} y={-2.7} textAnchor="middle" stroke="none" className="dim-label">{v}″</text>
            </g>
          ))}
        </g>

        {/* snap guides */}
        <g pointerEvents="none">
          {guides.x.map((x, i) => (
            <line key={`sx${i}`} x1={x} x2={x} y1={-1} y2={WIN_H} stroke="#d6246e" strokeWidth={1.2 * px} />
          ))}
          {guides.y.map((y, i) => (
            <line key={`sy${i}`} x1={0} x2={WIN_W} y1={sy(y)} y2={sy(y)} stroke="#d6246e" strokeWidth={1.2 * px} />
          ))}
        </g>

        {/* hit areas (above art, below handles) */}
        <g>
          {els.map((e) => {
            if (!e.visible) return null;
            const b = boxOf(e);
            const pad = 0.4;
            return (
              <rect
                key={`hit-${e.id}`}
                data-el={e.id}
                x={b.l - pad}
                y={sy(b.t) - pad}
                width={b.r - b.l + pad * 2}
                height={b.t - b.b + pad * 2}
                fill="transparent"
                style={{ cursor: e.locked ? 'not-allowed' : dragging ? 'grabbing' : 'grab' }}
              />
            );
          })}
        </g>

        {/* selection */}
        {sel && selBox && (
          <g>
            <rect
              x={selBox.l - 0.3}
              y={sy(selBox.t) - 0.3}
              width={selBox.r - selBox.l + 0.6}
              height={selBox.t - selBox.b + 0.6}
              fill="none"
              stroke="#0f7b6c"
              strokeWidth={1.5 * px}
              strokeDasharray={sel.locked ? `${4 * px} ${3 * px}` : undefined}
              pointerEvents="none"
            />
            {!sel.locked &&
              (['tl', 'tr', 'bl', 'br'] as Corner[]).map((c) => {
                const x = (c.includes('l') ? selBox.l - 0.3 : selBox.r + 0.3) - hs / 2;
                const y = (c.includes('t') ? sy(selBox.t) - 0.3 : sy(selBox.b) + 0.3) - hs / 2;
                return (
                  <rect key={c} data-handle={c} x={x} y={y} width={hs} height={hs} fill="#fff" stroke="#0f7b6c" strokeWidth={1.5 * px} style={{ cursor: c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize' }} />
                );
              })}
            <SizeTag sel={sel} box={selBox} px={px} />
          </g>
        )}

      </svg>
    </div>
  );
}

function SizeTag({ sel, box, px }: { sel: El; box: Box; px: number }) {
  const label = `${sel.kind === 'ornament' ? 'H' : 'Cap'} ${fmt(sel.cap)}″ · ${fmt(box.r - box.l, 1)}″ wide`;
  const w = (label.length * 6.1 + 14) * px;
  const h = 19 * px;
  const x = (box.l + box.r) / 2 - w / 2;
  const y = sy(box.t) - 0.3 - 10 * px - h;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx={4 * px} fill="#0f7b6c" />
      <text x={x + w / 2} y={y + h / 2 + 4 * px} textAnchor="middle" fontSize={11 * px} fill="#fff" fontFamily="IBM Plex Mono, monospace">{label}</text>
    </g>
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;
