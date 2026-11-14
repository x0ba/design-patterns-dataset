import React, { useEffect } from 'react';
import { PEOPLE, styleById, type GlyphStatus, type PersonId, type StyleId } from '../data/core';
import { useStore, type Toast } from '../store';

export function Avatar({ id, size = 28, live, dim }: { id: PersonId; size?: number; live?: boolean; dim?: boolean }) {
  const p = PEOPLE[id];
  return (
    <span className={`avatar ${dim ? 'dim' : ''}`} style={{ width: size, height: size, background: p.color, fontSize: size * 0.38 }} title={p.name}>
      {p.initials}
      {live && <span className="live-dot" />}
    </span>
  );
}

export function StatusPill({ status }: { status: GlyphStatus | 'sent-back' | 'pending' | 'accepted' | 'reverted' | 'locked' }) {
  const label: Record<string, string> = {
    approved: 'Approved', review: 'In review', draft: 'Draft', 'sent-back': 'Sent back', pending: 'To review',
    accepted: 'Accepted', reverted: 'Reverted', locked: 'Locked',
  };
  return <span className={`pill pill-${status}`}>{label[status]}</span>;
}

/** Specimen glyph rendered with the live webfont. */
export function Spec({ ch, style, size, className }: { ch: string; style: StyleId; size: number; className?: string }) {
  const s = styleById(style);
  return (
    <span className={`spec ${className ?? ''}`} style={{ fontWeight: s.weight, fontStyle: s.italic ? 'italic' : 'normal', fontSize: size }}>
      {displayChar(ch)}
    </span>
  );
}

export function displayChar(ch: string) {
  if (/^\p{M}$/u.test(ch)) return ' ' + ch + ' ';
  return ch;
}

export function Bar({ approved, review, draft, height = 6 }: { approved: number; review: number; draft: number; height?: number }) {
  const total = approved + review + draft || 1;
  return (
    <div className="bar" style={{ height }}>
      <span className="bar-approved" style={{ width: `${(approved / total) * 100}%` }} />
      <span className="bar-review" style={{ width: `${(review / total) * 100}%` }} />
      <span className="bar-draft" style={{ width: `${(draft / total) * 100}%` }} />
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, small }: {
  value: T; options: Array<{ value: T; label: React.ReactNode; title?: string }>; onChange: (v: T) => void; small?: boolean;
}) {
  return (
    <div className={`seg ${small ? 'seg-sm' : ''}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} title={o.title} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; disabled?: boolean }) {
  return (
    <label className={`toggle ${disabled ? 'disabled' : ''}`}>
      <button type="button" role="switch" aria-checked={on} disabled={disabled} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
        <span />
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}

function ToastItem({ t }: { t: Toast }) {
  const { dispatch } = useStore();
  useEffect(() => {
    const tm = setTimeout(() => dispatch({ type: 'dismiss', id: t.id }), 6000);
    return () => clearTimeout(tm);
  }, [t.id, dispatch]);
  return (
    <div className="toast">
      <span>{t.text}</span>
      {t.undo && (
        <button onClick={() => { dispatch(t.undo!); dispatch({ type: 'dismiss', id: t.id }); }}>Undo</button>
      )}
      <button className="x" aria-label="Dismiss" onClick={() => dispatch({ type: 'dismiss', id: t.id })}>×</button>
    </div>
  );
}

export function Toasts() {
  const { s } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {s.toasts.map((t) => <ToastItem key={t.id} t={t} />)}
    </div>
  );
}

export function Modal({ title, children, onClose, footer, width = 520 }: {
  title: string; children: React.ReactNode; onClose: () => void; footer?: React.ReactNode; width?: number;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width }} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export const Icon = {
  lock: (p: { size?: number }) => (
    <svg width={p.size ?? 12} height={p.size ?? 12} viewBox="0 0 12 12" className="ico"><rect x="2" y="5.2" width="8" height="5.8" rx="1" fill="currentColor" /><path d="M3.8 5.4V3.8a2.2 2.2 0 0 1 4.4 0v1.6" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
  ),
  check: (p: { size?: number }) => (
    <svg width={p.size ?? 12} height={p.size ?? 12} viewBox="0 0 12 12" className="ico"><path d="M2.2 6.4l2.4 2.4 5.2-5.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  cross: (p: { size?: number }) => (
    <svg width={p.size ?? 12} height={p.size ?? 12} viewBox="0 0 12 12" className="ico"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
  ),
  arrow: (p: { size?: number }) => (
    <svg width={p.size ?? 12} height={p.size ?? 12} viewBox="0 0 12 12" className="ico"><path d="M2 6h7.5M6.5 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  flag: (p: { size?: number }) => (
    <svg width={p.size ?? 12} height={p.size ?? 12} viewBox="0 0 12 12" className="ico"><path d="M3 11V1.5M3 2h6l-1.5 2.2L9 6.4H3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
  ),
  bubble: (p: { size?: number }) => (
    <svg width={p.size ?? 12} height={p.size ?? 12} viewBox="0 0 12 12" className="ico"><path d="M2 2.5h8v5.5H5.5L3 10V8H2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
  ),
};
