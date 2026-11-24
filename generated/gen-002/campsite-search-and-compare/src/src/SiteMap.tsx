import { useMemo } from 'react';
import { LAKE_Y, MAP_H, MAP_W, M_PER_UNIT, ROAD_Y, type Campground, type Site } from './data';

interface Props {
  cg: Campground;
  visible: Set<string>;
  selectedId: string | null;
  hoverId: string | null;
  pinned: string[];
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function siteStatus(s: Site): 'all' | 'some' | 'none' {
  if (s.open.every(Boolean)) return 'all';
  if (s.open.some(Boolean)) return 'some';
  return 'none';
}

export default function SiteMap({ cg, visible, selectedId, hoverId, pinned, onSelect, onHover }: Props) {
  const trees = useMemo(() => {
    const out: { x: number; y: number; r: number; d: boolean }[] = [];
    cg.sites.forEach((s, i) => {
      const n = s.shade === 'Full' ? 3 : s.shade === 'Partial' ? 1 : 0;
      for (let k = 0; k < n; k++) {
        out.push({ x: s.x + (hash(i * 7 + k) - 0.5) * 34, y: s.y + (hash(i * 11 + k * 3) - 0.5) * 30, r: 7 + hash(i + k * 5) * 6, d: k % 2 === 0 });
      }
    });
    const bg = Math.round(40 + cg.shadePct * 0.9);
    for (let i = 0; i < bg; i++) {
      const x = hash(cg.seed * 31 + i) * MAP_W;
      const y = hash(cg.seed * 17 + i * 3) * (cg.water ? LAKE_Y - 10 : MAP_H);
      const nearRoad = Math.abs(y - ROAD_Y) < 16;
      const inLoop = cg.loops.some((l) => ((x - l.cx) / (l.rx + 34)) ** 2 + ((y - l.cy) / (l.ry + 34)) ** 2 < 1);
      if (!nearRoad && !inLoop) out.push({ x, y, r: 8 + hash(i * 3.3) * 8, d: i % 3 === 0 });
    }
    return out;
  }, [cg]);

  const byId = useMemo(() => Object.fromEntries(cg.sites.map((s) => [s.id, s])), [cg]);
  const sel = selectedId ? byId[selectedId] : null;
  const hov = hoverId ? byId[hoverId] : null;
  const selRestroom = useMemo(() => {
    if (!sel) return null;
    const loop = cg.loops.find((l) => l.id === sel.loop);
    if (!loop) return null;
    let best = loop.restrooms[0];
    let bd = Infinity;
    loop.restrooms.forEach((r) => {
      const d = Math.hypot(r.x - sel.x, r.y - sel.y);
      if (d < bd) { bd = d; best = r; }
    });
    return best;
  }, [sel, cg]);

  const isRiver = cg.water?.kind === 'River';
  const hasWater = !!cg.water;
  const genLoops = cg.loops.filter((l) => l.generators);
  const lakeName = cg.water?.name ?? '';

  return (
    <svg className="sitemap" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="group" aria-label={`Map of sites at ${cg.name}`}>
      <defs>
        <pattern id="genhatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#f7e3cf" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#efcaa5" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width={MAP_W} height={MAP_H} fill="#eef0e2" />

      {/* Water */}
      {hasWater && !isRiver && (
        <g>
          <path d={`M0 ${LAKE_Y} C 120 ${LAKE_Y - 18}, 220 ${LAKE_Y + 14}, 360 ${LAKE_Y - 4} S 640 ${LAKE_Y - 22}, 760 ${LAKE_Y - 2} S 880 ${LAKE_Y + 6}, ${MAP_W} ${LAKE_Y - 6} V ${MAP_H} H 0 Z`} fill="#a9d0e2" stroke="#8fbdd3" strokeWidth="2" />
          <text x={560} y={MAP_H - 22} className="map-water-label">{lakeName}</text>
        </g>
      )}
      {isRiver && (
        <g>
          <path d={`M0 ${LAKE_Y + 30} C 160 ${LAKE_Y - 10}, 300 ${LAKE_Y + 50}, 470 ${LAKE_Y + 18} S 760 ${LAKE_Y + 40}, ${MAP_W} ${LAKE_Y + 6}`} fill="none" stroke="#a9d0e2" strokeWidth="38" strokeLinecap="round" />
          <text x={580} y={MAP_H - 18} className="map-water-label">{lakeName}</text>
        </g>
      )}
      {cg.features.beach && (
        <g>
          <ellipse cx={cg.features.beach.x} cy={cg.features.beach.y - (isRiver ? -8 : 2)} rx={46} ry={11} fill="#ecdcae" />
          <text x={cg.features.beach.x} y={cg.features.beach.y + (isRiver ? 30 : 24)} textAnchor="middle" className="map-feature-label">{isRiver ? 'Swimming hole' : 'Swim beach'}</text>
        </g>
      )}

      {/* Trees (more trees = more shade) */}
      {trees.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={t.r} fill={t.d ? '#9bbd8f' : '#b5cfa5'} opacity={0.75} />
      ))}

