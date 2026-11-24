import React from 'react';
import { Artwork, Brand, Dieline, Format, Line, Version, Shape, COUNTRY, BRANDS } from './data';
import { PAPRIKA_TEXT, CATEGORY_MASTER } from './regtext';

// ───────────── EAN-13 ─────────────
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
export function eanBits(ean: string): string {
  const d = ean.split('').map(Number);
  const par = PARITY[d[0]];
  let s = '101';
  for (let i = 1; i <= 6; i++) s += (par[i - 1] === 'L' ? L : G)[d[i]];
  s += '01010';
  for (let i = 7; i <= 12; i++) s += R[d[i]];
  return s + '101';
}
export function Barcode({ ean, x = 0, y = 0, w = 95, h = 50, digits = true }: { ean: string; x?: number; y?: number; w?: number; h?: number; digits?: boolean }) {
  const bits = eanBits(ean);
  const qz = (w / 113) * 9; // quiet zones
  const m = (w - qz * 2) / 95;
  const guard = (i: number) => i < 3 || (i >= 45 && i < 50) || i >= 92;
  const rects: React.ReactNode[] = [];
  let i = 0;
  while (i < 95) {
    if (bits[i] === '1') {
      let j = i;
      while (j < 95 && bits[j] === '1' && guard(j) === guard(i)) j++;
      const long = guard(i);
      rects.push(<rect key={i} x={x + qz + i * m} y={y} width={(j - i) * m} height={digits ? (long ? h : h * 0.86) : h} fill="#111" />);
      i = j;
    } else i++;
  }
  const fs = h * 0.13;
  return (
    <g>
      <rect x={x} y={y - 2} width={w} height={h + 4} fill="#fff" />
      {rects}
      {digits && (
        <g fontFamily="ui-monospace, Menlo, monospace" fontSize={fs} fill="#111">
          <text x={x + qz - fs * 0.9} y={y + h + fs * 0.1}>{ean[0]}</text>
          <text x={x + qz + 3 * m + 21 * m} y={y + h + fs * 0.1} textAnchor="middle">{ean.slice(1, 7)}</text>
          <text x={x + qz + 50 * m + 21 * m} y={y + h + fs * 0.1} textAnchor="middle">{ean.slice(7)}</text>
        </g>
      )}
    </g>
  );
}

