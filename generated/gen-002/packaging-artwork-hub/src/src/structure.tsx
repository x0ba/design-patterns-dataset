import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BRANDS, REGIONS, findBrand, findLine, findFormat, findEntry, artworkOf, approvedOf, pendingOf, pathOf, Format, MarketEntry, COUNTRY } from './data';
import { navigate } from './router';
import { Icon, usePopover, A, StatusPill } from './ui';
import { fold } from './util';

export interface Sel { b?: string; l?: string; f?: string; m?: string; v?: string }

export function groupByRegion(markets: MarketEntry[]): [string, MarketEntry[]][] {
  const out: [string, MarketEntry[]][] = [];
  REGIONS.forEach((r) => {
    const ms = markets.filter((m) => m.country.region === r);
    if (ms.length) out.push([r, ms]);
  });
  return out;
}

// ───────────── Location bar ─────────────
interface Level { key: string; label: string; value?: string; to?: string; menu?: React.ReactNode; hint?: string }

function Crumb({ lv, idx, active, last }: { lv: Level; idx: number; active: boolean; last: boolean }) {
  const pop = usePopover();
  const empty = !lv.value;
  return (
    <div className={`crumb ${active ? 'is-active' : ''} ${empty ? 'is-empty' : ''}`} ref={pop.ref}>
      <div className="crumb-label">
        <span className="crumb-n">{idx + 1}</span>
        {lv.label}
      </div>
      <div className="crumb-body">
        {empty ? (
          lv.menu ? (
            <button className="crumb-choose" onClick={() => pop.setOpen(!pop.open)} aria-expanded={pop.open}>
              {lv.hint || 'Choose…'} <Icon name="chevD" size={13} />
            </button>
          ) : (
            <span className="crumb-none">{lv.hint || '—'}</span>
          )
        ) : (
          <>
            {active ? <span className="crumb-value">{lv.value}</span> : <A to={lv.to!} className="crumb-value crumb-link" title={`Step back to this ${lv.label.toLowerCase()}`}>{lv.value}</A>}
            {lv.menu && (
              <button className="crumb-toggle" onClick={() => pop.setOpen(!pop.open)} aria-label={`Switch ${lv.label.toLowerCase()}`} aria-expanded={pop.open} title={`Other ${lv.label.toLowerCase()}s at this level`}>
                <Icon name="chevD" size={14} />
              </button>
            )}
          </>
        )}
      </div>
      {pop.open && lv.menu && (
        <div className="menu" onClick={(e) => { if ((e.target as HTMLElement).closest('a,button.menu-item')) pop.setOpen(false); }}>
          {lv.menu}
        </div>
      )}
      {!last && <Icon name="chevR" size={16} className="crumb-sep" />}
    </div>
  );
}

