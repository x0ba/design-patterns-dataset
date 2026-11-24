import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PAPER } from '../data';
import { addDays, daysBetween, editionsBetween, fDay, fDuration, fTime, iso, isBusinessDay } from '../dates';
import { useApp } from '../store';
import { Icon } from './ui';

function Modal({ title, sub, children, footer, onClose }: { title: string; sub?: ReactNode; children: ReactNode; footer: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal aria-label={title}>
        <header>
          <div>
            <h3>{title}</h3>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        <footer>{footer}</footer>
      </div>
    </div>
  );
}

export function RebookModal({ id }: { id: string }) {
  const { state, derived, now, setModal, dispatch, nowIso, toast } = useApp();
  const n = state.notices.find((x) => x.id === id)!;
  const dv = derived.get(id)!;
  const today = iso(now);
  const idx = dv.problemIndex;
  const current = idx >= 0 ? n.insertions[idx] : undefined;
  const replace = current?.state === 'unconfirmed' || current?.state === 'confirmed';

  const editions = useMemo(() => editionsBetween(addDays(today, 1), addDays(dv.lastLegal, 6)), [today, dv.lastLegal]);
  const usable = (e: (typeof editions)[number]) => e.exists && e.cutoff > now && e.date <= dv.lastLegal && e.date !== current?.date;
  const first = editions.find(usable);
  const [pick, setPick] = useState<string | undefined>(first?.date);
  const close = () => setModal(null);

  const submit = () => {
    if (!pick) return;
    dispatch({ type: 'rebook', id, index: idx, date: pick, replace, at: nowIso });
    const ed = editions.find((e) => e.date === pick)!;
    toast(`Rebook request sent: ${n.adNo} → ${fDay(pick)}. Paper cutoff ${iso(ed.cutoff) === today ? 'today' : fDay(iso(ed.cutoff))} ${fTime(ed.cutoff)}.`);
    close();
  };

  return (
    <Modal
      title={replace ? `Move insertion ${n.requiredRuns > 1 ? `${idx + 1} of ${n.requiredRuns}` : ''} to another edition` : 'Rebook insertion'}
      sub={
        <>
          <strong>{n.title}</strong> · {n.adNo}
        </>
      }
      onClose={close}
      footer={
        <>
          <span className="muted small">
            <Icon name="phone" size={13} /> Legal desk {PAPER.phone} — call to confirm same-day requests.
          </span>
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" disabled={!pick} onClick={submit}>
            <Icon name="send" size={14} /> Send rebook request
          </button>
        </>
      }
    >
      <div className="rule-box">
        <div>
          <div className="ac-k">Must run by</div>
          <div className="rb-big">{fDay(dv.lastLegal)}</div>
        </div>
        <div className="rb-text">
          {n.statutoryDays} days before {dv.meeting.body}, {fDay(dv.meeting.date)}. {n.requiredRuns} insertion{n.requiredRuns > 1 ? 's' : ''} required
          {n.requiredRuns > 1 ? `; ${dv.published.length} already ran` : ''}.
          {current && (
            <>
              <br />
              Current booking: <strong>{fDay(current.date)}</strong> —{' '}
              {current.state === 'edition_cancelled' ? 'edition cancelled' : current.state === 'unconfirmed' ? 'not confirmed by paper' : current.state.replace('_', ' ')}.
            </>
          )}
        </div>
      </div>

      <div className="ed-list" role="radiogroup" aria-label="Courier-Ledger editions">
        {editions.map((e) => {
          const ok = usable(e);
          const slack = daysBetween(e.date, dv.lastLegal);
          let why = '';
          if (!e.exists) why = e.cancelledReason ?? 'No edition';
          else if (e.date === current?.date) why = 'Current booking';
          else if (e.cutoff <= now) why = `Cutoff passed (${fDay(iso(e.cutoff))} ${fTime(e.cutoff)})`;
          else if (e.date > dv.lastLegal) why = `${-slack} day${slack === -1 ? '' : 's'} past the legal deadline`;
          const cutLeft = e.cutoff.getTime() - now.getTime();
          return (
            <label key={e.date} className={`ed-row${ok ? '' : ' disabled'}${pick === e.date ? ' on' : ''}`}>
              <input type="radio" name="ed" disabled={!ok} checked={pick === e.date} onChange={() => setPick(e.date)} />
              <span className="ed-date">{fDay(e.date)}</span>
              {ok ? (
                <>
                  <span className="ed-cut">
                    Cutoff {iso(e.cutoff) === today ? <strong>today</strong> : fDay(iso(e.cutoff))} {fTime(e.cutoff)}
                    <span className={`cd${cutLeft < 6 * 3600_000 ? ' hot' : ''}`}>{fDuration(cutLeft)} left</span>
                  </span>
                  <span className="ed-slack">{slack === 0 ? 'last legal day' : `${slack}d slack`}</span>
                  {e.date === first?.date && <span className="rec">Recommended — leaves later editions as fallback</span>}
                </>
              ) : (
                <span className="ed-why">{why}</span>
              )}
            </label>
          );
        })}
      </div>
    </Modal>
  );
}

