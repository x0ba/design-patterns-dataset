import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConversationList } from './components/ConversationList';
import { ThreadView } from './components/ThreadView';
import { ContextPanel } from './components/ContextPanel';
import { ScheduleView } from './components/ScheduleView';
import { VolunteersView } from './components/VolunteersView';
import { RepliesView } from './components/RepliesView';
import { useStore } from './store';
import { Icon } from './util';

function Toast() {
  const { s, d } = useStore();
  useEffect(() => {
    if (!s.toast) return;
    const id = window.setTimeout(() => d({ type: 'toast', text: null }), 3800);
    return () => window.clearTimeout(id);
  }, [s.toast, d]);
  if (!s.toast) return null;
  return (
    <div className="toast" role="status" key={s.toast.id}>
      <Icon name="check" size={14} stroke={2.4} /> {s.toast.text}
    </div>
  );
}

export function App() {
  const { s } = useStore();
  return (
    <div className="app">
      <Sidebar />
      {s.view === 'inbox' && (
        <>
          <ConversationList />
          <ThreadView />
          <ContextPanel />
        </>
      )}
      {s.view === 'schedule' && <ScheduleView />}
      {s.view === 'volunteers' && <VolunteersView />}
      {s.view === 'replies' && <RepliesView />}
      <Toast />
    </div>
  );
}
