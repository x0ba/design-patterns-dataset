import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CAMPGROUNDS, CG_BY_ID, GLOSSARY, RESERVATION_FEE, TRIP, type Operator, type Site } from './data';
import { CLEARED_FILTERS, DEFAULT_FILTERS, DEFAULT_PARTY, activeMustHaveCount, matches, type Filters, type Party } from './filters';
import Detail, { type DetailTab } from './Detail';
import Results, { type SortKey } from './Results';
import CompareView from './Compare';
import { DEFAULT_SITE_FILTERS, NightPills, SHADE_LABEL, type SiteFilters } from './SitesTab';
import { Bike, Book, Calendar, Check, Chevron, Close, Heart, Minus, People, Pin, Plus, Quiet, Shower, Tent, Toilet, Tree, Waves } from './icons';
import { fmtDrive, useDismiss } from './ui';

// ---------- persisted state ----------
const STORE_KEY = 'pitchfinder.shortlist.v1';
interface Persisted {
  saved: string[];
  pins: Record<string, string[]>;
  notes: Record<string, string>;
  booked: Record<string, string>;
}
const INITIAL: Persisted = {
  saved: ['pine-hollow', 'cedar-flat', 'manzanita-shores'],
  pins: { 'cedar-flat': ['cedar-flat-A4'] },
  notes: {
    'cedar-flat': 'Pricier, but no generators at all and free showers. A4 is right by the swimming hole.',
    'manzanita-shores': 'Only an hour away, but reviews say not much shade.',
  },
  booked: {},
};
function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...INITIAL, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return INITIAL;
}

