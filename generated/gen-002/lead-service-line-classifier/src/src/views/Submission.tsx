import { useMemo, useState } from 'react';
import type { Cls, Decision, LineRecord } from '../types';
import { BATCH, CLS_NAME, CLS_ORDER, daysBetween, fmtDate, pct, sidesFor, ASOF } from '../lib/model';
import type { BatchStats } from '../lib/stats';
import { download, fieldDigCsv, workingFileCsv } from '../lib/csv';
import { ClsChip, Panel } from '../components/ui';

interface Props {
  lines: LineRecord[];
  decisions: Record<string, Decision>;
  stats: BatchStats;
  onOpen: (id: string, listIds: string[]) => void;
  openId: string | null;
}

interface Check {
  label: string;
  detail: string;
  ok: boolean;
  blocking: boolean;
}

export function Submission({ lines, decisions, stats, onOpen, openId }: Props) {
  const [attested, setAttested] = useState(false);
  const meta = BATCH.meta;
  const days = daysBetween(ASOF, meta.dueDate);

  const openConflicts = useMemo(
    () => lines.filter((l) => (stats.flagsById.get(l.id) ?? []).includes('conflict') && !decisions[l.id]),
    [lines, decisions, stats],
  );
  const flaggedAcceptedNoNote = useMemo(
    () =>
      lines.filter(
        (l) => decisions[l.id]?.status === 'accepted' && (stats.flagsById.get(l.id) ?? []).length > 0 && !decisions[l.id]?.note,
      ),
    [lines, decisions, stats],
  );
  const fieldDigLines = useMemo(() => lines.filter((l) => decisions[l.id]?.status === 'field_dig'), [lines, decisions]);
  const heldLines = useMemo(() => lines.filter((l) => decisions[l.id]?.status === 'held'), [lines, decisions]);

  const checks: Check[] = [
    {
      label: 'Every Northgate address has a proposal',
      detail: `${stats.proposed} of ${stats.total} proposed. ${stats.queued} addresses are queued for the next run.`,
      ok: stats.queued === 0,
      blocking: true,
    },
    {
      label: 'Every proposal has a decision',
      detail: `${stats.decided} decided, ${stats.open} open.`,
      ok: stats.open === 0,
      blocking: true,
    },
    {
      label: 'No open 2024 field-verification conflicts',
      detail: `${openConflicts.length} open. Resolve each by field result or field dig.`,
      ok: openConflicts.length === 0,
      blocking: true,
    },
    {
      label: 'Every flagged acceptance has a note',
      detail: `${flaggedAcceptedNoNote.length} flagged lines accepted without a note.`,
      ok: flaggedAcceptedNoNote.length === 0,
      blocking: true,
    },
    {
      label: 'Field-dig requests',
      detail: `${fieldDigLines.length} lines waiting on a dig. They are not classified until the dig is back.`,
      ok: fieldDigLines.length === 0,
      blocking: false,
    },
    {
      label: 'Held lines',
      detail: `${heldLines.length} lines on hold. Each needs a decision before submission.`,
      ok: heldLines.length === 0,
      blocking: false,
    },
  ];

  const blockers = checks.filter((c) => c.blocking && !c.ok).length + (attested ? 0 : 1);

  const finals = useMemo(() => {
    const out: Record<Cls, number> = { LEAD: 0, GRR: 0, NON_LEAD: 0, UNKNOWN: 0 };
    let decidedUtil = 0;
    for (const l of lines) {
      const d = decisions[l.id];
      if (!d || (d.status !== 'accepted' && d.status !== 'overridden')) continue;
      const s = sidesFor(l, d).utility;
      if (s) {
        out[s.cls] += 1;
        decidedUtil += 1;
      }
    }
    return { out, decidedUtil };
  }, [lines, decisions]);

  const exportWorking = () => {
    download(`northgate-lsl-working-file-${meta.asOf}.csv`, workingFileCsv(lines, decisions));
  };
  const exportFieldDig = () => {
    download(`northgate-field-dig-requests-${meta.asOf}.csv`, fieldDigCsv(lines, decisions));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Northgate · {meta.batchId}</div>
          <h1>Submission readiness</h1>
          <p className="sub">
            The state's inventory update is due {fmtDate(meta.dueDate)}, {days} days from {fmtDate(ASOF)}. Nothing here sends anything to
            the state. Export the file and submit it through the state's portal.
          </p>
        </div>
        <div className={`ready-badge ${blockers === 0 ? 'ok' : 'no'}`}>
          {blockers === 0 ? 'Ready to submit' : `${blockers} blocking item${blockers === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="grid-2">
        <Panel title="Checks">
          <ul className="checks">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? 'pass' : c.blocking ? 'fail' : 'warn'}>
                <span className="check-mark" aria-hidden="true">
                  {c.ok ? '✓' : c.blocking ? '✕' : '!'}
                </span>
                <div>
                  <div>
                    <strong>{c.label}</strong>
                    {!c.blocking && <span className="small muted"> · advisory</span>}
                  </div>
                  <div className="small muted">{c.detail}</div>
                </div>
              </li>
            ))}
            <li className={attested ? 'pass' : 'fail'}>
              <span className="check-mark" aria-hidden="true">
                {attested ? '✓' : '✕'}
              </span>
              <div>
                <label className="attest">
                  <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
                  <span>
                    I have reviewed the reasoning and cited sources for every classification in this file, and I vouch for each accepted
                    and overridden classification as my own determination.
                  </span>
                </label>
              </div>
            </li>
          </ul>
        </Panel>

        <div className="stack">
          <Panel title="Classes decided so far (utility side)">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Class</th>
                  <th className="num">Lines</th>
                  <th className="num">Share of decided</th>
                </tr>
              </thead>
              <tbody>
                {CLS_ORDER.map((c) => (
                  <tr key={c}>
                    <td>
                      <ClsChip cls={c} /> <span className="small">{CLS_NAME[c]}</span>
                    </td>
                    <td className="num">{finals.out[c]}</td>
                    <td className="num">{pct(finals.out[c], finals.decidedUtil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">{finals.decidedUtil} accepted or overridden. Open and field-dig lines are not counted.</p>
          </Panel>

          <Panel title="Export">
            <div className="export-row">
              <div>
                <strong>Working file (CSV)</strong>
                <p className="small muted">
                  All {stats.total} addresses. The proposal, the decision, and the final classes are in separate columns, with the
                  2024 verification reference. Use it to check the state template before upload.
                </p>
              </div>
              <button className="btn primary" onClick={exportWorking}>
                Download working file
              </button>
            </div>
            <div className="export-row">
              <div>
                <strong>Field-dig requests (CSV)</strong>
                <p className="small muted">{fieldDigLines.length} lines, each with its reason.</p>
              </div>
              <button className="btn" onClick={exportFieldDig} disabled={fieldDigLines.length === 0}>
                Download field-dig list
              </button>
            </div>
            <div className="export-row">
              <div>
                <strong>State submission file</strong>
                <p className="small muted">
                  Not built. The state's submission template is not loaded in this workspace, so the layout is not guessed at.
                </p>
              </div>
              <button className="btn" disabled>
                Build submission file
              </button>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title={`Lines needing attention (${openConflicts.length + flaggedAcceptedNoNote.length + fieldDigLines.length + heldLines.length})`}>
        <div className="table-wrap flat">
          <table className="table compact">
            <thead>
              <tr>
                <th>Line</th>
                <th>Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...openConflicts, ...flaggedAcceptedNoNote, ...fieldDigLines, ...heldLines].slice(0, 60).map((l) => {
                const d = decisions[l.id];
                const label = !d
                  ? 'Open conflict with 2024 field verification'
                  : d.status === 'accepted'
                    ? 'Flagged, accepted without a note'
                    : d.status === 'field_dig'
                      ? `Field dig · ${d.note ?? ''}`
                      : `Held · ${d.note ?? 'no note'}`;
                return (
                  <tr key={l.id} className={openId === l.id ? 'selected' : ''} onClick={() => onOpen(l.id, lines.map((x) => x.id))}>
                    <td className="mono small">{l.id}</td>
                    <td>{l.address}</td>
                    <td className="small">{label}</td>
                  </tr>
                );
              })}
              {openConflicts.length + flaggedAcceptedNoNote.length + fieldDigLines.length + heldLines.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    Nothing outstanding in this list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="small muted">The list shows up to 60 lines. Use the Proposals filters for the full set.</p>
      </Panel>
    </div>
  );
}
