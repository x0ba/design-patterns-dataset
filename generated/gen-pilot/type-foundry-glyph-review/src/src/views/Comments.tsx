import { useState } from 'react';
import { PEOPLE, fullStamp, rel, styleById } from '../data/core';
import { glyphByChar } from '../data/glyphs';
import { REVISIONS } from '../data/revisions';
import { useGo, useStore, useToast } from '../store';
import { Avatar, Icon, Seg, Spec } from '../components/ui';
import { GlyphCanvas } from '../components/GlyphCanvas';

type F = 'mine' | 'open' | 'resolved';

export function Comments() {
  const { s, dispatch } = useStore();
  const go = useGo();
  const toast = useToast();
  const [f, setF] = useState<F>(() => (s.route.id ? 'open' : 'mine'));
  const [text, setText] = useState('');

  const open = s.threads.filter((t) => !t.resolved);
  const mine = open.filter((t) => t.to === 'ines');
  const resolved = s.threads.filter((t) => t.resolved);
  const list = (f === 'mine' ? mine : f === 'open' ? open : resolved).slice().sort((a, b) => {
    if (f === 'mine') return a.messages[0].at - b.messages[0].at; // oldest first: what's been waiting longest
    return b.messages[b.messages.length - 1].at - a.messages[a.messages.length - 1].at;
  });
  const th = s.threads.find((t) => t.id === s.route.id) ?? list[0];
  const rev = th?.ch ? REVISIONS.find((r) => r.ch === th.ch && r.style === th.style) : undefined;
  const g = th?.ch ? glyphByChar(th.ch) : undefined;

  const send = (resolve: boolean) => {
    if (!th) return;
    if (text.trim()) dispatch({ type: 'reply', threadId: th.id, text: text.trim() });
    if (resolve) {
      dispatch({ type: 'resolve', threadId: th.id, resolved: true });
      toast(`“${th.subject}” resolved`, { type: 'resolve', threadId: th.id, resolved: false });
    } else {
      const who = th.messages[0].author === 'ines' ? th.to : th.messages[0].author;
      toast(who && who !== 'ines' ? `Reply sent to ${PEOPLE[who].first}` : 'Reply posted');
    }
    setText('');
  };

  return (
    <div className="comments">
      <aside className="c-list">
        <div className="rl-head">
          <div><h2>Comments</h2><div className="sub">{open.length} open · {mine.length} addressed to you</div></div>
        </div>
        <div className="c-filter">
          <Seg small value={f} onChange={setF} options={[
            { value: 'mine', label: <>For you <span className="c">{mine.length}</span></> },
            { value: 'open', label: <>All open <span className="c">{open.length}</span></> },
            { value: 'resolved', label: <>Resolved <span className="c">{resolved.length}</span></> },
          ]} />
        </div>
        <div className="rl-scroll">
          {list.map((t) => {
            const first = t.messages[0];
            const last = t.messages[t.messages.length - 1];
            const age = s.now - first.at;
            return (
              <button key={t.id} className={`c-item ${th?.id === t.id ? 'on' : ''}`} onClick={() => { dispatch({ type: 'go', route: { view: 'comments', id: t.id } }); setText(''); }}>
                {t.ch ? <Spec ch={t.ch} style={t.style} size={26} className="c-glyph" /> : <span className="c-glyph" />}
                <span className="c-body">
                  <span className="c-subject">{t.subject}</span>
                  <span className="c-meta">
                    {styleById(t.style).name} · {PEOPLE[first.author].first} → {t.to ? (t.to === 'ines' ? 'you' : PEOPLE[t.to].first) : 'everyone'}
                  </span>
                  <span className="c-snippet">{last.text}</span>
                </span>
                <span className={`age ${age > 3 * 1440 && !t.resolved ? 'old' : ''}`}>{rel(first.at, s.now)}</span>
              </button>
            );
          })}
          {list.length === 0 && <p className="empty pad">{f === 'mine' ? 'Nothing waiting on you.' : 'Nothing here.'}</p>}
        </div>
      </aside>

      {th ? (
        <section className="c-thread">
          <div className="ct-head">
            <div>
              <div className="eyebrow">{styleById(th.style).name}{g ? ` · ${g.name}` : ''} · {th.to ? `to ${th.to === 'ines' ? 'you' : PEOPLE[th.to].name}` : 'to everyone'}</div>
              <h1>{th.subject}</h1>
            </div>
            {th.resolved
              ? <button className="btn" onClick={() => dispatch({ type: 'resolve', threadId: th.id, resolved: false })}>Reopen</button>
              : <button className="btn" onClick={() => send(true)}><Icon.check /> Resolve</button>}
          </div>
          <div className="ct-body">
            <div className="ct-messages">
              {th.messages.map((m) => (
                <div key={m.id} className={`msg ${m.author === 'ines' ? 'me' : ''}`}>
                  <Avatar id={m.author} size={28} />
                  <div className="msg-body">
                    <div className="msg-meta"><b>{m.author === 'ines' ? 'You' : PEOPLE[m.author].name}</b> <span>{fullStamp(m.at)} · {rel(m.at, s.now)}</span></div>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {!th.resolved && (
                <div className="reply">
                  <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply…"
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) send(false); }} />
                  <div className="reply-actions">
                    <span className="sub">⌘↵ to send</span>
                    <button className="btn" disabled={!text.trim()} onClick={() => send(true)}>Reply & resolve</button>
                    <button className="btn primary" disabled={!text.trim()} onClick={() => send(false)}>Reply</button>
                  </div>
                </div>
              )}
            </div>
            {th.ch && g && (
              <div className="ct-glyph">
                <GlyphCanvas key={th.id} style={th.style} ch={th.ch} mode="now" height={300} points={false} />
                <div className="ct-glyph-actions">
                  {rev && <button className="btn block" onClick={() => go('review', rev.id)}>Compare with Tuesday <Icon.arrow /></button>}
                  <button className="btn ghost block" onClick={() => go('glyphs', th.style)}>Open {styleById(th.style).name} glyphs</button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : <section className="c-thread empty-state">Select a thread.</section>}
    </div>
  );
}
