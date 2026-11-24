import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar, { lastActivity } from './components/Sidebar.jsx';
import Thread from './components/Thread.jsx';
import Composer from './components/Composer.jsx';
import RightPanel from './components/RightPanel.jsx';
import ScheduleModal from './components/ScheduleModal.jsx';
import { buildArticles, SPACES, ME } from './data.js';
import { now, mmss, fmtLongDay, fmtTime, tzName, TZ } from './time.js';
import { stop } from './audio.js';

export default function App() {
  const [articles, setArticles] = useState(buildArticles);
  const [space, setSpaceState] = useState('haddads');
  const [selectedId, setSelectedId] = useState('w14');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [from, setFrom] = useState('any');
  const [when, setWhen] = useState('any');
  const [tab, setTab] = useState('story');
  const [colMsgId, setColMsgId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [quote, setQuote] = useState(null);
  const [preview, setPreview] = useState(false);
  const [sched, setSched] = useState(false);
  const [toast, setToast] = useState(null);
  const lastSel = useRef({ haddads: 'w14', dm: 'd1' });
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const article = articles.find((a) => a.id === selectedId);
  const patch = useCallback((id, fn) => setArticles((as) => as.map((a) => (a.id === id ? fn(a) : a))), []);
  const patchMsg = useCallback((aid, mid, fn) => patch(aid, (a) => ({ ...a, msgs: a.msgs.map((m) => (m.id === mid ? fn(m) : m)) })), [patch]);
  const markRead = useCallback((id) => patch(id, (a) => (a.msgs.some((m) => m.unread) ? { ...a, msgs: a.msgs.map((m) => (m.unread ? { ...m, unread: false } : m)) } : a)), [patch]);

  const showToast = (text, action) => { setToast({ text, action }); clearTimeout(showToast.t); showToast.t = setTimeout(() => setToast(null), 5000); };

  const select = (id) => {
    if (id === selectedId) return;
    markRead(selectedId);
    stop();
    lastSel.current[space] = id;
    setSelectedId(id); setTab('story'); setColMsgId(null); setReplyTo(null); setQuote(null); setPreview(false);
  };
  const setSpace = (sp) => {
    if (sp === space) return;
    markRead(selectedId); stop();
    setSpaceState(sp); setFilter('all'); setFrom('any'); setWhen('any'); setQuery('');
    const id = lastSel.current[sp];
    setSelectedId(id); setTab('story'); setColMsgId(null); setReplyTo(null); setQuote(null); setPreview(false);
  };

  // "/" focuses search
  useEffect(() => {
    const h = (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !sched) { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [sched]);

  // ---- reader ----
  const colMsg = colMsgId ? article.msgs.find((m) => m.id === colMsgId) : null;
  const doc = colMsg
    ? { key: colMsg.id, ...colMsg.link }
    : { key: article.id, outlet: article.outlet, title: article.title, at: article.at, dek: article.dek, body: article.body };
  const onOpened = () => {
    if (colMsg) patchMsg(article.id, colMsg.id, (m) => ({ ...m, link: { ...m.link, opened: { ...m.link.opened, [ME]: now() } } }));
    else if (!article.opened[ME]) patch(article.id, (a) => ({ ...a, opened: { ...a.opened, [ME]: now() } }));
  };

  // ---- message actions ----
  const onReact = (mid, emoji) => patchMsg(article.id, mid, (m) => {
    const cur = m.reactions[emoji] ?? [];
    const next = cur.includes(ME) ? cur.filter((x) => x !== ME) : [...cur, ME];
    return { ...m, reactions: { ...m.reactions, [emoji]: next } };
  });
  const onHeard = (mid) => patchMsg(article.id, mid, (m) => ({ ...m, heard: { ...m.heard, [ME]: true } }));
  const onReply = (m) => {
    const text = m.type === 'voice' ? `Voice note (${mmss(m.dur)})` : m.type === 'link' ? m.link.title : m.type === 'call' ? 'Family call invite' : m.text;
    setReplyTo({ id: m.id, who: m.who, text: text.slice(0, 140) });
    inputRef.current?.focus();
  };
  const recipients = SPACES[article.space].members.filter((p) => p !== ME);
  const deliver = (base) => {
    patch(article.id, (a) => ({
      ...a,
      msgs: [...a.msgs.map((m) => (m.unread ? { ...m, unread: false } : m)), {
        reactions: {}, heard: {}, unread: false, id: `${a.id}.${a.msgs.length + 1}.me`, who: ME, at: now(),
        seen: Object.fromEntries(recipients.map((p) => [p, 'delivered'])), ...base,
      }],
    }));
    setReplyTo(null); setQuote(null);
  };
  const sendText = (text) => {
    deliver({ type: 'text', text, replyTo: replyTo ? { who: replyTo.who, text: replyTo.text } : undefined, quote: quote ?? undefined });
    setDrafts((d) => ({ ...d, [article.id]: '' }));
  };
  const sendVoice = (v) => deliver({ type: 'voice', dur: v.dur, url: v.url, peaks: v.peaks, transcript: v.transcript, auto: false, replyTo: replyTo ? { who: replyTo.who, text: replyTo.text } : undefined, quote: quote ?? undefined });

  // ---- call ----
  const callMsg = article.msgs.find((m) => m.type === 'call');
  const sendCall = (call) => {
    if (callMsg) {
      patchMsg(article.id, callMsg.id, (m) => ({ ...m, call: { ...call, rsvp: m.call.rsvp } }));
      showToast('Call invite updated in the conversation');
    } else {
      deliver({ type: 'call', call });
      showToast(`Invite sent to Samira and Karim for ${fmtLongDay(call.start, TZ.N)}`);
    }
    setSched(false);
  };
  const cancelCall = () => { patchMsg(article.id, callMsg.id, (m) => ({ ...m, call: { ...m.call, cancelled: true } })); showToast('Call cancelled. Samira and Karim will see that.'); };
  const jumpTo = (mid) => setTimeout(() => {
    const el = document.getElementById('msg-' + mid);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1800);
  }, 60);

  const storyCount = article.story ? articles.filter((a) => a.story === article.story).length : 0;
  const draft = drafts[article.id] ?? '';

  return (
    <div className="app">
      <Sidebar articles={articles} space={space} setSpace={setSpace} selectedId={selectedId} onSelect={select}
        query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} from={from} setFrom={setFrom} when={when} setWhen={setWhen} searchRef={searchRef} />

      <main className="center">
        <Thread key={article.id} article={article} storyCount={storyCount} preview={preview} setPreview={setPreview}
          onReact={onReact} onReply={onReply} onHeard={onHeard}
          onOpenLink={(m) => { setColMsgId(m.id); setTab('article'); }}
          onMarkRead={() => markRead(article.id)}
          onSchedule={() => setSched(true)} onCancelCall={cancelCall}
          onReadArticle={() => { setColMsgId(null); setTab('article'); }}
          openStoryTab={() => setTab('story')} call={callMsg}>
          <Composer article={article} draft={draft} setDraft={(v) => setDrafts((d) => ({ ...d, [article.id]: v }))}
            replyTo={replyTo} clearReply={() => setReplyTo(null)} quote={quote} clearQuote={() => setQuote(null)}
            onSendText={sendText} onSendVoice={sendVoice} inputRef={inputRef} />
        </Thread>
        {toast && <div className="toast" role="status">{toast.text}</div>}
      </main>

      <RightPanel tab={tab} setTab={setTab} article={article} articles={articles.filter((a) => a.space === article.space)} doc={doc} call={callMsg}
        onSelect={select} onOpenColumn={(m) => { setColMsgId(m.id); setTab('article'); }} onSchedule={() => setSched(true)}
        onQuote={(text, source) => { setQuote({ text, source }); inputRef.current?.focus(); showToast('Quote added to your reply'); }}
        onOpened={onOpened} />

      {sched && <ScheduleModal existing={callMsg && !callMsg.call.cancelled ? callMsg : null} onClose={() => setSched(false)} onSend={sendCall} jumpTo={jumpTo} />}
    </div>
  );
}
