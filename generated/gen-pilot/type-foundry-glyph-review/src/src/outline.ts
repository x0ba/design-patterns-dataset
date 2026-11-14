// Loads Calloway outlines (served as WOFF) and turns them into editable point contours.
import opentype from 'opentype.js';
import { useEffect, useState } from 'react';
import { styleById, type StyleId } from './data/core';
import type { Edit } from './data/revisions';

export interface Pt { x: number; y: number; on: boolean }
export interface Outline { contours: Pt[][]; advance: number; bbox: { x1: number; y1: number; x2: number; y2: number } }

const SUBSETS = ['latin', 'latin-ext', 'greek', 'greek-ext'] as const;
export interface StyleFonts { style: StyleId; fonts: opentype.Font[] }

const cache = new Map<StyleId, Promise<StyleFonts>>();
const resolved = new Map<StyleId, StyleFonts>();

export function loadStyle(style: StyleId): Promise<StyleFonts> {
  let p = cache.get(style);
  if (!p) {
    const key = styleById(style).fileKey;
    p = Promise.all(
      SUBSETS.map((s) =>
        fetch(`fonts/literata-${s}-${key}.woff`)
          .then((r) => r.arrayBuffer())
          .then((buf) => opentype.parse(buf)),
      ),
    ).then((fonts) => {
      const sf = { style, fonts };
      resolved.set(style, sf);
      return sf;
    });
    cache.set(style, p);
  }
  return p;
}

export function useStyleFonts(style: StyleId): StyleFonts | null {
  const [sf, setSf] = useState<StyleFonts | null>(() => resolved.get(style) ?? null);
  useEffect(() => {
    let alive = true;
    if (resolved.get(style)) setSf(resolved.get(style)!);
    else {
      setSf(null);
      loadStyle(style).then((r) => alive && setSf(r));
    }
    return () => { alive = false; };
  }, [style]);
  return sf;
}

function findGlyph(sf: StyleFonts, ch: string): opentype.Glyph | null {
  if (ch === 'fi' || ch === 'fl') {
    const f = sf.fonts[0];
    for (let i = 0; i < f.numGlyphs; i++) { const g = f.glyphs.get(i); if (g.name === ch) return g; }
  }
  for (const f of sf.fonts) {
    const g = f.charToGlyph(ch);
    if (g && g.index > 0) return g;
  }
  return null;
}

const outlineCache = new Map<string, Outline | null>();

export function getOutline(sf: StyleFonts, ch: string): Outline | null {
  const k = sf.style + ':' + ch;
  if (outlineCache.has(k)) return outlineCache.get(k)!;
  const g = findGlyph(sf, ch);
  let out: Outline | null = null;
  if (g) {
    g.getPath(); // forces lazy point parsing
    const pts = (g as unknown as { points?: Array<{ x: number; y: number; onCurve: boolean; lastPointOfContour: boolean }> }).points ?? [];
    const contours: Pt[][] = [];
    let cur: Pt[] = [];
    for (const p of pts) {
      cur.push({ x: p.x, y: p.y, on: p.onCurve });
      if (p.lastPointOfContour) { contours.push(cur); cur = []; }
    }
    if (cur.length) contours.push(cur);
    out = { contours, advance: g.advanceWidth ?? 600, bbox: bboxOf(contours) };
  }
  outlineCache.set(k, out);
  return out;
}

function bboxOf(contours: Pt[][]) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const c of contours) for (const p of c) {
    x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y); x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y);
  }
  if (!isFinite(x1)) return { x1: 0, y1: 0, x2: 0, y2: 0 };
  return { x1, y1, x2, y2 };
}

