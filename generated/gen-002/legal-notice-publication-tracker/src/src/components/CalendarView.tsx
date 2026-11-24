import { useMemo, useState } from 'react';
import { CANCELLED_EDITIONS, addDays, cutoffFor, editionExists, fDay, fLong, fTime, iso, isPrintDay } from '../dates';
import { useApp } from '../store';
import type { Insertion, Notice } from '../types';
import { Icon, StatusPill } from './ui';
import type { Status } from '../types';

const MONTHS = [
  { y: 2025, m: 10, label: 'November 2025' },
  { y: 2025, m: 11, label: 'December 2025' },
  { y: 2026, m: 0, label: 'January 2026' },
];

interface DayItem {
  kind: 'ins' | 'meeting' | 'runby';
  notice?: Notice;
  ins?: Insertion;
  status?: Status;
  label: string;
  sub?: string;
}

export function CalendarView() {
  const { state, derived, now, openNotice } = useApp();
  const [mi, setMi] = useState(0);
  const today = iso(now);
  const [sel, setSel] = useState(today);
  const [showCutoffs, setShowCutoffs] = useState(true);

  const byDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const add = (k: string, it: DayItem) => map.set(k, [...(map.get(k) ?? []), it]);
    for (const n of state.notices) {
      const dv = derived.get(n.id)!;
      for (const ins of n.insertions) add(ins.date, { kind: 'ins', notice: n, ins, status: dv.status, label: shortTitle(n.title) });
      if (dv.status === 'at_risk' || dv.status === 'missed') add(dv.lastLegal, { kind: 'runby', notice: n, status: dv.status, label: `Run-by: ${shortTitle(n.title)}` });
    }
    const seen = new Set<string>();
    for (const n of state.notices) {
      const m = derived.get(n.id)!.meeting;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      add(m.date, { kind: 'meeting', label: m.short, sub: m.time });
    }
    return map;
  }, [state.notices, derived]);

  // cutoffs: which day is the cutoff for which edition
  const cutoffMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (let c = '2025-11-01'; c <= '2026-01-31'; c = addDays(c, 1)) {
      if (!editionExists(c)) continue;
      const k = iso(cutoffFor(c));
      map.set(k, [...(map.get(k) ?? []), c]);
    }
    return map;
  }, []);

  const { y, m, label } = MONTHS[mi];
  const first = new Date(y, m, 1);
  const gridStart = addDays(iso(first), -first.getDay());
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const row = Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i));
    if (w > 3 && new Date(row[0] + 'T12:00').getMonth() !== m) break;
    weeks.push(row);
  }

  const selItems = byDay.get(sel) ?? [];
  const selCut = cutoffMap.get(sel);

  return (
    <div className="cal-page">
      <div className="page-head">
        <div>
          <h1>Publication calendar</h1>
          <p className="sub">Courier-Ledger print editions, legal cutoffs and every booked insertion. Prints Tue · Wed · Thu · Sat.</p>
        </div>
        <div className="cal-nav">
          <label className="check-inline">
            <input type="checkbox" checked={showCutoffs} onChange={(e) => setShowCutoffs(e.target.checked)} /> Show cutoffs
          </label>
          <button className="icon-btn" disabled={mi === 0} onClick={() => setMi(mi - 1)} aria-label="Previous month">
            <Icon name="chevronLeft" size={16} />
          </button>
          <strong className="cal-month">{label}</strong>
          <button className="icon-btn" disabled={mi === MONTHS.length - 1} onClick={() => setMi(mi + 1)} aria-label="Next month">
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </div>

      <div className="cal-layout">
        <div className="cal">
          <div className="cal-dow">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((x) => (
              <div key={x}>{x}</div>
            ))}
          </div>
          {weeks.map((row, wi) => (
            <div className="cal-week" key={wi}>
              {row.map((day) => {
                const inMonth = new Date(day + 'T12:00').getMonth() === m;
                const items = byDay.get(day) ?? [];
                const cancelled = CANCELLED_EDITIONS[day];
                const print = isPrintDay(day) && !cancelled;
                const cuts = cutoffMap.get(day);
                const shown = items.slice(0, 3);
                return (
                  <button
                    key={day}
                    className={`cal-day${inMonth ? '' : ' out'}${day === today ? ' today' : ''}${day === sel ? ' sel' : ''}${cancelled ? ' cancelled' : ''}${day < today ? ' past' : ''}`}
                    onClick={() => setSel(day)}
                  >
                    <div className="cd-top">
                      <span className="cd-num">{Number(day.slice(8))}</span>
                      {print && <span className="ed-tag">Print</span>}
                      {cancelled && <span className="ed-tag x">No edition</span>}
                    </div>
                    {showCutoffs && cuts && (
                      <div className="cut-line">
                        <Icon name="clock" size={10} /> 12 PM → {cuts.map((c) => fDay(c).split(' ')[0]).join(', ')}
                      </div>
                    )}
                    {shown.map((it, i) => (
                      <div key={i} className={`cal-chip k-${it.kind} s-${it.status ?? ''} i-${it.ins?.state ?? ''}`}>
                        {it.kind === 'meeting' ? '◆ ' : ''}
                        {it.label}
                      </div>
                    ))}
                    {items.length > 3 && <div className="cal-more">+{items.length - 3} more</div>}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="cal-legend">
            <span><i className="lg ins-published" /> Ran</span>
            <span><i className="lg ins-confirmed" /> Booked, confirmed</span>
            <span><i className="lg ins-unconfirmed" /> Booked, unconfirmed</span>
            <span><i className="lg ins-bad" /> Didn’t run / cancelled</span>
            <span><i className="lg runby" /> Run-by deadline (at risk)</span>
            <span>◆ Meeting / bid opening</span>
          </div>
        </div>

        <aside className="cal-side">
          <div className="cs-date">{fLong(sel)}</div>
          <div className="cs-ed">
            {CANCELLED_EDITIONS[sel] ? (
              <span className="bad">{CANCELLED_EDITIONS[sel]}</span>
            ) : isPrintDay(sel) ? (
              <>
                Print edition · legal cutoff {fDay(iso(cutoffFor(sel)))} {fTime(cutoffFor(sel))}
              </>
            ) : (
              'No print edition'
            )}
          </div>
          {selCut && (
            <div className="cs-cut">
              <Icon name="clock" size={13} /> Legal cutoff at 12:00 PM for the {selCut.map(fDay).join(' and ')} edition{selCut.length > 1 ? 's' : ''}.
            </div>
          )}
          {selItems.length === 0 && <p className="muted small">Nothing scheduled.</p>}
          <ul className="cs-list">
            {selItems.map((it, i) => (
              <li key={i}>
                {it.kind === 'meeting' ? (
                  <div className="cs-meet">
                    ◆ {it.label} <span className="muted">{it.sub}</span>
                  </div>
                ) : (
                  <button className="cs-item" onClick={() => it.notice && openNotice(it.notice.id)}>
                    <div className="cs-row">
                      <StatusPill status={it.status!} small />
                      <span className="cs-kind">{it.kind === 'runby' ? 'Last legal run date' : insLabel(it.ins!)}</span>
                    </div>
                    <div className="cs-title">{it.notice!.title}</div>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function insLabel(i: Insertion) {
  return { published: 'Ran', confirmed: 'Booked · confirmed', unconfirmed: 'Booked · unconfirmed', not_published: 'Did not run', edition_cancelled: 'Edition cancelled' }[i.state];
}

function shortTitle(t: string) {
  const m = t.match(/(Z-\d{4}-\d+|BZA-\d+-\d+|CU-\d+-\d+|PUD-\d+-\d+|PP-\d+-\d+|CPA-\d+-\d+|AX-\d+-\d+|TA-\d+-\d+|ITB \d{4}-\d+|RFP \d{4}-\d+|Ordinance \d{4}-\d+)/);
  if (m) return m[1];
  return t.split(' — ')[0].replace('Notice of ', '').slice(0, 26);
}
