import { useEffect, useRef, useState } from 'react';
import { docs, gregSnippets, people, type Thread } from './data';
import { type AppState, type Draft, type DraftKind, CHARGE_KINDS, gregReplied } from './state';
import { kb } from './util';

const SAT_LIMIT_KB = 50;
const SAT_TARGET_CHARS = 600;

const TAB_LABEL: Record<DraftKind, string> = {
  greg: 'Reply to Greg',
  pi: 'Ask Dr. Amaral',
  vendor: 'Request invoice',
  reply: 'Reply',
};

interface Props {
  s: AppState;
  thread: Thread;
  onOpen: (k: DraftKind, t?: Thread) => void;
  onSetActive: (id: string) => void;
  onToggle: (open: boolean) => void;
  onUpdate: (id: string, patch: Partial<Draft>) => void;
  onDiscard: (id: string) => void;
  onSend: (id: string) => void;
  onDoc: (id: string) => void;
}

export function Composer({ s, thread, onOpen, onSetActive, onToggle, onUpdate, onDiscard, onSend, onDoc }: Props) {
  const isCharge = !!thread.chargeId;
  const drafts: Draft[] = isCharge
    ? CHARGE_KINDS.map((k) => s.drafts[k]).filter(Boolean)
    : s.drafts[`reply-${thread.id}`]
      ? [s.drafts[`reply-${thread.id}`]]
      : [];

  const ghosts: DraftKind[] = [];
  if (isCharge) {
    if (!s.drafts.greg && !gregReplied(s)) ghosts.push('greg');
    if (!s.drafts.pi && !s.asks.pi) ghosts.push('pi');
    if (!s.drafts.vendor && !s.asks.vendor) ghosts.push('vendor');
  }

  const active = drafts.find((d) => d.id === s.activeDraftId) ?? drafts[0];
  const open = s.composerOpen && !!active;

  if (!isCharge && drafts.length === 0) {
    if (thread.status === 'closed') return null;
    const other = thread.participants.find((p) => p !== 'teodora')!;
    return (
      <div className="composer collapsed">
        <button className="reply-bar" onClick={() => onOpen('reply', thread)}>
          Reply to {people[other].name}…
        </button>
      </div>
    );
  }

  if (isCharge && drafts.length === 0 && ghosts.length === 0) {
    return (
      <div className="composer collapsed">
        <div className="comp-tabs">
          <span className="comp-tabs-k">Drafts for PMF-88213</span>
          <span className="comp-none">All drafts sent. Track replies in the panel on the right.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`composer ${open ? 'open' : 'collapsed'}`}>
      <div className="comp-tabs">
        {isCharge && <span className="comp-tabs-k">Drafts for PMF-88213</span>}
        {drafts.map((d) => (
          <button
            key={d.id}
            className={`comp-tab ${open && active?.id === d.id ? 'on' : ''}`}
            onClick={() => (open && active?.id === d.id ? onToggle(false) : onSetActive(d.id))}
          >
            {d.channel === 'satellite' && <span className="sat-mini">SAT</span>}
            {d.kind === 'reply' ? `Reply to ${people[d.to[0]].name}` : TAB_LABEL[d.kind]}
          </button>
        ))}
        {ghosts.map((k) => (
          <button key={k} className="comp-tab ghost" onClick={() => onOpen(k)}>
            + {TAB_LABEL[k]}
          </button>
        ))}
        <span className="grow" />
        {active && (
          <button className="icon-btn" onClick={() => onToggle(!open)} aria-label={open ? 'Collapse composer' : 'Expand composer'}>
            {open ? (
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 9l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            )}
          </button>
        )}
      </div>
      {open && active && (
        <DraftEditor
          key={active.id}
          d={active}
          s={s}
          onUpdate={(patch) => onUpdate(active.id, patch)}
          onDiscard={() => onDiscard(active.id)}
          onSend={() => onSend(active.id)}
          onDoc={onDoc}
          threadDocs={thread.messages.flatMap((m) => m.attachments ?? [])}
        />
      )}
    </div>
  );
}