/** Reconstructs the earlier state of an outline by undoing localised edits (smooth falloff). */
export function undoEdits(o: Outline, edits: Edit[]): Outline {
  const { x1, y1, x2, y2 } = o.bbox;
  const w = x2 - x1, h = y2 - y1, size = Math.max(w, h);
  const contours = o.contours.map((c) =>
    c.map((p) => {
      let dx = 0, dy = 0;
      for (const e of edits) {
        const cx = x1 + e.cx * w, cy = y1 + e.cy * h, r = e.r * size;
        const d = Math.hypot(p.x - cx, p.y - cy);
        if (d < r) {
          const f = 0.5 + 0.5 * Math.cos((Math.PI * d) / r);
          dx -= e.dx * f; dy -= e.dy * f;
        }
      }
      return { x: Math.round(p.x + dx), y: Math.round(p.y + dy), on: p.on };
    }),
  );
  return { contours, advance: o.advance, bbox: bboxOf(contours) };
}

/** TrueType quadratic contours → SVG path data in font units (y up). */
export function toPath(contours: Pt[][], ox = 0, oy = 0, flip = false): string {
  const Y = (y: number) => (flip ? -(y + oy) : y + oy);
  const X = (x: number) => x + ox;
  let d = '';
  for (const c of contours) {
    const n = c.length;
    if (!n) continue;
    let start = c.findIndex((p) => p.on);
    let startPt: { x: number; y: number };
    if (start === -1) {
      startPt = { x: (c[0].x + c[n - 1].x) / 2, y: (c[0].y + c[n - 1].y) / 2 };
      start = 0;
      d += `M${X(startPt.x)} ${Y(startPt.y)}`;
      // all off-curve: walk from 0
      for (let i = 0; i < n; i++) {
        const p = c[i], q = c[(i + 1) % n];
        const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
        d += `Q${X(p.x)} ${Y(p.y)} ${X(mid.x)} ${Y(mid.y)}`;
      }
      d += 'Z';
      continue;
    }
    startPt = c[start];
    d += `M${X(startPt.x)} ${Y(startPt.y)}`;
    let ctrl: Pt | null = null;
    for (let k = 1; k <= n; k++) {
      const p = c[(start + k) % n];
      if (p.on) {
        d += ctrl ? `Q${X(ctrl.x)} ${Y(ctrl.y)} ${X(p.x)} ${Y(p.y)}` : `L${X(p.x)} ${Y(p.y)}`;
        ctrl = null;
      } else {
        if (ctrl) {
          const mx = (ctrl.x + p.x) / 2, my = (ctrl.y + p.y) / 2;
          d += `Q${X(ctrl.x)} ${Y(ctrl.y)} ${X(mx)} ${Y(my)}`;
        }
        ctrl = p;
      }
    }
    d += 'Z';
  }
  return d;
}

export interface Diff { moved: number; total: number; maxShift: number; dAdvance: number }
export function diffOutlines(before: Outline, now: Outline): Diff {
  let moved = 0, total = 0, maxShift = 0;
  now.contours.forEach((c, ci) => c.forEach((p, pi) => {
    total++;
    const q = before.contours[ci]?.[pi];
    if (!q) return;
    const s = Math.hypot(p.x - q.x, p.y - q.y);
    if (s >= 1) { moved++; maxShift = Math.max(maxShift, s); }
  }));
  return { moved, total, maxShift: Math.round(maxShift), dAdvance: now.advance - before.advance };
}

export interface Placed { d: string; key: string }

/** Lays out a string as SVG paths. `override` can swap a character's outline; `kern` supplies pair values. */
export function layout(
  sf: StyleFonts,
  text: string,
  opts: { override?: (ch: string, o: Outline) => Outline; kern?: (a: string, b: string) => number; tracking?: number } = {},
): { paths: Placed[]; width: number } {
  const chars = [...text];
  let x = 0;
  const paths: Placed[] = [];
  chars.forEach((ch, i) => {
    if (i > 0 && opts.kern) x += opts.kern(chars[i - 1], ch);
    if (ch === ' ' || ch === ' ') { x += 250; return; }
    let o = getOutline(sf, ch);
    if (!o) { x += 300; return; }
    if (opts.override) o = opts.override(ch, o);
    paths.push({ d: toPath(o.contours, x, 0, true), key: `${i}` });
    x += o.advance + (opts.tracking ?? 0);
  });
  return { paths, width: x };
}

export const METRICS = { ascender: 1000, capHeight: 701, xHeight: 507, descender: -250, baseline: 0 };
