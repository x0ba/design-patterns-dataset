import type { Decision, LineRecord } from '../types';
import { CLS_NAME, DECISION_LABEL, flagsFor, FLAG_LABEL, METHOD_NAME, sidesFor } from './model';

function cell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export function download(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const HEADER = [
  'line_id',
  'parcel_id',
  'address',
  'block',
  'built_year',
  'install_year',
  'install_basis',
  'utility_material_proposed',
  'utility_class_proposed',
  'utility_method',
  'customer_material_proposed',
  'customer_class_proposed',
  'customer_method',
  'confidence',
  'flags',
  'decision',
  'utility_class_final',
  'utility_material_final',
  'customer_class_final',
  'customer_material_final',
  'field_verification_2024',
  'reviewer',
  'decided_at',
  'note',
];

/** Working file: every line in the batch, with proposal, decision, and sources kept apart. */
export function workingFileCsv(lines: LineRecord[], decisions: Record<string, Decision>): string {
  const rows = lines.map((l) => {
    const d = decisions[l.id];
    if (!l.utility || !l.customer) {
      return [l.id, l.parcelId, l.address, l.block, l.builtYear, '', '', '', '', '', '', '', '', '', '', 'Not yet proposed', '', '', '', '', '', '', '', ''];
    }
    const flags = flagsFor(l).map((f) => FLAG_LABEL[f.code]).join('; ');
    const finalSides = d && (d.status === 'accepted' || d.status === 'overridden') ? sidesFor(l, d) : undefined;
    return [
      l.id,
      l.parcelId,
      l.address,
      l.block,
      l.builtYear,
      l.installYear ?? '',
      l.installBasis ?? '',
      l.utility.material,
      CLS_NAME[l.utility.cls],
      METHOD_NAME[l.utility.method],
      l.customer.material,
      CLS_NAME[l.customer.cls],
      METHOD_NAME[l.customer.method],
      l.confidence ?? '',
      flags,
      d ? DECISION_LABEL[d.status] : DECISION_LABEL.open,
      finalSides?.utility ? CLS_NAME[finalSides.utility.cls] : '',
      finalSides?.utility?.material ?? '',
      finalSides?.customer ? CLS_NAME[finalSides.customer.cls] : '',
      finalSides?.customer?.material ?? '',
      l.fv2024 ? `${l.fv2024.ref} (${l.fv2024.date}): ${l.fv2024.material}` : '',
      d ? d.by : '',
      d ? d.at : '',
      d?.note ?? '',
    ];
  });
  return toCsv(HEADER, rows);
}

export function fieldDigCsv(lines: LineRecord[], decisions: Record<string, Decision>): string {
  const header = ['line_id', 'parcel_id', 'address', 'utility_material_proposed', 'customer_material_proposed', 'reason', 'requested_by', 'requested_at'];
  const rows = lines
    .filter((l) => decisions[l.id]?.status === 'field_dig' && l.utility && l.customer)
    .map((l) => {
      const d = decisions[l.id];
      return [l.id, l.parcelId, l.address, l.utility?.material, l.customer?.material, d.note ?? '', d.by, d.at];
    });
  return toCsv(header, rows);
}
