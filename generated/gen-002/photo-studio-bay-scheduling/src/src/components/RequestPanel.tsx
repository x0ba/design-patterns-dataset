import { BAYS } from '../data/mock';
import { REQUEST, type OptionId, type OptionResult, type Slot } from '../lib/engine';
import { fmtMoney, fmtRange, fmtTime, chargeCents, MIN_EXTENSION, NOW, TURNAROUND } from '../lib/time';
import type { Booking } from '../types';

interface Props {
  lena: Booking;
  options: OptionResult[];
  selected: OptionId;
  applied: OptionId | null;
  slots: Slot[];
  slotIdx: number;
  offerAccepted: boolean;
  latest: string | undefined;
  onSelect: (id: OptionId) => void;
  onSlot: (idx: number) => void;
  onApply: (opt: OptionResult) => void;
  onUndo: () => void;
  onAccept: () => void;
}

export function RequestPanel(props: Props) {
  const { lena, options, selected, applied, slots, slotIdx, offerAccepted, latest } = props;
  const extra = REQUEST.extraMinutes;
  const extCost = fmtMoney(chargeCents(extra));

  return (
    <div className="decision">
      <section className="card request" aria-label="Extension request">
        <div className="eyebrow">Extension request · 1:10 PM</div>
        <h2>
          {lena.client} <span className="muted">· {BAYS.find((b) => b.id === lena.bayId)!.name}</span>
        </h2>
        <p className="muted small">
          {lena.project}. Booked {fmtRange(lena.start, lena.end)}. Asks for {extra} more minutes.
        </p>
        <div className="req-grid">
          <div>
            <span>Ends now</span>
            <b>{fmtTime(lena.end)}</b>
          </div>
          <div>
            <span>Asked for</span>
            <b>{fmtTime(lena.end + extra)}</b>
          </div>
          <div>
            <span>Charge</span>
            <b>{extCost}</b>
          </div>
        </div>
        <p className="constraint">
          Arlo Goods holds Bay 2 from <b>3:00 PM</b>. Only Bays 2 and 3 have a white cyc. Bookings need a{' '}
          {TURNAROUND}-min clean-down; extensions run at least {MIN_EXTENSION} min.
        </p>
      </section>

      <section className="options" aria-label="Options">
        <div className="section-title">
          <span>Three ways to answer</span>
          {applied && <span className="pill pill-applied">Option {applied} applied</span>}
        </div>

        {options.map((opt) => {
          const open = opt.id === selected;
          const isApplied = applied === opt.id;
          const locked = applied !== null;
          return (
            <article key={opt.id} className={`opt${open ? ' is-open' : ''}${opt.blocked ? ' is-blocked' : ''}${opt.recommended ? ' is-rec' : ''}`}>
              <button type="button" className="opt-head" aria-expanded={open} onClick={() => props.onSelect(opt.id)}>
                <span className={`letter letter-${opt.id}`}>{opt.id}</span>
                <span className="opt-title">
                  {opt.title}
                  {opt.recommended && <em className="rec">Recommended</em>}
                </span>
                <span className={`verdict v-${opt.verdict}`}>{opt.verdictLabel}</span>
              </button>

              {open && (
                <div className="opt-body">
                  <p className="summary">{opt.summary}</p>

                  <ul className="checks">
                    {opt.checks.map((c) => (
                      <li key={c.label} className={c.ok ? 'ok' : 'bad'}>
                        <span className="tick-mark" aria-hidden="true">{c.ok ? '✓' : '✕'}</span>
                        <div>
                          <b>{c.label}</b>
                          <span>{c.detail}</span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {opt.changes.length > 0 && (
                    <div className="changes">
                      <div className="sub-h">What has to move</div>
                      <ul>
                        {opt.changes.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {opt.id === 'C' && (
                    <div className="slots">
                      <div className="sub-h">Slots that fit 90 min after 2:00 PM</div>
                      <div className="chips">
                        {slots.map((s, i) => (
                          <button
                            type="button"
                            key={`${s.bayId}-${s.start}`}
                            className={`chip${i === slotIdx ? ' on' : ''}`}
                            disabled={locked}
                            onClick={() => props.onSlot(i)}
                          >
                            {BAYS.find((b) => b.id === s.bayId)!.name} · {fmtRange(s.start, s.end)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="opt-actions">
                    {isApplied ? (
                      <>
                        <span className="applied-tag">Applied at {fmtTime(NOW)}</span>
                        {opt.id === 'C' && !offerAccepted && (
                          <button type="button" className="btn" onClick={props.onAccept}>
                            Lena said yes
                          </button>
                        )}
                        <button type="button" className="btn ghost" onClick={props.onUndo}>
                          Undo
                        </button>
                      </>
                    ) : opt.blocked ? (
                      <button type="button" className="btn" disabled>
                        Can’t apply: see the failed check
                      </button>
                    ) : (
                      <button type="button" className="btn primary" disabled={locked} onClick={() => props.onApply(opt)}>
                        Apply Option {opt.id}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {latest && (
        <p className="latest">
          <span className="latest-label">Log</span> {latest}
        </p>
      )}
    </div>
  );
}
