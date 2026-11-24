import { Dispatch, useEffect, useRef, useState } from 'react';
import { Connection, Entry, ROUTES } from './data';
import { Evaluation, billParts, estimateOldFinal, fmt, fmtSigned, money, parseReading, ratioText, suggest } from './logic';
import { Action } from './store';
import { Check, Close, Info, Stop, Warn } from './icons';

interface Props {
  conn: Connection;
  entry: Entry;
  ev: Evaluation;
  locked: boolean;
  dispatch: Dispatch<Action>;
  onClose: () => void;
}

/** A number box that shows commas as you type. */
function NumberBox({ value, onChange, label, id, onEnter, inputRef }: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  id: string;
  onEnter?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <input
      id={id}
      ref={inputRef}
      className="numbox"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      value={value}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').slice(0, 7);
        onChange(d ? fmt(parseInt(d, 10)) : '');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
    />
  );
}

function chipsFor(conn: Connection, code: string): string[] {
  const out: string[] = [];
  if (conn.knownIssue) out.push(conn.knownIssue.short + '; extra use expected.');
  if (code === 'high') out.push('Member confirmed the extra use.', 'Leak found and repaired.', 'Re-read the meter; reading is correct.');
  else if (code === 'low') out.push('Member was away.', 'Re-read the meter; reading is correct.', 'Meter may be stuck; check next cycle.');
  else if (code === 'zero') out.push('Member was away.', 'Re-read the meter; reading is correct.', 'Meter may be stuck; check next cycle.');
  else if (code === 'idle-use') out.push('Home is occupied again.', 'Re-read the meter; reading is correct.');
  return out;
}