      {/* Generator loops */}
      {genLoops.map((l) => (
        <ellipse key={`g${l.id}`} cx={l.cx} cy={l.cy} rx={l.rx + 34} ry={l.ry + 32} fill="url(#genhatch)" opacity={0.75} />
      ))}

      {/* Roads */}
      <g stroke="#d8d0bd" strokeWidth={12} fill="none" strokeLinecap="round">
        <path d={`M${cg.features.entrance.x} 0 V${ROAD_Y}`} />
        <path d={`M48 ${ROAD_Y} H${MAP_W - 30}`} />
        {cg.loops.filter((l) => l.kind !== 'walkin').map((l) => (
          <path key={l.id} d={`M${l.cx} ${l.top ? l.cy + l.ry : l.cy - l.ry} V${ROAD_Y}`} strokeWidth={9} />
        ))}
        {cg.features.parking && <path d={`M${cg.features.parking.x} ${ROAD_Y} V${cg.features.parking.y}`} strokeWidth={9} />}
      </g>
      {cg.loops.filter((l) => l.kind !== 'walkin').map((l) => (
        <ellipse key={l.id} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill="none" stroke="#d8d0bd" strokeWidth={9} />
      ))}

      {/* Walk-in parking + footpath */}
      {cg.features.parking && (
        <g>
          <rect x={cg.features.parking.x - 26} y={cg.features.parking.y - 14} width={52} height={28} rx={4} fill="#d8d0bd" />
          <text x={cg.features.parking.x} y={cg.features.parking.y + 5} textAnchor="middle" className="map-p">P</text>
          {cg.sites.filter((s) => s.type === 'Walk-in').map((s) => (
            <path key={s.id} d={`M${cg.features.parking!.x} ${cg.features.parking!.y + 14} L${s.x} ${s.y}`} stroke="#c9b98f" strokeWidth={1.5} strokeDasharray="3 4" fill="none" />
          ))}
        </g>
      )}

      {/* Loop labels */}
      {cg.loops.map((l) => {
        const label = l.kind === 'walkin' ? 'Walk-in' : l.kind === 'group' ? 'Group' : `Loop ${l.id}`;
        const lx = l.kind === 'walkin' ? 806 : l.cx;
        const ly = l.kind === 'walkin' ? 462 : l.cy + (cg.features.playground && Math.abs(cg.features.playground.x - l.cx) < 30 && Math.abs(cg.features.playground.y - l.cy) < 10 ? -16 : 5);
        return (
          <g key={`lbl${l.id}`}>
            <text x={lx} y={ly} textAnchor="middle" className="map-loop-label">{label}</text>
            {l.generators && (
              <text x={lx} y={ly + 22} textAnchor="middle" className="map-gen-label">Generators allowed</text>
            )}
          </g>
        );
      })}

      {/* Entrance + store + playground */}
      <g>
        <rect x={cg.features.entrance.x + 12} y={6} width={150} height={26} rx={5} fill="#fff" stroke="#c9c1ad" />
        <text x={cg.features.entrance.x + 87} y={24} textAnchor="middle" className="map-feature-label">Entrance · ranger</text>
      </g>
      {cg.features.store && (
        <g>
          <rect x={cg.features.store.x - 26} y={cg.features.store.y - 13} width={52} height={26} rx={5} fill="#7a5b3a" />
          <text x={cg.features.store.x} y={cg.features.store.y + 5} textAnchor="middle" className="map-icon-text">Store</text>
        </g>
      )}
      {cg.features.playground && (
        <g>
          <circle cx={cg.features.playground.x} cy={cg.features.playground.y} r={11} fill="#f2c94c" stroke="#c99a1d" strokeWidth={2} />
          <text x={cg.features.playground.x} y={cg.features.playground.y + 30} textAnchor="middle" className="map-feature-label">Playground</text>
        </g>
      )}

