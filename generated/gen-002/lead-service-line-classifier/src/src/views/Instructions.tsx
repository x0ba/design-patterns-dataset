import { useMemo, useState } from 'react';
import type { Decision, LineRecord } from '../types';
import { CORRECTIONS, DRAFT_DEFAULT, DRAFT_TITLE } from '../data/instructions';
import { loadDraft, saveDraft } from '../lib/store';
import { fmtDate, RULES, type FlagCode } from '../lib/model';
import type { BatchStats } from '../lib/stats';
import { ClsChip, ConfChip, DecisionChip, Panel } from '../components/ui';

interface Props {
  lines: LineRecord[];
  decisions: Record<string, Decision>;
  stats: BatchStats;
  onOpen: (id: string, listIds: string[]) => void;
  openId: string | null;
}

const RULE_FLAG_COUNT: Partial<Record<FlagCode, (s: BatchStats) => number>> = {
  grr_unlinked: (s) => s.grrUnlinked,
  permit_unstated: (s) => s.permitUnstated,
  neighbor_high: (s) => s.neighborHigh,
  conflict: (s) => s.conflicts,
};

export function Instructions({ lines, decisions, stats, onOpen, openId }: Props) {
  const [draft, setDraft] = useState(() => loadDraft(DRAFT_DEFAULT));
  const [saved, setSaved] = useState(() => loadDraft(DRAFT_DEFAULT));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showImpact, setShowImpact] = useState(false);

  const affected = useMemo(
    () => lines.filter((l) => (stats.flagsById.get(l.id) ?? []).includes('permit_unstated')),
    [lines, stats],
  );
  const affectedInConflict = affected.filter((l) => (stats.flagsById.get(l.id) ?? []).includes('conflict')).length;
  const dirty = draft !== saved;

  const save = () => {
    saveDraft(draft);
    setSaved(draft);
    setSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Assistant instructions · v7</div>
          <h1>Instructions and corrections</h1>
          <p className="sub">The working copy of the state rule references the assistant follows, the corrections already applied, and a draft under review.</p>
        </div>
      </div>

      <div className="notice">
        Section numbers here are the working copy's references. Check them against the state's current LSL inventory guidance before a
        submission relies on them.
      </div>

      <div className="grid-2">
        <Panel title="Rule references">
          <ol className="rules">
            {RULES.map((r) => {
              const n = r.checkedBy ? RULE_FLAG_COUNT[r.checkedBy]?.(stats) : undefined;
              return (
                <li key={r.id}>
                  <div className="rule-head">
                    <span className="mono rule-id">{r.id}</span>
                    <strong>{r.title}</strong>
                    {n !== undefined && (
                      <span className="chip tag">
                        {n} flagged in batch
                      </span>
                    )}
                  </div>
                  <p className="small">{r.text}</p>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel title="Corrections applied">
          <ul className="corrections">
            {CORRECTIONS.map((c) => (
              <li key={c.id}>
                <div className="rule-head">
                  <span className="mono rule-id">{c.id}</span>
                  <span className="small muted">
                    {fmtDate(c.date)} · {c.author} · applied from {c.appliedFrom}
                  </span>
                </div>
                <p className="small">{c.text}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title={
          <>
            {DRAFT_TITLE} <span className="count-pill block">Draft</span>
          </>
        }
        actions={
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setDraft(DRAFT_DEFAULT)} disabled={draft === DRAFT_DEFAULT}>
              Restore draft text
            </button>
            <button className="btn primary" onClick={save} disabled={!dirty}>
              Save draft
            </button>
          </div>
        }
      >
        <div className="draft-grid">
          <div>
            <label className="field">
              <span className="label">Proposed instruction text</span>
              <textarea className="draft" rows={11} value={draft} onChange={(e) => setDraft(e.target.value)} />
            </label>
            <p className="small muted">
              {savedAt ? `Saved in this browser at ${savedAt}. ` : 'Not saved yet. '}Saving keeps the text here. It does not change the
              assistant. The text takes effect only once it is added to the instructions and a new run starts.
            </p>
          </div>

          <div className="impact">
            <h3>What this changes in the batch</h3>
            <p className="small">
              <strong>{affected.length}</strong> proposals cite a permit that names no material and still propose copper.
            </p>
            <ul className="small impact-list">
              <li>
                <strong>{affectedInConflict}</strong> are already contradicted by a 2024 field verification.
              </li>
              <li>
                <strong>{affected.length - affectedInConflict}</strong> have no field check. Under the draft they would be proposed as Unknown instead.
              </li>
            </ul>
            <button className="btn" onClick={() => setShowImpact((v) => !v)}>
              {showImpact ? 'Hide the list' : `Show the ${affected.length} lines`}
            </button>
            {showImpact && (
              <div className="impact-table">
                <table className="table compact">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Address</th>
                      <th>Permit cited</th>
                      <th>Proposed</th>
                      <th>Conf.</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affected.map((l) => {
                      const permit = l.utility?.sources.find((s) => s.kind === 'permit');
                      const conflict = (stats.flagsById.get(l.id) ?? []).includes('conflict');
                      return (
                        <tr
                          key={l.id}
                          className={`${conflict ? 'row-conflict' : ''} ${openId === l.id ? 'selected' : ''}`}
                          onClick={() => onOpen(l.id, affected.map((x) => x.id))}
                        >
                          <td className="mono small">{l.id}</td>
                          <td>{l.address}</td>
                          <td className="mono small">{permit?.ref ?? '—'}</td>
                          <td>{l.utility && <ClsChip cls={l.utility.cls} />}</td>
                          <td>
                            <ConfChip c={l.confidence} />
                          </td>
                          <td>
                            <DecisionChip d={decisions[l.id]} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
