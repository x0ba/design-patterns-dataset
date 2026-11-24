import type { ReactNode } from 'react';
import { CHARGE, GREG_DRAFT_START, docs, grants, people, type Grant, type Thread } from './data';
import { type AppState, type Ask, type DraftKind, gregReplied } from './state';
import { dayDate, kb, longDate, money, monthDay } from './util';

interface Props {
  s: AppState;
  thread: Thread;
  onOpenDraft: (k: DraftKind, t?: Thread) => void;
  onDoc: (id: string) => void;
  onCostTransfer: () => void;
  onOpenThread: (id: string) => void;
  onFollowUp: (k: 'pi' | 'vendor', date: string) => void;
  onReceived: (k: 'pi' | 'vendor') => void;
  onSubmitReimb: () => void;
}

export function ContextPane(p: Props) {
  const { thread } = p;
  return (
    <aside className="context">
      {thread.id === 'amaral' && <Reachability />}
      {thread.chargeId && (
        <>
          <ChargeCard s={p.s} />
          <Checklist {...p} />
          <Documents s={p.s} onDoc={p.onDoc} />
        </>
      )}
      {thread.recordId === 'reimb' && <ReimbRecord s={p.s} onSubmit={p.onSubmitReimb} onDoc={p.onDoc} />}
      {thread.recordId === 'credit' && <CreditRecord onFollowUp={() => p.onOpenDraft('reply', thread)} />}
      <GrantCard g={grants[thread.grantId]} s={p.s} showLines={!!thread.chargeId} />
    </aside>
  );
}

function Section({ title, aside, children, className = '' }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`cx ${className}`}>
      <header className="cx-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

function Reachability() {
  return (
    <Section title="Reaching Dr. Amaral" className="reach">
      <dl className="kv">
        <dt>Where</dt>
        <dd>Aboard R/V Sea Lark until Fri, Nov 20</dd>
        <dt>Email</dt>
        <dd>Satellite, syncs ~6 AM and ~6 PM PT</dd>
        <dt>Limits</dt>
        <dd>Plain text, short. Attachments over 50 KB bounce</dd>
        <dt>Last heard</dt>
        <dd>Sun, Nov 8 · 6:04 AM</dd>
      </dl>
    </Section>
  );
}

function ChargeCard({ s }: { s: AppState }) {
  const fixed = !!s.costTransfer;
  return (
    <Section
      title="Flagged charge"
      aside={<span className="pill due">Possibly unallowable</span>}
      className="charge-card"
    >
      <div className="charge-amt">
        <span className="amt">$4,312.60</span>
        <span className="charge-v">
          {CHARGE.vendor} · <span className="mono">{CHARGE.invoice}</span>
        </span>
      </div>
      <dl className="kv">
        <dt>Invoice date</dt>
        <dd>Fri, Oct 9 · posted Oct 14</dd>
        <dt>Memo</dt>
        <dd>“{CHARGE.memo}”</dd>
        <dt>Coded to</dt>
        <dd>
          <span className={fixed ? 'strike' : 'bad-code'}>
            {CHARGE.codedName} <span className="mono">{CHARGE.codedCode}</span>
          </span>
        </dd>
        <dt>{fixed ? 'Transfer to' : 'Should be'}</dt>
        <dd>
          <span className="good-code">
            {CHARGE.correctName} <span className="mono">{CHARGE.correctCode}</span>
          </span>
          {fixed && <span className="muted small"> · {s.costTransfer!.id} pending</span>}
        </dd>
        <dt>Flagged</dt>
        <dd>Nov 13 by Greg Tanaka, post-award review</dd>
      </dl>
      <p className="consequence">
        If not documented by <strong>Fri, Nov 20</strong>, it moves off the grant to the station’s unrestricted account.
      </p>
    </Section>
  );
}

type St = 'done' | 'wait' | 'progress' | 'todo';

