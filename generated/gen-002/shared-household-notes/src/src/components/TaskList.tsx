import { useState, type FormEvent } from 'react';
import { useApp, type UiState } from '../state/context';
import { Avatar, CommentButton, Icon } from '../ui/primitives';
import { ME, SECTION_META } from '../constants';
import { PEOPLE, ROOMMATES } from '../data/seed';
import { dueHint, relTime } from '../lib/format';
import type { PersonId, Task, TaskSection } from '../types';

const FILTERS: { id: UiState['cleaningFilter']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'mine', label: 'Mine' },
  { id: 'unassigned', label: 'Unassigned' },
];

export function TaskList({ section }: { section: TaskSection }) {
  const ctx = useApp();
  const { s, now, act, ui, setUi } = ctx;
  const list = section === 'cleaning' ? s.cleaning : s.utilities;
  const filter = section === 'cleaning' ? ui.cleaningFilter : 'all';
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', assignee: '' as string, due: '2026-11-28' });

  const matches = (t: Task) => {
    switch (filter) {
      case 'open':
        return !t.done;
      case 'done':
        return t.done;
      case 'mine':
        return t.assignee === ME;
      case 'unassigned':
        return !t.assignee;
      default:
        return true;
    }
  };
  const shown = list.filter(matches);
  const counts = {
    all: list.length,
    open: list.filter((t) => !t.done).length,
    done: list.filter((t) => t.done).length,
    mine: list.filter((t) => t.assignee === ME).length,
    unassigned: list.filter((t) => !t.assignee).length,
  };
  const trashed = s.trash.filter((x) => x.section === section);
  const deviceFor = (taskId: string) => s.changes.find((c) => c.itemId === taskId && c.kind === 'delete');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    act.addTask(section, draft.title, (draft.assignee || null) as PersonId | null, draft.due || '2026-11-30');
    setDraft({ title: '', assignee: '', due: draft.due });
  };

  return (
    <div className="taskPanel">
      {section === 'cleaning' && (
        <div className="filterBar">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`chip${filter === f.id ? ' on' : ''}`}
              onClick={() => setUi({ cleaningFilter: f.id })}
            >
              {f.label} <span className="chipCount">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      )}

      <form className="addRow" onSubmit={submit}>
        <input
          className="input grow"
          placeholder={section === 'cleaning' ? 'Add a cleaning task' : 'Add a utility or forwarding step'}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          aria-label="New task title"
        />
        <select
          className="select"
          value={draft.assignee}
          onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
          aria-label="Assign new task"
        >
          <option value="">Unassigned</option>
          {ROOMMATES.map((id) => (
            <option key={id} value={id}>
              {PEOPLE[id].first}
            </option>
          ))}
        </select>
        <input
          className="input date"
          type="date"
          value={draft.due}
          onChange={(e) => setDraft({ ...draft, due: e.target.value })}
          aria-label="Due date for new task"
        />
        <button type="submit" className="btn primary" disabled={!draft.title.trim()}>
          <Icon name="plus" size={14} /> Add
        </button>
      </form>

      <ul className="taskList">
        {shown.map((t) => {
          const hint = dueHint(t.due, now);
          return (
            <li key={t.id} className={`taskRow${t.done ? ' isDone' : ''}`}>
              <input
                type="checkbox"
                className="check"
                checked={t.done}
                onChange={() => act.toggleTask(section, t.id)}
                aria-label={`Mark "${t.title}" ${t.done ? 'not done' : 'done'}`}
              />
              <div className="taskMain">
                <div className="taskTitle">
                  {t.title}
                  {t.room && <span className="room">{t.room}</span>}
                </div>
                <div className="taskMeta">
                  {t.done && t.doneBy && t.doneAt
                    ? `Done ${relTime(t.doneAt, now)} by ${PEOPLE[t.doneBy].first}`
                    : `Edited by ${PEOPLE[t.updatedBy].first} · ${relTime(t.updatedAt, now)}`}
                </div>
              </div>

              <div className="taskAssign">
                {t.assignee ? <Avatar id={t.assignee} size={22} /> : <span className="unassignedDot" />}
                <select
                  className="select small"
                  value={t.assignee ?? ''}
                  onChange={(e) => act.setAssignee(section, t.id, (e.target.value || null) as PersonId | null)}
                  aria-label={`Assignee for ${t.title}`}
                >
                  <option value="">Unassigned</option>
                  {ROOMMATES.map((id) => (
                    <option key={id} value={id}>
                      {PEOPLE[id].first}
                    </option>
                  ))}
                </select>
              </div>

              <div className="taskDue">
                <input
                  className="input date small"
                  type="date"
                  value={t.due}
                  onChange={(e) => act.setDue(section, t.id, e.target.value)}
                  aria-label={`Due date for ${t.title}`}
                />
                {!t.done && <span className={`dueHint ${hint.tone}`}>{hint.text}</span>}
              </div>

              <CommentButton anchor={{ section, itemId: t.id }} />

              <div className="rowMenuWrap">
                <button
                  type="button"
                  className="iconBtn"
                  aria-label="More actions"
                  onClick={() => setMenuFor(menuFor === t.id ? null : t.id)}
                >
                  <Icon name="dots" size={16} />
                </button>
                {menuFor === t.id && (
                  <div className="menu" role="menu" onMouseLeave={() => setMenuFor(null)}>
                    <button
                      type="button"
                      onClick={() => {
                        setUi({ historyItem: t.id, rightTab: 'activity', historyKind: 'all', historyPerson: 'all' });
                        setMenuFor(null);
                      }}
                    >
                      <Icon name="history" size={14} /> View history
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        act.deleteTask(section, t.id);
                        setMenuFor(null);
                      }}
                    >
                      <Icon name="trash" size={14} /> Delete task
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="emptyRow">Nothing matches this filter.</li>}
      </ul>

      {trashed.length > 0 && (
        <div className="trayBox">
          <div className="trayTitle">Recently deleted · {trashed.length}</div>
          {trashed.map((x) => {
            const change = deviceFor(x.item.id);
            return (
              <div className="trayRow" key={x.item.id}>
                <div className="trayMain">
                  <div className="taskTitle">{x.item.title}</div>
                  <div className="taskMeta">
                    Deleted {relTime(x.deletedAt, now)} by {PEOPLE[x.deletedBy].first}
                    {change ? ` from ${change.device}` : ''}
                    {x.item.assignee ? ` · was assigned to ${PEOPLE[x.item.assignee].first}, due ${dueHint(x.item.due, now).text}` : ''}
                  </div>
                </div>
                <button type="button" className="btn" onClick={() => act.restoreTask(x.item.id)}>
                  <Icon name="restore" size={14} /> Restore
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="footNote">
        {SECTION_META[section].title}: {list.length} items, {list.filter((t) => t.done).length} done. Edits sync to everyone in the note.
      </p>
    </div>
  );
}
