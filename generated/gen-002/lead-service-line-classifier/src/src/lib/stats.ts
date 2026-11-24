import type { Decision, LineRecord } from '../types';
import { flagsFor, type FlagCode } from './model';

export interface Flagged {
  line: LineRecord;
  flags: FlagCode[];
}

export interface BatchStats {
  total: number;
  proposed: number;
  queued: number;
  high: number;
  medium: number;
  low: number;
  grr: number;
  grrLinked: number;
  grrUnlinked: number;
  grrNeighborHigh: number;
  conflicts: number;
  permitUnstated: number;
  permitUnstatedInConflict: number;
  neighborHigh: number;
  customerLead: number;
  customerUnknown: number;
  decided: number;
  accepted: number;
  overridden: number;
  fieldDig: number;
  held: number;
  open: number;
  /** Flag codes per proposed line id (empty array when the line is clean). */
  flagsById: Map<string, FlagCode[]>;
  /** Blocks, in order, with per-block counts. */
  blocks: { block: string; street: string; total: number; proposed: number; decided: number; flagged: number }[];
}

export function computeStats(lines: LineRecord[], decisions: Record<string, Decision>): BatchStats {
  const proposed = lines.filter((l) => l.status === 'proposed' && l.utility && l.customer);
  const flagsById = new Map<string, FlagCode[]>();
  for (const l of proposed) flagsById.set(l.id, flagsFor(l).map((f) => f.code));
  const has = (l: LineRecord, code: FlagCode) => flagsById.get(l.id)?.includes(code) ?? false;

  const count = (pred: (l: LineRecord) => boolean) => proposed.filter(pred).length;
  const decidedStatus = (status: Decision['status']) => count((l) => decisions[l.id]?.status === status);
  const decided = count((l) => decisions[l.id] !== undefined);

  const blocksOrder: string[] = [];
  const byBlock = new Map<string, LineRecord[]>();
  for (const l of lines) {
    if (!byBlock.has(l.block)) {
      byBlock.set(l.block, []);
      blocksOrder.push(l.block);
    }
    byBlock.get(l.block)!.push(l);
  }
  const blocks = blocksOrder.map((block) => {
    const ls = byBlock.get(block)!;
    const ps = ls.filter((l) => l.status === 'proposed');
    return {
      block,
      street: ls[0].street,
      total: ls.length,
      proposed: ps.length,
      decided: ps.filter((l) => decisions[l.id] !== undefined).length,
      flagged: ps.filter((l) => (flagsById.get(l.id) ?? []).length > 0).length,
    };
  });

  return {
    total: lines.length,
    proposed: proposed.length,
    queued: lines.length - proposed.length,
    high: count((l) => l.confidence === 'high'),
    medium: count((l) => l.confidence === 'medium'),
    low: count((l) => l.confidence === 'low'),
    grr: count((l) => l.utility!.cls === 'GRR'),
    grrLinked: count((l) => l.utility!.cls === 'GRR' && !has(l, 'grr_unlinked')),
    grrUnlinked: count((l) => has(l, 'grr_unlinked')),
    grrNeighborHigh: count((l) => has(l, 'grr_unlinked') && l.utility!.method === 'neighbor'),
    conflicts: count((l) => has(l, 'conflict')),
    permitUnstated: count((l) => has(l, 'permit_unstated')),
    permitUnstatedInConflict: count((l) => has(l, 'permit_unstated') && has(l, 'conflict')),
    neighborHigh: count((l) => has(l, 'neighbor_high')),
    customerLead: count((l) => l.customer!.cls === 'LEAD'),
    customerUnknown: count((l) => l.customer!.cls === 'UNKNOWN'),
    decided,
    accepted: decidedStatus('accepted'),
    overridden: decidedStatus('overridden'),
    fieldDig: decidedStatus('field_dig'),
    held: decidedStatus('held'),
    open: proposed.length - decided,
    flagsById,
    blocks,
  };
}
