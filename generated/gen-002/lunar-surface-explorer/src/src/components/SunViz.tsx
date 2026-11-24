import { useMemo, useRef } from 'react';
import { fmtNum } from '../lib/geo';
import { DAY_MS, elevationSeries } from '../lib/sun';

const FLOOR_FRAC = 0.5; // flat floor spans the middle half of the crater width

export function floorThresholdDeg(widthKm: number, depthKm: number) {
  const R = widthKm / 2;
  return (Math.atan(depthKm / (R * (1 + FLOOR_FRAC))) * 180) / Math.PI;
}

/** Terrain height (km, rim = 0) at horizontal offset x (km) from crater centre. */
function terrainY(x: number, R: number, depth: number) {
  const ax = Math.abs(x);
  const fr = FLOOR_FRAC * R;
  if (ax >= R) return 0;
  if (ax <= fr) return -depth;
  const t = (ax - fr) / (R - fr);
  const w = t * t * (3 - 2 * t);
  return -depth * (1 - w);
}

interface DiagramProps {
  name: string;
  widthKm: number;
  depthKm: number;
  sunEl: number;
  onChange: (deg: number) => void;
}

export function CraterSunDiagram({ name, widthKm, depthKm, sunEl, onChange }: DiagramProps) {
  const R = widthKm / 2;
  const VBW = 380, VBH = 196;
  const xSpan = R * 2.0;
  const px = VBW / (2 * xSpan);
  const ground = 92;
  const py = 44 / depthKm; // vertical stretch so the depth reads ≈ 44 px
  const stretch = py / px;
  const sx = (x: number) => VBW / 2 + x * px;
  const sy = (y: number) => ground - y * py;
  const tanE = Math.tan((Math.max(sunEl, 0) * Math.PI) / 180);

  const { terrainPath, shadowPath, litFloor, litFloorSegs } = useMemo(() => {
    const N = 160;
    const pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const x = -xSpan + (2 * xSpan * i) / N;
      pts.push([x, terrainY(x, R, depthKm)]);
    }
    const tp = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join('') +
      `L${sx(xSpan)} ${VBH}L${sx(-xSpan)} ${VBH}Z`;
    // shadow: from the sun-facing rim (x=-R) along the ray until the terrain rises above it
    let sp = '';
    if (tanE > 0 || sunEl <= 0) {
      const top: string[] = [];
      const bot: string[] = [];
      for (const [x, y] of pts) {
        if (x < -R) continue;
        const ray = sunEl <= 0 ? 99 : -(x + R) * tanE;
        if (y < ray) {
          top.push(`${sx(x).toFixed(1)} ${sy(Math.min(ray, sunEl <= 0 ? 0.6 : ray)).toFixed(1)}`);
          bot.push(`${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`);
        }
      }
      if (top.length > 1) sp = `M${top.join('L')}L${bot.reverse().join('L')}Z`;
    }
    // lit part of the floor
    const fr = FLOOR_FRAC * R;
    let lit = 0;
    const segs: [number, number][] = [];
    if (sunEl > 0) {
      const xs = -R + depthKm / tanE;
      const a = Math.max(-fr, xs), b = fr;
      if (b > a) { lit = (b - a) / (2 * fr); segs.push([a, b]); }
    }
    return { terrainPath: tp, shadowPath: sp, litFloor: Math.min(1, lit), litFloorSegs: segs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [R, depthKm, sunEl]);

  const sunX = sx(-xSpan) + 18;
  const rayY = (x: number) => sy(-(x + R) * tanE);
  const sunCy = Math.max(16, Math.min(rayY(-xSpan + 18 / px), ground - 6));
  const floorPct = Math.round(litFloor * 100);

  return (
    <div className="viz">
      <svg viewBox={`0 0 ${VBW} ${VBH}`} role="img"
        aria-label={`Cross-section of ${name} with the Sun ${fmtNum(sunEl, 1)} degrees above the horizon. ${floorPct}% of the floor is in sunlight.`}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a0e18" /><stop offset="1" stopColor="#141b2b" />
          </linearGradient>
          <linearGradient id="rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6f7280" /><stop offset="1" stopColor="#2a2d38" />
          </linearGradient>
          <clipPath id="clipTerr"><path d={terrainPath} /></clipPath>
        </defs>
        <rect width={VBW} height={VBH} fill="url(#sky)" rx="10" />
        {/* sunlight rays */}
        {sunEl > 0 && (
          <g className="rays">
            {[-26, -12, 0].map((off, i) => {
              // parallel rays; the ray through the sun-facing rim is the key one
              const x0 = -xSpan + 24;
              const yAt = (x: number) => rayY(x) + off;
              // stop at the terrain or shadow boundary
              let xEnd = xSpan;
              for (let x = x0; x <= xSpan; x += 0.4) {
                if (sy(terrainY(x, R, depthKm)) <= yAt(x)) { xEnd = x; break; }
              }
              return <line key={i} x1={sx(x0)} y1={yAt(x0)} x2={sx(xEnd)} y2={yAt(xEnd)} className={i === 2 ? 'ray key' : 'ray'} />;
            })}
          </g>
        )}
        {shadowPath && <path d={shadowPath} className="shadow" />}
        <path d={terrainPath} fill="url(#rock)" />
        <g clipPath="url(#clipTerr)">
          {/* sun-warmed surface lines */}
          <path d={`M${sx(-xSpan)} ${sy(0) + 1}L${sx(-R)} ${sy(0) + 1}`} className="lit-edge" />
          <path d={`M${sx(R)} ${sy(0) + 1}L${sx(xSpan)} ${sy(0) + 1}`} className="lit-edge" />
        </g>
        {litFloorSegs.map(([a, b], i) => (
          <line key={i} x1={sx(a)} x2={sx(b)} y1={sy(-depthKm) + 1.5} y2={sy(-depthKm) + 1.5} className="floor-lit" />
        ))}
        {/* sun */}
        {sunEl > 0 ? (
          <g>
            <circle cx={sunX - 4} cy={sunCy} r="13" className="sun-glow" />
            <circle cx={sunX - 4} cy={sunCy} r="7.5" className="sun" />
          </g>
        ) : (
          <g opacity=".55"><circle cx={sunX - 4} cy={ground + 22} r="7.5" className="sun below" /><text x={sunX + 10} y={ground + 26} className="viz-t">Sun below the horizon</text></g>
        )}
        {/* annotations */}
        <text x={sx(0)} y={sy(-depthKm) + 20} textAnchor="middle" className="viz-t strong">Crater floor</text>
        <line x1={sx(-R)} x2={sx(R)} y1={VBH - 20} y2={VBH - 20} className="dim" />
        <line x1={sx(-R)} x2={sx(-R)} y1={VBH - 25} y2={VBH - 15} className="dim" />
        <line x1={sx(R)} x2={sx(R)} y1={VBH - 25} y2={VBH - 15} className="dim" />
        <text x={sx(0)} y={VBH - 25} textAnchor="middle" className="viz-t">{name} is {fmtNum(widthKm)} km wide</text>
        <text x={sx(-R) - 4} y={sy(0) - 7} textAnchor="end" className="viz-t">rim</text>
      </svg>
      <div className="viz-read">
        <div>
          <span className="viz-big">{floorPct}%</span>
          <span className="viz-cap">of the floor in sunlight</span>
        </div>
        <div className="viz-note">Heights stretched ×{fmtNum(stretch, 0)} so the bowl is visible</div>
      </div>
      <label className="slider-lab" htmlFor="sun-slider">
        <span>Sun height above the horizon</span>
        <b>{fmtNum(sunEl, 1)}°</b>
      </label>
      <input id="sun-slider" type="range" min={0} max={10} step={0.1} value={Math.max(0, sunEl)}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
      <div className="slider-scale"><span>0° horizon</span><span>5°</span><span>10°</span></div>
    </div>
  );
}

/* ───────────── Sun-elevation chart over a month ───────────── */
interface ChartProps {
  lat: number; lon: number; t: number; onJump: (t: number) => void;
  threshold?: { deg: number; label: string } | null;
  placeName: string;
}
export function SunChart({ lat, lon, t, onJump, threshold, placeName }: ChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const W = 380, H = 150, L = 30, Rr = 10, T = 12, B = 24;
  const t0 = t - 3 * DAY_MS;
  const days = 33;
  const series = useMemo(() => elevationSeries(lat, lon, t0, days, 330), [lat, lon, Math.round(t0 / (DAY_MS / 4))]);
  const maxEl = Math.max(...series.map((s) => s.el), threshold ? threshold.deg + 1 : 0);
  const minEl = Math.min(...series.map((s) => s.el));
  const yMax = Math.max(maxEl > 8 ? Math.ceil(maxEl / 10) * 10 : Math.ceil(maxEl) + 1, 3);
  const yMin = Math.min(minEl < -8 ? Math.floor(minEl / 10) * 10 : Math.floor(minEl) - 1, -3);
  const x = (tt: number) => L + ((tt - t0) / (days * DAY_MS)) * (W - L - Rr);
  const y = (e: number) => T + ((yMax - e) / (yMax - yMin)) * (H - T - B);
  const d = series.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)} ${y(s.el).toFixed(1)}`).join('');
  const up = series.map((s) => [x(s.t), y(Math.max(s.el, 0))] as const);
  const area = `M${up[0][0]} ${y(0)}` + up.map(([a, b]) => `L${a.toFixed(1)} ${b.toFixed(1)}`).join('') + `L${up[up.length - 1][0]} ${y(0)}Z`;
  const cur = series.reduce((a, s) => (Math.abs(s.t - t) < Math.abs(a.t - t) ? s : a), series[0]);
  const ticks: number[] = [];
  const first = new Date(t0); first.setUTCHours(0, 0, 0, 0);
  for (let tt = first.getTime() + DAY_MS; tt < t0 + days * DAY_MS; tt += DAY_MS * 7) ticks.push(tt);
  const yTicks = yMax - yMin > 30 ? [-80, -40, 0, 40, 80].filter((v) => v >= yMin && v <= yMax) : [yMin, 0, yMax].filter((v, i, a) => a.indexOf(v) === i);

  const click = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W;
    const tt = t0 + ((fx - L) / (W - L - Rr)) * days * DAY_MS;
    onJump(Math.max(t0, Math.min(t0 + days * DAY_MS, tt)));
  };
  return (
    <figure className="chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} onPointerDown={click} role="img"
        aria-label={`Sun height at ${placeName} over the next month. Click to jump to a date.`}>
        <rect x={L} y={y(0)} width={W - L - Rr} height={H - B - y(0)} className="night-band" />
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - Rr} y1={y(v)} y2={y(v)} className={v === 0 ? 'grid zero' : 'grid'} />
            <text x={L - 5} y={y(v) + 3} textAnchor="end" className="ax">{v}°</text>
          </g>
        ))}
        {ticks.map((tt) => (
          <text key={tt} x={x(tt)} y={H - 7} textAnchor="middle" className="ax">
            {new Date(tt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
          </text>
        ))}
        <path d={area} className="area" />
        <path d={d} className="curve" />
        {threshold && threshold.deg < yMax && (
          <g>
            <line x1={L} x2={W - Rr} y1={y(threshold.deg)} y2={y(threshold.deg)} className="thr" />
            <text x={W - Rr - 2} y={y(threshold.deg) - 5} textAnchor="end" className="thr-t">{threshold.label}</text>
          </g>
        )}
        <line x1={x(cur.t)} x2={x(cur.t)} y1={T - 4} y2={H - B} className="now" />
        <circle cx={x(cur.t)} cy={y(cur.el)} r="4.5" className="now-dot" />
      </svg>
      <figcaption>Shaded area: the Sun is below the horizon (night). Click the chart to jump to a day; the map’s lighting follows.</figcaption>
    </figure>
  );
}
