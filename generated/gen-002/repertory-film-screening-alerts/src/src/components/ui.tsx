import type { ReactNode } from "react";
import type { Format, SalesPoint } from "../types";
import { fmtShortDay } from "../lib/time";

export function FormatBadge({ format }: { format: Format }) {
  return <span className={`fmt fmt-${format.toLowerCase()}`}>{format}</span>;
}

export function Chip({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "interrupt" | "roundup" | "neutral" | "seen" | "must" | "muted";
  title?: string;
  children: ReactNode;
}) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function SoldBar({ sold, seats }: { sold: number; seats: number }) {
  const pct = Math.round((sold / seats) * 100);
  const tone = pct >= 85 ? "hot" : pct >= 70 ? "warm" : "cool";
  return (
    <div className="soldbar">
      <div className="track" aria-hidden="true">
        <div className={`fill ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="soldtext">
        {sold} of {seats} · {pct}%
      </span>
    </div>
  );
}

export function Sparkline({ points, seats }: { points: SalesPoint[]; seats: number }) {
  const W = 320;
  const H = 72;
  const pad = 8;
  const n = points.length;
  const xs = points.map((_, i) => pad + (i * (W - pad * 2)) / Math.max(1, n - 1));
  const ys = points.map((p) => H - pad - (p.sold / seats) * (H - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return (
    <figure className="spark">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tickets sold over the last few days">
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} className="spark-axis" />
        <path d={d} className="spark-line" />
        {points.map((p, i) => (
          <circle key={p.date} cx={xs[i]} cy={ys[i]} r={3.5} className="spark-dot" />
        ))}
      </svg>
      <figcaption>
        {points.map((p) => (
          <span key={p.date}>
            {fmtShortDay(p.date)}
            <strong>{p.sold}</strong>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
      <span className="toggle-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export function Card({
  title,
  kicker,
  action,
  children,
  className = "",
}: {
  title?: string;
  kicker?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || kicker || action) && (
        <header className="card-head">
          <div>
            {kicker && <p className="kicker">{kicker}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
