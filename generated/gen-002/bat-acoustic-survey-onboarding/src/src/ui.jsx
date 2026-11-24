import React from 'react';
import { LABELS } from './data.js';

const PATHS = {
  guide: 'M4 5h3M4 10h3M4 15h3M10 5h7M10 10h7M10 15h7',
  table: 'M3 4h14v12H3zM3 9h14M8 4v12',
  wave: 'M2 10h2l2-6 3 12 3-9 2 3h4',
  chart: 'M4 16V8M9 16V4M14 16v-6M2 16.5h16',
  sliders: 'M4 5h12M4 10h12M4 15h12M7 3.5v3M13 8.5v3M9 13.5v3',
  help: 'M10 17a7 7 0 100-14 7 7 0 000 14zM8 8a2 2 0 113 1.7c-.7.5-1 .9-1 1.6M10 14v.01',
  check: 'M4 10.5l4 4 8-9',
  arrow: 'M4 10h12M11 5l5 5-5 5',
  back: 'M16 10H4M9 5l-5 5 5 5',
  search: 'M9 15a6 6 0 100-12 6 6 0 000 12zM14 14l4 4',
  download: 'M10 3v10M5.5 9l4.5 4.5L14.5 9M3 17h14',
  undo: 'M5 8h7a4 4 0 010 8H8M8 4L4 8l4 4',
  alert: 'M10 3l8 14H2zM10 8v4M10 14.5v.01',
  info: 'M10 17a7 7 0 100-14 7 7 0 000 14zM10 9v5M10 6.5v.01',
  lock: 'M5 9h10v8H5zM7 9V6a3 3 0 016 0v3',
  x: 'M5 5l10 10M15 5L5 15',
  skip: 'M4 5l7 5-7 5zM14 5v10',
};

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function LabelChip({ label, small }) {
  const l = LABELS[label];
  return (
    <span className={`lchip${small ? ' small' : ''}`}>
      <i style={{ background: l.color }} />
      {l.name}
    </span>
  );
}

export function Slider({ label, unit, value, min, max, step = 1, onChange, hint, def, id }) {
  const pctFill = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="slider-top">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{value}<span> {unit}</span></output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        style={{ '--fill': `${pctFill}%` }}
        onChange={(e) => onChange(+e.target.value)} />
      <div className="slider-scale"><span>{min}</span><span>{max}</span></div>
      <div className="slider-hint">{hint}{def !== undefined && value !== def ? <button className="link" onClick={() => onChange(def)}>Set to {def}</button> : null}</div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.text}</span>
      {toast.action ? <button onClick={toast.action.run}>{toast.action.label}</button> : null}
      <button className="toast-x" aria-label="Dismiss" onClick={onClose}><Icon name="x" size={14} /></button>
    </div>
  );
}
