import { SPECIES_COLOR } from '../data/collection';
import type { Specimen } from '../types';
import { formatCollectorNumber, formatDate, formatElevation, shortName } from './format';

/*
 * Procedural herbarium sheet. Each sheet is drawn from its own record with a
 * seeded layout, so a given catalog number always looks the same. Coordinates
 * are in a 1000 x 1300 sheet space (the sheet's aspect ratio).
 */

export const SHEET_W = 1000;
export const SHEET_H = 1300;

/** Handwritten/typed label area on the sheet. */
export const LABEL_BOX = { x: 600, y: 930, w: 340, h: 306 };

/** Viewport that frames the label at high zoom (same aspect as the sheet). */
export const LABEL_VIEW = { x: 548, y: 728, w: 444, h: 572 }; // bottom edge sits on the sheet edge

export const SHEET_VIEW = { x: 0, y: 0, w: SHEET_W, h: SHEET_H };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Bezier point on the stem, t from 0 (base) to 1 (tip). */
function stemPoint(p: { x: number; y: number }[], t: number) {
  const [p0, p1, p2, p3] = p;
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function leafSvg(x: number, y: number, angle: number, len: number, wid: number, fill: string): string {
  const d =
    `M0 0 C${wid.toFixed(1)} ${(-len * 0.25).toFixed(1)} ${(wid * 0.7).toFixed(1)} ${(-len * 0.8).toFixed(1)} 0 ${(-len).toFixed(1)}` +
    ` C${(-wid * 0.7).toFixed(1)} ${(-len * 0.8).toFixed(1)} ${(-wid).toFixed(1)} ${(-len * 0.25).toFixed(1)} 0 0Z`;
  return (
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})">` +
    `<path d="${d}" fill="${fill}" stroke="#55603f" stroke-width="1.2"/>` +
    `<path d="M0 0 L0 ${(-len * 0.9).toFixed(1)}" stroke="#55603f" stroke-width="1.6" fill="none" opacity="0.6"/>` +
    `</g>`
  );
}

function flowerSvg(x: number, y: number, dir: number, len: number, fill: string): string {
  const w = 7;
  const d =
    `M0 -3 Q${(len * 0.55).toFixed(1)} -${w} ${len.toFixed(1)} -2 Q${(len * 1.06).toFixed(1)} 0 ${len.toFixed(1)} 2` +
    ` Q${(len * 0.55).toFixed(1)} ${w} 0 3 Z`;
  return (
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${dir.toFixed(1)})">` +
    `<path d="${d}" fill="${fill}" opacity="0.92"/>` +
    `<path d="M${(len * 0.15).toFixed(1)} 0 L${(len * 0.8).toFixed(1)} 0" stroke="#3b1b2c" stroke-opacity="0.35" stroke-width="1.4"/>` +
    `</g>`
  );
}

function capsuleSvg(x: number, y: number, dir: number): string {
  return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="9" ry="6" fill="#8a6d43" transform="rotate(${dir.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
}

/** Plant drawing: stem, basal and cauline leaves, flowers or capsules. */
function plantSvg(s: Specimen, rnd: () => number, thumb: boolean): string {
  const color = SPECIES_COLOR[s.epithet] ?? '#b5446e';
  const jit = (v: number, amt: number) => v + (rnd() - 0.5) * amt;
  const stem = [
    { x: 380, y: 920 },
    { x: jit(340, 60), y: jit(700, 60) },
    { x: jit(470, 60), y: jit(480, 60) },
    { x: jit(430, 60), y: jit(180, 40) },
  ];
  const out: string[] = [];
  out.push(
    `<path d="M${stem[0].x} ${stem[0].y} C${stem[1].x.toFixed(1)} ${stem[1].y.toFixed(1)} ${stem[2].x.toFixed(1)} ${stem[2].y.toFixed(1)} ${stem[3].x.toFixed(1)} ${stem[3].y.toFixed(1)}" fill="none" stroke="#6e6240" stroke-width="${thumb ? 9 : 7}" stroke-linecap="round"/>`
  );

  // Basal rosette, spread either side of the stem base.
  const basal = thumb ? 4 : 5 + Math.floor(rnd() * 2);
  for (let i = 0; i < basal; i++) {
    const p = stemPoint(stem, 0.02 + i * 0.012);
    const side = i % 2 === 0 ? -1 : 1;
    const angle = side * (30 + rnd() * 30) + (rnd() - 0.5) * 10;
    const len = 150 + rnd() * 70;
    const wid = 24 + rnd() * 12;
    out.push(leafSvg(p.x, p.y, angle, len, wid, '#7e9160'));
  }

  // Cauline leaves in opposite pairs.
  const pairs = thumb ? 2 : 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < pairs; i++) {
    const t = 0.32 + (i / Math.max(1, pairs - 1)) * 0.25;
    const p = stemPoint(stem, t);
    const spread = 55 + rnd() * 20;
    out.push(leafSvg(p.x, p.y, -spread, 90 + rnd() * 40, 16 + rnd() * 6, '#8ca06c'));
    out.push(leafSvg(p.x, p.y, spread, 90 + rnd() * 40, 16 + rnd() * 6, '#8ca06c'));
  }

  const flowering = s.phenology === 'flowering' || s.phenology === 'flowering and fruiting';
  const fruiting = s.phenology === 'fruiting' || s.phenology === 'flowering and fruiting';
  if (flowering) {
    const n = thumb ? 9 : 11 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const t = 0.6 + (k / n) * 0.36;
      const p = stemPoint(stem, t);
      const right = k % 2 === 0;
      const dir = right ? -50 + rnd() * 30 : -160 + rnd() * 30;
      const len = 30 + rnd() * 9;
      out.push(flowerSvg(p.x, p.y, dir, len, color));
    }
  }
  if (fruiting) {
    const n = flowering ? 3 : thumb ? 5 : 7;
    for (let k = 0; k < n; k++) {
      const t = 0.92 + (k / n) * 0.08;
      const p = stemPoint(stem, Math.min(t, 0.99));
      out.push(capsuleSvg(p.x + (k % 2 ? 10 : -10), p.y - 4, rnd() * 180));
    }
  }
  if (!flowering && !fruiting) {
    // Vegetative: show a bud cluster so the sheet is not bare.
    const p = stemPoint(stem, 0.97);
    out.push(capsuleSvg(p.x, p.y, 0));
  }
  return out.join('');
}

