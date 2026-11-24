import { ReactNode } from 'react'

export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  )
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, was, children, htmlFor }: { label: string; hint?: ReactNode; was?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className={`field ${was ? 'changed' : ''}`}>
      <div className="field-h">
        <label htmlFor={htmlFor}>{label}</label>
        {was && <span className="was">Live now: {was}</span>}
      </div>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export const Chip = ({ ed }: { ed: '2018' | '2021' | '2024' }) => <span className={`chip chip-${ed}`}>{ed}</span>
