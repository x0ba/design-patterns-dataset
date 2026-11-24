import { FigKind } from '../data/manual';

const T = ({ x, y, children, a = 'middle', s = 14, b = false }: { x: number; y: number; children: React.ReactNode; a?: 'start' | 'middle' | 'end'; s?: number; b?: boolean }) => (
  <text x={x} y={y} textAnchor={a} fontSize={s} fontWeight={b ? 700 : 400} fill="currentColor" stroke="none" fontFamily="Helvetica, Arial, sans-serif">
    {children}
  </text>
);

const Callout = ({ x, y, tx, ty, n }: { x: number; y: number; tx: number; ty: number; n: string }) => (
  <g>
    <line x1={x} y1={y} x2={tx} y2={ty} strokeWidth={1} />
    <circle cx={tx} cy={ty} r={11} fill="none" strokeWidth={1.2} />
    <T x={tx} y={ty + 4.5} s={12} b>
      {n}
    </T>
  </g>
);

const coilH = (x: number, y: number, w: number, n = 5) => {
  const step = w / n;
  let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += ` a${step / 2} ${step / 2} 0 0 1 ${step} 0`;
  return d;
};
const coilV = (x: number, y: number, h: number, n = 5) => {
  const step = h / n;
  let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += ` a${step / 2} ${step / 2} 0 0 1 0 ${step}`;
  return d;
};
const zigzagH = (x: number, y: number, w: number, n = 8, amp = 9) => {
  const step = w / n;
  let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += ` L${x + step * (i + 0.5)} ${y + (i % 2 ? amp : -amp)}`;
  return d + ` L${x + w} ${y}`;
};

