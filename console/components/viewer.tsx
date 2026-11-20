'use client';

import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control';
import { Toggle, ToggleGroup } from '@ui-sdk/react/toggle';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { BBox, Evidence, Label, SiteDetail } from '@/lib/data';
import { codebookHref, dimText, fmt, plural } from '@/lib/format';
import { useUrlState } from '@/lib/use-url-state';
import { DimList } from './dim-list';
import { Score } from './score';

interface ViewPattern { id: string; status: string; confidence: number; support?: number; raters?: number; dims?: Record<string, string | string[]>; ties?: string[]; rationale?: string; evidence: Evidence[] }
interface ViewRegion { id: string; role?: string; label?: string; bbox: BBox; patterns: string[] }
interface View {
  regions: ViewRegion[];
  patterns: ViewPattern[];
  aesthetics: Record<string, any>;
  structure: { layout?: string; density?: string };
  consensus: boolean;
  label?: Label;
}

interface Box { k: string; kind: 'r' | 'p'; id: string; i: number; bbox: BBox }

const DEFAULT_SHOW = 'regions,patterns';

function viewOf(d: SiteDetail, source: string): View | null {
  if (source === 'consensus' && d.consensus) {
    const c = d.consensus;
    const ref = Object.values(d.labels)[0];
    return {
      regions: ref?.regions ?? [],
      patterns: c.patterns.filter((p) => p.status !== 'absent').map((p) => ({ ...p, evidence: p.evidence ?? [] })),
      aesthetics: Object.fromEntries(Object.entries(c.aesthetics).map(([k, v]) => [k, v.value])),
      structure: { density: c.structure.density.value },
      consensus: true,
    };
  }
  const l = d.labels[source];
  if (!l) return null;
  return { regions: l.regions, patterns: l.patterns, aesthetics: l.aesthetics, structure: l.structure, consensus: false, label: l };
}

