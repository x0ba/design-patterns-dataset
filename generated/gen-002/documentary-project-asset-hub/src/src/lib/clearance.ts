import { DATA } from '../data';
import type { ArchivalItem, Scene, Status } from '../data/types';

const maps = new Map<string, Map<string, ArchivalItem>>();
export function itemMap(pid: string) {
  let m = maps.get(pid);
  if (!m) { m = new Map(DATA[pid].items.map((i) => [i.id, i])); maps.set(pid, m); }
  return m;
}

export interface Summary {
  total: number;
  counts: Record<Status, number>;
  worst: Status | null;
  verdict: 'none' | 'cleared' | 'festival' | 'pending' | 'denied';
}

export function summarize(items: ArchivalItem[]): Summary {
  const counts: Record<Status, number> = { 'cleared-all-media': 0, 'cleared-festival-only': 0, pending: 0, denied: 0 };
  items.forEach((i) => counts[i.clearance.status]++);
  const worst: Status | null = counts.denied ? 'denied' : counts.pending ? 'pending' : counts['cleared-festival-only'] ? 'cleared-festival-only' : counts['cleared-all-media'] ? 'cleared-all-media' : null;
  const verdict = !items.length ? 'none' : counts.denied ? 'denied' : counts.pending ? 'pending' : counts['cleared-festival-only'] ? 'festival' : 'cleared';
  return { total: items.length, counts, worst, verdict };
}

export function sceneItems(pid: string, s: Scene) {
  const m = itemMap(pid);
  return s.archival.map((id) => m.get(id)!).filter(Boolean);
}

export function festivalLine(status: Status) {
  switch (status) {
    case 'cleared-all-media': return { ok: true, text: 'Cleared for festival use (all media)' };
    case 'cleared-festival-only': return { ok: true, text: 'Cleared for festival use (festival only)' };
    case 'pending': return { ok: false, text: 'Not cleared yet for festival use' };
    case 'denied': return { ok: false, text: 'Not cleared: licence denied' };
  }
}
