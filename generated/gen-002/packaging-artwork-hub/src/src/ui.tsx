import React, { useEffect, useRef, useState } from 'react';
import {
  Status, decodeFileName, findBrand, findLine, findFormat, findEntry, artworkOf, DIELINES, REG_BLOCKS, ASSETS, GUIDES, LANGS, COUNTRY,
} from './data';
import { splitRoute, navigate } from './router';
import { useStore } from './store';

// ───────────── Icons ─────────────
const ICONS: Record<string, string> = {
  brand: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  dieline: 'M4 4h16v16H4z M4 9h16 M9 4v16',
  assets: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M16.5 13a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7z',
  reg: 'M6 3h9l4 4v14H6z M15 3v4h4 M9 11h7 M9 15h7 M9 19h4',
  guide: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19V5 M8 7h7',
  recent: 'M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18z M12 7v5l3 2',
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13z M15.5 15.5L20 20',
  pin: 'M9 3h6l-1 6 4 4H6l4-4z M12 13v8',
  chevR: 'M9 6l6 6-6 6',
  chevD: 'M6 9l6 6 6-6',
  back: 'M10 6l-6 6 6 6 M4 12h16',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  copy: 'M8 8h11v11H8z M5 16V5h11',
  info: 'M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18z M12 11v6 M12 7.5v.5',
  warn: 'M12 3l10 18H2z M12 10v5 M12 18v.5',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12 M18 6L6 18',
  send: 'M4 12l16-8-6 16-3-7z M11 13l9-9',
  shared: 'M8 12a3 3 0 1 1 0-.01z M16 6a3 3 0 1 1 0-.01z M16 18a3 3 0 1 1 0-.01z M10.6 10.7l3-2 M10.6 13.3l3 2',
  globe: 'M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  barcode: 'M4 5v14 M7 5v14 M9 5v14 M12 5v14 M15 5v14 M17 5v14 M20 5v14',
  printer: 'M7 8V3h10v5 M5 8h14a2 2 0 0 1 2 2v6h-4v4H7v-4H3v-6a2 2 0 0 1 2-2z M7 14h10',
  compare: 'M4 4h7v16H4z M13 4h7v16h-7z',
  arrowUp: 'M12 19V5 M6 11l6-6 6 6',
  file: 'M6 3h8l4 4v14H6z M14 3v4h4',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
};
export function Icon({ name, size = 16, className, stroke = 1.8 }: { name: string; size?: number; className?: string; stroke?: number }) {
  return (
    <svg className={`ic ${className || ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

// ───────────── Status ─────────────
export const STATUS_LABEL: Record<string, string> = {
  approved: 'Approved', in_review: 'In review', superseded: 'Superseded', draft: 'Draft', archived: 'Archived', current: 'Current', withdrawn: 'Withdrawn', new: 'New',
};
export function StatusPill({ status, big, current }: { status: Status | 'current' | 'withdrawn' | 'new'; big?: boolean; current?: boolean }) {
  return (
    <span className={`pill pill-${status} ${big ? 'pill-big' : ''}`}>
      <span className="dot" />
      {STATUS_LABEL[status]}
      {current && status === 'approved' ? ' · current' : ''}
    </span>
  );
}

// ───────────── File name with decoder ─────────────
export function FileName({ file, big }: { file: string; big?: boolean }) {
  const parts = decodeFileName(file);
  const ext = file.match(/\.\w+$/)?.[0] ?? '';
  return (
    <span className={`fname ${big ? 'fname-big' : ''}`}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="fsep">_</span>}
          <span className="fpart" tabIndex={0} data-tip={`${p.label}: ${p.meaning}`}>{p.text}</span>
        </React.Fragment>
      ))}
      <span className="fext">{ext}</span>
    </span>
  );
}

// ───────────── Popover ─────────────
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

export function A({ to, children, className, title, onClick }: { to: string; children: React.ReactNode; className?: string; title?: string; onClick?: () => void }) {
  return (
    <a href={'#' + to} className={className} title={title} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onClick?.(); navigate(to); }}>
      {children}
    </a>
  );
}

export function CopyButton({ text, label = 'Copy', what }: { text: string; label?: string; what?: string }) {
  const { toast } = useStore();
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={() => {
        const ok = () => { setDone(true); toast(`${what || 'Text'} copied to clipboard`, 'ok'); setTimeout(() => setDone(false), 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, ok); else ok();
      }}
    >
      <Icon name={done ? 'check' : 'copy'} size={14} /> {done ? 'Copied' : label}
    </button>
  );
}

export function PinButton({ route }: { route: string }) {
  const { pins, togglePin, toast } = useStore();
  const on = pins.includes(route);
  return (
    <button className={`btn btn-ghost btn-sm ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => { togglePin(route); toast(on ? 'Removed from pinned' : 'Pinned to the sidebar — click it to come back here'); }}>
      <Icon name="pin" size={14} /> {on ? 'Pinned' : 'Pin'}
    </button>
  );
}

