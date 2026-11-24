import { useMemo, useState, DragEvent } from 'react';
import { useApp } from '../ctx';
import { DAYS, WEEKS, dow, dowShort, holidayFor, weekOfDay } from '../data/calendar';
import { CLOSURES, ZONES, Zone, closureFor } from '../data/zones';
import { TRUCKS, TRUCK_BY_ID } from '../data/trucks';
import { Assignment, operates } from '../data/seed';
import { cellKey, checkPlacement, worstSeverity, targetFor } from '../engine/rules';
import { Icon, TierBadge } from './ui';

export function ScheduleView() {
  const { mode } = useApp();
  return (
    <section className="schedule">
      <Toolbar />
      <MonthStrip />
      {mode === 'week' ? <WeekGrid /> : <MonthGrid />}
    </section>
  );
}

function Toolbar() {
  const { week, setWeek, mode, setMode, focusTruck, setFocusTruck, select, an } = useApp();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return TRUCKS.filter(
      (t) => t.name.toLowerCase().includes(s) || t.owner.toLowerCase().includes(s) || t.cuisine.toLowerCase().includes(s),
    ).slice(0, 8);
  }, [q]);
  const ft = focusTruck ? TRUCK_BY_ID[focusTruck] : null;

  return (
    <div className="toolbar">
      <div className="seg" role="group" aria-label="View">
        <button className={mode === 'week' ? 'on' : ''} onClick={() => setMode('week')}>
          Week
        </button>
        <button className={mode === 'month' ? 'on' : ''} onClick={() => setMode('month')}>
          Month
        </button>
      </div>
      {mode === 'week' ? (
        <div className="weeknav">
          <button className="iconbtn" disabled={week === 0} onClick={() => setWeek(week - 1)} aria-label="Previous week">
            <Icon name="chev-l" />
          </button>
          <div className="weeklabel">{WEEKS[week].label}</div>
          <button className="iconbtn" disabled={week === WEEKS.length - 1} onClick={() => setWeek(week + 1)} aria-label="Next week">
            <Icon name="chev-r" />
          </button>
        </div>
      ) : (
        <div className="weeklabel">All of December · {ZONES.length} zones × 31 days</div>
      )}
      <div className="toolbar-spacer" />
      {ft ? (
        <div className="focus-chip">
          <Icon name="eye" size={14} />
          <span>
            Showing <b>{ft.name}</b> · {an.valid[ft.id]}/{targetFor(ft).target} slots
          </span>
          <button onClick={() => setFocusTruck(null)} aria-label="Clear truck focus">
            <Icon name="x" size={13} />
          </button>
        </div>
      ) : (
        <div className="searchbox">
          <Icon name="search" size={15} />
          <input
            placeholder="Find a truck, owner or cuisine…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) {
                select({ type: 'truck', truckId: matches[0].id });
                setQ('');
                setOpen(false);
              }
              if (e.key === 'Escape') {
                setQ('');
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          {open && matches.length > 0 && (
            <div className="popover search-pop">
              {matches.map((t) => (
                <button
                  key={t.id}
                  className="search-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    select({ type: 'truck', truckId: t.id });
                    setQ('');
                    setOpen(false);
                  }}
                >
                  <span className="si-name">{t.name}</span>
                  <span className="si-meta">
                    {t.owner} · {t.cuisine}
                  </span>
                  <span className="si-slots">
                    {an.valid[t.id]}/{targetFor(t).target}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span>
        <i className="lg lg-block" /> Must fix
      </span>
      <span>
        <i className="lg lg-warn" /> Review
      </span>
      <span>
        <i className="lg lg-unconf" /> No form
      </span>
      <span>
        <i className="lg lg-edit" /> Changed
      </span>
    </div>
  );
}

function MonthStrip() {
  const { an, week, setWeek, mode, setMode } = useApp();
  return (
    <div className="mstrip">
      <div className="mstrip-days">
        {DAYS.map((d) => {
          const st = an.dayStats[d];
          const h = holidayFor(d);
          const inWeek = mode === 'week' && WEEKS[week].days.includes(d);
          const wk = dow(d);
          return (
            <button
              key={d}
              className={`ms-day ${inWeek ? 'in-week' : ''} ${wk === 0 || wk === 6 ? 'weekend' : ''} ${h?.kind === 'closed' ? 'holiday' : ''} ${wk === 1 ? 'monday' : ''}`}
              onClick={() => {
                setWeek(weekOfDay(d));
                setMode('week');
              }}
              title={`${dowShort(d)} Dec ${d}${st.blocking ? ` · ${st.blocking} must fix` : ''}${st.empty ? ` · ${st.empty} empty zone${st.empty > 1 ? 's' : ''}` : ''}${h ? ` · ${h.label}` : ''}`}
            >
              <span className="ms-dow">{dowShort(d)[0]}</span>
              <span className="ms-num">{d}</span>
              <span className="ms-ind">
                {st.blocking > 0 && <i className="ind-block">{st.blocking}</i>}
                {st.blocking === 0 && st.empty > 0 && <i className="ind-empty" />}
                {st.blocking === 0 && st.empty === 0 && st.warning > 0 && <i className="ind-warn" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mstrip-bars">
        {CLOSURES.map((c) => (
          <span
            key={c.id}
            className={`ms-bar bar-${c.kind}`}
            style={{ gridColumn: `${c.days[0]} / ${c.days[c.days.length - 1] + 1}` }}
            title={`${c.title} — ${c.source}`}
          >
            {c.short}
          </span>
        ))}
        <span className="ms-bar bar-holiday" style={{ gridColumn: '24 / 26' }} title="Dec 24 closes 13:00 · Dec 25 closed">
          Holiday
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function WeekGrid() {
  const { week } = useApp();
  const days = WEEKS[week].days;
  return (
    <div className="wgrid-wrap">
      <div className="wgrid">
        <div className="wg-corner">Zone</div>
        {days.map((d, i) => (
          <DayHeader key={i} day={d} />
        ))}
        {ZONES.map((z) => (
          <ZoneRow key={z.id} zone={z} days={days} />
        ))}
      </div>
    </div>
  );
}

function DayHeader({ day }: { day: number | null }) {
  const { an } = useApp();
  if (day === null) return <div className="wg-dayhead out">—</div>;
  const st = an.dayStats[day];
  const h = holidayFor(day);
  const wk = dow(day);
  return (
    <div className={`wg-dayhead ${wk === 0 || wk === 6 ? 'weekend' : ''} ${h?.kind === 'closed' ? 'holiday' : ''}`}>
      <div className="dh-top">
        <span className="dh-dow">{dowShort(day)}</span>
        <span className="dh-num">Dec {day}</span>
      </div>
      <div className="dh-sub">
        {h ? (
          <span className="dh-holiday">{h.kind === 'closed' ? 'City holiday' : `Closes ${h.closesAt}`}</span>
        ) : st.blocking ? (
          <span className="dh-block">{st.blocking} must fix</span>
        ) : st.empty ? (
          <span className="dh-empty">{st.empty} empty</span>
        ) : (
          <span className="dh-ok">Clear</span>
        )}
      </div>
    </div>
  );
}

function ZoneRow({ zone, days }: { zone: Zone; days: (number | null)[] }) {
  const { select, sel } = useApp();
  const active = sel?.type === 'cell' && sel.zoneId === zone.id;
  return (
    <>
      <button
        className={`wg-zone cap-${zone.capacity} ${active ? 'active' : ''}`}
        onClick={() => select({ type: 'cell', zoneId: zone.id, day: days.find((d) => d !== null && operates(zone, d)) ?? days.find((d) => d !== null)! })}
        title={`${zone.location} · ${zone.hoursLabel}`}
      >
        <div className="zn-top">
          <span className="zn-name">{zone.name}</span>
          <TierBadge tier={zone.tier} />
        </div>
        <div className="zn-meta">
          {zone.hoursLabel} · cap {zone.capacity}
        </div>
      </button>
      {days.map((d, i) => (d === null ? <div key={i} className="wg-cell out" /> : <Cell key={i} zone={zone} day={d} />))}
    </>
  );
}

function Cell({ zone, day }: { zone: Zone; day: number }) {
  const { an, select, sel, dragId, setDragId, move, toast, state } = useApp();
  const key = cellKey(zone.id, day);
  const list = an.cells[key] ?? [];
  const isOp = operates(zone, day);
  const closure = closureFor(zone.id, day);
  const h = holidayFor(day);
  const selected = sel?.type === 'cell' && sel.zoneId === zone.id && sel.day === day;
  const [over, setOver] = useState(false);

  const dragA = dragId ? state.doc.assignments.find((a) => a.id === dragId) : undefined;
  const chk = dragA ? checkPlacement(an, dragA.truckId, zone.id, day, dragA.id) : null;
  const isSource = dragA && dragA.zoneId === zone.id && dragA.day === day;
  const dropCls = dragA && !isSource ? (chk?.hard ? 'drop-no' : chk?.soft.length ? 'drop-soft' : 'drop-ok') : '';

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setDragId(null);
    if (!id) return;
    const a = state.doc.assignments.find((x) => x.id === id);
    if (!a || (a.zoneId === zone.id && a.day === day)) return;
    const c = checkPlacement(an, a.truckId, zone.id, day, a.id);
    if (c.hard) {
      toast(`Can’t move there: ${c.hard}`, { tone: 'warn' });
      return;
    }
    move(a.id, zone.id, day, { soft: c.soft });
  };

  if (!isOp && !closure) {
    return (
      <div className={`wg-cell off ${h?.kind === 'closed' ? 'holiday' : ''} ${dropCls}`}>
        {h?.kind === 'closed' ? <span className="off-label">Holiday</span> : null}
      </div>
    );
  }

  const validCount = an.cellValid[key] ?? 0;
  const isEmpty = !closure && validCount === 0;
  const open = Math.max(0, zone.capacity - list.length);

  return (
    <div
      className={`wg-cell ${closure ? `closed closed-${closure.kind}` : ''} ${isEmpty ? 'empty' : ''} ${selected ? 'selected' : ''} ${dropCls} ${over ? 'over' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) select({ type: 'cell', zoneId: zone.id, day });
      }}
      onDragOver={(e) => {
        if (chk?.hard) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      title={dragA && chk?.hard ? chk.hard : dragA && chk?.soft.length ? chk.soft.join(' · ') : undefined}
    >
      {closure && <div className={`closure-tag tag-${closure.kind}`}>{closure.short}</div>}
      {list.map((a) => (
        <Chip key={a.id} a={a} />
      ))}
      {!closure &&
        Array.from({ length: open }, (_, i) => (
          <button
            key={`o${i}`}
            className={`slot-open ${isEmpty && i === 0 ? 'slot-empty' : ''}`}
            onClick={() => select({ type: 'cell', zoneId: zone.id, day })}
          >
            {isEmpty && i === 0 ? (
              <>
                <Icon name="warn" size={12} /> Empty — add truck
              </>
            ) : (
              <>
                <Icon name="plus" size={11} /> Open
              </>
            )}
          </button>
        ))}
      {h?.kind === 'partial' && !closure && <div className="cell-note">until {h.closesAt}</div>}
    </div>
  );
}

export function Chip({ a, compact }: { a: Assignment; compact?: boolean }) {
  const { an, select, sel, focusTruck, setDragId, initialById } = useApp();
  const t = TRUCK_BY_ID[a.truckId];
  const fl = an.flags[a.id];
  const sev = worstSeverity(fl);
  const init = initialById[a.id];
  const changed = !init || init.zoneId !== a.zoneId || init.day !== a.day;
  const selected = sel?.type === 'assignment' && sel.id === a.id;
  const focus = focusTruck === a.truckId;
  const dim = focusTruck && !focus;
  const unconfirmed = fl?.some((f) => f.kind === 'unconfirmed');
  const title = [
    `${t.name} — ${t.cuisine}`,
    `${t.owner}`,
    ...(fl ?? []).map((f) => `• ${f.message}`),
    changed ? '• Changed this session' : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <button
      className={`chip sev-${sev ?? 'none'} ${unconfirmed ? 'unconf' : ''} ${selected ? 'selected' : ''} ${focus ? 'focus' : ''} ${dim ? 'dim' : ''} ${compact ? 'compact' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', a.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragId(a.id);
      }}
      onDragEnd={() => setDragId(null)}
      onClick={(e) => {
        e.stopPropagation();
        select({ type: 'assignment', id: a.id });
      }}
      title={title}
    >
      {sev === 'blocking' && <Icon name="alert" size={12} className="chip-ic" />}
      {sev === 'warning' && <Icon name="warn" size={12} className="chip-ic" />}
      <span className="chip-name">{t.name}</span>
      {t.permitType === 'premium' && <span className="chip-prem" title="Premium permit (8 slots)">P</span>}
      {changed && <span className="chip-edit" title="Changed this session" />}
    </button>
  );
}

// ---------------------------------------------------------------------------

function MonthGrid() {
  const { an, select, focusTruck } = useApp();
  return (
    <div className="mgrid-wrap">
      <table className="mgrid">
        <thead>
          <tr>
            <th className="mg-zonehead">Zone</th>
            {DAYS.map((d) => (
              <th key={d} className={`${dow(d) === 0 || dow(d) === 6 ? 'weekend' : ''} ${dow(d) === 1 ? 'monday' : ''}`}>
                <span className="mg-dow">{dowShort(d)[0]}</span>
                <span>{d}</span>
              </th>
            ))}
            <th className="mg-sum">Filled</th>
          </tr>
        </thead>
        <tbody>
          {ZONES.map((z) => {
            let filled = 0;
            let capTotal = 0;
            return (
              <tr key={z.id}>
                <th className="mg-zone">
                  <span>{z.name}</span> <TierBadge tier={z.tier} />
                </th>
                {DAYS.map((d) => {
                  const key = cellKey(z.id, d);
                  const list = an.cells[key] ?? [];
                  const closure = closureFor(z.id, d);
                  const isOp = operates(z, d);
                  const monday = dow(d) === 1 ? 'monday' : '';
                  if (!isOp && !closure) return <td key={d} className={`mg-off ${monday}`} />;
                  if (!closure) capTotal += z.capacity;
                  const valid = an.cellValid[key] ?? 0;
                  filled += closure ? 0 : valid;
                  const blocking = list.filter((a) => an.blockingIds.has(a.id)).length;
                  const hasFocus = focusTruck && list.some((a) => a.truckId === focusTruck);
                  const ratio = valid / z.capacity;
                  const cls = closure
                    ? `mg-closed mg-${closure.kind}`
                    : valid === 0
                      ? 'mg-empty'
                      : ratio >= 1
                        ? 'mg-full'
                        : ratio >= 0.5
                          ? 'mg-half'
                          : 'mg-low';
                  return (
                    <td
                      key={d}
                      className={`mg-cell ${cls} ${hasFocus ? 'mg-focus' : ''} ${monday}`}
                      onClick={() => select({ type: 'cell', zoneId: z.id, day: d }, { jump: true })}
                      title={`${z.name} · ${dowShort(d)} Dec ${d}\n${closure ? closure.title + '\n' : ''}${list
                        .map((a) => `${an.blockingIds.has(a.id) ? '⛔ ' : ''}${TRUCK_BY_ID[a.truckId].name}`)
                        .join('\n') || 'No trucks'}`}
                    >
                      {closure ? (blocking ? <b className="mg-blk">{blocking}</b> : '') : valid}
                      {!closure && blocking > 0 && <i className="mg-dot" />}
                    </td>
                  );
                })}
                <td className="mg-sum">
                  {filled}/{capTotal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mg-legend">
        <span>
          <i className="mgl mg-full" /> At capacity
        </span>
        <span>
          <i className="mgl mg-half" /> Half or more
        </span>
        <span>
          <i className="mgl mg-low" /> Under half
        </span>
        <span>
          <i className="mgl mg-empty" /> Empty
        </span>
        <span>
          <i className="mgl mg-closure" /> Closed — number shows displaced trucks
        </span>
        <span>
          <i className="mgl mg-dotl" /> Has a must-fix slot
        </span>
        <span className="mg-hint">Numbers are valid trucks per zone-day. Click any cell to open it.</span>
      </div>
    </div>
  );
}
