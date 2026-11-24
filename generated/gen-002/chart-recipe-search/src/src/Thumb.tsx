import { memo } from 'react';
import type { ThumbKind } from './data';

const W = 320;
const H = 190;

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  return (r() + r() + r() + r() - 2) * 1.7;
}

const RDBU = ['#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#f7f7f7', '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f'];
function hex(c: string) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}
function lerpColor(stops: string[], t: number) {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = hex(stops[i]);
  const b = hex(stops[i + 1]);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`;
}
const rdbu = (t: number) => lerpColor(RDBU, t);
const BLUES = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'];
const blues = (t: number) => lerpColor(BLUES, t);

function series(r: () => number, n: number, trend: number, noise: number) {
  return Array.from({ length: n }, (_, i) => (i / n - 0.5) * trend + gauss(r) * noise);
}

function draw(kind: ThumbKind, seed: string) {
  const r = rng(seed + kind);
  const els: JSX.Element[] = [];
  let bg = '#fffdf8';
  switch (kind) {
    case 'winterStripes':
    case 'stripes': {
      const n = kind === 'winterStripes' ? 126 : 150;
      const s = series(r, n, kind === 'winterStripes' ? 2.2 : 3, kind === 'winterStripes' ? 0.55 : 0.3);
      const w = W / n;
      s.forEach((v, i) => els.push(<rect key={i} x={i * w} y={0} width={w + 0.6} height={H} fill={rdbu(0.5 + v / 3.2)} />));
      break;
    }
    case 'heatmap':
    case 'snowCalendar': {
      const rows = 56;
      const cols = 73;
      const cw = (W - 24) / cols;
      const rh = (H - 16) / rows;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let fill: string;
          if (kind === 'heatmap') {
            const v = (y / rows - 0.5) * 0.25 + gauss(r) * 0.13;
            fill = rdbu(0.5 + v);
          } else {
            const doy = x / cols;
            const shrink = (y / rows) * 0.06;
            const inSnow = doy < 0.26 - shrink + gauss(r) * 0.02 || doy > 0.88 + shrink + gauss(r) * 0.02;
            const depth = inSnow ? 0.25 + r() * 0.6 * (doy < 0.2 ? 1 : 0.6) : 0;
            fill = inSnow ? blues(depth) : '#fbfaf6';
          }
          els.push(<rect key={`${x}-${y}`} x={20 + x * cw} y={4 + y * rh} width={cw + 0.3} height={rh + 0.3} fill={fill} />);
        }
      }
      ['1900', '1960', '2020'].forEach((t, i) =>
        els.push(<text key={t} x={2} y={10 + i * 84} fontSize={7} fill="#6b665c">{t}</text>),
      );
      break;
    }
    case 'ribbon': {
      const n = 120;
      const bx = (i: number) => 10 + (i / n) * (W - 20);
      const season = (i: number) => Math.sin(((i / n) * 2 - 0.5) * Math.PI);
      const y = (t: number) => H / 2 - t * 2.1;
      let rec = '';
      let nor = '';
      let recB = '';
      let norB = '';
      for (let i = 0; i <= n; i++) {
        const s = season(i) * 28;
        rec += `${i ? 'L' : 'M'}${bx(i)},${y(s + 30)}`;
        nor += `${i ? 'L' : 'M'}${bx(i)},${y(s + 10)}`;
        recB = `L${bx(i)},${y(s - 36)}` + recB;
        norB = `L${bx(i)},${y(s - 9)}` + norB;
      }
      els.push(<path key="r" d={rec + recB + 'Z'} fill="#e8e1d2" />);
      els.push(<path key="n" d={nor + norB + 'Z'} fill="#c8bca3" />);
      for (let i = 0; i < n; i++) {
        const s = season(i) * 28 + gauss(r) * 8;
        els.push(<line key={i} x1={bx(i)} x2={bx(i)} y1={y(s + 8)} y2={y(s - 8)} stroke="#5b2a3c" strokeWidth={1.4} />);
      }
      els.push(<circle key="c1" cx={bx(31)} cy={y(season(31) * 28 + 31)} r={2.5} fill="#b2182b" />);
      els.push(<circle key="c2" cx={bx(88)} cy={y(season(88) * 28 - 37)} r={2.5} fill="#2166ac" />);
      break;
    }
    case 'ridgeline': {
      const k = 12;
      for (let j = 0; j < k; j++) {
        const base = 30 + j * 12.5;
        const mu = 0.33 + j * 0.025 + gauss(r) * 0.01;
        let d = `M10,${base}`;
        for (let i = 0; i <= 80; i++) {
          const x = i / 80;
          const v = Math.exp(-((x - mu) ** 2) / 0.012) + 0.35 * Math.exp(-((x - mu - 0.2) ** 2) / 0.02);
          d += `L${10 + x * (W - 20)},${base - v * 26}`;
        }
        d += `L${W - 10},${base}Z`;
        els.push(<path key={j} d={d} fill={rdbu(0.25 + j * 0.045)} stroke="#fffdf8" strokeWidth={0.8} />);
      }
      break;
    }
    case 'spiral': {
      bg = '#14161c';
      const cx = W / 2;
      const cy = H / 2;
      for (let yr = 0; yr < 60; yr++) {
        let d = '';
        for (let m = 0; m <= 12; m++) {
          const a = (m / 12) * Math.PI * 2 - Math.PI / 2;
          const rad = 22 + yr * 0.9 + gauss(r) * 4 + Math.max(0, yr - 35) * 0.9;
          d += `${m ? 'L' : 'M'}${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
        }
        els.push(<path key={yr} d={d} fill="none" stroke={lerpColor(['#6d4fb0', '#3f8fb6', '#9fd18a', '#f7d64a', '#f4a582'], yr / 60)} strokeWidth={1} opacity={0.9} />);
      }
      [0.3, 0.6].forEach((q, i) =>
        els.push(<circle key={`g${i}`} cx={cx} cy={cy} r={30 + q * 70} fill="none" stroke="#fff" strokeOpacity={0.25} strokeDasharray="2 3" />),
      );
      break;
    }
    case 'coldBars':
    case 'snowBars': {
      const n = 110;
      const top = kind === 'snowBars' ? 34 : 14;
      const bw = (W - 24) / n;
      const vals = Array.from({ length: n }, (_, i) => Math.max(4, 50 - i * 0.16 + gauss(r) * 9));
      if (kind === 'snowBars')
        vals.forEach((v, i) => els.push(<rect key={`s${i}`} x={12 + i * bw} y={6} width={bw + 0.3} height={22} fill={blues(v / 70)} />));
      vals.forEach((v, i) =>
        els.push(<rect key={i} x={12 + i * bw} y={H - 12 - v * 2.4} width={bw * 0.8} height={v * 2.4} fill={kind === 'snowBars' ? '#7aa6c2' : '#4f7cac'} />),
      );
      if (kind === 'coldBars') {
        els.push(<line key="norm" x1={12} x2={W - 12} y1={H - 12 - 36 * 2.4} y2={H - 12 - 36 * 2.4} stroke="#b4441f" strokeWidth={2} />);
        els.push(<text key="t" x={14} y={H - 16 - 36 * 2.4} fontSize={8} fill="#b4441f">1991–2020 normal</text>);
      }
      els.push(<line key="ax" x1={12} x2={W - 12} y1={H - 12} y2={H - 12} stroke="#6b665c" />);
      void top;
      break;
    }
    case 'smallMultiples': {
      for (let p = 0; p < 12; p++) {
        const px = 8 + (p % 4) * 77;
        const py = 8 + Math.floor(p / 4) * 60;
        els.push(<rect key={`b${p}`} x={px} y={py} width={72} height={54} fill="#f4f1ea" />);
        let up = '';
        let dn = '';
        for (let i = 0; i <= 30; i++) {
          const x = px + 2 + (i / 30) * 68;
          const base = py + 32 - Math.cos((i / 30 - 0.5) * Math.PI) * -6 - p * 0.6 + gauss(r) * 3;
          up += `${i ? 'L' : 'M'}${x},${base - 8}`;
          dn = `L${x},${base + 8}` + dn;
        }
        els.push(<path key={p} d={up + dn + 'Z'} fill="#5d86b3" />);
      }
      break;
    }
    case 'dots': {
      const n = 120;
      const pts = Array.from({ length: n }, (_, i) => 120 - i * 0.45 + gauss(r) * 14);
      pts.forEach((v, i) => els.push(<circle key={i} cx={14 + (i / n) * (W - 28)} cy={v} r={2.2} fill="#2166ac" opacity={0.75} />));
      let d = '';
      for (let i = 19; i < n; i++) {
        const avg = pts.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
        d += `${i === 19 ? 'M' : 'L'}${14 + (i / n) * (W - 28)},${avg}`;
      }
      els.push(<path key="l" d={d} fill="none" stroke="#b2182b" strokeWidth={2.6} />);
      break;
    }
    case 'freezeRange': {
      const n = 100;
      for (let i = 0; i < n; i++) {
        const a = 120 - i * 0.12 + gauss(r) * 9;
        const b = 60 + i * 0.1 + gauss(r) * 8;
        els.push(<line key={i} x1={14 + (i / n) * (W - 28)} x2={14 + (i / n) * (W - 28)} y1={a + 40} y2={b - 30} stroke="#6a9a5b" strokeWidth={2} />);
      }
      break;
    }
    case 'polar': {
      const cx = W / 2;
      const cy = H / 2;
      [30, 55, 80].forEach((g) => els.push(<circle key={`g${g}`} cx={cx} cy={cy} r={g} fill="none" stroke="#e4ddd0" />));
      for (let m = 0; m < 12; m++) {
        const a = (m / 12) * Math.PI * 2 - Math.PI / 2;
        els.push(<line key={`m${m}`} x1={cx} y1={cy} x2={cx + Math.cos(a) * 84} y2={cy + Math.sin(a) * 84} stroke="#eee8dc" />);
      }
      for (let dec = 0; dec < 13; dec++) {
        let d = '';
        for (let i = 0; i <= 72; i++) {
          const th = (i / 72) * Math.PI * 2;
          const a = th - Math.PI / 2;
          const wint = (1 + Math.cos(th)) / 2; // 1 at Jan (top), 0 at Jul
          const rad = 28 + 50 * (1 - wint) + dec * 1.6 * wint + gauss(r) * 0.8;
          d += `${i ? 'L' : 'M'}${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
        }
        els.push(<path key={dec} d={d + 'Z'} fill="none" stroke={rdbu(0.08 + dec * 0.07)} strokeWidth={1.6} />);
      }
      els.push(<text key="j" x={cx + 4} y={12} fontSize={9} fill="#6b665c">Jan</text>);
      els.push(<text key="ju" x={cx + 4} y={H - 4} fontSize={9} fill="#6b665c">Jul</text>);
      break;
    }
    case 'anomalyBars': {
      const n = 120;
      const s = series(r, n, 2.4, 0.6);
      const bw = (W - 20) / n;
      s.forEach((v, i) =>
        els.push(<rect key={i} x={10 + i * bw} y={v > 0 ? H / 2 - v * 32 : H / 2} width={bw * 0.8} height={Math.abs(v) * 32} fill={v > 0 ? '#b2182b' : '#2166ac'} />),
      );
      els.push(<line key="z" x1={10} x2={W - 10} y1={H / 2} y2={H / 2} stroke="#444" strokeWidth={0.6} />);
      break;
    }
    case 'horizon': {
      for (let row = 0; row < 12; row++) {
        const y0 = 6 + row * 15;
        for (let i = 0; i < 100; i++) {
          const v = gauss(r) * 0.5 + (row - 6) * 0.06;
          const t = Math.abs(v);
          els.push(<rect key={`${row}-${i}`} x={10 + i * 3} y={y0 + 13 - Math.min(13, t * 14)} width={3} height={Math.min(13, t * 14)} fill={v > 0 ? lerpColor(['#fddbc7', '#b2182b'], t) : lerpColor(['#d1e5f0', '#2166ac'], t)} />);
        }
      }
      break;
    }
    case 'boxplot': {
      for (let i = 0; i < 12; i++) {
        const x = 18 + i * 25;
        const mid = 120 - i * 3.2 + gauss(r) * 2;
        els.push(<line key={`w${i}`} x1={x + 8} x2={x + 8} y1={mid - 48} y2={mid + 52} stroke="#5a6b7c" />);
        els.push(<rect key={`b${i}`} x={x} y={mid - 18} width={16} height={36} fill="#cfe0ee" stroke="#5a6b7c" />);
        els.push(<line key={`m${i}`} x1={x} x2={x + 16} y1={mid} y2={mid} stroke="#1f3a52" strokeWidth={2} />);
      }
      break;
    }
    case 'beeswarm': {
      for (let i = 0; i < 128; i++) {
        const v = 0.5 + (i / 128 - 0.5) * 0.4 + gauss(r) * 0.12;
        els.push(<circle key={i} cx={20 + v * (W - 40)} cy={H / 2 + gauss(r) * 18} r={3.2} fill={rdbu(i / 128)} stroke="#fffdf8" strokeWidth={0.5} />);
      }
      break;
    }
    case 'fan': {
      const bands = [
        [0.95, 0.05, '#e7ddd0'],
        [0.75, 0.25, '#cdbca6'],
      ] as const;
      bands.forEach(([hi, lo, c], b) => {
        let top = '';
        let bot = '';
        for (let i = 0; i <= 60; i++) {
          const x = 10 + (i / 60) * (W - 20);
          const s = Math.sin(((i / 60) * 2 - 0.5) * Math.PI) * 50;
          top += `${i ? 'L' : 'M'}${x},${H / 2 - s - (hi - 0.5) * 110}`;
          bot = `L${x},${H / 2 - s - (lo - 0.5) * 110}` + bot;
        }
        els.push(<path key={b} d={top + bot + 'Z'} fill={c} />);
      });
      let d = '';
      for (let i = 0; i <= 120; i++) {
        const x = 10 + (i / 120) * (W - 20);
        const s = Math.sin(((i / 120) * 2 - 0.5) * Math.PI) * 50 + gauss(r) * 14;
        d += `${i ? 'L' : 'M'}${x},${H / 2 - s}`;
      }
      els.push(<path key="l" d={d} fill="none" stroke="#7a2e44" strokeWidth={1.4} />);
      break;
    }
    case 'histogram': {
      for (let i = 0; i < 30; i++) {
        const h = Math.exp(-((i - 13) ** 2) / 40) * 140 + r() * 8;
        els.push(<rect key={i} x={12 + i * 10} y={H - 12 - h} width={9} height={h} fill={rdbu(0.15 + i / 40)} />);
      }
      break;
    }
    case 'line': {
      let d = '';
      for (let i = 0; i <= 200; i++) d += `${i ? 'L' : 'M'}${10 + i * 1.5},${H / 2 - Math.sin(i / 8) * 40 + gauss(r) * 9}`;
      els.push(<path key="l" d={d} fill="none" stroke="#3b6e8f" strokeWidth={1} />);
      break;
    }
    case 'map': {
      bg = '#eef1f3';
      els.push(<ellipse key="e" cx={W / 2} cy={H / 2} rx={150} ry={86} fill="#fdfdfd" stroke="#9aa5ad" />);
      for (let i = 0; i < 90; i++) {
        const a = r() * Math.PI * 2;
        const rr = Math.sqrt(r());
        els.push(<circle key={i} cx={W / 2 + Math.cos(a) * rr * 140} cy={H / 2 + Math.sin(a) * rr * 78} r={6 + r() * 10} fill={rdbu(0.5 + r() * 0.5 - (rr < 0.4 ? 0.1 : 0))} opacity={0.7} />);
      }
      break;
    }
    case 'pyramid': {
      for (let i = 0; i < 18; i++) {
        const w = 120 - i * 5 + gauss(r) * 6;
        els.push(<rect key={`l${i}`} x={W / 2 - w} y={H - 12 - i * 9.6} width={w} height={8.5} fill="#5d86b3" />);
        els.push(<rect key={`r${i}`} x={W / 2} y={H - 12 - i * 9.6} width={w * (0.95 + r() * 0.1)} height={8.5} fill="#c9775b" />);
      }
      break;
    }
    case 'monthBars': {
      const v = [12, 30, 90, 150, 230, 320, 260, 70, 160, 200, 60, 12];
      v.forEach((h, i) => els.push(<rect key={i} x={22 + i * 24} y={H - 14 - h * 0.48} width={18} height={h * 0.48} fill="#3f8fb6" />));
      els.push(<rect key="dry" x={8} y={6} width={60} height={H - 20} fill="#e3c799" opacity={0.25} />);
      break;
    }
    case 'sankey': {
      const cols = ['#5d86b3', '#c9775b', '#8aa66b', '#b59fcf'];
      for (let i = 0; i < 4; i++) {
        const y1 = 30 + i * 18;
        const y2 = 20 + i * 44;
        els.push(<path key={i} d={`M40,${y1} C160,${y1} 160,${y2} 280,${y2} L280,${y2 + 26} C160,${y2 + 26} 160,${y1 + 16} 40,${y1 + 16}Z`} fill={cols[i]} opacity={0.6} />);
      }
      els.push(<rect key="s" x={30} y={28} width={10} height={76} fill="#333" />);
      break;
    }
  }
  return { els, bg };
}

export const Thumb = memo(function Thumb({ kind, seed, className }: { kind: ThumbKind; seed: string; className?: string }) {
  const { els, bg } = draw(kind, seed);
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
      <rect width={W} height={H} fill={bg} />
      {els}
    </svg>
  );
});
