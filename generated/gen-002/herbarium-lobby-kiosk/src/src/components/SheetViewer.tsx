import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Specimen } from '../types';
import { LABEL_VIEW, SHEET_H, SHEET_VIEW, SHEET_W, sheetMarkup } from '../lib/sheetMarkup';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_W = 110; // closest zoom: about 9x
const MAX_W = SHEET_W * 1.15;
const ASPECT = SHEET_H / SHEET_W;

function clampView(v: ViewBox): ViewBox {
  const w = Math.min(MAX_W, Math.max(MIN_W, v.w));
  const h = w * ASPECT;
  // Keep part of the sheet on screen at all times.
  const x = Math.min(SHEET_W - w * 0.75, Math.max(-w * 0.25, v.x));
  const y = Math.min(SHEET_H - h * 0.75, Math.max(-h * 0.25, v.y));
  return { x, y, w, h };
}

/** Zoom by `factor` keeping the point at fraction (fx, fy) of the viewport fixed. */
function zoomAround(v: ViewBox, factor: number, fx: number, fy: number): ViewBox {
  const w = v.w * factor;
  const h = w * ASPECT;
  const px = v.x + fx * v.w;
  const py = v.y + fy * v.h;
  return clampView({ x: px - fx * w, y: py - fy * h, w, h });
}

export function SheetViewer({
  spec,
  start = 'full',
  label,
  className = '',
}: {
  spec: Specimen;
  start?: 'full' | 'label';
  label: string;
  className?: string;
}) {
  const initial = start === 'label' ? LABEL_VIEW : SHEET_VIEW;
  const [vb, setVb] = useState<ViewBox>(initial);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const hostRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; start: ViewBox } | null>(null);

  const markup = useMemo(() => (spec.imaged ? sheetMarkup(spec, 'full') : ''), [spec]);

  // A new sheet starts in the requested framing.
  useEffect(() => {
    setVb(start === 'label' ? LABEL_VIEW : SHEET_VIEW);
  }, [spec.catalogNumber, start]);

  // Wheel zoom needs a non-passive listener so the page does not scroll under the sheet.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !spec.imaged) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      setVb((v) => zoomAround(v, factor, fx, fy));
    };
    host.addEventListener('wheel', onWheel, { passive: false });
    return () => host.removeEventListener('wheel', onWheel);
  }, [spec.imaged]);

  if (!spec.imaged) {
    return (
      <div className={`viewer viewer--not-imaged ${className}`} role="img" aria-label={`${spec.catalogNumber}: not imaged`}>
        <div className="not-imaged">
          <p className="not-imaged__title">Not imaged</p>
          <p>{spec.loanNote ?? 'This sheet has no digital image yet.'}</p>
          <p className="muted">The label transcription and determination history are available on the right.</p>
        </div>
      </div>
    );
  }

  const localPoint = (clientX: number, clientY: number) => {
    const rect = hostRef.current!.getBoundingClientRect();
    return { fx: (clientX - rect.left) / rect.width, fy: (clientY - rect.top) / rect.height, rect };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    hostRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), start: vbRef.current };
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      const rect = hostRef.current!.getBoundingClientRect();
      const scale = vbRef.current.w / rect.width;
      const dx = (e.clientX - prev.x) * scale;
      const dy = (e.clientY - prev.y) * scale;
      setVb((v) => clampView({ ...v, x: v.x - dx, y: v.y - dy }));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < 1) return;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const { fx, fy } = localPoint(mid.x, mid.y);
      const s = pinch.current.start;
      const w = Math.min(MAX_W, Math.max(MIN_W, s.w * (pinch.current.dist / dist)));
      const h = w * ASPECT;
      setVb(clampView({ x: s.x + fx * s.w - fx * w, y: s.y + fy * s.h - fy * h, w, h }));
    }
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    // The remaining finger keeps its last position, so a pan continues without jumping.
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (hostRef.current?.hasPointerCapture(e.pointerId)) hostRef.current.releasePointerCapture(e.pointerId);
  };

  const zoomBy = (factor: number) => setVb((v) => zoomAround(v, factor, 0.5, 0.5));
  const zoomPct = (SHEET_W / vb.w).toFixed(1);

  return (
    <div
      ref={hostRef}
      className={`viewer ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={(e) => {
        if (e.buttons === 0) onPointerEnd(e);
      }}
    >
      <svg
        className="viewer__svg"
        viewBox={`${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={label}
      >
        <g dangerouslySetInnerHTML={{ __html: markup }} />
      </svg>
      <div className="viewer__controls" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn--icon" aria-label="Zoom out" onClick={() => zoomBy(1.35)}>
          −
        </button>
        <span className="viewer__zoom" aria-live="polite">
          {zoomPct}×
        </span>
        <button type="button" className="btn btn--icon" aria-label="Zoom in" onClick={() => zoomBy(1 / 1.35)}>
          +
        </button>
        <button type="button" className="btn" onClick={() => setVb(SHEET_VIEW)}>
          Whole sheet
        </button>
        <button type="button" className="btn" onClick={() => setVb(LABEL_VIEW)}>
          Read label
        </button>
      </div>
    </div>
  );
}
