import { FACTS, SECTIONS } from '../data/spec';
import { TEST_CASES } from '../data/households';
import type { Analysis, RuleNode } from '../engine/model';
import type { LastRun } from '../store';
import { REASON_LABEL, REASON_STEP, ValueChip, fmtNumber, fmtValue } from './ui';

interface Props {
  nodes: RuleNode[];
  analysis: Analysis;
  lastRun: LastRun;
  stale: boolean;
  caseId: string | null;
  onCase: (id: string) => void;
  onRun: () => void;
}

export function TestsView({ nodes, analysis, lastRun, stale, caseId, onCase, onRun }: Props) {
  const passing = TEST_CASES.filter((c) => lastRun.runs[c.id]?.pass).length;
  const sel = TEST_CASES.find((c) => c.id === caseId) ?? null;
  const selRun = sel ? lastRun.runs[sel.id] : null;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="tests">
      <div className="steps-head">
        <div>
          <div className="steps-title">Test households</div>
          <div className="small muted">
            {passing} of {TEST_CASES.length} pass. Last run {lastRun.at}
            {stale ? ' (draft has changed since)' : ''}. Expected outcomes are from the legal advisor's sheet.
          </div>
        </div>
        <div className="steps-tools">
          <button className={`btn ${stale ? 'primary' : ''}`} onClick={onRun}>
            Run all tests
          </button>
        </div>
      </div>

      <table className="cases">
        <thead>
          <tr>
            <th>Case</th>
            <th>Household</th>
            <th>Members</th>
            <th>Expected</th>
            <th>Model</th>
            <th>Reason on model</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {TEST_CASES.map((c) => {
            const r = lastRun.runs[c.id];
            const selected = c.id === caseId;
            return (
              <tr
                key={c.id}
                className={`${selected ? 'selected' : ''} ${r?.pass ? '' : 'fail-row'}`}
                onClick={() => onCase(c.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCase(c.id);
                }}
              >
                <td>
                  <code>{c.id}</code>
                </td>
                <td>{c.title}</td>
                <td className="small muted">{c.composition}</td>
                <td>{c.expected.eligible ? `Eligible · ${fmtNumber(c.expected.benefit, '$/mo')}` : 'Not eligible'}</td>
                <td>{r ? (r.eligible ? `Eligible · ${fmtNumber(r.benefit, '$/mo')}` : 'Not eligible') : '—'}</td>
                <td className="small">{r ? REASON_LABEL[r.reason] ?? r.reason : '—'}</td>
                <td>
                  <span className={`result ${r?.pass ? 'pass' : 'fail'}`}>{r?.pass ? 'Pass' : 'Fail'}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sel && selRun && (
        <div className="trace">
          <div className="trace-head">
            <div>
              <div className="steps-title">
                {sel.id} · {sel.title}
              </div>
              <div className="small muted">{sel.composition}</div>
            </div>
            <div className="trace-facts">
              {FACTS.map((f) => (
                <div key={f.name} className="fact">
                  <span className="muted">{f.label}</span>
                  <span>{fmtValue(sel.facts[f.name], f.unit)}</span>
                </div>
              ))}
            </div>
          </div>

          {!selRun.pass && (
            <div className="trace-reason">
              <strong>{REASON_LABEL[selRun.reason] ?? selRun.reason}.</strong>{' '}
              {REASON_STEP[selRun.reason] && (
                <>
                  Stopped at <code>{REASON_STEP[selRun.reason]}</code>, which reads{' '}
                  <ValueChip value={selRun.values[REASON_STEP[selRun.reason]]} />.
                </>
              )}{' '}
              Expected: {sel.expected.eligible ? `eligible, ${fmtNumber(sel.expected.benefit, '$/mo')}` : 'not eligible'}.
            </div>
          )}

          {SECTIONS.map((s) => {
            const steps = analysis.order.map((id) => byId.get(id)!).filter((n) => n.section === s.id);
            if (!steps.length) return null;
            return (
              <div key={s.id} className="trace-group">
                <div className="group-head">
                  <span>{s.label}</span>
                </div>
                <table className="trace-table">
                  <tbody>
                    {steps.map((n) => (
                      <tr key={n.id} className={REASON_STEP[selRun.reason] === n.id ? 'stop-row' : ''}>
                        <td>
                          <code>{n.id}</code>
                        </td>
                        <td className="small">{n.label}</td>
                        <td className="right">
                          {selRun.errors[n.id] ? (
                            <span className="err-text small">{selRun.errors[n.id]}</span>
                          ) : (
                            <ValueChip value={selRun.values[n.id]} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
