import { useEffect, useMemo, useRef, useState } from 'react';
import {
  APPROVAL_THRESHOLD, CONFIRM_HOURS, CUTOFF, DELIVERY, INSTALL, MOCK_NOW, RETURN_LOSS,
  blockOptions, existingBookings, grant, machine, material, pastCommitments, project, user, weekDays,
  type BlockOption,
} from './data';

/* ---------- helpers ---------- */
const eur = (n: number, dp = 0) =>
  '€' + n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDT = (d: Date) => `${fmtDay(d)}, ${fmtTime(d)}`;
const hh = (h: number) => `${pad(h)}:00`;
function fmtDuration(ms: number, withSeconds = false) {
  if (ms <= 0) return '0 min';
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} d`);
  if (hours || days) parts.push(`${hours} h`);
  parts.push(`${pad(mins)} min`);
  if (withSeconds) parts.push(`${pad(secs)} s`);
  return parts.join(' ');
}

function useMockClock() {
  const start = useRef(Date.now());
  const [now, setNow] = useState(MOCK_NOW);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date(MOCK_NOW.getTime() + (Date.now() - start.current))), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

type SupMode = 'unset' | 'none' | 'evening' | 'full' | 'custom';
const EVENING_FROM = 18;

function hourKeys(block: BlockOption) {
  const keys: { key: string; seg: number; hour: number }[] = [];
  block.segments.forEach((s, i) => {
    for (let h = s.start; h < s.end; h++) keys.push({ key: `${i}:${h}`, seg: i, hour: h });
  });
  return keys;
}
function presetHours(block: BlockOption, mode: SupMode): Set<string> {
  const all = hourKeys(block);
  if (mode === 'full') return new Set(all.map((k) => k.key));
  if (mode === 'evening') return new Set(all.filter((k) => k.hour >= EVENING_FROM).map((k) => k.key));
  return new Set();
}

type Approval =
  | { state: 'none' }
  | { state: 'pending'; sentAt: Date; amount: number }
  | { state: 'approved'; at: Date; amount: number; method: 'kerfline' | 'email'; note: string };

type Phase =
  | { kind: 'draft' }
  | { kind: 'committed'; at: Date; orderId: string; total: number }
  | { kind: 'cancelled'; at: Date; orderId: string };

/* ---------- App ---------- */
export default function App() {
  const now = useMockClock();
  const nowRef = useRef(now);
  nowRef.current = now;
  const [blockId, setBlockId] = useState('dec2');
  const block = blockOptions.find((b) => b.id === blockId)!;
  const [qty, setQty] = useState(material.defaultQty);
  const [supMode, setSupMode] = useState<SupMode>('unset');
  const [customHours, setCustomHours] = useState<Set<string>>(new Set());
  const [approval, setApproval] = useState<Approval>({ state: 'none' });
  const [phase, setPhase] = useState<Phase>({ kind: 'draft' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const supHours = supMode === 'custom' ? customHours : presetHours(block, supMode);
  const blockHours = hourKeys(block).length;
  const supCount = supHours.size;

  const cnc = blockHours * machine.rate;
  const sup = supCount * machine.supervisionRate;
  const ply = qty * material.price;
  const ship = material.shipping;
  const total = cnc + sup + ply + ship;
  const totalMin = cnc + ply + ship;
  const totalMax = totalMin + blockHours * machine.supervisionRate;
  const fabCharge = cnc + sup;
  const matCharge = ply + ship;

  const approvalRequired = total > APPROVAL_THRESHOLD;
  const approvalValid = approval.state === 'approved' && total <= approval.amount;
  const minSheets = Math.ceil(material.nesting);
  const locked = phase.kind !== 'draft';

  const blockers: string[] = [];
  if (supMode === 'unset') blockers.push('Choose a supervision option');
  if (qty < minSheets) blockers.push(`Order at least ${minSheets} sheets to cover the nesting`);
  if (approvalRequired && !approvalValid) blockers.push('Record Prof. Ribeiro’s approval');
  if (now > CUTOFF) blockers.push('The materials cutoff has passed');
  const canCommit = blockers.length === 0;

  // mock: the advisor responds to the request
  useEffect(() => {
    if (approval.state !== 'pending') return;
    const t = setTimeout(() => {
      setApproval({
        state: 'approved',
        at: nowRef.current,
        amount: approval.amount,
        method: 'kerfline',
        note: 'Approved. Keep the spares, I’d rather lose a little on returns than recut in December.',
      });
      setToast('Prof. Ana Ribeiro approved the commitment');
    }, 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approval.state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const changeBlock = (id: string) => {
    setBlockId(id);
    if (supMode === 'custom') {
      const nb = blockOptions.find((b) => b.id === id)!;
      setCustomHours(presetHours(nb, 'evening'));
    }
  };
  const toggleHour = (key: string) => {
    const base = new Set(supHours);
    if (base.has(key)) base.delete(key);
    else base.add(key);
    setCustomHours(base);
    setSupMode('custom');
  };

  const commit = () => {
    setPhase({ kind: 'committed', at: now, orderId: 'KF-2026-1184', total });
    setShowConfirm(false);
    setToast('Commitment placed. Order sent to Nordholz Panels.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmBy = phase.kind === 'committed'
    ? new Date(phase.at.getTime() + CONFIRM_HOURS * 3600e3)
    : new Date(now.getTime() + CONFIRM_HOURS * 3600e3);

  return (
    <div className="app">
      <TopBar now={now} />
      <main className="page">
        <PageHeader now={now} phase={phase} />

        {phase.kind === 'committed' && (
          <CommittedBanner now={now} phase={phase} confirmBy={confirmBy} onCancel={() => setShowCancel(true)} />
        )}
        {phase.kind === 'cancelled' && (
          <div className="banner banner-neutral">
            <div>
              <strong>Commitment {phase.orderId} cancelled</strong> at {fmtDT(phase.at)}, before supplier confirmation.
              Nothing was charged to {grant.title}, and the {block.short} block has been released.
            </div>
            <button className="btn btn-secondary" onClick={() => { setPhase({ kind: 'draft' }); setApproval({ state: 'none' }); }}>
              Reopen as draft
            </button>
          </div>
        )}

        <div className="grid">
          <div className="col-main">
            <Timeline now={now} confirmBy={confirmBy} phase={phase} block={block} />
            <Section n={1} title="Machine block" meta={`${machine.name} · ${machine.model}`} locked={locked}>
              <MachineSection block={block} onChange={changeBlock} locked={locked} />
            </Section>

            <Section n={2} title="Material" meta={`${material.name} · ${material.spec}`} locked={locked}>
              <MaterialSection qty={qty} setQty={setQty} minSheets={minSheets} locked={locked} />
            </Section>

            <Section n={3} title="Technician supervision" meta={`+${eur(machine.supervisionRate)} per supervised hour`} locked={locked}
              flag={supMode === 'unset' && !locked ? 'Decision needed' : undefined}>
              <SupervisionSection
                block={block} mode={supMode} setMode={(m) => { setSupMode(m); if (m === 'custom') setCustomHours(new Set(supHours)); }}
                hours={supHours} toggleHour={toggleHour} locked={locked} totalMin={totalMin}
              />
            </Section>

            <Section n={4} title="If plans change" meta="Cancellation window and return losses">
              <RiskSection qty={qty} confirmBy={confirmBy} phase={phase} />
            </Section>

            <Section n={5} title="This grant’s commitments in 2026" meta={`${grant.title} · ${grant.code}`}>
              <HistorySection />
            </Section>
          </div>

          <aside className="col-side">
            <SummaryPanel
              block={block} blockHours={blockHours} qty={qty} supMode={supMode} supCount={supCount}
              cnc={cnc} sup={sup} ply={ply} ship={ship} total={total} totalMin={totalMin} totalMax={totalMax}
              fabCharge={fabCharge} matCharge={matCharge}
              orderLabel={phase.kind === 'committed' ? `Order ${phase.orderId}` : phase.kind === 'cancelled' ? `Cancelled ${phase.orderId}` : `Draft ${project.draftId}`}
            />
            <ApprovalPanel
              required={approvalRequired} total={total} approval={approval} setApproval={setApproval}
              now={now} supUnset={supMode === 'unset'} totalMax={totalMax} locked={locked}
            />
            {phase.kind === 'draft' && (
              <div className="card commit-card">
                <button className="btn btn-primary btn-block" disabled={!canCommit} onClick={() => setShowConfirm(true)}>
                  Commit {supMode === 'unset' ? '' : eur(total) + ' '}to {grant.title}
                </button>
                {blockers.length > 0 ? (
                  <ul className="blockers">
                    {blockers.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                ) : (
                  <p className="fine">
                    Books the block and sends the plywood order. You can cancel free of charge until the supplier confirms,
                    expected around <strong>{fmtDT(confirmBy)}</strong>.
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>

      {showConfirm && (
        <ConfirmDialog
          onClose={() => setShowConfirm(false)} onConfirm={commit}
          block={block} qty={qty} supCount={supCount} total={total} confirmBy={confirmBy}
          fabCharge={fabCharge} matCharge={matCharge}
        />
      )}
      {showCancel && phase.kind === 'committed' && (
        <CancelDialog
          onClose={() => setShowCancel(false)}
          onConfirm={() => { setPhase({ kind: 'cancelled', at: now, orderId: phase.orderId }); setShowCancel(false); setToast('Commitment cancelled. Nothing charged.'); }}
          total={phase.total} confirmBy={confirmBy} now={now} blockLabel={block.short}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

/* ---------- chrome ---------- */
function TopBar({ now }: { now: Date }) {
  return (
    <header className="topbar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          <rect x="1" y="1" width="20" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 16 L11 6 L17 16" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.2 16 L11 11.3 L13.8 16" fill="none" stroke="#c48a3a" strokeWidth="1.6" />
        </svg>
        <span>Kerfline</span>
        <span className="brand-sub">Digital Fabrication Lab · Halden School of Architecture</span>
      </div>
      <nav className="nav">
        <a>Machines</a>
        <a>Materials</a>
        <a className="active">Commitments</a>
        <a>Grants</a>
      </nav>
      <div className="topbar-right">
        <span className="clock">{fmtDay(now)} · {fmtTime(now)}</span>
        <div className="user">
          <span className="avatar">{user.initials}</span>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.group}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function PageHeader({ now, phase }: { now: Date; phase: Phase }) {
  const left = CUTOFF.getTime() - now.getTime();
  return (
    <div className="page-header">
      <div>
        <div className="crumbs">Commitments / Drafts / {project.draftId}</div>
        <h1>{project.title}</h1>
        <div className="sub">
          <span>Exhibition install <strong>{fmtDay(INSTALL)}</strong></span>
          <span className="dot">·</span>
          <span>Charged to <strong>{grant.title}</strong> ({grant.pi})</span>
          <span className="dot">·</span>
          <span>From <code>{project.file}</code></span>
        </div>
      </div>
      <div className={`cutoff ${phase.kind === 'committed' ? 'cutoff-done' : ''}`}>
        {phase.kind === 'committed' ? (
          <>
            <div className="cutoff-label">Materials order</div>
            <div className="cutoff-value">Placed before cutoff</div>
            <div className="cutoff-when">Cutoff {fmtDT(CUTOFF)}</div>
          </>
        ) : (
          <>
            <div className="cutoff-label">Materials-order cutoff in</div>
            <div className="cutoff-value">{fmtDuration(left)}</div>
            <div className="cutoff-when">{fmtDT(CUTOFF)}. Later orders miss the 2 Dec cutting date.</div>
          </>
        )}
      </div>
    </div>
  );
}

function Timeline({ now, confirmBy, phase, block }: { now: Date; confirmBy: Date; phase: Phase; block: BlockOption }) {
  // Piecewise scale: the next four days (where the decision lives) get 42% of the width.
  const A0 = new Date(2026, 10, 16).getTime();
  const A1 = new Date(2026, 10, 20).getTime();
  const B1 = new Date(2026, 11, 13).getTime();
  const SPLIT = 42;
  const pos = (d: Date) => {
    const t = d.getTime();
    if (t <= A1) return ((t - A0) / (A1 - A0)) * SPLIT;
    return SPLIT + ((t - A1) / (B1 - A1)) * (100 - SPLIT);
  };
  const cut0 = block.segments[0].date;
  const cutLast = block.segments[block.segments.length - 1].date;
  const committedAt = phase.kind === 'committed' ? phase.at : now;
  const events = [
    { d: committedAt, label: phase.kind === 'committed' ? 'Committed' : 'If you commit now', sub: fmtDT(committedAt), cls: 'now' },
    { d: confirmBy, label: 'Supplier confirms', sub: `≈ ${fmtDT(confirmBy)}`, cls: 'confirm' },
    { d: CUTOFF, label: 'Order cutoff', sub: fmtDT(CUTOFF), cls: 'cutoff' },
    { d: DELIVERY, label: 'Plywood delivered', sub: fmtDay(DELIVERY), cls: '' },
    { d: new Date(cut0.getTime() + 12 * 3600e3), label: block.segments.length > 1 ? 'Cutting (2 days)' : 'Cutting', sub: block.segments.length > 1 ? `${fmtDay(cut0)} – ${cutLast.getDate()} Dec` : fmtDay(cut0), cls: 'cut' },
    { d: INSTALL, label: 'Exhibition install', sub: fmtDay(INSTALL), cls: 'install' },
  ];
  const ticks: Date[] = [];
  for (let t = A0; t <= B1; t += 86400e3) ticks.push(new Date(t));
  const tickLabel = (t: Date) => t.getTime() < A1 ? `${DAYS[t.getDay()]} ${t.getDate()}` : t.getDay() === 1 ? `${t.getDate()} ${MONTHS[t.getMonth()]}` : null;
  return (
    <div className="card timeline">
      <div className="tl-head">
        <h2>Key dates</h2>
        <span className="section-meta">{phase.kind === 'committed' ? 'Mon 16 – Thu 19 Nov drawn wider.' : 'The first four days are drawn wider. That’s when you decide.'}</span>
      </div>
      <div className="tl-track">
        <div className="tl-break" style={{ left: `${SPLIT}%` }} />
        <div className="tl-window" style={{ left: `${pos(committedAt)}%`, width: `${pos(confirmBy) - pos(committedAt)}%` }}>
          <span>Free cancellation</span>
        </div>
        <div className="tl-loss" style={{ left: `${pos(confirmBy)}%`, width: `${pos(cut0) - pos(confirmBy)}%` }}>
          <span>Unused sheets: 30% loss</span>
        </div>
        {ticks.map((t, i) => (
          <div key={i} className={`tl-tick ${tickLabel(t) ? 'tl-tick-week' : ''}`} style={{ left: `${pos(t)}%` }}>
            {tickLabel(t) && <span>{tickLabel(t)}</span>}
          </div>
        ))}
        {events.map((e, i) => (
          <div key={e.label} className={`tl-event tl-${e.cls} ${i % 2 ? 'tl-low' : ''}`} style={{ left: `${pos(e.d)}%` }}>
            <div className="tl-pin" />
            <div className="tl-text">
              <div className="tl-label">{e.label}</div>
              <div className="tl-sub">{e.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommittedBanner({ now, phase, confirmBy, onCancel }: { now: Date; phase: Extract<Phase, { kind: 'committed' }>; confirmBy: Date; onCancel: () => void }) {
  const left = confirmBy.getTime() - now.getTime();
  return (
    <div className="banner banner-ok">
      <div className="banner-main">
        <div className="banner-title">Committed · {phase.orderId} · {eur(phase.total)}</div>
        <div>
          Big Kerf block booked and plywood order sent to {material.supplier} at {fmtTime(phase.at)}. The supplier usually confirms within 48 h.
          Until then you can cancel at no cost.
        </div>
      </div>
      <div className="banner-side">
        <div className="mini-label">Free cancellation, about</div>
        <div className="big">{fmtDuration(left, true)}</div>
        <button className="btn btn-danger-ghost" onClick={onCancel}>Cancel commitment…</button>
      </div>
    </div>
  );
}

function Section({ n, title, meta, children, locked, flag }: { n: number; title: string; meta?: string; children: React.ReactNode; locked?: boolean; flag?: string }) {
  return (
    <section className="card section">
      <header className="section-head">
        <span className="section-n">{n}</span>
        <h2>{title}</h2>
        {meta && <span className="section-meta">{meta}</span>}
        {flag && <span className="flag">{flag}</span>}
        {locked && <span className="lock">Locked after commit</span>}
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
}

/* ---------- 1. machine ---------- */
function MachineSection({ block, onChange, locked }: { block: BlockOption; onChange: (id: string) => void; locked: boolean }) {
  const H0 = 8, H1 = 22;
  const rows = H1 - H0;
  const dayIdx = (day: number) => weekDays.findIndex((w) => w.day === day);
  return (
    <div className="machine">
      <div className="machine-facts">
        <Fact k="Bed" v={machine.bed} />
        <Fact k="Rate" v={`${eur(machine.rate)} / h`} />
        <Fact k="Where" v={machine.location} />
        <Fact k="CAM estimate" v={project.camHours} />
        <Fact k="Your certification" v={`${user.cert} (solo operation)`} />
      </div>
      <div className="week">
        <div className="week-grid" style={{ ['--rows' as string]: rows }}>
          <div className="week-axis">
            {Array.from({ length: rows + 1 }, (_, i) => (i % 2 === 0 ? <span key={i} style={{ top: `${(i / rows) * 100}%` }}>{hh(H0 + i)}</span> : null))}
          </div>
          {weekDays.map((w) => (
            <div key={w.day} className="week-col">
              <div className="week-colhead"><strong>{w.label}</strong> {w.date}</div>
              <div className="week-colbody">
                {Array.from({ length: rows }, (_, i) => <div key={i} className={`week-line ${H0 + i === 18 ? 'week-line-eve' : ''}`} style={{ top: `${(i / rows) * 100}%` }} />)}
                <div className="after-hours" style={{ top: `${((18 - H0) / rows) * 100}%`, bottom: 0 }} />
                {existingBookings.filter((b) => b.day === w.day).map((b, i) => (
                  <div key={i} className={`evt evt-${b.kind}`} style={{ top: `${((b.start - H0) / rows) * 100}%`, height: `${((b.end - b.start) / rows) * 100}%` }}>
                    <span>{b.label}</span>
                    <span className="evt-time">{hh(b.start)}–{hh(b.end)}</span>
                  </div>
                ))}
                {blockOptions.flatMap((opt) => opt.segments.map((s, si) => ({ opt, s, si }))).filter(({ s }) => s.date.getDate() === w.day && dayIdx(w.day) >= 0).map(({ opt, s, si }) => {
                  const sel = opt.id === block.id;
                  return (
                    <button
                      key={opt.id + si}
                      className={`evt evt-open ${sel ? 'evt-sel' : ''}`}
                      disabled={locked}
                      onClick={() => onChange(opt.id)}
                      style={{ top: `${((s.start - H0) / rows) * 100}%`, height: `${((s.end - s.start) / rows) * 100}%` }}
                    >
                      <span>{sel ? 'Your block' : 'Open'} · {s.end - s.start} h</span>
                      <span className="evt-time">{hh(s.start)}–{hh(s.end)}</span>
                      {opt.segments.length > 1 && <span className="evt-time">Part {si + 1} of 2</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="week-legend">
        <span><i className="lg lg-open" />Open, 14 h total</span>
        <span><i className="lg lg-sel" />Selected</span>
        <span><i className="lg lg-booking" />Booked by others</span>
        <span><i className="lg lg-maint" />Maintenance</span>
        <span><i className="lg lg-eve" />After 18:00, no staff on the floor</span>
      </div>
      <div className="options">
        {blockOptions.map((o) => (
          <label key={o.id} className={`option ${o.id === block.id ? 'option-sel' : ''} ${locked ? 'option-locked' : ''}`}>
            <input type="radio" name="block" checked={o.id === block.id} disabled={locked} onChange={() => onChange(o.id)} />
            <div>
              <div className="option-title">{o.title}</div>
              <div className="option-sub">14 h · {eur(14 * machine.rate)}</div>
              <ul className="proscons">
                {o.pros.map((p) => <li key={p} className="pro">{p}</li>)}
                {o.cons.map((p) => <li key={p} className="con">{p}</li>)}
              </ul>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="fact"><div className="fact-k">{k}</div><div className="fact-v">{v}</div></div>;
}

/* ---------- 2. material ---------- */
function MaterialSection({ qty, setQty, minSheets, locked }: { qty: number; setQty: (n: number) => void; minSheets: number; locked: boolean }) {
  const spares = qty - material.nesting;
  const pct = (spares / material.nesting) * 100;
  const full = Math.floor(material.nesting);
  const frac = material.nesting - full;
  return (
    <div className="material">
      <div className="material-top">
        <div className="machine-facts">
          <Fact k="Sheet" v="2500 × 1250 mm" />
          <Fact k="Price" v={`${eur(material.price)} / sheet`} />
          <Fact k="Supplier" v={`${material.supplier}, palletised`} />
          <Fact k="Shipping" v={eur(material.shipping)} />
          <Fact k="Fits bed" v="Yes, 500 × 250 mm clearance" />
        </div>
      </div>
      <div className="material-main">
        <div className="nest">
          <div className="nest-head">
            <div>
              <div className="mini-label">Nesting estimate from {project.file}</div>
              <div className="nest-figure"><span className="mono">{material.nesting}</span> sheets for {project.parts} parts</div>
            </div>
            <div className="qty">
              <div className="mini-label">Ordering</div>
              <div className="stepper">
                <button disabled={locked || qty <= 1} onClick={() => setQty(qty - 1)} aria-label="One sheet fewer">−</button>
                <input
                  type="number" value={qty} disabled={locked} min={1} max={40}
                  onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setQty(Math.max(1, Math.min(40, v))); }}
                />
                <button disabled={locked || qty >= 40} onClick={() => setQty(qty + 1)} aria-label="One sheet more">+</button>
              </div>
              <div className="qty-sub">sheets · {eur(qty * material.price)}</div>
            </div>
          </div>
          <div className="sheets">
            {Array.from({ length: Math.max(qty, minSheets) }, (_, i) => {
              const ordered = i < qty;
              const used = i < full ? 1 : i === full ? frac : 0;
              return (
                <div key={i} className={`sheet ${!ordered ? 'sheet-missing' : used === 0 ? 'sheet-spare' : ''}`} title={!ordered ? 'Needed but not ordered' : used === 1 ? 'Fully nested' : used > 0 ? `${Math.round(used * 100)}% nested` : 'Spare'}>
                  {ordered && used > 0 && <div className="sheet-fill" style={{ width: `${used * 100}%` }} />}
                  <span>{i + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="sheet-legend">
            <span><i className="lg lg-nest" />Nested parts</span>
            <span><i className="lg lg-spare" />Spare</span>
            {qty < minSheets && <span><i className="lg lg-missing" />Needed, not ordered</span>}
          </div>
          {qty < minSheets ? (
            <p className="note note-warn">{qty} sheets won’t fit the nesting. You need at least {minSheets}.</p>
          ) : (
            <p className="note">
              <strong>{spares.toFixed(1)} spare sheets ({pct.toFixed(0)}%)</strong>.{' '}
              {pct < 10
                ? 'Below the lab’s 10% guideline for 5-axis work. One tear-out or fixture failure and you’re reordering with a week’s lead time.'
                : pct > 25
                  ? `More than the lab’s 10–15% guideline. Each whole unused sheet returned after confirmation costs the grant ${eur(material.price * RETURN_LOSS, 2)}.`
                  : 'Within the lab’s 10–15% guideline for 5-axis work. Covers tear-out, a failed fixture, or recutting a few parts.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. supervision ---------- */
function SupervisionSection({ block, mode, setMode, hours, toggleHour, locked, totalMin }: {
  block: BlockOption; mode: SupMode; setMode: (m: SupMode) => void; hours: Set<string>; toggleHour: (k: string) => void; locked: boolean; totalMin: number;
}) {
  const keys = hourKeys(block);
  const all = keys.length;
  const eve = keys.filter((k) => k.hour >= EVENING_FROM).length;
  const opts: { id: SupMode; title: string; hours: number; desc: string }[] = [
    { id: 'none', title: 'No technician', hours: 0, desc: 'You run it yourself. After 18:00 the lab requires a second certified person in the building.' },
    { id: 'evening', title: 'After 18:00 only', hours: eve, desc: eve ? `A technician covers the unstaffed hours (${eve} h).` : 'This block has no hours after 18:00.' },
    { id: 'full', title: 'Whole block', hours: all, desc: 'A technician is on the machine for every hour, and you can step away.' },
  ];
  const threshold = APPROVAL_THRESHOLD - totalMin;
  return (
    <div className="sup">
      <p className="lead">
        Do you want a technician on the run? Each supervised hour adds {eur(machine.supervisionRate)} to the fabrication budget.
        Adding <strong>{Math.floor(threshold / machine.supervisionRate) + 1} h or more</strong> takes the total over {eur(APPROVAL_THRESHOLD)}, and then Prof. Ribeiro has to approve.
      </p>
      <div className="sup-opts">
        {opts.map((o) => (
          <label key={o.id} className={`option compact ${mode === o.id ? 'option-sel' : ''} ${locked ? 'option-locked' : ''}`}>
            <input type="radio" name="sup" checked={mode === o.id} disabled={locked} onChange={() => setMode(o.id)} />
            <div>
              <div className="option-title">{o.title}</div>
              <div className="option-sub">{o.hours} h · +{eur(o.hours * machine.supervisionRate)} · total {eur(totalMin + o.hours * machine.supervisionRate)}</div>
              <div className="option-desc">{o.desc}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="hours">
        <div className="hours-head">
          <span className="mini-label">Supervised hours: click any hour to change it</span>
          <span className="mono">{hours.size} of {all} h{mode === 'custom' ? ' · custom' : ''}</span>
        </div>
        {block.segments.map((s, si) => (
          <div key={si} className="hours-row">
            <div className="hours-day">{s.dayLabel}</div>
            <div className="hours-cells">
              {Array.from({ length: s.end - s.start }, (_, i) => {
                const h = s.start + i;
                const k = `${si}:${h}`;
                const on = hours.has(k);
                return (
                  <button key={k} disabled={locked} className={`hcell ${on ? 'hcell-on' : ''} ${h >= EVENING_FROM ? 'hcell-eve' : ''}`} onClick={() => toggleHour(k)} title={`${hh(h)}–${hh(h + 1)}${on ? ' · supervised' : ''}`}>
                    {pad(h)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 4. risk ---------- */
function RiskSection({ qty, confirmBy, phase }: { qty: number; confirmBy: Date; phase: Phase }) {
  const spareWhole = Math.max(0, Math.floor(qty - material.nesting));
  const [unused, setUnused] = useState(spareWhole);
  useEffect(() => { setUnused((u) => Math.min(u, qty)); }, [qty]);
  const loss = unused * material.price * RETURN_LOSS;
  return (
    <div className="risk">
      <div className="risk-cols">
        <div className="risk-col risk-free">
          <div className="risk-when">Until the supplier confirms · ≈ {fmtDT(confirmBy)}</div>
          <div className="risk-big">€0</div>
          <p>Cancel everything and nothing is charged. The machine block is released. Your July cancellation (KF-2026-0602) worked this way.</p>
        </div>
        <div className="risk-col risk-loss">
          <div className="risk-when">After confirmation</div>
          <div className="risk-big">30%</div>
          <p>Unused whole sheets go to the lab’s shared stock and the grant gets 70% back, so each sheet loses {eur(material.price * RETURN_LOSS, 2)}. Shipping isn’t refunded. Offcuts aren’t returnable.</p>
        </div>
      </div>
      <div className="calc">
        <div className="calc-head">
          <span>If <strong className="mono">{unused}</strong> of {qty} sheets end up unused</span>
          <span className="calc-result">Grant loses <strong className="mono">{eur(loss, 2)}</strong></span>
        </div>
        <input type="range" min={0} max={qty} value={unused} onChange={(e) => setUnused(+e.target.value)} />
        <div className="calc-marks">
          <button className="link" onClick={() => setUnused(spareWhole)}>Spares unused ({spareWhole}) → {eur(spareWhole * material.price * RETURN_LOSS, 2)}</button>
          <button className="link" onClick={() => setUnused(qty)}>Whole order unused ({qty}) → {eur(qty * material.price * RETURN_LOSS + material.shipping, 2)} incl. shipping</button>
        </div>
      </div>
      {phase.kind === 'draft' && (
        <p className="fine">Your September order (KF-2026-0790) returned 5 sheets and lost €93 this way.</p>
      )}
    </div>
  );
}

/* ---------- 5. history ---------- */
function HistorySection() {
  const statusLabel = { completed: 'Completed', cancelled: 'Cancelled in window', partial: 'Partial return', scheduled: 'Scheduled' } as const;
  return (
    <table className="history">
      <thead>
        <tr><th>Ref</th><th>Date</th><th>By</th><th>What</th><th className="num">Amount</th><th>Status</th></tr>
      </thead>
      <tbody>
        {pastCommitments.map((c) => (
          <tr key={c.id} className={c.note ? 'has-note' : ''}>
            <td className="mono">{c.id}</td>
            <td>{c.date}</td>
            <td>{c.by}</td>
            <td>{c.what}{c.note && <div className="row-note">{c.note}</div>}</td>
            <td className="num mono">{c.status === 'cancelled' ? <s>{eur(c.amount)}</s> : eur(c.amount)}</td>
            <td><span className={`pill pill-${c.status}`}>{statusLabel[c.status]}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- side: summary ---------- */
function SummaryPanel(p: {
  block: BlockOption; blockHours: number; qty: number; supMode: SupMode; supCount: number;
  cnc: number; sup: number; ply: number; ship: number; total: number; totalMin: number; totalMax: number; fabCharge: number; matCharge: number; orderLabel: string;
}) {
  const unset = p.supMode === 'unset';
  const scaleMax = 3000;
  const x = (n: number) => `${(n / scaleMax) * 100}%`;
  return (
    <div className="card summary">
      <div className="summary-head">
        <h3>Order summary</h3>
        <span className="mini-label">{p.orderLabel}</span>
      </div>
      <table className="lines">
        <tbody>
          <tr><td>Big Kerf · {p.blockHours} h × {eur(machine.rate)}<div className="line-sub">{p.block.short}</div></td><td className="num mono">{eur(p.cnc)}</td></tr>
          <tr className={unset ? 'line-pending' : ''}>
            <td>Supervision · {unset ? 'not chosen yet' : `${p.supCount} h × ${eur(machine.supervisionRate)}`}<div className="line-sub">{unset ? `€0 – ${eur(p.blockHours * machine.supervisionRate)}` : p.supCount === 0 ? 'You operate, no technician' : 'Technician on site'}</div></td>
            <td className="num mono">{unset ? '–' : eur(p.sup)}</td>
          </tr>
          <tr><td>Birch 18 mm · {p.qty} × {eur(material.price)}<div className="line-sub">{(p.qty - material.nesting).toFixed(1)} spares over nesting</div></td><td className="num mono">{eur(p.ply)}</td></tr>
          <tr><td>Shipping · {material.supplier}<div className="line-sub">Delivered {fmtDay(DELIVERY)}</div></td><td className="num mono">{eur(p.ship)}</td></tr>
        </tbody>
        <tfoot>
          <tr><td>Total</td><td className="num mono total">{unset ? `${eur(p.totalMin)}–${eur(p.totalMax).slice(1)}` : eur(p.total)}</td></tr>
        </tfoot>
      </table>

      <div className="thresh">
        <div className="thresh-bar">
          {unset && <div className="thresh-range" style={{ left: x(p.totalMin), width: x(p.totalMax - p.totalMin) }} />}
          <div className={`thresh-fill ${!unset && p.total > APPROVAL_THRESHOLD ? 'over' : ''}`} style={{ width: x(unset ? p.totalMin : p.total) }} />
          <div className="thresh-mark" style={{ left: x(APPROVAL_THRESHOLD) }}><span>Approval above {eur(APPROVAL_THRESHOLD)}</span></div>
        </div>
      </div>

      <div className="budgets">
        <Budget label="Fabrication budget" remaining={grant.fabricationRemaining} charge={p.fabCharge} pending={unset ? p.blockHours * machine.supervisionRate : 0} />
        <Budget label="Materials budget" remaining={grant.materialsRemaining} charge={p.matCharge} />
      </div>
    </div>
  );
}

function Budget({ label, remaining, charge, pending = 0 }: { label: string; remaining: number; charge: number; pending?: number }) {
  const after = remaining - charge;
  return (
    <div className="budget">
      <div className="budget-top">
        <span>{label}</span>
        <span className="mono">{eur(remaining)} → <strong>{eur(after)}</strong></span>
      </div>
      <div className="budget-bar">
        <div className="budget-use" style={{ width: `${(charge / remaining) * 100}%` }} />
        {pending > 0 && <div className="budget-pend" style={{ left: `${(charge / remaining) * 100}%`, width: `${(pending / remaining) * 100}%` }} />}
      </div>
      <div className="budget-sub">This order uses {eur(charge)}{pending > 0 ? `, up to ${eur(pending)} more for supervision` : ''} · {((charge / remaining) * 100).toFixed(0)}% of what’s left</div>
    </div>
  );
}

/* ---------- side: approval ---------- */
function ApprovalPanel({ required, total, approval, setApproval, now, supUnset, totalMax, locked }: {
  required: boolean; total: number; approval: Approval; setApproval: (a: Approval) => void; now: Date; supUnset: boolean; totalMax: number; locked: boolean;
}) {
  const [emailMode, setEmailMode] = useState(false);
  const [ref, setRef] = useState('');
  const stale = approval.state === 'approved' && total > approval.amount;

  let body: React.ReactNode;
  if (approval.state === 'approved' && !stale) {
    body = (
      <div className="appr appr-ok">
        <div className="appr-status">✓ Approved by {grant.pi}</div>
        <div className="appr-meta">{fmtDT(approval.at)} · up to {eur(approval.amount)} · {approval.method === 'kerfline' ? 'via Kerfline' : 'by email, recorded by you'}</div>
        {approval.note && <blockquote>“{approval.note}”</blockquote>}
      </div>
    );
  } else if (approval.state === 'pending') {
    body = (
      <div className="appr appr-pending">
        <div className="appr-status"><span className="spinner" /> Waiting for {grant.pi}</div>
        <div className="appr-meta">Sent {fmtTime(approval.sentAt)} to {grant.piEmail} for {eur(approval.amount)}. She usually replies the same day.</div>
        <button className="link" onClick={() => setApproval({ state: 'none' })}>Withdraw request</button>
      </div>
    );
  } else if (!required) {
    body = (
      <div className="appr">
        <div className="appr-status muted">{supUnset ? 'Depends on supervision' : 'Not required'}</div>
        <div className="appr-meta">
          {supUnset
            ? `Total ranges up to ${eur(totalMax)}. Above ${eur(APPROVAL_THRESHOLD)} the PI has to approve.`
            : `${eur(total)} is ${eur(APPROVAL_THRESHOLD - total)} under the ${eur(APPROVAL_THRESHOLD)} threshold. ${grant.pi} is notified of the commitment.`}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="appr appr-need">
        {stale && <div className="appr-stale">She approved {eur((approval as Extract<Approval, { state: 'approved' }>).amount)}, but the total is now {eur(total)}. You need a new approval.</div>}
        <div className="appr-status">Required: {eur(total)} is over {eur(APPROVAL_THRESHOLD)}</div>
        {!emailMode ? (
          <>
            <button className="btn btn-secondary btn-block" disabled={locked} onClick={() => setApproval({ state: 'pending', sentAt: now, amount: total })}>
              Request approval from {grant.pi}
            </button>
            <button className="link" disabled={locked} onClick={() => setEmailMode(true)}>She already approved by email</button>
          </>
        ) : (
          <div className="email-rec">
            <label className="mini-label" htmlFor="ref">Email date and subject, for the grant record</label>
            <input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 13 Nov, “Re: shell plywood + CNC”" />
            <div className="row">
              <button className="btn btn-secondary" disabled={ref.trim().length < 4} onClick={() => setApproval({ state: 'approved', at: now, amount: total, method: 'email', note: `Email: ${ref.trim()}` })}>Record approval</button>
              <button className="link" onClick={() => setEmailMode(false)}>Back</button>
            </div>
            <p className="fine">The lab manager audits email approvals against the grant at month end.</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="card approval">
      <div className="summary-head">
        <h3>Advisor approval</h3>
        <span className="mini-label">{grant.pi}</span>
      </div>
      {body}
    </div>
  );
}

/* ---------- dialogs ---------- */
function Modal({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  );
}

function ConfirmDialog({ onClose, onConfirm, block, qty, supCount, total, confirmBy, fabCharge, matCharge }: {
  onClose: () => void; onConfirm: () => void; block: BlockOption; qty: number; supCount: number; total: number; confirmBy: Date; fabCharge: number; matCharge: number;
}) {
  const [ack, setAck] = useState(false);
  return (
    <Modal onClose={onClose} label="Confirm commitment">
      <h3>Commit {eur(total)} to {grant.title}?</h3>
      <ul className="confirm-list">
        <li><strong>Big Kerf</strong>, {block.short}{supCount > 0 ? `, ${supCount} h with a technician` : ', no technician'}. {eur(fabCharge)} from the fabrication budget.</li>
        <li><strong>{qty} sheets</strong> of 18 mm birch from {material.supplier}, delivered {fmtDay(DELIVERY)}. {eur(matCharge)} from the materials budget.</li>
      </ul>
      <div className="confirm-window">
        <div><span className="mini-label">Free to cancel until</span><div>≈ {fmtDT(confirmBy)}</div></div>
        <div><span className="mini-label">After that</span><div>{eur(material.price * RETURN_LOSS, 2)} lost per unused sheet</div></div>
      </div>
      <label className="ack">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        <span>I understand that once the supplier confirms, unused sheets go to shared stock at a 30% loss to {grant.pi}’s grant.</span>
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Back to draft</button>
        <button className="btn btn-primary" disabled={!ack} onClick={onConfirm}>Commit and send order</button>
      </div>
    </Modal>
  );
}

function CancelDialog({ onClose, onConfirm, total, confirmBy, now, blockLabel }: { onClose: () => void; onConfirm: () => void; total: number; confirmBy: Date; now: Date; blockLabel: string }) {
  return (
    <Modal onClose={onClose} label="Cancel commitment">
      <h3>Cancel this commitment?</h3>
      <p>The supplier hasn’t confirmed yet, so cancelling costs nothing: the {eur(total)} is released back to {grant.title} and the Big Kerf block opens up for others.</p>
      <p className="fine">About {fmtDuration(confirmBy.getTime() - now.getTime())} left in the free window. Once you cancel, someone else may book {blockLabel}.</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Keep commitment</button>
        <button className="btn btn-danger" onClick={onConfirm}>Cancel, no charge</button>
      </div>
    </Modal>
  );
}
