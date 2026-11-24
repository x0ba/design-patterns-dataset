import { useMemo, useState } from 'react';
import { diffNodes, type RuleNode } from '../engine/model';
import type { RevisionRec } from '../store';

interface Props {
  revisions: RevisionRec[];
  nodes: RuleNode[];
  base: RuleNode[];
  changes: number;
  onSave: () => void;
  onDiscard: () => void;
  onReset: () => void;
  onOpenStep: (id: string) => void;
}

const FIELD_LABEL: Record<string, string> = {
  label: 'Label',
  kind: 'Kind',
  section: 'Section',
  expr: 'Expression',
  cites: 'Citations',
  tags: 'Tags',
};

export function RevisionsView({ revisions, nodes, base, changes, onSave, onDiscard, onReset, onOpenStep }: Props) {
  const [confirm, setConfirm] = useState<'discard' | 'reset' | null>(null);
  const diff = useMemo(() => diffNodes(base, nodes), [base, nodes]);
  const latest = revisions[revisions.length - 1];
  const list = [...revisions].reverse();

  return (
    <div className="revisions">
      <section className="rev-col">
        <div className="steps-head">
          <div>
            <div className="steps-title">Draft compared with r{latest.n}</div>
            <div className="small muted">
              {changes === 0
                ? 'No changes. The draft matches the latest saved revision.'
                : `${changes} step${changes === 1 ? '' : 's'} differ from r${latest.n}.`}
            </div>
          </div>
          <div className="steps-tools">
            <button className="btn primary" onClick={onSave} disabled={changes === 0}>
              Save as r{latest.n + 1}…
            </button>
          </div>
        </div>

        {diff.length === 0 && <div className="empty">Nothing to show.</div>}
        {diff.map((d) => (
          <div key={d.id} className={`diff diff-${d.change}`}>
            <div className="diff-head">
              <button className="link mono" onClick={() => onOpenStep(d.id)}>
                {d.id}
              </button>
              <span className="small muted">
                {d.change === 'added' ? 'Added' : d.change === 'removed' ? 'Removed' : 'Changed'}
              </span>
            </div>
            {d.fields.map((f) => (
              <div key={f.field} className="diff-field">
                <div className="small muted">{FIELD_LABEL[f.field]}</div>
                <div className="diff-pair">
                  <pre className="diff-before">{f.before || '—'}</pre>
                  <span className="muted">→</span>
                  <pre className="diff-after">{f.after || '—'}</pre>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="rev-actions">
          {confirm === 'discard' ? (
            <>
              <span className="small">Discard all unsaved edits and return to r{latest.n}?</span>
              <button
                className="btn danger"
                onClick={() => {
                  onDiscard();
                  setConfirm(null);
                }}
              >
                Discard edits
              </button>
              <button className="btn" onClick={() => setConfirm(null)}>
                Keep editing
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => setConfirm('discard')} disabled={changes === 0}>
              Discard unsaved edits
            </button>
          )}
          <span className="spacer" />
          {confirm === 'reset' ? (
            <>
              <span className="small">Reset this browser&apos;s copy to the demo starting state?</span>
              <button
                className="btn danger"
                onClick={() => {
                  onReset();
                  setConfirm(null);
                }}
              >
                Reset
              </button>
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="link" onClick={() => setConfirm('reset')}>
              Reset demo data in this browser
            </button>
          )}
        </div>
      </section>

      <section className="rev-col">
        <div className="steps-head">
          <div>
            <div className="steps-title">Saved revisions</div>
            <div className="small muted">
              {revisions.length} saved. The latest saved revision keeps a full snapshot, and the draft is compared with it.
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Rev</th>
                <th>Saved</th>
                <th>By</th>
                <th>Message</th>
                <th className="right">Steps</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.n}>
                  <td>
                    <code>r{r.n}</code>
                  </td>
                  <td className="small nowrap">{r.savedAt}</td>
                  <td className="small nowrap">{r.author}</td>
                  <td>
                    {r.message}
                    {r.snapshot && <span className="snap-tag">latest snapshot</span>}
                  </td>
                  <td className="right num">{r.stepsChanged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
