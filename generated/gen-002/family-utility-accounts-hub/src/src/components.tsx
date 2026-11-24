import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import {
  ACCOUNTS, Account, Bill, Contact, ItemStatus, KIND_LABEL, NOTICES, Notice, OpenItem, Property, accountById, propertyById,
} from './data';
import { IconAlert, IconCheck, IconChevronDown, IconClock, IconCopy, IconMail, IconNote, IconPhone, IconPin, IconX, KindIcon, PropertyGlyph } from './icons';
import { go, hrefFor, useStore } from './store';
import { daysBetween, daysFromNow, fmtDate, fmtLongDate, fmtMonth, hoursStatus, hoursSummary, iso, last4, money, NOW, plural } from './util';

// ---------------- Notice modal context ----------------
export const NoticeCtx = createContext<(id: string) => void>(() => {});
export const useOpenNotice = () => useContext(NoticeCtx);

// ---------------- Small bits ----------------
export function CopyButton({ text, label = 'Copy', what, iconOnly = false }: { text: string; label?: string; what?: string; iconOnly?: boolean }) {
  const [done, setDone] = useState(false);
  const { showToast } = useStore();
  return (
    <button
      className={`btn btn-ghost btn-sm copy ${done ? 'is-done' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text).catch(() => {});
        setDone(true);
        showToast(`Copied ${what ?? text}`);
        setTimeout(() => setDone(false), 1800);
      }}
      title={`Copy ${text}`}
      aria-label={`Copy ${what ?? text}`}
    >
      {done ? <IconCheck size={15} /> : <IconCopy size={15} />}
      {iconOnly ? null : done ? 'Copied' : label}
    </button>
  );
}

export function PropertyChip({ property, size = 'md' }: { property: Property; size?: 'sm' | 'md' }) {
  return (
    <span className={`pchip pchip-${size}`} style={{ ['--pc' as string]: property.color, ['--pt' as string]: property.tint }}>
      <PropertyGlyph glyph={property.glyph} size={size === 'sm' ? 13 : 15} />
      {property.name}
    </span>
  );
}

export function KindTile({ account, size = 40 }: { account: Account; size?: number }) {
  const p = propertyById(account.propertyId);
  return (
    <span className="kind-tile" style={{ width: size, height: size, background: p.tint, color: p.color }}>
      <KindIcon kind={account.kind} size={Math.round(size * 0.5)} />
    </span>
  );
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  action: 'Needs you',
  waiting: 'Waiting on provider',
  todo: 'Later',
  done: 'Done',
};

export function StatusPill({ status }: { status: ItemStatus }) {
  return <span className={`spill spill-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function DueChip({ item }: { item: OpenItem }) {
  if (item.status === 'done') {
    return <span className="due due-done"><IconCheck size={14} /> Done {item.completed ? fmtDate(item.completed) : ''}</span>;
  }
  if (item.due) {
    const n = daysFromNow(item.due);
    const urgent = n <= 7;
    return (
      <span className={`due ${urgent ? 'due-urgent' : ''}`}>
        <IconClock size={14} /> Due {fmtDate(item.due, { weekday: true })}
        <b>{n < 0 ? `${-n} days overdue` : n === 0 ? 'today' : `${plural(n, 'day')} left`}</b>
      </span>
    );
  }
  const age = daysBetween(item.opened, iso(NOW));
  if (item.status === 'waiting') {
    return <span className={`due ${age > 21 ? 'due-stale' : ''}`}><IconClock size={14} /> Open {plural(age, 'day')} · no completion date</span>;
  }
  return item.dueLabel ? <span className="due"><IconClock size={14} /> {item.dueLabel}</span> : null;
}

export function billStatusText(b: Bill): { text: string; tone: 'ok' | 'due' | 'sched' } {
  switch (b.status) {
    case 'autopaid': return { text: `Autopaid ${b.paidOn ? fmtDate(b.paidOn) : ''}`, tone: 'ok' };
    case 'paid': return { text: `Paid ${b.paidOn ? fmtDate(b.paidOn) : ''}`, tone: 'ok' };
    case 'scheduled': return { text: `Autopay on ${fmtDate(b.due)}`, tone: 'sched' };
    case 'due': return { text: `Due ${fmtDate(b.due)} · not paid yet`, tone: 'due' };
  }
}

// ---------------- Contacts ----------------
export function ContactRow({ c }: { c: Contact }) {
  const st = hoursStatus(c.hours);
  return (
    <div className="contact">
      <div className="contact-head">
        <span className="contact-label">{c.label}</span>
        {c.source && <span className="tag tag-source"><IconMail size={12} /> {c.source}</span>}
      </div>
      {c.phone && (
        <div className="contact-phone">
          <a href={`tel:${c.phone.replace(/[^\d]/g, '')}`} className="phone"><IconPhone size={16} /> {c.phone}</a>
          <CopyButton text={c.phone} label="Copy" what={`${c.label} number`} />
        </div>
      )}
      {c.address && <div className="contact-addr"><IconPin size={14} /> {c.address}</div>}
      <div className={`hours ${st.open ? 'is-open' : 'is-closed'}`}>
        <span className="dot" /> <b>{st.label}</b>
      </div>
      {c.hours !== '24/7' && <div className="hours-sum">{hoursSummary(c.hours)}</div>}
      {c.note && <div className="contact-note">{c.note}</div>}
      {c.web && <div className="contact-web">{c.web}</div>}
    </div>
  );
}

// ---------------- Notes ----------------
export function NotesPanel({ propertyId, accountId, showAccount = false, compact = false }: { propertyId: string; accountId?: string; showAccount?: boolean; compact?: boolean }) {
  const { notes, addNote, deleteNote, updateNote } = useStore();
  const mine = notes.filter((n) => n.propertyId === propertyId && (!accountId || n.accountId === accountId));
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [adding, setAdding] = useState(false);
  const p = propertyById(propertyId);
  const acct = accountId ? accountById(accountId) : undefined;

  const save = () => {
    const t = draft.trim();
    if (!t) return;
    addNote({ propertyId, accountId, text: t });
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="notes">
      {!adding ? (
        <button className="btn btn-soft btn-block" onClick={() => setAdding(true)}><IconNote size={16} /> Add a note{acct ? ` to this account` : ` for ${p.name}`}</button>
      ) : (
        <div className="note-compose">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={acct ? `e.g. Glenn texted a photo of the door tag (Nov 15)` : 'Write a note'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
              if (e.key === 'Escape') { setAdding(false); setDraft(''); }
            }}
            rows={3}
          />
          <div className="row gap8 end">
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setDraft(''); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!draft.trim()}>Save note</button>
          </div>
        </div>
      )}
      {mine.length === 0 && <p className="muted small pad-t">No notes yet.</p>}
      <ul className={`note-list ${compact ? 'compact' : ''}`}>
        {mine.map((n) => {
          const a = n.accountId ? accountById(n.accountId) : undefined;
          return (
            <li key={n.id} className="note">
              {editing === n.id ? (
                <div className="note-compose">
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} autoFocus />
                  <div className="row gap8 end">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { updateNote(n.id, editText.trim() || n.text); setEditing(null); }}>Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="note-text">{n.text}</p>
                  <div className="note-meta">
                    <span>{fmtDate(n.date)}</span>
                    {showAccount && a && <a href={hrefFor({ name: 'account', propertyId: a.propertyId, accountId: a.id })}>{a.provider}</a>}
                    <span className="spacer" />
                    <button className="linkbtn" onClick={() => { setEditing(n.id); setEditText(n.text); }}>Edit</button>
                    <button className="linkbtn danger" onClick={() => { if (confirm('Delete this note?')) deleteNote(n.id); }}>Delete</button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------- Open item card ----------------
export function ItemCard({ item, showProperty = true, showAccount = true, emphasize = false }: { item: OpenItem; showProperty?: boolean; showAccount?: boolean; emphasize?: boolean }) {
  const { logUpdate, setStatus } = useStore();
  const openNotice = useOpenNotice();
  const p = propertyById(item.propertyId);
  const a = accountById(item.accountId)!;
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [newStatus, setNewStatus] = useState<ItemStatus>(item.status);
  const [showLog, setShowLog] = useState(false);
  const lastLog = item.log[item.log.length - 1];

  useEffect(() => setNewStatus(item.status), [item.status]);

  return (
    <article className={`item item-${item.status} ${emphasize ? 'item-emph' : ''}`} style={{ ['--pc' as string]: p.color, ['--pt' as string]: p.tint }}>
      <div className="item-top">
        <StatusPill status={item.status} />
        <span className="item-kind">{item.kind}{item.ref ? ` · ${item.ref}` : ''}</span>
        <span className="spacer" />
        <DueChip item={item} />
      </div>
      <h3 className="item-title">{item.title}</h3>
      {(showProperty || showAccount) && (
        <div className="item-where">
          {showProperty && <PropertyChip property={p} size="sm" />}
          {showAccount && (
            <a className="item-acct" href={hrefFor({ name: 'account', propertyId: p.id, accountId: a.id })}>
              <KindIcon kind={a.kind} size={14} /> {a.provider} ••{last4(a.accountNumber)}
            </a>
          )}
        </div>
      )}
      <p className="item-sum">{item.summary}</p>
      {item.providerStatus && (
        <p className="item-prov">Provider status: <b>{item.providerStatus}</b>{item.status !== 'done' && item.steps && !item.steps.some((s) => s.label === 'Completed' && s.done) ? ' · not confirmed complete' : ''}</p>
      )}
      {item.steps && (
        <ol className="steps">
          {item.steps.map((s, i) => (
            <li key={s.label} className={s.done ? 'done' : i === item.steps!.findIndex((x) => !x.done) ? 'next' : ''}>
              <span className="step-dot">{s.done ? <IconCheck size={12} /> : null}</span>
              <span className="step-label">{s.label}</span>
              <span className="step-date">{s.date ? fmtDate(s.date) : '—'}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="item-log">
        {showLog ? (
          <ul>
            {item.log.slice().reverse().map((l, i) => (
              <li key={i}><span className="log-date">{fmtDate(l.date)}</span> {l.text} <span className="log-by">— {l.by}</span></li>
            ))}
          </ul>
        ) : (
          lastLog && <p><span className="log-date">Last update {fmtDate(lastLog.date)}:</span> {lastLog.text}</p>
        )}
        {item.log.length > 1 && (
          <button className="linkbtn" onClick={() => setShowLog((v) => !v)}>{showLog ? 'Hide history' : `Show history (${item.log.length})`}</button>
        )}
      </div>
      {composing ? (
        <div className="log-compose">
          <textarea
            autoFocus rows={2} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={item.id === 'oi-meter' ? 'e.g. Called Mon 7:05 AM — appointment Wed Nov 18, 8–12. Pam will open the lockbox.' : 'What happened? e.g. Called the office, spoke with…'}
          />
          <div className="row gap8">
            <label className="small muted">Status
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as ItemStatus)}>
                {(Object.keys(STATUS_LABEL) as ItemStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <span className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => { setComposing(false); setText(''); }}>Cancel</button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!text.trim() && newStatus === item.status}
              onClick={() => {
                if (text.trim()) logUpdate(item.id, text.trim(), newStatus !== item.status ? newStatus : undefined);
                else setStatus(item.id, newStatus);
                setComposing(false);
                setText('');
              }}
            >Save update</button>
          </div>
        </div>
      ) : (
        <div className="item-actions">
          {item.status !== 'done' && <button className="btn btn-soft btn-sm" onClick={() => setComposing(true)}>Log an update</button>}
          {item.noticeId && <button className="btn btn-ghost btn-sm" onClick={() => openNotice(item.noticeId!)}><IconMail size={15} /> Read the {fmtDate(NOTICES.find((n) => n.id === item.noticeId)!.received)} email</button>}
          <span className="spacer" />
          {item.status !== 'done' ? (
            !emphasize && <button className="linkbtn" onClick={() => setStatus(item.id, 'done')}>Mark done</button>
          ) : (
            item.log.length > 0 && !item.id.endsWith('2025') && <button className="linkbtn" onClick={() => setStatus(item.id, 'action')}>Reopen</button>
          )}
        </div>
      )}
    </article>
  );
}

// ---------------- Bills chart ----------------
export function BillsChart({ account }: { account: Account }) {
  const p = propertyById(account.propertyId);
  const bills = account.bills.slice().reverse(); // oldest → newest
  const [hover, setHover] = useState<number>(bills.length - 1);
  const max = Math.max(...bills.map((b) => b.amount));
  const min = Math.min(...bills.map((b) => b.amount));
  const W = 640, H = 150, pad = 4, gap = 10;
  const bw = (W - pad * 2 - gap * (bills.length - 1)) / bills.length;
  const h = bills[hover];
  return (
    <div className="chart">
      <div className="chart-read">
        <span className="chart-amt">{money(h.amount)}</span>
        <span className="chart-lbl">{h.label}{h.usage ? ` · ${h.usage}` : ''}</span>
        {h.estimated && <span className="tag tag-est">Estimated reading</span>}
        <span className="spacer" />
        <span className="muted small">Range {money(min)} – {money(max)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="chart-svg" onMouseLeave={() => setHover(bills.length - 1)} role="img" aria-label="Bill amounts, last 12 bills">
        <defs>
          <pattern id={`hatch-${account.id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fde8c4" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#d88a1a" strokeWidth="2.5" />
          </pattern>
        </defs>
        <line x1="0" x2={W} y1={H} y2={H} stroke="#d9d4ca" />
        {bills.map((b, i) => {
          const bh = Math.max(3, (b.amount / max) * (H - 10));
          const x = pad + i * (bw + gap);
          const active = i === hover;
          return (
            <g key={b.id} onMouseEnter={() => setHover(i)} style={{ cursor: 'default' }}>
              <rect x={x - gap / 2} y={0} width={bw + gap} height={H + 22} fill="transparent" />
              <rect
                x={x} y={H - bh} width={bw} height={bh} rx={3}
                fill={b.estimated ? `url(#hatch-${account.id})` : p.color}
                opacity={active ? 1 : b.estimated ? 0.9 : 0.55}
                stroke={b.estimated ? '#d88a1a' : 'none'}
              />
              <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="11" fill={active ? '#1d2430' : '#7a7468'} fontWeight={active ? 600 : 400}>
                {fmtMonth(b.issued).split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
      {bills.some((b) => b.estimated) && (
        <div className="legend"><span className="sw sw-act" style={{ background: p.color }} /> Bill from an actual reading <span className="sw sw-est" /> Bill from an estimated reading</div>
      )}
    </div>
  );
}

// ---------------- Notice modal ----------------
export function NoticeModal({ id, onClose }: { id: string; onClose: () => void }) {
  const n = NOTICES.find((x) => x.id === id)!;
  const a = accountById(n.accountId)!;
  const p = propertyById(a.propertyId);
  const { handled, toggleHandled } = useStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isHandled = !!handled[n.id];
  const dueIn = n.dueBy ? daysFromNow(n.dueBy) : null;

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={n.title} tabIndex={-1} ref={ref} style={{ ['--pc' as string]: p.color, ['--pt' as string]: p.tint }}>
        <div className="modal-ctx">
          <PropertyGlyph glyph={p.glyph} size={16} />
          <span><b>{p.name}</b> · {p.street}, {p.cityLine.split(',')[0]}</span>
          <span className="sep">›</span>
          <span>{a.provider} ••{last4(a.accountNumber)}</span>
          <span className="spacer" />
          <button className="iconbtn" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="mail-head">
            <h2>{n.title}</h2>
            <dl className="mail-meta">
              <dt>From</dt><dd>{n.from} <span className="muted">&lt;{n.fromAddress}&gt;</span></dd>
              <dt>Received</dt><dd>{fmtLongDate(n.received)}{n.receivedTime !== '—' ? `, ${n.receivedTime}` : ''} · {n.channel}</dd>
              <dt>Addressed to</dt><dd>{a.holder}{a.holder !== 'Danielle Okafor' && ' (you’re the authorized contact)'}</dd>
            </dl>
            {n.dueBy && (
              <div className={`mail-due ${isHandled ? 'ok' : ''}`}>
                {isHandled ? <IconCheck size={16} /> : <IconAlert size={16} />}
                {isHandled
                  ? <>Marked handled {fmtDate(handled[n.id])}</>
                  : <>Respond by <b>{fmtLongDate(n.dueBy)}</b> — {dueIn !== null && dueIn >= 0 ? `${plural(dueIn, 'day')} from today` : 'past due'}</>}
              </div>
            )}
          </div>
          <div className="letter">
            {n.body.map((para, i) => <p key={i}>{para.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}</p>)}
            {n.footer && <div className="letter-foot">{n.footer.map((f) => <div key={f}>{f}</div>)}</div>}
          </div>
        </div>
        <div className="modal-foot">
          {n.needsAction && (
            <button className={`btn ${isHandled ? 'btn-ghost' : 'btn-soft'}`} onClick={() => toggleHandled(n.id)}>
              {isHandled ? 'Undo “handled”' : <><IconCheck size={16} /> Mark notice handled</>}
            </button>
          )}
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => { onClose(); go({ name: 'account', propertyId: p.id, accountId: a.id }); }}>Go to this account</button>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Notice list ----------------
export function NoticeList({ notices }: { notices: Notice[] }) {
  const openNotice = useOpenNotice();
  const { handled } = useStore();
  if (notices.length === 0) return <p className="muted small">No saved notices for this account.</p>;
  return (
    <ul className="notice-list">
      {notices.map((n) => (
        <li key={n.id}>
          <button className="notice-row" onClick={() => openNotice(n.id)}>
            <span className={`notice-ic ${n.needsAction && !handled[n.id] ? 'act' : ''}`}>{n.needsAction && !handled[n.id] ? <IconAlert size={15} /> : <IconMail size={15} />}</span>
            <span className="notice-main">
              <span className="notice-title">{n.title}</span>
              <span className="notice-sub">{fmtDate(n.received)} · {n.channel.split(' (')[0]}{n.dueBy && !handled[n.id] ? ` · respond by ${fmtDate(n.dueBy)}` : ''}{handled[n.id] ? ' · handled' : ''}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------------- Search ----------------
interface SearchHit {
  key: string;
  type: 'Account' | 'Notice' | 'Phone' | 'Note' | 'Open item';
  title: string;
  sub: string;
  propertyId: string;
  hay: string;
  go: () => void;
}

export function useSearchIndex(): SearchHit[] {
  const { notes, items } = useStore();
  const openNotice = useOpenNotice();
  return useMemo(() => {
    const hits: SearchHit[] = [];
    for (const a of ACCOUNTS) {
      const p = propertyById(a.propertyId);
      const nav = () => go({ name: 'account', propertyId: p.id, accountId: a.id });
      hits.push({
        key: `a-${a.id}`, type: 'Account', title: `${a.provider} — ${KIND_LABEL[a.kind]}`, sub: `••${last4(a.accountNumber)} · ${a.holder}`, propertyId: p.id,
        hay: `${a.provider} ${KIND_LABEL[a.kind]} ${a.kind} ${a.accountNumber} ${a.accountNumber.replace(/\D/g, '')} ${a.holder} ${p.name} ${p.street} ${p.cityLine} ${a.flags.join(' ')}`, go: nav,
      });
      for (const c of a.contacts) {
        if (!c.phone) continue;
        hits.push({
          key: `c-${a.id}-${c.id}`, type: 'Phone', title: `${c.label} · ${c.phone}`, sub: a.provider, propertyId: p.id,
          hay: `${c.label} ${c.phone} ${c.phone.replace(/\D/g, '')} phone call ${a.provider} ${KIND_LABEL[a.kind]} ${p.name} ${c.note ?? ''}`, go: nav,
        });
      }
    }
    for (const n of NOTICES) {
      const a = accountById(n.accountId)!;
      hits.push({
        key: `n-${n.id}`, type: 'Notice', title: n.title, sub: `${a.provider} · ${fmtDate(n.received)}`, propertyId: a.propertyId,
        hay: `${n.title} ${n.summary} ${a.provider} ${KIND_LABEL[a.kind]} ${propertyById(a.propertyId).name} notice letter email`, go: () => openNotice(n.id),
      });
    }
    for (const it of items) {
      const a = accountById(it.accountId)!;
      hits.push({
        key: `i-${it.id}`, type: 'Open item', title: it.title, sub: `${it.ref ?? ''} · ${a.provider}`, propertyId: it.propertyId,
        hay: `${it.title} ${it.ref ?? ''} ${it.summary} ${a.provider} ${KIND_LABEL[a.kind]} ${propertyById(it.propertyId).name} request`, go: () => go({ name: 'account', propertyId: it.propertyId, accountId: it.accountId }),
      });
    }
    for (const n of notes) {
      const a = n.accountId ? accountById(n.accountId) : undefined;
      hits.push({
        key: `note-${n.id}`, type: 'Note', title: n.text.length > 70 ? n.text.slice(0, 70) + '…' : n.text, sub: `Note · ${a?.provider ?? 'Property'} · ${fmtDate(n.date)}`, propertyId: n.propertyId,
        hay: `${n.text} ${a?.provider ?? ''} ${propertyById(n.propertyId).name} note`,
        go: () => (a ? go({ name: 'account', propertyId: n.propertyId, accountId: a.id }) : go({ name: 'property', propertyId: n.propertyId })),
      });
    }
    return hits;
  }, [notes, items, openNotice]);
}

export function SearchBox() {
  const index = useSearchIndex();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onHash = () => { setQ(''); setOpen(false); inputRef.current?.blur(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onHash); };
  }, []);

  const results = useMemo(() => {
    const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const order: Record<SearchHit['type'], number> = { Account: 0, 'Open item': 1, Notice: 2, Phone: 3, Note: 4 };
    return index
      .filter((h) => { const hay = h.hay.toLowerCase(); return tokens.every((t) => hay.includes(t)); })
      .sort((a, b) => order[a.type] - order[b.type])
      .slice(0, 9);
  }, [q, index]);

  useEffect(() => setSel(0), [q]);

  const choose = (h: SearchHit) => {
    h.go();
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="search">
      <IconSearch />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          if (e.key === 'Enter' && results[sel]) choose(results[sel]);
          if (e.key === 'Escape') { setQ(''); inputRef.current?.blur(); }
        }}
        placeholder="Search accounts, account numbers, notices, phone numbers…"
        aria-label="Search"
      />
      <kbd>/</kbd>
      {open && q.trim() && (
        <div className="search-pop">
          {results.length === 0 && <div className="search-empty">Nothing matches “{q}”.</div>}
          {results.map((h, i) => {
            const p = propertyById(h.propertyId);
            return (
              <button key={h.key} className={`search-hit ${i === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(h)}>
                <span className="hit-type">{h.type}</span>
                <span className="hit-main">
                  <span className="hit-title">{h.title}</span>
                  <span className="hit-sub">{h.sub}</span>
                </span>
                <PropertyChip property={p} size="sm" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  );
}

export function Section({ title, icon, right, children, className = '' }: { title: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <header className="card-h">
        {icon}
        <h2>{title}</h2>
        <span className="spacer" />
        {right}
      </header>
      {children}
    </section>
  );
}

export function Collapse({ label, children, defaultOpen = false }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapse">
      <button className="linkbtn collapse-btn" onClick={() => setOpen((o) => !o)}>
        <IconChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} /> {label}
      </button>
      {open && children}
    </div>
  );
}


