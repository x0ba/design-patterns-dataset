import batchJson from '../data/northgate-batch.json';
import type { BatchFile, Cls, Confidence, Decision, DecisionStatus, LineRecord, Method, SideOverride } from '../types';

export const BATCH = batchJson as unknown as BatchFile;

/** The working snapshot date. Days-remaining math uses this, not the wall clock. */
export const ASOF = BATCH.meta.asOf;

export const CLS_NAME: Record<Cls, string> = {
  LEAD: 'Lead',
  GRR: 'Galvanized requiring replacement',
  NON_LEAD: 'Non-lead',
  UNKNOWN: 'Unknown',
};

export const CLS_SHORT: Record<Cls, string> = {
  LEAD: 'Lead',
  GRR: 'GRR',
  NON_LEAD: 'Non-lead',
  UNKNOWN: 'Unknown',
};

export const CLS_ORDER: Cls[] = ['LEAD', 'GRR', 'NON_LEAD', 'UNKNOWN'];

export const METHOD_NAME: Record<Method, string> = {
  direct: 'Direct record',
  permit: 'Permit inference',
  neighbor: 'Neighbor inference',
  none: 'No record',
};

export const CONF_ORDER: Confidence[] = ['high', 'medium', 'low'];

/* ---------- rule references (working copy of the assistant instructions) ---------- */

export interface RuleRef {
  id: string;
  title: string;
  text: string;
  checkedBy?: FlagCode;
}

export const RULES: RuleRef[] = [
  {
    id: '§3.2',
    title: 'Galvanized requiring replacement',
    text: 'Galvanized iron is GRR only if it is or was downstream of a lead service line or a lead goose-neck. Galvanized iron with no documented lead link is non-lead.',
    checkedBy: 'grr_unlinked',
  },
  {
    id: '§3.4',
    title: 'Customer side',
    text: 'A customer-side class needs a customer-side record. Without one the class is Unknown. Neighboring lines never set the customer side.',
  },
  {
    id: '§4.1',
    title: 'Direct record governs',
    text: 'A tap card entry for the same line outranks any inference from neighbors, permits, or period practice.',
  },
  {
    id: '§4.3',
    title: 'Permits',
    text: 'A permit establishes the install or renewal date and the work type. It establishes material only where the permit text names the material.',
    checkedBy: 'permit_unstated',
  },
  {
    id: '§4.4',
    title: 'Neighbor inference',
    text: 'Neighboring lines may support a utility-side class at medium confidence at most.',
    checkedBy: 'neighbor_high',
  },
  {
    id: '§4.5',
    title: 'Field verification',
    text: 'A field verification from any year outranks tap cards, permits, and inference for the same line.',
    checkedBy: 'conflict',
  },
  {
    id: '§5',
    title: 'Confidence',
    text: 'High confidence needs a direct record or a field verification on the utility side.',
    checkedBy: 'neighbor_high',
  },
];

/* ---------- flags (rule checks run on every proposal) ---------- */

export type FlagCode = 'conflict' | 'permit_unstated' | 'neighbor_high' | 'grr_unlinked';

export interface Flag {
  code: FlagCode;
  /** Blocking flags prevent acceptance. Warning flags require a reviewer note to accept. */
  blocking: boolean;
  label: string;
  detail: string;
  rule: string;
}

export const FLAG_LABEL: Record<FlagCode, string> = {
  conflict: '2024 conflict',
  permit_unstated: 'Permit states no material',
  neighbor_high: 'High, neighbor only',
  grr_unlinked: 'GRR, no lead link',
};

export const FLAG_SHORT: Record<FlagCode, string> = {
  conflict: '2024 conflict',
  permit_unstated: 'Permit, no material',
  neighbor_high: 'Neighbor only, high',
  grr_unlinked: 'GRR, no lead link',
};

export function flagsFor(line: LineRecord): Flag[] {
  if (line.status !== 'proposed' || !line.utility) return [];
  const u = line.utility;
  const out: Flag[] = [];
  if (line.fv2024 && (line.fv2024.cls !== u.cls || line.fv2024.material !== u.material)) {
    out.push({
      code: 'conflict',
      blocking: true,
      label: FLAG_LABEL.conflict,
      detail: `${line.fv2024.ref} (${line.fv2024.date}) found ${line.fv2024.material}. A field verification outranks records and inference for this line.`,
      rule: '§4.5',
    });
  }
  if (u.method === 'permit' && u.cls !== 'UNKNOWN' && u.sources.some((s) => s.kind === 'permit' && s.statesMaterial === false)) {
    out.push({
      code: 'permit_unstated',
      blocking: false,
      label: FLAG_LABEL.permit_unstated,
      detail: 'The only cited permit does not name a material. It supports the install date, not the class.',
      rule: '§4.3',
    });
  }
  if (u.method === 'neighbor' && line.confidence === 'high') {
    out.push({
      code: 'neighbor_high',
      blocking: false,
      label: FLAG_LABEL.neighbor_high,
      detail: 'High confidence is set on neighbor inference alone. Neighbor inference is capped at medium.',
      rule: '§4.4 / §5',
    });
  }
  if (u.cls === 'GRR' && !u.sources.some((s) => s.documentsLeadLink)) {
    out.push({
      code: 'grr_unlinked',
      blocking: false,
      label: FLAG_LABEL.grr_unlinked,
      detail: 'No record shows a lead connection upstream of this galvanized run.',
      rule: '§3.2',
    });
  }
  return out;
}

/* ---------- decisions ---------- */

export interface SideState {
  cls: Cls;
  material: string;
}

/** Final classification for each side, given the reviewer's decision (if any). */
export function sidesFor(line: LineRecord, d?: Decision): { utility?: SideState; customer?: SideState } {
  if (!line.utility || !line.customer) return {};
  const overridden = d?.status === 'overridden';
  const utility: SideState =
    overridden && d?.utility ? d.utility : { cls: line.utility.cls, material: line.utility.material };
  const customer: SideState =
    overridden && d?.customer ? d.customer : { cls: line.customer.cls, material: line.customer.material };
  return { utility, customer };
}

export function overrideFromSides(line: LineRecord): { utility: SideOverride; customer: SideOverride } | null {
  if (!line.utility || !line.customer) return null;
  return {
    utility: { cls: line.utility.cls, material: line.utility.material },
    customer: { cls: line.customer.cls, material: line.customer.material },
  };
}

export const DECISION_LABEL: Record<DecisionStatus | 'open', string> = {
  accepted: 'Accepted',
  overridden: 'Overridden',
  field_dig: 'Field dig',
  held: 'Held',
  open: 'Open',
};

/* ---------- formatting ---------- */

function utcDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((utcDay(toIso) - utcDay(fromIso)) / 86_400_000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function fmtStamp(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const date = `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
  const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

export function pct(part: number, whole: number): string {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

export function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export const REVIEWER = { name: 'Lucía Ferreira', initials: 'LF', role: 'GIS Analyst, Water Distribution Division' };
