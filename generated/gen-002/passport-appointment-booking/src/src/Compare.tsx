import React from 'react';
import { CURRENCY, EXPEDITE_FEE, MARISOL_WORK, OFFICES, SCHOOL_HOURS } from './data';
import {
  Attendance,
  daysBetween,
  deleShift,
  Evaluation,
  fmtDM,
  fmtMin,
  fmtShort,
  isSchoolDay,
  parse,
  ProcessingOutcome,
  slotTimes,
  TARGET,
  timeRange,
  toMin,
  TODAY,
  TRIP,
} from './logic';
import type { Reservation } from './types';
import { OfficeBadge, StatusIcon } from './ui';
import * as I from './icons';
import { fmtClock } from './App';

export function Compare({
  evals,
  aId,
  bId,
  reservation,
  attendance,
  now,
  onBook,
  onHold,
  onPin,
  onClearB,
  onMessage,
}: {
  evals: Map<string, Evaluation>;
  aId: string;
  bId: string | null;
  reservation: Reservation;
  attendance: Attendance;
  now: number;
  onBook: (id: string) => void;
  onHold: (id: string) => void;
  onPin: () => void;
  onClearB: () => void;
  onMessage: () => void;
}) {
  const a = evals.get(aId)!;
  const b = bId ? evals.get(bId)! : null;
  const resId = reservation.kind === 'hold' || reservation.kind === 'booked' || reservation.kind === 'expired' ? reservation.openingId : null;

  const colLabel = (ev: Evaluation, fallback: string) => {
    if (ev.opening.id === resId) {
      if (reservation.kind === 'hold') return { text: 'Your hold', cls: 'cl-hold' };
      if (reservation.kind === 'booked') return { text: 'Your visit', cls: 'cl-booked' };
      return { text: 'Hold expired', cls: 'cl-expired' };
    }
    return { text: fallback, cls: 'cl-plain' };
  };
  const la = colLabel(a, 'Option A');
  const lb = b ? colLabel(b, 'Option B') : null;

  const holdLeft = reservation.kind === 'hold' ? Math.max(0, reservation.expiresAt - now) : 0;

  const isPick = (ev: Evaluation, kind: 'standard' | 'expedited') =>
    reservation.kind === 'booked' && reservation.openingId === ev.opening.id
      ? reservation.processing.ayo === kind || reservation.processing.temi === kind
      : ev.recommended === kind;

  const rows: { label: string; render: (ev: Evaluation) => React.ReactNode }[] = [
    {
      label: 'Dele',
      render: (ev) => <Cell status={ev.dele.status} main={ev.dele.short} sub={ev.dele.detail} />,
    },
    {
      label: 'Ayo & Temi',
      render: (ev) => <Cell status={ev.kids.status} main={ev.kids.short === 'No school' || ev.kids.short === 'After school' ? ev.kids.short : `${ev.kids.short} school`} sub={ev.kids.detail} />,
    },
    {
      label: 'You',
      render: (ev) => <Cell status={ev.you.status} main={ev.you.short} sub={ev.you.detail} />,
    },
    {
      label: 'Standard',
      render: (ev) => <ProcCell p={ev.std} rec={isPick(ev, 'standard')} />,
    },
    {
      label: 'Expedited',
      render: (ev) => <ProcCell p={ev.exp} rec={isPick(ev, 'expedited')} />,
    },
    {
      label: 'Extra cost',
      render: (ev) =>
        ev.recommended === null ? (
          <span className="muted">—</span>
        ) : ev.extraCost === 0 ? (
          <div className="cost-cell">
            <strong>{CURRENCY}0</strong>
            <span className="cc-sub">standard is fast enough</span>
          </div>
        ) : (
          <div className="cost-cell">
            <strong>
              +{CURRENCY}
              {ev.extraCost}
            </strong>
            <span className="cc-sub">
              2 × {CURRENCY}
              {EXPEDITE_FEE} expedited
            </span>
          </div>
        ),
    },
  ];

  const actionFor = (ev: Evaluation, isA: boolean) => {
    const id = ev.opening.id;
    const blocked = ev.verdict === 'no';
    const blockMsg =
      ev.dele.status === 'bad' ? 'Dele is working. Switch to “You + consent form” to book this.' : 'Passports would not arrive before the trip.';
    if (reservation.kind === 'booked') {
      if (id === reservation.openingId) return (
          <div className="act-note">
            <I.Check size={14} /> Booked · <span className="mono">{reservation.ref}</span>
          </div>
        );
      return blocked ? <div className="act-note bad">{blockMsg}</div> : <button className="btn btn-primary btn-block" onClick={() => onBook(id)}>Move visit here</button>;
    }
    if (blocked) return <div className="act-note bad">{blockMsg}</div>;
    if (reservation.kind === 'hold' && id === reservation.openingId)
      return (
        <button className="btn btn-hold btn-block" onClick={() => onBook(id)}>
          Book this time
        </button>
      );
    if (reservation.kind === 'expired' && id === reservation.openingId)
      return (
        <button className="btn btn-primary btn-block" onClick={() => onBook(id)}>
          Book it now
        </button>
      );
    return (
      <div className="act-stack">
        <button className="btn btn-primary btn-block" onClick={() => onBook(id)}>
          {reservation.kind === 'hold' ? 'Book this instead' : 'Book this time'}
        </button>
        {reservation.kind !== 'hold' && (
          <button className="btn btn-ghost btn-block btn-sm" onClick={() => onHold(id)}>
            Hold for 15 min
          </button>
        )}
        {reservation.kind === 'hold' && <div className="act-hint">Releases your {fmtShort(evals.get(reservation.openingId)!.dateObj)} hold</div>}
      </div>
    );
  };

  return (
    <div className="compare">
      <div className="cmp-head">
        <h2>Compare</h2>
        {reservation.kind === 'hold' && (
          <span className={`cmp-timer ${holdLeft < 180 ? 'urgent' : ''}`}>
            <I.Clock size={13} /> hold ends {fmtClock(reservation.expiresAt)}
          </span>
        )}
      </div>

      <div className="cmp-grid">
        <div className="cmp-label" />
        <ColHead ev={a} label={la} />
        {b && lb ? (
          <ColHead ev={b} label={lb} onPin={b.opening.id !== resId && a.opening.id !== resId ? onPin : undefined} onClear={onClearB} />
        ) : (
          <div className="col-empty">
            <I.Calendar size={18} />
            <span>Pick any time in the calendar to compare it here.</span>
          </div>
        )}

        <div className="cmp-label">Verdict</div>
        <Verdict ev={a} />
        {b ? <Verdict ev={b} /> : <div />}

        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <div className="cmp-label">{r.label}</div>
            <div className="cmp-cell">{r.render(a)}</div>
            <div className="cmp-cell">{b ? r.render(b) : null}</div>
          </React.Fragment>
        ))}
      </div>

      <div className="cmp-section">
        <div className="sec-title">
          When passports arrive <span className="muted">· latest likely date incl. return post</span>
        </div>
        <ArrivalChart a={a} b={b} />
      </div>

      <div className="cmp-section">
        <div className="sec-title">On the day</div>
        <DayStrip ev={a} tag="A" attendance={attendance} />
        {b && <DayStrip ev={b} tag="B" attendance={attendance} />}
      </div>

      <div className="cmp-actions">
        <div>{actionFor(a, true)}</div>
        <div>{b ? actionFor(b, false) : null}</div>
      </div>

      <button className="btn btn-secondary btn-block msg-btn" onClick={onMessage}>
        <I.Message size={16} /> {b ? 'Text Dele these two options' : 'Text Dele this time'}
      </button>
    </div>
  );
}

