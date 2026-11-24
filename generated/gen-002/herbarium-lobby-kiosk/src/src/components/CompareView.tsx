import { formatCollectorNumber, formatDate, formatElevation, formatMiles } from '../lib/format';
import type { Specimen } from '../types';
import { SheetViewer } from './SheetViewer';

interface CompareViewProps {
  left: Specimen;
  right: Specimen;
  leftRole: string;
  rightRole: string;
  backLabel: string;
  onBack: () => void;
  onSwap: () => void;
  onOpen: (id: string) => void;
}

export function CompareView({ left, right, leftRole, rightRole, backLabel, onBack, onSwap, onOpen }: CompareViewProps) {
  const yearsApart = Math.abs(right.date.year - left.date.year);

  const rows: { label: string; a: string; b: string }[] = [
    { label: 'Collected', a: formatDate(left.date), b: formatDate(right.date) },
    { label: 'Collector', a: `${left.collector} ${formatCollectorNumber(left.collectorNumber)}`, b: `${right.collector} ${formatCollectorNumber(right.collectorNumber)}` },
    { label: 'Current name', a: left.currentName, b: right.currentName },
    {
      label: 'Determinations',
      a: left.determinations.map((d) => `${d.year} ${d.name}`).join(' → '),
      b: right.determinations.map((d) => `${d.year} ${d.name}`).join(' → '),
    },
    { label: 'Locality', a: left.locality, b: right.locality },
    { label: 'Distance from preserve', a: formatMiles(left.distanceMi), b: formatMiles(right.distanceMi) },
    { label: 'Elevation', a: formatElevation(left.elevationFt), b: formatElevation(right.elevationFt) },
    { label: 'Phenology', a: left.phenology, b: right.phenology },
    { label: 'Condition', a: left.condition, b: right.condition },
  ];

  return (
    <div className="compare">
      <div className="compare__toolbar">
        <button type="button" className="btn" onClick={onBack}>
          ← {backLabel}
        </button>
        <p className="compare__summary">
          {yearsApart === 0 ? 'Same year' : `${yearsApart} years apart`}. Both sheets are from the current results.
        </p>
        <button type="button" className="btn" onClick={onSwap}>
          Swap sides
        </button>
      </div>

      <div className="compare__sheets">
        {[
          { spec: left, role: leftRole },
          { spec: right, role: rightRole },
        ].map(({ spec, role }) => (
          <figure key={spec.catalogNumber} className="compare__col">
            <figcaption>
              <p className="eyebrow">{role}</p>
              <p className="compare__year">{spec.date.year}</p>
              <p className="compare__name">
                <em>{spec.currentName}</em> · {spec.catalogNumber}
              </p>
            </figcaption>
            <SheetViewer key={spec.catalogNumber} spec={spec} label={`${role}: sheet ${spec.catalogNumber}`} className="viewer--compare" />
            <button type="button" className="btn btn--block" onClick={() => onOpen(spec.catalogNumber)}>
              Open full details
            </button>
          </figure>
        ))}
      </div>

      <table className="compare__table">
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">{leftRole}</th>
            <th scope="col">{rightRole}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const differs = r.a !== r.b;
            return (
              <tr key={r.label} className={differs ? 'is-diff' : ''}>
                <th scope="row">{r.label}</th>
                <td>{r.a}</td>
                <td>{r.b}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