function MarketMenu({ fmt, current, targetFor }: { fmt: Format; current?: string; targetFor: (m: MarketEntry) => string }) {
  return (
    <div className="menu-inner menu-wide">
      <div className="menu-head">Markets for {fmt.line.name} {fmt.name} — grouped by region</div>
      {groupByRegion(fmt.markets).map(([region, ms]) => (
        <div key={region} className="menu-group">
          <div className="menu-group-label">{region} <span>region · {ms.length}</span></div>
          {ms.map((m) => {
            const art = artworkOf(m);
            const ap = approvedOf(art);
            const pend = pendingOf(art);
            return (
              <A key={m.id} to={targetFor(m)} className={`menu-item ${m.id === current ? 'is-current' : ''}`}>
                <span className="cc">{m.country.code}</span>
                <span className="mi-name">{m.country.name}{m.id === current && <em> · you are here</em>}</span>
                {art.marketIds.length > 1 && <span className="mi-shared" title={`Shares one artwork with ${art.marketIds.filter((x) => x !== m.id).map((x) => COUNTRY[x].name).join(', ')}`}><Icon name="shared" size={12} /> {art.code}</span>}
                <span className="mi-status">{ap ? `v${ap.n} approved` : 'no approved version'}{pend.length > 0 && <b> · v{pend[pend.length - 1].n} {pend[pend.length - 1].status === 'draft' ? 'draft' : 'in review'}</b>}</span>
              </A>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function LocationBar({ sel }: { sel: Sel }) {
  const brand = findBrand(sel.b);
  const line = findLine(sel.b, sel.l);
  const fmt = findFormat(sel.b, sel.l, sel.f);
  const ent = findEntry(sel.b, sel.l, sel.f, sel.m);
  const art = ent ? artworkOf(ent) : undefined;
  const ver = art?.versions.find((v) => `v${v.n}` === sel.v);

  const levels: Level[] = [
    {
      key: 'b', label: 'Brand', value: brand?.name, to: brand && pathOf.brand(brand), hint: 'Choose a brand',
      menu: (
        <div className="menu-inner">
          <div className="menu-head">14 brands</div>
          {BRANDS.map((b) => (
            <A key={b.id} to={pathOf.brand(b)} className={`menu-item ${b.id === brand?.id ? 'is-current' : ''}`}>
              <span className="swatch" style={{ background: b.color }} />
              <span className="mi-name">{b.name}</span>
              <span className="mi-status">{b.category}</span>
            </A>
          ))}
        </div>
      ),
    },
    {
      key: 'l', label: 'Product line', value: line?.name, to: line && pathOf.line(line), hint: 'Choose a line',
      menu: brand && (
        <div className="menu-inner">
          <div className="menu-head">{brand.name} · {brand.lines.length} product lines</div>
          {brand.lines.map((l) => {
            const sameFmt = fmt && l.formats.find((x) => x.code === fmt.code);
            const sameEnt = sameFmt && ent && sameFmt.markets.find((x) => x.id === ent.id);
            const to = sameEnt ? pathOf.entry(sameEnt) : sameFmt ? pathOf.format(sameFmt) : pathOf.line(l);
            return (
              <A key={l.id} to={to} className={`menu-item ${l.id === line?.id ? 'is-current' : ''}`}>
                <span className="swatch" style={{ background: l.color }} />
                <span className="mi-name">{l.name}</span>
                <span className="mi-status">{l.formats.length} formats</span>
              </A>
            );
          })}
        </div>
      ),
    },
    {
      key: 'f', label: 'Pack format', value: fmt?.name, to: fmt && pathOf.format(fmt), hint: 'Choose a format',
      menu: line && (
        <div className="menu-inner">
          <div className="menu-head">{line.brand.name} {line.name} · {line.formats.length} pack formats</div>
          {line.formats.map((f) => {
            const sameEnt = ent && f.markets.find((x) => x.id === ent.id);
            return (
              <A key={f.id} to={sameEnt ? pathOf.entry(sameEnt) : pathOf.format(f)} className={`menu-item ${f.id === fmt?.id ? 'is-current' : ''}`}>
                <span className="cc mono">{f.code}</span>
                <span className="mi-name">{f.name}</span>
                <span className="mi-status">{f.kind} · {f.markets.length} markets{ent && f.id !== fmt?.id ? (sameEnt ? ` · has ${ent.country.name}` : ` · no ${ent.country.name}`) : ''}</span>
              </A>
            );
          })}
        </div>
      ),
    },
    {
      key: 'm', label: 'Market', value: ent ? ent.country.name : undefined, to: ent && pathOf.entry(ent), hint: 'Choose a market',
      menu: fmt && <MarketMenu fmt={fmt} current={ent?.id} targetFor={(m) => pathOf.entry(m)} />,
    },
    {
      key: 'v', label: 'Artwork version', value: ver ? `v${ver.n}` : undefined, to: undefined, hint: ent ? 'Choose a version' : '—',
      menu: ent && art && (
        <div className="menu-inner">
          <div className="menu-head">{art.label} artwork · {art.versions.length} versions</div>
          {[...art.versions].reverse().map((v) => (
            <A key={v.n} to={pathOf.version(ent, v.n)} className={`menu-item ${ver?.n === v.n ? 'is-current' : ''}`}>
              <span className="cc mono">v{v.n}</span>
              <span className="mi-name">{v.summary}</span>
              <StatusPill status={v.status} />
            </A>
          ))}
        </div>
      ),
    },
  ];
  const depth = sel.v ? 4 : sel.m ? 3 : sel.f ? 2 : sel.l ? 1 : sel.b ? 0 : -1;
  return (
    <nav className="locbar" aria-label="Location in brand structure">
      <div className="locbar-crumbs">
        {levels.map((lv, i) => (i <= depth + 1 ? <Crumb key={lv.key} lv={lv} idx={i} active={i === depth} last={i === levels.length - 1} /> : <Crumb key={lv.key} lv={{ ...lv, value: undefined, menu: undefined, hint: '—' }} idx={i} active={false} last={i === levels.length - 1} />))}
      </div>
      <A to="/guide/structure" className="locbar-help" title="How brands, lines, formats, markets and versions fit together">
        <Icon name="info" size={14} /> How this is organised
      </A>
    </nav>
  );
}

// ───────────── Structure tree ─────────────
export function StructureTree({ sel }: { sel: Sel }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState('');
  const curRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setOpen((o) => {
      const n = new Set(o);
      if (sel.b) n.add(sel.b);
      if (sel.l) n.add(`${sel.b}/${sel.l}`);
      if (sel.f) n.add(`${sel.b}/${sel.l}/${sel.f}`);
      return n;
    });
  }, [sel.b, sel.l, sel.f]);
  useEffect(() => {
    const t = setTimeout(() => curRef.current?.scrollIntoView({ block: 'nearest' }), 30);
    return () => clearTimeout(t);
  }, [sel.b, sel.l, sel.f, sel.m]);

  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const q = fold(filter.trim());
  const brands = useMemo(() => {
    if (!q) return BRANDS.map((b) => ({ b, lines: b.lines }));
    return BRANDS.map((b) => ({ b, lines: fold(b.name).includes(q) ? b.lines : b.lines.filter((l) => fold(l.name).includes(q)) })).filter((x) => x.lines.length);
  }, [q]);

  const row = (opts: { k: string; depth: number; label: React.ReactNode; to: string; level?: string; expandable?: boolean; isOpen?: boolean; onPath?: boolean; current?: boolean; extra?: React.ReactNode }) => (
    <div key={opts.k} className={`trow d${opts.depth} ${opts.onPath ? 'on-path' : ''} ${opts.current ? 'is-current' : ''}`} ref={opts.current ? curRef : undefined}>
      {opts.expandable ? (
        <button className="tchev" onClick={() => toggle(opts.k)} aria-label={opts.isOpen ? 'Collapse' : 'Expand'} aria-expanded={opts.isOpen}>
          <Icon name={opts.isOpen ? 'chevD' : 'chevR'} size={13} />
        </button>
      ) : (
        <span className="tchev-sp" />
      )}
      <A to={opts.to} className="tlink" onClick={() => opts.expandable && !opts.isOpen && toggle(opts.k)}>{opts.label}</A>
      {opts.extra}
      {opts.onPath && opts.level && <span className="tlevel">{opts.level}</span>}
    </div>
  );

  return (
    <aside className="tree" aria-label="Brand structure">
      <div className="tree-head">
        <div className="tree-title">Brand structure</div>
        <div className="tree-legend">Brand › Line › Format › Market</div>
        <input className="tree-filter" placeholder="Filter brands and lines…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter brands and product lines" />
      </div>
      <div className="tree-body">
        {brands.map(({ b, lines }) => {
          const bOpen = open.has(b.id) || !!q;
          const bOn = sel.b === b.id;
          return (
            <React.Fragment key={b.id}>
              {row({ k: b.id, depth: 0, to: pathOf.brand(b), expandable: true, isOpen: bOpen, onPath: bOn, current: bOn && !sel.l, level: 'brand',
                label: <><span className="swatch" style={{ background: b.color }} />{b.name}</>, extra: <span className="tcount">{b.lines.length}</span> })}
              {bOpen && lines.map((l) => {
                const lk = `${b.id}/${l.id}`;
                const lOpen = open.has(lk);
                const lOn = bOn && sel.l === l.id;
                return (
                  <React.Fragment key={lk}>
                    {row({ k: lk, depth: 1, to: pathOf.line(l), expandable: true, isOpen: lOpen, onPath: lOn, current: lOn && !sel.f, level: 'line', label: l.name, extra: <span className="tcount">{l.formats.length}</span> })}
                    {lOpen && l.formats.map((f) => {
                      const fk = `${lk}/${f.id}`;
                      const fOpen = open.has(fk);
                      const fOn = lOn && sel.f === f.id;
                      return (
                        <React.Fragment key={fk}>
                          {row({ k: fk, depth: 2, to: pathOf.format(f), expandable: true, isOpen: fOpen, onPath: fOn, current: fOn && !sel.m, level: 'format', label: f.name, extra: <span className="tcount">{f.markets.length}</span> })}
                          {fOpen && groupByRegion(f.markets).map(([region, ms]) => (
                            <React.Fragment key={region}>
                              <div className="trow d3 tregion"><span className="tchev-sp" />{region}<span className="tregion-hint">region</span></div>
                              {ms.map((m) => {
                                const art = artworkOf(m);
                                const pend = pendingOf(art);
                                const mOn = fOn && sel.m === m.id;
                                return row({
                                  k: `${fk}/${m.id}`, depth: 3, to: pathOf.entry(m), onPath: mOn, current: mOn, level: sel.v ? 'market' : 'market',
                                  label: <><span className="cc">{m.country.code}</span>{m.country.name}</>,
                                  extra: (
                                    <span className="tmeta">
                                      {art.marketIds.length > 1 && <span className="tshared" title={`Shared artwork ${art.code} with ${art.marketIds.filter((x) => x !== m.id).map((x) => COUNTRY[x].name).join(", ")}`}><Icon name="shared" size={11} /></span>}
                                      {pend.length > 0 && <span className="tdot amber" title={`v${pend[pend.length - 1].n} ${pend[pend.length - 1].status === 'draft' ? 'draft' : 'in review'}`} />}
                                    </span>
                                  ),
                                });
                              })}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
        {brands.length === 0 && <div className="tree-empty">No brand or product line matches “{filter}”.</div>}
      </div>
      <button className="tree-foot" onClick={() => navigate('/b')}>All 14 brands overview</button>
    </aside>
  );
}
