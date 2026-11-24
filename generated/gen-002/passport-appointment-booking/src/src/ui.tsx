import React from 'react';
import * as I from './icons';
import type { CheckStatus, Readiness } from './logic';

export function StatusIcon({ status, size = 14 }: { status: CheckStatus | Readiness; size?: number }) {
  const map: Record<string, JSX.Element> = {
    ok: <I.Check size={size} />,
    cost: <I.Minus size={size} />,
    tight: <I.Alert size={size} />,
    bad: <I.X size={size} />,
    late: <I.X size={size} />,
    unknown: <I.Help size={size} />,
    na: <I.Doc size={size} />,
  };
  return <span className={`sicon s-${status}`}>{map[status]}</span>;
}

export function Chip({ tone, children, title }: { tone: string; children: React.ReactNode; title?: string }) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Modal({
  onClose,
  title,
  children,
  width = 640,
  labelledBy = 'modal-title',
}: {
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
  labelledBy?: string;
}) {
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy} style={{ width }}>
        {title && (
          <div className="modal-head">
            <h2 id={labelledBy}>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <I.X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function OfficeBadge({ letter, className = '' }: { letter: string; className?: string }) {
  return <span className={`office-badge ob-${letter} ${className}`}>{letter}</span>;
}
