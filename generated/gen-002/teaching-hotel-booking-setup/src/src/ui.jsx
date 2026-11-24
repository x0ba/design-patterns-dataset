import { useEffect, useId, useRef } from 'react';
import { useStore } from './store.jsx';

const PATHS = {
  check: 'M20 6 9 17l-5-5',
  arrow: 'M5 12h14M12 5l7 7-7 7',
  x: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  alert: 'm10.3 3.9-8.2 14a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3l-8.2-14a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1ZM9 21v-7h6v7',
  bed: 'M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-8v6M6.5 11.5h.01',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8ZM7 7h.01',
  flask: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3M7.5 15h9',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  percent: 'M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  compare: 'M4 4h6v16H4zM14 4h6v16h-6z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  chevron: 'm6 9 6 6 6-6',
  merge: 'M6 3v6a6 6 0 0 0 6 6h6M18 15l-3-3M18 15l-3 3M6 21v-4',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  rocket: 'M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2M12 15 9 12a22 22 0 0 1 2-4 12 12 0 0 1 11-5c0 2.5-1 8-5 11a22 22 0 0 1-4 2ZM15 9h.01',
};

export function Icon({ name, size = 18, className = '', ...rest }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Button({ variant = 'secondary', size, icon, iconRight, children, className = '', ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
    </button>
  );
}

export function Chip({ tone = 'neutral', icon, children, title }) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

/** Native <dialog>: gives us focus trapping, Esc to close and inert background for free. */
export function Modal({ title, subtitle, onClose, children, footer, variant = 'modal', width, labelledBy }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet sheet-${variant}`}
      style={width ? { '--sheet-w': `${width}px` } : undefined}
      aria-labelledby={labelledBy || id}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="sheet-inner">
        <header className="sheet-head">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p className="sheet-sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </dialog>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  const id = useId();
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {typeof children === 'function' ? children({ id, 'aria-describedby': hint || error ? `${id}-d` : undefined, 'aria-invalid': !!error }) : children}
      {(error || hint) && <p id={`${id}-d`} className={error ? 'field-error' : 'field-hint'}>{error || hint}</p>}
    </div>
  );
}

export function Toast() {
  const { toast, dispatch, dismissToast } = useStore();
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className={`toast toast-${toast.tone}`} key={toast.id}>
          <Icon name={toast.tone === 'warn' ? 'alert' : 'check'} size={17} />
          <span>{toast.message}</span>
          {toast.prev && (
            <button
              type="button"
              className="toast-undo"
              onClick={() => { dispatch({ type: 'restore', state: toast.prev }); dismissToast(); }}
            >
              Undo
            </button>
          )}
          <button type="button" className="toast-x" onClick={dismissToast} aria-label="Dismiss">
            <Icon name="x" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

export function PageHead({ title, lead, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = 'info', icon, title, children, action }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={icon || (tone === 'info' ? 'info' : 'alert')} size={18} className="notice-icon" />
      <div className="notice-text">
        {title && <strong>{title}</strong>} {children}
      </div>
      {action}
    </div>
  );
}
