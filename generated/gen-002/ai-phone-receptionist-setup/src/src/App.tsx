import { Sidebar } from './components/Sidebar';
import { SaveBar } from './components/SaveBar';
import { Overview } from './pages/Overview';
import { Calls } from './pages/Calls';
import { Assistant } from './pages/Assistant';
import { Services } from './pages/Services';
import { Business } from './pages/Business';
import { useRoute } from './lib/route';
import { useAppState } from './lib/store';
import { seedCalls } from './data/seed';

export function App() {
  const route = useRoute();
  const cleared = useAppState((s) => s.cleared);
  const openFlags = seedCalls.filter((c) => c.flag && !cleared.includes(c.id)).length;

  let page;
  switch (route.page) {
    case 'calls':
      page = <Calls id={route.id} />;
      break;
    case 'assistant':
      page = <Assistant />;
      break;
    case 'services':
      page = <Services />;
      break;
    case 'business':
      page = <Business />;
      break;
    default:
      page = <Overview />;
  }

  return (
    <div className="shell">
      <Sidebar openFlagCount={openFlags} />
      <main className="main" key={route.page}>
        <div className="content">{page}</div>
      </main>
      <SaveBar />
    </div>
  );
}
