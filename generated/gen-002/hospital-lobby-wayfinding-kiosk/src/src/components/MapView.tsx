import { BUILDINGS, CLOSURES, EDGES, MAP_H, NODES, ty, type BuildingId, type Lang } from '../data/campus';
import type { Destination } from '../data/destinations';
import { STRINGS, fmt } from '../lib/i18n';
import type { Route } from '../lib/route';

interface Props {
  level: number;
  route: Route | null;
  dest: Destination;
  startNode: string;
  startLabel: string;
  closed: Set<string>;
  activeLegs?: Set<number> | null;
  lang: Lang;
  printMode?: boolean;
}

export function destPoint(d: Destination): { x: number; y: number } {
  const att = NODES.get(`${d.b}-${d.level}-${d.side}`)!;
  const hub = NODES.get(`${d.b}-${d.level}-hub`)!;
  let dx = att.x - hub.x;
  let dy = att.y - hub.y;
  if (d.side === 'hub' || (dx === 0 && dy === 0)) {
    dx = 0;
    dy = -1;
  }
  const l = Math.hypot(dx, dy) || 1;
  const k = Math.min(d.d, 70) * 0.55;
  const r = BUILDINGS[d.b].rect;
  const x = Math.min(r.x + r.w - 16, Math.max(r.x + 16, att.x + (dx / l) * k));
  const y = Math.min(r.y + r.h - 16, Math.max(r.y + 16, att.y + (dy / l) * k));
  return { x, y };
}

const labelSpec: Record<BuildingId, { dx: number; bottom: boolean; size: number }> = {
  MB: { dx: 12, bottom: false, size: 18 },
  HVP: { dx: 12, bottom: false, size: 18 },
  WC: { dx: 12, bottom: false, size: 17 },
  OC: { dx: 12, bottom: true, size: 16 },
  GAR: { dx: 8, bottom: true, size: 16 },
};

