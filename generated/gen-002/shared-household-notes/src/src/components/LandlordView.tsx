import { useApp } from '../state/context';
import { Icon } from '../ui/primitives';
import { PEOPLE } from '../data/seed';
import { relTime } from '../lib/format';
import type { SectionId } from '../types';

// Renders the note the way a collaborator sees it. Only sections they were given appear,
// Money Notes and the activity log never render, and nothing is editable.
export function LandlordView() {
  const { s, now, setUi, ui } = useApp();
  const who = ui.preview ?? 'marjorie';
  const person = s.people[who] ?? PEOPLE.marjorie;
  const access = s.collaborators.find((c) => c.personId === who);
  const allowed: SectionId[] = access && access.sections !== 'all' ? access.sections : [];
  const canSeeDeposit = allowed.includes('deposit');
  const canComment = access?.role === 'commenter' || access?.role === 'editor';
  const done = s.deposit.filter((d) => d.done).length;
  const threads = s.threads.filter((t) => t.anchor.section === 'deposit' && !t.resolved);

  return (
    <div className="landlordView">
      <div className="previewBar">
        <Icon name="eye" size={15} />
        <span>
          <b>Preview as {person.name}.</b> This is what they see once they accept. Read-only.
        </span>
        <button type="button" className="btn" onClick={() => setUi({ preview: null })}>
          Exit preview
        </button>
      </div>

      <div className="llWrap">
        <div className="llBrand">
          <span className="brandMark">J</span>
          <span className="brandName">Jotsy</span>
        </div>

        {!canSeeDeposit ? (
          <div className="llEmpty">
            <h1>Nothing shared yet</h1>
            <p>{person.first} can't see any part of this note until a section is shared with them.</p>
          </div>
        ) : (
          <>
            <h1>Move-Out: 412 Alder St</h1>
            <p className="muted">Shared by Kenji Morales · Deposit Checklist</p>

            <div className="depHero">
              <div>
                <div className="kicker">Security deposit</div>
                <div className="bigNum">${s.depositAmount.toLocaleString('en-US')}</div>
                <div className="muted">Final walkthrough: {s.walkthrough}</div>
              </div>
              <div className="depFacts">
                <div>
                  <span>Items done</span>
                  <b>
                    {done} of {s.deposit.length}
                  </b>
                </div>
              </div>
            </div>

            <ul className="depList readOnly">
              {s.deposit.map((d) => (
                <li key={d.id} className={`depRow${d.done ? ' isDone' : ''}`}>
                  <input type="checkbox" className="check" checked={d.done} disabled aria-label={d.text} />
                  <div className="depMain">
                    <div className="depText">{d.text}</div>
                    {d.note && <div className="depNote">{d.note}</div>}
                  </div>
                  {d.done && d.doneAt && <div className="depBy">Done {relTime(d.doneAt, now)}</div>}
                </li>
              ))}
            </ul>

            <h3 className="llCommentsHead">Comments on this section</h3>
            {threads.length === 0 && <div className="emptyRow">No comments yet.</div>}
            <ul className="llThreads">
              {threads.map((t) => (
                <li key={t.id}>
                  <div className="llThreadMeta">
                    <b>{s.people[t.author]?.first}</b> · {relTime(t.at, now)}
                  </div>
                  <div>{t.text}</div>
                </li>
              ))}
            </ul>

            <div className="llComposer">
              <input className="input grow" disabled placeholder={canComment ? 'Comments are turned off in preview' : 'View only: comments are off'} />
              <button type="button" className="btn" disabled>
                Comment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
