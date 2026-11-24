import type { ReactNode } from 'react';

export type Tone = 'safety' | 'protocol' | 'advisory' | 'info' | 'ok' | 'muted';

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Panel({
  title,
  aside,
  children,
  className = '',
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || aside) && (
        <header className="panel-head">
          {title && <h3>{title}</h3>}
          {aside && <div className="panel-aside">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="facts">
      {rows.map(([k, v]) => (
        <div className="fact" key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <div className="section-label">
      <span>{children}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </div>
  );
}

/** Schematic plate illustration for a meal photo. Generated from a colour seed. */
export function MealThumb({ hue, photo, label }: { hue: number; photo: boolean; label: string }) {
  if (!photo) {
    return (
      <div className="meal-thumb none" aria-label={`${label}: no photo`}>
        No photo
      </div>
    );
  }
  const c1 = `hsl(${hue} 55% 58%)`;
  const c2 = `hsl(${(hue + 70) % 360} 50% 52%)`;
  const c3 = `hsl(${(hue + 170) % 360} 45% 44%)`;
  return (
    <svg className="meal-thumb" viewBox="0 0 56 56" role="img" aria-label={`${label}: photo on file`}>
      <rect width="56" height="56" rx="6" fill="#eef1f5" />
      <circle cx="28" cy="28" r="21" fill="#ffffff" stroke="#d0d5dd" />
      <circle cx="28" cy="28" r="15" fill={`hsl(${hue} 30% 92%)`} />
      <circle cx="22" cy="25" r="6" fill={c1} />
      <circle cx="33" cy="30" r="5" fill={c2} />
      <circle cx="28" cy="19" r="3.5" fill={c3} />
    </svg>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function toneClass(t: Tone): string {
  return `tone-${t}`;
}
