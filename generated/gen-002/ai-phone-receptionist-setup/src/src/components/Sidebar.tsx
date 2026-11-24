import { go, type Page, useRoute } from '../lib/route';
import { useAppState, resetDemo } from '../lib/store';
import { fmtDateTime } from '../lib/time';
import { useNow } from '../lib/useNow';
import { StatusDot } from './ui';

const NAV: Array<{ page: Page; label: string }> = [
  { page: 'overview', label: 'Overview' },
  { page: 'calls', label: 'Calls' },
  { page: 'assistant', label: 'Assistant' },
  { page: 'services', label: 'Prices & services' },
  { page: 'business', label: 'Business' },
];

export function Sidebar({ openFlagCount }: { openFlagCount: number }) {
  const route = useRoute();
  const liveSavedAt = useAppState((s) => s.liveSavedAt);
  const draftDirty = useAppState((s) => JSON.stringify(s.draft) !== JSON.stringify(s.live));
  const businessName = useAppState((s) => s.live.profile.businessName);
  useNow();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          H
        </div>
        <div>
          <div className="brand-name">Holdfast Reception</div>
          <div className="brand-sub">{businessName}</div>
        </div>
      </div>

      <nav aria-label="Main">
        {NAV.map((item) => {
          const active = route.page === item.page;
          return (
            <a
              key={item.page}
              href={`#/${item.page}`}
              className={`nav-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nav-label">{item.label}</span>
              {item.page === 'calls' && openFlagCount > 0 && <span className="nav-count">{openFlagCount}</span>}
            </a>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="assistant-status">
          <StatusDot tone="ok" />
          <div>
            <div className="status-title">Answering calls</div>
            <div className="status-sub">
              {draftDirty ? 'Draft has unsaved changes' : `Live settings saved ${fmtDateTime(liveSavedAt)}`}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="link-btn subtle"
          onClick={() => {
            if (window.confirm('Reset the demo to the starting settings? This clears every change and review you have made.')) {
              resetDemo();
              go('#/calls/c01');
            }
          }}
        >
          Reset demo data
        </button>
      </div>
    </aside>
  );
}
