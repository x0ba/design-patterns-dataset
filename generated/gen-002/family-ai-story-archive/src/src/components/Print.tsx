import { useMemo, useState } from 'react';
import { TODAY, addBusinessDays, fmtDate, fmtMonthLong, fmtShortDay, forLabel, money } from '../format';
import { go, href } from '../router';
import { StoryArt } from '../art';
import { useStore } from '../store';
import type { Format, Order, Story } from '../types';
import { IconAlert, IconBox, IconCheck, IconChevronL, IconEar, IconRegen, IconTruck } from '../icons';

export const pagesFor = (s: Story) => Math.max(16, Math.ceil((12 + s.illustrations * 2 + Math.round(s.wordCount / 150)) / 2) * 2);
export const priceFor = (s: Story, f: Format) => (f === 'softcover' ? Math.round(12 + pagesFor(s) * 0.55) - 0.05 : Math.round(22 + pagesFor(s) * 0.6) - 0.05);

const SHIPPING = [
  { id: 'standard', label: 'Standard', price: 5.95, from: 5, to: 7 },
  { id: 'express', label: 'Express', price: 14.95, from: 2, to: 3 },
] as const;

export function Print({ id, versionParam }: { id: string; versionParam: string | null }) {
  const { byId, orders, addOrder } = useStore();
  const s = byId(id);
  const multi = !!s && s.versions.length > 1;
  const [versionId, setVersionId] = useState<string | null>(() => (s && versionParam && s.versions.some((v) => v.id === versionParam) ? versionParam : s && s.versions.length === 1 ? s.versions[0].id : null));
  const [title, setTitle] = useState(s?.title ?? '');
  const [dedication, setDedication] = useState('');
  const [format, setFormat] = useState<Format>('softcover');
  const [qty, setQty] = useState(1);
  const [ship, setShip] = useState<(typeof SHIPPING)[number]['id']>('standard');
  const [cover, setCover] = useState(0);
  const [addr, setAddr] = useState({ name: 'Jonah Reyes', street: '1427 Cedar Hollow Drive', city: 'San Diego', state: 'CA', zip: '92104' });
  const [placed, setPlaced] = useState<Order | null>(null);

  const shipOpt = SHIPPING.find((x) => x.id === ship)!;
  const arrival = useMemo(() => [addBusinessDays(TODAY, shipOpt.from), addBusinessDays(TODAY, shipOpt.to)], [shipOpt]);

  if (!s) return <div className="page narrow"><h1>That story isn’t in the archive.</h1><a className="btn" href={href('')}>Back to the archive</a></div>;

  const version = s.versions.find((v) => v.id === versionId) ?? null;
  const unit = priceFor(s, format);
  const total = Math.round((unit * qty + shipOpt.price) * 100) / 100;
  const pages = pagesFor(s);
  const printedBefore = orders.filter((o) => o.storyId === s.id);
  const addrOk = addr.name.trim() && addr.street.trim() && addr.city.trim() && addr.state.trim() && /^\d{5}$/.test(addr.zip.trim());
  const ready = !!version && !!title.trim() && !!addrOk;
  const topRead = multi ? Math.max(...s.versions.map((v) => v.readAloud)) : 0;

  const place = () => {
    if (!ready || !version) return;
    const order: Order = {
      id: `LL-${1600 + orders.length}`, storyId: s.id, versionId: version.id, title: title.trim(), orderedAt: '2026-11-16T21:40',
      format, qty, total, deliveredAt: `${arrival[1].getFullYear()}-${String(arrival[1].getMonth() + 1).padStart(2, '0')}-${String(arrival[1].getDate()).padStart(2, '0')}`, by: 'Jonah', dedication: dedication.trim() || undefined,
    };
    addOrder(order); setPlaced(order);
    window.scrollTo(0, 0);
  };

  if (placed) {
    return (
      <div className="page narrow done">
        <div className="done-card">
          <div className="done-ico"><IconCheck size={30} /></div>
          <h1>Your book is on its way to the printer</h1>
          <p className="lead">Order <b>{placed.id}</b> · {qty} × {format} copy of <b>“{placed.title}”</b>{version && version.kind !== 'original' ? <>, with the {version.label.toLowerCase()}</> : null}.</p>
          <dl className="done-facts">
            <div><dt>Arrives</dt><dd>{fmtShortDay(arrival[0])} – {fmtShortDay(arrival[1])}</dd></div>
            <div><dt>Shipping to</dt><dd>{addr.name}, {addr.street}, {addr.city}, {addr.state} {addr.zip}</dd></div>
            <div><dt>Charged</dt><dd>{money(total)} to Visa ending 4417</dd></div>
          </dl>
          <div className="row-actions">
            <a className="btn primary" href={href('')}>Back to the archive</a>
            <a className="btn ghost" href={href('orders')}>See printed books</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page print">
      <nav className="crumbs"><a href={href(`story/${s.id}`)} className="back"><IconChevronL size={16} /> Back to the story</a></nav>
      <h1 className="ptitle">Order a printed copy</h1>

      <div className="pgrid">
        <div className="pform">
          {printedBefore.length > 0 && (
            <div className="notice ok"><IconBox size={16} /> You’ve ordered this story before ({printedBefore.map((o) => fmtMonthLong(o.orderedAt.slice(0, 7))).join(', ')}).</div>
          )}

          <section className="pcard">
            <h2><span className="n">1</span> Which story and ending?</h2>
            <div className="pstory">
              <span className="pth"><StoryArt story={s} /></span>
              <div>
                <b>{s.title}</b>
                <small>Made for {forLabel(s.for)} · by {s.by} · {fmtDate(s.createdAt)}</small>
              </div>
              <a className="link" href={href(`story/${s.id}`)}>View</a>
            </div>
            {multi ? (
              <fieldset className="vchoice">
                <legend>This story has {s.versions.length} endings. Which one goes in the book?</legend>
                {s.versions.map((v, i) => (
                  <label key={v.id} className={'vopt' + (versionId === v.id ? ' on' : '')}>
                    <input type="radio" name="version" checked={versionId === v.id} onChange={() => setVersionId(v.id)} />
                    <span className="radio" />
                    <span className="vbody">
                      <span className="vtop"><b>Ending {i + 1}: {v.label}</b>
                        {v.kind !== 'original' && <span className="vwhen"><IconRegen size={13} /> {fmtDate(v.createdAt)}</span>}
                        <span className={'vread' + (v.readAloud === topRead && topRead > 0 ? ' hot' : '')}><IconEar size={14} /> {v.readAloud === 0 ? 'Not read yet' : `Read aloud ${v.readAloud}×`}</span>
                        {v.readAloud === topRead && topRead > 0 && s.versions.filter((x) => x.readAloud === topRead).length === 1 && <span className="vbadge">Read most</span>}
                      </span>
                      <span className="vtext">{v.ending}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="subnote">One ending saved for this story.</p>
            )}
          </section>

          <section className="pcard">
            <h2><span className="n">2</span> Make it a book</h2>
            <label className="field">Title on the cover
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
              <small>Defaults to the story’s name. Change it if you like — it won’t rename the story in the archive.</small>
            </label>
            <label className="field"><span>Dedication <em>(optional)</em></span>
              <input value={dedication} onChange={(e) => setDedication(e.target.value)} maxLength={90} placeholder="For Pia, with love from Grandma" />
            </label>
            {s.illustrations > 1 && (
              <div className="field">Cover illustration
                <div className="coverpick">
                  {Array.from({ length: s.illustrations }, (_, i) => (
                    <button key={i} type="button" className={i === cover ? 'on' : ''} onClick={() => setCover(i)} aria-label={`Use illustration ${i + 1} on the cover`} aria-pressed={i === cover}><StoryArt story={s} index={i} /></button>
                  ))}
                </div>
              </div>
            )}
            <div className="field">Format
              <div className="fmtgrid">
                {(['softcover', 'hardcover'] as Format[]).map((f) => (
                  <label key={f} className={'fmt' + (format === f ? ' on' : '')}>
                    <input type="radio" name="fmt" checked={format === f} onChange={() => setFormat(f)} />
                    <b>{f === 'softcover' ? 'Softcover' : 'Hardcover'}</b>
                    <span>8 × 8 in · {pages} pages</span>
                    <strong>{money(priceFor(s, f))}</strong>
                  </label>
                ))}
              </div>
            </div>
            <div className="field inline">
              <span>Copies</span>
              <div className="qty">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Fewer copies">−</button>
                <output aria-live="polite">{qty}</output>
                <button type="button" onClick={() => setQty(Math.min(10, qty + 1))} disabled={qty >= 10} aria-label="More copies">+</button>
              </div>
            </div>
            {s.illustrations === 0 && <div className="notice warn"><IconAlert size={16} /> This story has no illustrations, so the book will be text only.</div>}
            {s.illustrations > 0 && s.illustrations <= 2 && <div className="notice warn"><IconAlert size={16} /> Only {s.illustrations} {s.illustrations === 1 ? 'illustration' : 'illustrations'} — most pages will be text only.</div>}
          </section>

          <section className="pcard">
            <h2><span className="n">3</span> Where should it go?</h2>
            <div className="addr">
              <label className="field">Name<input value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} /></label>
              <label className="field">Street address<input value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} /></label>
              <label className="field c">City<input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></label>
              <label className="field st">State<input value={addr.state} maxLength={2} onChange={(e) => setAddr({ ...addr, state: e.target.value.toUpperCase() })} /></label>
              <label className="field zip">ZIP<input value={addr.zip} inputMode="numeric" maxLength={5} onChange={(e) => setAddr({ ...addr, zip: e.target.value.replace(/\D/g, '') })} aria-invalid={!!addr.zip && addr.zip.length !== 5} /></label>
            </div>
            <div className="shipopts">
              {SHIPPING.map((o) => (
                <label key={o.id} className={'ship' + (ship === o.id ? ' on' : '')}>
                  <input type="radio" name="ship" checked={ship === o.id} onChange={() => setShip(o.id)} />
                  <IconTruck size={20} />
                  <span><b>{o.label}</b><small>Arrives {fmtShortDay(addBusinessDays(TODAY, o.from))} – {fmtShortDay(addBusinessDays(TODAY, o.to))}</small></span>
                  <strong>{money(o.price)}</strong>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="psum">
          <div className="book" aria-label="Cover preview">
            <div className="cover">
              <div className="cover-art"><StoryArt story={s} index={cover} /></div>
              <div className="cover-title">{title.trim() || 'Untitled'}</div>
              <div className="cover-by">A Lanternloft story for {forLabel(s.for)}</div>
            </div>
            {dedication.trim() && <div className="ded">Dedication: <i>{dedication.trim()}</i></div>}
          </div>
          <dl className="lines">
            <div><dt>{format === 'softcover' ? 'Softcover' : 'Hardcover'} × {qty}</dt><dd>{money(unit * qty)}</dd></div>
            <div><dt>{shipOpt.label} shipping</dt><dd>{money(shipOpt.price)}</dd></div>
            <div className="total"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
          <p className="arrive"><IconTruck size={16} /> Arrives {fmtShortDay(arrival[0])} – {fmtShortDay(arrival[1])}</p>
          <p className="what"><b>Printing:</b> {version ? <>{version.label} ending{multi ? <>, read aloud {version.readAloud}×</> : null}</> : <span className="need">no ending chosen yet</span>}</p>
          <button className="btn primary block lg" disabled={!ready} onClick={place}>Place order · {money(total)}</button>
          {!ready && <p className="why">{!version ? 'Choose which ending to print first.' : !title.trim() ? 'Add a title for the cover.' : 'Check the shipping address.'}</p>}
          <p className="fine">Charged to Visa ending 4417 · ordering as Jonah</p>
        </aside>
      </div>
    </div>
  );
}
