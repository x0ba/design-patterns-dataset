import { useMemo, useState } from 'react';
import { RESERVATION_FEE, TRIP, walkMinutes, type Campground, type Shade, type Site } from './data';
import { siteFit, type Party } from './filters';
import SiteMap, { siteStatus } from './SiteMap';
import { Alert, Bookmark, Check, Close, Info, Tent, Toilet, Tree, Walk } from './icons';
import { Term, Toggle } from './ui';

export interface SiteFilters {
  allNights: boolean;
  fits: boolean;
  shade: 'any' | 'some' | 'full';
  loop: string;
  sort: 'restroom' | 'shade' | 'price' | 'number';
  type: 'tent' | 'any';
}
export const DEFAULT_SITE_FILTERS: SiteFilters = { allNights: true, fits: true, shade: 'any', loop: 'all', sort: 'restroom', type: 'tent' };

const SHADE_RANK: Record<Shade, number> = { Full: 0, Partial: 1, Sun: 2 };
export const SHADE_LABEL: Record<Shade, string> = { Full: 'Full shade', Partial: 'Partial shade', Sun: 'Mostly sun' };

export function filterSites(cg: Campground, f: SiteFilters, party: Party) {
  const list = cg.sites.filter((s) => {
    const st = siteStatus(s);
    if (st === 'none') return false;
    if (f.allNights && st !== 'all') return false;
    if (f.fits && !siteFit(s, party).ok) return false;
    if (f.type === 'tent' && s.type !== 'Tent' && s.type !== 'Walk-in') return false;
    if (f.shade === 'some' && s.shade === 'Sun') return false;
    if (f.shade === 'full' && s.shade !== 'Full') return false;
    if (f.loop !== 'all' && s.loop !== f.loop) return false;
    return true;
  });
  const sorters: Record<SiteFilters['sort'], (a: Site, b: Site) => number> = {
    restroom: (a, b) => a.restroomM - b.restroomM,
    shade: (a, b) => SHADE_RANK[a.shade] - SHADE_RANK[b.shade] || a.restroomM - b.restroomM,
    price: (a, b) => a.price - b.price || a.restroomM - b.restroomM,
    number: (a, b) => a.loop.localeCompare(b.loop) || parseInt(a.number.slice(1)) - parseInt(b.number.slice(1)),
  };
  return list.sort(sorters[f.sort]);
}

export function ShadeIcon({ shade }: { shade: Shade }) {
  return (
    <span className={`shade shade-${shade.toLowerCase()}`} title={SHADE_LABEL[shade]}>
      <Tree size={14} />
      {shade === 'Full' && <Tree size={14} />}
    </span>
  );
}

export function NightPills({ open }: { open: boolean[] }) {
  return (
    <span className="nights" aria-label={`Open: ${open.map((o, i) => (o ? TRIP.nightsShort[i] : null)).filter(Boolean).join(', ') || 'none'}`}>
      {open.map((o, i) => (
        <span key={i} className={`night ${o ? 'open' : 'taken'}`} title={`${TRIP.nights[i]}: ${o ? 'open' : 'booked'}`}>
          {TRIP.nightsShort[i]}
        </span>
      ))}
    </span>
  );
}

function typeTerm(t: Site['type']) {
  if (t === 'Walk-in') return <Term k="walk-in">Walk-in site</Term>;
  if (t === 'RV') return <Term k="rv">RV site</Term>;
  if (t === 'Group') return <Term k="group">Group site</Term>;
  return <>Tent site</>;
}

interface Props {
  cg: Campground;
  party: Party;
  filters: SiteFilters;
  setFilters: (f: SiteFilters) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  pinned: string[];
  onTogglePin: (siteId: string) => void;
  onReserve: (site: Site) => void;
  booked: Record<string, string>;
}

