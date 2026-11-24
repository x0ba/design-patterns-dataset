import { boxOf, geoFor, inkArea, lineLength } from './geometry';
import {
  BAR_CLEAR, BAR_X0, BAR_X1, BAR_Y0, BAR_Y1, BOOK_SQIN, GLASS_BOTTOM, LEAF_SQIN, LEAVES_PER_BOOK, MARGIN, WIN_H, WIN_W,
} from './window';
import type { Box, Doc, El } from './types';

export const fmt = (n: number, dp = 2) => {
  const s = n.toFixed(dp);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
};

export function overlap1(a0: number, a1: number, b0: number, b1: number) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

export const barZone: Box = { l: BAR_X0 - BAR_CLEAR, r: BAR_X1 + BAR_CLEAR, b: BAR_Y0 - BAR_CLEAR, t: BAR_Y1 + BAR_CLEAR };

export function hitsBar(b: Box) {
  return overlap1(b.l, b.r, barZone.l, barZone.r) > 0.001 && overlap1(b.b, b.t, barZone.b, barZone.t) > 0.001;
}

export interface Materials {
  perEl: { id: string; name: string; sqin: number }[];
  gildedSqIn: number;
  leafSqIn: number;
  leafSqFt: number;
  leaves: number;
  books: number;
  spare: number;
  cost: number;
  enamelFillSqFt: number;
  lineFeet: number;
}

export function materials(doc: Doc): Materials {
  const perEl = doc.elements
    .filter((e) => e.visible && e.fill === 'gold')
    .map((e) => ({ id: e.id, name: e.name, sqin: inkArea(e) }));
  const gildedSqIn = perEl.reduce((s, e) => s + e.sqin, 0);
  const leafSqIn = gildedSqIn * (1 + doc.finishes.wastePct / 100);
  const leaves = Math.ceil(leafSqIn / LEAF_SQIN - 1e-9);
  const books = Math.max(0, Math.ceil(leaves / LEAVES_PER_BOOK));
  const enamelFill = doc.elements.filter((e) => e.visible && e.fill === 'enamel').reduce((s, e) => s + inkArea(e), 0);
  const line = doc.elements
    .filter((e) => e.visible)
    .reduce((s, e) => s + (e.outline.on ? lineLength(e) : 0) + (e.shade.on ? lineLength(e) * 0.5 : 0), 0);
  return {
    perEl,
    gildedSqIn,
    leafSqIn,
    leafSqFt: leafSqIn / 144,
    leaves,
    books,
    spare: books * LEAVES_PER_BOOK - leaves,
    cost: books * doc.finishes.bookPrice,
    enamelFillSqFt: enamelFill / 144,
    lineFeet: line / 12,
  };
}

export type Level = 'ok' | 'warn' | 'error';
export interface Check {
  id: string;
  level: Level;
  title: string;
  detail: string;
  elementId?: string;
  fix?: 'clearBar';
}

