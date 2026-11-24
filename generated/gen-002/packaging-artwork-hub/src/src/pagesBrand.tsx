import React, { useEffect, useRef, useState } from 'react';
import {
  BRANDS, TOTALS, Brand, Line, Format, MarketEntry, Version, artworkOf, approvedOf, pendingOf, pathOf, DIELINES, DIELINE_USAGE, PRINTERS,
  regBlocksFor, LANGS, COUNTRY, REVIEWERS, TODAY,
} from './data';
import { PackArt, Barcode, DielineDrawing } from './art';
import { Icon, StatusPill, FileName, A, CopyButton, PinButton } from './ui';
import { groupByRegion } from './structure';
import { useStore } from './store';
import { navigate } from './router';
import { fmtDate, daysBetween } from './util';

const reviewerByShort = (s?: string) => Object.values(REVIEWERS).find((r) => r.short === s);

// ───────────── All brands ─────────────
export function BrandsIndex() {
  return (
    <div className="page">
      <header className="page-head">
        <div className="eyebrow">Brand structure</div>
        <h1>All brands</h1>
        <p className="sub">{TOTALS.brands} brands · {TOTALS.lines} product lines · {TOTALS.skus.toLocaleString('en-GB')} active SKUs. Open a brand to see its product lines, then pack formats, then markets.</p>
      </header>
      <div className="brand-grid">
        {BRANDS.map((b) => (
          <A key={b.id} to={pathOf.brand(b)} className="brand-card">
            <div className="brand-mark" style={{ background: b.color, color: b.ink }}>{b.name}</div>
            <div className="brand-meta">
              <div className="bm-cat">{b.category}</div>
              <div className="bm-nums"><b>{b.lines.length}</b> lines · <b>{b.skuCount}</b> SKUs</div>
              <div className="bm-code">Code <span className="mono">{b.code}</span> · Brand manager {b.manager}</div>
            </div>
          </A>
        ))}
      </div>
    </div>
  );
}

