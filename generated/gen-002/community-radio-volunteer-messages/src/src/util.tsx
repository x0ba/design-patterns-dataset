import React from 'react';
import { ME, Thread, Volunteer, externals, shows, volunteers } from './data';
import { now } from './store';

export const volById = (id: string): Volunteer | undefined => volunteers.find((v) => v.id === id);
export const firstName = (name: string) => name.split(' ')[0];

export function personName(id: string) {
  if (id === ME) return 'You';
  if (id.startsWith('ext:')) return externals[id]?.name ?? id;
  return volById(id)?.name ?? id;
}

export function showsFor(volId: string) {
  return shows.filter((s) => s.hostIds.includes(volId) || s.boardOpId === volId);
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function hourLabel(h: number) {
  const hh = h % 24;
  const ap = hh < 12 ? 'am' : 'pm';
  const n = hh % 12 === 0 ? 12 : hh % 12;
  return `${n}${ap}`;
}
export function slotLabel(start: number, end: number) {
  const ap = (h: number) => (h % 24 < 12 ? 'am' : 'pm');
  const n = (h: number) => (h % 12 === 0 ? 12 : h % 12);
  if (ap(start) === ap(end)) return `${n(start)}–${n(end)} ${ap(end)}`;
  return `${n(start)} ${ap(start)}–${n(end)} ${ap(end)}`;
}

export function threadTitle(t: Thread) {
  if (t.kind === 'group') return t.title ?? 'Group';
  const other = t.members.find((x) => x !== ME)!;
  if (t.kind === 'email') return personName(other);
  return personName(other);
}
export function otherMember(t: Thread) {
  return t.members.find((x) => x !== ME)!;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function clock(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function listTime(iso: string) {
  const d = new Date(iso);
  const n = now();
  if (sameDay(d, n)) return clock(d);
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  const diff = (n.getTime() - d.getTime()) / 86400000;
  if (diff < 6) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function dayHeading(iso: string) {
  const d = new Date(iso);
  const n = now();
  if (sameDay(d, n)) return 'Today';
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function ago(iso: string) {
  const mins = Math.max(0, Math.round((now().getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
export function waitDays(iso: string) {
  return (now().getTime() - new Date(iso).getTime()) / 86400000;
}

const PALETTE = ['#b4532a', '#4d7c0f', '#0e7490', '#7e22ce', '#be123c', '#a16207', '#1d4ed8', '#047857', '#9d174d', '#4338ca', '#57534e', '#0f766e'];
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
export function initials(name: string) {
  const p = name.replace(/[^A-Za-z' -]/g, '').split(' ').filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ id, size = 32, label }: { id: string; size?: number; label?: string }) {
  const name = label ?? (id === ME ? 'Dev Raman' : personName(id));
  const bg = id.startsWith('ext:') ? '#57534e' : PALETTE[hash(id) % PALETTE.length];
  return (
    <span className="avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function GroupAvatar({ title, size = 32 }: { title: string; size?: number }) {
  return (
    <span className="avatar group" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {initials(title)}
    </span>
  );
}

const paths: Record<string, React.ReactNode> = {
  inbox: <><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v6H3v-6z" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c2.9.2 5 2.6 5 5.8" /></>,
  bookmark: <><path d="M6 3h12v18l-6-4-6 4z" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  send: <><path d="M4 12l16-8-6 16-2.5-6.5z" /><path d="M11.5 13.5L20 4" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4.5M12 17.5v.5" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5L12 13l8.5-6.5" /></>,
  radio: <><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 000 8.4M16.2 7.8a6 6 0 010 8.4M5 5a10 10 0 000 14M19 5a10 10 0 010 14" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  phone: <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" /></>,
  chev: <><path d="M9 6l6 6-6 6" /></>,
  chevDown: <><path d="M6 9l6 6 6-6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  log: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h7" /></>,
  wave: <><path d="M3 12h2l2-6 3 12 3-9 2 5 2-2h4" /></>,
  forward: <><path d="M14 6l6 6-6 6" /><path d="M20 12H9a5 5 0 00-5 5v1" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  sparkle: <><path d="M12 3v18M3 12h18" /></>,
};

export function Icon({ name, size = 16, stroke = 1.8 }: { name: keyof typeof paths | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden className="icon">
      {paths[name]}
    </svg>
  );
}

/** Fill {placeholders} we can resolve; leave unknown ones for the user to edit. */
export function fillTemplate(body: string, t: Thread | undefined) {
  if (!t) return body;
  const other = otherMember(t);
  let first = '';
  let show = '';
  if (t.kind !== 'group') {
    first = firstName(personName(other));
    const s = showsFor(other)[0];
    if (s) show = s.name;
  }
  return body
    .replace(/\{first_name\}/g, first || '{first_name}')
    .replace(/\{show\}/g, show || '{show}')
    .replace(/\{my_name\}/g, 'Dev');
}
