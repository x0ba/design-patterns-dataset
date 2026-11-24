import { useApp } from '../state/context';
import { Avatar, Icon } from '../ui/primitives';
import { LEASE_END, ME, SECTION_META } from '../constants';
import { OTHER_NOTES, PEOPLE, PRESENCE, ROOMMATES } from '../data/seed';
import { daysUntil, relTime } from '../lib/format';
import type { SectionId } from '../types';

export function TopBar() {
  const { s, now, setUi, ui } = useApp();
  const days = daysUntil(LEASE_END, now);
  const pending = s.collaborators.filter((c) => c.status === 'pending').length;
  const others = PRESENCE.filter((p, i, arr) => p.personId !== ME && arr.findIndex((q) => q.personId === p.personId) === i);
  const whereLabel = (p: (typeof PRESENCE)[number]) => {
    const item = p.itemId ? s.furniture.find((f) => f.id === p.itemId)?.name : undefined;
    const verb = p.doing === 'claiming' ? 'claiming' : p.doing === 'editing' ? 'editing' : 'viewing';
    return `${PEOPLE[p.personId].first} · ${verb} ${item ?? SECTION_META[p.section].title}`;
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brandMark">J</span>
        <span className="brandName">Jotsy</span>
      </div>
      <div className="crumbs">
        <span className="muted">Notes</span>
        <span className="sep">/</span>
        <span className="crumbCurrent">Move-Out: 412 Alder St</span>
      </div>

      <div className="topRight">
        <span className={`leaseChip${days <= 14 ? ' urgent' : ''}`} title={`Lease ends ${LEASE_END}`}>
          {days} days until lease ends · Nov 30
        </span>

        <div className="presence" aria-label="Currently in this note">
          <span className="presenceItem">
            <Avatar id={ME} size={28} title="Kenji Morales (you)" />
            <i className="onlineDot" />
          </span>
          {others.map((p) => (
            <span className="presenceItem" key={p.personId}>
              <Avatar id={p.personId} size={28} ring title={whereLabel(p)} />
              <i className="onlineDot" />
            </span>
          ))}
          <span className="presenceText">{others.length} others here</span>
        </div>

        <button type="button" className="btn primary" onClick={() => setUi({ shareOpen: true })}>
          <Icon name="share" size={15} />
          Share
          {pending > 0 && <span className="pill">{pending} pending</span>}
        </button>
        <button
          type="button"
          className={`btn ghost${ui.rightTab === 'activity' ? ' on' : ''}`}
          onClick={() => setUi({ rightTab: 'activity', historyItem: null })}
        >
          <Icon name="history" size={15} />
          Activity
        </button>
      </div>
    </header>
  );
}

export function Sidebar() {
  const { s, now } = useApp();
  const openCount =
    s.cleaning.filter((t) => !t.done).length + s.utilities.filter((t) => !t.done).length + s.deposit.filter((d) => !d.done).length;
  const active = s.collaborators.filter((c) => c.status === 'active');
  const pending = s.collaborators.filter((c) => c.status === 'pending');
  const lastChange = s.changes[0];

  return (
    <aside className="sidebar">
      <div className="sideLabel">Notes</div>
      <div className="noteRow active">
        <div className="noteTitle">Move-Out: 412 Alder St</div>
        <div className="noteMeta">
          {openCount} open · edited {relTime(lastChange.at, now)}
        </div>
      </div>
      {OTHER_NOTES.map((n) => (
        <div className="noteRow muted-row" key={n.title}>
          <div className="noteTitle">{n.title}</div>
          <div className="noteMeta">{n.edited}</div>
        </div>
      ))}

      <div className="sideLabel">Who has access</div>
      <ul className="accessList">
        {active.map((c) => (
          <li key={c.personId}>
            <Avatar id={c.personId} size={22} />
            <span className="accessName">{c.personId === ME ? 'Kenji (you)' : PEOPLE[c.personId].name}</span>
            <span className="accessRole">{c.role === 'owner' ? 'Owner' : c.role === 'editor' ? 'Edit' : 'View'}</span>
          </li>
        ))}
        {pending.map((c) => (
          <li key={c.personId} className="pendingRow">
            <Avatar id={c.personId} size={22} />
            <span className="accessName">Marjorie Chen</span>
            <span className="accessRole">Pending</span>
          </li>
        ))}
      </ul>
      <p className="sideNote">{ROOMMATES.length} roommates share everything. Money Notes are roommates-only.</p>
    </aside>
  );
}

