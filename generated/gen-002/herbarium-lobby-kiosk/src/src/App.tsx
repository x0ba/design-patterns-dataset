import { useCallback, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { CompareView } from './components/CompareView';
import { ExhibitView } from './components/ExhibitView';
import { Header } from './components/Header';
import { ResultsView } from './components/ResultsView';
import { SheetDetail } from './components/SheetDetail';
import { Welcome } from './components/Welcome';
import { useIdle } from './hooks/useIdle';
import { DEFAULT_FILTERS, SPECIMEN_BY_ID, SPECIMENS, applyFilters, sortSpecimens } from './lib/model';
import { reducer, INITIAL_STATE, type View } from './state';
import type { Filters, SortKey, Specimen } from './types';

/** Kiosk resets to the welcome screen after three minutes without activity. */
const IDLE_MS = 3 * 60 * 1000;
/** The 'Still there?' prompt appears for the final thirty seconds. */
const WARN_MS = IDLE_MS - 30 * 1000;

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { view, filters, sort } = state;

  const go = useCallback((next: View) => dispatch({ type: 'go', view: next }), []);
  const startOver = useCallback(() => dispatch({ type: 'reset' }), []);
  const onIdle = useCallback(() => dispatch({ type: 'reset' }), []);
  const idle = useIdle({ idleMs: IDLE_MS, warnMs: WARN_MS, onIdle });

  const setFilters = useCallback(
    (patch: Partial<Filters>, coalesce?: boolean) => dispatch({ type: 'setFilters', patch, coalesce }),
    []
  );

  // Results in the order the group is looking at them. Sheet 'previous/next' follows this list.
  const ordered: Specimen[] = useMemo(() => sortSpecimens(applyFilters(SPECIMENS, filters), sort), [filters, sort]);

  const openSheet = (id: string) => go({ kind: 'sheet', id, returnTo: view });

  let content: ReactNode;
  switch (view.kind) {
    case 'welcome':
      content = (
        <Welcome
          onSearch={(text) => {
            dispatch({ type: 'replaceFilters', filters: { ...DEFAULT_FILTERS, text } });
            go({ kind: 'results', tab: 'sheets' });
          }}
          onQuick={(patch) => {
            dispatch({ type: 'replaceFilters', filters: { ...DEFAULT_FILTERS, ...patch } });
            go({ kind: 'results', tab: 'sheets' });
          }}
          onExhibit={() => go({ kind: 'exhibit', returnTo: view })}
          onOpenSheet={(id) => go({ kind: 'sheet', id, returnTo: view })}
        />
      );
      break;

    case 'results':
      content = (
        <ResultsView
          filters={filters}
          sort={sort}
          tab={view.tab}
          canUndo={state.undo.length > 0}
          onChange={setFilters}
          onClear={() => dispatch({ type: 'clearFilters' })}
          onUndo={() => dispatch({ type: 'undo' })}
          onSort={(s: SortKey) => dispatch({ type: 'sort', sort: s })}
          onTab={(tab) => go({ kind: 'results', tab })}
          onOpen={openSheet}
          onCompare={(leftId, rightId) => go({ kind: 'compare', leftId, rightId, returnTo: view })}
        />
      );
      break;

    case 'sheet': {
      const spec = SPECIMEN_BY_ID.get(view.id);
      if (!spec) {
        content = <Missing onBack={() => go({ kind: 'welcome' })} />;
        break;
      }
      const index = ordered.findIndex((s) => s.catalogNumber === spec.catalogNumber);
      const fromResults = view.returnTo.kind === 'results';
      const step =
        fromResults && index >= 0
          ? {
              index: index + 1,
              total: ordered.length,
              prev: index > 0 ? ordered[index - 1].catalogNumber : null,
              next: index < ordered.length - 1 ? ordered[index + 1].catalogNumber : null,
            }
          : null;
      content = (
        <SheetDetail
          spec={spec}
          step={step}
          backLabel={backLabel(view.returnTo)}
          onBack={() => go(view.returnTo)}
          onOpen={openSheet}
        />
      );
      break;
    }

    case 'compare': {
      const a = SPECIMEN_BY_ID.get(view.leftId);
      const b = SPECIMEN_BY_ID.get(view.rightId);
      if (!a || !b) {
        content = <Missing onBack={() => go({ kind: 'welcome' })} />;
        break;
      }
      // Earliest is whichever sheet has the lower date key, regardless of side.
      const aEarlier = a.dateKey <= b.dateKey;
      content = (
        <CompareView
          left={a}
          right={b}
          leftRole={aEarlier ? 'Earliest' : 'Most recent'}
          rightRole={aEarlier ? 'Most recent' : 'Earliest'}
          backLabel={backLabel(view.returnTo)}
          onBack={() => go(view.returnTo)}
          onSwap={() => go({ ...view, leftId: view.rightId, rightId: view.leftId })}
          onOpen={(id) => go({ kind: 'sheet', id, returnTo: view })}
        />
      );
      break;
    }

    case 'exhibit':
      content = (
        <ExhibitView
          onOpen={(id) => go({ kind: 'sheet', id, returnTo: view })}
          onSearch={() => go({ kind: 'results', tab: 'sheets' })}
        />
      );
      break;
  }

  const showWarning = idle.warning && view.kind !== 'welcome';

  return (
    <div className='app'>
      <Header
        onHome={() => go({ kind: 'welcome' })}
        onExhibit={() => go({ kind: 'exhibit', returnTo: view })}
        onStartOver={startOver}
        exhibitActive={view.kind === 'exhibit'}
      />
      <main className='main' id='main'>
        {content}
      </main>

      {showWarning && (
        <div className='idle' role='alertdialog' aria-modal='true' aria-labelledby='idle-title'>
          <div className='idle__card'>
            <h2 id='idle-title'>Still there?</h2>
            <p>
              This kiosk returns to the welcome screen in <strong>{idle.secondsLeft}</strong> seconds.
            </p>
            <div className='idle__actions'>
              <button type='button' className='btn btn--primary btn--lg' onClick={() => idle.keepAlive()}>
                Keep browsing
              </button>
              <button type='button' className='btn btn--lg' onClick={startOver}>
                Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Missing({ onBack }: { onBack: () => void }) {
  return (
    <div className='empty'>
      <h3>That sheet is not in the kiosk set.</h3>
      <button type='button' className='btn btn--primary' onClick={onBack}>
        Back to welcome
      </button>
    </div>
  );
}

function backLabel(v: View): string {
  switch (v.kind) {
    case 'results':
      return 'Back to results';
    case 'compare':
      return 'Back to comparison';
    case 'exhibit':
      return 'Back to exhibit';
    case 'sheet':
      return 'Back to sheet';
    case 'welcome':
      return 'Back to welcome';
  }
}
