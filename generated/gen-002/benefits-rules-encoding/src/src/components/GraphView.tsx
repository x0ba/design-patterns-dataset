import { useMemo, useState } from 'react';
import type { Analysis, RuleNode, SectionId } from '../engine/model';
import { depthOf } from '../engine/model';
import { SECTIONS } from '../data/spec';
import type { CaseResult } from '../store';
import { isAffected, sectionLabel } from './ui';

interface Props {
  nodes: RuleNode[];
  analysis: Analysis;
  section: SectionId | 'all';
  selectedId: string | null;
  caseRun: CaseResult | null;
  onSelect: (id: string) => void;
}

const W = 176;
const H = 46;
const COL = 214;
const ROW = 58;
const PAD = 24;

export function GraphView({ nodes, analysis, section, selectedId, caseRun, onSelect }: Props) {
  const [zoom, setZoom] = useState(0.9);
  const layout = useMemo(() => {
    const depth = depthOf(analysis);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const secIndex = new Map(SECTIONS.map((s, i) => [s.id, i]));
    const cols: RuleNode[][] = [];
    for (const id of analysis.order) {
      const n = byId.get(id)!;
      const d = depth[id] ?? 0;
      (cols[d] ??= []).push(n);
    }
    for (const col of cols) col?.sort((a, b) => (secIndex.get(a.section)! - secIndex.get(b.section)!));
    const pos: Record<string, { x: number; y: number }> = {};
    cols.forEach((col, c) =>
      col?.forEach((n, r) => {
        pos[n.id] = { x: PAD + c * COL, y: PAD + r * ROW };
      }),
    );
    const maxRows = Math.max(...cols.map((c) => c?.length ?? 0));
    return {
      pos,
      width: PAD * 2 + cols.length * COL,
      height: PAD * 2 + maxRows * ROW,
      byId,
    };
  }, [nodes, analysis]);

  const inSection = (id: string) => section === 'all' || layout.byId.get(id)?.section === section;
  const edges: { from: string; to: string }[] = [];
  for (const n of nodes) for (const d of analysis.deps[n.id] ?? []) edges.push({ from: d, to: n.id });

  const valueOf = (id: string) => caseRun?.values[id];
  const stroke = (v: unknown) => (v === true ? '#1f8a4c' : v === false ? '#b42318' : '#c3c9d3');

  return (
    <div className="graph-wrap">
      <div className="graph-tools small">
        <span className="muted">
          Columns run left to right in dependency order. Lines show which step reads which.
          {caseRun ? ' Left bar: green = true, red = false.' : ''}
        </span>
        <span className="spacer" />
        <button className="btn small-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}>
          −
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="btn small-btn" onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))}>
          +
        </button>
      </div>
      <div className="graph-scroll">
        <svg
          width={layout.width * zoom}
          height={layout.height * zoom}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Rule dependency graph"
        >
          <defs>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#8a94a6" />
            </marker>
            <marker id="arrow-sel" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#1d3557" />
            </marker>
          </defs>
          {edges.map((e) => {
            const a = layout.pos[e.from];
            const b = layout.pos[e.to];
            if (!a || !b) return null;
            const x1 = a.x + W;
            const y1 = a.y + H / 2;
            const x2 = b.x;
            const y2 = b.y + H / 2;
            const mx = (x1 + x2) / 2;
            const hot = selectedId === e.from || selectedId === e.to;
            const dim = !(inSection(e.from) || inSection(e.to));
            return (
              <path
                key={`${e.from}>${e.to}`}
                d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                fill="none"
                stroke={hot ? '#1d3557' : '#b9c1cd'}
                strokeWidth={hot ? 1.8 : 1}
                opacity={dim ? 0.15 : 1}
                markerEnd={hot ? 'url(#arrow-sel)' : 'url(#arrow)'}
              />
            );
          })}
          {analysis.order.map((id) => {
            const n = layout.byId.get(id)!;
            const p = layout.pos[id];
            const v = valueOf(id);
            const sel = selectedId === id;
            const dim = !inSection(id);
            const kindFill = n.kind === 'condition' ? '#eef4fb' : n.kind === 'outcome' ? '#f3f0fb' : '#f7f8fa';
            return (
              <g
                key={id}
                transform={`translate(${p.x},${p.y})`}
                opacity={dim ? 0.3 : 1}
                onClick={() => onSelect(id)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${id}\n${n.label}\n${sectionLabel(n.section)}`}</title>
                <rect
                  width={W}
                  height={H}
                  rx={6}
                  fill={kindFill}
                  stroke={sel ? '#1d3557' : isAffected(n) ? '#b54708' : '#c9d0da'}
                  strokeWidth={sel ? 2.2 : isAffected(n) ? 1.6 : 1}
                />
                {caseRun && <rect x={0} y={0} width={4} height={H} rx={2} fill={stroke(v)} />}
                <text x={10} y={16} className="g-id">
                  {id}
                </text>
                <text x={10} y={33} className="g-label">
                  {truncate(n.label, 27)}
                </text>
                {caseRun && v !== undefined && (
                  <text x={W - 8} y={16} textAnchor="end" className="g-val" fill={stroke(v)}>
                    {typeof v === 'boolean' ? (v ? 'T' : 'F') : typeof v === 'number' ? shortNum(v) : ''}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function shortNum(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(0);
}
