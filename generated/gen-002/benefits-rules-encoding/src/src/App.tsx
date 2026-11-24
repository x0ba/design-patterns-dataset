import { useMemo, useState } from 'react';
import { analyze, hashNodes } from './engine/model';
import { SPEC, AMENDED_CITE } from './data/spec';
import { TEST_CASES } from './data/households';
import { useAppData, latestSnapshot, countChanged, stamp } from './store';
import type { SectionId } from './engine/model';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { RuleSteps } from './components/RuleSteps';
import { GraphView } from './components/GraphView';
import { TestsView } from './components/TestsView';
import { ParamsView } from './components/ParamsView';
import { SourcesView } from './components/SourcesView';
import { RevisionsView } from './components/RevisionsView';
import { Inspector } from './components/Inspector';
import { AddConditionDialog, SaveRevisionDialog } from './components/Dialogs';

export type Tab = 'rules' | 'graph' | 'tests' | 'params' | 'sources' | 'revisions';
export const TABS: { id: Tab; label: string }[] = [
  { id: 'rules', label: 'Rule steps' },
  { id: 'graph', label: 'Graph' },
  { id: 'tests', label: 'Test households' },
  { id: 'params', label: 'Parameters' },
  { id: 'sources', label: 'Sources and amendment' },
  { id: 'revisions', label: 'Revisions' },
];

