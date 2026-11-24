import { useEffect, useRef, useState } from 'react';
import { BookOpen, CalendarPlus, Check, Clock, Headphones, Mic, Phone, Quote, Newspaper, MessageCircle, Download, Eye } from 'lucide-react';
import { Avatar, Monogram } from './bits.jsx';
import { PEOPLE, SPACES, ME } from '../data.js';
import { TZ, now, fmtTime, fmtShortDate, fmtLongDay, tzName, stamp, fmtWeekday } from '../time.js';
import { downloadIcs } from '../ics.js';

const list = (names) => (names.length <= 1 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);

// What each person has and hasn't seen in this conversation.
function presence(article, p) {
  const out = [];
  const opened = article.opened?.[p];
  out.push(opened ? { ok: true, text: p === ME ? `You opened the article ${stamp(opened, TZ.N)}` : `Opened the article ${stamp(opened, TZ.N)}` } : { ok: false, text: p === ME ? 'You haven’t opened the article yet' : 'Hasn’t opened the article' });
  const missed = article.msgs.filter((m) => m.who !== p && (p === ME ? m.unread : m.seen[p] === 'delivered'));
  if (missed.length) {
    const m = missed[missed.length - 1];
    if (p === ME) out.push({ ok: false, text: `${missed.length} unread message${missed.length > 1 ? 's' : ''}` + (missed.some((x) => x.type === 'voice' && !x.heard[ME]) ? ', 1 voice note not played' : '') });
    else out.push({ ok: false, text: `Hasn’t seen ${PEOPLE[m.who].first}’s latest message (${stamp(m.at, TZ.N)})` });
  }
  for (const m of article.msgs) {
    if (m.type !== 'link' || m.who === p) continue;
    if (m.link.opened?.[p]) continue;
    if (m.link.played?.[p]) out.push({ ok: false, text: `Played ${PEOPLE[m.who].first}’s link, hasn’t opened the column`, icon: 'headphones' });
    else if (p === ME) out.push({ ok: false, text: `You haven’t opened ${PEOPLE[m.who].first}’s column` });
  }
  return out;
}

