import { useState } from 'react';
import { useStore } from '../store.jsx';
import { Button, Chip, Field, Icon, PageHead } from '../ui.jsx';
import { LAST_TERM, TERM } from '../data.js';
import { money, pct, plural, priceStay } from '../lib.js';

export default function Taxes() {
  const { state, dispatch, notify } = useStore();
  const { tax, flags } = state;
  const [pctText, setPctText] = useState(String(tax.lodgingPct));
  const [feeText, setFeeText] = useState(String(tax.feePerNight));
  const [nights, setNights] = useState(2);
  const [rate, setRate] = useState(149);

  const pctNum = Number(pctText);
  const feeNum = Number(feeText);
  const pctErr = pctText === '' || Number.isNaN(pctNum) || pctNum < 0 || pctNum > 30 ? 'Enter a rate from 0 to 30%.' : null;
  const feeErr = feeText === '' || Number.isNaN(feeNum) || feeNum < 0 || feeNum > 50 ? 'Enter an amount from $0 to $50.' : null;

  const apply = (patch) => dispatch({ type: 'tax/set', patch });

  const p = priceStay({ nightly: rate, nights, tax: { lodgingPct: pctErr ? tax.lodgingPct : pctNum, feePerNight: feeErr ? tax.feePerNight : feeNum } });
  const last = LAST_TERM.tax;

  return (
    <div className="page narrow">
      <PageHead
        title="Taxes & fees"
        lead="Charged on every folio. Students see the amounts as separate lines, so the totals they work out should match what the system bills."
      />

      <div className="tax-layout">
        <section className="panel" aria-labelledby="tx">
          <h2 id="tx" className="panel-title">This term</h2>
          <div className="form-grid">
            <Field label="Lodging tax" error={pctErr} hint={`On the room charge. ${tax.lodgingPct !== last.lodgingPct ? `${TERM.lastName}: ${pct(last.lodgingPct)}` : `Same as ${TERM.lastName}.`}`}>
              {(pr) => (
                <div className="input-affix">
                  <input
                    {...pr}
                    type="number" step="0.01" min="0" value={pctText}
                    onChange={(e) => { setPctText(e.target.value); const n = Number(e.target.value); if (e.target.value !== '' && n >= 0 && n <= 30) apply({ lodgingPct: n }); }}
                  />
                  <span className="suffix" aria-hidden="true">%</span>
                </div>
              )}
            </Field>
            <Field label="City occupancy fee" error={feeErr} hint={`Per room, per night. ${tax.feePerNight !== last.feePerNight ? `${TERM.lastName}: ${money(last.feePerNight, { cents: true })}` : `Same as ${TERM.lastName}.`}`}>
              {(pr) => (
                <div className="input-affix">
                  <span aria-hidden="true">$</span>
                  <input
                    {...pr}
                    type="number" step="0.25" min="0" value={feeText}
                    onChange={(e) => { setFeeText(e.target.value); const n = Number(e.target.value); if (e.target.value !== '' && n >= 0 && n <= 50) apply({ feePerNight: n }); }}
                  />
                </div>
              )}
            </Field>
          </div>
          <p className="muted small">Lodging tax is figured on the room charge only. The occupancy fee is a flat amount for each room-night and isn’t taxed.</p>

          <div className="confirm-row">
            {flags.taxConfirmed ? (
              <Chip tone="good" icon="check">Confirmed for {TERM.name}</Chip>
            ) : (
              <Button
                variant="primary"
                icon="check"
                disabled={!!pctErr || !!feeErr}
                onClick={() => { dispatch({ type: 'flag', patch: { taxConfirmed: true } }); notify('Tax settings confirmed for Spring 2027.'); }}
              >
                Confirm these settings
              </Button>
            )}
            {!flags.taxConfirmed && <span className="muted small">Ticks off the checklist item.</span>}
          </div>
        </section>

        <section className="panel" aria-labelledby="tp">
          <h2 id="tp" className="panel-title">Try a stay</h2>
          <div className="form-grid">
            <Field label="Room rate per night">
              {(pr) => (
                <div className="input-affix">
                  <span aria-hidden="true">$</span>
                  <input {...pr} type="number" min="1" value={rate} onChange={(e) => setRate(Math.max(0, Number(e.target.value)))} />
                </div>
              )}
            </Field>
            <Field label="Nights">
              {(pr) => <input {...pr} type="number" min="1" max="30" value={nights} onChange={(e) => setNights(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />}
            </Field>
          </div>
          <dl className="receipt">
            <div><dt>Room, {money(rate)} × {plural(nights, 'night')}</dt><dd>{money(p.room, { cents: true })}</dd></div>
            <div><dt>Lodging tax {pctErr ? pct(tax.lodgingPct) : pct(pctNum)}</dt><dd>{money(p.lodging, { cents: true })}</dd></div>
            <div><dt>City occupancy fee × {nights}</dt><dd>{money(p.fee, { cents: true })}</dd></div>
            <div className="total"><dt>Guest pays</dt><dd>{money(p.total, { cents: true })}</dd></div>
          </dl>
          <p className="muted small receipt-note">
            <Icon name="info" size={14} /> At {TERM.lastName}’s {pct(last.lodgingPct)} the same stay was {money(priceStay({ nightly: rate, nights, tax: last }).total, { cents: true })}.
          </p>
        </section>
      </div>
    </div>
  );
}
