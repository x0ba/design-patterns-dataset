import type {
  Change,
  ChangeKind,
  CommentAnchor,
  Decision,
  NoteState,
  PersonId,
  Role,
  SectionId,
  Task,
  TaskSection,
  Thread,
  Collaborator,
} from '../types';
import { DECISION_LABEL, ME, ROLE_LABEL } from '../constants';
import { DEVICES } from '../data/seed';
import { fmtDue } from '../lib/format';

export type Body =
  | { type: 'toggleTask'; section: TaskSection; id: string }
  | { type: 'setAssignee'; section: TaskSection; id: string; assignee: PersonId | null }
  | { type: 'setDue'; section: TaskSection; id: string; due: string }
  | { type: 'addTask'; section: TaskSection; id: string; title: string; room?: string; assignee: PersonId | null; due: string }
  | { type: 'deleteTask'; section: TaskSection; id: string }
  | { type: 'restoreTask'; id: string }
  | { type: 'setDecision'; id: string; decision: Decision }
  | { type: 'setClaim'; id: string; person: PersonId | null }
  | { type: 'resolveConflict'; id: string; option: number }
  | { type: 'toggleDeposit'; id: string }
  | { type: 'addThread'; threadId: string; anchor: CommentAnchor; text: string }
  | { type: 'replyThread'; threadId: string; replyId: string; text: string }
  | { type: 'toggleResolved'; threadId: string }
  | { type: 'setMoney'; text: string }
  | { type: 'setRole'; personId: PersonId; role: Role }
  | { type: 'setSections'; personId: PersonId; sections: SectionId[] | 'all' }
  | { type: 'invite'; personId: PersonId; name: string; role: Role }
  | { type: 'cancelInvite'; personId: PersonId };

export type Action = Body & { at: number };

