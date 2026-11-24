import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, ZoomTransform } from 'd3-zoom';
import { easeCubicInOut } from 'd3-ease';
import 'd3-transition';
import { polygonHull } from 'd3-polygon';
import { line, curveCatmullRomClosed } from 'd3-shape';
import {
  mods, edges, packages, services, SERVICE_COLOR, nodeColor, issueByModule, fmtMonth, edgeBetween,
  type Lens, type Trail, type Mod, type ServiceId,
} from './data';

export interface Insets { left: number; right: number; top: number; bottom: number }
export interface MapHandle {
  fitIds: (ids: number[], opts?: { maxScale?: number; animate?: boolean }) => void;
  fitAll: () => void;
  zoomBy: (f: number) => void;
  centerOn: (id: number) => void;
}
interface Props {
  lens: Lens;
  selected: number | null;
  hovered: number | null;
  trail: Trail | null;
  blast: Map<number, number> | null; // id -> hops
  litFilter: Set<number> | null;
  callees: Set<number>;
  insets: Insets;
  onSelect: (id: number | null) => void;
  onHover: (id: number | null, x?: number, y?: number) => void;
}

const WORLD_PAD = 60;
const smooth = line<[number, number]>().curve(curveCatmullRomClosed.alpha(0.6));

function hullPath(points: Mod[], pad: number): string {
  const pts: [number, number][] = [];
  for (const m of points) for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; pts.push([m.x + Math.cos(t) * (m.r + pad), m.y + Math.sin(t) * (m.r + pad)]); }
  const h = polygonHull(pts);
  return h ? smooth(h) ?? '' : '';
}