// ───────────── Recycling marks ─────────────
export function Mobius({ x, y, s, color = '#222' }: { x: number; y: number; s: number; color?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s / 24})`} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3 L17 11 M17 11 l-4.2 .3 M17 11 l1.6-3.8" />
      <path d="M20 16 L10.5 16.4 M10.5 16.4 l2.2-3.5 M10.5 16.4 l2.4 3.3" />
      <path d="M5 15 L9.8 6.6 M9.8 6.6 l.9 4.1 M9.8 6.6 l-4 .6" />
      <text x="12" y="13.5" fontSize="5" textAnchor="middle" fill={color} stroke="none" fontFamily="system-ui" fontWeight="700">5</text>
    </g>
  );
}
export function EuLabel({ x, y, s, kind = 'plastic' }: { x: number; y: number; s: number; kind?: 'plastic' | 'paper' }) {
  const col = kind === 'plastic' ? '#f2c400' : '#2b6cb0';
  return (
    <g transform={`translate(${x},${y}) scale(${s / 24})`}>
      <rect x="0" y="0" width="24" height="24" rx="3.5" fill="#fff" stroke="#111" strokeWidth="1" />
      <rect x="2.5" y="2.5" width="19" height="13" rx="2" fill={col} />
      {kind === 'plastic' ? (
        <path d="M8 6.5 h8 l-1 7 h-6z M7 6.5 h10" stroke="#111" strokeWidth="1" fill="#fff" />
      ) : (
        <path d="M7 6 h10 v8 h-10z M7 8.5 h10" stroke="#111" strokeWidth="1" fill="#fff" />
      )}
      <text x="12" y="21" fontSize="4.2" textAnchor="middle" fontFamily="system-ui" fontWeight="800" fill="#111">{kind === 'plastic' ? 'PLASTIC' : 'PAPER'}</text>
    </g>
  );
}

// ───────────── Pack art ─────────────
function outline(shape: Shape): { d: string; box: [number, number, number, number] } {
  switch (shape) {
    case 'pouch': return { d: 'M28 18 h144 q6 0 6 6 v196 q0 14 -14 18 q-64 10 -128 0 q-14 -4 -14 -18 v-196 q0 -6 6 -6z', box: [22, 18, 156, 222] };
    case 'pillow': return { d: 'M30 22 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l2 2 q4 110 0 220 l-2 2 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-8 6 l-8 -6 l-2 -2 q-4 -110 0 -220z', box: [28, 16, 144, 230] };
    case 'flowwrap': return { d: 'M14 78 l-6 4 l6 4 l-6 4 l6 4 l-6 4 l6 4 l-6 4 l6 4 l-6 4 l6 4 l-6 4 l6 4 l-6 4 l6 4 l-6 4 l6 4 l-6 4 l6 4 l-6 4 l6 4 h172 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 l-6 -4 l6 -4 z', box: [8, 78, 184, 84] };
    case 'tablet': return { d: 'M14 74 h172 v92 h-172z', box: [14, 74, 172, 92] };
    case 'carton': return { d: 'M30 40 h140 v190 h-140z', box: [30, 40, 140, 190] };
    case 'tin': return { d: 'M100 40 a80 80 0 1 1 -0.1 0z', box: [20, 40, 160, 160] };
    case 'jar': return { d: 'M66 22 h68 v18 q30 8 30 40 v150 q0 12 -12 12 h-104 q-12 0 -12 -12 v-150 q0 -32 30 -40z', box: [36, 40, 128, 202] };
    case 'stick': return { d: 'M66 20 h68 v224 h-68z', box: [66, 20, 68, 224] };
    case 'multipack': return { d: 'M24 26 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l4 4 v208 l-4 4 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-6 6 l-6 -6 l-4 -4z', box: [24, 22, 152, 216] };
  }
}

function pid(s: string) {
  return s.replace(/[^a-z0-9]/gi, '');
}

interface ArtProps { brand: Brand; line: Line; format: Format; art: Artwork; version?: Version; side?: 'front' | 'back'; width?: number; className?: string }

export function PackArt({ brand, line, format, art, version, side = 'front', width = 160, className }: ArtProps) {
  const { d, box } = outline(format.shape);
  const [bx, by, bw, bh] = box;
  const id = pid(`${brand.id}${line.id}${format.id}${art.id}${version?.n ?? ''}${side}`);
  const legacy = version?.style === 'legacy';
  const lang = art.langs[0];
  const isPap = brand.id === 'crunchwell' && line.id === 'paprika';
  const denom = isPap ? PAPRIKA_TEXT[lang]?.denomination ?? '' : CATEGORY_MASTER[brand.cat](line.name).denomination;
  const cx = bx + bw / 2;
  const wide = bw > bh;
  const fsBrand = Math.min(bw, bh * 1.4) * (wide ? 0.17 : 0.16);
  const weight = format.name.split(' ').slice(0, 2).join(' ');

  return (
    <svg viewBox="0 0 200 260" width={width} className={className} role="img" aria-label={`${side === 'front' ? 'Front' : 'Back'} panel preview of ${brand.name} ${line.name} ${format.name}, ${art.label}${version ? ', version ' + version.n : ''}`}>
      <defs>
        <clipPath id={`c${id}`}><path d={d} /></clipPath>
        <linearGradient id={`g${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
      </defs>
      <path d={d} fill={side === 'front' ? line.color : '#fbfaf7'} stroke="rgba(0,0,0,.25)" strokeWidth="1" />
      <g clipPath={`url(#c${id})`}>
        {side === 'front' ? (
          <>
            <rect x={bx} y={by + bh * (wide ? 0.08 : 0.1)} width={bw} height={bh * (wide ? 0.36 : 0.22)} fill={brand.color} opacity={brand.id === 'crunchwell' ? 0.0 : 0.9} />
            <ellipse cx={cx} cy={by + bh * (wide ? 0.26 : 0.21)} rx={bw * (legacy ? 0.4 : 0.44)} ry={bh * (wide ? 0.2 : 0.09)} fill={brand.ink} transform={legacy ? '' : `rotate(-6 ${cx} ${by + bh * 0.21})`} />
            <text x={cx} y={by + bh * (wide ? 0.31 : 0.235)} textAnchor="middle" fontSize={fsBrand * (brand.name.length > 10 ? 0.7 : 1)} fontWeight={legacy ? 600 : 900}
              fontStyle={legacy ? 'italic' : 'normal'} fontFamily={legacy ? 'Georgia, serif' : 'system-ui, -apple-system, sans-serif'} fill={brand.color}
              transform={legacy ? '' : `rotate(-6 ${cx} ${by + bh * 0.21})`} letterSpacing={legacy ? 0 : -0.5}>
              {brand.name}
            </text>
            {/* product illustration */}
            {isPap ? (
              <g transform={`translate(${cx - 36},${by + bh * 0.34})`}>
                <path d="M14 22 C5 25 3 38 5 52 C7 68 12 82 21 86 C26 88 29 84 31 81 C34 88 41 88 43 81 C46 86 52 88 56 83 C64 77 68 61 68 46 C68 31 63 22 55 20 C49 18 43 22 37 20 C31 18 22 18 14 22 Z"
                  fill={legacy ? '#e84b26' : '#df3418'} stroke="#7d1a0a" strokeWidth="1.2" />
                <path d="M37 21 C36 26 35 50 33 80" stroke="#a81f0c" strokeWidth="1" fill="none" opacity=".5" />
                <path d="M16 30 q4 -6 11 -6" stroke="#fff" strokeOpacity=".55" strokeWidth="3.2" fill="none" strokeLinecap="round" />
                <path d="M27 22 q10 -8 20 0 q-10 5 -20 0z" fill="#3f7d2c" />
                <path d="M37 18 C37 10 40 5 47 3" stroke="#2f6b2a" strokeWidth="4" fill="none" strokeLinecap="round" />
                {!legacy && <g fill="#b3200c" opacity=".85">{[[60, 70], [64, 62], [55, 76]].map(([x, y]) => <circle key={x} cx={x + 6} cy={y + 8} r="2.2" />)}</g>}
              </g>
            ) : (
              <g transform={`translate(${cx},${by + bh * (wide ? 0.66 : 0.5)})`}>
                {[0, 1, 2].map((k) => (
                  <ellipse key={k} cx={(k - 1) * bw * 0.16} cy={k === 1 ? -6 : 4} rx={bw * 0.14} ry={bh * (wide ? 0.12 : 0.06)} fill={brand.ink} opacity={0.85 - k * 0.12} stroke="rgba(0,0,0,.2)" />
                ))}
              </g>
            )}
            <rect x={bx} y={by + bh * (wide ? 0.8 : 0.72)} width={bw} height={bh * 0.12} fill="rgba(0,0,0,.18)" />
            <text x={cx} y={by + bh * (wide ? 0.88 : 0.79)} textAnchor="middle" fontSize={wide ? 9 : 13} fontWeight={800} fill="#fff" fontFamily="system-ui, sans-serif">
              {line.name.length > 18 ? line.name.slice(0, 17) + '…' : line.name.toUpperCase()}
            </text>
            {!wide && (
              <text x={cx} y={by + bh * 0.88} textAnchor="middle" fontSize="5.4" fill="#fff" fontFamily="system-ui, sans-serif" opacity=".95">
                {denom.length > 46 ? denom.slice(0, 45) + '…' : denom}
              </text>
            )}
            <text x={bx + bw - 8} y={by + bh - (format.shape === 'pouch' ? 14 : 8)} textAnchor="end" fontSize={wide ? 7 : 9} fontWeight={700} fill="#fff" fontFamily="system-ui, sans-serif">{weight} ℮</text>
            {art.marketIds.length > 1 && !wide && (
              <g>
                <rect x={bx + 8} y={by + bh - (format.shape === 'pouch' ? 24 : 18)} width={art.marketIds.length * 13 + 2} height={10} rx="2" fill="rgba(255,255,255,.9)" />
                {art.marketIds.map((m, i) => (
                  <text key={m} x={bx + 10 + i * 13} y={by + bh - (format.shape === 'pouch' ? 16.5 : 10.5)} fontSize="6" fontWeight={700} fill="#333" fontFamily="system-ui">{COUNTRY[m].code}</text>
                ))}
              </g>
            )}
            <rect x={bx} y={by} width={bw} height={bh} fill={`url(#g${id})`} />
          </>
        ) : (
          <BackPanel {...{ bx, by, bw, bh, art, isPap, version, brand, line }} />
        )}
      </g>
      {format.shape === 'pouch' && <path d="M22 220 q78 10 156 0" fill="none" stroke="rgba(0,0,0,.22)" strokeDasharray="3 2" />}
    </svg>
  );
}

