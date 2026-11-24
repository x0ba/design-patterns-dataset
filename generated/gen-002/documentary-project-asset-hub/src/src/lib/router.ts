import { useEffect, useState } from 'react';

export type View =
  | { t: 'overview'; pid: string }
  | { t: 'reels'; pid: string }
  | { t: 'reel'; pid: string; n: number }
  | { t: 'scene'; pid: string; n: number }
  | { t: 'archive'; pid: string; q: URLSearchParams }
  | { t: 'item'; pid: string; id: string }
  | { t: 'clips'; pid: string; q: URLSearchParams }
  | { t: 'clip'; pid: string; id: string }
  | { t: 'transcripts'; pid: string; q: URLSearchParams }
  | { t: 'transcript'; pid: string; id: string; q: URLSearchParams }
  | { t: 'notfound' };

export const DEFAULT_HASH = '#/p/salt-road/reel/3';

export function currentHash() {
  const h = window.location.hash;
  return h && h.startsWith('#/') ? h : DEFAULT_HASH;
}

export function useHash() {
  const [h, setH] = useState(currentHash());
  useEffect(() => {
    const on = () => setH(currentHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return h;
}

export function parseView(hash: string): View {
  const [pathPart, qs = ''] = hash.replace(/^#/, '').split('?');
  const q = new URLSearchParams(qs);
  const seg = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  if (seg[0] !== 'p' || !seg[1]) return { t: 'notfound' };
  const pid = seg[1];
  const [kind, arg] = [seg[2], seg[3]];
  if (!kind) return { t: 'overview', pid };
  switch (kind) {
    case 'reels': return { t: 'reels', pid };
    case 'reel': return { t: 'reel', pid, n: Number(arg) };
    case 'scene': return { t: 'scene', pid, n: Number(arg) };
    case 'archive': return arg ? { t: 'item', pid, id: arg } : { t: 'archive', pid, q };
    case 'clips': return { t: 'clips', pid, q };
    case 'clip': return { t: 'clip', pid, id: arg };
    case 'transcripts': return { t: 'transcripts', pid, q };
    case 'transcript': return { t: 'transcript', pid, id: arg, q };
    default: return { t: 'notfound' };
  }
}

const e = encodeURIComponent;
function qs(o: Record<string, string | number | undefined | null>) {
  const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all');
  return p.length ? '?' + p.map(([k, v]) => `${k}=${e(String(v))}`).join('&') : '';
}

export const L = {
  overview: (pid: string) => `#/p/${pid}`,
  reels: (pid: string) => `#/p/${pid}/reels`,
  reel: (pid: string, n: number) => `#/p/${pid}/reel/${n}`,
  scene: (pid: string, n: number) => `#/p/${pid}/scene/${n}`,
  archive: (pid: string, o: Record<string, string | number | undefined> = {}) => `#/p/${pid}/archive${qs(o)}`,
  item: (pid: string, id: string) => `#/p/${pid}/archive/${e(id)}`,
  clips: (pid: string, o: Record<string, string | number | undefined> = {}) => `#/p/${pid}/clips${qs(o)}`,
  clip: (pid: string, id: string) => `#/p/${pid}/clip/${e(id)}`,
  transcripts: (pid: string, o: Record<string, string | number | undefined> = {}) => `#/p/${pid}/transcripts${qs(o)}`,
  transcript: (pid: string, id: string, o: Record<string, string | number | undefined> = {}) => `#/p/${pid}/transcript/${e(id)}${qs(o)}`,
};

export function go(href: string) { window.location.hash = href; }
export function replace(href: string) { window.history.replaceState(null, '', href); window.dispatchEvent(new HashChangeEvent('hashchange')); }
