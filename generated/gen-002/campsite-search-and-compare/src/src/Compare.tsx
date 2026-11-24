import { useEffect, useState, type ReactNode } from 'react';
import { CG_BY_ID, RESERVATION_FEE, walkMinutes, type Campground, type Site } from './data';
import { genLabel } from './Detail';
import { siteFit, type Party } from './filters';
import { Alert, Bookmark, Check, Close, Minus, Share } from './icons';
import { SHADE_LABEL, NightPills } from './SitesTab';
import { OperatorChip, Rating, Scene, fmtDrive } from './ui';

interface Props {
  saved: string[];
  pins: Record<string, string[]>;
  notes: Record<string, string>;
  setNote: (cgId: string, v: string) => void;
  party: Party;
  onRemove: (cgId: string) => void;
  onUnpin: (siteId: string) => void;
  onOpenSite: (cgId: string, siteId: string | null) => void;
  onClose: () => void;
}

function Row({ label, children, hint, cgs }: { label: string; hint?: ReactNode; cgs: Campground[]; children: (c: Campground, i: number) => ReactNode }) {
  return (
    <tr>
      <th scope="row">
        {label}
        {hint && <div className="muted small">{hint}</div>}
      </th>
      {cgs.map((c, i) => <td key={c.id}>{children(c, i)}</td>)}
    </tr>
  );
}
function Best({ on }: { on: boolean }) {
  return on ? <span className="best">Best</span> : null;
}
function YesNo({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <span className={ok ? 'yes' : 'no'}>{ok ? <Check size={13} /> : <Minus size={13} />} {children}</span>;
}

const tentFriendly = (s: Site) => s.type === 'Tent' || s.type === 'Walk-in';

function bestOpenSite(cg: Campground, party: Party) {
  return cg.sites
    .filter((s) => s.open.every(Boolean) && siteFit(s, party).ok && tentFriendly(s))
    .sort((a, b) => a.restroomM - b.restroomM)[0] as Site | undefined;
}

export default function CompareView(p: Props) {
  const cgs = p.saved.map((id) => CG_BY_ID[id]).filter(Boolean);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && p.onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [p]);

  const pinnedSites = (cg: Campground) => (p.pins[cg.id] ?? []).map((sid) => cg.sites.find((s) => s.id === sid)).filter(Boolean) as Site[];
  const fitCount = (cg: Campground) => cg.sites.filter((s) => s.open.every(Boolean) && siteFit(s, p.party).ok && tentFriendly(s)).length;

  const best = <T,>(vals: T[], better: (a: T, b: T) => boolean) => {
    if (vals.length < 2) return -1;
    let bi = 0;
    vals.forEach((v, i) => { if (better(v, vals[bi])) bi = i; });
    return bi;
  };
  const driveBest = best(cgs.map((c) => c.driveMin), (a, b) => a < b);
  const priceBest = best(cgs.map((c) => c.priceMin), (a, b) => a < b);
  const ratingBest = best(cgs.map((c) => c.rating), (a, b) => a > b);
  const shadeBest = best(cgs.map((c) => c.shadePct), (a, b) => a > b);
  const closest = cgs.map((c) => bestOpenSite(c, p.party));
  const closestBest = best(closest.map((s) => s?.restroomM ?? 9999), (a, b) => a < b);
  const quietBest = best(cgs.map((c) => (c.generator.policy === 'none' ? 0 : c.generator.policy === 'limited' ? 1 : 2)), (a, b) => a < b);

  const share = async () => {
    const lines = [
      'Campsite shortlist · Sat May 22 – Tue May 25, 2027 (3 nights)',
      '',
      ...cgs.flatMap((c, i) => {
        const pins = pinnedSites(c);
        return [
          `${i + 1}. ${c.name} (${c.operator}) · ${fmtDrive(c.driveMin)} drive · $${c.priceMin}–$${c.priceMax}/night · ${c.rating.toFixed(1)}★`,
          `   ${genLabel(c)}; quiet hours ${c.quietHours}; ${c.shadePct}% shaded sites`,
          pins.length ? `   Sites I like: ${pins.map((s) => `${s.number} (${s.restroomM} m to restroom, ${SHADE_LABEL[s.shade].toLowerCase()})`).join(', ')}` : '',
          c.mentions.some((m) => m.tone === 'warn') ? `   Heads-up: ${c.mentions.filter((m) => m.tone === 'warn').map((m) => m.label).join('; ')}` : '',
          p.notes[c.id] ? `   Note: ${p.notes[c.id]}` : '',
        ].filter(Boolean);
      }),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = lines;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2600);
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Compare saved campgrounds">
      <div className="compare">
        <header className="cmp-head">
          <div>
            <h2>Compare your saved campgrounds</h2>
            <div className="muted">Sat May 22 – Tue May 25, 2027 · 3 nights · {p.party.adults} adults, {p.party.kids} kids, {p.party.tents} tent, {p.party.vehicles} vehicle</div>
          </div>
          <div className="cmp-actions">
            <button className="btn btn-secondary" onClick={share} disabled={!cgs.length}>
              {copied ? <><Check size={15} /> Copied. Paste it in a text</> : <><Share size={15} /> Copy summary to share</>}
            </button>
            <button className="icon-btn big" onClick={p.onClose} aria-label="Close compare"><Close size={20} /></button>
          </div>
        </header>
        {cgs.length === 0 ? (
          <div className="cmp-empty">You haven’t saved any campgrounds yet. Tap the heart on a result to save it.</div>
        ) : (
          <div className="cmp-scroll">
            <table className="cmp-table" style={{ ['--cols' as string]: cgs.length }}>
              <thead>
                <tr>
                  <th />
                  {cgs.map((c) => (
                    <th key={c.id} scope="col">
                      <div className="cmp-card">
                        <Scene cg={c} className="cmp-photo" />
                        <div className="cmp-name">{c.name}</div>
                        <div className="cmp-sub"><OperatorChip op={c.operator} /></div>
                        <div className="cmp-links">
                          <button className="link" onClick={() => p.onOpenSite(c.id, null)}>View sites</button>
                          <button className="link danger" onClick={() => p.onRemove(c.id)}>Remove</button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="group-row"><th colSpan={cgs.length + 1}>Basics</th></tr>
                <Row cgs={cgs} label="Drive from Sacramento">{(c, i) => <>{fmtDrive(c.driveMin)} <Best on={i === driveBest} /></>}</Row>
                <Row cgs={cgs} label="3 nights, tent site" hint="Cheapest tent site + $8 booking fee">{(c, i) => <><b>${c.priceMin * 3 + RESERVATION_FEE}</b> <span className="muted">(${c.priceMin}/night)</span> <Best on={i === priceBest} /></>}</Row>
                <Row cgs={cgs} label="Rating">{(c, i) => <><Rating value={c.rating} count={c.reviewCount} compact /> <Best on={i === ratingBest} /></>}</Row>

                <tr className="group-row"><th colSpan={cgs.length + 1}>Your must-haves</th></tr>
                <Row cgs={cgs} label="Flush toilets & showers">{(c) => <YesNo ok={c.amenities.flushToilets && c.amenities.showers}>{c.showerNote ?? 'No showers'}</YesNo>}</Row>
                <Row cgs={cgs} label="Lake or swimming">{(c) => <YesNo ok={c.amenities.lakeAccess}>{c.water ? c.water.swim : 'None'}</YesNo>}</Row>
                <Row cgs={cgs} label="Shade">{(c, i) => (
                  <>
                    <div className="bar"><span style={{ width: `${c.shadePct}%` }} /></div>
                    {c.shadePct}% of sites shaded <Best on={i === shadeBest} />
                  </>
                )}</Row>
                <Row cgs={cgs} label="Room for kids’ bikes">{(c) => <YesNo ok={!!c.bikeNote}>{c.bikeNote ?? 'No paved loops'}</YesNo>}</Row>
                <Row cgs={cgs} label="Generator noise">{(c, i) => (
                  <span className={c.generator.policy === 'none' ? 'yes' : c.generator.policy === 'limited' ? 'partial' : 'no'}>
                    <b>{genLabel(c)}.</b> {c.generator.text} <Best on={i === quietBest} />
                  </span>
                )}</Row>
                <Row cgs={cgs} label="Quiet hours">{(c) => c.quietHours}</Row>

                <tr className="group-row"><th colSpan={cgs.length + 1}>Sites for your family</th></tr>
                <Row cgs={cgs} label="Open all 3 nights" hint={`Tent sites that fit ${p.party.adults + p.party.kids} people and ${p.party.vehicles} vehicle${p.party.vehicles > 1 ? 's' : ''}`}>{(c) => {
                  const n = fitCount(c);
                  return <span className={n <= 5 ? 'partial' : ''}><b>{n}</b> sites{n <= 5 ? ' · going fast' : ''}</span>;
                }}</Row>
                <Row cgs={cgs} label="Closest open site to a restroom">{(c, i) => {
                  const s = closest[i];
                  if (!s) return <span className="muted">None open</span>;
                  return (
                    <>
                      <button className="link" onClick={() => p.onOpenSite(c.id, s.id)}>
                        {s.number}: {s.restroomM} m, {walkMinutes(s.restroomM)}
                      </button>
                      <Best on={i === closestBest} />
                    </>
                  );
                }}</Row>
                <Row cgs={cgs} label="Sites you saved">{(c) => {
                  const pins = pinnedSites(c);
                  if (!pins.length) return <span className="muted">None yet. <button className="link" onClick={() => p.onOpenSite(c.id, null)}>Pick sites</button></span>;
                  return (
                    <ul className="cmp-pins">
                      {pins.map((s) => (
                        <li key={s.id}>
                          <button className="link strong" onClick={() => p.onOpenSite(c.id, s.id)}><Bookmark size={12} filled /> {s.number}</button>
                          <span>{s.restroomM} m to restroom · {SHADE_LABEL[s.shade]} · ${s.price}/night</span>
                          <NightPills open={s.open} />
                          <button className="icon-btn" onClick={() => p.onUnpin(s.id)} aria-label={`Remove site ${s.number}`}><Close size={13} /></button>
                        </li>
                      ))}
                    </ul>
                  );
                }}</Row>

                <tr className="group-row"><th colSpan={cgs.length + 1}>What campers say</th></tr>
                <Row cgs={cgs} label="Heads-up">{(c) => (
                  <ul className="cmp-warns">
                    {c.mentions.filter((m) => m.tone === 'warn').map((m) => <li key={m.label}><Alert size={12} /> {m.label} <span className="muted">({m.count})</span></li>)}
                    {!c.mentions.some((m) => m.tone === 'warn') && <li className="muted">Nothing notable</li>}
                  </ul>
                )}</Row>
                <Row cgs={cgs} label="Loved">{(c) => (
                  <ul className="cmp-goods">
                    {c.mentions.filter((m) => m.tone === 'good').slice(0, 3).map((m) => <li key={m.label}><Check size={12} /> {m.label}</li>)}
                  </ul>
                )}</Row>
                <Row cgs={cgs} label="Your notes" hint="Saved on this device">{(c) => (
                  <textarea
                    className="note"
                    value={p.notes[c.id] ?? ''}
                    onChange={(e) => p.setNote(c.id, e.target.value)}
                    placeholder="Anything to talk over tonight…"
                    rows={3}
                  />
                )}</Row>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
