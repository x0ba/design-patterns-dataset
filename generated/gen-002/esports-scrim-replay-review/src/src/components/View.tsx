import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ROUND_BY_ID } from '../data/scrim';
import type { PovId } from '../data/types';
import { drawFrame, type FrameOpts } from '../engine/frame';
import { PovRenderer } from '../engine/raycast';

interface Props {
  roundId: string;
  t: number;
  pov: PovId;
  res: [number, number];
  opts?: FrameOpts;
  className?: string;
  /** minimum seconds of playhead change before redrawing (thumbnails) */
  throttle?: number;
}

export function View({ roundId, t, pov, res, opts, className, throttle = 0 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const renderer = useMemo(() => new PovRenderer(res[0], res[1]), [res[0], res[1]]);
  const last = useRef<{ t: number; key: string }>({ t: -99, key: '' });

  useLayoutEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize([r.width, r.height]);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !size[0]) return;
    const key = `${roundId}|${pov}|${size[0]}|${size[1]}|${JSON.stringify(opts ?? {})}`;
    if (throttle && key === last.current.key && Math.abs(t - last.current.t) < throttle) return;
    last.current = { t, key };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(size[0] * dpr), H = Math.round(size[1] * dpr);
    if (el.width !== W || el.height !== H) { el.width = W; el.height = H; }
    const ctx = el.getContext('2d')!;
    drawFrame(ctx, W, H, ROUND_BY_ID[roundId], t, pov, renderer, opts);
  });

  return <canvas ref={ref} className={className} />;
}

/** Static snapshot (for clip thumbnails). */
export function Snapshot({ roundId, t, pov, className }: { roundId: string; t: number; pov: PovId; className?: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    const id = window.setTimeout(() => {
      const c = document.createElement('canvas');
      c.width = 224; c.height = 126;
      const r = new PovRenderer(224, 126);
      drawFrame(c.getContext('2d')!, 224, 126, ROUND_BY_ID[roundId], t, pov, r, { compact: true });
      setUrl(c.toDataURL('image/jpeg', 0.8));
    }, 30);
    return () => clearTimeout(id);
  }, [roundId, t, pov]);
  return url ? <img src={url} className={className} alt="" draggable={false} /> : <div className={className} />;
}
