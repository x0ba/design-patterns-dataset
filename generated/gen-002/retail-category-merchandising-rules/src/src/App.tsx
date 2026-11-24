import { useCallback, useEffect, useMemo, useState } from 'react';
import { CategoryBar, Sidebar, TabBar, TopBar, type TabId } from './components/Chrome';
import { ComparePanel } from './components/ComparePanel';
import { HistoryPanel } from './components/HistoryPanel';
import { RulesPanel } from './components/RulesPanel';
import { SchedulePanel } from './components/SchedulePanel';
import { Button, Modal } from './components/ui';
import { computeImpact, diffRules } from './domain/rules';
import { useDraftStore } from './state/draftStore';

const TAB_TITLES: Record<TabId, string> = {
  rules: 'Rules',
  compare: 'Compare with live',
  schedule: 'Schedule',
  history: 'History',
};

export default function App() {
  const [state, dispatch] = useDraftStore();
  const [tab, setTab] = useState<TabId>('rules');
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const changes = useMemo(() => diffRules(state.live, state.rules), [state.live, state.rules]);
  const impact = useMemo(() => computeImpact(changes), [changes]);
  const locked = state.scheduled !== null;

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 5000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    document.title = `${TAB_TITLES[tab]} · Shelfwright · Snow Blowers`;
  }, [tab]);

  const onFlash = useCallback((message: string) => setFlash(message), []);

  return (
    <div className="app">
      <TopBar />
      <CategoryBar state={state} impact={impact} />
      <TabBar tab={tab} onChange={setTab} changedCount={impact.changedSettings} scheduled={locked} />

      {flash && (
        <div className="toast" role="status">
          {flash}
        </div>
      )}

      <div className="workspace">
        <main className="main" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'rules' && (
            <>
              {locked && (
                <div className="banner banner-info" role="status">
                  Edits are locked while this change set is scheduled. Cancel the schedule on the Schedule tab to make
                  changes.
                </div>
              )}
              <RulesPanel
                live={state.live}
                rules={state.rules}
                changes={changes}
                locked={locked}
                dispatch={dispatch}
              />
            </>
          )}
          {tab === 'compare' && (
            <ComparePanel live={state.live} rules={state.rules} changes={changes} impact={impact} />
          )}
          {tab === 'schedule' && (
            <SchedulePanel
              state={state}
              changes={changes}
              impact={impact}
              dispatch={dispatch}
              onFlash={onFlash}
            />
          )}
          {tab === 'history' && <HistoryPanel />}
        </main>

        <Sidebar
          state={state}
          changes={changes}
          impact={impact}
          onTab={setTab}
          onDiscard={() => setConfirmDiscard(true)}
        />
      </div>

      {confirmDiscard && (
        <Modal
          title="Discard draft changes?"
          onClose={() => setConfirmDiscard(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button
                variant="danger"
                data-autofocus
                onClick={() => {
                  dispatch({ type: 'discardDraft' });
                  setConfirmDiscard(false);
                  setFlash('Draft reset to live settings.');
                }}
              >
                Discard changes
              </Button>
            </>
          }
        >
          <p>
            Default sort, brand boosts, shopper filters, and out-of-stock handling go back to what is live now. This
            cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
