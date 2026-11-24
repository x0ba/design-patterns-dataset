import { useMemo, useState, type Dispatch, type ReactNode } from 'react';
import { analyze, type Analysis, type RuleNode } from '../engine/model';
import { identifiers } from '../engine/expr';
import { CITATIONS, FACTS, PARAMS, SPEC, AMENDED_CITE } from '../data/spec';
import { TEST_CASES, type TestCase } from '../data/households';
import type { Note } from '../data/history';
import type { Action, CaseResult } from '../store';
import { stamp } from '../store';
import { CiteChip, KindPill, ValueChip, fmtValue, isAffected, sectionLabel } from './ui';

interface Props {
  nodes: RuleNode[];
  analysis: Analysis;
  node: RuleNode | null;
  caseId: string | null;
  caseDef: TestCase | null;
  caseRun: CaseResult | null;
  notes: Note[];
  onCase: (id: string) => void;
  onSelect: (id: string) => void;
  onCleared: () => void;
  dispatch: Dispatch<Action>;
}

export function Inspector(props: Props) {
  if (!props.node) {
    return (
      <aside className="inspector">
        <div className="empty">Select a step in the rule list or the graph to inspect and edit it.</div>
      </aside>
    );
  }
  return (
    <aside className="inspector">
      {/* Keyed on the saved label and expression so local edits reset after apply, revert or discard. */}
      <InspectorBody
        key={`${props.node.id}|${props.node.label}|${props.node.expr}`}
        {...props}
        node={props.node}
      />
    </aside>
  );
}

