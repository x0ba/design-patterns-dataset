import { useEffect, useRef, useState } from 'react';
import type { Rule } from '../types';
import { PEOPLE } from '../data/people';
import { useApp, readiness, commentsFor } from '../store';
import { clock, nowV } from '../lib/time';
import { wordCount } from '../lib/diff';
import { Avatar, Diff, Icon } from './ui';
import { RuleText } from './RuleText';
import { Thread } from './Thread';

function SuggestionBox({ rule }: { rule: Rule }) {
  const { state, dispatch } = useApp();
  const sg = state.suggestion;
  const [mode, setMode] = useState<'tracked' | 'clean'>('tracked');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const samOpen = state.comments.filter((c) => c.status === 'open' && c.author === 'sam' && c.anchor.kind === 'rule' && c.anchor.id === rule.id);
  const [alsoAnswer, setAlsoAnswer] = useState(true);

  if (sg.status === 'accepted')
    return <div className="sg-done ok"><Icon name="check" size={16} /> <span>You accepted <strong>Jun&rsquo;s rewrite</strong>. It&rsquo;s the text of rule {rule.id} now.</span></div>;
  if (sg.status === 'rejected')
    return (
      <div className="sg-done no">
        <Icon name="x" size={16} />
        <span>You rejected <strong>Jun&rsquo;s rewrite</strong>{sg.note ? <>: &ldquo;{sg.note}&rdquo;</> : '.'}</span>
        <button className="link" onClick={() => dispatch({ type: 'reopenSuggestion' })}>Reopen</button>
      </div>
    );
  return (
    <div className="suggestion" id="suggestion">
      <header>
        <Avatar id="jun" size={28} />
        <div>
          <strong>Jun suggests a rewrite of this rule</strong>
          <span className="muted"> &middot; today at {clock(sg.at)}</span>
        </div>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="View">
          <button className={mode === 'tracked' ? 'on' : ''} onClick={() => setMode('tracked')}>Tracked changes</button>
          <button className={mode === 'clean' ? 'on' : ''} onClick={() => setMode('clean')}>Clean</button>
        </div>
      </header>
      <blockquote>{sg.rationale}</blockquote>
      <div className="suggestion-text">
        {mode === 'tracked' ? <Diff className="prewrap" a={rule.text} b={sg.proposed} /> : <RuleText text={sg.proposed} />}
      </div>
      {!rejecting ? (
        <div className="suggestion-actions">
          {samOpen.length > 0 && (
            <label className="toggle"><input type="checkbox" checked={alsoAnswer} onChange={(e) => setAlsoAnswer(e.target.checked)} /> Also answer Sam&rsquo;s question on {rule.id}</label>
          )}
          <span className="spacer" />
          <button className="btn" onClick={() => setRejecting(true)}><Icon name="x" size={15} /> Reject</button>
          <button className="btn primary" onClick={() => dispatch({ type: 'accept', resolveSam: alsoAnswer && samOpen.length > 0 })}><Icon name="check" size={15} /> Accept rewrite</button>
        </div>
      ) : (
        <div className="reject-box">
          <label htmlFor="why">Tell Jun why (optional)</label>
          <textarea id="why" rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The steps are clearer, but keep the berth count sentence where it was." />
          <div className="suggestion-actions">
            <span className="spacer" />
            <button className="btn ghost" onClick={() => setRejecting(false)}>Back</button>
            <button className="btn danger" onClick={() => { dispatch({ type: 'reject', note: reason.trim() }); setRejecting(false); }}>Reject rewrite</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RuleBlock({ rule, selected }: { rule: Rule; selected: boolean }) {
  const { state, dispatch } = useApp();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(rule.text);
  const cms = commentsFor(state, 'rule', rule.id).filter((c) => c.status === 'open').length;
  const last = state.changes.find((c) => c.kind === 'rule' && c.target === rule.id);
  const hasSg = state.suggestion.ruleId === rule.id;
  return (
    <section id={`rule-${rule.id}`} className={`rule ${selected ? 'selected' : ''}`} onClick={() => !selected && dispatch({ type: 'selectRule', id: rule.id })}>
      <header>
        <span className="rule-id">{rule.id}</span>
        <h3>{rule.title}</h3>
        <span className="rule-tags">
          {hasSg && state.suggestion.status === 'pending' && <span className="badge sg">Suggestion</span>}
          {last && <span className="badge by" style={{ ['--p' as string]: PEOPLE[last.by].color }} title={last.note ?? 'Edited'}>{PEOPLE[last.by].short} {clock(last.at)}</span>}
          {cms > 0 && <span className="badge note"><Icon name="comment" size={12} />{cms}</span>}
        </span>
        {!editing && <button className="icon-btn" aria-label={`Edit rule ${rule.id}`} onClick={(e) => { e.stopPropagation(); setText(rule.text); setEditing(true); dispatch({ type: 'selectRule', id: rule.id }); }}><Icon name="pencil" size={15} /></button>}
      </header>
      {hasSg && <SuggestionBox rule={rule} />}
      {editing ? (
        <div className="rule-edit">
          <textarea value={text} rows={Math.min(18, Math.max(6, text.split('\n').length + 3))} onChange={(e) => setText(e.target.value)} aria-label={`Text of rule ${rule.id}`} autoFocus />
          <div className="suggestion-actions">
            <span className="hint">{wordCount(text)} words &middot; blank line = new paragraph, &ldquo;- &rdquo; = bullet, &ldquo;1. &rdquo; = step</span>
            <span className="spacer" />
            <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn primary" disabled={text.trim() === rule.text.trim()} onClick={() => { dispatch({ type: 'saveRule', id: rule.id, text: text.trim() }); setEditing(false); }}>Save rule</button>
          </div>
        </div>
      ) : (
        <div className="rule-text"><RuleText text={rule.text} /></div>
      )}
    </section>
  );
}

export function RulebookView() {
  const { state, dispatch } = useApp();
  const docRef = useRef<HTMLDivElement>(null);
  const r = readiness(state);
  const total = r.words;
  const pages = Math.ceil(total / 650) + 1;

  useEffect(() => {
    const el = docRef.current?.querySelector(`#rule-${CSS.escape(state.ruleId)}`) as HTMLElement | null;
    if (el && docRef.current) docRef.current.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
  }, [state.ruleId, state.view]);

  const selected = state.rules[state.ruleId];
  const notes = commentsFor(state, 'rule', state.ruleId);
  const goRule = (id: string) => dispatch({ type: 'openRule', id });

  const ready = r.blockers === 0;
  const warnings = (r.term.length > 0 ? 1 : 0) + (r.ruleComments.length > 0 ? 1 : 0);

  return (
    <div className="view rulebook-view">
      <nav className="outline panel" aria-label="Rulebook outline">
        <div className="outline-head"><h2>Rulebook</h2><span className="muted">v0.7 &middot; {total.toLocaleString()} words</span></div>
        <div className="outline-scroll">
          {state.sections.map((s) => (
            <div key={s.num} className="outline-sec">
              <div className="outline-title"><span>{s.num}</span>{s.title}</div>
              {s.rules.map((id) => {
                const rule = state.rules[id];
                const cm = commentsFor(state, 'rule', id).filter((c) => c.status === 'open').length;
                const sgp = state.suggestion.ruleId === id && state.suggestion.status === 'pending';
                const todo = /\[TODO/.test(rule.text);
                return (
                  <button key={id} className={`outline-rule ${state.ruleId === id ? 'on' : ''}`} onClick={() => goRule(id)}>
                    <span className="outline-id">{id}</span>
                    <span className="outline-name">{rule.title}</span>
                    {sgp && <span className="mini-dot sg" title="Suggestion pending" />}
                    {todo && <span className="mini-dot todo" title="TODO marker" />}
                    {cm > 0 && <span className="mini-n">{cm}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="doc" ref={docRef}>
        <div className="doc-inner">
          <div className="doc-title">
            <div className="eyebrow">Saltwind Exchange</div>
            <h1>Rulebook</h1>
            <p className="muted">Version 0.7 &middot; {state.sections.length} sections &middot; {total.toLocaleString()} words &middot; 2&ndash;5 players</p>
          </div>
          {state.sections.map((s) => (
            <div key={s.num} className="doc-section">
              <h2><span>{s.num}</span>{s.title}</h2>
              {s.rules.map((id) => <RuleBlock key={id} rule={state.rules[id]} selected={state.ruleId === id} />)}
            </div>
          ))}
        </div>
      </div>

      <aside className="rb-aside" aria-label="Print readiness and notes">
        <div className={`panel ready ${ready ? 'is-ready' : ''}`}>
          <div className="ready-head">
            <span className={`ready-badge ${ready ? 'ok' : 'blocked'}`}>{ready ? <Icon name="check" size={18} /> : r.blockers}</span>
            <div>
              <h3>{ready ? 'Ready to print' : `${r.blockers} ${r.blockers === 1 ? 'thing' : 'things'} to settle before printing`}</h3>
              <span className="muted">{ready ? (warnings ? `${warnings} smaller ${warnings === 1 ? 'thing is' : 'things are'} worth a look.` : 'Nothing left to check.') : 'Everything else can wait for the next version.'}</span>
            </div>
          </div>
          <ul className="checks">
            <li className={r.suggestionPending ? 'bad' : 'good'}>
              <span className="check-ico">{r.suggestionPending ? <Icon name="x" size={14} /> : <Icon name="check" size={14} />}</span>
              <div>
                <strong>{r.suggestionPending ? 'Jun’s rewrite of 4.2 needs a decision' : `Rule 4.2 ${state.suggestion.status === 'accepted' ? 'rewrite accepted' : 'rewrite rejected'}`}</strong>
                {r.suggestionPending && <button className="link" onClick={() => goRule('4.2')}>Review it</button>}
              </div>
            </li>
            <li className={r.todo.length ? 'bad' : 'good'}>
              <span className="check-ico">{r.todo.length ? <Icon name="x" size={14} /> : <Icon name="check" size={14} />}</span>
              <div>
                <strong>{r.todo.length ? `${r.todo.length} TODO ${r.todo.length === 1 ? 'marker' : 'markers'} left` : 'No TODO markers left'}</strong>
                {r.todo.map((id) => <button key={id} className="link" onClick={() => goRule(id)}>Rule {id}</button>)}
              </div>
            </li>
            <li className={r.term.length ? 'warn' : 'good'}>
              <span className="check-ico">{r.term.length ? <Icon name="warn" size={13} /> : <Icon name="check" size={14} />}</span>
              <div>
                <strong>{r.term.length ? `“Moor” still appears in ${r.term.length} ${r.term.length === 1 ? 'place' : 'places'}` : 'One word for docking everywhere'}</strong>
                {r.term.length > 0 && <span className="muted small">The rest of the book says &ldquo;dock&rdquo;.</span>}
                <div className="check-links">
                  {r.term.map((t) => (
                    <button key={t.kind + t.id} className="link" onClick={() => (t.kind === 'rule' ? goRule(t.id) : dispatch({ type: 'openCard', id: t.id }))}>{t.label}</button>
                  ))}
                </div>
              </div>
            </li>
            <li className={r.ruleComments.length ? 'warn' : 'good'}>
              <span className="check-ico">{r.ruleComments.length ? <Icon name="warn" size={13} /> : <Icon name="check" size={14} />}</span>
              <div>
                <strong>{r.ruleComments.length ? `${r.ruleComments.length} open comments on rules` : 'No open comments on rules'}</strong>
                {r.ruleComments.length > 0 && (
                  <div className="check-links">
                    {r.ruleComments.map((c) => <button key={c.id} className="link" onClick={() => goRule(c.anchor.id)}>{c.anchor.id}</button>)}
                    <button className="link" onClick={() => dispatch({ type: 'openComment', id: r.ruleComments[0].id })}>Answer them</button>
                  </div>
                )}
              </div>
            </li>
            <li className="info">
              <span className="check-ico"><Icon name="dot" size={14} /></span>
              <div><strong>{total.toLocaleString()} words, about {pages} pages</strong><span className="muted small">Letter, two columns, with a cover and contents</span></div>
            </li>
          </ul>
          <button className={`btn ${ready ? 'primary' : ''} wide`} onClick={() => dispatch({ type: 'print', open: true })}><Icon name="print" size={16} /> {ready ? 'Preview and print' : 'Preview a draft'}</button>
        </div>

        <div className="panel notes-panel">
          <h3>Notes on rule {selected.id} <span className="muted">{selected.title}</span></h3>
          {notes.length === 0 && <p className="empty small">No comments on this rule.</p>}
          {notes.map((n) => <Thread key={n.id} comment={n} compact />)}
        </div>
      </aside>
    </div>
  );
}
