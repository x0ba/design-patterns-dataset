import { DATA } from '../data';
import type { View } from './router';
import { L } from './router';
import { STATUS_LABEL } from '../data';

export type Kind = 'reel' | 'scene' | 'item' | 'source' | 'transcript' | 'clip' | 'filter' | 'page';
export interface Desc {
  key: string;
  href: string;
  label: string;
  short: string;
  sub?: string;
  kind: Kind;
  pid: string;
  recordable: boolean;
}

export function describe(v: View): Desc | null {
  const x = describeInner(v) as (Omit<Desc, 'short'> & { short?: string }) | null;
  if (!x) return null;
  const short = x.label.includes(' · ') && (x.kind === 'reel' || x.kind === 'scene') ? x.label.split(' · ')[0] : x.label;
  return { ...x, short } as Desc;
}

function describeInner(v: View): Omit<Desc, 'short'> | null {
  if (v.t === 'notfound') return null;
  const d = DATA[v.pid];
  if (!d) return null;
  const unit = d.project.unit;
  switch (v.t) {
    case 'overview': { const href = L.overview(v.pid); return { key: href, href, label: 'Overview', kind: 'page', pid: v.pid, recordable: false }; }
    case 'reels': { const href = L.reels(v.pid); return { key: href, href, label: `${unit}s & scenes`, kind: 'page', pid: v.pid, recordable: false }; }
    case 'reel': {
      const r = d.reels[v.n - 1]; const href = L.reel(v.pid, v.n);
      return { key: href, href, label: `${unit} ${v.n}${r ? ` · ${r.title}` : ''}`, kind: 'reel', pid: v.pid, recordable: true };
    }
    case 'scene': {
      const s = d.scenes.find((x) => x.n === v.n); const href = L.scene(v.pid, v.n);
      return { key: href, href, label: `Scene ${v.n}${s ? ` · ${s.title}` : ''}`, sub: s ? `${unit} ${s.reel}` : undefined, kind: 'scene', pid: v.pid, recordable: true };
    }
    case 'archive': {
      const src = v.q.get('source'); const st = v.q.get('status');
      const s = d.sources.find((x) => x.id === src);
      const href = L.archive(v.pid, { source: src || undefined, status: st || undefined, q: v.q.get('q') || undefined });
      const base = L.archive(v.pid);
      if (s && !st) return { key: href, href, label: s.name, sub: 'Archive source', kind: 'source', pid: v.pid, recordable: true };
      if (st && !s) return { key: href, href, label: st === 'pending' ? 'Pending clearances' : STATUS_LABEL[st] || 'Archive', sub: 'Archive filter', kind: 'filter', pid: v.pid, recordable: true };
      return { key: href || base, href, label: 'Archive & clearances', kind: 'page', pid: v.pid, recordable: false };
    }
    case 'item': {
      const it = d.items.find((x) => x.id === v.id); const href = L.item(v.pid, v.id);
      return { key: href, href, label: v.id, sub: it?.title, kind: 'item', pid: v.pid, recordable: true };
    }
    case 'clips': { const href = L.clips(v.pid); return { key: href, href, label: 'Clips', kind: 'page', pid: v.pid, recordable: false }; }
    case 'clip': { const href = L.clip(v.pid, v.id); return { key: href, href, label: v.id, kind: 'clip', pid: v.pid, recordable: true }; }
    case 'transcripts': { const href = L.transcripts(v.pid); return { key: href, href, label: 'Transcripts', kind: 'page', pid: v.pid, recordable: false }; }
    case 'transcript': {
      const t = d.transcripts.find((x) => x.id === v.id); const href = L.transcript(v.pid, v.id);
      return { key: href, href, label: t ? `${t.name}` : v.id, sub: 'Interview transcript', kind: 'transcript', pid: v.pid, recordable: true };
    }
  }
}
