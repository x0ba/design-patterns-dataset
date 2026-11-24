import { AMENDED_CITE, CITATIONS } from '../data/spec';
import type { RuleNode } from '../engine/model';
import { CiteChip, isAffected } from './ui';

interface Props {
  nodes: RuleNode[];
  onOpenStep: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  'in-force': 'In force',
  'amended-2025': 'Amended 2025',
  internal: 'Lab-internal',
};

export function SourcesView({ nodes, onOpenStep }: Props) {
  const amended = CITATIONS.find((c) => c.id === AMENDED_CITE)!;
  const affected = nodes.filter(isAffected);
  const cited = affected.filter((n) => n.cites.includes(AMENDED_CITE));

  return (
    <div className="sources">
      <section className="amend-card">
        <div className="amend-kicker">2025 state amendment · found this morning</div>
        <div className="amend-title">{amended.cite}</div>
        <div className="amend-sub">{amended.title}</div>
        <div className="amend-grid">
          <div>
            <div className="side-title">As the current draft models it</div>
            <p>
              The 130% gross income test applies to every household, including those with an elderly or disabled
              member. A household that fails it is ineligible, whatever its net income.
            </p>
          </div>
          <div>
            <div className="side-title">After the amendment (as summarised here)</div>
            <p>
              For a household with an elderly or disabled member, the gross test does not apply. Eligibility is decided on
              the 100% net test. Other households keep both tests.
            </p>
          </div>
        </div>
        <div className="notice">
          <strong>Demo paraphrase.</strong> The text in this build is a summary written for the demo. It is not verbatim.
          The effective date and exact wording still need confirmation from the legal advisor.
          Check the baseline too: 7 CFR 273.9(a) may already exempt these households from the gross test, which would make the draft&apos;s gross step wrong before any amendment.
        </div>
        <div className="side-title" style={{ marginTop: 14 }}>
          Affected steps · {cited.length} of {affected.length} cite the amendment
        </div>
        <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Step</th>
              <th>Label</th>
              <th>Cites amendment</th>
            </tr>
          </thead>
          <tbody>
            {affected.map((n) => (
              <tr key={n.id}>
                <td>
                  <button className="link mono" onClick={() => onOpenStep(n.id)}>
                    {n.id}
                  </button>
                </td>
                <td>{n.label}</td>
                <td>{n.cites.includes(AMENDED_CITE) ? <span className="pass-text">Yes</span> : <span className="fail-text">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <div className="steps-title" style={{ marginTop: 22 }}>
        Citation registry
      </div>
      <div className="small muted" style={{ marginBottom: 8 }}>
        Summaries are for reference. Check quoted language against the official code before relying on it.
      </div>
      <div className="table-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th>Citation</th>
            <th>Title</th>
            <th>Status</th>
            <th>Summary</th>
            <th className="right">Steps citing</th>
          </tr>
        </thead>
        <tbody>
          {CITATIONS.map((c) => {
            const users = nodes.filter((n) => n.cites.includes(c.id));
            return (
              <tr key={c.id}>
                <td>
                  <CiteChip id={c.id} />
                </td>
                <td>{c.title}</td>
                <td>
                  <span className={`status status-${c.status}`}>{STATUS_LABEL[c.status]}</span>
                </td>
                <td className="small">{c.summary}</td>
                <td className="right num">{users.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
