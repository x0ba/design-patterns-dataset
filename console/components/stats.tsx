import Link from 'next/link';
import type { Band } from '@/lib/format';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  band?: Band | 'warn';
  href?: string;
}

/** A row of headline numbers: label above, big tabular value, one line of context. */
export function Stats({ items, label }: { items: StatProps[]; label: string }) {
  return (
    <dl className="stats" aria-label={label}>
      {items.map((s) => (
        <div key={s.label} className="stat" data-band={s.band}>
          <dt>{s.href ? <Link href={s.href}>{s.label}</Link> : s.label}</dt>
          <dd>
            <span className="stat-value num">{s.value}</span>
            {s.sub ? <span className="stat-sub">{s.sub}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