export default function App() {
  const [data, dispatch] = useAppData();
  const [tab, setTab] = useState<Tab>('rules');
  const [section, setSection] = useState<SectionId | 'all'>('income');
  const [nodeId, setNodeId] = useState<string | null>('gross_test');
  const [caseId, setCaseId] = useState<string | null>('T-04');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const { nodes, revisions, notes, lastRun } = data;
  const analysis = useMemo(() => analyze(nodes, SPEC), [nodes]);
  const stale = hashNodes(nodes) !== lastRun.hash;
  const base = latestSnapshot(revisions);
  const changes = countChanged(base, nodes);
  const failing = TEST_CASES.filter((c) => !lastRun.runs[c.id]?.pass);
  const openNotes = notes.filter((n) => n.status === 'open');
  const selectedNode = nodeId ? nodes.find((n) => n.id === nodeId) ?? null : null;
  const caseRun = caseId ? lastRun.runs[caseId] ?? null : null;
  const caseDef = caseId ? TEST_CASES.find((c) => c.id === caseId) ?? null : null;

  const selectNode = (id: string, opts?: { goRules?: boolean }) => {
    setNodeId(id);
    if (opts?.goRules !== false) setTab('rules');
    const n = nodes.find((x) => x.id === id);
    if (n && section !== 'all' && n.section !== section) setSection(n.section);
  };

  const openFailing = () => {
    setTab('tests');
    if (failing[0]) setCaseId(failing[0].id);
  };

  return (
    <div className="app">
      <TopBar
        latestN={revisions[revisions.length - 1].n}
        changes={changes}
        stale={stale}
        onRun={() => dispatch({ type: 'tests/run', at: stamp() })}
        onSave={() => setSaveOpen(true)}
      />

      {failing.length > 0 && (
        <div className="banner warn" role="status">
          <div className="banner-text">
            <strong>
              {failing.length} of {TEST_CASES.length} test households fail on the last run
            </strong>
            : {failing.map((c) => c.id).join(', ')}.
            {failing.every((c) => Number(c.facts.eld_dis_members) > 0) &&
              ' All of them include an elderly or disabled member.'}
            {failing.every((c) => c.expected.eligible) && ' The legal advisor expects each to be eligible.'}
            {stale && <span className="banner-sub"> The draft has changed since that run ({lastRun.at}). Rerun to refresh.</span>}
          </div>
          <div className="banner-actions">
            <button className="btn" onClick={openFailing}>Open failing cases</button>
          </div>
        </div>
      )}
      {failing.length === 0 && stale && (
        <div className="banner info" role="status">
          <div className="banner-text">
            <strong>The draft has changed since the last test run ({lastRun.at}).</strong> Rerun to refresh results.
          </div>
          <div className="banner-actions">
            <button className="btn" onClick={() => dispatch({ type: 'tests/run', at: stamp() })}>Run all tests</button>
          </div>
        </div>
      )}

      <div className="main">
        <Sidebar
          nodes={nodes}
          analysis={analysis}
          section={section}
          onSection={(s) => {
            setSection(s);
            setTab('rules');
          }}
          notes={openNotes}
          onNote={(nid) => selectNode(nid)}
          onAttachAmended={() => {
            nodes
              .filter((n) => n.tags.includes('income-standard') && !n.cites.includes(AMENDED_CITE))
              .forEach((n) => dispatch({ type: 'node/update', id: n.id, patch: { cites: [...n.cites, AMENDED_CITE] } }));
          }}
          counts={{ notes: openNotes.length, revisions: revisions.length }}
        />

        <section className="center">
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'tests' && failing.length > 0 && <span className="tab-badge">{failing.length}</span>}
              </button>
            ))}
          </nav>
          <div className="center-body">
            {tab === 'rules' && (
              <RuleSteps
                nodes={nodes}
                analysis={analysis}
                section={section}
                onSection={setSection}
                query={query}
                onQuery={setQuery}
                caseId={caseId}
                caseRun={caseRun}
                selectedId={nodeId}
                onSelect={(id) => selectNode(id, { goRules: false })}
                notes={notes}
                onAdd={() => setAddOpen(true)}
              />
            )}
            {tab === 'graph' && (
              <GraphView
                nodes={nodes}
                analysis={analysis}
                section={section}
                selectedId={nodeId}
                caseRun={caseRun}
                onSelect={(id) => selectNode(id, { goRules: false })}
              />
            )}
            {tab === 'tests' && (
              <TestsView
                nodes={nodes}
                analysis={analysis}
                lastRun={lastRun}
                stale={stale}
                caseId={caseId}
                onCase={setCaseId}
                onRun={() => dispatch({ type: 'tests/run', at: stamp() })}
              />
            )}
            {tab === 'params' && <ParamsView nodes={nodes} analysis={analysis} />}
            {tab === 'sources' && <SourcesView nodes={nodes} onOpenStep={(id) => selectNode(id)} />}
            {tab === 'revisions' && (
              <RevisionsView
                revisions={revisions}
                nodes={nodes}
                base={base}
                changes={changes}
                onSave={() => setSaveOpen(true)}
                onDiscard={() => dispatch({ type: 'draft/discard' })}
                onReset={() => dispatch({ type: 'demo/reset' })}
                onOpenStep={(id) => selectNode(id)}
              />
            )}
          </div>
        </section>

        <Inspector
          nodes={nodes}
          analysis={analysis}
          node={selectedNode}
          caseId={caseId}
          caseDef={caseDef}
          caseRun={caseRun}
          notes={notes}
          onCase={setCaseId}
          onSelect={(id) => selectNode(id, { goRules: false })}
          onCleared={() => setNodeId(null)}
          dispatch={dispatch}
        />
      </div>

      {addOpen && (
        <AddConditionDialog
          nodes={nodes}
          defaultSection={section === 'all' ? 'income' : section}
          onClose={() => setAddOpen(false)}
          onAdd={(node) => {
            dispatch({ type: 'node/add', node });
            setAddOpen(false);
            setNodeId(node.id);
            setSection(node.section);
          }}
        />
      )}
      {saveOpen && (
        <SaveRevisionDialog
          nextN={revisions.length + 1}
          changes={changes}
          analysis={analysis}
          failingCount={failing.length}
          onClose={() => setSaveOpen(false)}
          onSave={(message) => {
            dispatch({ type: 'revision/save', message, at: stamp() });
            setSaveOpen(false);
          }}
        />
      )}
    </div>
  );
}

