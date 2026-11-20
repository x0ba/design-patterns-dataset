'use client';

import { Meter, MeterIndicator, MeterTrack } from '@ui-sdk/react/meter';
import { band as bandOf, BAND_LABEL, fmt } from '@/lib/format';

/**
 * A 0–1 reading as a number and a bar on one line: agreement, reliability,
 * confidence. `banded` colors it by the reliability thresholds (and marks them
 * as ticks), so weak values stand out when scanning a column. The number comes
 * first so values line up for reading; the bar is for comparing at a glance.
 */
export function Score({ value, label, banded = false, digits = 2, size = 'md', showValue = true, min = 0, max = 1 }: {
  value: number | null;
  label: string;
  banded?: boolean;
  digits?: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
  min?: number;
  max?: number;
}) {
  const b = banded ? bandOf(value) : undefined;
  const clamped = value === null ? min : Math.min(max, Math.max(min, value));
  return (
    <span className="score" data-size={size} data-band={b} title={b ? BAND_LABEL[b] : undefined}>
      {showValue ? <span className="score-num num" aria-hidden="true">{fmt(value, digits)}</span> : null}
      <Meter
        className="score-meter"
        value={clamped}
        min={min}
        max={max}
        aria-label={label}
        getValueLabel={() => (value === null ? 'not computed' : `${fmt(value, digits)}${b ? `, ${BAND_LABEL[b].toLowerCase()}` : ''}`)}
      >
        <MeterTrack className="score-track">
          <MeterIndicator className="score-fill" />
          {banded ? [0.667, 0.8].map((t) => <span key={t} className="score-tick" style={{ insetInlineStart: `${((t - min) / (max - min)) * 100}%` }} aria-hidden="true" />) : null}
        </MeterTrack>
      </Meter>
    </span>
  );
}

/** The reliability bands, as a key for a panel that uses banded scores. */
export function BandKey() {
  return (
    <ul className="band-key" aria-label="Reliability bands">
      <li data-band="high"><i aria-hidden="true" />≥ 0.800 reliable</li>
      <li data-band="mid"><i aria-hidden="true" />0.667–0.800 tentative</li>
      <li data-band="low"><i aria-hidden="true" />&lt; 0.667 unreliable</li>
    </ul>
  );
}
