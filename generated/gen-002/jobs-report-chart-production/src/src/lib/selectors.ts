// Derived views over AppState. Nothing here mutates state.

import { useEffect, useState } from 'react';
import { SCENARIO_NOW, personById } from '../data/seed';
import type { AppState, Chart, Comment, FeedEvent, Filters, Person, Status } from './types';

// ----- clock: the scenario's "now" plus real time elapsed since the page loaded

const LOADED_AT = Date.now();

export function simNow(): number {
  return SCENARIO_NOW + (Date.now() - LOADED_AT);
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(simNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(simNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ----- charts

export const STATUS_LIST: Status[] = ['drafting', 'in review', 'disclosure hold', 'approved', 'final'];

export function countByStatus(charts: Chart[]): Record<Status, number> {
  const out: Record<Status, number> = { drafting: 0, 'in review': 0, 'disclosure hold': 0, approved: 0, final: 0 };
  for (const c of charts) out[c.status] += 1;
  return out;
}

export function openThreads(comments: Comment[]): Comment[] {
  return comments.filter((c) => !c.resolved);
}

export function openCountFor(comments: Comment[], chartId: string): number {
  return comments.filter((c) => c.chartId === chartId && !c.resolved).length;
}

export function matchesFilters(chart: Chart, f: Filters): boolean {
  if (f.status !== 'all' && chart.status !== f.status) return false;
  if (f.ownerId !== 'all' && chart.ownerId !== f.ownerId) return false;
  if (f.geography !== 'all' && chart.geography !== f.geography) return false;
  if (f.source !== 'all' && chart.source !== f.source) return false;
  if (f.query.trim()) {
    const q = f.query.trim().toLowerCase();
    const hay = `${chart.id} ${chart.headline} ${chart.subtitle} ${chart.source} ${chart.geographyDetail}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function filteredCharts(state: AppState): Chart[] {
  return state.charts.filter((c) => matchesFilters(c, state.filters));
}

export function selectedChart(state: AppState): Chart | null {
  return state.charts.find((c) => c.id === state.selectedId) ?? state.charts[0] ?? null;
}

// ----- presence: who is editing or reviewing what right now

export interface PresenceGroup {
  person: Person;
  items: { chartId: string; since: number; activity: string }[];
  since: number;
}

export function presenceGroups(charts: Chart[]): PresenceGroup[] {
  const map = new Map<string, PresenceGroup>();
  for (const c of charts) {
    for (const a of c.active) {
      const person = personById(a.personId);
      if (!person) continue;
      const g = map.get(person.id) ?? { person, items: [], since: a.since };
      g.items.push({ chartId: c.id, since: a.since, activity: a.activity });
      g.since = Math.min(g.since, a.since);
      map.set(person.id, g);
    }
  }
  return [...map.values()].sort((a, b) => a.since - b.since);
}

// ----- change feed

export function feedSinceLastSeen(state: AppState): { items: FeedEvent[]; newCount: number } {
  const sorted = [...state.feed].sort((a, b) => b.at - a.at);
  const newer = sorted.filter((e) => e.at > state.lastSeenAt);
  return { items: state.feedShowAll ? sorted : newer, newCount: newer.length };
}

export function hasRecheck(chart: Chart): boolean {
  return chart.status === 'approved' && chart.needsRecheck;
}
