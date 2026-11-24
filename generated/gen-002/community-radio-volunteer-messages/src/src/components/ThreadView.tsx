import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BASE_NOW, ME, Message, Thread, externals } from '../data';
import { needsReply, useStore } from '../store';
import {
  Avatar, GroupAvatar, Icon, clock, dayHeading, fillTemplate, firstName, otherMember, personName,
  showsFor, slotLabel, DAYS, threadTitle, volById,
} from '../util';

const SUGGESTED: Record<string, string> = {
  'th-lourdes': 'sr-checkin',
  'th-abel': 'sr-training',
  'th-joy': 'sr-getwell',
  'th-listener': 'sr-listener',
};

function subtitle(t: Thread) {
  if (t.kind === 'group') {
    return `${t.members.length} members · ${t.members.filter((x) => x !== ME).slice(0, 4).map((x) => firstName(personName(x))).join(', ')} and ${t.members.length - 5} more`;
  }
  const other = otherMember(t);
  if (t.kind === 'email') return `${externals[other]?.email} · forwarded from info@krvt927.org`;
  const v = volById(other);
  if (!v) return '';
  const sh = showsFor(other).map((s) => `${s.name} (${DAYS[s.day]} ${slotLabel(s.start, s.end)})`);
  return [v.title ?? v.roles.map((r) => r[0].toUpperCase() + r.slice(1)).join(' · '), ...sh].join(' · ');
}

function LogBlock({ text }: { text: string }) {
  return (
    <pre className="logblock">
      {text.split('\n').map((line, i) => (
        <div key={i} className={/no response|no ack/.test(line) ? 'hl' : i === 0 ? 'logtitle' : ''}>{line || ' '}</div>
      ))}
    </pre>
  );
}