// ───────────── Route description (for recents, pins, return links) ─────────────
export interface RouteInfo { title: string; sub: string; kind: string; icon: string; status?: Status }
export function describeRoute(route: string): RouteInfo {
  const { segs, query } = splitRoute(route);
  const [root, ...rest] = segs;
  if (root === 'b') {
    const [b, l, f, m, v] = rest;
    const brand = findBrand(b);
    if (!brand) return { title: 'Brand structure', sub: 'All brands', kind: 'Brands', icon: 'brand' };
    if (!l) return { title: brand.name, sub: `Brand · ${brand.lines.length} product lines`, kind: 'Brand', icon: 'brand' };
    const line = findLine(b, l);
    if (!line) return { title: brand.name, sub: 'Brand', kind: 'Brand', icon: 'brand' };
    if (!f) return { title: `${brand.name} ${line.name}`, sub: 'Product line', kind: 'Product line', icon: 'brand' };
    const fmt = findFormat(b, l, f);
    if (!fmt) return { title: `${brand.name} ${line.name}`, sub: 'Product line', kind: 'Product line', icon: 'brand' };
    if (!m) {
      if (query.get('focus') === 'archive') return { title: fmt.archived[0]?.file ?? 'Archive', sub: `Archived · ${brand.name} ${line.name} ${fmt.name}`, kind: 'Archived file', icon: 'file', status: 'archived' };
      return { title: `${brand.name} ${line.name} · ${fmt.name}`, sub: `Pack format · ${fmt.markets.length} markets`, kind: 'Pack format', icon: 'brand' };
    }
    const ent = findEntry(b, l, f, m);
    if (!ent) return { title: fmt.name, sub: 'Pack format', kind: 'Pack format', icon: 'brand' };
    if (!v) return { title: `${ent.country.name} · ${brand.name} ${line.name} ${fmt.name}`, sub: `Market entry · ${ent.country.region}`, kind: 'Market entry', icon: 'globe' };
    const art = artworkOf(ent);
    const ver = art.versions.find((x) => `v${x.n}` === v);
    if (!ver) return { title: ent.country.name, sub: 'Market entry', kind: 'Market entry', icon: 'globe' };
    return { title: ver.file, sub: `${art.marketIds.map((x) => COUNTRY[x].name).join(' & ')} · v${ver.n}`, kind: 'Artwork version', icon: 'file', status: ver.status };
  }
  if (root === 'dielines') {
    const d = rest[0] && DIELINES[rest[0]];
    return d ? { title: d.id, sub: `Dieline · ${d.title} · rev ${d.rev}`, kind: 'Dieline', icon: 'dieline' } : { title: 'Dieline library', sub: 'All dielines', kind: 'Dieline library', icon: 'dieline' };
  }
  if (root === 'reg') {
    const r = rest[1] && REG_BLOCKS[rest[1]];
    if (r) return { title: r.id, sub: `${LANGS[r.lang]} text · ${r.brand.name} ${r.line.name}`, kind: 'Regulatory text', icon: 'reg' };
    const c = rest[0] && COUNTRY[rest[0]];
    return { title: c ? `Regulatory text — ${c.name}` : 'Regulatory text library', sub: 'By country', kind: 'Regulatory text', icon: 'reg' };
  }
  if (root === 'assets') {
    const a = ASSETS.find((x) => x.id === rest[1]);
    return a ? { title: a.name, sub: `Shared asset · ${a.variant}`, kind: 'Shared asset', icon: 'assets' } : { title: 'Shared assets', sub: 'Logos, legal marks, recycling icons', kind: 'Shared assets', icon: 'assets' };
  }
  if (root === 'guide') {
    const g = GUIDES.find((x) => x.id === rest[0]);
    return { title: g ? g.title : 'Team guidelines', sub: 'Team guideline', kind: 'Guideline', icon: 'guide' };
  }
  if (root === 'recent') return { title: 'Recently viewed', sub: '', kind: 'Recent', icon: 'recent' };
  if (root === 'search') return { title: `Search “${query.get('q') || ''}”`, sub: 'Search results', kind: 'Search', icon: 'search' };
  return { title: 'Packroom', sub: '', kind: '', icon: 'brand' };
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