function score(c: (typeof CAMPGROUNDS)[number]) {
  return c.rating * 20 + Math.min(c.openAll, 20) * 1.1 + c.shadePct * 0.08 - c.driveMin * 0.07 + (c.generator.policy === 'none' ? 3 : 0) + Math.log10(c.reviewCount) * 2;
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [party, setParty] = useState<Party>(DEFAULT_PARTY);
  const [sort, setSort] = useState<SortKey>('best');
  const [selectedId, setSelectedId] = useState('pine-hollow');
  const [tab, setTab] = useState<DetailTab>('sites');
  const [siteFilters, setSiteFilters] = useState<SiteFilters>(DEFAULT_SITE_FILTERS);
  const [selectedSite, setSelectedSite] = useState<Record<string, string | null>>({ 'pine-hollow': 'pine-hollow-B30' });
  const [store, setStore] = useState<Persisted>(loadPersisted);
  const [compareOpen, setCompareOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [reserveSite, setReserveSite] = useState<Site | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [store]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const list = useMemo(() => {
    const l = CAMPGROUNDS.filter((c) => matches(c, filters));
    const sorters: Record<SortKey, (a: (typeof l)[number], b: (typeof l)[number]) => number> = {
      best: (a, b) => score(b) - score(a),
      drive: (a, b) => a.driveMin - b.driveMin,
      price: (a, b) => a.priceMin - b.priceMin,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      open: (a, b) => b.openAll - a.openAll,
    };
    return l.sort(sorters[sort]);
  }, [filters, sort]);

  const cg = CG_BY_ID[selectedId];
  const savedCgs = store.saved.map((id) => CG_BY_ID[id]).filter(Boolean);

  const toggleSave = useCallback((id: string) => {
    setStore((s) => {
      const on = s.saved.includes(id);
      const saved = on ? s.saved.filter((x) => x !== id) : [...s.saved, id];
      setToast(on ? `Removed ${CG_BY_ID[id].name} from saved` : `Saved ${CG_BY_ID[id].name} · ${saved.length} to compare`);
      return { ...s, saved };
    });
  }, []);

  const togglePin = useCallback((siteId: string) => {
    const cgId = siteId.split('-').slice(0, -1).join('-');
    setStore((s) => {
      const cur = s.pins[cgId] ?? [];
      const on = cur.includes(siteId);
      const pins = { ...s.pins, [cgId]: on ? cur.filter((x) => x !== siteId) : [...cur, siteId] };
      const saved = !on && !s.saved.includes(cgId) ? [...s.saved, cgId] : s.saved;
      const num = siteId.split('-').pop();
      setToast(on ? `Removed site ${num} from compare` : `Site ${num} saved to compare`);
      return { ...s, pins, saved };
    });
  }, []);

  const selectCg = (id: string) => {
    setSelectedId(id);
    setSiteFilters((f) => ({ ...f, loop: 'all' }));
    document.querySelector('.detail')?.scrollTo({ top: 0 });
  };

  const openSiteFromCompare = (cgId: string, siteId: string | null) => {
    setCompareOpen(false);
    selectCg(cgId);
    setTab('sites');
    if (siteId) {
      setSelectedSite((m) => ({ ...m, [cgId]: siteId }));
    }
  };

  const mustCount = activeMustHaveCount(filters);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><path d="M16 3 2 28h28z" fill="#1f5a43" /><path d="M16 13l-5.5 15h11z" fill="#f6efe2" /></svg>
          <span>Pitchfinder</span>
        </div>
        <div className="searchbar" role="search">
          <DrivePicker value={filters.maxDrive} onChange={(v) => setFilters({ ...filters, maxDrive: v })} />
          <div className="sb-seg static">
            <Calendar size={16} />
            <div>
              <div className="sb-label">Dates</div>
              <div className="sb-value">{TRIP.checkIn} – {TRIP.checkOut}, {TRIP.year} · 3 nights</div>
            </div>
          </div>
          <PartyPicker party={party} onChange={setParty} />
        </div>
        <div className="top-actions">
          <button className="btn btn-ghost" onClick={() => setGlossaryOpen(true)}><Book size={16} /> New to camping?</button>
          <button className="btn btn-ghost saved-btn" onClick={() => setCompareOpen(true)}>
            <Heart size={16} filled /> Saved <span className="count">{store.saved.length}</span>
          </button>
          <span className="avatar me" title="Renee Watanabe">RW</span>
        </div>
      </header>

      <div className="filterbar" role="toolbar" aria-label="Must-haves">
        <span className="fb-label">Must-haves</span>
        <Chip on={filters.flush} onClick={() => setFilters({ ...filters, flush: !filters.flush })} icon={<Toilet size={15} />} hint="Hides campgrounds with only vault (pit) toilets or none.">Flush toilets</Chip>
        <Chip on={filters.showers} onClick={() => setFilters({ ...filters, showers: !filters.showers })} icon={<Shower size={15} />}>Showers</Chip>
        <Chip on={filters.water} onClick={() => setFilters({ ...filters, water: !filters.water })} icon={<Waves size={15} />} hint="A lake, reservoir or river swimming area you can walk to.">Lake or swimming</Chip>
        <Chip on={filters.shade} onClick={() => setFilters({ ...filters, shade: !filters.shade })} icon={<Tree size={15} />} hint="Half or more of the sites have some shade.">Shady sites</Chip>
        <Chip on={filters.bikes} onClick={() => setFilters({ ...filters, bikes: !filters.bikes })} icon={<Bike size={15} />} hint="Paved, low-speed loops where kids can ride.">Room to bike</Chip>
        <Chip on={filters.quietGen} onClick={() => setFilters({ ...filters, quietGen: !filters.quietGen })} icon={<Quiet size={15} />} hint="Hides campgrounds that allow generators all day. Keeps ones with no generators or limited hours.">Limit generator noise</Chip>
        <span className="fb-divider" />
        <PricePicker value={filters.maxPrice} onChange={(v) => setFilters({ ...filters, maxPrice: v })} />
        <MoreFilters filters={filters} setFilters={setFilters} />
      </div>

      <main className="main">
        <Results
          list={list}
          total={CAMPGROUNDS.length}
          selectedId={selectedId}
          onSelect={selectCg}
          saved={store.saved}
          onToggleSave={toggleSave}
          sort={sort}
          setSort={setSort}
          savedCgs={savedCgs}
          onOpenCompare={() => setCompareOpen(true)}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
          changed={mustCount < 6 || filters.maxPrice < 95 || filters.maxDrive < 180 || filters.operators.length > 0 || filters.minRating > 0 || filters.playground || filters.store || !filters.tentSites}
          onShowAll={() => setFilters(CLEARED_FILTERS)}
        />
        {cg && (
          <Detail
            key={cg.id}
            cg={cg}
            tab={tab}
            setTab={setTab}
            saved={store.saved.includes(cg.id)}
            onToggleSave={() => toggleSave(cg.id)}
            onOpenCompare={() => setCompareOpen(true)}
            savedCount={store.saved.length}
            party={party}
            siteFilters={siteFilters}
            setSiteFilters={setSiteFilters}
            selectedSiteId={selectedSite[cg.id] ?? null}
            onSelectSite={(id) => setSelectedSite((m) => ({ ...m, [cg.id]: id }))}
            pinned={store.pins[cg.id] ?? []}
            onTogglePin={togglePin}
            onReserve={setReserveSite}
            booked={store.booked}
          />
        )}
      </main>

      {compareOpen && (
        <CompareView
          saved={store.saved}
          pins={store.pins}
          notes={store.notes}
          setNote={(id, v) => setStore((s) => ({ ...s, notes: { ...s.notes, [id]: v } }))}
          party={party}
          onRemove={toggleSave}
          onUnpin={togglePin}
          onOpenSite={openSiteFromCompare}
          onClose={() => setCompareOpen(false)}
        />
      )}
      {glossaryOpen && <Glossary onClose={() => setGlossaryOpen(false)} />}
      {reserveSite && (
        <ReserveModal
          site={reserveSite}
          party={party}
          onClose={() => setReserveSite(null)}
          onBooked={(ref) => setStore((s) => ({ ...s, booked: { ...s.booked, [reserveSite.id]: ref } }))}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

// ---------- small pieces ----------

function Chip({ on, onClick, icon, children, hint }: { on: boolean; onClick: () => void; icon: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <button className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick} title={hint}>
      {icon}
      {children}
      {on && <Check size={13} />}
    </button>
  );
}

function Popover({ label, value, icon, children, className }: { label: ReactNode; value?: ReactNode; icon?: ReactNode; children: (close: () => void) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(open, close);
  return (
    <div className={`pop-wrap ${className ?? ''}`} ref={ref}>
      <button className={`pop-btn ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {icon}
        {value !== undefined ? (
          <div>
            <div className="sb-label">{label}</div>
            <div className="sb-value">{value}</div>
          </div>
        ) : (
          label
        )}
        <Chevron size={14} />
      </button>
      {open && <div className="pop">{children(close)}</div>}
    </div>
  );
}

function DrivePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const opts = [60, 90, 120, 150, 180];
  return (
    <Popover className="sb-seg" icon={<Pin size={16} />} label="Near Sacramento, CA" value={`Up to ${fmtDrive(value)} drive`}>
      {(close) => (
        <div className="pop-body">
          <div className="pop-title">How far are you willing to drive?</div>
          <div className="radio-list">
            {opts.map((o) => (
              <label key={o} className="radio">
                <input type="radio" name="drive" checked={value === o} onChange={() => { onChange(o); close(); }} />
                Up to {fmtDrive(o)}
                <span className="muted small">{CAMPGROUNDS.filter((c) => c.driveMin <= o).length} campgrounds</span>
              </label>
            ))}
          </div>
          <p className="muted small">Drive times from downtown Sacramento without traffic. Holiday Friday traffic toward Tahoe can add an hour.</p>
        </div>
      )}
    </Popover>
  );
}

function Stepper({ label, sub, value, min, max, onChange }: { label: string; sub?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <div>
        <div>{label}</div>
        {sub && <div className="muted small">{sub}</div>}
      </div>
      <div className="stepper-ctl">
        <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}><Minus size={14} /></button>
        <span>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}><Plus size={14} /></button>
      </div>
    </div>
  );
}

function PartyPicker({ party, onChange }: { party: Party; onChange: (p: Party) => void }) {
  const set = (k: keyof Party) => (v: number) => onChange({ ...party, [k]: v });
  return (
    <Popover
      className="sb-seg"
      icon={<People size={16} />}
      label="Who’s going"
      value={`${party.adults} adults, ${party.kids} kids · ${party.tents} tent · ${party.vehicles} car`}
    >
      {() => (
        <div className="pop-body">
          <Stepper label="Adults" value={party.adults} min={1} max={8} onChange={set('adults')} />
          <Stepper label="Kids" sub="Ages 0–17" value={party.kids} min={0} max={8} onChange={set('kids')} />
          <Stepper label="Tents" sub="Yours is a 4-person tent" value={party.tents} min={0} max={4} onChange={set('tents')} />
          <Stepper label="Vehicles" sub="Most sites allow 1–2" value={party.vehicles} min={1} max={4} onChange={set('vehicles')} />
          <p className="muted small">We use this to check which sites fit your family.</p>
        </div>
      )}
    </Popover>
  );
}

function PricePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Popover label={<>{value < 95 ? `Up to $${value}/night` : 'Price'}</>} className={value < 95 ? 'active' : ''}>
      {() => (
        <div className="pop-body">
          <div className="pop-title">Cheapest site per night</div>
          <input type="range" min={28} max={95} step={1} value={value} onChange={(e) => onChange(+e.target.value)} aria-label="Maximum nightly price" />
          <div className="range-labels"><span>$28</span><b>{value >= 95 ? 'Any price' : `Up to $${value}`}</b><span>$95</span></div>
          <p className="muted small">3 nights at ${value} is about ${value * 3 + RESERVATION_FEE} with the booking fee.</p>
        </div>
      )}
    </Popover>
  );
}

const OPS: Operator[] = ['State park', 'County park', 'Regional park', 'State recreation area', 'National forest', 'Private'];

function MoreFilters({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const n = filters.operators.length + (filters.minRating > 0 ? 1 : 0) + (filters.playground ? 1 : 0) + (filters.store ? 1 : 0);
  return (
    <Popover label={<>More filters{n > 0 && <span className="count">{n}</span>}</>} className={n ? 'active' : ''}>
      {() => (
        <div className="pop-body wide">
          <div className="pop-title">Who runs it</div>
          <div className="check-grid">
            {OPS.map((o) => (
              <label key={o} className="check">
                <input
                  type="checkbox"
                  checked={filters.operators.includes(o)}
                  onChange={(e) => setFilters({ ...filters, operators: e.target.checked ? [...filters.operators, o] : filters.operators.filter((x) => x !== o) })}
                />
                {o === 'Private' ? 'Private campgrounds' : `${o}s`}
              </label>
            ))}
          </div>
          <p className="muted small">Public parks are usually cheaper; private campgrounds often have extras like pools and free showers.</p>
          <div className="pop-title">Rating</div>
          <div className="seg">
            {[0, 4, 4.5].map((r) => (
              <button key={r} className={filters.minRating === r ? 'on' : ''} onClick={() => setFilters({ ...filters, minRating: r })}>
                {r === 0 ? 'Any' : `${r}+ ★`}
              </button>
            ))}
          </div>
          <div className="pop-title">Nice to have</div>
          <label className="check"><input type="checkbox" checked={filters.playground} onChange={(e) => setFilters({ ...filters, playground: e.target.checked })} /> Playground</label>
          <label className="check"><input type="checkbox" checked={filters.store} onChange={(e) => setFilters({ ...filters, store: e.target.checked })} /> Camp store (firewood, ice)</label>
          <label className="check"><input type="checkbox" checked={filters.tentSites} onChange={(e) => setFilters({ ...filters, tentSites: e.target.checked })} /> Has tent sites</label>
        </div>
      )}
    </Popover>
  );
}

function Glossary({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay side" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Camping terms explained">
        <header>
          <h2>Camping words, in plain English</h2>
          <button className="icon-btn big" onClick={onClose} aria-label="Close"><Close size={20} /></button>
        </header>
        <div className="drawer-tip">
          <Tent size={20} />
          <p>For a first trip with kids, a <b>tent site</b> with <b>flush toilets and showers</b> in its loop is the easy choice. Look for a site within about 100 m of the restroom for night-time trips.</p>
        </div>
        <dl className="gloss">
          {Object.entries(GLOSSARY).map(([k, g]) => (
            <div key={k}>
              <dt>{g.term}</dt>
              <dd>{g.def}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}

function ReserveModal({ site, party, onClose, onBooked }: { site: Site; party: Party; onClose: () => void; onBooked: (ref: string) => void }) {
  const cg = CG_BY_ID[site.cgId];
  const [step, setStep] = useState<'review' | 'done'>('review');
  const [card, setCard] = useState('');
  const [name, setName] = useState('Renee Watanabe');
  const [exp, setExp] = useState('');
  const [ref] = useState(() => `PF-${(site.number + cg.id).length}${Math.abs(site.x * 37 + site.y * 11).toFixed(0).slice(-5)}`);
  const digits = card.replace(/\D/g, '');
  const valid = digits.length >= 15 && digits.length <= 16 && /^\d{2}\/\d{2}$/.test(exp) && name.trim().length > 1;
  const total = site.price * 3 + RESERVATION_FEE;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Reserve site ${site.number}`}>
        <header>
          <h2>{step === 'review' ? `Reserve site ${site.number}` : 'You’re booked!'}</h2>
          <button className="icon-btn big" onClick={onClose} aria-label="Close"><Close size={20} /></button>
        </header>
        {step === 'review' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              onBooked(ref);
              setStep('done');
            }}
          >
            <div className="rs-summary">
              <div><b>{cg.name}</b> · Loop {site.loop} · Site {site.number}</div>
              <div className="muted">{TRIP.checkIn} – {TRIP.checkOut}, {TRIP.year} · check-in 2 pm</div>
              <div className="muted">{site.restroomM} m to restroom · {SHADE_LABEL[site.shade]} · {party.adults + party.kids} people, {party.vehicles} vehicle</div>
              <NightPills open={site.open} />
            </div>
            <table className="rs-price">
              <tbody>
                <tr><td>${site.price} × 3 nights</td><td>${site.price * 3}</td></tr>
                <tr><td>Reservation fee</td><td>${RESERVATION_FEE}</td></tr>
                <tr className="total"><td>Total</td><td>${total}</td></tr>
              </tbody>
            </table>
            <p className="muted small">Free cancellation until May 15, 2027. After that, a $10 fee applies.</p>
            <div className="form-grid">
              <label className="span2">Name on card<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="cc-name" /></label>
              <label>Card number<input value={card} onChange={(e) => setCard(e.target.value.replace(/[^\d ]/g, '').slice(0, 19))} inputMode="numeric" placeholder="1234 5678 9012 3456" autoComplete="cc-number" /></label>
              <label>Expires<input value={exp} onChange={(e) => setExp(e.target.value.replace(/[^\d/]/g, '').slice(0, 5))} placeholder="MM/YY" autoComplete="cc-exp" /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Not yet</button>
              <button type="submit" className="btn btn-primary" disabled={!valid}>Pay ${total}</button>
            </div>
          </form>
        ) : (
          <div className="rs-done">
            <div className="done-ic"><Check size={28} /></div>
            <p><b>Site {site.number} at {cg.name}</b> is yours for {TRIP.checkIn} – {TRIP.checkOut}.</p>
            <p className="muted">Confirmation {ref}. We emailed the details and a first-trip packing list.</p>
            <div className="modal-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
