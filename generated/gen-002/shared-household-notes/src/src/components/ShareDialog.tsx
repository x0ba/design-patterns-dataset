import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../state/context';
import { Avatar, Icon } from '../ui/primitives';
import { ME, ROLE_LABEL, SECTION_META, SECTION_ORDER } from '../constants';
import { monthDay } from '../lib/format';
import type { Collaborator, Role, SectionId } from '../types';

const ROLE_OPTIONS: Role[] = ['editor', 'commenter', 'viewer'];

// Owner first, then pending invites (they need a decision), then active roommates.
const rank = (c: Collaborator): number => (c.personId === ME ? 0 : c.status === 'pending' ? 1 : 2);

export function ShareDialog() {
  const { s, act, setUi } = useApp();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('commenter');
  const close = () => setUi({ shareOpen: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUi({ shareOpen: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setUi]);

  const invite = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    act.invite(name.trim(), role);
    setName('');
  };

  return (
    <div
      className="modalBack"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="shareTitle">
        <header className="modalHead">
          <div>
            <h2 id="shareTitle">Share “Move-Out: 412 Alder St”</h2>
            <p className="muted">Changes here apply right away. Nothing is sent until someone accepts an invite.</p>
          </div>
          <button type="button" className="iconBtn" onClick={close} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="modalBody">
          <form className="inviteRow" onSubmit={invite}>
            <input
              className="input grow"
              placeholder="Name or email address"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Name or email to invite"
            />
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Role for new person">
              {ROLE_OPTIONS.filter((r) => r !== 'editor').map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <button type="submit" className="btn primary" disabled={!name.trim()}>
              Invite
            </button>
          </form>
          <p className="hint">New people start with no sections. You choose what they can see. Money Notes are roommates-only and can never be shared.</p>

          <h3 className="sectionHead">People with access</h3>
          <ul className="accessRows">
            {[...s.collaborators]
              .sort((a, b) => rank(a) - rank(b))
              .map((c) => (
                <AccessRow key={c.personId} c={c} />
              ))}
          </ul>
        </div>

        <footer className="modalFoot">
          <span className="muted">
            {s.collaborators.filter((c) => c.status === 'active').length} active · {s.collaborators.filter((c) => c.status === 'pending').length} pending
          </span>
          <button type="button" className="btn primary" onClick={close}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

function AccessRow({ c }: { c: Collaborator }) {
  const { s, act, setUi } = useApp();
  const person = s.people[c.personId];
  const isOwner = c.personId === ME;
  const allSections = c.sections === 'all';
  const picked: SectionId[] = c.sections === 'all' ? [] : c.sections;

  const toggleSection = (sec: SectionId, on: boolean) => {
    const next = SECTION_ORDER.filter((id) => (id === sec ? on : picked.includes(id)));
    act.setSections(c.personId, next);
  };

  return (
    <li className={`accessRow${c.status === 'pending' ? ' pending' : ''}`}>
      <div className="accessHead">
        <Avatar id={c.personId} size={32} />
        <div className="accessWho">
          <div className="accessName">
            {person.name}
            {isOwner && <span className="tag">You</span>}
            {person.landlord && <span className="tag land">Landlord</span>}
          </div>
          <div className="accessSub">
            {isOwner
              ? 'Owner · all sections'
              : c.status === 'pending'
                ? `Invite pending${c.invitedAt ? ` · sent ${monthDay(c.invitedAt)}` : ''}`
                : allSections
                  ? 'All sections, including Money Notes'
                  : picked.length
                    ? `Sections: ${picked.map((id) => SECTION_META[id].title).join(', ')}`
                    : 'No sections yet'}
          </div>
        </div>
        {isOwner ? (
          <span className="roleStatic">{ROLE_LABEL.owner}</span>
        ) : (
          <select
            className="select"
            value={c.role}
            onChange={(e) => act.setRole(c.personId, e.target.value as Role)}
            aria-label={`Access level for ${person.name}`}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        )}
      </div>

      {!isOwner && !allSections && (
        <div className="sectionPicker">
          {SECTION_ORDER.map((sec) => {
            const locked = sec === 'money';
            return (
              <label key={sec} className={`secCheck${locked ? ' locked' : ''}${picked.includes(sec) ? ' on' : ''}`}>
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={picked.includes(sec)}
                  onChange={(e) => toggleSection(sec, e.target.checked)}
                />
                <span>{SECTION_META[sec].title}</span>
                {locked && (
                  <span className="lockNote">
                    <Icon name="lock" size={11} /> Roommates only
                  </span>
                )}
              </label>
            );
          })}
          <div className="rowActions">
            {picked.length > 0 && (
              <button
                type="button"
                className="linkBtn"
                onClick={() => setUi({ preview: c.personId, shareOpen: false })}
              >
                <Icon name="eye" size={13} /> Preview what {person.first} sees
              </button>
            )}
            {c.status === 'pending' && (
              <button type="button" className="linkBtn danger" onClick={() => act.cancelInvite(c.personId)}>
                Cancel invite
              </button>
            )}
          </div>
          <div className="secSummary">
            {picked.length
              ? `${person.first} will see ${picked.map((id) => SECTION_META[id].title).join(' and ')} and can ${c.role === 'editor' ? 'edit' : c.role === 'commenter' ? 'view and comment' : 'view only'}.`
              : `${person.first} can't see anything until you pick a section.`}
          </div>
        </div>
      )}
    </li>
  );
}
