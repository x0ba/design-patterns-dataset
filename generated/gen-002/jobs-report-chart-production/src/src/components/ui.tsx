import type { ReactNode } from 'react';
import { personById, personName } from '../data/seed';
import type { Status } from '../lib/types';

export function statusSlug(s: Status): string {
  return s.replace(/\s+/g, '-');
}

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill st-${statusSlug(status)}`}>{status}</span>;
}

export function Avatar({ personId, size = 'md' }: { personId: string; size?: 'sm' | 'md' }) {
  const p = personById(personId);
  if (!p) {
    return <span className={`avatar av-system ${size}`} title="Automated data intake">DI</span>;
  }
  return (
    <span className={`avatar av-${p.id} ${size}`} title={`${p.name} · ${p.title}`} aria-hidden="true">
      {p.initials}
    </span>
  );
}

export function PersonName({ id }: { id: string }) {
  return <span className="person-name">{personName(id)}</span>;
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'danger' | 'ok' | 'info' }) {
  return <span className={`chip ${tone ? `chip-${tone}` : ''}`}>{children}</span>;
}

export function Card({ title, aside, children, className }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {(title || aside) && (
        <header className="card-head">
          {title && <h3>{title}</h3>}
          {aside && <div className="card-aside">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
