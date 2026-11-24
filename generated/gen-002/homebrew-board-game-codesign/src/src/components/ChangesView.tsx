import { useMemo, useState } from 'react';
import type { Change, DeckId, PersonId } from '../types';
import { DECK_META, DECK_ORDER } from '../data/cards';
import { PEOPLE } from '../data/people';
import { useApp } from '../store';
import { clock, dayLabel, nowV } from '../lib/time';
import { Avatar, DeckDot, Diff, Icon } from './ui';

type Where = 'all' | DeckId | 'rulebook';

function ChangeRow({ ch }: { ch: Change }) {
  const { state, dispatch } = useApp();
  const [confirm, setConfirm] = useState(false);
  const card = ch.kind === 'card' ? state.cards[ch.target] : null;
  const rule = ch.kind === 'rule' ? state.rules[ch.target] : null;
  const p = PEOPLE[ch.by];
  const stale = card ? (ch.field === 'cost' ? String(card.cost) : (card[ch.field as 'effect' | 'flavor'] as string)) !== ch.after : rule ? rule.text !== ch.after : false;
  const blocked = !!card?.live;
  return (
    <article className={`change ${ch.seen ? '' : 'unseen'} ${ch.reverted ? 'reverted' : ''}`}>
      <div className="change-rail"><Avatar id={ch.by} size={30} /></div>
      <div className="change-main">
        <header>
          <p className="change-title">
            <strong>{p.short}</strong> {ch.note ? <span>{ch.note.toLowerCase()} on </span> : <span>changed the <em>{ch.field === 'text' ? 'text' : ch.field}</em> of </span>}
            {card && <><DeckDot deck={card.deck} /> <button className="link strong" onClick={() => dispatch({ type: 'openCard', id: card.id })}>{card.name}</button></>}
            {rule && <button className="link strong" onClick={() => dispatch({ type: 'openRule', id: rule.id })}>Rule {rule.id} {rule.title}</button>}
          </p>
          <span className="muted change-time">{clock(ch.at)}{ch.vTo ? ` · v${ch.vFrom}→v${ch.vTo}` : ''}</span>
        </header>
        <div className={`change-diff ${ch.field === 'flavor' ? 'italic' : ''}`}>
          {ch.field === 'cost' ? (
            <span className="costshift">Cost <del>{ch.before}</del> <Icon name="arrow" size={14} /> <ins>{ch.after}</ins></span>
          ) : ch.kind === 'rule' ? (
            <RuleDiff before={ch.before} after={ch.after} />
          ) : (
            <Diff a={ch.before} b={ch.after} />
          )}
        </div>
        <footer>
          {ch.reverted ? <span className="status muted-s">Reverted</span> : null}
          {!ch.seen && <button className="btn small" onClick={() => dispatch({ type: 'seen', id: ch.id })}><Icon name="check" size={14} /> Mark seen</button>}
          {!ch.reverted && !confirm && (
            <button className="btn small ghost" disabled={blocked || stale} onClick={() => setConfirm(true)} title={blocked ? 'Jun is editing this card right now' : stale ? 'Changed again since this edit' : 'Restore the text from before this edit'}>
              <Icon name="undo" size={14} /> Revert
            </button>
          )}
          {confirm && (
            <span className="confirm">
              Restore the earlier text{ch.by !== 'hollis' ? ` and replace ${p.short}’s edit` : ''}?
              <button className="btn small danger" onClick={() => { dispatch({ type: 'revert', id: ch.id }); setConfirm(false); }}>Yes, revert</button>
              <button className="btn small ghost" onClick={() => setConfirm(false)}>Cancel</button>
            </span>
          )}
          {blocked && !ch.reverted && <span className="muted small">Jun is typing in this card</span>}
          <span className="spacer" />
          <button className="link" onClick={() => (card ? dispatch({ type: 'openCard', id: card.id }) : dispatch({ type: 'openRule', id: ch.target }))}>
            Open {card ? 'card' : 'rule'} <Icon name="arrow" size={13} />
          </button>
        </footer>
      </div>
    </article>
  );
}

