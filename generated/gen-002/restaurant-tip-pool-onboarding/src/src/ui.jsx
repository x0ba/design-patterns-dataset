import React from 'react';

const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Check = (p) => (<svg {...base} {...p}><path d="M3.2 8.4l3 3 6.6-6.8" /></svg>);
export const Chevron = (p) => (<svg {...base} {...p}><path d="M4 6l4 4 4-4" /></svg>);
export const Close = (p) => (<svg {...base} {...p}><path d="M4 4l8 8M12 4l-8 8" /></svg>);
export const Alert = (p) => (<svg {...base} {...p}><path d="M8 2.2l6.2 11H1.8L8 2.2z" /><path d="M8 6.6v3M8 11.6v.1" /></svg>);
export const Info = (p) => (<svg {...base} {...p}><circle cx="8" cy="8" r="6" /><path d="M8 7.4v3.4M8 5.2v.1" /></svg>);
export const Book = (p) => (<svg {...base} {...p}><path d="M3 3.2c1.8-.5 3.5-.3 5 .8 1.5-1.1 3.2-1.3 5-.8v9c-1.8-.5-3.5-.3-5 .8-1.5-1.1-3.2-1.3-5-.8v-9zM8 4v9" /></svg>);
export const Download = (p) => (<svg {...base} {...p}><path d="M8 2.5v8M4.8 7.6L8 10.8l3.2-3.2M3 13.2h10" /></svg>);
export const Lock = (p) => (<svg {...base} {...p}><rect x="3.2" y="7" width="9.6" height="6.4" rx="1.4" /><path d="M5.2 7V5.4a2.8 2.8 0 015.6 0V7" /></svg>);
export const Arrow = (p) => (<svg {...base} {...p}><path d="M3 8h10M9 4l4 4-4 4" /></svg>);

export const Logo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#F0B04A" />
    <path d="M7.5 24V9.5l5.2 4.1h6.6l5.2-4.1V24c0 2.2-3 3.4-8.5 3.4S7.5 26.2 7.5 24z" fill="#143632" />
    <path d="M12.5 19.5h7" stroke="#F0B04A" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export function Chip({ tone = 'neutral', children }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function Callout({ tone = 'info', title, children, icon }) {
  const Icon = icon || (tone === 'warn' || tone === 'danger' ? Alert : tone === 'ok' ? Check : Info);
  return (
    <div className={`callout callout-${tone}`} role={tone === 'danger' || tone === 'warn' ? 'alert' : undefined}>
      <span className="callout-icon"><Icon /></span>
      <div className="callout-body">
        {title && <p className="callout-title">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function LinkButton({ onClick, children, icon: Icon = Book }) {
  return (
    <button type="button" className="link-btn" onClick={onClick}>
      <Icon /> {children}
    </button>
  );
}
