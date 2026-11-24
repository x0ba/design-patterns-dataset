import { useState } from 'react';
import { type Campground, type Site } from './data';
import type { Party } from './filters';
import { Alert, Bike, Check, Clock, Compare, Droplet, Heart, Minus, Quiet, Shower, Store, Swing, Toilet, Tree, Waves } from './icons';
import SitesTab, { type SiteFilters } from './SitesTab';
import { OperatorChip, Rating, Scene, Term, fmtDrive, fmtNum } from './ui';

export type DetailTab = 'sites' | 'overview' | 'reviews';

interface Props {
  cg: Campground;
  tab: DetailTab;
  setTab: (t: DetailTab) => void;
  saved: boolean;
  onToggleSave: () => void;
  onOpenCompare: () => void;
  savedCount: number;
  party: Party;
  siteFilters: SiteFilters;
  setSiteFilters: (f: SiteFilters) => void;
  selectedSiteId: string | null;
  onSelectSite: (id: string | null) => void;
  pinned: string[];
  onTogglePin: (siteId: string) => void;
  onReserve: (s: Site) => void;
  booked: Record<string, string>;
}

export function genLabel(cg: Campground) {
  if (cg.generator.policy === 'none') return 'No generators';
  if (cg.generator.policy === 'limited') return cg.loops.some((l) => l.generators) && cg.loops.some((l) => !l.generators && l.kind !== 'walkin' && l.kind !== 'group') ? 'Generators in RV loop only' : 'Generators, limited hours';
  return 'Generators allowed';
}

export function mustHaves(cg: Campground) {
  return [
    { key: 'flush', label: 'Flush toilets', ok: cg.amenities.flushToilets, icon: <Toilet size={14} /> },
    { key: 'showers', label: 'Showers', ok: cg.amenities.showers, icon: <Shower size={14} /> },
    { key: 'water', label: cg.water?.kind === 'River' ? 'River swimming' : 'Lake swimming', ok: cg.amenities.lakeAccess, icon: <Waves size={14} /> },
    { key: 'shade', label: `${cg.shadePct}% of sites shaded`, ok: cg.shadePct >= 50, icon: <Tree size={14} /> },
    { key: 'bikes', label: 'Bike-friendly loops', ok: !!cg.bikeNote, icon: <Bike size={14} /> },
    { key: 'gen', label: genLabel(cg), ok: cg.generator.policy !== 'allowed', partial: cg.generator.policy === 'limited', icon: <Quiet size={14} /> },
  ];
}

function nightLowF(elev: number) {
  const low = Math.round(54 - (elev / 1000) * 3.6);
  return `${low - 3}–${low + 2}°F`;
}

