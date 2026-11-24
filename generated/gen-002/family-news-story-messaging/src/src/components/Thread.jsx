import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, Square, Reply, SmilePlus, Check, Clock, BookOpen, Phone, Eye, CalendarPlus, Download, Hourglass, ExternalLink, Headphones } from 'lucide-react';
import { Avatar, Monogram, Wave } from './bits.jsx';
import { PEOPLE, SPACES, ME, pendingAsks } from '../data.js';
import { TZ, fmtTime, stamp, dayKey, dayDividerLabel, tzName, mmss, fmtLongDay, fmtWeekday, fmtShortDate } from '../time.js';
import { usePlayer, play, stop, setSpeed as setPlayerSpeed, estimateSeconds } from '../audio.js';
import { downloadIcs } from '../ics.js';

const EMOJI = ['❤️', '👍', '🙏', '😂', '😮'];
const list = (names) => (names.length <= 1 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);

// ---- who has seen / heard / opened a message --------------------------------
function seenItems(m, members, isLast) {
  const explicit = Object.keys(m.seen).length > 0;
  if (!explicit && !isLast) return [];
  const recips = members.filter((p) => p !== m.who && p !== ME);
  const ok = [], warn = [], items = [];
  for (const p of recips) {
    const name = PEOPLE[p].first;
    const st = m.seen[p] ?? 'seen';
    if (m.type === 'link' && m.link) {
      if (m.link.opened?.[p]) ok.push(name);
      else if (m.link.played?.[p]) items.push({ kind: 'warn', text: `${name} played the summary but hasn’t opened the column`, icon: 'headphones' });
      else warn.push(name);
    } else if (st === 'delivered') warn.push(name);
    else ok.push(name);
  }
  const voice = m.type === 'voice';
  if (ok.length) items.unshift({ kind: 'ok', text: voice ? `${list(ok)} listened` : `Seen by ${list(ok)}` });
  if (warn.length) items.push({ kind: 'warn', text: voice ? `${list(warn)} ${warn.length > 1 ? 'haven’t' : 'hasn’t'} listened yet` : `${list(warn)} ${warn.length > 1 ? 'haven’t' : 'hasn’t'} seen this yet` });
  return items;
}

function SeenLine({ items }) {
  if (!items.length) return null;
  return (
    <div className="seen">
      {items.map((it, i) => (
        <span key={i} className={'seen-i ' + it.kind}>
          {it.kind === 'ok' ? <Check size={13} aria-hidden="true" /> : it.icon === 'headphones' ? <Headphones size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}
          {it.text}
        </span>
      ))}
    </div>
  );
}

// ---- pieces -----------------------------------------------------------------
function VoiceNote({ m, onHeard }) {
  const pl = usePlayer();
  const playing = pl.id === m.id;
  const [speed, setSpeed] = useState(1);
  const unplayed = m.who !== ME && !m.heard[ME];
  const [open, setOpen] = useState(unplayed);
  const color = PEOPLE[m.who].color;
  const toggle = () => (playing ? stop() : play({ id: m.id, dur: m.dur, text: m.transcript, url: m.url, speed, onStart: () => onHeard(m.id) }));
  const cycle = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 0.75 : 1;
    setSpeed(next);
    if (playing) setPlayerSpeed(next);
  };
  return (
    <div className="voice">
      <div className="voice-row">
        <button className="play" style={{ background: color }} onClick={toggle} aria-label={playing ? 'Pause voice note' : `Play voice note, ${mmss(m.dur)}`}>
          {playing ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
        </button>
        <Wave seed={m.id} peaks={m.peaks} progress={playing ? pl.t / pl.dur : 0} color={color} />
        <span className="vtime">{playing ? `${mmss(pl.t)} / ${mmss(m.dur)}` : mmss(m.dur)}</span>
        <button className="speed" onClick={cycle} aria-label={`Playback speed ${speed}x`}>{speed}×</button>
      </div>
      {unplayed && <span className="unplayed"><i />Unplayed</span>}
      <div className={'transcript' + (open ? ' open' : '')}>
        <span className="t-label">Transcript{m.auto ? ' · automatic' : ''}</span>
        <p>{m.transcript || <em>No transcript</em>}</p>
      </div>
      {m.transcript && m.transcript.length > 120 && (
        <button className="link-btn" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Show full transcript'}</button>
      )}
    </div>
  );
}