function pill(x: number, y: number, text: string, opts: { fill: string; color: string; size?: number; anchor?: 'middle' | 'start' | 'end'; stroke?: string }) {
  const size = opts.size ?? 17;
  const w = text.length * size * 0.56 + 20;
  const h = size + 12;
  let rx = x - w / 2;
  if (opts.anchor === 'start') rx = x;
  if (opts.anchor === 'end') rx = x - w;
  rx = Math.max(6, Math.min(554 - w, rx));
  return (
    <g key={`${text}-${x}-${y}`}>
      <rect x={rx} y={y - h / 2} width={w} height={h} rx={h / 2} fill={opts.fill} stroke={opts.stroke ?? 'none'} strokeWidth={2} />
      <text x={rx + w / 2} y={y + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={700} fill={opts.color}>
        {text}
      </text>
    </g>
  );
}

export function MapView({ level, route, dest, startNode, startLabel, closed, activeLegs, lang, printMode }: Props) {
  const T = STRINGS[lang];
  const here = NODES.get(startNode)!;
  const walkKinds = new Set(['walk', 'sky']);

  // ----- route geometry for this level -----
  const segs: { x1: number; y1: number; x2: number; y2: number; legIdx: number }[] = [];
  const pt = destPoint(dest);
  const elevMarks: { id: string; kind: 'out' | 'in'; toLevel: number; fromLevel: number }[] = [];
  route?.legs.forEach((leg, idx) => {
    if (leg.edge && walkKinds.has(leg.edge.kind)) {
      const a = NODES.get(leg.from)!;
      const b = NODES.get(leg.to)!;
      if (a.level === level && b.level === level) segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, legIdx: idx });
    } else if (leg.edge && (leg.edge.kind === 'elevator' || leg.edge.kind === 'stairs')) {
      const a = NODES.get(leg.from)!;
      const b = NODES.get(leg.to)!;
      if (a.level === level) elevMarks.push({ id: leg.from, kind: 'out', toLevel: b.level, fromLevel: a.level });
      if (b.level === level) elevMarks.push({ id: leg.to, kind: 'in', toLevel: b.level, fromLevel: a.level });
    } else if (!leg.edge && dest.level === level) {
      const a = NODES.get(leg.from)!;
      segs.push({ x1: a.x, y1: a.y, x2: pt.x, y2: pt.y, legIdx: idx });
    }
  });
  const pathD = (list: typeof segs) => list.map((s) => `M${s.x1} ${s.y1}L${s.x2} ${s.y2}`).join('');
  const allD = pathD(segs);
  const activeSegs = activeLegs ? segs.filter((s) => activeLegs.has(s.legIdx)) : [];
  const usedBanks = new Set(elevMarks.map((e) => e.id));

  // ----- level nodes -----
  const levelNodes = [...NODES.values()].filter((n) => n.level === level);
  const banks = levelNodes.filter((n) => n.tag === 'A' || n.tag === 'B');
  const closedBankIds = new Set(
    CLOSURES.filter((c) => c.kind === 'elevator' && closed.has(c.id)).flatMap((c) => banks.filter((n) => n.b === c.b && n.tag === 'B').map((n) => n.id)),
  );

  const labelW = dest.name.length * 9.4 + 28;
  const lx = Math.max(8, Math.min(552 - labelW, pt.x - labelW / 2));
  // keep the destination label clear of building names
  const lblRects = Object.values(BUILDINGS).map((b) => {
    const sp = labelSpec[b.id];
    const baseY = sp.bottom ? b.rect.y + b.rect.h - 12 : b.rect.y + 28;
    return { x: b.rect.x + sp.dx, y: baseY - sp.size, w: b.short[lang].length * sp.size * 0.68, h: sp.size + 6 };
  });
  const hits = (ly: number) => lblRects.some((r) => lx < r.x + r.w && lx + labelW > r.x && ly - 16 < r.y + r.h && ly + 16 > r.y);
  const cands = [pt.y - 80, pt.y + 30, pt.y - 118, pt.y + 66].filter((y) => y - 16 > 4 && y + 16 < MAP_H - 4);
  const ly = cands.find((y) => !hits(y)) ?? cands[0] ?? pt.y + 30;

  return (
    <svg viewBox={`10 6 540 ${MAP_H - 14}`} role="img" aria-label={`${T.mapTitle}: ${fmt(T.tabLevel, { n: level })}`} fontFamily="inherit">
      <defs>
        <pattern id={`hatch-${printMode ? 'p' : 's'}-${level}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#ece8dc" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#cfc9b8" strokeWidth="4" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="560" height={MAP_H} rx="18" fill="#e3ebed" />
      {/* outdoor paving between buildings */}
      <rect x="14" y={ty(402)} width="532" height={ty(468) - ty(402)} rx="10" fill="#edf2f3" />


      {/* buildings */}
      {Object.values(BUILDINGS).map((b) => {
        const absent = level > b.levels;
        return (
          <g key={b.id}>
            <rect
              x={b.rect.x}
              y={b.rect.y}
              width={b.rect.w}
              height={b.rect.h}
              rx="12"
              fill={absent ? `url(#hatch-${printMode ? 'p' : 's'}-${level})` : '#ffffff'}
              stroke={absent ? '#b9b29d' : '#5f6d79'}
              strokeWidth="3.5"
            />
            {absent && (
              <text x={b.rect.x + b.rect.w / 2} y={b.rect.y + b.rect.h / 2 + 8} textAnchor="middle" fontSize="17" fontWeight="700" fill="#7a745f">
                {T.noLevelWarn}
              </text>
            )}
          </g>
        );
      })}

      {/* corridors on this level */}
      {EDGES.filter((e) => walkKinds.has(e.kind)).map((e) => {
        const a = NODES.get(e.a)!;
        const b = NODES.get(e.b)!;
        if (a.level !== level || b.level !== level) return null;
        const isClosed = e.closure && closed.has(e.closure);
        const sky = e.kind === 'sky';
        return (
          <line
            key={e.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={isClosed ? '#b3261e' : sky ? '#98a6b1' : e.via === 'plaza' ? '#c4ccd2' : '#d3dadf'}
            strokeWidth={sky ? 14 : 12}
            strokeLinecap="round"
            strokeDasharray={isClosed ? '8 7' : e.via === 'steps' ? '3 9' : e.via === 'plaza' ? '2 9' : undefined}
          />
        );
      })}

      {/* building names (drawn over corridors, with a halo for legibility) */}
      {Object.values(BUILDINGS).map((b) => {
        const sp = labelSpec[b.id];
        const absent = level > b.levels;
        return (
          <text
            key={`lbl-${b.id}`}
            x={b.rect.x + sp.dx}
            y={sp.bottom ? b.rect.y + b.rect.h - 12 : b.rect.y + 28}
            fontSize={sp.size}
            fontWeight={800}
            letterSpacing="0.3"
            fill={absent ? '#8a846f' : '#26323d'}
            stroke="#fff"
            strokeWidth="5"
            paintOrder="stroke"
          >
            {b.short[lang].toUpperCase()}
          </text>
        );
      })}

      {/* route */}
      {allD && (
        <>
          <path d={allD} stroke="#fff" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d={allD} stroke={printMode ? '#111' : 'var(--route)'} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {activeSegs.length > 0 && (
            <>
              <path d={pathD(activeSegs)} stroke="#fff" strokeWidth="19" strokeLinecap="round" fill="none" />
              <path d={pathD(activeSegs)} stroke="var(--active)" strokeWidth="12" strokeLinecap="round" fill="none" />
            </>
          )}
          {!printMode && <path d={allD} stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 14" fill="none" className="flow" />}
        </>
      )}

      {/* elevator banks */}
      {banks.map((n) => {
        const isClosed = closedBankIds.has(n.id);
        const used = usedBanks.has(n.id);
        return (
          <g key={n.id}>
            <rect
              x={n.x - 17}
              y={n.y - 17}
              width="34"
              height="34"
              rx="8"
              fill={isClosed ? '#fbe6e3' : used ? 'var(--route)' : '#fff'}
              stroke={isClosed ? '#b3261e' : used ? '#fff' : '#5f6d79'}
              strokeWidth={used ? 3 : 2.5}
            />
            {isClosed ? (
              <path d={`M${n.x - 8} ${n.y - 8}L${n.x + 8} ${n.y + 8}M${n.x + 8} ${n.y - 8}L${n.x - 8} ${n.y + 8}`} stroke="#b3261e" strokeWidth="4" strokeLinecap="round" />
            ) : (
              <text x={n.x} y={n.y + 7} textAnchor="middle" fontSize="20" fontWeight="800" fill={used ? '#fff' : '#26323d'}>
                {n.tag}
              </text>
            )}
          </g>
        );
      })}

      {/* closure markers */}
      {CLOSURES.filter((c) => closed.has(c.id) && c.levelsShown.includes(level)).map((c) => {
        if (c.kind === 'elevator') {
          const bank = banks.find((n) => n.b === c.b && n.tag === 'B');
          if (!bank) return null;
          return pill(bank.x, bank.y - 34, `${T.closedShort}`, { fill: '#b3261e', color: '#fff', size: 16, anchor: 'middle' });
        }
        return (
          <g key={c.id}>
            <circle cx={c.at.x} cy={c.at.y} r="15" fill="#b3261e" stroke="#fff" strokeWidth="3" />
            <path d={`M${c.at.x - 6} ${c.at.y - 6}L${c.at.x + 6} ${c.at.y + 6}M${c.at.x + 6} ${c.at.y - 6}L${c.at.x - 6} ${c.at.y + 6}`} stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
            {pill(c.at.x, c.at.y + (c.kind === 'skybridge' ? -30 : 32), T.closedShort, { fill: '#b3261e', color: '#fff', size: 16 })}
          </g>
        );
      })}

      {/* elevator transitions */}
      {elevMarks.map((m, i) => {
        const n = NODES.get(m.id)!;
        const text = m.kind === 'out' ? `${m.toLevel > m.fromLevel ? '▲' : '▼'} ${fmt(T.tabLevel, { n: m.toLevel })}` : `${m.fromLevel < m.toLevel ? '▼' : '▲'} ${fmt(T.tabLevel, { n: m.fromLevel })}`;
        const right = n.x < 400;
        return pill(right ? n.x - 4 : n.x + 4, n.y + 36, text, { fill: '#17212b', color: '#fff', size: 16, anchor: right ? 'start' : 'end' });
      })}

      {/* you are here */}
      {here.level === level && (
        <g>
          {!printMode && <circle cx={here.x} cy={here.y} r="14" fill="#1a5fd0" className="pulse" />}
          <circle cx={here.x} cy={here.y} r="12" fill="#1a5fd0" stroke="#fff" strokeWidth="4" />
          {pill(here.x, here.y + (here.y > 500 ? -30 : 30), startLabel, { fill: '#1a5fd0', color: '#fff', size: 17 })}
        </g>
      )}

      {/* destination */}
      {dest.level === level && (
        <g>
          <path d={`M${pt.x} ${pt.y + 4} c-14 -16 -22 -26 -22 -38 a22 22 0 1 1 44 0 c0 12 -8 22 -22 38z`} transform={`translate(0 0)`} fill="#17212b" stroke="#fff" strokeWidth="3" />
          <circle cx={pt.x} cy={pt.y - 34} r="8" fill="#fff" />
          <g>
            <rect x={lx} y={ly - 16} width={labelW} height="32" rx="16" fill="#17212b" />
            <text x={lx + labelW / 2} y={ly + 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">
              {dest.name}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