function StoryTab({ article, articles, call, onSelect, onOpenColumn, onSchedule }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  const members = SPACES[article.space].members;
  const colMsg = article.msgs.find((m) => m.type === 'link');
  const story = article.story ? articles.filter((a) => a.story === article.story).sort((a, b) => a.at - b.at) : [];
  const timeline = story.map((a) => ({ kind: 'article', at: a.at, a }));
  if (colMsg) timeline.push({ kind: 'link', at: colMsg.link.at, m: colMsg });
  timeline.sort((a, b) => a.at - b.at);

  return (
    <div className="rp-body">
      <section className="card">
        <h2 className="h">About this story</h2>
        <p className="dek">{article.dek}</p>
      </section>

      {article.keyDates && (
        <section className="card">
          <h2 className="h">Dates to know <span className="h-note">from the article</span></h2>
          <ul className="dates">
            {article.keyDates.map((d) => (
              <li key={d.label} className={d.ics ? 'hl' : ''}>
                <span className="d-cal"><small>{fmtShortDate(d.at, TZ.N).split(' ')[0]}</small><b>{fmtShortDate(d.at, TZ.N).split(' ')[1]}</b></span>
                <span className="d-text">
                  <b>{d.label}</b>
                  <span>{fmtWeekday(d.at, TZ.N)}{d.approx ? '' : ` · ${fmtTime(d.at, TZ.N)}`} · {d.detail}</span>
                </span>
                {d.ics && (
                  <button className="icon-btn" aria-label="Add the hearing to your calendar" title="Add to calendar"
                    onClick={() => downloadIcs({ id: 'dearborn-warren-ave-hearing', title: 'Dearborn City Council hearing: Warren Ave rezoning', start: d.at, end: d.at + 2 * 3600000, location: 'Dearborn City Hall', description: 'Public comment: 3 minutes per speaker. Written comments due 4 p.m. Nov. 30.' })}>
                    <Download size={17} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {timeline.length > 1 && (
        <section className="card">
          <h2 className="h">Earlier on this story <span className="h-note">Warren Ave project</span></h2>
          <ol className="timeline">
            {timeline.map((it) => {
              if (it.kind === 'link') {
                return (
                  <li key="col" className="tl link">
                    <span className="tl-dot" />
                    <button className="tl-card" onClick={() => onOpenColumn(it.m)}>
                      <span className="tl-date">{fmtShortDate(it.at, TZ.N)} · Opinion column</span>
                      <span className="tl-title">{it.m.link.title}</span>
                      <span className="tl-sub"><Avatar id={it.m.who} size={16} /> Linked by Karim in this conversation</span>
                    </button>
                  </li>
                );
              }
              const a = it.a, cur = a.id === article.id, voice = a.msgs.find((m) => m.type === 'voice');
              return (
                <li key={a.id} className={'tl' + (cur ? ' cur' : '')}>
                  <span className="tl-dot" />
                  <button className="tl-card" onClick={() => !cur && onSelect(a.id)} disabled={cur} aria-current={cur ? 'true' : undefined}>
                    <span className="tl-date">{fmtShortDate(a.at, TZ.N)} · {a.outlet}{cur && <em>You are here</em>}</span>
                    <span className="tl-title">{a.title}</span>
                    <span className="tl-sub">
                      <Avatar id={a.sender} size={16} /> Sent by {a.sender === ME ? 'you' : PEOPLE[a.sender].first}
                      <span className="dot-sep" /><MessageCircle size={12} />{a.msgs.length}
                      {voice && <><span className="dot-sep" /><Mic size={12} />{PEOPLE[voice.who].first}’s voice note</>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="card">
        <h2 className="h">Who has seen what</h2>
        <ul className="people">
          {members.map((p) => {
            const per = PEOPLE[p];
            const items = presence(article, p);
            return (
              <li key={p}>
                <Avatar id={p} size={34} />
                <div>
                  <div className="p-name"><b>{p === ME ? 'You' : per.first}</b>
                    <span className="p-time" title={`${per.city}`}>{fmtTime(now(), TZ[p])} {tzName(now(), TZ[p])} · {per.city}</span>
                  </div>
                  {items.map((it, i) => (
                    <div key={i} className={'p-line ' + (it.ok ? 'ok' : 'warn')}>
                      {it.ok ? <Check size={13} /> : it.icon ? <Headphones size={13} /> : <Clock size={13} />}{it.text}
                    </div>
                  ))}
                  {per.largeText && <div className="p-pref"><Eye size={12} />Large text · prefers voice replies</div>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {article.space === 'haddads' && (
        <section className="card">
          <h2 className="h">Family call</h2>
          {call && !call.call.cancelled ? (
            <div className="mini-call">
              <b>{fmtLongDay(call.call.start, TZ.N)} · {fmtTime(call.call.start, TZ.N)} {tzName(call.call.start, TZ.N)}</b>
              <span>Karim: {fmtTime(call.call.start, TZ.K)} {tzName(call.call.start, TZ.K)}</span>
              <button className="btn sm ghost" onClick={onSchedule}><CalendarPlus size={14} />Change time</button>
            </div>
          ) : (
            <>
              <p className="muted">Samira asked to talk Wednesday after 1 PM. Karim is free after noon his time.</p>
              <button className="btn primary" onClick={onSchedule}><Phone size={16} />Set up a call for all three</button>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function ArticleTab({ doc, onQuote, onOpened }) {
  const ref = useRef(null);
  const [sel, setSel] = useState('');
  useEffect(() => {
    const t = setTimeout(onOpened, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [doc.key]);
  useEffect(() => {
    const h = () => {
      const s = window.getSelection();
      const txt = s && !s.isCollapsed ? s.toString().trim() : '';
      if (txt && ref.current && s.anchorNode && ref.current.contains(s.anchorNode)) setSel(txt.replace(/\s+/g, ' ').slice(0, 300));
      else setSel('');
    };
    document.addEventListener('selectionchange', h);
    return () => document.removeEventListener('selectionchange', h);
  }, []);
  useEffect(() => { setSel(''); ref.current && (ref.current.scrollTop = 0); }, [doc.key]);

  return (
    <div className="reader-wrap">
      <div className="reader" ref={ref}>
        <div className="r-meta"><Monogram outlet={doc.outlet} size={22} /><span>{doc.outlet}{doc.section ? ` · ${doc.section}` : ''}</span></div>
        <h1>{doc.title}</h1>
        <p className="r-by">{doc.byline ? doc.byline + ' · ' : ''}{fmtLongDay(doc.at, TZ.N)}</p>
        <p className="r-dek">{doc.dek}</p>
        {doc.body ? doc.body.map((p, i) => <p key={i}>{p}</p>) : (
          <p className="r-preview">This is a preview. Clipthread keeps the headline and summary; the full story is on {doc.outlet}’s site.</p>
        )}
      </div>
      <div className={'quotebar' + (sel ? ' on' : '')} aria-hidden={!sel}>
        {sel ? (
          <>
            <span className="q-text">“{sel.length > 110 ? sel.slice(0, 110) + '…' : sel}”</span>
            <button className="btn primary sm" onMouseDown={(e) => e.preventDefault()} onClick={() => { onQuote(sel, doc.title); window.getSelection()?.removeAllRanges(); }}>
              <Quote size={14} />Quote in reply
            </button>
          </>
        ) : (
          <span className="q-hint"><Quote size={14} />Select any sentence to quote it in your reply</span>
        )}
      </div>
    </div>
  );
}

export default function RightPanel({ tab, setTab, article, articles, doc, call, onSelect, onOpenColumn, onSchedule, onQuote, onOpened }) {
  return (
    <aside className="right" aria-label="Story details">
      <div className="rp-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'story'} className={tab === 'story' ? 'on' : ''} onClick={() => setTab('story')}><Newspaper size={15} />Story</button>
        <button role="tab" aria-selected={tab === 'article'} className={tab === 'article' ? 'on' : ''} onClick={() => setTab('article')}><BookOpen size={15} />Read article</button>
      </div>
      {tab === 'story'
        ? <StoryTab article={article} articles={articles} call={call} onSelect={onSelect} onOpenColumn={onOpenColumn} onSchedule={onSchedule} />
        : <ArticleTab doc={doc} onQuote={onQuote} onOpened={onOpened} />}
    </aside>
  );
}
