import { useMemo, useState } from 'react';
import { STAFF, TYPE_LABEL, TYPE_ORDER } from '../data';
import { daysBetween, editionsBetween, fDay, fDuration, fTime, iso, money } from '../dates';
import { STATUS_LONG, STATUS_ORDER, urgencyKey, isValidPending, isThreat, type Derived } from '../logic';
import { useApp } from '../store';
import type { NoticeType, StaffId, Status } from '../types';
import { Avatar, Icon, InsChip, StatusPill } from './ui';
import type { View } from '../App';

type Counts = Record<Status, number>;

export function Overview({ counts, go }: { counts: Counts; go: (v: View, f?: 'all' | 'threats' | 'routine') => void }) {
  const { state, derived, messages } = useApp();
  const [bannerOpen, setBannerOpen] = useState(true);
  const threats = messages.filter((m) => isThreat(m, { ...state.alerts, mode: 'threats' })).length;

  const urgent = state.notices
    .filter((n) => {
      const s = derived.get(n.id)!.status;
      return s === 'at_risk' || s === 'missed';
    })
    .sort((a, b) => {
      const da = derived.get(a.id)!;
      const db = derived.get(b.id)!;
      return da.lastLegal.localeCompare(db.lastLegal);
    });

  const affidavitsIn = state.notices.filter((n) => n.affidavitReceived && n.affidavitReceived >= '2025-11-14').length;

  return (
    <div className="overview">
      <div className="page-head">
        <div>
          <h1>Since Friday</h1>
          <p className="sub">
            {state.notices.length} active notices · meetings Nov 18 – Jan 14 · since Fri Nov 14 the paper sent{' '}
            <button className="link" onClick={() => go('messages', 'all')}>
              {messages.length} messages
            </button>
            ;{' '}
            <button className="link strong" onClick={() => go('messages', 'threats')}>
              {threats} affect a hearing date
            </button>
            . {affidavitsIn} affidavits arrived.
          </p>
        </div>
        {state.alerts.mode === 'all' ? (
          <button className="noise-callout" onClick={() => go('alerts')}>
            <Icon name="bell" size={16} />
            <div>
              <strong>Your alerts fire on every status change</strong>
              <span>
                {messages.length} alerts since Friday; threats-only would have sent {threats}.
              </span>
            </div>
            <Icon name="chevron" size={16} />
          </button>
        ) : (
          <button className="noise-callout calm" onClick={() => go('alerts')}>
            <Icon name="bell" size={16} />
            <div>
              <strong>Alerts: deadline threats only</strong>
              <span>Routine paper traffic is logged, not pushed. Edit rules</span>
            </div>
            <Icon name="chevron" size={16} />
          </button>
        )}
      </div>

      {bannerOpen && (
        <section className="paper-banner">
          <div className="pb-icon">
            <Icon name="paper" size={20} />
          </div>
          <div className="pb-body">
            <div className="pb-title">The Courier-Ledger changed two things on Friday that affect your notices</div>
            <div className="pb-items">
              <div>
                <span className="pb-k">Legal cutoff</span>
                Now <strong>12:00 PM, two business days</strong> before print — was 5:00 PM, one business day. Effective with the Sat Nov 15 edition.
              </div>
              <div>
                <span className="pb-k">Thanksgiving</span>
                <strong>No print edition Thu Nov 27.</strong> Legals run Wed Nov 26; legal desk closed Nov 27–28.
              </div>
            </div>
          </div>
          <div className="pb-side">
            <span>3 notices affected</span>
            <button className="btn ghost sm" onClick={() => go('calendar')}>
              View calendar
            </button>
            <button className="icon-btn" aria-label="Hide" onClick={() => setBannerOpen(false)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        </section>
      )}

      <section className="needs">
        <div className="section-head">
          <h2>Threatens a hearing date</h2>
          <span className="muted">{urgent.length ? `${urgent.length} need action — sorted by legal deadline` : 'Nothing right now'}</span>
        </div>
        {urgent.length === 0 ? (
          <div className="all-clear">
            <Icon name="check" size={18} /> No notice is at risk of missing its statutory window. Unconfirmed bookings are still listed below.
          </div>
        ) : (
          <div className="cards">
            {urgent.map((n) => (
              <ActionCard key={n.id} id={n.id} />
            ))}
          </div>
        )}
      </section>

      <NoticeTable counts={counts} />
    </div>
  );
}

function ActionCard({ id }: { id: string }) {
  const { state, derived, now, openNotice, setModal, dispatch, nowIso, toast } = useApp();
  const n = state.notices.find((x) => x.id === id)!;
  const dv = derived.get(id)!;
  const m = dv.meeting;
  const bad = dv.problemIndex >= 0 ? n.insertions[dv.problemIndex] : undefined;
  const today = iso(now);
  const daysLeft = daysBetween(today, dv.lastLegal);
  const options = editionsBetween(today, dv.lastLegal).filter((e) => e.exists && e.cutoff > now);
  const best = options[0];

  return (
    <article className={`card action-card ${dv.status}`}>
      <header>
        <StatusPill status={dv.status} />
        <span className="ac-type">{TYPE_LABEL[n.type]}</span>
        <Avatar id={n.owner} size={22} />
      </header>
      <button className="ac-title" onClick={() => openNotice(id)}>
        {n.title}
      </button>
      <div className="ac-meta">
        {m.kind === 'bid_opening' ? m.short : m.body} · {fDay(m.date)}
        {m.rescheduledFrom ? ` (moved from ${fDay(m.rescheduledFrom)})` : ''} · {n.statutoryDays}-day rule · {n.requiredRuns} insertion{n.requiredRuns > 1 ? 's' : ''}
      </div>

      <div className="ac-deadline">
        <span className="ac-k">{dv.status === 'missed' ? 'Run-by date was' : 'Must run by'}</span>
        <span className="ac-v">{fDay(dv.lastLegal)}</span>
        <div className={`ac-left ${dv.status}`}>{dv.status === 'missed' ? `${-daysLeft} days ago` : daysLeft === 0 ? 'today' : `${daysLeft} days left`}</div>
      </div>

      <p className="ac-what">
        {bad && bad.state !== 'unconfirmed' && bad.note ? bad.note : `${dv.headline}.${bad?.note ? ` ${bad.note}` : ''}`}
      </p>

      {dv.status === 'at_risk' && best && (
        <div className="ac-option">
          <Icon name="clock" size={14} />
          <span>
            Earliest edition: <strong>{fDay(best.date)}</strong> — cutoff {iso(best.cutoff) === today ? 'today' : fDay(iso(best.cutoff))} {fTime(best.cutoff)}
          </span>
          <span className="cd">{fDuration(best.cutoff.getTime() - now.getTime())}</span>
        </div>
      )}
      {dv.status === 'missed' && (
        <div className="ac-option missed">
          <Icon name="alert" size={14} />
          <span>
            Earliest edition now is <strong>{fDay(dv.nextEdition.date)}</strong> — bid opening must move to {fDay(addDaysSafe(dv.nextEdition.date, n.statutoryDays))} or later.
          </span>
        </div>
      )}

      <footer>
        {dv.status === 'missed' ? (
          <button className="btn primary" onClick={() => setModal({ kind: 'reschedule', id })}>
            Reschedule bid opening…
          </button>
        ) : bad && (bad.state === 'unconfirmed' || bad.state === 'confirmed') && isValidPending(bad, dv.lastLegal) ? (
          <>
            <button className="btn primary" onClick={() => setModal({ kind: 'rebook', id })}>
              Move earlier…
            </button>
            <button
              className="btn"
              onClick={() => {
                dispatch({ type: 'confirm', id, index: dv.problemIndex, at: nowIso });
                toast(`${n.adNo} ${fDay(bad.date)} placement marked confirmed.`);
              }}
            >
              Mark confirmed
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={() => setModal({ kind: 'rebook', id })}>
            Rebook insertion…
          </button>
        )}
        <button className="btn ghost" onClick={() => openNotice(id)}>
          Details
        </button>
      </footer>
    </article>
  );
}

function addDaysSafe(isoDate: string, n: number) {
  const [y, mo, dd] = isoDate.split('-').map(Number);
  return iso(new Date(y, mo - 1, dd + n));
}

// ---------------------------------------------------------------------------

type SortKey = 'urgency' | 'meeting' | 'runby' | 'cost';

function NoticeTable({ counts }: { counts: Counts }) {
  const { state, derived, openNotice, openId } = useApp();
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [type, setType] = useState<NoticeType | 'all'>('all');
  const [owner, setOwner] = useState<StaffId | 'all'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('urgency');

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const r = state.notices.filter((n) => {
      const dv = derived.get(n.id)!;
      if (status !== 'all' && dv.status !== status) return false;
      if (type !== 'all' && n.type !== type) return false;
      if (owner !== 'all' && n.owner !== owner) return false;
      if (ql && !`${n.title} ${n.adNo} ${dv.meeting.body}`.toLowerCase().includes(ql)) return false;
      return true;
    });
    r.sort((a, b) => {
      const da = derived.get(a.id)!;
      const db = derived.get(b.id)!;
      if (sort === 'meeting') return da.meeting.date.localeCompare(db.meeting.date) || a.title.localeCompare(b.title);
      if (sort === 'runby') return da.lastLegal.localeCompare(db.lastLegal);
      if (sort === 'cost') return b.cost - a.cost;
      const [ga, ka] = urgencyKey(da);
      const [gb, kb] = urgencyKey(db);
      return ga - gb || ka - kb;
    });
    return r;
  }, [state.notices, derived, status, type, owner, q, sort]);

  const total = rows.reduce((s, n) => s + n.cost, 0);

  const tabs: { v: Status | 'all'; label: string; n: number }[] = [
    { v: 'all', label: 'All', n: state.notices.length },
    ...STATUS_ORDER.map((s) => ({ v: s, label: STATUS_LONG[s].replace(' — reschedule required', ''), n: counts[s] })),
  ];

  return (
    <section className="table-wrap">
      <div className="table-tools">
        <div className="status-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.v} role="tab" aria-selected={status === t.v} className={`st-tab st-${t.v}${status === t.v ? ' on' : ''}`} onClick={() => setStatus(t.v)}>
              {t.v !== 'all' && <span className="pill-dot" />}
              {t.label}
              <span className="st-n">{t.n}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <label className="search">
            <Icon name="search" size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, case, ad #" />
          </label>
          <select value={type} onChange={(e) => setType(e.target.value as NoticeType | 'all')} aria-label="Notice type">
            <option value="all">All types</option>
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <select value={owner} onChange={(e) => setOwner(e.target.value as StaffId | 'all')} aria-label="Owner">
            <option value="all">Everyone</option>
            {(Object.keys(STAFF) as StaffId[]).map((s) => (
              <option key={s} value={s}>
                {STAFF[s].first}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
            <option value="urgency">Sort: urgency</option>
            <option value="runby">Sort: run-by date</option>
            <option value="meeting">Sort: meeting date</option>
            <option value="cost">Sort: cost</option>
          </select>
        </div>
      </div>

      <table className="ntable">
        <thead>
          <tr>
            <th style={{ width: 128 }}>Status</th>
            <th>Notice</th>
            <th style={{ width: 116 }}>Meeting</th>
            <th style={{ width: 100 }} title="Last date the notice can legally run: meeting date minus statutory days">
              Run by
            </th>
            <th style={{ width: 150 }}>Insertions</th>
            <th style={{ width: 54 }} className="num" title="Days between the latest booked run and the run-by date">
              Slack
            </th>
            <th style={{ width: 112 }}>Proof</th>
            <th style={{ width: 38 }} />
            <th style={{ width: 76 }} className="num">
              Cost
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => {
            const dv = derived.get(n.id)!;
            return (
              <tr key={n.id} className={`row-${dv.status}${openId === n.id ? ' selected' : ''}`} onClick={() => openNotice(n.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openNotice(n.id)}>
                <td>
                  <StatusPill status={dv.status} small />
                </td>
                <td>
                  <div className="t-title">{n.title}</div>
                  <div className="t-sub">
                    {TYPE_LABEL[n.type]} · <span className={`t-head ${dv.status}`}>{dv.headline}</span>
                  </div>
                </td>
                <td>
                  <div className="t-strong">{fDay(dv.meeting.date)}</div>
                  <div className="t-sub">{dv.meeting.short}{dv.meeting.rescheduledFrom ? ' · moved' : ''}</div>
                </td>
                <td>
                  <div className="t-strong">{fDay(dv.lastLegal)}</div>
                  <div className="t-sub">
                    {n.statutoryDays}-day · {n.requiredRuns}×
                  </div>
                </td>
                <td>
                  <div className="chips">
                    {n.insertions.map((ins, i) => (
                      <InsChip key={i} ins={ins} invalid={ins.state !== 'published' && ins.date > dv.lastLegal} />
                    ))}
                  </div>
                </td>
                <td className="num">
                  <SlackCell dv={dv} />
                </td>
                <td>
                  <ProofCell tear={n.tearSheet} aff={n.affidavit} age={dv.affidavitAge} />
                </td>
                <td>
                  <Avatar id={n.owner} size={24} />
                </td>
                <td className="num money">{money(n.cost)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="empty">
                No notices match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="table-foot">
        <span>
          {rows.length} of {state.notices.length} notices
        </span>
        <span>
          Total {money(total)} · avg {money(rows.length ? total / rows.length : 0)}
        </span>
      </div>
    </section>
  );
}

function SlackCell({ dv }: { dv: Derived }) {
  if (dv.status === 'missed') return <span className="slack neg">—</span>;
  if (dv.slack === null) return <span className="slack muted">—</span>;
  const cls = dv.slack <= 1 ? 'neg' : dv.slack <= 3 ? 'warn' : '';
  return (
    <span className={`slack ${cls}`}>
      {dv.status === 'at_risk' && dv.pending.length === 0 ? '≤' : ''}
      {dv.slack}d
    </span>
  );
}

function ProofCell({ tear, aff, age }: { tear: boolean; aff: string; age?: number }) {
  if (aff === 'not_due') return <span className="muted small">Not yet due</span>;
  return (
    <div className="proof">
      <span className={`proof-i ${tear ? 'ok' : 'no'}`} title={tear ? 'Tear sheet received' : 'No tear sheet yet'}>
        {tear ? <Icon name="check" size={11} /> : '–'} Tear
      </span>
      <span className={`proof-i ${aff === 'received' ? 'ok' : (age ?? 0) > 14 ? 'late' : 'wait'}`} title={aff === 'received' ? 'Affidavit on file' : `Affidavit outstanding ${age} days`}>
        {aff === 'received' ? <Icon name="check" size={11} /> : `${age}d`} Aff.
      </span>
    </div>
  );
}

