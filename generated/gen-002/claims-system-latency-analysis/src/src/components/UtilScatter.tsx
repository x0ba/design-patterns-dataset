// Every connector-minute in the 72 hours: how full the pool was against how many requests failed.
// Canvas, because there are about 13,000 points.

import { useEffect, useRef } from 'react';
import type { Dataset } from '../data/generate.ts';
import { CONNECTORS, MINUTES, POOL_AFTER } from '../data/scenario.ts';
import { linScale, niceTicks, useWidth } from '../lib/chart.ts';
import { COLORS } from './chartParts.tsx';

const H = 280;
const LEFT = 50;
const BOTTOM = 36;
const TOP = 10;
const RIGHT = 12;
const X_MAX = 2.5;

export function UtilScatter({ ds, highlight }: { ds: Dataset; highlight: [number, number] | null }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, H);

    const xs = linScale(0, X_MAX, LEFT, width - RIGHT);
    const yMax = 0.35;
    const ys = linScale(0, yMax, H - BOTTOM, TOP);

    // axes and grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = '10.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of niceTicks(0, yMax, 5)) {
      ctx.beginPath();
      ctx.moveTo(LEFT, ys(v) + 0.5);
      ctx.lineTo(width - RIGHT, ys(v) + 0.5);
      ctx.stroke();
      ctx.fillText(`${Math.round(v * 100)}%`, LEFT - 6, ys(v));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of [0, 0.5, 1, 1.5, 2, 2.5]) {
      ctx.fillText(v === 1 ? '1.0 · pool full' : v.toFixed(1), xs(v), H - BOTTOM + 8);
    }
    // pool-full line
    ctx.strokeStyle = COLORS.ink;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xs(1) + 0.5, TOP);
    ctx.lineTo(xs(1) + 0.5, H - BOTTOM);
    ctx.stroke();
    ctx.setLineDash([]);

    // points
    const C = CONNECTORS.length;
    for (let m = 0; m < MINUTES; m++) {
      const inHighlight = highlight ? m >= highlight[0] && m < highlight[1] : true;
      for (let c = 0; c < C; c++) {
        const i = m * C + c;
        const reqs = ds.reqC[i];
        if (reqs < 10) continue;
        const util = ds.concC[i] / ds.pool[m];
        const rate = ds.failC[i] / reqs;
        const px = xs(Math.min(util, X_MAX));
        const py = ys(Math.min(rate, yMax));
        const color = COLORS.conn[c];
        ctx.globalAlpha = inHighlight ? 0.55 : 0.12;
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        if (ds.pool[m] >= POOL_AFTER) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Failed share of requests (connector-minute)', LEFT, 10);
    ctx.textAlign = 'center';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText('Implied pool utilisation (sessions ÷ pool limit)', (LEFT + width - RIGHT) / 2, H - 4);
  }, [ds, width, highlight]);

  return (
    <div ref={wrapRef} className="util-scatter">
      <canvas ref={canvasRef} style={{ width, height: H, display: 'block' }} role="img" aria-label="Scatter of pool utilisation against failure share for each connector-minute" />
      <div className="conc-legend">
        {CONNECTORS.map((id, c) => (
          <span key={id} className="legend-item">
            <i style={{ background: COLORS.conn[c] }} />
            {id}
          </span>
        ))}
        <span className="legend-item">
          <i className="hollow" />
          pool 80 (after 10:38 Mon)
        </span>
        <span className="legend-item">
          <i className="solid" />
          pool 40
        </span>
      </div>
    </div>
  );
}
