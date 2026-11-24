import { useState, type ReactNode } from 'react';
import { CHAPTERS, BOOK } from '../data/book.ts';
import type { Entry, Loc } from '../data/types.ts';
import { typesetEntry } from '../lib/lines.ts';
import { chapterForLoc } from '../lib/analysis.ts';

export const GROUP_COLORS = ['#3f6f9e', '#b5762f', '#5b8a5a', '#8a5a8f', '#2f8a8a', '#a2525a', '#6c6a3a', '#5a6cb0', '#9c6b4f', '#4f7f6f'];

export function TypeTag({ type }: { type: Entry['type'] }) {
  return <span className={`ttag t-${type}`}>{type}</span>;
}

export function Heading({ e, className }: { e: Pick<Entry, 'heading' | 'type'>; className?: string }) {
  if (e.type === 'ship') {
    const m = e.heading.match(/^(.*?)(\s*\(.*\))$/);
    if (m)
      return (
        <span className={className}>
          <i>{m[1]}</i>
          {m[2]}
        </span>
      );
    return <i className={className}>{e.heading}</i>;
  }
  return <span className={className}>{e.heading}</span>;
}

/** Chicago-style typeset preview of one entry. */
export function Typeset({ e, highlightSubs, dim }: { e: Entry; highlightSubs?: Set<string>; dim?: boolean }) {
  const lines = typesetEntry(e);
  return (
    <div className={`typeset ${dim ? 'dim' : ''}`}>
      {lines.map((l, i) => (
        <div key={i} className={`ts-${l.kind} ${highlightSubs?.has(l.heading) ? 'ts-new' : ''}`}>
          {l.kind === 'main' && (
            <>
              <Heading e={e} />
              {l.locs && <>, {l.locs}</>}
              {l.tail && <TailRefs text={l.tail} />}
            </>
          )}
          {l.kind === 'sub' && (
            <>
              {l.heading}
              {l.locs && <>, {l.locs}</>}
            </>
          )}
          {l.kind === 'seealso' && <TailRefs text={l.tail ?? ''} />}
          <span className="ts-count">{l.lines}</span>
        </div>
      ))}
    </div>
  );
}

function TailRefs({ text }: { text: string }) {
  const m = text.match(/^(\.?\s*)(See also|See)(.*)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      <i>{m[2]}</i>
      {m[3]}
    </>
  );
}

/** 14 chapter cells shaded by locator count. */
export function SpreadCells({ locs, small, hot }: { locs: Loc[]; small?: boolean; hot?: number }) {
  const counts = new Array(15).fill(0);
  for (const l of locs) counts[chapterForLoc(l)]++;
  const max = Math.max(1, ...counts);
  return (
    <span className={`spread ${small ? 'small' : ''}`} title={counts.slice(1).map((c, i) => `Ch. ${i + 1}: ${c}`).join('\n')}>
      {counts.slice(1).map((c, i) => (
        <span
          key={i}
          className={`cell ${i + 1 === hot ? 'hot' : ''}`}
          style={{ background: c ? `rgba(47,93,138,${0.18 + (0.82 * c) / max})` : undefined }}
        />
      ))}
    </span>
  );
}

/** Whole-book strip with a tick per locator. */
export function BookStrip({ marks, height = 34, labels = true }: { marks: { loc: Loc; color?: string; key?: string }[]; height?: number; labels?: boolean }) {
  const W = 1000;
  const x = (p: number) => ((p - 1) / BOOK.totalPages) * W;
  return (
    <svg className="bookstrip" viewBox={`0 0 ${W} ${height + (labels ? 14 : 0)}`} preserveAspectRatio="none">
      {CHAPTERS.map((c, i) => (
        <rect key={c.num} x={x(c.start)} width={x(c.end + 1) - x(c.start)} y={0} height={height} fill={i % 2 ? '#efebe2' : '#f6f3ec'} />
      ))}
      <rect x={x(BOOK.notes.start)} width={x(BOOK.notes.end + 1) - x(BOOK.notes.start)} y={0} height={height} fill="#e9e6df" />
      <rect x={x(BOOK.biblio.start)} width={x(BOOK.biblio.end + 1) - x(BOOK.biblio.start)} y={0} height={height} fill="url(#hatch)" />
      <defs>
        <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#d9d4c8" strokeWidth="1.5" />
        </pattern>
      </defs>
      {marks.map((m, i) => {
        const w = Math.max(2, x((m.loc.e ?? m.loc.p) + 1) - x(m.loc.p));
        return <rect key={m.key ?? i} x={x(m.loc.p)} width={w} y={4} height={height - 8} fill={m.color ?? '#2f5d8a'} opacity={0.85} />;
      })}
      {labels &&
        CHAPTERS.map((c) => (
          <text key={c.num} x={(x(c.start) + x(c.end + 1)) / 2} y={height + 11} textAnchor="middle" className="strip-label">
            {c.num}
          </text>
        ))}
      {labels && (
        <text x={(x(BOOK.notes.start) + x(BOOK.notes.end + 1)) / 2} y={height + 11} textAnchor="middle" className="strip-label">
          n
        </text>
      )}
    </svg>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'warn' | 'ok' }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={v === value} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Delta({ n, unit = 'lines' }: { n: number; unit?: string }) {
  const cls = n > 0 ? 'd-up' : n < 0 ? 'd-down' : 'd-zero';
  const t = n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0';
  return (
    <span className={`delta ${cls}`}>
      {t} {Math.abs(n) === 1 && unit === 'lines' ? 'line' : unit}
    </span>
  );
}

export function useHover<T>() {
  return useState<T | null>(null);
}

export const fmt = (n: number) => n.toLocaleString('en-US');
export const chapterLabel = (n: number) => (n <= 14 ? `Ch. ${n}` : 'Notes');