export function runChecks(doc: Doc): Check[] {
  const els = doc.elements.filter((e) => e.visible);
  const boxes = new Map(els.map((e) => [e.id, boxOf(e)]));
  const out: Check[] = [];

  // push bar
  const barHits = els.filter((e) => hitsBar(boxes.get(e.id)!));
  if (barHits.length) {
    for (const e of barHits) {
      const b = boxes.get(e.id)!;
      const ov = overlap1(b.b, b.t, BAR_Y0, BAR_Y1);
      out.push({
        id: `bar-${e.id}`,
        level: 'error',
        title: `${e.name} sits behind the push bar`,
        detail:
          ov > 0
            ? `${fmt(ov, 1)} in of the lettering falls inside the bar's 38–42 in band.`
            : `Closer than ${fmt(BAR_CLEAR, 1)} in to the push bar.`,
        elementId: e.id,
        fix: 'clearBar',
      });
    }
  } else {
    out.push({ id: 'bar', level: 'ok', title: 'Push bar is clear', detail: `Nothing within ${fmt(BAR_CLEAR, 1)} in of the 38–42 in band.` });
  }

  // glass + margins
  const frame: Check[] = [];
  for (const e of els) {
    const b = boxes.get(e.id)!;
    if (b.b < GLASS_BOTTOM - 0.001) {
      frame.push({ id: `glass-${e.id}`, level: 'error', title: `${e.name} runs below the glass`, detail: `Bottom edge is ${fmt(b.b, 1)} in off the floor; glass starts at 6 in.`, elementId: e.id });
    } else if (b.l < MARGIN - 0.001 || b.r > WIN_W - MARGIN + 0.001 || b.t > WIN_H - MARGIN + 0.001 || b.b < GLASS_BOTTOM + MARGIN - 0.001) {
      const side = b.l < MARGIN ? `${fmt(b.l, 1)} in from the left frame` : b.r > WIN_W - MARGIN ? `${fmt(WIN_W - b.r, 1)} in from the right frame` : b.t > WIN_H - MARGIN ? `${fmt(WIN_H - b.t, 1)} in from the top frame` : `${fmt(b.b - GLASS_BOTTOM, 1)} in above the glass line`;
      frame.push({ id: `margin-${e.id}`, level: 'warn', title: `${e.name} is tight to the frame`, detail: `${side}; keep ${fmt(MARGIN, 1)} in of paint margin.`, elementId: e.id });
    }
  }
  if (frame.length) out.push(...frame);
  else out.push({ id: 'frame', level: 'ok', title: 'Everything is on glass', detail: `All lettering is inside the glass with ${fmt(MARGIN, 1)} in margins.` });

  // overlaps
  const ov: Check[] = [];
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      const a = boxes.get(els[i].id)!, b = boxes.get(els[j].id)!;
      const ox = overlap1(a.l, a.r, b.l, b.r), oy = overlap1(a.b, a.t, b.b, b.t);
      if (ox > 0.05 && oy > 0.05) {
        ov.push({ id: `ov-${els[i].id}-${els[j].id}`, level: 'warn', title: `${els[i].name} and ${els[j].name} collide`, detail: `Their boxes overlap by ${fmt(oy, 1)} in vertically.`, elementId: els[i].id });
      }
    }
  }
  if (ov.length) out.push(...ov);
  else out.push({ id: 'overlap', level: 'ok', title: 'No elements collide', detail: 'Every block has clear air around it.' });

  // leaf
  const m = materials(doc);
  if (m.leaves > LEAVES_PER_BOOK) {
    out.push({
      id: 'leaf',
      level: 'warn',
      title: `Leaf needs ${m.leaves} leaves, one book is ${LEAVES_PER_BOOK}`,
      detail: `About ${fmt(m.leafSqFt, 1)} sq ft needed; a book covers ${fmt((LEAVES_PER_BOOK * LEAF_SQIN) / 144, 2)} sq ft. A second book adds $${doc.finishes.bookPrice}.`,
    });
  } else {
    out.push({ id: 'leaf', level: 'ok', title: `Leaf fits in one book`, detail: `${m.leaves} of ${LEAVES_PER_BOOK} leaves used, ${m.spare} spare.` });
  }
  return out;
}

/** Largest cap height (anchor held) that keeps this element inside the margins and off its neighbours and the push bar. */
export function maxCap(doc: Doc, id: string): { cap: number; limit: string } {
  const el = doc.elements.find((e) => e.id === id)!;
  const others = doc.elements.filter((e) => e.visible && e.id !== id);
  const ok = (cap: number): string | null => {
    const test = { ...el, cap };
    const b = boxOf(test);
    if (b.l < MARGIN) return 'left frame margin';
    if (b.r > WIN_W - MARGIN) return 'right frame margin';
    if (b.t > WIN_H - MARGIN) return 'top frame margin';
    if (b.b < GLASS_BOTTOM + MARGIN) return 'glass line';
    if (hitsBar(b)) return 'push bar';
    for (const o of others) {
      const ob = boxOf(o);
      if (overlap1(b.l, b.r, ob.l, ob.r) > 0.05 && overlap1(b.b, b.t, ob.b, ob.t) > 0.05) return o.name.toLowerCase();
    }
    return null;
  };
  let lo = 0.25, hi = 60;
  if (ok(lo)) return { cap: el.cap, limit: ok(lo)! };
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid; else lo = mid;
  }
  const cap = Math.floor(lo * 20) / 20;
  return { cap, limit: ok(cap + 0.05) ?? 'frame' };
}