// ───────────── Brand ─────────────
export function BrandPage({ brand }: { brand: Brand }) {
  return (
    <div className="page">
      <header className="page-head">
        <div className="eyebrow">Level 1 · Brand</div>
        <h1><span className="swatch big" style={{ background: brand.color }} />{brand.name}</h1>
        <p className="sub">{brand.category} · {brand.lines.length} product lines · {brand.skuCount} active SKUs · file-name code <span className="mono">{brand.code}</span> · Brand manager {brand.manager}</p>
      </header>
      <table className="tbl">
        <thead><tr><th>Product line</th><th>Code</th><th>Pack formats</th><th className="num">Markets</th><th>Latest approval</th></tr></thead>
        <tbody>
          {brand.lines.map((l) => {
            const ms = l.formats.flatMap((f) => f.markets);
            const latest = l.formats.flatMap((f) => Object.values(f.artworks).map((a) => approvedOf(a)?.approvedAt || '')).sort().pop();
            return (
              <tr key={l.id} className="clickable" onClick={() => navigate(pathOf.line(l))}>
                <td><span className="swatch" style={{ background: l.color }} /><A to={pathOf.line(l)}>{l.name}</A></td>
                <td className="mono">{l.code}</td>
                <td>{l.formats.map((f) => <span key={f.id} className="chip">{f.name}</span>)}</td>
                <td className="num">{ms.length}</td>
                <td>{fmtDate(latest)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ───────────── Product line ─────────────
export function LinePage({ line }: { line: Line }) {
  return (
    <div className="page">
      <header className="page-head">
        <div className="eyebrow">Level 2 · Product line</div>
        <h1>{line.brand.name} {line.name}</h1>
        <p className="sub">{line.formats.length} pack formats · {line.formats.reduce((a, f) => a + f.markets.length, 0)} market entries · file-name code <span className="mono">{line.brand.code}_{line.code}</span></p>
      </header>
      <div className="fmt-grid">
        {line.formats.map((f) => {
          const first = f.markets[0];
          const art = artworkOf(first);
          const regions = groupByRegion(f.markets);
          const dls = [...new Set(f.markets.map((m) => m.dielineId))];
          return (
            <A key={f.id} to={pathOf.format(f)} className="fmt-card">
              <div className="fmt-art"><PackArt brand={line.brand} line={line} format={f} art={art} version={approvedOf(art)} width={120} /></div>
              <div className="fmt-body">
                <div className="fmt-name">{f.name}</div>
                <div className="fmt-kind">{f.kind} · <span className="mono">{f.code}</span></div>
                <div className="fmt-stat"><b>{f.markets.length}</b> markets in {regions.length} region{regions.length > 1 ? 's' : ''}</div>
                <div className="fmt-regions">{regions.map(([r, ms]) => <span key={r} className="chip">{r} · {ms.map((m) => m.country.code).join(' ')}</span>)}</div>
                <div className="fmt-dl">Dieline{dls.length > 1 ? 's' : ''} {dls.map((d) => <span key={d} className="mono">{d}</span>)}</div>
              </div>
            </A>
          );
        })}
      </div>
    </div>
  );
}

// ───────────── Pack format ─────────────
export function FormatPage({ fmt, focus }: { fmt: Format; focus?: string }) {
  const archRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus === 'archive') setTimeout(() => archRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  }, [focus]);
  const regions = groupByRegion(fmt.markets);
  const arts = Object.values(fmt.artworks);
  const shared = arts.filter((a) => a.marketIds.length > 1);
  return (
    <div className="page">
      <header className="page-head">
        <div className="eyebrow">Level 3 · Pack format</div>
        <h1>{fmt.name}</h1>
        <p className="sub">{fmt.brand.name} {fmt.line.name} · {fmt.kind} · {fmt.material} · code <span className="mono">{fmt.code}</span></p>
      </header>
      <div className="explain">
        <Icon name="info" size={16} />
        <div>
          <b>{fmt.markets.length} market entries, grouped into {regions.length} region{regions.length > 1 ? 's' : ''}.</b> Regions are only a grouping for browsing — each market is its own entry at the same level, with its own artwork versions.
          {shared.length > 0 && <> {shared.map((a) => a.marketIds.map((x) => COUNTRY[x].name).join(' and ')).join('; ')} share {shared.length > 1 ? 'artworks' : 'one artwork'} because they sell the same physical pack.</>}
        </div>
      </div>
      <table className="tbl tbl-markets">
        <thead><tr><th>Market</th><th>Languages on pack</th><th>Current approved</th><th>In progress</th><th>Dieline</th><th>Printer</th></tr></thead>
        <tbody>
          {regions.map(([region, ms]) => (
            <React.Fragment key={region}>
              <tr className="region-row"><td colSpan={6}>{region} <span>region · {ms.length} market{ms.length > 1 ? 's' : ''}</span></td></tr>
              {ms.map((m) => {
                const art = artworkOf(m);
                const ap = approvedOf(art);
                const pend = pendingOf(art);
                return (
                  <tr key={m.id} className="clickable" onClick={() => navigate(pathOf.entry(m))}>
                    <td><span className="cc">{m.country.code}</span> <A to={pathOf.entry(m)}>{m.country.name}</A>{art.marketIds.length > 1 && <> <span className="tshared big" title={`Shares one artwork with ${art.marketIds.filter((x) => x !== m.id).map((x) => COUNTRY[x].name).join(', ')}`}><Icon name="shared" size={12} /> {art.code}</span></>}</td>
                    <td className="wrap">{art.langs.map((l) => LANGS[l]).join(', ')}</td>
                    <td>{ap ? <><StatusPill status="approved" /> <b>v{ap.n}</b> · {fmtDate(ap.approvedAt)}</> : <span className="muted">none</span>}</td>
                    <td>{pend.length ? <><StatusPill status={pend[pend.length - 1].status} /> v{pend[pend.length - 1].n}</> : <span className="muted">—</span>}</td>
                    <td className="mono">{m.dielineId}</td>
                    <td title={`${PRINTERS[m.printerId].name}, ${PRINTERS[m.printerId].city}`}>{PRINTERS[m.printerId].name.replace(/ (S\.A\.|s\.r\.o\.|Kft\.|GmbH|B\.V\.|AB|Ltd|S\.p\.A\.|S\.L\.|S\.R\.L\.|UAB)$/, '').replace(/^(Tiskárna|Drukkerij|Imprimerie du|Grafiche) /, '')}</td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {fmt.archived.length > 0 && (
        <section className={`archive ${focus === 'archive' ? 'is-focus' : ''}`} ref={archRef}>
          <h2>Archived artworks</h2>
          {fmt.archived.map((a) => (
            <div key={a.file} className="archive-item">
              <Icon name="file" size={22} />
              <div className="ai-body">
                <div className="ai-top"><FileName file={a.file} /> <StatusPill status="archived" /></div>
                <div className="ai-label">{a.label} · archived {fmtDate(a.archivedAt)} · {a.sizeMb} MB</div>
                <p>{a.note}</p>
                <div className="ai-now">Now replaced by:{' '}
                  {a.covered.map((cid) => {
                    const m = fmt.markets.find((x) => x.id === cid)!;
                    return <A key={cid} to={pathOf.entry(m)} className="chip chip-link"><span className="cc">{m.country.code}</span>{m.country.name}</A>;
                  })}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
      <div className="siblings-foot">
        Other pack formats of {fmt.brand.name} {fmt.line.name}:{' '}
        {fmt.line.formats.filter((f) => f !== fmt).map((f) => <A key={f.id} to={pathOf.format(f)} className="chip chip-link">{f.name}</A>)}
      </div>
    </div>
  );
}

// ───────────── Market entry ─────────────
function SiblingStrip({ ent }: { ent: MarketEntry }) {
  const art = artworkOf(ent);
  return (
    <div className="sibstrip" aria-label="Other markets for this pack format">
      <div className="sibstrip-label">Other markets, same format</div>
      <div className="sibstrip-groups">
        {groupByRegion(ent.format.markets).map(([region, ms]) => (
          <div key={region} className={`sibgroup ${region === ent.country.region ? 'is-here' : ''}`}>
            <div className="sibgroup-label">{region}</div>
            <div className="sibgroup-items">
              {ms.map((m) => {
                const a = artworkOf(m);
                const pend = pendingOf(a).length > 0;
                const linked = a.id === art.id && m.id !== ent.id;
                return (
                  <A key={m.id} to={pathOf.entry(m)} className={`sib ${m.id === ent.id ? 'is-current' : ''} ${linked ? 'is-linked' : ''}`} title={`${m.country.name}${a.marketIds.length > 1 ? ` — shared artwork ${a.code}` : ''}${pend ? ' — new version in review' : ''}`}>
                    <span className="cc">{m.country.code}</span>{m.country.name}
                    {a.marketIds.length > 1 && <Icon name="shared" size={11} />}
                    {pend && <span className="tdot amber" />}
                  </A>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EntryPage({ ent }: { ent: MarketEntry }) {
  const art = artworkOf(ent);
  const ap = approvedOf(art);
  const pend = pendingOf(art);
  const dl = DIELINES[ent.dielineId];
  const dlUsers = DIELINE_USAGE[ent.dielineId] || [];
  const regs = regBlocksFor(ent);
  const pr = PRINTERS[ent.printerId];
  const others = art.marketIds.filter((x) => x !== ent.id).map((x) => ent.format.markets.find((m) => m.id === x)!);
  const [showOld, setShowOld] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const { packs } = useStore();
  const myPacks = packs.filter((p) => p.entryRoute === pathOf.entry(ent));
  const versions = [...art.versions].reverse();
  const visible = showOld ? versions : versions.filter((v, i) => v.status !== 'superseded' || i < 3 || versions[i - 1]?.status === 'approved');
  const reviewer = reviewerByShort(ap?.approvedBy);

  return (
    <div className="page page-entry">
      <header className="page-head with-actions">
        <div>
          <div className="eyebrow">Level 4 · Market entry · {ent.country.region} region</div>
          <h1><span className="cc big">{ent.country.code}</span>{ent.country.name}</h1>
          <p className="sub">{ent.brand.name} {ent.line.name} · {ent.format.name} · SKU <span className="mono">{ent.sku}</span> · ERP {ent.erp} · on pack: {art.langs.map((l) => LANGS[l]).join(' + ')}</p>
        </div>
        <div className="actions">
          <PinButton route={pathOf.entry(ent)} />
          <CopyButton text={`${location.origin}${location.pathname}#${pathOf.entry(ent)}`} label="Copy link" what="Link" />
          <button className="btn btn-primary" onClick={() => setPackOpen(true)} disabled={!ap}><Icon name="send" size={15} /> Prepare printer pack</button>
        </div>
      </header>

      <SiblingStrip ent={ent} />

      {others.length > 0 && (
        <div className="callout callout-shared">
          <Icon name="shared" size={18} />
          <div>
            <b>Shared artwork.</b> {[ent, ...others].map((m) => m.country.name).join(' and ')} sell the same physical pack, so this entry uses the shared {art.label} artwork <span className="mono">{art.code}</span> (one EAN, {art.langs.map((l) => LANGS[l]).join(' + ')} text). A new version or approval here applies to {others.map((m) => m.country.name).join(', ')} too.
            {' '}{others.map((m) => <A key={m.id} to={pathOf.entry(m)} className="inline-link">Open {m.country.name} entry →</A>)}
          </div>
        </div>
      )}

      <div className="entry-grid">
        <div className="entry-main">
          {ap ? (
            <section className="card card-approved">
              <div className="card-head">
                <h2>Current approved artwork</h2>
                <StatusPill status="approved" big current />
              </div>
              <div className="approved-body">
                <div className="approved-art">
                  <figure><PackArt brand={ent.brand} line={ent.line} format={ent.format} art={art} version={ap} width={124} /><figcaption>Front</figcaption></figure>
                  <figure><PackArt brand={ent.brand} line={ent.line} format={ent.format} art={art} version={ap} side="back" width={124} /><figcaption>Back</figcaption></figure>
                </div>
                <div className="approved-meta">
                  <div className="vbig">v{ap.n}</div>
                  <FileName file={ap.file} big />
                  <dl className="kv">
                    <dt>Approved</dt><dd>{fmtDate(ap.approvedAt)} <span className="muted">({daysBetween(ap.approvedAt!, TODAY)} days ago)</span></dd>
                    <dt>Approved by</dt><dd>{reviewer ? <>{reviewer.short} <span className="muted">· {reviewer.role}, {reviewer.scope}</span></> : ap.approvedBy}</dd>
                    <dt>Change</dt><dd>{ap.summary}</dd>
                    <dt>File</dt><dd>PDF/X-4 · {ap.pages} pages · {ap.sizeMb} MB</dd>
                    <dt>Dieline</dt><dd className="mono">{ent.dielineId} rev {dl.rev}</dd>
                  </dl>
                  <div className="btn-row">
                    <DownloadButton file={ap.file} size={ap.sizeMb} />
                    <A to={pathOf.version(ent, ap.n)} className="btn btn-ghost">Version details</A>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="card"><h2>No approved artwork</h2><p className="muted">This market entry has no approved version yet. Nothing can be sent to print.</p></section>
          )}

          {pend.map((p) => (
            <div key={p.n} className={`callout ${p.status === 'draft' ? 'callout-draft' : 'callout-review'}`}>
              <Icon name="warn" size={18} />
              <div>
                <b>v{p.n} is {p.status === 'draft' ? 'a draft' : 'in review'} — not approved for print.</b> {p.summary}. Uploaded {fmtDate(p.uploaded)} by {p.uploadedBy}.
                {p.trail.find((s) => s.state === 'pending') && <> Waiting on {p.trail.find((s) => s.state === 'pending')!.who.split(' (')[0]} ({p.trail.find((s) => s.state === 'pending')!.step.toLowerCase()}{p.trail.find((s) => s.state === 'pending')!.note ? '; ' + p.trail.find((s) => s.state === 'pending')!.note : ''}).</>}
                {' '}<A to={pathOf.version(ent, p.n)} className="inline-link">See v{p.n} and what changed →</A>
              </div>
            </div>
          ))}

          <section className="card">
            <div className="card-head"><h2>Version history</h2><span className="muted">{art.versions.length} versions · newest first</span></div>
            <table className="tbl tbl-versions">
              <thead><tr><th>Version</th><th>Status</th><th>File</th><th>Change</th><th>Date</th></tr></thead>
              <tbody>
                {visible.map((v) => (
                  <tr key={v.n} className={`clickable st-${v.status}`} onClick={() => navigate(pathOf.version(ent, v.n))}>
                    <td className="vcell"><A to={pathOf.version(ent, v.n)}>v{v.n}</A></td>
                    <td><StatusPill status={v.status} current={v.status === 'approved'} /></td>
                    <td><span className="mono small">{v.file}</span></td>
                    <td>{v.summary}</td>
                    <td className="nowrap">{v.status === 'approved' ? `Approved ${fmtDate(v.approvedAt)}` : v.status === 'superseded' ? `Replaced ${fmtDate(v.supersededAt)} by v${v.supersededBy}` : `Uploaded ${fmtDate(v.uploaded)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length < versions.length && <button className="btn btn-link" onClick={() => setShowOld(true)}>Show {versions.length - visible.length} older superseded version{versions.length - visible.length > 1 ? 's' : ''}</button>}
          </section>

          {myPacks.length > 0 && (
            <section className="card">
              <div className="card-head"><h2>Printer packs sent from this entry</h2></div>
              {myPacks.map((p) => (
                <div key={p.id} className="pack-row">
                  <Icon name="send" size={16} />
                  <div><b>{PRINTERS[p.printerId].name}</b> · today {p.time} · v{p.version} + {p.items.length - 1} linked file{p.items.length > 2 ? 's' : ''}<div className="mono small">{p.link}</div></div>
                  <CopyButton text={p.link} label="Copy link" what="Printer pack link" />
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="entry-side">
          <div className="side-title">Linked to this market entry</div>
          <section className="card link-card">
            <div className="lc-head"><Icon name="dieline" size={16} /> Dieline <span className="lc-where">Dieline library</span></div>
            <A to={`/dielines/${dl.id}`} className="lc-main">
              <div className="lc-thumb"><DielineDrawing d={dl} width={110} /></div>
              <div>
                <div className="mono lc-id">{dl.id} <span className="muted">rev {dl.rev}</span></div>
                <div className="lc-sub">{dl.title} · {dl.w} × {dl.h} mm{dl.d ? ` · gusset ${dl.d}` : ''}</div>
                <div className="lc-sub">Shared across {dlUsers.length} market entr{dlUsers.length === 1 ? 'y' : 'ies'}: {dlUsers.map((m) => m.country.code).join(', ')}</div>
              </div>
            </A>
          </section>

          <section className="card link-card">
            <div className="lc-head"><Icon name="reg" size={16} /> Regulatory text <span className="lc-where">Regulatory library</span></div>
            {regs.map((r) => (
              <A key={r.id} to={`/reg/${r.country.id}/${r.id}`} className="lc-row">
                <span className="lang">{r.lang.toUpperCase()}</span>
                <div>
                  <div><b>{LANGS[r.lang]}</b> ingredient & nutrition panel{r.country.id !== ent.country.id && <span className="muted"> · from {r.country.name}</span>}</div>
                  <div className="lc-sub mono">{r.id} · rev {r.rev} · {r.status === 'approved' ? `approved ${fmtDate(r.approvedAt)}` : 'in review'}</div>
                </div>
                <Icon name="chevR" size={14} />
              </A>
            ))}
          </section>

          <section className="card link-card">
            <div className="lc-head"><Icon name="barcode" size={16} /> Barcode spec</div>
            <div className="bc-wrap">
              <svg viewBox="0 0 120 60" width="150"><Barcode ean={art.ean} x={4} y={4} w={112} h={46} /></svg>
              <div>
                <div className="mono">{art.ean}</div>
                <div className="lc-sub">EAN-13{art.marketIds.length > 1 ? ` · shared by ${art.marketIds.map((x) => x.toUpperCase()).join('+')}` : ''}</div>
                <CopyButton text={art.ean} label="Copy EAN" what="EAN" />
              </div>
            </div>
            <dl className="kv kv-tight">
              <dt>Size</dt><dd>80 % · 29.83 × 20.74 mm</dd>
              <dt>BWR</dt><dd>0.025 mm</dd>
              <dt>Colour</dt><dd>100 K on white knock-out</dd>
              <dt>Position</dt><dd>Back panel, lower right, ≥ 8 mm from seal</dd>
            </dl>
          </section>

          <section className="card link-card">
            <div className="lc-head"><Icon name="printer" size={16} /> Printer</div>
            <div className="pr-name">{pr.name} <span className="muted">· {pr.city}</span></div>
            <div className="pr-contact">{pr.contact}, {pr.role}</div>
            <div className="pr-line"><a href={`mailto:${pr.email}`}>{pr.email}</a> <CopyButton text={pr.email} label="" what="Email address" /></div>
            <div className="pr-line">{pr.phone}</div>
            <div className="lc-sub">{pr.address}</div>
            <div className="lc-sub">Accepts {pr.accepts}</div>
          </section>
        </aside>
      </div>
      {packOpen && ap && <PrinterPackModal ent={ent} version={ap} onClose={() => setPackOpen(false)} />}
    </div>
  );
}

function DownloadButton({ file, size, warn }: { file: string; size: number; warn?: string }) {
  const { toast } = useStore();
  return (
    <button className={`btn ${warn ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toast(warn ? `${file} downloading — ${warn}` : `Downloading ${file} (${size} MB)`, warn ? 'warn' : 'ok')}>
      <Icon name="download" size={15} /> {warn ? 'Download (not for print)' : 'Download PDF'}
    </button>
  );
}

// ───────────── Printer pack modal ─────────────
function PrinterPackModal({ ent, version, onClose }: { ent: MarketEntry; version: Version; onClose: () => void }) {
  const art = artworkOf(ent);
  const pr = PRINTERS[ent.printerId];
  const dl = DIELINES[ent.dielineId];
  const regs = regBlocksFor(ent);
  const pend = pendingOf(art);
  const { addPack, toast } = useStore();
  const [inc, setInc] = useState({ dieline: true, barcode: true, reg: false });
  const [days, setDays] = useState('14');
  const first = pr.contact.split(' ')[0];
  const [msg, setMsg] = useState(
    `Hi ${first},\n\nHere is the current approved artwork for ${ent.brand.name} ${ent.line.name} ${ent.format.name} — ${ent.country.name}: ${version.file} (v${version.n}, approved ${fmtDate(version.approvedAt)}), with dieline ${dl.id} rev ${dl.rev}.\n\nPlease confirm receipt and send the colour proof back through Packroom.\n\nThanks,\nMarisol`,
  );
  const [done, setDone] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  const create = () => {
    const code = `${ent.format.code}-${ent.country.code}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const link = `https://packroom.northvale.com/p/${code}`;
    const items = [version.file, ...(inc.dieline ? [`${dl.id} rev ${dl.rev}`] : []), ...(inc.barcode ? ['Barcode spec'] : []), ...(inc.reg ? regs.map((r) => r.id) : [])];
    addPack({ id: code, entryRoute: pathOf.entry(ent), printerId: pr.id, version: version.n, items, created: TODAY, time: '10:58', link, note: msg });
    setDone(link);
    toast(`Printer pack link created for ${pr.name}`, 'ok');
  };
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pp-title" tabIndex={-1} ref={dialogRef}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">Printer pack</div>
            <h2 id="pp-title">{ent.country.name} · {ent.brand.name} {ent.line.name} {ent.format.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        {!done ? (
          <>
            <div className="modal-body">
              <div className="pp-to"><Icon name="printer" size={16} /><span>To <b>{pr.contact}</b>, {pr.name}, {pr.city} · {pr.email}</span></div>
              <div className="pp-items">
                <label className="pp-item locked">
                  <input type="checkbox" checked readOnly disabled />
                  <div>
                    <div><b>Artwork</b> <FileName file={version.file} /> <StatusPill status="approved" /></div>
                    <div className="lc-sub">Approved {fmtDate(version.approvedAt)} by {version.approvedBy}. Only the current approved version can be sent.</div>
                    {pend.length > 0 && <div className="pp-excluded"><Icon name="warn" size={13} /> v{pend[pend.length - 1].n} ({pend[pend.length - 1].status === 'draft' ? 'draft' : 'in review'}) is excluded — it is not approved for print.</div>}
                  </div>
                </label>
                <label className="pp-item">
                  <input type="checkbox" checked={inc.dieline} onChange={(e) => setInc({ ...inc, dieline: e.target.checked })} />
                  <div><b>Dieline</b> <span className="mono">{dl.id} rev {dl.rev}</span><div className="lc-sub">{dl.title} · {dl.w} × {dl.h} mm · PDF + CF2</div></div>
                </label>
                <label className="pp-item">
                  <input type="checkbox" checked={inc.barcode} onChange={(e) => setInc({ ...inc, barcode: e.target.checked })} />
                  <div><b>Barcode specification</b> <span className="mono">{art.ean}</span><div className="lc-sub">EAN-13, 80 %, BWR 0.025 mm</div></div>
                </label>
                <label className="pp-item">
                  <input type="checkbox" checked={inc.reg} onChange={(e) => setInc({ ...inc, reg: e.target.checked })} />
                  <div><b>Regulatory text</b> {regs.map((r) => <span key={r.id} className="mono">{r.id} </span>)}<div className="lc-sub">Reference only — the text is already set on the artwork. Printers do not need it to print.</div></div>
                </label>
              </div>
              <label className="field">
                <span>Message</span>
                <textarea rows={7} value={msg} onChange={(e) => setMsg(e.target.value)} />
              </label>
              <label className="field field-inline">
                <span>Link expires after</span>
                <select value={days} onChange={(e) => setDays(e.target.value)}>
                  <option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option>
                </select>
              </label>
            </div>
            <div className="modal-foot">
              <span className="muted">Team rule: send printer packs as links, not email attachments.</span>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={create}><Icon name="link" size={15} /> Create printer pack link</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-body">
              <div className="pp-done"><Icon name="check" size={22} /><div><b>Printer pack ready.</b> Link valid for {days} days. It is logged on this market entry.</div></div>
              <div className="pp-link"><span className="mono">{done}</span><CopyButton text={done} label="Copy link" what="Printer pack link" /></div>
              <div className="lc-sub">Paste the link into your reply to {pr.contact}. The message above is attached to the pack page.</div>
            </div>
            <div className="modal-foot">
              <a className="btn btn-ghost" href={`mailto:${pr.email}?subject=${encodeURIComponent(`${ent.brand.name} ${ent.line.name} ${ent.format.name} – ${ent.country.name} – approved artwork v${version.n}`)}&body=${encodeURIComponent(msg + '\n\n' + done)}`}><Icon name="external" size={14} /> Open in email</a>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────── Version ─────────────
export function VersionPage({ ent, v }: { ent: MarketEntry; v: Version }) {
  const art = artworkOf(ent);
  const ap = approvedOf(art);
  const [compare, setCompare] = useState(false);
  const prev = art.versions.find((x) => x.n === v.n - 1);
  const next = art.versions.find((x) => x.n === v.n + 1);
  const replacedBy = v.supersededBy ? art.versions.find((x) => x.n === v.supersededBy) : undefined;
  const reviewer = reviewerByShort(v.approvedBy);
  const isCurrent = v.status === 'approved';
  const cmpTarget = isCurrent ? prev : ap;

  return (
    <div className="page">
      <header className="page-head with-actions">
        <div>
          <div className="eyebrow">Level 5 · Artwork version · {art.marketIds.map((x) => COUNTRY[x].name).join(' & ')}</div>
          <h1 className="h1-file"><FileName file={v.file} big /></h1>
          <p className="sub">{ent.brand.name} {ent.line.name} · {ent.format.name} · {art.label} artwork · version {v.n} of {art.versions.length}</p>
        </div>
        <div className="actions">
          <PinButton route={pathOf.version(ent, v.n)} />
          {prev && <A to={pathOf.version(ent, prev.n)} className="btn btn-ghost btn-sm">← v{prev.n}</A>}
          {next && <A to={pathOf.version(ent, next.n)} className="btn btn-ghost btn-sm">v{next.n} →</A>}
        </div>
      </header>

      {v.status === 'approved' && (
        <div className="banner banner-approved"><Icon name="check" size={20} /><div><b>Current approved artwork for {art.marketIds.map((x) => COUNTRY[x].name).join(' and ')}.</b> Approved {fmtDate(v.approvedAt)} by {reviewer?.short ?? v.approvedBy}{reviewer ? `, ${reviewer.role.toLowerCase()} for ${reviewer.scope}` : ''}. This is the version to send to print.</div></div>
      )}
      {v.status === 'in_review' && (
        <div className="banner banner-review"><Icon name="warn" size={20} /><div><b>In review — not approved for print.</b> {ap ? <>The current approved version is <A to={pathOf.version(ent, ap.n)}>v{ap.n}</A>, approved {fmtDate(ap.approvedAt)} by {ap.approvedBy}.</> : 'There is no approved version yet.'}</div>{ap && <A to={pathOf.version(ent, ap.n)} className="btn btn-sm btn-ghost">Go to v{ap.n}</A>}</div>
      )}
      {v.status === 'draft' && (
        <div className="banner banner-draft"><Icon name="info" size={20} /><div><b>Draft — not submitted for review.</b> {ap && <>Current approved version is <A to={pathOf.version(ent, ap.n)}>v{ap.n}</A>.</>}</div></div>
      )}
      {v.status === 'superseded' && (
        <div className="banner banner-superseded"><Icon name="warn" size={20} /><div><b>Superseded — do not send to print.</b> Replaced on {fmtDate(v.supersededAt)} by v{v.supersededBy}{replacedBy?.status === 'superseded' ? ' (itself since replaced)' : ''}. {ap && <>The current approved version is <A to={pathOf.version(ent, ap.n)}>v{ap.n}</A>.</>}</div>{ap && <A to={pathOf.version(ent, ap.n)} className="btn btn-sm btn-ghost">Go to current v{ap.n}</A>}</div>
      )}

      <div className="version-grid">
        <section className="card">
          <div className="card-head">
            <h2>{compare && cmpTarget ? `v${v.n} compared with v${cmpTarget.n}` : 'Preview'}</h2>
            {cmpTarget && (
              <label className="toggle">
                <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
                <span>Compare with {isCurrent ? `previous v${cmpTarget.n}` : `approved v${cmpTarget.n}`}</span>
              </label>
            )}
          </div>
          {compare && cmpTarget ? (
            <div className="compare">
              {[v, cmpTarget].map((x) => (
                <div key={x.n} className="cmp-col">
                  <div className="cmp-label">v{x.n} <StatusPill status={x.status} /></div>
                  <div className="cmp-arts">
                    <PackArt brand={ent.brand} line={ent.line} format={ent.format} art={art} version={x} width={118} />
                    <PackArt brand={ent.brand} line={ent.line} format={ent.format} art={art} version={x} side="back" width={118} />
                  </div>
                </div>
              ))}
              <div className="cmp-diff">
                <b>Differences recorded for v{Math.max(v.n, cmpTarget.n)}:</b>
                <ul>{(art.versions.find((x) => x.n === Math.max(v.n, cmpTarget.n))!.changes.length ? art.versions.find((x) => x.n === Math.max(v.n, cmpTarget.n))!.changes : [art.versions.find((x) => x.n === Math.max(v.n, cmpTarget.n))!.summary]).map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            </div>
          ) : (
            <div className="preview-pair">
              <figure><PackArt brand={ent.brand} line={ent.line} format={ent.format} art={art} version={v} width={230} /><figcaption>Front panel</figcaption></figure>
              <figure><PackArt brand={ent.brand} line={ent.line} format={ent.format} art={art} version={v} side="back" width={230} /><figcaption>Back panel{v.recycling === 'eu' ? ' · new EU sorting label outlined' : ''}</figcaption></figure>
            </div>
          )}
        </section>

        <aside className="version-side">
          <section className="card">
            <h3>Status</h3>
            <div className="vstatus"><StatusPill status={v.status} big current={isCurrent} /></div>
            <dl className="kv">
              <dt>Uploaded</dt><dd>{fmtDate(v.uploaded)} by {v.uploadedBy}</dd>
              {v.approvedAt && <><dt>Approved</dt><dd>{fmtDate(v.approvedAt)} by {v.approvedBy}</dd></>}
              {v.supersededAt && <><dt>Superseded</dt><dd>{fmtDate(v.supersededAt)} by v{v.supersededBy}</dd></>}
              <dt>File</dt><dd>PDF/X-4 · {v.pages} pages · {v.sizeMb} MB</dd>
              {v.regRev && <><dt>Regulatory text</dt><dd>rev {v.regRev}</dd></>}
            </dl>
            <div className="btn-row">
              {isCurrent ? <DownloadButton file={v.file} size={v.sizeMb} /> : <DownloadButton file={v.file} size={v.sizeMb} warn={v.status === 'superseded' ? 'superseded, do not send to print' : 'not approved, do not send to print'} />}
            </div>
          </section>
          <section className="card">
            <h3>What changed in v{v.n}</h3>
            <p className="vsummary">{v.summary}</p>
            {v.changes.length > 0 && <ul className="changes">{v.changes.map((c) => <li key={c}>{c}</li>)}</ul>}
          </section>
          <section className="card">
            <h3>Approval trail</h3>
            <ol className="trail">
              {v.trail.map((s) => (
                <li key={s.step} className={`ts-${s.state}`}>
                  <span className="ts-dot">{s.state === 'done' ? <Icon name="check" size={11} stroke={3} /> : null}</span>
                  <div>
                    <div className="ts-step">{s.step}</div>
                    <div className="ts-who">{s.who}</div>
                    <div className="ts-date">{s.state === 'done' ? fmtDate(s.date) : s.state === 'pending' ? `Pending${s.note ? ' · ' + s.note : ''}` : s.note || 'Not started'}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <A to={pathOf.entry(ent)} className="btn btn-ghost btn-block"><Icon name="arrowUp" size={14} /> Up to {ent.country.name} market entry</A>
        </aside>
      </div>
    </div>
  );
}
