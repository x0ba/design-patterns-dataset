import { boxOf, geoFor } from './geometry';
import { fmt } from './model';
import type { Doc } from './types';
import { BAR_X0, BAR_X1, BAR_Y0, BAR_Y1, GLASS_BOTTOM, WIN_H, WIN_W } from './window';

export interface PatternOpts {
  scale: number;
  dotted: boolean;
  marks: boolean;
  hatch: boolean;
  reference: boolean;
  labels: boolean;
  shade: boolean;
  /** Omit physical width/height so the SVG can be scaled by CSS (dialog preview). */
  preview?: boolean;
}

export const SHEET = { x: -4, y: -6, w: 80, h: 100 };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const sy = (y: number) => WIN_H - y;

export function buildPattern(doc: Doc, o: PatternOpts): string {
  const mirrored = doc.finishes.side === 'reverse';
  const parts: string[] = [];
  const letters = 'ABCDEFGHIJ';
  const vis = doc.elements.filter((e) => e.visible);

  // hatch patterns for gilded areas
  const defs = vis
    .filter((e) => e.fill === 'gold' && o.hatch)
    .map((e) => `<pattern id="h-${e.id}" width="${(0.3 / e.cap).toFixed(4)}" height="${(0.3 / e.cap).toFixed(4)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${(0.3 / e.cap).toFixed(4)}" stroke="#a87b1f" stroke-width="${(0.03 / e.cap).toFixed(4)}"/></pattern>`)
    .join('');

  const body: string[] = [];
  // window reference
  body.push(`<rect x="0" y="0" width="${WIN_W}" height="${WIN_H}" fill="none" stroke="#222" stroke-width="0.05"/>`);
  if (o.reference) {
    body.push(`<line x1="0" x2="${WIN_W}" y1="${sy(GLASS_BOTTOM)}" y2="${sy(GLASS_BOTTOM)}" stroke="#2b6f8a" stroke-width="0.04" stroke-dasharray="0.5 0.25"/>`);
    body.push(`<rect x="0" y="${sy(GLASS_BOTTOM) }" width="${WIN_W}" height="${GLASS_BOTTOM}" fill="#000" opacity="0.05"/>`);
    body.push(`<rect x="${BAR_X0}" y="${sy(BAR_Y1)}" width="${BAR_X1 - BAR_X0}" height="${BAR_Y1 - BAR_Y0}" fill="#c2352b" fill-opacity="0.08" stroke="#c2352b" stroke-width="0.05" stroke-dasharray="0.4 0.2"/>`);
  }
  if (o.marks) {
    body.push(`<line x1="${WIN_W / 2}" x2="${WIN_W / 2}" y1="-1.5" y2="${WIN_H + 1.5}" stroke="#444" stroke-width="0.03" stroke-dasharray="1.2 0.25 0.2 0.25"/>`);
    for (const [x, y] of [[0, 0], [WIN_W, 0], [0, WIN_H], [WIN_W, WIN_H], [WIN_W / 2, 0], [WIN_W / 2, WIN_H]]) {
      body.push(`<g stroke="#000" stroke-width="0.04" fill="none"><line x1="${x - 1}" x2="${x + 1}" y1="${y}" y2="${y}"/><line x1="${x}" x2="${x}" y1="${y - 1}" y2="${y + 1}"/><circle cx="${x}" cy="${y}" r="0.4"/></g>`);
    }
  }

  vis.forEach((e, i) => {
    const g = geoFor(e);
    const c = e.cap;
    const tf = `translate(${e.x} ${sy(e.y)}) scale(${c} ${-c})`;
    const sw = 0.045 / c;
    const line = o.dotted && !o.preview
      ? `stroke-dasharray="0.001 ${(0.125 / c).toFixed(5)}" stroke-linecap="round" stroke-width="${sw.toFixed(5)}"`
      : `stroke-width="${((o.preview ? 0.09 : 0.02) / c).toFixed(5)}"`;
    const fill = e.fill === 'gold' && o.hatch ? `url(#h-${e.id})` : 'none';
    let inner = '';
    if (e.outline.on) inner += `<path d="${g.d}" fill="none" stroke="#7c8b96" stroke-opacity="0.35" stroke-width="${((2 * e.outline.w) / c).toFixed(5)}" stroke-linejoin="round"/>`;
    if (e.shade.on && o.shade) {
      const r = (e.shade.angle * Math.PI) / 180;
      inner += `<path d="${g.d}" transform="translate(${((Math.cos(r) * e.shade.dist) / c).toFixed(5)} ${((Math.sin(r) * e.shade.dist) / c).toFixed(5)})" fill="none" stroke="#555" stroke-width="${(0.02 / c).toFixed(5)}" stroke-dasharray="${(0.3 / c).toFixed(4)} ${(0.15 / c).toFixed(4)}" stroke-linejoin="round"/>`;
    }
    inner += `<path d="${g.d}" fill="${fill}" stroke="#000" ${line} stroke-linejoin="round"/>`;
    body.push(`<g id="el-${e.id}" transform="${tf}">${inner}</g>`);
    if (o.labels) {
      const b = boxOf(e);
      const tag = `${letters[i] ?? i + 1}`;
      body.push(`<g font-family="Helvetica, Arial, sans-serif" fill="#333"><circle cx="${(b.l - 0.9).toFixed(2)}" cy="${(sy(b.t) + 0.9).toFixed(2)}" r="0.7" fill="none" stroke="#333" stroke-width="0.04"/><text x="${(b.l - 0.9).toFixed(2)}" y="${(sy(b.t) + 1.2).toFixed(2)}" font-size="0.9" text-anchor="middle">${tag}</text></g>`);
    }
  });

  const content = mirrored ? `<g transform="translate(${WIN_W} 0) scale(-1 1)">${body.join('')}</g>` : body.join('');

  // title block (never mirrored)
  const k = doc.finishes;
  const t = (x: number, y: number, s: string, size = 1, weight = 400, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" font-family="Helvetica, Arial, sans-serif" fill="#111">${esc(s)}</text>`;
  parts.push(`<rect x="${SHEET.x}" y="${SHEET.y}" width="${SHEET.w}" height="${SHEET.h}" fill="#fff"/>`);
  parts.push(t(0, -3.2, 'HOLLIS & DAUGHTER · FRONT WINDOW · POUNCE PATTERN', 1.5, 700));
  parts.push(t(WIN_W, -3.2, mirrored ? 'MIRRORED — reverse-glass, apply from inside' : 'RIGHT-READING — surface gilded, apply from outside', 1.05, 400, 'end'));
  parts.push(content);
  let y = WIN_H + 3.6;
  parts.push(`<line x1="0" x2="${WIN_W}" y1="${y - 1.5}" y2="${y - 1.5}" stroke="#222" stroke-width="0.04"/>`);
  parts.push(t(0, y, 'Gildmark layout · Nov 16, 2026 · Rosa Villanueva', 1.05, 600));
  parts.push(t(0, (y += 1.6), `Window ${WIN_W} × ${WIN_H} in · glass from ${GLASS_BOTTOM} in · push bar ${BAR_Y0}–${BAR_Y1} in from floor`, 1));
  parts.push(t(0, (y += 1.6), `Pattern scale ${o.scale === 1 ? '1:1 (full size)' : o.scale === 0.5 ? '1:2 (half size)' : `1:${Math.round(1 / o.scale)}`} · ${o.dotted ? 'dotted lines: prick or pounce along dots' : 'solid lines'}`, 1));
  parts.push(t(WIN_W, WIN_H + 3.6, `Gold: ${k.leafKarat} leaf, ${k.side} gilded, ${k.center} centre`, 1, 400, 'end'));
  parts.push(t(WIN_W, WIN_H + 5.2, `Hatched = gold leaf · grey band = ${k.enamel} 1-Shot outline · dashed = drop shade`, 1, 400, 'end'));
  const legend = vis.map((e, i) => `${letters[i] ?? i + 1} ${e.name}${e.kind === 'text' ? ` ${fmt(e.cap)}″ cap` : ` ${fmt(e.cap)}″ tall`}`).join('   ');
  if (o.labels) parts.push(t(0, WIN_H + 8.4, legend, 0.95, 400));

  const size = o.preview ? '' : ` width="${(SHEET.w * o.scale).toFixed(3)}in" height="${(SHEET.h * o.scale).toFixed(3)}in"`;
  return `<svg xmlns="http://www.w3.org/2000/svg"${size} viewBox="${SHEET.x} ${SHEET.y} ${SHEET.w} ${SHEET.h}"><defs>${defs}</defs>${parts.join('')}</svg>`;
}
