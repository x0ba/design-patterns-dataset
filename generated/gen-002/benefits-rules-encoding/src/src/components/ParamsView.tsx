import { useMemo } from 'react';
import { PARAMS } from '../data/spec';
import { identifiers } from '../engine/expr';
import type { Analysis, RuleNode } from '../engine/model';
import { fmtNumber } from './ui';

interface Props {
  nodes: RuleNode[];
  analysis: Analysis;
}

function UsedBy({ ids }: { ids: string[] }) {
  if (!ids.length) return <span className="muted small">not read</span>;
  return (
    <span className="used-by">
      {ids.map((id) => (
        <code key={id} className="mini">
          {id}
        </code>
      ))}
    </span>
  );
}

export function ParamsView({ nodes, analysis }: Props) {
  const usedBy = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const n of nodes) {
      const ast = analysis.asts[n.id];
      if (!ast) continue;
      for (const name of identifiers(ast)) (m[name] ??= []).push(n.id);
    }
    return m;
  }, [nodes, analysis]);

  const tables = PARAMS.filter((p) => p.table);
  const scalars = PARAMS.filter((p) => !p.table);

  return (
    <div className="params">
      <div className="notice">
        <strong>Effective 2026-10-01.</strong> These are demo values for this build, not the published FY2027 figures.
        Load the lab&apos;s parameter sheet before any run is reported.
      </div>

      <div className="steps-title">By household size</div>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Parameter</th>
              {Array.from({ length: 8 }, (_, i) => (
                <th key={i} className="right">
                  {i + 1}
                </th>
              ))}
              <th className="right">Per person over 8</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((p) => (
              <tr key={p.name}>
                <td>
                  <div>{p.label}</div>
                  <div className="param-name">
                    <code>{p.name}</code> <UsedBy ids={usedBy[p.name] ?? []} />
                  </div>
                </td>
                {p.table!.values.map((v, i) => (
                  <td key={i} className="right num">
                    {fmtNumber(v, p.unit)}
                  </td>
                ))}
                <td className="right num">{p.table!.addl ? fmtNumber(p.table!.addl, p.unit) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small muted">Sizes above 8 add the per-person amount for each person over 8.</div>

      <div className="steps-title" style={{ marginTop: 22 }}>
        Single values
      </div>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Parameter</th>
              <th className="right">Value</th>
            </tr>
          </thead>
          <tbody>
            {scalars.map((p) => (
              <tr key={p.name}>
                <td>
                  <div>{p.label}</div>
                  <div className="param-name">
                    <code>{p.name}</code> <UsedBy ids={usedBy[p.name] ?? []} />
                  </div>
                </td>
                <td className="right num">{fmtNumber(p.value ?? 0, p.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
