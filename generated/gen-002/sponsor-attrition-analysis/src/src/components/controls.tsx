import { ReactNode, useEffect, useRef, useState } from 'react';

export function MultiSelect({ label, values, selected, onChange, wide }: { label: string; values: string[]; selected: number[]; onChange: (v: number[]) => void; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  const summary = selected.length === 0 ? 'All' : selected.length === 1 ? values[selected[0]] : `${selected.length} selected`;
  const toggle = (i: number) => onChange(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i].sort((a, b) => a - b));
  return (
    <div className="ms" ref={ref}>
      <button className={`ms-btn ${selected.length ? 'active' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ms-label">{label}</span>
        <span className="ms-val">{summary}</span>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
      </button>
      {open && (
        <div className={`ms-pop ${wide ? 'wide' : ''}`}>
          <div className="ms-pop-head">
            <span>{label}</span>
            {selected.length > 0 && <button className="link" onClick={() => onChange([])}>Clear</button>}
          </div>
          <div className={`ms-list ${wide ? 'cols' : ''}`}>
            {values.map((v, i) => (
              <label key={v} className="ms-item">
                <input type="checkbox" checked={selected.includes(i)} onChange={() => toggle(i)} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, size }: { options: { value: T; label: ReactNode; title?: string }[]; value: T; onChange: (v: T) => void; size?: 'sm' }) {
  return (
    <div className={`seg ${size === 'sm' ? 'seg-sm' : ''}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} title={o.title} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PinButton({ onClick, label = 'Add to brief' }: { onClick: () => void; label?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(false), 1600); return () => clearTimeout(t); }, [done]);
  return (
    <button className={`pin ${done ? 'done' : ''}`} onClick={() => { onClick(); setDone(true); }}>
      {done ? (
        <><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2 L5 8.5 L9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>Added</>
      ) : (
        <><svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2 V10 M2 6 H10" stroke="currentColor" strokeWidth="1.5" /></svg>{label}</>
      )}
    </button>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info" tabIndex={0} aria-label={text}>
      i<span className="info-pop">{text}</span>
    </span>
  );
}
