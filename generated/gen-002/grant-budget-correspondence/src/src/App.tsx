import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHARGE, DUE, NOW, docs, grants, people, type Message, type Thread } from './data';
import {
  type AppState,
  type Draft,
  type DraftKind,
  CHARGE_KINDS,
  gregReplied,
  initialState,
  lastMessage,
  makeDraft,
} from './state';
import { businessDaysAfter, dayDate, initials, longDate, monthDay, nowStr, shortDate } from './util';
import { Composer } from './Composer';
import { ContextPane } from './ContextPane';
import { CostTransferModal, DocModal } from './Modals';

type View = 'open' | 'mine' | 'waiting' | 'all';

interface Toast {
  text: string;
  undo?: AppState;
  action?: { label: string; threadId: string };
}

export default function App() {
  const [s, setS] = useState<AppState>(initialState);
  const [view, setView] = useState<View>('open');
  const [query, setQuery] = useState('');
  const [docId, setDocId] = useState<string | null>(null);
  const [ctOpen, setCtOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 7000);
  }, []);

  const thread = s.threads.find((t) => t.id === s.activeThreadId)!;
  const msgsRef = useRef<HTMLDivElement>(null);
  const seen = useRef<{ id: string; n: number }>({ id: thread.id, n: thread.messages.length });
  useEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    if (seen.current.id === thread.id && thread.messages.length > seen.current.n) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    seen.current = { id: thread.id, n: thread.messages.length };
  }, [thread.id, thread.messages.length]);

  const selectThread = (id: string) =>
    setS((p) => {
      const t = p.threads.find((x) => x.id === id)!;
      const kinds = t.chargeId ? CHARGE_KINDS : ['reply'];
      const visible = Object.values(p.drafts).filter((d) =>
        t.chargeId ? kinds.includes(d.kind) : d.id === `reply-${id}`,
      );
      return {
        ...p,
        activeThreadId: id,
        threads: p.threads.map((x) => (x.id === id ? { ...x, unread: false } : x)),
        activeDraftId: visible.find((d) => d.id === p.activeDraftId)?.id ?? visible[0]?.id ?? null,
        composerOpen: p.composerOpen && visible.length > 0,
      };
    });

  /** Open (creating if needed) a draft of the given kind. */
  const openDraft = (kind: DraftKind, threadForReply?: Thread) =>
    setS((p) => {
      const id = kind === 'reply' ? `reply-${threadForReply!.id}` : kind;
      let fresh = makeDraft(kind, threadForReply);
      if (kind === 'greg' && gregReplied(p)) {
        fresh = { ...fresh, body: 'Hi Greg,\n\nFollowing up on my note from Monday with the remaining items for PMF-88213:\n\n' };
      }
      const drafts = p.drafts[id] ? p.drafts : { ...p.drafts, [id]: fresh };
      let activeThreadId = p.activeThreadId;
      const cur = p.threads.find((t) => t.id === activeThreadId)!;
      // Charge drafts live in the composer of any thread tied to the charge.
      if (kind !== 'reply' && !cur.chargeId) activeThreadId = 'greg';
      return { ...p, drafts, activeDraftId: id, composerOpen: true, activeThreadId };
    });

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setS((p) => ({ ...p, drafts: { ...p.drafts, [id]: { ...p.drafts[id], ...patch } } }));

  const discardDraft = (id: string) =>
    setS((p) => {
      const drafts = { ...p.drafts };
      delete drafts[id];
      const cur = p.threads.find((t) => t.id === p.activeThreadId)!;
      const next = Object.values(drafts).find((d) => (cur.chargeId ? CHARGE_KINDS.includes(d.kind) : false));
      return { ...p, drafts, activeDraftId: next?.id ?? null, composerOpen: !!next };
    });

  const send = (id: string) => {
    const before = s;
    const d = s.drafts[id];
    const at = nowStr();
    const msg: Message = {
      id: `sent-${Date.now()}`,
      from: 'teodora',
      to: d.to,
      date: at,
      body: d.body.trim(),
      attachments: d.attachments,
      tag: d.kind === 'pi' ? 'Queued for the ~6 PM satellite sync' : undefined,
    };
    let toastText = '';
    let action: Toast['action'];
    setS((p) => {
      let threadsNext = p.threads;
      const asks = { ...p.asks };
      if (d.threadId) {
        threadsNext = p.threads.map((t) => {
          if (t.id !== d.threadId) return t;
          let statusNote = 'Replied today';
          if (d.kind === 'greg') {
            const pending =
              !p.asks.vendor || p.asks.vendor.status !== 'received' || !p.asks.pi || p.asks.pi.status !== 'received';
            statusNote = pending ? 'Interim reply sent · final by Fri' : 'Package sent · awaiting Greg';
          }
          if (d.kind === 'pi') statusNote = 'Asked · next sat sync ~6 PM';
          return { ...t, messages: [...t.messages, msg], status: 'waiting', statusNote };
        });
      } else {
        const nt: Thread = {
          id: 'pmf',
          subject: d.subject,
          grantId: 'oce2291',
          chargeId: CHARGE.id,
          participants: ['dana', 'teodora'],
          status: 'waiting',
          statusNote: 'Itemized invoice by Wed Nov 18',
          messages: [msg],
        };
        threadsNext = [nt, ...p.threads];
      }
      if (d.kind === 'pi') asks.pi = { sentAt: at, followUp: '2026-11-19', status: 'sent' };
      if (d.kind === 'vendor') asks.vendor = { sentAt: at, followUp: '2026-11-18', status: 'sent' };
      const drafts = { ...p.drafts };
      delete drafts[id];
      const cur = threadsNext.find((t) => t.id === p.activeThreadId)!;
      const next = Object.values(drafts).find((x) => (cur.chargeId ? CHARGE_KINDS.includes(x.kind) : false));
      return {
        ...p,
        threads: threadsNext,
        asks,
        drafts,
        activeDraftId: next?.id ?? null,
        composerOpen: !!next && p.composerOpen,
      };
    });
    if (d.kind === 'pi') {
      toastText = 'Queued for Dr. Amaral — goes out with the Sea Lark’s ~6 PM satellite sync. Reminder set for Thu, Nov 19.';
      action = { label: 'View thread', threadId: 'amaral' };
    } else if (d.kind === 'vendor') {
      toastText = 'Sent to Pacific Marine Fuel. New thread filed under OCE-2291 › PMF-88213. Reminder set for Wed, Nov 18.';
      action = { label: 'View thread', threadId: 'pmf' };
    } else if (d.kind === 'greg') {
      toastText = 'Reply sent to Greg Tanaka.';
    } else {
      toastText = `Sent to ${people[d.to[0]].name}.`;
    }
    showToast({ text: toastText, undo: before, action });
  };

  const submitCostTransfer = (reason: string, attach: boolean) => {
    setS((p) => {
      const drafts = { ...p.drafts };
      if (attach) {
        const g = drafts.greg ?? makeDraft('greg');
        drafts.greg = { ...g, attachments: g.attachments.includes('ct') ? g.attachments : [...g.attachments, 'ct'] };
      }
      return { ...p, drafts, costTransfer: { id: 'CT-2291-0117', submittedAt: nowStr(), reason } };
    });
    setCtOpen(false);
    showToast({
      text: attach
        ? 'Cost transfer CT-2291-0117 submitted and attached to your reply to Greg.'
        : 'Cost transfer CT-2291-0117 submitted to the grants office.',
    });
  };

  const counts = useMemo(() => {
    const ts = s.threads;
    return {
      open: ts.filter((t) => t.status !== 'closed').length,
      mine: ts.filter((t) => t.status === 'needs-reply' || t.status === 'action').length,
      waiting: ts.filter((t) => t.status === 'waiting').length,
      all: ts.length,
    };
  }, [s.threads]);

  const visibleThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return s.threads.filter((t) => {
      if (view === 'open' && t.status === 'closed') return false;
      if (view === 'mine' && !(t.status === 'needs-reply' || t.status === 'action')) return false;
      if (view === 'waiting' && t.status !== 'waiting') return false;
      if (!q) return true;
      const hay = [
        t.subject,
        grants[t.grantId].number,
        grants[t.grantId].title,
        ...t.participants.map((p) => people[p].name + ' ' + people[p].org),
        ...t.messages.map((m) => m.body),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [s.threads, view, query]);

  const groups = useMemo(() => {
    const order = ['oce2291', 'oce2307', 'seagrant'];
    return order
      .map((g) => ({
        grant: grants[g],
        threads: visibleThreads
          .filter((t) => t.grantId === g)
          .sort((a, b) => (lastMessage(b).date > lastMessage(a).date ? 1 : -1)),
      }))
      .filter((g) => g.threads.length > 0);
  }, [visibleThreads]);

  // Keyboard: Esc closes modals / composer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (docId) setDocId(null);
        else if (ctOpen) setCtOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [docId, ctOpen]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 22 22">
              <rect x="1" y="1" width="20" height="20" rx="5" fill="#1F5C57" />
              <path d="M6 7h10M6 11h10M6 15h6" stroke="#F4F2ED" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="16" cy="15" r="1.6" fill="#E9B872" />
            </svg>
          </div>
          <div>
            <div className="brand-name">Ledgerline</div>
            <div className="brand-sub">Larkin Cove Marine Station</div>
          </div>
        </div>

        <div className="search">
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads, invoices, people"
            aria-label="Search threads"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              ×
            </button>
          )}
        </div>

        <nav className="views" aria-label="Thread views">
          {(
            [
              ['open', 'Open'],
              ['mine', 'Needs me'],
              ['waiting', 'Waiting'],
              ['all', 'All'],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button key={v} className={`view ${view === v ? 'on' : ''}`} onClick={() => setView(v)}>
              {label}
              <span className="view-count">{counts[v]}</span>
            </button>
          ))}
        </nav>

        <div className="thread-list">
          {groups.length === 0 && <div className="empty">No threads match “{query}”.</div>}
          {groups.map(({ grant, threads }) => (
            <section key={grant.id} className="grant-group">
              <header className="grant-group-head">
                <span className="mono">{grant.number}</span>
                <span className="dot-sep">·</span>
                <span>{people[grant.pi].name.replace('Dr. ', '')}</span>
              </header>
              {threads.map((t) => (
                <ThreadRow key={t.id} t={t} active={t.id === s.activeThreadId} onClick={() => selectThread(t.id)} />
              ))}
            </section>
          ))}
        </div>

        <footer className="me">
          <div className="avatar sm" style={{ background: people.teodora.tone }}>
            TI
          </div>
          <div>
            <div className="me-name">Teodora Ilic</div>
            <div className="me-role">Lab & Finance Manager</div>
          </div>
          <div className="clock">{dayDate(NOW)}</div>
        </footer>
      </aside>

      <main className="center">
        <ThreadHeader
          t={thread}
          threads={s.threads}
          onOpenThread={selectThread}
          onReply={() =>
            thread.id === 'greg'
              ? openDraft('greg')
              : thread.id === 'amaral'
                ? openDraft('pi')
                : openDraft('reply', thread)
          }
        />
        {thread.id === 'greg' && <DeadlineBanner s={s} onOpen={openDraft} />}
        <div className="messages" key={thread.id} ref={msgsRef}>
          {thread.messages.map((m, i) => (
            <MessageCard key={m.id} m={m} first={i === 0} onDoc={setDocId} />
          ))}
          {thread.status === 'closed' && <div className="closed-note">Thread closed · {thread.statusNote.replace('Closed ', '')}</div>}
        </div>
        <Composer
          s={s}
          thread={thread}
          onOpen={openDraft}
          onSetActive={(id) => setS((p) => ({ ...p, activeDraftId: id, composerOpen: true }))}
          onToggle={(open) => setS((p) => ({ ...p, composerOpen: open }))}
          onUpdate={updateDraft}
          onDiscard={discardDraft}
          onSend={send}
          onDoc={setDocId}
        />
      </main>

      <ContextPane
        s={s}
        thread={thread}
        onOpenDraft={openDraft}
        onDoc={setDocId}
        onCostTransfer={() => setCtOpen(true)}
        onOpenThread={selectThread}
        onFollowUp={(k, date) =>
          setS((p) => ({ ...p, asks: { ...p.asks, [k]: { ...p.asks[k]!, followUp: date } } }))
        }
        onReceived={(k) => {
          setS((p) => ({ ...p, asks: { ...p.asks, [k]: { ...p.asks[k]!, status: 'received' } } }));
          showToast({ text: k === 'pi' ? 'Marked Dr. Amaral’s confirmation as received.' : 'Marked itemized invoice as received.' });
        }}
        onSubmitReimb={() => {
          setS((p) => ({
            ...p,
            reimbSubmitted: nowStr(),
            threads: p.threads.map((t) =>
              t.id === 'mateo' ? { ...t, status: 'waiting', statusNote: 'Submitted to AP today' } : t,
            ),
          }));
          showToast({ text: 'Reimbursement RB-11408 ($286.00) submitted to Accounts Payable for Mateo Fuentes.' });
        }}
      />

      {docId && <DocModal id={docId} onClose={() => setDocId(null)} costTransfer={s.costTransfer} />}
      {ctOpen && <CostTransferModal onClose={() => setCtOpen(false)} onSubmit={submitCostTransfer} />}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.action && (
            <button
              className="toast-btn"
              onClick={() => {
                selectThread(toast.action!.threadId);
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
          {toast.undo && (
            <button
              className="toast-btn"
              onClick={() => {
                setS(toast.undo!);
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
          <button className="toast-x" onClick={() => setToast(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function statusClass(t: Thread) {
  if (t.status === 'needs-reply') return 'pill due';
  if (t.status === 'action') return 'pill action';
  if (t.status === 'waiting') return 'pill wait';
  return 'pill closed';
}

function ThreadRow({ t, active, onClick }: { t: Thread; active: boolean; onClick: () => void }) {
  const last = lastMessage(t);
  const other = t.participants.find((p) => p !== 'teodora')!;
  const preview = last.body.replace(/\s+/g, ' ').slice(0, 90);
  return (
    <button className={`thread-row ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="tr-top">
        <span className="tr-who">
          {people[other].name}
          {last.via === 'satellite' && <span className="sat-mini" title="Satellite email">SAT</span>}
        </span>
        <span className="tr-date">{shortDate(last.date)}</span>
      </div>
      <div className="tr-subject">{t.subject}</div>
      <div className="tr-preview">
        {last.from === 'teodora' ? 'You: ' : ''}
        {preview}
      </div>
      <div className="tr-meta">
        <span className={statusClass(t)}>{t.statusNote}</span>
        {t.chargeId && <span className="chip-mini mono">PMF-88213</span>}
      </div>
    </button>
  );
}

function ThreadHeader({
  t,
  threads,
  onOpenThread,
  onReply,
}: {
  t: Thread;
  threads: Thread[];
  onOpenThread: (id: string) => void;
  onReply: () => void;
}) {
  const g = grants[t.grantId];
  const related = t.chargeId ? threads.filter((x) => x.chargeId === t.chargeId && x.id !== t.id) : [];
  const others = t.participants.filter((p) => p !== 'teodora');
  return (
    <header className="th">
      <div className="th-row">
        <div className="th-main">
          <div className="th-links">
            <span className="chip grant">
              <span className="chip-k">{g.sponsor}</span>
              <span className="mono">{g.number}</span>
              <span className="chip-t">{g.title}</span>
            </span>
            {t.chargeId && (
              <span className="chip charge">
                <span className="chip-k">Charge</span>
                <span className="mono">{CHARGE.invoice}</span>
                <span>$4,312.60</span>
              </span>
            )}
          </div>
          <h1 className="th-subject">{t.subject}</h1>
          <div className="th-people">
            {others.map((p) => (
              <span key={p}>
                <strong>{people[p].name}</strong> · {people[p].role}, {people[p].org}
              </span>
            ))}
          </div>
        </div>
        {t.status !== 'closed' && (
          <button className="btn primary" onClick={onReply}>
            {t.id === 'amaral' ? 'Ask Dr. Amaral' : 'Reply'}
          </button>
        )}
      </div>
      {related.length > 0 && (
        <div className="related">
          <span className="related-k">Also about this charge</span>
          {related.map((r) => {
            const last = lastMessage(r);
            const who = r.participants.find((p) => p !== 'teodora')!;
            return (
              <button key={r.id} className="related-link" onClick={() => onOpenThread(r.id)}>
                {people[who].name}
                <span className="related-d">
                  {last.from === 'teodora' ? 'you wrote' : 'last reply'} {monthDay(last.date)}
                  {last.via === 'satellite' ? ' · via satellite' : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

function DeadlineBanner({ s, onOpen }: { s: AppState; onOpen: (k: DraftKind) => void }) {
  const left = businessDaysAfter(nowStr(), DUE);
  const replied = gregReplied(s);
  let msg: React.ReactNode;
  let btn: { label: string; kind: DraftKind } | null = null;
  if (!s.asks.pi) {
    msg = (
      <>
        Dr. Amaral is at sea until the same day and only gets satellite mail around 6 AM and 6 PM. Send the PI question
        first so it goes out with tonight’s sync.
      </>
    );
    btn = { label: 'Ask Dr. Amaral', kind: 'pi' };
  } else if (!s.asks.vendor) {
    msg = <>PI question is queued. The itemized invoice is the other outside dependency, so request it next.</>;
    btn = { label: 'Request itemized invoice', kind: 'vendor' };
  } else if (!replied) {
    msg = <>Both outside requests are out. Send Greg an interim reply with what you have so he knows the rest is coming.</>;
    btn = { label: 'Continue reply to Greg', kind: 'greg' };
  } else {
    msg = <>Interim reply sent. Forward the itemized invoice and Dr. Amaral’s confirmation when they arrive.</>;
  }
  return (
    <div className="deadline">
      <div className="deadline-date">
        <span className="deadline-k">Response due</span>
        <span className="deadline-v">Fri, Nov 20</span>
        <span className="deadline-s">
          {left} business day{left === 1 ? '' : 's'} after today
        </span>
      </div>
      <div className="deadline-msg">{msg}</div>
      {btn && (
        <button className="btn warn-outline" onClick={() => onOpen(btn!.kind)}>
          {btn.label}
        </button>
      )}
    </div>
  );
}

function MessageCard({ m, onDoc }: { m: Message; first: boolean; onDoc: (id: string) => void }) {
  const p = people[m.from];
  const mine = m.from === 'teodora';
  return (
    <article className={`msg ${mine ? 'mine' : ''}`}>
      <div className="avatar" style={{ background: p.tone }}>
        {initials(p.name)}
      </div>
      <div className="msg-body">
        <div className="msg-head">
          <div>
            <span className="msg-from">{mine ? 'You' : p.name}</span>
            <span className="msg-role">
              {p.role} · {p.org}
            </span>
          </div>
          <span className="msg-date">{longDate(m.date)}</span>
        </div>
        <div className="msg-to">
          to {m.to.map((x) => (x === 'teodora' ? 'you' : people[x].name)).join(', ')}
          {m.cc && m.cc.length > 0 && <> · cc {m.cc.map((x) => people[x].name).join(', ')}</>}
          {m.via === 'satellite' && <span className="sat-badge">via R/V Sea Lark satellite email</span>}
          {m.tag && <span className={m.tag.startsWith('Flagged') ? 'flag-badge' : 'queued-badge'}>{m.tag}</span>}
        </div>
        <div className="msg-text">{m.body}</div>
        {m.attachments && m.attachments.length > 0 && (
          <div className="msg-atts">
            {m.attachments.map((a) => (
              <button key={a} className="att" onClick={() => onDoc(a)}>
                <span className="att-icon">PDF</span>
                <span className="att-name">{docs[a].name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
