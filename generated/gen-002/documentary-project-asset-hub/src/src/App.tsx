import { DATA } from './data';
import { StoreProvider, useStore } from './lib/store';
import { Main, Sidebar, Toast, TopBar } from './components/Shell';
import { ReelPage } from './pages/Reel';
import { ScenePage } from './pages/Scene';
import { ItemPage } from './pages/Item';
import { TranscriptPage } from './pages/Transcript';
import { OverviewPage, ReelsPage } from './pages/Overview';
import { ArchivePage, ClipPage, ClipsPage, TranscriptsPage } from './pages/Lists';
import { L } from './lib/router';

function Routes() {
  const { view } = useStore();
  if (view.t === 'notfound' || !DATA[view.pid]) {
    return <div className="empty"><strong>That page doesn’t exist.</strong><p><a href={L.reel('salt-road', 3)}>Back to Salt Road</a></p></div>;
  }
  switch (view.t) {
    case 'overview': return <OverviewPage pid={view.pid} />;
    case 'reels': return <ReelsPage pid={view.pid} />;
    case 'reel': return <ReelPage pid={view.pid} n={view.n} />;
    case 'scene': return <ScenePage pid={view.pid} n={view.n} />;
    case 'archive': return <ArchivePage pid={view.pid} q={view.q} />;
    case 'item': return <ItemPage pid={view.pid} id={view.id} />;
    case 'clips': return <ClipsPage pid={view.pid} q={view.q} />;
    case 'clip': return <ClipPage pid={view.pid} id={view.id} />;
    case 'transcripts': return <TranscriptsPage pid={view.pid} q={view.q} />;
    case 'transcript': return <TranscriptPage pid={view.pid} id={view.id} scene={view.q.get('scene') ? Number(view.q.get('scene')) : undefined} />;
  }
}

function Frame() {
  const { view } = useStore();
  const pid = view.t === 'notfound' ? 'salt-road' : view.pid;
  const p = DATA[pid]?.project ?? DATA['salt-road'].project;
  return (
    <div className="app" style={{ ['--accent' as string]: p.accent, ['--tint' as string]: p.tint }}>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <TopBar />
      <div className="shell">
        <Sidebar />
        <Main><Routes /></Main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() { return <StoreProvider><Frame /></StoreProvider>; }
