import React, { useMemo, useState } from 'react';
import {
  DIELINES, DIELINE_USAGE, Dieline, REG_BLOCKS, REG_BY_COUNTRY, COUNTRIES, COUNTRY, LANGS, REGIONS, ASSETS, AssetKind, GUIDES, REVIEWERS,
  pathOf, findEntry, artworkOf, approvedOf, SHARED_GROUPS, BRANDS, CATEGORIES, TODAY, MarketEntry, reviewerFor,
} from './data';
import { COUNTRY_ADDRESS } from './regtext';
import { DielineDrawing, DielineLegend, AssetIcon } from './art';
import { Icon, A, CopyButton, PinButton, StatusPill, FileName, describeRoute, Empty } from './ui';
import { useStore } from './store';
import { navigate, splitRoute } from './router';
import { fmtDate, fold, relDay } from './util';
import { search, Result, ResultType, TYPE_LABEL } from './search';

// "You came from…" link back to the artwork being worked on.
export function ReturnBanner({ linked }: { linked?: MarketEntry[] }) {
  const { lastArtwork } = useStore();
  if (!lastArtwork) return null;
  const { segs } = splitRoute(lastArtwork);
  const ent = findEntry(segs[1], segs[2], segs[3], segs[4]);
  if (!ent) return null;
  const info = describeRoute(lastArtwork);
  const isLinked = linked?.some((m) => m === ent || artworkOf(m) === artworkOf(ent));
  return (
    <div className={`return-banner ${isLinked ? 'is-linked' : ''}`}>
      <Icon name="back" size={16} />
      <div>
        {isLinked ? <><b>Linked to the artwork you were working on:</b> </> : <>You came from </>}
        {info.title}
      </div>
      <A to={lastArtwork} className="btn btn-sm btn-primary">Back to {ent.country.name} artwork</A>
    </div>
  );
}

