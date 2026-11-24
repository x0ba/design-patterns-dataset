import { useEffect, useState, type ReactNode } from 'react';
import { GLOSSARY } from '../help/content';

export function Term({ k, children }: { k: keyof typeof GLOSSARY | string; children?: ReactNode }) {
  const entry = GLOSSARY[k];
  if (!entry) return <>{children}</>;
  return (
    <span className="term" tabIndex={0}>
      {children ?? entry.label}
      <span className="term-pop" role="tooltip">
        <strong>{entry.label}</strong>
        <span>{entry.short}</span>
        <a href={`#/help/${entry.article}`}>Read the help article →</a>
      </span>
    </span>
  );
}

export type Tone = 'confirmed' | 'tentative' | 'empty' | 'resident' | 'free' | 'alert' | 'ok' | 'neutral' | 'warn';

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Panel({
  title,
  right,
  children,
  className = '',
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || right) && (
        <header className="panel-head">
          {title && <h2>{title}</h2>}
          {right && <div className="panel-right">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function GuideBox({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const key = `cabinroll.guide.${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) !== 'hidden';
    } catch {
      return true;
    }
  });
  const toggle = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(key, next ? 'shown' : 'hidden');
    } catch {
      // ignore storage errors
    }
  };
  if (!open) {
    return (
      <button className="guide-toggle" onClick={() => toggle(true)}>
        Show “{title}”
      </button>
    );
  }
  return (
    <aside className="guide">
      <div className="guide-head">
        <span className="guide-kicker">New to this screen?</span>
        <strong>{title}</strong>
        <button className="link-btn" onClick={() => toggle(false)}>
          Hide
        </button>
      </div>
      <div className="guide-body">{children}</div>
    </aside>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ width }}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export interface ImpactRow {
  label: string;
  before: string | number;
  after: string | number;
}

export function Impact({ title, rows, note }: { title: string; rows: ImpactRow[]; note?: ReactNode }) {
  return (
    <div className="impact">
      <div className="impact-title">{title}</div>
      <table className="impact-table">
        <tbody>
          {rows.map((r) => {
            const changed = String(r.before) !== String(r.after);
            return (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="num">{r.before}</td>
                <td className="arrow">{changed ? '→' : ''}</td>
                <td className={`num ${changed ? 'changed' : ''}`}>{r.after}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {note && <div className="impact-note">{note}</div>}
    </div>
  );
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  onClose,
  impact,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onClose: () => void;
  impact?: ReactNode;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className={`btn ${tone}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack">
        {children}
        {impact}
      </div>
    </Modal>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

// Shared "what changes" preview used by every dialog that changes a booking.
import type { AppState } from '../types';
import { arrivalCovers, summary } from '../logic';

export function coverImpact(before: AppState, after: AppState): ImpactRow[] {
  const b = arrivalCovers(before);
  const a = arrivalCovers(after);
  const sb = summary(before);
  const sa = summary(after);
  return [
    { label: 'Dinner, confirmed', before: b.D.confirmedTotal, after: a.D.confirmedTotal },
    { label: 'Dinner, pending', before: b.D.pendingTotal, after: a.D.pendingTotal },
    { label: 'Bunks held for BIO 377', before: sb.heldCount, after: sa.heldCount },
    { label: 'Waivers incomplete', before: sb.waiverIncomplete, after: sa.waiverIncomplete },
    { label: 'Free bunks', before: sb.freeCount, after: sa.freeCount },
  ];
}
