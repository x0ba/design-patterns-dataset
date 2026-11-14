import { useMemo } from 'react';
import { styleById, type StyleId } from '../data/core';
import type { Edit } from '../data/revisions';
import { getOutline, layout, toPath, undoEdits, useStyleFonts, type Outline, type Pt, type StyleFonts } from '../outline';

export type CanvasMode = 'overlay' | 'side' | 'now';

const metricCache = new Map<StyleId, { asc: number; cap: number; xh: number; desc: number }>();
export function styleMetrics(sf: StyleFonts) {
  let m = metricCache.get(sf.style);
  if (!m) {
    const y2 = (c: string) => getOutline(sf, c)?.bbox.y2 ?? 0;
    m = { asc: y2('h'), cap: y2('H'), xh: y2('x'), desc: getOutline(sf, 'p')?.bbox.y1 ?? -250 };
    metricCache.set(sf.style, m);
  }
  return m;
}

function isSmooth(c: Pt[], i: number) {
  const p = c[i], a = c[(i - 1 + c.length) % c.length], b = c[(i + 1) % c.length];
  if (a.on || b.on) return false;
  const cross = (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x);
  const len = Math.hypot(p.x - a.x, p.y - a.y) * Math.hypot(b.x - p.x, b.y - p.y);
  return len > 0 && Math.abs(cross / len) < 0.06;
}

function Points({ o, prev, u, showMoves }: { o: Outline; prev?: Outline | null; u: number; showMoves: boolean }) {
  const els: JSX.Element[] = [];
  o.contours.forEach((c, ci) => {
    c.forEach((p, pi) => {
      const nb = c[(pi + 1) % c.length];
      if (!p.on || !nb.on) {
        els.push(<line key={`h${ci}-${pi}`} x1={p.x} y1={-p.y} x2={nb.x} y2={-nb.y} className={!p.on && !nb.on ? 'handle dashed' : 'handle'} strokeWidth={u * 0.9} />);
      }
    });
  });
  o.contours.forEach((c, ci) => {
    c.forEach((p, pi) => {
      const q = prev?.contours[ci]?.[pi];
      const moved = showMoves && q && Math.hypot(p.x - q.x, p.y - q.y) >= 1;
      if (moved && q) {
        els.push(<line key={`mv${ci}-${pi}`} x1={q.x} y1={-q.y} x2={p.x} y2={-p.y} className="move-vec" strokeWidth={u * 1.4} />);
      }
      const cls = `pt ${p.on ? 'on' : 'off'} ${moved ? 'moved' : ''}`;
      if (p.on && !isSmooth(c, pi)) {
        els.push(<rect key={`p${ci}-${pi}`} x={p.x - 3.2 * u} y={-p.y - 3.2 * u} width={6.4 * u} height={6.4 * u} className={cls} strokeWidth={u * 1.2} />);
      } else {
        els.push(<circle key={`p${ci}-${pi}`} cx={p.x} cy={-p.y} r={(p.on ? 3.6 : 2.6) * u} className={cls} strokeWidth={u * 1.2} />);
      }
    });
  });
  return <g>{els}</g>;
}

interface Props {
  style: StyleId;
  ch: string;
  edits?: Edit[];
  mode?: CanvasMode;
  points?: boolean;
  metrics?: boolean;
  fill?: boolean;
  height: number;
  width?: number;
  beforeLabel?: string;
}