export function Figure({ kind, h = 240 }: { kind: FigKind; h?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'wiring':
      return (
        <svg viewBox="0 0 600 380" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          {/* plug */}
          <rect x={20} y={40} width={40} height={300} rx={6} strokeDasharray="4 4" />
          <T x={40} y={30} s={12}>PLUG</T>
          <T x={40} y={68} b>L</T>
          <T x={40} y={326} b>N</T>
          {/* top rail */}
          <path d="M60 60 H110" />
          {/* switch S */}
          <circle cx={112} cy={60} r={3} fill="currentColor" />
          <path d="M112 60 L148 44" />
          <circle cx={152} cy={60} r={3} fill="currentColor" />
          <T x={132} y={36}>S</T>
          <path d="M155 60 H190" />
          {/* thermal protector */}
          <path d="M190 60 q10 -14 20 0 q10 14 20 0" />
          <T x={210} y={36}>TP</T>
          <path d="M230 60 H260" />
          {/* field 1 */}
          <path d={coilH(260, 60, 80, 5)} />
          <T x={300} y={36}>FIELD F1</T>
          <path d="M340 60 H420" />
          {/* brush + armature */}
          <rect x={414} y={60} width={12} height={22} />
          <circle cx={420} cy={120} r={34} />
          <T x={420} y={126} b>M</T>
          <rect x={414} y={158} width={12} height={22} />
          <T x={470} y={78} a="start" s={12}>BRUSH (page 14)</T>
          <T x={470} y={178} a="start" s={12}>BRUSH</T>
          <T x={470} y={128} a="start" s={12}>ARMATURE</T>
          <path d="M420 180 V200" />
          {/* field 2 vertical */}
          <path d={coilV(420, 200, 60, 4)} />
          <T x={460} y={236} a="start" s={12}>FIELD F2</T>
          <path d="M420 260 V300 H360" />
          {/* governor contacts G with R1 parallel */}
          <circle cx={356} cy={300} r={3} fill="currentColor" />
          <path d="M356 300 L320 288" />
          <circle cx={316} cy={300} r={3} fill="currentColor" />
          <T x={336} y={278}>G</T>
          <path d="M360 300 V340 H350" />
          <path d={zigzagH(290, 340, 60, 8, 7)} />
          <path d="M290 340 H312 V300" />
          <T x={320} y={366} s={12}>R1 1,500 Ω</T>
          <T x={250} y={278} a="end" s={12}>GOVERNOR (page 16)</T>
          <path d="M312 300 H60" />
          {/* capacitor C1 across line */}
          <path d="M85 60 V170" />
          <path d="M70 170 H100 M70 180 H100" />
          <path d="M85 180 V300" />
          <T x={110} y={180} a="start" s={12}>C1</T>
        </svg>
      );
    case 'brush':
      return (
        <svg viewBox="0 0 600 220" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          {/* housing wall */}
          <path d="M150 20 V80 M150 140 V200" strokeWidth={3} />
          <path d="M150 20 h-14 M150 200 h-14" />
          {/* cap A */}
          <rect x={92} y={84} width={44} height={52} rx={4} />
          <path d="M100 84 v52 M108 84 v52 M116 84 v52 M124 84 v52" strokeWidth={0.8} />
          <path d="M136 92 H150 M136 128 H150" />
          {/* holder */}
          <path d="M150 88 H360 M150 132 H360" strokeWidth={2} />
          {/* spring B */}
          <path d={zigzagH(140, 110, 120, 10, 14)} />
          {/* brush C */}
          <rect x={262} y={92} width={96} height={36} fill="currentColor" fillOpacity={0.18} />
          <path d="M358 92 q10 18 0 36" />
          {/* commutator */}
          <circle cx={440} cy={110} r={70} />
          <circle cx={440} cy={110} r={18} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={440 + Math.cos(a) * 52} y1={110 + Math.sin(a) * 52} x2={440 + Math.cos(a) * 70} y2={110 + Math.sin(a) * 70} strokeWidth={1} />;
          })}
          <circle cx={440} cy={110} r={52} strokeWidth={1} />
          <Callout x={110} y={84} tx={70} ty={40} n="A" />
          <Callout x={200} y={100} tx={200} ty={40} n="B" />
          <Callout x={310} y={92} tx={310} ty={40} n="C" />
          <T x={440} y={205} s={12}>COMMUTATOR</T>
          <T x={150} y={215} s={12}>MOTOR HOUSING</T>
        </svg>
      );
    case 'brushWear':
      return (
        <svg viewBox="0 0 600 160" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          <rect x={120} y={50} width={160} height={50} fill="currentColor" fillOpacity={0.18} />
          <path d="M280 50 q14 25 0 50" />
          <path d="M120 125 H294" strokeWidth={1} />
          <path d="M120 118 v14 M294 118 v14" strokeWidth={1} />
          <T x={207} y={148}>NEW — ½ in</T>
          <rect x={360} y={50} width={80} height={50} fill="currentColor" fillOpacity={0.18} />
          <path d="M440 50 q14 25 0 50" />
          <path d="M360 125 H454" strokeWidth={1} />
          <path d="M360 118 v14 M454 118 v14" strokeWidth={1} />
          <T x={407} y={148}>REPLACE — ¼ in</T>
          <T x={300} y={30} b>Measure from the curved face to the spring end</T>
        </svg>
      );
    case 'governor':
      return (
        <svg viewBox="0 0 600 240" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          <path d="M20 120 H260" strokeWidth={4} />
          <T x={70} y={108} s={12}>ARMATURE SHAFT</T>
          {/* flyweights */}
          <path d="M200 120 L240 70 M200 120 L240 170" />
          <rect x={232} y={50} width={30} height={22} rx={3} fill="currentColor" fillOpacity={0.15} />
          <rect x={232} y={168} width={30} height={22} rx={3} fill="currentColor" fillOpacity={0.15} />
          {/* plunger */}
          <rect x={260} y={112} width={70} height={16} />
          {/* contact arm */}
          <path d="M330 120 L360 120 L360 60 L460 60" strokeWidth={2.4} />
          <circle cx={360} cy={180} r={4} fill="currentColor" />
          <path d="M360 120 V180" strokeWidth={2.4} />
          {/* contacts */}
          <rect x={455} y={52} width={10} height={16} fill="currentColor" />
          <rect x={471} y={52} width={10} height={16} fill="currentColor" />
          <path d="M481 60 H530" strokeWidth={2.4} />
          {/* cam */}
          <ellipse cx={540} cy={130} rx={32} ry={24} />
          <path d="M540 106 V60 M530 60 H540" />
          <Callout x={248} y={60} tx={230} ty={24} n="D" />
          <Callout x={295} y={112} tx={300} ty={80} n="E" />
          <Callout x={410} y={60} tx={410} ty={24} n="F" />
          <Callout x={468} y={68} tx={470} ty={104} n="G" />
          <Callout x={560} y={150} tx={575} ty={200} n="H" />
          <T x={540} y={225} s={12}>SPEED DIAL CAM</T>
        </svg>
      );
    case 'contacts':
      return (
        <svg viewBox="0 0 600 150" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          <path d="M80 70 H270" strokeWidth={3} />
          <rect x={268} y={58} width={14} height={24} fill="currentColor" />
          <rect x={300} y={58} width={14} height={24} fill="currentColor" />
          <path d="M314 70 H500" strokeWidth={3} />
          <path d="M282 100 H300" strokeWidth={1} />
          <path d="M282 94 v12 M300 94 v12" strokeWidth={1} />
          <T x={291} y={125} s={12}>GAP</T>
          <circle cx={440} cy={70} r={12} />
          <path d="M432 70 H448" />
          <T x={440} y={40} b>J</T>
          <T x={150} y={50} s={12}>MOVABLE ARM</T>
          <T x={420} y={105} s={12}>STATIONARY CONTACT</T>
        </svg>
      );
    case 'motor':
      return (
        <svg viewBox="0 0 600 240" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          <rect x={120} y={40} width={360} height={160} rx={30} />
          {Array.from({ length: 6 }).map((_, i) => (
            <path key={i} d={`M${200 + i * 30} 60 v30`} strokeWidth={4} />
          ))}
          <rect x={90} y={100} width={30} height={40} rx={4} />
          <rect x={480} y={100} width={30} height={40} rx={4} />
          <path d="M120 200 v20 M480 200 v20 M100 220 H500" />
          <T x={105} y={162} s={12}>BRUSH CAP</T>
          <T x={495} y={162} s={12}>BRUSH CAP</T>
          <T x={300} y={130}>MOTOR HOUSING</T>
          <T x={300} y={110} s={12}>VENTS</T>
        </svg>
      );
    case 'gearbox':
      return (
        <svg viewBox="0 0 600 200" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          <path d="M40 100 H560" strokeWidth={4} />
          {Array.from({ length: 10 }).map((_, i) => (
            <path key={i} d={`M${240 + i * 12} 86 l10 28`} />
          ))}
          <circle cx={200} cy={150} r={40} />
          <circle cx={400} cy={150} r={40} />
          <circle cx={200} cy={150} r={8} />
          <circle cx={400} cy={150} r={8} />
          <T x={300} y={70}>WORM</T>
          <T x={200} y={30} s={12}>BEATER GEAR</T>
          <T x={400} y={30} s={12}>BEATER GEAR</T>
          <path d="M200 40 V105 M400 40 V105" strokeDasharray="3 4" strokeWidth={1} />
        </svg>
      );
    case 'turntable':
      return (
        <svg viewBox="0 0 600 180" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          <ellipse cx={300} cy={70} rx={180} ry={26} />
          <path d="M120 70 v12 M480 70 v12" />
          <path d="M120 82 a180 26 0 0 0 360 0" />
          <path d="M300 96 V150" strokeWidth={6} />
          <path d="M80 150 H520 V168 H80 Z" />
          <T x={300} y={40}>TURNTABLE</T>
          <T x={340} y={130} a="start" s={12}>CENTRE POST</T>
        </svg>
      );
    case 'exploded':
      return (
        <svg viewBox="0 0 600 420" width="100%" style={{ height: `${h / 15}em` }} {...common}>
          <path d="M140 40 Q300 0 460 40 L470 80 H130 Z" />
          <circle cx={300} cy={30} r={12} />
          <rect x={150} y={110} width={300} height={90} rx={20} />
          <circle cx={300} cy={155} r={30} />
          <rect x={110} y={140} width={26} height={30} rx={3} />
          <rect x={464} y={140} width={26} height={30} rx={3} />
          <rect x={460} y={110} width={40} height={20} />
          <path d="M180 230 H420 L400 270 H200 Z" />
          <path d="M250 270 V340 M350 270 V340" strokeWidth={3} />
          <path d="M240 340 q10 30 20 0 M340 340 q10 30 20 0" />
          <ellipse cx={300} cy={395} rx={170} ry={14} />
          <Callout x={200} y={50} tx={90} ty={40} n="1" />
          <Callout x={300} y={30} tx={360} ty={14} n="2" />
          <Callout x={300} y={155} tx={360} ty={100} n="4" />
          <Callout x={170} y={180} tx={90} ty={220} n="5" />
          <Callout x={123} y={140} tx={60} ty={120} n="7" />
          <Callout x={490} y={120} tx={545} ty={100} n="8" />
          <Callout x={410} y={250} tx={500} ty={250} n="14" />
          <Callout x={470} y={395} tx={545} ty={380} n="16" />
        </svg>
      );
    default:
      return null;
  }
}
