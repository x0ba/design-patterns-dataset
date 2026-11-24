import type { ReactNode } from 'react';
import { APPROVAL_THRESHOLD, APPROVER, CATEGORY_PATH, type Impact, type SettingChange } from '../domain/rules';
import { NOW_DATETIME, formatDateTime, longDate } from '../domain/time';
import type { DraftState } from '../domain/types';
import { CATEGORY_STATS, CURRENT_USER, LAST_PUBLISHED } from '../data/history';
import { Badge, Button, Card, fmtInt } from './ui';

export type TabId = 'rules' | 'compare' | 'schedule' | 'history';

export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="brand-name">Shelfwright</span>
      </div>
      <div className="topbar-right">
        <span className="topbar-date">{formatDateTime(NOW_DATETIME)}</span>
        <span className="user-chip">
          <span className="avatar" aria-hidden="true">
            {CURRENT_USER.initials}
          </span>
          <span className="user-meta">
            <span className="user-name">{CURRENT_USER.name}</span>
            <span className="user-title">{CURRENT_USER.title}</span>
          </span>
        </span>
      </div>
    </header>
  );
}

export function CategoryBar({ state, impact }: { state: DraftState; impact: Impact }) {
  const status = state.scheduled
    ? { tone: 'info' as const, text: `Scheduled · ${formatDateTime(state.scheduled.goLive)}` }
    : impact.changedSettings > 0
      ? {
          tone: 'changed' as const,
          text: `Draft · ${impact.changedSettings} ${impact.changedSettings === 1 ? 'setting' : 'settings'} not scheduled`,
        }
      : { tone: 'ok' as const, text: 'Draft matches live' };

  return (
    <div className="catbar">
      <div className="catbar-main">
        <nav className="crumbs" aria-label="Breadcrumb">
          {CATEGORY_PATH.map((c, i) => (
            <span key={c}>
              {i > 0 && <span className="crumb-sep">›</span>}
              <span className={i === CATEGORY_PATH.length - 1 ? 'crumb-current' : undefined}>{c}</span>
            </span>
          ))}
        </nav>
        <h1 className="page-title">Snow Blowers</h1>
        <p className="page-meta">
          {fmtInt(CATEGORY_STATS.activeProducts)} active products · {CATEGORY_STATS.brands} brands ·{' '}
          {CATEGORY_STATS.priorEdits} prior edits · Last published {longDate(LAST_PUBLISHED.date)} by {LAST_PUBLISHED.by}
        </p>
      </div>
      <div className="catbar-status">
        <span className={`status status-${status.tone}`}>{status.text}</span>
        {!state.scheduled && impact.changedSettings > 0 && (
          <span className="status-note">Autosaved in this browser</span>
        )}
      </div>
    </div>
  );
}

export function TabBar({
  tab,
  onChange,
  changedCount,
  scheduled,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
  changedCount: number;
  scheduled: boolean;
}) {
  const tabs: { id: TabId; label: string; badge?: ReactNode }[] = [
    {
      id: 'rules',
      label: 'Rules',
      badge: changedCount > 0 ? <span className="tab-count">{changedCount}</span> : undefined,
    },
    { id: 'compare', label: 'Compare with live' },
    {
      id: 'schedule',
      label: 'Schedule',
      badge: scheduled ? <Badge tone="info">Scheduled</Badge> : undefined,
    },
    { id: 'history', label: 'History' },
  ];
  return (
    <nav className="tabbar" role="tablist" aria-label="Sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={tab === t.id}
          aria-controls={`panel-${t.id}`}
          className={`tab${tab === t.id ? ' is-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.badge}
        </button>
      ))}
    </nav>
  );
}

interface SidebarProps {
  state: DraftState;
  changes: SettingChange[];
  impact: Impact;
  onTab: (t: TabId) => void;
  onDiscard: () => void;
}

export function Sidebar({ state, changes, impact, onTab, onDiscard }: SidebarProps) {
  const locked = state.scheduled !== null;
  const changed = changes.filter((c) => c.changed);
  const pct = Math.min(100, (impact.productsAffected / APPROVAL_THRESHOLD) * 100);
  return (
    <aside className="side" aria-label="Change set summary">
      <Card title="This change set" subtitle={`${impact.changedSettings} of ${changes.length} settings differ from live`}>
        {changed.length === 0 ? (
          <p className="empty">Nothing changed yet.</p>
        ) : (
          <ul className="side-list">
            {changed.map((c) => (
              <li key={c.key}>
                <span>{c.label}</span>
                <Badge tone="changed">Changed</Badge>
              </li>
            ))}
          </ul>
        )}

        <div className="side-block">
          <div className="side-row">
            <span>Products in scope</span>
            <strong>{fmtInt(impact.productsAffected)}</strong>
          </div>
          <div className="meter" role="img" aria-label={`${impact.productsAffected} of ${APPROVAL_THRESHOLD} approval limit`}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="hint">
            {impact.needsApproval
              ? `Above the ${fmtInt(APPROVAL_THRESHOLD)}-product limit. Approval required.`
              : `Under the ${fmtInt(APPROVAL_THRESHOLD)}-product approval limit.`}
          </p>
        </div>

        <div className="side-block">
          <div className="side-row">
            <span>Go-live</span>
            <strong>
              {state.scheduled
                ? formatDateTime(state.scheduled.goLive)
                : state.schedule.mode === 'now'
                  ? 'Publish now'
                  : formatDateTime(state.schedule.goLive)}
            </strong>
          </div>
          {!state.scheduled && <p className="hint">Not scheduled yet. Nothing is live until you schedule it.</p>}
          {state.scheduled && <p className="hint">Scheduled by {state.scheduled.by}. Edits are locked.</p>}
        </div>

        <div className="side-actions">
          <Button variant="primary" onClick={() => onTab('schedule')}>
            {locked ? 'View schedule' : 'Review and schedule'}
          </Button>
          <Button variant="secondary" onClick={() => onTab('compare')}>
            Compare with live
          </Button>
          <Button
            variant="ghost"
            disabled={locked || changed.length === 0}
            onClick={onDiscard}
          >
            Discard draft changes
          </Button>
        </div>
      </Card>

      <p className="side-foot">
        Approver for changes above {fmtInt(APPROVAL_THRESHOLD)} products: {APPROVER.name}, {APPROVER.title}.
      </p>
    </aside>
  );
}
