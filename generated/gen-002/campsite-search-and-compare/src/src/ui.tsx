import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { GLOSSARY, type Campground } from './data';
import { Star } from './icons';

export function fmtDrive(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
export const fmtNum = (n: number) => n.toLocaleString('en-US');

export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

/** Inline jargon term with a plain-language explanation on click. */
export function Term({ k, children }: { k: keyof typeof GLOSSARY | string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLSpanElement>(open, () => setOpen(false));
  const g = GLOSSARY[k];
  if (!g) return <>{children}</>;
  return (
    <span className="term-wrap" ref={ref}>
      <button type="button" className="term" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} aria-expanded={open}>
        {children ?? g.term}
      </button>
      {open && (
        <span className="term-pop" role="tooltip">
          <strong>{g.term}</strong>
          <span>{g.def}</span>
        </span>
      )}
    </span>
  );
}

export function Rating({ value, count, compact }: { value: number; count?: number; compact?: boolean }) {
  return (
    <span className="rating">
      <Star size={14} className="rating-star" />
      <strong>{value.toFixed(1)}</strong>
      {count !== undefined && <span className="muted">({fmtNum(count)}{compact ? '' : ' reviews'})</span>}
    </span>
  );
}

export function OperatorChip({ op }: { op: Campground['operator'] }) {
  const cls = op === 'Private' ? 'op op-private' : op === 'National forest' ? 'op op-forest' : 'op op-public';
  return <span className={cls}>{op === 'Private' ? 'Private campground' : op}</span>;
}

/** Illustrated stand-in for campground photos, varied per campground. */
export function Scene({ cg, variant = 0, className }: { cg: Campground; variant?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const s = cg.seed * 13 + variant * 7;
  const rnd = (n: number) => {
    const x = Math.sin(s * 99.13 + n * 12.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const skies = [
    ['#a9d3e8', '#e8f2ea'],
    ['#f3c9a0', '#fbe8cf'],
    ['#9cc4dd', '#dbe9ef'],
    ['#c4b7d8', '#f6dcc8'],
    ['#b6dbe0', '#f1f0dc'],
  ];
  const sky = skies[Math.floor(rnd(1) * skies.length)];
  const water = cg.water && cg.amenities.lakeAccess;
  const shade = cg.shadePct / 100;
  const trees = Math.round(5 + shade * 14);
  const ridge1 = `M0 ${52 + rnd(2) * 8} L${30 + rnd(3) * 20} ${30 + rnd(4) * 10} L${70 + rnd(5) * 10} ${46 + rnd(6) * 6} L${105 + rnd(7) * 10} ${26 + rnd(8) * 12} L160 ${44 + rnd(9) * 10} V100 H0Z`;
  const ridge2 = `M0 ${62 + rnd(10) * 6} Q40 ${50 + rnd(11) * 8} 80 ${60 + rnd(12) * 4} T160 ${56 + rnd(13) * 6} V100 H0Z`;
  const ground = variant === 1 ? '#7f9b5b' : '#6f8f55';
  return (
    <svg className={className} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Photo of ${cg.name}`}>
      <defs>
        <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <linearGradient id={`w${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f9fbf" />
          <stop offset="1" stopColor="#3f7896" />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#sky${uid})`} />
      <circle cx={20 + rnd(14) * 120} cy={14 + rnd(15) * 10} r={6} fill="#fff6dc" opacity={0.85} />
      <path d={ridge1} fill="#8ea7b4" opacity={0.75} />
      <path d={ridge2} fill="#5f7d6a" />
      {water ? (
        <>
          <path d={`M0 72 Q50 ${66 + rnd(16) * 4} 100 70 T160 68 V100 H0Z`} fill={`url(#w${uid})`} />
          <path d="M20 80h18M70 86h24M110 78h14" stroke="#cfe6f0" strokeWidth="0.8" opacity="0.7" />
          <path d={`M0 90 Q40 ${84 + rnd(17) * 3} 90 92 V100 H0Z`} fill="#e3d2a6" />
        </>
      ) : (
        <path d="M0 74 Q60 68 160 76 V100 H0Z" fill={ground} />
      )}
      {Array.from({ length: trees }).map((_, i) => {
        const x = rnd(20 + i) * 160;
        const near = rnd(40 + i) > 0.55;
        const h = near ? 26 + rnd(60 + i) * 14 : 12 + rnd(60 + i) * 8;
        const y = near ? 84 + rnd(80 + i) * 10 : 64 + rnd(80 + i) * 6;
        if (water && !near && x > 10 && x < 150 && y > 66) return null;
        return (
          <g key={i}>
            <path d={`M${x} ${y - h} L${x + h * 0.28} ${y} L${x - h * 0.28} ${y}Z`} fill={near ? '#2f5640' : '#3e6b50'} />
            <rect x={x - 0.8} y={y} width={1.6} height={near ? 4 : 2} fill="#4a3a2a" />
          </g>
        );
      })}
      {variant !== 2 && (
        <g transform={`translate(${30 + rnd(90) * 90} ${water ? 96 : 92})`}>
          <path d="M0 0 L9 -12 L18 0Z" fill={variant === 1 ? '#3d7ea6' : '#e07a3f'} />
          <path d="M9 -12 L7 0 L11 0Z" fill="#00000030" />
        </g>
      )}
    </svg>
  );
}

export function Toggle({ on, onChange, children, title }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode; title?: string }) {
  return (
    <button type="button" className={`toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange(!on)} title={title}>
      <span className="toggle-box">{on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}</span>
      {children}
    </button>
  );
}
