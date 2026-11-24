import { shortTitle } from '../lib/lookup.js';
import { PIN_TYPES } from '../data/types.js';

// Floor plan drawn in plan metres (north up). Rooms are clickable: clicking one says where you are.
export default function PlanView({
  floor,
  pins = [],
  selectedId,
  onPin,
  onRoom,
  userRoom,
  highlightRoom,
  compact = false,
  showLabels = true,
}) {
  const W = floor.w;
  const H = floor.h;
  const pad = 0.9;
  const Y = (y) => H - y; // plan north-up -> SVG down

  const selected = pins.find((p) => p.id === selectedId);

  return (
    <svg
      className={`plan${compact ? ' compact' : ''}`}
      viewBox={`${-pad} ${-pad - 0.4} ${W + pad * 2} ${H + pad * 2 + 0.4}`}
      role="img"
      aria-label={`${floor.label} plan`}
    >
      {/* exterior wall and floor */}
      <rect x="0" y="0" width={W} height={H} className="plan-shell" />

      {/* stair void on upper floor */}
      {floor.stair && (
        <g>
          <rect x={floor.stair.x} y={Y(floor.stair.y + floor.stair.h)} width={floor.stair.w} height={floor.stair.h} className="plan-stair" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <line
              key={i}
              x1={floor.stair.x}
              x2={floor.stair.x + floor.stair.w}
              y1={Y(floor.stair.y + floor.stair.h) + (i * floor.stair.h) / 7}
              y2={Y(floor.stair.y + floor.stair.h) + (i * floor.stair.h) / 7}
              className="plan-stair-line"
            />
          ))}
        </g>
      )}

      {/* rooms */}
      {floor.rooms.map((r) => {
        const isUser = userRoom === r.id;
        const isHi = highlightRoom === r.id;
        return (
          <g
            key={r.id}
            className={`plan-room${isUser ? ' is-user' : ''}${isHi ? ' is-hi' : ''}`}
            onClick={onRoom ? () => onRoom(r.id) : undefined}
            role={onRoom ? 'button' : undefined}
            tabIndex={onRoom ? 0 : undefined}
            onKeyDown={onRoom ? (e) => { if (e.key === 'Enter' || e.key === ' ') onRoom(r.id); } : undefined}
            aria-label={onRoom ? `${r.name}: set as your location` : undefined}
          >
            <rect x={r.x} y={Y(r.y + r.h)} width={r.w} height={r.h} className="plan-room-rect" />
            {showLabels && (
              <text x={r.lx ?? r.x + 0.15} y={Y(r.ly ?? r.y + 0.3)} className="plan-label">
                {r.name}
              </text>
            )}
          </g>
        );
      })}

      {/* north hatch on the crawlspace foundation */}
      {floor.hatch && (
        <g>
          <rect x={floor.hatch.x} y={-0.2} width={floor.hatch.w} height={0.22} className="plan-hatch" />
          <text x={floor.hatch.x + floor.hatch.w / 2} y={-0.35} className="plan-hatch-label">
            north hatch
          </text>
        </g>
      )}

      {/* "you are here" marker */}
      {userRoom && floor.rooms.some((r) => r.id === userRoom) && (() => {
        const r = floor.rooms.find((x) => x.id === userRoom);
        const tagX = r.x + 0.08;
        const tagY = Y(r.y + r.h) + 0.08;
        return (
          <g className="plan-you" aria-label="You are here">
            <rect x={r.x + 0.04} y={Y(r.y + r.h) + 0.04} width={r.w - 0.08} height={r.h - 0.08} className="plan-you-outline" />
            <rect x={tagX} y={tagY} width="0.62" height="0.3" rx="0.1" />
            <text x={tagX + 0.31} y={tagY + 0.22} textAnchor="middle">YOU</text>
          </g>
        );
      })()}

      {/* pins */}
      {pins.map((p) => {
        const isSel = p.id === selectedId;
        return (
          <g
            key={p.id}
            className={`plan-pin${isSel ? ' is-sel' : ''}`}
            onClick={onPin ? (e) => { e.stopPropagation(); onPin(p); } : undefined}
            role={onPin ? 'button' : undefined}
            tabIndex={onPin ? 0 : undefined}
            onKeyDown={onPin ? (e) => { if (e.key === 'Enter') onPin(p); } : undefined}
            aria-label={`${p.id}: ${p.title}`}
          >
            <title>{`${p.id} · ${p.title}`}</title>
            {isSel && <circle cx={p.x} cy={Y(p.y)} r="0.42" className="plan-pin-ring" />}
            <circle cx={p.x} cy={Y(p.y)} r={isSel ? 0.26 : 0.19} style={{ fill: pinColor(p.type) }} className="plan-pin-dot" />
          </g>
        );
      })}

      {/* selected label, drawn last so it sits on top */}
      {selected && (() => {
        const label = shortTitle(selected.title);
        const onRight = selected.x < W - 4;
        const x = onRight ? selected.x + 0.5 : selected.x - 0.5;
        const y = Y(selected.y);
        const w = label.length * (compact ? 0.2 : 0.17) + 0.35;
        return (
          <g className="plan-callout" pointerEvents="none">
            <rect x={onRight ? x - 0.12 : x - w + 0.12} y={y - 0.3} width={w} height={0.44} rx="0.08" />
            <text x={onRight ? x : x - w + 0.25} y={y + 0.02}>{label}</text>
          </g>
        );
      })()}
    </svg>
  );
}

export function pinColor(type) {
  return PIN_TYPES[type]?.color || '#56606b';
}