function BackPanel({ bx, by, bw, bh, art, isPap, version, brand, line }: { bx: number; by: number; bw: number; bh: number; art: Artwork; isPap: boolean; version?: Version; brand: Brand; line: Line }) {
  const x = bx + 10;
  const w = bw - 20;
  let y = by + 16;
  const nodes: React.ReactNode[] = [];
  art.langs.slice(0, 3).forEach((lang, li) => {
    const t = isPap ? PAPRIKA_TEXT[lang] : undefined;
    const label = t ? `${t.ingredientsLabel}:` : 'Ingredients:';
    nodes.push(<text key={`l${li}`} x={x} y={y} fontSize="4.6" fontWeight={700} fill="#222" fontFamily="system-ui">{lang.toUpperCase()} · {label}</text>);
    y += 5;
    const lines = art.langs.length > 1 ? 3 : 5;
    for (let k = 0; k < lines; k++) {
      nodes.push(<rect key={`r${li}${k}`} x={x} y={y} width={w * (k === lines - 1 ? 0.55 : 0.97)} height="2.2" fill="#9a9a9a" rx=".8" />);
      y += 4;
    }
    y += 3;
  });
  // nutrition table
  nodes.push(<rect key="nt" x={x} y={y} width={w * 0.62} height={44} fill="none" stroke="#333" strokeWidth=".7" />);
  for (let k = 0; k < 8; k++) {
    nodes.push(<line key={`nl${k}`} x1={x} x2={x + w * 0.62} y1={y + 5 + k * 5} y2={y + 5 + k * 5} stroke="#bbb" strokeWidth=".4" />);
    nodes.push(<rect key={`nr${k}`} x={x + 2} y={y + 6.4 + k * 5} width={w * (k % 2 ? 0.22 : 0.32)} height="1.8" fill="#9a9a9a" />);
    nodes.push(<rect key={`nv${k}`} x={x + w * 0.48} y={y + 6.4 + k * 5} width={w * 0.1} height="1.8" fill="#666" />);
  }
  const ny = y;
  y += 52;
  const rec = version?.recycling ?? 'mobius';
  return (
    <g>
      <rect x={bx} y={by} width={bw} height={bh} fill="#fbfaf7" />
      {nodes}
      {rec === 'eu' ? (
        <g>
          <EuLabel x={x + w * 0.68} y={ny} s={w * 0.3} />
          <rect x={x + w * 0.66} y={ny - 2} width={w * 0.34} height={w * 0.34} fill="none" stroke="#e8590c" strokeWidth="1.2" strokeDasharray="2 1.5" rx="2" />
        </g>
      ) : (
        <Mobius x={x + w * 0.7} y={ny + 2} s={w * 0.24} />
      )}
      <text x={x} y={y} fontSize="4" fill="#555" fontFamily="system-ui">{brand.name} · {line.name}</text>
      <Barcode ean={art.ean} x={bx + bw - 10 - 62} y={by + bh - (bh > 200 ? 50 : 40)} w={62} h={30} />
    </g>
  );
}

