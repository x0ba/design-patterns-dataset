'use client';

import { Button } from '@ui-sdk/react/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from '@ui-sdk/react/drawer';
import { Toggle, ToggleGroup } from '@ui-sdk/react/toggle';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { BBox, Instance } from '@/lib/data';
import { codebookHref, enc, plural, siteHref } from '@/lib/format';
import { DimList } from './dim-list';
import { useUrlState } from '@/lib/use-url-state';
import { Crop } from './crop';
import { Score } from './score';

export interface Kid { id: string; name: string; level: string; definition: string; deprecated: boolean; sites: number }
export interface DimDef { id: string; name: string; values: { id: string; name: string; description?: string }[] }

const PAGE = 48;

/**
 * The UI elements labeled under a codebook entry: for an archetype, its patterns
 * and components; for every entry, a gallery of labeled elements, each opening
 * a drawer with its label and the captured DOM elements inside its box.
 */
export function Instances({ entry, kids, instances, defs }: {
  entry: { id: string; name: string; level: string };
  kids: Kid[];
  instances: Instance[];
  defs: Record<string, { name: string; level: string; parent?: string; dims: DimDef[] }>;
}) {
  const params = useSearchParams();
  const [only, setOnly] = useUrlState('only', params.get('only') ?? '');
  const [sel, setSel] = useUrlState('el', params.get('el') ?? '');
  const [all, setAll] = useUrlState('all', params.get('all') ?? '');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of instances) c[i.pattern] = (c[i.pattern] ?? 0) + 1;
    return c;
  }, [instances]);
  const filter = only && (counts[only] || kids.some((k) => k.id === only)) ? only : '';
  const shown = instances.filter((i) => !filter || i.pattern === filter);
  const page = all ? shown : shown.slice(0, PAGE);
  const siteCount = new Set(shown.map((i) => `${i.site.batch}/${i.site.slug}`)).size;
  const selected = instances.find((i) => i.key === sel) ?? null;
  const patternIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  // The drawer is non-modal, so focus usually stays in the gallery; Escape closes it from anywhere.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(''); };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  }, [selected, setSel]);

  const kidGroup = (level: string, title: string) => {
    const xs = kids.filter((c) => c.level === level).sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name));
    if (!xs.length) return null;
    const mx = Math.max(1, ...xs.map((c) => counts[c.id] ?? 0));
    return (
      <div className="kids-group">
        <p className="kids-h small">{title} <span className="muted num">{xs.length}</span></p>
        <ul>
          {xs.map((c) => (
            <li key={c.id} className="kid">
              <Toggle className="kid-toggle" pressed={filter === c.id} onPressedChange={(p) => { setOnly(p ? c.id : ''); setAll(''); }}>
                <span className="kid-text">
                  <b>{c.name}</b> <span className="mono muted small">{c.id}</span>{c.deprecated ? <span className="chip">deprecated</span> : null}
                  <span className="small muted kid-def">{c.definition}</span>
                </span>
                <span className="usage" title={`${plural(counts[c.id] ?? 0, 'element')} on ${plural(c.sites, 'site')}`}>
                  <span className="usage-bar" aria-hidden="true"><b style={{ width: `${((counts[c.id] ?? 0) / mx) * 100}%` }} /></span>
                  <span className="num small">{counts[c.id] ?? 0}</span>
                </span>
              </Toggle>
              <Link className="small kid-open" href={codebookHref(c.id)}>Open<span className="sr-only"> {c.name}</span></Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      {kids.length ? (
        <section>
          <h3>UI Elements in This {entry.level[0].toUpperCase() + entry.level.slice(1)}</h3>
          <p className="small muted">Press one to show only its labeled instances below.</p>
          <div className="kids">{kidGroup('pattern', 'Patterns')}{kidGroup('component', 'Components')}</div>
        </section>
      ) : null}

      <section aria-labelledby="inst-h">
        <h3 id="inst-h">Labeled Instances <span className="h-note">{plural(shown.length, 'element')} on {plural(siteCount, 'site')}</span></h3>
        {kids.length && patternIds.length > 1 ? (
          <ToggleGroup className="filter-chips" aria-label="Show instances of" value={[filter || '__all']} onValueChange={(v) => { const x = v[0]; setOnly(!x || x === '__all' ? '' : x); setAll(''); }}>
            <Toggle value="__all" className="fchip">All <span className="num">{instances.length}</span></Toggle>
            {patternIds.map((k) => <Toggle key={k} value={k} className="fchip"><span className="mono">{k}</span> <span className="num">{counts[k]}</span></Toggle>)}
          </ToggleGroup>
        ) : null}
        {shown.length ? (
          <>
            <ul className="insts">
              {page.map((i) => (
                <li key={i.key}>
                  <button type="button" className="inst" aria-pressed={sel === i.key} onClick={() => setSel(sel === i.key ? '' : i.key)} aria-label={`${i.pattern} on ${i.site.title}`}>
                    <Crop shot={i.site} bbox={i.bbox} />
                    <span className="inst-meta">
                      <span className="inst-head">
                        <span className="mono inst-id">{i.pattern}</span>
                        {i.status === 'uncertain' ? <span className="chip chip-warn">uncertain</span> : null}
                        <span className="spacer" />
                        <Score value={i.confidence ?? 0} label="Confidence" size="sm" />
                      </span>
                      <span className="inst-site truncate">{i.site.title}</span>
                      <DimList dims={i.dims} max={3} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {shown.length > page.length ? (
              <p className="center"><Button className="button" onClick={() => setAll('1')}>Show All {shown.length}</Button></p>
            ) : null}
          </>
        ) : <p className="muted small">No labeled instances yet{filter ? <> of <span className="mono">{filter}</span></> : null}. They appear here once a site’s consensus includes {filter ? 'it' : 'this entry'}.</p>}
      </section>

      <Drawer open={!!selected} onOpenChange={(open) => { if (!open) setSel(''); }} side="right" modal={false}>
        <DrawerContent className="drawer" initialFocus="none">
          {selected ? <ElementDetail i={selected} def={defs[selected.pattern]} /> : null}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function ElementDetail({ i, def }: { i: Instance; def?: { name: string; level: string; parent?: string; dims: DimDef[] } }) {
  const [hl, setHl] = useState<BBox | null>(null);
  const b = i.bbox;
  const known = new Set(def?.dims.map((d) => d.id));
  const extra = Object.entries(i.dims).filter(([k]) => !known.has(k));
  return (
    <>
      <div className="drawer-bar">
        <p className="small muted">
          {def?.level}{def?.parent ? <> in <Link href={codebookHref(def.parent)} className="mono">{def.parent}</Link></> : null}
        </p>
        <DrawerClose className="icon-button" aria-label="Close details">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" /></svg>
        </DrawerClose>
      </div>
      <DrawerTitle className="drawer-title">
        <Link href={codebookHref(i.pattern)}>{def?.name ?? i.pattern}</Link> <span className="mono muted small">{i.pattern}</span>
      </DrawerTitle>
      <p className="small"><Link href={siteHref(i.site.batch, i.site.slug)}>{i.site.title}</Link></p>
      <p className="small muted">
        <span className="mono">{i.site.batch}</span>, {i.site.domain ?? 'unknown domain'}
        {i.site.archetype ? <>, generated for <Link href={codebookHref(i.site.archetype)} className="mono">{i.site.archetype}</Link></> : null}
      </p>
      <div className="drawer-shot">
        <Crop shot={i.site} bbox={b} size="lg">
          {hl ? <rect className="crop-hl" x={hl.x} y={hl.y} width={hl.width} height={hl.height} /> : null}
        </Crop>
      </div>

      <h3>Label</h3>
      <dl className="kv">
        <dt>Status</dt><dd>{i.status}</dd>
        <dt>Confidence</dt><dd><Score value={i.confidence ?? 0} label="Confidence" size="sm" /></dd>
        {i.support !== undefined ? <><dt>Raters agreeing</dt><dd className="num">{i.support}/{i.raters}</dd></> : null}
        <dt>Box</dt><dd className="mono">{b ? `x ${Math.round(b.x)}, y ${Math.round(b.y)}, ${Math.round(b.width)} × ${Math.round(b.height)} px` : '—'}</dd>
        {i.rationale ? <><dt>Rationale</dt><dd>{i.rationale}</dd></> : null}
      </dl>

      {def?.dims.length || extra.length ? (
        <>
          <h3>Dimensions</h3>
          <dl className="kv">
            {def?.dims.map((s) => {
              const raw = i.dims[s.id];
              const vals = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
              return (
                <div key={s.id} className="kv-row">
                  <dt title={s.id}>{s.name}</dt>
                  <dd>
                    {vals.length ? vals.map((v) => {
                      const vd = s.values.find((x) => x.id === v);
                      return <span key={v} className="chip chip-sans" title={vd?.description ?? ''}>{vd?.name ?? v}</span>;
                    }) : <span className="muted">—</span>}
                    {i.ties.includes(s.id) ? <span className="small warn-text"> No majority</span> : null}
                  </dd>
                </div>
              );
            })}
            {extra.map(([k, v]) => <div key={k} className="kv-row"><dt className="mono">{k}</dt><dd className="mono">{Array.isArray(v) ? v.join(', ') : v}</dd></div>)}
          </dl>
        </>
      ) : null}

      <h3>Evidence <span className="h-note">{i.evidence.length}</span></h3>
      {i.evidence.length ? (
        <ul className="evidence">
          {i.evidence.map((ev, n) => (
            <li key={n}>
              <p className="small">
                <span className="mono">{ev.rater}</span>
                {ev.region ? <> in <span className="mono">{ev.region}</span>{ev.regionLabel ? <span className="muted">, {ev.regionLabel}</span> : null}</> : null}
              </p>
              {ev.quote ? <q>{ev.quote}</q> : null}
              {ev.note ? <p className="small">{ev.note}</p> : null}
            </li>
          ))}
        </ul>
      ) : <p className="muted small">None.</p>}

      <h3>Captured Elements</h3>
      {b ? <CapturedElements i={i} box={b} onHighlight={setHl} /> : <p className="small muted">No box to match elements against.</p>}
    </>
  );
}

interface Captured { tag: string; kind?: string; role?: string; name?: string; text?: string; depth?: number; bbox?: BBox; style?: { bg?: string; color?: string; size?: number; weight?: number; radius?: string; font?: string } }

const elementsCache = new Map<string, Promise<Captured[]>>();
function siteElements(batch: string, slug: string) {
  const k = `${batch}/${slug}`;
  if (!elementsCache.has(k)) {
    elementsCache.set(k, fetch(`/files/dataset/${enc(batch)}/sites/${enc(slug)}/capture/elements.json`)
      .then((r) => { if (!r.ok) throw new Error(r.status === 404 ? 'This capture has no elements.json' : r.statusText); return r.json(); })
      .catch((e) => { elementsCache.delete(k); throw e; }));
  }
  return elementsCache.get(k)!;
}

const LIMIT = 150;

/** Captured DOM elements inside the instance's box, as an indented tree with their key styles. */
function CapturedElements({ i, box, onHighlight }: { i: Instance; box: BBox; onHighlight: (b: BBox | null) => void }) {
  const [els, setEls] = useState<Captured[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setEls(null);
    setErr(null);
    siteElements(i.site.batch, i.site.slug).then((x) => live && setEls(x), (e) => live && setErr(e.message));
    return () => { live = false; };
  }, [i.site.batch, i.site.slug]);

  if (err) return <p className="small err">Couldn’t load captured elements. {err}.</p>;
  if (!els) return <p className="small muted" aria-busy="true">Loading elements…</p>;
  const t = 4;
  const inside = els.filter((e) => e.bbox && e.bbox.width > 0 && e.bbox.height > 0
    && e.bbox.x >= box.x - t && e.bbox.y >= box.y - t && e.bbox.x + e.bbox.width <= box.x + box.width + t && e.bbox.y + e.bbox.height <= box.y + box.height + t);
  if (!inside.length) return <p className="small muted">No indexed elements inside this box.</p>;
  const minDepth = Math.min(...inside.map((e) => e.depth ?? 0));
  const sw = (c?: string) => (c ? <span className="swatch swatch-xs" style={{ background: c }} title={c} /> : null);
  return (
    <>
      <p className="small muted">{plural(inside.length, 'indexed landmark, heading, control and media element')} inside the box. Hover a row to find it in the crop.</p>
      <div className="table-scroll">
        <table className="els" onMouseLeave={() => onHighlight(null)}>
          <thead><tr><th>Element</th><th>Text</th><th>Style</th></tr></thead>
          <tbody>
            {inside.slice(0, LIMIT).map((e, n) => {
              const s = e.style ?? {};
              return (
                <tr key={n} onMouseEnter={() => onHighlight(e.bbox ?? null)}>
                  <td className="mono" style={{ paddingInlineStart: 8 + ((e.depth ?? 0) - minDepth) * 10 }}>{e.tag}<div className="muted">{e.kind}{e.role ? `, ${e.role}` : ''}</div></td>
                  <td>{e.name && e.name !== e.text ? <><b>{e.name}</b><br /></> : null}{e.text}</td>
                  <td className="mono nowrap">
                    {sw(s.bg)}{sw(s.color)} {s.size ? `${s.size} px` : ''}{s.weight && s.weight !== 400 ? ` w${s.weight}` : ''}
                    {s.radius ? <div className="muted">r {s.radius}</div> : null}
                    {s.font ? <div className="muted els-font" title={s.font}>{s.font}</div> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {inside.length > LIMIT ? <p className="small muted">{inside.length - LIMIT} more not shown.</p> : null}
    </>
  );
}
