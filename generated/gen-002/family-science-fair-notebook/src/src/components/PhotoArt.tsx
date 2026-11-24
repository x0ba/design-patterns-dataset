import { ReactElement } from 'react';
import { Photo } from '../data';

function rng(seed: number) {
  let a = seed * 2654435761;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Worm({ x, y, a, len, k }: { x: number; y: number; a: number; len: number; k: number }) {
  const dx = Math.cos(a) * len;
  const dy = Math.sin(a) * len;
  const nx = -Math.sin(a) * k;
  const ny = Math.cos(a) * k;
  const d = `M${x},${y} Q${x + dx / 2 + nx},${y + dy / 2 + ny} ${x + dx},${y + dy}`;
  return (
    <g>
      <path d={d} stroke="#9a6430" strokeWidth={6.5} strokeLinecap="round" fill="none" />
      <path d={d} stroke="#c58d4f" strokeWidth={3.4} strokeLinecap="round" fill="none" strokeDasharray="2 2.4" />
      <circle cx={x + dx} cy={y + dy} r={2.6} fill="#5b3a1c" />
    </g>
  );
}

function FoamBlock({ x, y, w, h, wear, r }: { x: number; y: number; w: number; h: number; wear: number; r: () => number }) {
  const pits = Math.round(4 + wear * 26);
  return (
    <g>
      <rect x={x + 4} y={y + 6} width={w} height={h} rx={4} fill="#00000022" />
      <rect x={x} y={y} width={w} height={h} rx={4} fill="#fbfaf5" stroke="#d9d5c8" />
      {Array.from({ length: 40 }).map((_, i) => (
        <circle key={'b' + i} cx={x + 4 + r() * (w - 8)} cy={y + 4 + r() * (h - 8)} r={1.6 + r() * 1.6} fill="none" stroke="#ebe7db" strokeWidth={0.8} />
      ))}
      {Array.from({ length: pits }).map((_, i) => {
        const edge = r() < 0.6;
        const px = edge ? (r() < 0.5 ? x + r() * 14 : x + w - r() * 14) : x + 10 + r() * (w - 20);
        const py = y + 6 + r() * (h - 12);
        const rad = 2 + r() * (3 + wear * 8);
        return <ellipse key={'p' + i} cx={px} cy={py} rx={rad} ry={rad * 0.7} fill="#cfc7b2" opacity={0.85} />;
      })}
    </g>
  );
}

export default function PhotoArt({ photo, className }: { photo: Photo; className?: string }) {
  if (photo.src) return <img src={photo.src} alt={photo.caption} className={className} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />;
  const a = photo.art;
  const r = rng(a.seed);
  const wood = photo.site === 'grandma';
  const bg = wood ? '#b88b5e' : '#d6d8d3';
  const wear = a.wear ?? 0;

  let body: ReactElement;

  if (a.kind === 'tub') {
    const worms = Array.from({ length: a.worms ?? 18 }).map((_, i) => (
      <Worm key={i} x={60 + r() * 190} y={50 + r() * 140} a={r() * Math.PI * 2} len={16 + r() * 10} k={(r() - 0.5) * 14} />
    ));
    body = (
      <g>
        <rect x={34} y={20} width={252} height={200} rx={22} fill="#e9eef0" stroke="#aeb9bd" strokeWidth={2} />
        <rect x={44} y={30} width={232} height={180} rx={16} fill="#d8c8a8" opacity={0.55} />
        {Array.from({ length: 90 }).map((_, i) => (
          <circle key={'f' + i} cx={50 + r() * 220} cy={36 + r() * 168} r={0.8 + r() * 1.2} fill="#3b2a1a" opacity={0.55} />
        ))}
        {a.oats &&
          Array.from({ length: 34 }).map((_, i) => {
            const cx = 52 + r() * 215;
            const cy = 40 + r() * 160;
            return <ellipse key={'o' + i} cx={cx} cy={cy} rx={5 + r() * 3} ry={3 + r() * 2} fill="#e8d6a6" stroke="#c9b07a" strokeWidth={0.6} transform={`rotate(${Math.round(r() * 180)} ${cx} ${cy})`} />;
          })}
        {a.foam && <FoamBlock x={110} y={80} w={100} h={62} wear={wear} r={r} />}
        {worms}
        <path d="M44 34 Q160 18 276 34" stroke="#ffffff" strokeWidth={4} opacity={0.6} fill="none" />
      </g>
    );
  } else if (a.kind === 'closeup') {
    body = (
      <g>
        <rect x={0} y={0} width={320} height={240} fill="#cdb995" />
        <FoamBlock x={40} y={34} w={240} h={168} wear={wear} r={r} />
        {Array.from({ length: Math.round(4 + wear * 10) }).map((_, i) => {
          const tx = 50 + r() * 220;
          const ty = 50 + r() * 140;
          return <path key={'t' + i} d={`M${tx},${ty} q${10 + r() * 20},${(r() - 0.5) * 20} ${20 + r() * 30},${(r() - 0.5) * 30}`} stroke="#b9ae94" strokeWidth={5 + wear * 5} strokeLinecap="round" fill="none" opacity={0.75} />;
        })}
        <Worm x={20} y={200} a={-0.6} len={36} k={10} />
        <Worm x={292} y={60} a={2.4} len={30} k={-8} />
      </g>
    );
  } else if (a.kind === 'scale') {
    const nickel = !a.foam;
    body = (
      <g>
        <rect x={50} y={30} width={220} height={190} rx={14} fill="#2f3438" />
        <rect x={64} y={40} width={192} height={124} rx={8} fill="#b9bfc3" stroke="#8d9499" />
        <rect x={64} y={40} width={192} height={18} rx={8} fill="#ffffff" opacity={0.25} />
        {a.boat && <path d="M98 76 L222 76 L208 142 L112 142 Z" fill="#f2f6f8" opacity={0.85} stroke="#c9d3d8" />}
        {nickel ? (
          <g>
            <circle cx={160} cy={102} r={30} fill="#c9ccce" stroke="#9ea3a6" strokeWidth={2} />
            <circle cx={160} cy={102} r={24} fill="none" stroke="#b1b5b8" />
          </g>
        ) : (
          <FoamBlock x={118} y={80} w={84} h={52} wear={wear} r={r} />
        )}
        <rect x={98} y={174} width={124} height={34} rx={4} fill="#9fb59a" stroke="#1b1f22" strokeWidth={2} />
        <text x={206} y={199} textAnchor="end" fontFamily="ui-monospace, Menlo, monospace" fontSize={22} fontWeight={700} fill="#1d2a1d">
          {a.reading}
        </text>
        <text x={212} y={199} fontFamily="ui-monospace, Menlo, monospace" fontSize={10} fill="#1d2a1d">
          g
        </text>
        <circle cx={78} cy={190} r={7} fill="#4a5055" />
        <text x={78} y={210} textAnchor="middle" fontSize={7} fill="#9aa1a6" fontFamily="system-ui">TARE</text>
        <circle cx={244} cy={190} r={7} fill="#4a5055" />
        <text x={244} y={210} textAnchor="middle" fontSize={7} fill="#9aa1a6" fontFamily="system-ui">ON</text>
      </g>
    );
  } else {
    const n = a.tubs ?? 4;
    const labels = n === 4 ? ['FOAM', 'OATS', 'FOAM+OATS', 'NO FOOD'] : ['FOAM', 'FOAM+OATS'];
    const w = n === 4 ? 66 : 110;
    const gap = n === 4 ? 10 : 24;
    const total = n * w + (n - 1) * gap;
    const x0 = (320 - total) / 2;
    body = (
      <g>
        {labels.map((l, i) => {
          const x = x0 + i * (w + gap);
          return (
            <g key={l}>
              <rect x={x} y={70} width={w} height={110} rx={10} fill="#e9eef0" stroke="#aeb9bd" strokeWidth={2} />
              <rect x={x + 4} y={120} width={w - 8} height={54} rx={6} fill="#d8c8a8" opacity={0.6} />
              {l.includes('FOAM') && <rect x={x + w / 2 - 16} y={128} width={32} height={20} rx={2} fill="#fbfaf5" stroke="#d9d5c8" />}
              {l.includes('OATS') && <ellipse cx={x + w / 2 + (l === 'OATS' ? 0 : 12)} cy={160} rx={12} ry={5} fill="#e8d6a6" />}
              <rect x={x + 6} y={84} width={w - 12} height={18} rx={2} fill="#efe3bf" transform={`rotate(${(r() - 0.5) * 6} ${x + w / 2} 93)`} />
              <text x={x + w / 2} y={97} textAnchor="middle" fontSize={n === 4 ? 8.5 : 11} fontFamily="'Marker Felt', 'Comic Sans MS', cursive" fill="#2b2b2b">
                {l}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <svg viewBox="0 0 320 240" className={className} role="img" aria-label={photo.caption} preserveAspectRatio="xMidYMid slice">
      <rect width={320} height={240} fill={bg} />
      {wood &&
        Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d={`M0 ${i * 22 + 6} Q160 ${i * 22 + (i % 2 ? 14 : -2)} 320 ${i * 22 + 8}`} stroke="#a47a50" strokeWidth={1.2} fill="none" opacity={0.6} />
        ))}
      {body}
      <rect width={320} height={240} fill="url(#vig)" />
      <defs>
        <radialGradient id="vig" cx="50%" cy="45%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.22} />
        </radialGradient>
      </defs>
    </svg>
  );
}