function InspectorBody({
  nodes,
  analysis,
  node,
  caseId,
  caseDef,
  caseRun,
  notes,
  onCase,
  onSelect,
  onCleared,
  dispatch,
}: Props & { node: RuleNode }) {
  const [label, setLabel] = useState(node.label);
  const [expr, setExpr] = useState(node.expr);
  const [attach, setAttach] = useState('');
  const [reply, setReply] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const readers = nodes.filter((n) => (analysis.deps[n.id] ?? []).includes(node.id));
  const deps = analysis.deps[node.id] ?? [];
  const names = analysis.asts[node.id] ? [...identifiers(analysis.asts[node.id]!)] : [];
  const factNames = names.filter((x) => !byId.has(x));

  // Validate the candidate edit against the whole model.
  const candidateIssues = useMemo(() => {
    const cand = nodes.map((n) => (n.id === node.id ? { ...n, label, expr } : n));
    const a = analyze(cand, SPEC);
    return [...(a.issues[node.id] ?? []), ...a.global];
  }, [nodes, node.id, label, expr]);
  const dirty = label !== node.label || expr !== node.expr;
  const canApply = dirty && candidateIssues.length === 0 && label.trim().length > 0;

  const unattached = CITATIONS.filter((c) => !node.cites.includes(c.id));
  const threads = notes.filter((x) => x.nodeId === node.id);
  const amended = isAffected(node);

  return (
    <>
      <div className="insp-head">
        <div className="row gap">
          <code className="step-id">{node.id}</code>
          <KindPill kind={node.kind} />
          {amended && <span className="tag-amend">Amendment reaches this step</span>}
        </div>
        <div className="insp-title">{node.label}</div>
        <div className="small muted">{sectionLabel(node.section)}</div>
      </div>

      <Block title="Rule">
        <label className="field-label" htmlFor="ed-label">
          Label
        </label>
        <input id="ed-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
        <label className="field-label" htmlFor="ed-expr">
          Expression
        </label>
        <textarea
          id="ed-expr"
          className={`input mono expr-input ${candidateIssues.length ? 'invalid' : ''}`}
          rows={4}
          spellCheck={false}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
        />
        {candidateIssues.length > 0 && dirty ? (
          <ul className="issues">
            {candidateIssues.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : (
          <div className="small muted">
            {node.kind === 'condition' ? 'Must read true or false.' : node.kind === 'calculation' ? 'Must give a number.' : 'Reports a value.'}{' '}
            Names that match a step create a connection. Other names read a household input or parameter.
          </div>
        )}
        <div className="row gap">
          <button
            className="btn primary"
            disabled={!canApply}
            onClick={() => dispatch({ type: 'node/update', id: node.id, patch: { label: label.trim(), expr } })}
          >
            Apply change
          </button>
          <button
            className="btn"
            disabled={!dirty}
            onClick={() => {
              setLabel(node.label);
              setExpr(node.expr);
            }}
          >
            Revert
          </button>
        </div>
      </Block>

      {analysis.warnings[node.id] && (
        <div className="notice warn-notice">{analysis.warnings[node.id][0]} Wire it into the step that should use it, or remove it.</div>
      )}

      <Block title="Connections">
        <div className="sub-title">Reads {deps.length} step{deps.length === 1 ? '' : 's'}</div>
        {deps.length === 0 && <div className="small muted">None. Reads inputs or parameters only.</div>}
        <ul className="conn-list">
          {deps.map((d) => (
            <li key={d}>
              <button className="link mono" onClick={() => onSelect(d)}>
                {d}
              </button>
              <span className="small muted">{byId.get(d)?.label}</span>
              {caseRun && <ValueChip value={caseRun.values[d]} />}
            </li>
          ))}
        </ul>
        {factNames.length > 0 && (
          <>
            <div className="sub-title">Household inputs and parameters</div>
            <ul className="conn-list">
              {factNames.map((f) => {
                const fact = FACTS.find((x) => x.name === f);
                const param = PARAMS.find((x) => x.name === f);
                const v = caseDef ? caseDef.facts[f] : undefined;
                return (
                  <li key={f}>
                    <code>{f}</code>
                    <span className="small muted">{fact?.label ?? param?.label}</span>
                    {fact && caseDef && <span className="small">{fmtValue(v, fact.unit)}</span>}
                    {param && <span className="small muted">parameter</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="sub-title">Read by {readers.length} step{readers.length === 1 ? '' : 's'}</div>
        {readers.length === 0 && <div className="small muted">Nothing reads this step yet.</div>}
        <ul className="conn-list">
          {readers.map((r) => (
            <li key={r.id}>
              <button className="link mono" onClick={() => onSelect(r.id)}>
                {r.id}
              </button>
              <span className="small muted">{r.label}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Value for test case">
        <div className="row gap">
          <select className="input" value={caseId ?? ''} onChange={(e) => onCase(e.target.value)} aria-label="Test case">
            {TEST_CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.title}
              </option>
            ))}
          </select>
        </div>
        {caseRun ? (
          <div className="value-row">
            <span className="small muted">{node.id} =</span>
            <ValueChip value={caseRun.values[node.id]} />
            {caseRun.errors[node.id] && <span className="err-text small">{caseRun.errors[node.id]}</span>}
          </div>
        ) : (
          <div className="small muted">Run the tests to see values.</div>
        )}
      </Block>

      <Block title="Citations">
        <div className="cites">
          {node.cites.map((c) => (
            <CiteChip
              key={c}
              id={c}
              onRemove={
                node.cites.length > 1
                  ? () => dispatch({ type: 'node/update', id: node.id, patch: { cites: node.cites.filter((x) => x !== c) } })
                  : undefined
              }
            />
          ))}
        </div>
        {unattached.length > 0 && (
          <div className="row gap">
            <select className="input" value={attach} onChange={(e) => setAttach(e.target.value)} aria-label="Citation to attach">
              <option value="">Attach a citation…</option>
              {unattached.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cite} · {c.title}
                </option>
              ))}
            </select>
            <button
              className="btn"
              disabled={!attach}
              onClick={() => {
                dispatch({ type: 'node/update', id: node.id, patch: { cites: [...node.cites, attach] } });
                setAttach('');
              }}
            >
              Attach
            </button>
          </div>
        )}
        {!node.cites.includes(AMENDED_CITE) && amended && (
          <div className="notice">
            This step is reached by the 2025 amendment and does not cite it yet.
            <button
              className="btn small-btn"
              onClick={() => dispatch({ type: 'node/update', id: node.id, patch: { cites: [...node.cites, AMENDED_CITE] } })}
            >
              Attach 461-160-0015 (amended 2025)
            </button>
          </div>
        )}
      </Block>

      <Block title="Tags">
        <label className="check">
          <input
            type="checkbox"
            checked={amended}
            onChange={(e) =>
              dispatch({
                type: 'node/update',
                id: node.id,
                patch: { tags: e.target.checked ? [...node.tags, 'income-standard'] : node.tags.filter((t) => t !== 'income-standard') },
              })
            }
          />
          <span>
            <strong>Income standard</strong>: the 2025 amendment reaches this step
          </span>
        </label>
      </Block>

      <Block title={`Notes (${threads.filter((t) => t.status === 'open').length} open)`}>
        {threads.length === 0 && <div className="small muted">No notes on this step.</div>}
        {threads.map((t) => (
          <div key={t.id} className={`thread ${t.status}`}>
            <div className="thread-head">
              <span className={`status-chip ${t.status}`}>{t.status === 'open' ? 'Open' : 'Resolved'}</span>
              <button className="link small" onClick={() => dispatch({ type: 'note/toggle', id: t.id })}>
                {t.status === 'open' ? 'Mark resolved' : 'Reopen'}
              </button>
            </div>
            {t.thread.map((m, i) => (
              <div key={i} className="note-entry">
                <div className="fine muted">
                  {m.author} · {m.at}
                </div>
                <div className="small">{m.text}</div>
              </div>
            ))}
            <div className="row gap">
              <input
                className="input"
                placeholder="Reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                aria-label="Reply to note"
              />
              <button
                className="btn"
                disabled={!reply.trim()}
                onClick={() => {
                  dispatch({ type: 'note/reply', id: t.id, text: reply.trim(), at: stamp() });
                  setReply('');
                }}
              >
                Reply
              </button>
            </div>
          </div>
        ))}
      </Block>

      <Block title="Remove step">
        {readers.length > 0 ? (
          <div className="small muted">
            Other steps read this one ({readers.map((r) => r.id).join(', ')}). Rewire them first.
          </div>
        ) : confirmRemove ? (
          <div className="row gap">
            <span className="small">Remove {node.id}?</span>
            <button
              className="btn danger"
              onClick={() => {
                dispatch({ type: 'node/remove', id: node.id });
                onCleared();
              }}
            >
              Remove
            </button>
            <button className="btn" onClick={() => setConfirmRemove(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn danger" onClick={() => setConfirmRemove(true)}>
            Remove step
          </button>
        )}
      </Block>
    </>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="block">
      <div className="block-title">{title}</div>
      {children}
    </section>
  );
}