function ColHead({ ev, label, onPin, onClear }: { ev: Evaluation; label: { text: string; cls: string }; onPin?: () => void; onClear?: () => void }) {
  const o = OFFICES[ev.opening.office];
  return (
    <div className={`col-head ${label.cls}`}>
      <div className="ch-top">
        <span className="ch-label">{label.text}</span>
        <span className="ch-tools">
          {onPin && (
            <button className="icon-btn sm" title="Swap A and B" aria-label="Swap A and B" onClick={onPin}>
              <I.Swap size={13} />
            </button>
          )}
          {onClear && (
            <button className="icon-btn sm" title="Remove from compare" aria-label="Remove from compare" onClick={onClear}>
              <I.X size={13} />
            </button>
          )}
        </span>
      </div>
      <div className="ch-date">{fmtShort(ev.dateObj)}</div>
      <div className="ch-time">{timeRange(ev.opening)}</div>
      <div className="ch-office">
        <OfficeBadge letter={o.letter} /> {o.name}
      </div>
      <div className="ch-dist">
        <I.Car size={12} /> {o.km} km · ~{o.driveMin} min
      </div>
    </div>
  );
}

function Verdict({ ev }: { ev: Evaluation }) {
  return (
    <div className={`cmp-verdict vb-${ev.verdict}`}>
      <StatusIcon status={ev.verdict === 'works' ? 'ok' : ev.verdict === 'check' ? 'unknown' : 'bad'} size={13} />
      <span>{ev.headline}</span>
    </div>
  );
}