/** Nearest vertical shift that clears the push bar without creating new collisions. */
export function clearBarPatch(doc: Doc, id: string): Partial<El> | null {
  const el = doc.elements.find((e) => e.id === id)!;
  const b = boxOf(el);
  const up = barZone.t - b.b + 0.05;
  const down = barZone.b - b.t - 0.05;
  const others = doc.elements.filter((e) => e.visible && e.id !== id).map(boxOf);
  const clash = (dy: number, gap: number) => {
    const nb = { ...b, b: b.b + dy, t: b.t + dy };
    return (
      others.some((o) => overlap1(nb.l, nb.r, o.l, o.r) > 0.05 && overlap1(nb.b - gap, nb.t + gap, o.b, o.t) > 0.05) ||
      nb.b < GLASS_BOTTOM + MARGIN ||
      nb.t > WIN_H - MARGIN
    );
  };
  // prefer a spot with real air around it, then settle for any spot that doesn't collide
  const pick = (gap: number) => [down, up].filter((d) => !clash(d, gap)).sort((a, b2) => Math.abs(a) - Math.abs(b2))[0];
  const dy = pick(1) ?? pick(0.05) ?? down;
  return { y: Math.round((el.y + dy) * 100) / 100 };
}

export function describeDiff(a: Doc, b: Doc): { id: string; name: string; changes: string[]; kind: 'changed' | 'added' | 'removed' }[] {
  const out: { id: string; name: string; changes: string[]; kind: 'changed' | 'added' | 'removed' }[] = [];
  for (const e of b.elements) {
    const o = a.elements.find((x) => x.id === e.id);
    if (!o) { out.push({ id: e.id, name: e.name, changes: ['New since this version'], kind: 'added' }); continue; }
    const ch: string[] = [];
    if (o.lines.join(' / ') !== e.lines.join(' / ')) ch.push(`Text “${o.lines.join(' / ')}” → “${e.lines.join(' / ')}”`);
    if (o.cap !== e.cap) ch.push(`${e.kind === 'ornament' ? 'Height' : 'Cap height'} ${fmt(o.cap)} → ${fmt(e.cap)} in`);
    if (o.arc !== e.arc && e.kind === 'text') ch.push(`Arc ${fmt(o.arc)}° → ${fmt(e.arc)}°`);
    if (Math.abs(o.x - e.x) > 0.01 || Math.abs(o.y - e.y) > 0.01) {
      const dx = e.x - o.x, dy = e.y - o.y;
      const bits: string[] = [];
      if (Math.abs(dx) > 0.04) bits.push(`${dx > 0 ? 'right' : 'left'} ${fmt(Math.abs(dx), 1)} in`);
      if (Math.abs(dy) > 0.04) bits.push(`${dy > 0 ? 'up' : 'down'} ${fmt(Math.abs(dy), 1)} in`);
      ch.push(`Moved ${bits.join(', ')}`);
    }
    if (o.fill !== e.fill) ch.push(`Fill ${o.fill} → ${e.fill}`);
    if (o.outline.on !== e.outline.on || o.outline.w !== e.outline.w) ch.push(`Outline ${o.outline.on ? fmt(o.outline.w) + ' in' : 'off'} → ${e.outline.on ? fmt(e.outline.w) + ' in' : 'off'}`);
    if (o.shade.on !== e.shade.on || o.shade.dist !== e.shade.dist) ch.push(`Drop shade ${o.shade.on ? fmt(o.shade.dist) + ' in' : 'off'} → ${e.shade.on ? fmt(e.shade.dist) + ' in' : 'off'}`);
    if (ch.length) out.push({ id: e.id, name: e.name, changes: ch, kind: 'changed' });
  }
  for (const o of a.elements) if (!b.elements.find((x) => x.id === o.id)) out.push({ id: o.id, name: o.name, changes: ['Only in the earlier version'], kind: 'removed' });
  return out;
}

export { geoFor, BOOK_SQIN };
