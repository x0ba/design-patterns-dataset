import type { Entry, Sub } from '../data/types.ts';
import { entryLines } from './lines.ts';
import { dedupeLocs, locKey, sortSubs } from './locators.ts';
import type { SplitPlan } from './analysis.ts';

export type Decision =
  | { kind: 'split'; key: string; entryId: number; plan: SplitPlan }
  | { kind: 'keep'; key: string; entryId: number }
  | { kind: 'merge'; key: string; clusterId: string; keepId: number; mergeIds: number[]; leaveSee: boolean }
  | { kind: 'dismissName'; key: string; clusterId: string }
  | { kind: 'xref'; key: string; refId: string; action: 'retarget' | 'remove'; target?: string }
  | { kind: 'loop'; key: string; keepHeading: string; otherHeading: string };

export interface Levers {
  citeNotes: boolean;
  crewNames: boolean;
}

export interface LedgerItem {
  key: string;
  label: string;
  detail: string;
  delta: number;
  decision?: Decision;
  lever?: keyof Levers;
}

export interface Working {
  entries: Map<number, Entry>;
  ledger: LedgerItem[];
  delta: number;
}

function clone(e: Entry): Entry {
  return { ...e, direct: [...e.direct], subs: e.subs.map((s) => ({ ...s, locs: [...s.locs] })), see: [...e.see], seeAlso: [...e.seeAlso] };
}

export function applySplit(e: Entry, plan: SplitPlan): Entry {
  const m = new Map(e.direct.map((l) => [locKey(l), l]));
  const out = clone(e);
  out.direct = plan.general.map((k) => m.get(k)!).filter(Boolean);
  const subs: Sub[] = [...out.subs];
  for (const g of plan.groups) {
    if (!g.locs.length) continue;
    const heading = g.heading.trim() || 'untitled subentry';
    const locs = g.locs.map((k) => m.get(k)!).filter(Boolean);
    const existing = subs.find((s) => s.heading === heading);
    if (existing) existing.locs = dedupeLocs([...existing.locs, ...locs]);
    else subs.push({ heading, locs: dedupeLocs(locs) });
  }
  out.subs = sortSubs(subs);
  return out;
}

export function mergeEntries(keep: Entry, others: Entry[]): Entry {
  const out = clone(keep);
  for (const o of others) {
    out.direct = dedupeLocs([...out.direct, ...o.direct]);
    for (const s of o.subs) {
      const ex = out.subs.find((x) => x.heading === s.heading);
      if (ex) ex.locs = dedupeLocs([...ex.locs, ...s.locs]);
      else out.subs.push({ heading: s.heading, locs: [...s.locs] });
    }
    for (const t of o.seeAlso) if (!out.seeAlso.includes(t) && t !== out.heading) out.seeAlso.push(t);
  }
  out.subs = sortSubs(out.subs);
  return out;
}

