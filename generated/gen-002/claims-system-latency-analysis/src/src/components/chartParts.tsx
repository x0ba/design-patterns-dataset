// Shared pieces for the SVG time charts: axis labels, change markers, the batch-window band.

import { CHANGE_LOG, M_BATCH_END, M_BATCH_START, type ChangeEvent } from '../data/scenario.ts';
import { hhmm, dayName } from '../lib/format.ts';
import { minuteTicks, type Scale } from '../lib/chart.ts';

export const COLORS = {
  ink: '#1c2430',
  inkSoft: '#4a5566',
  muted: '#7a8494',
  grid: '#e4e8ee',
  gridStrong: '#cfd6df',
  panel: '#ffffff',
  page: '#f3f5f8',
  line: '#dde2e9',
  accent: '#1f5fbf',
  accentSoft: 'rgba(31,95,191,0.10)',
  fail: '#c2412d',
  failSoft: 'rgba(194,65,45,0.14)',
  ok: '#2b7a4b',
  amber: '#b7700b',
  batch: 'rgba(106,78,176,0.10)',
  batchLine: '#6a4eb0',
  cert: '#1f5fbf',
  claims: '#2a9d8f',
  other: '#a9b4c2',
  conn: ['#2a9d8f', '#d9622b', '#4a6fa5'],
};

const SHORT: Record<string, string> = {
  'idv-4.12': 'identity-verify v4.12',
  'cw-hotfix': 'claims-web hotfix',
  'pool-80': 'pool 40 → 80',
  announce: 'plant closure announced',
  batch: 'mainframe batch',
};

export function shortLabel(e: ChangeEvent): string {
  return SHORT[e.id] ?? e.title;
}

interface AxisProps {
  x: Scale;
  m0: number;
  m1: number;
  y: number;
  height?: number;
  showDays?: boolean;
  target?: number;
}

/** Labels along the bottom edge, with day names at midnight. */
export function MinuteAxis({ x, m0, m1, y, target = 7 }: AxisProps) {
  const ticks = minuteTicks(m0, m1, target);
  return (
    <g>
      {ticks.map((m) => {
        const isMidnight = m % 1440 === 0;
        const label = isMidnight ? `${dayName(m)} 00:00` : hhmm(m);
        return (
          <g key={m} transform={`translate(${x(m)},${y})`}>
            <line y1={-4} y2={0} stroke={COLORS.gridStrong} />
            <text
              y={12}
              textAnchor="middle"
              fontSize={11}
              fill={isMidnight ? COLORS.inkSoft : COLORS.muted}
              fontWeight={isMidnight ? 600 : 400}
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Dashed verticals for deploys, config changes and the announcement, with labels above. */
export function EventLines({
  x,
  m0,
  m1,
  top,
  bottom,
  labels = true,
  only,
}: {
  x: Scale;
  m0: number;
  m1: number;
  top: number;
  bottom: number;
  labels?: boolean;
  /** restrict labels to these change ids; all other events still get a dashed line */
  only?: string[];
}) {
  const visible = CHANGE_LOG.filter((e) => e.kind !== 'batch' && e.at >= m0 && e.at <= m1);
  const labelled = (id: string) => (only ? only.includes(id) : true);
  let rowIndex = 0;
  return (
    <g>
      {visible.map((e) => {
        const color = e.kind === 'external' ? COLORS.muted : COLORS.amber;
        const px = x(e.at);
        const showLabel = labels && labelled(e.id);
        const row = rowIndex++ % 2;
        return (
          <g key={e.id}>
            <line x1={px} x2={px} y1={top} y2={bottom} stroke={color} strokeDasharray="4 3" strokeWidth={1.25} />
            {showLabel && (
              <text x={px + 4} y={top + 10 + row * 11} fontSize={10.5} fill={color} fontWeight={600}>
                {shortLabel(e)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Light band over the mainframe batch window. */
export function BatchBand({
  x,
  m0,
  m1,
  top,
  bottom,
  label = true,
  labelAtTop = false,
}: {
  x: Scale;
  m0: number;
  m1: number;
  top: number;
  bottom: number;
  label?: boolean;
  labelAtTop?: boolean;
}) {
  const a = Math.max(m0, M_BATCH_START);
  const b = Math.min(m1, M_BATCH_END);
  if (b <= a) return null;
  return (
    <g>
      <rect x={x(a)} y={top} width={Math.max(1, x(b) - x(a))} height={bottom - top} fill={COLORS.batch} />
      {label && (
        <text x={x(a) + 4} y={labelAtTop ? top + 21 : bottom - 6} fontSize={10.5} fill={COLORS.batchLine} fontWeight={600}>
          mainframe batch 06:00–08:30
        </text>
      )}
    </g>
  );
}

export function YTicks({ ticks, y, x, format }: { ticks: number[]; y: Scale; x: number; format: (v: number) => string }) {
  return (
    <g>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x} x2={x + 1} y1={y(v)} y2={y(v)} stroke="none" />
          <text x={x - 6} y={y(v) + 3.5} textAnchor="end" fontSize={10.5} fill={COLORS.muted}>
            {format(v)}
          </text>
        </g>
      ))}
    </g>
  );
}

export function HGrid({ ticks, y, x0, x1 }: { ticks: number[]; y: Scale; x0: number; x1: number }) {
  return (
    <g>
      {ticks.map((v) => (
        <line key={v} x1={x0} x2={x1} y1={y(v)} y2={y(v)} stroke={COLORS.grid} />
      ))}
    </g>
  );
}