export function Viewer({ d, levels }: { d: SiteDetail; levels: Record<string, string> }) {
  const params = useSearchParams();
  const sources = [...(d.consensus ? ['consensus'] : []), ...Object.keys(d.labels)];
  const [src, setSrc] = useUrlState('source', params.get('source') ?? '');
  const source = sources.includes(src) ? src : sources[0];
  const [showParam, setShowParam] = useUrlState('show', params.get('show') ?? '');
  const show = (showParam || DEFAULT_SHOW).split(',').filter((x) => x && x !== 'none');
  const v = source ? viewOf(d, source) : null;

  const W: number = d.meta?.screenshot?.width ?? 1;
  const H: number = d.meta?.screenshot?.height ?? 1;
  const [hot, setHot] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; box: Box } | null>(null);
  const shot = useRef<HTMLDivElement>(null);

  const boxes = useMemo(() => {
    const out: Box[] = [];
    if (!v) return out;
    if (show.includes('regions')) for (const r of v.regions) out.push({ k: `r:${r.id}`, kind: 'r', id: r.id, i: 0, bbox: r.bbox });
    if (show.includes('patterns')) {
      for (const p of v.patterns) {
        if (p.status === 'absent') continue;
        p.evidence.forEach((e, i) => { if (e.bbox) out.push({ k: `p:${p.id}`, kind: 'p', id: p.id, i, bbox: e.bbox }); });
      }
    }
    return out;
  }, [v, show.join(',')]);

  const byRegion = useMemo(() => {
    const m = new Map<string, ViewPattern[]>((v?.regions ?? []).map((r) => [r.id, []]));
    const loose: ViewPattern[] = [];
    for (const p of v?.patterns ?? []) {
      const rs = v!.regions.filter((r) => r.patterns.includes(p.id));
      if (rs.length) rs.forEach((r) => m.get(r.id)!.push(p)); else loose.push(p);
    }
    return { m, loose };
  }, [v]);

  const pct = (b: BBox) => ({ left: `${(b.x / W) * 100}%`, top: `${(b.y / H) * 100}%`, width: `${(b.width / W) * 100}%`, height: `${(b.height / H) * 100}%` });

  // The smallest box under the pointer wins, so nested patterns stay reachable inside their region.
  const onMove = (e: React.PointerEvent) => {
    const r = shot.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const under = boxes.filter((b) => x >= b.bbox.x && x <= b.bbox.x + b.bbox.width && y >= b.bbox.y && y <= b.bbox.y + b.bbox.height);
    if (!under.length) { setHot(null); setTip(null); return; }
    under.sort((a, b) => a.bbox.width * a.bbox.height - b.bbox.width * b.bbox.height);
    setHot(under[0].k);
    setTip({ x: e.clientX, y: e.clientY, box: under[0] });
  };

  const focusBox = (k: string) => {
    setHot(k);
    document.querySelector(`[data-k="${CSS.escape(k)}"]`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  };

  const patternItem = (p: ViewPattern) => {
    const k = `p:${p.id}`;
    return (
      <li key={p.id}>
        <button type="button" className="pitem" data-hot={hot === k || undefined} data-status={p.status} onMouseEnter={() => setHot(k)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(k)} onBlur={() => setHot(null)} onClick={() => focusBox(k)}>
          <span className="pitem-head">
            <span className="mono pid">{p.id}</span>
            <span className="pitem-level">{levels[p.id] ?? 'not in codebook'}</span>
            <span className="spacer" />
            {p.status !== 'present' ? <span className="chip chip-warn">{p.status}</span> : null}
            {p.support !== undefined ? <span className="num pitem-support" title={`${p.support} of ${p.raters} raters agree`}>{p.support}/{p.raters}</span> : null}
            <Score value={p.confidence} label={`Confidence in ${p.id}`} size="sm" />
          </span>
          <DimList dims={p.dims} ties={p.ties} />
          {p.ties?.filter((t) => !p.dims || !(t in p.dims)).length ? <span className="small warn-text">No majority on {p.ties.filter((t) => !p.dims || !(t in p.dims)).join(', ')}</span> : null}
        </button>
      </li>
    );
  };

  if (!d.screenshot) {
    return (
      <div className="empty-state">
        <h2>{d.lfs ? 'Screenshot Not Pulled' : 'No Capture Yet'}</h2>
        <p>{d.lfs ? <>The screenshot is a Git LFS pointer. Run <code>git lfs pull</code>, then reload.</> : 'This site hasn’t been captured. It shows up here once the capture step finishes.'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="viewer">
        <div className="viewer-main">
          <div className="viewer-bar">
            {sources.length ? (
              <SegmentedControl className="segmented" aria-label="Label source" value={source} onValueChange={(x) => x && setSrc(x === sources[0] ? '' : x)}>
                <SegmentedControlIndicator className="segmented-indicator" />
                {sources.map((s) => <SegmentedControlItem key={s} value={s} className="segmented-item">{s === 'consensus' ? 'Consensus' : s}</SegmentedControlItem>)}
              </SegmentedControl>
            ) : <span className="muted">No labels yet</span>}
            <span className="spacer" />
            <ToggleGroup
              className="toggles"
              aria-label="Show on screenshot"
              multiple
              value={show}
              onValueChange={(next) => setShowParam(next.length ? (next.join(',') === DEFAULT_SHOW ? '' : next.join(',')) : 'none')}
            >
              <Toggle value="regions" className="toggle"><i className="key key-region" aria-hidden="true" />Regions</Toggle>
              <Toggle value="patterns" className="toggle"><i className="key key-pattern" aria-hidden="true" />Patterns</Toggle>
              <Toggle value="tags" className="toggle">Labels</Toggle>
            </ToggleGroup>
          </div>
          <div className="shot" ref={shot} data-tags={show.includes('tags') || undefined} data-live-hold onPointerMove={onMove} onPointerLeave={() => { setHot(null); setTip(null); }}>
            <img src={d.screenshot} width={W} height={H} alt={`Full-page screenshot of ${d.meta.title || d.slug}`} />
            <div className="overlay" aria-hidden="true">
              {boxes.map((b) => (
                <div key={`${b.k}/${b.i}`} className="bx" data-kind={b.kind} data-k={b.k} data-hot={hot === b.k || undefined} data-dim={(hot && hot !== b.k) || undefined} style={pct(b.bbox)}>
                  <span className="bx-tag">{b.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="side panel" aria-label="Regions and patterns">
          {!v ? <p className="muted">No label from this source.</p> : (
            <>
              <p className="small muted side-note">
                {v.consensus
                  ? <>Majority vote across raters. Region boxes come from <span className="mono">{Object.keys(d.labels)[0] ?? 'no rater'}</span>.</>
                  : <>
                      {v.label?.model?.name}
                      {v.label?.model && (v.label.model as any).servedBy?.some((m: string) => m !== v.label!.model.name) ? <span className="chip chip-warn">served by {(v.label.model as any).servedBy.join(', ')}</span> : null}
                      {' '}with codebook <span className="mono">{v.label?.codebookVersion}</span>, {(v.label?.model as any)?.turns ?? '?'} turns
                    </>}
              </p>
              {v.regions.map((r) => (
                <section key={r.id} className="region">
                  <h3>
                    <button type="button" className="region-head" data-hot={hot === `r:${r.id}` || undefined} onMouseEnter={() => setHot(`r:${r.id}`)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(`r:${r.id}`)} onBlur={() => setHot(null)} onClick={() => focusBox(`r:${r.id}`)}>
                      <span className="region-id"><i className="key key-region" aria-hidden="true" /><span className="mono">{r.id}</span><span className="spacer" /><span className="num muted">{plural(byRegion.m.get(r.id)!.length, 'pattern')}</span></span>
                      {r.label ?? r.role ? <span className="region-label">{r.label ?? r.role}</span> : null}
                    </button>
                  </h3>
                  <ul className="plist">{byRegion.m.get(r.id)!.map(patternItem)}</ul>
                  
                </section>
              ))}
              {byRegion.loose.length ? (
                <section className="region">
                  <h3>Not Placed in a Region</h3>
                  <ul className="plist">{byRegion.loose.map(patternItem)}</ul>
                </section>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {v ? <Aesthetics v={v} source={source} /> : null}

      {tip ? <BoxTip tip={tip} v={v!} /> : null}
    </>
  );
}

function BoxTip({ tip, v }: { tip: { x: number; y: number; box: Box }; v: View }) {
  const { box } = tip;
  const style = { left: tip.x + 14, top: tip.y + 14 };
  if (box.kind === 'r') {
    const r = v.regions.find((x) => x.id === box.id);
    return (
      <div className="pointer-tip" style={style} aria-hidden="true">
        <span className="tip-title">Region {box.id}</span>
        <span>{r?.label}</span>
        <span className="small">{r?.patterns.join(', ')}</span>
      </div>
    );
  }
  const p = v.patterns.find((x) => x.id === box.id);
  const ev = p?.evidence[box.i];
  return (
    <div className="pointer-tip" style={style} aria-hidden="true">
      <span className="tip-title">{box.id}</span>
      {dimText(p?.dims).map((t) => <span key={t} className="small">{t}</span>)}
      <span className="small">{p?.status}, confidence {fmt(p?.confidence)}{ev?.rater ? `, from ${ev.rater}` : ''}{ev?.region ? ` in ${ev.region}` : ''}</span>
      {ev?.quote ? <q>{ev.quote}</q> : null}
      {ev?.note ? <span className="tip-note">{ev.note}</span> : null}
      {p?.rationale ? <span className="tip-note">{p.rationale}</span> : null}
    </div>
  );
}

const AESTHETIC_KEYS = ['shape', 'elevation', 'borders', 'iconStyle', 'whitespace', 'backgroundTreatment'] as const;
const KEY_LABEL: Record<string, string> = { iconStyle: 'Icon style', backgroundTreatment: 'Background', shape: 'Shape', elevation: 'Elevation', borders: 'Borders', whitespace: 'Whitespace' };

function Aesthetics({ v, source }: { v: View; source: string }) {
  const a = v.aesthetics ?? {};
  const site = v.label?.site;
  return (
    <section className="panel" aria-labelledby="aest-h">
      <div className="panel-head">
        <h2 id="aest-h">Structure &amp; Aesthetics</h2>
        <span className="small muted">From {source === 'consensus' ? 'the consensus' : source}</span>
      </div>
      <div className="aest">
        <dl className="kv">
          {v.structure?.layout ? <><dt>Layout</dt><dd>{v.structure.layout}</dd></> : null}
          <dt>Density</dt><dd>{v.structure?.density ?? '—'}</dd>
          {AESTHETIC_KEYS.map((k) => <FragmentKV key={k} k={KEY_LABEL[k]} v={a[k]} />)}
          {a.imagery?.length ? <><dt>Imagery</dt><dd>{a.imagery.join(', ')}</dd></> : null}
          {a.mood?.length ? <><dt>Mood</dt><dd>{a.mood.join(', ')}</dd></> : null}
          {site?.domain ? <><dt>Domain</dt><dd>{site.domain}{site.domainNote ? `. ${site.domainNote}` : ''}</dd></> : null}
        </dl>
        {a.palette?.length || a.colorRoles || a.typography || a.typeScale || v.label?.notes ? <div>
          {a.palette?.length ? (
            <>
              <h3 className="aest-h3">Palette</h3>
              <ul className="palette" aria-label="Palette">
                {a.palette.map((c: string) => <li key={c}><span className="swatch" style={{ background: c }} /><span className="mono small">{c}</span></li>)}
              </ul>
            </>
          ) : null}
          <dl className="kv">
            {a.colorRoles ? (
              <>
                <dt>Color roles</dt>
                <dd>
                  <ul className="roles">
                    {Object.entries(a.colorRoles as Record<string, string>).map(([k, c]) => <li key={k}><span className="swatch swatch-sm" style={{ background: c }} />{k} <span className="mono small muted">{c}</span></li>)}
                  </ul>
                </dd>
              </>
            ) : null}
            {a.typography ? <><dt>Typography</dt><dd>{a.typography}</dd></> : null}
            {a.typeScale ? <><dt>Type scale</dt><dd>{a.typeScale}</dd></> : null}
            {v.label?.notes ? <><dt>Notes</dt><dd>{v.label.notes as string}</dd></> : null}
          </dl>
        </div> : null}
      </div>
    </section>
  );
}

function FragmentKV({ k, v }: { k: string; v: unknown }) {
  return <><dt>{k}</dt><dd>{v === undefined || v === null ? '—' : String(v)}</dd></>;
}

/** The value most raters gave, or undefined on a tie. */
function majority(values: Record<string, string>) {
  const n: Record<string, number> = {};
  for (const v of Object.values(values)) n[v] = (n[v] ?? 0) + 1;
  const ranked = Object.entries(n).sort((a, b) => b[1] - a[1]);
  return ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : undefined;
}

export function AgreementPanel({ d }: { d: SiteDetail }) {
  const ag = d.agreement;
  if (!ag) {
    return (
      <section className="panel" id="agreement" aria-labelledby="agree-h">
        <h2 id="agree-h">Disagreements</h2>
        <p className="muted">Needs labels from at least two raters.</p>
      </section>
    );
  }
  // Sorted by field, so rows for the same field sit together.
  const rows = [...ag.disagreements].sort((a, b) => a.field.localeCompare(b.field) || a.unit.localeCompare(b.unit));
  return (
    <section className="panel" id="agreement" aria-labelledby="agree-h">
      <div className="panel-head">
        <h2 id="agree-h">Disagreements <span className="h-note">{ag.disagreements.length}</span></h2>
        <p className="small muted">Values that differ from the majority are marked <span className="odd-key">like this</span>.</p>
      </div>
      {ag.disagreements.length ? (
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Field</th><th>Unit</th>{ag.raters.map((r) => <th key={r} className="mono">{r}</th>)}</tr></thead>
            <tbody>
              {rows.map((x, i) => {
                const maj = majority(x.values);
                return (
                  <tr key={`${x.field}/${x.unit}/${i}`}>
                    <th scope="row" className="mono">{x.field}</th>
                    <td className="mono">{x.field.startsWith('pattern') ? <Link href={codebookHref(x.unit)}>{x.unit}</Link> : <span className="muted">{x.unit}</span>}</td>
                    {ag.raters.map((r) => {
                      const v = x.values[r];
                      const odd = v !== undefined && (maj === undefined || v !== maj);
                      return <td key={r} className="mono" data-odd={odd || undefined}>{v ?? <span className="muted">·</span>}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="muted">All raters agree on every compared field.</p>}
      {ag.missing.length ? <p className="small err">Missing labels from {ag.missing.join(', ')}.</p> : null}
    </section>
  );
}
