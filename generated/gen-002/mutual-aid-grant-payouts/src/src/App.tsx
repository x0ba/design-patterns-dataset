import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ABE_QUEUE,
  Activity,
  ActivityKind,
  BASE_NOW,
  COSIGN_OVER,
  FundRequest,
  INITIAL_ACTIVITY,
  INITIAL_PAYOUTS,
  ME,
  Method,
  NEXT_SEND,
  PARTNER,
  POT,
  Payout,
  QUARTER_CAP,
  REQUESTS,
  TREASURER,
} from './data';

/* ---------- helpers ---------- */

const LOAD_AT = Date.now();
const now = () => new Date(BASE_NOW.getTime() + (Date.now() - LOAD_AT));

const money = (n: number) => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtTime = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
};
const fmtDay = (d: Date) => `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
const isToday = (d: Date) => d.toDateString() === BASE_NOW.toDateString();
const fmtWhen = (d: Date) => (isToday(d) ? `Today ${fmtTime(d)}` : `${fmtDay(d)}, ${fmtTime(d)}`);

const priorTotal = (r: FundRequest) => r.prior.reduce((s, p) => s + p.amount, 0);
const capRoom = (r: FundRequest) => Math.max(0, QUARTER_CAP - priorTotal(r));

type RowStatus = 'open' | 'awaiting' | 'committed' | 'declined';
interface RowState {
  draft: string;
  status: RowStatus;
  payoutId?: string;
  askedAt?: Date;
  declineReason?: string;
  lastVoid?: { at: Date; reason: string };
}

interface Check {
  amount: number | null;
  error?: string;
  needsAbe: boolean;
  abeOk: boolean;
}

function checkAmount(r: FundRequest, draft: string, available: number): Check {
  const t = draft.trim();
  if (!t) return { amount: null, needsAbe: false, abeOk: false };
  if (!/^\d+$/.test(t)) return { amount: null, error: 'Whole dollars only', needsAbe: false, abeOk: false };
  const n = parseInt(t, 10);
  const needsAbe = n > COSIGN_OVER;
  const abeOk = !!r.abeAgreed && n <= r.abeAgreed.upTo;
  if (n === 0) return { amount: null, error: 'Enter an amount above $0', needsAbe, abeOk };
  if (n > r.requested) return { amount: n, error: `More than the ${money(r.requested)} asked`, needsAbe, abeOk };
  if (n > capRoom(r))
    return {
      amount: n,
      error: `Over quarter cap. ${money(capRoom(r))} room left`,
      needsAbe,
      abeOk,
    };
  if (n > available) return { amount: n, error: `Only ${money(available)} available`, needsAbe, abeOk };
  return { amount: n, needsAbe, abeOk };
}

/* ---------- small components ---------- */

const METHOD_CLASS: Record<Method, string> = {
  Venmo: 'm-venmo',
  'Cash App': 'm-cashapp',
  Zelle: 'm-zelle',
  'Cash pickup': 'm-cash',
};

function MethodTag({ method }: { method: Method }) {
  return <span className={`method ${METHOD_CLASS[method]}`}>{method}</span>;
}

function Icon({ name, size = 14 }: { name: 'check' | 'warn' | 'x' | 'clock' | 'chev' | 'info' | 'undo'; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (name) {
    case 'check':
      return <svg {...p}><path d="M3 8.5l3.2 3L13 4.5" /></svg>;
    case 'warn':
      return <svg {...p}><path d="M8 2.2L14.5 13.5h-13z" /><path d="M8 6.5v3" /><path d="M8 11.6v.1" /></svg>;
    case 'x':
      return <svg {...p}><path d="M4 4l8 8M12 4l-8 8" /></svg>;
    case 'clock':
      return <svg {...p}><circle cx="8" cy="8" r="6" /><path d="M8 4.8V8l2.2 1.6" /></svg>;
    case 'chev':
      return <svg {...p}><path d="M6 4l4 4-4 4" /></svg>;
    case 'info':
      return <svg {...p}><circle cx="8" cy="8" r="6" /><path d="M8 7.2v3.6" /><path d="M8 5v.1" /></svg>;
    case 'undo':
      return <svg {...p}><path d="M5 3L2.5 5.5 5 8" /><path d="M2.5 5.5H10a3.5 3.5 0 010 7H6" /></svg>;
  }
}

function Modal({ title, onClose, children, width = 560 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector<HTMLElement>('[data-autofocus]');
    first?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ width }} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [payouts, setPayouts] = useState<Payout[]>(INITIAL_PAYOUTS);
  const [activity, setActivity] = useState<Activity[]>(INITIAL_ACTIVITY);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(REQUESTS.map((r) => [r.id, { draft: '', status: 'open' as RowStatus }])),
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<'batch' | 'sent' | 'activity'>('batch');
  const [commitFor, setCommitFor] = useState<string | null>(null);
  const [voidFor, setVoidFor] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; payoutId?: string } | null>(null);
  const [clock, setClock] = useState(now());
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(now()), 15000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(t);
  }, [toast]);

  const sent = payouts.filter((p) => p.status === 'sent');
  const committed = payouts.filter((p) => p.status === 'committed');
  const sentTotal = sent.reduce((s, p) => s + p.amount, 0);
  const committedTotal = committed.reduce((s, p) => s + p.amount, 0);
  const available = POT - sentTotal - committedTotal;

  const checks = useMemo(() => {
    const out: Record<string, Check> = {};
    for (const r of REQUESTS) out[r.id] = checkAmount(r, rows[r.id].draft, available);
    return out;
  }, [rows, available]);

  const draftTotal = REQUESTS.reduce((s, r) => {
    const st = rows[r.id];
    const c = checks[r.id];
    if ((st.status === 'open' || st.status === 'awaiting') && c.amount) return s + c.amount;
    return s;
  }, 0);
  const draftCount = REQUESTS.filter((r) => {
    const st = rows[r.id];
    return (st.status === 'open' || st.status === 'awaiting') && checks[r.id].amount;
  }).length;
  const myTonight = payouts
    .filter((p) => p.status === 'committed' && p.committedBy === ME && isToday(p.committedAt))
    .reduce((s, p) => s + p.amount, 0);
  const leftAfterDrafts = available - draftTotal;
  const evenSplit = 1070;

  const log = (kind: ActivityKind, text: string, amount?: number, payoutId?: string, who = ME) =>
    setActivity((a) => [...a, { id: `a${a.length + 1}-${Date.now()}`, at: now(), who, kind, text, amount, payoutId }]);

  const setRow = (id: string, patch: Partial<RowState>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const nextPayoutId = () => {
    const max = Math.max(...payouts.map((p) => parseInt(p.id.slice(2), 10)));
    return `P-${max + 1}`;
  };

  const doCommit = (r: FundRequest, amount: number) => {
    const id = nextPayoutId();
    const cosign = amount > COSIGN_OVER ? PARTNER : undefined;
    const p: Payout = {
      id,
      requestId: r.id,
      name: r.name,
      category: r.category,
      amount,
      method: r.method,
      handle: r.handle,
      status: 'committed',
      committedBy: ME,
      cosignedBy: cosign,
      committedAt: now(),
      mine: true,
    };
    setPayouts((ps) => [...ps, p]);
    setRow(r.id, { status: 'committed', payoutId: id });
    log(
      'commit',
      `committed ${money(amount)} to ${r.name} ${r.method === 'Cash pickup' ? 'for cash pickup' : `via ${r.method} ${r.handle}`}${cosign ? `, co-signed by ${cosign}` : ''}`,
      amount,
      id,
    );
    setCommitFor(null);
    setTab('batch');
    setFlash(id);
    setTimeout(() => setFlash(null), 2400);
    setToast({ text: `${money(amount)} to ${r.name} is in Thursday’s batch.`, payoutId: id });
  };

  const doVoid = (p: Payout, reason: string) => {
    setPayouts((ps) => ps.map((x) => (x.id === p.id ? { ...x, status: 'voided', voidedBy: ME, voidedAt: now(), voidReason: reason } : x)));
    const req = REQUESTS.find((r) => r.id === p.requestId);
    if (req) setRow(req.id, { status: 'open', payoutId: undefined, draft: String(p.amount), lastVoid: { at: now(), reason } });
    log('void', `voided ${money(p.amount)} to ${p.name} (${reason.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}). ${money(p.amount)} returned to the pot.`, p.amount, p.id);
    setVoidFor(null);
    setToast({ text: `Voided ${money(p.amount)} to ${p.name}. ${money(p.amount)} is back in the November pot.` });
  };

  const askAbe = (r: FundRequest, amount: number) => {
    setRow(r.id, { status: 'awaiting', askedAt: now() });
    log('ask', `asked ${PARTNER} to co-sign ${money(amount)} for ${r.name} (${r.id})`, amount);
    setToast({ text: `Sent to ${PARTNER}. ${money(amount)} for ${r.name} stays in your drafts until he co-signs.` });
  };

  const withdrawAsk = (r: FundRequest) => {
    setRow(r.id, { status: 'open', askedAt: undefined });
    log('withdraw', `withdrew the co-sign request for ${r.name} (${r.id})`);
  };

  const decline = (r: FundRequest, reason: string) => {
    setRow(r.id, { status: 'declined', declineReason: reason });
    log('decline', `marked ${r.name} (${r.id}) not funded this round: ${reason}`);
    setDeclineFor(null);
  };

  const reopen = (r: FundRequest) => {
    setRow(r.id, { status: 'open', declineReason: undefined });
    log('reopen', `reopened ${r.name} (${r.id})`);
  };

  const commitReq = REQUESTS.find((r) => r.id === commitFor) || null;
  const voidPayout = payouts.find((p) => p.id === voidFor) || null;
  const declineReq = REQUESTS.find((r) => r.id === declineFor) || null;

  const msToSend = NEXT_SEND.getTime() - clock.getTime();
  const hrs = Math.floor(msToSend / 3600000);
  const mins = Math.floor((msToSend % 3600000) / 60000);

  const committedMine = REQUESTS.filter((r) => rows[r.id].status === 'committed').length;
  const decided = REQUESTS.filter((r) => rows[r.id].status === 'committed' || rows[r.id].status === 'declined').length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            <svg viewBox="0 0 32 32" width="26" height="26"><rect width="32" height="32" rx="7" fill="#1e5446" /><path d="M9 14h14v7a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" fill="#f6efe3" /><path d="M13 10h6" stroke="#f6efe3" strokeWidth="2.4" strokeLinecap="round" /><path d="M23 16h2.2a2 2 0 0 1 0 4H23" stroke="#f6efe3" strokeWidth="2" fill="none" /></svg>
          </span>
          <span className="brand-name">Kettlefund</span>
          <span className="brand-sub">Linden &amp; Fourth Mutual Aid · Emergency fund</span>
        </div>
        <div className="top-mid">
          <span className="sendclock">
            <Icon name="clock" />
            Next send <strong>Thu Nov 19, 12:00 pm</strong>
            <span className="muted">· in {hrs} h {mins} m · {TREASURER} (treasurer)</span>
          </span>
        </div>
        <div className="me">
          <div className="me-text">
            <strong>Dani Ruiz</strong>
            <span>Fund committee with Abe · week of Nov 16</span>
          </div>
          <span className="avatar">DR</span>
        </div>
      </header>

      <section className="fund">
        <div className="fund-main">
          <div className="fund-kicker">November fund · available now</div>
          <div className="fund-big">{money(available)}</div>
          <div className="fund-of">
            left of the {money(POT)} donated for November
          </div>
        </div>
        <div className="fund-bar-wrap">
          <div className="fund-bar" role="img" aria-label="November pot breakdown">
            <span className="seg seg-sent" style={{ width: `${(sentTotal / POT) * 100}%` }} />
            <span className="seg seg-committed" style={{ width: `${(committedTotal / POT) * 100}%` }} />
            <span className={`seg seg-draft ${leftAfterDrafts < 0 ? 'over' : ''}`} style={{ width: `${(Math.min(draftTotal, Math.max(available, 0)) / POT) * 100}%` }} />
            <span className="seg seg-left" style={{ flex: 1 }} />
          </div>
          <div className="legend">
            <span><i className="sw sw-sent" />Sent {money(sentTotal)}</span>
            <span><i className="sw sw-committed" />Committed {money(committedTotal)}</span>
            <span><i className="sw sw-draft" />Your drafts {money(draftTotal)}</span>
            <span><i className="sw sw-left" />Unplanned {money(Math.max(leftAfterDrafts, 0))}</span>
          </div>
        </div>
        <div className="fund-stats">
          <div className="stat">
            <span className="stat-label">Your drafts</span>
            <span className="stat-val">{money(draftTotal)}</span>
            <span className="stat-sub">{draftCount} of 9 requests · not committed</span>
          </div>
          <div className={`stat ${leftAfterDrafts < 0 ? 'stat-bad' : ''}`}>
            <span className="stat-label">Left if you commit them</span>
            <span className="stat-val">{money(leftAfterDrafts)}</span>
            <span className="stat-sub">
              {leftAfterDrafts < 0 ? 'More than the fund has' : `Abe’s 9 requests ask ${money(ABE_QUEUE.asked)}`}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">You tonight</span>
            <span className="stat-val">{money(myTonight + draftTotal)}</span>
            <span className="stat-sub">
              {money(myTonight)} committed + drafts · even split ≈ {money(evenSplit)}
            </span>
          </div>
        </div>
      </section>

      <main className="body">
        <section className="panel requests">
          <div className="panel-head">
            <div>
              <h1>Your requests</h1>
              <p className="panel-sub">
                {decided} of 9 decided · {committedMine} committed · Abe has the other 9, {money(ABE_QUEUE.asked)} asked · {ABE_QUEUE.lastActive}
              </p>
            </div>
            <ul className="rules">
              <li><strong>{money(QUARTER_CAP)}</strong> per household per quarter (Oct–Dec)</li>
              <li>Over <strong>{money(COSIGN_OVER)}</strong> needs both reviewers</li>
              <li>Void any time before {TREASURER} marks it sent</li>
            </ul>
          </div>

          <div className="grid-head">
            <span>Requester</span>
            <span>Need</span>
            <span className="num">Asked / Q4 room</span>
            <span>Pays to</span>
            <span>Grant</span>
          </div>

          <div className="rows">
            {REQUESTS.map((r) => (
              <RequestRow
                key={r.id}
                r={r}
                st={rows[r.id]}
                check={checks[r.id]}
                payout={payouts.find((p) => p.id === rows[r.id].payoutId)}
                expanded={expanded === r.id}
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                onDraft={(v) => setRow(r.id, { draft: v })}
                onCommit={() => setCommitFor(r.id)}
                onAsk={(n) => askAbe(r, n)}
                onWithdraw={() => withdrawAsk(r)}
                onDecline={() => setDeclineFor(r.id)}
                onReopen={() => reopen(r)}
                onVoid={(pid) => setVoidFor(pid)}
              />
            ))}
          </div>
        </section>

        <aside className="panel side">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'batch'} className={tab === 'batch' ? 'on' : ''} onClick={() => setTab('batch')}>
              Thursday batch <span className="count">{committed.length}</span>
            </button>
            <button role="tab" aria-selected={tab === 'sent'} className={tab === 'sent' ? 'on' : ''} onClick={() => setTab('sent')}>
              Sent in Nov <span className="count">{sent.length}</span>
            </button>
            <button role="tab" aria-selected={tab === 'activity'} className={tab === 'activity' ? 'on' : ''} onClick={() => setTab('activity')}>
              Activity
            </button>
          </div>

          {tab === 'batch' && (
            <div className="side-body">
              <div className="batch-head">
                <div>
                  <div className="batch-title">Goes out Thu Nov 19 at noon</div>
                  <div className="batch-sub">Committed, not sent. Any committee member can void until {TREASURER} marks it sent; the money returns to the pot.</div>
                </div>
                <div className="batch-total">{money(committedTotal)}</div>
              </div>
              <ul className="plist">
                {[...committed].reverse().map((p) => (
                  <li key={p.id} className={`pitem ${flash === p.id ? 'flash' : ''}`}>
                    <div className="pitem-top">
                      <span className="pname">
                        {p.name}
                        {p.mine && isToday(p.committedAt) && <span className="new">New</span>}
                      </span>
                      <span className="pamt">{money(p.amount)}</span>
                    </div>
                    <div className="pitem-pay">
                      <MethodTag method={p.method} />
                      <code className="handle">{p.handle}</code>
                    </div>
                    <div className="pitem-foot">
                      <span className="pmeta">
                        {p.id} · {p.category} · by {p.committedBy === ME ? 'you' : p.committedBy}
                        {p.cosignedBy && <> + {p.cosignedBy === ME ? 'you' : p.cosignedBy}</>} · {fmtWhen(p.committedAt)}
                      </span>
                      <button className="link danger" onClick={() => setVoidFor(p.id)}>Void</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'sent' && (
            <div className="side-body">
              <div className="batch-head">
                <div>
                  <div className="batch-title">Sent by {TREASURER} this month</div>
                  <div className="batch-sub">Sent payouts can’t be voided from here. Problems go to {TREASURER} directly.</div>
                </div>
                <div className="batch-total">{money(sentTotal)}</div>
              </div>
              <ul className="plist">
                {[...sent].reverse().map((p) => (
                  <li key={p.id} className="pitem sent">
                    <div className="pitem-top">
                      <span className="pname">{p.name}</span>
                      <span className="pamt">{money(p.amount)}</span>
                    </div>
                    <div className="pitem-pay">
                      <MethodTag method={p.method} />
                      <code className="handle">{p.handle}</code>
                    </div>
                    <div className="pitem-foot">
                      <span className="pmeta">{p.id} · committed by {p.committedBy}{p.cosignedBy ? ` + ${p.cosignedBy}` : ''}</span>
                      <span className="sent-tag"><Icon name="check" size={12} /> Sent {fmtDay(p.sentAt!)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {payouts.some((p) => p.status === 'voided') && (
                <>
                  <div className="sub-label">Voided</div>
                  <ul className="plist">
                    {payouts.filter((p) => p.status === 'voided').reverse().map((p) => (
                      <li key={p.id} className="pitem voided">
                        <div className="pitem-top">
                          <span className="pname">{p.name}</span>
                          <span className="pamt strike">{money(p.amount)}</span>
                        </div>
                        <div className="pitem-pay">
                          <MethodTag method={p.method} />
                          <code className="handle">{p.handle}</code>
                        </div>
                        <div className="pmeta">Voided by {p.voidedBy === ME ? 'you' : p.voidedBy} · {fmtWhen(p.voidedAt!)} · {p.voidReason}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="side-body">
              <ol className="activity">
                {[...activity].sort((a, b) => b.at.getTime() - a.at.getTime()).map((a, i, arr) => {
                  const day = fmtDay(a.at);
                  const showDay = i === 0 || fmtDay(arr[i - 1].at) !== day;
                  return (
                    <li key={a.id}>
                      {showDay && <div className="act-day">{isToday(a.at) ? `Today · ${day}` : day}</div>}
                      <div className={`act act-${a.kind}`}>
                        <span className="act-dot" />
                        <div>
                          <div className="act-text">
                            <strong>{a.who === ME ? 'You' : a.who}</strong> {a.text}
                          </div>
                          <div className="act-time">
                            {fmtTime(a.at)}
                            {a.payoutId && <> · {a.payoutId}</>}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </aside>
      </main>

      {commitReq && (
        <CommitModal
          r={commitReq}
          amount={checks[commitReq.id].amount!}
          available={available}
          onClose={() => setCommitFor(null)}
          onCommit={(n) => doCommit(commitReq, n)}
        />
      )}
      {voidPayout && <VoidModal p={voidPayout} available={available} onClose={() => setVoidFor(null)} onVoid={(reason) => doVoid(voidPayout, reason)} />}
      {declineReq && <DeclineModal r={declineReq} onClose={() => setDeclineFor(null)} onDecline={(reason) => decline(declineReq, reason)} />}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          <span>{toast.text}</span>
          {toast.payoutId && payouts.find((p) => p.id === toast.payoutId)?.status === 'committed' && (
            <button className="link light" onClick={() => { setVoidFor(toast.payoutId!); setToast(null); }}>Void</button>
          )}
          <button className="icon-btn light" aria-label="Dismiss" onClick={() => setToast(null)}><Icon name="x" /></button>
        </div>
      )}
    </div>
  );
}

/* ---------- request row ---------- */

function RequestRow(props: {
  r: FundRequest;
  st: RowState;
  check: Check;
  payout?: Payout;
  expanded: boolean;
  onToggle: () => void;
  onDraft: (v: string) => void;
  onCommit: () => void;
  onAsk: (n: number) => void;
  onWithdraw: () => void;
  onDecline: () => void;
  onReopen: () => void;
  onVoid: (pid: string) => void;
}) {
  const { r, st, check, payout, expanded } = props;
  const room = capRoom(r);
  const prior = priorTotal(r);
  const isOpen = st.status === 'open';
  const canAct = isOpen && check.amount !== null && !check.error;
  const needsAsk = canAct && check.needsAbe && !check.abeOk;

  return (
    <div className={`row st-${st.status} ${expanded ? 'is-expanded' : ''} lvl-${r.urgency.level}`}>
      <div className="row-main">
        <button className="cell who" onClick={props.onToggle} aria-expanded={expanded}>
          <span className={`chev ${expanded ? 'open' : ''}`}><Icon name="chev" size={12} /></span>
          <span>
            <span className="who-name">
              {r.name}
              {r.alias && <span className="alias">alias</span>}
            </span>
            <span className="who-sub">{r.id} · {r.household}</span>
          </span>
        </button>

        <div className="cell need">
          <span className="cat">{r.category}</span>
          <span className={`urg urg-${r.urgency.level}`}>
            {r.urgency.level === 'critical' && <Icon name="warn" size={12} />}
            {r.urgency.label}
          </span>
        </div>

        <div className="cell num amounts">
          <span className="asked">{money(r.requested)}</span>
          <span className={`room ${room < r.requested ? 'limited' : ''}`}>
            {prior > 0 ? `${money(room)} left` : `${money(room)} room`}
          </span>
        </div>

        <div className="cell pay">
          <MethodTag method={r.method} />
          <code className="handle" title={r.handle}>{r.method === 'Cash pickup' ? 'St. Brendan’s hall' : r.handle}</code>
          {r.handleNote?.tone === 'warn' && (
            <span className="handle-flag"><Icon name="warn" size={11} /> {r.handleNote.short}</span>
          )}
          {r.handleNote?.tone === 'ok' && (
            <span className="handle-ok"><Icon name="check" size={11} /> {r.handleNote.short}</span>
          )}
        </div>

        <div className="cell grant">
          {st.status === 'open' && (
            <>
              <div className="grant-line">
                <label className={`money-input ${check.error ? 'bad' : ''}`}>
                  <span>$</span>
                  <input
                    inputMode="numeric"
                    aria-label={`Grant amount for ${r.name}`}
                    placeholder=""
                    value={st.draft}
                    onChange={(e) => props.onDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                  />
                </label>
                {needsAsk ? (
                  <button className="btn btn-secondary" onClick={() => props.onAsk(check.amount!)}>Ask Abe to co-sign</button>
                ) : (
                  <button className="btn btn-primary" disabled={!canAct} onClick={props.onCommit}>Review &amp; commit</button>
                )}
              </div>
              <div className="grant-hint">
                {check.error ? (
                  <span className="err">{check.error}</span>
                ) : needsAsk ? (
                  <span className="note">Over {money(COSIGN_OVER)}. Needs Abe, or lower to {money(COSIGN_OVER)}</span>
                ) : check.amount && check.needsAbe && check.abeOk ? (
                  <span className="ok"><Icon name="check" size={11} /> Abe agreed up to {money(r.abeAgreed!.upTo)}</span>
                ) : (
                  <span className="quick">
                    {st.lastVoid ? (
                      <span className="err" title={st.lastVoid.reason}>Voided {fmtTime(st.lastVoid.at)}</span>
                    ) : room >= r.requested ? (
                      <button className="chip" onClick={() => props.onDraft(String(r.requested))}>Full {money(r.requested)}</button>
                    ) : (
                      <button className="chip" onClick={() => props.onDraft(String(room))}>Cap room {money(room)}</button>
                    )}
                    <button className="link subtle" onClick={props.onDecline}>Not this round</button>
                  </span>
                )}
              </div>
            </>
          )}

          {st.status === 'awaiting' && (
            <div className="state-box awaiting">
              <div className="state-title"><Icon name="clock" size={12} /> {money(check.amount || 0)} · waiting on Abe</div>
              <div className="state-sub">
                Asked {st.askedAt ? fmtTime(st.askedAt) : ''} · held in your drafts ·{' '}
                <button className="link" onClick={props.onWithdraw}>Withdraw</button>
              </div>
            </div>
          )}

          {st.status === 'committed' && payout && (
            <div className="state-box committed">
              <div className="state-title"><Icon name="check" size={12} /> {money(payout.amount)} committed</div>
              <div className="state-sub">
                {payout.id} · Thursday batch ·{' '}
                <button className="link danger" onClick={() => props.onVoid(payout.id)}>Void</button>
              </div>
            </div>
          )}

          {st.status === 'declined' && (
            <div className="state-box declined">
              <div className="state-title">Not this round</div>
              <div className="state-sub">
                {st.declineReason} ·{' '}
                <button className="link" onClick={props.onReopen}>Reopen</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!expanded && <div className="story-line" onClick={props.onToggle}>{r.story}</div>}

      {expanded && (
        <div className="detail">
          <div className="detail-col">
            <div className="d-label">Their request · received {r.received}</div>
            <p className="d-story">{r.story}</p>
            {r.urgency.detail && (
              <p className="d-urgent"><Icon name="warn" size={12} /> {r.urgency.detail}</p>
            )}
            {r.abeAgreed && (
              <div className="d-abe">
                <div className="d-label">Abe’s note · {r.abeAgreed.at}</div>
                <p>“{r.abeAgreed.note}”</p>
              </div>
            )}
          </div>
          <div className="detail-col">
            <div className="d-label">This quarter (Oct–Dec)</div>
            {r.prior.length === 0 ? (
              <p className="d-plain">No grants yet this quarter. Full {money(QUARTER_CAP)} available.</p>
            ) : (
              <ul className="d-prior">
                {r.prior.map((p) => (
                  <li key={p.date}>
                    <span>{p.date}</span>
                    <span>{money(p.amount)}</span>
                    <span><code>{p.handle}</code></span>
                  </li>
                ))}
                <li className="d-prior-total">
                  <span>Room left</span>
                  <span>{money(room)}</span>
                  <span>of {money(QUARTER_CAP)} cap</span>
                </li>
              </ul>
            )}
            <div className="d-label" style={{ marginTop: 12 }}>Payment</div>
            {r.method === 'Cash pickup' ? (
              <p className="d-plain">{r.handle}. {r.pickup}</p>
            ) : (
              <p className={`d-handle tone-${r.handleNote?.tone || 'info'}`}>{r.handleNote?.text}</p>
            )}
            {st.lastVoid && (
              <p className="d-void">
                <Icon name="undo" size={12} /> You voided an earlier commit at {fmtTime(st.lastVoid.at)}: {st.lastVoid.reason}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- commit modal ---------- */

function CommitModal({ r, amount, available, onClose, onCommit }: { r: FundRequest; amount: number; available: number; onClose: () => void; onCommit: (n: number) => void }) {
  const [typed, setTyped] = useState('');
  const room = capRoom(r);
  const prior = priorTotal(r);
  const isCash = r.method === 'Cash pickup';
  const confirmOk = isCash || (r.confirm && typed.trim().toLowerCase() === r.confirm.value.toLowerCase());
  const typedWrong = !isCash && typed.length >= (r.confirm?.value.length || 4) && !confirmOk;
  const needsAbe = amount > COSIGN_OVER;
  const priorHandles = Array.from(new Set(r.prior.map((p) => p.handle)));
  const handleChanged = priorHandles.length > 0 && !priorHandles.includes(r.handle);

  return (
    <Modal title={`Commit ${money(amount)} to ${r.name}`} onClose={onClose} width={600}>
      <div className="modal-body">
        <div className={`payto ${handleChanged ? 'payto-warn' : ''}`}>
          <div className="payto-label">
            Pays to · <MethodTag method={r.method} />
          </div>
          <div className="payto-handle">{r.handle}</div>
          <div className="payto-who">
            {r.name}{r.alias ? ' (alias)' : ''} · {r.id}
          </div>
          {isCash ? (
            <div className="payto-note">{r.pickup}</div>
          ) : (
            r.handleNote && (
              <div className={`payto-note tone-${r.handleNote.tone}`}>
                {r.handleNote.tone === 'warn' ? <Icon name="warn" size={13} /> : r.handleNote.tone === 'ok' ? <Icon name="check" size={13} /> : <Icon name="info" size={13} />}
                <span>{r.handleNote.text}</span>
              </div>
            )
          )}
        </div>

        <ul className="checks">
          <li className="ok">
            <Icon name="check" />
            <span className="ck-label">Amount</span>
            <span>{money(amount)} of {money(r.requested)} asked{amount < r.requested ? ` (${money(r.requested - amount)} less)` : ''}</span>
          </li>
          <li className="ok">
            <Icon name="check" />
            <span className="ck-label">Quarter cap</span>
            <span>
              {prior > 0 ? `${money(prior)} already this quarter → ` : ''}
              {money(prior + amount)} of {money(QUARTER_CAP)} after this{room - amount > 0 ? '' : ' (at cap)'}
            </span>
          </li>
          <li className="ok">
            <Icon name="check" />
            <span className="ck-label">Second reviewer</span>
            <span>
              {needsAbe ? `Over ${money(COSIGN_OVER)}: Abe agreed up to ${money(r.abeAgreed!.upTo)} (${r.abeAgreed!.at})` : `${money(COSIGN_OVER)} or under: your sign-off is enough`}
            </span>
          </li>
          <li className="ok">
            <Icon name="check" />
            <span className="ck-label">Fund</span>
            <span>Available goes {money(available)} → {money(available - amount)}</span>
          </li>
          <li className={r.urgency.level === 'critical' ? 'ok strong' : 'ok'}>
            <Icon name="clock" />
            <span className="ck-label">Timing</span>
            <span>
              {TREASURER} sends Thu Nov 19 at noon
              {r.urgency.level === 'critical' ? ', 2 days before the Nov 21 shutoff' : ''}
              {isCash ? '. Cash waits at the hall for pickup' : ''}
            </span>
          </li>
        </ul>

        {!isCash && r.confirm && (
          <div className="confirm-field">
            <label htmlFor="confirm-handle">
              Check it against the request. Type the <strong>{r.confirm.label}</strong>
            </label>
            <div className="confirm-row">
              <input
                id="confirm-handle"
                data-autofocus
                autoComplete="off"
                spellCheck={false}
                maxLength={12}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmOk && onCommit(amount)}
                className={confirmOk ? 'good' : typedWrong ? 'bad' : ''}
              />
              {confirmOk && <span className="ok"><Icon name="check" size={13} /> Matches</span>}
              {typedWrong && <span className="err">Doesn’t match {r.handle}</span>}
            </div>
          </div>
        )}

        <p className="void-note">
          You can void this until {TREASURER} marks it sent on Thursday. Voiding puts the {money(amount)} back in the pot.
        </p>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!confirmOk} data-autofocus={isCash ? true : undefined} onClick={() => onCommit(amount)}>
          Commit {money(amount)} to {r.name}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- void modal ---------- */

const VOID_REASONS = [
  'Wrong payment handle.',
  'Wrong amount.',
  'Requester no longer needs it.',
  'Duplicate of another payout.',
  'Committed to the wrong request.',
];

function VoidModal({ p, available, onClose, onVoid }: { p: Payout; available: number; onClose: () => void; onVoid: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const final = reason === 'other' ? other.trim() : reason;
  const others = p.committedBy !== ME;
  return (
    <Modal title={`Void ${money(p.amount)} to ${p.name}?`} onClose={onClose} width={520}>
      <div className="modal-body">
        <div className="void-summary">
          <div>
            <MethodTag method={p.method} /> <code className="handle">{p.handle}</code>
          </div>
          <div className="pmeta">
            {p.id} · committed by {p.committedBy === ME ? 'you' : p.committedBy}{p.cosignedBy ? ` + ${p.cosignedBy === ME ? 'you' : p.cosignedBy}` : ''} · {fmtWhen(p.committedAt)}
          </div>
        </div>
        <p className="void-effect">
          It comes out of Thursday’s batch and {money(p.amount)} returns to the November pot. Available goes{' '}
          <strong>{money(available)} → {money(available + p.amount)}</strong>.
          {p.requestId && REQUESTS.some((r) => r.id === p.requestId) ? ' The request reopens in your list so you can fix and recommit it.' : ''}
        </p>
        {others && <p className="void-others"><Icon name="info" size={13} /> {p.committedBy} committed this one. The void is logged under your name; let {p.committedBy} know why.</p>}
        <fieldset className="reasons">
          <legend>Reason (goes in the activity record)</legend>
          {VOID_REASONS.map((r) => (
            <label key={r}>
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
              {r.replace(/\.$/, '')}
            </label>
          ))}
          <label>
            <input type="radio" name="reason" checked={reason === 'other'} onChange={() => setReason('other')} />
            Something else
          </label>
          {reason === 'other' && (
            <input className="text" autoFocus placeholder="What happened?" value={other} onChange={(e) => setOther(e.target.value)} />
          )}
        </fieldset>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose} data-autofocus>Keep it</button>
        <button className="btn btn-danger" disabled={!final} onClick={() => onVoid(/[.!?]$/.test(final) ? final : final + '.')}>
          Void and return {money(p.amount)}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- decline modal ---------- */

const DECLINE_REASONS = ['Fund is stretched this month', 'Referred to another resource', 'Couldn’t reach them to confirm', 'Outside fund guidelines'];

function DeclineModal({ r, onClose, onDecline }: { r: FundRequest; onClose: () => void; onDecline: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title={`Not funding ${r.name} this round`} onClose={onClose} width={480}>
      <div className="modal-body">
        <p className="void-effect">Nothing is sent and no money moves. You can reopen it any time this week.</p>
        <fieldset className="reasons">
          <legend>Reason</legend>
          {DECLINE_REASONS.map((x) => (
            <label key={x}>
              <input type="radio" name="dreason" checked={reason === x} onChange={() => setReason(x)} />
              {x}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose} data-autofocus>Cancel</button>
        <button className="btn btn-secondary" disabled={!reason} onClick={() => onDecline(reason)}>Mark not this round</button>
      </div>
    </Modal>
  );
}
