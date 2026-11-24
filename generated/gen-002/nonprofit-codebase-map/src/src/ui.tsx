import { covColor, SERVICE_COLOR, personColor, personByName, serviceById, type ServiceId } from './data';

export function CovBar({ value, wide }: { value: number; wide?: boolean }) {
  return (
    <span className={'covbar' + (wide ? ' covbar-wide' : '')} title={`${value}% test coverage`}>
      <span className="covbar-track"><span className="covbar-fill" style={{ width: Math.max(2, value) + '%', background: covColor(value) }} /></span>
      <span className="covbar-n">{value}%</span>
    </span>
  );
}
export function ServiceDot({ id }: { id: ServiceId }) {
  return <span className="svc-dot" style={{ background: SERVICE_COLOR[id] }} aria-hidden />;
}
export function ServiceTag({ id }: { id: ServiceId }) {
  const s = serviceById[id];
  return <span className="svc-tag"><ServiceDot id={id} />{s.name}<span className="muted"> · {s.lang}</span></span>;
}
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const active = personByName[name]?.active;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: active ? personColor(name) : '#CFC7B9', color: active ? '#fff' : '#4A4338' }} aria-hidden>
      {name.charAt(0)}
    </span>
  );
}
export function PathText({ dir, name }: { dir: string; name: string }) {
  return <span className="path"><span className="path-dir">{dir}/</span><span className="path-name">{name}</span></span>;
}
export const Icon = {
  search: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4 4" /></svg>,
  close: <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>,
  swap: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v13M6 16l-3-3M6 16l3-3M14 17V4M14 4l-3 3M14 4l3 3" /></svg>,
  plus: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>,
  minus: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 10h12" /></svg>,
  fit: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" /></svg>,
  copy: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /></svg>,
  check: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg>,
  chevron: <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l5 5 5-5" /></svg>,
  panelL: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M8 4v12" /></svg>,
  panelR: <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M12 4v12" /></svg>,
  pin: <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor"><path d="M4 3h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-3 3v-3H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /></svg>,
  route: <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="5" r="2" /><circle cx="15" cy="15" r="2" /><path d="M7 5h5a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6" /></svg>,
};
export function Cairn({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#2A241D" />
      <ellipse cx="16" cy="23" rx="9" ry="4" fill="#E8D8AE" />
      <ellipse cx="16" cy="16" rx="6.5" ry="3.4" fill="#C9B27A" />
      <ellipse cx="16" cy="10" rx="4" ry="2.6" fill="#F3EEE4" />
    </svg>
  );
}