function LinkCard({ m, onOpen }) {
  const L = m.link;
  const pl = usePlayer();
  const id = m.id + ':sum';
  const speaking = pl.id === id;
  return (
    <div className="linkcard">
      <div className="lc-label"><Monogram outlet={L.outlet} size={20} /><span>{L.outlet} · {L.section}</span></div>
      <h4>{L.title}</h4>
      <p className="lc-by">{L.byline} · {fmtLongDay(L.at, TZ.N)}</p>
      <p className="lc-dek">{L.dek}</p>
      <div className="lc-actions">
        <button className="btn sm" onClick={() => onOpen(m)}><BookOpen size={15} />Read the column</button>
        <button className="btn sm ghost" onClick={() => (speaking ? stop() : play({ id, dur: estimateSeconds(L.title + '. ' + L.dek), text: `${L.title}. ${L.dek}` }))}>
          {speaking ? <Square size={14} /> : <Volume2 size={15} />}{speaking ? 'Stop' : 'Listen to summary'}
        </button>
      </div>
    </div>
  );
}

function CallCard({ m, onReschedule, onCancel, onToast }) {
  const c = m.call;
  const end = c.start + c.dur * 60000;
  const same = tzName(c.start, TZ.N);
  return (
    <div className={'callcard' + (c.cancelled ? ' cancelled' : '')}>
      <div className="cc-top"><Phone size={16} aria-hidden="true" /><b>{c.cancelled ? 'Family call cancelled' : 'Family call'}</b><span>{c.dur} min · group voice call</span></div>
      <div className="cc-when">
        <span className="cc-day">{fmtLongDay(c.start, TZ.N)}</span>
        <span className="cc-time">{fmtTime(c.start, TZ.N)}<small>{same}</small></span>
      </div>
      <ul className="cc-zones">
        <li><Avatar id="N" size={18} /> You <b>{fmtTime(c.start, TZ.N)}</b></li>
        <li><Avatar id="S" size={18} /> Samira <b>{fmtTime(c.start, TZ.S)}</b></li>
        <li><Avatar id="K" size={18} /> Karim <b>{fmtTime(c.start, TZ.K)} {tzName(c.start, TZ.K)}</b></li>
      </ul>
      {c.topics && <p className="cc-topics"><b>To talk about:</b> {c.topics}</p>}
      <div className="cc-rsvp">
        {['N', 'S', 'K'].map((p) => (
          <span key={p} className={'rsvp ' + (c.rsvp[p] === 'going' ? 'yes' : '')}>
            {c.rsvp[p] === 'going' ? <Check size={13} /> : <Clock size={13} />}{p === ME ? 'You' : PEOPLE[p].first}: {c.rsvp[p] === 'going' ? 'going' : 'no reply yet'}
          </span>
        ))}
      </div>
      {!c.cancelled && (
        <div className="cc-actions">
          <button className="btn sm ghost" onClick={() => downloadIcs({ id: 'haddad-family-call', title: 'Haddad family call: Warren Ave rezoning', start: c.start, end, description: c.topics || 'Family call from Clipthread' })}><Download size={14} />Add to calendar</button>
          <button className="btn sm ghost" onClick={onReschedule}><CalendarPlus size={14} />Change time</button>
          <button className="btn sm ghost danger" onClick={onCancel}>Cancel call</button>
        </div>
      )}
    </div>
  );
}

