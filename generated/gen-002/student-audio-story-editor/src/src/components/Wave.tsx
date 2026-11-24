import { memo } from 'react';
import { inRanges, maxPeak } from '../model';

interface Props {
  peaks: number[];
  a: number;
  b: number;
  width: number;
  height: number;
  color: string;
  dimColor?: string;
  used?: [number, number][];
  bar?: number;
  gap?: number;
  className?: string;
}

export const Wave = memo(function Wave({ peaks, a, b, width, height, color, dimColor, used, bar = 2, gap = 1, className }: Props) {
  const w = Math.max(1, Math.floor(width));
  const n = Math.max(1, Math.floor(w / (bar + gap)));
  const step = (b - a) / n;
  const mid = height / 2;
  let pOn = '';
  let pOff = '';
  for (let i = 0; i < n; i++) {
    const t0 = a + i * step;
    const v = maxPeak(peaks, t0, t0 + step);
    const h = Math.max(1, v * (height - 2));
    const x = i * (bar + gap);
    const seg = `M${x} ${(mid - h / 2).toFixed(1)}h${bar}v${h.toFixed(1)}h${-bar}z`;
    if (!used || inRanges(t0 + step / 2, used)) pOn += seg;
    else pOff += seg;
  }
  return (
    <svg className={className} width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden>
      {pOff && <path d={pOff} fill={dimColor ?? '#c9c4bb'} />}
      <path d={pOn} fill={color} />
    </svg>
  );
});