/** For long rule text, only show the changed region with a little context. */
function RuleDiff({ before, after }: { before: string; after: string }) {
  const [full, setFull] = useState(false);
  let i = 0;
  while (i < before.length && i < after.length && before[i] === after[i]) i++;
  let j = 0;
  while (j < before.length - i && j < after.length - i && before[before.length - 1 - j] === after[after.length - 1 - j]) j++;
  const lead = Math.max(0, before.lastIndexOf(' ', Math.max(0, i - 50)));
  const trail = Math.min(60, j);
  const a = full ? before : before.slice(lead, before.length - j + trail);
  const b = full ? after : after.slice(lead, after.length - j + trail);
  return (
    <span>
      {!full && lead > 0 && '… '}
      <Diff a={a} b={b} />
      {!full && j > trail && ' …'}
      {(lead > 0 || j > trail) && <button className="link small" onClick={() => setFull(!full)}> {full ? 'Show less' : 'Show full rule'}</button>}
    </span>
  );
}

export function ChangesView() {
  const { state, dispatch } = useApp();
  const [who, setWho] = useState<'all' | PersonId>('all');
  const [where, setWhere] = useState<Where>('all');
  const [unseen, setUnseen] = useState(false);

  const whereOf = (c: Change): Where => (c.kind === 'rule' ? 'rulebook' : state.cards[c.target].deck);
  const all = state.changes;
  const people = (['jun', 'hollis'] as PersonId[]).map((id) => ({ id, n: all.filter((c) => c.by === id).length })).filter((p) => p.n > 0);
  const places: { id: Where; label: string; n: number }[] = [
    ...DECK_ORDER.map((d) => ({ id: d as Where, label: DECK_META[d].label, n: all.filter((c) => whereOf(c) === d).length })),
    { id: 'rulebook' as Where, label: 'Rulebook', n: all.filter((c) => c.kind === 'rule').length },
  ].filter((p) => p.n > 0);

  const shown = useMemo(
    () => all.filter((c) => (who === 'all' || c.by === who) && (where === 'all' || whereOf(c) === where) && (!unseen || !c.seen)),
    [all, who, where, unseen, state.cards],
  );
  const unseenCount = all.filter((c) => !c.seen).length;
  const groups: { day: string; items: Change[] }[] = [];
  shown.forEach((c) => {
    const d = dayLabel(c.at);
    const g = groups.find((x) => x.day === d);
    if (g) g.items.push(c);
    else groups.push({ day: d, items: [c] });
  });

  // digest of Jun's work
  const jun = all.filter((c) => c.by === 'jun');
  const junCards = jun.filter((c) => c.kind === 'card');
  const byDeck = DECK_ORDER.map((d) => ({ d, items: junCards.filter((c) => state.cards[c.target].deck === d) })).filter((x) => x.items.length);
  const junRules = jun.filter((c) => c.kind === 'rule');
  const sg = state.suggestion;
  const live = Object.values(state.cards).find((c) => c.live);
  const oldest = all[all.length - 1]?.at;
  const newest = all[0]?.at;

  return (
    <div className="view changes-view">
      <div className="page-head">
        <div>
          <h1>Changes since Saturday&rsquo;s playtest</h1>
          <p className="sub"><strong>{all.length} changes</strong> from {oldest && `${dayLabel(oldest)}, ${clock(oldest)}`} to {newest && `${dayLabel(newest)}, ${clock(newest)}`}. {unseenCount > 0 ? <>{unseenCount} not reviewed yet.</> : 'Everything reviewed.'}</p>
        </div>
        <button className="btn" disabled={unseenCount === 0} onClick={() => dispatch({ type: 'seen' })}><Icon name="check" size={15} /> Mark all {unseenCount || ''} seen</button>
      </div>

      <div className="changes-grid">
        <div className="changes-main">
          <div className="filters" role="group" aria-label="Filter changes">
            <div className="filter-group">
              <span className="filter-label">By</span>
              <button className={`fchip ${who === 'all' ? 'on' : ''}`} onClick={() => setWho('all')}>Everyone <b>{all.length}</b></button>
              {people.map((p) => (
                <button key={p.id} className={`fchip ${who === p.id ? 'on' : ''}`} onClick={() => setWho(p.id)}><Avatar id={p.id} size={16} />{PEOPLE[p.id].short} <b>{p.n}</b></button>
              ))}
            </div>
            <div className="filter-group">
              <span className="filter-label">In</span>
              <button className={`fchip ${where === 'all' ? 'on' : ''}`} onClick={() => setWhere('all')}>All</button>
              {places.map((p) => (
                <button key={p.id} className={`fchip ${where === p.id ? 'on' : ''}`} onClick={() => setWhere(p.id)}>
                  {p.id !== 'rulebook' && <DeckDot deck={p.id as DeckId} />}{p.label} <b>{p.n}</b>
                </button>
              ))}
            </div>
            <label className="toggle"><input type="checkbox" checked={unseen} onChange={(e) => setUnseen(e.target.checked)} /> Not reviewed only</label>
          </div>

          {groups.map((g) => (
            <section key={g.day} className="daygroup">
              <h3>{g.day}{g.day === dayLabel(nowV()) ? ' · today' : ' · after the playtest'}<span>{g.items.length}</span></h3>
              {g.items.map((c) => <ChangeRow key={c.id} ch={c} />)}
            </section>
          ))}
          {shown.length === 0 && <div className="empty big">Nothing matches those filters.</div>}
        </div>

        <aside className="digest">
          <div className="panel digest-card">
            <div className="digest-head"><Avatar id="jun" size={34} live={!!live} /><div><h3>What Jun changed</h3><span className="muted">{jun.length} edits since yesterday</span></div></div>
            <ul>
              {byDeck.map(({ d, items }) => (
                <li key={d}>
                  <div className="digest-line"><DeckDot deck={d} /><strong>{items.length} {items.length === 1 ? DECK_META[d].singular : DECK_META[d].label} {items.length === 1 ? 'card' : 'cards'}</strong></div>
                  <div className="digest-names">
                    {items.map((c, i) => <span key={c.id}><button className="link" onClick={() => dispatch({ type: 'openCard', id: c.target })}>{state.cards[c.target].name}</button>{i < items.length - 1 ? ', ' : ''}</span>)}
                  </div>
                </li>
              ))}
              {junRules.length > 0 && (
                <li>
                  <div className="digest-line"><Icon name="book" size={14} /><strong>{junRules.length} rulebook {junRules.length === 1 ? 'edit' : 'edits'}</strong></div>
                  <div className="digest-names">{junRules.map((c, i) => <span key={c.id}><button className="link" onClick={() => dispatch({ type: 'openRule', id: c.target })}>Rule {c.target}</button>{i < junRules.length - 1 ? ', ' : ''}</span>)}</div>
                </li>
              )}
            </ul>
            {live && <div className="digest-live"><span className="dot live" /> Still typing in <button className="link" onClick={() => dispatch({ type: 'openCard', id: live.id })}>{live.name}</button></div>}
          </div>
          <div className={`panel digest-card suggestion-card ${sg.status}`}>
            <h3>Suggested rewrite of rule {sg.ruleId}</h3>
            {sg.status === 'pending' ? (
              <>
                <p className="muted">From Jun at {clock(sg.at)}. Waiting for your decision.</p>
                <button className="btn primary" onClick={() => dispatch({ type: 'openRule', id: sg.ruleId })}>Review the rewrite <Icon name="arrow" size={15} /></button>
              </>
            ) : (
              <p className="muted">{sg.status === 'accepted' ? 'You accepted it.' : 'You rejected it.'}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