function Toolbar({ m, onReact, onReply, mine }) {
  const [pick, setPick] = useState(false);
  const pl = usePlayer();
  const id = m.id + ':tts';
  const speaking = pl.id === id;
  const canListen = m.type === 'text' && m.text;
  return (
    <div className={'tools' + (pick || speaking ? ' show' : '')}>
      {pick ? (
        <span className="picker" role="group" aria-label="Choose a reaction">
          {EMOJI.map((e) => <button key={e} onClick={() => { onReact(m.id, e); setPick(false); }} aria-label={`React ${e}`}>{e}</button>)}
        </span>
      ) : (
        <>
          <button onClick={() => setPick(true)} aria-label="Add reaction" title="React"><SmilePlus size={16} /></button>
          <button onClick={() => onReply(m)} aria-label="Reply to this message" title="Reply"><Reply size={16} /></button>
          {canListen && (
            <button onClick={() => (speaking ? stop() : play({ id, dur: estimateSeconds(m.text), text: m.text.replace(/^@/, '') }))} aria-label={speaking ? 'Stop reading aloud' : 'Listen to this message read aloud'} title={speaking ? 'Stop' : 'Listen'}>
              {speaking ? <Square size={15} /> : <Volume2 size={16} />}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function renderText(text) {
  return text.split(/(@\w+)/).map((p, i) => (p.startsWith('@') ? <span key={i} className="mention">{p}</span> : p));
}

function Message({ m, members, isLast, onReact, onReply, onHeard, onOpenLink, onReschedule, onCancelCall, flash }) {
  const mine = m.who === ME;
  const p = PEOPLE[m.who];
  const items = seenItems(m, members, isLast);
  const reacts = Object.entries(m.reactions).filter(([, w]) => w.length);
  const hisTime = m.who === 'K' ? `${fmtTime(m.at, TZ.K)} his time` : null;
  return (
    <article id={'msg-' + m.id} className={'msg' + (mine ? ' mine' : '') + (m.unread ? ' fresh' : '') + (flash ? ' flash' : '')}>
      {!mine && <Avatar id={m.who} size={34} />}
      <div className="msg-col">
        <header className="msg-head">
          <b style={{ color: p.color }}>{mine ? 'You' : p.first}</b>
          <time title={`${p.first}’s clock: ${fmtTime(m.at, TZ[m.who])} ${tzName(m.at, TZ[m.who])}`}>{stamp(m.at, TZ.N)}</time>
          {hisTime && <span className="his">({hisTime})</span>}
          {m.unread && <span className="new-dot" aria-label="Unread" />}
        </header>
        {m.type === 'call' ? (
          <CallCard m={m} onReschedule={onReschedule} onCancel={onCancelCall} />
        ) : (
          <div className={'bubble' + (m.type !== 'text' ? ' wide' : '')}>
            {m.replyTo && (
              <div className="qt reply"><b>{m.replyTo.who === ME ? 'You' : PEOPLE[m.replyTo.who].first}</b><span>{m.replyTo.text}</span></div>
            )}
            {m.quote && (
              <blockquote className="qt article"><span>{m.quote.text}</span><cite>{m.quote.source}</cite></blockquote>
            )}
            {m.type === 'voice' && <VoiceNote m={m} onHeard={(id) => onHeard(id)} />}
            {m.type === 'link' && m.text && <p className="txt">{renderText(m.text)}</p>}
            {m.type === 'link' && <LinkCard m={m} onOpen={onOpenLink} />}
            {m.type === 'text' && <p className="txt">{renderText(m.text)}</p>}
            <Toolbar m={m} onReact={onReact} onReply={onReply} mine={mine} />
          </div>
        )}
        {reacts.length > 0 && (
          <div className="reacts">
            {reacts.map(([e, who]) => (
              <button key={e} className={who.includes(ME) ? 'mine' : ''} onClick={() => onReact(m.id, e)} title={who.map((w) => (w === ME ? 'You' : PEOPLE[w].first)).join(', ')} aria-label={`${e} from ${who.length}`}>
                <span>{e}</span>{who.length > 1 && <i>{who.length}</i>}
              </button>
            ))}
          </div>
        )}
        <SeenLine items={items} />
      </div>
    </article>
  );
}

// ---- thread -----------------------------------------------------------------
export default function Thread({ article, storyCount, preview, setPreview, onReact, onReply, onHeard, onOpenLink, onMarkRead, onSchedule, onCancelCall, onReadArticle, call, openStoryTab, children }) {
  const scroller = useRef(null);
  const [flash, setFlash] = useState(null);
  const members = SPACES[article.space].members;
  const others = members.filter((p) => p !== ME);
  const unread = article.msgs.filter((m) => m.unread).length;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const div = el.querySelector('#new-divider');
    if (div) el.scrollTop += div.getBoundingClientRect().top - el.getBoundingClientRect().top - 14;
    else el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  const lastLen = useRef(article.msgs.length);
  useEffect(() => {
    if (article.msgs.length > lastLen.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
    lastLen.current = article.msgs.length;
  }, [article.msgs.length]);
  useEffect(() => { lastLen.current = article.msgs.length; }, [article.id]);

  const jump = (id) => {
    const el = document.getElementById('msg-' + id);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFlash(id);
    setTimeout(() => setFlash(null), 1800);
  };

  const asks = pendingAsks(article);
  const sharer = article.sender === ME ? 'you' : PEOPLE[article.sender].first;
  const waitingSince = asks[0];

  let prevDay = null;
  return (
    <section className={'thread' + (preview ? ' large' : '')} aria-label={`Conversation about ${article.title}`}>
      <header className="t-head">
        <div className="t-top">
          <Monogram outlet={article.outlet} size={22} />
          <span className="t-outlet">{article.outlet} · {fmtWeekday(article.at, TZ.N)}, {fmtShortDate(article.at, TZ.N)}</span>
          <span className="t-actions">
            {article.space === 'haddads' && (
              <button className={'btn sm ghost' + (preview ? ' active' : '')} aria-pressed={preview} onClick={() => setPreview(!preview)} title="See this conversation at Samira’s text size">
                <Eye size={15} />Samira’s view
              </button>
            )}
            <button className="btn sm ghost" onClick={onReadArticle}><BookOpen size={15} />Read article</button>
            {article.space === 'haddads' && (
              <button className="btn sm primary" onClick={onSchedule}><Phone size={15} />{call && !call.call.cancelled ? 'Change call' : 'Set up a call'}</button>
            )}
          </span>
        </div>
        <h1>{article.title}</h1>
        <p className="t-meta">
          <Avatar id={article.sender} size={18} /> Shared by {sharer} · {stamp(article.at, TZ.N)}
          <span className="dot-sep" />
          <span className="members">{members.map((p) => <Avatar key={p} id={p} size={20} />)}</span>
          {article.space === 'dm' ? 'Only you and Karim can see this' : 'Haddads'}
          {article.story && storyCount > 1 && (<><span className="dot-sep" /><button className="link-btn" onClick={openStoryTab}>Warren Ave project · {storyCount} stories</button></>)}
        </p>
        {asks.length > 0 && (
          <div className="asks" role="status">
            <Hourglass size={16} aria-hidden="true" />
            <div>
              <b>Samira is waiting for your answer</b> <span className="asks-since">since {stamp(waitingSince.at, TZ.N)}</span>
              <ul>
                {asks.map((q) => (
                  <li key={q.msgId + q.q}><button className="link-btn" onClick={() => jump(q.msgId)}>{q.q}</button></li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {preview && <div className="previewbar"><Eye size={15} />Showing this conversation at Samira’s text size (Large). Transcripts are expanded.</div>}
      </header>

      <div className="t-scroll" ref={scroller} role="log" aria-live="polite">
        <div className="t-inner">
          {article.msgs.map((m, i) => {
            const dk = dayKey(m.at, TZ.N);
            const showDay = dk !== prevDay;
            prevDay = dk;
            return (
              <div key={m.id}>
                {showDay && <div className="day"><span>{dayDividerLabel(m.at, TZ.N)}</span></div>}
                {article.newFrom === m.id && (
                  <div className="newdiv" id="new-divider">
                    <span>{article.newCount} new</span>
                    {unread > 0 && <button className="link-btn" onClick={onMarkRead}>Mark as read</button>}
                  </div>
                )}
                <Message m={m} members={members} isLast={i === article.msgs.length - 1} flash={flash === m.id}
                  onReact={onReact} onReply={onReply} onHeard={onHeard} onOpenLink={onOpenLink} onReschedule={onSchedule} onCancelCall={onCancelCall} />
              </div>
            );
          })}
          <div style={{ height: 8 }} />
        </div>
      </div>
      {children}
    </section>
  );
}
