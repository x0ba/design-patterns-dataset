import { memo } from 'react';
import { geoFor } from '../geometry';
import type { El, Finishes } from '../types';
import { WIN_H } from '../window';

export const ENAMEL: Record<Finishes['enamel'], string> = { black: '#15130f', red: '#a8231b', ivory: '#efe5c8' };
export const ENAMEL_NAME: Record<Finishes['enamel'], string> = { black: 'Black', red: 'Bulletin red', ivory: 'Ivory' };

export type ViewMode = 'glass' | 'pattern';

interface Props {
  el: El;
  finishes: Finishes;
  mode: ViewMode;
  ghost?: boolean;
  /** inches per screen pixel */
  px?: number;
}

export const GoldDefs = () => (
  <>
    <linearGradient id="gold-matte" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#d9b34e" />
      <stop offset="0.55" stopColor="#cda03a" />
      <stop offset="1" stopColor="#bd902d" />
    </linearGradient>
    <linearGradient id="gold-burnished" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stopColor="#fff1ac" />
      <stop offset="0.22" stopColor="#e6bc4a" />
      <stop offset="0.45" stopColor="#b88625" />
      <stop offset="0.62" stopColor="#f4d878" />
      <stop offset="0.82" stopColor="#c9962d" />
      <stop offset="1" stopColor="#a8771c" />
    </linearGradient>
  </>
);

function ElementArtInner({ el, finishes, mode, ghost, px = 0.125 }: Props) {
  if (!el.visible) return null;
  const g = geoFor(el);
  const c = el.cap;
  const enamel = ENAMEL[finishes.enamel];
  const tf = `translate(${el.x} ${WIN_H - el.y}) scale(${c} ${-c})`;

  if (ghost) {
    return (
      <g transform={tf} pointerEvents="none">
        <path d={g.d} fill="rgba(122,75,214,0.08)" stroke="#7a4bd6" strokeWidth={1.4 * px / c} strokeDasharray={`${4 * px / c} ${3 * px / c}`} strokeLinejoin="round" />
      </g>
    );
  }

  const ow = el.outline.on ? el.outline.w : 0;
  if (mode === 'pattern') {
    const hid = `hatch-${el.id}`;
    const sx = (Math.cos((el.shade.angle * Math.PI) / 180) * el.shade.dist) / c;
    const sy = (Math.sin((el.shade.angle * Math.PI) / 180) * el.shade.dist) / c;
    return (
      <g transform={tf} pointerEvents="none">
        {el.fill === 'gold' && (
          <defs>
            <pattern id={hid} width={0.4 / c} height={0.4 / c} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2={0.4 / c} stroke="#b88625" strokeWidth={0.04 / c} />
            </pattern>
          </defs>
        )}
        {el.shade.on && (
          <path d={g.d} transform={`translate(${sx} ${sy})`} fill="none" stroke="#8a8478" strokeWidth={0.03 / c} strokeDasharray={`${0.12 / c} ${0.08 / c}`} strokeLinejoin="round" />
        )}
        {ow > 0 && <path d={g.d} fill="none" stroke="#9aa4ad" strokeOpacity={0.3} strokeWidth={(2 * ow) / c} strokeLinejoin="round" />}
        <path
          d={g.d}
          fill={el.fill === 'gold' ? `url(#${hid})` : el.fill === 'enamel' ? '#d4d0c6' : 'none'}
          stroke="#1c1914"
          strokeWidth={0.035 / c}
          strokeLinejoin="round"
        />
      </g>
    );
  }

  const fill = el.fill === 'gold' ? (finishes.center === 'burnished' ? 'url(#gold-burnished)' : 'url(#gold-matte)') : el.fill === 'enamel' ? enamel : 'none';
  const steps = el.shade.on ? Math.max(2, Math.min(9, Math.ceil(el.shade.dist / 0.05))) : 0;
  const rad = (el.shade.angle * Math.PI) / 180;
  const shades = [];
  for (let i = steps; i >= 1; i--) {
    const f = i / steps;
    shades.push(
      <path
        key={i}
        d={g.d}
        transform={`translate(${(Math.cos(rad) * el.shade.dist * f) / c} ${(Math.sin(rad) * el.shade.dist * f) / c})`}
        fill={enamel}
        stroke={enamel}
        strokeWidth={(2 * ow) / c}
        strokeLinejoin="round"
      />,
    );
  }
  const noPaint = el.fill === 'none' && !el.outline.on && !el.shade.on;
  return (
    <g transform={tf} pointerEvents="none">
      {shades}
      {noPaint ? (
        <path d={g.d} fill="none" stroke="#6b7480" strokeWidth={1.2 * px / c} strokeDasharray={`${4 * px / c} ${3 * px / c}`} />
      ) : el.fill === 'none' ? (
        <path d={g.d} fill="none" stroke={enamel} strokeWidth={Math.max(ow, 0.02) / c} strokeLinejoin="round" />
      ) : (
        <path d={g.d} fill={fill} stroke={ow > 0 ? enamel : 'none'} strokeWidth={(2 * ow) / c} paintOrder="stroke" strokeLinejoin="round" />
      )}
    </g>
  );
}

export const ElementArt = memo(ElementArtInner);