function EmailCard({ m, thread }: { m: Message; thread: Thread }) {
  const mine = m.from === ME;
  const other = otherMember(thread);
  const ext = externals[other];
  return (
    <div className={`email ${mine ? 'mine' : ''}`}>
      {m.email?.forwardedBy && (
        <div className="fwd">
          <Avatar id={m.email.forwardedBy} size={22} />
          <div>
            <div className="fwd-who"><b>{personName(m.email.forwardedBy)}</b> forwarded this · Fri 7:31 AM</div>
            <div className="fwd-note">{m.email.forwardNote}</div>
          </div>
        </div>
      )}
      <div className="email-head">
        <div className="email-from"><span className="k">From</span> <span className="email-addr">{mine ? 'Dev Raman via KRVT 92.7 <info@krvt927.org>' : `${ext.name} <${ext.email}>`}</span>
          <span className="email-date">{new Date(m.at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
        <div><span className="k">To</span> {mine ? `${ext.name} <${ext.email}>` : m.email?.to}</div>
        <div><span className="k">Subject</span> {mine ? `Re: ${thread.title}` : m.email?.subject}</div>
      </div>
      <div className="email-body">{m.body}</div>
    </div>
  );
}

export function ThreadView() {
  const { s, d } = useStore();
  const t = s.threads.find((x) => x.id === s.activeThreadId)!;
  const scroller = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (markerRef.current) {
      el.scrollTop = markerRef.current.offsetTop - 80;
    } else {
      el.scrollTop = el.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [t.messages.length]);

  const marker = s.marker?.threadId === t.id ? s.marker.at : null;
  const firstUnreadIdx = marker ? t.messages.findIndex((m) => m.from !== ME && m.at > marker) : -1;

  const other = otherMember(t);
  const v = t.kind === 'dm' ? volById(other) : undefined;
  const nr = needsReply(t);

  return (
    <section className="thread">
      <header className="thread-head">
        {t.kind === 'group' ? <GroupAvatar title={t.title!} size={38} /> : <Avatar id={other} size={38} />}
        <div className="thread-head-text">
          <h2>{t.kind === 'email' ? t.title : threadTitle(t)}</h2>
          <div className="thread-sub">{t.kind === 'email' ? `${personName(other)} · ${subtitle(t)}` : subtitle(t)}</div>
        </div>
        <div className="thread-actions">
          {v && (
            <a className="btn ghost icon-only" href={`tel:${v.phone.replace(/\D/g, '')}`} title={`Call ${v.name} · ${v.phone}`} aria-label={`Call ${v.name}`}>
              <Icon name="phone" size={16} />
            </a>
          )}
          <button className={`btn ${t.done ? 'ghost' : nr ? 'outline' : 'ghost'}`} onClick={() => d({ type: 'toggleDone', threadId: t.id })}
            title={t.done ? 'Move back to Needs reply' : 'Nothing more needed from you here'}>
            <Icon name="check" size={15} /> {t.done ? 'Done · reopen' : 'Mark done'}
          </button>
        </div>
      </header>

      <div className="messages" ref={scroller}>
        {t.messages.length === 0 && (
          <div className="thread-empty">
            Start a conversation with {personName(other)}.
          </div>
        )}
        {t.messages.map((m, i) => {
          const prev = t.messages[i - 1];
          const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
          const grouped = !newDay && prev && prev.from === m.from && new Date(m.at).getTime() - new Date(prev.at).getTime() < 15 * 60000;
          const mine = m.from === ME;
          return (
            <Fragment key={m.id}>
              {newDay && <div className="day-sep"><span>{dayHeading(m.at)}</span></div>}
              {i === firstUnreadIdx && (
                <div className="new-sep" ref={markerRef}><span>New</span></div>
              )}
              {t.kind === 'email' ? (
                <EmailCard m={m} thread={t} />
              ) : (
                <div className={`msg ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''} ${m.log ? 'wide' : ''}`}>
                  {!mine && <div className="msg-avatar">{!grouped && <Avatar id={m.from} size={30} />}</div>}
                  <div className="msg-col">
                    {!grouped && (
                      <div className="msg-meta">
                        {!mine && <span className="msg-name">{personName(m.from)}</span>}
                        <span className="msg-time">{clock(new Date(m.at))}</span>
                      </div>
                    )}
                    <div className="bubble">
                      {m.body}
                      {m.log && <LogBlock text={m.log} />}
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      <Composer thread={t} />
    </section>
  );
}

function Composer({ thread }: { thread: Thread }) {
  const { s, d, sendMessage } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ta = useRef<HTMLTextAreaElement>(null);
  const draft = thread.draft;

  useEffect(() => {
    if (s.focusComposer) ta.current?.focus();
  }, [s.focusComposer, thread.id]);

  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 260) + 'px';
  }, [draft, thread.id]);

  const unfilled = useMemo(() => Array.from(new Set(draft.match(/\{[a-z_]+\}/g) ?? [])), [draft]);
  const suggested = s.replies.find((r) => r.id === SUGGESTED[thread.id]);
  const startIso = BASE_NOW.toISOString();
  const iRepliedSince = thread.messages.some((m) => m.from === ME && m.at >= startIso);

  const insert = (id: string) => {
    const r = s.replies.find((x) => x.id === id)!;
    const text = fillTemplate(r.body, thread);
    d({ type: 'draft', threadId: thread.id, draft: draft.trim() ? `${draft.trimEnd()}\n\n${text}` : text });
    d({ type: 'replyUsed', id });
    setOpen(false);
    setQ('');
    requestAnimationFrame(() => {
      const el = ta.current;
      if (!el) return;
      el.focus();
      const idx = el.value.indexOf('{');
      if (idx >= 0) el.setSelectionRange(idx, el.value.indexOf('}', idx) + 1);
      else el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const send = () => {
    if (!draft.trim() || unfilled.length) return;
    sendMessage(thread.id, draft.trim());
    if (thread.kind === 'email') d({ type: 'toast', text: `Email sent to ${personName(otherMember(thread))}` });
  };

  const filtered = s.replies.filter(
    (r) => !q || r.title.toLowerCase().includes(q.toLowerCase()) || r.body.toLowerCase().includes(q.toLowerCase()),
  );

  const placeholder =
    thread.kind === 'email'
      ? `Reply to ${personName(otherMember(thread))} by email…`
      : thread.kind === 'group'
        ? `Message ${thread.members.length - 1} people in ${thread.title}…`
        : `Message ${firstName(personName(otherMember(thread)))}…`;

  return (
    <div className="composer-wrap">
      {suggested && !draft && !iRepliedSince && (
        <button className="suggest" onClick={() => insert(suggested.id)}>
          <Icon name="bookmark" size={13} /> Start from saved reply: <b>{suggested.title}</b>
        </button>
      )}
      <div className={`composer ${thread.kind === 'email' ? 'is-email' : ''}`}>
        {thread.kind === 'email' && (
          <div className="composer-email">
            <Icon name="mail" size={13} /> Sends as email from <b>info@krvt927.org</b> to <b>{externals[otherMember(thread)].email}</b>
          </div>
        )}
        <textarea
          ref={ta}
          value={draft}
          rows={2}
          placeholder={placeholder}
          onChange={(e) => d({ type: 'draft', threadId: thread.id, draft: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="composer-bar">
          <div className="popover-anchor">
            <button className={`btn ghost sm ${open ? 'pressed' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <Icon name="bookmark" size={14} /> Saved replies <Icon name="chevDown" size={12} />
            </button>
            {open && (
              <>
                <div className="scrim" onClick={() => setOpen(false)} />
                <div className="popover">
                  <input autoFocus className="popover-search" placeholder="Find a saved reply" value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setOpen(false);
                      if (e.key === 'Enter' && filtered[0]) insert(filtered[0].id);
                    }} />
                  <ul>
                    {filtered.map((r) => (
                      <li key={r.id}>
                        <button onClick={() => insert(r.id)}>
                          <span className="pop-title">{r.title}{SUGGESTED[thread.id] === r.id && <span className="pill">Suggested</span>}</span>
                          <span className="pop-body">{fillTemplate(r.body, thread).replace(/\s+/g, ' ')}</span>
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && <li className="pop-empty">No saved replies match.</li>}
                  </ul>
                  <button className="pop-manage" onClick={() => { setOpen(false); d({ type: 'view', view: 'replies' }); }}>
                    Manage saved replies <Icon name="chev" size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
          {unfilled.length > 0 ? (
            <span className="unfilled"><Icon name="alert" size={13} /> Fill in {unfilled.join(', ')} before sending</span>
          ) : (
            <span className="hint">⌘ Enter to send</span>
          )}
          <button className="btn primary" disabled={!draft.trim() || unfilled.length > 0} onClick={send}>
            <Icon name={thread.kind === 'email' ? 'mail' : 'send'} size={15} /> {thread.kind === 'email' ? 'Send email' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
