export type FontId = 'yellowtail' | 'kaushan' | 'barlow' | 'oswald' | 'cinzel';
export type Fill = 'gold' | 'enamel' | 'none';

export interface Outline { on: boolean; w: number }
export interface Shade { on: boolean; dist: number; angle: number }

export interface El {
  id: string;
  name: string;
  kind: 'text' | 'ornament';
  lines: string[];
  font: FontId;
  /** Cap height in inches for text; overall height in inches for ornaments. */
  cap: number;
  /** Total angle subtended by the baseline, degrees. + arches up, − sags. */
  arc: number;
  /** Horizontal stretch of the letterforms, 1 = as drawn. */
  wd: number;
  /** Letterspacing in em. */
  tracking: number;
  /** Baseline-to-baseline distance in cap heights (multi-line blocks). */
  leading: number;
  /** Anchor: horizontal centre, inches from the left edge of the window. */
  x: number;
  /** Anchor: baseline of the bottom line (bottom edge for ornaments), inches from the floor. */
  y: number;
  fill: Fill;
  outline: Outline;
  shade: Shade;
  visible: boolean;
  locked: boolean;
}

export interface Finishes {
  leafKarat: '22k' | '23k' | '23.75k';
  side: 'surface' | 'reverse';
  center: 'matte' | 'burnished';
  bookPrice: number;
  wastePct: number;
  enamel: 'black' | 'red' | 'ivory';
}

export interface Doc { elements: El[]; finishes: Finishes }

export interface Version {
  id: string;
  label: string;
  date: string;
  note: string;
  doc: Doc;
}

export interface Box { l: number; r: number; b: number; t: number }
