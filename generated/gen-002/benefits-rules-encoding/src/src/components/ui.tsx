import type { Value } from '../engine/expr';
import type { Citation, Kind, RuleNode } from '../engine/model';
import { CITATIONS, SECTIONS, AMENDED_CITE } from '../data/spec';

export const citeById = new Map<string, Citation>(CITATIONS.map((c) => [c.id, c]));

export function sectionLabel(id: string): string {
  return SECTIONS.find((s) => s.id === id)?.label ?? id;
}

export const KIND_LABEL: Record<Kind, string> = {
  condition: 'Condition',
  calculation: 'Calculation',
  outcome: 'Outcome',
};

export const REASON_LABEL: Record<string, string> = {
  ELIGIBLE: 'Eligible',
  NONFINANCIAL: 'Non-financial criteria failed',
  RESOURCE: 'Resource test failed',
  GROSS_INCOME: 'Gross income test failed',
  NET_INCOME: 'Net income test failed',
  BENEFIT_ZERO: 'Computed benefit is zero',
  ERROR: 'Step error',
};

/** The step that stops eligibility, for the reason code. */
export const REASON_STEP: Record<string, string> = {
  NONFINANCIAL: 'nonfin_ok',
  RESOURCE: 'resource_test',
  GROSS_INCOME: 'gross_test',
  NET_INCOME: 'net_test',
  BENEFIT_ZERO: 'benefit_raw',
};

export function fmtNumber(v: number, unit?: string): string {
  if (Number.isNaN(v)) return 'error';
  const digits = Number.isInteger(v) ? 0 : 2;
  const body = v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (unit === '$/mo' || unit === '$') return `$${body}`;
  return body;
}

export function fmtValue(v: Value | undefined, unit?: string): string {
  if (v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return v;
  return fmtNumber(v, unit);
}

export function valueClass(v: Value | undefined): string {
  if (v === undefined) return 'chip-none';
  if (typeof v === 'boolean') return v ? 'chip-true' : 'chip-false';
  if (typeof v === 'string') return 'chip-str';
  return Number.isNaN(v) ? 'chip-false' : 'chip-num';
}

export function KindPill({ kind }: { kind: Kind }) {
  return <span className={`kind kind-${kind}`}>{KIND_LABEL[kind]}</span>;
}

export function ValueChip({ value, unit }: { value: Value | undefined; unit?: string }) {
  return <span className={`value-chip ${valueClass(value)}`}>{fmtValue(value, unit)}</span>;
}

export function CiteChip({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const c = citeById.get(id);
  const amended = id === AMENDED_CITE;
  return (
    <span className={`cite ${amended ? 'cite-amended' : ''} ${c?.status === 'internal' ? 'cite-internal' : ''}`} title={c?.title}>
      {c?.cite ?? `Unknown: ${id}`}
      {onRemove && (
        <button className="cite-x" aria-label={`Remove citation ${c?.cite ?? id}`} onClick={onRemove}>
          ×
        </button>
      )}
    </span>
  );
}

export function isAffected(n: RuleNode): boolean {
  return n.tags.includes('income-standard');
}
