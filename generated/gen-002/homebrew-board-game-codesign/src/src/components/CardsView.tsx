import { useEffect, useMemo, useState } from 'react';
import type { Card, DeckId } from '../types';
import { DECK_META, DECK_ORDER } from '../data/cards';
import { PEOPLE } from '../data/people';
import { useApp, deckCards, commentsFor, type State } from '../store';
import { when, nowV, clock, dateShort } from '../lib/time';
import { Avatar, CardFace, DeckDot, Diff, EFFECT_MAX, FLAVOR_MAX, Icon, Meter } from './ui';
import { Thread, ReplyBox } from './Thread';

const changesFor = (s: State, id: string) => s.changes.filter((c) => c.kind === 'card' && c.target === id);

function DeckTabs() {
  const { state, dispatch } = useApp();
  return (
    <div className="decktabs" role="tablist" aria-label="Decks">
      {DECK_ORDER.map((d) => {
        const m = DECK_META[d];
        const n = deckCards(state, d).length;
        const live = deckCards(state, d).find((c) => c.live);
        return (
          <button key={d} role="tab" aria-selected={state.deck === d} className={`decktab ${state.deck === d ? 'active' : ''}`} style={{ ['--deck' as string]: m.color }} onClick={() => dispatch({ type: 'selectDeck', deck: d })}>
            <DeckDot deck={d} />
            <span>{m.label}</span>
            <span className="decktab-n">{n}</span>
            {live && <span className="decktab-live" title={`${PEOPLE[live.live!.by].short} is editing ${live.name}`}><Avatar id={live.live!.by} size={18} live /></span>}
          </button>
        );
      })}
    </div>
  );
}

function DeckStrip({ deck }: { deck: DeckId }) {
  const { state, dispatch } = useApp();
  const cards = deckCards(state, deck);
  const revised = cards.filter((c) => changesFor(state, c.id).length > 0);
  const drafts = cards.filter((c) => state.drafts[c.id]);
  const m = DECK_META[deck];
  const live = cards.find((c) => c.live);
  return (
    <div className="deckstrip">
      <div className="deckstrip-main">
        <p>{m.blurb}</p>
        <div className="pips" aria-label={`${revised.length} of ${cards.length} ${m.label} cards revised since Saturday`}>
          <span className="pips-row">
            {cards.map((c) => (
              <span key={c.id} className={`pip ${state.drafts[c.id] ? 'draft' : changesFor(state, c.id).length ? 'done' : ''}`} style={{ ['--deck' as string]: m.color }} title={c.name} />
            ))}
          </span>
          <span className="pips-label"><strong>{revised.length}</strong> of {cards.length} revised since Saturday{drafts.length ? ` · ${drafts.length} draft` : ''}</span>
        </div>
      </div>
      {deck === 'harbor' && (
        <div className="callout warn">
          <Icon name="warn" size={16} />
          <span><strong>Flagged after Saturday&rsquo;s playtest.</strong> Tidewarden&rsquo;s Quay and The Counting House made the economy snowball. The session ran 40 minutes long.</span>
          <button className="link" onClick={() => { dispatch({ type: 'view', view: 'playtests' }); }}>See the notes</button>
        </div>
      )}
      {deck === 'market' && live && (
        <div className="callout live">
          <Avatar id={live.live!.by} size={20} live />
          <span><strong>Jun is editing this deck.</strong> He is on {live.name} right now and has changed {revised.length} Market cards since Saturday.</span>
        </div>
      )}
    </div>
  );
}