      {/* Selected site → restroom line */}
      {sel && selRestroom && (
        <g>
          <line x1={sel.x} y1={sel.y} x2={selRestroom.x} y2={selRestroom.y} stroke="#1d2a24" strokeWidth={2.5} strokeDasharray="5 4" />
        </g>
      )}

      {/* Restrooms */}
      {cg.loops.flatMap((l) =>
        l.restrooms.map((r, i) => (
          <g key={`${l.id}r${i}`}>
            <title>{`Restroom${cg.amenities.showers ? ' & showers' : ''}, ${l.kind === 'walkin' ? 'walk-in lot' : `loop ${l.id}`}`}</title>
            <rect x={r.x - 14} y={r.y - 12} width={28} height={24} rx={5} fill="#2c4b6e" stroke="#fff" strokeWidth={1.5} />
            <text x={r.x} y={r.y + 5} textAnchor="middle" className="map-icon-text">WC</text>
          </g>
        )),
      )}

      {/* Sites */}
      {cg.sites.map((s) => {
        const st = siteStatus(s);
        const vis = visible.has(s.id);
        const isSel = s.id === selectedId;
        const isPin = pinned.includes(s.id);
        const fill = st === 'none' ? '#d3cdbf' : !vis ? '#ffffff' : st === 'all' ? '#2f7a5c' : '#e0a43a';
        const stroke = st === 'none' ? '#bdb6a6' : st === 'all' ? '#2f7a5c' : '#c98a22';
        return (
          <g
            key={s.id}
            className={`site-dot ${st === 'none' ? 'booked' : ''}`}
            onClick={() => onSelect(s.id)}
            onMouseEnter={() => onHover(s.id)}
            onMouseLeave={() => onHover(null)}
            tabIndex={st === 'none' ? -1 : 0}
            role="button"
            aria-label={`Site ${s.number}, ${s.restroomM} meters to restroom`}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(s.id)}
            opacity={vis || st === 'none' || isSel ? 1 : 0.55}
          >
            {st !== 'none' && <circle cx={s.x} cy={s.y} r={10.5} fill="transparent" />}
            {isPin && <circle cx={s.x} cy={s.y} r={11} fill="none" stroke="#d9622b" strokeWidth={2.5} />}
            <circle cx={s.x} cy={s.y} r={isSel ? 9 : st === 'none' ? 4.5 : 6.5} fill={fill} stroke={isSel ? '#1d2a24' : stroke} strokeWidth={isSel ? 3 : 1.5} />
          </g>
        );
      })}

      {/* Selected / hover label */}
      {[sel, hov && hov.id !== sel?.id ? hov : null].map((s, i) =>
        s ? (
          <g key={i} pointerEvents="none" transform={`translate(${Math.min(MAP_W - 56, Math.max(56, s.x))} ${s.y - 14})`}>
            <rect x={-54} y={-30} width={108} height={28} rx={6} fill={i === 0 ? '#1d2a24' : '#ffffff'} stroke="#1d2a24" strokeWidth={i === 0 ? 0 : 1.5} />
            <text y={-11} textAnchor="middle" className={i === 0 ? 'map-tip map-tip-sel' : 'map-tip'}>
              {s.number} · {s.restroomM} m
            </text>
          </g>
        ) : null,
      )}

      {/* Scale */}
      <g transform={`translate(20 ${MAP_H - 26})`}>
        <rect x={-6} y={-16} width={(50 / M_PER_UNIT) + 12} height={30} rx={4} fill="#ffffffcc" />
        <line x1={0} y1={6} x2={50 / M_PER_UNIT} y2={6} stroke="#1d2a24" strokeWidth={2} />
        <line x1={0} y1={2} x2={0} y2={10} stroke="#1d2a24" strokeWidth={2} />
        <line x1={50 / M_PER_UNIT} y1={2} x2={50 / M_PER_UNIT} y2={10} stroke="#1d2a24" strokeWidth={2} />
        <text x={(50 / M_PER_UNIT) / 2} y={-3} textAnchor="middle" className="map-feature-label">50 m</text>
      </g>
    </svg>
  );
}
