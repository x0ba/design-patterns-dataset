import { AppProvider, useApp } from './state/context';
import { TopBar, Sidebar, NoteHeader } from './components/Chrome';
import { TaskList } from './components/TaskList';
import { FurnitureTab, DepositTab, MoneyTab } from './components/Tabs';
import { RightPanel } from './components/RightPanel';
import { ShareDialog } from './components/ShareDialog';
import { LandlordView } from './components/LandlordView';

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { ui } = useApp();

  if (ui.preview) {
    return (
      <div className="app">
        <LandlordView />
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        <Sidebar />
        <main className="main">
          <NoteHeader />
          <div className="tabBody">
            <TabContent />
          </div>
        </main>
        <RightPanel />
      </div>
      {ui.shareOpen && <ShareDialog />}
      {ui.toast && (
        <div className="toast" key={ui.toast.id} role="status">
          {ui.toast.msg}
        </div>
      )}
    </div>
  );
}

function TabContent() {
  const { ui } = useApp();
  switch (ui.tab) {
    case 'cleaning':
      return <TaskList section="cleaning" />;
    case 'furniture':
      return <FurnitureTab />;
    case 'deposit':
      return <DepositTab />;
    case 'utilities':
      return <TaskList section="utilities" />;
    case 'money':
      return <MoneyTab />;
  }
}
