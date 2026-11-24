import { useEffect, useState, type ReactNode } from 'react';
import { analyze, ID_PATTERN, RESERVED, type Analysis, type RuleNode, type SectionId } from '../engine/model';
import { CITATIONS, FACTS, PARAMS, SECTIONS, SPEC, AMENDED_CITE } from '../data/spec';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

interface AddProps {
  nodes: RuleNode[];
  defaultSection: SectionId;
  onClose: () => void;
  onAdd: (node: RuleNode) => void;
}

export function AddConditionDialog({ nodes, defaultSection, onClose, onAdd }: AddProps) {
  useEscape(onClose);
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [section, setSection] = useState<SectionId>(defaultSection);
  const [expr, setExpr] = useState('');
  const [cites, setCites] = useState<string[]>([]);
  const [income, setIncome] = useState(true);

  const reserved = new Set([...FACTS.map((f) => f.name), ...PARAMS.map((p) => p.name), ...RESERVED]);
  const idProblem = !id
    ? 'Give the step an id.'
    : !ID_PATTERN.test(id)
      ? 'Use lower-case letters, digits and underscores, starting with a letter.'
      : nodes.some((n) => n.id === id)
        ? `"${id}" is already a step.`
        : reserved.has(id)
          ? `"${id}" is a household input or parameter name.`
          : null;

  const candidate: RuleNode = { id: id || 'new_step', label, kind: 'condition', section, expr, cites, tags: income ? ['income-standard'] : [] };
  const analysis: Analysis = analyze([...nodes, candidate], SPEC);
  const exprIssues = expr.trim() ? [...(analysis.issues[candidate.id] ?? []), ...analysis.global] : [];
  const ready = !idProblem && label.trim() && expr.trim() && exprIssues.length === 0 && cites.length > 0;

  return (
    <Modal title="Add condition" onClose={onClose}>
      <div className="form">
        <label className="field-label" htmlFor="add-id">
          Step id
        </label>
        <input id="add-id" className="input mono" value={id} onChange={(e) => setId(e.target.value.trim())} placeholder="snake_case, unique" />
        {id && idProblem && <div className="issues"><li>{idProblem}</li></div>}

        <label className="field-label" htmlFor="add-label">
          Label
        </label>
        <input id="add-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="How the step reads in plain words" />

        <label className="field-label" htmlFor="add-section">
          Section
        </label>
        <select id="add-section" className="input" value={section} onChange={(e) => setSection(e.target.value as SectionId)}>
          {SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="add-expr">
          Condition (must read true or false)
        </label>
        <textarea
          id="add-expr"
          className={`input mono expr-input ${exprIssues.length ? 'invalid' : ''}`}
          rows={3}
          spellCheck={false}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="Names of other steps or inputs, joined with && || ! and comparisons"
        />
        {exprIssues.length > 0 && (
          <ul className="issues">
            {exprIssues.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        <div className="field-label">Citations (at least one)</div>
        <div className="cite-picks">
          {CITATIONS.map((c) => (
            <label key={c.id} className="check">
              <input
                type="checkbox"
                checked={cites.includes(c.id)}
                onChange={(e) => setCites(e.target.checked ? [...cites, c.id] : cites.filter((x) => x !== c.id))}
              />
              <span>
                <code>{c.cite}</code> <span className="muted small">{c.title}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="check">
          <input type="checkbox" checked={income} onChange={(e) => setIncome(e.target.checked)} />
          <span>
            <strong>Income standard</strong>: the 2025 amendment reaches this step
          </span>
        </label>
        {income && !cites.includes(AMENDED_CITE) && (
          <div className="small muted">Tagged steps should cite 461-160-0015 (amended 2025).</div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={!ready}
          onClick={() => onAdd({ ...candidate, id, label: label.trim(), expr: expr.trim() })}
        >
          Add condition
        </button>
      </div>
    </Modal>
  );
}

interface SaveProps {
  nextN: number;
  changes: number;
  analysis: Analysis;
  failingCount: number;
  onClose: () => void;
  onSave: (message: string) => void;
}

export function SaveRevisionDialog({ nextN, changes, analysis, failingCount, onClose, onSave }: SaveProps) {
  useEscape(onClose);
  const [message, setMessage] = useState('');
  const blocked = !analysis.ok;
  return (
    <Modal title={`Save revision r${nextN}`} onClose={onClose}>
      <div className="form">
        <div className="small muted">
          {changes} step{changes === 1 ? '' : 's'} changed since the last saved revision.
        </div>
        {blocked && (
          <div className="issues">
            <li>The draft has validation errors. Fix them before saving.</li>
          </div>
        )}
        {!blocked && failingCount > 0 && (
          <div className="notice">
            {failingCount} test household{failingCount === 1 ? '' : 's'} still fail. You can save a work-in-progress revision, but the note should say so.
          </div>
        )}
        <label className="field-label" htmlFor="rev-msg">
          Message
        </label>
        <textarea
          id="rev-msg"
          className="input"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What changed and why"
        />
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={blocked || !message.trim() || changes === 0} onClick={() => onSave(message.trim())}>
          Save r{nextN}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <span>{title}</span>
          <button className="link" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
