import { useMemo } from 'react';
import type { Specimen } from '../types';
import { sheetMarkup, SHEET_H, SHEET_W } from '../lib/sheetMarkup';

/** Small rendering of a sheet for result cards. Sheets on loan show a placeholder. */
export function SheetThumb({ spec }: { spec: Specimen }) {
  const markup = useMemo(() => (spec.imaged ? sheetMarkup(spec, 'thumb') : null), [spec]);
  if (!markup) {
    return (
      <div className="thumb thumb--loan" aria-hidden="true">
        <span className="thumb__loan-title">On loan</span>
        <span>Not imaged</span>
      </div>
    );
  }
  return (
    <div className="thumb" aria-hidden="true">
      <svg viewBox={`0 0 ${SHEET_W} ${SHEET_H}`} preserveAspectRatio="xMidYMid meet">
        <g dangerouslySetInnerHTML={{ __html: markup }} />
      </svg>
    </div>
  );
}
