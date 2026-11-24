import { useApp } from '../ctx';
import { unexplained } from '../model';
import { Inspector } from './Inspector';
import { ChangesList } from './ChangesList';
import { ThreadsPanel } from './Threads';
import { Versions } from './Versions';
import type { Tab } from '../state';

export function Panel() {
  const { s, dispatch } = useApp();
  const open = s.threads.filter((t) => t.status === 'open').length;
  const unx = unexplained(s.edits).length;
  const tabs: [Tab, string, number | null, boolean?][] = [
    ['inspector', 'Inspector', null],
    ['changes', 'Changes', s.edits.length, unx > 0],
    ['threads', 'Threads', open],
    ['versions', 'Versions', null],
  ];
  return (
    <aside className="panel">
      <nav className="tabs">
        {tabs.map(([id, label, n, warn]) => (
          <button key={id} className={'tab' + (s.tab === id ? ' on' : '')} onClick={() => (id === 'threads' ? dispatch({ type: 'openThread', id: null }) : dispatch({ type: 'tab', tab: id }))}>
            {label}
            {n != null && <span className={'tab-n' + (warn ? ' warn' : '')}>{n}</span>}
          </button>
        ))}
      </nav>
      <div className="panel-body">
        {s.tab === 'inspector' && <Inspector />}
        {s.tab === 'changes' && <ChangesList />}
        {s.tab === 'threads' && <ThreadsPanel />}
        {s.tab === 'versions' && <Versions />}
      </div>
    </aside>
  );
}