export default function SitesTab({ cg, party, filters, setFilters, selectedId, onSelect, pinned, onTogglePin, onReserve, booked }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const list = useMemo(() => filterSites(cg, filters, party), [cg, filters, party]);
  const visible = useMemo(() => new Set(list.map((s) => s.id)), [list]);
  const sel = cg.sites.find((s) => s.id === selectedId) ?? null;
  const set = (p: Partial<SiteFilters>) => setFilters({ ...filters, ...p });
  const loops = cg.loops;
  const closest = list.length ? [...list].sort((a, b) => a.restroomM - b.restroomM)[0] : null;

  return (
    <div className="sites-tab">
      <div className="site-controls">
        <Toggle on={filters.allNights} onChange={(v) => set({ allNights: v })}>Open all 3 nights</Toggle>
        <Toggle on={filters.fits} onChange={(v) => set({ fits: v })} title="4 people, 1 tent, 1 vehicle">
          Fits our group
        </Toggle>
        <label className="select-wrap">
          <span>Type</span>
          <select value={filters.type} onChange={(e) => set({ type: e.target.value as SiteFilters['type'] })}>
            <option value="tent">Tent &amp; walk-in sites</option>
            <option value="any">Any site that fits</option>
          </select>
        </label>
        <label className="select-wrap">
          <span>Shade</span>
          <select value={filters.shade} onChange={(e) => set({ shade: e.target.value as SiteFilters['shade'] })}>
            <option value="any">Any</option>
            <option value="some">Some or more</option>
            <option value="full">Full only</option>
          </select>
        </label>
        <label className="select-wrap">
          <span><Term k="loop">Loop</Term></span>
          <select value={filters.loop} onChange={(e) => set({ loop: e.target.value })}>
            <option value="all">All loops</option>
            {loops.map((l) => (
              <option key={l.id} value={l.id}>
                {l.kind === 'walkin' ? 'Walk-in' : l.kind === 'group' ? 'Group' : `Loop ${l.id}`} – {l.desc.split('·')[0].trim()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sites-grid">
        <div className="map-col">
          <div className="map-frame">
            <SiteMap
              cg={cg}
              visible={visible}
              selectedId={selectedId}
              hoverId={hoverId}
              pinned={pinned}
              onSelect={(id) => onSelect(id)}
              onHover={setHoverId}
            />
          </div>
          <div className="legend">
            <span><i className="dot dot-all" /> Open all 3 nights</span>
            <span><i className="dot dot-some" /> Open some nights</span>
            <span><i className="dot dot-none" /> Booked</span>
            <span><i className="dot dot-filtered" /> Open, hidden by your filters</span>
            <span><i className="wc">WC</i> Restroom{cg.amenities.showers ? ' + showers' : ''}</span>
            <span><i className="tree-key" /> Trees (shade)</span>
            {cg.loops.some((l) => l.generators) && <span><i className="gen-key" /> Generators allowed</span>}
            <span><i className="dot dot-pin" /> Saved site</span>
          </div>
        </div>

        <div className="list-col">
          {sel ? (
            <SiteCard
              cg={cg}
              site={sel}
              party={party}
              pinned={pinned.includes(sel.id)}
              onTogglePin={() => onTogglePin(sel.id)}
              onClose={() => onSelect(null)}
              onReserve={() => onReserve(sel)}
              bookedRef={booked[sel.id]}
            />
          ) : (
            <div className="site-card empty">
              <Info size={18} />
              <p>Pick a site on the map or in the list to see how far it is from the restroom, how shady it is, and whether your family fits.</p>
            </div>
          )}
          <div className="site-list-head">
            <div>
              <strong>{list.length} {list.length === 1 ? 'site matches' : 'sites match'}</strong>
              <span className="muted"> of {cg.totalSites}</span>
              {closest && filters.sort !== 'restroom' && (
                <div className="muted small">Closest to a restroom: {closest.number} ({closest.restroomM} m)</div>
              )}
            </div>
            <label className="select-wrap">
              <span className="sr-only">Sort sites</span>
              <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as SiteFilters['sort'] })} aria-label="Sort sites">
                <option value="restroom">Closest to restroom</option>
                <option value="shade">Most shade</option>
                <option value="price">Lowest price</option>
                <option value="number">Site number</option>
              </select>
            </label>
          </div>
          <ul className="site-list" role="listbox" aria-label="Matching sites">
            {list.map((s) => {
              const fit = siteFit(s, party);
              return (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={s.id === selectedId}
                  className={`site-row ${s.id === selectedId ? 'sel' : ''} ${hoverId === s.id ? 'hov' : ''}`}
                  onClick={() => onSelect(s.id)}
                  onMouseEnter={() => setHoverId(s.id)}
                  onMouseLeave={() => setHoverId(null)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(s.id)}
                >
                  <div className="sr-main">
                    <span className="sr-num">{s.number}</span>
                    <span className="sr-type">{s.type}</span>
                    {pinned.includes(s.id) && <span className="sr-pin" title="Saved to compare"><Bookmark size={12} filled /></span>}
                    <span className="sr-price">${s.price}<span className="muted">/night</span></span>
                  </div>
                  <div className="sr-meta">
                    <span className="sr-dist">
                      <Toilet size={13} />
                      <b>{s.restroomM} m</b>
                      <span className="dist-bar"><span style={{ width: `${Math.min(100, (s.restroomM / 160) * 100)}%` }} /></span>
                    </span>
                    <ShadeIcon shade={s.shade} />
                    <span className="sr-shade">{SHADE_LABEL[s.shade]}</span>
                    <NightPills open={s.open} />
                  </div>
                  {(s.tags.includes('Generator loop') || s.type === 'Walk-in' || fit.caution || !fit.ok) && (
                    <div className="sr-flags">
                      {s.tags.includes('Generator loop') && <span className="flag warn">Generator loop</span>}
                      {fit.caution && <span className="flag">{fit.caution}</span>}
                      {!fit.ok && <span className="flag warn">{fit.reason}</span>}
                    </div>
                  )}
                </li>
              );
            })}
            {!list.length && (
              <li className="site-empty">
                No open sites match these settings. Try turning off <b>Open all 3 nights</b> or widening shade.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SiteCard({ cg, site, party, pinned, onTogglePin, onClose, onReserve, bookedRef }: {
  cg: Campground; site: Site; party: Party; pinned: boolean; onTogglePin: () => void; onClose: () => void; onReserve: () => void; bookedRef?: string;
}) {
  const loop = cg.loops.find((l) => l.id === site.loop);
  const fit = siteFit(site, party);
  const st = siteStatus(site);
  const people = party.adults + party.kids;
  const notes: { tone: 'warn' | 'good' | 'info'; text: React.ReactNode }[] = [];
  const loud = cg.mentions.find((m) => /loud/i.test(m.label));
  const mosq = cg.mentions.find((m) => /mosquito/i.test(m.label));
  if (site.tags.includes('Generator loop'))
    notes.push({ tone: 'warn', text: <>This loop allows RV <Term k="generator">generators</Term>. Rule: {cg.generator.text}{loud ? ` ${loud.count} reviews say “${loud.label}.”` : ''}</> });
  if (site.tags.includes('Right by restroom')) notes.push({ tone: 'info', text: 'Very close to the restroom: handy at night with kids, but expect foot traffic and building lights.' });
  if (site.tags.includes('Near main road')) notes.push({ tone: 'warn', text: 'Next to the main campground road, so cars pass by.' });
  if (site.type === 'Walk-in') notes.push({ tone: 'info', text: <>Park in the shared lot and carry gear about {site.carryM} m. <Term k="walk-in">What’s a walk-in?</Term></> });
  if (site.tags.includes('Lake view')) notes.push({ tone: 'good', text: `Lake view, short walk to the water.${mosq ? ` Reviews mention mosquitoes here in late May: pack repellent.` : ''}` });
  if (site.tags.includes('Near playground')) notes.push({ tone: 'good', text: 'Close to the playground.' });
  if (loop?.id === 'D' && cg.id === 'pine-hollow') notes.push({ tone: 'good', text: 'Dead-end loop with little traffic: good for kids on bikes.' });
  if (st === 'some') {
    const missing = site.open.map((o, i) => (!o ? TRIP.nightsShort[i] : null)).filter(Boolean).join(' & ');
    notes.unshift({ tone: 'warn', text: `Booked ${missing} night. You would need a second site for that night.` });
  }

  const nights = site.open.filter(Boolean).length;
  const total = site.price * 3;
  return (
    <div className="site-card">
      <div className="sc-head">
        <div>
          <div className="sc-title">Site {site.number}</div>
          <div className="muted sc-sub">{loop?.kind === 'walkin' ? 'Walk-in sites' : loop?.kind === 'group' ? 'Group area' : `Loop ${site.loop}`} · {loop?.desc}</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close site details"><Close size={16} /></button>
      </div>
      <dl className="sc-facts">
        <div>
          <dt><Toilet size={14} /> Restroom{cg.amenities.showers ? ' & showers' : ''}</dt>
          <dd><b>{site.restroomM} m</b> <span className="muted">· <Walk size={12} /> {walkMinutes(site.restroomM)}</span></dd>
        </div>
        <div>
          <dt><Tree size={14} /> Shade</dt>
          <dd><b>{SHADE_LABEL[site.shade]}</b></dd>
        </div>
        <div>
          <dt><Tent size={14} /> Type</dt>
          <dd>{typeTerm(site.type)} · <Term k="tentpad">tent pad</Term> {site.tentPad ?? 'none'}</dd>
        </div>
        <div>
          <dt>Fits</dt>
          <dd className={fit.ok ? 'ok' : 'bad'}>
            {fit.ok ? <Check size={13} /> : <Close size={13} />} Up to {site.maxPeople} people, {site.maxVehicles} vehicle{site.maxVehicles > 1 ? 's' : ''}
            <span className="muted"> (you: {people}, {party.vehicles})</span>
          </dd>
        </div>
        <div className="span2">
          <dt>Nights</dt>
          <dd><NightPills open={site.open} /></dd>
        </div>
      </dl>
      {notes.length > 0 && (
        <ul className="sc-notes">
          {notes.map((n, i) => (
            <li key={i} className={n.tone}>
              {n.tone === 'warn' ? <Alert size={14} /> : n.tone === 'good' ? <Check size={14} /> : <Info size={14} />}
              <span>{n.text}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="sc-actions">
        <div className="sc-price">
          <b>${site.price}</b>/night
          {st === 'all' && <span className="muted"> · ${total + RESERVATION_FEE} for 3 nights incl. fee</span>}
        </div>
        <button className={`btn ${pinned ? 'btn-pinned' : 'btn-secondary'}`} onClick={onTogglePin} disabled={st === 'none'}>
          <Bookmark size={15} filled={pinned} /> {pinned ? 'Saved to compare' : 'Save site to compare'}
        </button>
        {bookedRef ? (
          <span className="booked-badge"><Check size={14} /> Booked · {bookedRef}</span>
        ) : (
          <button className="btn btn-primary" onClick={onReserve} disabled={st !== 'all' || !fit.ok} title={st !== 'all' ? `Open ${nights} of 3 nights` : undefined}>
            Reserve
          </button>
        )}
      </div>
    </div>
  );
}
