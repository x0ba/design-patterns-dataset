import type { ReactNode } from 'react';
import { SheetViewer } from './SheetViewer';
import { PRESERVE } from '../data/collection';
import { formatCollectorNumber, formatCoord, formatDate, formatElevation, formatMiles, shortName } from '../lib/format';
import type { DeterminationKind, Specimen } from '../types';

export interface StepNav {
  index: number; // 1-based position in the current result list
  total: number;
  prev: string | null;
  next: string | null;
}

interface SheetDetailProps {
  spec: Specimen;
  step: StepNav | null;
  backLabel: string;
  onBack: () => void;
  onOpen: (id: string) => void;
}

const KIND_LABEL: Record<DeterminationKind, string> = {
  original: 'Original label',
  determination: 'Re-identified',
  annotation: 'Annotation',
};

function uncertainty(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function distanceWords(mi: number): string {
  if (mi <= 1) return 'within 1 mile of the preserve';
  if (mi <= 10) return 'within 10 miles of the preserve';
  return `${formatMiles(mi)} from the preserve`;
}

export function SheetDetail({ spec, step, backLabel, onBack, onOpen }: SheetDetailProps) {
  const current = spec.determinations[spec.determinations.length - 1];
  const original = spec.determinations[0];
  const reidentified = spec.determinations.length > 1;
  const laterDets = spec.determinations.slice(1);

  return (
    <div className="sheet">
      <div className="sheet__viewer">
        <SheetViewer
          key={spec.catalogNumber}
          spec={spec}
          label={`Herbarium sheet ${spec.catalogNumber}, ${spec.currentName}`}
          className="viewer--sheet"
        />
      </div>

      <div className="sheet__panel">
        <div className="sheet__toolbar">
          <button type="button" className="btn" onClick={onBack}>
            ← {backLabel}
          </button>
          {step && (
            <div className="step" aria-label="Move between sheets in these results">
              <button type="button" className="btn btn--icon" disabled={!step.prev} onClick={() => step.prev && onOpen(step.prev)} aria-label="Previous sheet">
                ‹
              </button>
              <span className="step__pos">
                {step.index} of {step.total}
              </span>
              <button type="button" className="btn btn--icon" disabled={!step.next} onClick={() => step.next && onOpen(step.next)} aria-label="Next sheet">
                ›
              </button>
            </div>
          )}
        </div>

        <header className="sheet__head">
          <p className="eyebrow">Catalog number</p>
          <p className="sheet__cat">{spec.catalogNumber}</p>
          <h1 className="sheet__name">
            <em>{spec.currentName}</em>
          </h1>
          <p className="sheet__tags">
            {reidentified && <span className="tag">Re-identified from {shortName(original.name)}</span>}
            {!spec.imaged && <span className="tag tag--warn">On loan · not imaged</span>}
          </p>
        </header>

        {!spec.imaged && (
          <p className="notice notice--loan">{spec.loanNote ?? 'This sheet is on loan and has no digital image.'}</p>
        )}

        <Section title="Determination history">
          <table className="det-table">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Name</th>
                <th scope="col">By</th>
                <th scope="col">Kind</th>
              </tr>
            </thead>
            <tbody>
              {spec.determinations.map((d) => {
                const isCurrent = d === current;
                return (
                  <tr key={`${d.year}-${d.name}-${d.kind}`} className={isCurrent ? 'is-current' : ''}>
                    <td>{d.year}</td>
                    <td>
                      <em>{d.name}</em>
                    </td>
                    <td>{d.by}</td>
                    <td>
                      {KIND_LABEL[d.kind]}
                      {isCurrent && <span className="tag tag--current">Current</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {laterDets.length === 0 && <p className="muted small">No later determinations. The original label name still stands.</p>}
        </Section>

        <Section title="Collection">
          <Dl
            rows={[
              ['Collector', `${spec.collector} ${formatCollectorNumber(spec.collectorNumber)}`],
              ['Collected', formatDate(spec.date)],
              ['Locality', spec.locality],
              ['County', `${spec.county} County, Oregon`],
              ['Elevation', formatElevation(spec.elevationFt)],
            ]}
          />
        </Section>

        <Section title="Where it grew">
          <Dl
            rows={[
              ['Coordinates', `${formatCoord(spec.latitude, 'N', 'S')}, ${formatCoord(spec.longitude, 'E', 'W')}`],
              ['Uncertainty', `± ${uncertainty(spec.uncertaintyM)}`],
              ['Distance', `${formatMiles(spec.distanceMi)}, ${distanceWords(spec.distanceMi)}`],
              ['Habitat', spec.habitat],
            ]}
          />
          <p className="muted small">
            Distance is measured from the centre of {PRESERVE.name} to the georeferenced point.
          </p>
        </Section>

        <Section title="Plant and condition">
          <Dl
            rows={[
              ['Phenology', spec.phenology.charAt(0).toUpperCase() + spec.phenology.slice(1)],
              ['Condition', spec.condition],
            ]}
          />
        </Section>

        <Section title="Label transcription">
          <div className="transcription">
            <p className="transcription__name">
              <em>{original.name}</em>
            </p>
            <p>{spec.locality}</p>
            <p>
              {formatDate(spec.date)}
            </p>
            <p>
              {spec.collector} {formatCollectorNumber(spec.collectorNumber)}
            </p>
            <p>
              {spec.county} Co., Oregon · {formatElevation(spec.elevationFt)}
            </p>
            {laterDets.map((d) => (
              <p key={`${d.year}-${d.name}`} className="transcription__slip">
                {d.kind === 'annotation' ? 'Annotated' : 'Det.'}: {shortName(d.name)} {d.year}, {d.by}
              </p>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sheet__section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Dl({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="dl">
      {rows.map(([k, v]) => (
        <div key={k} className="dl__row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
