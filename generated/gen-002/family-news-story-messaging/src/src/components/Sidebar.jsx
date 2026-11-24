import { useMemo, useRef, useEffect } from 'react';
import { Search, Mic, MessageCircle, Lock, X, Hourglass } from 'lucide-react';
import { Logo, Avatar, Monogram, highlight } from './bits.jsx';
import { PEOPLE, SPACES, ME, pendingAsks } from '../data.js';
import { TZ, now, agoShort, fmtShortDate, monthLabel, dayDiff } from '../time.js';

export const lastActivity = (a) => a.msgs.reduce((mx, m) => Math.max(mx, m.at), a.at);
export const unreadOf = (a) => a.msgs.filter((m) => m.unread).length;

function sectionOf(a) {
  const ms = lastActivity(a);
  const d = dayDiff(now(), ms, TZ.N);
  if (d <= 2) return 'Last few days';
  if (d <= 7) return 'This week';
  return monthLabel(ms, TZ.N);
}

function snippetFor(a, q) {
  const ql = q.toLowerCase();
  if (a.title.toLowerCase().includes(ql)) return null;
  const m = a.msgs.find((x) => (x.text || '').toLowerCase().includes(ql) || (x.transcript || '').toLowerCase().includes(ql));
  if (m) {
    const s = m.type === 'voice' ? m.transcript : m.text;
    const i = s.toLowerCase().indexOf(ql);
    const from = Math.max(0, i - 28);
    return { who: m.who, text: (from > 0 ? '…' : '') + s.slice(from, i + 60), voice: m.type === 'voice' };
  }
  return null;
}

