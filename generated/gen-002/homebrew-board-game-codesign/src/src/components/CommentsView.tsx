import { useEffect, useMemo, useState } from 'react';
import type { Comment } from '../types';
import { DECK_META } from '../data/cards';
import { PEOPLE } from '../data/people';
import { useApp, openComments } from '../store';
import { clock, nowV, when } from '../lib/time';
import { Avatar, CardFace, DeckDot, Diff, Icon } from './ui';
import { Bubble, ReplyBox } from './Thread';

const QUICK = ['Good catch, fixing it.', 'Fixed in the next version.', 'Jun changed this, take a look.', 'Keeping it as is, because', 'Can you try it at your next session?'];

function anchorLabel(c: Comment, s: ReturnType<typeof useApp>['state']) {
  if (c.anchor.kind === 'card') {
    const card = s.cards[c.anchor.id];
    return { deck: card.deck, text: `${DECK_META[card.deck].label} · ${card.name}` };
  }
  const r = s.rules[c.anchor.id];
  return { deck: null, text: `Rule ${r.id} · ${r.title}` };
}

export function CommentsView() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [kind, setKind] = useState<'all' | 'card' | 'rule'>('all');

  const open = openComments(state);
  const resolved = state.comments.filter((c) => c.status === 'resolved');
  const base = tab === 'open' ? open : resolved;
  const list = useMemo(
    () => base.filter((c) => kind === 'all' || c.anchor.kind === kind).sort((a, b) => (tab === 'open' ? a.at.getTime() - b.at.getTime() : b.at.getTime() - a.at.getTime())),
    [base, kind, tab],
  );
  const selected = state.comments.find((c) => c.id === state.commentId) ?? list[0];

  // keep the detail pane in step with the visible tab
  useEffect(() => {
    if (selected && !list.some((c) => c.id === selected.id) && list[0]) dispatch({ type: 'openComment', id: list[0].id });
  }, [tab, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextAfter = (id: string) => {
    const i = list.findIndex((c) => c.id === id);
    const nxt = list[i + 1] ?? list[i - 1];
    if (nxt) dispatch({ type: 'openComment', id: nxt.id });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') return;
      if (!selected) return;
      const i = list.findIndex((c) => c.id === selected.id);
      if (e.key === 'j' && list[i + 1]) dispatch({ type: 'openComment', id: list[i + 1].id });
      if (e.key === 'k' && list[i - 1]) dispatch({ type: 'openComment', id: list[i - 1].id });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list, selected, dispatch]);

  const sam = open.filter((c) => c.author === 'sam').length;

  return (
    <div className="view comments-view">
      <div className="page-head">
        <div>
          <h1>Comments</h1>
          <p className="sub"><strong>{open.length} open</strong>{sam ? <> &middot; {sam} from Sam, left overnight</> : null}. Playtesters can comment but not edit, so your replies are how they hear back.</p>
        </div>
        <span className="hint kbd-hint"><kbd>J</kbd> <kbd>K</kbd> to move between comments</span>
      </div>

      <div className="comments-grid">
        <section className="panel inbox" aria-label="Comment list">
          <div className="inbox-top">
            <div className="tabs flat" role="tablist">
              <button role="tab" aria-selected={tab === 'open'} className={tab === 'open' ? 'on' : ''} onClick={() => setTab('open')}>Open <span className="tab-n attn">{open.length}</span></button>
              <button role="tab" aria-selected={tab === 'resolved'} className={tab === 'resolved' ? 'on' : ''} onClick={() => setTab('resolved')}>Resolved <span className="tab-n">{resolved.length}</span></button>
            </div>
            <div className="seg" role="group" aria-label="Filter by what it&rsquo;s attached to">
              {([['all', 'All'], ['card', 'Cards'], ['rule', 'Rules']] as const).map(([k, l]) => (
                <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>
              ))}
            </div>
          </div>
          <ul className="inbox-list">
            {list.map((c) => {
              const a = anchorLabel(c, state);
              return (
                <li key={c.id}>
                  <button className={`inbox-item ${selected?.id === c.id ? 'selected' : ''}`} onClick={() => dispatch({ type: 'openComment', id: c.id })} aria-current={selected?.id === c.id}>
                    <Avatar id={c.author} size={28} />
                    <span className="inbox-body">
                      <span className="inbox-meta"><strong>{PEOPLE[c.author].short}</strong><span className="muted">{when(c.at, nowV())}</span></span>
                      <span className="anchor-chip">{a.deck && <DeckDot deck={a.deck} />}{a.text}</span>
                      <span className="inbox-text">{c.text}</span>
                      {c.replies.length > 0 && <span className="muted small">{c.replies.length} {c.replies.length === 1 ? 'reply' : 'replies'}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
            {list.length === 0 && (
              <li className="empty big">
                {tab === 'open' ? <><Icon name="check" size={22} /><strong>All caught up.</strong><span>Sam will get a ping for each reply.</span></> : 'Nothing resolved yet.'}
              </li>
            )}
          </ul>
        </section>

        <section className="panel detail" aria-label="Selected comment">
          {selected ? <Detail key={selected.id} c={selected} onDone={() => nextAfter(selected.id)} /> : <div className="empty big">Select a comment to answer it.</div>}
        </section>
      </div>
    </div>
  );
}

function Detail({ c, onDone }: { c: Comment; onDone: () => void }) {
  const { state, dispatch } = useApp();
  const a = anchorLabel(c, state);
  const card = c.anchor.kind === 'card' ? state.cards[c.anchor.id] : null;
  const rule = c.anchor.kind === 'rule' ? state.rules[c.anchor.id] : null;
  const related = state.changes.filter((x) => x.target === c.anchor.id && x.kind === c.anchor.kind);
  const resolved = c.status === 'resolved';
  const sg = state.suggestion;
  const ruleSuggestion = rule && sg.ruleId === rule.id && sg.status === 'pending';
  return (
    <>
      <header className="detail-head">
        <div>
          <div className="eyebrow">{a.deck && <DeckDot deck={a.deck} />} {c.anchor.kind === 'card' ? 'On a card' : 'On the rulebook'}</div>
          <h2>{card ? card.name : `${rule!.id} ${rule!.title}`}</h2>
        </div>
        <button className="btn" onClick={() => (card ? dispatch({ type: 'openCard', id: card.id }) : dispatch({ type: 'openRule', id: rule!.id }))}>
          Open {card ? 'card' : 'rule'} <Icon name="arrow" size={15} />
        </button>
      </header>

      <div className="detail-body">
        <div className="context">
          {card && (
            <div className="context-card">
              <div className="context-face"><CardFace card={{ ...card, ...(state.drafts[card.id] ?? {}), cost: state.drafts[card.id]?.cost !== undefined ? state.drafts[card.id]!.cost! : card.cost }} mini /></div>
              <div className="context-notes">
                <div className="label">Where it stands</div>
                <p>v{card.version}, last saved by <strong>{PEOPLE[card.editor].short}</strong> {when(card.edited, nowV())}.</p>
                {state.drafts[card.id] && <p className="status warn inline"><span className="dot" /> You have an unsaved draft of this card.</p>}
                {card.live && <p className="status lock inline"><Icon name="lock" size={13} /> Jun is editing it right now.</p>}
                {related.slice(0, 2).map((r) => (
                  <div key={r.id} className="related">
                    <span className="muted small">{PEOPLE[r.by].short} changed {r.field} at {clock(r.at)}</span>
                    <div className="related-diff">{r.field === 'cost' ? <>Cost <del>{r.before}</del> <ins>{r.after}</ins></> : <Diff a={r.before} b={r.after} />}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {rule && (
            <div className="context-rule">
              <div className="label">Rule {rule.id} as it reads now</div>
              <p>{rule.text.split('\n\n')[0].slice(0, 360)}{rule.text.length > 360 ? '…' : ''}</p>
              {related.slice(0, 1).map((r) => <span key={r.id} className="muted small">{PEOPLE[r.by].short} edited this at {clock(r.at)}.</span>)}
              {ruleSuggestion && (
                <button className="callout live as-btn" onClick={() => dispatch({ type: 'openRule', id: rule.id })}>
                  <Avatar id="jun" size={20} />
                  <span><strong>Jun has suggested a rewrite</strong> that may answer this. Review it first.</span>
                  <Icon name="arrow" size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="thread-big">
          <Bubble by={c.author} at={c.at} text={c.text} />
          {c.replies.map((r, i) => <Bubble key={i} by={r.by} at={r.at} text={r.text} />)}
        </div>
      </div>

      <footer className="detail-foot">
        {resolved ? (
          <div className="thread-foot"><span className="status ok"><Icon name="check" size={14} /> Resolved</span><button className="link" onClick={() => dispatch({ type: 'setResolved', commentId: c.id, resolved: false })}>Reopen</button></div>
        ) : (
          <ReplyBox
            quick={QUICK}
            onSend={(text, resolve) => { dispatch({ type: 'reply', commentId: c.id, text, resolve }); if (resolve) onDone(); }}
            onResolveOnly={() => { dispatch({ type: 'setResolved', commentId: c.id, resolved: true }); onDone(); }}
          />
        )}
      </footer>
    </>
  );
}
