import type { ReactNode } from 'react';
import { cardExpiresBeforeDinner } from './logic';
import type { Card, Dietary } from './data';

export function Modal({
  title,
  onClose,
  children,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'accent'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function DietaryChip({ dietary }: { dietary?: Dietary | null }) {
  if (!dietary) return <span className="muted">None</span>;
  return (
    <span className={`diet ${dietary.conflict ? 'conflict' : ''}`} title={dietary.detail}>
      <span className="diet-note">{dietary.note}</span>
      <span className="diet-flag">{dietary.conflict ? 'Conflicts with menu' : 'No conflict'}</span>
    </span>
  );
}

export function CardLabel({ card }: { card: Card }) {
  const expiring = cardExpiresBeforeDinner(card.expiry);
  return (
    <span className="card-label">
      <span>
        {card.brand} ••{card.last4}
      </span>
      <span className={`card-exp ${expiring ? 'expiring' : ''}`}>
        {expiring ? `Expires ${card.expiry}` : `Exp ${card.expiry}`}
      </span>
    </span>
  );
}
