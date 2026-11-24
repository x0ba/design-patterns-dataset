import type { ReactNode } from 'react';
import type { Cls, Confidence, Decision, Method } from '../types';
import { CLS_SHORT, DECISION_LABEL, FLAG_LABEL, METHOD_NAME, type FlagCode } from '../lib/model';

export function ConfChip({ c }: { c: Confidence | undefined }) {
  if (!c) return <span className="muted">—</span>;
  return <span className={`chip conf conf-${c}`}>{c}</span>;
}

export function ClsChip({ cls, title }: { cls: Cls; title?: string }) {
  return (
    <span className={`chip cls cls-${cls.toLowerCase()}`} title={title}>
      {CLS_SHORT[cls]}
    </span>
  );
}

export function MethodText({ m }: { m: Method | undefined }) {
  if (!m) return <span className="muted">—</span>;
  return <span className={`method method-${m}`}>{METHOD_NAME[m]}</span>;
}

export function DecisionChip({ d }: { d: Decision | undefined }) {
  const status = d ? d.status : 'open';
  return <span className={`chip dec dec-${status}`}>{DECISION_LABEL[status]}</span>;
}

export function FlagChip({ code }: { code: FlagCode }) {
  const blocking = code === 'conflict';
  return <span className={`chip flag ${blocking ? 'flag-block' : 'flag-warn'}`}>{FLAG_LABEL[code]}</span>;
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const width = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="progress-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

export function Stacked({ parts }: { parts: { value: number; cls: string; label: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="stacked" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
      {parts.map((p) => (
        <div key={p.label} className={`seg ${p.cls}`} style={{ width: `${(p.value / total) * 100}%` }} />
      ))}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className ?? ''}`}>
      {(title || actions) && (
        <header className="panel-head">
          <h2>{title}</h2>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
