import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
          className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Card({ title, sub, right, children, className = '' }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={'card ' + className}>
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {right && <div className="card-right">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export const Swatch = ({ color }: { color: string }) => <span className="swatch" style={{ background: color }} aria-hidden="true" />;

export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export function Sparkline({ points, width = 150, height = 44, zeroLine = true }: { points: { x: number; y: number }[]; width?: number; height?: number; zeroLine?: boolean }) {
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys);
  const sx = (x: number) => 2 + ((x - x0) / (x1 - x0 || 1)) * (width - 4);
  const sy = (y: number) => height - 3 - ((y - y0) / (y1 - y0 || 1)) * (height - 8);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const area = d + `L${sx(x1).toFixed(1)},${sy(0).toFixed(1)}L${sx(x0).toFixed(1)},${sy(0).toFixed(1)}Z`;
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} className="spark" aria-hidden="true">
      <path d={area} className="spark-area" />
      {zeroLine && <line x1="0" x2={width} y1={sy(0)} y2={sy(0)} className="spark-zero" />}
      <path d={d} className="spark-line" />
      <circle cx={sx(last.x)} cy={sy(last.y)} r="3" className="spark-dot" />
    </svg>
  );
}
