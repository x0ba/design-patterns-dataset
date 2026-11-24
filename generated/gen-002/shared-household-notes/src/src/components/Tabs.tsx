import { useState } from 'react';
import { useApp } from '../state/context';
import { Avatar, CommentButton, Icon } from '../ui/primitives';
import { DECISION_LABEL, DECISION_ORDER, ME } from '../constants';
import { PEOPLE, PRESENCE, ROOMMATES } from '../data/seed';
import { fmtDue, relTime } from '../lib/format';
import type { Decision, FurnitureItem, PersonId } from '../types';

// ---------- Shared Furniture ----------

export function FurnitureTab() {
  const { s } = useApp();
  const conflicts = s.furniture.filter((f) => f.conflict).length;
  return (
    <div className="furnitureTab">
      {conflicts > 0 && (
        <div className="banner warn">
          <Icon name="alert" size={16} />
          <div>
            <b>{conflicts} item needs a decision.</b> Two people changed it at nearly the same time. Pick the outcome you want on the card below.
          </div>
        </div>
      )}
      <div className="furnGrid">
        {DECISION_ORDER.map((d) => {
          const items = s.furniture.filter((f) => f.decision === d);
          return (
            <section className="furnCol" key={d} aria-label={DECISION_LABEL[d]}>
              <header className="furnColHead">
                <h3>{DECISION_LABEL[d]}</h3>
                <span className="count">{items.length}</span>
              </header>
              {items.map((f) => (
                <FurnitureCard key={f.id} f={f} />
              ))}
              {items.length === 0 && <div className="emptyCol">Nothing marked {DECISION_LABEL[d].toLowerCase()} yet.</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FurnitureCard({ f }: { f: FurnitureItem }) {
  const { now, act } = useApp();
  const here = PRESENCE.filter((p) => p.itemId === f.id && p.personId !== ME);
  return (
    <article className={`furnCard${f.conflict ? ' conflicted' : ''}`}>
      <div className="furnTop">
        <div className="furnName">{f.name}</div>
        <CommentButton anchor={{ section: 'furniture', itemId: f.id }} />
      </div>
      <div className="furnDetail">{f.detail}</div>

      {here.length > 0 && (
        <div className="presenceTags">
          {here.map((p) => (
            <span className="presenceTag" key={p.personId}>
              <Avatar id={p.personId} size={16} />
              {PEOPLE[p.personId].first} is {p.doing} this item
            </span>
          ))}
        </div>
      )}

      {f.conflict && (
        <div className="conflictBox" role="alert">
          <div className="conflictTitle">
            <Icon name="alert" size={14} /> Conflict
          </div>
          <p>{f.conflict.summary}</p>
          <div className="conflictOpts">
            {f.conflict.options.map((o, i) => (
              <button key={o.label} type="button" className="conflictOpt" onClick={() => act.resolveConflict(f.id, i)}>
                <b>{o.label}</b>
                <span>
                  {PEOPLE[o.by].first} · {relTime(o.at, now)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="furnControls">
        <label className="claimLabel">
          <span>Claimed by</span>
          <select
            className="select small"
            value={f.claimedBy ?? ''}
            onChange={(e) => act.setClaim(f.id, (e.target.value || null) as PersonId | null)}
            aria-label={`Claimed by for ${f.name}`}
          >
            <option value="">Nobody yet</option>
            {ROOMMATES.map((id) => (
              <option key={id} value={id}>
                {PEOPLE[id].first}
              </option>
            ))}
          </select>
        </label>
        <div className="seg" role="group" aria-label={`Decision for ${f.name}`}>
          {DECISION_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              className={f.decision === d ? 'on' : ''}
              aria-pressed={f.decision === d}
              onClick={() => act.setDecision(f.id, d as Decision)}
            >
              {DECISION_LABEL[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="furnMeta">
        Last changed by {PEOPLE[f.updatedBy].first} · {relTime(f.updatedAt, now)}
      </div>
    </article>
  );
}

// ---------- Deposit Checklist ----------

export function DepositTab() {
  const { s, now, act, setUi } = useApp();
  const done = s.deposit.filter((d) => d.done).length;
  const landlord = s.collaborators.find((c) => c.personId === 'marjorie');
  const sharedHere = !!landlord && landlord.sections !== 'all' && landlord.sections.includes('deposit');

  return (
    <div className="depositTab">
      <div className="depHero">
        <div>
          <div className="kicker">Security deposit</div>
          <div className="bigNum">${s.depositAmount.toLocaleString('en-US')}</div>
          <div className="muted">Split five ways, that is $650 each if all of it comes back.</div>
        </div>
        <div className="depFacts">
          <div>
            <span>Final walkthrough</span>
            <b>{s.walkthrough}</b>
          </div>
          <div>
            <span>Items done</span>
            <b>
              {done} of {s.deposit.length}
            </b>
          </div>
          <div>
            <span>Marjorie Chen (landlord)</span>
            <b>
              {landlord?.status === 'pending'
                ? sharedHere
                  ? `Invite pending · will see this section`
                  : 'Invite pending · no access yet'
                : sharedHere
                  ? 'Can view & comment here'
                  : 'No access'}
            </b>
            <button type="button" className="linkBtn" onClick={() => setUi({ shareOpen: true })}>
              Manage access
            </button>
          </div>
        </div>
      </div>

      <ul className="depList">
        {s.deposit.map((d) => {
          const task = [...s.cleaning, ...s.utilities].find((t) => t.id === d.linkedTaskId);
          const trashed = s.trash.find((x) => x.item.id === d.linkedTaskId);
          return (
            <li key={d.id} className={`depRow${d.done ? ' isDone' : ''}`}>
              <input
                type="checkbox"
                className="check"
                checked={d.done}
                onChange={() => act.toggleDeposit(d.id)}
                aria-label={`Mark "${d.text}" ${d.done ? 'not done' : 'done'}`}
              />
              <div className="depMain">
                <div className="depText">{d.text}</div>
                {d.note && <div className="depNote">{d.note}</div>}
                {d.linkedTaskId && task && (
                  <div className="linkLine">
                    <Icon name="link" size={13} /> Linked to “{task.title}” · {task.assignee ? PEOPLE[task.assignee].first : 'Unassigned'} ·{' '}
                    {task.done ? 'done' : `due ${fmtDue(task.due)}`}
                  </div>
                )}
                {d.linkedTaskId && !task && trashed && (
                  <div className="linkLine warnLine">
                    <Icon name="alert" size={13} /> Linked cleaning task was deleted {relTime(trashed.deletedAt, now)} by {PEOPLE[trashed.deletedBy].first}.
                    <button type="button" className="linkBtn" onClick={() => act.restoreTask(trashed.item.id)}>
                      Restore task
                    </button>
                  </div>
                )}
              </div>
              <div className="depBy">
                {d.done && d.doneBy && d.doneAt && (
                  <>
                    {PEOPLE[d.doneBy].first}
                    <span>{relTime(d.doneAt, now)}</span>
                  </>
                )}
              </div>
              <CommentButton anchor={{ section: 'deposit', itemId: d.id }} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Money Notes (roommates only) ----------

export function MoneyTab() {
  const { s, act } = useApp();
  const [draft, setDraft] = useState(s.moneyNotes);
  return (
    <div className="moneyTab">
      <div className="banner private">
        <Icon name="lock" size={16} />
        <div>
          <b>Private to the five roommates.</b> Not shared with Marjorie Chen, and left out whenever the note is shared with anyone outside the house.
        </div>
      </div>
      <textarea
        className="moneyArea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => act.setMoney(draft)}
        rows={12}
        aria-label="Money Notes"
      />
      <div className="footNote">Saves when you click out of the box. Visible to Lucía, Priya, Sam and Theo.</div>
    </div>
  );
}