// ───────────── Dieline library ─────────────
const SHAPE_LABEL: Record<string, string> = { pouch: 'Stand-up pouch', pillow: 'Pillow bag', flowwrap: 'Flow-wrap', tablet: 'Tablet wrap', carton: 'Carton', tin: 'Tin', jar: 'Jar / bottle label', stick: 'Stick / roll', multipack: 'Multipack outer' };
export function DielinesPage({ query }: { query: URLSearchParams }) {
  const [q, setQ] = useState(query.get('q') || '');
  const [shape, setShape] = useState<string>('all');
  const [usedOnly, setUsedOnly] = useState(false);
  const all = Object.values(DIELINES);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    all.forEach((d) => (c[d.shape] = (c[d.shape] || 0) + 1));
    return c;
  }, [all]);
  const fq = fold(q.trim());
  const rows = all.filter((d) => (shape === 'all' || d.shape === shape) && (!usedOnly || (DIELINE_USAGE[d.id]?.length ?? 0) > 0) && (!fq || fold(`${d.id} ${d.title} ${d.material} ${d.supplier}`).includes(fq)));
  return (
    <div className="page">
      <ReturnBanner />
      <header className="page-head">
        <div className="eyebrow">Dieline library</div>
        <h1>Dielines</h1>
        <p className="sub">{all.length} dielines. IDs read <span className="mono">DL-</span> + format code + running number, e.g. <span className="mono">DL-P150-07</span> = 150 g pouch, dieline 7. One dieline can be shared by many market entries.</p>
      </header>
      <div className="filters">
        <input className="input" placeholder="Search ID, pack type, material, supplier…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dielines" />
        <div className="seg">
          <button className={shape === 'all' ? 'on' : ''} onClick={() => setShape('all')}>All <span>{all.length}</span></button>
          {Object.keys(SHAPE_LABEL).map((s) => <button key={s} className={shape === s ? 'on' : ''} onClick={() => setShape(s)}>{SHAPE_LABEL[s]} <span>{counts[s] || 0}</span></button>)}
        </div>
        <label className="toggle"><input type="checkbox" checked={usedOnly} onChange={(e) => setUsedOnly(e.target.checked)} /><span>In use only</span></label>
      </div>
      <div className="result-count">{rows.length} dieline{rows.length === 1 ? '' : 's'}</div>
      <table className="tbl">
        <thead><tr><th>ID</th><th>Pack type</th><th>Flat size (mm)</th><th>Rev</th><th>Updated</th><th className="num">Used by</th><th>Source</th></tr></thead>
        <tbody>
          {rows.slice(0, 200).map((d) => (
            <tr key={d.id} className="clickable" onClick={() => navigate(`/dielines/${d.id}`)}>
              <td className="mono"><A to={`/dielines/${d.id}`}>{d.id}</A></td>
              <td>{d.title}</td>
              <td className="mono">{d.w} × {d.h}{d.d ? ` · ${d.d}` : ''}</td>
              <td>{d.rev}</td>
              <td>{fmtDate(d.updated)}</td>
              <td className="num">{DIELINE_USAGE[d.id]?.length ?? 0}</td>
              <td className="muted">{d.supplier}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 200 && <div className="muted pad">Showing first 200 of {rows.length}. Narrow the search to see more.</div>}
      {rows.length === 0 && <Empty>No dieline matches. Try a format code such as <span className="mono">P150</span> or <span className="mono">W045</span>.</Empty>}
    </div>
  );
}

export function DielinePage({ d }: { d: Dieline }) {
  const used = DIELINE_USAGE[d.id] || [];
  const { toast } = useStore();
  const byFormat = new Map<string, MarketEntry[]>();
  used.forEach((m) => {
    const k = pathOf.format(m.format);
    byFormat.set(k, [...(byFormat.get(k) || []), m]);
  });
  return (
    <div className="page">
      <ReturnBanner linked={used} />
      <header className="page-head with-actions">
        <div>
          <div className="eyebrow"><A to="/dielines">Dieline library</A> › {SHAPE_LABEL[d.shape]}</div>
          <h1 className="mono">{d.id} <span className="rev">rev {d.rev}</span></h1>
          <p className="sub">{d.title} · flat {d.w} × {d.h} mm{d.d ? ` · gusset ${d.d} mm` : ''} · {d.material}</p>
        </div>
        <div className="actions">
          <PinButton route={`/dielines/${d.id}`} />
          <button className="btn btn-primary" onClick={() => toast(`Downloading ${d.id}_rev${d.rev}.pdf and .cf2`, 'ok')}><Icon name="download" size={15} /> Download PDF + CF2</button>
        </div>
      </header>
      <div className="dl-grid">
        <section className="card">
          <DielineDrawing d={d} width={640} />
          <DielineLegend />
        </section>
        <aside>
          <section className="card">
            <h3>Specification</h3>
            <dl className="kv">
              <dt>Flat size</dt><dd>{d.w} × {d.h} mm</dd>
              {d.d > 0 && <><dt>Gusset / depth</dt><dd>{d.d} mm</dd></>}
              <dt>Material</dt><dd>{d.material}</dd>
              <dt>Euro-hole</dt><dd>{d.eurohole ? 'Yes' : 'No'}</dd>
              <dt>Source</dt><dd>{d.supplier}</dd>
              <dt>Updated</dt><dd>{fmtDate(d.updated)}</dd>
            </dl>
            <p className="note">{d.notes}</p>
          </section>
          <section className="card">
            <h3>Revisions</h3>
            <ul className="revs">{d.revisions.map((r) => <li key={r.rev}><b>Rev {r.rev}</b> <span className="muted">{fmtDate(r.date)}</span><div>{r.note}</div></li>)}</ul>
          </section>
        </aside>
      </div>
      <section className="card">
        <div className="card-head"><h2>Used by {used.length} market entr{used.length === 1 ? 'y' : 'ies'}</h2><span className="muted">Changing this dieline affects every artwork below</span></div>
        {used.length === 0 && <p className="muted">Not used by any active market entry.</p>}
        {[...byFormat.entries()].map(([k, ms]) => (
          <div key={k} className="used-group">
            <A to={k} className="used-format">{ms[0].brand.name} {ms[0].line.name} · {ms[0].format.name}</A>
            <div className="used-list">
              {ms.map((m) => {
                const ap = approvedOf(artworkOf(m));
                return <A key={m.id} to={pathOf.entry(m)} className="chip chip-link"><span className="cc">{m.country.code}</span>{m.country.name}{ap && <span className="muted"> · v{ap.n}</span>}</A>;
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// ───────────── Regulatory text ─────────────
export function RegPage({ countryId, blockId }: { countryId?: string; blockId?: string }) {
  const c = countryId ? COUNTRY[countryId] : undefined;
  const block = blockId ? REG_BLOCKS[blockId] : undefined;
  const [q, setQ] = useState('');
  const list = c ? REG_BY_COUNTRY[c.id] || [] : [];
  const fq = fold(q.trim());
  const filtered = list.filter((b) => !fq || fold(`${b.id} ${b.brand.name} ${b.line.name} ${LANGS[b.lang]}`).includes(fq));
  return (
    <div className="page page-reg">
      <ReturnBanner linked={block?.entries} />
      <div className="reg-layout">
        <nav className="reg-countries" aria-label="Countries">
          <div className="side-title">By country</div>
          {REGIONS.map((r) => {
            const cs = COUNTRIES.filter((x) => x.region === r);
            return (
              <div key={r} className="rc-group">
                <div className="rc-region">{r}</div>
                {cs.map((x) => (
                  <A key={x.id} to={`/reg/${x.id}`} className={`rc-item ${x.id === countryId ? 'is-current' : ''}`}>
                    <span className="cc">{x.code}</span>{x.name}<span className="tcount">{REG_BY_COUNTRY[x.id]?.length ?? 0}</span>
                  </A>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="reg-main">
          {!c && (
            <>
              <header className="page-head">
                <div className="eyebrow">Regulatory text library</div>
                <h1>Regulatory text by country</h1>
                <p className="sub">Approved ingredient, allergen and nutrition text for each product line, per country and language. IDs read <span className="mono">RT-</span> + country + brand + line, e.g. <span className="mono">RT-PL-CW-PAP</span>. Multilingual countries add a language suffix.</p>
              </header>
              <div className="country-grid">
                {COUNTRIES.map((x) => <A key={x.id} to={`/reg/${x.id}`} className="country-card"><span className="cc big">{x.code}</span><div><b>{x.name}</b><div className="muted">{x.langs.map((l) => LANGS[l]).join(', ')} · {REG_BY_COUNTRY[x.id]?.length ?? 0} blocks</div></div></A>)}
              </div>
            </>
          )}
          {c && !block && (
            <>
              <header className="page-head">
                <div className="eyebrow"><A to="/reg">Regulatory text library</A> › {c.region}</div>
                <h1><span className="cc big">{c.code}</span>{c.name}</h1>
                <p className="sub">{list.length} text blocks · {c.langs.map((l) => LANGS[l]).join(', ')} · reviewer {reviewerFor(c.id).short} ({reviewerFor(c.id).scope})</p>
              </header>
              <input className="input" placeholder={`Filter ${c.name} blocks by brand, line or ID…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter regulatory text blocks" />
              <table className="tbl">
                <thead><tr><th>ID</th><th>Brand · product line</th><th>Language</th><th>Rev</th><th>Status</th><th>Approved</th></tr></thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="clickable" onClick={() => navigate(`/reg/${c.id}/${b.id}`)}>
                      <td className="mono"><A to={`/reg/${c.id}/${b.id}`}>{b.id}</A></td>
                      <td>{b.brand.name} {b.line.name}</td>
                      <td>{LANGS[b.lang]}</td>
                      <td>{b.rev}</td>
                      <td><StatusPill status={b.status} /></td>
                      <td>{fmtDate(b.approvedAt)} · {b.reviewer.short}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <Empty>No blocks match “{q}”.</Empty>}
            </>
          )}
          {block && <RegBlockView id={block.id} />}
        </div>
      </div>
    </div>
  );
}

function RegBlockView({ id }: { id: string }) {
  const b = REG_BLOCKS[id];
  const t = b.text;
  const addr = COUNTRY_ADDRESS[b.country.id];
  const plain = t
    ? `${t.denomination}\n\n${t.ingredientsLabel}: ${t.ingredients}\n${t.allergen}\n\n${t.nutritionTitle}\n${t.nutrition.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${t.storage}\n${t.addressLabel} ${addr}`
    : '';
  const formats = new Map<string, MarketEntry[]>();
  b.entries.forEach((m) => formats.set(pathOf.format(m.format), [...(formats.get(pathOf.format(m.format)) || []), m]));
  return (
    <>
      <header className="page-head with-actions">
        <div>
          <div className="eyebrow"><A to="/reg">Regulatory text library</A> › <A to={`/reg/${b.country.id}`}>{b.country.name}</A></div>
          <h1 className="mono">{b.id} <span className="rev">rev {b.rev}</span></h1>
          <p className="sub">{LANGS[b.lang]} ingredient, allergen & nutrition panel · {b.brand.name} {b.line.name} · {b.status === 'approved' ? `approved ${fmtDate(b.approvedAt)} by ${b.reviewer.short} (${b.reviewer.role}, ${b.reviewer.scope})` : 'in review'}</p>
        </div>
        <div className="actions">
          <PinButton route={`/reg/${b.country.id}/${b.id}`} />
          {t && <CopyButton text={plain} label="Copy all text" what={`${LANGS[b.lang]} panel text`} />}
        </div>
      </header>
      {t ? (
        <section className="card regtext" lang={b.lang}>
          <RegSection label="Legal name" text={t.denomination} />
          <RegSection label={t.ingredientsLabel} text={t.ingredients} />
          <RegSection label="Allergen advice" text={t.allergen} />
          <div className="rs">
            <div className="rs-head"><span>{t.nutritionTitle}</span><CopyButton text={t.nutrition.map(([k, v]) => `${k}: ${v}`).join('\n')} label="" what="Nutrition table" /></div>
            <table className="nutri">
              <tbody>{t.nutrition.map(([k, v]) => <tr key={k} className={/^(w tym|z toho|amelyből|davon|dont|di cui|waarvan|varav|josta|joista|heraf|of which)/.test(k) ? 'sub' : ''}><td>{k}</td><td>{v}</td></tr>)}</tbody>
            </table>
          </div>
          <RegSection label="Storage" text={t.storage} />
          <RegSection label="Producer / importer" text={`${t.addressLabel} ${addr}`} />
          <RegSection label="Net quantity" text="Set on artwork per pack format (e.g. 150 g ℮)" muted />
        </section>
      ) : (
        <section className="card regtext">
          <div className="callout callout-draft"><Icon name="info" size={16} /><div>The approved {LANGS[b.lang]} text for this block is held as an attached document (<span className="mono">{b.id}_rev{b.rev}.docx</span>). The English master it was translated from is shown below.</div></div>
          <RegSection label="Legal name (EN master)" text={b.master.denomination} />
          <RegSection label="Ingredients (EN master)" text={b.master.ingredients} />
          <RegSection label="Allergen advice (EN master)" text={b.master.allergen} />
          <RegSection label="Producer / importer" text={addr} />
        </section>
      )}
      <section className="card">
        <div className="card-head"><h2>Printed on {b.entries.length} market entr{b.entries.length === 1 ? 'y' : 'ies'}</h2></div>
        {[...formats.entries()].map(([k, ms]) => (
          <div key={k} className="used-group">
            <A to={k} className="used-format">{ms[0].format.name}</A>
            <div className="used-list">{ms.map((m) => <A key={m.id} to={pathOf.entry(m)} className="chip chip-link"><span className="cc">{m.country.code}</span>{m.country.name} · {m.format.name}</A>)}</div>
          </div>
        ))}
      </section>
    </>
  );
}
function RegSection({ label, text, muted }: { label: string; text: string; muted?: boolean }) {
  return (
    <div className="rs">
      <div className="rs-head"><span>{label}</span>{!muted && <CopyButton text={text} label="" what={label} />}</div>
      <p className={muted ? 'muted' : ''}>{text}</p>
    </div>
  );
}

// ───────────── Shared assets ─────────────
const KIND_LABEL: Record<AssetKind, string> = { logos: 'Logos', legal: 'Legal marks', recycling: 'Recycling icons' };
export function AssetsPage({ kind, id }: { kind?: string; id?: string }) {
  const k = (kind as AssetKind) || 'recycling';
  const [brand, setBrand] = useState('all');
  const list = ASSETS.filter((a) => a.kind === k && (k !== 'logos' || brand === 'all' || a.brandId === brand));
  const sel = ASSETS.find((a) => a.id === id);
  const { toast } = useStore();
  return (
    <div className="page">
      <ReturnBanner />
      <header className="page-head">
        <div className="eyebrow">Shared assets</div>
        <h1>{KIND_LABEL[k]}</h1>
        <p className="sub">Master files used across all brands. Always place from here — never copy marks out of an old artwork.</p>
      </header>
      <div className="tabs">
        {(Object.keys(KIND_LABEL) as AssetKind[]).map((x) => <A key={x} to={`/assets/${x}`} className={`tab ${x === k ? 'on' : ''}`}>{KIND_LABEL[x]} <span>{ASSETS.filter((a) => a.kind === x).length}</span></A>)}
        {k === 'logos' && (
          <select className="input input-sm" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand">
            <option value="all">All brands</option>
            {BRANDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>
      <div className="asset-layout">
        <div className="asset-grid">
          {list.map((a) => (
            <A key={a.id} to={`/assets/${k}/${a.id}`} className={`asset-card ${a.id === id ? 'is-current' : ''} ${a.status === 'withdrawn' ? 'is-withdrawn' : ''}`}>
              <AssetIcon icon={a.icon} brandId={a.brandId} size={88} />
              <div className="asset-name">{a.name}</div>
              <div className="asset-var">{a.variant}</div>
              {a.status !== 'current' && <StatusPill status={a.status} />}
            </A>
          ))}
        </div>
        {sel && (
          <aside className="card asset-detail">
            <div className="ad-icon"><AssetIcon icon={sel.icon} brandId={sel.brandId} size={160} /></div>
            <h2>{sel.name}</h2>
            <div className="muted">{sel.variant} · updated {fmtDate(sel.updated)}</div>
            {sel.status !== 'current' && <div style={{ margin: '8px 0' }}><StatusPill status={sel.status} /></div>}
            <p>{sel.usage}</p>
            <div className="btn-row">
              {sel.formats.map((f) => <button key={f} className="btn btn-ghost btn-sm" disabled={sel.status === 'withdrawn'} onClick={() => toast(`Downloading ${sel.id}.${f.toLowerCase()}`, 'ok')}><Icon name="download" size={13} /> {f}</button>)}
            </div>
            <PinButton route={`/assets/${k}/${sel.id}`} />
          </aside>
        )}
      </div>
    </div>
  );
}

// ───────────── Guidelines ─────────────
export function GuidePage({ id }: { id?: string }) {
  const g = GUIDES.find((x) => x.id === id);
  return (
    <div className="page">
      <ReturnBanner />
      <div className="guide-layout">
        <nav className="guide-nav" aria-label="Guidelines">
          <div className="side-title">Team guidelines</div>
          {GUIDES.map((x) => <A key={x.id} to={`/guide/${x.id}`} className={`gn-item ${x.id === id ? 'is-current' : ''}`}>{x.title}</A>)}
        </nav>
        <article className="guide">
          {!g ? (
            <>
              <h1>Team guidelines</h1>
              <p className="sub">How the snacks packaging team names, versions, approves and sends artwork. Start with the first two if you are new to the team.</p>
              <div className="guide-cards">{GUIDES.map((x) => <A key={x.id} to={`/guide/${x.id}`} className="guide-card"><b>{x.title}</b><p>{x.summary}</p><span className="muted">Updated {fmtDate(x.updated)} · {x.owner}</span></A>)}</div>
            </>
          ) : (
            <>
              <div className="eyebrow">Team guideline · updated {fmtDate(g.updated)} by {g.owner}</div>
              <h1>{g.title}</h1>
              <GuideBody id={g.id} />
            </>
          )}
        </article>
      </div>
    </div>
  );
}

function GuideBody({ id }: { id: string }) {
  if (id === 'structure')
    return (
      <>
        <p className="lead">Every pack lives at exactly one place in a five-level structure. The location bar at the top of brand pages always shows all five levels.</p>
        <ol className="levels">
          <li><b>Brand</b> — e.g. Crunchwell. 14 brands.</li>
          <li><b>Product line</b> — a recipe/flavour, e.g. Crunchwell Paprika.</li>
          <li><b>Pack format</b> — size and pack type, e.g. 150 g pouch. Dieline is chosen here.</li>
          <li><b>Market</b> — one entry per country the pack is sold in. Holds the barcode, printer, regulatory text links.</li>
          <li><b>Artwork version</b> — v1, v2, … of the artwork used by that market. Exactly one is approved at a time.</li>
        </ol>
        <h2>Regions are groupings, not folders</h2>
        <p>Markets are shown in region groups (Central Europe, DACH, Benelux, …) to make lists easier to scan. A region is not a level: Poland, Czechia, Slovakia and Hungary are siblings inside the same pack format. To move from Czechia to Poland, stay in the pack format and pick another market — use the <b>Market</b> switcher in the location bar or the “Same pack format, other markets” strip.</p>
        <h2>Linked items live in their own libraries</h2>
        <p>Dielines, regulatory text, logos and recycling marks are stored once and linked from market entries. Opening one takes you into its library; use the <b>Back to … artwork</b> button at the top to return.</p>
        <p><A to="/b/crunchwell/paprika/p150">See an example: Crunchwell Paprika 150 g pouch →</A></p>
      </>
    );
  if (id === 'naming') {
    const ex = ['CW_PAP_P150_PL_v4.pdf', 'CW_PAP_P150_CZSK_v7.pdf', 'CW_PAP_150_CE_FINAL.pdf'];
    return (
      <>
        <p className="lead">File names are generated by Packroom on upload: <span className="mono">BRAND_LINE_FORMAT_MARKET_vN.pdf</span>. Hover any part of a file name anywhere in Packroom to see what it means.</p>
        <table className="tbl tbl-compact">
          <thead><tr><th>Part</th><th>Example</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>Brand</td><td className="mono">CW</td><td>Two-letter brand code ({BRANDS.map((b) => `${b.code} ${b.name}`).slice(0, 5).join(', ')}, …)</td></tr>
            <tr><td>Line</td><td className="mono">PAP</td><td>Three-letter product line code, unique within the brand</td></tr>
            <tr><td>Format</td><td className="mono">P150</td><td>Pack type letter + size: B = bag, P = pouch, M = multipack, W = wrap, T = tablet, C = carton, N = tin, J = jar/bottle, S/R = stick/roll, K = biscuit pack</td></tr>
            <tr><td>Market</td><td className="mono">PL</td><td>ISO country code. Shared packs combine them: {SHARED_GROUPS.map((g) => g.code).join(', ')}</td></tr>
            <tr><td>Version</td><td className="mono">v4</td><td>Version number. Status is <b>not</b> in the name — check the status pill.</td></tr>
          </tbody>
        </table>
        <h2>Examples</h2>
        <ul className="examples">{ex.map((e) => <li key={e}><FileName file={e} /></li>)}</ul>
        <div className="callout callout-review"><Icon name="warn" size={16} /><div><b>Legacy names.</b> Before February 2024 files were named by hand, often by region with <span className="mono">_FINAL</span> (e.g. <span className="mono">CW_PAP_150_CE_FINAL.pdf</span>). These are archived. “FINAL” never meant approved — do not send them.</div></div>
      </>
    );
  }
  if (id === 'versions')
    return (
      <>
        <p className="lead">Each market entry has a single line of versions. Only one version is approved at any time.</p>
        <table className="tbl tbl-compact">
          <tbody>
            <tr><td><StatusPill status="draft" /></td><td>Uploaded, not yet submitted. Visible to the team only.</td></tr>
            <tr><td><StatusPill status="in_review" /></td><td>Waiting for brand, regulatory and prepress sign-off. <b>Never send to print.</b></td></tr>
            <tr><td><StatusPill status="approved" /></td><td>Signed off by the regional regulatory reviewer and prepress. The only status that can go to a printer.</td></tr>
            <tr><td><StatusPill status="superseded" /></td><td>Was approved, replaced by a newer approved version. Kept for audit.</td></tr>
            <tr><td><StatusPill status="archived" /></td><td>Legacy files from before the current structure. Reference only.</td></tr>
          </tbody>
        </table>
        <p>When a new version is approved the previous approved version becomes superseded automatically, on the same day.</p>
      </>
    );
  if (id === 'shared')
    return (
      <>
        <p className="lead">Some markets sell the same physical pack. They keep separate market entries (so you can find them under each country) but point to one shared artwork.</p>
        <ul>{SHARED_GROUPS.map((g) => <li key={g.code}><span className="mono">{g.code}</span> — {g.label}: {g.ids.map((x) => COUNTRY[x].name).join(', ')}</li>)}</ul>
        <p>A version uploaded or approved under one of these markets applies to all of them. Approval needs the reviewer for the first-listed market, who consults the others.</p>
        <p>Shared packs carry one EAN and the regulatory text of every sharing country.</p>
      </>
    );
  if (id === 'printers')
    return (
      <>
        <p className="lead">Use <b>Prepare printer pack</b> on the market entry. It always picks the current approved version and the linked dieline at the right revision.</p>
        <ul>
          <li>Never send an in-review or superseded version, even if a printer asks for “the latest”.</li>
          <li>Include the dieline. Printers check the artwork against it.</li>
          <li>Regulatory text is reference only — it is already set on the artwork.</li>
          <li>Links expire after 14 days by default. Do not email attachments.</li>
          <li>If a printer names a region (“Central Europe”), confirm which country — each country has its own artwork.</li>
        </ul>
      </>
    );
  return (
    <>
      <p className="lead">Regulatory reviewers approve artwork and regulatory text for their markets.</p>
      <table className="tbl tbl-compact">
        <thead><tr><th>Reviewer</th><th>Markets</th><th>Office</th><th>Email</th></tr></thead>
        <tbody>{Object.values(REVIEWERS).map((r) => <tr key={r.short}><td><b>{r.short}</b> <span className="muted">{r.full}</span></td><td>{r.scope}</td><td>{r.office}</td><td><a href={`mailto:${r.email}`}>{r.email}</a></td></tr>)}</tbody>
      </table>
    </>
  );
}

// ───────────── Recently viewed ─────────────
export function RecentPage() {
  const { recents } = useStore();
  const groups = new Map<string, typeof recents>();
  recents.forEach((r) => {
    const k = relDay(r.at, TODAY);
    groups.set(k, [...(groups.get(k) || []), r]);
  });
  return (
    <div className="page">
      <header className="page-head">
        <div className="eyebrow">Recently viewed</div>
        <h1>Recently viewed</h1>
        <p className="sub">{recents.length} items, newest first.</p>
      </header>
      {[...groups.entries()].map(([k, rs]) => (
        <section key={k} className="recent-group">
          <h3>{k}</h3>
          {rs.map((r) => {
            const info = describeRoute(r.route);
            return (
              <A key={r.route} to={r.route} className="recent-row">
                <Icon name={info.icon} size={16} />
                <span className="rr-time">{r.time}</span>
                <span className="rr-title">{info.title}</span>
                <span className="rr-sub">{info.sub}</span>
                {info.status && <StatusPill status={info.status} />}
                <span className="rr-kind">{info.kind}</span>
              </A>
            );
          })}
        </section>
      ))}
    </div>
  );
}

// ───────────── Search ─────────────
export function SearchPage({ q }: { q: string }) {
  const results = useMemo(() => search(q), [q]);
  const [type, setType] = useState<ResultType | 'all'>('all');
  const [showSup, setShowSup] = useState(false);
  const counts: Partial<Record<ResultType, number>> = {};
  results.forEach((r) => (counts[r.type] = (counts[r.type] || 0) + 1));
  const sup = results.filter((r) => r.superseded);
  const shown = results.filter((r) => (type === 'all' || r.type === type) && (showSup || !r.superseded));
  const groups = new Map<ResultType, Result[]>();
  shown.forEach((r) => groups.set(r.type, [...(groups.get(r.type) || []), r]));
  const order: ResultType[] = ['file', 'entry', 'product', 'regulatory', 'dieline', 'asset', 'guide'];
  return (
    <div className="page">
      <header className="page-head">
        <div className="eyebrow">Search</div>
        <h1>“{q}”</h1>
        <p className="sub">{results.length} result{results.length === 1 ? '' : 's'}{results.length >= 400 ? ' (first 400)' : ''}. Each result shows where it sits in the structure.</p>
      </header>
      <div className="seg seg-wrap">
        <button className={type === 'all' ? 'on' : ''} onClick={() => setType('all')}>All <span>{results.length}</span></button>
        {order.filter((t) => counts[t]).map((t) => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{TYPE_LABEL[t]} <span>{counts[t]}</span></button>)}
      </div>
      {sup.length > 0 && (
        <label className="toggle sup-toggle"><input type="checkbox" checked={showSup} onChange={(e) => setShowSup(e.target.checked)} /><span>Show {sup.length} superseded file{sup.length === 1 ? '' : 's'} (hidden by default — they must not go to print)</span></label>
      )}
      {order.filter((t) => groups.get(t)).map((t) => (
        <section key={t} className="sr-group">
          <h3>{TYPE_LABEL[t]} <span className="muted">{groups.get(t)!.length}</span></h3>
          {groups.get(t)!.slice(0, 60).map((r) => (
            <A key={r.route + r.title} to={r.route} className={`sr-row ${r.superseded ? 'is-sup' : ''}`}>
              <span className="sr-title">{r.mono && r.type === 'file' ? <FileName file={r.title} /> : <span className={r.mono ? 'mono' : ''}>{r.title}</span>}</span>
              {r.status && <StatusPill status={r.status} current={r.type === 'file' && r.status === 'approved'} />}
              <span className="sr-sub">{r.sub}</span>
            </A>
          ))}
          {groups.get(t)!.length > 60 && <div className="muted pad">{groups.get(t)!.length - 60} more — refine your search.</div>}
        </section>
      ))}
      {results.length === 0 && <Empty>Nothing matches “{q}”. Try a product (“paprika 150”), a country (“Poland”), a file name part (“CW_PAP”) or an ID (“DL-P150”).</Empty>}
    </div>
  );
}

export { CATEGORIES };
