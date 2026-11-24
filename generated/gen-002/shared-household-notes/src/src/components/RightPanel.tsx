import { useState, type FormEvent } from 'react';
import { useApp } from '../state/context';
import { Avatar, anchorLabel, Icon, itemTitle } from '../ui/primitives';
import { PEOPLE, ROOMMATES } from '../data/seed';
import { clock, dayGroup, relTime } from '../lib/format';
import { SECTION_META, SECTION_ORDER } from '../constants';
import type { Change, CommentAnchor, PersonId, SectionId, Thread } from '../types';

export function RightPanel() {
  const { s, ui, setUi } = useApp();
  const openN = s.threads.filter((t) => !t.resolved).length;
  return (
    <aside className="rightPanel" aria-label="Comments and activity">
      <div className="rpTabs">
        <button type="button" className={ui.rightTab === 'comments' ? 'on' : ''} onClick={() => setUi({ rightTab: 'comments' })}>
          Comments <span className="rpCount">{openN} open</span>
        </button>
        <button
          type="button"
          className={ui.rightTab === 'activity' ? 'on' : ''}
          onClick={() => setUi({ rightTab: 'activity' })}
        >
          Activity <span className="rpCount">{s.changes.length}</span>
        </button>
      </div>
      {ui.rightTab === 'comments' ? <CommentsPanel /> : <ActivityPanel />}
    </aside>
  );
}

// ---------- Comments ----------

function encodeAnchor(a: CommentAnchor): string {
  return a.itemId ? `${a.section}:${a.itemId}` : a.section;
}

function decodeAnchor(v: string): CommentAnchor {
  const [section, itemId] = v.split(':');
  return itemId ? { section: section as SectionId, itemId } : { section: section as SectionId };
}