export default function ReviewPanel({ conn, entry, ev, locked, dispatch, onClose }: Props) {
  const route = ROUTES[conn.route];
  const main = ev.main;
  const code = main?.code;
  const firstInput = useRef<HTMLInputElement>(null);

  const [fix, setFix] = useState(entry.reading != null ? fmt(entry.reading) : '');
  const [keepNote, setKeepNote] = useState('');
  const [oldFinal, setOldFinal] = useState(entry.oldFinal != null ? fmt(entry.oldFinal) : '');
  const [swapNote, setSwapNote] = useState('');
  const [showSwap, setShowSwap] = useState(false);

  useEffect(() => {
    firstInput.current?.focus({ preventScroll: true });
    firstInput.current?.select();
  }, []);

  const reading = entry.reading ?? 0;
  const sheetLine = (
    <>
      Paper sheet: {route.name}, line {conn.line} · read by {route.reader} on {route.readOn}
    </>
  );

  // ---------- Already dealt with ----------
  if (!ev.open) {
    const r = entry.resolution;
    return (
      <div className="review review--done" role="region" aria-label={`Review of ${conn.meter}`}>
        <div className="review-head">
          <div>
            <h3 className="review-title">
              <Check className="ico-ok" /> {r?.type === 'corrected' ? 'Reading corrected' : r?.type === 'replaced' ? 'Meter replacement counted' : r?.type === 'kept' ? 'Reviewed — reading kept' : 'Nothing to review'}
            </h3>
            <p className="review-sub">{sheetLine}</p>
          </div>
          <button className="btn btn--quiet" onClick={onClose}>
            <Close width={18} height={18} /> Close
          </button>
        </div>
        <div className="review-body review-body--single">
          {r && (
            <p className="review-note">
              <span className="note-label">Your note, {r.on}:</span> {r.note}
            </p>
          )}
          {r?.type === 'corrected' && r.from != null && (
            <p className="review-fact">
              First typed <b className="mono">{fmt(r.from)}</b> → now <b className="mono">{fmt(entry.reading ?? 0)}</b>
            </p>
          )}
          {ev.isReplaced && ev.usage != null && entry.oldFinal != null && (
            <p className="review-fact">
              Use this cycle = old meter ({fmt(entry.oldFinal)} − {fmt(conn.prev)}) + new meter {fmt(reading)} ={' '}
              <b className="mono">{fmt(ev.usage)} gal</b>
            </p>
          )}
          {!locked && r && (
            <div>
              <button className="btn" onClick={() => dispatch({ type: 'reopenReview', meter: conn.meter })}>
                Review this reading again
              </button>
            </div>
          )}
          {locked && <p className="review-sub">The cycle is locked, so this can’t be changed.</p>}
        </div>
      </div>
    );
  }

  // ---------- Needs attention ----------
  const isSwapFlow = code === 'needs-old' || code === 'old-lower';
  const oldVal = parseReading(oldFinal);
  const swapUsage = oldVal != null && oldVal >= conn.prev ? oldVal - conn.prev + reading : null;
  const fixVal = parseReading(fix);
  const fixSuggestions = (code === 'backwards' || code === 'high') && !conn.knownIssue ? suggest(conn, entry.reading ?? 0) : [];
  const bill = ev.usage != null ? billParts(ev.usage) : null;

  const title: Record<string, string> = {
    backwards: 'This reading is lower than last month’s.',
    'needs-old': `New meter: add the old meter’s last reading.`,
    'old-lower': 'The old meter’s last reading is lower than the Oct 15 reading.',
    high: `Water use is ${ratioText(ev.ratio)} the usual amount.`,
    low: 'Water use is far below the usual amount.',
    zero: 'The meter didn’t move at all this cycle.',
    'idle-use': conn.status === 'vacant' ? 'Marked vacant, but water was used.' : 'This seasonal cabin used more water than expected.',
  };
  const why: Record<string, string> = {
    backwards: 'A meter only counts up, so one of the digits is probably wrong. Compare with the paper sheet.',
    'needs-old': `The meter was replaced on ${conn.replacedOn ?? 'a date this cycle'} and the new one started at 0. Use for the cycle is what the old meter counted after Oct 15, plus what the new meter has counted since.`,
    'old-lower': 'The old meter can’t read less than it did on Oct 15. Check the replacement work order.',
    high: 'A jump this size can mean a leak, or a typo such as an extra or wrong digit.',
    low: 'That can mean a missed digit, a stuck meter, or a household that was away.',
    zero: 'An occupied home normally uses some water. The meter may be stuck, or last month’s number was copied.',
    'idle-use': `Expected near zero (under ${fmt(1000)} gal). This could be a leak, or someone may be using the place again.`,
  };

  const saveFix = () => {
    if (fixVal == null || fixVal === entry.reading) return;
    const auto = `Typed ${entry.reading != null ? fmt(entry.reading) : '—'}; corrected to ${fmt(fixVal)}.`;
    dispatch({ type: 'correct', meter: conn.meter, value: fixVal, note: auto });
    onClose();
  };
  const saveKeep = () => {
    if (keepNote.trim().length < 3) return;
    dispatch({ type: 'keep', meter: conn.meter, note: keepNote.trim() });
    onClose();
  };
  const saveSwap = (oldValue: number | null, note: string) => {
    if (oldValue == null) return;
    dispatch({ type: 'swap', meter: conn.meter, oldFinal: oldValue, note });
    onClose();
  };

  const addChip = (t: string) => setKeepNote((cur) => (cur.trim() ? `${cur.trim()} ${t}` : t));
  const Icon = main?.severity === 'error' ? Stop : Warn;

  return (
    <div className={`review review--${main?.severity ?? 'warn'}`} role="region" aria-label={`Review of ${conn.meter}`}>
      <div className="review-head">
        <div>
          <h3 className="review-title">
            <Icon className="ico-flag" /> {code ? title[code] : ''}
          </h3>
          <p className="review-sub">{sheetLine}</p>
        </div>
        <button className="btn btn--quiet" onClick={onClose}>
          <Close width={18} height={18} /> Close
        </button>
      </div>

      <div className="review-body">
        {/* What we see */}
        <div className="review-col">
          <h4 className="col-title">What the numbers say</h4>
          <p className="review-why">{code ? why[code] : ''}</p>
          <dl className="facts">
            <div>
              <dt>Previous (Oct 15)</dt>
              <dd className="mono">{fmt(conn.prev)}</dd>
            </div>
            {isSwapFlow ? (
              <>
                <div>
                  <dt>New meter reads now</dt>
                  <dd className="mono">{fmt(reading)}</dd>
                </div>
                <div className="facts-total">
                  <dt>Use this cycle</dt>
                  <dd className="mono">{swapUsage != null ? `${fmt(swapUsage)} gal` : '—'}</dd>
                </div>
              </>
            ) : code === 'backwards' ? (
              <>
                <div>
                  <dt>You typed</dt>
                  <dd className="mono">{fmt(reading)}</dd>
                </div>
                <div className="facts-total">
                  <dt>Difference</dt>
                  <dd className="mono">{fmtSigned(reading - conn.prev)}</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt>You typed</dt>
                  <dd className="mono">{fmt(reading)}</dd>
                </div>
                <div className="facts-total">
                  <dt>Use this cycle</dt>
                  <dd className="mono">{ev.usage != null ? `${fmt(ev.usage)} gal` : '—'}</dd>
                </div>
                <div>
                  <dt>12-month average</dt>
                  <dd className="mono">{fmt(conn.avg)} gal</dd>
                </div>
                {bill && (
                  <div>
                    <dt>Bill at this reading</dt>
                    <dd className="mono">{money(bill.totalCents)}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
          {conn.knownIssue && (
            <div className="known-issue">
              <Info width={20} height={20} />
              <span>
                <b>On file:</b> {conn.knownIssue.text}.
              </span>
            </div>
          )}
        </div>

        {/* What to do */}
        {locked ? (
          <div className="review-col">
            <p className="review-sub">The cycle is locked, so this can’t be changed.</p>
          </div>
        ) : isSwapFlow ? (
          <div className="review-col review-col--wide">
            <h4 className="col-title">Enter the old meter’s last reading</h4>
            <label className="field-label" htmlFor={`old-${conn.meter}`}>
              Old meter’s final reading, from the {conn.replacedOn ?? ''} replacement work order
            </label>
            <div className="row-inline">
              <NumberBox id={`old-${conn.meter}`} inputRef={firstInput} label="Old meter final reading" value={oldFinal} onChange={setOldFinal} onEnter={() => saveSwap(oldVal, swapNote.trim() || 'Old meter final reading added from work order.')} />
              <span className="calc">
                {swapUsage != null ? (
                  <>
                    ({fmt(oldVal!)} − {fmt(conn.prev)}) + {fmt(reading)} = <b className="mono">{fmt(swapUsage)} gal</b>
                  </>
                ) : oldVal != null ? (
                  <span className="calc-bad">That’s below {fmt(conn.prev)}, the Oct 15 reading.</span>
                ) : (
                  'Use = old meter’s count since Oct 15 + new meter’s count'
                )}
              </span>
            </div>
            <label className="field-label" htmlFor={`swapnote-${conn.meter}`}>
              Note (optional)
            </label>
            <input id={`swapnote-${conn.meter}`} className="textbox" value={swapNote} onChange={(e) => setSwapNote(e.target.value)} placeholder="e.g. Work order #… read 145,180" />
            <div className="btn-row">
              <button className="btn btn--primary" disabled={oldVal == null || oldVal < conn.prev} onClick={() => saveSwap(oldVal, swapNote.trim() || 'Old meter final reading added from work order.')}>
                Save old meter reading
              </button>
              {conn.replacedOn && (
                <button
                  className="btn"
                  onClick={() => {
                    const est = estimateOldFinal(conn);
                    saveSwap(est, `No work order reading. Old meter’s last reading estimated at ${fmt(est)} (12-month average for 13 days).`);
                  }}
                >
                  Don’t have it — estimate {fmt(estimateOldFinal(conn))}
                </button>
              )}
            </div>
            {conn.replacedOn && <p className="hint">The estimate uses the 12-month average for the 13 days before the swap and is noted on the record.</p>}
          </div>
        ) : (
          <>
            <div className="review-col">
              <h4 className="col-title">A. Fix the reading</h4>
              <label className="field-label" htmlFor={`fix-${conn.meter}`}>
                What does the paper sheet say?
              </label>
              <div className="row-inline">
                <NumberBox id={`fix-${conn.meter}`} inputRef={firstInput} label="Corrected reading" value={fix} onChange={setFix} onEnter={saveFix} />
                <button className="btn btn--primary" disabled={fixVal == null || fixVal === entry.reading} onClick={saveFix}>
                  Save correction
                </button>
              </div>
              {fixSuggestions.length > 0 && (
                <div className="suggest">
                  <span>One keystroke away from what you typed:</span>
                  {fixSuggestions.map((s) => (
                    <button key={s} className="chip chip--btn mono" onClick={() => setFix(fmt(s))} title={`Gives ${fmt(s - conn.prev)} gal of use`}>
                      {fmt(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {code === 'backwards' ? (
              <div className="review-col">
                <h4 className="col-title">B. The meter was replaced or rolled over</h4>
                <p className="review-why">If the meter was swapped or its dial went back to zero, you’ll add the old meter’s last reading.</p>
                {!showSwap ? (
                  <button className="btn" onClick={() => setShowSwap(true)}>
                    Yes, enter the old meter’s reading
                  </button>
                ) : (
                  <>
                    <label className="field-label" htmlFor={`old-${conn.meter}`}>
                      Old meter’s final reading
                    </label>
                    <div className="row-inline">
                      <NumberBox id={`old-${conn.meter}`} label="Old meter final reading" value={oldFinal} onChange={setOldFinal} onEnter={() => saveSwap(oldVal, swapNote.trim() || 'Meter replaced or rolled over; old meter reading added.')} />
                      <button className="btn btn--primary" disabled={oldVal == null || oldVal < conn.prev} onClick={() => saveSwap(oldVal, swapNote.trim() || 'Meter replaced or rolled over; old meter reading added.')}>
                        Save
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="review-col">
                <h4 className="col-title">B. The reading is right — keep it</h4>
                <label className="field-label" htmlFor={`keep-${conn.meter}`}>
                  Add a short note so the record explains it
                </label>
                <textarea id={`keep-${conn.meter}`} className="textbox" rows={2} value={keepNote} onChange={(e) => setKeepNote(e.target.value)} />
                <div className="chips">
                  {chipsFor(conn, code ?? '').map((t) => (
                    <button key={t} className="chip chip--btn" onClick={() => addChip(t)}>
                      + {t}
                    </button>
                  ))}
                </div>
                <div className="btn-row">
                  <button className="btn btn--primary" disabled={keepNote.trim().length < 3} onClick={saveKeep}>
                    Keep reading and save note
                  </button>
                  {keepNote.trim().length < 3 && <span className="hint">A note is needed before you can keep it.</span>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
