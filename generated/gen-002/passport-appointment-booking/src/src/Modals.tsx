import React from 'react';
import { CHILDREN, ChildId, CURRENCY, EXPEDITE_FEE, OFFICES, OPENINGS } from './data';
import { Attendance, deleShift, Evaluation, fmtDayLong, fmtDM, fmtLong, fmtMin, fmtShort, fmtTime, pad, parse, ProcessingOutcome, slotTimes, timeRange } from './logic';
import type { FlowState, ProcChoice, Reservation } from './types';
import { Modal, OfficeBadge, StatusIcon } from './ui';
import * as I from './icons';
import { fmtClock } from './App';

const childName = (id: ChildId) => CHILDREN.find((c) => c.id === id)!.name;

/* ================= Booking flow ================= */
export function BookingFlow({
  flow,
  ev,
  attendance,
  reservation,
  onClose,
  onConfirm,
  onMessage,
  toast,
}: {
  flow: NonNullable<FlowState>;
  ev: Evaluation;
  attendance: Attendance;
  reservation: Reservation;
  onClose: () => void;
  onConfirm: (id: string, p: ProcChoice, order: [ChildId, ChildId]) => void;
  onMessage: () => void;
  toast: (s: string) => void;
}) {
  const [step, setStep] = React.useState(0);
  const def = ev.recommended ?? 'expedited';
  const [proc, setProc] = React.useState<ProcChoice>({ ayo: def, temi: def });
  const [order, setOrder] = React.useState<[ChildId, ChildId]>(['ayo', 'temi']);
  const [docs, setDocs] = React.useState<Record<string, boolean>>({});
  const [doneRef, setDoneRef] = React.useState<string | null>(null);
  const office = OFFICES[ev.opening.office];
  const { first, second, end } = slotTimes(ev.opening);
  const move = flow.mode === 'move';
  const holdOther = reservation.kind === 'hold' && reservation.openingId !== ev.opening.id;
  const heldO = reservation.kind === 'hold' ? OPENINGS.find((o) => o.id === reservation.openingId) : null;
  const heldLabel = heldO ? `${OFFICES[heldO.office].name}, ${fmtShort(parse(heldO.date))} ${timeRange(heldO)}` : '';
  const fromEv =
    reservation.kind === 'booked' && reservation.openingId !== ev.opening.id ? OPENINGS.find((o) => o.id === reservation.openingId) : null;

  const fee = (['ayo', 'temi'] as ChildId[]).filter((c) => proc[c] === 'expedited').length * EXPEDITE_FEE;
  const outcome = (c: ChildId): ProcessingOutcome => (proc[c] === 'standard' ? ev.std : ev.exp);
  const worstStatus = (['ayo', 'temi'] as ChildId[]).map(outcome).some((p) => p.status === 'late')
    ? 'late'
    : (['ayo', 'temi'] as ChildId[]).map(outcome).some((p) => p.status === 'tight')
      ? 'tight'
      : 'ok';

  const steps = ['Time & people', 'Processing', 'What to bring'];

  if (doneRef) {
    return (
      <Modal onClose={onClose} width={560}>
        <div className="done">
          <div className="done-tick">
            <I.Check size={28} />
          </div>
          <h2 id="modal-title">{move ? 'Visit moved' : 'You’re booked'}</h2>
          <p className="muted">
            Reference <span className="mono strong">{doneRef}</span> · confirmation sent to you and Dele
          </p>
          <div className="done-card">
            <div className="dc-row">
              <I.Calendar size={16} />
              <div>
                <strong>{fmtLong(ev.dateObj)}</strong>
                <div className="muted">
                  {childName(order[0])} {fmtMin(first)} · {childName(order[1])} {fmtMin(second)} — arrive by {fmtMin(first - 10)}
                </div>
              </div>
            </div>
            <div className="dc-row">
              <I.Pin size={16} />
              <div>
                <strong>{office.full}</strong>
                <div className="muted">{office.address}</div>
              </div>
            </div>
            <div className="dc-row">
              <I.Doc size={16} />
              <div>
                <strong>
                  {fee ? `Expedited for ${(['ayo', 'temi'] as ChildId[]).filter((c) => proc[c] === 'expedited').map(childName).join(' & ')} — ${CURRENCY}${fee} at the counter` : 'Standard processing — no extra fee'}
                </strong>
                <div className="muted">
                  Passports expected by {fmtDM(new Date(Math.max(outcome('ayo').worst.getTime(), outcome('temi').worst.getTime())))}
                </div>
              </div>
            </div>
          </div>
          <div className="done-actions">
            <button className="btn btn-secondary" onClick={() => downloadIcs(ev, order, doneRef)}>
              <I.Calendar size={15} /> Add to calendar
            </button>
            <button className="btn btn-secondary" onClick={onMessage}>
              <I.Message size={15} /> Text Dele the details
            </button>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
          <p className="tiny muted">You can move or cancel up to 24 hours before, from this page or the link in your email.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title={move ? 'Move your family visit' : 'Book your family visit'} width={680}>
      <ol className="stepper">
        {steps.map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'past' : ''}>
            <span>{i < step ? <I.Check size={12} /> : i + 1}</span> {s}
          </li>
        ))}
      </ol>

      <div className="modal-body">
        {step === 0 && (
          <>
            <div className="sum-card">
              <OfficeBadge letter={office.letter} className="lg" />
              <div>
                <div className="sum-date">{fmtDayLong(ev.dateObj)}</div>
                <div className="sum-office">
                  {office.full} · {office.km} km
                </div>
                <div className="tiny muted">{office.address}</div>
              </div>
            </div>
            <div className="slots">
              {order.map((c, i) => (
                <div className="slot" key={c}>
                  <span className="slot-time">{fmtMin(i === 0 ? first : second)}</span>
                  <span className={`pavatar pa-${c}`}>{childName(c)[0]}</span>
                  <span>
                    {childName(c)} · {CHILDREN.find((x) => x.id === c)!.kind.toLowerCase()}
                  </span>
                </div>
              ))}
              <button className="link" onClick={() => setOrder([order[1], order[0]])}>
                <I.Swap size={13} /> Swap who goes first
              </button>
            </div>
            <div className="who">
              <div className="who-title">Coming with them</div>
              <div className="who-line">
                {attendance === 'both' ? 'You and Dele (both parents — no consent form needed)' : 'You, with consent form PC-3 signed by Dele'}
              </div>
              <ul className="fit-list">
                <FitLine label="Dele" s={ev.dele.status} t={`${ev.dele.short} · ${ev.dele.detail}`} />
                <FitLine label="Ayo & Temi" s={ev.kids.status} t={`${ev.kids.status === 'cost' ? ev.kids.short + ' of school' : ev.kids.short} · ${ev.kids.detail}`} />
                <FitLine label="You" s={ev.you.status} t={`${ev.you.short} · ${ev.you.detail}`} />
              </ul>
            </div>
            {ev.verdict === 'check' && (
              <div className="alert alert-info">
                <I.Help size={16} />
                <div>
                  Dele hasn’t shared his shifts for the week of {fmtDM(ev.dateObj)} yet. Worth a quick text before you book.{' '}
                  <button className="link" onClick={onMessage}>
                    Text Dele
                  </button>
                </div>
              </div>
            )}
            {holdOther && (
              <div className="alert alert-hold">
                <I.Clock size={16} />
                <div>Booking this releases your hold on {heldLabel}.</div>
              </div>
            )}
            {move && fromEv && (
              <div className="alert alert-info">
                <I.Swap size={16} />
                <div>
                  Moving from {OFFICES[fromEv.office].name}, {fmtShort(parse(fromEv.date))} {fmtTime(fromEv.start)}. Your current time stays booked
                  until you confirm this one.
                </div>
              </div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Choose for each child. Dates include the 24 Dec – 1 Jan pause and up to 5 working days by registered post. You pay any expedited fee
              at the counter.
            </p>
            {(['ayo', 'temi'] as ChildId[]).map((c) => (
              <div className="proc-child" key={c}>
                <div className="pc-name">
                  <span className={`pavatar pa-${c}`}>{childName(c)[0]}</span> {childName(c)}
                </div>
                <div className="pc-opts" role="radiogroup" aria-label={`Processing for ${childName(c)}`}>
                  {(['standard', 'expedited'] as const).map((k) => {
                    const p = k === 'standard' ? ev.std : ev.exp;
                    return (
                      <button
                        key={k}
                        role="radio"
                        aria-checked={proc[c] === k}
                        className={`pc-opt ${proc[c] === k ? 'on' : ''} po-${p.status}`}
                        onClick={() => setProc({ ...proc, [c]: k })}
                      >
                        <span className="radio" />
                        <span className="po-main">
                          <strong>{k === 'standard' ? 'Standard · 6–8 weeks' : 'Expedited · 2–3 weeks'}</strong>
                          <span>
                            Arrives {fmtDM(p.best)} – {fmtDM(p.worst)}
                          </span>
                        </span>
                        <span className="po-side">
                          <span className={`po-status ps-${p.status}`}>
                            <StatusIcon status={p.status} size={12} />
                            {p.status === 'ok' ? 'In time' : p.status === 'tight' ? 'Close' : 'May miss trip'}
                          </span>
                          <span className="po-fee">{k === 'standard' ? 'No extra fee' : `+${CURRENCY}${EXPEDITE_FEE}`}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="proc-total">
              <span>Extra fee at the counter</span>
              <strong>
                {CURRENCY}
                {fee}
              </strong>
            </div>
            {worstStatus === 'late' && (
              <div className="alert alert-bad">
                <I.Alert size={16} />
                <div>
                  With standard processing a passport could arrive after you fly on 14 Feb. Expedited brings it to {fmtDM(ev.exp.worst)} at the latest.
                </div>
              </div>
            )}
            {worstStatus === 'tight' && (
              <div className="alert alert-warn">
                <I.Alert size={16} />
                <div>This could arrive in the last week before you fly — little room if the post is slow.</div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Tick things off as you gather them — this list is saved to your appointment. Originals only; copies aren’t accepted.
            </p>
            <div className="docs">
              {(['ayo', 'temi'] as ChildId[]).map((c) => (
                <div className="doc-col" key={c}>
                  <div className="pc-name">
                    <span className={`pavatar pa-${c}`}>{childName(c)[0]}</span> For {childName(c)}
                  </div>
                  <DocItem id={`${c}-bc`} docs={docs} setDocs={setDocs} title="Birth certificate (original)" sub="Full version listing both parents" />
                  <DocItem id={`${c}-ph`} docs={docs} setDocs={setDocs} title="Two identical photos" sub="35 × 45 mm, plain light background, taken in the last month" />
                  {attendance === 'consent' && (
                    <DocItem id={`${c}-pc`} docs={docs} setDocs={setDocs} title="Consent form PC-3" sub="Signed by Dele, with a copy of his civil-ID card" />
                  )}
                </div>
              ))}
            </div>
            <div className="doc-col doc-parents">
              <div className="pc-name">For the parents</div>
              <DocItem id="m-id" docs={docs} setDocs={setDocs} title="Your civil-ID card" sub="Use this if your passport is away for renewal" />
              {attendance === 'both' ? (
                <DocItem id="d-id" docs={docs} setDocs={setDocs} title="Dele’s civil-ID card or passport" />
              ) : (
                <button className="link" onClick={() => downloadPc3(toast)}>
                  <I.Doc size={13} /> Download form PC-3 to print for Dele
                </button>
              )}
            </div>
            <div className="alert alert-info">
              <I.Clock size={16} />
              <div>
                Arrive by {fmtMin(first - 10)}. Both children need to be there for the whole visit (until about {fmtMin(end)}).
                {office.note ? ` ${office.note}.` : ''}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="modal-foot">
        {step > 0 ? (
          <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={onClose}>
            Not now
          </button>
        )}
        <div className="foot-summary">
          {fmtShort(ev.dateObj)} · {timeRange(ev.opening)} · {office.name}
          {step >= 1 && ` · ${CURRENCY}${fee} extra`}
        </div>
        {step < 2 ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Continue
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => {
              const ref = reservation.kind === 'booked' ? reservation.ref : 'CT-4K7-2M9Q';
              onConfirm(ev.opening.id, proc, order);
              setDoneRef(ref);
            }}
          >
            {move ? 'Confirm move' : 'Confirm booking'}
          </button>
        )}
      </div>
    </Modal>
  );
}

function FitLine({ label, s, t }: { label: string; s: any; t: string }) {
  return (
    <li className={`fit fit-${s}`}>
      <StatusIcon status={s} size={12} />
      <strong>{label}</strong>
      <span>{t}</span>
    </li>
  );
}

function DocItem({
  id,
  docs,
  setDocs,
  title,
  sub,
}: {
  id: string;
  docs: Record<string, boolean>;
  setDocs: (d: Record<string, boolean>) => void;
  title: string;
  sub?: string;
}) {
  return (
    <label className={`doc ${docs[id] ? 'got' : ''}`}>
      <input type="checkbox" checked={!!docs[id]} onChange={(e) => setDocs({ ...docs, [id]: e.target.checked })} />
      <span className="doc-box">{docs[id] && <I.Check size={12} />}</span>
      <span>
        <strong>{title}</strong>
        {sub && <span className="doc-sub">{sub}</span>}
      </span>
    </label>
  );
}

function download(name: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadIcs(ev: Evaluation, order: [ChildId, ChildId], ref: string) {
  const o = OFFICES[ev.opening.office];
  const { first, end } = slotTimes(ev.opening);
  const d = ev.dateObj;
  const stamp = (m: number) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Countertime//Registry appointments//EN',
    'BEGIN:VEVENT',
    `UID:${ref}@countertime`,
    `DTSTAMP:20261116T120000`,
    `DTSTART:${stamp(first - 10)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:Passport visit – ${childName(order[0])} & ${childName(order[1])} (${ref})`,
    `LOCATION:${o.full}\\, ${o.address.replace(/,/g, '\\,')}`,
    `DESCRIPTION:${childName(order[0])} ${fmtMin(first)}\\, ${childName(order[1])} ${fmtMin(first + 20)}. Bring birth certificates and two photos each.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  download(`passport-visit-${ref}.ics`, 'text/calendar', ics);
}

function downloadPc3(toast: (s: string) => void) {
  const html = `<!doctype html><meta charset="utf-8"><title>Form PC-3 – Parental consent</title>
<style>body{font:15px/1.5 system-ui;max-width:640px;margin:40px auto;color:#111}h1{font-size:20px}.line{border-bottom:1px solid #333;height:28px;margin:8px 0 18px}</style>
<h1>Form PC-3 · Consent of a parent not attending</h1>
<p>National Passport &amp; Civil-ID Registry</p>
<p>I consent to passports being issued to the children named below. I will not attend the in-person visit.</p>
<p>Child 1: Ayo Okafor (application PA-26-118 40Q)</p><p>Child 2: Temi Okafor (application PA-26-118 41R)</p>
<p>Parent giving consent (full name)</p><div class="line"></div>
<p>Civil-ID number</p><div class="line"></div><p>Signature and date</p><div class="line"></div>
<p><small>Attach a photocopy of the front and back of your civil-ID card.</small></p>`;
  download('PC-3-parental-consent.html', 'text/html', html);
  toast('Form PC-3 downloaded — print it for Dele to sign.');
}

/* ================= Text Dele ================= */
function describe(ev: Evaluation, attendance: Attendance) {
  const o = OFFICES[ev.opening.office];
  const { end } = slotTimes(ev.opening);
  const back = end + o.driveMin;
  const parts: string[] = [];
  parts.push(`${fmtShort(ev.dateObj)}, ${fmtTime(ev.opening.start)} at ${o.name} (${o.km} km).`);
  const kids = ev.kids.status === 'cost' ? `Kids miss ${ev.kids.short.replace('Miss ', '')} of school` : 'No school missed';
  const me = ev.you.status === 'cost' ? `I take ${ev.you.short.replace(' off', '')} off work` : 'I’m off work';
  parts.push(`${kids}, ${me}.`);
  if (attendance === 'both') {
    const sh = deleShift(ev.dateObj);
    if (ev.dele.status === 'unknown') parts.push('Don’t have your shifts for that week — early or late?');
    else if (ev.dele.status === 'bad') parts.push(`Clashes with your ${sh.kind === 'early' || sh.kind === 'late' ? sh.label.toLowerCase() : ''} shift, so you’d sign the consent form instead.`);
    else if (sh.kind === 'late') parts.push(`Back by ${fmtMin(back)}, before your ${fmtTime(sh.start)} shift.`);
    else if (sh.kind === 'early') parts.push(`After your early shift (off ${fmtTime(sh.end)}).`);
  } else parts.push('You’d just sign the PC-3 form.');
  if (ev.recommended === 'standard') parts.push(`Standard processing is fine: passports by ${fmtDM(ev.std.worst)}, nothing extra.`);
  else if (ev.recommended === 'expedited')
    parts.push(
      `Needs expedited (+${CURRENCY}${ev.extraCost} for both) to get passports by ${fmtDM(ev.exp.worst)}. On standard they might only come ${fmtDM(ev.std.worst)}${ev.std.status === 'late' ? ', after we fly' : ''}.`,
    );
  else parts.push('Too late — passports wouldn’t arrive before the trip.');
  return parts.join(' ');
}

export function DeleMessage({
  a,
  b,
  reservation,
  attendance,
  onClose,
  toast,
}: {
  a: Evaluation;
  b: Evaluation | null;
  reservation: Reservation;
  attendance: Attendance;
  onClose: () => void;
  toast: (s: string) => void;
}) {
  const initial = React.useMemo(() => {
    if (reservation.kind === 'booked') {
      const ev = a;
      const { first, second } = slotTimes(ev.opening);
      const o = OFFICES[ev.opening.office];
      return `Booked the kids’ passport visit 🎉 ${fmtDayLong(ev.dateObj)} at ${o.name}: ${childName(reservation.order[0])} ${fmtMin(first)}, ${childName(reservation.order[1])} ${fmtMin(second)}. We need to leave home by ${fmtMin(first - o.driveMin - 10)}. Ref ${reservation.ref}. Bring your ID card!`;
    }
    const intro = 'Dele — kids’ passport appointment. They both have to go in person and we both need to be there (or you sign a consent form).';
    const opts = b ? `\n\nA) ${describe(a, attendance)}\n\nB) ${describe(b, attendance)}` : `\n\n${describe(a, attendance)}`;
    let end = b ? '\n\nWhich one works for you?' : '\n\nDoes that work for you?';
    if (reservation.kind === 'hold') {
      const heldIsA = reservation.openingId === a.opening.id;
      end = `\n\nI’m holding ${b ? (heldIsA ? 'A' : reservation.openingId === b.opening.id ? 'B' : 'the Saturday') : 'it'} until ${fmtClock(reservation.expiresAt)}.${b ? ' Which one?' : ' OK?'}`;
    }
    return intro + opts + end;
  }, [a, b, reservation, attendance]);
  const [text, setText] = React.useState(initial);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Copied — paste it into your chat with Dele.');
  };
  return (
    <Modal onClose={onClose} title="Text Dele" width={560}>
      <div className="modal-body">
        <div className="msg-to">
          <span className="pavatar pa-dele">D</span>
          <div>
            <strong>Dele Okafor</strong>
            <div className="tiny muted">Linked household member · mobile ending 4471</div>
          </div>
        </div>
        <textarea className="msg-text" value={text} onChange={(e) => setText(e.target.value)} rows={12} aria-label="Message to Dele" />
        <div className="tiny muted">{text.length} characters · edit anything before sending</div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
        <div />
        <div className="foot-btns">
          <a className="btn btn-secondary" href={`sms:?&body=${encodeURIComponent(text)}`}>
            Open in Messages
          </a>
          <button className="btn btn-primary" onClick={copy}>
            <I.Copy size={15} /> Copy message
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ================= Confirm dialogs ================= */
export function CancelDialog({ ev, onClose, onCancel }: { ev: Evaluation; onClose: () => void; onCancel: () => void }) {
  const o = OFFICES[ev.opening.office];
  return (
    <Modal onClose={onClose} title="Cancel this visit?" width={480}>
      <div className="modal-body">
        <p style={{ marginTop: 0 }}>
          <strong>
            {o.name} · {fmtDayLong(ev.dateObj)} · {timeRange(ev.opening)}
          </strong>
        </p>
        <p className="muted">
          Both slots go back to other families straight away and may not come back. Ayo’s and Temi’s applications stay saved, and nothing is
          charged — expedited fees are only paid at the counter.
        </p>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>
          Keep my visit
        </button>
        <div />
        <button className="btn btn-danger" onClick={onCancel}>
          Cancel visit
        </button>
      </div>
    </Modal>
  );
}

export function ReleaseDialog({ ev, onClose, onRelease }: { ev: Evaluation; onClose: () => void; onRelease: () => void }) {
  const o = OFFICES[ev.opening.office];
  return (
    <Modal onClose={onClose} title="Release your hold?" width={480}>
      <div className="modal-body">
        <p style={{ marginTop: 0 }}>
          {o.name}, {fmtDayLong(ev.dateObj)} at {timeRange(ev.opening)} goes back to open slots, and back-to-back family times go quickly.
        </p>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>
          Keep holding
        </button>
        <div />
        <button className="btn btn-danger" onClick={onRelease}>
          Release hold
        </button>
      </div>
    </Modal>
  );
}
