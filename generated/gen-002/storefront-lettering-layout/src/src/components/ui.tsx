import { useEffect, useRef, useState, type ReactNode } from 'react';

export function NumberField(props: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  dp?: number;
  disabled?: boolean;
  width?: number | string;
  ariaLabel?: string;
}) {
  const { value, onChange, step = 1, min = -1e9, max = 1e9, unit, dp = 2, disabled } = props;
  const show = (v: number) => String(Math.round(v * 10 ** dp) / 10 ** dp);
  const [draft, setDraft] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <label className={`nf${disabled ? ' disabled' : ''}`} style={{ width: props.width }}>
      {props.label && <span className="nf-label">{props.label}</span>}
      <input
        ref={ref}
        aria-label={props.ariaLabel ?? props.label}
        inputMode="decimal"
        disabled={disabled}
        value={draft ?? show(value)}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(clamp(v));
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
            const v = clamp(value + (e.key === 'ArrowUp' ? 1 : -1) * step * mult);
            setDraft(null);
            onChange(Math.round(v * 1000) / 1000);
          } else if (e.key === 'Enter') {
            setDraft(null);
            ref.current?.blur();
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setDraft(null);
            ref.current?.blur();
          }
        }}
      />
      {unit && <span className="nf-unit">{unit}</span>}
    </label>
  );
}

export function Slider(props: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; disabled?: boolean }) {
  const pct = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <input
      type="range"
      className="slider"
      aria-label={props.label}
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value}
      disabled={props.disabled}
      style={{ ['--pct' as string]: `${Math.max(0, Math.min(100, pct))}%` }}
      onChange={(e) => props.onChange(parseFloat(e.target.value))}
    />
  );
}

export function Segmented<T extends string>(props: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; small?: boolean; ariaLabel?: string }) {
  return (
    <div className={`seg${props.small ? ' small' : ''}`} role="radiogroup" aria-label={props.ariaLabel}>
      {props.options.map((o) => (
        <button key={o.value} role="radio" aria-checked={props.value === o.value} title={o.title} className={props.value === o.value ? 'on' : ''} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch(props: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={props.on} aria-label={props.label} disabled={props.disabled} className={`switch${props.on ? ' on' : ''}`} onClick={() => props.onChange(!props.on)}>
      <span />
    </button>
  );
}

export function Section(props: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="sec">
      <header>
        <h3>{props.title}</h3>
        {props.right}
      </header>
      {props.children}
    </section>
  );
}

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [props]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={props.title} style={{ width: props.width ?? 520 }}>
        <header>
          <h2>{props.title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={props.onClose}>×</button>
        </header>
        <div className="modal-body">{props.children}</div>
        {props.footer && <footer>{props.footer}</footer>}
      </div>
    </div>
  );
}