function logChange(s: NoteState, c: Omit<Change, 'id'>): NoteState {
  const id = `ch-live-${c.at}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  return { ...s, changes: [{ id, ...c }, ...s.changes] };
}

const firstName = (s: NoteState, id: PersonId | null): string => (id ? s.people[id]?.first ?? 'someone' : 'nobody');

function listFor(s: NoteState, section: TaskSection): Task[] {
  return section === 'cleaning' ? s.cleaning : s.utilities;
}

function withList(s: NoteState, section: TaskSection, list: Task[]): NoteState {
  return section === 'cleaning' ? { ...s, cleaning: list } : { ...s, utilities: list };
}

function taskChange(
  s: NoteState,
  at: number,
  section: TaskSection,
  t: Task,
  kind: ChangeKind,
  text: string,
): NoteState {
  return logChange(s, { at, by: ME, device: DEVICES[ME], kind, section, itemId: t.id, itemTitle: t.title, text });
}

export function reduce(s: NoteState, a: Action): NoteState {
  const at = a.at;
  switch (a.type) {
    case 'toggleTask':
    case 'toggleDeposit': {
      if (a.type === 'toggleDeposit') {
        const d = s.deposit.find((x) => x.id === a.id);
        if (!d) return s;
        const done = !d.done;
        const next: NoteState = {
          ...s,
          deposit: s.deposit.map((x) => (x.id === a.id ? { ...x, done, doneBy: done ? ME : undefined, doneAt: done ? at : undefined } : x)),
        };
        return logChange(next, {
          at,
          by: ME,
          device: DEVICES[ME],
          kind: done ? 'done' : 'undone',
          section: 'deposit',
          itemId: d.id,
          itemTitle: d.text,
          text: done ? `checked off “${d.text}”` : `unchecked “${d.text}”`,
        });
      }
      const t = listFor(s, a.section).find((x) => x.id === a.id);
      if (!t) return s;
      const done = !t.done;
      const list = listFor(s, a.section).map((x) =>
        x.id === a.id ? { ...x, done, doneBy: done ? ME : undefined, doneAt: done ? at : undefined, updatedBy: ME, updatedAt: at } : x,
      );
      return taskChange(withList(s, a.section, list), at, a.section, t, done ? 'done' : 'undone', done ? `checked off “${t.title}”` : `unchecked “${t.title}”`);
    }

    case 'setAssignee': {
      const t = listFor(s, a.section).find((x) => x.id === a.id);
      if (!t || t.assignee === a.assignee) return s;
      const list = listFor(s, a.section).map((x) => (x.id === a.id ? { ...x, assignee: a.assignee, updatedBy: ME, updatedAt: at } : x));
      const text = a.assignee ? `assigned “${t.title}” to ${firstName(s, a.assignee)}` : `unassigned “${t.title}”`;
      return taskChange(withList(s, a.section, list), at, a.section, t, 'assign', text);
    }

    case 'setDue': {
      const t = listFor(s, a.section).find((x) => x.id === a.id);
      if (!t || t.due === a.due || !a.due) return s;
      const list = listFor(s, a.section).map((x) => (x.id === a.id ? { ...x, due: a.due, updatedBy: ME, updatedAt: at } : x));
      return taskChange(withList(s, a.section, list), at, a.section, t, 'due', `moved the due date of “${t.title}” to ${fmtDue(a.due)}`);
    }

    case 'addTask': {
      const title = a.title.trim();
      if (!title) return s;
      const t: Task = { id: a.id, title, room: a.room, assignee: a.assignee, due: a.due, done: false, updatedBy: ME, updatedAt: at };
      const next = withList(s, a.section, [...listFor(s, a.section), t]);
      return taskChange(next, at, a.section, t, 'create', `added “${title}”${a.assignee ? `, assigned to ${firstName(s, a.assignee)}` : ''}`);
    }

    case 'deleteTask': {
      const list = listFor(s, a.section);
      const index = list.findIndex((x) => x.id === a.id);
      if (index < 0) return s;
      const t = list[index];
      const next = withList(s, a.section, list.filter((x) => x.id !== a.id));
      const withTrash: NoteState = {
        ...next,
        trash: [{ item: t, section: a.section, index, deletedAt: at, deletedBy: ME }, ...s.trash],
      };
      return taskChange(withTrash, at, a.section, t, 'delete', `deleted “${t.title}”${t.assignee ? ` (assigned to ${firstName(s, t.assignee)})` : ''}`);
    }

    case 'restoreTask': {
      const entry = s.trash.find((x) => x.item.id === a.id);
      if (!entry) return s;
      const list = [...listFor(s, entry.section)];
      const restored: Task = { ...entry.item, done: false, updatedBy: ME, updatedAt: at };
      list.splice(Math.min(entry.index, list.length), 0, restored);
      const next: NoteState = {
        ...withList(s, entry.section, list),
        trash: s.trash.filter((x) => x.item.id !== a.id),
      };
      const who = restored.assignee ? `assigned to ${firstName(s, restored.assignee)}` : 'unassigned';
      return taskChange(next, at, entry.section, restored, 'restore', `restored “${restored.title}” (${who}, due ${fmtDue(restored.due)})`);
    }

    case 'setDecision': {
      const f = s.furniture.find((x) => x.id === a.id);
      if (!f || (f.decision === a.decision && !f.conflict)) return s;
      const next: NoteState = {
        ...s,
        furniture: s.furniture.map((x) =>
          x.id === a.id
            ? { ...x, decision: a.decision, claimedBy: a.decision === 'keep' ? x.claimedBy : null, updatedBy: ME, updatedAt: at, conflict: undefined }
            : x,
        ),
      };
      return logChange(next, {
        at,
        by: ME,
        device: DEVICES[ME],
        kind: 'decision',
        section: 'furniture',
        itemId: f.id,
        itemTitle: f.name,
        text: `moved “${f.name}” to ${DECISION_LABEL[a.decision]}`,
      });
    }

    case 'setClaim': {
      const f = s.furniture.find((x) => x.id === a.id);
      if (!f) return s;
      const decision: Decision = a.person ? 'keep' : f.decision;
      const next: NoteState = {
        ...s,
        furniture: s.furniture.map((x) =>
          x.id === a.id ? { ...x, decision, claimedBy: a.person, updatedBy: ME, updatedAt: at, conflict: undefined } : x,
        ),
      };
      const text = !a.person
        ? `cleared the claim on “${f.name}”`
        : a.person === ME
          ? `claimed “${f.name}”`
          : `set the claim on “${f.name}” to ${firstName(s, a.person)}`;
      return logChange(next, { at, by: ME, device: DEVICES[ME], kind: 'claim', section: 'furniture', itemId: f.id, itemTitle: f.name, text });
    }

    case 'resolveConflict': {
      const f = s.furniture.find((x) => x.id === a.id);
      const opt = f?.conflict?.options[a.option];
      if (!f || !opt) return s;
      const next: NoteState = {
        ...s,
        furniture: s.furniture.map((x) =>
          x.id === a.id ? { ...x, decision: opt.decision, claimedBy: opt.claimedBy, updatedBy: ME, updatedAt: at, conflict: undefined } : x,
        ),
      };
      const who = opt.claimedBy ? ` (claimed by ${firstName(s, opt.claimedBy)})` : '';
      return logChange(next, {
        at,
        by: ME,
        device: DEVICES[ME],
        kind: 'conflict',
        section: 'furniture',
        itemId: f.id,
        itemTitle: f.name,
        text: `resolved the conflict on “${f.name}”: ${DECISION_LABEL[opt.decision]}${who}`,
      });
    }

    case 'addThread': {
      const text = a.text.trim();
      if (!text) return s;
      const thread: Thread = { id: a.threadId, anchor: a.anchor, author: ME, at, text, resolved: false, replies: [] };
      return { ...s, threads: [thread, ...s.threads] };
    }

    case 'replyThread': {
      const text = a.text.trim();
      if (!text) return s;
      return {
        ...s,
        threads: s.threads.map((t) =>
          t.id === a.threadId ? { ...t, replies: [...t.replies, { id: a.replyId, author: ME, at, text }] } : t,
        ),
      };
    }

    case 'toggleResolved':
      return { ...s, threads: s.threads.map((t) => (t.id === a.threadId ? { ...t, resolved: !t.resolved } : t)) };

    case 'setMoney': {
      if (a.text === s.moneyNotes) return s;
      return logChange({ ...s, moneyNotes: a.text }, { at, by: ME, device: DEVICES[ME], kind: 'edit', section: 'money', text: 'edited Money Notes' });
    }

    case 'setRole': {
      const c = s.collaborators.find((x) => x.personId === a.personId);
      if (!c || c.role === a.role) return s;
      const next = { ...s, collaborators: s.collaborators.map((x) => (x.personId === a.personId ? { ...x, role: a.role } : x)) };
      return logChange(next, {
        at,
        by: ME,
        device: DEVICES[ME],
        kind: 'share',
        section: 'note',
        text: `changed ${firstName(s, a.personId)}’s access to ${ROLE_LABEL[a.role]}`,
      });
    }

    case 'setSections': {
      const c = s.collaborators.find((x) => x.personId === a.personId);
      if (!c) return s;
      const next = { ...s, collaborators: s.collaborators.map((x) => (x.personId === a.personId ? { ...x, sections: a.sections } : x)) };
      const label =
        a.sections === 'all'
          ? 'the whole note'
          : a.sections.length === 0
            ? 'no sections'
            : a.sections.map((id) => ({ cleaning: 'Cleaning Tasks', furniture: 'Shared Furniture', deposit: 'Deposit Checklist', utilities: 'Utilities & Forwarding', money: 'Money Notes' })[id]).join(', ');
      return logChange(next, {
        at,
        by: ME,
        device: DEVICES[ME],
        kind: 'share',
        section: 'note',
        text: `set ${firstName(s, a.personId)}’s access to ${label}`,
      });
    }

    case 'invite': {
      const name = a.name.trim();
      if (!name) return s;
      const parts = name.split(/\s+/);
      const person = {
        id: a.personId,
        name,
        first: parts[0],
        initials: parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2),
        hue: (name.length * 53) % 360,
      };
      const collaborator: Collaborator = { personId: a.personId, role: a.role, sections: [], status: 'pending', invitedAt: at };
      const next: NoteState = {
        ...s,
        people: { ...s.people, [a.personId]: person },
        collaborators: [...s.collaborators, collaborator],
      };
      return logChange(next, { at, by: ME, device: DEVICES[ME], kind: 'share', section: 'note', text: `invited ${name}. No sections shared yet.` });
    }

    case 'cancelInvite': {
      const name = firstName(s, a.personId);
      const next = { ...s, collaborators: s.collaborators.filter((x) => x.personId !== a.personId) };
      return logChange(next, { at, by: ME, device: DEVICES[ME], kind: 'share', section: 'note', text: `cancelled the invite to ${name}` });
    }
  }
}
