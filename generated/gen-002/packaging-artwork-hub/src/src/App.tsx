import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, splitRoute, navigate } from './router';
import { useStore } from './store';
import { findBrand, findLine, findFormat, findEntry, artworkOf, DIELINES, TOTALS, ASSETS, REG_BLOCKS, COUNTRIES } from './data';
import { Icon, A, StatusPill, describeRoute, Empty } from './ui';
import { LocationBar, StructureTree, Sel } from './structure';
import { BrandsIndex, BrandPage, LinePage, FormatPage, EntryPage, VersionPage } from './pagesBrand';
import { DielinesPage, DielinePage, RegPage, AssetsPage, GuidePage, RecentPage, SearchPage } from './pagesLib';
import { search, TYPE_LABEL } from './search';

function GlobalSearch({ route }: { route: string }) {
  const { segs, query } = splitRoute(route);
  const [q, setQ] = useState(segs[0] === 'search' ? query.get('q') || '' : '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const { setSearchOrigin } = useStore();
  const results = useMemo(() => (q.trim().length >= 2 ? search(q, 400).filter((r) => !r.superseded) : []), [q]);
  const top = results.slice(0, 8);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea,select')) { e.preventDefault(); inputRef.current?.focus(); }
    };
    const d = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', k);
    document.addEventListener('mousedown', d);
    return () => { document.removeEventListener('keydown', k); document.removeEventListener('mousedown', d); };
  }, []);
  useEffect(() => { if (segs[0] === 'search') setQ(query.get('q') || ''); }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (to: string) => { setOpen(false); setSearchOrigin(q.trim()); navigate(to); inputRef.current?.blur(); };
  const submit = () => {
    if (hi >= 0 && top[hi]) return go(top[hi].route);
    if (q.trim()) { setOpen(false); setSearchOrigin(q.trim()); navigate(`/search?q=${encodeURIComponent(q.trim())}`); }
  };
  return (
    <div className="gsearch" ref={boxRef}>
      <Icon name="search" size={16} className="gs-icon" />
      <input
        ref={inputRef}
        value={q}
        placeholder="Search products, markets, file names, dielines, text IDs…"
        aria-label="Search Packroom"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(top.length - 1, h + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(-1, h - 1)); }
          else if (e.key === 'Enter') submit();
          else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
        }}
      />
      <kbd>/</kbd>
      {open && q.trim().length >= 2 && (
        <div className="gs-drop" role="listbox">
          {top.length === 0 && <div className="gs-empty">No matches for “{q}”.</div>}
          {top.map((r, i) => (
            <button key={r.route + r.title} role="option" aria-selected={i === hi} className={`gs-item ${i === hi ? 'hi' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => go(r.route)}>
              <span className="gs-type">{TYPE_LABEL[r.type].replace(/s$/, '')}</span>
              <span className="gs-title"><span className={r.mono ? 'mono' : ''}>{r.title}</span><span className="gs-sub">{r.sub}</span></span>
              {r.status && <StatusPill status={r.status} />}
            </button>
          ))}
          {results.length > 0 && <button className="gs-all" onClick={submit}>See all {results.length >= 400 ? '400+' : results.length} results <span className="muted">↵</span></button>}
        </div>
      )}
    </div>
  );
}

function Sidebar({ route }: { route: string }) {
  const { pins, recents, togglePin } = useStore();
  const root = splitRoute(route).segs[0];
  const items = [
    { k: 'b', to: '/b', icon: 'brand', label: 'Brand structure', n: `${TOTALS.brands}` },
    { k: 'dielines', to: '/dielines', icon: 'dieline', label: 'Dieline library', n: `${TOTALS.dielines}` },
    { k: 'assets', to: '/assets/recycling', icon: 'assets', label: 'Shared assets', n: `${ASSETS.length}` },
    { k: 'reg', to: '/reg', icon: 'reg', label: 'Regulatory text', n: `${COUNTRIES.length}` },
    { k: 'guide', to: '/guide', icon: 'guide', label: 'Team guidelines', n: '' },
    { k: 'recent', to: '/recent', icon: 'recent', label: 'Recently viewed', n: `${recents.length}` },
  ];
  return (
    <nav className="sidebar" aria-label="Sections">
      <div className="sb-section">
        {items.map((it) => (
          <A key={it.k} to={it.to} className={`sb-item ${root === it.k ? 'is-on' : ''}`}>
            <Icon name={it.icon} size={17} />
            <span>{it.label}</span>
            {it.n && <span className="sb-n">{it.n}</span>}
          </A>
        ))}
      </div>
      <div className="sb-section sb-pins">
        <div className="sb-head"><Icon name="pin" size={13} /> Pinned</div>
        {pins.length === 0 && <div className="sb-hint">Pin a market entry, dieline or text block to keep it one click away while you move around.</div>}
        {pins.map((p) => {
          const info = describeRoute(p);
          return (
            <div key={p} className={`sb-pin ${p === route ? 'is-on' : ''}`}>
              <A to={p} className="sb-pin-link" title={info.title}>
                <span className="sb-pin-title">{info.title}</span>
                <span className="sb-pin-sub">{info.kind}</span>
              </A>
              <button className="sb-unpin" onClick={() => togglePin(p)} aria-label={`Unpin ${info.title}`}><Icon name="x" size={12} /></button>
            </div>
          );
        })}
      </div>
      <div className="sb-section sb-recent">
        <div className="sb-head"><Icon name="recent" size={13} /> Recent</div>
        {recents.slice(0, 5).map((r) => {
          const info = describeRoute(r.route);
          return (
            <A key={r.route} to={r.route} className={`sb-recent-item ${r.route === route ? 'is-on' : ''}`} title={info.title}>
              <span className="sb-pin-title">{info.title}</span>
              <span className="sb-pin-sub">{info.kind} · {r.at === '2026-11-17' ? r.time : 'earlier'}</span>
            </A>
          );
        })}
        <A to="/recent" className="sb-more">All {recents.length} recently viewed →</A>
      </div>
    </nav>
  );
}

function SearchOrigin() {
  const { searchOrigin, setSearchOrigin } = useStore();
  if (!searchOrigin) return null;
  return (
    <div className="search-origin">
      <Icon name="search" size={13} />
      <span>Your last search: <b>“{searchOrigin}”</b></span>
      <A to={`/search?q=${encodeURIComponent(searchOrigin)}`} className="inline-link">Back to results</A>
      <button className="icon-btn sm" onClick={() => setSearchOrigin(null)} aria-label="Dismiss"><Icon name="x" size={12} /></button>
    </div>
  );
}

function BrandArea({ sel, query }: { sel: Sel; query: URLSearchParams }) {
  let body: React.ReactNode;
  const brand = findBrand(sel.b);
  const line = findLine(sel.b, sel.l);
  const fmt = findFormat(sel.b, sel.l, sel.f);
  const ent = findEntry(sel.b, sel.l, sel.f, sel.m);
  if (!sel.b) body = <BrandsIndex />;
  else if (!brand) body = <Empty>No brand called “{sel.b}”.</Empty>;
  else if (!sel.l) body = <BrandPage brand={brand} />;
  else if (!line) body = <Empty>Product line not found.</Empty>;
  else if (!sel.f) body = <LinePage line={line} />;
  else if (!fmt) body = <Empty>Pack format not found.</Empty>;
  else if (!sel.m) body = <FormatPage fmt={fmt} focus={query.get('focus') || undefined} />;
  else if (!ent) body = <Empty>{fmt.line.brand.name} {fmt.line.name} {fmt.name} is not sold in that market.</Empty>;
  else if (!sel.v) body = <EntryPage ent={ent} />;
  else {
    const v = artworkOf(ent).versions.find((x) => `v${x.n}` === sel.v);
    body = v ? <VersionPage ent={ent} v={v} /> : <Empty>Version {sel.v} does not exist for this market.</Empty>;
  }
  return (
    <div className="brand-area">
      <StructureTree sel={sel} />
      <div className="brand-content" data-scroll>
        <SearchOrigin />
        <LocationBar sel={sel} />
        {body}
      </div>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const { visit, setLastArtwork, toasts } = useStore();
  const { segs, query } = splitRoute(route);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    visit(route);
    if (segs[0] === 'b' && segs.length >= 5) setLastArtwork(route);
    document.title = `${describeRoute(route).title} — Packroom`;
    if (!query.get('focus')) {
      mainRef.current?.querySelectorAll('[data-scroll]').forEach((el) => (el.scrollTop = 0));
      if (mainRef.current) mainRef.current.scrollTop = 0;
    }
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  let content: React.ReactNode;
  const [root, a, b2, c, d, e] = segs;
  if (root === 'b') content = <BrandArea sel={{ b: a, l: b2, f: c, m: d, v: e }} query={query} />;
  else if (root === 'dielines') content = a ? (DIELINES[a] ? <DielinePage d={DIELINES[a]} /> : <Empty>No dieline {a}.</Empty>) : <DielinesPage query={query} />;
  else if (root === 'reg') content = <RegPage countryId={a} blockId={b2 && REG_BLOCKS[b2] ? b2 : undefined} />;
  else if (root === 'assets') content = <AssetsPage kind={a} id={b2} />;
  else if (root === 'guide') content = <GuidePage id={a} />;
  else if (root === 'recent') content = <RecentPage />;
  else if (root === 'search') content = <SearchPage q={query.get('q') || ''} />;
  else content = <Empty>Page not found. <A to="/b">Go to brand structure</A></Empty>;

  return (
    <div className="app">
      <header className="topbar">
        <A to="/b" className="logo" title="Packroom home">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#e9d8a6" /><path d="M9 11l7-4 7 4v10l-7 4-7-4z M9 11l7 4 7-4 M16 15v10" fill="none" stroke="#16302c" strokeWidth="2" strokeLinejoin="round" /></svg>
          <span><b>Packroom</b><small>Packaging artwork hub</small></span>
        </A>
        <GlobalSearch route={route} />
        <div className="user">
          <div className="user-txt"><b>Marisol Achebe</b><small>Senior packaging designer · Snacks</small></div>
          <div className="avatar" aria-hidden="true">MA</div>
        </div>
      </header>
      <Sidebar route={route} />
      <main className={`main ${root === 'b' ? 'main-brand' : ''}`} ref={mainRef} data-scroll>
        {content}
      </main>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.tone ? 'toast-' + t.tone : ''}`}>{t.tone === 'warn' ? <Icon name="warn" size={15} /> : <Icon name="check" size={15} />}{t.text}</div>)}
      </div>
    </div>
  );
}