export default function Detail(p: Props) {
  const { cg } = p;
  const warns = cg.mentions.filter((m) => m.tone === 'warn');
  return (
    <section className="detail" aria-label={`${cg.name} details`}>
      <header className="d-head">
        <div className="d-photos">
          <Scene cg={cg} className="d-photo main" />
          <Scene cg={cg} variant={1} className="d-photo" />
          <Scene cg={cg} variant={2} className="d-photo" />
        </div>
        <div className="d-info">
          <div className="d-title-row">
            <div>
              <h1>{cg.name}</h1>
              <div className="d-sub">
                <OperatorChip op={cg.operator} />
                <span>{cg.region}</span>
                <span className="sep">·</span>
                <span><Clock size={13} /> {fmtDrive(cg.driveMin)} from Sacramento</span>
                <span className="sep">·</span>
                <Rating value={cg.rating} count={cg.reviewCount} />
              </div>
            </div>
            <div className="d-actions">
              <button className={`btn ${p.saved ? 'btn-saved' : 'btn-secondary'}`} onClick={p.onToggleSave} aria-pressed={p.saved}>
                <Heart size={15} filled={p.saved} /> {p.saved ? 'Saved' : 'Save'}
              </button>
              <button className="btn btn-secondary" onClick={p.onOpenCompare} disabled={p.savedCount < 2}>
                <Compare size={15} /> Compare saved ({p.savedCount})
              </button>
            </div>
          </div>
          <div className="d-price">
            <b>${cg.priceMin}–${cg.priceMax}</b><span className="muted"> per night</span>
            <span className="sep">·</span>
            <span><b>{cg.openAll}</b> of {cg.totalSites} sites open all 3 nights</span>
          </div>
          <ul className="musts" aria-label="Your must-haves">
            {mustHaves(cg).map((m) => (
              <li key={m.key} className={m.ok ? (m.partial ? 'partial' : 'ok') : 'no'}>
                {m.icon}
                {m.label}
                {m.ok ? <Check size={12} /> : <Minus size={12} />}
              </li>
            ))}
          </ul>
          {warns.length > 0 && (
            <div className="headsup">
              <Alert size={14} />
              <span className="headsup-label">Recent reviews mention:</span>
              {warns.map((w) => (
                <button key={w.label} className="headsup-chip" onClick={() => p.setTab('reviews')}>
                  “{w.label}” <span className="muted">({w.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {([
          ['sites', `Pick a site`, `${cg.openAny} open`],
          ['overview', 'Amenities & rules', null],
          ['reviews', 'Reviews', fmtNum(cg.reviewCount)],
        ] as [DetailTab, string, string | null][]).map(([k, label, badge]) => (
          <button key={k} role="tab" aria-selected={p.tab === k} className={`tab ${p.tab === k ? 'active' : ''}`} onClick={() => p.setTab(k)}>
            {label}
            {badge && <span className="tab-badge">{badge}</span>}
          </button>
        ))}
      </nav>

      <div className="d-body">
        {p.tab === 'sites' && (
          <SitesTab
            cg={cg}
            party={p.party}
            filters={p.siteFilters}
            setFilters={p.setSiteFilters}
            selectedId={p.selectedSiteId}
            onSelect={p.onSelectSite}
            pinned={p.pinned}
            onTogglePin={p.onTogglePin}
            onReserve={p.onReserve}
            booked={p.booked}
          />
        )}
        {p.tab === 'overview' && <Overview cg={cg} onLoop={(id) => { p.setSiteFilters({ ...p.siteFilters, loop: id }); p.setTab('sites'); }} />}
        {p.tab === 'reviews' && <Reviews cg={cg} />}
      </div>
    </section>
  );
}

function Overview({ cg, onLoop }: { cg: Campground; onLoop: (id: string) => void }) {
  const a = cg.amenities;
  const items = [
    { ok: a.flushToilets, icon: <Toilet size={18} />, title: 'Flush toilets', text: a.flushToilets ? 'In every loop, with sinks.' : <>Only <Term k="vault">vault toilets</Term>.</> },
    { ok: a.showers, icon: <Shower size={18} />, title: 'Showers', text: cg.showerNote ?? 'No showers.' },
    { ok: a.lakeAccess, icon: <Waves size={18} />, title: cg.water ? cg.water.name : 'Swimming', text: cg.water ? cg.water.swim : 'No swimming area.' },
    { ok: a.potableWater, icon: <Droplet size={18} />, title: <Term k="potable">Drinking water</Term>, text: a.potableWater ? 'Spigots in every loop.' : 'Bring your own water.' },
    { ok: a.playground, icon: <Swing size={18} />, title: 'Playground', text: a.playground ? 'Near the lakeside loops.' : 'None.' },
    { ok: a.campStore, icon: <Store size={18} />, title: 'Camp store', text: a.campStore ? 'Firewood, ice, snacks, s’mores supplies.' : 'None; nearest town for supplies.' },
  ];
  return (
    <div className="overview">
      <p className="ov-blurb">{cg.blurb}</p>
      <div className="ov-grid">
        {items.map((it, i) => (
          <div key={i} className={`ov-item ${it.ok ? '' : 'missing'}`}>
            <span className="ov-icon">{it.icon}</span>
            <div>
              <div className="ov-title">{it.title} {it.ok ? <Check size={13} className="ok-ic" /> : <Minus size={13} />}</div>
              <div className="muted">{it.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ov-cols">
        <section className="ov-card">
          <h3>Noise</h3>
          <p><b><Term k="generator">Generators</Term>:</b> {cg.generator.text}</p>
          <p><b><Term k="quiet">Quiet hours</Term>:</b> {cg.quietHours}</p>
          {cg.bikeNote && <p><b>Bikes:</b> {cg.bikeNote}</p>}
        </section>
        <section className="ov-card">
          <h3>Good to know for a first trip</h3>
          <p><b>Check-in</b> 2 pm Sat · <b>check-out</b> noon Tue</p>
          <p><b>Nights in late May:</b> around {nightLowF(cg.elevationFt)} at {fmtNum(cg.elevationFt)} ft. Pack warm layers for the kids.</p>
          <p><b>Cancel</b> free until May 15, then a $10 fee.</p>
        </section>
      </div>

      <section className="ov-card">
        <h3>Loops at a glance <span className="muted small">(each <Term k="loop">loop</Term> has its own feel)</span></h3>
        <table className="loop-table">
          <thead>
            <tr><th>Loop</th><th>What it’s like</th><th>Open all 3 nights</th><th>Shady sites</th><th>Restroom distance</th><th /></tr>
          </thead>
          <tbody>
            {cg.loops.map((l) => {
              const ss = cg.sites.filter((s) => s.loop === l.id);
              const open = ss.filter((s) => s.open.every(Boolean)).length;
              const shady = Math.round((ss.filter((s) => s.shade !== 'Sun').length / ss.length) * 100);
              const ds = ss.map((s) => s.restroomM);
              return (
                <tr key={l.id}>
                  <td><b>{l.kind === 'walkin' ? 'Walk-in' : l.kind === 'group' ? 'Group' : l.id}</b></td>
                  <td>{l.desc}{l.generators && <span className="flag warn inline">Generators</span>}</td>
                  <td>{open} of {ss.length}</td>
                  <td>{shady}%</td>
                  <td>{Math.min(...ds)}–{Math.max(...ds)} m</td>
                  <td><button className="link" onClick={() => onLoop(l.id)} disabled={!open}>See sites</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const KEYWORDS: Record<string, string> = {
  'Swim beach is great for kids': 'beach',
  'Kids bike the paved loops': 'bike',
  'Pool plus river swimming': 'swimming hole',
  'Really quiet at night': 'quiet',
  'Some sites close together': 'close together',
  'Lake beach and boat rentals': 'beach',
  'Easy drive from Sacramento': 'hour from home',
  'Not much shade': 'shade',
  'Shower lines on weekend mornings': 'line',
  'Pricier than state parks': 'expensive',
  'Free hot showers': 'showers',
  'Clean, hot showers': 'showers',
};
function keyword(label: string, texts: string[]) {
  const l = label.toLowerCase();
  if (texts.some((t) => t.toLowerCase().includes(l))) return l;
  if (KEYWORDS[label]) return KEYWORDS[label].toLowerCase();
  return l.replace(/[^a-z ]/g, '').split(' ').reduce((a, b) => (b.length >= a.length ? b : a), '');
}

function Reviews({ cg }: { cg: Campground }) {
  const [filter, setFilter] = useState<string | null>(null);
  const kw = filter ? keyword(filter, cg.reviews.map((r) => r.text)) : null;
  const shown = kw ? cg.reviews.filter((r) => r.text.toLowerCase().includes(kw)) : cg.reviews;
  return (
    <div className="reviews">
      <div className="rv-summary">
        <div className="rv-score">
          <b>{cg.rating.toFixed(1)}</b>
          <Rating value={cg.rating} />
          <span className="muted">{fmtNum(cg.reviewCount)} reviews</span>
        </div>
        <div>
          <div className="small muted">What campers mention most · tap to filter</div>
          <div className="rv-mentions">
            {cg.mentions.map((m) => (
              <button key={m.label} className={`mention ${m.tone} ${filter === m.label ? 'active' : ''}`} onClick={() => setFilter(filter === m.label ? null : m.label)} aria-pressed={filter === m.label}>
                {m.tone === 'warn' ? <Alert size={12} /> : <Check size={12} />} {m.label} <span className="muted">{m.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <ul className="rv-list">
        {shown.map((r, i) => (
          <li key={i} className="rv">
            <div className="rv-head">
              <span className="avatar">{r.author[0]}</span>
              <b>{r.author}</b>
              <span className="muted">{r.party} · {r.date}</span>
              <span className="rv-stars" aria-label={`${r.stars} out of 5`}>{'★'.repeat(r.stars)}<span className="dim">{'★'.repeat(5 - r.stars)}</span></span>
            </div>
            <p>{highlight(r.text, kw)}</p>
          </li>
        ))}
        {!shown.length && <li className="muted">No written reviews match that topic yet.</li>}
      </ul>
    </div>
  );
}

function highlight(text: string, kw: string | null) {
  if (!kw) return text;
  const i = text.toLowerCase().indexOf(kw);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + kw.length)}</mark>
      {text.slice(i + kw.length)}
    </>
  );
}