// ───────────── Dieline drawing ─────────────
export function DielineDrawing({ d, width = 520, highlight }: { d: Dieline; width?: number; highlight?: boolean }) {
  const pad = 26;
  const CUT = '#c2185b';
  const FOLD = '#0277bd';
  const SAFE = '#2e7d32';
  const hatch = <pattern id={`h${d.id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#90a4ae" strokeWidth="1" /></pattern>;
  let W = 0, H = 0;
  const body: React.ReactNode[] = [];
  const dim = (x1: number, y1: number, x2: number, y2: number, label: string, key: string) => {
    const horiz = y1 === y2;
    body.push(
      <g key={key} stroke="#555" strokeWidth=".6" fill="#555" fontSize="8" fontFamily="ui-monospace, Menlo, monospace">
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <line x1={x1} y1={y1 - (horiz ? 3 : 0)} x2={x1} y2={y1 + (horiz ? 3 : 0)} />
        <line x1={x2} y1={y2 - (horiz ? 3 : 0)} x2={x2} y2={y2 + (horiz ? 3 : 0)} />
        {!horiz && <><line x1={x1 - 3} y1={y1} x2={x1 + 3} y2={y1} /><line x1={x2 - 3} y1={y2} x2={x2 + 3} y2={y2} /></>}
        <text stroke="none" x={horiz ? (x1 + x2) / 2 : x1 - 4} y={horiz ? y1 - 4 : (y1 + y2) / 2} textAnchor={horiz ? 'middle' : 'end'}>{label}</text>
      </g>,
    );
  };
  if (d.shape === 'pouch') {
    W = d.w * 2 + 10; H = d.h + d.d;
    const seal = 8, top = 12;
    [0, d.w + 10].forEach((ox, i) => {
      body.push(<rect key={`p${i}`} x={ox} y={0} width={d.w} height={d.h} fill="#fff" stroke={CUT} strokeWidth="1.4" />);
      body.push(<rect key={`ts${i}`} x={ox} y={0} width={d.w} height={top} fill={`url(#h${d.id})`} />);
      body.push(<rect key={`ls${i}`} x={ox} y={0} width={seal} height={d.h} fill={`url(#h${d.id})`} />);
      body.push(<rect key={`rs${i}`} x={ox + d.w - seal} y={0} width={seal} height={d.h} fill={`url(#h${d.id})`} />);
      body.push(<rect key={`sa${i}`} x={ox + seal + 5} y={top + 5} width={d.w - 2 * seal - 10} height={d.h - top - 15} fill="none" stroke={SAFE} strokeDasharray="4 3" strokeWidth=".8" />);
      body.push(<path key={`tn${i}`} d={`M${ox} ${28} l5 2 l-5 2 M${ox + d.w} 28 l-5 2 l5 2`} stroke={CUT} fill="none" />);
      if (d.eurohole) body.push(<ellipse key={`eh${i}`} cx={ox + d.w / 2} cy={9} rx={10} ry={4} fill="none" stroke={CUT} strokeWidth="1.2" />);
      body.push(<text key={`lab${i}`} x={ox + d.w / 2} y={d.h / 2} textAnchor="middle" fontSize="13" fill="#b0bec5" fontFamily="system-ui" fontWeight="700">{i === 0 ? 'FRONT' : 'BACK'}</text>);
    });
    body.push(<rect key="bc" x={d.w + 10 + d.w - seal - 5 - 40} y={d.h - 10 - 30} width={40} height={30} fill="#fff8e1" stroke="#f9a825" strokeDasharray="3 2" />);
    body.push(<text key="bct" x={d.w + 10 + d.w - seal - 25} y={d.h - 22} textAnchor="middle" fontSize="6.5" fill="#8d6e00" fontFamily="system-ui">BARCODE ZONE</text>);
    body.push(<rect key="g" x={d.w / 2} y={d.h} width={d.w + 10} height={d.d} fill="#fff" stroke={CUT} strokeWidth="1.4" />);
    body.push(<line key="gf" x1={d.w / 2} x2={d.w * 1.5 + 10} y1={d.h + d.d / 2} y2={d.h + d.d / 2} stroke={FOLD} strokeDasharray="6 3" />);
    body.push(<text key="gt" x={d.w + 5} y={d.h + d.d / 2 - 4} textAnchor="middle" fontSize="7" fill={FOLD} fontFamily="system-ui">bottom gusset fold</text>);
    dim(0, -10, d.w, -10, `${d.w} mm`, 'dw');
    dim(-8, 0, -8, d.h, `${d.h}`, 'dh');
    dim(d.w * 1.5 + 22, d.h, d.w * 1.5 + 22, d.h + d.d, `${d.d}`, 'dd');
  } else if (d.shape === 'carton') {
    const { w, h, d: dp } = d;
    W = 2 * w + 2 * dp + 14; H = h + 2 * dp;
    const xs = [0, dp, dp + w, 2 * dp + w];
    const ws = [dp, w, dp, w];
    xs.forEach((x, i) => body.push(<rect key={`c${i}`} x={x} y={dp} width={ws[i]} height={h} fill="#fff" stroke={CUT} strokeWidth="1.3" />));
    body.push(<rect key="glue" x={2 * dp + 2 * w} y={dp + 6} width={14} height={h - 12} fill={`url(#h${d.id})`} stroke={CUT} />);
    body.push(<rect key="top" x={dp} y={0} width={w} height={dp} fill="#fff" stroke={CUT} strokeWidth="1.3" />);
    body.push(<rect key="bot" x={dp} y={dp + h} width={w} height={dp} fill="#fff" stroke={CUT} strokeWidth="1.3" />);
    [dp, dp + w, 2 * dp + w].forEach((x, i) => body.push(<line key={`f${i}`} x1={x} x2={x} y1={dp} y2={dp + h} stroke={FOLD} strokeDasharray="6 3" />));
    body.push(<line key="ft" x1={dp} x2={dp + w} y1={dp} y2={dp} stroke={FOLD} strokeDasharray="6 3" />);
    body.push(<line key="fb" x1={dp} x2={dp + w} y1={dp + h} y2={dp + h} stroke={FOLD} strokeDasharray="6 3" />);
    body.push(<text key="fl" x={dp + w / 2} y={dp + h / 2} textAnchor="middle" fontSize="13" fill="#b0bec5" fontFamily="system-ui" fontWeight="700">FRONT</text>);
    dim(dp, -10, dp + w, -10, `${w} mm`, 'dw');
    dim(-8, dp, -8, dp + h, `${h}`, 'dh');
  } else if (d.shape === 'tin') {
    W = d.w * 2.4 + 20; H = Math.max(d.w, d.h) + 10;
    body.push(<circle key="lid" cx={d.w / 2} cy={d.w / 2} r={d.w / 2} fill="#fff" stroke={CUT} strokeWidth="1.3" />);
    body.push(<circle key="lids" cx={d.w / 2} cy={d.w / 2} r={d.w / 2 - 6} fill="none" stroke={SAFE} strokeDasharray="4 3" />);
    body.push(<rect key="band" x={d.w + 20} y={d.w / 2 - d.h / 2} width={d.w * 1.4} height={d.h} fill="#fff" stroke={CUT} strokeWidth="1.3" />);
    body.push(<text key="t1" x={d.w / 2} y={d.w / 2 + 4} textAnchor="middle" fontSize="11" fill="#b0bec5" fontFamily="system-ui" fontWeight="700">LID</text>);
    body.push(<text key="t2" x={d.w * 1.7 + 20} y={d.w / 2 + 4} textAnchor="middle" fontSize="11" fill="#b0bec5" fontFamily="system-ui" fontWeight="700">BODY WRAP (not to scale)</text>);
    dim(0, -6, d.w, -6, `Ø ${d.w} mm`, 'dw');
  } else {
    // flow-wrap / pillow / web-type packs: one web with centre fin seal and crimp zones
    const fin = 10;
    W = d.w * 2 + fin * 2; H = d.h;
    const crimp = d.shape === 'flowwrap' || d.shape === 'tablet' ? 0 : 14;
    body.push(<rect key="web" x={0} y={0} width={W} height={H} fill="#fff" stroke={CUT} strokeWidth="1.4" />);
    body.push(<rect key="fin1" x={0} y={0} width={fin} height={H} fill={`url(#h${d.id})`} />);
    body.push(<rect key="fin2" x={W - fin} y={0} width={fin} height={H} fill={`url(#h${d.id})`} />);
    if (crimp) {
      body.push(<rect key="ct" x={0} y={0} width={W} height={crimp} fill={`url(#h${d.id})`} />);
      body.push(<rect key="cb" x={0} y={H - crimp} width={W} height={crimp} fill={`url(#h${d.id})`} />);
    } else {
      body.push(<rect key="cl" x={0} y={0} width={W} height={10} fill={`url(#h${d.id})`} />);
      body.push(<rect key="cr" x={0} y={H - 10} width={W} height={10} fill={`url(#h${d.id})`} />);
    }
    [fin + d.w / 2, fin + d.w * 1.5].forEach((x, i) => body.push(<line key={`f${i}`} x1={x} x2={x} y1={0} y2={H} stroke={FOLD} strokeDasharray="6 3" />));
    body.push(<text key="fr" x={fin + d.w} y={H / 2} textAnchor="middle" fontSize="13" fill="#b0bec5" fontFamily="system-ui" fontWeight="700">FRONT</text>);
    body.push(<text key="bk" x={fin + d.w / 4} y={H / 2} textAnchor="middle" fontSize="9" fill="#b0bec5" fontFamily="system-ui" fontWeight="700">BACK</text>);
    if (d.eurohole) body.push(<ellipse key="eh" cx={fin + d.w} cy={crimp + 8} rx={10} ry={4} fill="none" stroke={CUT} />);
    dim(0, -10, W, -10, `web ${W} mm`, 'dw');
    dim(-8, 0, -8, H, `${H}`, 'dh');
  }
  const vb = `${-pad - 30} ${-pad - 6} ${W + pad * 2 + 40} ${H + pad * 2 + 12}`;
  return (
    <svg viewBox={vb} width={width} className={highlight ? 'dieline hl' : 'dieline'} role="img" aria-label={`Dieline drawing ${d.id}`}>
      <defs>{hatch}</defs>
      <rect x={-pad - 30} y={-pad - 6} width={W + pad * 2 + 40} height={H + pad * 2 + 12} fill="#f7f9fa" />
      <rect x={-3} y={-3} width={W + 6} height={H + 6} fill="none" stroke="#9e9e9e" strokeDasharray="1.5 2" strokeWidth=".8" />
      {body}
    </svg>
  );
}

