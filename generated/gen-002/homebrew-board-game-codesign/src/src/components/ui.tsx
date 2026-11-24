import type { ReactNode } from 'react';
import type { DeckId, PersonId } from '../types';
import { PEOPLE } from '../data/people';
import { DECK_META } from '../data/cards';
import { diffWords } from '../lib/diff';

const PATHS: Record<string, ReactNode> = {
  cards: (<><rect x="3" y="7" width="12" height="14" rx="2" /><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5V16a1.5 1.5 0 0 1-1.5 1.5H15" /></>),
  book: (<><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></>),
  changes: (<><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3.5 4v4.5H8" /><path d="M12 8v4.2l2.8 1.8" /></>),
  comment: (<path d="M4 5.5h16v11H10l-4.5 3.5v-3.5H4z" />),
  playtest: (<><path d="M6 3h12M6 21h12" /><path d="M7.5 3v3.2a5 5 0 0 0 2 4L12 12l-2.5 1.8a5 5 0 0 0-2 4V21M16.5 3v3.2a5 5 0 0 1-2 4L12 12l2.5 1.8a5 5 0 0 1 2 4V21" /></>),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  pencil: <path d="M4 20l1-4.2L16 4.8l3.2 3.2L8.2 19z" />,
  print: (<><path d="M7 9V3.5h10V9" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14.5h10V21H7z" /></>),
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  arrow: <path d="M5 12h14M13.5 6l6 6-6 6" />,
  search: (<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.2-4.2" /></>),
  undo: (<><path d="M9 14L4 9l5-5" /><path d="M4 9h9.5a6 6 0 0 1 0 12H10" /></>),
  bell: (<><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>),
  warn: (<><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.2v.3" /></>),
  chevron: <path d="M6 9l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  dot: <circle cx="12" cy="12" r="3" />,
};
export function Icon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function Avatar({ id, size = 28, live = false }: { id: PersonId; size?: number; live?: boolean }) {
  const p = PEOPLE[id];
  return (
    <span className="avatar" style={{ width: size, height: size, background: p.color, fontSize: size * 0.42 }} title={`${p.name} · ${p.role}`}>
      {p.short[0]}
      {live && <span className="avatar-live" />}
    </span>
  );
}

export function Diff({ a, b, className = '' }: { a: string; b: string; className?: string }) {
  const ops = diffWords(a, b);
  return (
    <span className={`diff ${className}`}>
      {ops.map((o, i) =>
        o.t === 'eq' ? <span key={i}>{o.s}</span> : o.t === 'del' ? <del key={i}>{o.s}</del> : <ins key={i}>{o.s}</ins>,
      )}
    </span>
  );
}

export function DeckDot({ deck }: { deck: DeckId }) {
  return <span className="deck-dot" style={{ background: DECK_META[deck].color }} />;
}

/* ---------- Card face ---------- */
function Art({ deck, seed }: { deck: DeckId; seed: number }) {
  const m = DECK_META[deck];
  const o = seed % 24;
  return (
    <svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${deck}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.tint} />
          <stop offset="1" stopColor="#f8f1e1" />
        </linearGradient>
      </defs>
      <rect width="200" height="110" fill={`url(#sky-${deck})`} />
      {deck === 'ships' && (
        <g>
          <path d="M100 18V70" stroke="#1b2a33" strokeWidth="2.4" />
          <path d="M98 20L98 66L64 66z" fill="#fbf7ee" stroke="#1b2a33" strokeWidth="1.6" />
          <path d="M102 28L102 66L134 66z" fill="#fbf7ee" stroke="#1b2a33" strokeWidth="1.6" />
          <path d="M58 70h84l-14 15H72z" fill="#1b2a33" />
          <path d="M100 18l12 4-12 4z" fill="#b04a32" />
        </g>
      )}
      {deck === 'harbor' && (
        <g>
          <path d="M91 86L95 36h10l4 50z" fill="#fbf7ee" stroke="#1b2a33" strokeWidth="1.6" />
          <path d="M94 52h12M93 68h14" stroke="#b04a32" strokeWidth="5" />
          <path d="M92 36h16l-8-12z" fill="#1b2a33" />
          <path d="M100 30L150 22M100 30L150 42M100 30L50 22M100 30L50 42" stroke="#d9a441" strokeWidth="1.5" opacity=".7" />
          <rect x="18" y="78" width="164" height="6" fill="#1b2a33" />
          {[30, 62, 138, 170].map((x) => <rect key={x} x={x} y="82" width="4" height="16" fill="#1b2a33" />)}
        </g>
      )}
      {deck === 'market' && (
        <g>
          <path d="M26 82L68 64L98 72L150 34" stroke="#1b2a33" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M136 32h16v16" stroke="#1b2a33" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {[[70, 56], [100, 48], [128, 62]].map(([x, y], i) => (
            <g key={i}><circle cx={x} cy={y + 6} r="13" fill="#d9a441" stroke="#1b2a33" strokeWidth="1.6" /><circle cx={x} cy={y + 6} r="7" fill="none" stroke="#1b2a33" strokeWidth="1.2" /></g>
          ))}
        </g>
      )}
      {deck === 'events' && (
        <g>
          <g fill="#fbf7ee" stroke="#1b2a33" strokeWidth="1.6">
            <ellipse cx="84" cy="44" rx="26" ry="16" /><ellipse cx="114" cy="40" rx="24" ry="18" /><ellipse cx="100" cy="54" rx="38" ry="14" />
          </g>
          <path d="M102 58L90 82h11L95 102L120 72h-12l7-14z" fill="#d9a441" stroke="#1b2a33" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
      )}
      {deck === 'contracts' && (
        <g>
          <rect x="62" y="20" width="76" height="62" rx="5" fill="#fbf7ee" stroke="#1b2a33" strokeWidth="1.6" />
          <path d="M72 36h56M72 46h56M72 56h38" stroke="#1b2a33" strokeWidth="2" strokeLinecap="round" />
          <circle cx="126" cy="72" r="11" fill="#b04a32" stroke="#1b2a33" strokeWidth="1.6" />
          <path d="M121 72l4 4 6-8" stroke="#fbf7ee" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
      <g transform={`translate(${-o} 0)`}>
        <path d="M0 92q12.5-8 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0V110H0z" fill={m.color} opacity=".9" />
        <path d="M0 100q12.5-6 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0V110H0z" fill="#1b2a33" opacity=".35" />
      </g>
    </svg>
  );
}

export interface FaceProps {
  name: string; cost: number | null; effect: string; flavor: string; deck: DeckId; version: number; editor: PersonId; id: string;
}
export const EFFECT_MAX = 120;
export const FLAVOR_MAX = 80;
export function CardFace({ card, mini = false }: { card: FaceProps; mini?: boolean }) {
  const m = DECK_META[card.deck];
  let seed = 0;
  for (const c of card.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const over = card.effect.length > EFFECT_MAX || card.flavor.length > FLAVOR_MAX;
  return (
    <div className={`cardface ${mini ? 'mini' : ''} ${over ? 'over' : ''}`} style={{ ['--deck' as string]: m.color, ['--tint' as string]: m.tint }}>
      <div className="cardface-top">
        {card.cost !== null ? <span className="coin" aria-label={`Cost ${card.cost}`}>{card.cost}</span> : <span className="coin coin-none" aria-label="No cost">&ndash;</span>}
        <span className="cardface-name">{card.name}</span>
      </div>
      <div className="cardface-art"><Art deck={card.deck} seed={seed} /></div>
      <div className="cardface-kind">{m.singular}</div>
      <p className="cardface-effect">{card.effect || <span className="muted">No effect text</span>}</p>
      <p className="cardface-flavor">{card.flavor}</p>
      <div className="cardface-foot"><span>{m.label.toUpperCase()}</span><span>v{card.version} &middot; {PEOPLE[card.editor].short}</span></div>
      {over && <div className="cardface-over">Text overflows the card</div>}
    </div>
  );
}

export function Meter({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const state = value > max ? 'over' : value > max * 0.88 ? 'tight' : 'ok';
  return (
    <span className={`meter ${state}`} aria-label={`${value} of ${max} characters`}>
      <span className="meter-bar"><span style={{ width: `${pct}%` }} /></span>
      <span className="meter-num">{value}/{max}{state === 'over' ? ' · too long' : ''}</span>
    </span>
  );
}
