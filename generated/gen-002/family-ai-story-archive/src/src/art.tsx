import { useId } from 'react';
import type { ReactNode } from 'react';
import type { Story } from './types';

// ---- deterministic helpers ----
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Palette { top: string; bottom: string; deep: string; mid: string; glow: string; light: string }
const PALETTES: Palette[] = [
  { top: '#1c2046', bottom: '#4f55a6', deep: '#12163a', mid: '#2b3070', glow: '#f6c96b', light: '#7c83d1' },
  { top: '#0e3a49', bottom: '#3a8a97', deep: '#0a2832', mid: '#1b5766', glow: '#ffd98a', light: '#6bb5be' },
  { top: '#2e1a46', bottom: '#8c5ba2', deep: '#1c1030', mid: '#4a2b68', glow: '#ffcf8a', light: '#b788c9' },
  { top: '#3a2a5e', bottom: '#e88c6c', deep: '#251a3e', mid: '#5b3b70', glow: '#ffe6a8', light: '#f0b095' },
  { top: '#11332d', bottom: '#46907a', deep: '#0b221e', mid: '#1f5649', glow: '#f7e79c', light: '#7cc0a8' },
  { top: '#0f1d40', bottom: '#2f5fa8', deep: '#09132c', mid: '#1c3b75', glow: '#fff0b8', light: '#6f9ad8' },
];

type Motif = 'lighthouse' | 'sea' | 'forest' | 'mountain' | 'sky' | 'castle' | 'town' | 'field' | 'desert';
const MOTIF: Record<string, Motif> = {
  lighthouse: 'lighthouse', ocean: 'sea', seaside: 'sea', island: 'sea', ship: 'sea',
  forest: 'forest', treehouse: 'forest', campsite: 'forest',
  mountain: 'mountain', snow: 'mountain', cave: 'mountain',
  moon: 'sky', space: 'sky', castle: 'castle',
  village: 'town', bakery: 'town', library: 'town', train: 'town',
  garden: 'field', farm: 'field', 'rainy day': 'field', desert: 'desert',
};