export function DielineLegend() {
  return (
    <div className="legend">
      <span><i style={{ borderColor: '#c2185b' }} /> Cut</span>
      <span><i style={{ borderColor: '#0277bd', borderStyle: 'dashed' }} /> Fold</span>
      <span><i className="hatch" /> Seal</span>
      <span><i style={{ borderColor: '#2e7d32', borderStyle: 'dashed' }} /> Safe area</span>
      <span><i style={{ borderColor: '#9e9e9e', borderStyle: 'dotted' }} /> Bleed 3 mm</span>
    </div>
  );
}

// ───────────── Asset icons ─────────────
export function AssetIcon({ icon, brandId, size = 96 }: { icon: string; brandId?: string; size?: number }) {
  const brand = BRANDS.find((b) => b.id === brandId);
  let inner: React.ReactNode = null;
  if (icon.startsWith('logo:') && brand) {
    const v = icon.split(':')[1];
    const bg = v === 'reversed' ? brand.color : '#fff';
    const fg = v === 'mono' ? '#111' : v === 'reversed' ? brand.ink : brand.color;
    inner = (
      <>
        <rect x="0" y="0" width="100" height="100" fill={bg} />
        <text x="50" y="57" textAnchor="middle" fontSize={brand.name.length > 10 ? 12 : 17} fontWeight={900} fill={fg} fontFamily="system-ui" transform="rotate(-6 50 52)">{brand.name}</text>
        <text x="72" y="40" fontSize="6" fill={fg}>®</text>
      </>
    );
  } else {
    const map: Record<string, React.ReactNode> = {
      emark: <text x="50" y="66" textAnchor="middle" fontSize="54" fontFamily="Georgia, serif" fill="#111">℮</text>,
      reg: <><circle cx="50" cy="50" r="26" fill="none" stroke="#111" strokeWidth="4" /><text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="700" fontFamily="system-ui" fill="#111">R</text></>,
      greendot: <><circle cx="50" cy="50" r="30" fill="#fff" stroke="#111" strokeWidth="2" /><path d="M50 22 a28 28 0 0 0 0 56 z" fill="#3a9b3a" /><path d="M50 22 a28 28 0 0 1 0 56 z" fill="#2c5f9e" /><path d="M36 38 q14 -10 14 12 q0 22 14 12" fill="none" stroke="#fff" strokeWidth="5" /></>,
      age: <><circle cx="50" cy="50" r="30" fill="#fff" stroke="#c62828" strokeWidth="6" /><text x="50" y="58" textAnchor="middle" fontSize="20" fontWeight="800" fontFamily="system-ui" fill="#111">0–3</text><line x1="29" y1="29" x2="71" y2="71" stroke="#c62828" strokeWidth="6" /></>,
      fsc: <><rect x="22" y="18" width="56" height="64" rx="6" fill="#fff" stroke="#1b5e20" strokeWidth="3" /><path d="M50 28 l14 22 h-8 l10 14 h-32 l10 -14 h-8z" fill="#1b5e20" /><text x="50" y="76" textAnchor="middle" fontSize="9" fontWeight="800" fill="#1b5e20" fontFamily="system-ui">FSC MIX</text></>,
      vegan: <><circle cx="50" cy="50" r="30" fill="#7cb342" /><text x="50" y="58" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Georgia, serif">V</text></>,
      nutri: <g>{['#038141', '#85bb2f', '#fecb02', '#ee8100', '#e63e11'].map((c, i) => <rect key={i} x={12 + i * 15.5} y={i === 1 ? 32 : 38} width="15" height={i === 1 ? 36 : 24} rx="3" fill={c} />)}<text x="39" y="57" textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff" fontFamily="system-ui">B</text></g>,
      eu: <EuLabel x={20} y={20} s={60} />,
      eupaper: <EuLabel x={20} y={20} s={60} kind="paper" />,
      mobius: <Mobius x={18} y={18} s={64} />,
      triman: <><circle cx="50" cy="44" r="22" fill="none" stroke="#111" strokeWidth="3" /><path d="M40 38 l10 -8 l10 8 M50 30 v26 M36 50 l14 6 l14 -6" stroke="#111" strokeWidth="3" fill="none" /><text x="50" y="84" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="system-ui">TRIMAN</text></>,
      tidyman: <><circle cx="40" cy="26" r="7" fill="#111" /><path d="M40 34 l-4 20 l-8 18 M38 46 l14 -6 M36 54 l6 18" stroke="#111" strokeWidth="5" fill="none" strokeLinecap="round" /><rect x="58" y="44" width="18" height="28" fill="#111" /><rect x="56" y="40" width="22" height="5" fill="#111" /></>,
      oprl: <><rect x="12" y="26" width="76" height="48" rx="6" fill="#00703c" /><text x="50" y="48" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="system-ui">RECYCLE</text><text x="50" y="62" textAnchor="middle" fontSize="7" fill="#fff" fontFamily="system-ui">with bags at large stores</text></>,
      bin: <><rect x="32" y="34" width="36" height="44" rx="3" fill="#f5c400" stroke="#111" strokeWidth="2" /><rect x="28" y="28" width="44" height="7" fill="#111" /><line x1="20" y1="80" x2="80" y2="20" stroke="#c62828" strokeWidth="5" /></>,
    };
    inner = map[icon] ?? null;
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" fill="#fff" />
      {inner}
    </svg>
  );
}