export function SectionTabs() {
  const { s, ui, setUi } = useApp();
  const counts: Record<SectionId, string> = {
    cleaning: `${s.cleaning.filter((t) => t.done).length} / ${s.cleaning.length}`,
    furniture: `${s.furniture.filter((f) => f.decision !== 'undecided').length} / ${s.furniture.length}`,
    deposit: `${s.deposit.filter((d) => d.done).length} / ${s.deposit.length}`,
    utilities: `${s.utilities.filter((t) => t.done).length} / ${s.utilities.length}`,
    money: '',
  };
  const order: SectionId[] = ['cleaning', 'furniture', 'deposit', 'utilities', 'money'];
  return (
    <div className="tabs" role="tablist">
      {order.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={ui.tab === id}
          className={`tab${ui.tab === id ? ' on' : ''}`}
          onClick={() => setUi({ tab: id })}
        >
          {id === 'money' && <Icon name="lock" size={13} />}
          {SECTION_META[id].short}
          {counts[id] && <span className="tabCount">{counts[id]}</span>}
        </button>
      ))}
    </div>
  );
}

export function NoteHeader() {
  const { s, now, setUi } = useApp();
  const last = s.changes[0];
  const lastName = PEOPLE[last.by].first;
  const cleanDone = s.cleaning.filter((t) => t.done).length;
  const furnDecided = s.furniture.filter((f) => f.decision !== 'undecided').length;
  const conflicts = s.furniture.filter((f) => f.conflict).length;
  const depDone = s.deposit.filter((d) => d.done).length;
  const utilDone = s.utilities.filter((t) => t.done).length;

  const stats: { label: string; value: string; ratio: number; tab: SectionId; warn?: string }[] = [
    { label: 'Cleaning', value: `${cleanDone} of ${s.cleaning.length} done`, ratio: cleanDone / s.cleaning.length, tab: 'cleaning' },
    {
      label: 'Furniture',
      value: `${furnDecided} of ${s.furniture.length} decided`,
      ratio: furnDecided / s.furniture.length,
      tab: 'furniture',
      warn: conflicts ? `${conflicts} conflict to resolve` : undefined,
    },
    { label: 'Deposit', value: `${depDone} of ${s.deposit.length} done`, ratio: depDone / s.deposit.length, tab: 'deposit' },
    { label: 'Utilities', value: `${utilDone} of ${s.utilities.length} done`, ratio: utilDone / s.utilities.length, tab: 'utilities' },
  ];

  return (
    <div className="noteHead">
      <div className="titleRow">
        <h1>Move-Out: 412 Alder St</h1>
        <div className="noteSub">
          Created Nov 2 by Kenji Morales · {s.changes.length} changes · Last edit {relTime(last.at, now)} by {lastName}
        </div>
      </div>

      <div className="statRow">
        {stats.map((st) => (
          <button key={st.label} type="button" className="stat" onClick={() => setUi({ tab: st.tab })}>
            <span className="statLabel">{st.label}</span>
            <span className="statValue">{st.value}</span>
            <span className="bar">
              <span style={{ width: `${Math.round(st.ratio * 100)}%` }} />
            </span>
            {st.warn && (
              <span className="statWarn">
                <Icon name="alert" size={12} /> {st.warn}
              </span>
            )}
          </button>
        ))}
      </div>
      <SectionTabs />
    </div>
  );
}