function Cell({ status, main, sub }: { status: any; main: string; sub: string }) {
  return (
    <div className={`vcell vc-${status}`}>
      <div className="vmain">
        <StatusIcon status={status} size={12} /> {main}
      </div>
      <div className="vsub">{sub}</div>
    </div>
  );
}

function ProcCell({ p, rec }: { p: ProcessingOutcome; rec: boolean }) {
  const txt = p.status === 'ok' ? 'In time' : p.status === 'tight' ? 'Cutting it close' : 'Could miss the trip';
  return (
    <div className={`vcell vc-${p.status === 'ok' ? 'ok' : p.status === 'tight' ? 'tight' : 'bad'} ${rec ? 'rec' : ''}`}>
      <div className="vmain">
        <StatusIcon status={p.status} size={12} /> by {fmtDM(p.worst)}
        {rec && <span className="rec-tag">pick</span>}
      </div>
      <div className="vsub">
        {txt} · earliest {fmtDM(p.best)}
      </div>
    </div>
  );
}

/* ---------- arrival chart ---------- */
function ArrivalChart({ a, b }: { a: Evaluation; b: Evaluation | null }) {
  const W = 416;
  const L = 58;
  const R = 10;
  const start = TODAY;
  const end = parse('2027-03-01');
  const span = daysBetween(start, end);
  const x = (d: Date) => L + (daysBetween(start, d) / span) * (W - L - R);
  const rows: { tag: string; ev: Evaluation; p: ProcessingOutcome }[] = [
    { tag: 'A', ev: a, p: a.std },
    { tag: 'A', ev: a, p: a.exp },
    ...(b ? [{ tag: 'B', ev: b, p: b.std }, { tag: 'B', ev: b, p: b.exp }] : []),
  ];
  const top = 22;
  const rh = 19;
  const H = top + rows.length * rh + (b ? 8 : 0) + 6;
  const ticks = ['2026-12-01', '2027-01-01', '2027-02-01'].map(parse);
  const color = (s: string) => (s === 'ok' ? 'var(--ok)' : s === 'tight' ? 'var(--warn)' : 'var(--bad)');
  return (
    <svg viewBox={`0 0 ${W} ${H + 12}`} width="100%" className="arrival" role="img" aria-label="Passport arrival dates compared with the trip date">
      <rect x={x(parse('2026-12-24'))} y={top - 6} width={x(parse('2027-01-02')) - x(parse('2026-12-24'))} height={H - top + 2} fill="url(#hatch)" />
      <defs>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#f1efe9" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="#dcd8ce" strokeWidth="2" />
        </pattern>
      </defs>
      {ticks.map((t) => (
        <g key={t.toISOString()}>
          <line x1={x(t)} x2={x(t)} y1={top - 6} y2={H - 2} stroke="#e6e3db" />
          <text x={x(t) + 3} y={10} className="ax">
            {fmtDM(t).replace(/^1 /, '')}
          </text>
        </g>
      ))}
      <text x={x(parse('2026-12-24')) + 2} y={H - 3} className="ax ax-sm">closed</text>
      <line x1={x(TARGET)} x2={x(TARGET)} y1={top - 8} y2={H + 1} stroke="var(--ok)" strokeDasharray="3 3" />
      <text x={x(TARGET) - 3} y={H + 9} textAnchor="end" className="ax ax-ok">
        aim {fmtDM(TARGET)}
      </text>
      <line x1={x(TRIP)} x2={x(TRIP)} y1={top - 8} y2={H + 1} stroke="var(--ink)" strokeWidth="2" />
      <text x={x(TRIP) + 3} y={H + 9} className="ax ax-trip">
        fly 14 Feb
      </text>
      {rows.map((r, i) => {
        const y = top + i * rh + (b && i >= 2 ? 8 : 0) + 6;
        const rec = r.ev.recommended === r.p.kind;
        const appt = r.ev.dateObj;
        return (
          <g key={i} opacity={rec || !r.ev.recommended ? 1 : 0.45}>
            <text x={0} y={y + 4} className={`ax rowlab ${rec ? 'strong' : ''}`}>
              {r.tag} · {r.p.kind === 'standard' ? 'Std' : 'Exp'}
            </text>
            <line x1={x(appt)} x2={x(r.p.best)} y1={y} y2={y} stroke="#b9b5aa" strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx={x(appt)} cy={y} r={3.5} fill="var(--ink)" />
            <rect x={x(r.p.best)} y={y - 5} width={Math.max(3, x(r.p.worst) - x(r.p.best))} height={10} rx={3} fill={color(r.p.status)} opacity={0.9} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- day strip ---------- */
function DayStrip({ ev, tag, attendance }: { ev: Evaluation; tag: string; attendance: Attendance }) {
  const W = 416;
  const L = 44;
  const R = 6;
  const h0 = 6 * 60;
  const h1 = 23 * 60;
  const x = (m: number) => L + ((m - h0) / (h1 - h0)) * (W - L - R);
  const office = OFFICES[ev.opening.office];
  const { first, end } = slotTimes(ev.opening);
  const leave = first - office.driveMin - 10;
  const back = end + office.driveMin;
  const sh = deleShift(ev.dateObj);
  const school = isSchoolDay(ev.dateObj);
  type Lane = { name: string; busy?: [number, number]; kind: string; note?: string };
  const lanes: Lane[] = [
    attendance === 'consent'
      ? { name: 'Dele', kind: 'na', note: 'not attending — signs PC-3' }
      : sh.kind === 'early' || sh.kind === 'late'
        ? { name: 'Dele', kind: 'dele', busy: [toMin(sh.start), toMin(sh.end)] }
        : sh.kind === 'unknown'
          ? { name: 'Dele', kind: 'unknown', note: 'shift not shared yet' }
          : { name: 'Dele', kind: 'off', note: 'day off' },
    school ? { name: 'Kids', kind: 'school', busy: [toMin(SCHOOL_HOURS.start), toMin(SCHOOL_HOURS.end)] } : { name: 'Kids', kind: 'off', note: 'no school' },
    school ? { name: 'You', kind: 'you', busy: [toMin(MARISOL_WORK.start), toMin(MARISOL_WORK.end)] } : { name: 'You', kind: 'off', note: 'not working' },
  ];
  const lh = 13;
  const top = 16;
  const H = top + lanes.length * (lh + 4) + 2;
  return (
    <div className="daystrip">
      <div className="ds-title">
        <span className={`role-tag rtag-${tag}`}>{tag}</span> {fmtShort(ev.dateObj)} · leave home {fmtMin(leave)}, back {fmtMin(back)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Day plan for ${fmtShort(ev.dateObj)}`}>
        {[6, 9, 12, 15, 18, 21].map((h) => (
          <g key={h}>
            <line x1={x(h * 60)} x2={x(h * 60)} y1={top - 3} y2={H} stroke="#ece9e2" />
            <text x={x(h * 60)} y={10} textAnchor="middle" className="ax">
              {h}:00
            </text>
          </g>
        ))}
        <rect x={x(leave)} y={top - 4} width={x(back) - x(leave)} height={H - top + 4} fill="var(--appt-soft)" rx={3} />
        <rect x={x(first)} y={top - 4} width={x(end) - x(first)} height={H - top + 4} fill="var(--appt)" rx={2} />
        {lanes.map((ln, i) => {
          const y = top + i * (lh + 4);
          const ovA = ln.busy ? Math.max(ln.busy[0], leave) : 0;
          const ovB = ln.busy ? Math.min(ln.busy[1], back) : 0;
          return (
            <g key={ln.name}>
              <text x={0} y={y + 10} className="ax rowlab">
                {ln.name}
              </text>
              {ln.busy ? (
                <rect x={x(ln.busy[0])} y={y} width={x(ln.busy[1]) - x(ln.busy[0])} height={lh} rx={3} className={`lane lane-${ln.kind}`} />
              ) : (
                <>
                  <rect x={L} y={y} width={W - L - R} height={lh} rx={3} className={`lane lane-${ln.kind}`} />
                  <text x={L + 6} y={y + 10} className="ax lane-note">
                    {ln.note}
                  </text>
                </>
              )}
              {ln.busy && ovB > ovA && <rect x={x(ovA)} y={y} width={x(ovB) - x(ovA)} height={lh} rx={2} className={ln.kind === 'dele' ? 'clash-bad' : 'clash-cost'} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
