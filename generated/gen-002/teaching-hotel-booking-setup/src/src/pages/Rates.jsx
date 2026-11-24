import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store.jsx';
import { Button, Chip, Field, Icon, Modal, Notice, PageHead } from '../ui.jsx';
import { CANCEL_OPTIONS, DEPOSIT_OPTIONS, PENALTY_OPTIONS } from '../data.js';
import {
  cancelText, cancelDetail, cancelOpt, dateRangeText, depositOpt, money, nightlyRate, priceStay, pricingText,
  weekdayOf, fmtDate, nightsBetween, addDays, plural,
} from '../lib.js';

const STATUS_CHIP = {
  active: ['good', 'Active'],
  draft: ['draft', 'Draft'],
  retired: ['muted', 'Retired'],
};

export default function Rates({ intent, go }) {
  const { state, dispatch, notify } = useStore();
  const [editing, setEditing] = useState(intent?.edit || null);
  const [retiring, setRetiring] = useState(null);

  useEffect(() => { if (intent?.edit) setEditing(intent.edit); }, [intent]);

  const groups = [
    ['Active', state.rates.filter((r) => r.status === 'active')],
    ['Drafts and proposals', state.rates.filter((r) => r.status === 'draft')],
    ['Retired', state.rates.filter((r) => r.status === 'retired')],
  ];

  const activate = (r) => {
    dispatch({ type: 'rate/status', id: r.id, status: 'active' });
    notify(`${r.name} is now active for ${dateRangeText(r)}.`, { undo: true });
  };

  return (
    <div className="page">
      <PageHead
        title="Rates & packages"
        lead="Rate plans students can quote. Each one sets a price against the room’s base rate, when it applies, and the cancellation and deposit rules."
        actions={<Button variant="secondary" icon="plus" onClick={() => setEditing('new')}>New rate plan</Button>}
      />

      {groups.map(([title, list]) =>
        list.length === 0 ? null : (
          <section key={title} className="rate-section" aria-labelledby={`rs-${title}`}>
            <h2 id={`rs-${title}`} className="section-title">{title} <span className="count">{list.length}</span></h2>
            <div className="table-wrap">
              <table className="grid rate-grid">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Price</th>
                    <th>Applies</th>
                    <th className="num">Min stay</th>
                    <th>Cancellation</th>
                    <th>Deposit</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => {
                    const [tone, label] = STATUS_CHIP[r.status];
                    return (
                      <tr key={r.id} className={r.status === 'retired' ? 'is-retired' : r.status === 'draft' ? 'is-draft' : ''}>
                        <td className="plan-cell">
                          <strong>{r.name}</strong>{r.status !== 'active' && <Chip tone={tone}>{label}</Chip>}
                          <span className="cell-sub">{r.desc}</span>
                        </td>
                        <td>{pricingText(r.pricing)}</td>
                        <td>
                          {dateRangeText(r, { weekday: !!r.start })}
                        </td>
                        <td className="num">{r.minStay} {r.minStay === 1 ? 'night' : 'nights'}</td>
                        <td>
                          {r.cancel === 'nonref' ? 'Non-refundable' : `Free until ${cancelOpt(r.cancel).short} prior`}
                          {r.cancel !== 'nonref' && <span className="cell-sub">Then {r.penalty === 'full-stay' ? 'entire stay' : 'first night'}</span>}
                        </td>
                        <td>{depositOpt(r.deposit).short}</td>
                        <td className="row-actions">
                          {r.status === 'draft' && <Button variant="primary" size="sm" onClick={() => activate(r)}>Activate</Button>}
                          {r.status === 'retired' && (
                            <Button variant="secondary" size="sm" onClick={() => { dispatch({ type: 'rate/status', id: r.id, status: 'active' }); notify(`${r.name} restored.`, { undo: true }); }}>Restore</Button>
                          )}
                          <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditing(r.id)} aria-label={`Edit ${r.name}`}>Edit</Button>
                          {r.status === 'active' && (
                            <Button variant="ghost" size="sm" icon="archive" onClick={() => setRetiring(r)} aria-label={`Retire ${r.name}`}>Retire</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ),
      )}

      {editing && (
        <RateDrawer
          rateId={editing}
          onClose={() => setEditing(null)}
          onDone={(msg, undo) => { setEditing(null); notify(msg, { undo }); }}
        />
      )}
      {retiring && (
        <RetireDialog
          rate={retiring}
          onClose={() => setRetiring(null)}
          onDone={(msg) => { setRetiring(null); notify(msg, { undo: true }); }}
          go={go}
        />
      )}
    </div>
  );
}

function RetireDialog({ rate, onClose, onDone }) {
  const { state, dispatch } = useStore();
  const using = state.scenarios.filter((s) => s.ratePlan === rate.id);
  const options = state.rates.filter((r) => r.status === 'active' && r.id !== rate.id);
  const [to, setTo] = useState(options.find((o) => o.id === 'standard')?.id || options[0]?.id || '');

  return (
    <Modal
      title={`Retire ${rate.name}?`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <span className="spacer" />
          <Button variant="ghost" onClick={onClose}>Keep it</Button>
          <Button
            variant="danger"
            icon="archive"
            onClick={() => {
              dispatch({ type: 'rate/retire', id: rate.id, reassignTo: using.length ? to : null });
              onDone(`Retired ${rate.name}.`);
            }}
          >
            Retire plan
          </Button>
        </>
      }
    >
      <ul className="plain-list">
        <li>Students can no longer pick it for new reservations.</li>
        <li>It moves to the Retired list, where you can restore it later.</li>
        <li>It stays in last term’s saved settings, so comparisons still work.</li>
      </ul>
      {using.length > 0 && (
        <div className="reassign">
          <Notice tone="warn" title={`${plural(using.length, 'practice scenario')} ${using.length === 1 ? 'uses' : 'use'} this plan.`}>
            Choose the plan they should use instead.
          </Notice>
          <ul className="plain-list tight">
            {using.map((s) => <li key={s.id}>{s.title} <span className="muted">· week {s.week}</span></li>)}
          </ul>
          <Field label="Switch those scenarios to">
            {(p) => (
              <select {...p} value={to} onChange={(e) => setTo(e.target.value)}>
                {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
          </Field>
        </div>
      )}
    </Modal>
  );
}

const blank = () => ({
  id: `plan-${Date.now() % 100000}`,
  name: '', desc: '', status: 'draft', mode: 'percent', value: '0', allYear: true, start: '', end: '',
  minStay: '1', cancel: '24h', penalty: 'first-night', deposit: 'none',
});

function RateDrawer({ rateId, onClose, onDone }) {
  const { state, dispatch } = useStore();
  const isNew = rateId === 'new';
  const existing = state.rates.find((r) => r.id === rateId);
  const [f, setF] = useState(() =>
    existing
      ? {
          id: existing.id, name: existing.name, desc: existing.desc, status: existing.status,
          mode: existing.pricing.mode, value: String(existing.pricing.value),
          allYear: !existing.start, start: existing.start || '', end: existing.end || '',
          minStay: String(existing.minStay), cancel: existing.cancel, penalty: existing.penalty, deposit: existing.deposit,
        }
      : blank(),
  );
  const [errors, setErrors] = useState({});
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Give the plan a name.';
    else if (state.rates.some((r) => r.id !== f.id && r.name.toLowerCase() === f.name.trim().toLowerCase())) e.name = 'Another plan already has this name.';
    if (f.value === '' || Number.isNaN(Number(f.value))) e.value = 'Enter a number.';
    else if (f.mode === 'flat' && Number(f.value) <= 0) e.value = 'A flat rate must be above $0.';
    else if (f.mode === 'percent' && Number(f.value) <= -100) e.value = 'Discount must be less than 100%.';
    if (!(Number.isInteger(Number(f.minStay)) && Number(f.minStay) >= 1)) e.minStay = 'Whole nights, at least 1.';
    if (!f.allYear) {
      if (!f.start || !f.end) e.dates = 'Pick both a first and last date, or choose “All year”.';
      else if (f.end < f.start) e.dates = 'The last date is before the first date.';
    }
    return e;
  };

  const build = (status) => ({
    id: f.id,
    name: f.name.trim(),
    desc: f.desc.trim(),
    status,
    pricing: { mode: f.mode, value: Number(f.value) },
    start: f.allYear ? null : f.start,
    end: f.allYear ? null : f.end,
    minStay: Number(f.minStay),
    cancel: f.cancel,
    penalty: f.penalty,
    deposit: f.deposit,
  });

  const save = (status) => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const rate = build(status);
    dispatch({ type: 'rate/save', rate });
    const verb = isNew ? 'Created' : 'Saved';
    onDone(status === 'active' && existing?.status !== 'active' ? `${rate.name} is now active for ${dateRangeText(rate)}.` : `${verb} ${rate.name}.`, status !== existing?.status);
  };

  const nights = f.allYear || !f.start || !f.end || f.end < f.start ? null : nightsBetween(f.start, f.end);
  const windowWarn = !f.allYear && f.start && f.end && f.end >= f.start && Number(f.minStay) > nights
    ? `The window is only ${plural(nights, 'night')}, shorter than the ${plural(Number(f.minStay), 'night')} minimum, so nobody could book it.`
    : null;
  const startsOn = !f.allYear && f.start ? weekdayOf(f.start) : null;
  const offset = startsOn ? ['Saturday', 'Sunday', 'Monday'].indexOf(startsOn) + 1 : 0;

  const status = existing?.status || 'draft';
  const isDraft = status === 'draft';

  return (
    <Modal
      variant="drawer"
      width={640}
      title={isNew ? 'New rate plan' : existing.name}
      subtitle={isNew ? 'Saved as a draft until you activate it.' : isDraft ? 'Draft: not available to students yet.' : status === 'retired' ? 'Retired.' : 'Active: students can quote this plan.'}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {(isNew || isDraft) ? (
            <>
              <Button variant="secondary" onClick={() => save('draft')}>Save as draft</Button>
              <Button variant="primary" onClick={() => save('active')}>Save &amp; activate</Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => save(status)}>Save changes</Button>
          )}
        </>
      }
    >
      <div className="form-grid">
        <Field label="Plan name" error={errors.name} className="span-2">
          {(p) => <input {...p} type="text" value={f.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label="What students are told" className="span-2">
          {(p) => <input {...p} type="text" value={f.desc} onChange={(e) => set('desc', e.target.value)} />}
        </Field>

        <Field label="Pricing" >
          {(p) => (
            <select {...p} value={f.mode} onChange={(e) => set('mode', e.target.value)}>
              <option value="percent">Percent of the room’s base rate</option>
              <option value="flat">Flat rate per night</option>
            </select>
          )}
        </Field>
        <Field label={f.mode === 'flat' ? 'Nightly rate' : 'Change from base (− discount, + premium)'} error={errors.value}>
          {(p) => (
            <div className="input-affix">
              <span aria-hidden="true">{f.mode === 'flat' ? '$' : '±'}</span>
              <input {...p} type="number" step="1" value={f.value} onChange={(e) => set('value', e.target.value)} />
              {f.mode === 'percent' && <span aria-hidden="true" className="suffix">%</span>}
            </div>
          )}
        </Field>

        <fieldset className="field span-2 dates">
          <legend>When it applies</legend>
          <div className="seg" role="radiogroup" aria-label="When it applies">
            <button type="button" role="radio" aria-checked={f.allYear} className={f.allYear ? 'is-on' : ''} onClick={() => set('allYear', true)}>All year</button>
            <button type="button" role="radio" aria-checked={!f.allYear} className={!f.allYear ? 'is-on' : ''} onClick={() => setF((p) => ({ ...p, allYear: false, start: p.start || '2027-05-15', end: p.end || '2027-05-17' }))}>Specific dates</button>
          </div>
          {!f.allYear && (
            <div className="date-row">
              <label>
                First arrival
                <input type="date" value={f.start} onChange={(e) => set('start', e.target.value)} />
              </label>
              <label>
                Last departure
                <input type="date" value={f.end} min={f.start} onChange={(e) => set('end', e.target.value)} />
              </label>
              <span className="date-readout">
                {f.start && f.end && f.end >= f.start ? `${fmtDate(f.start, { weekday: true })} to ${fmtDate(f.end, { weekday: true })} · ${plural(nights, 'night')}` : ''}
              </span>
            </div>
          )}
          {errors.dates && <p className="field-error">{errors.dates}</p>}
          {windowWarn && <p className="field-warn"><Icon name="alert" size={14} /> {windowWarn}</p>}
          {!windowWarn && offset > 0 && f.name.toLowerCase().includes('weekend') && (
            <p className="field-warn">
              <Icon name="alert" size={14} /> This window starts on a {startsOn}, so the Friday night ({fmtDate(addDays(f.start, -offset), { year: false })}) isn’t covered.{' '}
              <button type="button" className="text-link" onClick={() => setF((p) => ({ ...p, start: addDays(p.start, -offset) }))}>
                Start on Friday, {fmtDate(addDays(f.start, -offset), { year: false })} instead
              </button>
            </p>
          )}
        </fieldset>

        <Field label="Minimum stay" error={errors.minStay}>
          {(p) => (
            <div className="input-affix">
              <input {...p} type="number" min="1" step="1" value={f.minStay} onChange={(e) => set('minStay', e.target.value)} />
              <span aria-hidden="true" className="suffix">nights</span>
            </div>
          )}
        </Field>
        <Field label="Deposit at booking">
          {(p) => (
            <select {...p} value={f.deposit} onChange={(e) => set('deposit', e.target.value)}>
              {DEPOSIT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Free cancellation until">
          {(p) => (
            <select {...p} value={f.cancel} onChange={(e) => set('cancel', e.target.value)}>
              {CANCEL_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
        </Field>
        <Field label="Cancel later than that, guest pays">
          {(p) => (
            <select {...p} value={f.penalty} onChange={(e) => set('penalty', e.target.value)} disabled={f.cancel === 'nonref'}>
              {PENALTY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
        </Field>
      </div>

      <Preview f={f} />
    </Modal>
  );
}

function Preview({ f }) {
  const { state } = useStore();
  const types = [...new Set(state.rooms.map((r) => r.type))];
  const [type, setType] = useState(types.includes('Queen') ? 'Queen' : types[0]);
  const base = Math.min(...state.rooms.filter((r) => r.type === type).map((r) => r.rate));
  const nights = Math.max(1, Number(f.minStay) || 1);
  const valid = f.value !== '' && !Number.isNaN(Number(f.value));
  const pricing = { mode: f.mode, value: Number(f.value) || 0 };
  const nightly = valid ? nightlyRate(base, pricing) : base;
  const p = priceStay({ nightly, nights, tax: state.tax });
  const tmp = { cancel: f.cancel, penalty: f.penalty };

  return (
    <section className="preview" aria-labelledby="pv">
      <div className="preview-head">
        <h3 id="pv">What a guest would pay</h3>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Room type for preview">
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <dl className="receipt">
        <div><dt>{money(nightly)} × {plural(nights, 'night')} <span className="muted">(base {money(base)})</span></dt><dd>{money(p.room, { cents: true })}</dd></div>
        <div><dt>Lodging tax {state.tax.lodgingPct}%</dt><dd>{money(p.lodging, { cents: true })}</dd></div>
        <div><dt>City occupancy fee {money(state.tax.feePerNight, { cents: true })} × {nights}</dt><dd>{money(p.fee, { cents: true })}</dd></div>
        <div className="total"><dt>Total</dt><dd>{money(p.total, { cents: true })}</dd></div>
      </dl>
      <p className="preview-policy"><strong>{cancelText(tmp)}.</strong> {cancelDetail(tmp)}</p>
    </section>
  );
}
