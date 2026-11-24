import { useMemo } from 'react';
import type { Analysis, RuleNode, SectionId } from '../engine/model';
import { identifiers } from '../engine/expr';
import type { Note } from '../data/history';
import { SECTIONS, AMENDED_CITE } from '../data/spec';
import type { CaseResult } from '../store';
import { CiteChip, KindPill, ValueChip, isAffected, sectionLabel } from './ui';

interface Props {
  nodes: RuleNode[];
  analysis: Analysis;
  section: SectionId | 'all';
  onSection: (s: SectionId | 'all') => void;
  query: string;
  onQuery: (q: string) => void;
  caseId: string | null;
  caseRun: CaseResult | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  notes: Note[];
  onAdd: () => void;
}

export function RuleSteps({
  nodes,
  analysis,
  section,
  onSection,
  query,
  onQuery,
  caseId,
  caseRun,
  selectedId,
  onSelect,
  notes,
  onAdd,
}: Props) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const readBy = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const n of nodes) for (const d of analysis.deps[n.id] ?? []) (m[d] ??= []).push(n.id);
    return m;
  }, [nodes, analysis]);
  const openNotes = (id: string) => notes.filter((x) => x.nodeId === id && x.status === 'open').length;

  const q = query.trim().toLowerCase();
  const visible = analysis.order
    .map((id) => byId.get(id)!)
    .filter((n) => section === 'all' || n.section === section)
    .filter((n) => !q || n.id.includes(q) || n.label.toLowerCase().includes(q) || n.expr.toLowerCase().includes(q));

  const groups = SECTIONS.filter((s) => section === 'all' || s.id === section)
    .map((s) => ({ section: s, items: visible.filter((n) => n.section === s.id) }))
    .filter((g) => g.items.length > 0);

  const current = section === 'all' ? null : SECTIONS.find((s) => s.id === section)!;
  const issueCount = Object.keys(analysis.issues).length;

  return (
    <div className="steps">
      <div className="steps-head">
        <div>
          <div className="steps-title">{current ? current.label : 'All steps'}</div>
          <div className="small muted">
            {current
              ? current.blurb
              : 'Steps run in dependency order. Each step cites the code section it implements.'}
          </div>
        </div>
        <div className="steps-tools">
          <input
            className="search"
            placeholder="Filter by id, label or expression"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            aria-label="Filter steps"
          />
          <button className="btn primary" onClick={onAdd}>
            + Add condition
          </button>
        </div>
      </div>

      <div className="steps-meta small">
        <span>
          {visible.length} step{visible.length === 1 ? '' : 's'}
        </span>
        {caseId && caseRun && (
          <span>
            · Values for <strong>{caseId}</strong>{' '}
            <span className={caseRun.pass ? 'pass-text' : 'fail-text'}>({caseRun.pass ? 'passing' : 'failing'})</span>
          </span>
        )}
        {section !== 'all' && (
          <button className="link" onClick={() => onSection('all')}>
            Show all sections
          </button>
        )}
        {issueCount > 0 && <span className="err-text">· {issueCount} step(s) with errors</span>}
      </div>

      {groups.length === 0 && <div className="empty">No steps match this filter.</div>}

      {groups.map((g) => (
        <div key={g.section.id} className="group">
          {section === 'all' && (
            <div className="group-head">
              <span>{g.section.label}</span>
              <span className="muted small">{g.items.length} steps</span>
            </div>
          )}
          {g.items.map((n) => {
            const ids = identifiers(analysis.asts[n.id] ?? { t: 'bool', v: true });
            const facts = [...ids].filter((x) => !byId.has(x));
            const deps = analysis.deps[n.id] ?? [];
            const readers = readBy[n.id] ?? [];
            const err = analysis.issues[n.id]?.[0];
            const open = openNotes(n.id);
            const selected = selectedId === n.id;
            return (
              <article
                key={n.id}
                className={`step ${selected ? 'selected' : ''} ${err ? 'has-error' : ''} ${isAffected(n) ? 'affected' : ''}`}
                onClick={() => onSelect(n.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelect(n.id);
                }}
              >
                <div className="step-top">
                  <code className="step-id">{n.id}</code>
                  <KindPill kind={n.kind} />
                  {isAffected(n) && <span className="tag-amend">Amendment reaches this step</span>}
                  {open > 0 && <span className="note-badge">{open} open note{open === 1 ? '' : 's'}</span>}
                  <span className="spacer" />
                  {caseRun && <ValueChip value={caseRun.values[n.id]} />}
                </div>
                <div className="step-label">{n.label}</div>
                <pre className="expr">{n.expr}</pre>
                {err && <div className="step-err">{err}</div>}
                {caseRun?.errors[n.id] && <div className="step-err">Run error: {caseRun.errors[n.id]}</div>}
                <div className="step-foot">
                  <div className="cites">
                    {n.cites.map((c) => (
                      <CiteChip key={c} id={c} />
                    ))}
                    {n.cites.includes(AMENDED_CITE) && <span className="small muted">amended text</span>}
                  </div>
                  <div className="wiring small muted">
                    <span title={deps.join(', ')}>
                      ← {deps.length} step{deps.length === 1 ? '' : 's'}
                    </span>
                    <span title={readers.join(', ')} className={analysis.warnings[n.id] ? 'warn-text' : ''}>
                      → {readers.length}
                    </span>
                    {facts.length > 0 && <span title={facts.join(', ')}>· reads {facts.length} input{facts.length === 1 ? '' : 's'}</span>}
                    <span className="muted">· {sectionLabel(n.section)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ))}
    </div>
  );
}
