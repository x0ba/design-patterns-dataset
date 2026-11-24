import type { Dataset, Req } from '../data/generate.ts';
import { ContextTimeline } from '../components/ContextTimeline.tsx';
import { FocusChart } from '../components/FocusChart.tsx';
import { EndpointTable, KpiStrip, useRangeStats } from '../components/OverviewTables.tsx';
import { rangeLabel, durationLabel } from '../lib/format.ts';
import { ENDPOINT_INDEX } from '../data/scenario.ts';

export function OverviewView({
  ds,
  failures,
  sel,
  onSelect,
}: {
  ds: Dataset;
  failures: Req[];
  sel: [number, number];
  onSelect: (m0: number, m1: number) => void;
}) {
  const [m0, m1] = sel;
  const s = useRangeStats(ds, failures, m0, m1);
  const baselineCert = s.baselineP95[ENDPOINT_INDEX.cert];

  return (
    <div className="view overview">
      <KpiStrip s={s} m0={m0} m1={m1} baselineCertP95={baselineCert} />

      <section className="card card-context">
        <div className="card-head">
          <div>
            <h2>Seventy-two hours of traffic</h2>
            <p className="card-sub">Sat 14 – Mon 16 Nov, 14 services, every request. The shaded band is the range under investigation.</p>
          </div>
          <div className="range-pill">
            <span className="range-label">{rangeLabel(m0, m1)}</span>
            <span className="range-dur">{durationLabel(m1 - m0)}</span>
          </div>
        </div>
        <ContextTimeline ds={ds} sel={sel} onSelect={onSelect} />
      </section>

      <section className="card card-focus">
        <div className="card-head">
          <div>
            <h2>Selected range, minute by minute</h2>
            <p className="card-sub">Hover to read a minute. Dashed lines mark deploys, the pool change and the batch window.</p>
          </div>
        </div>
        <FocusChart ds={ds} sel={sel} />
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>By endpoint, selected range</h2>
            <p className="card-sub">
              Baseline is Sat 00:00 to Sun 23:04, before identity-verify v4.12 was deployed. Latency here is measured at the claims-web edge.
            </p>
          </div>
        </div>
        <EndpointTable ds={ds} s={s} />
      </section>
    </div>
  );
}