export function RescheduleModal({ id }: { id: string }) {
  const { state, derived, now, setModal, dispatch, nowIso, toast } = useApp();
  const n = state.notices.find((x) => x.id === id)!;
  const dv = derived.get(id)!;
  const today = iso(now);
  const editions = useMemo(() => editionsBetween(addDays(today, 1), addDays(today, 14)).filter((e) => e.exists && e.cutoff > now), [today, now]);
  const [run, setRun] = useState(editions[0]?.date);
  const earliest = run ? addDays(run, n.statutoryDays) : today;
  const openings = useMemo(() => {
    const out: string[] = [];
    for (let c = earliest; out.length < 10; c = addDays(c, 1)) {
      const wd = new Date(c + 'T12:00').getDay();
      if (isBusinessDay(c) && wd >= 2 && wd <= 4) out.push(c);
    }
    return out;
  }, [earliest]);
  const [open, setOpen] = useState(openings[0]);
  useEffect(() => {
    if (!openings.includes(open)) setOpen(openings[0]);
  }, [openings, open]);
  const close = () => setModal(null);

  const submit = () => {
    dispatch({ type: 'reschedule', id, runDate: run!, meetingDate: open, at: nowIso });
    toast(`Bid opening moved to ${fDay(open)}; ${n.adNo} rebook requested for ${fDay(run!)}.`);
    close();
  };

  return (
    <Modal
      title="Reschedule bid opening"
      sub={
        <>
          <strong>{n.title}</strong> · {n.adNo}
        </>
      }
      onClose={close}
      footer={
        <>
          <span className="muted small">Raj Mehta (bid owner) will be notified.</span>
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit} disabled={!run || !open}>
            Reschedule & rebook
          </button>
        </>
      }
    >
      <div className="rule-box missed">
        <div>
          <div className="ac-k">Original bid opening</div>
          <div className="rb-big">{fDay(dv.meeting.date)}</div>
        </div>
        <div className="rb-text">
          Needed one run by {fDay(dv.lastLegal)} ({n.statutoryDays}-day rule). The paper held the Sat Nov 15 insertion because it arrived after the new cutoff. The earliest remaining edition is {fDay(dv.nextEdition.date)}, so the opening date has to move.
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="field-label">1. New run date</div>
          <div className="ed-list compact">
            {editions.slice(0, 5).map((e) => (
              <label key={e.date} className={`ed-row${run === e.date ? ' on' : ''}`}>
                <input type="radio" name="run" checked={run === e.date} onChange={() => setRun(e.date)} />
                <span className="ed-date">{fDay(e.date)}</span>
                <span className="ed-cut">
                  cutoff {iso(e.cutoff) === today ? 'today' : fDay(iso(e.cutoff))}, {fTime(e.cutoff).replace(':00', '')}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="field-label">2. New bid opening (earliest {fDay(earliest)})</div>
          <select className="full" value={open} onChange={(e) => setOpen(e.target.value)}>
            {openings.map((o, i) => (
              <option key={o} value={o}>
                {fDay(o)}, 2:00 PM · {daysBetween(run!, o)} days after run{i === 0 ? ' (earliest)' : ''}
              </option>
            ))}
          </select>
          <div className="field-label" style={{ marginTop: 16 }}>
            Will also happen
          </div>
          <ul className="checklist">
            <li>
              <Icon name="check" size={13} /> Addendum No. 1 (new opening date) to 3 registered plan holders
            </li>
            <li>
              <Icon name="check" size={13} /> Bid calendar and city website updated
            </li>
            <li>
              <Icon name="check" size={13} /> Held ad {n.adNo} released and resubmitted for {run ? fDay(run) : '—'}
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