export function buildWorking(base: Entry[], decisions: Decision[], levers: Levers, labelOf: (d: Decision, base: Map<number, Entry>) => { label: string; detail: string }): Working {
  const baseMap = new Map(base.map((e) => [e.id, e]));
  const work = new Map(baseMap);
  const ledger: LedgerItem[] = [];
  const linesOf = (ids: Iterable<number>) => {
    let n = 0;
    for (const id of ids) {
      const e = work.get(id);
      if (e) n += entryLines(e);
    }
    return n;
  };
  const headingIndex = () => {
    const m = new Map<string, number>();
    for (const e of work.values()) m.set(e.heading, e.id);
    return m;
  };
  const retargetAll = (from: string, to: string, affected: Set<number>) => {
    for (const e of work.values()) {
      const hit = (t: string) => t === from || t.startsWith(from + ': ');
      if (e.see.some(hit) || e.seeAlso.some(hit)) {
        const c = clone(e);
        const rw = (t: string) => (hit(t) ? to + t.slice(from.length) : t);
        c.see = [...new Set(c.see.map(rw))].filter((t) => t !== c.heading);
        c.seeAlso = [...new Set(c.seeAlso.map(rw))].filter((t) => t !== c.heading);
        work.set(e.id, c);
        affected.add(e.id);
      }
    }
  };

  for (const d of decisions) {
    const affected = new Set<number>();
    let before = 0;
    const touch = (id: number) => {
      if (!affected.has(id)) {
        affected.add(id);
        before += linesOf([id]);
      }
    };
    if (d.kind === 'split') {
      const e = work.get(d.entryId);
      if (!e) continue;
      touch(e.id);
      work.set(e.id, applySplit(e, d.plan));
    } else if (d.kind === 'merge') {
      const keep = work.get(d.keepId);
      if (!keep) continue;
      const others = d.mergeIds.map((id) => work.get(id)).filter(Boolean) as Entry[];
      touch(keep.id);
      for (const o of others) touch(o.id);
      // references to merged headings are counted in the before-state too
      const refHolders = [...work.values()].filter((x) => others.some((o) => x.see.includes(o.heading) || x.seeAlso.includes(o.heading)));
      for (const r of refHolders) touch(r.id);
      work.set(keep.id, mergeEntries(keep, others));
      for (const o of others) {
        if (d.leaveSee) work.set(o.id, { ...clone(o), direct: [], subs: [], seeAlso: [], see: [keep.heading] });
        else work.delete(o.id);
        if (!d.leaveSee) retargetAll(o.heading, keep.heading, affected);
      }
    } else if (d.kind === 'xref') {
      const [fromId, kind, target] = d.refId.split('|');
      const e = work.get(Number(fromId));
      if (!e) continue;
      touch(e.id);
      const c = clone(e);
      const list = kind === 'see' ? c.see : c.seeAlso;
      const i = list.indexOf(target);
      if (i >= 0) {
        if (d.action === 'remove' || !d.target || list.includes(d.target)) list.splice(i, 1);
        else list[i] = d.target;
      }
      work.set(e.id, c);
    } else if (d.kind === 'loop') {
      const idx = headingIndex();
      const keep = work.get(idx.get(d.keepHeading)!);
      const other = work.get(idx.get(d.otherHeading)!);
      if (!keep || !other) continue;
      touch(keep.id);
      touch(other.id);
      const merged = mergeEntries({ ...clone(keep), see: [] }, [other]);
      merged.see = [];
      work.set(keep.id, merged);
      work.set(other.id, { ...clone(other), direct: [], subs: [], seeAlso: [], see: [keep.heading] });
    } else {
      // keep / dismissName: no length effect, recorded for status
    }
    const after = linesOf(affected);
    const { label, detail } = labelOf(d, baseMap);
    ledger.push({ key: d.key, label, detail, delta: after - before, decision: d });
  }

  if (levers.citeNotes) {
    let before = 0;
    let after = 0;
    let removedLocs = 0;
    let removedEntries = 0;
    for (const e of [...work.values()]) {
      const hasCite = e.direct.some((l) => l.cite) || e.subs.some((s) => s.locs.some((l) => l.cite));
      if (!hasCite) continue;
      before += entryLines(e);
      const c = clone(e);
      const n0 = c.direct.length + c.subs.reduce((a, s) => a + s.locs.length, 0);
      c.direct = c.direct.filter((l) => !l.cite);
      c.subs = c.subs.map((s) => ({ ...s, locs: s.locs.filter((l) => !l.cite) })).filter((s) => s.locs.length);
      const n1 = c.direct.length + c.subs.reduce((a, s) => a + s.locs.length, 0);
      removedLocs += n0 - n1;
      if (n1 === 0 && !c.see.length) {
        work.delete(e.id);
        removedEntries++;
      } else {
        work.set(e.id, c);
        after += entryLines(c);
      }
    }
    ledger.push({
      key: 'lever-citeNotes', lever: 'citeNotes', label: 'Drop citation-only note locators',
      detail: `${removedLocs.toLocaleString()} locators removed${removedEntries ? `, ${removedEntries} headings left empty and dropped` : ''}`,
      delta: after - before,
    });
  }
  if (levers.crewNames) {
    let before = 0;
    let n = 0;
    for (const e of [...work.values()]) {
      if (!e.crew) continue;
      before += entryLines(e);
      work.delete(e.id);
      n++;
    }
    ledger.push({ key: 'lever-crewNames', lever: 'crewNames', label: 'Drop names found only in printed crew lists', detail: `${n} single-locator personal-name headings`, delta: -before });
  }

  return { entries: work, ledger, delta: ledger.reduce((a, l) => a + l.delta, 0) };
}
