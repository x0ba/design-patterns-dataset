import React from 'react';

export function Icon({ name, size = 20, className = '' }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className: `icon ${className}` };
  switch (name) {
    case 'check':
      return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
    case 'alert':
      return <svg {...p}><path d="M12 8v5" /><path d="M12 16.5v.5" /><path d="M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>;
    case 'info':
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.5v.5" /></svg>;
    case 'arrow-right':
      return <svg {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>;
    case 'arrow-left':
      return <svg {...p}><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></svg>;
    case 'user':
      return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>;
    case 'users':
      return <svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" /><path d="M18.5 14.8c1.9.8 3 2.6 3 5.2" /></svg>;
    case 'clock':
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'pencil':
      return <svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>;
    case 'x':
      return <svg {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>;
    case 'shield':
      return <svg {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" /></svg>;
    case 'merge':
      return <svg {...p}><path d="M6 3v6a5 5 0 0 0 5 5h7" /><path d="M6 21v-4" /><path d="M15 11l3 3-3 3" /><circle cx="6" cy="18" r="0.5" /></svg>;
    case 'plus':
      return <svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
    case 'search':
      return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
    case 'utensils':
      return <svg {...p}><path d="M7 3v8" /><path d="M4.5 3v5a2.5 2.5 0 0 0 5 0V3" /><path d="M7 11v10" /><path d="M17 21V3c-2 1.5-3 4-3 7v3h3" /></svg>;
    case 'send':
      return <svg {...p}><path d="M21 3L10 14" /><path d="M21 3l-7 18-4-7-7-4 18-7z" /></svg>;
    case 'phone':
      return <svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
    case 'home':
      return <svg {...p}><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /></svg>;
    default:
      return null;
  }
}

export function Field({ id, label, hint, optional, error, children, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="optional">optional</span>}
      </label>
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          <Icon name="alert" size={18} /> <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function TextInput({ id, value, onChange, onBlur, error, hint, ...rest }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <input
      id={id}
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy}
      autoComplete="off"
      spellCheck={false}
      {...rest}
    />
  );
}

export function Chip({ selected, onClick, children, id, disabled, role = 'radio' }) {
  return (
    <button
      type="button"
      id={id}
      role={role}
      aria-checked={selected}
      className={`chip ${selected ? 'selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {selected && <Icon name="check" size={18} />}
      {children}
    </button>
  );
}