function DraftEditor({
  d,
  s,
  onUpdate,
  onDiscard,
  onSend,
  onDoc,
  threadDocs,
}: {
  d: Draft;
  s: AppState;
  onUpdate: (p: Partial<Draft>) => void;
  onDiscard: () => void;
  onSend: () => void;
  onDoc: (id: string) => void;
  threadDocs: string[];
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState<'insert' | 'attach' | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const sat = d.channel === 'satellite';

  useEffect(() => {
    const el = ta.current;
    if (el) {
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.menu-wrap')) setMenu(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  const insert = (text: string) => {
    const el = ta.current;
    const body = d.body;
    const start = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const pre = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const post = after.startsWith('\n') || after.length === 0 ? '\n\n' : '\n\n';
    const next = before + pre + text + post + after.replace(/^\n+/, '');
    onUpdate({ body: next });
    setMenu(null);
    requestAnimationFrame(() => {
      if (!el) return;
      const pos = (before + pre + text + post).length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const attachable = Array.from(
    new Set(
      d.kind === 'reply'
        ? threadDocs
        : ['vlog', 'cruise', 'invoice', 'receipt', ...(s.costTransfer ? ['ct'] : [])],
    ),
  );

  const toggleAtt = (id: string) =>
    onUpdate({
      attachments: d.attachments.includes(id) ? d.attachments.filter((a) => a !== id) : [...d.attachments, id],
    });

  const tooBig = sat ? d.attachments.filter((a) => docs[a].sizeKB > SAT_LIMIT_KB) : [];
  const canSend = d.body.trim().length > 0 && tooBig.length === 0;

  // Package check (reply to Greg only)
  const pkg =
    d.kind === 'greg'
      ? [
          {
            label: 'Vessel log',
            state: d.attachments.includes('vlog') ? 'ok' : 'todo',
            note: d.attachments.includes('vlog') ? 'attached' : 'not attached',
            fix: d.attachments.includes('vlog') ? undefined : () => toggleAtt('vlog'),
          },
          {
            label: 'Cruise plan',
            state: d.attachments.includes('cruise') ? 'ok' : 'todo',
            note: d.attachments.includes('cruise') ? 'attached' : 'not attached',
            fix: d.attachments.includes('cruise') ? undefined : () => toggleAtt('cruise'),
          },
          {
            label: 'Cost transfer',
            state: s.costTransfer ? (d.attachments.includes('ct') ? 'ok' : 'todo') : 'missing',
            note: s.costTransfer ? (d.attachments.includes('ct') ? 'attached' : 'submitted, not attached') : 'not prepared',
            fix: s.costTransfer && !d.attachments.includes('ct') ? () => toggleAtt('ct') : undefined,
          },
          {
            label: 'Itemized invoice',
            state: s.asks.vendor ? (s.asks.vendor.status === 'received' ? 'ok' : 'wait') : 'missing',
            note: s.asks.vendor ? (s.asks.vendor.status === 'received' ? 'received' : 'requested') : 'not requested',
          },
          {
            label: 'PI confirmation',
            state: s.asks.pi ? (s.asks.pi.status === 'received' ? 'ok' : 'wait') : 'missing',
            note: s.asks.pi ? (s.asks.pi.status === 'received' ? 'received' : 'asked') : 'not asked',
          },
        ]
      : null;
  const pkgComplete = pkg ? pkg.every((p) => p.state === 'ok') : true;

  const to = people[d.to[0]];

  return (
    <div className="editor" onKeyDown={(e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSend) {
        e.preventDefault();
        onSend();
      }
    }}>
      <div className="fields">
        <div className="field">
          <span className="field-k">To</span>
          <span className="recip">
            <strong>{to.name}</strong> <span className="muted">&lt;{to.email}&gt;</span>
          </span>
        </div>
        <div className="field">
          <span className="field-k">Subject</span>
          <input
            className="subject-input"
            value={d.subject}
            onChange={(e) => onUpdate({ subject: e.target.value })}
            aria-label="Subject"
          />
        </div>
      </div>

      {sat && (
        <div className="sat-notice">
          <strong>Satellite email to R/V Sea Lark.</strong> Plain text only, attachments over {SAT_LIMIT_KB} KB bounce.
          Syncs around 6 AM and 6 PM PT, so this goes out tonight and the earliest reply is Tue morning.
        </div>
      )}

      <div className="toolbar">
        {d.kind === 'greg' && (
          <div className="menu-wrap">
            <button className={`tool ${menu === 'insert' ? 'on' : ''}`} onClick={() => setMenu(menu === 'insert' ? null : 'insert')}>
              Insert from record ▾
            </button>
            {menu === 'insert' && (
              <div className="menu">
                <div className="menu-k">Inserts at cursor. Facts come from the linked records.</div>
                {gregSnippets.map((sn) => {
                  const used = d.body.includes(sn.text.slice(0, 40));
                  return (
                    <button key={sn.id} className="menu-item" onClick={() => insert(sn.text)}>
                      <span className="mi-l">
                        {sn.label}
                        {used && <span className="mi-used">in draft</span>}
                      </span>
                      <span className="mi-s">{sn.source}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="menu-wrap">
          <button className={`tool ${menu === 'attach' ? 'on' : ''}`} onClick={() => setMenu(menu === 'attach' ? null : 'attach')}>
            Attach ▾
          </button>
          {menu === 'attach' && (
            <div className="menu">
              <div className="menu-k">Documents linked to this {d.kind === 'reply' ? 'thread' : 'charge'}</div>
              {attachable.length === 0 && <div className="menu-empty">No linked documents.</div>}
              {attachable.map((a) => {
                const big = sat && docs[a].sizeKB > SAT_LIMIT_KB;
                const on = d.attachments.includes(a);
                return (
                  <button key={a} className={`menu-item ${big ? 'disabled' : ''}`} disabled={big} onClick={() => toggleAtt(a)}>
                    <span className="mi-l">
                      <span className={`check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
                      {docs[a].summary}
                    </span>
                    <span className="mi-s">{big ? `${kb(docs[a].sizeKB)} · would bounce` : kb(docs[a].sizeKB)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <span className="grow" />
        {sat ? (
          <span className={`charcount ${d.body.length > SAT_TARGET_CHARS ? 'over' : ''}`}>
            {d.body.length} chars · keep under {SAT_TARGET_CHARS}
          </span>
        ) : (
          <span className="hint">⌘↩ to send</span>
        )}
      </div>

      <textarea
        ref={ta}
        className="body-input"
        value={d.body}
        onChange={(e) => onUpdate({ body: e.target.value })}
        aria-label="Message body"
        spellCheck
      />

      {d.attachments.length > 0 && (
        <div className="draft-atts">
          {d.attachments.map((a) => (
            <span key={a} className={`att small ${tooBig.includes(a) ? 'bad' : ''}`}>
              <button className="att-open" onClick={() => onDoc(a)}>
                <span className="att-icon">PDF</span>
                <span className="att-name">{docs[a].name}</span>
                <span className="att-size">{kb(docs[a].sizeKB)}</span>
              </button>
              <button className="att-x" onClick={() => toggleAtt(a)} aria-label={`Remove ${docs[a].name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className={`comp-foot ${pkg ? 'with-pkg' : ''}`}>
        {pkg ? (
          <div className="pkg">
            <span className="pkg-k">Greg asked for:</span>
            {pkg.map((p) => (
              <button
                key={p.label}
                className={`pkg-item ${p.state}`}
                onClick={p.fix}
                disabled={!p.fix}
                title={p.fix ? 'Click to attach' : undefined}
              >
                <span className="pkg-dot" />
                {p.label}
                {p.state !== 'ok' && <span className="pkg-note">{p.note}</span>}
              </button>
            ))}
          </div>
        ) : d.kind === 'pi' ? (
          <div className="foot-hint">Ledgerline will remind you Thu, Nov 19 if there’s no reply, a day before Greg’s deadline.</div>
        ) : d.kind === 'vendor' ? (
          <div className="foot-hint">Files a new thread under PMF-88213. Ledgerline will remind you Wed, Nov 18 if there’s no reply.</div>
        ) : (
          <div className="foot-hint" />
        )}
        <div className="foot-actions">
          {confirmDiscard ? (
            <>
              <span className="muted small">Discard this draft?</span>
              <button className="btn ghost" onClick={() => setConfirmDiscard(false)}>
                Keep
              </button>
              <button className="btn danger" onClick={onDiscard}>
                Discard
              </button>
            </>
          ) : (
            <button className="btn ghost" onClick={() => setConfirmDiscard(true)}>
              Discard
            </button>
          )}
          <button className="btn primary" disabled={!canSend} onClick={onSend} title={tooBig.length ? 'Remove attachments over 50 KB first' : undefined}>
            {sat ? 'Queue for satellite sync' : d.kind === 'greg' && !pkgComplete ? 'Send interim reply' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