export default function Sidebar({ articles, space, setSpace, selectedId, onSelect, query, setQuery, filter, setFilter, from, setFrom, when, setWhen, searchRef }) {
  const inSpace = articles.filter((a) => a.space === space);
  const unreadBySpace = (sp) => articles.filter((a) => a.space === sp).reduce((n, a) => n + unreadOf(a), 0);
  const unreadTotal = unreadBySpace(space);
  const waiting = (a) => {
    return a.space === 'haddads' && pendingAsks(a).length > 0;
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inSpace
      .filter((a) => {
        if (filter === 'unread' && unreadOf(a) === 0) return false;
        if (filter === 'voice' && !a.msgs.some((m) => m.type === 'voice')) return false;
        if (filter === 'waiting' && !waiting(a)) return false;
        if (from !== 'any' && a.sender !== from) return false;
        if (when !== 'any' && monthLabel(a.at, TZ.N) !== when) return false;
        if (q) {
          const hay = [a.title, a.outlet, a.dek, PEOPLE[a.sender].name, ...a.msgs.map((m) => (m.text || '') + ' ' + (m.transcript || '') + ' ' + (m.link?.title || ''))].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((x, y) => lastActivity(y) - lastActivity(x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, space, query, filter, from, when]);

  const grouped = [];
  for (const a of list) {
    const s = sectionOf(a);
    if (!grouped.length || grouped[grouped.length - 1].label !== s) grouped.push({ label: s, items: [] });
    grouped[grouped.length - 1].items.push(a);
  }
  const first = inSpace.reduce((mn, a) => Math.min(mn, a.at), Infinity);
  const filtering = query || filter !== 'all' || from !== 'any' || when !== 'any';
  const selRef = useRef(null);
  useEffect(() => { selRef.current?.scrollIntoView({ block: 'nearest' }); }, [selectedId, space]);

  return (
    <aside className="side" aria-label="Stories">
      <div className="side-top">
        <Logo />
        <div className="me" title="Signed in as Nadia Haddad (Columbus, ET)">
          <Avatar id="N" size={30} />
          <span>Nadia</span>
        </div>
      </div>

      <div className="spaces" role="tablist" aria-label="Conversations">
        {Object.values(SPACES).map((sp) => {
          const u = unreadBySpace(sp.id);
          return (
            <button key={sp.id} role="tab" aria-selected={space === sp.id} className={'space' + (space === sp.id ? ' on' : '')} onClick={() => setSpace(sp.id)}>
              <span className="space-name">{sp.private && <Lock size={13} aria-hidden="true" />}{sp.name}</span>
              <span className="space-sub">{sp.private ? 'Private with Karim' : '3 members'}</span>
              {u > 0 && <span className="pill" aria-label={`${u} unread`}>{u}</span>}
            </button>
          );
        })}
      </div>

      <div className="search">
        <Search size={16} aria-hidden="true" />
        <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories and messages" aria-label="Search stories and messages" />
        {query ? <button className="icon-btn sm" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button> : <kbd>/</kbd>}
      </div>

      <div className="chips" role="group" aria-label="Filter stories">
        {[
          ['all', 'All'],
          ['unread', `Unread${unreadTotal ? ' ' + unreadTotal : ''}`],
          ['voice', 'Voice'],
          ...(space === 'haddads' ? [['waiting', 'Waiting on you']] : []),
        ].map(([k, label]) => (
          <button key={k} className={'chip' + (filter === k ? ' on' : '')} aria-pressed={filter === k} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>
      <div className="selects">
        <label>
          <span>Shared by</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="any">Anyone</option>
            {SPACES[space].members.map((p) => <option key={p} value={p}>{p === ME ? 'Me' : PEOPLE[p].first}</option>)}
          </select>
        </label>
        <label>
          <span>When</span>
          <select value={when} onChange={(e) => setWhen(e.target.value)}>
            <option value="any">Any time</option>
            {['November', 'October', 'September', 'August'].map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
      </div>

      <div className="list" role="list">
        {grouped.map((g) => (
          <section key={g.label}>
            <h3 className="list-h">{g.label}</h3>
            {g.items.map((a) => {
              const u = unreadOf(a);
              const sel = a.id === selectedId;
              const snip = query ? snippetFor(a, query.trim()) : null;
              const voice = a.msgs.some((m) => m.type === 'voice');
              return (
                <button key={a.id} ref={sel ? selRef : null} role="listitem" className={'row' + (sel ? ' sel' : '') + (u ? ' unread' : '')} onClick={() => onSelect(a.id)} aria-current={sel ? 'true' : undefined}>
                  <Monogram outlet={a.outlet} />
                  <span className="row-main">
                    <span className="row-title">{highlight(a.title, query.trim())}</span>
                    <span className="row-meta">{highlight(a.outlet, query.trim())} · {fmtShortDate(a.at, TZ.N)}</span>
                    {snip ? (
                      <span className="row-snip"><b>{PEOPLE[snip.who].first}:</b> {snip.voice && <Mic size={11} aria-label="voice note" />} {highlight(snip.text, query.trim())}</span>
                    ) : (
                      <span className="row-foot">
                        <Avatar id={a.sender} size={16} />
                        <span>{a.sender === ME ? 'You' : PEOPLE[a.sender].first}</span>
                        <span className="dot-sep" />
                        <MessageCircle size={12} aria-hidden="true" /><span>{a.msgs.length}</span>
                        {voice && <Mic size={12} aria-label="has voice notes" />}
                        {waiting(a) && <span className="tag-wait"><Hourglass size={11} aria-hidden="true" />Waiting on you</span>}
                      </span>
                    )}
                  </span>
                  <span className="row-side">
                    <time>{agoShort(lastActivity(a), TZ.N)}</time>
                    {u > 0 && <span className="pill" aria-label={`${u} unread messages`}>{u}</span>}
                  </span>
                </button>
              );
            })}
          </section>
        ))}
        {list.length === 0 && (
          <div className="empty">
            <p><b>No stories match.</b></p>
            <p>Try a different word, or clear the filters.</p>
            <button className="btn ghost" onClick={() => { setQuery(''); setFilter('all'); setFrom('any'); setWhen('any'); }}>Clear search and filters</button>
          </div>
        )}
      </div>
      <div className="list-foot">
        {filtering ? `${list.length} of ${inSpace.length} stories` : `${inSpace.length} stories since ${fmtShortDate(first, TZ.N)}`}
        {!filtering && ` · ${articles.length} across both conversations`}
      </div>
    </aside>
  );
}
