import type { ReactNode } from 'react';
import type { Step } from '../../progress';

export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={s.label} className={s.done ? 'done' : ''}>
          <span className="step-n">{s.done ? '✓' : i + 1}</span>
          <span>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function CaseHead({ kind, tone, title, meta, steps, right }: { kind: string; tone: string; title: ReactNode; meta: ReactNode; steps?: Step[]; right?: ReactNode }) {
  return (
    <header className="case-head">
      <div className="case-head-row">
        <div>
          <div className={`case-kind k-${tone}`}>{kind}</div>
          <h2 className="case-title">{title}</h2>
          <div className="case-meta">{meta}</div>
        </div>
        {right}
      </div>
      {steps && <Steps steps={steps} />}
    </header>
  );
}

export const Section = ({ title, aside, children, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`csec ${className ?? ''}`}>
    <div className="csec-head"><h3>{title}</h3>{aside && <div className="csec-aside">{aside}</div>}</div>
    {children}
  </section>
);

export const Done = ({ children }: { children: ReactNode }) => <span className="done-chip">✓ {children}</span>;

export function Highlight({ text, re }: { text: string; re: RegExp }) {
  const parts: ReactNode[] = [];
  let last = 0;
  text.replace(re, (m, _g, offset: number) => {
    parts.push(text.slice(last, offset));
    parts.push(<mark key={offset}>{m}</mark>);
    last = offset + m.length;
    return m;
  });
  parts.push(text.slice(last));
  return <>{parts}</>;
}
