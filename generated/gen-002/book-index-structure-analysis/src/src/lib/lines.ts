import type { Entry, Loc } from '../data/types.ts';
import { formatLocs, sortSubs } from './locators.ts';

/**
 * Line model for the press's two-column index page: about 42 characters
 * to the column line, subentries indented 1 em, runover lines 2 em.
 */
export const MEASURE = 42;
const SUB_INDENT = 2;
const RUNOVER_INDENT = 4;

export function textLines(len: number, firstIndent: number): number {
  const first = MEASURE - firstIndent;
  if (len <= first) return 1;
  return 1 + Math.ceil((len - first) / (MEASURE - RUNOVER_INDENT));
}

export interface TypesetLine {
  kind: 'main' | 'sub' | 'seealso';
  heading: string;
  locs: string;
  tail?: string; // ". See ..." or ". See also ..."
  lines: number;
  italic?: boolean;
}

function headingText(e: Entry) {
  return e.heading;
}

export function typesetEntry(e: Entry, subsOverride?: { heading: string; locs: Loc[] }[]): TypesetLine[] {
  const out: TypesetLine[] = [];
  const subs = sortSubs(subsOverride ?? e.subs);
  const locs = formatLocs(e.direct);
  let tail = '';
  if (e.see.length) tail = `. See ${e.see.join('; ')}`;
  else if (e.seeAlso.length && subs.length === 0) tail = `. See also ${e.seeAlso.join('; ')}`;
  const mainText = headingText(e) + (locs ? ', ' + locs : '') + tail;
  out.push({ kind: 'main', heading: e.heading, locs, tail, lines: textLines(mainText.length, 0), italic: e.type === 'ship' });
  for (const s of subs) {
    const sl = formatLocs(s.locs);
    const t = s.heading + (sl ? ', ' + sl : '');
    out.push({ kind: 'sub', heading: s.heading, locs: sl, lines: textLines(t.length, SUB_INDENT) });
  }
  if (e.seeAlso.length && subs.length > 0 && !e.see.length) {
    const t = `See also ${e.seeAlso.join('; ')}`;
    out.push({ kind: 'seealso', heading: '', locs: '', tail: t, lines: textLines(t.length, SUB_INDENT) });
  }
  return out;
}

export function entryLines(e: Entry): number {
  let n = 0;
  for (const l of typesetEntry(e)) n += l.lines;
  return n;
}
