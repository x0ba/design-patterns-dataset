import { StoreProvider, useStore } from './store';
import { PlanView } from './PlanView';
import { AssistantPanel } from './Assistant';
import { ClientBar, Explainer, RecordDrawer, SendModal, Shopping, Tabs, ToastView, TopBar } from './Other';

function Shell() {
  const { tab, recordOpen, sendOpen } = useStore();
  return (
    <div className="app">
      <TopBar />
      <ClientBar />
      <div className="main">
        <section className="work">
          <Tabs />
          <div className="work-body">
            {tab === 'plan' && <PlanView />}
            {tab === 'shopping' && <Shopping />}
            {tab === 'explainer' && <Explainer />}
          </div>
        </section>
        <AssistantPanel />
      </div>
      {recordOpen && <RecordDrawer />}
      {sendOpen && <SendModal />}
      <ToastView />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