function Checklist({ s, onOpenDraft, onDoc, onCostTransfer, onFollowUp, onReceived, onOpenThread }: Props) {
  const replied = gregReplied(s);
  const gregThread = s.threads.find((t) => t.id === 'greg')!;
  const myLast = [...gregThread.messages].reverse().find((m) => m.from === 'teodora');
  const draft = s.drafts.greg;
  const drafting = draft && draft.body.trim().length > GREG_DRAFT_START.trim().length + 20;

  const items: {
    key: string;
    label: string;
    who: string;
    st: St;
    detail: ReactNode;
    actions?: ReactNode;
  }[] = [
    {
      key: 'just',
      label: 'Written justification',
      who: 'You',
      st: replied ? 'done' : drafting ? 'progress' : 'todo',
      detail: replied
        ? `Sent to Greg ${longDate(myLast!.date)}`
        : drafting
          ? 'Draft in progress'
          : draft
            ? 'Draft started, two sentences so far'
            : 'Not started',
      actions: !replied || draft ? (
        <button className="link" onClick={() => onOpenDraft('greg')}>
          {draft ? 'Open draft' : 'Write'}
        </button>
      ) : undefined,
    },
    askItem(
      'vendor',
      'Itemized invoice',
      'Pacific Marine Fuel · Dana Whitcomb',
      s.asks.vendor,
      'Gallons, unit price, fees, vessel',
      'Request',
      () => onOpenDraft('vendor'),
      onFollowUp,
      onReceived,
      () => onOpenThread('pmf'),
      !!s.drafts.vendor,
    ),
    {
      key: 'vlog',
      label: 'Vessel log for the cruise',
      who: 'On file · from Wes Haldane, Oct 31',
      st: 'done',
      detail: 'Oct 7–11, shows the 889 gal delivery on Oct 9',
      actions: (
        <button className="link" onClick={() => onDoc('vlog')}>
          View
        </button>
      ),
    },
    askItem(
      'pi',
      'PI confirmation',
      'Dr. Amaral · at sea, satellite only',
      s.asks.pi,
      'Cruise dates, sole use, Oct 10 ride-along',
      'Ask',
      () => onOpenDraft('pi'),
      onFollowUp,
      onReceived,
      () => onOpenThread('amaral'),
      !!s.drafts.pi,
    ),
    {
      key: 'ct',
      label: 'Cost transfer 53110 → 54620',
      who: 'You → grants office',
      st: s.costTransfer ? 'done' : 'todo',
      detail: s.costTransfer ? `${s.costTransfer.id} submitted ${longDate(s.costTransfer.submittedAt)}` : 'Not prepared · 33 days since posting',
      actions: s.costTransfer ? (
        <button className="link" onClick={() => onDoc('ct')}>
          View
        </button>
      ) : (
        <button className="link" onClick={onCostTransfer}>
          Prepare
        </button>
      ),
    },
  ];

  const done = items.filter((i) => i.st === 'done').length;

  return (
    <Section
      title="What Greg needs by Nov 20"
      aside={
        <span className="progress-t">
          {done} of {items.length} ready
        </span>
      }
    >
      <div className="progress">
        {items.map((i) => (
          <span key={i.key} className={`seg ${i.st}`} />
        ))}
      </div>
      <ol className="checklist">
        {items.map((i) => (
          <li key={i.key} className={`ck ${i.st}`}>
            <span className="ck-mark" aria-hidden>
              {i.st === 'done' ? '✓' : i.st === 'wait' ? '◷' : i.st === 'progress' ? '…' : ''}
            </span>
            <div className="ck-body">
              <div className="ck-top">
                <span className="ck-label">{i.label}</span>
                <span className="ck-actions">{i.actions}</span>
              </div>
              <div className="ck-who">{i.who}</div>
              <div className="ck-detail">{i.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const FOLLOW_OPTS = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];

function askItem(
  k: 'pi' | 'vendor',
  label: string,
  who: string,
  ask: Ask | undefined,
  hint: string,
  verb: string,
  open: () => void,
  onFollowUp: Props['onFollowUp'],
  onReceived: Props['onReceived'],
  viewThread: () => void,
  hasDraft: boolean,
) {
  if (!ask) {
    return {
      key: k,
      label,
      who,
      st: 'todo' as St,
      detail: hasDraft ? `Draft ready, not sent · ${hint}` : `Not ${k === 'pi' ? 'asked' : 'requested'} · ${hint}`,
      actions: (
        <button className="link strong" onClick={open}>
          {hasDraft ? 'Open draft' : verb}
        </button>
      ),
    };
  }
  if (ask.status === 'received') {
    return {
      key: k,
      label,
      who,
      st: 'done' as St,
      detail: 'Marked received',
      actions: (
        <button className="link" onClick={viewThread}>
          Thread
        </button>
      ),
    };
  }
  return {
    key: k,
    label,
    who,
    st: 'wait' as St,
    detail: (
      <span className="wait-detail">
        {k === 'pi' ? 'Queued' : 'Requested'} {longDate(ask.sentAt)}
        {k === 'pi' && <> · goes out ~6 PM</>}
        <label className="remind">
          Remind me
          <select value={ask.followUp} onChange={(e) => onFollowUp(k, e.target.value)}>
            {FOLLOW_OPTS.map((o) => (
              <option key={o} value={o}>
                {dayDate(o)}
              </option>
            ))}
          </select>
        </label>
      </span>
    ),
    actions: (
      <>
        <button className="link" onClick={viewThread}>
          Thread
        </button>
        <button className="link" onClick={() => onReceived(k)}>
          Mark received
        </button>
      </>
    ),
  };
}

function Documents({ s, onDoc }: { s: AppState; onDoc: (id: string) => void }) {
  const list = ['cruise', 'vlog', 'invoice', 'receipt', ...(s.costTransfer ? ['ct'] : [])];
  return (
    <Section title="Documents on this charge" aside={<span className="muted small">{list.length}</span>}>
      <ul className="doclist">
        {list.map((id) => {
          const d = docs[id];
          return (
            <li key={id}>
              <button className="doc" onClick={() => onDoc(id)}>
                <span className="att-icon">PDF</span>
                <span className="doc-main">
                  <span className="doc-sum">{d.summary}</span>
                  <span className="doc-src">
                    {d.source} · {kb(d.sizeKB)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="note">The dive-gear receipt (Oct 7–10) is from another thread, but it backs up the cruise dates independently.</p>
    </Section>
  );
}

function GrantCard({ g, s, showLines }: { g: Grant; s: AppState; showLines: boolean }) {
  const spent = g.total - g.remaining;
  const spentPct = spent / g.total;
  const ct = !!s.costTransfer;
  return (
    <Section title={`${g.sponsor} ${g.number}`} aside={<span className="muted small">{g.yearLabel}</span>}>
      <div className="grant-title">{g.title}</div>
      <div className="grant-meta">
        PI {people[g.pi].name} · {g.period}
      </div>
      <div className="grant-rem">
        <span className="amt-sm">{money(g.remaining)}</span>
        <span className="muted"> remaining of {money(g.total)}</span>
      </div>
      <div className="burn" aria-label={`${Math.round(spentPct * 100)}% spent, ${Math.round(g.yearFraction * 100)}% of period elapsed`}>
        <div className="burn-fill" style={{ width: `${spentPct * 100}%` }} />
        <div className="burn-time" style={{ left: `${g.yearFraction * 100}%` }} />
      </div>
      <div className="burn-legend">
        <span>
          <i className="lg spent" /> {Math.round(spentPct * 100)}% spent
        </span>
        <span>
          <i className="lg time" /> {Math.round(g.yearFraction * 100)}% of period elapsed
        </span>
      </div>
      {showLines && g.lines && (
        <table className="lines">
          <thead>
            <tr>
              <th>Category</th>
              <th className="num">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {g.lines.map((l) => {
              const rem = l.budget - l.spent;
              const hl = l.code === '54620' || l.code === '53110';
              const delta = !ct ? 0 : l.code === '54620' ? -CHARGE.amount : l.code === '53110' ? CHARGE.amount : 0;
              return (
                <tr key={l.code} className={hl ? 'hl' : ''}>
                  <td>
                    {l.name}
                    {hl && <span className="mono code"> {l.code}</span>}
                  </td>
                  <td className="num">
                    {delta !== 0 ? (
                      <>
                        <span className="was">{money(rem)}</span> {money(rem + delta, true)}
                      </>
                    ) : (
                      money(rem)
                    )}
                    <div className="minibar">
                      <div style={{ width: `${Math.min(100, (l.spent / l.budget) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {showLines && (
        <p className="note">
          {ct
            ? 'Showing remaining balances after the pending cost transfer.'
            : 'The cost transfer moves $4,312.60 from Field supplies to Vessel operations. Total remaining is unchanged.'}
        </p>
      )}
    </Section>
  );
}

function ReimbRecord({ s, onSubmit, onDoc }: { s: AppState; onSubmit: () => void; onDoc: (id: string) => void }) {
  const done = !!s.reimbSubmitted;
  return (
    <Section title="Reimbursement" aside={<span className={`pill ${done ? 'wait' : 'action'}`}>{done ? 'Submitted' : 'Ready to submit'}</span>}>
      <div className="charge-amt">
        <span className="amt">$286.00</span>
        <span className="charge-v">Mateo Fuentes · Breakwater Dive & Rental</span>
      </div>
      <dl className="kv">
        <dt>For</dt>
        <dd>2 drysuits + 2 regulator sets, Oct 7–10 (SL-26-14)</dd>
        <dt>Charge to</dt>
        <dd>
          OCE-2291 · Field supplies <span className="mono">53110</span>
        </dd>
        <dt>Paid with</dt>
        <dd>Personal card</dd>
      </dl>
      <ul className="checks">
        <li className="ok">PI approval: Dr. Amaral, Nov 8 (satellite)</li>
        <li className="ok">
          Dated receipt:{' '}
          <button className="link" onClick={() => onDoc('receipt')}>
            received Nov 12
          </button>
        </li>
        <li className="ok">Within 60 days of purchase: 37 days</li>
      </ul>
      {done ? (
        <p className="note">Submitted as RB-11408 {longDate(s.reimbSubmitted!)}. AP usually pays in 7–10 business days.</p>
      ) : (
        <button className="btn primary block" onClick={onSubmit}>
          Submit to Accounts Payable
        </button>
      )}
    </Section>
  );
}

function CreditRecord({ onFollowUp }: { onFollowUp: () => void }) {
  return (
    <Section title="Expected credit" aside={<span className="pill wait">Not posted yet</span>}>
      <div className="charge-amt">
        <span className="amt">$1,150.00</span>
        <span className="charge-v">
          Tidewater Scientific · <span className="mono">CM-40127</span>
        </span>
      </div>
      <dl className="kv">
        <dt>Returned</dt>
        <dd>Underwater PAR sensor, S/N TQ-55102 (RMA 7731)</dd>
        <dt>Original charge</dt>
        <dd>
          Sep 18 · OCE-2307 · PO <span className="mono">4500918842</span>
        </dd>
        <dt>Promised</dt>
        <dd>Nov 4: “within 7–10 business days”, so by {monthDay('2026-11-18')}</dd>
        <dt>Must post to</dt>
        <dd>Same PO and award, not as a check</dd>
      </dl>
      <button className="btn ghost block" onClick={onFollowUp}>
        Draft a follow-up to Rosa
      </button>
    </Section>
  );
}
