import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initialEvent, initialGuests, ORDER } from './data';
import type { EventState, Guest } from './data';
import { EventPanel } from './EventPanel';
import { GuestsPanel } from './GuestsPanel';
import type { Row } from './GuestsPanel';
import { Envelope, InvitationCard, RsvpCard } from './Preview';
import { FILTERS, KIND_ORDER, daysBetween, eventIssues, fmtLong, fmtShort, issuesOf, money, oneLineAddress, parseISO, parseLoose } from './logic';
import type { Fix } from './logic';
import { Icon, Logo } from './ui';

type Toast = { id: number; msg: string; undo?: () => void };
type PreviewTab = 'invite' | 'rsvp' | 'envelope';

const EVENT_FIELD_ID: Partial<Record<keyof EventState, string>> = {
  names: 'names', date: 'date', ceremonyVenue: 'cvenue', rsvpBy: 'rsvp',
};

const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [event, setEvent] = useState<EventState>(initialEvent);
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [tab, setTab] = useState<'guests' | 'event'>('guests');
  const [filter, setFilter] = useState('attention');
  const [query, setQuery] = useState('');
  const [openId, setOpenIdRaw] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('envelope');
  const [envId, setEnvId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [modal, setModal] = useState<null | 'enlarge' | 'confirm'>(null);
  const [proofStage, setProofStage] = useState<'idle' | 'working' | 'done'>('idle');
  const [agreed, setAgreed] = useState(false);
  const newCounter = useRef(1);
  const toastTimer = useRef<number>(0);

  // ---- derived ----
  const issueMap = useMemo(() => new Map(guests.map((g) => [g.id, issuesOf(g, guests)])), [guests]);

  // What each row looked like when the import landed (stable sort + filter membership)
  const initial = useMemo(() => {
    const rank = new Map<string, number>();
    const cats = new Map<string, Set<string>>();
    initialGuests.forEach((g) => {
      const is = issuesOf(g, initialGuests);
      rank.set(g.id, is.length ? KIND_ORDER.indexOf(is[0].kind) : 99);
      cats.set(g.id, new Set(FILTERS.filter((f) => is.some((i) => f.kinds.includes(i.kind))).map((f) => f.id)));
    });
    return { rank, cats };
  }, []);

  // Rows that have ever needed attention stay visible (as "Fixed") until you change filters
  const everFlagged = useRef<Set<string>>(new Set());
  const cats = useRef<Map<string, Set<string>>>(new Map(initial.cats));
  guests.forEach((g) => {
    const is = issueMap.get(g.id)!;
    if (is.length) {
      everFlagged.current.add(g.id);
      const s = cats.current.get(g.id) ?? new Set<string>();
      FILTERS.forEach((f) => { if (is.some((i) => f.kinds.includes(i.kind))) s.add(f.id); });
      cats.current.set(g.id, s);
    }
  });

  const attentionRows = guests.filter((g) => issueMap.get(g.id)!.length > 0);
  const attention = attentionRows.length;
  const counts: Record<string, number> = {};
  FILTERS.forEach((f) => {
    counts[f.id] = guests.filter((g) => issueMap.get(g.id)!.some((i) => f.kinds.includes(i.kind))).length;
  });
  const pendingSwaps = guests.filter((g) => issueMap.get(g.id)!.some((i) => i.kind === 'swap')).length;

  const rankOf = (id: string) => initial.rank.get(id) ?? 50;
  const sortedAttention = useMemo(() => {
    const order = new Map(guests.map((g, i) => [g.id, i]));
    return [...guests]
      .filter((g) => issueMap.get(g.id)!.length > 0)
      .sort((a, b) => rankOf(a.id) - rankOf(b.id) || order.get(a.id)! - order.get(b.id)!);
  }, [guests, issueMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows: Row[] = useMemo(() => {
    const order = new Map(guests.map((g, i) => [g.id, i]));
    const q = query.trim().toLowerCase();
    let list: Guest[];
    if (filter === 'all') list = guests;
    else if (filter === 'attention') list = guests.filter((g) => issueMap.get(g.id)!.length > 0 || everFlagged.current.has(g.id));
    else {
      const f = FILTERS.find((x) => x.id === filter)!;
      list = guests.filter((g) => issueMap.get(g.id)!.some((i) => f.kinds.includes(i.kind)) || (cats.current.get(g.id)?.has(filter) && everFlagged.current.has(g.id)));
    }
    if (q) list = list.filter((g) => (g.name + ' ' + oneLineAddress(g)).toLowerCase().includes(q));
    if (filter !== 'all') list = [...list].sort((a, b) => rankOf(a.id) - rankOf(b.id) || order.get(a.id)! - order.get(b.id)!);
    return list.map((g) => {
      const issues = issueMap.get(g.id)!;
      return { g, issues, fixed: everFlagged.current.has(g.id) && issues.length === 0 };
    });
  }, [guests, issueMap, filter, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const evIssues = eventIssues(event);
  const totalIssues = attention + evIssues.length;
  const setsCount = guests.length;
  const subtotal = setsCount * ORDER.pricePerSet;

  const today = parseISO(ORDER.today)!;
  const orderBy = parseISO(ORDER.orderBy)!;
  const deliverBy = parseISO(ORDER.deliverBy)!;
  const daysLeft = daysBetween(today, orderBy);

  // ---- helpers ----
  const showToast = useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current);
    const id = Date.now();
    setToast({ id, msg, undo });
    toastTimer.current = window.setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 7000);
  }, []);

  const isBlankNew = (g: Guest | undefined) => !!g && g.id.startsWith('n') && !g.name && !g.line1 && !g.city && !g.postal;

  const setOpenId = useCallback((id: string | null) => {
    setOpenIdRaw((prev) => {
      if (prev && prev !== id) {
        setGuests((gs) => (isBlankNew(gs.find((g) => g.id === prev)) ? gs.filter((g) => g.id !== prev) : gs));
      }
      return id;
    });
    if (id) { setEnvId(id); setPreviewTab('envelope'); }
  }, []);

  const scrollToRow = (id: string) => {
    window.setTimeout(() => {
      const el = document.querySelector(`[data-id="${id}"]`);
      el?.scrollIntoView({ block: 'start', behavior: prefersReduced() ? 'auto' : 'smooth' });
    }, 30);
  };

  const patchGuest = (id: string, patch: Partial<Guest>) =>
    setGuests((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const removeGuest = (id: string) => {
    const idx = guests.findIndex((g) => g.id === id);
    if (idx < 0) return;
    const item = guests[idx];
    setGuests((gs) => gs.filter((g) => g.id !== id));
    if (openId === id) setOpenIdRaw(null);
    if (!isBlankNew(item)) {
      showToast(`Removed "${item.name}". ${guests.length - 1} guests left.`, () => {
        setGuests((gs) => { const c = [...gs]; c.splice(Math.min(idx, c.length), 0, item); return c; });
      });
    }
  };

  const applyFix = (g: Guest, fix: Fix) => {
    if (fix.focus) {
      document.getElementById(`f-${fix.focus}-${g.id}`)?.focus();
      return;
    }
    if (fix.removeId) { removeGuest(fix.removeId); return; }
    patchGuest(g.id, { ...(fix.patch ?? {}), ...(fix.keep ? { ack: true } : {}) });
  };

  const goNext = (fromId: string | null) => {
    const list = sortedAttention.filter((g) => g.id !== fromId);
    const idxFrom = fromId ? sortedAttention.findIndex((g) => g.id === fromId) : -1;
    // next after the current one in rank order, otherwise wrap to the first
    const after = sortedAttention.slice(idxFrom + 1).find((g) => g.id !== fromId);
    const target = after ?? list[0];
    if (!target) {
      setOpenId(null);
      showToast('All guest addresses are sorted.');
      return;
    }
    if (filter !== 'attention' && filter !== 'all') {
      const f = FILTERS.find((x) => x.id === filter)!;
      if (!issueMap.get(target.id)!.some((i) => f.kinds.includes(i.kind))) setFilter('attention');
    }
    setQuery('');
    setOpenId(target.id);
    scrollToRow(target.id);
  };

  const focusEventIssue = () => {
    const first = evIssues[0];
    if (!first) return;
    window.setTimeout(() => document.getElementById(EVENT_FIELD_ID[first.field] ?? 'rsvp')?.focus(), 60);
  };

  const reviewNext = () => {
    if (tab === 'event') {
      if (evIssues.length) { focusEventIssue(); return; }
      setTab('guests');
      goNext(null);
      return;
    }
    if (attention > 0) { goNext(openId); return; }
    if (evIssues.length) { setTab('event'); setPreviewTab('rsvp'); focusEventIssue(); }
  };

  const addGuest = () => {
    const id = `n${newCounter.current++}`;
    setGuests((gs) => [{ id, name: '', line1: '', line2: '', city: '', region: '', postal: '', country: 'United States', src: 'typed' }, ...gs]);
    setFilter('all');
    setQuery('');
    setOpenId(id);
    scrollToRow(id);
  };

  const swapAll = () => {
    const targets = guests.filter((g) => g.flag?.type === 'swap' && issueMap.get(g.id)!.some((i) => i.kind === 'swap'));
    setGuests((gs) => gs.map((g) => (g.flag?.type === 'swap' && targets.some((t) => t.id === g.id) ? { ...g, name: g.flag.fixed } : g)));
    showToast(`Swapped ${targets.length} names.`, () =>
      setGuests((gs) => gs.map((g) => (g.flag?.type === 'swap' && targets.some((t) => t.id === g.id) ? { ...g, name: g.flag.original } : g))));
  };

  // First open: show the first thing that needs doing
  useEffect(() => {
    const first = sortedAttention[0];
    if (first) { setOpenIdRaw(first.id); setEnvId(first.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && modal && proofStage !== 'working') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const closeModal = () => { setModal(null); if (proofStage === 'done') setProofStage('done'); setAgreed(false); };

  const startProof = () => {
    setProofStage('working');
    window.setTimeout(() => setProofStage('done'), 2200);
  };

  const envGuest = guests.find((g) => g.id === envId) ?? sortedAttention[0] ?? guests[0];
  const keptCount = guests.filter((g) => g.ack).length;
  const eventSet = (patch: Partial<EventState>) => setEvent((e) => ({ ...e, ...patch }));

  const steps = ['Design', 'Details & guests', 'Proof', 'Checkout'];
  const stepIdx = proofStage === 'done' && !modal ? 2 : 1;

  const wedding = parseISO(event.date);
  const rsvp = parseLoose(event.rsvpBy);

  return (
    <div className="app">
      <header className="top">
        <div className="top-in">
          <Logo />
          <nav aria-label="Order progress">
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={s} className={i < stepIdx ? 'done' : i === stepIdx ? 'now' : ''} aria-current={i === stepIdx ? 'step' : undefined}>
                  <span className="n">{i < stepIdx ? <Icon name="check" size={13} /> : i + 1}</span>{s}
                </li>
              ))}
            </ol>
          </nav>
          <div className="top-r">
            <span className="order-no">Order <b>#{ORDER.number}</b></span>
            <span className="avatar" title="Hannah Liu" aria-label="Signed in as Hannah Liu">HL</span>
          </div>
        </div>
      </header>

      <main className="wrap">
        <div className="col-main">
          <div className="titlebar">
            <div>
              <h1>Check what will be printed</h1>
              <p className="sub">
                {totalIssues > 0
                  ? <>Everything below goes on your paper exactly as written. <strong>{totalIssues} {totalIssues === 1 ? 'thing needs' : 'things need'} your attention</strong> before we can make your proof.</>
                  : <>Everything looks good. Take one last read, then we'll make your proof.</>}
              </p>
            </div>
            <div className={'deadline' + (daysLeft <= 7 ? ' soon' : '')}>
              <Icon name="clock" size={18} />
              <div>
                <b>Order by {fmtShort(orderBy)}</b>
                <span>{daysLeft} days left · delivered by {fmtShort(deliverBy)}</span>
              </div>
            </div>
          </div>

          <div className="tabs-bar">
            <div className="tabs" role="tablist" aria-label="Sections">
              <button role="tab" id="tab-guests" aria-selected={tab === 'guests'} aria-controls="panel-guests" className={tab === 'guests' ? 'on' : ''}
                onClick={() => { setTab('guests'); setPreviewTab('envelope'); }}>
                Guest addresses
                <span className="count">{guests.length}</span>
                {attention > 0 ? <span className="badge warn" aria-label={`${attention} need attention`}>{attention} to fix</span> : <span className="badge ok"><Icon name="check" size={12} />All set</span>}
              </button>
              <button role="tab" id="tab-event" aria-selected={tab === 'event'} aria-controls="panel-event" className={tab === 'event' ? 'on' : ''}
                onClick={() => { setTab('event'); setPreviewTab(evIssues.some((i) => i.field === 'rsvpBy') ? 'rsvp' : 'invite'); }}>
                Event details
                {evIssues.length > 0 ? <span className="badge err" aria-label={`${evIssues.length} need attention`}>{evIssues.length} to fix</span> : <span className="badge ok"><Icon name="check" size={12} />All set</span>}
              </button>
            </div>
            <p className="tab-note">{guests.filter((g) => g.src === 'import').length} from Marcus's spreadsheet · {guests.filter((g) => g.src === 'typed').length} typed in</p>
          </div>

          {tab === 'guests' ? (
            <GuestsPanel
              rows={rows} total={guests.length} counts={counts} attention={attention}
              filter={filter} setFilter={(f) => { setFilter(f); everFlagged.current = new Set(guests.filter((g) => issueMap.get(g.id)!.length > 0).map((g) => g.id)); }}
              query={query} setQuery={setQuery}
              openId={openId} setOpenId={setOpenId}
              onPatch={patchGuest} onFix={applyFix} onRemove={removeGuest}
              onNext={(id) => goNext(id)} onAdd={addGuest} onSwapAll={swapAll} pendingSwaps={pendingSwaps}
            />
          ) : (
            <EventPanel e={event} setE={eventSet} onPreview={(t) => setPreviewTab(t)} />
          )}
        </div>

        <aside className="col-side" aria-label="Preview and order summary">
          <section className="preview">
            <div className="ptabs" role="tablist" aria-label="Preview">
              {([['invite', 'Invitation'], ['rsvp', 'RSVP card'], ['envelope', 'Envelope']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={previewTab === k} className={previewTab === k ? 'on' : ''} onClick={() => setPreviewTab(k)}>{l}</button>
              ))}
              <button className="icon-btn" onClick={() => setModal('enlarge')} aria-label="Enlarge preview" title="Enlarge preview"><Icon name="expand" size={17} /></button>
            </div>
            <div className="stage">
              {previewTab === 'invite' && <InvitationCard e={event} size={13.5} />}
              {previewTab === 'rsvp' && <RsvpCard e={event} size={15.5} />}
              {previewTab === 'envelope' && <Envelope g={envGuest} e={event} size={15.5} />}
            </div>
            <p className="pcap">
              {previewTab === 'envelope' && envGuest ? `Envelope for ${envGuest.name || 'new guest'}` : null}
              {previewTab === 'invite' && 'Garden Arch invitation, 5 × 7 in'}
              {previewTab === 'rsvp' && 'Reply card, 5 × 3.5 in'}
            </p>
          </section>

          <section className="summary" aria-label="Order summary">
            <div className="sum-head"><h2>Order summary</h2><span>{ORDER.design}</span></div>
            <dl>
              <div><dt>{setsCount} sets</dt><dd>{money(subtotal)}</dd></div>
              <div className="sub-line"><dt>Invitation, RSVP card and addressed envelope · {money(ORDER.pricePerSet)} each</dt></div>
            </dl>
            {setsCount !== 92 && (
              <p className="sum-note"><Icon name="info" size={15} />Updated from 92 to {setsCount} sets to match your guest list.</p>
            )}
            <div className="sum-total"><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <p className="fine">Tax is added at checkout. Delivery to you is included.</p>
          </section>
        </aside>
      </main>

      <footer className="bar">
        <div className="bar-in">
          <div className="bar-status" aria-live="polite">
            {totalIssues > 0 ? (
              <>
                <span className="ring" aria-hidden="true"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" /><circle className="arc" cx="18" cy="18" r="15"
                  strokeDasharray={`${Math.max(0, 1 - totalIssues / 17) * 94.2} 94.2`} /></svg></span>
                <div><b>{totalIssues} left to resolve</b><span>{attention} {attention === 1 ? 'address' : 'addresses'}{evIssues.length ? ` · ${evIssues.length} event detail${evIssues.length > 1 ? 's' : ''}` : ''}</span></div>
              </>
            ) : (
              <>
                <span className="ring done" aria-hidden="true"><Icon name="check" size={18} /></span>
                <div><b>Everything is resolved</b><span>{setsCount} envelopes · {wedding ? fmtLong(wedding) : ''} · replies by {rsvp ? fmtLong(rsvp) : ''}</span></div>
              </>
            )}
          </div>
          <div className="bar-actions">
            <button type="button" className="btn ghost" onClick={() => showToast('Saved. You can pick this up again from your orders.')}>Save and finish later</button>
            {totalIssues > 0 ? (
              <button type="button" className="btn primary lg" onClick={reviewNext}>Review next issue <Icon name="arrow" size={16} /></button>
            ) : (
              <button type="button" className="btn primary lg" onClick={() => { setProofStage('idle'); setModal('confirm'); }}>Generate proof <Icon name="arrow" size={16} /></button>
            )}
          </div>
        </div>
      </footer>

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.msg}</span>
          {toast.undo && <button onClick={() => { toast.undo!(); setToast(null); }}>Undo</button>}
          <button className="x" aria-label="Dismiss" onClick={() => setToast(null)}><Icon name="close" size={15} /></button>
        </div>
      )}

      {modal === 'enlarge' && (
        <div className="scrim" onClick={closeModal}>
          <div className="modal big" role="dialog" aria-modal="true" aria-label="Preview" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn close" onClick={closeModal} aria-label="Close preview" autoFocus><Icon name="close" /></button>
            {previewTab === 'invite' && <InvitationCard e={event} size={21} />}
            {previewTab === 'rsvp' && <RsvpCard e={event} size={26} />}
            {previewTab === 'envelope' && <Envelope g={envGuest} e={event} size={26} />}
          </div>
        </div>
      )}

      {modal === 'confirm' && (
        <div className="scrim" onClick={() => proofStage !== 'working' && closeModal()}>
          <div className="modal confirm" role="dialog" aria-modal="true" aria-labelledby="cm-title" onClick={(e) => e.stopPropagation()}>
            {proofStage === 'idle' && (
              <>
                <h2 id="cm-title">One last read before we make your proof</h2>
                <p className="lead-p">Printed items can't be corrected, so check these once more.</p>
                <dl className="readback">
                  <div><dt>Names</dt><dd>{event.names}</dd></div>
                  <div><dt>Wedding</dt><dd>{wedding ? fmtFull0(wedding) : ''}, ceremony at {event.ceremonyVenue}</dd></div>
                  <div><dt>Reply by</dt><dd>{rsvp ? fmtLong(rsvp) : ''}</dd></div>
                  <div><dt>Envelopes</dt><dd>{setsCount} addressed envelopes{keptCount > 0 ? `, ${keptCount} you chose to print exactly as entered` : ''}</dd></div>
                </dl>
                <label className="agree">
                  <input type="checkbox" autoFocus checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                  <span>I've checked every name, date and address. I understand they print exactly as shown.</span>
                </label>
                <div className="m-actions">
                  <button className="btn" onClick={closeModal}>Back to details</button>
                  <button className="btn primary" disabled={!agreed} onClick={startProof}>Generate proof</button>
                </div>
              </>
            )}
            {proofStage === 'working' && (
              <div className="working" role="status">
                <div className="spinner" aria-hidden="true" />
                <h2 id="cm-title">Making your proof</h2>
                <p className="lead-p">Setting {setsCount} envelopes, your invitation and RSVP card.</p>
              </div>
            )}
            {proofStage === 'done' && (
              <div className="working" role="status">
                <span className="big-check"><Icon name="check" size={28} /></span>
                <h2 id="cm-title">Your proof is ready</h2>
                <p className="lead-p">Next you'll review it page by page, then place your order by {fmtLong(orderBy)}.</p>
                <div className="m-actions center"><button className="btn primary" onClick={closeModal} autoFocus>Continue to proof</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtFull0(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