function CardList({ deck }: { deck: DeckId }) {
  const { state, dispatch } = useApp();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'deck' | 'cost' | 'changed'>('deck');
  const [only, setOnly] = useState(false);
  const list = useMemo(() => {
    let l = deckCards(state, deck);
    if (q.trim()) l = l.filter((c) => (c.name + ' ' + c.effect).toLowerCase().includes(q.trim().toLowerCase()));
    if (only) l = l.filter((c) => changesFor(state, c.id).length > 0 || state.drafts[c.id] || c.live);
    if (sort === 'cost') l = [...l].sort((a, b) => (a.cost ?? -1) - (b.cost ?? -1) || a.name.localeCompare(b.name));
    if (sort === 'changed') l = [...l].sort((a, b) => b.edited.getTime() - a.edited.getTime());
    return l;
  }, [state.cards, state.drafts, state.changes, deck, q, sort, only]);

  return (
    <section className="panel list-panel" aria-label={`${DECK_META[deck].label} cards`}>
      <div className="list-tools">
        <label className="search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${DECK_META[deck].label.toLowerCase()}`} aria-label="Search cards" /></label>
        <div className="list-tools-row">
          <div className="seg" role="group" aria-label="Sort">
            {([['deck', 'Deck order'], ['cost', 'Cost'], ['changed', 'Recent']] as const).map(([k, l]) => (
              <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>
            ))}
          </div>
          <label className="toggle small"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Changed</label>
        </div>
      </div>
      <ul className="cardlist">
        {list.map((c) => {
          const ch = changesFor(state, c.id)[0];
          const cm = commentsFor(state, 'card', c.id).filter((x) => x.status === 'open').length;
          const draft = state.drafts[c.id];
          return (
            <li key={c.id}>
              <button className={`cardrow ${state.cardId === c.id ? 'selected' : ''}`} onClick={() => dispatch({ type: 'selectCard', id: c.id })} aria-current={state.cardId === c.id}>
                <span className="cardrow-cost">{c.cost === null ? '–' : c.cost}</span>
                <span className="cardrow-main">
                  <span className="cardrow-name">{c.name}</span>
                  <span className="cardrow-effect">{draft?.effect ?? c.effect}</span>
                </span>
                <span className="cardrow-badges">
                  {c.live && <span className="badge live"><Avatar id={c.live.by} size={16} live /> typing</span>}
                  {draft && <span className="badge draft">Draft</span>}
                  {!c.live && !draft && ch && <span className="badge by" style={{ ['--p' as string]: PEOPLE[ch.by].color }} title={`${PEOPLE[ch.by].name} changed this at ${clock(ch.at)}`}>{PEOPLE[ch.by].short}</span>}
                  {cm > 0 && <span className="badge note" title={`${cm} open comment${cm > 1 ? 's' : ''}`}><Icon name="comment" size={12} />{cm}</span>}
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="empty">No cards match.</li>}
      </ul>
    </section>
  );
}

function CardEditor({ card }: { card: Card }) {
  const { state, dispatch } = useApp();
  const draft = state.drafts[card.id] ?? {};
  const eff = draft.effect ?? card.effect;
  const flv = draft.flavor ?? card.flavor;
  const cost = draft.cost !== undefined ? draft.cost : card.cost;
  const dirty = Object.keys(draft).length > 0;
  const locked = !!card.live;
  const deckLive = deckCards(state, card.deck).find((c) => c.live);
  const norm = (t: string) => t.replace(/\u2019/g, "'");
  const mentions = Object.values(state.rules).filter((r) => norm(r.text).includes(norm(card.name)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !locked) dispatch({ type: 'save', id: card.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, locked, card.id, dispatch]);


  return (
    <section className="panel editor" aria-label={`Edit ${card.name}`}>
      <header className="editor-head">
        <div>
          <div className="eyebrow"><DeckDot deck={card.deck} /> {DECK_META[card.deck].singular} card &middot; v{card.version}</div>
          <h2>{card.name}</h2>
        </div>
        <div className="editor-status">
          {locked ? <span className="status lock"><Icon name="lock" size={14} /> Locked by Jun</span>
            : dirty ? <span className="status warn"><span className="dot" /> Unsaved changes</span>
            : <span className="status ok"><Icon name="check" size={14} /> Saved</span>}
        </div>
      </header>

      {locked && (
        <div className="lockbox">
          <div className="lockbox-head">
            <Avatar id={card.live!.by} size={30} live />
            <div>
              <strong>Jun is editing this card right now</strong>
              <span>Started {clock(card.live!.since)}. Your fields are read-only so neither of you overwrites the other.</span>
            </div>
          </div>
          <div className="lockbox-live">
            <div className="label">What he&rsquo;s typing <span className="typing"><i /><i /><i /></span></div>
            <p><Diff a={card.effect} b={card.live!.effect} /></p>
          </div>
          <div className="lockbox-actions">
            <button className={`btn ${state.notify[card.id] ? 'on' : ''}`} onClick={() => dispatch({ type: 'notify', id: card.id })} aria-pressed={!!state.notify[card.id]}>
              <Icon name="bell" size={15} /> {state.notify[card.id] ? 'You’ll be pinged when he saves' : 'Ping me when he saves'}
            </button>
            <span className="hint">Or leave Jun a note in the thread on the right.</span>
          </div>
        </div>
      )}
      {!locked && deckLive && card.deck === 'market' && (
        <div className="softnote"><Avatar id="jun" size={18} live /> Jun is in this deck, on {deckLive.name}. This card is free to edit.</div>
      )}

      <div className="fields">
        {card.cost !== null && (
          <div className="field field-cost">
            <label htmlFor="cost">Cost</label>
            <div className="stepper">
              <button type="button" disabled={locked || (cost ?? 0) <= 0} onClick={() => dispatch({ type: 'draft', id: card.id, patch: { cost: Math.max(0, (cost ?? 0) - 1) } })} aria-label="Decrease cost">&minus;</button>
              <input id="cost" type="number" min={0} max={20} value={cost ?? 0} disabled={locked} onChange={(e) => dispatch({ type: 'draft', id: card.id, patch: { cost: Math.max(0, Math.min(20, Number(e.target.value) || 0)) } })} />
              <button type="button" disabled={locked || (cost ?? 0) >= 20} onClick={() => dispatch({ type: 'draft', id: card.id, patch: { cost: (cost ?? 0) + 1 } })} aria-label="Increase cost">+</button>
            </div>
            <span className="hint">{card.deck === 'contracts' ? 'Fee to take the Contract' : card.deck === 'market' ? 'Paid when played' : 'Gold coins'}</span>
          </div>
        )}
        <div className="field">
          <div className="field-head"><label htmlFor="effect">Effect text</label><Meter value={eff.length} max={EFFECT_MAX} /></div>
          <textarea id="effect" rows={4} value={eff} disabled={locked} onChange={(e) => dispatch({ type: 'draft', id: card.id, patch: { effect: e.target.value } })} />
        </div>
        <div className="field">
          <div className="field-head"><label htmlFor="flavor">Flavor text</label><Meter value={flv.length} max={FLAVOR_MAX} /></div>
          <textarea id="flavor" rows={2} value={flv} disabled={locked} onChange={(e) => dispatch({ type: 'draft', id: card.id, patch: { flavor: e.target.value } })} />
        </div>
      </div>

      {mentions.length > 0 && (
        <div className="mentions">
          <div className="label">Named in the rulebook</div>
          <div className="mention-links">
            {mentions.map((r) => <button key={r.id} className="link" onClick={() => dispatch({ type: 'openRule', id: r.id })}>Rule {r.id} {r.title} <Icon name="arrow" size={13} /></button>)}
          </div>
        </div>
      )}

      {dirty && !locked && (
        <div className="yourchanges">
          <div className="label">Your changes from v{card.version}</div>
          {draft.cost !== undefined && <p>Cost <del>{card.cost}</del> <ins>{draft.cost}</ins></p>}
          {draft.effect !== undefined && <p><Diff a={card.effect} b={draft.effect} /></p>}
          {draft.flavor !== undefined && <p className="italic"><Diff a={card.flavor} b={draft.flavor} /></p>}
        </div>
      )}

      <footer className="editor-foot">
        <span className="muted">Last saved by <strong>{PEOPLE[card.editor].short}</strong> &middot; {when(card.edited, nowV())}</span>
        <span className="spacer" />
        <button className="btn ghost" disabled={!dirty} onClick={() => dispatch({ type: 'discard', id: card.id })}>Discard</button>
        <button className="btn primary" disabled={!dirty || locked} onClick={() => dispatch({ type: 'save', id: card.id })}>Save as v{card.version + 1} <kbd>{'⌘'}S</kbd></button>
      </footer>
    </section>
  );
}

function CardAside({ card }: { card: Card }) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'notes' | 'history'>('notes');
  const draft = state.drafts[card.id] ?? {};
  const face = { ...card, ...draft, cost: draft.cost !== undefined ? draft.cost : card.cost };
  const notes = commentsFor(state, 'card', card.id);
  const open = notes.filter((n) => n.status === 'open');
  const hist = changesFor(state, card.id);
  return (
    <aside className="aside" aria-label="Card preview and discussion">
      <div className="preview"><CardFace card={face} /></div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'notes'} className={tab === 'notes' ? 'on' : ''} onClick={() => setTab('notes')}>Notes {open.length > 0 && <span className="tab-n attn">{open.length}</span>}</button>
        <button role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>History <span className="tab-n">{hist.length}</span></button>
      </div>
      <div className="aside-body">
        {tab === 'notes' ? (
          <>
            {notes.length === 0 && <p className="empty small">No notes on this card yet.</p>}
            {notes.map((n) => <Thread key={n.id} comment={n} compact />)}
            <details className="addnote">
              <summary>{card.live ? 'Leave a note for Jun' : 'Add a note'}</summary>
              <ReplyBox rows={2} placeholder={card.live ? '@Jun, can the effect mention “every player”?' : 'Write a note on this card…'} onSend={(text) => dispatch({ type: 'addComment', anchor: { kind: 'card', id: card.id }, text })} />
            </details>
          </>
        ) : (
          <>
            {hist.length === 0 && <p className="empty small">No changes since Saturday&rsquo;s playtest. Last edit was {dateShort(card.edited)} by {PEOPLE[card.editor].short}.</p>}
            {hist.map((h) => (
              <div key={h.id} className="hist">
                <div className="hist-head">
                  <Avatar id={h.by} size={20} />
                  <strong>{PEOPLE[h.by].short}</strong>
                  <span className="muted">{h.field} &middot; v{h.vFrom} &rarr; v{h.vTo} &middot; {when(h.at, nowV())}</span>
                </div>
                <p className={h.field === 'flavor' ? 'italic' : ''}>{h.field === 'cost' ? <>Cost <del>{h.before}</del> <ins>{h.after}</ins></> : <Diff a={h.before} b={h.after} />}</p>
                {h.note && <span className="muted small">{h.note}</span>}
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

export function CardsView() {
  const { state } = useApp();
  const card = state.cards[state.cardId];
  return (
    <div className="view cards-view">
      <DeckTabs />
      <DeckStrip deck={state.deck} />
      <div className="cards-grid">
        <CardList deck={state.deck} />
        {card && <CardEditor key={card.id} card={card} />}
        {card && <CardAside card={card} />}
      </div>
    </div>
  );
}