// ---- characters (drawn in a 100x100 box, feet near y=92) ----
function Dragon() {
  return (
    <g>
      <path d="M26 70 C8 74 2 60 10 50 C12 58 20 60 28 60Z" fill="#d9603a" />
      <path d="M8 52 l6 -9 l3 11z" fill="#f6c96b" />
      <path d="M40 52 C28 38 30 20 36 14 C42 26 52 34 56 46Z" fill="#c24f33" />
      <ellipse cx="50" cy="66" rx="28" ry="21" fill="#ef7a4b" />
      <ellipse cx="55" cy="72" rx="17" ry="13" fill="#fbe0a8" />
      <path d="M30 50 l-3 -9 l8 5z M40 45 l-2 -10 l8 6z M50 44 l0 -10 l7 7z" fill="#f6c96b" />
      <rect x="35" y="80" width="11" height="12" rx="5" fill="#d9603a" />
      <rect x="58" y="80" width="11" height="12" rx="5" fill="#d9603a" />
      <circle cx="73" cy="42" r="14" fill="#ef7a4b" />
      <ellipse cx="84" cy="47" rx="10" ry="7" fill="#f58a58" />
      <path d="M67 31 l-3 -11 l9 7z M76 29 l2 -11 l6 9z" fill="#fbe0a8" />
      <circle cx="75" cy="39" r="3.2" fill="#1b1b2f" />
      <circle cx="76" cy="38" r="1" fill="#fff" />
      <circle cx="88" cy="45" r="1.4" fill="#9b3a22" />
      <path d="M80 52 q5 2 10 0" stroke="#9b3a22" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  );
}
function Dog() {
  return (
    <g>
      <path d="M24 62 C12 58 10 46 16 40 C18 50 24 54 30 56Z" fill="#b87a42" />
      <ellipse cx="46" cy="68" rx="25" ry="18" fill="#d49a5c" />
      <ellipse cx="50" cy="73" rx="14" ry="11" fill="#f3dcb8" />
      <rect x="30" y="78" width="10" height="14" rx="5" fill="#c58846" />
      <rect x="54" y="78" width="10" height="14" rx="5" fill="#c58846" />
      <circle cx="68" cy="44" r="15" fill="#d49a5c" />
      <ellipse cx="79" cy="50" rx="9" ry="7" fill="#f3dcb8" />
      <ellipse cx="86" cy="48" rx="3.5" ry="2.6" fill="#2a1f2d" />
      <path d="M56 36 C46 36 44 54 52 58 C56 52 58 44 58 38Z" fill="#8f5b2c" />
      <circle cx="71" cy="42" r="2.8" fill="#1b1b2f" />
      <circle cx="72" cy="41" r="0.9" fill="#fff" />
      <path d="M52 28 L84 28 L80 20 C74 14 62 14 56 20Z" fill="#1f2c5c" />
      <rect x="50" y="27" width="36" height="4" rx="2" fill="#f6c96b" />
      <circle cx="67" cy="22" r="2.4" fill="#f6c96b" />
    </g>
  );
}
function Owl() {
  return (
    <g>
      <rect x="6" y="88" width="88" height="5" rx="2.5" fill="#4b3425" />
      <ellipse cx="50" cy="62" rx="26" ry="28" fill="#9a6e48" />
      <ellipse cx="50" cy="70" rx="15" ry="18" fill="#e9d3ae" />
      <path d="M28 40 l-4 -14 l12 8z M72 40 l4 -14 l-12 8z" fill="#7d5835" />
      <circle cx="40" cy="46" r="11" fill="#f7ecd2" />
      <circle cx="60" cy="46" r="11" fill="#f7ecd2" />
      <circle cx="40" cy="46" r="5.5" fill="#2a1f2d" />
      <circle cx="60" cy="46" r="5.5" fill="#2a1f2d" />
      <circle cx="41.5" cy="44.5" r="1.6" fill="#fff" />
      <circle cx="61.5" cy="44.5" r="1.6" fill="#fff" />
      <circle cx="40" cy="46" r="12.5" fill="none" stroke="#f6c96b" strokeWidth="1.8" />
      <circle cx="60" cy="46" r="12.5" fill="none" stroke="#f6c96b" strokeWidth="1.8" />
      <path d="M46 52 l4 7 l4 -7z" fill="#e5a13b" />
      <path d="M32 84 l4 6 M44 86 l2 6 M56 86 l-2 6 M68 84 l-4 6" stroke="#e5a13b" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}
function Fox() {
  return (
    <g>
      <path d="M26 68 C6 76 4 50 20 42 C24 54 28 58 36 60Z" fill="#e57d35" />
      <path d="M8 56 C10 48 14 44 20 42 C17 50 14 54 8 56Z" fill="#fdf1dc" />
      <ellipse cx="48" cy="68" rx="24" ry="18" fill="#ec8a3f" />
      <ellipse cx="52" cy="74" rx="13" ry="10" fill="#fdf1dc" />
      <rect x="34" y="80" width="9" height="12" rx="4.5" fill="#4a2b25" />
      <rect x="56" y="80" width="9" height="12" rx="4.5" fill="#4a2b25" />
      <path d="M56 40 L58 18 L70 32Z M80 40 L78 18 L66 32Z" fill="#ec8a3f" />
      <path d="M59 34 L60 24 L66 32Z M77 34 L76 24 L70 32Z" fill="#4a2b25" />
      <path d="M54 44 C54 32 82 32 82 44 C82 56 74 62 68 62 C62 62 54 56 54 44Z" fill="#ec8a3f" />
      <path d="M56 48 C60 56 68 58 68 58 C68 58 76 56 80 48 C76 52 70 52 68 50 C66 52 60 52 56 48Z" fill="#fdf1dc" />
      <circle cx="62" cy="44" r="2.4" fill="#1b1b2f" />
      <circle cx="74" cy="44" r="2.4" fill="#1b1b2f" />
      <ellipse cx="68" cy="54" rx="3" ry="2.2" fill="#2a1f2d" />
    </g>
  );
}
function Robot() {
  return (
    <g>
      <rect x="28" y="52" width="44" height="32" rx="8" fill="#8fa8c4" />
      <rect x="36" y="60" width="28" height="14" rx="4" fill="#dfe9f3" />
      <circle cx="44" cy="67" r="2.4" fill="#f6c96b" />
      <circle cx="56" cy="67" r="2.4" fill="#ee7a5a" />
      <rect x="34" y="24" width="32" height="26" rx="8" fill="#a6bdd6" />
      <circle cx="43" cy="37" r="4.5" fill="#fff" />
      <circle cx="57" cy="37" r="4.5" fill="#fff" />
      <circle cx="44" cy="37.5" r="2.2" fill="#1b1b2f" />
      <circle cx="58" cy="37.5" r="2.2" fill="#1b1b2f" />
      <path d="M44 45 q6 3 12 0" stroke="#4c6785" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M50 24 V14" stroke="#4c6785" strokeWidth="2.4" />
      <circle cx="50" cy="12" r="4" fill="#f6c96b" />
      <path d="M28 60 l-9 8 M72 60 l9 -4" stroke="#8fa8c4" strokeWidth="5" strokeLinecap="round" />
      <circle cx="38" cy="88" r="6" fill="#4c6785" />
      <circle cx="62" cy="88" r="6" fill="#4c6785" />
    </g>
  );
}
function Whale() {
  return (
    <g>
      <path d="M10 56 C10 36 36 28 58 32 C78 34 92 44 90 56 C88 70 66 76 40 74 C20 72 10 66 10 56Z" fill="#e9e4fa" />
      <path d="M10 54 C2 50 -2 40 4 32 C8 40 14 44 18 46Z" fill="#d2cbf0" />
      <path d="M26 74 C30 82 44 84 52 76Z" fill="#d2cbf0" />
      <circle cx="30" cy="30" r="9" fill="#fff" opacity=".9" />
      <circle cx="42" cy="24" r="11" fill="#fff" opacity=".9" />
      <circle cx="56" cy="29" r="8" fill="#fff" opacity=".9" />
      <circle cx="72" cy="50" r="2.8" fill="#2a2450" />
      <path d="M76 60 q6 2 11 -1" stroke="#8a7ec2" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M64 22 q-2 -8 4 -12 M70 24 q2 -8 9 -9" stroke="#bfe6f7" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}
function Hedgehog() {
  return (
    <g>
      <path d="M14 76 C10 46 30 30 52 32 C74 34 86 54 80 76Z" fill="#6f4d38" />
      <path d="M20 66 l-6 -6 M26 52 l-7 -3 M36 42 l-4 -7 M48 38 l-1 -8 M60 40 l3 -7 M72 48 l6 -5 M78 60 l8 -2" stroke="#4b3225" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 78 C54 58 66 48 80 54 C90 58 92 70 86 78Z" fill="#e8c9a3" />
      <circle cx="78" cy="62" r="2.4" fill="#1b1b2f" />
      <circle cx="90" cy="68" r="3" fill="#2a1f2d" />
      <path d="M30 80 C30 66 52 66 56 80Z" fill="#c94f5f" />
      <rect x="40" y="78" width="9" height="12" rx="4" fill="#e8c9a3" />
      <rect x="62" y="78" width="9" height="12" rx="4" fill="#e8c9a3" />
      <circle cx="73" cy="55" r="9" fill="none" stroke="#f6c96b" strokeWidth="1.6" opacity=".0" />
    </g>
  );
}
const CHAR_ART: Record<string, () => ReactNode> = { ember: Dragon, biscuit: Dog, wick: Owl, juniper: Fox, tinker: Robot, mabel: Whale, pim: Hedgehog };

// ---- motifs ----
function Lighthouse({ x, p, dim }: { x: number; p: Palette; dim?: boolean }) {
  return (
    <g>
      <polygon points={`${x + 8},118 ${x + 300},60 ${x + 300},168`} fill={p.glow} opacity={dim ? 0.1 : 0.2} />
      <polygon points={`${x + 8},118 ${x - 300},76 ${x - 300},160`} fill={p.glow} opacity={dim ? 0.06 : 0.1} />
      <path d={`M${x - 52} 280 C${x - 44} 236 ${x - 30} 214 ${x - 14} 206 L${x + 34} 206 C${x + 56} 216 ${x + 72} 240 ${x + 84} 280Z`} fill="#1a1e3f" />
      <path d={`M${x - 16} 208 L${x - 11} 150 L${x + 31} 150 L${x + 36} 208Z`} fill="#f4eee0" />
      <path d={`M${x - 14.5} 190 L${x - 12.6} 168 L${x + 32.6} 168 L${x + 34.5} 190Z`} fill="#d9604a" />
      <path d={`M${x - 11} 150 L${x - 9} 140 L${x + 29} 140 L${x + 31} 150Z`} fill="#2b2f5b" />
      <rect x={x - 8} y="126" width="36" height="14" rx="2" fill="#2b2f5b" />
      <rect x={x - 4} y="119" width="28" height="22" rx="4" fill={p.glow} />
      <rect x={x + 5} y="119" width="2" height="22" fill="#e3a94b" />
      <circle cx={x + 10} cy="118" r="22" fill={p.glow} opacity=".28" />
      <path d={`M${x - 8} 119 L${x + 10} 100 L${x + 28} 119Z`} fill="#d9604a" />
      <circle cx={x + 10} cy="98" r="3" fill="#f4eee0" />
      <rect x={x + 4} y="170" width="12" height="20" rx="6" fill="#2b2f5b" opacity=".0" />
      <rect x={x + 5} y="192" width="10" height="16" rx="5" fill="#2b2f5b" />
    </g>
  );
}
function Waves({ p, y = 196, boat }: { p: Palette; y?: number; boat?: number }) {
  return (
    <g>
      <rect x="0" y={y} width="400" height={280 - y} fill={p.mid} />
      <path d={`M0 ${y} Q25 ${y - 8} 50 ${y} T100 ${y} T150 ${y} T200 ${y} T250 ${y} T300 ${y} T350 ${y} T400 ${y} V280 H0Z`} fill={p.mid} />
      <path d={`M0 ${y + 24} Q30 ${y + 16} 60 ${y + 24} T120 ${y + 24} T180 ${y + 24} T240 ${y + 24} T300 ${y + 24} T360 ${y + 24} T420 ${y + 24} V280 H0Z`} fill={p.deep} opacity=".55" />
      <path d={`M40 ${y + 10} h30 M200 ${y + 14} h40 M310 ${y + 8} h26 M120 ${y + 36} h34`} stroke={p.light} strokeWidth="2" strokeLinecap="round" opacity=".5" />
      {boat != null && (
        <g transform={`translate(${boat} ${y - 34})`}>
          <path d="M0 32 L46 32 L38 44 L8 44Z" fill="#f4eee0" />
          <path d="M22 4 L22 30 L2 30Z" fill="#fff4d6" />
          <path d="M26 10 L26 30 L42 30Z" fill="#e8b45b" />
          <rect x="21" y="2" width="2" height="30" fill="#4b3425" />
        </g>
      )}
    </g>
  );
}
function Pines({ p, y, n, r, scale = 1, color }: { p: Palette; y: number; n: number; r: () => number; scale?: number; color: string }) {
  const trees = [];
  for (let i = 0; i < n; i++) {
    const x = (i + r() * 0.8) * (420 / n) - 10;
    const h = (46 + r() * 40) * scale;
    const w = h * 0.5;
    trees.push(
      <g key={i}>
        <rect x={x - 2} y={y - 6} width="4" height="10" fill={p.deep} />
        <path d={`M${x} ${y - h} L${x + w * 0.55} ${y - h * 0.5} L${x + w * 0.25} ${y - h * 0.5} L${x + w * 0.7} ${y - 6} L${x - w * 0.7} ${y - 6} L${x - w * 0.25} ${y - h * 0.5} L${x - w * 0.55} ${y - h * 0.5}Z`} fill={color} />
      </g>,
    );
  }
  return <g>{trees}</g>;
}
function Mountains({ p, r }: { p: Palette; r: () => number }) {
  const pk = (x: number, h: number, w: number, fill: string, snow: boolean) => (
    <g key={x + fill}>
      <path d={`M${x - w} 230 L${x} ${230 - h} L${x + w} 230Z`} fill={fill} />
      {snow && <path d={`M${x} ${230 - h} L${x + w * 0.34} ${230 - h * 0.62} L${x + w * 0.1} ${230 - h * 0.7} L${x - w * 0.12} ${230 - h * 0.58} L${x - w * 0.34} ${230 - h * 0.64}Z`} fill="#f2efff" opacity=".92" />}
    </g>
  );
  return (
    <g>
      {pk(110 + r() * 40, 130, 120, p.mid, true)}
      {pk(290 + r() * 40, 150, 130, p.mid, true)}
      {pk(200, 90, 100, p.deep, false)}
      <rect x="0" y="226" width="400" height="54" fill={p.deep} />
    </g>
  );
}
function Castle({ x, p }: { x: number; p: Palette }) {
  const win = (cx: number, cy: number) => <rect key={cx + '' + cy} x={cx} y={cy} width="6" height="10" rx="3" fill={p.glow} />;
  return (
    <g>
      <path d="M0 280 C60 220 140 214 200 218 C270 214 340 224 400 280Z" fill={p.mid} />
      <g fill={p.deep}>
        <rect x={x - 56} y="120" width="30" height="102" />
        <path d={`M${x - 60} 120 L${x - 41} 90 L${x - 22} 120Z`} />
        <rect x={x + 26} y="136" width="30" height="86" />
        <path d={`M${x + 22} 136 L${x + 41} 108 L${x + 60} 136Z`} />
        <rect x={x - 28} y="150" width="56" height="72" />
        <path d={`M${x - 28} 150 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 v-8 h8 v8 h8 z`} />
      </g>
      {win(x - 45, 134)}{win(x - 45, 160)}{win(x + 37, 150)}{win(x - 3, 168)}{win(x + 10, 190)}
      <path d={`M${x - 41} 90 V78 l12 4 l-12 4`} fill="#d9604a" stroke="#d9604a" strokeWidth="1.5" />
    </g>
  );
}
function Town({ p, r }: { p: Palette; r: () => number }) {
  const houses = [];
  let x = -10;
  while (x < 400) {
    const w = 46 + r() * 34; const h = 44 + r() * 50;
    const roof = r() > 0.5;
    houses.push(
      <g key={x}>
        <rect x={x} y={232 - h} width={w} height={h + 20} fill={p.deep} />
        {roof ? <path d={`M${x - 4} ${232 - h} L${x + w / 2} ${232 - h - 24} L${x + w + 4} ${232 - h}Z`} fill={p.mid} /> : null}
        <rect x={x + w * 0.2} y={232 - h + 14} width="8" height="12" rx="4" fill={p.glow} />
        {w > 56 && <rect x={x + w * 0.6} y={232 - h + 26} width="8" height="12" rx="4" fill={p.glow} opacity=".85" />}
        {r() > 0.6 && <rect x={x + w * 0.7} y={232 - h - 34} width="6" height="14" fill={p.mid} />}
      </g>,
    );
    x += w + 8;
  }
  return (
    <g>
      <rect x="0" y="228" width="400" height="52" fill={p.mid} />
      {houses}
      <rect x="352" y="168" width="3" height="64" fill="#4b3a58" />
      <circle cx="353.5" cy="166" r="14" fill={p.glow} opacity=".28" />
      <circle cx="353.5" cy="166" r="5" fill={p.glow} />
    </g>
  );
}
function Field({ p, rainy, r }: { p: Palette; rainy: boolean; r: () => number }) {
  return (
    <g>
      <path d="M0 200 C80 170 160 186 240 176 C310 168 360 184 400 176 V280 H0Z" fill={p.mid} />
      <path d="M0 232 C100 206 220 226 400 204 V280 H0Z" fill={p.deep} />
      <g stroke={p.mid} strokeWidth="3" strokeLinecap="round" opacity=".9">
        {[...Array(9)].map((_, i) => <path key={i} d={`M${20 + i * 40} 270 L${60 + i * 40} 238`} />)}
      </g>
      <g fill="#4b3a58">
        <rect x="300" y="150" width="56" height="40" />
        <path d="M294 150 L328 124 L362 150Z" fill="#6b3d4f" />
        <rect x="320" y="166" width="14" height="24" fill={p.glow} opacity=".9" />
      </g>
      {rainy && <g stroke={p.light} strokeWidth="1.6" strokeLinecap="round" opacity=".55">
        {[...Array(26)].map((_, i) => { const x = r() * 400, y = r() * 220; return <path key={i} d={`M${x} ${y} l-5 14`} />; })}
      </g>}
    </g>
  );
}
function Desert({ p }: { p: Palette }) {
  return (
    <g>
      <path d="M0 190 C80 160 160 190 240 170 C320 150 380 180 400 176 V280 H0Z" fill={p.mid} />
      <path d="M0 236 C90 208 180 244 280 220 C340 206 380 214 400 212 V280 H0Z" fill={p.deep} />
      <g fill={p.deep}>
        <rect x="318" y="168" width="9" height="46" rx="4.5" />
        <rect x="306" y="182" width="8" height="18" rx="4" /><rect x="306" y="196" width="18" height="6" rx="3" />
        <rect x="331" y="176" width="8" height="16" rx="4" /><rect x="324" y="188" width="14" height="5" rx="2.5" />
      </g>
    </g>
  );
}
function SkyMotif({ p, r }: { p: Palette; r: () => number }) {
  const px = 90 + r() * 200;
  return (
    <g>
      <circle cx={px} cy="110" r="46" fill={p.light} opacity=".9" />
      <path d={`M${px - 46} 110 a46 46 0 0 0 92 0 a46 46 0 0 1 -92 0z`} fill={p.mid} opacity=".6" />
      <ellipse cx={px} cy="116" rx="78" ry="14" fill="none" stroke={p.glow} strokeWidth="5" opacity=".8" transform={`rotate(-14 ${px} 116)`} />
      <circle cx={px - 8} cy="98" r="9" fill={p.mid} opacity=".45" /><circle cx={px + 16} cy="124" r="6" fill={p.mid} opacity=".45" />
      <circle cx={px > 200 ? px - 120 : px + 130} cy="60" r="14" fill={p.glow} opacity=".9" />
      <path d="M0 250 C80 220 160 236 240 224 C300 216 360 232 400 226 V280 H0Z" fill={p.deep} />
      <path d="M0 266 C120 244 260 262 400 246 V280 H0Z" fill={p.mid} opacity=".6" />
    </g>
  );
}

function Sky({ id, p, r, moon }: { id: string; p: Palette; r: () => number; moon: boolean }) {
  const stars = [];
  for (let i = 0; i < 22; i++) {
    const x = r() * 400, y = r() * 150, s = 0.8 + r() * 1.6;
    stars.push(<circle key={i} cx={x} cy={y} r={s} fill="#fff" opacity={0.35 + r() * 0.6} />);
  }
  const mx = 40 + r() * 300;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.top} /><stop offset="1" stopColor={p.bottom} />
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill={`url(#${id})`} />
      {stars}
      {moon && <g><circle cx={mx} cy="52" r="34" fill={p.glow} opacity=".18" /><circle cx={mx} cy="52" r="20" fill={p.glow} /><circle cx={mx + 7} cy="47" r="18" fill={p.top} opacity=".14" /></g>}
    </g>
  );
}

export function sceneSetting(story: Story, index: number): string {
  return story.settings[index % story.settings.length];
}

function Storm({ p, r }: { p: Palette; r: () => number }) {
  const blobs = [[60, 34, 46], [110, 28, 54], [170, 38, 48], [250, 26, 56], [320, 36, 50], [372, 28, 40], [20, 24, 34]];
  return (
    <g>
      <g fill={p.deep} opacity=".82">{blobs.map(([x, y, rr], i) => <ellipse key={i} cx={x} cy={y} rx={rr} ry={rr * 0.5} />)}</g>
      <path d="M150 52 L134 98 L152 96 L138 140 L172 86 L152 88 L166 52Z" fill={p.glow} opacity=".95" transform={`translate(${r() * 160} 0)`} />
      <g stroke={p.light} strokeWidth="1.6" strokeLinecap="round" opacity=".6">
        {[...Array(34)].map((_, i) => { const x = r() * 420, y = 40 + r() * 220; return <path key={i} d={`M${x} ${y} l-6 15`} />; })}
      </g>
    </g>
  );
}

export function Scene({ story, index = 0, className }: { story: Story; index?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const h = hash(story.id);
  const seed = hash(story.id + ':' + index);
  const r = rng(seed);
  const palette = PALETTES[(h + (index > 1 ? index : 0)) % PALETTES.length];
  const setting = sceneSetting(story, index);
  const motif = MOTIF[setting] ?? 'forest';
  const chars = story.characters;
  const charId = chars.length ? chars[(index + (index > 3 ? 1 : 0)) % chars.length] : null;
  const Char = charId ? CHAR_ART[charId] : null;
  const second = chars.length > 1 && index % 3 !== 2 ? chars[(chars.indexOf(charId!) + 1) % chars.length] : null;
  const Char2 = second ? CHAR_ART[second] : null;
  const closeUp = index > 0 && index % 3 === 2;
  const stormy = /thunder|storm/i.test(story.prompt) && index % 3 !== 2;
  const flip = index % 2 === 1;
  const lhX = 120 + ((h >>> 3) % 5) * 38 + (index % 3) * 14; // 120..272 (+28)
  const charsLeft = lhX >= 190;
  const showMoon = motif !== 'sky' && !stormy && r() > 0.2;
  const charScale = closeUp ? 1.55 : 0.98;
  let cx = closeUp ? 130 : flip ? 250 : 40;
  if (motif === 'lighthouse' && !closeUp) cx = charsLeft ? 22 + (index % 2) * 10 : 270;
  const cy = closeUp ? 150 : motif === 'sky' ? 150 : 170;
  const place = (x: number, sc: number, f: boolean) => `translate(${x} ${cy + (sc < 1 ? 12 : 0)}) ${f ? `translate(${100 * sc} 0) scale(${-sc} ${sc})` : `scale(${sc})`}`;
  const faceRight = motif === 'lighthouse' && !closeUp ? charsLeft : !flip;

  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={`Illustration ${index + 1}: ${setting}${charId ? ' with ' + charId : ''}`}>
      <Sky id={`g${uid}`} p={palette} r={r} moon={showMoon} />
      {motif === 'lighthouse' && <><Waves p={palette} y={206} boat={index % 3 === 1 ? (charsLeft ? 30 : 300) : undefined} /><Lighthouse x={lhX} p={palette} dim={stormy} /></>}
      {motif === 'sea' && <Waves p={palette} y={170} boat={70 + r() * 200} />}
      {motif === 'forest' && <><rect y="200" width="400" height="80" fill={palette.deep} /><Pines p={palette} y={210} n={9} r={r} scale={1.1} color={palette.mid} /><Pines p={palette} y={240} n={7} r={r} scale={1.25} color={palette.deep} />{[...Array(7)].map((_, i) => <circle key={i} cx={30 + r() * 340} cy={150 + r() * 80} r="2.4" fill={palette.glow} opacity=".9" />)}</>}
      {motif === 'mountain' && <Mountains p={palette} r={r} />}
      {motif === 'sky' && <SkyMotif p={palette} r={r} />}
      {motif === 'castle' && <Castle x={270} p={palette} />}
      {motif === 'town' && <Town p={palette} r={r} />}
      {motif === 'field' && <Field p={palette} rainy={setting === 'rainy day'} r={r} />}
      {motif === 'desert' && <Desert p={palette} />}
      {motif !== 'sky' && motif !== 'forest' && <path d="M0 270 C90 252 180 266 280 256 C340 250 380 258 400 254 V280 H0Z" fill={palette.deep} />}
      {Char2 && !closeUp && (
        <g transform={place(cx + (faceRight ? 92 : -72), 0.74, !faceRight)}><Char2 /></g>
      )}
      {Char && (
        <g transform={place(cx, charScale, !faceRight)}>
          {charId === 'mabel' ? <g transform="translate(0 -40)"><Char /></g> : <Char />}
        </g>
      )}
      {!Char && closeUp && <g><circle cx="120" cy="190" r="34" fill={palette.glow} opacity=".22" /><circle cx="120" cy="190" r="10" fill={palette.glow} /></g>}
      {stormy && <Storm p={palette} r={r} />}
    </svg>
  );
}

export function TextOnlyThumb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="No illustrations">
      <rect width="400" height="280" fill="#f1e8d5" />
      <g stroke="#d8cbb0" strokeWidth="5" strokeLinecap="round">
        {[70, 100, 130, 160, 190].map((y, i) => <path key={y} d={`M80 ${y} H${i === 4 ? 200 : 320}`} />)}
      </g>
      <path d="M80 44 H150" stroke="#bfae8c" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function StoryArt({ story, index = 0, className }: { story: Story; index?: number; className?: string }) {
  if (story.illustrations === 0) return <TextOnlyThumb className={className} />;
  return <Scene story={story} index={index} className={className} />;
}