function CommentsPanel() {
  const ctx = useApp();
  const { s, ui, setUi, act } = ctx;
  const [text, setText] = useState('');

  const filter = ui.anchorFilter;
  const shown = s.threads
    .filter((t) => (ui.threadView === 'open' ? !t.resolved : t.resolved))
    .filter((t) => {
      if (!filter) return true;
      if (filter.itemId) return t.anchor.itemId === filter.itemId;
      return t.anchor.section === filter.section;
    })
    .sort((a, b) => b.at - a.at);

  const items: { id: string; title: string; section: SectionId }[] = [
    ...s.cleaning.map((t) => ({ id: t.id, title: t.title, section: 'cleaning' as const })),
    ...s.furniture.map((f) => ({ id: f.id, title: f.name, section: 'furniture' as const })),
    ...s.deposit.map((d) => ({ id: d.id, title: d.text, section: 'deposit' as const })),
    ...s.utilities.map((u) => ({ id: u.id, title: u.title, section: 'utilities' as const })),
  ];

  const post = () => {
    if (!text.trim()) return;
    act.addThread(ui.composer, text);
    setText('');
    setUi({ threadView: 'open' });
  };

  return (
    <div className="rpBody">
      <div className="segTop">
        <button type="button" className={ui.threadView === 'open' ? 'on' : ''} onClick={() => setUi({ threadView: 'open' })}>
          Open
        </button>
        <button type="button" className={ui.threadView === 'resolved' ? 'on' : ''} onClick={() => setUi({ threadView: 'resolved' })}>
          Resolved
        </button>
      </div>

      {filter && (
        <div className="anchorChip">
          <span>
            Showing comments on <b>{filter.itemId ? itemTitle(ctx, filter.itemId) : SECTION_META[filter.section].title}</b>
          </span>
          <button type="button" className="linkBtn" onClick={() => setUi({ anchorFilter: null })}>
            Show all
          </button>
        </div>
      )}

      <div className="threadList">
        {shown.map((t) => (
          <ThreadCard key={t.id} t={t} />
        ))}
        {shown.length === 0 && <div className="emptyRow">No {ui.threadView} comments{filter ? ' here' : ''}.</div>}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          post();
        }}
      >
        <label className="composerLabel">
          On
          <select className="select" value={encodeAnchor(ui.composer)} onChange={(e) => setUi({ composer: decodeAnchor(e.target.value) })}>
            {SECTION_ORDER.map((sec) => (
              <optgroup key={sec} label={SECTION_META[sec].title}>
                <option value={sec}>Whole section</option>
                {items
                  .filter((it) => it.section === sec)
                  .map((it) => (
                    <option key={it.id} value={`${sec}:${it.id}`}>
                      {it.title.length > 44 ? it.title.slice(0, 43) + '…' : it.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <textarea
          className="input"
          rows={3}
          placeholder="Leave a comment for the house…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              post();
            }
          }}
          aria-label="New comment"
        />
        <div className="composerFoot">
          <span className="muted">⌘/Ctrl + Enter to post</span>
          <button type="submit" className="btn primary" disabled={!text.trim()}>
            Post comment
          </button>
        </div>
      </form>
    </div>
  );
}

function ThreadCard({ t }: { t: Thread }) {
  const ctx = useApp();
  const { now, act, setUi } = ctx;
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');

  const sendReply = (e: FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    act.replyThread(t.id, reply);
    setReply('');
    setReplying(false);
  };

  return (
    <article className={`thread${t.resolved ? ' resolved' : ''}`}>
      <div className="threadHead">
        <Avatar id={t.author} size={24} />
        <div>
          <b>{PEOPLE[t.author].first}</b>
          <span className="muted"> · {relTime(t.at, now)}</span>
        </div>
      </div>
      <button
        type="button"
        className="anchorTag"
        title="Go to this part of the note"
        onClick={() => setUi({ tab: t.anchor.section, anchorFilter: t.anchor })}
      >
        {anchorLabel(ctx, t.anchor)}
      </button>
      <p className="threadText">{t.text}</p>
      {t.replies.map((r) => (
        <div className="reply" key={r.id}>
          <Avatar id={r.author} size={18} />
          <div>
            <b>{PEOPLE[r.author].first}</b> <span className="muted">{relTime(r.at, now)}</span>
            <div>{r.text}</div>
          </div>
        </div>
      ))}
      <div className="threadActions">
        <button type="button" className="linkBtn" onClick={() => setReplying(!replying)}>
          Reply
        </button>
        <button type="button" className="linkBtn" onClick={() => act.toggleResolved(t.id)}>
          {t.resolved ? 'Reopen' : 'Resolve'}
        </button>
      </div>
      {replying && (
        <form className="replyForm" onSubmit={sendReply}>
          <input className="input grow" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply" aria-label="Reply" autoFocus />
          <button type="submit" className="btn primary small" disabled={!reply.trim()}>
            Send
          </button>
        </form>
      )}
    </article>
  );
}

// ---------- Activity ----------

const KIND_FILTERS: { id: 'all' | 'assign' | 'deleted' | 'done' | 'furniture' | 'sharing'; label: string }[] = [
  { id: 'all', label: 'All changes' },
  { id: 'assign', label: 'Assignments & dates' },
  { id: 'deleted', label: 'Deleted & restored' },
  { id: 'done', label: 'Checked off' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'sharing', label: 'Sharing' },
];

function ActivityPanel() {
  const ctx = useApp();
  const { s, now, act, ui, setUi } = ctx;

  const filtered = s.changes.filter((c: Change) => {
    if (ui.historyPerson !== 'all' && c.by !== ui.historyPerson) return false;
    if (ui.historyItem && c.itemId !== ui.historyItem) return false;
    switch (ui.historyKind) {
      case 'assign':
        return c.kind === 'assign' || c.kind === 'due';
      case 'deleted':
        return c.kind === 'delete' || c.kind === 'restore';
      case 'done':
        return c.kind === 'done' || c.kind === 'undone';
      case 'furniture':
        return c.section === 'furniture';
      case 'sharing':
        return c.kind === 'share';
      default:
        return true;
    }
  });

  const shown = filtered.slice(0, ui.historyLimit);
  const groups: { label: string; items: Change[] }[] = [];
  for (const c of shown) {
    const label = dayGroup(c.at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(c);
    else groups.push({ label, items: [c] });
  }

  const restorable = (c: Change) => c.kind === 'delete' && !!c.itemId && s.trash.some((x) => x.item.id === c.itemId);
  const historyTitle = ui.historyItem ? itemTitle(ctx, ui.historyItem) : null;

  return (
    <div className="rpBody">
      <div className="actFilters">
        <select className="select" value={ui.historyPerson} onChange={(e) => setUi({ historyPerson: e.target.value as PersonId | 'all' })} aria-label="Filter by person">
          <option value="all">Everyone</option>
          {ROOMMATES.map((id) => (
            <option key={id} value={id}>
              {PEOPLE[id].first}
            </option>
          ))}
        </select>
        <select className="select" value={ui.historyKind} onChange={(e) => setUi({ historyKind: e.target.value as typeof ui.historyKind })} aria-label="Filter by kind">
          {KIND_FILTERS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      {historyTitle && (
        <div className="anchorChip">
          <span>
            History for <b>{historyTitle}</b>
          </span>
          <button type="button" className="linkBtn" onClick={() => setUi({ historyItem: null })}>
            Clear
          </button>
        </div>
      )}

      <div className="actCount">
        {filtered.length} of {s.changes.length} changes · edits are recorded per person and device
      </div>

      {groups.map((g) => (
        <section key={g.label + g.items[0].id} className="actGroup">
          <h4>{g.label}</h4>
          <ul>
            {g.items.map((c) => (
              <li key={c.id} className={`chg kind-${c.kind}`}>
                <Avatar id={c.by} size={22} />
                <div className="chgMain">
                  <div className="chgText">
                    <b>{PEOPLE[c.by].first}</b> {c.text}
                  </div>
                  <div className="chgMeta">
                    {c.device} · {clock(c.at)}
                    {c.itemId && c.kind !== 'delete' && (
                      <>
                        {' · '}
                        <button type="button" className="linkBtn" onClick={() => setUi({ historyItem: c.itemId ?? null })}>
                          Only this item
                        </button>
                      </>
                    )}
                  </div>
                  {restorable(c) && (
                    <button type="button" className="btn small" onClick={() => act.restoreTask(c.itemId as string)}>
                      <Icon name="restore" size={13} /> Restore task
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {filtered.length === 0 && <div className="emptyRow">No changes match these filters.</div>}
      {filtered.length > shown.length && (
        <button type="button" className="btn wide" onClick={() => setUi({ historyLimit: ui.historyLimit + 50 })}>
          Show {Math.min(50, filtered.length - shown.length)} older changes
        </button>
      )}
    </div>
  );
}
