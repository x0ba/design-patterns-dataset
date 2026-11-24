// Minimal chart helpers: scales, ticks, and a width hook. Charts are plain SVG at the
// measured pixel width, so text stays crisp and nothing depends on a charting library.

import { useEffect, useRef, useState, type RefObject } from 'react';

export type Scale = ((x: number) => number) & { invert: (y: number) => number };

export function linScale(d0: number, d1: number, r0: number, r1: number): Scale {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const f = ((x: number) => r0 + (x - d0) * k) as Scale;
  f.invert = (y: number) => (k === 0 ? d0 : d0 + (y - r0) / k);
  return f;
}

export function logScale(d0: number, d1: number, r0: number, r1: number): Scale {
  const l0 = Math.log(Math.max(d0, 1e-9));
  const l1 = Math.log(Math.max(d1, 1e-9));
  const k = (r1 - r0) / (l1 - l0);
  const f = ((x: number) => r0 + (Math.log(Math.max(x, 1e-9)) - l0) * k) as Scale;
  f.invert = (y: number) => Math.exp(l0 + (y - r0) / k);
  return f;
}

/** Round tick values with a 1-2-5 step, roughly `count` of them. */
export function niceTicks(d0: number, d1: number, count = 5): number[] {
  const span = Math.abs(d1 - d0) || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const out: number[] = [];
  const start = Math.ceil(Math.min(d0, d1) / step) * step;
  for (let v = start; v <= Math.max(d0, d1) + step * 1e-6; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

/** Tick positions in minutes, on clean boundaries (every 15/30/60/120/180/360/720 minutes). */
export function minuteTicks(m0: number, m1: number, target = 7): number[] {
  const span = m1 - m0;
  const steps = [5, 10, 15, 30, 60, 120, 180, 240, 360, 720, 1440];
  const want = span / target;
  const step = steps.find((s) => s >= want) ?? 1440;
  const out: number[] = [];
  const first = Math.ceil(m0 / step) * step;
  for (let m = first; m <= m1; m += step) out.push(m);
  return out;
}

/** Track an element's content width. */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(200, Math.floor(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
