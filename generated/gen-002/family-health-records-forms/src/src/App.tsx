import { useCallback, useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import type { FixAction } from './lib/formModel';
import { FixContext } from './components/fixContext';
import { Header } from './components/Header';
import { FormView } from './components/FormView';
import { ReviewView, SubmittedView } from './components/ReviewView';
import { RecordsView } from './components/RecordsView';
import { HouseholdView } from './components/HouseholdView';
import { FixDialog } from './components/FixDialogs';

function Shell() {
  const { state } = useStore();
  const [fix, setFix] = useState<FixAction | null>(null);
  const openFix = useCallback((kind: FixAction) => setFix(kind), []);
  const closeFix = useCallback(() => setFix(null), []);

  let body;
  switch (state.view) {
    case 'forms':
      body = <FormView />;
      break;
    case 'review':
      body = <ReviewView />;
      break;
    case 'submitted':
      body = <SubmittedView />;
      break;
    case 'records':
      body = <RecordsView />;
      break;
    case 'household':
      body = <HouseholdView />;
      break;
  }

  return (
    <FixContext.Provider value={openFix}>
      <div className="app">
        <Header />
        <main className="main">{body}</main>
      </div>
      {fix && <FixDialog kind={fix} onClose={closeFix} />}
    </FixContext.Provider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