const MapView = forwardRef<MapHandle, Props>(function MapView(props, ref) {
  const { lens, selected, hovered, trail, blast, litFilter, callees, insets, onSelect, onHover } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ReturnType<typeof d3zoom<SVGSVGElement, unknown>> | null>(null);
  const tfRef = useRef<ZoomTransform>(zoomIdentity);
  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  useEffect(() => { placeServiceLabels(tfRef.current); }, [insets]);
  const [kq, setKq] = useState(1);
  const bucket: 'far' | 'mid' | 'near' = kq < 0.62 ? 'far' : kq < 1.25 ? 'mid' : 'near';

  // static geometry
  const regions = useMemo(() => {
    const svc = services.map((s) => {
      const ms = mods.filter((m) => m.service === s.id);
      const xs = ms.map((m) => m.x), ys = ms.map((m) => m.y);
      return { id: s.id as ServiceId, name: s.name, lang: s.lang, count: ms.length, d: hullPath(ms, 54), minX: Math.min(...xs) - 40, maxX: Math.max(...xs) + 40, cx: (Math.min(...xs) + Math.max(...xs)) / 2, top: Math.min(...ys.map((y, i) => y - ms[i].r)) - 54 };
    });
    const pk = packages.map((p) => {
      const ms = mods.filter((m) => m.pkg === p.key);
      const xs = ms.map((m) => m.x), ys = ms.map((m) => m.y);
      return { key: p.key, label: p.label.replace(/^(dispatch|donor)\//, ''), service: p.service, count: ms.length, d: hullPath(ms, 15), cx: (Math.min(...xs) + Math.max(...xs)) / 2, top: Math.min(...ys.map((y, i) => y - ms[i].r)) - 15 };
    });
    return { svc, pk };
  }, []);

  const worldBox = useMemo(() => {
    const xs = mods.map((m) => m.x), ys = mods.map((m) => m.y);
    return { x0: Math.min(...xs) - 120, x1: Math.max(...xs) + 120, y0: Math.min(...ys) - 150, y1: Math.max(...ys) + 120 };
  }, []);

  const svcRefs = useRef<Record<string, SVGGElement | null>>({});
  const placeServiceLabels = (t: ZoomTransform) => {
    const svg = svgRef.current; if (!svg) return;
    const ins = insetsRef.current; const W = svg.clientWidth;
    for (const sv of regions.svc) {
      const el = svgRef.current && svcRefs.current[sv.id]; if (!el) continue;
      const w = sv.name.length * 9.4 + 16;
      const lo = Math.max(sv.minX * t.k + t.x + w / 2, ins.left + 10 + w / 2);
      const hi = Math.min(sv.maxX * t.k + t.x - w / 2, W - ins.right - 10 - w / 2);
      const sx = sv.cx * t.k + t.x;
      const hullR = sv.maxX * t.k + t.x;
      const x = lo <= hi ? Math.min(hi, Math.max(lo, sx)) : hullR > ins.left + 60 ? Math.max(lo, sv.minX * t.k + t.x + w / 2) : Math.max(sv.minX * t.k + t.x + w / 2, Math.min(hullR - w / 2, sx));
      el.setAttribute('transform', `translate(${(x - t.x) / t.k},${sv.top - 14})`);
    }
  };
  const applyTransform = (t: ZoomTransform) => {
    tfRef.current = t;
    placeServiceLabels(t);
    const g = gRef.current;
    if (!g) return;
    g.setAttribute('transform', `translate(${t.x},${t.y}) scale(${t.k})`);
    g.style.setProperty('--k', String(t.k));
    const q = Math.round(t.k * 20) / 20;
    setKq((prev) => (prev === q ? prev : q));
  };

  useEffect(() => {
    const svg = select(svgRef.current!);
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.22, 5])
      .filter((ev) => (!ev.ctrlKey || ev.type === 'wheel') && !ev.button)
      .on('zoom', (ev) => applyTransform(ev.transform));
    zoomRef.current = z;
    svg.call(z).on('dblclick.zoom', null);
    return () => { svg.on('.zoom', null); };
  }, []);

  const viewportFor = (ids: number[], maxScale = 2.2) => {
    const svg = svgRef.current!;
    const W = svg.clientWidth, H = svg.clientHeight;
    const ins = insetsRef.current;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const id of ids) { const m = mods[id]; x0 = Math.min(x0, m.x - m.r - 50); y0 = Math.min(y0, m.y - m.r - 34); x1 = Math.max(x1, m.x + m.r + 110); y1 = Math.max(y1, m.y + m.r + 26); }
    const availW = W - ins.left - ins.right, availH = H - ins.top - ins.bottom;
    const k = Math.min(maxScale, Math.max(0.25, Math.min(availW / (x1 - x0), availH / (y1 - y0))));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return zoomIdentity.translate(ins.left + availW / 2 - cx * k, ins.top + availH / 2 - cy * k).scale(k);
  };
  const goTo = (t: ZoomTransform, animate = true) => {
    const svg = select(svgRef.current!);
    const z = zoomRef.current!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || reduce) { svg.call(z.transform, t); return; }
    const cur = tfRef.current;
    const dist = Math.hypot(t.x - cur.x, t.y - cur.y) / 900 + Math.abs(Math.log(t.k / cur.k));
    svg.transition().duration(Math.min(1000, 380 + dist * 420)).ease(easeCubicInOut).call(z.transform, t);
  };

  useImperativeHandle(ref, () => ({
    fitIds: (ids, o) => { if (ids.length) goTo(viewportFor(ids, o?.maxScale ?? 2.2), o?.animate ?? true); },
    fitAll: () => goTo(viewportFor(mods.map((m) => m.i), 1.2)),
    centerOn: (id) => {
      const k = Math.min(1.8, Math.max(0.95, tfRef.current.k));
      const m = mods[id], ins = insetsRef.current, svg = svgRef.current!;
      const availW = svg.clientWidth - ins.left - ins.right, availH = svg.clientHeight - ins.top - ins.bottom;
      goTo(zoomIdentity.translate(ins.left + availW / 2 - m.x * k, ins.top + availH / 2 - m.y * k).scale(k));
    },
    zoomBy: (f) => { const svg = select(svgRef.current!); svg.transition().duration(220).call(zoomRef.current!.scaleBy, f); },
  }));

  // ---- emphasis model
  const trailSet = useMemo(() => new Set(trail?.ids ?? []), [trail]);
  const trailEdgeKeys = useMemo(() => new Set((trail?.edges ?? []).map((e) => e.s + '>' + e.t)), [trail]);
  const trailIndex = useMemo(() => new Map((trail?.ids ?? []).map((id, i) => [id, i + 1])), [trail]);
  const hasFocus = !!(trail || blast || litFilter || selected !== null);

  const lit = useMemo(() => {
    const s = new Set<number>();
    trail?.ids.forEach((i) => s.add(i));
    if (litFilter) { litFilter.forEach((i) => s.add(i)); if (selected !== null) s.add(selected); return s; }
    if (blast) blast.forEach((_, i) => s.add(i));
    if (selected !== null) { s.add(selected); callees.forEach((c) => s.add(c)); mods[selected].inn.forEach((c) => !blast && s.add(c)); }
    return s;
  }, [trail, blast, selected, litFilter, callees]);

  // which nodes want a text label, in priority order
  const wanted = useMemo(() => {
    const order: number[] = [];
    const seen = new Set<number>();
    const add = (i: number) => { if (!seen.has(i)) { seen.add(i); order.push(i); } };
    if (hovered !== null) add(hovered);
    if (selected !== null) add(selected);
    trail?.ids.forEach(add);
    issueByModule.forEach((_, i) => add(i));
    if (blast) [...blast].filter(([, d]) => d === 1).sort((a, b) => mods[b[0]].lines - mods[a[0]].lines).forEach(([i]) => add(i));
    if (selected !== null) { [...callees].sort((a, b) => mods[a].cov - mods[b].cov).forEach(add); if (!blast) mods[selected].inn.forEach(add); }
    if (litFilter && litFilter.size <= 40) litFilter.forEach(add);
    return order;
  }, [trail, selected, callees, blast, hovered, litFilter]);

  const placement = useMemo(() => {
    const k = kq;
    type R = { x0: number; y0: number; x1: number; y1: number };
    const hit = (a: R, b: R) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const taken: R[] = [];
    const rectAt = (x: number, y: number, w: number, h: number): R => ({ x0: x, y0: y, x1: x + w, y1: y + h });
    const pkRects = regions.pk.map((p) => { const w = (p.label.length + 1) * 6.6 + 6; return { key: p.key, r: rectAt(p.cx * k - w / 2, (p.top - 3) * k - 13, w, 16) }; });
    const hidden = new Set<string>();
    for (const sv of regions.svc) { const w = sv.name.length * 9.4; taken.push(rectAt(sv.cx * k - w / 2, (sv.top - 14) * k - 18, w, 40)); }
    issueByModule.forEach((_, i) => { const m = mods[i]; taken.push(rectAt(m.x * k - 22, m.y * k - m.r * k - 30, 44, 26)); });
    trail?.ids.forEach((i) => { const m = mods[i]; taken.push(rectAt(m.x * k + m.r * k * 0.7 - 9, m.y * k - m.r * k * 0.7 - 22, 18, 18)); });
    const trailPts: { x: number; y: number }[] = [];
    (trail?.edges ?? []).forEach((e) => {
      const a = mods[e.s], b = mods[e.t]; const len = Math.hypot(b.x - a.x, b.y - a.y) * k; const n = Math.max(2, Math.ceil(len / 8));
      for (let i = 0; i <= n; i++) trailPts.push({ x: (a.x + (b.x - a.x) * (i / n)) * k, y: (a.y + (b.y - a.y) * (i / n)) * k });
    });
    const out = new Map<number, { pos: 'r' | 'l' | 'b' | 'a'; strong: boolean }>();
    const place = (i: number, strong: boolean) => {
      const m = mods[i]; const px = m.x * k, py = m.y * k, rr = m.r * k;
      const w = m.name.length * 7.3 + 8, h = 14;
      const cands: [R, 'r' | 'l' | 'b' | 'a'][] = [
        [rectAt(px + rr + 5, py - 7, w, h), 'r'],
        [rectAt(px - w / 2, py + rr + 3, w, h), 'b'], [rectAt(px - w / 2, py - rr - 3 - h, w, h), 'a'],
        [rectAt(px - rr - 5 - w, py - 7, w, h), 'l'],
      ];
      const onTrail = (r: R) => trailPts.some((q) => Math.hypot(q.x - px, q.y - py) > rr + 2 && q.x > r.x0 - 1 && q.x < r.x1 + 1 && q.y > r.y0 - 1 && q.y < r.y1 + 1);
      const free = (r: R) => !taken.some((t) => hit(r, t)) && !onTrail(r) && (strong || !pkRects.some((q) => !hidden.has(q.key) && hit(r, q.r)));
      const ok = cands.find(([r]) => free(r));
      const chosen = ok ?? (strong ? cands.find(([r]) => !taken.some((t) => hit(r, t))) ?? cands[0] : undefined);
      if (chosen) {
        taken.push(chosen[0]); out.set(i, { pos: chosen[1], strong });
        if (strong) pkRects.forEach((q) => { if (hit(chosen[0], q.r)) hidden.add(q.key); });
      }
    };
    wanted.forEach((i) => place(i, i === selected || i === hovered || trailSet.has(i)));
    if (kq >= 1.25) mods.forEach((m) => { if (!out.has(m.i) && (!hasFocus || lit.has(m.i))) place(m.i, false); });
    if (kq >= 1.25 && hasFocus) mods.forEach((m) => { if (!out.has(m.i)) place(m.i, false); });
    return { out, hidden };
  }, [wanted, kq, regions, trail, selected, trailSet, hasFocus, lit]);

  const wantedSet = useMemo(() => new Set(wanted), [wanted]);
  const hoverEdges = hovered !== null ? new Set([...mods[hovered].out.map((t) => hovered + '>' + t), ...mods[hovered].inn.map((s) => s + '>' + hovered)]) : null;

  const edgeEls = useMemo(() => {
    const items: React.JSX.Element[] = [];
    const blastEdge = (s: number, t: number) => blast && blast.has(s) && (t === selected || blast.has(t)) && blast.get(s)! === (t === selected ? 0 : blast.get(t)!) + 1;
    for (const e of edges) {
      const key = e.s + '>' + e.t;
      const a = mods[e.s], b = mods[e.t];
      let cls = 'edge';
      if (trailEdgeKeys.has(key)) cls += ' e-trail';
      else if (blastEdge(e.s, e.t)) cls += blast!.get(e.s)! > 1 ? ' e-blast e-blast2' : ' e-blast';
      else if (selected !== null && e.s === selected) cls += ' e-dep';
      else if (hoverEdges?.has(key)) cls += ' e-hover';
      else if (hasFocus) cls += ' e-dim';
      if (e.http) cls += ' e-http';
      items.push(<line key={key} className={cls} x1={a.x} y1={a.y} x2={b.x} y2={b.y} markerEnd={cls.includes('e-trail') ? 'url(#arrow-trail)' : cls.includes('e-blast') ? 'url(#arrow-blast)' : cls.includes('e-dep') ? 'url(#arrow-dep)' : undefined} style={{ strokeWidth: 0.35 + Math.min(e.w, 8) * 0.07 }} />);
    }
    // draw emphasised edges last
    const rank = (el: React.JSX.Element) => { const c = el.props.className as string; return c.includes('e-trail') ? 4 : c.includes('e-blast') ? 3 : c.includes('e-dep') || c.includes('e-hover') ? 2 : c.includes('e-dim') ? 0 : 1; };
    return items.sort((x, y) => rank(x) - rank(y));
  }, [trailEdgeKeys, blast, selected, hovered, hasFocus]);

  const nodeEls = mods.map((m) => {
    const isSel = m.i === selected;
    const isLit = !hasFocus || lit.has(m.i) || m.i === hovered;
    const bd = blast?.get(m.i);
    const t = trailIndex.get(m.i);
    return (
      <g key={m.i} role="button" aria-label={`${m.path}, ${m.lines} lines, ${m.cov}% tested, last touched by ${m.by}`} aria-pressed={isSel} className={'node' + (isLit ? '' : ' n-dim') + (isSel ? ' n-sel' : '')} transform={`translate(${m.x},${m.y})`}
        onClick={(e) => { e.stopPropagation(); onSelect(m.i); }}
        onMouseEnter={(e) => onHover(m.i, e.clientX, e.clientY)} onMouseMove={(e) => onHover(m.i, e.clientX, e.clientY)} onMouseLeave={() => onHover(null)}>
        <circle r={m.r + 7} fill="transparent" />
        {bd !== undefined && bd > 0 && <circle className={'halo h' + Math.min(bd, 3)} r={m.r + (bd === 1 ? 4.5 : 3.5)} />}
        {isSel && <circle className="sel-ring" r={m.r + 4} />}
        <circle className={'dot' + (t ? ' on-trail' : '')} r={m.r} fill={nodeColor(m, lens)} />
      </g>
    );
  });

  // screen-space overlays (labels, trail numbers, issue tags)
  const overlayIds = new Set<number>([...placement.out.keys(), ...trailIndex.keys(), ...issueByModule.keys()]);
  const overlays = [...overlayIds].map((id) => {
    const m = mods[id];
    const pl = placement.out.get(id);
    const t = trailIndex.get(id);
    const iss = issueByModule.get(id);
    const dim = hasFocus && !lit.has(id) && id !== hovered;
    const strong = id === selected || trailSet.has(id);
    const tr = pl?.pos === 'l' ? 'translate(calc(var(--r) * var(--k) * -1px - 5px), 4px)' : pl?.pos === 'b' ? 'translate(0, calc(var(--r) * var(--k) * 1px + 15px))' : pl?.pos === 'a' ? 'translate(0, calc(var(--r) * var(--k) * -1px - 7px))' : 'translate(calc(var(--r) * var(--k) * 1px + 5px), 4px)';
    return (
      <g key={id} transform={`translate(${m.x},${m.y})`} style={{ pointerEvents: 'none' }}>
        <g className="ss" style={{ ['--r' as string]: m.r }}>
          {pl && <text className={'lbl' + (strong ? ' lbl-strong' : '') + (dim ? ' lbl-dim' : '') + (!wantedSet.has(id) ? ' lbl-quiet' : '')} textAnchor={pl.pos === 'l' ? 'end' : pl.pos === 'b' || pl.pos === 'a' ? 'middle' : 'start'} style={{ transform: tr }}>{m.name}</text>}
          {t && <g style={{ transform: 'translate(calc(var(--r) * var(--k) * 0.7px), calc(var(--r) * var(--k) * -0.7px - 4px))' }}><circle className="badge" r="9" /><text className="badge-t" y="4" textAnchor="middle">{t}</text></g>}
          {iss && <g style={{ transform: 'translate(0, calc(var(--r) * var(--k) * -1px - 6px))' }} className={dim ? 'pin pin-dim' : 'pin'}>
            <path d="M0 0 L-4 -6 H-17 a3 3 0 0 1 -3 -3 V-18 a3 3 0 0 1 3 -3 H17 a3 3 0 0 1 3 3 V-9 a3 3 0 0 1 -3 3 H4 Z" className="pin-body" />
            <text className="pin-t" y="-9.5" textAnchor="middle">#{iss[0].n}</text>
          </g>}
        </g>
      </g>
    );
  });

  return (
    <svg ref={svgRef} className="map-svg" onClick={() => onSelect(null)} role="group" aria-label="Spatial map of the second-helping codebase: 214 modules in 3 service regions, nearer together when they call each other more">
      <defs>
        <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#D9CFBD" /></pattern>
        {(['trail', 'blast', 'dep'] as const).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse" markerUnits="strokeWidth">
            <path d="M0 1 L10 5 L0 9 z" className={'arrow arrow-' + k} />
          </marker>
        ))}
      </defs>
      <rect className="map-bg" width="100%" height="100%" fill="#F3EEE4" />
      <rect width="100%" height="100%" fill="url(#dots)" opacity="0.55" />
      <g ref={gRef} style={{ ['--k' as string]: 1 }}>
        <g className="regions">
          {regions.svc.map((s) => <path key={s.id} d={s.d} className="svc-hull" style={{ fill: SERVICE_COLOR[s.id], stroke: SERVICE_COLOR[s.id] }} />)}
          {regions.pk.map((p) => <path key={p.key} d={p.d} className="pkg-hull" style={{ stroke: SERVICE_COLOR[p.service] }} />)}
        </g>
        <g className="region-labels" style={{ pointerEvents: 'none' }}>
          {regions.svc.map((s) => (
            <g key={s.id} ref={(el) => { svcRefs.current[s.id] = el; }} transform={`translate(${s.cx},${s.top - 14})`}><g className="ss">
              <text className="svc-label" textAnchor="middle" style={{ fill: SERVICE_COLOR[s.id] }}>{s.name}</text>
              <text className="svc-sub" textAnchor="middle" y="17">{s.lang} · {s.count} modules</text>
            </g></g>
          ))}
          {regions.pk.filter((p) => !placement.hidden.has(p.key)).map((p) => (
            <g key={p.key} transform={`translate(${p.cx},${p.top - 3})`}><g className="ss"><text className="pkg-label" textAnchor="middle">{p.label}/</text></g></g>
          ))}
        </g>
        <g className="edges">{edgeEls}</g>
        <g className="nodes">{nodeEls}</g>
        <g className="overlays">{overlays}</g>
      </g>
    </svg>
  );
});
export default MapView;
