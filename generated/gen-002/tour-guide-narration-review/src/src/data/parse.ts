import type { Segment, Speaker } from '../types';

export function ts(s: string): number {
  const parts = s.split(':').map(Number);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

const SPEAKERS: Record<string, Speaker> = {
  I: 'Inês',
  G: 'Guest',
  G2: 'Guest 2',
  M: 'Margarida',
  W: 'none',
};

/** Parse lines of the form `h:mm:ss|S|text` */
export function parseTranscript(src: string): Segment[] {
  return src
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [time, sp, ...rest] = line.split('|');
      return { t: ts(time), speaker: SPEAKERS[sp] ?? 'none', text: rest.join('|').trim() };
    });
}