export function GlyphCanvas({ style, ch, edits, mode = 'overlay', points = true, metrics = true, fill = true, height, width, beforeLabel = 'Tue 11 Nov' }: Props) {
  const sf = useStyleFonts(style);
  const data = useMemo(() => {
    if (!sf) return null;
    const now = getOutline(sf, ch);
    if (!now) return null;
    const before = edits ? undoEdits(now, edits) : null;
    return { now, before, m: styleMetrics(sf) };
  }, [sf, ch, edits]);

  if (!data) {
    return <div className="canvas-loading" style={{ height }}>{sf ? 'No outline in this style yet' : 'Loading outlines…'}</div>;
  }
  const { now, before, m } = data;
  const italic = styleById(style).italic;
  const top = Math.max(m.asc, now.bbox.y2, before?.bbox.y2 ?? 0) + 90;
  const bottom = Math.min(m.desc, now.bbox.y1, before?.bbox.y1 ?? 0) - 90;
  const vbH = top - bottom;
  const u = vbH / height; // font units per screen px

  const pane = (o: Outline, other: Outline | null, role: 'now' | 'before' | 'overlay', label?: string) => {
    const x1 = Math.min(0, o.bbox.x1, other?.bbox.x1 ?? 0) - 120;
    const x2 = Math.max(o.advance, o.bbox.x2, other?.bbox.x2 ?? 0) + 120;
    const vbW = x2 - x1;
    const pxW = vbW / u;
    const metricLines: Array<[string, number]> = [['ascender', m.asc], ['cap height', m.cap], ['x-height', m.xh], ['baseline', 0], ['descender', m.desc]];
    return (
      <div className="canvas-pane" key={role}>
        {label && <div className="pane-label">{label}</div>}
        <svg width={pxW} height={height} viewBox={`${x1} ${-top} ${vbW} ${vbH}`} className="glyph-svg">
          {metrics && (
            <g>
              <rect x={0} y={-top} width={o.advance} height={vbH} className="adv-box" />
              {metricLines.map(([name, y]) => (
                <g key={name}>
                  <line x1={x1} x2={x2} y1={-y} y2={-y} className={name === 'baseline' ? 'metric base' : 'metric'} strokeWidth={u} />
                  <text x={x1 + 8 * u} y={-y - 4 * u} fontSize={10 * u} className="metric-label">{name} {Math.round(y)}</text>
                </g>
              ))}
              <line x1={0} x2={0} y1={-top} y2={-bottom} className="metric side" strokeWidth={u} />
              <line x1={o.advance} x2={o.advance} y1={-top} y2={-bottom} className="metric side" strokeWidth={u} />
              <text x={o.advance - 4 * u} y={-bottom - 8 * u} fontSize={10 * u} textAnchor="end" className="metric-label">{o.advance}</text>
            </g>
          )}
          {role === 'overlay' && other && (
            <path d={toPath(other.contours, 0, 0, true)} className="outline-before" strokeWidth={u * 1.8} />
          )}
          <path d={toPath(o.contours, 0, 0, true)} className={`outline ${role === 'before' ? 'is-before' : ''} ${fill ? 'filled' : ''}`} strokeWidth={u * 1.1} />
          {points && <Points o={o} prev={role === 'overlay' ? other : null} u={u} showMoves={role === 'overlay'} />}
        </svg>
      </div>
    );
  };

  return (
    <div className={`glyph-canvas ${italic ? 'is-italic' : ''}`} style={{ width }}>
      {mode === 'side' && before ? (
        <>
          {pane(before, now, 'before', beforeLabel)}
          {pane(now, before, 'now', 'Now')}
        </>
      ) : mode === 'overlay' && before ? (
        pane(now, before, 'overlay')
      ) : (
        pane(now, null, 'now')
      )}
    </div>
  );
}

/** Renders a run of text from outlines so earlier states can be shown in context. */
export function PathText({ style, text, size, editsFor, kern, className }: {
  style: StyleId; text: string; size: number; className?: string;
  editsFor?: (ch: string) => Edit[] | undefined;
  kern?: (a: string, b: string) => number;
}) {
  const sf = useStyleFonts(style);
  const res = useMemo(() => {
    if (!sf) return null;
    return layout(sf, text, {
      kern,
      override: editsFor ? (ch, o) => { const e = editsFor(ch); return e ? undoEdits(o, e) : o; } : undefined,
    });
  }, [sf, text, editsFor, kern]);
  const asc = 960, desc = -300;
  const h = ((asc - desc) / 1000) * size;
  if (!res) return <svg height={h} width={1} />;
  const w = (res.width / 1000) * size;
  return (
    <svg className={`path-text ${className ?? ''}`} height={h} width={Math.max(1, w)} viewBox={`0 ${-asc} ${Math.max(1, res.width)} ${asc - desc}`}>
      {res.paths.map((p) => <path key={p.key} d={p.d} />)}
    </svg>
  );
}