function wrappedLabelLines(s: Specimen): { text: string; style: 'name' | 'body' }[] {
  const lines: { text: string; style: 'name' | 'body' }[] = [];
  const original = s.determinations[0];
  lines.push({ text: original.name, style: 'name' });
  for (const l of wrap(s.locality, 26)) lines.push({ text: l, style: 'body' });
  lines.push({ text: formatDate(s.date), style: 'body' });
  lines.push({ text: `${s.collector} ${formatCollectorNumber(s.collectorNumber)}`, style: 'body' });
  lines.push({ text: `${s.county} Co., Oregon`, style: 'body' });
  lines.push({ text: formatElevation(s.elevationFt), style: 'body' });
  return lines;
}

/** Typed slip lines for determinations after the original label. */
function slipLines(s: Specimen): string[] {
  return s.determinations.slice(1).map((d) => {
    const label = d.kind === 'annotation' ? 'Annotated' : 'Det.';
    return `${label}: ${shortName(d.name)} ${d.year}, ${d.by}`;
  });
}

export function sheetMarkup(s: Specimen, mode: 'full' | 'thumb' = 'full'): string {
  const thumb = mode === 'thumb';
  const rnd = mulberry32(parseInt(s.catalogNumber.slice(-6), 10) || 1);
  const parts: string[] = [];

  // Paper and frame.
  parts.push(`<rect x="0" y="0" width="${SHEET_W}" height="${SHEET_H}" fill="#f5f0e1"/>`);
  parts.push(`<rect x="40" y="40" width="920" height="1220" fill="#faf7ee" stroke="#b9ae90" stroke-width="3"/>`);
  if (!thumb) {
    // Faint fibre flecks so zoomed-in paper does not look like flat fill.
    for (let i = 0; i < 70; i++) {
      const x = 60 + rnd() * 880;
      const y = 60 + rnd() * 1180;
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + rnd() * 1.6).toFixed(1)}" fill="#9a8f70" opacity="${(0.05 + rnd() * 0.06).toFixed(2)}"/>`);
    }
  }

  parts.push(plantSvg(s, rnd, thumb));

  // Mounting tape at the corners.
  for (const [x, y, rot] of [
    [70, 80, -35],
    [880, 70, 28],
    [70, 1180, 30],
  ] as const) {
    parts.push(
      `<rect x="-42" y="-14" width="84" height="28" transform="translate(${x} ${y}) rotate(${rot})" fill="#e7dfc4" opacity="0.7"/>`
    );
  }

  // Label.
  const L = LABEL_BOX;
  parts.push(`<rect x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" fill="#fdfcf7" stroke="#7a7566" stroke-width="2"/>`);
  parts.push(
    `<text class="typed" x="${L.x + 14}" y="${L.y + 24}" font-size="12" letter-spacing="1.2" fill="#555">HERBARIUM · VASCULAR PLANTS</text>`
  );
  parts.push(
    `<text class="typed" x="${L.x + 14}" y="${L.y + 47}" font-size="16" font-weight="700" fill="#222">${esc(s.catalogNumber)}</text>`
  );

  if (!thumb) {
    let y = L.y + 76;
    for (const line of wrappedLabelLines(s)) {
      if (line.style === 'name') {
        parts.push(
          `<text class="hand" x="${L.x + 16}" y="${y}" font-size="28" font-style="italic" fill="#1f2d6b">${esc(line.text)}</text>`
        );
        y += 30;
      } else {
        parts.push(`<text class="hand" x="${L.x + 16}" y="${y}" font-size="21" fill="#1f2d6b">${esc(line.text)}</text>`);
        y += 25;
      }
    }

    const slips = slipLines(s);
    if (slips.length > 0) {
      const slipH = 16 + slips.length * 18;
      const top = L.y + L.h - slipH - 12;
      parts.push(
        `<rect x="${L.x + 12}" y="${top}" width="${L.w - 24}" height="${slipH}" fill="#fffef8" stroke="#b33a3a" stroke-width="1.2"/>`
      );
      slips.forEach((line, i) => {
        parts.push(
          `<text class="typed" x="${L.x + 20}" y="${top + 20 + i * 18}" font-size="13" fill="#7a2222">${esc(line)}</text>`
        );
      });
    }
  } else {
    parts.push(
      `<text class="typed" x="${L.x + 14}" y="${L.y + 70}" font-size="14" fill="#555">${esc(shortName(s.determinations[0].name))}</text>`
    );
  }

  return parts.join('');
}

/** Full sheet SVG element (for thumbnails, pass `thumb`). */
export function sheetSvgString(s: Specimen, mode: 'full' | 'thumb' = 'full'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHEET_W} ${SHEET_H}">${sheetMarkup(s, mode)}</svg>`;
}
